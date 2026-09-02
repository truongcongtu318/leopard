import { describe, expect, it, jest } from '@jest/globals';
import { fireEvent, render } from '@testing-library/react-native';

import { HomeDashboardScreen } from './HomeDashboardScreen';

describe('HomeDashboardScreen', () => {
  it('renders top bar, analytics card, vehicle selection, and handles booking flow', async () => {
    const onSelectVehicleAndBook = jest.fn();
    const onOpenNotifications = jest.fn();
    const onSwitchRole = jest.fn();

    const screen = await render(
      <HomeDashboardScreen
        onOpenNotifications={onOpenNotifications}
        onSelectVehicleAndBook={onSelectVehicleAndBook}
        onSwitchRole={onSwitchRole}
        smeName="Cửa hàng VLXD Đại Phát"
        userName="Anh Hoàng"
      />,
    );

    expect(screen.getByText('Xin chào, Anh Hoàng')).toBeTruthy();
    expect(screen.getByText('Cửa hàng VLXD Đại Phát')).toBeTruthy();
    expect(screen.getByText('1.850.000 ₫')).toBeTruthy();
    expect(screen.getByText('Xe Tải Nhẹ (1.5 Tấn)')).toBeTruthy();

    const notifBtn = screen.getByLabelText(/Thông báo/);
    await fireEvent.press(notifBtn);
    expect(onOpenNotifications).toHaveBeenCalledTimes(1);

    const roleBtn = screen.getByLabelText('Chuyển vai trò');
    await fireEvent.press(roleBtn);
    expect(onSwitchRole).toHaveBeenCalledWith('DRIVER');

    // Click on Ba Gác to select
    const baGacCard = screen.getByRole('radio', { name: /Xe Ba Gác/ });
    await fireEvent.press(baGacCard);

    // Book button
    const bookBtn = screen.getByLabelText(/Đặt .* ngay/);
    await fireEvent.press(bookBtn);

    // Processing modal opens
    expect(screen.getByText('Đang tìm xe & ghép tuyến')).toBeTruthy();

    // Click demo success
    const demoBtn = screen.getByLabelText('Kết nối ngay (Demo)');
    await fireEvent.press(demoBtn);

    expect(onSelectVehicleAndBook).toHaveBeenCalledWith('3_WHEEL_BIKE');
    // FloatingNavBar is hidden by default
    expect(screen.queryByLabelText('Trang chủ')).toBeNull();

    await screen.unmount();
  });

  it('renders floating nav bar when showFloatingNavBar is true', async () => {
    const onNavigateTab = jest.fn();
    const screen = await render(
      <HomeDashboardScreen onNavigateTab={onNavigateTab} showFloatingNavBar={true} />,
    );

    const trackingTab = screen.getByLabelText('Lộ trình');
    expect(trackingTab).toBeTruthy();
    await fireEvent.press(trackingTab);
    expect(onNavigateTab).toHaveBeenCalledWith('tracking');

    await screen.unmount();
  });
});
