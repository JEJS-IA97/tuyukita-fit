import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateIngredientDto } from './dto/create-ingredient.dto';
import { UpdateIngredientDto } from './dto/update-ingredient.dto';
import { RegisterPurchaseDto } from './dto/register-purchase.dto';

@Injectable()
export class IngredientsService {
  constructor(private prisma: PrismaService) {}

  async create(dto: CreateIngredientDto) {
    return this.prisma.ingredient.create({
      data: {
        name: dto.name,
        description: dto.description,
        unit: dto.unit,
        currentCost: dto.currentCost,
        currency: dto.currency || 'USD',
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
    await this.findById(id);

    return this.prisma.ingredient.update({
      where: { id },
      data: dto,
    });
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
