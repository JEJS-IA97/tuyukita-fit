import { fetchValidatedRate } from './rate-provider';
import {
  UsdtRateProvider,
  RateProviderError,
  createUsdtProviderFromEnv,
  type HttpFetch,
} from './usdt-rate-provider';

const jsonResponse = (body: unknown, status = 200) => ({
  ok: status >= 200 && status < 300,
  status,
  json: async () => body,
});

const makeFetch = (body: unknown, status = 200): jest.MockedFunction<HttpFetch> =>
  jest.fn().mockResolvedValue(jsonResponse(body, status));

describe('UsdtRateProvider (RF-016, RF-017)', () => {
  it('consults the configured market source on the server', async () => {
    const fetchImpl = makeFetch({ rate: 45.2 });
    const provider = new UsdtRateProvider({
      endpointUrl: 'https://api.example.test/usdt',
      source: 'mercado-referencia',
      fetchImpl,
    });

    await provider.fetchLatest();

    expect(fetchImpl).toHaveBeenCalledTimes(1);
    expect(fetchImpl).toHaveBeenCalledWith(
      'https://api.example.test/usdt',
      expect.objectContaining({
        headers: expect.objectContaining({ accept: 'application/json' }),
      }),
    );
  });

  it('produces a valid snapshot identifying type and source', async () => {
    const fetchImpl = makeFetch({
      price: 45.2,
      updatedAt: '2026-10-01T00:00:00.000Z',
    });
    const provider = new UsdtRateProvider({
      endpointUrl: 'https://api.example.test/usdt',
      source: 'mercado-referencia',
      valueField: 'price',
      dateField: 'updatedAt',
      fetchImpl,
      now: () => new Date('2026-10-01T15:00:00.000Z'),
    });

    const snapshot = await fetchValidatedRate(provider);

    expect(snapshot.rateType).toBe('USDT');
    expect(snapshot.valueVesPerUsd).toBe(45.2);
    expect(snapshot.source).toBe('mercado-referencia');
    expect(snapshot.effectiveDate).toEqual(
      new Date('2026-10-01T00:00:00.000Z'),
    );
    expect(snapshot.fetchedAt).toEqual(new Date('2026-10-01T15:00:00.000Z'));
  });

  it('parses configurable field paths', async () => {
    const provider = new UsdtRateProvider({
      endpointUrl: 'https://api.example.test/usdt',
      source: 'mercado-referencia',
      valueField: 'data.tasa',
      fetchImpl: makeFetch({ data: { tasa: 44.9 } }),
    });

    const snapshot = await fetchValidatedRate(provider);

    expect(snapshot.valueVesPerUsd).toBe(44.9);
  });

  it('fails on HTTP errors', async () => {
    const provider = new UsdtRateProvider({
      endpointUrl: 'https://api.example.test/usdt',
      source: 'mercado-referencia',
      fetchImpl: makeFetch({}, 500),
    });

    await expect(provider.fetchLatest()).rejects.toThrow(RateProviderError);
  });

  it('fails when the rate field is missing', async () => {
    const provider = new UsdtRateProvider({
      endpointUrl: 'https://api.example.test/usdt',
      source: 'mercado-referencia',
      fetchImpl: makeFetch({ unexpected: true }),
    });

    await expect(provider.fetchLatest()).rejects.toThrow(RateProviderError);
  });

  it('is configurable through environment variables', () => {
    const provider = createUsdtProviderFromEnv({
      USDT_RATE_URL: 'https://api.example.test/usdt',
      USDT_RATE_SOURCE: 'mercado-referencia',
      USDT_RATE_FIELD: 'price',
    } as NodeJS.ProcessEnv);

    expect(provider.rateType).toBe('USDT');
    expect(provider.source).toBe('mercado-referencia');

    expect(() => createUsdtProviderFromEnv({} as NodeJS.ProcessEnv)).toThrow();
  });
});
