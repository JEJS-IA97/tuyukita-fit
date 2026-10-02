import { render } from '@testing-library/react-native';

import HomeScreen from '@/app/(tabs)/index';

describe('<HomeScreen />', () => {
  test('renders the Yukita Fit brand', async () => {
    const { getByText } = await render(<HomeScreen />);

    getByText('Yukita Fit');
    getByText('Resumen del negocio');
  });
});
