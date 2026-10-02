import { Redirect } from 'expo-router';
import type { ReactNode } from 'react';

import { useAuth } from './auth-context';

export function AuthenticatedArea({ children }: { children: ReactNode }) {
  const { status } = useAuth();

  if (status === 'loading') {
    return null;
  }

  if (status === 'unauthenticated') {
    return <Redirect href="/welcome" />;
  }

  return <>{children}</>;
}
