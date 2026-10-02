import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { IngredientPurchasesService } from './ingredient-purchases.service';
import { InsufficientStockError } from '../inventory/fifo';
import { toMinor, vesToUsd } from '../common/money';

describe('IngredientPurchasesService purchase transaction (RF-005, RF-006, RF-009, RF-022)', () => {
  type Store = {
    expenses: any[];
    purchases: any[];
    lots: any[];
  };

  let store: Store;

  const txClient: any = {};

  const prismaMock: any = {
    ingredient: { findUnique: jest.fn() },
    expenseCategory: { findUnique: jest.fn() },
    expense: {
      create: jest.fn(),
      findFirst: jest.fn(),
    },
    $transaction: jest.fn(async (cb: (tx: any) => Promise<any>) => {
      const backup: Store = {
        expenses: [...store.expenses],
        purchases: [...store.purchases],
        lots: [...store.lots],
      };
      try {
        return await cb(txClient);
      } catch (error) {
        store.expenses = backup.expenses;
        store.purchases = backup.purchases;
        store.lots = backup.lots;
        throw error;
      }
    }),
  };

  txClient.expense = {
    findFirst: jest.fn(),
    create: jest.fn((args: any) => {
      store.expenses.push(args.data);
      return Promise.resolve({
        id: `exp-${store.expenses.length}`,
        ...args.data,
      });
    }),
  };
  txClient.ingredientPurchase = {
    create: jest.fn((args: any) => {
      store.purchases.push(args.data);
      return Promise.resolve({
        id: `pur-${store.purchases.length}`,
        ...args.data,
      });
    }),
  };
  txClient.inventoryLot = {
    create: jest.fn((args: any) => {
      store.lots.push(args.data);
      return Promise.resolve({
        id: `lot-${store.lots.length}`,
        ...args.data,
      });
    }),
  };

  const exchangeRatesMock = {
    getLatestValid: jest.fn(),
  };

  const inventoryMock = {
    recalculateIngredientIn: jest.fn(),
  };

  const auditMock = {
    record: jest.fn(),
  };

  txClient.expense.update = jest.fn((args: any) =>
    Promise.resolve({ id: args.where.id, ...args.data }),
  );
  txClient.expense.delete = jest.fn((args: any) =>
    Promise.resolve({ id: args.where.id }),
  );
  txClient.ingredientPurchase.findUnique = jest.fn();
  txClient.ingredientPurchase.update = jest.fn((args: any) =>
    Promise.resolve({ id: args.where.id, ...args.data }),
  );
  txClient.ingredientPurchase.delete = jest.fn((args: any) =>
    Promise.resolve({ id: args.where.id }),
  );
  txClient.inventoryLot.findFirst = jest.fn();
  txClient.inventoryLot.update = jest.fn((args: any) =>
    Promise.resolve({ id: args.where.id, ...args.data }),
  );
  txClient.inventoryLot.delete = jest.fn((args: any) =>
    Promise.resolve({ id: args.where.id }),
  );
  txClient.exchangeRate = { findUnique: jest.fn() };

  let service: IngredientPurchasesService;

  const ingredient = {
    id: 'ing-1',
    name: 'Perejil',
    normalizedName: 'perejil',
    unit: 'g',
    isActive: true,
  };

  const rate = {
    id: 'rate-1',
    rateType: 'BCV',
    vesPerUsd: 36.5,
    source: 'BCV',
    date: new Date('2026-10-01T00:00:00.000Z'),
    fetchedAt: new Date('2026-10-01T15:00:00.000Z'),
  };

  const dto = {
    ingredientId: 'ing-1',
    quantity: 500,
    totalCostVes: 50000,
    rateType: 'BCV' as const,
    purchaseDate: '2026-10-02T10:00:00.000Z',
    notes: 'Compra en mercado',
  };

  beforeEach(() => {
    jest.clearAllMocks();
    store = { expenses: [], purchases: [], lots: [] };
    service = new IngredientPurchasesService(
      prismaMock,
      exchangeRatesMock as any,
      inventoryMock as any,
      auditMock as any,
    );
    prismaMock.ingredient.findUnique.mockResolvedValue(ingredient);
    exchangeRatesMock.getLatestValid.mockResolvedValue(rate);
    prismaMock.expense.findFirst.mockResolvedValue(null);
    txClient.expense.findFirst.mockResolvedValue(null);
    inventoryMock.recalculateIngredientIn.mockResolvedValue(undefined);
    auditMock.record.mockResolvedValue({ id: 'log-1' });
  });

  it('creates exactly one linked expense, one purchase and one lot in a transaction (RF-005)', async () => {
    const result = await service.register(dto, 'user-1');

    expect(prismaMock.$transaction).toHaveBeenCalledTimes(1);
    expect(store.expenses).toHaveLength(1);
    expect(store.purchases).toHaveLength(1);
    expect(store.lots).toHaveLength(1);

    expect(result.purchase.expenseId).toBe(result.expense.id);
    expect(result.lot.purchaseId).toBe(result.purchase.id);
    expect(result.lot.ingredientId).toBe(ingredient.id);
  });

  it('records ingredient, quantity, unit, total VES, date and chosen rate (RF-006)', async () => {
    const result = await service.register(dto, 'user-1');

    expect(exchangeRatesMock.getLatestValid).toHaveBeenCalledWith('BCV');

    expect(result.purchase).toMatchObject({
      ingredientId: 'ing-1',
      unit: 'g',
      quantity: 500,
      currency: 'VES',
      totalCost: 50000,
      quantityMinor: toMinor(500),
      totalCostVesMinor: toMinor(50000),
      totalCostUsdMinor: toMinor(vesToUsd(50000, 36.5)),
      exchangeRateId: 'rate-1',
      exchangeRateType: 'BCV',
      exchangeRateSource: 'BCV',
      exchangeRateDate: rate.date,
      purchaseDate: new Date('2026-10-02T10:00:00.000Z'),
      notes: 'Compra en mercado',
    });

    expect(result.expense).toMatchObject({
      expenseNumber: 'EXP-00001',
      expenseDate: new Date('2026-10-02T10:00:00.000Z'),
      category: 'Materia prima',
      description: 'Compra de Perejil',
      amount: 50000,
      currency: 'VES',
      amountVesMinor: toMinor(50000),
      amountUsdMinor: toMinor(vesToUsd(50000, 36.5)),
      exchangeRateId: 'rate-1',
      exchangeRateValue: 36.5,
      exchangeRateType: 'BCV',
      exchangeRateSource: 'BCV',
      exchangeRateDate: rate.date,
      paymentStatus: 'PAID',
      createdById: 'user-1',
    });

    expect(result.lot).toMatchObject({
      initialQuantityMinor: toMinor(500),
      remainingQuantityMinor: toMinor(500),
      unitCostVesMinor: toMinor(50000 / 500),
      unitCostUsdMinor: toMinor(50000 / 500 / 36.5),
      lotDate: new Date('2026-10-02T10:00:00.000Z'),
    });
  });

  it('never duplicates the linked expense for the same purchase event (RF-009)', async () => {
    await service.register(dto, 'user-1');
    await service.register(dto, 'user-1');

    expect(store.expenses).toHaveLength(2);
    expect(store.purchases).toHaveLength(2);
    expect(store.lots).toHaveLength(2);

    const expenseIds = store.purchases.map((p) => p.expenseId);
    expect(expenseIds).toHaveLength(new Set(expenseIds).size);
    expect(txClient.expense.create).toHaveBeenCalledTimes(2);
  });

  it('leaves no partial records when the lot creation fails (RF-005)', async () => {
    txClient.inventoryLot.create.mockRejectedValueOnce(
      new Error('lot failed'),
    );

    await expect(service.register(dto, 'user-1')).rejects.toThrow('lot failed');

    expect(store.expenses).toHaveLength(0);
    expect(store.purchases).toHaveLength(0);
    expect(store.lots).toHaveLength(0);
    expect(prismaMock.expense.create).not.toHaveBeenCalled();
  });

  it('returns 404 for unknown ingredients', async () => {
    prismaMock.ingredient.findUnique.mockResolvedValue(null);

    await expect(service.register(dto, 'user-1')).rejects.toThrow(
      NotFoundException,
    );
    expect(store.expenses).toHaveLength(0);
    expect(prismaMock.$transaction).not.toHaveBeenCalled();
  });

  it('returns 404 when the selected rate type never existed', async () => {
    exchangeRatesMock.getLatestValid.mockResolvedValue(null);

    await expect(
      service.register({ ...dto, rateType: 'USDT' }, 'user-1'),
    ).rejects.toThrow(NotFoundException);
    expect(prismaMock.$transaction).not.toHaveBeenCalled();
  });

  it('rejects non-positive quantity and cost', async () => {
    await expect(
      service.register({ ...dto, quantity: 0 }, 'user-1'),
    ).rejects.toThrow(BadRequestException);
    await expect(
      service.register({ ...dto, totalCostVes: -1 }, 'user-1'),
    ).rejects.toThrow(BadRequestException);
    expect(prismaMock.$transaction).not.toHaveBeenCalled();
  });

  it('uses the configured category when categoryId is provided', async () => {
    prismaMock.expenseCategory.findUnique.mockResolvedValue({
      id: 'cat-9',
      name: 'Materia prima y varios',
      normalizedName: 'materia prima y varios',
      isActive: true,
    });

    const result = await service.register(
      { ...dto, categoryId: 'cat-9' },
      'user-1',
    );

    expect(result.expense).toMatchObject({
      category: 'Materia prima y varios',
      categoryId: 'cat-9',
    });
  });

  it('returns 404 for unknown or inactive categories', async () => {
    prismaMock.expenseCategory.findUnique.mockResolvedValue(null);
    await expect(
      service.register({ ...dto, categoryId: 'missing' }, 'user-1'),
    ).rejects.toThrow(NotFoundException);

    prismaMock.expenseCategory.findUnique.mockResolvedValue({
      id: 'cat-9',
      name: 'X',
      isActive: false,
    });
    await expect(
      service.register({ ...dto, categoryId: 'cat-9' }, 'user-1'),
    ).rejects.toThrow(NotFoundException);

    expect(prismaMock.$transaction).not.toHaveBeenCalled();
  });

  describe('purchase corrections (RF-009b, RF-012b)', () => {
    const purchaseRow = {
      id: 'pur-1',
      ingredientId: 'ing-1',
      unit: 'g',
      quantity: 500,
      unitCost: 100,
      totalCost: 50000,
      currency: 'VES',
      exchangeRateId: 'rate-1',
      exchangeRateType: 'BCV',
      exchangeRateSource: 'BCV',
      exchangeRateDate: new Date('2026-10-01T00:00:00.000Z'),
      quantityMinor: 50000,
      totalCostVesMinor: 5000000,
      totalCostUsdMinor: 136986,
      purchaseDate: new Date('2026-10-02T10:00:00.000Z'),
      expenseId: 'exp-1',
      notes: 'Compra en mercado',
    };

    const lotRow = {
      id: 'lot-1',
      ingredientId: 'ing-1',
      purchaseId: 'pur-1',
      initialQuantityMinor: 50000,
      remainingQuantityMinor: 50000,
      unitCostVesMinor: 100000,
      unitCostUsdMinor: 274,
      lotDate: new Date('2026-10-02T10:00:00.000Z'),
      createdAt: new Date('2026-10-02T11:00:00.000Z'),
    };

    beforeEach(() => {
      txClient.ingredientPurchase.findUnique.mockResolvedValue(purchaseRow);
      txClient.exchangeRate.findUnique.mockResolvedValue({
        id: 'rate-1',
        valueMinor: 3650,
        vesPerUsd: 36.5,
      });
      txClient.inventoryLot.findFirst.mockResolvedValue(lotRow);
    });

    it('updates a purchase and recomputes lot and linked expense (RF-009b)', async () => {
      const result = await service.updatePurchase(
        'pur-1',
        {
          quantity: 400,
          totalCostVes: 44000,
          purchaseDate: '2026-10-03T10:00:00.000Z',
        },
        'user-1',
      );

      expect(txClient.ingredientPurchase.update).toHaveBeenCalledWith({
        where: { id: 'pur-1' },
        data: expect.objectContaining({
          quantity: 400,
          totalCost: 44000,
          unitCost: 110,
          quantityMinor: 40000,
          totalCostVesMinor: 4400000,
          totalCostUsdMinor: toMinor(vesToUsd(44000, 36.5)),
          purchaseDate: new Date('2026-10-03T10:00:00.000Z'),
        }),
      });

      expect(txClient.inventoryLot.update).toHaveBeenCalledWith({
        where: { id: 'lot-1' },
        data: expect.objectContaining({
          initialQuantityMinor: 40000,
          unitCostVesMinor: toMinor(110),
          unitCostUsdMinor: toMinor(110 / 36.5),
          lotDate: new Date('2026-10-03T10:00:00.000Z'),
        }),
      });

      expect(txClient.expense.update).toHaveBeenCalledWith({
        where: { id: 'exp-1' },
        data: expect.objectContaining({
          amount: 44000,
          paidAmount: 44000,
          pendingAmount: 0,
          amountVesMinor: 4400000,
          amountUsdMinor: toMinor(vesToUsd(44000, 36.5)),
          expenseDate: new Date('2026-10-03T10:00:00.000Z'),
        }),
      });

      expect(txClient.exchangeRate.findUnique).toHaveBeenCalledWith({
        where: { id: 'rate-1' },
      });
      expect(exchangeRatesMock.getLatestValid).not.toHaveBeenCalled();
      expect(inventoryMock.recalculateIngredientIn).toHaveBeenCalledWith(
        'ing-1',
        expect.anything(),
      );
      expect(result.purchase).toMatchObject({ quantity: 400, totalCost: 44000 });
    });

    it('returns 404 when correcting or removing unknown purchases', async () => {
      txClient.ingredientPurchase.findUnique.mockResolvedValue(null);

      await expect(
        service.updatePurchase('missing', { quantity: 10 }, 'user-1'),
      ).rejects.toThrow(NotFoundException);
      await expect(
        service.removePurchase('missing', 'user-1'),
      ).rejects.toThrow(NotFoundException);

      expect(txClient.ingredientPurchase.update).not.toHaveBeenCalled();
      expect(txClient.ingredientPurchase.delete).not.toHaveBeenCalled();
      expect(inventoryMock.recalculateIngredientIn).not.toHaveBeenCalled();
    });

    it('rejects non-positive purchase corrections', async () => {
      await expect(
        service.updatePurchase('pur-1', { quantity: 0 }, 'user-1'),
      ).rejects.toThrow(BadRequestException);
      await expect(
        service.updatePurchase('pur-1', { totalCostVes: -1 }, 'user-1'),
      ).rejects.toThrow(BadRequestException);

      expect(prismaMock.$transaction).not.toHaveBeenCalled();
    });

    it('rejects corrections when the stored rate snapshot is missing', async () => {
      txClient.exchangeRate.findUnique.mockResolvedValue(null);

      await expect(
        service.updatePurchase('pur-1', { quantity: 400 }, 'user-1'),
      ).rejects.toThrow(ConflictException);

      expect(txClient.ingredientPurchase.update).not.toHaveBeenCalled();
      expect(txClient.inventoryLot.update).not.toHaveBeenCalled();
      expect(txClient.expense.update).not.toHaveBeenCalled();
      expect(inventoryMock.recalculateIngredientIn).not.toHaveBeenCalled();
    });

    it('returns 404 when the purchase has no inventory lot', async () => {
      txClient.inventoryLot.findFirst.mockResolvedValue(null);

      await expect(
        service.updatePurchase('pur-1', { quantity: 400 }, 'user-1'),
      ).rejects.toThrow(NotFoundException);

      expect(txClient.ingredientPurchase.update).not.toHaveBeenCalled();
    });

    it('removes a purchase with its lot, annuls the linked expense and recalculates (RF-009b, RF-022)', async () => {
      const result = await service.removePurchase('pur-1', 'user-1');

      expect(txClient.expense.update).toHaveBeenCalledWith({
        where: { id: 'exp-1' },
        data: { isActive: false },
      });
      expect(txClient.expense.delete).not.toHaveBeenCalled();
      expect(txClient.inventoryLot.delete).toHaveBeenCalledWith({
        where: { id: 'lot-1' },
      });
      expect(txClient.ingredientPurchase.delete).toHaveBeenCalledWith({
        where: { id: 'pur-1' },
      });
      expect(inventoryMock.recalculateIngredientIn).toHaveBeenCalledWith(
        'ing-1',
        expect.anything(),
      );
      expect(auditMock.record).toHaveBeenCalledWith(expect.anything(), {
        userId: 'user-1',
        entity: 'expense',
        entityId: 'exp-1',
        action: 'ANULAR',
        oldValue: { isActive: true },
        newValue: { isActive: false },
      });
      expect(auditMock.record).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          userId: 'user-1',
          entity: 'ingredient_purchase',
          entityId: 'pur-1',
          action: 'DELETE',
        }),
      );
      expect(result).toEqual({ id: 'pur-1', deleted: true });
    });

    it('removes a legacy purchase without lot or linked expense', async () => {
      txClient.ingredientPurchase.findUnique.mockResolvedValue({
        ...purchaseRow,
        expenseId: null,
      });
      txClient.inventoryLot.findFirst.mockResolvedValue(null);

      const result = await service.removePurchase('pur-1', 'user-1');

      expect(txClient.expense.update).not.toHaveBeenCalled();
      expect(txClient.inventoryLot.delete).not.toHaveBeenCalled();
      expect(txClient.ingredientPurchase.delete).toHaveBeenCalledWith({
        where: { id: 'pur-1' },
      });
      expect(result).toEqual({ id: 'pur-1', deleted: true });
    });

    it('propagates stock conflicts when a removal breaks dependent outputs (RF-014)', async () => {
      inventoryMock.recalculateIngredientIn.mockRejectedValueOnce(
        new InsufficientStockError(9000, 8000),
      );

      await expect(service.removePurchase('pur-1', 'user-1')).rejects.toThrow(
        ConflictException,
      );
    });

    it('records an audit entry when a purchase is corrected (RF-022)', async () => {
      await service.updatePurchase('pur-1', { quantity: 400 }, 'user-1');

      expect(auditMock.record).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          userId: 'user-1',
          entity: 'ingredient_purchase',
          entityId: 'pur-1',
          action: 'UPDATE',
        }),
      );
    });
  });
});
