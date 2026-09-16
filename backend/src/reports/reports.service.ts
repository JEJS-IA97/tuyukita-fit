import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ReportsService {
  constructor(private prisma: PrismaService) {}

  async getSalesReport(startDate?: string, endDate?: string) {
    const where: any = {};
    if (startDate || endDate) {
      where.saleDate = {};
      if (startDate) where.saleDate.gte = new Date(startDate);
      if (endDate) where.saleDate.lte = new Date(endDate);
    }

    const [summary, byFlavor, byMonth] = await Promise.all([
      this.prisma.sale.aggregate({
        where,
        _sum: { total: true, collectedAmount: true, pendingAmount: true },
        _count: true,
      }),
      this.prisma.saleItem.groupBy({
        by: ['flavorId'],
        where: { sale: where },
        _sum: { quantity: true, subtotal: true },
      }),
      this.prisma.sale.groupBy({
        by: ['saleDate'],
        where,
        _sum: { total: true },
      }),
    ]);

    return {
      summary: {
        totalSales: summary._sum.total,
        totalCollected: summary._sum.collectedAmount,
        totalPending: summary._sum.pendingAmount,
        count: summary._count,
      },
      byFlavor: byFlavor.filter(f => f.flavorId),
      byMonth,
    };
  }

  async getExpensesReport(startDate?: string, endDate?: string) {
    const where: any = {};
    if (startDate || endDate) {
      where.expenseDate = {};
      if (startDate) where.expenseDate.gte = new Date(startDate);
      if (endDate) where.expenseDate.lte = new Date(endDate);
    }

    const [summary, byCategory] = await Promise.all([
      this.prisma.expense.aggregate({
        where,
        _sum: { amount: true, paidAmount: true, pendingAmount: true },
        _count: true,
      }),
      this.prisma.expense.groupBy({
        by: ['category'],
        where,
        _sum: { amount: true, paidAmount: true },
        _count: true,
      }),
    ]);

    return {
      summary: {
        totalExpenses: summary._sum.amount,
        totalPaid: summary._sum.paidAmount,
        totalPending: summary._sum.pendingAmount,
        count: summary._count,
      },
      byCategory: byCategory.map(cat => ({
        category: cat.category,
        total: cat._sum.amount,
        paid: cat._sum.paidAmount,
        count: cat._count,
      })),
    };
  }

  async getGrossProfitReport(startDate?: string, endDate?: string) {
    const where: any = {};
    if (startDate || endDate) {
      where.saleDate = {};
      if (startDate) where.saleDate.gte = new Date(startDate);
      if (endDate) where.saleDate.lte = new Date(endDate);
    }

    const items = await this.prisma.saleItem.aggregate({
      where: { sale: where },
      _sum: {
        subtotal: true,
        totalProductionCost: true,
        grossProfit: true,
      },
    });

    return {
      revenue: items._sum.subtotal,
      costOfGoodsSold: items._sum.totalProductionCost,
      grossProfit: items._sum.grossProfit,
    };
  }

  async getAvailableMoneyReport() {
    const accounts = await this.prisma.cashAccount.findMany({
      where: { isActive: true },
      include: {
        cashMovements: {
          orderBy: { movementDate: 'desc' },
          take: 1,
        },
      },
    });

    const totalByCurrency: Record<string, any> = {};

    for (const account of accounts) {
      const balance = account.cashMovements[0]?.amount || account.openingBalance;
      if (!totalByCurrency[account.currency]) {
        totalByCurrency[account.currency] = { total: 0, accounts: [] };
      }
      totalByCurrency[account.currency].total += balance;
      totalByCurrency[account.currency].accounts.push({
        name: account.name,
        type: account.type,
        balance,
      });
    }

    return totalByCurrency;
  }

  async getAccountsReceivableReport() {
    const pendingSales = await this.prisma.sale.findMany({
      where: {
        paymentStatus: { in: ['PENDING', 'PARTIALLY_PAID'] },
      },
      include: {
        saleItems: { include: { product: true } },
        payments: true,
      },
      orderBy: { saleDate: 'desc' },
    });

    return pendingSales.map(sale => ({
      id: sale.id,
      saleNumber: sale.saleNumber,
      saleDate: sale.saleDate,
      customerName: sale.customerName,
      total: sale.total,
      collectedAmount: sale.collectedAmount,
      pendingAmount: sale.pendingAmount,
      paymentStatus: sale.paymentStatus,
    }));
  }

  async getPendingExpensesReport() {
    const pendingExpenses = await this.prisma.expense.findMany({
      where: {
        paymentStatus: { in: ['PENDING', 'PARTIALLY_PAID'] },
      },
      orderBy: { expenseDate: 'desc' },
    });

    return pendingExpenses.map(expense => ({
      id: expense.id,
      expenseNumber: expense.expenseNumber,
      expenseDate: expense.expenseDate,
      category: expense.category,
      description: expense.description,
      amount: expense.amount,
      paidAmount: expense.paidAmount,
      pendingAmount: expense.pendingAmount,
      paymentStatus: expense.paymentStatus,
      supplierName: expense.supplierName,
    }));
  }
}
