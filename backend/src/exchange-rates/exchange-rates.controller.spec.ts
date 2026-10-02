import { INestApplication, ValidationPipe } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { JwtModule, JwtService } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { Test } from '@nestjs/testing';
import * as request from 'supertest';
import { JwtStrategy } from '../auth/jwt.strategy';
import { PrismaService } from '../prisma/prisma.service';
import { ExchangeRatesController } from './exchange-rates.controller';
import { ExchangeRatesService } from './exchange-rates.service';
import {
  BCV_RATE_PROVIDER,
  USDT_RATE_PROVIDER,
} from './exchange-rates.tokens';
import { type RateProvider } from './providers/rate-provider';

const TEST_SECRET = 't021-test-secret';

describe('ExchangeRatesController (HTTP)', () => {
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

  const bcvProvider: RateProvider & { fetchLatest: jest.Mock } = {
    rateType: 'BCV',
    source: 'BCV',
    fetchLatest: jest.fn(),
  };

  const usdtProvider: RateProvider & { fetchLatest: jest.Mock } = {
    rateType: 'USDT',
    source: 'mercado-referencia',
    fetchLatest: jest.fn(),
  };

  let app: INestApplication;
  let jwt: JwtService;

  const tokenFor = (username: string) =>
    jwt.sign({ sub: 'user-1', username, role: 'OPERATOR' });

  const bcvRow = {
    id: 'rate-bcv',
    rateType: 'BCV',
    vesPerUsd: 36.5,
    usdPerVes: 1 / 36.5,
    source: 'BCV',
    date: new Date('2026-10-01T00:00:00.000Z'),
    fetchedAt: new Date('2026-10-01T15:00:00.000Z'),
    isManual: false,
  };

  const usdtRow = {
    id: 'rate-usdt',
    rateType: 'USDT',
    vesPerUsd: 45.2,
    usdPerVes: 1 / 45.2,
    source: 'mercado-referencia',
    date: new Date('2026-10-01T00:00:00.000Z'),
    fetchedAt: new Date('2026-10-01T15:05:00.000Z'),
    isManual: false,
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
      controllers: [ExchangeRatesController],
      providers: [
        ExchangeRatesService,
        JwtStrategy,
        { provide: PrismaService, useValue: prismaMock },
        { provide: BCV_RATE_PROVIDER, useValue: bcvProvider },
        { provide: USDT_RATE_PROVIDER, useValue: usdtProvider },
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
  });

  const http = () => app.getHttpServer();

  it('rejects unauthenticated requests (RF-021)', async () => {
    await request(http()).get('/exchange-rates/latest').expect(401);
    await request(http()).post('/exchange-rates/refresh').expect(401);
  });

  it('returns BCV and USDT with source and dates (RF-017)', async () => {
    prismaMock.exchangeRate.findFirst
      .mockResolvedValueOnce(bcvRow)
      .mockResolvedValueOnce(usdtRow);

    const response = await request(http())
      .get('/exchange-rates/latest')
      .set('Authorization', `Bearer ${tokenFor('jose')}`)
      .expect(200);

    expect(response.body.bcv).toEqual({
      rateType: 'BCV',
      valueVesPerUsd: 36.5,
      source: 'BCV',
      effectiveDate: bcvRow.date.toISOString(),
      fetchedAt: bcvRow.fetchedAt.toISOString(),
    });
    expect(response.body.usdt).toEqual({
      rateType: 'USDT',
      valueVesPerUsd: 45.2,
      source: 'mercado-referencia',
      effectiveDate: usdtRow.date.toISOString(),
      fetchedAt: usdtRow.fetchedAt.toISOString(),
    });
  });

  it('returns a single type when requested', async () => {
    prismaMock.exchangeRate.findFirst.mockResolvedValueOnce(bcvRow);

    const response = await request(http())
      .get('/exchange-rates/latest?type=BCV')
      .set('Authorization', `Bearer ${tokenFor('jose')}`)
      .expect(200);

    expect(response.body.rateType).toBe('BCV');
    expect(response.body.source).toBe('BCV');
  });

  it('returns a clear error when the selected type never existed (RF-019a)', async () => {
    prismaMock.exchangeRate.findFirst.mockResolvedValueOnce(null);

    const response = await request(http())
      .get('/exchange-rates/latest?type=USDT')
      .set('Authorization', `Bearer ${tokenFor('jose')}`)
      .expect(404);

    expect(response.body.message).toContain('USDT');
  });

  it('returns a clear error when no rate ever existed (RF-019a)', async () => {
    prismaMock.exchangeRate.findFirst
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(null);

    const response = await request(http())
      .get('/exchange-rates/latest')
      .set('Authorization', `Bearer ${tokenFor('jose')}`)
      .expect(404);

    expect(response.body.message).toBeTruthy();
  });

  it('rejects unknown rate types', async () => {
    await request(http())
      .get('/exchange-rates/latest?type=EUR')
      .set('Authorization', `Bearer ${tokenFor('jose')}`)
      .expect(400);
  });

  it('lets each initial account consult rates (RF-021)', async () => {
    for (const username of ['jose', 'jay', 'vivi']) {
      prismaMock.exchangeRate.findFirst.mockResolvedValue(bcvRow);

      await request(http())
        .get('/exchange-rates/latest?type=BCV')
        .set('Authorization', `Bearer ${tokenFor(username)}`)
        .expect(200);
    }
  });

  it('refreshes rates from configured providers (RF-016)', async () => {
    bcvProvider.fetchLatest.mockResolvedValue({
      rateType: 'BCV',
      valueVesPerUsd: 36.7,
      source: 'BCV',
      effectiveDate: new Date('2026-10-02T00:00:00.000Z'),
      fetchedAt: new Date('2026-10-02T15:00:00.000Z'),
    });
    usdtProvider.fetchLatest.mockResolvedValue({
      rateType: 'USDT',
      valueVesPerUsd: 45.5,
      source: 'mercado-referencia',
      effectiveDate: new Date('2026-10-02T00:00:00.000Z'),
      fetchedAt: new Date('2026-10-02T15:01:00.000Z'),
    });
    prismaMock.exchangeRate.findFirst.mockResolvedValue(null);
    prismaMock.exchangeRate.create.mockImplementation(({ data }: any) =>
      Promise.resolve({ id: `rate-${data.rateType}`, ...data }),
    );

    const response = await request(http())
      .post('/exchange-rates/refresh')
      .set('Authorization', `Bearer ${tokenFor('jose')}`)
      .expect(201);

    expect(bcvProvider.fetchLatest).toHaveBeenCalledTimes(1);
    expect(usdtProvider.fetchLatest).toHaveBeenCalledTimes(1);
    expect(response.body.saved).toHaveLength(2);
    expect(response.body.errors).toEqual({});
    expect(response.body.saved).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ rateType: 'BCV', vesPerUsd: 36.7 }),
        expect.objectContaining({ rateType: 'USDT', vesPerUsd: 45.5 }),
      ]),
    );
  });

  it('reports provider failures clearly while saving the rest', async () => {
    bcvProvider.fetchLatest.mockRejectedValue(new Error('BCV down'));
    usdtProvider.fetchLatest.mockResolvedValue({
      rateType: 'USDT',
      valueVesPerUsd: 45.5,
      source: 'mercado-referencia',
      effectiveDate: new Date('2026-10-02T00:00:00.000Z'),
      fetchedAt: new Date('2026-10-02T15:01:00.000Z'),
    });
    prismaMock.exchangeRate.findFirst.mockResolvedValue(null);
    prismaMock.exchangeRate.create.mockImplementation(({ data }: any) =>
      Promise.resolve({ id: `rate-${data.rateType}`, ...data }),
    );

    const response = await request(http())
      .post('/exchange-rates/refresh')
      .set('Authorization', `Bearer ${tokenFor('jose')}`)
      .expect(201);

    expect(response.body.errors).toEqual({ bcv: 'BCV down' });
    expect(response.body.saved).toHaveLength(1);
    expect(response.body.saved[0]).toEqual(
      expect.objectContaining({ rateType: 'USDT' }),
    );
  });
});
