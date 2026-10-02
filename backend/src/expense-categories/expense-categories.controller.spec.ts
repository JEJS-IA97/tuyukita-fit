import { INestApplication, ValidationPipe } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { JwtModule, JwtService } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { Test } from '@nestjs/testing';
import * as request from 'supertest';
import { JwtStrategy } from '../auth/jwt.strategy';
import { PrismaService } from '../prisma/prisma.service';
import { ExpenseCategoriesController } from './expense-categories.controller';
import { ExpenseCategoriesService } from './expense-categories.service';

const TEST_SECRET = 't016-test-secret';

describe('ExpenseCategoriesController (HTTP)', () => {
  const prismaMock = {
    expenseCategory: {
      create: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    expense: {
      count: jest.fn(),
    },
  };

  let app: INestApplication;
  let jwt: JwtService;

  const tokenFor = (username: string, sub = 'user-1') =>
    jwt.sign({ sub, username, role: 'OPERATOR' });

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
      controllers: [ExpenseCategoriesController],
      providers: [
        ExpenseCategoriesService,
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
    await request(http()).get('/expense-categories').expect(401);
    await request(http()).post('/expense-categories').expect(401);
    await request(http()).delete('/expense-categories/any').expect(401);
  });

  it('lists categories ordered by name', async () => {
    prismaMock.expenseCategory.findMany.mockResolvedValue([
      { id: '1', name: 'Empaque' },
    ]);

    const response = await request(http())
      .get('/expense-categories')
      .set('Authorization', `Bearer ${tokenFor('jose')}`)
      .expect(200);

    expect(response.body).toHaveLength(1);
    expect(prismaMock.expenseCategory.findMany).toHaveBeenCalledWith({
      orderBy: { name: 'asc' },
    });
  });

  it('lets each initial account create categories (RF-021)', async () => {
    for (const username of ['jose', 'jay', 'vivi']) {
      prismaMock.expenseCategory.findUnique.mockResolvedValue(null);
      prismaMock.expenseCategory.create.mockResolvedValue({
        id: 'cat-1',
        name: 'Materia prima',
        normalizedName: 'materia prima',
      });

      await request(http())
        .post('/expense-categories')
        .set('Authorization', `Bearer ${tokenFor(username, `sub-${username}`)}`)
        .send({ name: 'Materia prima' })
        .expect(201);

      expect(prismaMock.expenseCategory.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            normalizedName: 'materia prima',
            createdById: `sub-${username}`,
          }),
        }),
      );
    }
  });

  it('records the authenticated user as creator (RF-022)', async () => {
    prismaMock.expenseCategory.findUnique.mockResolvedValue(null);
    prismaMock.expenseCategory.create.mockResolvedValue({ id: 'cat-1' });

    await request(http())
      .post('/expense-categories')
      .set('Authorization', `Bearer ${tokenFor('jose', 'uuid-jose')}`)
      .send({ name: 'Empaque' })
      .expect(201);

    expect(prismaMock.expenseCategory.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ createdById: 'uuid-jose' }),
      }),
    );
  });

  it('returns 409 on duplicated normalized names (RF-009a)', async () => {
    prismaMock.expenseCategory.findUnique.mockResolvedValue({
      id: 'existing',
      normalizedName: 'empaque',
    });

    await request(http())
      .post('/expense-categories')
      .set('Authorization', `Bearer ${tokenFor('jose')}`)
      .send({ name: ' EMPAQUE ' })
      .expect(409);
    expect(prismaMock.expenseCategory.create).not.toHaveBeenCalled();
  });

  it('returns 400 for invalid bodies', async () => {
    await request(http())
      .post('/expense-categories')
      .set('Authorization', `Bearer ${tokenFor('jose')}`)
      .send({})
      .expect(400);

    await request(http())
      .post('/expense-categories')
      .set('Authorization', `Bearer ${tokenFor('jose')}`)
      .send({ name: 'Empaque', unknownField: 1 })
      .expect(400);
  });

  it('renames a category (RF-009a)', async () => {
    prismaMock.expenseCategory.findUnique
      .mockResolvedValueOnce({
        id: 'cat-1',
        name: 'Empaque',
        normalizedName: 'empaque',
      })
      .mockResolvedValueOnce(null);
    prismaMock.expenseCategory.update.mockResolvedValue({ id: 'cat-1' });

    await request(http())
      .patch('/expense-categories/cat-1')
      .set('Authorization', `Bearer ${tokenFor('vivi')}`)
      .send({ name: 'Material de empaque' })
      .expect(200);

    expect(prismaMock.expenseCategory.update).toHaveBeenCalledWith({
      where: { id: 'cat-1' },
      data: { name: 'Material de empaque', normalizedName: 'material de empaque' },
    });
  });

  it('returns 404 when updating unknown categories', async () => {
    prismaMock.expenseCategory.findUnique.mockResolvedValue(null);

    await request(http())
      .patch('/expense-categories/missing')
      .set('Authorization', `Bearer ${tokenFor('jose')}`)
      .send({ name: 'x' })
      .expect(404);
  });

  it('deletes a category that is not referenced (RF-009a)', async () => {
    prismaMock.expenseCategory.findUnique.mockResolvedValue({
      id: 'cat-1',
      name: 'Empaque',
      normalizedName: 'empaque',
    });
    prismaMock.expense.count.mockResolvedValue(0);
    prismaMock.expenseCategory.delete.mockResolvedValue({ id: 'cat-1' });

    await request(http())
      .delete('/expense-categories/cat-1')
      .set('Authorization', `Bearer ${tokenFor('jose')}`)
      .expect(200);

    expect(prismaMock.expenseCategory.delete).toHaveBeenCalledWith({
      where: { id: 'cat-1' },
    });
  });

  it('protects a category referenced by expenses (RF-009a)', async () => {
    prismaMock.expenseCategory.findUnique.mockResolvedValue({
      id: 'cat-1',
      name: 'Empaque',
      normalizedName: 'empaque',
    });
    prismaMock.expense.count.mockResolvedValue(2);

    await request(http())
      .delete('/expense-categories/cat-1')
      .set('Authorization', `Bearer ${tokenFor('jose')}`)
      .expect(409);

    expect(prismaMock.expenseCategory.delete).not.toHaveBeenCalled();
  });
});
