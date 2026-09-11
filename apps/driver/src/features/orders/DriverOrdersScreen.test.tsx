import { describe, expect, it, jest } from '@jest/globals';
import { fireEvent, render } from '@testing-library/react-native';
import React from 'react';

import { DriverOrdersScreen } from './DriverOrdersScreen';
import { createDriverListFixture } from './fixtures';

describe('DriverOrdersScreen - Map-First Field Cockpit Overhaul', () => {
  it('renders full-bleed RealInteractiveMap Layer 0 without static mountain background image', async () => {
    const screen = await render(
      <DriverOrdersScreen view={createDriverListFixture('D-LIST-REQUESTED')} />,
    );

    // Layer 0: RealInteractiveMap rendered full-bleed
    expect(screen.getByTestId('driver-map-canvas')).toBeTruthy();

    // Verification: Static mountain background image MUST NOT exist
    expect(
      screen.queryByLabelText('Hình ảnh xe tải vận tải LEOPARD trên cung đường đèo núi'),
    ).toBeNull();

    await screen.unmount();
  });

  it('renders floating glass HUD with hero duty switch, plate, and mini KPI stats', async () => {
    const onSetAvailability = jest.fn();
    const screen = await render(
      <DriverOrdersScreen
        onSetAvailability={onSetAvailability}
        view={createDriverListFixture('D-LIST-REQUESTED')}
      />,
    );

    // Menu button
    expect(screen.getByTestId('driver-menu-button')).toBeTruthy();

    // Plate & vehicle type
    expect(screen.getByText('51C-889.24 (2.5T)')).toBeTruthy();

    // Hero Duty Switch
    expect(screen.getByText('TRỰC TUYẾN')).toBeTruthy();
    expect(screen.getByText('NGOẠI TUYẾN')).toBeTruthy();

    // Mini KPI stats
    expect(screen.getByText('4 chuyến · 620.000 ₫ · 5.5h')).toBeTruthy();
    expect(screen.getByText('Chuyến xong')).toBeTruthy();
    expect(screen.getByText('Thu nhập hôm nay')).toBeTruthy();
    expect(screen.getByText('Giờ online')).toBeTruthy();

    // Toggle duty availability
    const toggle = screen.getByTestId('driver-availability-toggle');
    await fireEvent.press(toggle);
    expect(onSetAvailability).toHaveBeenCalledWith('set-availability-demo');

    await screen.unmount();
  });

  it('renders offline hero duty state when driver is offline', async () => {
    const screen = await render(
      <DriverOrdersScreen view={createDriverListFixture('D-LIST-OFFLINE')} />,
    );

    expect(screen.getByText('TRỰC TUYẾN')).toBeTruthy();
    expect(screen.getByText('NGOẠI TUYẾN')).toBeTruthy();

    await screen.unmount();
  });

  it('renders GestureBottomSheet with B2B load-board and vehicle filter chips when idle', async () => {
    const onOpenOrder = jest.fn();
    const screen = await render(
      <DriverOrdersScreen
        onOpenOrder={onOpenOrder}
        view={createDriverListFixture('D-LIST-REQUESTED')}
      />,
    );

    // GestureBottomSheet container
    expect(screen.getByTestId('driver-load-board-sheet')).toBeTruthy();

    // Radar strip info & simulate button
    expect(screen.getByText(/Radar đang quét bán kính/)).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Mô phỏng nổ đơn' })).toBeTruthy();

    // Load-board section header
    expect(screen.getByRole('header', { name: 'Đơn có thể nhận' })).toBeTruthy();

    // B2B vehicle filter chips
    expect(screen.getByText('Xe van')).toBeTruthy();
    expect(screen.getByText('1.25T')).toBeTruthy();
    expect(screen.getByText('2.5T')).toBeTruthy();

    // Double-Bezel order cards
    expect(screen.getByText('LP-D-260815-101')).toBeTruthy();
    expect(screen.getByText('285.000 ₫')).toBeTruthy();

    await screen.unmount();
  });

  it('transitions to active trip card with route spine and customer contact buttons when active', async () => {
    const onOpenOrder = jest.fn();
    const screen = await render(
      <DriverOrdersScreen
        onOpenOrder={onOpenOrder}
        view={createDriverListFixture('D-LIST-ACTIVE-REQUESTED')}
      />,
    );

    // Active trip slab
    expect(screen.getByTestId('driver-active-trip-slab')).toBeTruthy();
    expect(screen.getByText('Chuyến đang thực hiện')).toBeTruthy();
    expect(screen.getByText('ĐANG CHẠY')).toBeTruthy();

    // Customer contact actions
    expect(screen.getByTestId('driver-call-btn')).toBeTruthy();
    expect(screen.getByTestId('driver-chat-btn')).toBeTruthy();

    // Route spine A -> B
    expect(screen.getByText('Kho VLXD Minh Khang — Tân Phú')).toBeTruthy();
    expect(screen.getByText('Công trình Chung cư An Phú — TP. Thủ Đức')).toBeTruthy();

    // Open active trip cockpit
    await fireEvent.press(screen.getByRole('button', { name: /Mở chuyến LP-D-260815-001/ }));
    expect(onOpenOrder).toHaveBeenCalledWith('22222222-2222-4222-8222-222222222001');

    await screen.unmount();
  });

  it('renders 15s push offer modal with NHẬN CUỐC NGAY button', async () => {
    const onAccept = jest.fn();
    const onDecline = jest.fn();

    const sampleOffer = {
      id: 'offer-15s-1',
      reference: 'ORD-15S-001',
      pickupDistanceLabel: '0.8 km',
      pickupAddress: 'Kho Tân Bình, Q. Tân Bình, TP.HCM',
      dropoffAddress: 'KCN Sóng Thần 1, Dĩ An, Bình Dương',
      tripDistanceLabel: '24.5 km',
      etaLabel: '45 phút',
      priceLabel: '485.000 ₫',
      vehicleLabel: 'Xe tải 2.5T',
      cargoSummary: 'Kiện pallet (1.8 tấn)',
      timeoutSeconds: 15,
    };

    const screen = await render(
      <DriverOrdersScreen
        incomingOffer={sampleOffer}
        onAcceptIncomingOffer={onAccept}
        onDeclineIncomingOffer={onDecline}
        view={createDriverListFixture('D-LIST-ACTIVE-REQUESTED')}
      />,
    );

    expect(screen.getByText('15s')).toBeTruthy();
    expect(screen.getByText('485.000 ₫')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'NHẬN CUỐC NGAY' })).toBeTruthy();

    await fireEvent.press(screen.getByRole('button', { name: 'NHẬN CUỐC NGAY' }));
    expect(onAccept).toHaveBeenCalledWith('offer-15s-1');

    await screen.unmount();
  });
});
