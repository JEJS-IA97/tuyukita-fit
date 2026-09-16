import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreatePackagingDto } from './dto/create-packaging.dto';
import { UpdatePackagingDto } from './dto/update-packaging.dto';
import { RegisterPurchaseDto } from './dto/register-purchase.dto';

@Injectable()
export class PackagingService {
  constructor(private prisma: PrismaService) {}

  async create(dto: CreatePackagingDto) {
    return this.prisma.packagingItem.create({
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
    return this.prisma.packagingItem.findMany({
      where: { isActive: true },
      orderBy: { name: 'asc' },
    });
  }

  async findById(id: string) {
    const item = await this.prisma.packagingItem.findUnique({
      where: { id },
      include: {
        purchases: {
          orderBy: { createdAt: 'desc' },
          take: 10,
        },
      },
    });

    if (!item) {
      throw new NotFoundException('Packaging item not found');
    }

    return item;
  }

  async update(id: string, dto: UpdatePackagingDto) {
    await this.findById(id);

    return this.prisma.packagingItem.update({
      where: { id },
      data: dto,
    });
  }

  async registerPurchase(packagingItemId: string, dto: RegisterPurchaseDto) {
    await this.findById(packagingItemId);

    const purchase = await this.prisma.packagingPurchase.create({
      data: {
        packagingItemId,
        quantity: dto.quantity,
        unitCost: dto.unitCost,
        totalCost: dto.quantity * dto.unitCost,
        currency: dto.currency,
        exchangeRateId: dto.exchangeRateId,
        purchaseDate: dto.purchaseDate || new Date(),
        notes: dto.notes,
      },
    });

    await this.prisma.packagingItem.update({
      where: { id: packagingItemId },
      data: {
        currentCost: dto.unitCost,
        currency: dto.currency,
      },
    });

    return purchase;
  }

  async getPurchases(packagingItemId: string) {
    await this.findById(packagingItemId);

    return this.prisma.packagingPurchase.findMany({
      where: { packagingItemId },
      orderBy: { purchaseDate: 'desc' },
    });
  }

  async deactivate(id: string) {
    await this.findById(id);

    return this.prisma.packagingItem.update({
      where: { id },
      data: { isActive: false },
    });
  }
}
