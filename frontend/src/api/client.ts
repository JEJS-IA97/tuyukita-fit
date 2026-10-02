import { ApiError } from './errors';

export type ApiClientOptions = {
  baseUrl?: string;
  getToken?: () => string | null | Promise<string | null>;
  fetchFn?: typeof fetch;
  onUnauthorized?: () => void | Promise<void>;
};

export type ApiRequestInit = {
  headers?: Record<string, string>;
};

export type ApiClient = {
  get: <T>(path: string, init?: ApiRequestInit) => Promise<T>;
  post: <T>(path: string, body?: unknown, init?: ApiRequestInit) => Promise<T>;
  patch: <T>(path: string, body?: unknown, init?: ApiRequestInit) => Promise<T>;
  delete: <T>(path: string, init?: ApiRequestInit) => Promise<T>;
};

export const DEFAULT_API_BASE_URL =
  'http://localhost:3000/api/v1';

function toHttpError(status: number, payload: unknown): ApiError {
  const raw = (payload as { message?: unknown } | null)?.message;
  const messages = Array.isArray(raw)
    ? raw.map(String)
    : raw !== undefined && raw !== null
      ? [String(raw)]
      : [`Error ${status}`];
  return new ApiError(messages.join(' · '), 'http', status, messages);
}

export function createApiClient(options: ApiClientOptions = {}): ApiClient {
  const baseUrl = (
    options.baseUrl ??
    process.env.EXPO_PUBLIC_API_URL ??
    DEFAULT_API_BASE_URL
  ).replace(/\/$/, '');
  const fetchFn = options.fetchFn ?? fetch;

  async function request<T>(
    method: string,
    path: string,
    body?: unknown,
    init?: ApiRequestInit,
  ): Promise<T> {
    const token = options.getToken ? await options.getToken() : null;
    const headers: Record<string, string> = {
      Accept: 'application/json',
      ...init?.headers,
    };
    if (body !== undefined) {
      headers['Content-Type'] = 'application/json';
    }
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }

    const url = `${baseUrl}${path.startsWith('/') ? path : `/${path}`}`;

    let response: Response;
    try {
      response = await fetchFn(url, {
        method,
        headers,
        body: body !== undefined ? JSON.stringify(body) : undefined,
      });
    } catch {
      throw new ApiError('No se pudo conectar con el servidor', 'network');
    }

    const text = await response.text();
    let payload: unknown = null;
    if (text) {
      try {
        payload = JSON.parse(text);
      } catch {
        payload = null;
      }
    }

    if (!response.ok) {
      if (response.status === 401 && options.onUnauthorized) {
        await options.onUnauthorized();
      }
      throw toHttpError(response.status, payload);
    }

    return payload as T;
  }

  return {
    get: <T>(path: string, init?: ApiRequestInit) =>
      request<T>('GET', path, undefined, init),
    post: <T>(path: string, body?: unknown, init?: ApiRequestInit) =>
      request<T>('POST', path, body, init),
    patch: <T>(path: string, body?: unknown, init?: ApiRequestInit) =>
      request<T>('PATCH', path, body, init),
    delete: <T>(path: string, init?: ApiRequestInit) =>
      request<T>('DELETE', path, undefined, init),
  };
}
