import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { InventoryService } from './inventory.service';

describe('InventoryService manual output (RF-011 to RF-015, RF-022)', () => {
  type Store = {
    movements: any[];
    consumptions: any[];
    lotUpdates: any[];
  };

  let store: Store;

  const txClient: any = {};

  const prismaMock: any = {
    ingredient: { findUnique: jest.fn() },
    inventoryMovement: { create: jest.fn() },
    inventoryLotConsumption: { create: jest.fn() },
    inventoryLot: {
      findMany: jest.fn(),
      update: jest.fn(),
    },
    $transaction: jest.fn(async (cb: (tx: any) => Promise<any>) => {
      const backup: Store = {
        movements: store.movements.map((row) => ({ ...row })),
        consumptions: store.consumptions.map((row) => ({ ...row })),
        lotUpdates: store.lotUpdates.map((row) => ({ ...row })),
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
      const rows = store.movements
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
        });
      return rows.map((row) => ({ ...row }));
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

  let service: InventoryService;

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

  const dto = {
    ingredientId: 'ing-1',
    quantity: 60,
    movementDate: '2026-10-06T10:00:00.000Z',
    reason: 'Produccion diaria',
  };

  const auditMock = {
    record: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    store = { movements: [], consumptions: [], lotUpdates: [] };
    service = new InventoryService(prismaMock, auditMock as any);
    prismaMock.ingredient.findUnique.mockResolvedValue(ingredient);
    prismaMock.inventoryLot.findMany.mockResolvedValue([lotNew, lotOld]);
    txClient.inventoryLot.findMany.mockResolvedValue([lotNew, lotOld]);
    auditMock.record.mockResolvedValue({ id: 'log-1' });
  });

  it('creates a movement with FIFO consumptions, lot discounts and creator (RF-011, RF-012, RF-013, RF-015, RF-022)', async () => {
    const result = await service.registerOutput(dto, 'user-1');

    expect(prismaMock.$transaction).toHaveBeenCalledTimes(1);

    expect(txClient.inventoryMovement.create).toHaveBeenCalledWith({
      data: {
        ingredientId: 'ing-1',
        type: 'OUT',
        quantityMinor: 6000,
        costUsdMinor: 0,
        reason: 'Produccion diaria',
        movementDate: new Date('2026-10-06T10:00:00.000Z'),
        createdById: 'user-1',
      },
    });

    expect(txClient.inventoryLotConsumption.create).toHaveBeenCalledTimes(2);
    expect(store.consumptions).toEqual([
      {
        movementId: 'mov-1',
        lotId: 'lot-old',
        quantityMinor: 5000,
        costUsdMinor: 5000,
      },
      {
        movementId: 'mov-1',
        lotId: 'lot-new',
        quantityMinor: 1000,
        costUsdMinor: 2000,
      },
    ]);

    expect(store.lotUpdates).toEqual([
      {
        where: { id: 'lot-new' },
        data: { remainingQuantityMinor: 2000 },
      },
      {
        where: { id: 'lot-old' },
        data: { remainingQuantityMinor: 0 },
      },
    ]);

    expect(result.movement).toMatchObject({
      id: 'mov-1',
      quantityMinor: 6000,
      costUsdMinor: 7000,
      createdById: 'user-1',
    });
    expect(result.consumptions).toHaveLength(2);
  });

  it('rejects outputs above available stock without modifying anything (RF-014)', async () => {
    let caught: unknown;
    try {
      await service.registerOutput({ ...dto, quantity: 90 }, 'user-1');
    } catch (error) {
      caught = error;
    }

    expect(caught).toBeInstanceOf(ConflictException);
    expect(store.movements).toHaveLength(0);
    expect(store.consumptions).toHaveLength(0);
    expect(store.lotUpdates).toHaveLength(0);
    expect(prismaMock.inventoryMovement.create).not.toHaveBeenCalled();
    expect(txClient.inventoryLot.update).not.toHaveBeenCalled();
  });

  it('does not count exhausted lots as availability (RF-014)', async () => {
    txClient.inventoryLot.findMany.mockResolvedValue([
      { ...lotNew, initialQuantityMinor: 0, remainingQuantityMinor: 0 },
      lotOld,
    ]);

    await expect(
      service.registerOutput({ ...dto, quantity: 60 }, 'user-1'),
    ).rejects.toThrow(ConflictException);

    expect(store.movements).toHaveLength(0);
  });

  it('returns 404 for unknown ingredients', async () => {
    prismaMock.ingredient.findUnique.mockResolvedValue(null);

    await expect(service.registerOutput(dto, 'user-1')).rejects.toThrow(
      NotFoundException,
    );
    expect(prismaMock.$transaction).not.toHaveBeenCalled();
  });

  it('rejects non-positive quantities', async () => {
    await expect(
      service.registerOutput({ ...dto, quantity: 0 }, 'user-1'),
    ).rejects.toThrow(BadRequestException);
    expect(prismaMock.$transaction).not.toHaveBeenCalled();
  });

  it('reads lots inside the transaction (RF-012)', async () => {
    await service.registerOutput(dto, 'user-1');

    expect(txClient.inventoryLot.findMany).toHaveBeenCalledWith({
      where: { ingredientId: 'ing-1' },
    });
  });

  it('recalculates chronologically when a movement is created backdated (RF-012b)', async () => {
    const first = await service.registerOutput(
      { ...dto, quantity: 40 },
      'user-1',
    );
    expect(first.movement.costUsdMinor).toBe(4000);

    const second = await service.registerOutput(
      { ...dto, quantity: 20, movementDate: '2026-10-02T10:00:00.000Z' },
      'user-1',
    );

    expect(second.movement.costUsdMinor).toBe(2000);
    expect(second.consumptions).toEqual([
      expect.objectContaining({
        lotId: 'lot-old',
        quantityMinor: 2000,
        costUsdMinor: 2000,
      }),
    ]);

    const backdatedLater = store.movements.find(
      (m) => m.id === first.movement.id,
    );
    expect(backdatedLater?.costUsdMinor).toBe(5000);

    expect(store.consumptions).toEqual([
      {
        movementId: second.movement.id,
        lotId: 'lot-old',
        quantityMinor: 2000,
        costUsdMinor: 2000,
      },
      {
        movementId: first.movement.id,
        lotId: 'lot-old',
        quantityMinor: 3000,
        costUsdMinor: 3000,
      },
      {
        movementId: first.movement.id,
        lotId: 'lot-new',
        quantityMinor: 1000,
        costUsdMinor: 2000,
      },
    ]);

    expect(store.lotUpdates.slice(-2)).toEqual([
      { where: { id: 'lot-new' }, data: { remainingQuantityMinor: 2000 } },
      { where: { id: 'lot-old' }, data: { remainingQuantityMinor: 0 } },
    ]);
  });

  it('updates an output and recalculates costs and lots (RF-009b, RF-012b)', async () => {
    const created = await service.registerOutput(dto, 'user-1');
    expect(created.movement.costUsdMinor).toBe(7000);

    const updated = await service.updateOutput(
      created.movement.id,
      {
        quantity: 50,
      },
      'user-1',
    );

    expect(updated.movement).toMatchObject({
      quantityMinor: 5000,
      costUsdMinor: 5000,
    });
    expect(updated.consumptions).toHaveLength(1);
    expect(updated.consumptions[0]).toMatchObject({
      lotId: 'lot-old',
      quantityMinor: 5000,
      costUsdMinor: 5000,
    });
    expect(store.lotUpdates.slice(-2)).toEqual([
      { where: { id: 'lot-new' }, data: { remainingQuantityMinor: 3000 } },
      { where: { id: 'lot-old' }, data: { remainingQuantityMinor: 0 } },
    ]);
    expect(auditMock.record).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        userId: 'user-1',
        entity: 'inventory_movement',
        entityId: created.movement.id,
        action: 'UPDATE',
      }),
    );
  });

  it('removes an output and replays the remaining movements (RF-009b)', async () => {
    const m1 = await service.registerOutput(
      { ...dto, quantity: 60, movementDate: '2026-10-02T10:00:00.000Z' },
      'user-1',
    );
    const m2 = await service.registerOutput(
      { ...dto, quantity: 10, movementDate: '2026-10-06T10:00:00.000Z' },
      'user-1',
    );
    expect(store.consumptions).toHaveLength(3);

    await service.removeOutput(m2.movement.id, 'user-1');

    expect(store.movements).toHaveLength(1);
    expect(store.movements[0].id).toBe(m1.movement.id);
    expect(store.movements[0].costUsdMinor).toBe(7000);
    expect(store.consumptions).toHaveLength(2);
    expect(
      store.consumptions.every((c) => c.movementId === m1.movement.id),
    ).toBe(true);
    expect(store.lotUpdates.slice(-2)).toEqual([
      { where: { id: 'lot-new' }, data: { remainingQuantityMinor: 2000 } },
      { where: { id: 'lot-old' }, data: { remainingQuantityMinor: 0 } },
    ]);
    expect(auditMock.record).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        userId: 'user-1',
        entity: 'inventory_movement',
        entityId: m2.movement.id,
        action: 'DELETE',
      }),
    );
  });

  it('rolls back a correction that would exceed stock (RF-014, RF-012b)', async () => {
    const created = await service.registerOutput(dto, 'user-1');
    expect(created.movement.costUsdMinor).toBe(7000);

    let caught: unknown;
    try {
      await service.updateOutput(
        created.movement.id,
        { quantity: 90 },
        'user-1',
      );
    } catch (error) {
      caught = error;
    }

    expect(caught).toBeInstanceOf(ConflictException);
    expect(store.movements).toHaveLength(1);
    expect(store.movements[0]).toMatchObject({
      quantityMinor: 6000,
      costUsdMinor: 7000,
    });
    expect(store.consumptions).toHaveLength(2);
    expect(store.consumptions.map((c) => c.lotId)).toEqual([
      'lot-old',
      'lot-new',
    ]);
  });

  it('rejects non-positive quantities when correcting outputs', async () => {
    const created = await service.registerOutput(dto, 'user-1');

    await expect(
      service.updateOutput(created.movement.id, { quantity: 0 }, 'user-1'),
    ).rejects.toThrow(BadRequestException);
    expect(store.movements[0]).toMatchObject({ quantityMinor: 6000 });
  });

  it('returns 404 when correcting or removing unknown outputs', async () => {
    await expect(
      service.updateOutput('missing', { quantity: 10 }, 'user-1'),
    ).rejects.toThrow(NotFoundException);
    await expect(service.removeOutput('missing', 'user-1')).rejects.toThrow(
      NotFoundException,
    );
    expect(store.movements).toHaveLength(0);
    expect(store.consumptions).toHaveLength(0);
  });
});
