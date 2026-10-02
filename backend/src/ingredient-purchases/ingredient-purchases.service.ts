import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ExchangeRatesService } from '../exchange-rates/exchange-rates.service';
import { InventoryService } from '../inventory/inventory.service';
import { AuditService } from '../audit/audit.service';
import { CreateIngredientPurchaseDto } from './dto/create-ingredient-purchase.dto';
import { UpdateIngredientPurchaseDto } from './dto/update-ingredient-purchase.dto';
import { InsufficientStockError } from '../inventory/fifo';
import { toMinor, vesToUsd } from '../common/money';

@Injectable()
export class IngredientPurchasesService {
  constructor(
    private prisma: PrismaService,
    private exchangeRates: ExchangeRatesService,
    private inventory: InventoryService,
    private audit: AuditService,
  ) {}

  async register(dto: CreateIngredientPurchaseDto, userId: string) {
    if (!(dto.quantity > 0)) {
      throw new BadRequestException('quantity must be greater than 0');
    }
    if (!(dto.totalCostVes > 0)) {
      throw new BadRequestException('totalCostVes must be greater than 0');
    }

    const ingredient = await this.prisma.ingredient.findUnique({
      where: { id: dto.ingredientId },
    });
    if (!ingredient) {
      throw new NotFoundException('Ingredient not found');
    }

    const rate = await this.exchangeRates.getLatestValid(dto.rateType);
    if (!rate) {
      throw new NotFoundException(
        `No valid ${dto.rateType} exchange rate has ever been registered`,
      );
    }

    let category = 'Materia prima';
    let categoryId: string | null = null;
    if (dto.categoryId) {
      const expenseCategory = await this.prisma.expenseCategory.findUnique({
        where: { id: dto.categoryId },
      });
      if (!expenseCategory || !expenseCategory.isActive) {
        throw new NotFoundException('Expense category not found');
      }
      category = expenseCategory.name;
      categoryId = expenseCategory.id;
    }

    const purchaseDate = dto.purchaseDate
      ? new Date(dto.purchaseDate)
      : new Date();
    const quantityMinor = toMinor(dto.quantity);
    const totalCostVesMinor = toMinor(dto.totalCostVes);
    const totalCostUsdMinor = toMinor(vesToUsd(dto.totalCostVes, rate.vesPerUsd));
    const unitCostVes = dto.totalCostVes / dto.quantity;
    const unitCostVesMinor = toMinor(unitCostVes);
    const unitCostUsdMinor = toMinor(unitCostVes / rate.vesPerUsd);

    return this.prisma.$transaction(async (tx) => {
      const expense = await tx.expense.create({
        data: {
          expenseNumber: await this.generateExpenseNumber(tx),
          expenseDate: purchaseDate,
          category,
          categoryId,
          description: `Compra de ${ingredient.name}`,
          amount: dto.totalCostVes,
          paidAmount: dto.totalCostVes,
          pendingAmount: 0,
          currency: 'VES',
          amountVesMinor: totalCostVesMinor,
          amountUsdMinor: totalCostUsdMinor,
          exchangeRateId: rate.id,
          exchangeRateValue: rate.vesPerUsd,
          exchangeRateType: rate.rateType,
          exchangeRateSource: rate.source,
          exchangeRateDate: rate.date,
          paymentStatus: 'PAID',
          notes: dto.notes,
          createdById: userId,
        },
      });

      const purchase = await tx.ingredientPurchase.create({
        data: {
          ingredientId: ingredient.id,
          unit: ingredient.unit,
          quantity: dto.quantity,
          unitCost: unitCostVes,
          totalCost: dto.totalCostVes,
          currency: 'VES',
          exchangeRateId: rate.id,
          exchangeRateType: rate.rateType,
          exchangeRateSource: rate.source,
          exchangeRateDate: rate.date,
          quantityMinor,
          totalCostVesMinor,
          totalCostUsdMinor,
          purchaseDate,
          expenseId: expense.id,
          notes: dto.notes,
        },
      });

      const lot = await tx.inventoryLot.create({
        data: {
          ingredientId: ingredient.id,
          purchaseId: purchase.id,
          initialQuantityMinor: quantityMinor,
          remainingQuantityMinor: quantityMinor,
          unitCostVesMinor,
          unitCostUsdMinor,
          lotDate: purchaseDate,
        },
      });

      return { expense, purchase, lot };
    });
  }

  async updatePurchase(
    id: string,
    dto: UpdateIngredientPurchaseDto,
    userId: string,
  ) {
    if (dto.quantity !== undefined && !(dto.quantity > 0)) {
      throw new BadRequestException('quantity must be greater than 0');
    }
    if (dto.totalCostVes !== undefined && !(dto.totalCostVes > 0)) {
      throw new BadRequestException('totalCostVes must be greater than 0');
    }

    try {
      return await this.prisma.$transaction(async (tx) => {
        const purchase = await tx.ingredientPurchase.findUnique({
          where: { id },
        });
        if (!purchase) {
          throw new NotFoundException('Purchase not found');
        }

        const rate = purchase.exchangeRateId
          ? await tx.exchangeRate.findUnique({
              where: { id: purchase.exchangeRateId },
            })
          : null;
        if (!rate) {
          throw new ConflictException(
            'Purchase has no exchange rate snapshot to recompute USD values',
          );
        }

        const lot = await tx.inventoryLot.findFirst({
          where: { purchaseId: id },
        });
        if (!lot) {
          throw new NotFoundException('Inventory lot not found');
        }

        const quantity = dto.quantity ?? purchase.quantity;
        const totalCostVes = dto.totalCostVes ?? purchase.totalCost;
        const purchaseDate = dto.purchaseDate
          ? new Date(dto.purchaseDate)
          : purchase.purchaseDate;
        const notes = dto.notes ?? purchase.notes;

        const rateValue = rate.vesPerUsd;
        const quantityMinor = toMinor(quantity);
        const totalCostVesMinor = toMinor(totalCostVes);
        const totalCostUsdMinor = toMinor(vesToUsd(totalCostVes, rateValue));
        const unitCostVes = totalCostVes / quantity;
        const unitCostVesMinor = toMinor(unitCostVes);
        const unitCostUsdMinor = toMinor(unitCostVes / rateValue);

        const updatedPurchase = await tx.ingredientPurchase.update({
          where: { id },
          data: {
            quantity,
            unitCost: unitCostVes,
            totalCost: totalCostVes,
            quantityMinor,
            totalCostVesMinor,
            totalCostUsdMinor,
            purchaseDate,
            notes,
          },
        });

        const updatedLot = await tx.inventoryLot.update({
          where: { id: lot.id },
          data: {
            initialQuantityMinor: quantityMinor,
            unitCostVesMinor,
            unitCostUsdMinor,
            lotDate: purchaseDate,
          },
        });

        const updatedExpense = purchase.expenseId
          ? await tx.expense.update({
              where: { id: purchase.expenseId },
              data: {
                amount: totalCostVes,
                paidAmount: totalCostVes,
                pendingAmount: 0,
                amountVesMinor: totalCostVesMinor,
                amountUsdMinor: totalCostUsdMinor,
                expenseDate: purchaseDate,
              },
            })
          : null;

        await this.inventory.recalculateIngredientIn(
          purchase.ingredientId,
          tx,
        );

        await this.audit.record(tx, {
          userId,
          entity: 'ingredient_purchase',
          entityId: id,
          action: 'UPDATE',
          oldValue: purchase,
          newValue: updatedPurchase,
        });

        return {
          purchase: updatedPurchase,
          lot: updatedLot,
          expense: updatedExpense,
        };
      });
    } catch (error) {
      this.rethrowStockConflict(error);
    }
  }

  async removePurchase(id: string, userId: string) {
    try {
      return await this.prisma.$transaction(async (tx) => {
        const purchase = await tx.ingredientPurchase.findUnique({
          where: { id },
        });
        if (!purchase) {
          throw new NotFoundException('Purchase not found');
        }

        const lot = await tx.inventoryLot.findFirst({
          where: { purchaseId: id },
        });

        if (purchase.expenseId) {
          await tx.expense.update({
            where: { id: purchase.expenseId },
            data: { isActive: false },
          });
          await this.audit.record(tx, {
            userId,
            entity: 'expense',
            entityId: purchase.expenseId,
            action: 'ANULAR',
            oldValue: { isActive: true },
            newValue: { isActive: false },
          });
        }
        if (lot) {
          await tx.inventoryLot.delete({ where: { id: lot.id } });
        }
        await tx.ingredientPurchase.delete({ where: { id } });

        await this.inventory.recalculateIngredientIn(
          purchase.ingredientId,
          tx,
        );

        await this.audit.record(tx, {
          userId,
          entity: 'ingredient_purchase',
          entityId: id,
          action: 'DELETE',
          oldValue: purchase,
        });

        return { id, deleted: true };
      });
    } catch (error) {
      this.rethrowStockConflict(error);
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

  private async generateExpenseNumber(
    db: Pick<PrismaService, 'expense'>,
  ): Promise<string> {
    const lastExpense = await db.expense.findFirst({
      orderBy: { createdAt: 'desc' },
      select: { expenseNumber: true },
    });

    if (!lastExpense) {
      return 'EXP-00001';
    }

    const lastNumber = parseInt(lastExpense.expenseNumber.split('-')[1]);
    const newNumber = lastNumber + 1;
    return `EXP-${newNumber.toString().padStart(5, '0')}`;
  }
}
