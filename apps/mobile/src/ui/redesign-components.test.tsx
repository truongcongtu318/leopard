import { describe, expect, it, jest } from '@jest/globals';
import { fireEvent, render } from '@testing-library/react-native';

import { AnalyticsHeroCard } from './AnalyticsHeroCard';
import { FloatingNavBar } from './FloatingNavBar';
import { ProcessingModal } from './ProcessingModal';
import { VehicleSelectCard } from './VehicleSelectCard';

describe('VehicleSelectCard', () => {
  const mockVehicle = {
    id: 'LIGHT_TRUCK' as const,
    name: 'Light Truck',
    vietnameseName: 'Xe Tải Nhẹ (1.5 Tấn)',
    capacity: '500kg - 1.5 Tấn',
    dimensions: '3.2m x 1.6m x 1.7m',
    idealFor: 'Chuyển nhà, hàng đóng thùng',
    icon: '🚚',
    badge: 'Phổ biến nhất',
    estimatedPrice: 'Từ 250.000 ₫',
  };

  it('renders vehicle information and handles selection click', async () => {
    const onSelect = jest.fn();
    const screen = await render(
      <VehicleSelectCard onSelect={onSelect} selected={false} vehicle={mockVehicle} />,
    );

    expect(screen.getByText('Xe Tải Nhẹ (1.5 Tấn)')).toBeTruthy();
    expect(screen.getByText('Tải trọng: 500kg - 1.5 Tấn')).toBeTruthy();
    expect(screen.getByText('Phổ biến nhất')).toBeTruthy();
    expect(screen.getByText('Từ 250.000 ₫')).toBeTruthy();

    const card = screen.getByRole('radio');
    await fireEvent.press(card);
    expect(onSelect).toHaveBeenCalledWith('LIGHT_TRUCK');

    await screen.unmount();
  });
});

describe('AnalyticsHeroCard', () => {
  it('renders balance, bookings count and handles top-up action', async () => {
    const onTopUp = jest.fn();
    const onViewBookings = jest.fn();

    const screen = await render(
      <AnalyticsHeroCard
        activeBookingsCount={2}
        aiEtaAccuracy="94%"
        balance="1.850.000 ₫"
        onTopUp={onTopUp}
        onViewActiveBookings={onViewBookings}
      />,
    );

    expect(screen.getByText('1.850.000 ₫')).toBeTruthy();
    expect(screen.getByText('2 chuyến đang chạy')).toBeTruthy();
    expect(screen.getByText('AI ETA: 94%')).toBeTruthy();

    const topUpBtn = screen.getByLabelText('Nạp tiền nhanh VietQR');
    await fireEvent.press(topUpBtn);
    expect(onTopUp).toHaveBeenCalledTimes(1);

    const bookingBadge = screen.getByRole('button', { name: 'Có 2 chuyến đang vận chuyển' });
    await fireEvent.press(bookingBadge);
    expect(onViewBookings).toHaveBeenCalledTimes(1);

    await screen.unmount();
  });
});

describe('ProcessingModal', () => {
  it('renders processing modal and handles cancel and demo buttons', async () => {
    const onCancel = jest.fn();
    const onSuccessDemo = jest.fn();

    const screen = await render(
      <ProcessingModal
        onCancel={onCancel}
        onSuccessDemo={onSuccessDemo}
        visible={true}
      />,
    );

    expect(screen.getByText('Đang tìm xe & ghép tuyến')).toBeTruthy();

    const cancelBtn = screen.getByLabelText('Hủy tìm xe');
    await fireEvent.press(cancelBtn);
    expect(onCancel).toHaveBeenCalledTimes(1);

    const demoBtn = screen.getByLabelText('Kết nối ngay (Demo)');
    await fireEvent.press(demoBtn);
    expect(onSuccessDemo).toHaveBeenCalledTimes(1);

    await screen.unmount();
  });
});

describe('FloatingNavBar', () => {
  it('renders 4 navigation tabs and switches tab when clicked', async () => {
    const onTabChange = jest.fn();

    const screen = await render(
      <FloatingNavBar activeTab="home" onTabChange={onTabChange} />,
    );

    expect(screen.getByText('Trang chủ')).toBeTruthy();
    expect(screen.getByText('Đơn hàng')).toBeTruthy();
    expect(screen.getByText('Đang giao')).toBeTruthy();
    expect(screen.getByText('Tài khoản')).toBeTruthy();

    const trackingTab = screen.getByLabelText('Đang giao');
    await fireEvent.press(trackingTab);
    expect(onTabChange).toHaveBeenCalledWith('tracking');

    await screen.unmount();
  });
});
