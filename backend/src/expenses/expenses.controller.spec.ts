import { INestApplication, NotFoundException, ValidationPipe } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { JwtModule, JwtService } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { Test } from '@nestjs/testing';
import * as request from 'supertest';
import { JwtStrategy } from '../auth/jwt.strategy';
import { PrismaService } from '../prisma/prisma.service';
import { ExchangeRatesService } from '../exchange-rates/exchange-rates.service';
import { AuditService } from '../audit/audit.service';
import { ExpensesController } from './expenses.controller';
import { ExpensesService } from './expenses.service';

const TEST_SECRET = 't023-test-secret';

describe('ExpensesController manual expenses (HTTP)', () => {
  const txClient: any = {
    expense: { update: jest.fn() },
  };

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
    },
    inventoryMovement: {
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    ingredientPurchase: {
      create: jest.fn(),
      findFirst: jest.fn(),
    },
    $transaction: jest.fn(async (cb: (tx: any) => Promise<any>) =>
      cb(txClient),
    ),
  };

  const exchangeRatesMock = {
    getLatestValid: jest.fn(),
  };

  const auditMock = {
    record: jest.fn(),
  };

  let app: INestApplication;
  let jwt: JwtService;

  const tokenFor = (username: string, sub = 'user-1') =>
    jwt.sign({ sub, username, role: 'OPERATOR' });

  const manualBody = {
    description: 'Compra de yuca',
    category: 'Materia prima',
    amountVes: 1000000,
    rateType: 'BCV',
    expenseDate: '2026-10-01T10:00:00.000Z',
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
      controllers: [ExpensesController],
      providers: [
        ExpensesService,
        JwtStrategy,
        { provide: PrismaService, useValue: prismaMock },
        { provide: ExchangeRatesService, useValue: exchangeRatesMock },
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
    jest.resetAllMocks();
    prismaMock.$transaction.mockImplementation(
      async (cb: (tx: any) => Promise<any>) => cb(txClient),
    );
    auditMock.record.mockResolvedValue({ id: 'log-1' });
  });

  const http = () => app.getHttpServer();

  it('rejects unauthenticated requests (RF-021)', async () => {
    await request(http()).post('/expenses/manual').expect(401);
    await request(http()).get('/expenses').expect(401);
    await request(http()).get('/expenses/any-id').expect(401);
  });

  it('creates a manual expense with a validated snapshot body (RF-007, RF-018)', async () => {
    exchangeRatesMock.getLatestValid.mockResolvedValue({
      id: 'rate-1',
      rateType: 'BCV',
      vesPerUsd: 36.5,
      source: 'BCV',
      date: new Date('2026-10-01T00:00:00.000Z'),
      fetchedAt: new Date('2026-10-01T15:00:00.000Z'),
    });
    prismaMock.expense.findFirst.mockResolvedValue(null);
    prismaMock.expense.create.mockImplementation(({ data }: any) =>
      Promise.resolve({ id: 'exp-1', ...data }),
    );

    const response = await request(http())
      .post('/expenses/manual')
      .set('Authorization', `Bearer ${tokenFor('jose')}`)
      .send(manualBody)
      .expect(201);

    expect(response.body).toMatchObject({
      amount: 1000000,
      currency: 'VES',
      amountVesMinor: 100000000,
      amountUsdMinor: 2739726,
      exchangeRateType: 'BCV',
      exchangeRateSource: 'BCV',
      exchangeRateValue: 36.5,
      createdById: 'user-1',
    });
    expect(exchangeRatesMock.getLatestValid).toHaveBeenCalledWith('BCV');
    expect(prismaMock.inventoryLot.create).not.toHaveBeenCalled();
    expect(prismaMock.inventoryMovement.create).not.toHaveBeenCalled();
    expect(prismaMock.ingredientPurchase.create).not.toHaveBeenCalled();
  });

  it('lets each initial account create manual expenses (RF-021)', async () => {
    for (const username of ['jose', 'jay', 'vivi']) {
      exchangeRatesMock.getLatestValid.mockResolvedValue({
        id: 'rate-1',
        rateType: 'BCV',
        vesPerUsd: 36.5,
        source: 'BCV',
        date: new Date('2026-10-01T00:00:00.000Z'),
        fetchedAt: new Date('2026-10-01T15:00:00.000Z'),
      });
      prismaMock.expense.findFirst.mockResolvedValue(null);
      prismaMock.expense.create.mockImplementation(({ data }: any) =>
        Promise.resolve({ id: 'exp-1', ...data }),
      );

      await request(http())
        .post('/expenses/manual')
        .set('Authorization', `Bearer ${tokenFor(username, `sub-${username}`)}`)
        .send(manualBody)
        .expect(201);

      expect(prismaMock.expense.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ createdById: `sub-${username}` }),
        }),
      );
    }
  });

  it('records the authenticated user as creator (RF-022)', async () => {
    exchangeRatesMock.getLatestValid.mockResolvedValue({
      id: 'rate-1',
      rateType: 'BCV',
      vesPerUsd: 36.5,
      source: 'BCV',
      date: new Date('2026-10-01T00:00:00.000Z'),
      fetchedAt: new Date(),
    });
    prismaMock.expense.findFirst.mockResolvedValue(null);
    prismaMock.expense.create.mockImplementation(({ data }: any) =>
      Promise.resolve({ id: 'exp-1', ...data }),
    );

    await request(http())
      .post('/expenses/manual')
      .set('Authorization', `Bearer ${tokenFor('vivi', 'uuid-vivi')}`)
      .send(manualBody)
      .expect(201);

    expect(prismaMock.expense.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ createdById: 'uuid-vivi' }),
      }),
    );
  });

  it('returns 400 for invalid bodies', async () => {
    await request(http())
      .post('/expenses/manual')
      .set('Authorization', `Bearer ${tokenFor('jose')}`)
      .send({})
      .expect(400);

    await request(http())
      .post('/expenses/manual')
      .set('Authorization', `Bearer ${tokenFor('jose')}`)
      .send({ ...manualBody, rateType: 'EUR' })
      .expect(400);

    await request(http())
      .post('/expenses/manual')
      .set('Authorization', `Bearer ${tokenFor('jose')}`)
      .send({ ...manualBody, unknownField: 1 })
      .expect(400);

    expect(prismaMock.expense.create).not.toHaveBeenCalled();
  });

  it('returns a clear 404 when the selected rate type never existed', async () => {
    exchangeRatesMock.getLatestValid.mockResolvedValue(null);

    await request(http())
      .post('/expenses/manual')
      .set('Authorization', `Bearer ${tokenFor('jose')}`)
      .send({ ...manualBody, rateType: 'USDT' })
      .expect(404);

    expect(prismaMock.expense.create).not.toHaveBeenCalled();
  });

  it('lists expenses with their snapshot fields', async () => {
    prismaMock.expense.findMany.mockResolvedValue([
      {
        id: 'exp-1',
        description: 'Compra de yuca',
        amountVesMinor: 100000000,
        amountUsdMinor: 2739726,
        exchangeRateType: 'BCV',
      },
    ]);
    prismaMock.expense.count.mockResolvedValue(1);

    const response = await request(http())
      .get('/expenses')
      .set('Authorization', `Bearer ${tokenFor('jose')}`)
      .expect(200);

    expect(response.body.data[0]).toMatchObject({
      amountVesMinor: 100000000,
      amountUsdMinor: 2739726,
      exchangeRateType: 'BCV',
    });
    expect(response.body.pagination).toMatchObject({ total: 1 });
  });

  it('consults a single manual expense with its snapshot (RF-007)', async () => {
    prismaMock.expense.findUnique.mockResolvedValue({
      id: 'exp-1',
      description: 'Compra de yuca',
      category: 'Materia prima',
      amountVesMinor: 100000000,
      amountUsdMinor: 2739726,
      exchangeRateId: 'rate-1',
      exchangeRateValue: 36.5,
      exchangeRateType: 'BCV',
      exchangeRateSource: 'BCV',
      createdById: 'user-1',
    });

    const response = await request(http())
      .get('/expenses/exp-1')
      .set('Authorization', `Bearer ${tokenFor('jose')}`)
      .expect(200);

    expect(response.body).toMatchObject({
      category: 'Materia prima',
      amountVesMinor: 100000000,
      amountUsdMinor: 2739726,
      exchangeRateValue: 36.5,
      exchangeRateSource: 'BCV',
      createdById: 'user-1',
    });
  });

  it('returns 404 when consulting unknown expenses', async () => {
    prismaMock.expense.findUnique.mockResolvedValue(null);

    await request(http())
      .get('/expenses/missing')
      .set('Authorization', `Bearer ${tokenFor('jose')}`)
      .expect(404);
  });

  it('rejects unauthenticated corrections (RF-021)', async () => {
    await request(http())
      .patch('/expenses/exp-1')
      .send({ description: 'x' })
      .expect(401);
    await request(http()).delete('/expenses/exp-1').expect(401);
  });

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
    amountUsdMinor: 2739726,
    exchangeRateValue: 36.5,
    paymentStatus: 'PARTIALLY_PAID',
    isActive: true,
    createdById: 'user-1',
  };

  it('updates an expense and records audit (RF-009b, RF-022)', async () => {
    prismaMock.expense.findUnique.mockResolvedValue(expenseRow);
    prismaMock.ingredientPurchase.findFirst.mockResolvedValue(null);
    auditMock.record.mockResolvedValue({ id: 'log-1' });
    txClient.expense.update.mockImplementation(({ data }: any) =>
      Promise.resolve({ ...expenseRow, ...data }),
    );

    const response = await request(http())
      .patch('/expenses/exp-1')
      .set('Authorization', `Bearer ${tokenFor('jose')}`)
      .send({ description: 'Corregido', amount: 150000, paidAmount: 150000 })
      .expect(200);

    expect(response.body).toMatchObject({
      description: 'Corregido',
      amount: 150000,
      pendingAmount: 0,
      paymentStatus: 'PAID',
    });
    expect(auditMock.record).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        userId: 'user-1',
        entity: 'expense',
        entityId: 'exp-1',
        action: 'UPDATE',
      }),
    );
    expect(prismaMock.expense.delete).not.toHaveBeenCalled();
  });

  it('does not allow activating or annulling through the API (RF-009b)', async () => {
    await request(http())
      .patch('/expenses/exp-1')
      .set('Authorization', `Bearer ${tokenFor('jose')}`)
      .send({ isActive: false })
      .expect(400);

    expect(txClient.expense.update).not.toHaveBeenCalled();
  });

  it('annuls an expense instead of deleting it (RF-009b, RF-022)', async () => {
    prismaMock.expense.findUnique.mockResolvedValue(expenseRow);
    prismaMock.ingredientPurchase.findFirst.mockResolvedValue(null);
    auditMock.record.mockResolvedValue({ id: 'log-1' });
    txClient.expense.update.mockImplementation(({ data }: any) =>
      Promise.resolve({ ...expenseRow, ...data }),
    );

    const response = await request(http())
      .delete('/expenses/exp-1')
      .set('Authorization', `Bearer ${tokenFor('jose')}`)
      .expect(200);

    expect(response.body).toMatchObject({ id: 'exp-1', isActive: false });
    expect(prismaMock.expense.delete).not.toHaveBeenCalled();
    expect(auditMock.record).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        userId: 'user-1',
        entity: 'expense',
        entityId: 'exp-1',
        action: 'ANULAR',
      }),
    );
  });

  it('rejects correcting or annulling an expense linked to a purchase (RF-005, RF-009b)', async () => {
    prismaMock.expense.findUnique.mockResolvedValue(expenseRow);
    prismaMock.ingredientPurchase.findFirst.mockResolvedValue({
      id: 'pur-1',
      expenseId: 'exp-1',
    });

    await request(http())
      .patch('/expenses/exp-1')
      .set('Authorization', `Bearer ${tokenFor('jose')}`)
      .send({ description: 'x' })
      .expect(409);
    await request(http())
      .delete('/expenses/exp-1')
      .set('Authorization', `Bearer ${tokenFor('jose')}`)
      .expect(409);

    expect(txClient.expense.update).not.toHaveBeenCalled();
    expect(prismaMock.expense.delete).not.toHaveBeenCalled();
  });

  it('returns 404 when correcting or annulling unknown expenses', async () => {
    prismaMock.expense.findUnique.mockResolvedValue(null);

    await request(http())
      .patch('/expenses/missing')
      .set('Authorization', `Bearer ${tokenFor('jose')}`)
      .send({ description: 'x' })
      .expect(404);
    await request(http())
      .delete('/expenses/missing')
      .set('Authorization', `Bearer ${tokenFor('jose')}`)
      .expect(404);
  });
});
