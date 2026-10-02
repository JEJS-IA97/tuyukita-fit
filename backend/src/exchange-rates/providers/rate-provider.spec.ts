import {
  RateProvider,
  RateSnapshot,
  RateValidationError,
  fetchValidatedRate,
} from './rate-provider';

const makeSnapshot = (overrides: Partial<RateSnapshot> = {}): RateSnapshot => ({
  rateType: 'BCV',
  valueVesPerUsd: 36.5,
  source: 'oficina-cambiaria-divisa',
  effectiveDate: new Date('2026-10-01T00:00:00.000Z'),
  fetchedAt: new Date('2026-10-01T12:00:00.000Z'),
  ...overrides,
});

const simulatedProvider = (
  overrides: Omit<Partial<RateProvider>, 'fetchLatest'> = {},
  snapshot: RateSnapshot = makeSnapshot(),
): RateProvider & { fetchLatest: jest.Mock } => {
  const fetchLatest = jest.fn().mockResolvedValue(snapshot);
  const provider: RateProvider & { fetchLatest: jest.Mock } = {
    rateType: 'BCV',
    source: 'oficina-cambiaria-divisa',
    fetchLatest,
    ...overrides,
  };
  return provider;
};

describe('rate provider contract (RF-016, RF-017)', () => {
  it('returns a validated snapshot identifying type, source and dates', async () => {
    const provider = simulatedProvider();
    const snapshot = makeSnapshot();

    const result = await fetchValidatedRate(provider);

    expect(result).toEqual(snapshot);
    expect(result.rateType).toBe('BCV');
    expect(result.source).toBe('oficina-cambiaria-divisa');
    expect(result.effectiveDate).toBeInstanceOf(Date);
    expect(result.fetchedAt).toBeInstanceOf(Date);
    expect(result.valueVesPerUsd).toBeGreaterThan(0);
  });

  it('supports USDT providers with their own source', async () => {
    const provider = simulatedProvider(
      { rateType: 'USDT', source: 'mercado-referencia' },
      makeSnapshot({ rateType: 'USDT', source: 'mercado-referencia' }),
    );

    const result = await fetchValidatedRate(provider);

    expect(result.rateType).toBe('USDT');
    expect(result.source).toBe('mercado-referencia');
  });

  it('consults the provider exactly once per request', async () => {
    const provider = simulatedProvider();

    await fetchValidatedRate(provider);
    await fetchValidatedRate(provider);

    expect(provider.fetchLatest).toHaveBeenCalledTimes(2);
  });

  it('rejects non-positive values', async () => {
    const provider = simulatedProvider(
      {},
      makeSnapshot({ valueVesPerUsd: 0 }),
    );
    await expect(fetchValidatedRate(provider)).rejects.toThrow(
      RateValidationError,
    );

    const negative = simulatedProvider(
      {},
      makeSnapshot({ valueVesPerUsd: -36.5 }),
    );
    await expect(fetchValidatedRate(negative)).rejects.toThrow(
      RateValidationError,
    );
  });

  it('rejects unknown rate types', async () => {
    const provider = simulatedProvider(
      {},
      makeSnapshot({ rateType: 'EUR' as RateSnapshot['rateType'] }),
    );

    await expect(fetchValidatedRate(provider)).rejects.toThrow(
      RateValidationError,
    );
  });

  it('rejects empty sources', async () => {
    const provider = simulatedProvider({}, makeSnapshot({ source: '   ' }));

    await expect(fetchValidatedRate(provider)).rejects.toThrow(
      RateValidationError,
    );
  });

  it('rejects missing or invalid dates', async () => {
    const noEffective = simulatedProvider(
      {},
      makeSnapshot({ effectiveDate: new Date('invalid') }),
    );
    await expect(fetchValidatedRate(noEffective)).rejects.toThrow(
      RateValidationError,
    );

    const noFetched = simulatedProvider(
      {},
      makeSnapshot({ fetchedAt: undefined as unknown as Date }),
    );
    await expect(fetchValidatedRate(noFetched)).rejects.toThrow(
      RateValidationError,
    );
  });

  it('rejects snapshots that do not match their provider contract', async () => {
    const wrongType = simulatedProvider(
      { rateType: 'USDT' },
      makeSnapshot({ rateType: 'BCV' }),
    );
    await expect(fetchValidatedRate(wrongType)).rejects.toThrow(
      RateValidationError,
    );

    const wrongSource = simulatedProvider(
      { source: 'otra-fuente' },
      makeSnapshot({ source: 'fuente-ajena' }),
    );
    await expect(fetchValidatedRate(wrongSource)).rejects.toThrow(
      RateValidationError,
    );
  });

  it('propagates provider failures', async () => {
    const provider = simulatedProvider();
    provider.fetchLatest.mockRejectedValue(new Error('provider down'));

    await expect(fetchValidatedRate(provider)).rejects.toThrow(
      'provider down',
    );
  });
});
