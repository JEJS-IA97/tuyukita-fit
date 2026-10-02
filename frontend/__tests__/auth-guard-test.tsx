jest.mock('expo-router', () => ({
  Redirect: jest.fn(() => null),
}));

import { Redirect } from 'expo-router';
import { render, waitFor } from '@testing-library/react-native';
import { Text } from 'react-native';
import type { ReactNode } from 'react';

import { AuthenticatedArea } from '@/auth/authenticated-area';
import { AuthProvider } from '@/auth/auth-context';
import { createSession } from '@/api/session';
import { createMemoryTokenStorage } from '@/api/token-storage';

const jsonResponse = (status: number, body: unknown) => ({
  ok: status >= 200 && status < 300,
  status,
  text: async () => JSON.stringify(body),
});

const BASE_URL = 'http://api.test/api/v1';

const renderArea = async (
  fetchFn: jest.Mock,
  storage = createMemoryTokenStorage(),
) => {
  const session = createSession({
    storage,
    baseUrl: BASE_URL,
    fetchFn: fetchFn as unknown as typeof fetch,
  });
  return render(
    <AuthProvider session={session}>
      <AuthenticatedArea>
        <Text>contenido protegido</Text>
      </AuthenticatedArea>
    </AuthProvider>,
  );
};

const redirectMock = Redirect as unknown as jest.Mock;

describe('<AuthenticatedArea /> (guard de rutas)', () => {
  beforeEach(() => {
    redirectMock.mockClear();
  });

  it('shows nothing while the session is being restored', async () => {
    const storage = createMemoryTokenStorage({
      accessToken: 'acc',
      refreshToken: 'ref',
    });
    const fetchFn = jest.fn().mockReturnValue(new Promise(() => undefined));

    const { queryByText } = await renderArea(fetchFn, storage);

    expect(queryByText('contenido protegido')).toBeNull();
    expect(redirectMock).not.toHaveBeenCalled();
  });

  it('redirects to the portada when there is no session', async () => {
    const fetchFn = jest.fn();

    const { queryByText } = await renderArea(fetchFn);

    await waitFor(() => expect(queryByText('contenido protegido')).toBeNull());
    expect(redirectMock).toHaveBeenCalled();
    expect(redirectMock.mock.calls[0][0]).toMatchObject({ href: '/welcome' });
  });

  it('renders protected content when the session is active', async () => {
    const storage = createMemoryTokenStorage({
      accessToken: 'acc',
      refreshToken: 'ref',
    });
    const fetchFn = jest.fn().mockResolvedValue(
      jsonResponse(200, {
        id: 'id-jose',
        name: 'Jose',
        username: 'jose',
        role: 'OPERATOR',
      }),
    );

    const { findByText } = await renderArea(fetchFn, storage);

    await findByText('contenido protegido');
    expect(redirectMock).not.toHaveBeenCalled();
  });
});
