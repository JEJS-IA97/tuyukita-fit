jest.mock('react-native', () => ({
  Platform: { OS: 'web' },
}));

jest.mock('expo-secure-store', () => ({
  getItemAsync: jest.fn(),
  setItemAsync: jest.fn(),
  deleteItemAsync: jest.fn(),
}));

import * as SecureStore from 'expo-secure-store';

import { createSecureTokenStorage } from '@/api/secure-storage';

type WebStorage = {
  getItem: (key: string) => string | null;
  setItem: (key: string, value: string) => void;
  removeItem: (key: string) => void;
};

const globalWithStorage = globalThis as { localStorage?: WebStorage };

describe('secure token storage on web', () => {
  let values: Map<string, string>;

  beforeEach(() => {
    jest.clearAllMocks();
    values = new Map();
    globalWithStorage.localStorage = {
      getItem: (key) => values.get(key) ?? null,
      setItem: (key, value) => {
        values.set(key, value);
      },
      removeItem: (key) => {
        values.delete(key);
      },
    };
  });

  afterEach(() => {
    delete globalWithStorage.localStorage;
  });

  it('persists tokens in localStorage instead of SecureStore', async () => {
    const storage = createSecureTokenStorage();

    await storage.setTokens('acc', 'ref');

    expect(values.get('yukita_fit_access_token')).toBe('acc');
    expect(values.get('yukita_fit_refresh_token')).toBe('ref');
    expect(SecureStore.setItemAsync).not.toHaveBeenCalled();
  });

  it('reads tokens from localStorage', async () => {
    values.set('yukita_fit_access_token', 'acc');
    values.set('yukita_fit_refresh_token', 'ref');
    const storage = createSecureTokenStorage();

    expect(await storage.getAccessToken()).toBe('acc');
    expect(await storage.getRefreshToken()).toBe('ref');
    expect(SecureStore.getItemAsync).not.toHaveBeenCalled();
  });

  it('removes tokens on clear', async () => {
    values.set('yukita_fit_access_token', 'acc');
    values.set('yukita_fit_refresh_token', 'ref');
    const storage = createSecureTokenStorage();

    await storage.clear();

    expect(values.size).toBe(0);
    expect(SecureStore.deleteItemAsync).not.toHaveBeenCalled();
  });
});
