export type RateType = 'BCV' | 'USDT';

export interface RateSnapshot {
  rateType: RateType;
  valueVesPerUsd: number;
  source: string;
  effectiveDate: Date;
  fetchedAt: Date;
}

export interface RateProvider {
  readonly rateType: RateType;
  readonly source: string;
  fetchLatest(): Promise<RateSnapshot>;
}

export class RateValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'RateValidationError';
  }
}

function isValidDate(value: unknown): value is Date {
  return value instanceof Date && !Number.isNaN(value.getTime());
}

export function validateRateSnapshot(snapshot: RateSnapshot): RateSnapshot {
  if (snapshot.rateType !== 'BCV' && snapshot.rateType !== 'USDT') {
    throw new RateValidationError('Unknown rate type');
  }
  if (!(snapshot.valueVesPerUsd > 0)) {
    throw new RateValidationError('Rate value must be a positive number');
  }
  if (!snapshot.source || snapshot.source.trim() === '') {
    throw new RateValidationError('Rate source is required');
  }
  if (!isValidDate(snapshot.effectiveDate)) {
    throw new RateValidationError('Rate effective date is invalid');
  }
  if (!isValidDate(snapshot.fetchedAt)) {
    throw new RateValidationError('Rate fetchedAt is invalid');
  }
  return snapshot;
}

export async function fetchValidatedRate(
  provider: RateProvider,
): Promise<RateSnapshot> {
  const snapshot = validateRateSnapshot(await provider.fetchLatest());

  if (snapshot.rateType !== provider.rateType) {
    throw new RateValidationError(
      'Snapshot rate type does not match the provider',
    );
  }
  if (snapshot.source !== provider.source) {
    throw new RateValidationError(
      'Snapshot source does not match the provider',
    );
  }

  return snapshot;
}
