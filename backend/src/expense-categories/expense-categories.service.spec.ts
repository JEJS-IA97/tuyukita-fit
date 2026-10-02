import { ConflictException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ExpenseCategoriesService } from './expense-categories.service';

describe('ExpenseCategoriesService', () => {
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

  let service: ExpenseCategoriesService;

  beforeEach(async () => {
    jest.resetAllMocks();
    service = new ExpenseCategoriesService(
      prismaMock as unknown as PrismaService,
    );
  });

  describe('create', () => {
    it('creates a category with its normalized name', async () => {
      prismaMock.expenseCategory.findUnique.mockResolvedValue(null);
      prismaMock.expenseCategory.create.mockResolvedValue({
        id: 'cat-1',
        name: 'Materia Prima',
        normalizedName: 'materia prima',
        isActive: true,
      });

      const result = await service.create({ name: 'Materia Prima' });

      expect(result).toEqual(
        expect.objectContaining({ normalizedName: 'materia prima' }),
      );
      expect(prismaMock.expenseCategory.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          name: 'Materia Prima',
          normalizedName: 'materia prima',
        }),
      });
    });

    it('blocks duplicated names comparing normalized values', async () => {
      prismaMock.expenseCategory.findUnique.mockResolvedValue({
        id: 'existing',
        normalizedName: 'materia prima',
      });

      await expect(service.create({ name: ' MATERIA PRIMA ' })).rejects.toThrow(
        ConflictException,
      );
      expect(prismaMock.expenseCategory.create).not.toHaveBeenCalled();
    });
  });

  describe('findAll / findById', () => {
    it('lists categories ordered by name', async () => {
      prismaMock.expenseCategory.findMany.mockResolvedValue([
        { id: '1', name: 'Empaque' },
        { id: '2', name: 'Materia prima' },
      ]);

      const result = await service.findAll();

      expect(result).toHaveLength(2);
      expect(prismaMock.expenseCategory.findMany).toHaveBeenCalledWith({
        orderBy: { name: 'asc' },
      });
    });

    it('throws NotFoundException for unknown categories', async () => {
      prismaMock.expenseCategory.findUnique.mockResolvedValue(null);

      await expect(service.findById('missing')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('update', () => {
    it('renames and re-normalizes the category', async () => {
      prismaMock.expenseCategory.findUnique
        .mockResolvedValueOnce({
          id: 'cat-1',
          name: 'Materia prima',
          normalizedName: 'materia prima',
        })
        .mockResolvedValueOnce(null);
      prismaMock.expenseCategory.update.mockResolvedValue({ id: 'cat-1' });

      await service.update('cat-1', { name: ' Insumos ' });

      expect(prismaMock.expenseCategory.update).toHaveBeenCalledWith({
        where: { id: 'cat-1' },
        data: { name: ' Insumos ', normalizedName: 'insumos' },
      });
    });

    it('blocks renaming to a name used by another category', async () => {
      prismaMock.expenseCategory.findUnique
        .mockResolvedValueOnce({ id: 'cat-1', normalizedName: 'insumos' })
        .mockResolvedValueOnce({ id: 'other', normalizedName: 'empaque' });

      await expect(
        service.update('cat-1', { name: 'Empaque' }),
      ).rejects.toThrow(ConflictException);
      expect(prismaMock.expenseCategory.update).not.toHaveBeenCalled();
    });

    it('updates active state without touching name', async () => {
      prismaMock.expenseCategory.findUnique.mockResolvedValue({
        id: 'cat-1',
        name: 'Insumos',
        normalizedName: 'insumos',
      });
      prismaMock.expenseCategory.update.mockResolvedValue({ id: 'cat-1' });

      await service.update('cat-1', { isActive: false });

      expect(prismaMock.expenseCategory.update).toHaveBeenCalledWith({
        where: { id: 'cat-1' },
        data: { isActive: false },
      });
    });
  });

  describe('remove', () => {
    it('deletes a category that is not referenced', async () => {
      prismaMock.expenseCategory.findUnique.mockResolvedValue({
        id: 'cat-1',
        name: 'Insumos',
        normalizedName: 'insumos',
      });
      prismaMock.expense.count.mockResolvedValue(0);
      prismaMock.expenseCategory.delete.mockResolvedValue({ id: 'cat-1' });

      await service.remove('cat-1');

      expect(prismaMock.expenseCategory.delete).toHaveBeenCalledWith({
        where: { id: 'cat-1' },
      });
    });

    it('protects a category referenced by expenses', async () => {
      prismaMock.expenseCategory.findUnique.mockResolvedValue({
        id: 'cat-1',
        name: 'Insumos',
        normalizedName: 'insumos',
      });
      prismaMock.expense.count.mockResolvedValue(3);

      await expect(service.remove('cat-1')).rejects.toThrow(
        ConflictException,
      );
      expect(prismaMock.expenseCategory.delete).not.toHaveBeenCalled();
    });

    it('throws NotFoundException for unknown categories', async () => {
      prismaMock.expenseCategory.findUnique.mockResolvedValue(null);

      await expect(service.remove('missing')).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
