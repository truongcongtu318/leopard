import { describe, expect, it, jest } from '@jest/globals';
import { fireEvent, render } from '@testing-library/react-native';

import { DriverBankAccountsScreen } from './DriverBankAccountsScreen';

const mockBack = jest.fn();
const mockPush = jest.fn();

jest.mock('expo-router', () => ({
  useRouter: () => ({
    push: mockPush,
    back: mockBack,
  }),
}));

describe('DriverBankAccountsScreen', () => {
  it('renders linked bank accounts with default badge and uppercase holder name', async () => {
    const screen = await render(<DriverBankAccountsScreen />);

    expect(screen.getByText('Tài khoản thụ hưởng')).toBeTruthy();
    expect(screen.getByText('MB Bank')).toBeTruthy();
    expect(screen.getByText('Vietcombank')).toBeTruthy();
    expect(screen.getAllByText('NGUYEN VAN A').length).toBeGreaterThan(0);
    expect(screen.getByText('Mặc định')).toBeTruthy();

    await screen.unmount();
  });

  it('allows setting an account as default', async () => {
    const screen = await render(<DriverBankAccountsScreen />);

    // Vietcombank is initially not default
    const setDefaultBtn = screen.getByRole('button', { name: 'Đặt làm mặc định cho Vietcombank' });
    await fireEvent.press(setDefaultBtn);

    // After setting, Vietcombank should now have default indicator
    expect(screen.getByRole('button', { name: 'Đặt làm mặc định cho MB Bank' })).toBeTruthy();

    await screen.unmount();
  });

  it('can open add bank modal, fill form, and add new bank account', async () => {
    const screen = await render(<DriverBankAccountsScreen />);

    const openModalBtn = screen.getByRole('button', { name: 'Thêm tài khoản ngân hàng' });
    await fireEvent.press(openModalBtn);

    expect(screen.getByText('Thêm tài khoản thụ hưởng mới')).toBeTruthy();

    // Select Techcombank
    const techcombankChip = screen.getByRole('button', { name: 'Chọn ngân hàng Techcombank' });
    await fireEvent.press(techcombankChip);

    // Enter account number and holder name
    const accNumberInput = screen.getByPlaceholderText('Nhập số tài khoản');
    await fireEvent.changeText(accNumberInput, '19038889999');

    const holderInput = screen.getByPlaceholderText('Nhập tên chủ tài khoản (không dấu)');
    await fireEvent.changeText(holderInput, 'NGUYEN VAN B');

    // Submit form
    const submitBtn = screen.getByRole('button', { name: 'Xác nhận liên kết' });
    await fireEvent.press(submitBtn);

    // New bank account should appear in list
    expect(screen.getByText('Techcombank')).toBeTruthy();
    expect(screen.getByText('19038889999')).toBeTruthy();
    expect(screen.getByText('NGUYEN VAN B')).toBeTruthy();

    await screen.unmount();
  });

  it('calls router.back when back button is pressed', async () => {
    mockBack.mockClear();
    const screen = await render(<DriverBankAccountsScreen />);

    const backBtn = screen.getByRole('button', { name: 'Quay lại' });
    await fireEvent.press(backBtn);

    expect(mockBack).toHaveBeenCalledTimes(1);

    await screen.unmount();
  });
});
