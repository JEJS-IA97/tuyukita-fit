import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';

@Injectable()
export class ProductsService {
  constructor(private prisma: PrismaService) {}

  async create(dto: CreateProductDto) {
    return this.prisma.product.create({
      data: {
        name: dto.name,
        description: dto.description,
        type: dto.type,
        defaultCurrency: dto.defaultCurrency || 'USD',
        packageQuantity: dto.packageQuantity || 8,
      },
    });
  }

  async findAll() {
    return this.prisma.product.findMany({
      where: { isActive: true },
      include: {
        flavors: true,
        _count: {
          select: { saleItems: true, recipes: true },
        },
      },
      orderBy: { name: 'asc' },
    });
  }

  async findById(id: string) {
    const product = await this.prisma.product.findUnique({
      where: { id },
      include: {
        flavors: true,
        recipes: {
          include: {
            recipeIngredients: { include: { ingredient: true } },
            recipePackaging: { include: { packagingItem: true } },
          },
        },
        productCostSnapshots: {
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
    });

    if (!product) {
      throw new NotFoundException('Product not found');
    }

    return product;
  }

  async update(id: string, dto: UpdateProductDto) {
    await this.findById(id);

    return this.prisma.product.update({
      where: { id },
      data: dto,
    });
  }

  async deactivate(id: string) {
    await this.findById(id);

    return this.prisma.product.update({
      where: { id },
      data: { isActive: false },
    });
  }
}
