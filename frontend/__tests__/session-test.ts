import { createSession } from '@/api/session';
import { createMemoryTokenStorage } from '@/api/token-storage';

const jsonResponse = (status: number, body: unknown) => ({
  ok: status >= 200 && status < 300,
  status,
  text: async () => JSON.stringify(body),
});

const loginBody = (username: string) => ({
  user: {
    id: `id-${username}`,
    name: username,
    username,
    role: 'OPERATOR',
  },
  accessToken: `access-${username}`,
  refreshToken: `refresh-${username}`,
});

const BASE_URL = 'http://api.test/api/v1';

describe('authenticated session (RF-021)', () => {
  it('logs in, stores tokens and authenticates later requests', async () => {
    const storage = createMemoryTokenStorage();
    const fetchFn = jest
      .fn()
      .mockResolvedValueOnce(jsonResponse(200, loginBody('jose')))
      .mockResolvedValueOnce(jsonResponse(200, [{ id: 'ing-1' }]));
    const session = createSession({
      storage,
      baseUrl: BASE_URL,
      fetchFn: fetchFn as unknown as typeof fetch,
    });

    const user = await session.login('jose', 'secret');

    expect(user).toMatchObject({ username: 'jose', role: 'OPERATOR' });
    expect(await session.getAccessToken()).toBe('access-jose');
    expect(fetchFn.mock.calls[0][1].body).toBe(
      JSON.stringify({ username: 'jose', password: 'secret' }),
    );

    await session.client.get('/ingredients');

    expect(fetchFn.mock.calls[1][1].headers.Authorization).toBe(
      'Bearer access-jose',
    );
  });

  it('works equally for the three initial accounts (RF-021)', async () => {
    for (const username of ['jose', 'jay', 'vivi']) {
      const storage = createMemoryTokenStorage();
      const fetchFn = jest
        .fn()
        .mockResolvedValueOnce(jsonResponse(200, loginBody(username)))
        .mockResolvedValueOnce(jsonResponse(201, { ok: true }));
      const session = createSession({
        storage,
        baseUrl: BASE_URL,
        fetchFn: fetchFn as unknown as typeof fetch,
      });

      const user = await session.login(username, 'secret');
      await session.client.post('/inventory/outputs', { quantity: 10 });

      expect(user.username).toBe(username);
      expect(fetchFn.mock.calls[1][0]).toBe(
        `${BASE_URL}/inventory/outputs`,
      );
      expect(fetchFn.mock.calls[1][1]).toMatchObject({
        method: 'POST',
        headers: expect.objectContaining({
          Authorization: `Bearer access-${username}`,
        }),
      });
    }
  });

  it('surfaces invalid credentials without storing tokens', async () => {
    const storage = createMemoryTokenStorage();
    const fetchFn = jest
      .fn()
      .mockResolvedValue(
        jsonResponse(401, { statusCode: 401, message: 'Invalid credentials' }),
      );
    const session = createSession({
      storage,
      baseUrl: BASE_URL,
      fetchFn: fetchFn as unknown as typeof fetch,
    });

    await expect(session.login('jose', 'bad')).rejects.toMatchObject({
      status: 401,
      message: 'Invalid credentials',
    });
    expect(await session.getAccessToken()).toBeNull();
  });

  it('clears stored tokens when the API rejects the session later', async () => {
    const storage = createMemoryTokenStorage();
    const fetchFn = jest
      .fn()
      .mockResolvedValueOnce(jsonResponse(200, loginBody('jose')))
      .mockResolvedValueOnce(
        jsonResponse(401, { statusCode: 401, message: 'Invalid credentials' }),
      );
    const session = createSession({
      storage,
      baseUrl: BASE_URL,
      fetchFn: fetchFn as unknown as typeof fetch,
    });

    await session.login('jose', 'secret');
    await expect(session.client.get('/auth/me')).rejects.toMatchObject({
      status: 401,
    });
    expect(await session.getAccessToken()).toBeNull();
  });

  it('logs out against the API and clears local tokens', async () => {
    const storage = createMemoryTokenStorage();
    const fetchFn = jest
      .fn()
      .mockResolvedValueOnce(jsonResponse(200, loginBody('jose')))
      .mockResolvedValueOnce(
        jsonResponse(200, { message: 'Logged out successfully' }),
      );
    const session = createSession({
      storage,
      baseUrl: BASE_URL,
      fetchFn: fetchFn as unknown as typeof fetch,
    });

    await session.login('jose', 'secret');
    await session.logout();

    expect(fetchFn.mock.calls[1][0]).toBe(`${BASE_URL}/auth/logout`);
    expect(fetchFn.mock.calls[1][1].body).toBe(
      JSON.stringify({ refreshToken: 'refresh-jose' }),
    );
    expect(await session.getAccessToken()).toBeNull();
    expect(await storage.getRefreshToken()).toBeNull();
  });

  it('clears local tokens even when the logout request fails', async () => {
    const storage = createMemoryTokenStorage();
    const fetchFn = jest
      .fn()
      .mockResolvedValueOnce(jsonResponse(200, loginBody('jose')))
      .mockRejectedValueOnce(new TypeError('Network request failed'));
    const session = createSession({
      storage,
      baseUrl: BASE_URL,
      fetchFn: fetchFn as unknown as typeof fetch,
    });

    await session.login('jose', 'secret');
    await session.logout();

    expect(await session.getAccessToken()).toBeNull();
    expect(await storage.getRefreshToken()).toBeNull();
  });
});
