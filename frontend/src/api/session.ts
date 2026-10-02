import { createApiClient, type ApiClient } from './client';
import { createAuthApi, type AuthApi } from './auth-api';
import {
  createMemoryTokenStorage,
  type TokenStorage,
} from './token-storage';
import type { AuthUser } from './types';

export type Session = {
  client: ApiClient;
  auth: AuthApi;
  login: (username: string, password: string) => Promise<AuthUser>;
  logout: () => Promise<void>;
  getAccessToken: () => Promise<string | null>;
};

export type SessionOptions = {
  storage?: TokenStorage;
  baseUrl?: string;
  fetchFn?: typeof fetch;
};

export function createSession(options: SessionOptions = {}): Session {
  const storage = options.storage ?? createMemoryTokenStorage();
  const client = createApiClient({
    baseUrl: options.baseUrl,
    fetchFn: options.fetchFn,
    getToken: () => storage.getAccessToken(),
    onUnauthorized: () => storage.clear(),
  });
  const auth = createAuthApi(client);

  return {
    client,
    auth,
    async login(username, password) {
      const response = await auth.login(username, password);
      await storage.setTokens(response.accessToken, response.refreshToken);
      return response.user;
    },
    async logout() {
      const refreshToken = await storage.getRefreshToken();
      if (refreshToken) {
        await auth.logout(refreshToken).catch(() => undefined);
      }
      await storage.clear();
    },
    getAccessToken: () => storage.getAccessToken(),
  };
}
