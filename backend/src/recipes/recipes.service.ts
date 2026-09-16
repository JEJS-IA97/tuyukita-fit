import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateRecipeDto } from './dto/create-recipe.dto';
import { UpdateRecipeDto } from './dto/update-recipe.dto';

@Injectable()
export class RecipesService {
  constructor(private prisma: PrismaService) {}

  async create(dto: CreateRecipeDto) {
    return this.prisma.recipe.create({
      data: {
        name: dto.name,
        yieldQuantity: dto.yieldQuantity,
        yieldUnit: dto.yieldUnit,
        packageQuantity: dto.packageQuantity,
        productId: dto.productId,
        flavorId: dto.flavorId,
        recipeIngredients: {
          create: dto.ingredients?.map(ing => ({
            ingredientId: ing.ingredientId,
            quantity: ing.quantity,
            unit: ing.unit,
            costSnapshot: ing.costSnapshot,
          })) || [],
        },
        recipePackaging: {
          create: dto.packaging?.map(pack => ({
            packagingItemId: pack.packagingItemId,
            quantity: pack.quantity,
            costSnapshot: pack.costSnapshot,
          })) || [],
        },
      },
      include: {
        recipeIngredients: { include: { ingredient: true } },
        recipePackaging: { include: { packagingItem: true } },
      },
    });
  }

  async findAll() {
    return this.prisma.recipe.findMany({
      where: { isActive: true },
      include: {
        product: { select: { id: true, name: true } },
        flavor: { select: { id: true, name: true } },
        recipeIngredients: { include: { ingredient: true } },
        recipePackaging: { include: { packagingItem: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findById(id: string) {
    const recipe = await this.prisma.recipe.findUnique({
      where: { id },
      include: {
        product: true,
        flavor: true,
        recipeIngredients: { include: { ingredient: true } },
        recipePackaging: { include: { packagingItem: true } },
      },
    });

    if (!recipe) {
      throw new NotFoundException('Recipe not found');
    }

    return recipe;
  }

  async calculateCost(id: string) {
    const recipe = await this.findById(id);

    let totalIngredientCost = 0;
    for (const ri of recipe.recipeIngredients) {
      const cost = ri.costSnapshot || ri.ingredient.currentCost || 0;
      totalIngredientCost += cost * Number(ri.quantity);
    }

    let totalPackagingCost = 0;
    for (const rp of recipe.recipePackaging) {
      const cost = rp.costSnapshot || rp.packagingItem.currentCost || 0;
      totalPackagingCost += cost * Number(rp.quantity);
    }

    const totalBatchCost = totalIngredientCost + totalPackagingCost;
    const unitCost = totalBatchCost / Number(recipe.yieldQuantity);

    return {
      recipeId: recipe.id,
      yieldQuantity: recipe.yieldQuantity,
      yieldUnit: recipe.yieldUnit,
      totalIngredientCost,
      totalPackagingCost,
      totalBatchCost,
      unitCost,
      ingredients: recipe.recipeIngredients.map(ri => ({
        name: ri.ingredient.name,
        quantity: ri.quantity,
        unit: ri.unit,
        cost: ri.costSnapshot || ri.ingredient.currentCost,
      })),
      packaging: recipe.recipePackaging.map(rp => ({
        name: rp.packagingItem.name,
        quantity: rp.quantity,
        cost: rp.costSnapshot || rp.packagingItem.currentCost,
      })),
    };
  }

  async update(id: string, dto: UpdateRecipeDto) {
    await this.findById(id);

    if (dto.ingredients) {
      await this.prisma.recipeIngredient.deleteMany({ where: { recipeId: id } });
    }
    if (dto.packaging) {
      await this.prisma.recipePackaging.deleteMany({ where: { recipeId: id } });
    }

    return this.prisma.recipe.update({
      where: { id },
      data: {
        name: dto.name,
        yieldQuantity: dto.yieldQuantity,
        yieldUnit: dto.yieldUnit,
        packageQuantity: dto.packageQuantity,
        recipeIngredients: dto.ingredients ? {
          create: dto.ingredients.map(ing => ({
            ingredientId: ing.ingredientId,
            quantity: ing.quantity,
            unit: ing.unit,
            costSnapshot: ing.costSnapshot,
          })),
        } : undefined,
        recipePackaging: dto.packaging ? {
          create: dto.packaging.map(pack => ({
            packagingItemId: pack.packagingItemId,
            quantity: pack.quantity,
            costSnapshot: pack.costSnapshot,
          })),
        } : undefined,
      },
      include: {
        recipeIngredients: { include: { ingredient: true } },
        recipePackaging: { include: { packagingItem: true } },
      },
    });
  }

  async deactivate(id: string) {
    await this.findById(id);

    return this.prisma.recipe.update({
      where: { id },
      data: { isActive: false },
    });
  }
}
