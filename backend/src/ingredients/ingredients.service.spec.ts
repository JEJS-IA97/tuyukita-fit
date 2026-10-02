import { ConflictException, NotFoundException } from '@nestjs/common';
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
      prismaMock.ingredient.findUnique.mockResolvedValue(null);
      prismaMock.ingredient.create.mockResolvedValue({ id: '1' });

      await service.create({ name: 'Yuca', unit: 'kg' });

      expect(prismaMock.ingredient.create).toHaveBeenCalledWith({
        data: expect.objectContaining({ name: 'Yuca', currency: 'USD' }),
      });
    });

    it('creates an active ingredient with name and unit (RF-001)', async () => {
      prismaMock.ingredient.findUnique.mockResolvedValue(null);
      const created = {
        id: '1',
        name: 'Yuca',
        normalizedName: 'yuca',
        unit: 'kg',
        isActive: true,
      };
      prismaMock.ingredient.create.mockResolvedValue(created);

      const result = await service.create({ name: 'Yuca', unit: 'kg' });

      expect(result).toEqual(created);
      expect(prismaMock.ingredient.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          name: 'Yuca',
          normalizedName: 'yuca',
          unit: 'kg',
          isActive: true,
        }),
      });
    });

    it('stores the normalized name for uniqueness (RF-001a)', async () => {
      prismaMock.ingredient.findUnique.mockResolvedValue(null);
      prismaMock.ingredient.create.mockResolvedValue({ id: '1' });

      await service.create({ name: ' YUCA ', unit: 'kg' });

      expect(prismaMock.ingredient.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          name: ' YUCA ',
          normalizedName: 'yuca',
        }),
      });
    });

    it('rejects duplicates comparing normalized names (RF-001a)', async () => {
      prismaMock.ingredient.findUnique.mockResolvedValue({
        id: 'existing',
        name: 'Yuca',
        normalizedName: 'yuca',
      });

      await expect(
        service.create({ name: ' YUCA ', unit: 'kg' }),
      ).rejects.toThrow(ConflictException);
      expect(prismaMock.ingredient.create).not.toHaveBeenCalled();
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

  describe('update', () => {
    const existingIngredient = {
      id: 'ing-1',
      name: 'Yuca',
      normalizedName: 'yuca',
      unit: 'kg',
      isActive: true,
      purchases: [],
    };

    it('updates configurable data (RF-002)', async () => {
      prismaMock.ingredient.findUnique.mockResolvedValue(existingIngredient);
      prismaMock.ingredient.update.mockResolvedValue({ id: 'ing-1' });

      await service.update('ing-1', {
        description: 'Organica',
        currentCost: 4.5,
        currency: 'USD',
      });

      expect(prismaMock.ingredient.update).toHaveBeenCalledWith({
        where: { id: 'ing-1' },
        data: { description: 'Organica', currentCost: 4.5, currency: 'USD' },
      });
    });

    it('re-normalizes the name when it changes', async () => {
      prismaMock.ingredient.findUnique
        .mockResolvedValueOnce(existingIngredient)
        .mockResolvedValueOnce(null);
      prismaMock.ingredient.update.mockResolvedValue({ id: 'ing-1' });

      await service.update('ing-1', { name: ' Queso Amarillo ' });

      expect(prismaMock.ingredient.update).toHaveBeenCalledWith({
        where: { id: 'ing-1' },
        data: { name: ' Queso Amarillo ', normalizedName: 'queso amarillo' },
      });
    });

    it('rejects renaming to another ingredient name (RF-001a)', async () => {
      prismaMock.ingredient.findUnique
        .mockResolvedValueOnce(existingIngredient)
        .mockResolvedValueOnce({ id: 'other', normalizedName: 'queso' });

      await expect(
        service.update('ing-1', { name: ' Queso ' }),
      ).rejects.toThrow(ConflictException);
      expect(prismaMock.ingredient.update).not.toHaveBeenCalled();
    });

    it('does not touch purchase history (RF-002)', async () => {
      prismaMock.ingredient.findUnique.mockResolvedValue(existingIngredient);
      prismaMock.ingredient.update.mockResolvedValue({ id: 'ing-1' });

      await service.update('ing-1', { description: 'Nueva descripcion' });

      expect(prismaMock.ingredient.update).toHaveBeenCalledTimes(1);
      expect(prismaMock.ingredientPurchase.create).not.toHaveBeenCalled();
      expect(prismaMock.ingredientPurchase.delete).not.toHaveBeenCalled();
      expect(prismaMock.ingredientPurchase.deleteMany).not.toHaveBeenCalled();
      expect(prismaMock.ingredient.delete).not.toHaveBeenCalled();
      expect(prismaMock.ingredient.deleteMany).not.toHaveBeenCalled();
    });

    it('throws NotFoundException for unknown ingredients', async () => {
      prismaMock.ingredient.findUnique.mockResolvedValue(null);

      await expect(
        service.update('missing', { description: 'x' }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('deactivate (RF-003)', () => {
    it('deactivates an ingredient with history keeping it and its records', async () => {
      prismaMock.ingredient.findUnique.mockResolvedValue({
        id: 'ing-1',
        name: 'Yuca',
        normalizedName: 'yuca',
        unit: 'kg',
        isActive: true,
        purchases: [],
      });
      prismaMock.ingredient.update.mockResolvedValue({ isActive: false });

      const result = await service.deactivate('ing-1');

      expect(result).toEqual({ isActive: false });
      expect(prismaMock.ingredient.update).toHaveBeenCalledWith({
        where: { id: 'ing-1' },
        data: { isActive: false },
      });
      expect(prismaMock.ingredient.delete).not.toHaveBeenCalled();
      expect(prismaMock.ingredientPurchase.delete).not.toHaveBeenCalled();
    });
  });

  describe('remove (RF-003, RF-003a)', () => {
    const existingIngredient = {
      id: 'ing-1',
      name: 'Yuca',
      normalizedName: 'yuca',
      unit: 'kg',
      isActive: true,
      purchases: [],
    };

    it('deactivates instead of deleting when history exists (RF-003)', async () => {
      prismaMock.ingredient.findUnique.mockResolvedValue(existingIngredient);
      prismaMock.ingredientPurchase.count.mockResolvedValue(2);
      prismaMock.inventoryLot.count.mockResolvedValue(1);
      prismaMock.inventoryMovement.count.mockResolvedValue(0);
      prismaMock.ingredient.update.mockResolvedValue({ isActive: false });

      await service.remove('ing-1');

      expect(prismaMock.ingredient.update).toHaveBeenCalledWith({
        where: { id: 'ing-1' },
        data: { isActive: false },
      });
      expect(prismaMock.ingredient.delete).not.toHaveBeenCalled();
    });

    it('deletes permanently when there is no history (RF-003a)', async () => {
      prismaMock.ingredient.findUnique.mockResolvedValue(existingIngredient);
      prismaMock.ingredientPurchase.count.mockResolvedValue(0);
      prismaMock.inventoryLot.count.mockResolvedValue(0);
      prismaMock.inventoryMovement.count.mockResolvedValue(0);
      prismaMock.ingredient.delete.mockResolvedValue(existingIngredient);

      await service.remove('ing-1');

      expect(prismaMock.ingredient.delete).toHaveBeenCalledWith({
        where: { id: 'ing-1' },
      });
      expect(prismaMock.ingredient.update).not.toHaveBeenCalled();
    });

    it('throws NotFoundException for unknown ingredients', async () => {
      prismaMock.ingredient.findUnique.mockResolvedValue(null);

      await expect(service.remove('missing')).rejects.toThrow(
        NotFoundException,
      );
      expect(prismaMock.ingredient.delete).not.toHaveBeenCalled();
    });
  });

  describe('unit blocking (RF-004)', () => {
    const existingIngredient = {
      id: 'ing-1',
      name: 'Yuca',
      normalizedName: 'yuca',
      unit: 'kg',
      isActive: true,
      purchases: [],
    };

    it('rejects unit change when inventory lots exist', async () => {
      prismaMock.ingredient.findUnique.mockResolvedValue(existingIngredient);
      prismaMock.inventoryLot.count.mockResolvedValue(3);
      prismaMock.inventoryMovement.count.mockResolvedValue(0);

      await expect(
        service.update('ing-1', { unit: 'g' }),
      ).rejects.toThrow(ConflictException);
      expect(prismaMock.ingredient.update).not.toHaveBeenCalled();
    });

    it('rejects unit change when movements exist', async () => {
      prismaMock.ingredient.findUnique.mockResolvedValue(existingIngredient);
      prismaMock.inventoryLot.count.mockResolvedValue(0);
      prismaMock.inventoryMovement.count.mockResolvedValue(1);

      await expect(
        service.update('ing-1', { unit: 'g' }),
      ).rejects.toThrow(ConflictException);
      expect(prismaMock.ingredient.update).not.toHaveBeenCalled();
    });

    it('allows unit change without inventory or movements', async () => {
      prismaMock.ingredient.findUnique.mockResolvedValue(existingIngredient);
      prismaMock.inventoryLot.count.mockResolvedValue(0);
      prismaMock.inventoryMovement.count.mockResolvedValue(0);
      prismaMock.ingredient.update.mockResolvedValue({ id: 'ing-1' });

      await service.update('ing-1', { unit: 'g' });

      expect(prismaMock.ingredient.update).toHaveBeenCalledWith({
        where: { id: 'ing-1' },
        data: { unit: 'g' },
      });
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
