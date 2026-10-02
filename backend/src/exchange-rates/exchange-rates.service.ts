import { Inject, Injectable, NotFoundException, Optional } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { toMinor } from '../common/money';
import {
  RateProvider,
  RateSnapshot,
  RateType,
  fetchValidatedRate,
} from './providers/rate-provider';
import { BCV_RATE_PROVIDER, USDT_RATE_PROVIDER } from './exchange-rates.tokens';

@Injectable()
export class ExchangeRatesService {
  constructor(
    private prisma: PrismaService,
    @Optional()
    @Inject(BCV_RATE_PROVIDER)
    private readonly bcvProvider?: RateProvider | null,
    @Optional()
    @Inject(USDT_RATE_PROVIDER)
    private readonly usdtProvider?: RateProvider | null,
  ) {}

  async refreshRates(): Promise<{
    saved: unknown[];
    errors: { bcv?: string; usdt?: string };
  }> {
    const candidates: [
      'bcv' | 'usdt',
      RateProvider | null | undefined,
    ][] = [
      ['bcv', this.bcvProvider],
      ['usdt', this.usdtProvider],
    ];

    const saved: unknown[] = [];
    const errors: { bcv?: string; usdt?: string } = {};

    for (const [key, provider] of candidates) {
      if (!provider) {
        continue;
      }
      try {
        const snapshot = await fetchValidatedRate(provider);
        saved.push(await this.saveSnapshot(snapshot));
      } catch (error) {
        errors[key] = error instanceof Error ? error.message : String(error);
      }
    }

    return { saved, errors };
  }

  private async isRateUsed(id: string): Promise<boolean> {
    const [expenses, ingredientPurchases, packagingPurchases, sales, cashMovements] =
      await Promise.all([
        this.prisma.expense.count({ where: { exchangeRateId: id } }),
        this.prisma.ingredientPurchase.count({ where: { exchangeRateId: id } }),
        this.prisma.packagingPurchase.count({ where: { exchangeRateId: id } }),
        this.prisma.sale.count({ where: { exchangeRateId: id } }),
        this.prisma.cashMovement.count({ where: { exchangeRateId: id } }),
      ]);
    return (
      expenses +
        ingredientPurchases +
        packagingPurchases +
        sales +
        cashMovements >
      0
    );
  }

  async saveSnapshot(snapshot: RateSnapshot) {
    const day = new Date(snapshot.effectiveDate);
    day.setUTCHours(0, 0, 0, 0);

    const existing = await this.prisma.exchangeRate.findFirst({
      where: {
        date: day,
        source: snapshot.source,
        rateType: snapshot.rateType,
      },
    });

    if (existing) {
      if (await this.isRateUsed(existing.id)) {
        return existing;
      }
      return this.prisma.exchangeRate.update({
        where: { id: existing.id },
        data: {
          vesPerUsd: snapshot.valueVesPerUsd,
          usdPerVes: 1 / snapshot.valueVesPerUsd,
          valueMinor: toMinor(snapshot.valueVesPerUsd),
          fetchedAt: snapshot.fetchedAt,
          isManual: false,
        },
      });
    }

    return this.prisma.exchangeRate.create({
      data: {
        date: day,
        vesPerUsd: snapshot.valueVesPerUsd,
        usdPerVes: 1 / snapshot.valueVesPerUsd,
        valueMinor: toMinor(snapshot.valueVesPerUsd),
        rateType: snapshot.rateType,
        source: snapshot.source,
        fetchedAt: snapshot.fetchedAt,
        isManual: false,
      },
    });
  }

  async getLatestValid(rateType: RateType, asOf: Date = new Date()) {
    const day = new Date(asOf);
    day.setUTCHours(0, 0, 0, 0);

    return this.prisma.exchangeRate.findFirst({
      where: {
        rateType,
        date: { lte: day },
      },
      orderBy: [{ date: 'desc' }, { fetchedAt: 'desc' }],
    });
  }

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
