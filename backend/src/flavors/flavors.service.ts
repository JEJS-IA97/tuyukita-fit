import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateFlavorDto } from './dto/create-flavor.dto';
import { UpdateFlavorDto } from './dto/update-flavor.dto';

@Injectable()
export class FlavorsService {
  constructor(private prisma: PrismaService) {}

  async create(productId: string, dto: CreateFlavorDto) {
    return this.prisma.flavor.create({
      data: {
        name: dto.name,
        description: dto.description,
        productId,
      },
    });
  }

  async findAll(productId?: string) {
    const where = productId ? { productId } : {};
    return this.prisma.flavor.findMany({
      where: { ...where, isActive: true },
      include: { product: { select: { id: true, name: true } } },
      orderBy: { name: 'asc' },
    });
  }

  async findById(id: string) {
    const flavor = await this.prisma.flavor.findUnique({
      where: { id },
      include: { product: true },
    });

    if (!flavor) {
      throw new NotFoundException('Flavor not found');
    }

    return flavor;
  }

  async update(id: string, dto: UpdateFlavorDto) {
    await this.findById(id);

    return this.prisma.flavor.update({
      where: { id },
      data: dto,
    });
  }

  async deactivate(id: string) {
    await this.findById(id);

    return this.prisma.flavor.update({
      where: { id },
      data: { isActive: false },
    });
  }
}
