import { createApiClient } from '@/api/client';
import { ApiError } from '@/api/errors';

const jsonResponse = (status: number, body: unknown) => ({
  ok: status >= 200 && status < 300,
  status,
  text: async () => JSON.stringify(body),
});

const makeClient = (
  fetchFn: jest.Mock,
  options: Partial<Parameters<typeof createApiClient>[0]> = {},
) =>
  createApiClient({
    baseUrl: 'http://api.test/api/v1',
    fetchFn: fetchFn as unknown as typeof fetch,
    ...options,
  });

describe('mobile HTTP client (RF-021)', () => {
  it('attaches the bearer token to authenticated requests', async () => {
    const fetchFn = jest.fn().mockResolvedValue(jsonResponse(200, { id: 'ing-1' }));
    const client = makeClient(fetchFn, { getToken: () => 'token-123' });

    const data = await client.get<{ id: string }>('/ingredients');

    expect(data).toEqual({ id: 'ing-1' });
    expect(fetchFn).toHaveBeenCalledWith(
      'http://api.test/api/v1/ingredients',
      expect.objectContaining({
        method: 'GET',
        headers: expect.objectContaining({
          Authorization: 'Bearer token-123',
          Accept: 'application/json',
        }),
      }),
    );
  });

  it('omits the authorization header when there is no token', async () => {
    const fetchFn = jest.fn().mockResolvedValue(jsonResponse(200, []));
    const client = makeClient(fetchFn, { getToken: () => null });

    await client.get('/ingredients');

    const headers = fetchFn.mock.calls[0][1].headers;
    expect(headers.Authorization).toBeUndefined();
  });

  it('sends JSON bodies with the content type header', async () => {
    const fetchFn = jest.fn().mockResolvedValue(jsonResponse(201, { id: 'exp-1' }));
    const client = makeClient(fetchFn, { getToken: () => 'token' });

    await client.post('/expenses/manual', { amountVes: 1000 });

    expect(fetchFn).toHaveBeenCalledWith(
      'http://api.test/api/v1/expenses/manual',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ amountVes: 1000 }),
        headers: expect.objectContaining({
          'Content-Type': 'application/json',
        }),
      }),
    );
  });

  it('maps API failures to ApiError with the server message (RF-014)', async () => {
    const fetchFn = jest.fn().mockResolvedValue(
      jsonResponse(409, {
        statusCode: 409,
        message:
          'Insufficient stock: available 8000 minor units, requested 9000',
        error: 'Conflict',
      }),
    );
    const client = makeClient(fetchFn);

    await expect(client.post('/inventory/outputs', {})).rejects.toMatchObject({
      name: 'ApiError',
      kind: 'http',
      status: 409,
      message: 'Insufficient stock: available 8000 minor units, requested 9000',
    });
  });

  it('joins validation messages when the API returns several', async () => {
    const fetchFn = jest.fn().mockResolvedValue(
      jsonResponse(400, {
        statusCode: 400,
        message: ['quantity must be greater than 0', 'unknownField must not exist'],
      }),
    );
    const client = makeClient(fetchFn);

    const error = await client
      .post('/expenses/manual', {})
      .catch((caught: unknown) => caught);

    expect(error).toBeInstanceOf(ApiError);
    expect((error as ApiError).message).toBe(
      'quantity must be greater than 0 · unknownField must not exist',
    );
    expect((error as ApiError).status).toBe(400);
  });

  it('reports connection failures as network errors', async () => {
    const fetchFn = jest
      .fn()
      .mockRejectedValue(new TypeError('Network request failed'));
    const client = makeClient(fetchFn);

    const error = await client
      .get('/ingredients')
      .catch((caught: unknown) => caught);

    expect(error).toBeInstanceOf(ApiError);
    expect((error as ApiError).kind).toBe('network');
    expect((error as ApiError).status).toBeNull();
  });

  it('clears the session when the API answers 401 (RF-021)', async () => {
    const fetchFn = jest
      .fn()
      .mockResolvedValue(
        jsonResponse(401, { statusCode: 401, message: 'Invalid credentials' }),
      );
    const onUnauthorized = jest.fn();
    const client = makeClient(fetchFn, {
      onUnauthorized,
      getToken: () => 'expired',
    });

    await expect(client.get('/auth/me')).rejects.toMatchObject({ status: 401 });
    expect(onUnauthorized).toHaveBeenCalledTimes(1);
  });
});
