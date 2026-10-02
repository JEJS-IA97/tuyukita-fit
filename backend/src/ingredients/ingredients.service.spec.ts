import { NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../prisma/prisma.service';
import { IngredientsService } from './ingredients.service';

describe('IngredientsService (Prisma simulated)', () => {
  const prismaMock = {
    $connect: jest.fn(),
    $disconnect: jest.fn(),
    ingredient: {
      create: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    ingredientPurchase: {
      create: jest.fn(),
      findMany: jest.fn(),
    },
  };

  let service: IngredientsService;

  beforeEach(async () => {
    jest.resetAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        IngredientsService,
        { provide: PrismaService, useValue: prismaMock },
      ],
    }).compile();

    service = module.get<IngredientsService>(IngredientsService);
  });

  it('does not connect to a real database', () => {
    expect(prismaMock.$connect).not.toHaveBeenCalled();
    expect(prismaMock.$disconnect).not.toHaveBeenCalled();
  });

  describe('findAll', () => {
    it('lists active ingredients ordered by name', async () => {
      const rows = [{ id: '1', name: 'Yuca', isActive: true }];
      prismaMock.ingredient.findMany.mockResolvedValue(rows);

      const result = await service.findAll();

      expect(result).toEqual(rows);
      expect(prismaMock.ingredient.findMany).toHaveBeenCalledWith({
        where: { isActive: true },
        orderBy: { name: 'asc' },
      });
    });
  });

  describe('create', () => {
    it('defaults currency to USD', async () => {
      prismaMock.ingredient.create.mockResolvedValue({ id: '1' });

      await service.create({ name: 'Yuca', unit: 'kg' });

      expect(prismaMock.ingredient.create).toHaveBeenCalledWith({
        data: expect.objectContaining({ name: 'Yuca', currency: 'USD' }),
      });
    });
  });

  describe('findById', () => {
    it('throws NotFoundException when the ingredient does not exist', async () => {
      prismaMock.ingredient.findUnique.mockResolvedValue(null);

      await expect(service.findById('missing')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('registerPurchase', () => {
    it('computes total cost and refreshes the ingredient cost', async () => {
      prismaMock.ingredient.findUnique.mockResolvedValue({
        id: 'ing-1',
        purchases: [],
      });
      const purchase = { id: 'pur-1', totalCost: 112.5 };
      prismaMock.ingredientPurchase.create.mockResolvedValue(purchase);
      prismaMock.ingredient.update.mockResolvedValue({ id: 'ing-1' });

      const result = await service.registerPurchase('ing-1', {
        quantity: 25,
        unitCost: 4.5,
        currency: 'USD',
        notes: 'Proveedor Luis',
      });

      expect(result).toEqual(purchase);
      expect(prismaMock.ingredientPurchase.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          ingredientId: 'ing-1',
          quantity: 25,
          unitCost: 4.5,
          totalCost: 112.5,
          currency: 'USD',
        }),
      });
      expect(prismaMock.ingredient.update).toHaveBeenCalledWith({
        where: { id: 'ing-1' },
        data: { currentCost: 4.5, currency: 'USD' },
      });
    });

    it('rejects purchases for unknown ingredients', async () => {
      prismaMock.ingredient.findUnique.mockResolvedValue(null);

      await expect(
        service.registerPurchase('missing', {
          quantity: 1,
          unitCost: 1,
          currency: 'USD',
        }),
      ).rejects.toThrow(NotFoundException);
      expect(prismaMock.ingredientPurchase.create).not.toHaveBeenCalled();
    });
  });
});
