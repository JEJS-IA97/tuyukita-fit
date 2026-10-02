export type TokenStorage = {
  getAccessToken: () => Promise<string | null>;
  getRefreshToken: () => Promise<string | null>;
  setTokens: (accessToken: string, refreshToken: string) => Promise<void>;
  clear: () => Promise<void>;
};

export function createMemoryTokenStorage(
  initial?: { accessToken?: string; refreshToken?: string },
): TokenStorage {
  let accessToken = initial?.accessToken ?? null;
  let refreshToken = initial?.refreshToken ?? null;

  return {
    getAccessToken: async () => accessToken,
    getRefreshToken: async () => refreshToken,
    setTokens: async (nextAccessToken, nextRefreshToken) => {
      accessToken = nextAccessToken;
      refreshToken = nextRefreshToken;
    },
    clear: async () => {
      accessToken = null;
      refreshToken = null;
    },
  };
}
