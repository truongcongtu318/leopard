import { describe, expect, it, jest } from '@jest/globals';
import { fireEvent, render } from '@testing-library/react-native';

import { type DriverInfo, RealtimeTrackingScreen, type TripBookingDetails } from './RealtimeTrackingScreen';

const mockDriver: DriverInfo = {
  name: 'Nguyễn Văn Hùng',
  rating: 4.8,
  totalTrips: 342,
  phone: '0901234567',
  vehiclePlate: '59C-882.14',
  vehicleType: 'Xe Tải Nặng',
  vehicleCapacity: '5 Tấn',
};

const mockTrip: TripBookingDetails = {
  bookingCode: '#LP-00201',
  origin: 'Kho VLXD Tân Bình',
  destination: 'KCN Tân Tạo, Bình Tân',
  cargoLabel: 'Xi Măng Hà Tiên',
  weightKg: 3000,
  priceVnd: '850.000 ₫',
  distanceTotalKm: 12.5,
  distanceRemainingKm: 1.5,
  etaMinutes: 10,
  etaLabel: '10 phút',
  status: 'IN_TRANSIT',
  hasDeliveryProof: false,
};

describe('RealtimeTrackingScreen', () => {
  it('renders map area with status and live badge', async () => {
    const screen = await render(
      <RealtimeTrackingScreen
        driver={mockDriver}
        trip={mockTrip}
      />,
    );

    expect(screen.getByText('Đang vận chuyển')).toBeTruthy();
    expect(screen.getByText('LIVE')).toBeTruthy();
    expect(screen.getByText('10 phút')).toBeTruthy();

    await screen.unmount();
  });

  it('renders driver info with name, rating, and action buttons', async () => {
    const onCallDriver = jest.fn();
    const onChatDriver = jest.fn();

    const screen = await render(
      <RealtimeTrackingScreen
        driver={mockDriver}
        onCallDriver={onCallDriver}
        onChatDriver={onChatDriver}
        trip={mockTrip}
      />,
    );

    expect(screen.getByText('Nguyễn Văn Hùng')).toBeTruthy();
    expect(screen.getByText('⭐ 4.8')).toBeTruthy();
    expect(screen.getByText('342 chuyến')).toBeTruthy();

    const callBtn = screen.getByLabelText('Gọi điện tài xế');
    await fireEvent.press(callBtn);
    expect(onCallDriver).toHaveBeenCalledTimes(1);

    const chatBtn = screen.getByLabelText('Nhắn tin tài xế');
    await fireEvent.press(chatBtn);
    expect(onChatDriver).toHaveBeenCalledTimes(1);

    await screen.unmount();
  });

  it('renders trip progress with distance and ETA', async () => {
    const screen = await render(
      <RealtimeTrackingScreen
        driver={mockDriver}
        trip={mockTrip}
      />,
    );

    expect(screen.getByText('Tiến trình giao hàng')).toBeTruthy();
    expect(screen.getByText('ETA dự kiến: 10 phút')).toBeTruthy();
    expect(screen.getByText('11.0 km đã đi')).toBeTruthy();
    expect(screen.getByText('1.5 km còn lại')).toBeTruthy();

    await screen.unmount();
  });

  it('renders booking details and VietQR button', async () => {
    const onShowVietQR = jest.fn();

    const screen = await render(
      <RealtimeTrackingScreen
        driver={mockDriver}
        onShowVietQR={onShowVietQR}
        trip={mockTrip}
      />,
    );

    expect(screen.getByText('#LP-00201')).toBeTruthy();
    expect(screen.getByText('59C-882.14')).toBeTruthy();
    expect(screen.getByText('850.000 ₫')).toBeTruthy();

    const vietQRBtn = screen.getByLabelText('Hiện VietQR thanh toán');
    await fireEvent.press(vietQRBtn);
    expect(onShowVietQR).toHaveBeenCalledTimes(1);

    await screen.unmount();
  });

  it('renders delivery proof section when hasDeliveryProof is true', async () => {
    const onViewProof = jest.fn();

    const tripWithProof: TripBookingDetails = {
      ...mockTrip,
      status: 'DELIVERED',
      hasDeliveryProof: true,
      distanceRemainingKm: 0,
      etaMinutes: 0,
      etaLabel: 'Đã giao',
    };

    const screen = await render(
      <RealtimeTrackingScreen
        driver={mockDriver}
        onViewDeliveryProof={onViewProof}
        trip={tripWithProof}
      />,
    );

    expect(screen.getByText('Ảnh xác nhận giao hàng')).toBeTruthy();
    expect(screen.getByText('✓ Đã xác nhận')).toBeTruthy();

    const proofBtn = screen.getByLabelText('Xem ảnh xác nhận giao hàng');
    await fireEvent.press(proofBtn);
    expect(onViewProof).toHaveBeenCalledTimes(1);

    await screen.unmount();
  });

  it('hides delivery proof section when hasDeliveryProof is false', async () => {
    const screen = await render(
      <RealtimeTrackingScreen
        driver={mockDriver}
        trip={mockTrip}
      />,
    );

    expect(screen.queryByText('Ảnh xác nhận giao hàng')).toBeNull();

    await screen.unmount();
  });

  it('renders live telemetry tracking and vat invoice action button', async () => {
    const onViewInvoice = jest.fn();
    const screen = await render(
      <RealtimeTrackingScreen
        driver={mockDriver}
        onViewInvoice={onViewInvoice}
        trip={mockTrip}
      />,
    );

    expect(screen.getByText(/ETA dự kiến/)).toBeTruthy();
    expect(screen.getByText('Hóa đơn điện tử VAT 8%')).toBeTruthy();

    const invoiceBtn = screen.getByLabelText('Tải hóa đơn VAT');
    await fireEvent.press(invoiceBtn);
    expect(onViewInvoice).toHaveBeenCalledTimes(1);

    await screen.unmount();
  });

  it('renders driver card with 4.98★ rating and masked phone action', async () => {
    const driverVip: DriverInfo = {
      ...mockDriver,
      rating: 4.98,
      phone: '0901234567',
    };

    const screen = await render(
      <RealtimeTrackingScreen
        driver={driverVip}
        trip={mockTrip}
      />,
    );

    expect(screen.getByText('⭐ 4.98')).toBeTruthy();
    expect(screen.getByText('0901 *** 567')).toBeTruthy();

    await screen.unmount();
  });
});
