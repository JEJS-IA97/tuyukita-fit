jest.mock('expo-router', () => {
  const router = { replace: jest.fn(), push: jest.fn() };
  return {
    useRouter: jest.fn(() => router),
    router,
    Redirect: jest.fn(() => null),
  };
});

import { useRouter } from 'expo-router';
import { act, render } from '@testing-library/react-native';

import WelcomeScreen from '@/app/welcome';
import { AuthProvider } from '@/auth/auth-context';
import { createSession } from '@/api/session';
import { createMemoryTokenStorage } from '@/api/token-storage';

const jsonResponse = (status: number, body: unknown) => ({
  ok: status >= 200 && status < 300,
  status,
  text: async () => JSON.stringify(body),
});

const BASE_URL = 'http://api.test/api/v1';

type RouterMock = { replace: jest.Mock; push: jest.Mock };

const routerMock = () =>
  (useRouter as unknown as jest.Mock)() as unknown as RouterMock;

const renderWelcome = async (
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
      <WelcomeScreen />
    </AuthProvider>,
  );
};

describe('<WelcomeScreen /> (portada)', () => {
  beforeEach(() => {
    (useRouter as unknown as jest.Mock).mockClear();
    routerMock().replace.mockClear();
    jest.useRealTimers();
  });

  it('shows the brand slogan', async () => {
    const { getByText } = await renderWelcome(jest.fn());

    getByText('¡Come yuca y ponte yuka!');
  });

  it('redirects to login after 5 seconds when there is no session', async () => {
    jest.useFakeTimers();

    await renderWelcome(jest.fn());

    expect(routerMock().replace).not.toHaveBeenCalled();

    await act(async () => {
      jest.advanceTimersByTime(5000);
    });

    expect(routerMock().replace).toHaveBeenCalledWith('/login');
  });

  it('enters the app after 5 seconds when the session was restored', async () => {
    jest.useFakeTimers();
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

    await renderWelcome(fetchFn, storage);

    await act(async () => {
      await Promise.resolve();
    });
    await act(async () => {
      jest.advanceTimersByTime(5000);
    });

    expect(routerMock().replace).toHaveBeenCalledWith('/');
  });
});
