import { ConflictException, NotFoundException } from '@nestjs/common';
import { ExpensesService } from './expenses.service';
import { toMinor } from '../common/money';

describe('ExpensesService manual expenses (RF-007, RF-008, RF-018, RF-020)', () => {
  const prismaMock = {
    expense: {
      create: jest.fn(),
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
      aggregate: jest.fn(),
      groupBy: jest.fn(),
    },
    inventoryLot: {
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      findMany: jest.fn(),
    },
    inventoryMovement: {
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      findMany: jest.fn(),
    },
    ingredientPurchase: {
      create: jest.fn(),
      findFirst: jest.fn(),
    },
    $transaction: jest.fn(),
  };

  const txClient: any = {
    expense: { update: jest.fn() },
  };

  const exchangeRatesMock = {
    getLatestValid: jest.fn(),
  };

  const auditMock = {
    record: jest.fn(),
  };

  let service: ExpensesService;

  const bcvRate = {
    id: 'rate-1',
    rateType: 'BCV',
    vesPerUsd: 36.5,
    source: 'BCV',
    date: new Date('2026-10-01T00:00:00.000Z'),
    fetchedAt: new Date('2026-10-01T15:00:00.000Z'),
  };

  beforeEach(() => {
    jest.resetAllMocks();
    service = new ExpensesService(
      prismaMock as any,
      exchangeRatesMock as any,
      auditMock as any,
    );
  });

  it('creates a manual expense with category, VES/USD values, rate and user (RF-007, RF-018)', async () => {
    exchangeRatesMock.getLatestValid.mockResolvedValue(bcvRate);
    prismaMock.expense.findFirst.mockResolvedValue(null);
    prismaMock.expense.create.mockImplementation(({ data }: any) =>
      Promise.resolve({ id: 'exp-1', ...data }),
    );

    const result = await service.createManual(
      {
        description: 'Compra de yuca',
        category: 'Materia prima',
        amountVes: 1000000,
        rateType: 'BCV',
        expenseDate: '2026-10-01T10:00:00.000Z',
      },
      'user-1',
    );

    expect(exchangeRatesMock.getLatestValid).toHaveBeenCalledTimes(1);
    expect(exchangeRatesMock.getLatestValid).toHaveBeenCalledWith('BCV');
    expect(prismaMock.expense.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        expenseNumber: 'EXP-00001',
        expenseDate: new Date('2026-10-01T10:00:00.000Z'),
        category: 'Materia prima',
        description: 'Compra de yuca',
        amount: 1000000,
        currency: 'VES',
        amountVesMinor: 100000000,
        amountUsdMinor: 2739726,
        exchangeRateId: 'rate-1',
        exchangeRateValue: 36.5,
        exchangeRateType: 'BCV',
        exchangeRateSource: 'BCV',
        exchangeRateDate: bcvRate.date,
        createdById: 'user-1',
      }),
    });
    expect(result.amountUsdMinor).toBe(2739726);
  });

  it('uses the selected USDT rate when requested (RF-018)', async () => {
    exchangeRatesMock.getLatestValid.mockResolvedValue({
      ...bcvRate,
      id: 'rate-usdt',
      rateType: 'USDT',
      vesPerUsd: 45.2,
      source: 'mercado-referencia',
    });
    prismaMock.expense.findFirst.mockResolvedValue(null);
    prismaMock.expense.create.mockImplementation(({ data }: any) =>
      Promise.resolve({ id: 'exp-1', ...data }),
    );

    await service.createManual(
      {
        description: 'Pago de servicios',
        category: 'Servicios',
        amountVes: 45200,
        rateType: 'USDT',
      },
      'user-1',
    );

    expect(exchangeRatesMock.getLatestValid).toHaveBeenCalledWith('USDT');
    expect(prismaMock.expense.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          exchangeRateType: 'USDT',
          exchangeRateSource: 'mercado-referencia',
          amountUsdMinor: toMinor(45200 / 45.2),
        }),
      }),
    );
  });

  it('does not create or modify inventory (RF-008)', async () => {
    exchangeRatesMock.getLatestValid.mockResolvedValue(bcvRate);
    prismaMock.expense.findFirst.mockResolvedValue(null);
    prismaMock.expense.create.mockImplementation(({ data }: any) =>
      Promise.resolve({ id: 'exp-1', ...data }),
    );

    await service.createManual(
      {
        description: 'Alquiler',
        category: 'Alquiler',
        amountVes: 500000,
        rateType: 'BCV',
      },
      'user-1',
    );

    expect(prismaMock.inventoryLot.create).not.toHaveBeenCalled();
    expect(prismaMock.inventoryLot.update).not.toHaveBeenCalled();
    expect(prismaMock.inventoryLot.delete).not.toHaveBeenCalled();
    expect(prismaMock.inventoryLot.findMany).not.toHaveBeenCalled();
    expect(prismaMock.inventoryMovement.create).not.toHaveBeenCalled();
    expect(prismaMock.inventoryMovement.update).not.toHaveBeenCalled();
    expect(prismaMock.inventoryMovement.delete).not.toHaveBeenCalled();
    expect(prismaMock.ingredientPurchase.create).not.toHaveBeenCalled();
  });

  it('fails clearly when the selected rate type never existed (RF-019a)', async () => {
    exchangeRatesMock.getLatestValid.mockResolvedValue(null);

    await expect(
      service.createManual(
        {
          description: 'Pago',
          category: 'Servicios',
          amountVes: 10000,
          rateType: 'USDT',
        },
        'user-1',
      ),
    ).rejects.toThrow(NotFoundException);
    expect(prismaMock.expense.create).not.toHaveBeenCalled();
  });

  it('keeps each expense independent from later rate changes (RF-020)', async () => {
    exchangeRatesMock.getLatestValid
      .mockResolvedValueOnce(bcvRate)
      .mockResolvedValueOnce({ ...bcvRate, vesPerUsd: 40 });
    prismaMock.expense.findFirst.mockResolvedValue(null);
    prismaMock.expense.create.mockImplementation(({ data }: any) =>
      Promise.resolve({ id: `exp-${data.amountUsdMinor}`, ...data }),
    );

    await service.createManual(
      {
        description: 'Primero',
        category: 'Materia prima',
        amountVes: 36500,
        rateType: 'BCV',
      },
      'user-1',
    );
    await service.createManual(
      {
        description: 'Segundo',
        category: 'Materia prima',
        amountVes: 36500,
        rateType: 'BCV',
      },
      'user-1',
    );

    const [first, second] = prismaMock.expense.create.mock.calls.map(
      (call) => call[0].data,
    );

    expect(first.exchangeRateValue).toBe(36.5);
    expect(first.amountUsdMinor).toBe(toMinor(36500 / 36.5));
    expect(second.exchangeRateValue).toBe(40);
    expect(second.amountUsdMinor).toBe(toMinor(36500 / 40));
  });

  describe('corrections and annulment (RF-009b, RF-022)', () => {
    const expenseRow = {
      id: 'exp-1',
      expenseNumber: 'EXP-00001',
      expenseDate: new Date('2026-10-01T10:00:00.000Z'),
      category: 'Materia prima',
      description: 'Compra de yuca',
      amount: 100000,
      paidAmount: 40000,
      pendingAmount: 60000,
      currency: 'VES',
      amountVesMinor: 10000000,
      amountUsdMinor: toMinor(100000 / 36.5),
      exchangeRateValue: 36.5,
      paymentStatus: 'PARTIALLY_PAID',
      isActive: true,
      createdById: 'user-1',
    };

    beforeEach(() => {
      prismaMock.$transaction.mockImplementation(
        async (cb: (tx: any) => Promise<any>) => cb(txClient),
      );
      auditMock.record.mockResolvedValue({ id: 'log-1' });
      prismaMock.expense.findUnique.mockResolvedValue(expenseRow);
      prismaMock.ingredientPurchase.findFirst.mockResolvedValue(null);
      txClient.expense.update.mockImplementation(({ data }: any) =>
        Promise.resolve({ ...expenseRow, ...data }),
      );
    });

    it('updates an expense recomputing pending amount, status and VES/USD minors (RF-009b)', async () => {
      const result = await service.update(
        'exp-1',
        { amount: 150000, paidAmount: 50000 },
        'user-1',
      );

      expect(txClient.expense.update).toHaveBeenCalledWith({
        where: { id: 'exp-1' },
        data: expect.objectContaining({
          amount: 150000,
          paidAmount: 50000,
          pendingAmount: 100000,
          paymentStatus: 'PARTIALLY_PAID',
          amountVesMinor: toMinor(150000),
          amountUsdMinor: toMinor(150000 / 36.5),
        }),
      });
      expect(result).toMatchObject({
        amount: 150000,
        pendingAmount: 100000,
      });
      expect(prismaMock.expense.delete).not.toHaveBeenCalled();
    });

    it('records an audit entry when an expense is corrected (RF-022)', async () => {
      await service.update('exp-1', { description: 'Corregido' }, 'user-1');

      expect(auditMock.record).toHaveBeenCalledWith(expect.anything(), {
        userId: 'user-1',
        entity: 'expense',
        entityId: 'exp-1',
        action: 'UPDATE',
        oldValue: expenseRow,
        newValue: expect.objectContaining({ description: 'Corregido' }),
      });
    });

    it('rejects correcting an expense linked to a purchase (RF-005, RF-009b)', async () => {
      prismaMock.ingredientPurchase.findFirst.mockResolvedValue({
        id: 'pur-1',
        expenseId: 'exp-1',
      });

      await expect(
        service.update('exp-1', { description: 'x' }, 'user-1'),
      ).rejects.toThrow(ConflictException);

      expect(txClient.expense.update).not.toHaveBeenCalled();
      expect(auditMock.record).not.toHaveBeenCalled();
    });

    it('returns 404 when correcting unknown expenses', async () => {
      prismaMock.expense.findUnique.mockResolvedValue(null);

      await expect(
        service.update('missing', { description: 'x' }, 'user-1'),
      ).rejects.toThrow(NotFoundException);
    });

    it('annuls an expense instead of deleting it, with audit (RF-009b, RF-022)', async () => {
      const result = await service.remove('exp-1', 'user-1');

      expect(txClient.expense.update).toHaveBeenCalledWith({
        where: { id: 'exp-1' },
        data: { isActive: false },
      });
      expect(prismaMock.expense.delete).not.toHaveBeenCalled();
      expect(txClient.expense.delete).toBeUndefined();
      expect(auditMock.record).toHaveBeenCalledWith(expect.anything(), {
        userId: 'user-1',
        entity: 'expense',
        entityId: 'exp-1',
        action: 'ANULAR',
        oldValue: { isActive: true },
        newValue: { isActive: false },
      });
      expect(result).toMatchObject({ id: 'exp-1', isActive: false });
    });

    it('rejects annuling an expense linked to a purchase (RF-005, RF-009b)', async () => {
      prismaMock.ingredientPurchase.findFirst.mockResolvedValue({
        id: 'pur-1',
        expenseId: 'exp-1',
      });

      await expect(service.remove('exp-1', 'user-1')).rejects.toThrow(
        ConflictException,
      );
      expect(txClient.expense.update).not.toHaveBeenCalled();
    });

    it('returns 404 when annuling unknown expenses', async () => {
      prismaMock.expense.findUnique.mockResolvedValue(null);

      await expect(service.remove('missing', 'user-1')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('excludes annulled expenses from listings and summaries (RF-009b)', async () => {
      prismaMock.expense.findMany.mockResolvedValue([]);
      prismaMock.expense.count.mockResolvedValue(0);
      prismaMock.expense.aggregate.mockResolvedValue({
        _sum: { amount: 0, paidAmount: 0, pendingAmount: 0 },
        _count: 0,
      });
      prismaMock.expense.groupBy.mockResolvedValue([]);

      await service.findAll();
      await service.getSummary();

      expect(prismaMock.expense.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ isActive: true }),
        }),
      );
      expect(prismaMock.expense.aggregate).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ isActive: true }),
        }),
      );
      expect(prismaMock.expense.groupBy).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ isActive: true }),
        }),
      );
    });
  });
});

describe('expenses summary totals (RF-007, RF-018)', () => {
  const prismaMock = {
    expense: {
      aggregate: jest.fn(),
      groupBy: jest.fn(),
    },
  };

  let service: ExpensesService;

  beforeEach(() => {
    jest.resetAllMocks();
    service = new ExpensesService(
      prismaMock as any,
      {} as any,
      {} as any,
    );
  });

  it('sums VES totals and USD minor totals of active expenses (RF-007)', async () => {
    prismaMock.expense.aggregate.mockResolvedValue({
      _sum: {
        amount: 150000,
        paidAmount: 100000,
        pendingAmount: 50000,
        amountUsdMinor: 62500,
      },
      _count: 3,
    });
    prismaMock.expense.groupBy.mockResolvedValue([
      {
        category: 'Materia prima',
        _sum: { amount: 150000, paidAmount: 100000 },
        _count: 3,
      },
    ]);

    const summary = await service.getSummary();

    expect(prismaMock.expense.aggregate).toHaveBeenCalledWith(
      expect.objectContaining({
        _sum: expect.objectContaining({ amountUsdMinor: true }),
      }),
    );
    expect(summary).toMatchObject({
      totalExpenses: 150000,
      totalPaid: 100000,
      totalUsdMinor: 62500,
      expensesCount: 3,
    });
  });
});
