import {
  HttpJsonRateProvider,
  type HttpJsonRateProviderOptions,
} from './http-json-rate-provider';

export {
  RateProviderError,
  type HttpFetch,
  type HttpFetchResponse,
} from './http-json-rate-provider';

export type UsdtRateProviderOptions = Omit<
  HttpJsonRateProviderOptions,
  'rateType'
>;

export class UsdtRateProvider extends HttpJsonRateProvider {
  constructor(options: UsdtRateProviderOptions) {
    super({ ...options, rateType: 'USDT' });
  }
}

export function createUsdtProviderFromEnv(
  env: NodeJS.ProcessEnv,
): UsdtRateProvider {
  const endpointUrl = env.USDT_RATE_URL;
  if (!endpointUrl) {
    throw new Error('USDT_RATE_URL is not configured');
  }
  return new UsdtRateProvider({
    endpointUrl,
    source: env.USDT_RATE_SOURCE || 'USDT',
    valueField: env.USDT_RATE_FIELD || 'rate',
    dateField: env.USDT_RATE_DATE_FIELD || undefined,
  });
}
