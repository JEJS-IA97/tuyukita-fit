import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateSaleDto } from './dto/create-sale.dto';
import { CreatePaymentDto } from './dto/create-payment.dto';

@Injectable()
export class SalesService {
  constructor(private prisma: PrismaService) {}

  async create(dto: CreateSaleDto, userId: string) {
    const saleNumber = await this.generateSaleNumber();

    let subtotal = 0;
    const saleItems = [];

    for (const item of dto.items) {
      const itemSubtotal = item.quantity * item.unitPrice;
      subtotal += itemSubtotal;

      saleItems.push({
        productId: item.productId,
        flavorId: item.flavorId,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        subtotal: itemSubtotal,
        currency: dto.currency,
        unitProductionCost: item.unitProductionCost,
        totalProductionCost: item.totalProductionCost
          ? item.quantity * item.unitProductionCost
          : null,
        grossProfit: item.totalProductionCost
          ? itemSubtotal - item.quantity * item.unitProductionCost
          : null,
      });
    }

    const total = subtotal - (dto.discount || 0);

    const sale = await this.prisma.sale.create({
      data: {
        saleNumber,
        saleDate: dto.saleDate ? new Date(dto.saleDate) : new Date(),
        customerName: dto.customerName,
        currency: dto.currency,
        exchangeRateId: dto.exchangeRateId,
        exchangeRateValue: dto.exchangeRateValue,
        subtotal,
        discount: dto.discount || 0,
        total,
        collectedAmount: dto.collectedAmount || 0,
        pendingAmount: total - (dto.collectedAmount || 0),
        paymentStatus: this.calculatePaymentStatus(total, dto.collectedAmount || 0),
        notes: dto.notes,
        createdById: userId,
        saleItems: {
          create: saleItems,
        },
      },
      include: {
        saleItems: {
          include: {
            product: true,
            flavor: true,
          },
        },
      },
    });

    return sale;
  }

  async findAll(filters?: {
    startDate?: string;
    endDate?: string;
    productId?: string;
    flavorId?: string;
    paymentStatus?: string;
    page?: number;
    limit?: number;
  }) {
    const page = filters?.page || 1;
    const limit = filters?.limit || 20;
    const skip = (page - 1) * limit;

    const where: any = {};

    if (filters?.startDate || filters?.endDate) {
      where.saleDate = {};
      if (filters.startDate) where.saleDate.gte = new Date(filters.startDate);
      if (filters.endDate) where.saleDate.lte = new Date(filters.endDate);
    }

    if (filters?.productId) {
      where.saleItems = { some: { productId: filters.productId } };
    }

    if (filters?.flavorId) {
      where.saleItems = { some: { flavorId: filters.flavorId } };
    }

    if (filters?.paymentStatus) {
      where.paymentStatus = filters.paymentStatus;
    }

    const [sales, total] = await Promise.all([
      this.prisma.sale.findMany({
        where,
        include: {
          saleItems: {
            include: {
              product: true,
              flavor: true,
            },
          },
          payments: true,
        },
        orderBy: { saleDate: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.sale.count({ where }),
    ]);

    return {
      data: sales,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findById(id: string) {
    const sale = await this.prisma.sale.findUnique({
      where: { id },
      include: {
        saleItems: {
          include: {
            product: true,
            flavor: true,
            costSnapshot: true,
          },
        },
        payments: true,
        createdBy: {
          select: { id: true, name: true, email: true },
        },
      },
    });

    if (!sale) {
      throw new NotFoundException('Sale not found');
    }

    return sale;
  }

  async addPayment(saleId: string, dto: CreatePaymentDto) {
    const sale = await this.findById(saleId);

    if (sale.paymentStatus === 'PAID') {
      throw new BadRequestException('Sale is already fully paid');
    }

    const payment = await this.prisma.payment.create({
      data: {
        saleId,
        amount: dto.amount,
        currency: dto.currency,
        exchangeRateId: dto.exchangeRateId,
        exchangeRateValue: dto.exchangeRateValue,
        paymentMethod: dto.paymentMethod,
        paymentDate: dto.paymentDate ? new Date(dto.paymentDate) : new Date(),
        cashAccountId: dto.cashAccountId,
        notes: dto.notes,
      },
    });

    const totalPayments = await this.prisma.payment.aggregate({
      where: { saleId },
      _sum: { amount: true },
    });

    const collectedAmount = totalPayments._sum.amount || 0;
    const pendingAmount = sale.total - collectedAmount;
    const paymentStatus = this.calculatePaymentStatus(sale.total, collectedAmount);

    await this.prisma.sale.update({
      where: { id: saleId },
      data: {
        collectedAmount,
        pendingAmount,
        paymentStatus,
      },
    });

    return payment;
  }

  async getPayments(saleId: string) {
    await this.findById(saleId);

    return this.prisma.payment.findMany({
      where: { saleId },
      orderBy: { paymentDate: 'desc' },
    });
  }

  async getSummary(startDate?: string, endDate?: string) {
    const where: any = {};

    if (startDate || endDate) {
      where.saleDate = {};
      if (startDate) where.saleDate.gte = new Date(startDate);
      if (endDate) where.saleDate.lte = new Date(endDate);
    }

    const summary = await this.prisma.sale.aggregate({
      where,
      _sum: {
        subtotal: true,
        discount: true,
        total: true,
        collectedAmount: true,
        pendingAmount: true,
      },
      _count: true,
    });

    const itemsSummary = await this.prisma.saleItem.aggregate({
      where: { sale: where },
      _sum: {
        quantity: true,
        subtotal: true,
        totalProductionCost: true,
        grossProfit: true,
      },
    });

    return {
      totalSales: summary._sum.total || 0,
      totalCollected: summary._sum.collectedAmount || 0,
      totalPending: summary._sum.pendingAmount || 0,
      totalDiscount: summary._sum.discount || 0,
      salesCount: summary._count,
      unitsSold: itemsSummary._sum.quantity || 0,
      totalRevenue: itemsSummary._sum.subtotal || 0,
      totalCostOfGoodsSold: itemsSummary._sum.totalProductionCost || 0,
      totalGrossProfit: itemsSummary._sum.grossProfit || 0,
    };
  }

  private calculatePaymentStatus(total: number, collected: number) {
    if (collected >= total) return 'PAID';
    if (collected > 0) return 'PARTIALLY_PAID';
    return 'PENDING';
  }

  private async generateSaleNumber() {
    const lastSale = await this.prisma.sale.findFirst({
      orderBy: { createdAt: 'desc' },
      select: { saleNumber: true },
    });

    if (!lastSale) {
      return 'SALE-00001';
    }

    const lastNumber = parseInt(lastSale.saleNumber.split('-')[1]);
    const newNumber = lastNumber + 1;
    return `SALE-${newNumber.toString().padStart(5, '0')}`;
  }
}
