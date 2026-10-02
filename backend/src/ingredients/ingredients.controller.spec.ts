import { INestApplication, ValidationPipe } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { JwtModule, JwtService } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { Test } from '@nestjs/testing';
import * as request from 'supertest';
import { JwtStrategy } from '../auth/jwt.strategy';
import { PrismaService } from '../prisma/prisma.service';
import { IngredientsController } from './ingredients.controller';
import { IngredientsService } from './ingredients.service';

const TEST_SECRET = 't014-test-secret';

describe('IngredientsController (HTTP)', () => {
  const prismaMock = {
    $connect: jest.fn(),
    $disconnect: jest.fn(),
    ingredient: {
      create: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      deleteMany: jest.fn(),
    },
    ingredientPurchase: {
      create: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
      delete: jest.fn(),
      deleteMany: jest.fn(),
    },
    inventoryLot: {
      count: jest.fn(),
    },
    inventoryMovement: {
      count: jest.fn(),
    },
  };

  let app: INestApplication;
  let jwt: JwtService;

  const tokenFor = (username: string) =>
    jwt.sign({ sub: 'user-1', username, role: 'OPERATOR' });

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
      controllers: [IngredientsController],
      providers: [
        IngredientsService,
        JwtStrategy,
        { provide: PrismaService, useValue: prismaMock },
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
    await request(http()).get('/ingredients').expect(401);
    await request(http()).post('/ingredients').expect(401);
    await request(http()).delete('/ingredients/any').expect(401);
  });

  it('lists ingredients with a valid token', async () => {
    prismaMock.ingredient.findMany.mockResolvedValue([]);
    const response = await request(http())
      .get('/ingredients')
      .set('Authorization', `Bearer ${tokenFor('jose')}`)
      .expect(200);
    expect(response.body).toEqual([]);
  });

  it('lets each initial account create ingredients (RF-021)', async () => {
    for (const username of ['jose', 'jay', 'vivi']) {
      prismaMock.ingredient.findUnique.mockResolvedValue(null);
      prismaMock.ingredient.create.mockResolvedValue({
        id: 'ing-1',
        name: 'Yuca',
        normalizedName: 'yuca',
        unit: 'kg',
        isActive: true,
      });

      await request(http())
        .post('/ingredients')
        .set('Authorization', `Bearer ${tokenFor(username)}`)
        .send({ name: 'Yuca', unit: 'kg' })
        .expect(201);

      expect(prismaMock.ingredient.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ normalizedName: 'yuca' }),
        }),
      );
    }
  });

  it('returns 409 on duplicated names (RF-001a)', async () => {
    prismaMock.ingredient.findUnique.mockResolvedValue({
      id: 'existing',
      normalizedName: 'yuca',
    });

    await request(http())
      .post('/ingredients')
      .set('Authorization', `Bearer ${tokenFor('jose')}`)
      .send({ name: ' yuca ', unit: 'kg' })
      .expect(409);
    expect(prismaMock.ingredient.create).not.toHaveBeenCalled();
  });

  it('returns 400 for invalid or unknown body fields', async () => {
    await request(http())
      .post('/ingredients')
      .set('Authorization', `Bearer ${tokenFor('jose')}`)
      .send({ name: 'Yuca' })
      .expect(400);

    prismaMock.ingredient.findUnique.mockResolvedValue(null);
    await request(http())
      .post('/ingredients')
      .set('Authorization', `Bearer ${tokenFor('jose')}`)
      .send({ name: 'Yuca', unit: 'kg', unknownField: true })
      .expect(400);
  });

  it('updates configurable data (RF-002)', async () => {
    prismaMock.ingredient.findUnique.mockResolvedValue({
      id: 'ing-1',
      name: 'Yuca',
      normalizedName: 'yuca',
      unit: 'kg',
      isActive: true,
      purchases: [],
    });
    prismaMock.ingredient.update.mockResolvedValue({ id: 'ing-1' });

    await request(http())
      .patch('/ingredients/ing-1')
      .set('Authorization', `Bearer ${tokenFor('vivi')}`)
      .send({ description: 'Organica' })
      .expect(200);
    expect(prismaMock.ingredient.update).toHaveBeenCalledWith({
      where: { id: 'ing-1' },
      data: { description: 'Organica' },
    });
  });

  it('returns 404 when updating unknown ingredients (RF-002)', async () => {
    prismaMock.ingredient.findUnique.mockResolvedValue(null);

    await request(http())
      .patch('/ingredients/missing')
      .set('Authorization', `Bearer ${tokenFor('jose')}`)
      .send({ description: 'x' })
      .expect(404);
  });

  it('returns 409 when changing the unit of an ingredient with inventory (RF-004)', async () => {
    prismaMock.ingredient.findUnique.mockResolvedValue({
      id: 'ing-1',
      name: 'Yuca',
      normalizedName: 'yuca',
      unit: 'kg',
      isActive: true,
      purchases: [],
    });
    prismaMock.inventoryLot.count.mockResolvedValue(2);
    prismaMock.inventoryMovement.count.mockResolvedValue(0);

    await request(http())
      .patch('/ingredients/ing-1')
      .set('Authorization', `Bearer ${tokenFor('jose')}`)
      .send({ unit: 'g' })
      .expect(409);
    expect(prismaMock.ingredient.update).not.toHaveBeenCalled();
  });

  it('deactivates instead of deleting when history exists (RF-003)', async () => {
    prismaMock.ingredient.findUnique.mockResolvedValue({
      id: 'ing-1',
      name: 'Yuca',
      normalizedName: 'yuca',
      unit: 'kg',
      isActive: true,
      purchases: [],
    });
    prismaMock.ingredientPurchase.count.mockResolvedValue(1);
    prismaMock.inventoryLot.count.mockResolvedValue(0);
    prismaMock.inventoryMovement.count.mockResolvedValue(0);
    prismaMock.ingredient.update.mockResolvedValue({ isActive: false });

    const response = await request(http())
      .delete('/ingredients/ing-1')
      .set('Authorization', `Bearer ${tokenFor('jay')}`)
      .expect(200);
    expect(response.body).toEqual({ isActive: false });
    expect(prismaMock.ingredient.delete).not.toHaveBeenCalled();
  });

  it('deletes permanently when there is no history (RF-003a)', async () => {
    prismaMock.ingredient.findUnique.mockResolvedValue({
      id: 'ing-1',
      name: 'Yuca',
      normalizedName: 'yuca',
      unit: 'kg',
      isActive: true,
      purchases: [],
    });
    prismaMock.ingredientPurchase.count.mockResolvedValue(0);
    prismaMock.inventoryLot.count.mockResolvedValue(0);
    prismaMock.inventoryMovement.count.mockResolvedValue(0);
    prismaMock.ingredient.delete.mockResolvedValue({ id: 'ing-1' });

    await request(http())
      .delete('/ingredients/ing-1')
      .set('Authorization', `Bearer ${tokenFor('jose')}`)
      .expect(200);
    expect(prismaMock.ingredient.delete).toHaveBeenCalledWith({
      where: { id: 'ing-1' },
    });
    expect(prismaMock.ingredient.update).not.toHaveBeenCalled();
  });

  it('keeps the legacy purchase creation route disabled (RF-005)', async () => {
    prismaMock.ingredient.findUnique.mockResolvedValue({
      id: 'ing-1',
      name: 'Yuca',
      normalizedName: 'yuca',
      unit: 'kg',
      isActive: true,
      purchases: [],
    });
    prismaMock.ingredientPurchase.create.mockResolvedValue({ id: 'pur-1' });

    await request(http())
      .post('/ingredients/ing-1/purchases')
      .set('Authorization', `Bearer ${tokenFor('jose')}`)
      .send({ quantity: 5, unitCost: 2, currency: 'USD' })
      .expect(404);
    expect(prismaMock.ingredientPurchase.create).not.toHaveBeenCalled();

    prismaMock.ingredient.findUnique.mockResolvedValue({
      id: 'ing-1',
      name: 'Yuca',
      unit: 'kg',
      purchases: [],
    });
    prismaMock.ingredientPurchase.findMany.mockResolvedValue([]);
    await request(http())
      .get('/ingredients/ing-1/purchases')
      .set('Authorization', `Bearer ${tokenFor('jose')}`)
      .expect(200);
  });
});
