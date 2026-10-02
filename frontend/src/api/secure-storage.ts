import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

import type { TokenStorage } from './token-storage';

const ACCESS_TOKEN_KEY = 'yukita_fit_access_token';
const REFRESH_TOKEN_KEY = 'yukita_fit_refresh_token';

type WebStorage = {
  getItem: (key: string) => string | null;
  setItem: (key: string, value: string) => void;
  removeItem: (key: string) => void;
};

function getWebStorage(): WebStorage | undefined {
  return (globalThis as { localStorage?: WebStorage }).localStorage;
}

function createWebTokenStorage(): TokenStorage {
  return {
    getAccessToken: async () =>
      getWebStorage()?.getItem(ACCESS_TOKEN_KEY) ?? null,
    getRefreshToken: async () =>
      getWebStorage()?.getItem(REFRESH_TOKEN_KEY) ?? null,
    setTokens: async (accessToken, refreshToken) => {
      getWebStorage()?.setItem(ACCESS_TOKEN_KEY, accessToken);
      getWebStorage()?.setItem(REFRESH_TOKEN_KEY, refreshToken);
    },
    clear: async () => {
      getWebStorage()?.removeItem(ACCESS_TOKEN_KEY);
      getWebStorage()?.removeItem(REFRESH_TOKEN_KEY);
    },
  };
}

function createSecureStoreTokenStorage(): TokenStorage {
  return {
    getAccessToken: () => SecureStore.getItemAsync(ACCESS_TOKEN_KEY),
    getRefreshToken: () => SecureStore.getItemAsync(REFRESH_TOKEN_KEY),
    setTokens: async (accessToken, refreshToken) => {
      await SecureStore.setItemAsync(ACCESS_TOKEN_KEY, accessToken);
      await SecureStore.setItemAsync(REFRESH_TOKEN_KEY, refreshToken);
    },
    clear: async () => {
      await SecureStore.deleteItemAsync(ACCESS_TOKEN_KEY);
      await SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY);
    },
  };
}

export function createSecureTokenStorage(): TokenStorage {
  return Platform.OS === 'web'
    ? createWebTokenStorage()
    : createSecureStoreTokenStorage();
}
