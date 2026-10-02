import { fetchValidatedRate } from './rate-provider';
import {
  BcvRateProvider,
  RateProviderError,
  createBcvProviderFromEnv,
  type HttpFetch,
} from './bcv-rate-provider';

const jsonResponse = (body: unknown, status = 200) => ({
  ok: status >= 200 && status < 300,
  status,
  json: async () => body,
});

const makeFetch = (body: unknown, status = 200): jest.MockedFunction<HttpFetch> =>
  jest.fn().mockResolvedValue(jsonResponse(body, status));

describe('BcvRateProvider (RF-016, RF-017)', () => {
  it('consults the configured endpoint on the server', async () => {
    const fetchImpl = makeFetch({ rate: 36.5 });
    const provider = new BcvRateProvider({
      endpointUrl: 'https://api.example.test/bcv',
      source: 'BCV',
      fetchImpl,
    });

    await provider.fetchLatest();

    expect(fetchImpl).toHaveBeenCalledTimes(1);
    expect(fetchImpl).toHaveBeenCalledWith(
      'https://api.example.test/bcv',
      expect.objectContaining({
        headers: expect.objectContaining({ accept: 'application/json' }),
      }),
    );
  });

  it('produces a valid snapshot from the configured source', async () => {
    const fetchImpl = makeFetch({
      rate: 36.5,
      date: '2026-10-01T00:00:00.000Z',
    });
    const provider = new BcvRateProvider({
      endpointUrl: 'https://api.example.test/bcv',
      source: 'BCV',
      dateField: 'date',
      fetchImpl,
      now: () => new Date('2026-10-01T15:00:00.000Z'),
    });

    const snapshot = await fetchValidatedRate(provider);

    expect(snapshot.rateType).toBe('BCV');
    expect(snapshot.valueVesPerUsd).toBe(36.5);
    expect(snapshot.source).toBe('BCV');
    expect(snapshot.effectiveDate).toEqual(
      new Date('2026-10-01T00:00:00.000Z'),
    );
    expect(snapshot.fetchedAt).toEqual(new Date('2026-10-01T15:00:00.000Z'));
  });

  it('parses configurable field paths and comma decimals', async () => {
    const fetchImpl = makeFetch({ data: { tasa: '42,5' } });
    const provider = new BcvRateProvider({
      endpointUrl: 'https://api.example.test/bcv',
      source: 'BCV-oficial',
      valueField: 'data.tasa',
      fetchImpl,
    });

    const snapshot = await fetchValidatedRate(provider);

    expect(snapshot.valueVesPerUsd).toBe(42.5);
    expect(snapshot.source).toBe('BCV-oficial');
  });

  it('fails on HTTP errors', async () => {
    const provider = new BcvRateProvider({
      endpointUrl: 'https://api.example.test/bcv',
      source: 'BCV',
      fetchImpl: makeFetch({}, 503),
    });

    await expect(provider.fetchLatest()).rejects.toThrow(RateProviderError);

    const networkFailure: HttpFetch = jest
      .fn()
      .mockRejectedValue(new Error('ECONNREFUSED'));
    const offline = new BcvRateProvider({
      endpointUrl: 'https://api.example.test/bcv',
      source: 'BCV',
      fetchImpl: networkFailure,
    });

    await expect(offline.fetchLatest()).rejects.toThrow(RateProviderError);
  });

  it('fails when the rate field is missing or not numeric', async () => {
    const missing = new BcvRateProvider({
      endpointUrl: 'https://api.example.test/bcv',
      source: 'BCV',
      fetchImpl: makeFetch({ other: 1 }),
    });
    await expect(missing.fetchLatest()).rejects.toThrow(RateProviderError);

    const invalid = new BcvRateProvider({
      endpointUrl: 'https://api.example.test/bcv',
      source: 'BCV',
      fetchImpl: makeFetch({ rate: 'abc' }),
    });
    await expect(invalid.fetchLatest()).rejects.toThrow(RateProviderError);
  });

  it('fails when the configured date field is invalid', async () => {
    const provider = new BcvRateProvider({
      endpointUrl: 'https://api.example.test/bcv',
      source: 'BCV',
      dateField: 'date',
      fetchImpl: makeFetch({ rate: 36.5, date: 'not-a-date' }),
    });

    await expect(provider.fetchLatest()).rejects.toThrow(RateProviderError);
  });

  it('fails when the response is not valid JSON', async () => {
    const provider = new BcvRateProvider({
      endpointUrl: 'https://api.example.test/bcv',
      source: 'BCV',
      fetchImpl: jest.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => {
          throw new SyntaxError('Unexpected token <');
        },
      }) as unknown as HttpFetch,
    });

    await expect(provider.fetchLatest()).rejects.toThrow(RateProviderError);
  });

  it('is configurable through environment variables', async () => {
    const provider = createBcvProviderFromEnv({
      BCV_RATE_URL: 'https://api.example.test/bcv',
      BCV_RATE_SOURCE: 'BCV-oficial',
      BCV_RATE_FIELD: 'data.tasa',
    } as NodeJS.ProcessEnv);

    expect(provider.rateType).toBe('BCV');
    expect(provider.source).toBe('BCV-oficial');

    const fetchImpl = makeFetch({ data: { tasa: 36.5 } });
    const withFetch = new BcvRateProvider({
      endpointUrl: 'https://api.example.test/bcv',
      source: 'BCV-oficial',
      valueField: 'data.tasa',
      fetchImpl,
    });
    const snapshot = await fetchValidatedRate(withFetch);
    expect(snapshot.valueVesPerUsd).toBe(36.5);

    expect(() => createBcvProviderFromEnv({} as NodeJS.ProcessEnv)).toThrow();
  });
});
