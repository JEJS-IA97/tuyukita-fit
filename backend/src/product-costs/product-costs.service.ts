import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ProductCostSnapshot } from '@prisma/client';

@Injectable()
export class ProductCostsService {
  constructor(private prisma: PrismaService) {}

  async getCostByProduct(productId: string) {
    const product = await this.prisma.product.findUnique({
      where: { id: productId },
      include: {
        recipes: {
          where: { isActive: true },
          include: {
            recipeIngredients: { include: { ingredient: true } },
            recipePackaging: { include: { packagingItem: true } },
          },
        },
        productCostSnapshots: {
          orderBy: { createdAt: 'desc' },
          take: 5,
        },
      },
    });

    if (!product) {
      throw new NotFoundException('Product not found');
    }

    return {
      product: {
        id: product.id,
        name: product.name,
      },
      recipes: product.recipes.map(recipe => ({
        id: recipe.id,
        name: recipe.name,
        yieldQuantity: recipe.yieldQuantity,
        yieldUnit: recipe.yieldUnit,
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
      })),
      costSnapshots: product.productCostSnapshots,
    };
  }

  async getCostByProductAndFlavor(productId: string, flavorId: string) {
    const snapshots = await this.prisma.productCostSnapshot.findMany({
      where: { productId, flavorId },
      orderBy: { createdAt: 'desc' },
      take: 10,
    });

    return snapshots;
  }

  async recalculate(productId: string) {
    const recipes = await this.prisma.recipe.findMany({
      where: { productId, isActive: true },
      include: {
        recipeIngredients: { include: { ingredient: true } },
        recipePackaging: { include: { packagingItem: true } },
      },
    });

    const snapshots: any[] = [];

    for (const recipe of recipes) {
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

      const snapshot = await this.prisma.productCostSnapshot.create({
        data: {
          productId,
          flavorId: recipe.flavorId,
          recipeId: recipe.id,
          ingredientCost: totalIngredientCost,
          packagingCost: totalPackagingCost,
          otherDirectCost: 0,
          totalRecipeCost: totalBatchCost,
          yieldQuantity: Number(recipe.yieldQuantity),
          unitCost,
          currency: 'USD',
        },
      });

      snapshots.push(snapshot);
    }

    return snapshots;
  }
}
