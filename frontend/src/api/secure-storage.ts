import * as SecureStore from 'expo-secure-store';

import type { TokenStorage } from './token-storage';

const ACCESS_TOKEN_KEY = 'yukita_fit_access_token';
const REFRESH_TOKEN_KEY = 'yukita_fit_refresh_token';

export function createSecureTokenStorage(): TokenStorage {
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
