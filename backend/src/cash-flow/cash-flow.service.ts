import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class CashFlowService {
  constructor(private prisma: PrismaService) {}

  async getSummary() {
    const accounts = await this.prisma.cashAccount.findMany({
      where: { isActive: true },
      include: {
        cashMovements: {
          orderBy: { movementDate: 'desc' },
          take: 1,
        },
      },
    });

    const totalByCurrency: Record<string, number> = {};

    for (const account of accounts) {
      const lastMovement = account.cashMovements[0];
      const balance = lastMovement
        ? lastMovement.amount
        : account.openingBalance;

      if (!totalByCurrency[account.currency]) {
        totalByCurrency[account.currency] = 0;
      }
      totalByCurrency[account.currency] += balance;
    }

    return {
      accounts: accounts.map(acc => ({
        id: acc.id,
        name: acc.name,
        type: acc.type,
        currency: acc.currency,
        openingBalance: acc.openingBalance,
        currentBalance: acc.cashMovements[0]?.amount || acc.openingBalance,
      })),
      totalByCurrency,
    };
  }

  async getMovements(filters?: {
    startDate?: string;
    endDate?: string;
    type?: string;
    page?: number;
    limit?: number;
  }) {
    const page = filters?.page || 1;
    const limit = filters?.limit || 50;
    const skip = (page - 1) * limit;

    const where: any = {};

    if (filters?.startDate || filters?.endDate) {
      where.movementDate = {};
      if (filters.startDate) where.movementDate.gte = new Date(filters.startDate);
      if (filters.endDate) where.movementDate.lte = new Date(filters.endDate);
    }

    if (filters?.type) {
      where.type = filters.type;
    }

    const [movements, total] = await Promise.all([
      this.prisma.cashMovement.findMany({
        where,
        include: {
          cashAccount: true,
          exchangeRate: true,
        },
        orderBy: { movementDate: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.cashMovement.count({ where }),
    ]);

    return {
      data: movements,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async createAccount(data: {
    name: string;
    type: string;
    currency: string;
    openingBalance?: number;
  }) {
    return this.prisma.cashAccount.create({
      data: {
        name: data.name,
        type: data.type,
        currency: data.currency,
        openingBalance: data.openingBalance || 0,
      },
    });
  }

  async getAccounts() {
    return this.prisma.cashAccount.findMany({
      where: { isActive: true },
      orderBy: { name: 'asc' },
    });
  }

  async createAdjustment(data: {
    cashAccountId: string;
    amount: number;
    currency: string;
    description: string;
    movementDate: Date;
    createdById: string;
  }) {
    const lastMovement = await this.prisma.cashMovement.findFirst({
      where: { cashAccountId: data.cashAccountId },
      orderBy: { movementDate: 'desc' },
    });

    const previousBalance = lastMovement?.amount || 0;
    const newBalance = previousBalance + data.amount;

    return this.prisma.cashMovement.create({
      data: {
        cashAccountId: data.cashAccountId,
        type: data.amount >= 0 ? 'ADJUSTMENT_IN' : 'ADJUSTMENT_OUT',
        sourceType: 'MANUAL',
        description: data.description,
        amount: newBalance,
        currency: data.currency,
        movementDate: data.movementDate,
        createdById: data.createdById,
      },
    });
  }
}
