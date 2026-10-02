jest.mock('expo-router', () => ({
  router: { push: jest.fn(), replace: jest.fn() },
  useRouter: jest.fn(() => ({ push: jest.fn(), replace: jest.fn() })),
  Redirect: jest.fn(() => null),
}));

import { fireEvent, render } from '@testing-library/react-native';
import { router } from 'expo-router';

import HomeScreen from '@/app/(tabs)/index';
import { AuthProvider } from '@/auth/auth-context';
import { createSession } from '@/api/session';
import { createMemoryTokenStorage } from '@/api/token-storage';

const jsonResponse = (status: number, body: unknown) => ({
  ok: status >= 200 && status < 300,
  status,
  text: async () => JSON.stringify(body),
});

const BASE_URL = 'http://api.test/api/v1';

const summaryBody = {
  totalExpenses: 480000,
  totalPaid: 400000,
  totalPending: 80000,
  totalUsdMinor: 20000,
  expensesCount: 5,
  byCategory: [],
};

const ratesBody = {
  bcv: {
    rateType: 'BCV',
    valueVesPerUsd: 36.5,
    source: 'BCV Oficial',
    effectiveDate: '2026-10-01T00:00:00.000Z',
    fetchedAt: '2026-10-01T15:00:00.000Z',
  },
  usdt: {
    rateType: 'USDT',
    valueVesPerUsd: 37.1,
    source: 'Binance P2P',
    effectiveDate: '2026-10-01T00:00:00.000Z',
    fetchedAt: '2026-10-01T15:00:00.000Z',
  },
};

const stockBody = [
  {
    ingredientId: 'ing-1',
    name: 'Yuca',
    unit: 'kg',
    isActive: true,
    availableQuantityMinor: 0,
    availableQuantity: 0,
  },
  {
    ingredientId: 'ing-2',
    name: 'Harina',
    unit: 'kg',
    isActive: true,
    availableQuantityMinor: 2500,
    availableQuantity: 25,
  },
];

const okFetch = (url: string) => {
  if (url.includes('/expenses/summary')) {
    return Promise.resolve(jsonResponse(200, summaryBody));
  }
  if (url.includes('/exchange-rates/latest')) {
    return Promise.resolve(jsonResponse(200, ratesBody));
  }
  if (url.includes('/inventory/stock')) {
    return Promise.resolve(jsonResponse(200, stockBody));
  }
  return Promise.resolve(jsonResponse(404, { statusCode: 404 }));
};

const renderDashboard = async (fetchFn: jest.Mock) => {
  const session = createSession({
    storage: createMemoryTokenStorage(),
    baseUrl: BASE_URL,
    fetchFn: fetchFn as unknown as typeof fetch,
  });
  return render(
    <AuthProvider session={session}>
      <HomeScreen />
    </AuthProvider>,
  );
};

const rateCalls = (fetchFn: jest.Mock) =>
  fetchFn.mock.calls.filter((call) =>
    String(call[0]).includes('/exchange-rates/latest'),
  ).length;

describe('<HomeScreen /> dashboard de inicio', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('shows BCV and USDT rates with value, source and date (RF-016, RF-017)', async () => {
    const fetchFn = jest.fn(okFetch);

    const { findByText, getByText } = await renderDashboard(fetchFn);

    await findByText('Bs 36,50');
    getByText('Bs 37,10');
    getByText('BCV Oficial · 01/10/2026');
    getByText('Binance P2P · 01/10/2026');
  });

  it('reports when no exchange rate has ever been registered (RF-019a)', async () => {
    const fetchFn = jest.fn((url: string) => {
      if (url.includes('/exchange-rates/latest')) {
        return Promise.resolve(
          jsonResponse(404, {
            statusCode: 404,
            message: 'No valid exchange rate has ever been registered',
          }),
        );
      }
      return okFetch(url);
    });

    const { findAllByText } = await renderDashboard(fetchFn);

    await findAllByText('Sin tasa registrada');
  });

  it('shows the monthly expenses in VES and USD (RF-007, RF-008)', async () => {
    const fetchFn = jest.fn(okFetch);

    const { findByText, getByText } = await renderDashboard(fetchFn);

    await findByText('Bs 480.000');
    getByText('5 gastos');
    getByText('$ 200,00');
  });

  it('lists the lowest stock and flags out-of-stock ingredients (RF-010)', async () => {
    const fetchFn = jest.fn(okFetch);

    const { findByText, getByText } = await renderDashboard(fetchFn);

    await findByText('Yuca');
    getByText('Agotado');
    getByText('Harina');
    getByText('25');
  });

  it('navigates to expenses when pressing + Gasto', async () => {
    const fetchFn = jest.fn(okFetch);

    const { findByText } = await renderDashboard(fetchFn);
    await findByText('+ Gasto');

    await fireEvent.press(await findByText('+ Gasto'));

    expect(router.push).toHaveBeenCalledWith('/expenses');
  });

  it('reloads the rates when pressing Tasas', async () => {
    const fetchFn = jest.fn(okFetch);

    const { findByText } = await renderDashboard(fetchFn);
    await findByText('Tasas');
    expect(rateCalls(fetchFn)).toBe(1);

    await fireEvent.press(await findByText('Tasas'));

    expect(rateCalls(fetchFn)).toBe(2);
  });

  it('shows a visible error when the stock cannot be loaded', async () => {
    const fetchFn = jest.fn((url: string) => {
      if (url.includes('/inventory/stock')) {
        return Promise.reject(new TypeError('Network request failed'));
      }
      return okFetch(url);
    });

    const { findAllByText } = await renderDashboard(fetchFn);

    await findAllByText('No se pudo cargar las existencias');
  });
});
