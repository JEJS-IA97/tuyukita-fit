import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ExchangeRatesService {
  constructor(private prisma: PrismaService) {}

  async create(data: {
    vesPerUsd: number;
    usdPerVes: number;
    source: string;
    isManual?: boolean;
    createdById: string;
  }) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const existingRate = await this.prisma.exchangeRate.findFirst({
      where: {
        date: {
          gte: today,
        },
        source: data.source,
      },
    });

    if (existingRate) {
      return this.prisma.exchangeRate.update({
        where: { id: existingRate.id },
        data: {
          vesPerUsd: data.vesPerUsd,
          usdPerVes: data.usdPerVes,
          source: data.source,
          isManual: data.isManual || false,
        },
      });
    }

    return this.prisma.exchangeRate.create({
      data: {
        date: today,
        vesPerUsd: data.vesPerUsd,
        usdPerVes: data.usdPerVes,
        source: data.source,
        isManual: data.isManual || false,
        createdById: data.createdById,
      },
    });
  }

  async getCurrent() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const rate = await this.prisma.exchangeRate.findFirst({
      where: {
        date: {
          gte: today,
        },
      },
      orderBy: { date: 'desc' },
    });

    if (!rate) {
      const lastRate = await this.prisma.exchangeRate.findFirst({
        orderBy: { date: 'desc' },
      });

      return lastRate || null;
    }

    return rate;
  }

  async findAll(page = 1, limit = 30) {
    const skip = (page - 1) * limit;

    const [rates, total] = await Promise.all([
      this.prisma.exchangeRate.findMany({
        orderBy: { date: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.exchangeRate.count(),
    ]);

    return {
      data: rates,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findById(id: string) {
    const rate = await this.prisma.exchangeRate.findUnique({
      where: { id },
    });

    if (!rate) {
      throw new NotFoundException('Exchange rate not found');
    }

    return rate;
  }

  async createManual(data: {
    vesPerUsd: number;
    usdPerVes: number;
    source: string;
    createdById: string;
  }) {
    return this.create({
      ...data,
      isManual: true,
    });
  }

  async convert(amount: number, fromCurrency: string, toCurrency: string, rateId?: string) {
    let rate;

    if (rateId) {
      rate = await this.findById(rateId);
    } else {
      rate = await this.getCurrent();
    }

    if (!rate) {
      throw new NotFoundException('No exchange rate available');
    }

    if (fromCurrency === toCurrency) {
      return { amount, rate: null, convertedAmount: amount };
    }

    let convertedAmount;
    if (fromCurrency === 'VES' && toCurrency === 'USD') {
      convertedAmount = amount / rate.vesPerUsd;
    } else if (fromCurrency === 'USD' && toCurrency === 'VES') {
      convertedAmount = amount * rate.vesPerUsd;
    } else {
      throw new Error('Unsupported currency conversion');
    }

    return {
      amount,
      fromCurrency,
      toCurrency,
      rate: rate.vesPerUsd,
      rateId: rate.id,
      convertedAmount,
    };
  }
}
