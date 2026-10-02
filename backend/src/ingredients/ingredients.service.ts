import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { normalizeName } from '../common/name-normalization';
import { CreateIngredientDto } from './dto/create-ingredient.dto';
import { UpdateIngredientDto } from './dto/update-ingredient.dto';
import { RegisterPurchaseDto } from './dto/register-purchase.dto';

@Injectable()
export class IngredientsService {
  constructor(private prisma: PrismaService) {}

  async create(dto: CreateIngredientDto) {
    const normalizedName = normalizeName(dto.name);

    const existing = await this.prisma.ingredient.findUnique({
      where: { normalizedName },
    });
    if (existing) {
      throw new ConflictException('Ingredient already exists');
    }

    return this.prisma.ingredient.create({
      data: {
        name: dto.name,
        normalizedName,
        description: dto.description,
        unit: dto.unit,
        currentCost: dto.currentCost,
        currency: dto.currency || 'USD',
        isActive: true,
      },
    });
  }

  async findAll() {
    return this.prisma.ingredient.findMany({
      where: { isActive: true },
      orderBy: { name: 'asc' },
    });
  }

  async findById(id: string) {
    const ingredient = await this.prisma.ingredient.findUnique({
      where: { id },
      include: {
        purchases: {
          orderBy: { createdAt: 'desc' },
          take: 10,
        },
      },
    });

    if (!ingredient) {
      throw new NotFoundException('Ingredient not found');
    }

    return ingredient;
  }

  async update(id: string, dto: UpdateIngredientDto) {
    const current = await this.findById(id);

    const data: UpdateIngredientDto & { normalizedName?: string } = {
      ...dto,
    };

    if (dto.name !== undefined) {
      const normalizedName = normalizeName(dto.name);
      if (normalizedName !== current.normalizedName) {
        const conflict = await this.prisma.ingredient.findUnique({
          where: { normalizedName },
        });
        if (conflict && conflict.id !== id) {
          throw new ConflictException('Ingredient already exists');
        }
      }
      data.normalizedName = normalizedName;
    }

    if (dto.unit !== undefined && dto.unit !== current.unit) {
      if (await this.hasInventoryOrMovements(id)) {
        throw new ConflictException(
          'Cannot change the unit of an ingredient with inventory or movements',
        );
      }
    }

    return this.prisma.ingredient.update({
      where: { id },
      data,
    });
  }

  private async hasInventoryOrMovements(id: string): Promise<boolean> {
    const [lots, movements] = await Promise.all([
      this.prisma.inventoryLot.count({ where: { ingredientId: id } }),
      this.prisma.inventoryMovement.count({ where: { ingredientId: id } }),
    ]);
    return lots + movements > 0;
  }

  private async hasHistory(id: string): Promise<boolean> {
    const purchases = await this.prisma.ingredientPurchase.count({
      where: { ingredientId: id },
    });
    return purchases > 0 || (await this.hasInventoryOrMovements(id));
  }

  async remove(id: string) {
    await this.findById(id);

    if (await this.hasHistory(id)) {
      return this.prisma.ingredient.update({
        where: { id },
        data: { isActive: false },
      });
    }

    return this.prisma.ingredient.delete({ where: { id } });
  }

  async registerPurchase(ingredientId: string, dto: RegisterPurchaseDto) {
    await this.findById(ingredientId);

    const purchase = await this.prisma.ingredientPurchase.create({
      data: {
        ingredientId,
        quantity: dto.quantity,
        unitCost: dto.unitCost,
        totalCost: dto.quantity * dto.unitCost,
        currency: dto.currency,
        exchangeRateId: dto.exchangeRateId,
        purchaseDate: dto.purchaseDate || new Date(),
        notes: dto.notes,
      },
    });

    await this.prisma.ingredient.update({
      where: { id: ingredientId },
      data: {
        currentCost: dto.unitCost,
        currency: dto.currency,
      },
    });

    return purchase;
  }

  async getPurchases(ingredientId: string) {
    await this.findById(ingredientId);

    return this.prisma.ingredientPurchase.findMany({
      where: { ingredientId },
      orderBy: { purchaseDate: 'desc' },
    });
  }

  async deactivate(id: string) {
    await this.findById(id);

    return this.prisma.ingredient.update({
      where: { id },
      data: { isActive: false },
    });
  }
}
