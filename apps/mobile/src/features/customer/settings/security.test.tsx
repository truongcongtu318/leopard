import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';
import { fireEvent, render } from '@testing-library/react-native';
import { sessionStore } from '@leopard/mobile-core';

import { CustomerSecurityScreen } from './CustomerSecurityScreen';

const mockPush = jest.fn();
const mockReplace = jest.fn();
const mockBack = jest.fn();

jest.mock('expo-router', () => ({
  useRouter: () => ({
    push: mockPush,
    replace: mockReplace,
    back: mockBack,
  }),
}));

describe('CustomerSecurityScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(sessionStore, 'clearSession').mockImplementation(async () => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('renders all main security sections: header, PIN change, biometrics, Apple account deletion', async () => {
    const screen = await render(<CustomerSecurityScreen />);

    expect(screen.getByText('Bảo mật tài khoản')).toBeTruthy();
    expect(screen.getByLabelText('Quay lại')).toBeTruthy();

    // PIN section
    expect(screen.getByText('MÃ PIN THANH TOÁN')).toBeTruthy();
    expect(screen.getByPlaceholderText('Nhập mã PIN hiện tại')).toBeTruthy();
    expect(screen.getByPlaceholderText('Nhập mã PIN mới (6 số)')).toBeTruthy();
    expect(screen.getByPlaceholderText('Xác nhận mã PIN mới')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Cập nhật mã PIN' })).toBeTruthy();

    // Biometric section
    expect(screen.getByText('SINH TRẮC HỌC')).toBeTruthy();
    expect(screen.getByText('Đăng nhập bằng FaceID / Vân tay')).toBeTruthy();

    // Account Deletion section (Apple 5.1.1)
    expect(screen.getByText('QUẢN LÝ DỮ LIỆU & TÀI KHOẢN')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Xóa tài khoản vĩnh viễn' })).toBeTruthy();
  });

  it('handles back button navigation', async () => {
    const screen = await render(<CustomerSecurityScreen />);

    await fireEvent.press(screen.getByLabelText('Quay lại'));
    expect(mockBack).toHaveBeenCalledTimes(1);
  });

  it('toggles biometric switch', async () => {
    const screen = await render(<CustomerSecurityScreen />);

    expect(screen.getByTestId('switch-biometric').props.value).toBe(true);

    await fireEvent(screen.getByTestId('switch-biometric'), 'valueChange', false);
    expect(screen.getByTestId('switch-biometric').props.value).toBe(false);

    await fireEvent(screen.getByTestId('switch-biometric'), 'valueChange', true);
    expect(screen.getByTestId('switch-biometric').props.value).toBe(true);
  });

  it('validates and handles PIN change with error and success states', async () => {
    const screen = await render(<CustomerSecurityScreen />);

    const currentPinInput = screen.getByPlaceholderText('Nhập mã PIN hiện tại');
    const newPinInput = screen.getByPlaceholderText('Nhập mã PIN mới (6 số)');
    const confirmPinInput = screen.getByPlaceholderText('Xác nhận mã PIN mới');
    const updatePinBtn = screen.getByRole('button', { name: 'Cập nhật mã PIN' });

    // Try submit empty
    await fireEvent.press(updatePinBtn);
    expect(screen.getByText('Vui lòng điền đầy đủ thông tin mã PIN.')).toBeTruthy();

    // Try submit mismatched PINs
    await fireEvent.changeText(currentPinInput, '123456');
    await fireEvent.changeText(newPinInput, '654321');
    await fireEvent.changeText(confirmPinInput, '111111');
    await fireEvent.press(updatePinBtn);
    expect(screen.getByText('Mã PIN mới và xác nhận mã PIN không khớp.')).toBeTruthy();

    // Try submit invalid length
    await fireEvent.changeText(newPinInput, '123');
    await fireEvent.changeText(confirmPinInput, '123');
    await fireEvent.press(updatePinBtn);
    expect(screen.getByText('Mã PIN mới phải bao gồm đúng 6 chữ số.')).toBeTruthy();

    // Valid PIN change
    await fireEvent.changeText(newPinInput, '987654');
    await fireEvent.changeText(confirmPinInput, '987654');
    await fireEvent.press(updatePinBtn);
    expect(screen.getByText('Cập nhật mã PIN thanh toán thành công!')).toBeTruthy();
  });

  it('handles Apple Guideline 5.1.1 account deletion flow: modal open, cancellation, confirm & clear session', async () => {
    const screen = await render(<CustomerSecurityScreen />);

    const deleteBtn = screen.getByRole('button', { name: 'Xóa tài khoản vĩnh viễn' });

    // Modal initially not visible
    expect(screen.queryByText('Xác nhận xóa tài khoản vĩnh viễn?')).toBeNull();

    // Open deletion modal
    await fireEvent.press(deleteBtn);
    expect(screen.getByText('Xác nhận xóa tài khoản vĩnh viễn?')).toBeTruthy();
    expect(
      screen.getByText(
        /Toàn bộ thông tin doanh nghiệp, lịch sử đơn hàng, hạn mức tín dụng công nợ và điểm thưởng sẽ bị xóa vĩnh viễn/
      )
    ).toBeTruthy();

    // Cancel deletion
    const cancelBtn = screen.getByRole('button', { name: 'Hủy bỏ' });
    await fireEvent.press(cancelBtn);

    // Modal closes
    expect(screen.queryByText('Xác nhận xóa tài khoản vĩnh viễn?')).toBeNull();
    expect(sessionStore.clearSession).not.toHaveBeenCalled();
    expect(mockReplace).not.toHaveBeenCalled();

    // Reopen modal and confirm deletion
    await fireEvent.press(deleteBtn);
    expect(screen.getByText('Xác nhận xóa tài khoản vĩnh viễn?')).toBeTruthy();

    const confirmDeleteBtn = screen.getByRole('button', { name: 'Tôi hiểu và xác nhận xóa' });
    await fireEvent.press(confirmDeleteBtn);

    expect(sessionStore.clearSession).toHaveBeenCalledTimes(1);
    expect(mockReplace).toHaveBeenCalledWith('/(public)/login');
  });
});
