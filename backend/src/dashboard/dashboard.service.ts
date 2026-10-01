import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class DashboardService {
  constructor(private prisma: PrismaService) {}

  async getSummary(startDate?: string, endDate?: string) {
    const start = startDate ? new Date(startDate) : this.getStartOfMonth();
    const end = endDate ? new Date(endDate) : new Date();

    const [salesSummary, expensesSummary, productionSummary] = await Promise.all([
      this.getSalesSummary(start, end),
      this.getExpensesSummary(start, end),
      this.getProductionSummary(start, end),
    ]);

    const grossProfit = salesSummary.totalRevenue - salesSummary.totalCostOfGoodsSold;
    const netProfit = grossProfit - expensesSummary.totalPaid;

    return {
      period: {
        from: start,
        to: end,
      },
      metrics: {
        salesRevenue: salesSummary.totalSales,
        collectedSales: salesSummary.totalCollected,
        grossProfit,
        paidExpenses: expensesSummary.totalPaid,
        availableMoney: salesSummary.totalCollected - expensesSummary.totalPaid,
        accountsReceivable: salesSummary.totalPending,
        pendingExpenses: expensesSummary.totalPending,
        unitsSold: salesSummary.unitsSold,
        costOfGoodsSold: salesSummary.totalCostOfGoodsSold,
        netProfit,
      },
      sales: {
        count: salesSummary.salesCount,
        averageTicket: salesSummary.salesCount > 0
          ? salesSummary.totalSales / salesSummary.salesCount
          : 0,
      },
      expenses: {
        count: expensesSummary.expensesCount,
        byCategory: expensesSummary.byCategory,
      },
      production: {
        unitsProduced: productionSummary.unitsProduced,
        batchesCount: productionSummary.batchesCount,
      },
    };
  }

  async getSalesByMonth(year?: number) {
    const currentYear = year || new Date().getFullYear();

    const sales = await this.prisma.sale.groupBy({
      by: ['saleDate'],
      where: {
        saleDate: {
          gte: new Date(currentYear, 0, 1),
          lt: new Date(currentYear + 1, 0, 1),
        },
      },
      _sum: {
        total: true,
        collectedAmount: true,
      },
      _count: true,
    });

    const monthlyData: Record<number, { total: number; collected: number; count: number }> = {};

    for (let i = 1; i <= 12; i++) {
      monthlyData[i] = { total: 0, collected: 0, count: 0 };
    }

    for (const sale of sales) {
      const month = sale.saleDate.getMonth() + 1;
      monthlyData[month].total += sale._sum.total || 0;
      monthlyData[month].collected += sale._sum.collectedAmount || 0;
      monthlyData[month].count += sale._count;
    }

    return Object.entries(monthlyData).map(([month, data]) => ({
      month: parseInt(month),
      total: data.total,
      collected: data.collected,
      count: data.count,
    }));
  }

  async getExpensesByMonth(year?: number) {
    const currentYear = year || new Date().getFullYear();

    const expenses = await this.prisma.expense.groupBy({
      by: ['category'],
      where: {
        expenseDate: {
          gte: new Date(currentYear, 0, 1),
          lt: new Date(currentYear + 1, 0, 1),
        },
      },
      _sum: {
        amount: true,
        paidAmount: true,
      },
      _count: true,
    });

    return expenses.map(exp => ({
      category: exp.category,
      total: exp._sum.amount,
      paid: exp._sum.paidAmount,
      count: exp._count,
    }));
  }

  async getSalesByFlavor(startDate?: string, endDate?: string) {
    const start = startDate ? new Date(startDate) : this.getStartOfMonth();
    const end = endDate ? new Date(endDate) : new Date();

    const salesByFlavor = await this.prisma.saleItem.groupBy({
      by: ['flavorId'],
      where: {
        sale: {
          saleDate: {
            gte: start,
            lte: end,
          },
        },
      },
      _sum: {
        quantity: true,
        subtotal: true,
      },
      _count: true,
    });

    const flavors = await this.prisma.flavor.findMany();
    const flavorMap = new Map(flavors.map(f => [f.id, f.name]));

    return salesByFlavor
      .filter(item => item.flavorId)
      .map(item => ({
        flavorId: item.flavorId,
        flavorName: flavorMap.get(item.flavorId!) || 'Unknown',
        quantitySold: item._sum.quantity,
        totalRevenue: item._sum.subtotal,
        salesCount: item._count,
      }));
  }

  async getRecentTransactions(limit = 10) {
    const [recentSales, recentExpenses] = await Promise.all([
      this.prisma.sale.findMany({
        take: limit,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          saleNumber: true,
          saleDate: true,
          total: true,
          currency: true,
          customerName: true,
          paymentStatus: true,
        },
      }),
      this.prisma.expense.findMany({
        take: limit,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          expenseNumber: true,
          expenseDate: true,
          amount: true,
          currency: true,
          category: true,
          description: true,
          paymentStatus: true,
        },
      }),
    ]);

    const transactions = [
      ...recentSales.map(s => ({
        type: 'SALE',
        id: s.id,
        number: s.saleNumber,
        date: s.saleDate,
        amount: s.total,
        currency: s.currency,
        description: s.customerName || 'Venta',
        status: s.paymentStatus,
      })),
      ...recentExpenses.map(e => ({
        type: 'EXPENSE',
        id: e.id,
        number: e.expenseNumber,
        date: e.expenseDate,
        amount: e.amount,
        currency: e.currency,
        description: e.description,
        status: e.paymentStatus,
      })),
    ];

    return transactions
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, limit);
  }

  async getAlerts() {
    const alerts: Array<{
      type: 'WARNING' | 'INFO' | 'ERROR';
      message: string;
    }> = [];

    const pendingSales = await this.prisma.sale.count({
      where: { paymentStatus: 'PENDING' },
    });

    if (pendingSales > 0) {
      alerts.push({
        type: 'WARNING',
        message: `${pendingSales} ventas pendientes por cobrar`,
      });
    }

    const pendingExpenses = await this.prisma.expense.count({
      where: { paymentStatus: 'PENDING' },
    });

    if (pendingExpenses > 0) {
      alerts.push({
        type: 'WARNING',
        message: `${pendingExpenses} gastos pendientes por pagar`,
      });
    }

    const productsWithoutRecipes = await this.prisma.product.findMany({
      where: {
        isActive: true,
        recipes: { none: { isActive: true } },
      },
    });

    if (productsWithoutRecipes.length > 0) {
      alerts.push({
        type: 'INFO',
        message: `${productsWithoutRecipes.length} productos sin receta configurada`,
      });
    }

    return alerts;
  }

  private async getSalesSummary(start: Date, end: Date) {
    const where = {
      saleDate: { gte: start, lte: end },
    };

    const [salesAgg, itemsAgg] = await Promise.all([
      this.prisma.sale.aggregate({
        where,
        _sum: {
          total: true,
          collectedAmount: true,
          pendingAmount: true,
        },
        _count: true,
      }),
      this.prisma.saleItem.aggregate({
        where: { sale: where },
        _sum: {
          quantity: true,
          subtotal: true,
          totalProductionCost: true,
        },
      }),
    ]);

    return {
      totalSales: salesAgg._sum.total || 0,
      totalCollected: salesAgg._sum.collectedAmount || 0,
      totalPending: salesAgg._sum.pendingAmount || 0,
      salesCount: salesAgg._count,
      unitsSold: itemsAgg._sum.quantity || 0,
      totalRevenue: itemsAgg._sum.subtotal || 0,
      totalCostOfGoodsSold: itemsAgg._sum.totalProductionCost || 0,
    };
  }

  private async getExpensesSummary(start: Date, end: Date) {
    const where = {
      expenseDate: { gte: start, lte: end },
    };

    const [summary, byCategory] = await Promise.all([
      this.prisma.expense.aggregate({
        where,
        _sum: {
          amount: true,
          paidAmount: true,
          pendingAmount: true,
        },
        _count: true,
      }),
      this.prisma.expense.groupBy({
        by: ['category'],
        where,
        _sum: { amount: true, paidAmount: true },
      }),
    ]);

    return {
      totalExpenses: summary._sum.amount || 0,
      totalPaid: summary._sum.paidAmount || 0,
      totalPending: summary._sum.pendingAmount || 0,
      expensesCount: summary._count,
      byCategory: byCategory.map(cat => ({
        category: cat.category,
        total: cat._sum.amount,
        paid: cat._sum.paidAmount,
      })),
    };
  }

  private async getProductionSummary(start: Date, end: Date) {
    const result = await this.prisma.productionBatch.aggregate({
      where: {
        productionDate: { gte: start, lte: end },
        status: 'completed',
      },
      _sum: {
        quantityProduced: true,
      },
      _count: true,
    });

    return {
      unitsProduced: result._sum?.quantityProduced || 0,
      batchesCount: result._count,
    };
  }

  private getStartOfMonth() {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  }
}
