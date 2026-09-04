import { describe, expect, it, jest } from '@jest/globals';
import { fireEvent, render } from '@testing-library/react-native';

import { DriverWalletScreen } from './DriverWalletScreen';

jest.mock('expo-router', () => ({
  useRouter: () => ({
    push: jest.fn(),
    back: jest.fn(),
  }),
}));

describe('DriverWalletScreen', () => {
  it('renders wallet balance, linked bank account, and transaction list', async () => {
    const screen = await render(<DriverWalletScreen />);

    expect(screen.getByText('DRIVER · WALLET & PAYOUT')).toBeTruthy();
    expect(screen.getByRole('header', { name: 'Ví tài xế' })).toBeTruthy();
    expect(screen.getByText('Số dư khả dụng để rút')).toBeTruthy();
    expect(screen.getByText('MB Bank')).toBeTruthy();
    expect(screen.getByText('0987 **** **68 · NGUYEN VAN A')).toBeTruthy();
    expect(screen.getAllByText('Rút tiền về MB Bank').length).toBeGreaterThan(0);

    await screen.unmount();
  });

  it('can open withdrawal modal and see preset options', async () => {
    const screen = await render(<DriverWalletScreen />);

    const withdrawBtn = screen.getByRole('button', { name: 'Rút tiền về ngân hàng' });
    await fireEvent.press(withdrawBtn);

    expect(screen.getByText('Rút tiền về tài khoản ngân hàng')).toBeTruthy();
    expect(screen.getByText('Xác nhận rút tiền')).toBeTruthy();

    await screen.unmount();
  });
});
