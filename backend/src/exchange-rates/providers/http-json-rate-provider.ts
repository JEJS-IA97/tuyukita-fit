import { RateProvider, RateSnapshot, RateType } from './rate-provider';

export class RateProviderError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'RateProviderError';
  }
}

export interface HttpFetchResponse {
  ok: boolean;
  status: number;
  json(): Promise<unknown>;
}

export type HttpFetch = (
  url: string,
  init?: { headers?: Record<string, string> },
) => Promise<HttpFetchResponse>;

export interface HttpJsonRateProviderOptions {
  rateType: RateType;
  endpointUrl: string;
  source: string;
  valueField?: string;
  dateField?: string;
  fetchImpl?: HttpFetch;
  now?: () => Date;
}

function readPath(body: unknown, path: string): unknown {
  return path
    .split('.')
    .reduce<unknown>(
      (acc, key) =>
        acc && typeof acc === 'object'
          ? (acc as Record<string, unknown>)[key]
          : undefined,
      body,
    );
}

function parseRateValue(rawValue: unknown): number {
  if (typeof rawValue === 'number') {
    return rawValue;
  }
  if (typeof rawValue === 'string') {
    const normalized = rawValue.trim().replace(',', '.');
    if (normalized !== '') {
      return Number(normalized);
    }
  }
  return Number.NaN;
}

export class HttpJsonRateProvider implements RateProvider {
  readonly rateType: RateType;
  readonly source: string;

  private readonly endpointUrl: string;
  private readonly valueField: string;
  private readonly dateField?: string;
  private readonly fetchImpl: HttpFetch;
  private readonly now: () => Date;

  constructor(options: HttpJsonRateProviderOptions) {
    this.rateType = options.rateType;
    this.endpointUrl = options.endpointUrl;
    this.source = options.source;
    this.valueField = options.valueField ?? 'rate';
    this.dateField = options.dateField;
    this.fetchImpl =
      options.fetchImpl ?? (globalThis.fetch as unknown as HttpFetch);
    this.now = options.now ?? (() => new Date());
  }

  async fetchLatest(): Promise<RateSnapshot> {
    let response: HttpFetchResponse;
    try {
      response = await this.fetchImpl(this.endpointUrl, {
        headers: { accept: 'application/json' },
      });
    } catch (error) {
      throw new RateProviderError(
        `${this.rateType} request failed: ${error instanceof Error ? error.message : String(error)}`,
      );
    }

    if (!response.ok) {
      throw new RateProviderError(
        `${this.rateType} responded with status ${response.status}`,
      );
    }

    let body: unknown;
    try {
      body = await response.json();
    } catch {
      throw new RateProviderError(`${this.rateType} response is not valid JSON`);
    }

    const valueVesPerUsd = parseRateValue(readPath(body, this.valueField));
    if (!Number.isFinite(valueVesPerUsd)) {
      throw new RateProviderError(
        `${this.rateType} response is missing a numeric "${this.valueField}" field`,
      );
    }

    let effectiveDate = this.now();
    if (this.dateField !== undefined) {
      const rawDate = readPath(body, this.dateField);
      const parsed =
        rawDate === undefined ? new Date(Number.NaN) : new Date(String(rawDate));
      if (Number.isNaN(parsed.getTime())) {
        throw new RateProviderError(
          `${this.rateType} response has an invalid "${this.dateField}" date`,
        );
      }
      effectiveDate = parsed;
    }

    return {
      rateType: this.rateType,
      valueVesPerUsd,
      source: this.source,
      effectiveDate,
      fetchedAt: this.now(),
    };
  }
}
