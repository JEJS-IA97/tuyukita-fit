import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { normalizeName } from '../common/name-normalization';
import { CreateExpenseCategoryDto } from './dto/create-expense-category.dto';
import { UpdateExpenseCategoryDto } from './dto/update-expense-category.dto';

@Injectable()
export class ExpenseCategoriesService {
  constructor(private prisma: PrismaService) {}

  async create(dto: CreateExpenseCategoryDto, createdById?: string) {
    const normalizedName = normalizeName(dto.name);

    const existing = await this.prisma.expenseCategory.findUnique({
      where: { normalizedName },
    });
    if (existing) {
      throw new ConflictException('Expense category already exists');
    }

    return this.prisma.expenseCategory.create({
      data: {
        name: dto.name,
        normalizedName,
        createdById: createdById ?? null,
      },
    });
  }

  async findAll() {
    return this.prisma.expenseCategory.findMany({
      orderBy: { name: 'asc' },
    });
  }

  async findById(id: string) {
    const category = await this.prisma.expenseCategory.findUnique({
      where: { id },
    });
    if (!category) {
      throw new NotFoundException('Expense category not found');
    }
    return category;
  }

  async update(id: string, dto: UpdateExpenseCategoryDto) {
    const current = await this.findById(id);

    const data: UpdateExpenseCategoryDto & { normalizedName?: string } = {
      ...dto,
    };

    if (dto.name !== undefined) {
      const normalizedName = normalizeName(dto.name);
      if (normalizedName !== current.normalizedName) {
        const conflict = await this.prisma.expenseCategory.findUnique({
          where: { normalizedName },
        });
        if (conflict && conflict.id !== id) {
          throw new ConflictException('Expense category already exists');
        }
      }
      data.normalizedName = normalizedName;
    }

    return this.prisma.expenseCategory.update({
      where: { id },
      data,
    });
  }

  async remove(id: string) {
    await this.findById(id);

    const references = await this.prisma.expense.count({
      where: { categoryId: id },
    });
    if (references > 0) {
      throw new ConflictException('Expense category is in use');
    }

    return this.prisma.expenseCategory.delete({ where: { id } });
  }
}
