import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { CreateInventoryOutputDto } from './dto/create-inventory-output.dto';
import { UpdateInventoryOutputDto } from './dto/update-inventory-output.dto';
import { fromMinor, toMinor } from '../common/money';
import { InsufficientStockError, planFifoConsumption } from './fifo';

@Injectable()
export class InventoryService {
  constructor(
    private prisma: PrismaService,
    private audit: AuditService,
  ) {}

  async getStock() {
    const [ingredients, sums] = await Promise.all([
      this.prisma.ingredient.findMany({ orderBy: { name: 'asc' } }),
      this.prisma.inventoryLot.groupBy({
        by: ['ingredientId'],
        _sum: { remainingQuantityMinor: true },
      }),
    ]);

    const byIngredient = new Map(
      sums.map((entry) => [
        entry.ingredientId,
        entry._sum.remainingQuantityMinor ?? 0,
      ]),
    );

    return ingredients.map((ingredient) => {
      const availableQuantityMinor =
        byIngredient.get(ingredient.id) ?? 0;
      return {
        ingredientId: ingredient.id,
        name: ingredient.name,
        unit: ingredient.unit,
        isActive: ingredient.isActive,
        availableQuantityMinor,
        availableQuantity: fromMinor(availableQuantityMinor),
      };
    });
  }

  async getOutputDetail(id: string) {
    const movement = await this.prisma.inventoryMovement.findUnique({
      where: { id },
      include: {
        consumptions: {
          orderBy: { createdAt: 'asc' },
          include: {
            lot: {
              select: {
                id: true,
                lotDate: true,
                purchaseId: true,
                initialQuantityMinor: true,
              },
            },
          },
        },
      },
    });

    if (!movement) {
      throw new NotFoundException('Movement not found');
    }

    return movement;
  }

  async registerOutput(dto: CreateInventoryOutputDto, userId: string) {
    if (!(dto.quantity > 0)) {
      throw new BadRequestException('quantity must be greater than 0');
    }

    const ingredient = await this.prisma.ingredient.findUnique({
      where: { id: dto.ingredientId },
    });
    if (!ingredient) {
      throw new NotFoundException('Ingredient not found');
    }

    const quantityMinor = toMinor(dto.quantity);
    const movementDate = new Date(dto.movementDate);

    try {
      return await this.prisma.$transaction(async (tx) => {
        const movement = await tx.inventoryMovement.create({
          data: {
            ingredientId: dto.ingredientId,
            type: 'OUT',
            quantityMinor,
            costUsdMinor: 0,
            reason: dto.reason,
            movementDate,
            createdById: userId,
          },
        });

        await this.recalculateIngredientIn(dto.ingredientId, tx);

        const full = await tx.inventoryMovement.findUnique({
          where: { id: movement.id },
          include: { consumptions: { orderBy: { createdAt: 'asc' } } },
        });
        if (!full) {
          throw new NotFoundException('Movement not found');
        }
        return { movement: full, consumptions: full.consumptions };
      });
    } catch (error) {
      this.rethrowStockConflict(error);
    }
  }

  async updateOutput(
    id: string,
    dto: UpdateInventoryOutputDto,
    userId: string,
  ) {
    if (dto.quantity !== undefined && !(dto.quantity > 0)) {
      throw new BadRequestException('quantity must be greater than 0');
    }

    try {
      return await this.prisma.$transaction(async (tx) => {
        const movement = await tx.inventoryMovement.findUnique({
          where: { id },
        });
        if (!movement) {
          throw new NotFoundException('Movement not found');
        }

        await tx.inventoryMovement.update({
          where: { id },
          data: {
            ...(dto.quantity !== undefined
              ? { quantityMinor: toMinor(dto.quantity) }
              : {}),
            ...(dto.movementDate !== undefined
              ? { movementDate: new Date(dto.movementDate) }
              : {}),
            ...(dto.reason !== undefined ? { reason: dto.reason } : {}),
          },
        });

        await this.recalculateIngredientIn(movement.ingredientId, tx);

        const full = await tx.inventoryMovement.findUnique({
          where: { id },
          include: { consumptions: { orderBy: { createdAt: 'asc' } } },
        });
        if (!full) {
          throw new NotFoundException('Movement not found');
        }

        await this.audit.record(tx, {
          userId,
          entity: 'inventory_movement',
          entityId: id,
          action: 'UPDATE',
          oldValue: movement,
          newValue: full,
        });

        return { movement: full, consumptions: full.consumptions };
      });
    } catch (error) {
      this.rethrowStockConflict(error);
    }
  }

  async removeOutput(id: string, userId: string) {
    try {
      return await this.prisma.$transaction(async (tx) => {
        const movement = await tx.inventoryMovement.findUnique({
          where: { id },
        });
        if (!movement) {
          throw new NotFoundException('Movement not found');
        }

        await tx.inventoryLotConsumption.deleteMany({
          where: { movementId: id },
        });
        await tx.inventoryMovement.delete({ where: { id } });
        await this.recalculateIngredientIn(movement.ingredientId, tx);

        await this.audit.record(tx, {
          userId,
          entity: 'inventory_movement',
          entityId: id,
          action: 'DELETE',
          oldValue: movement,
        });

        return { id, deleted: true };
      });
    } catch (error) {
      this.rethrowStockConflict(error);
    }
  }

  async recalculateIngredientIn(
    ingredientId: string,
    tx: Prisma.TransactionClient,
  ): Promise<void> {
    const movements = await tx.inventoryMovement.findMany({
      where: { ingredientId, type: 'OUT' },
      orderBy: [{ movementDate: 'asc' }, { createdAt: 'asc' }],
    });

    await tx.inventoryLotConsumption.deleteMany({
      where: { movementId: { in: movements.map((entry) => entry.id) } },
    });

    const lots = await tx.inventoryLot.findMany({
      where: { ingredientId },
    });
    const remaining = new Map(
      lots.map((lot) => [lot.id, lot.initialQuantityMinor]),
    );

    for (const movement of movements) {
      const plan = planFifoConsumption(
        lots.map((lot) => ({
          id: lot.id,
          remainingQuantityMinor: remaining.get(lot.id) ?? 0,
          unitCostUsdMinor: lot.unitCostUsdMinor,
          lotDate: lot.lotDate,
          createdAt: lot.createdAt,
        })),
        movement.quantityMinor,
      );

      for (const consumption of plan.consumptions) {
        await tx.inventoryLotConsumption.create({
          data: {
            movementId: movement.id,
            lotId: consumption.lotId,
            quantityMinor: consumption.quantityMinor,
            costUsdMinor: consumption.costUsdMinor,
          },
        });
        remaining.set(
          consumption.lotId,
          (remaining.get(consumption.lotId) ?? 0) -
            consumption.quantityMinor,
        );
      }

      await tx.inventoryMovement.update({
        where: { id: movement.id },
        data: { costUsdMinor: plan.totalCostUsdMinor },
      });
    }

    for (const lot of lots) {
      await tx.inventoryLot.update({
        where: { id: lot.id },
        data: { remainingQuantityMinor: remaining.get(lot.id) ?? 0 },
      });
    }
  }

  private rethrowStockConflict(error: unknown): never {
    if (error instanceof InsufficientStockError) {
      throw new ConflictException(
        `Insufficient stock: available ${error.availableMinor} minor units, requested ${error.requestedMinor}`,
      );
    }
    throw error;
  }
}
