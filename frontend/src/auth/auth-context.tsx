import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

import type { Session } from '@/api/session';
import type { AuthUser } from '@/api/types';

export type AuthStatus = 'loading' | 'authenticated' | 'unauthenticated';

export type AuthContextValue = {
  status: AuthStatus;
  user: AuthUser | null;
  session: Session;
  signIn: (username: string, password: string) => Promise<AuthUser>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({
  session,
  children,
}: {
  session: Session;
  children: ReactNode;
}) {
  const [status, setStatus] = useState<AuthStatus>('loading');
  const [user, setUser] = useState<AuthUser | null>(null);

  useEffect(() => {
    let cancelled = false;

    const restore = async () => {
      try {
        const token = await session.getAccessToken();
        if (!token) {
          if (!cancelled) {
            setStatus('unauthenticated');
          }
          return;
        }
        const me = await session.auth.me();
        if (!cancelled) {
          setUser(me);
          setStatus('authenticated');
        }
      } catch {
        if (!cancelled) {
          setUser(null);
          setStatus('unauthenticated');
        }
      }
    };

    void restore();

    return () => {
      cancelled = true;
    };
  }, [session]);

  const signIn = useCallback(
    async (username: string, password: string) => {
      const signedInUser = await session.login(username, password);
      setUser(signedInUser);
      setStatus('authenticated');
      return signedInUser;
    },
    [session],
  );

  const signOut = useCallback(async () => {
    await session.logout();
    setUser(null);
    setStatus('unauthenticated');
  }, [session]);

  const value = useMemo(
    () => ({ status, user, session, signIn, signOut }),
    [status, user, session, signIn, signOut],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
