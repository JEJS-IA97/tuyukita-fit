export interface FifoLotInput {
  id: string;
  remainingQuantityMinor: number;
  unitCostUsdMinor: number;
  lotDate: Date;
  createdAt: Date;
}

export interface FifoConsumption {
  lotId: string;
  quantityMinor: number;
  costUsdMinor: number;
}

export interface FifoPlan {
  consumptions: FifoConsumption[];
  totalCostUsdMinor: number;
}

export class InvalidQuantityError extends Error {
  constructor(quantityMinor: number) {
    super(`Quantity must be greater than 0, received ${quantityMinor}`);
    this.name = 'InvalidQuantityError';
  }
}

export class InsufficientStockError extends Error {
  readonly requestedMinor: number;
  readonly availableMinor: number;

  constructor(requestedMinor: number, availableMinor: number) {
    super(
      `Insufficient stock: requested ${requestedMinor} minor units, available ${availableMinor}`,
    );
    this.name = 'InsufficientStockError';
    this.requestedMinor = requestedMinor;
    this.availableMinor = availableMinor;
  }
}

export function availableQuantityMinor(lots: FifoLotInput[]): number {
  return lots.reduce(
    (total, entry) =>
      entry.remainingQuantityMinor > 0
        ? total + entry.remainingQuantityMinor
        : total,
    0,
  );
}

export function planFifoConsumption(
  lots: FifoLotInput[],
  quantityMinor: number,
): FifoPlan {
  if (!(quantityMinor > 0)) {
    throw new InvalidQuantityError(quantityMinor);
  }

  const available = availableQuantityMinor(lots);
  if (quantityMinor > available) {
    throw new InsufficientStockError(quantityMinor, available);
  }

  const ordered = [...lots].sort((a, b) => {
    const byDate = a.lotDate.getTime() - b.lotDate.getTime();
    if (byDate !== 0) {
      return byDate;
    }
    return a.createdAt.getTime() - b.createdAt.getTime();
  });

  const consumptions: FifoConsumption[] = [];
  let needed = quantityMinor;

  for (const entry of ordered) {
    if (needed === 0) {
      break;
    }
    if (entry.remainingQuantityMinor <= 0) {
      continue;
    }

    const take = Math.min(entry.remainingQuantityMinor, needed);
    consumptions.push({
      lotId: entry.id,
      quantityMinor: take,
      costUsdMinor: Math.round((take * entry.unitCostUsdMinor) / 100),
    });
    needed -= take;
  }

  return {
    consumptions,
    totalCostUsdMinor: consumptions.reduce(
      (total, consumption) => total + consumption.costUsdMinor,
      0,
    ),
  };
}
