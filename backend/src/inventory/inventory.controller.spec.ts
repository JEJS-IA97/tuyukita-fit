import { INestApplication, ValidationPipe } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { JwtModule, JwtService } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { Test } from '@nestjs/testing';
import * as request from 'supertest';
import { JwtStrategy } from '../auth/jwt.strategy';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { InventoryController } from './inventory.controller';
import { InventoryService } from './inventory.service';

const TEST_SECRET = 't028-test-secret';

describe('InventoryController (HTTP)', () => {
  type Store = {
    movements: any[];
    consumptions: any[];
    lotUpdates: any[];
  };

  let store: Store;

  const txClient: any = {};

  const auditMock = {
    record: jest.fn(),
  };

  const prismaMock: any = {
    ingredient: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
    },
    inventoryMovement: {
      create: jest.fn(),
      findUnique: jest.fn(),
    },
    inventoryLotConsumption: {
      create: jest.fn(),
    },
    inventoryLot: {
      findMany: jest.fn(),
      update: jest.fn(),
      groupBy: jest.fn(),
    },
    $transaction: jest.fn(async (cb: (tx: any) => Promise<any>) => {
      const backup: Store = {
        movements: [...store.movements],
        consumptions: [...store.consumptions],
        lotUpdates: [...store.lotUpdates],
      };
      try {
        return await cb(txClient);
      } catch (error) {
        store.movements = backup.movements;
        store.consumptions = backup.consumptions;
        store.lotUpdates = backup.lotUpdates;
        throw error;
      }
    }),
  };

  txClient.inventoryMovement = {
    create: jest.fn((args: any) => {
      const row = {
        id: `mov-${store.movements.length + 1}`,
        createdAt: new Date('2026-10-01T00:00:00.000Z'),
        ...args.data,
      };
      store.movements.push(row);
      return Promise.resolve({ ...row });
    }),
    findUnique: jest.fn(async (args: any) => {
      const row = store.movements.find((m) => m.id === args.where.id);
      if (!row) {
        return null;
      }
      if (args.include && args.include.consumptions) {
        return {
          ...row,
          consumptions: store.consumptions.filter(
            (c) => c.movementId === row.id,
          ),
        };
      }
      return { ...row };
    }),
    findMany: jest.fn(async (args: any) => {
      return store.movements
        .filter(
          (m) =>
            (!args.where?.ingredientId ||
              m.ingredientId === args.where.ingredientId) &&
            (!args.where?.type || m.type === args.where.type),
        )
        .sort((a, b) => {
          const byDate =
            a.movementDate.getTime() - b.movementDate.getTime();
          if (byDate !== 0) {
            return byDate;
          }
          return a.createdAt.getTime() - b.createdAt.getTime();
        })
        .map((row) => ({ ...row }));
    }),
    update: jest.fn(async (args: any) => {
      const row = store.movements.find((m) => m.id === args.where.id);
      Object.assign(row as any, args.data);
      return Promise.resolve({ ...(row as any) });
    }),
    delete: jest.fn(async (args: any) => {
      const index = store.movements.findIndex(
        (m) => m.id === args.where.id,
      );
      const [row] = store.movements.splice(index, 1);
      return Promise.resolve(row);
    }),
  };
  txClient.inventoryLotConsumption = {
    create: jest.fn((args: any) => {
      store.consumptions.push(args.data);
      return Promise.resolve({ id: `con-${store.consumptions.length}`, ...args.data });
    }),
    deleteMany: jest.fn(async (args: any) => {
      const ids: string[] | undefined = args.where?.movementId?.in;
      const single: string | undefined =
        typeof args.where?.movementId === 'string'
          ? args.where.movementId
          : undefined;
      const before = store.consumptions.length;
      store.consumptions = store.consumptions.filter(
        (c) =>
          !(ids && ids.includes(c.movementId)) &&
          !(single && c.movementId === single),
      );
      return Promise.resolve({ count: before - store.consumptions.length });
    }),
  };
  txClient.inventoryLot = {
    findMany: jest.fn(),
    update: jest.fn((args: any) => {
      store.lotUpdates.push(args);
      return Promise.resolve({ id: args.where.id, ...args.data });
    }),
  };

  let app: INestApplication;
  let jwt: JwtService;

  const tokenFor = (username: string, sub = 'user-1') =>
    jwt.sign({ sub, username, role: 'OPERATOR' });

  const ingredient = {
    id: 'ing-1',
    name: 'Yuca',
    normalizedName: 'yuca',
    unit: 'kg',
    isActive: true,
  };

  const lotOld = {
    id: 'lot-old',
    ingredientId: 'ing-1',
    purchaseId: 'pur-1',
    initialQuantityMinor: 5000,
    remainingQuantityMinor: 5000,
    unitCostVesMinor: 10000,
    unitCostUsdMinor: 100,
    lotDate: new Date('2026-10-01T00:00:00.000Z'),
    createdAt: new Date('2026-10-01T08:00:00.000Z'),
  };

  const lotNew = {
    id: 'lot-new',
    ingredientId: 'ing-1',
    purchaseId: 'pur-2',
    initialQuantityMinor: 3000,
    remainingQuantityMinor: 3000,
    unitCostVesMinor: 20000,
    unitCostUsdMinor: 200,
    lotDate: new Date('2026-10-05T00:00:00.000Z'),
    createdAt: new Date('2026-10-05T08:00:00.000Z'),
  };

  const outputBody = {
    ingredientId: 'ing-1',
    quantity: 60,
    movementDate: '2026-10-06T10:00:00.000Z',
    reason: 'Produccion diaria',
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
      controllers: [InventoryController],
      providers: [
        InventoryService,
        JwtStrategy,
        { provide: PrismaService, useValue: prismaMock },
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
    store = { movements: [], consumptions: [], lotUpdates: [] };
    prismaMock.ingredient.findUnique.mockResolvedValue(ingredient);
    prismaMock.inventoryLot.findMany.mockResolvedValue([lotNew, lotOld]);
    txClient.inventoryLot.findMany.mockResolvedValue([lotNew, lotOld]);
  });

  const http = () => app.getHttpServer();

  it('rejects unauthenticated requests (RF-021)', async () => {
    await request(http()).get('/inventory/stock').expect(401);
    await request(http()).post('/inventory/outputs').expect(401);
    await request(http()).get('/inventory/outputs/any').expect(401);
  });

  it('shows available stock per ingredient in its unit (RF-010)', async () => {
    prismaMock.ingredient.findMany.mockResolvedValue([
      { id: 'ing-1', name: 'Yuca', unit: 'kg', isActive: true },
      { id: 'ing-2', name: 'Perejil', unit: 'g', isActive: false },
      { id: 'ing-3', name: 'Ajo', unit: 'g', isActive: true },
    ]);
    prismaMock.inventoryLot.groupBy.mockResolvedValue([
      { ingredientId: 'ing-1', _sum: { remainingQuantityMinor: 5000 } },
    ]);

    const response = await request(http())
      .get('/inventory/stock')
      .set('Authorization', `Bearer ${tokenFor('jose')}`)
      .expect(200);

    expect(response.body).toEqual([
      {
        ingredientId: 'ing-1',
        name: 'Yuca',
        unit: 'kg',
        isActive: true,
        availableQuantityMinor: 5000,
        availableQuantity: 50,
      },
      {
        ingredientId: 'ing-2',
        name: 'Perejil',
        unit: 'g',
        isActive: false,
        availableQuantityMinor: 0,
        availableQuantity: 0,
      },
      {
        ingredientId: 'ing-3',
        name: 'Ajo',
        unit: 'g',
        isActive: true,
        availableQuantityMinor: 0,
        availableQuantity: 0,
      },
    ]);
  });

  it('registers an output with its FIFO detail (RF-011, RF-012, RF-013, RF-015)', async () => {
    const response = await request(http())
      .post('/inventory/outputs')
      .set('Authorization', `Bearer ${tokenFor('jose')}`)
      .send(outputBody)
      .expect(201);

    expect(response.body.movement).toMatchObject({
      ingredientId: 'ing-1',
      type: 'OUT',
      quantityMinor: 6000,
      costUsdMinor: 7000,
      reason: 'Produccion diaria',
      createdById: 'user-1',
    });
    expect(response.body.consumptions).toHaveLength(2);
    expect(response.body.consumptions[0]).toMatchObject({
      movementId: 'mov-1',
      lotId: 'lot-old',
      quantityMinor: 5000,
      costUsdMinor: 5000,
    });
    expect(response.body.consumptions[1]).toMatchObject({
      movementId: 'mov-1',
      lotId: 'lot-new',
      quantityMinor: 1000,
      costUsdMinor: 2000,
    });
  });

  it('lets each initial account register outputs (RF-021, RF-022)', async () => {
    for (const username of ['jose', 'jay', 'vivi']) {
      const response = await request(http())
        .post('/inventory/outputs')
        .set('Authorization', `Bearer ${tokenFor(username, `sub-${username}`)}`)
        .send({ ...outputBody, quantity: 20 })
        .expect(201);

      expect(response.body.movement.createdById).toBe(`sub-${username}`);
    }
  });

  it('returns 409 when stock is insufficient (RF-014)', async () => {
    const response = await request(http())
      .post('/inventory/outputs')
      .set('Authorization', `Bearer ${tokenFor('jose')}`)
      .send({ ...outputBody, quantity: 90 })
      .expect(409);

    expect(response.body.message).toContain('Insufficient stock');
    expect(store.movements).toHaveLength(0);
    expect(store.consumptions).toHaveLength(0);
    expect(store.lotUpdates).toHaveLength(0);
  });

  it('returns 400 for invalid output bodies', async () => {
    await request(http())
      .post('/inventory/outputs')
      .set('Authorization', `Bearer ${tokenFor('jose')}`)
      .send({})
      .expect(400);

    await request(http())
      .post('/inventory/outputs')
      .set('Authorization', `Bearer ${tokenFor('jose')}`)
      .send({ ...outputBody, quantity: 0 })
      .expect(400);

    await request(http())
      .post('/inventory/outputs')
      .set('Authorization', `Bearer ${tokenFor('jose')}`)
      .send({ ...outputBody, unknownField: 1 })
      .expect(400);

    expect(store.movements).toHaveLength(0);
  });

  it('returns 404 for unknown ingredients', async () => {
    prismaMock.ingredient.findUnique.mockResolvedValue(null);

    await request(http())
      .post('/inventory/outputs')
      .set('Authorization', `Bearer ${tokenFor('jose')}`)
      .send(outputBody)
      .expect(404);

    expect(store.movements).toHaveLength(0);
  });

  it('consults the FIFO consumption detail of an output (RF-015)', async () => {
    prismaMock.inventoryMovement.findUnique.mockResolvedValue({
      id: 'mov-1',
      ingredientId: 'ing-1',
      type: 'OUT',
      quantityMinor: 6000,
      costUsdMinor: 5000,
      reason: 'Produccion diaria',
      createdById: 'user-1',
      consumptions: [
        {
          id: 'con-1',
          movementId: 'mov-1',
          lotId: 'lot-old',
          quantityMinor: 5000,
          costUsdMinor: 5000,
          lot: {
            id: 'lot-old',
            lotDate: new Date('2026-10-01T00:00:00.000Z'),
            purchaseId: 'pur-1',
            initialQuantityMinor: 5000,
          },
        },
      ],
    });

    const response = await request(http())
      .get('/inventory/outputs/mov-1')
      .set('Authorization', `Bearer ${tokenFor('jose')}`)
      .expect(200);

    expect(response.body).toMatchObject({
      id: 'mov-1',
      costUsdMinor: 5000,
      consumptions: [
        {
          lotId: 'lot-old',
          quantityMinor: 5000,
          costUsdMinor: 5000,
          lot: { purchaseId: 'pur-1' },
        },
      ],
    });
    expect(prismaMock.inventoryMovement.findUnique).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 'mov-1' } }),
    );
  });

  it('returns 404 when consulting unknown outputs', async () => {
    prismaMock.inventoryMovement.findUnique.mockResolvedValue(null);

    await request(http())
      .get('/inventory/outputs/missing')
      .set('Authorization', `Bearer ${tokenFor('jose')}`)
      .expect(404);
  });

  it('rejects unauthenticated corrections (RF-021)', async () => {
    await request(http())
      .patch('/inventory/outputs/mov-1')
      .send({ quantity: 10 })
      .expect(401);
    await request(http()).delete('/inventory/outputs/mov-1').expect(401);
  });

  it('corrects an output and records audit (RF-009b, RF-022)', async () => {
    const created = await request(http())
      .post('/inventory/outputs')
      .set('Authorization', `Bearer ${tokenFor('jose')}`)
      .send(outputBody)
      .expect(201);
    const id = created.body.movement.id;
    auditMock.record.mockClear();

    const response = await request(http())
      .patch(`/inventory/outputs/${id}`)
      .set('Authorization', `Bearer ${tokenFor('jose')}`)
      .send({ quantity: 40 })
      .expect(200);

    expect(response.body.movement).toMatchObject({ quantityMinor: 4000 });
    expect(response.body.consumptions).toHaveLength(1);
    expect(auditMock.record).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        userId: 'user-1',
        entity: 'inventory_movement',
        entityId: id,
        action: 'UPDATE',
      }),
    );
  });

  it('removes an output and records audit (RF-009b, RF-022)', async () => {
    const created = await request(http())
      .post('/inventory/outputs')
      .set('Authorization', `Bearer ${tokenFor('jose')}`)
      .send(outputBody)
      .expect(201);
    const id = created.body.movement.id;
    auditMock.record.mockClear();

    const response = await request(http())
      .delete(`/inventory/outputs/${id}`)
      .set('Authorization', `Bearer ${tokenFor('jose')}`)
      .expect(200);

    expect(response.body).toEqual({ id, deleted: true });
    expect(store.movements).toHaveLength(0);
    expect(store.consumptions).toHaveLength(0);
    expect(auditMock.record).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        userId: 'user-1',
        entity: 'inventory_movement',
        entityId: id,
        action: 'DELETE',
      }),
    );
  });

  it('returns 404 when correcting or removing unknown outputs', async () => {
    await request(http())
      .patch('/inventory/outputs/missing')
      .set('Authorization', `Bearer ${tokenFor('jose')}`)
      .send({ quantity: 10 })
      .expect(404);
    await request(http())
      .delete('/inventory/outputs/missing')
      .set('Authorization', `Bearer ${tokenFor('jose')}`)
      .expect(404);
  });
});
