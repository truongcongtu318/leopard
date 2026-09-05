import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { fireEvent, render } from '@testing-library/react-native';

import type { CustomerProfileView } from './model';
import { CustomerProfileScreen } from './ProfileScreen';

const mockPush = jest.fn();

jest.mock('expo-router', () => ({
  useRouter: () => ({ push: mockPush, replace: jest.fn() }),
}));

describe('CustomerProfileScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const sampleContentView: CustomerProfileView = {
    scenarioId: 'CP-PROFILE-SUCCESS',
    kind: 'content',
    phone: '0900000001',
    name: null,
    email: null,
    avatarUrl: null,
    roleLabel: 'Khách hàng',
    statusLabel: 'Đang hoạt động',
    statusTone: 'active',
    appVersion: '1.0.0-pilot',
    isLoggingOut: false,
  };

  it('renders user hero card with phone, role, and app version', async () => {
    const screen = await render(<CustomerProfileScreen view={sampleContentView} />);

    expect(screen.getByText('0900000001')).toBeTruthy();
    expect(screen.getByText('Khách hàng')).toBeTruthy();
    expect(screen.getByText(/1.0.0-pilot/)).toBeTruthy();
    expect(screen.getByText('Hồ sơ')).toBeTruthy();
    expect(screen.getByText('CUSTOMER · JOURNEY SHEET')).toBeTruthy();
    await screen.unmount();
  });

  it('renders all modern navigation menu items with accessibility labels', async () => {
    const screen = await render(<CustomerProfileScreen view={sampleContentView} />);

    expect(screen.getByLabelText('Sổ địa chỉ')).toBeTruthy();
    expect(screen.getByLabelText('Ví VietQR')).toBeTruthy();
    expect(screen.getByLabelText('Khuyến mãi & Thanh toán')).toBeTruthy();
    expect(screen.getByLabelText('Trợ giúp & SOS')).toBeTruthy();
    expect(screen.getByLabelText('Cài đặt')).toBeTruthy();
    await screen.unmount();
  });

  it('navigates to corresponding routes when menu items are pressed', async () => {
    const screen = await render(<CustomerProfileScreen view={sampleContentView} />);

    await fireEvent.press(screen.getByLabelText('Sổ địa chỉ'));
    expect(mockPush).toHaveBeenCalledWith('/customer/addresses');

    await fireEvent.press(screen.getByLabelText('Ví VietQR'));
    expect(mockPush).toHaveBeenCalledWith('/customer/wallet');

    await fireEvent.press(screen.getByLabelText('Khuyến mãi & Thanh toán'));
    expect(mockPush).toHaveBeenCalledWith('/customer/promotions');

    await fireEvent.press(screen.getByLabelText('Trợ giúp & SOS'));
    expect(mockPush).toHaveBeenCalledWith('/customer/support');

    await fireEvent.press(screen.getByLabelText('Cài đặt'));
    expect(mockPush).toHaveBeenCalledWith('/customer/settings');
    await screen.unmount();
  });

  it('calls onLogout when logout button is pressed', async () => {
    const onLogout = jest.fn();
    const screen = await render(<CustomerProfileScreen onLogout={onLogout} view={sampleContentView} />);

    const logoutButton = screen.getByRole('button', { name: 'Đăng xuất' });
    await fireEvent.press(logoutButton);

    expect(onLogout).toHaveBeenCalledTimes(1);
    await screen.unmount();
  });

  it('renders error state and triggers onRetry when error view is provided', async () => {
    const onRetry = jest.fn();
    const errorView: CustomerProfileView = {
      scenarioId: 'CP-PROFILE-ERROR',
      kind: 'error',
      title: 'Không thể tải hồ sơ',
      message: 'Lỗi kết nối máy chủ.',
    };

    const screen = await render(<CustomerProfileScreen onRetry={onRetry} view={errorView} />);

    expect(screen.getByText('Không thể tải hồ sơ')).toBeTruthy();
    expect(screen.getByText('Lỗi kết nối máy chủ.')).toBeTruthy();

    const retryButton = screen.getByRole('button', { name: 'Thử lại' });
    await fireEvent.press(retryButton);
    expect(onRetry).toHaveBeenCalledTimes(1);
    await screen.unmount();
  });
});
