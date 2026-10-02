jest.mock('expo-router', () => ({
  router: { push: jest.fn(), replace: jest.fn() },
  Redirect: jest.fn(() => null),
}));

import { Redirect, router } from 'expo-router';
import { act, fireEvent, render, waitFor } from '@testing-library/react-native';

import LoginScreen from '@/app/login';
import { AuthProvider } from '@/auth/auth-context';
import { createSession } from '@/api/session';
import { createMemoryTokenStorage } from '@/api/token-storage';

const jsonResponse = (status: number, body: unknown) => ({
  ok: status >= 200 && status < 300,
  status,
  text: async () => JSON.stringify(body),
});

const BASE_URL = 'http://api.test/api/v1';

const joseLoginBody = {
  user: {
    id: 'id-jose',
    name: 'Jose',
    username: 'jose',
    role: 'OPERATOR',
  },
  accessToken: 'access-jose',
  refreshToken: 'refresh-jose',
};

const renderLogin = async (
  fetchFn: jest.Mock,
  storage = createMemoryTokenStorage(),
) => {
  const session = createSession({
    storage,
    baseUrl: BASE_URL,
    fetchFn: fetchFn as unknown as typeof fetch,
  });
  const view = await render(
    <AuthProvider session={session}>
      <LoginScreen />
    </AuthProvider>,
  );
  return { ...view, storage };
};

describe('<LoginScreen />', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders the credentials form', async () => {
    const { getByPlaceholderText, getByText } = await renderLogin(jest.fn());

    getByPlaceholderText('Usuario');
    getByPlaceholderText('Contraseña');
    getByText('Iniciar sesión');
  });

  it('shows a visible error when credentials are invalid (RF-021)', async () => {
    const fetchFn = jest
      .fn()
      .mockResolvedValue(
        jsonResponse(401, { statusCode: 401, message: 'Invalid credentials' }),
      );
    const { getByPlaceholderText, getByText, findByText } =
      await renderLogin(fetchFn);

    await fireEvent.changeText(getByPlaceholderText('Usuario'), 'jose');
    await fireEvent.changeText(getByPlaceholderText('Contraseña'), 'bad');
    await fireEvent.press(getByText('Iniciar sesión'));

    await findByText('Usuario o contraseña incorrectos');
    expect(router.replace).not.toHaveBeenCalled();
  });

  it('enters the app after a successful login (RF-021)', async () => {
    const fetchFn = jest.fn().mockResolvedValue(jsonResponse(200, joseLoginBody));
    const { getByPlaceholderText, getByText, storage } =
      await renderLogin(fetchFn);

    await fireEvent.changeText(getByPlaceholderText('Usuario'), 'jose');
    await fireEvent.changeText(getByPlaceholderText('Contraseña'), 'secret');
    await fireEvent.press(getByText('Iniciar sesión'));

    await waitFor(() => expect(router.replace).toHaveBeenCalledWith('/'));
    expect(fetchFn).toHaveBeenCalledWith(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: expect.objectContaining({
        'Content-Type': 'application/json',
      }),
      body: JSON.stringify({ username: 'jose', password: 'secret' }),
    });
    expect(await storage.getAccessToken()).toBe('access-jose');
  });

  it('shows a loading state while the request runs', async () => {
    let resolveLogin: (value: unknown) => void = () => undefined;
    const fetchFn = jest
      .fn()
      .mockReturnValue(
        new Promise((resolve) => {
          resolveLogin = resolve;
        }),
      );
    const { getByPlaceholderText, getByText } = await renderLogin(fetchFn);

    await fireEvent.changeText(getByPlaceholderText('Usuario'), 'jose');
    await fireEvent.changeText(getByPlaceholderText('Contraseña'), 'secret');
    await fireEvent.press(getByText('Iniciar sesión'));

    getByText('Iniciando...');

    await act(async () => {
      resolveLogin(jsonResponse(200, joseLoginBody));
    });

    await waitFor(() => expect(router.replace).toHaveBeenCalledWith('/'));
  });

  it('redirects to the app when there is already an active session', async () => {
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

    await renderLogin(fetchFn, storage);

    const redirectMock = Redirect as unknown as jest.Mock;
    await waitFor(() => expect(redirectMock).toHaveBeenCalled());
    expect(redirectMock.mock.calls[0][0]).toMatchObject({ href: '/' });
  });
});
