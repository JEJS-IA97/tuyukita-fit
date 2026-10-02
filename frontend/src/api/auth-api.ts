import type { ApiClient } from './client';
import type { AuthUser, LoginResponse, Tokens } from './types';

export type AuthApi = {
  login: (username: string, password: string) => Promise<LoginResponse>;
  refresh: (refreshToken: string) => Promise<Tokens>;
  logout: (refreshToken: string) => Promise<{ message: string }>;
  me: () => Promise<AuthUser>;
};

export function createAuthApi(client: ApiClient): AuthApi {
  return {
    login: (username, password) =>
      client.post<LoginResponse>('/auth/login', { username, password }),
    refresh: (refreshToken) =>
      client.post<Tokens>('/auth/refresh', { refreshToken }),
    logout: (refreshToken) =>
      client.post<{ message: string }>('/auth/logout', { refreshToken }),
    me: () => client.get<AuthUser>('/auth/me'),
  };
}
