import { PrismaService } from '../prisma/prisma.service';
import { ExchangeRatesService } from './exchange-rates.service';
import { type RateSnapshot } from './providers/rate-provider';

describe('ExchangeRatesService snapshots (RF-017, RF-019, RF-020)', () => {
  const prismaMock = {
    exchangeRate: {
      create: jest.fn(),
      update: jest.fn(),
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
    },
    expense: { count: jest.fn() },
    ingredientPurchase: { count: jest.fn() },
    packagingPurchase: { count: jest.fn() },
    sale: { count: jest.fn() },
    cashMovement: { count: jest.fn() },
  };

  let service: ExchangeRatesService;

  const snapshot: RateSnapshot = {
    rateType: 'BCV',
    valueVesPerUsd: 36.5,
    source: 'BCV',
    effectiveDate: new Date('2026-10-01T10:00:00.000Z'),
    fetchedAt: new Date('2026-10-01T15:30:00.000Z'),
  };

  beforeEach(() => {
    jest.resetAllMocks();
    service = new ExchangeRatesService(prismaMock as unknown as PrismaService);
  });

  describe('saveSnapshot', () => {
    it('persists a new rate with type, source, dates and scaled value (RF-017)', async () => {
      prismaMock.exchangeRate.findFirst.mockResolvedValue(null);
      prismaMock.exchangeRate.create.mockImplementation(({ data }: any) =>
        Promise.resolve({ id: 'rate-1', ...data }),
      );

      const result = await service.saveSnapshot(snapshot);

      expect(prismaMock.exchangeRate.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          date: new Date('2026-10-01T00:00:00.000Z'),
          rateType: 'BCV',
          source: 'BCV',
          vesPerUsd: 36.5,
          usdPerVes: expect.closeTo(1 / 36.5, 10),
          valueMinor: 3650,
          fetchedAt: new Date('2026-10-01T15:30:00.000Z'),
          isManual: false,
        }),
      });
      expect(result.rateType).toBe('BCV');
      expect(result.fetchedAt).toEqual(new Date('2026-10-01T15:30:00.000Z'));
    });

    it('refreshes the same-day rate when it is not referenced yet', async () => {
      prismaMock.exchangeRate.findFirst.mockResolvedValue({
        id: 'rate-1',
        vesPerUsd: 36.0,
      });
      prismaMock.expense.count.mockResolvedValue(0);
      prismaMock.ingredientPurchase.count.mockResolvedValue(0);
      prismaMock.packagingPurchase.count.mockResolvedValue(0);
      prismaMock.sale.count.mockResolvedValue(0);
      prismaMock.cashMovement.count.mockResolvedValue(0);
      prismaMock.exchangeRate.update.mockResolvedValue({ id: 'rate-1' });

      await service.saveSnapshot(snapshot);

      expect(prismaMock.exchangeRate.update).toHaveBeenCalledWith({
        where: { id: 'rate-1' },
        data: expect.objectContaining({ vesPerUsd: 36.5, isManual: false }),
      });
      expect(prismaMock.exchangeRate.create).not.toHaveBeenCalled();
    });

    it('preserves a snapshot that is already used by movements (RF-020)', async () => {
      const usedRate = {
        id: 'rate-1',
        rateType: 'BCV',
        vesPerUsd: 36.0,
        source: 'BCV',
      };
      prismaMock.exchangeRate.findFirst.mockResolvedValue(usedRate);
      prismaMock.expense.count.mockResolvedValue(2);
      prismaMock.ingredientPurchase.count.mockResolvedValue(0);
      prismaMock.packagingPurchase.count.mockResolvedValue(0);
      prismaMock.sale.count.mockResolvedValue(0);
      prismaMock.cashMovement.count.mockResolvedValue(0);

      const result = await service.saveSnapshot(snapshot);

      expect(result).toEqual(usedRate);
      expect(prismaMock.exchangeRate.update).not.toHaveBeenCalled();
      expect(prismaMock.exchangeRate.create).not.toHaveBeenCalled();
    });
  });

  describe('getLatestValid (RF-019)', () => {
    it('returns the last registered rate when there is no weekend publication', async () => {
      const fridayRate = {
        id: 'rate-fri',
        rateType: 'BCV',
        vesPerUsd: 36.5,
        date: new Date('2026-10-02T00:00:00.000Z'),
      };
      prismaMock.exchangeRate.findFirst.mockResolvedValue(fridayRate);

      const saturday = new Date('2026-10-03T12:00:00.000Z');
      const result = await service.getLatestValid('BCV', saturday);

      expect(result).toEqual(fridayRate);
      expect(prismaMock.exchangeRate.findFirst).toHaveBeenCalledWith({
        where: {
          rateType: 'BCV',
          date: { lte: new Date('2026-10-03T00:00:00.000Z') },
        },
        orderBy: [{ date: 'desc' }, { fetchedAt: 'desc' }],
      });
    });

    it('returns null when the rate type was never registered', async () => {
      prismaMock.exchangeRate.findFirst.mockResolvedValue(null);

      const result = await service.getLatestValid('USDT');

      expect(result).toBeNull();
      expect(prismaMock.exchangeRate.findFirst).toHaveBeenCalledWith({
        where: {
          rateType: 'USDT',
          date: { lte: expect.any(Date) },
        },
        orderBy: [{ date: 'desc' }, { fetchedAt: 'desc' }],
      });
    });

    it('does not return future rates', async () => {
      prismaMock.exchangeRate.findFirst.mockResolvedValue(null);

      await service.getLatestValid('BCV', new Date('2026-10-01T00:00:00.000Z'));

      const call = prismaMock.exchangeRate.findFirst.mock.calls[0][0];
      expect(call.where.date.lte).toEqual(
        new Date('2026-10-01T00:00:00.000Z'),
      );
    });
  });
});
