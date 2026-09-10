import { describe, expect, it, jest } from '@jest/globals';
import { fireEvent, render } from '@testing-library/react-native';

import { DriverEarningsScreen } from './DriverEarningsScreen';

jest.mock('expo-router', () => ({
  useRouter: () => ({
    push: jest.fn(),
    back: jest.fn(),
  }),
}));

describe('DriverEarningsScreen', () => {
  it('renders earnings screen with double-bezel cards, OTD metric 99.4%, and net earnings breakdown', async () => {
    const screen = await render(<DriverEarningsScreen />);

    expect(screen.getByText('Thu nhập')).toBeTruthy();
    expect(screen.getByText('99.4%')).toBeTruthy();
    expect(screen.getByText('Đúng giờ (OTD)')).toBeTruthy();
    expect(screen.getByText(/Chiết khấu nền tảng 10%/)).toBeTruthy();
    expect(screen.getByText('Rút tiền 24/7')).toBeTruthy();

    await screen.unmount();
  });
});
