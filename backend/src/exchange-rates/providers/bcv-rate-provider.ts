import {
  HttpJsonRateProvider,
  type HttpJsonRateProviderOptions,
} from './http-json-rate-provider';

export {
  RateProviderError,
  type HttpFetch,
  type HttpFetchResponse,
} from './http-json-rate-provider';

export type BcvRateProviderOptions = Omit<
  HttpJsonRateProviderOptions,
  'rateType'
>;

export class BcvRateProvider extends HttpJsonRateProvider {
  constructor(options: BcvRateProviderOptions) {
    super({ ...options, rateType: 'BCV' });
  }
}

export function createBcvProviderFromEnv(
  env: NodeJS.ProcessEnv,
): BcvRateProvider {
  const endpointUrl = env.BCV_RATE_URL;
  if (!endpointUrl) {
    throw new Error('BCV_RATE_URL is not configured');
  }
  return new BcvRateProvider({
    endpointUrl,
    source: env.BCV_RATE_SOURCE || 'BCV',
    valueField: env.BCV_RATE_FIELD || 'rate',
    dateField: env.BCV_RATE_DATE_FIELD || undefined,
  });
}
