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

  it('opens modal, validates input and calls onUpdateBankAccount', async () => {
    const mockUpdate = jest.fn(async () => {});
    const screen = await render(
      <DriverBankAccountsScreen
        bankAccountName="NGUYEN VAN A"
        bankAccountNumber="0987654321"
        bankName="MB Bank"
        onUpdateBankAccount={mockUpdate}
      />,
    );

    const editBtn = screen.getByTestId('btn-edit-bank-account');
    await fireEvent.press(editBtn);

    // Modal opens
    expect(screen.getAllByText('Cập nhật tài khoản').length).toBeGreaterThan(0);
    expect(screen.getByTestId('input-bank-account-number')).toBeTruthy();

    // Select different bank chip
    const vcbChip = screen.getByTestId('bank-chip-Vietcombank');
    await fireEvent.press(vcbChip);

    // Fill account number and name
    const numInput = screen.getByTestId('input-bank-account-number');
    await fireEvent.changeText(numInput, '0071000123456');

    const nameInput = screen.getByTestId('input-bank-account-name');
    await fireEvent.changeText(nameInput, 'tran van b');

    const submitBtn = screen.getByTestId('btn-submit-bank-account');
    await fireEvent.press(submitBtn);

    expect(mockUpdate).toHaveBeenCalledWith({
      bankName: 'Vietcombank',
      bankAccountNumber: '0071000123456',
      bankAccountName: 'TRAN VAN B',
    });

    await screen.unmount();
  });

  it('validates short account number and shows error', async () => {
    const mockUpdate = jest.fn(async () => {});
    const screen = await render(
      <DriverBankAccountsScreen
        bankAccountName={null}
        bankAccountNumber={null}
        bankName={null}
        onUpdateBankAccount={mockUpdate}
      />,
    );

    const addBtn = screen.getByTestId('btn-add-bank-account');
    await fireEvent.press(addBtn);

    const numInput = screen.getByTestId('input-bank-account-number');
    await fireEvent.changeText(numInput, '123'); // too short

    const submitBtn = screen.getByTestId('btn-submit-bank-account');
    await fireEvent.press(submitBtn);

    expect(screen.getByText('Số tài khoản không hợp lệ (tối thiểu 6 chữ số)')).toBeTruthy();
    expect(mockUpdate).not.toHaveBeenCalled();

    await screen.unmount();
  });
});
