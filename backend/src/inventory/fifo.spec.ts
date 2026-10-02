import {
  InsufficientStockError,
  InvalidQuantityError,
  FifoLotInput,
  planFifoConsumption,
} from './fifo';

describe('planFifoConsumption (RF-012, RF-012a, RF-013, RF-014)', () => {
  const lot = (
    id: string,
    remainingQuantityMinor: number,
    unitCostUsdMinor: number,
    lotDate: string,
    createdAt: string,
  ): FifoLotInput => ({
    id,
    remainingQuantityMinor,
    unitCostUsdMinor,
    lotDate: new Date(lotDate),
    createdAt: new Date(createdAt),
  });

  it('consumes from a single lot and computes its historical USD cost (RF-013)', () => {
    const lots = [lot('lot-a', 100000, 274, '2026-10-01T00:00:00.000Z', '2026-10-01T08:00:00.000Z')];

    const result = planFifoConsumption(lots, 40000);

    expect(result.consumptions).toEqual([
      { lotId: 'lot-a', quantityMinor: 40000, costUsdMinor: 109600 },
    ]);
    expect(result.totalCostUsdMinor).toBe(109600);
  });

  it('consumes the whole single lot', () => {
    const lots = [lot('lot-a', 100000, 274, '2026-10-01T00:00:00.000Z', '2026-10-01T08:00:00.000Z')];

    const result = planFifoConsumption(lots, 100000);

    expect(result.consumptions).toEqual([
      { lotId: 'lot-a', quantityMinor: 100000, costUsdMinor: 274000 },
    ]);
  });

  it('consumes oldest lots first across multiple lots (RF-012)', () => {
    const lots = [
      lot('lot-new', 100000, 300, '2026-10-05T00:00:00.000Z', '2026-10-05T08:00:00.000Z'),
      lot('lot-old', 50000, 100, '2026-10-01T00:00:00.000Z', '2026-10-01T08:00:00.000Z'),
      lot('lot-mid', 30000, 200, '2026-10-03T00:00:00.000Z', '2026-10-03T08:00:00.000Z'),
    ];

    const result = planFifoConsumption(lots, 60000);

    expect(result.consumptions).toEqual([
      { lotId: 'lot-old', quantityMinor: 50000, costUsdMinor: 50000 },
      { lotId: 'lot-mid', quantityMinor: 10000, costUsdMinor: 20000 },
    ]);
    expect(result.totalCostUsdMinor).toBe(70000);
    expect(result.consumptions.map((c) => c.lotId)).not.toContain('lot-new');
  });

  it('breaks lotDate ties by registration time (RF-012a)', () => {
    const lots = [
      lot('lot-second', 50000, 200, '2026-10-01T00:00:00.000Z', '2026-10-02T09:00:00.000Z'),
      lot('lot-first', 50000, 100, '2026-10-01T00:00:00.000Z', '2026-10-01T08:00:00.000Z'),
    ];

    const result = planFifoConsumption(lots, 60000);

    expect(result.consumptions).toEqual([
      { lotId: 'lot-first', quantityMinor: 50000, costUsdMinor: 50000 },
      { lotId: 'lot-second', quantityMinor: 10000, costUsdMinor: 20000 },
    ]);
  });

  it('rejects quantities above available stock without touching any lot (RF-014)', () => {
    const lots = [
      lot('lot-a', 50000, 100, '2026-10-01T00:00:00.000Z', '2026-10-01T08:00:00.000Z'),
      lot('lot-b', 30000, 200, '2026-10-02T00:00:00.000Z', '2026-10-02T08:00:00.000Z'),
    ];
    const before = JSON.stringify(lots);

    expect(() => planFifoConsumption(lots, 80001)).toThrow(
      InsufficientStockError,
    );
    expect(JSON.stringify(lots)).toBe(before);
  });

  it('reports the available stock when rejecting an output', () => {
    const lots = [lot('lot-a', 50000, 100, '2026-10-01T00:00:00.000Z', '2026-10-01T08:00:00.000Z')];

    let caught: unknown;
    try {
      planFifoConsumption(lots, 60000);
    } catch (error) {
      caught = error;
    }

    expect(caught).toBeInstanceOf(InsufficientStockError);
    expect((caught as InsufficientStockError).availableMinor).toBe(50000);
    expect((caught as InsufficientStockError).requestedMinor).toBe(60000);
  });

  it('ignores exhausted lots and computes availability without them', () => {
    const lots = [
      lot('lot-empty', 0, 100, '2026-10-01T00:00:00.000Z', '2026-10-01T08:00:00.000Z'),
      lot('lot-a', 20000, 500, '2026-10-02T00:00:00.000Z', '2026-10-02T08:00:00.000Z'),
    ];

    const result = planFifoConsumption(lots, 20000);

    expect(result.consumptions).toEqual([
      { lotId: 'lot-a', quantityMinor: 20000, costUsdMinor: 100000 },
    ]);
    expect(() => planFifoConsumption(lots, 20001)).toThrow(
      InsufficientStockError,
    );
  });

  it('rejects non-positive quantities', () => {
    const lots = [lot('lot-a', 50000, 100, '2026-10-01T00:00:00.000Z', '2026-10-01T08:00:00.000Z')];

    expect(() => planFifoConsumption(lots, 0)).toThrow(InvalidQuantityError);
    expect(() => planFifoConsumption(lots, -100)).toThrow(InvalidQuantityError);
  });

  it('does not mutate the input array order', () => {
    const lots = [
      lot('lot-b', 50000, 200, '2026-10-05T00:00:00.000Z', '2026-10-05T08:00:00.000Z'),
      lot('lot-a', 50000, 100, '2026-10-01T00:00:00.000Z', '2026-10-01T08:00:00.000Z'),
    ];

    planFifoConsumption(lots, 10000);

    expect(lots.map((l) => l.id)).toEqual(['lot-b', 'lot-a']);
  });
});
