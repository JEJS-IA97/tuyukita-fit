import { act, renderHook, waitFor } from '@testing-library/react-native';
import type { ReactNode } from 'react';

import { AuthProvider, useAuth } from '@/auth/auth-context';
import { createSession, type Session } from '@/api/session';
import { createMemoryTokenStorage, type TokenStorage } from '@/api/token-storage';

const jsonResponse = (status: number, body: unknown) => ({
  ok: status >= 200 && status < 300,
  status,
  text: async () => JSON.stringify(body),
});

const BASE_URL = 'http://api.test/api/v1';

const loginBody = (username: string) => ({
  user: { id: `id-${username}`, name: username, username, role: 'OPERATOR' },
  accessToken: `access-${username}`,
  refreshToken: `refresh-${username}`,
});

const meBody = (username: string) => ({
  id: `id-${username}`,
  name: username,
  username,
  role: 'OPERATOR',
});

const makeSession = (
  fetchFn: jest.Mock,
  storage: TokenStorage = createMemoryTokenStorage(),
) =>
  createSession({
    storage,
    baseUrl: BASE_URL,
    fetchFn: fetchFn as unknown as typeof fetch,
  });

const wrapperFor =
  (session: Session) =>
  ({ children }: { children: ReactNode }) => (
    <AuthProvider session={session}>{children}</AuthProvider>
  );

describe('AuthContext session lifecycle (RF-021)', () => {
  it('starts unauthenticated when there is no stored token', async () => {
    const fetchFn = jest.fn();
    const session = makeSession(fetchFn);

    const { result } = await renderHook(() => useAuth(), {
      wrapper: wrapperFor(session),
    });

    await waitFor(() => expect(result.current.status).toBe('unauthenticated'));
    expect(result.current.user).toBeNull();
    expect(fetchFn).not.toHaveBeenCalled();
  });

  it('restores the session from a stored token via /auth/me', async () => {
    const storage = createMemoryTokenStorage({
      accessToken: 'acc',
      refreshToken: 'ref',
    });
    const fetchFn = jest.fn().mockResolvedValue(jsonResponse(200, meBody('jose')));
    const session = makeSession(fetchFn, storage);

    const { result } = await renderHook(() => useAuth(), {
      wrapper: wrapperFor(session),
    });

    await waitFor(() => expect(result.current.status).toBe('authenticated'));
    expect(result.current.user).toMatchObject({
      username: 'jose',
      role: 'OPERATOR',
    });
    expect(fetchFn).toHaveBeenCalledWith(`${BASE_URL}/auth/me`, {
      headers: expect.objectContaining({
        Authorization: 'Bearer acc',
        Accept: 'application/json',
      }),
      method: 'GET',
    });
  });

  it('clears the session when the stored token is rejected', async () => {
    const storage = createMemoryTokenStorage({
      accessToken: 'expired',
      refreshToken: 'ref',
    });
    const fetchFn = jest
      .fn()
      .mockResolvedValue(
        jsonResponse(401, { statusCode: 401, message: 'Invalid credentials' }),
      );
    const session = makeSession(fetchFn, storage);

    const { result } = await renderHook(() => useAuth(), {
      wrapper: wrapperFor(session),
    });

    await waitFor(() => expect(result.current.status).toBe('unauthenticated'));
    expect(result.current.user).toBeNull();
    expect(await storage.getAccessToken()).toBeNull();
  });

  it('signs in and exposes the authenticated user', async () => {
    const storage = createMemoryTokenStorage();
    const fetchFn = jest.fn().mockResolvedValue(jsonResponse(200, loginBody('jose')));
    const session = makeSession(fetchFn, storage);

    const { result } = await renderHook(() => useAuth(), {
      wrapper: wrapperFor(session),
    });
    await waitFor(() => expect(result.current.status).toBe('unauthenticated'));

    await act(async () => {
      await result.current.signIn('jose', 'secret');
    });

    expect(result.current.status).toBe('authenticated');
    expect(result.current.user).toMatchObject({ username: 'jose' });
    expect(await storage.getAccessToken()).toBe('access-jose');
    expect(await storage.getRefreshToken()).toBe('refresh-jose');
  });

  it('propagates invalid credentials without authenticating', async () => {
    const fetchFn = jest
      .fn()
      .mockResolvedValue(
        jsonResponse(401, { statusCode: 401, message: 'Invalid credentials' }),
      );
    const session = makeSession(fetchFn);

    const { result } = await renderHook(() => useAuth(), {
      wrapper: wrapperFor(session),
    });
    await waitFor(() => expect(result.current.status).toBe('unauthenticated'));

    await act(async () => {
      await expect(result.current.signIn('jose', 'bad')).rejects.toMatchObject({
        status: 401,
      });
    });

    expect(result.current.status).toBe('unauthenticated');
    expect(result.current.user).toBeNull();
  });

  it('signs out clearing local tokens', async () => {
    const storage = createMemoryTokenStorage({
      accessToken: 'acc',
      refreshToken: 'ref',
    });
    const fetchFn = jest
      .fn()
      .mockResolvedValueOnce(jsonResponse(200, meBody('jose')))
      .mockResolvedValueOnce(
        jsonResponse(200, { message: 'Logged out successfully' }),
      );
    const session = makeSession(fetchFn, storage);

    const { result } = await renderHook(() => useAuth(), {
      wrapper: wrapperFor(session),
    });
    await waitFor(() => expect(result.current.status).toBe('authenticated'));

    await act(async () => {
      await result.current.signOut();
    });

    expect(result.current.status).toBe('unauthenticated');
    expect(result.current.user).toBeNull();
    expect(await storage.getAccessToken()).toBeNull();
    expect(await storage.getRefreshToken()).toBeNull();
    expect(fetchFn).toHaveBeenLastCalledWith(`${BASE_URL}/auth/logout`, {
      headers: expect.objectContaining({
        Accept: 'application/json',
        'Content-Type': 'application/json',
      }),
      method: 'POST',
      body: JSON.stringify({ refreshToken: 'ref' }),
    });
  });
});
