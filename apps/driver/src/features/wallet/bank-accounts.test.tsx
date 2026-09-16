import { describe, expect, it, jest } from '@jest/globals';
import { fireEvent, render } from '@testing-library/react-native';

import { DriverBankAccountsScreen } from './DriverBankAccountsScreen';

const mockBack = jest.fn();

jest.mock('expo-router', () => ({
  useRouter: () => ({
    push: jest.fn(),
    back: mockBack,
  }),
}));

describe('DriverBankAccountsScreen', () => {
  it('renders the single BE-linked bank account', async () => {
    const screen = await render(
      <DriverBankAccountsScreen
        bankAccountName="NGUYEN VAN A"
        bankAccountNumber="0987654321"
        bankName="MB Bank"
      />,
    );

    expect(screen.getByText('Tài khoản thụ hưởng')).toBeTruthy();
    expect(screen.getByText('MB Bank')).toBeTruthy();
    expect(screen.getByText('0987654321')).toBeTruthy();
    expect(screen.getByText('NGUYEN VAN A')).toBeTruthy();
    // No second hardcoded account
    expect(screen.queryByText('Vietcombank')).toBeNull();
    expect(screen.queryByText('1012345678')).toBeNull();

    await screen.unmount();
  });

  it('renders empty state when no bank account is linked', async () => {
    const screen = await render(
      <DriverBankAccountsScreen bankAccountName={null} bankAccountNumber={null} bankName={null} />,
    );

    expect(screen.getByText('Chưa liên kết tài khoản ngân hàng')).toBeTruthy();
    expect(screen.queryByText('MB Bank')).toBeNull();

    await screen.unmount();
  });

  it('calls router.back when back button is pressed', async () => {
    mockBack.mockClear();
    const screen = await render(
      <DriverBankAccountsScreen
        bankAccountName="NGUYEN VAN A"
        bankAccountNumber="0987654321"
        bankName="MB Bank"
      />,
    );

    const backBtn = screen.getByRole('button', { name: 'Quay lại' });
    await fireEvent.press(backBtn);

    expect(mockBack).toHaveBeenCalledTimes(1);

    await screen.unmount();
  });
});
