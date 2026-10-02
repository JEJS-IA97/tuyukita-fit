import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useMemo } from 'react';

import { createSession } from '@/api/session';
import { createSecureTokenStorage } from '@/api/secure-storage';
import { AuthProvider } from '@/auth/auth-context';
import { colors } from '@/theme';

export default function RootLayout() {
  const session = useMemo(
    () => createSession({ storage: createSecureTokenStorage() }),
    [],
  );

  return (
    <AuthProvider session={session}>
      <StatusBar style="light" />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: colors.primary },
          headerTintColor: colors.onPrimary,
          headerTitleStyle: { fontWeight: '700' },
        }}
      >
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="welcome" options={{ headerShown: false }} />
        <Stack.Screen name="login" options={{ headerShown: false }} />
      </Stack>
    </AuthProvider>
  );
}
