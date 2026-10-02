jest.mock('expo-secure-store', () => ({
  getItemAsync: jest.fn(),
  setItemAsync: jest.fn(),
  deleteItemAsync: jest.fn(),
}));

import * as SecureStore from 'expo-secure-store';
import { createSecureTokenStorage } from '@/api/secure-storage';

describe('secure token storage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('persists both tokens under fixed keys', async () => {
    const storage = createSecureTokenStorage();

    await storage.setTokens('acc', 'ref');

    expect(SecureStore.setItemAsync).toHaveBeenCalledWith(
      'yukita_fit_access_token',
      'acc',
    );
    expect(SecureStore.setItemAsync).toHaveBeenCalledWith(
      'yukita_fit_refresh_token',
      'ref',
    );
  });

  it('reads tokens back', async () => {
    (SecureStore.getItemAsync as jest.Mock).mockImplementation(
      (key: string) =>
        Promise.resolve(key.endsWith('access_token') ? 'acc' : 'ref'),
    );
    const storage = createSecureTokenStorage();

    expect(await storage.getAccessToken()).toBe('acc');
    expect(await storage.getRefreshToken()).toBe('ref');
  });

  it('deletes both tokens on clear', async () => {
    const storage = createSecureTokenStorage();

    await storage.clear();

    expect(SecureStore.deleteItemAsync).toHaveBeenCalledWith(
      'yukita_fit_access_token',
    );
    expect(SecureStore.deleteItemAsync).toHaveBeenCalledWith(
      'yukita_fit_refresh_token',
    );
  });
});
