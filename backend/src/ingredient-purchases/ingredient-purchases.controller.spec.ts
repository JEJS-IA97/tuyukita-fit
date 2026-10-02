import { INestApplication, ValidationPipe } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { JwtModule, JwtService } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { Test } from '@nestjs/testing';
import * as request from 'supertest';
import { JwtStrategy } from '../auth/jwt.strategy';
import { PrismaService } from '../prisma/prisma.service';
import { ExchangeRatesService } from '../exchange-rates/exchange-rates.service';
import { AuditService } from '../audit/audit.service';
import { InventoryService } from '../inventory/inventory.service';
import { IngredientPurchasesController } from './ingredient-purchases.controller';
import { IngredientPurchasesService } from './ingredient-purchases.service';
import { toMinor, vesToUsd } from '../common/money';

const TEST_SECRET = 't025-test-secret';

describe('IngredientPurchasesController (HTTP)', () => {
  type Store = {
    expenses: any[];
    purchases: any[];
    lots: any[];
  };

  let store: Store;

  const txClient: any = {};

  const auditMock = {
    record: jest.fn(),
  };

  const prismaMock: any = {
    ingredient: { findUnique: jest.fn() },
    expenseCategory: { findUnique: jest.fn() },
    expense: { create: jest.fn(), findFirst: jest.fn() },
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
      return Promise.resolve({ id: `exp-${store.expenses.length}`, ...args.data });
    }),
  };
  txClient.ingredientPurchase = {
    create: jest.fn((args: any) => {
      store.purchases.push(args.data);
      return Promise.resolve({ id: `pur-${store.purchases.length}`, ...args.data });
    }),
  };
  txClient.inventoryLot = {
    create: jest.fn((args: any) => {
      store.lots.push(args.data);
      return Promise.resolve({ id: `lot-${store.lots.length}`, ...args.data });
    }),
    findFirst: jest.fn(),
    update: jest.fn((args: any) =>
      Promise.resolve({ id: args.where.id, ...args.data }),
    ),
    delete: jest.fn((args: any) =>
      Promise.resolve({ id: args.where.id }),
    ),
  };
  txClient.ingredientPurchase.findUnique = jest.fn();
  txClient.ingredientPurchase.update = jest.fn((args: any) =>
    Promise.resolve({ id: args.where.id, ...args.data }),
  );
  txClient.ingredientPurchase.delete = jest.fn((args: any) =>
    Promise.resolve({ id: args.where.id }),
  );
  txClient.expense.update = jest.fn((args: any) =>
    Promise.resolve({ id: args.where.id, ...args.data }),
  );
  txClient.expense.delete = jest.fn((args: any) =>
    Promise.resolve({ id: args.where.id }),
  );
  txClient.exchangeRate = { findUnique: jest.fn() };

  const exchangeRatesMock = {
    getLatestValid: jest.fn(),
  };

  let app: INestApplication;
  let jwt: JwtService;

  const tokenFor = (username: string, sub = 'user-1') =>
    jwt.sign({ sub, username, role: 'OPERATOR' });

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

  const purchaseBody = {
    ingredientId: 'ing-1',
    quantity: 500,
    totalCostVes: 50000,
    rateType: 'BCV',
    purchaseDate: '2026-10-02T10:00:00.000Z',
    notes: 'Compra en mercado',
  };

  beforeAll(async () => {
    process.env.JWT_ACCESS_SECRET = TEST_SECRET;

    const moduleRef = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({ isGlobal: true, ignoreEnvFile: true }),
        PassportModule,
        JwtModule.register({
          secret: TEST_SECRET,
          signOptions: { expiresIn: '10m' },
        }),
      ],
      controllers: [IngredientPurchasesController],
      providers: [
        IngredientPurchasesService,
        JwtStrategy,
        { provide: PrismaService, useValue: prismaMock },
        { provide: ExchangeRatesService, useValue: exchangeRatesMock },
        { provide: InventoryService, useValue: { recalculateIngredientIn: jest.fn() } },
        { provide: AuditService, useValue: auditMock },
      ],
    }).compile();

    app = moduleRef.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
        transformOptions: { enableImplicitConversion: true },
      }),
    );
    await app.init();

    jwt = moduleRef.get(JwtService);
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(() => {
    jest.clearAllMocks();
    store = { expenses: [], purchases: [], lots: [] };
    prismaMock.ingredient.findUnique.mockResolvedValue(ingredient);
    exchangeRatesMock.getLatestValid.mockResolvedValue(rate);
    prismaMock.expense.findFirst.mockResolvedValue(null);
    txClient.expense.findFirst.mockResolvedValue(null);
    auditMock.record.mockResolvedValue({ id: 'log-1' });
  });

  const http = () => app.getHttpServer();

  it('rejects unauthenticated requests (RF-021)', async () => {
    await request(http()).post('/ingredient-purchases').expect(401);
  });

  it('registers a purchase and returns expense, purchase and lot snapshots (RF-005, RF-006, RF-018)', async () => {
    const response = await request(http())
      .post('/ingredient-purchases')
      .set('Authorization', `Bearer ${tokenFor('jose')}`)
      .send(purchaseBody)
      .expect(201);

    expect(response.body).toMatchObject({
      expense: {
        amount: 50000,
        currency: 'VES',
        amountVesMinor: toMinor(50000),
        amountUsdMinor: toMinor(vesToUsd(50000, 36.5)),
        exchangeRateType: 'BCV',
        exchangeRateSource: 'BCV',
        exchangeRateValue: 36.5,
        createdById: 'user-1',
      },
      purchase: {
        ingredientId: 'ing-1',
        unit: 'g',
        quantity: 500,
        quantityMinor: toMinor(500),
        totalCostVesMinor: toMinor(50000),
        totalCostUsdMinor: toMinor(vesToUsd(50000, 36.5)),
        exchangeRateId: 'rate-1',
      },
      lot: {
        ingredientId: 'ing-1',
        initialQuantityMinor: toMinor(500),
        remainingQuantityMinor: toMinor(500),
      },
    });
    expect(response.body.purchase.expenseId).toBe(response.body.expense.id);
    expect(response.body.lot.purchaseId).toBe(response.body.purchase.id);
    expect(exchangeRatesMock.getLatestValid).toHaveBeenCalledWith('BCV');
    expect(prismaMock.$transaction).toHaveBeenCalledTimes(1);
  });

  it('lets each initial account register purchases (RF-021)', async () => {
    for (const username of ['jose', 'jay', 'vivi']) {
      const response = await request(http())
        .post('/ingredient-purchases')
        .set('Authorization', `Bearer ${tokenFor(username, `sub-${username}`)}`)
        .send(purchaseBody)
        .expect(201);

      expect(response.body.expense.createdById).toBe(`sub-${username}`);
    }

    expect(store.expenses).toHaveLength(3);
    const expenseIds = store.purchases.map((p) => p.expenseId);
    expect(expenseIds).toHaveLength(new Set(expenseIds).size);
  });

  it('returns 400 for invalid bodies', async () => {
    await request(http())
      .post('/ingredient-purchases')
      .set('Authorization', `Bearer ${tokenFor('jose')}`)
      .send({})
      .expect(400);

    await request(http())
      .post('/ingredient-purchases')
      .set('Authorization', `Bearer ${tokenFor('jose')}`)
      .send({ ...purchaseBody, rateType: 'EUR' })
      .expect(400);

    await request(http())
      .post('/ingredient-purchases')
      .set('Authorization', `Bearer ${tokenFor('jose')}`)
      .send({ ...purchaseBody, unknownField: 1 })
      .expect(400);

    await request(http())
      .post('/ingredient-purchases')
      .set('Authorization', `Bearer ${tokenFor('jose')}`)
      .send({ ...purchaseBody, quantity: 0 })
      .expect(400);

    expect(store.expenses).toHaveLength(0);
  });

  it('returns 404 for unknown ingredients', async () => {
    prismaMock.ingredient.findUnique.mockResolvedValue(null);

    await request(http())
      .post('/ingredient-purchases')
      .set('Authorization', `Bearer ${tokenFor('jose')}`)
      .send(purchaseBody)
      .expect(404);

    expect(store.expenses).toHaveLength(0);
  });

  it('returns 404 when the selected rate type never existed', async () => {
    exchangeRatesMock.getLatestValid.mockResolvedValue(null);

    await request(http())
      .post('/ingredient-purchases')
      .set('Authorization', `Bearer ${tokenFor('jose')}`)
      .send({ ...purchaseBody, rateType: 'USDT' })
      .expect(404);

    expect(store.expenses).toHaveLength(0);
  });

  it('leaves no partial records when the transaction fails (RF-005)', async () => {
    txClient.inventoryLot.create.mockRejectedValueOnce(new Error('lot failed'));

    await request(http())
      .post('/ingredient-purchases')
      .set('Authorization', `Bearer ${tokenFor('jose')}`)
      .send(purchaseBody)
      .expect(500);

    expect(store.expenses).toHaveLength(0);
    expect(store.purchases).toHaveLength(0);
    expect(store.lots).toHaveLength(0);
  });

  const purchaseRow = {
    id: 'pur-1',
    ingredientId: 'ing-1',
    unit: 'g',
    quantity: 500,
    unitCost: 100,
    totalCost: 50000,
    currency: 'VES',
    quantityMinor: 50000,
    totalCostVesMinor: 5000000,
    totalCostUsdMinor: toMinor(vesToUsd(50000, 36.5)),
    exchangeRateId: 'rate-1',
    exchangeRateType: 'BCV',
    expenseId: 'exp-1',
    purchaseDate: new Date('2026-10-02T10:00:00.000Z'),
    notes: 'Compra en mercado',
    createdById: 'user-1',
  };

  const lotRow = {
    id: 'lot-1',
    ingredientId: 'ing-1',
    purchaseId: 'pur-1',
    initialQuantityMinor: 50000,
    remainingQuantityMinor: 50000,
    unitCostVesMinor: 10000,
    unitCostUsdMinor: toMinor(vesToUsd(100, 36.5)),
    lotDate: new Date('2026-10-02T10:00:00.000Z'),
    createdAt: new Date('2026-10-02T11:00:00.000Z'),
  };

  it('rejects unauthenticated corrections (RF-021)', async () => {
    await request(http())
      .patch('/ingredient-purchases/pur-1')
      .send({ quantity: 400 })
      .expect(401);
    await request(http()).delete('/ingredient-purchases/pur-1').expect(401);
  });

  it('corrects a purchase, its lot, its linked expense and records audit (RF-009b, RF-022)', async () => {
    txClient.ingredientPurchase.findUnique.mockResolvedValue(purchaseRow);
    txClient.exchangeRate.findUnique.mockResolvedValue(rate);
    txClient.inventoryLot.findFirst.mockResolvedValue(lotRow);

    const response = await request(http())
      .patch('/ingredient-purchases/pur-1')
      .set('Authorization', `Bearer ${tokenFor('jose')}`)
      .send({ quantity: 400, totalCostVes: 44000 })
      .expect(200);

    expect(response.body.purchase).toMatchObject({
      quantity: 400,
      totalCost: 44000,
      unitCost: 110,
      quantityMinor: 40000,
      totalCostVesMinor: 4400000,
      totalCostUsdMinor: toMinor(vesToUsd(44000, 36.5)),
    });
    expect(response.body.lot).toMatchObject({
      initialQuantityMinor: 40000,
    });
    expect(response.body.expense).toMatchObject({
      amount: 44000,
      pendingAmount: 0,
      amountVesMinor: 4400000,
      amountUsdMinor: toMinor(vesToUsd(44000, 36.5)),
    });
    expect(auditMock.record).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        userId: 'user-1',
        entity: 'ingredient_purchase',
        entityId: 'pur-1',
        action: 'UPDATE',
      }),
    );
    expect(exchangeRatesMock.getLatestValid).not.toHaveBeenCalled();
  });

  it('removes a purchase, annuls its linked expense and records audit (RF-009b, RF-022)', async () => {
    txClient.ingredientPurchase.findUnique.mockResolvedValue(purchaseRow);
    txClient.inventoryLot.findFirst.mockResolvedValue(lotRow);

    const response = await request(http())
      .delete('/ingredient-purchases/pur-1')
      .set('Authorization', `Bearer ${tokenFor('jose')}`)
      .expect(200);

    expect(response.body).toEqual({ id: 'pur-1', deleted: true });
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
    expect(auditMock.record).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        entity: 'expense',
        entityId: 'exp-1',
        action: 'ANULAR',
      }),
    );
    expect(auditMock.record).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        entity: 'ingredient_purchase',
        entityId: 'pur-1',
        action: 'DELETE',
      }),
    );
  });

  it('returns 404 when correcting or removing unknown purchases', async () => {
    txClient.ingredientPurchase.findUnique.mockResolvedValue(null);

    await request(http())
      .patch('/ingredient-purchases/missing')
      .set('Authorization', `Bearer ${tokenFor('jose')}`)
      .send({ quantity: 400 })
      .expect(404);
    await request(http())
      .delete('/ingredient-purchases/missing')
      .set('Authorization', `Bearer ${tokenFor('jose')}`)
      .expect(404);

    expect(txClient.ingredientPurchase.update).not.toHaveBeenCalled();
    expect(txClient.ingredientPurchase.delete).not.toHaveBeenCalled();
  });

  it('returns 400 for invalid correction bodies', async () => {
    await request(http())
      .patch('/ingredient-purchases/pur-1')
      .set('Authorization', `Bearer ${tokenFor('jose')}`)
      .send({ quantity: 0 })
      .expect(400);
    await request(http())
      .patch('/ingredient-purchases/pur-1')
      .set('Authorization', `Bearer ${tokenFor('jose')}`)
      .send({ unknownField: 1 })
      .expect(400);
  });
});
