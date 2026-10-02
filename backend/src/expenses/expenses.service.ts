import { Injectable, NotFoundException, BadRequestException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateExpenseDto } from './dto/create-expense.dto';
import { CreateManualExpenseDto } from './dto/create-manual-expense.dto';
import { UpdateExpenseDto } from './dto/update-expense.dto';
import { ExchangeRatesService } from '../exchange-rates/exchange-rates.service';
import { AuditService } from '../audit/audit.service';
import { toMinor, vesToUsd } from '../common/money';

@Injectable()
export class ExpensesService {
  constructor(
    private prisma: PrismaService,
    private exchangeRates: ExchangeRatesService,
    private audit: AuditService,
  ) {}

  async createManual(dto: CreateManualExpenseDto, userId: string) {
    const rate = await this.exchangeRates.getLatestValid(dto.rateType);
    if (!rate) {
      throw new NotFoundException(
        `No valid ${dto.rateType} exchange rate has ever been registered`,
      );
    }

    const expenseNumber = await this.generateExpenseNumber();
    const paidAmount = dto.paidAmount || 0;

    return this.prisma.expense.create({
      data: {
        expenseNumber,
        expenseDate: dto.expenseDate ? new Date(dto.expenseDate) : new Date(),
        category: dto.category,
        categoryId: dto.categoryId ?? null,
        description: dto.description,
        amount: dto.amountVes,
        paidAmount,
        pendingAmount: dto.amountVes - paidAmount,
        currency: 'VES',
        amountVesMinor: toMinor(dto.amountVes),
        amountUsdMinor: toMinor(vesToUsd(dto.amountVes, rate.vesPerUsd)),
        exchangeRateId: rate.id,
        exchangeRateValue: rate.vesPerUsd,
        exchangeRateType: rate.rateType,
        exchangeRateSource: rate.source,
        exchangeRateDate: rate.date,
        paymentStatus: this.calculatePaymentStatus(dto.amountVes, paidAmount),
        paymentMethod: dto.paymentMethod,
        supplierName: dto.supplierName,
        notes: dto.notes,
        createdById: userId,
      },
    });
  }

  async create(dto: CreateExpenseDto, userId: string) {
    const expenseNumber = await this.generateExpenseNumber();

    const expense = await this.prisma.expense.create({
      data: {
        expenseNumber,
        expenseDate: dto.expenseDate ? new Date(dto.expenseDate) : new Date(),
        category: dto.category,
        description: dto.description,
        amount: dto.amount,
        paidAmount: dto.paidAmount || 0,
        pendingAmount: dto.amount - (dto.paidAmount || 0),
        currency: dto.currency,
        exchangeRateId: dto.exchangeRateId,
        exchangeRateValue: dto.exchangeRateValue,
        paymentStatus: this.calculatePaymentStatus(dto.amount, dto.paidAmount || 0),
        paymentMethod: dto.paymentMethod,
        supplierName: dto.supplierName,
        notes: dto.notes,
        createdById: userId,
      },
    });

    return expense;
  }

  async findAll(filters?: {
    startDate?: string;
    endDate?: string;
    category?: string;
    paymentStatus?: string;
    page?: number;
    limit?: number;
  }) {
    const page = filters?.page || 1;
    const limit = filters?.limit || 20;
    const skip = (page - 1) * limit;

    const where: any = {};

    if (filters?.startDate || filters?.endDate) {
      where.expenseDate = {};
      if (filters.startDate) where.expenseDate.gte = new Date(filters.startDate);
      if (filters.endDate) where.expenseDate.lte = new Date(filters.endDate);
    }

    if (filters?.category) {
      where.category = filters.category;
    }

    if (filters?.paymentStatus) {
      where.paymentStatus = filters.paymentStatus;
    }

    where.isActive = true;

    const [expenses, total] = await Promise.all([
      this.prisma.expense.findMany({
        where,
        orderBy: { expenseDate: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.expense.count({ where }),
    ]);

    return {
      data: expenses,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findById(id: string) {
    const expense = await this.prisma.expense.findUnique({
      where: { id },
      include: {
        createdBy: {
          select: { id: true, name: true, username: true },
        },
      },
    });

    if (!expense) {
      throw new NotFoundException('Expense not found');
    }

    return expense;
  }

  async update(id: string, dto: UpdateExpenseDto, userId: string) {
    const expense = await this.findById(id);

    const linked = await this.prisma.ingredientPurchase.findFirst({
      where: { expenseId: id },
    });
    if (linked) {
      throw new ConflictException(
        'Expense is linked to a purchase; correct the purchase instead',
      );
    }

    const amount = dto.amount ?? expense.amount;
    const paidAmount = dto.paidAmount ?? expense.paidAmount;
    const data: any = {
      ...dto,
      expenseDate: dto.expenseDate ? new Date(dto.expenseDate) : undefined,
      paidAmount,
      pendingAmount: amount - paidAmount,
      paymentStatus: this.calculatePaymentStatus(amount, paidAmount),
    };
    if (dto.amount !== undefined && expense.currency === 'VES') {
      data.amountVesMinor = toMinor(dto.amount);
      if (expense.exchangeRateValue) {
        data.amountUsdMinor = toMinor(dto.amount / expense.exchangeRateValue);
      }
    }

    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.expense.update({ where: { id }, data });
      await this.audit.record(tx, {
        userId,
        entity: 'expense',
        entityId: id,
        action: 'UPDATE',
        oldValue: expense,
        newValue: updated,
      });
      return updated;
    });
  }

  async remove(id: string, userId: string) {
    const expense = await this.findById(id);

    const linked = await this.prisma.ingredientPurchase.findFirst({
      where: { expenseId: id },
    });
    if (linked) {
      throw new ConflictException(
        'Expense is linked to a purchase; delete the purchase instead',
      );
    }

    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.expense.update({
        where: { id },
        data: { isActive: false },
      });
      await this.audit.record(tx, {
        userId,
        entity: 'expense',
        entityId: id,
        action: 'ANULAR',
        oldValue: { isActive: expense.isActive },
        newValue: { isActive: false },
      });
      return updated;
    });
  }

  async getSummary(startDate?: string, endDate?: string) {
    const where: any = { isActive: true };

    if (startDate || endDate) {
      where.expenseDate = {};
      if (startDate) where.expenseDate.gte = new Date(startDate);
      if (endDate) where.expenseDate.lte = new Date(endDate);
    }

    const summary = await this.prisma.expense.aggregate({
      where,
      _sum: {
        amount: true,
        paidAmount: true,
        pendingAmount: true,
      },
      _count: true,
    });

    const byCategory = await this.prisma.expense.groupBy({
      by: ['category'],
      where,
      _sum: {
        amount: true,
        paidAmount: true,
      },
      _count: true,
    });

    return {
      totalExpenses: summary._sum.amount || 0,
      totalPaid: summary._sum.paidAmount || 0,
      totalPending: summary._sum.pendingAmount || 0,
      expensesCount: summary._count,
      byCategory: byCategory.map(cat => ({
        category: cat.category,
        total: cat._sum.amount,
        paid: cat._sum.paidAmount,
        count: cat._count,
      })),
    };
  }

  private calculatePaymentStatus(amount: number, paidAmount: number) {
    if (paidAmount >= amount) return 'PAID';
    if (paidAmount > 0) return 'PARTIALLY_PAID';
    return 'PENDING';
  }

  private async generateExpenseNumber() {
    const lastExpense = await this.prisma.expense.findFirst({
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
