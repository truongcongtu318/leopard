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

  it('renders a compact HUD with live driver identity and no demo KPI values', async () => {
    const onSetAvailability = jest.fn();
    const screen = await render(
      <DriverOrdersScreen
        driverIdentity={{ name: 'Trần Minh', vehicleLabel: 'Xe tải · 29H-123.45' }}
        onSetAvailability={onSetAvailability}
        view={createDriverListFixture('D-LIST-REQUESTED')}
      />,
    );

    // Menu button
    expect(screen.getByTestId('driver-menu-button')).toBeTruthy();

    expect(screen.getByText('Trần Minh')).toBeTruthy();
    expect(screen.getByText('Xe tải · 29H-123.45')).toBeTruthy();
    expect(screen.queryByText('Nguyễn Văn Tuấn')).toBeNull();
    expect(screen.queryByText('51C-889.24 (2.5T)')).toBeNull();

    expect(screen.getByText('Trực tuyến')).toBeTruthy();
    expect(screen.queryByText('4 chuyến · 620.000 ₫ · 5.5h')).toBeNull();
    expect(screen.queryByText('Thu nhập hôm nay')).toBeNull();

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

    expect(screen.getByText('Ngoại tuyến')).toBeTruthy();

    await screen.unmount();
  });

  it('renders the load board without unsafe vehicle filters or production debug actions', async () => {
    const onOpenOrder = jest.fn();
    const screen = await render(
      <DriverOrdersScreen
        onOpenOrder={onOpenOrder}
        view={createDriverListFixture('D-LIST-REQUESTED')}
      />,
    );

    // GestureBottomSheet container
    expect(screen.getByTestId('driver-load-board-sheet')).toBeTruthy();

    // Radar strip is the single place that communicates the scan radius.
    expect(screen.getByText(/Radar đang quét bán kính/)).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Mô phỏng nổ đơn' })).toBeNull();

    // Load-board section header
    expect(screen.getByRole('header', { name: 'Đơn có thể nhận' })).toBeTruthy();

    expect(screen.queryByText('Xe van')).toBeNull();
    expect(screen.queryByText('1.25T')).toBeNull();
    expect(screen.queryByText('2.5T')).toBeNull();

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

  it('renders 15s push offer modal with SlideToAction acceptance', async () => {
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
    expect(screen.getByTestId('dispatch-slide-action')).toBeTruthy();

    await fireEvent(screen.getByTestId('dispatch-slide-action'), 'accessibilityAction', {
      nativeEvent: { actionName: 'activate' },
    });
    expect(onAccept).toHaveBeenCalledWith('offer-15s-1');

    await screen.unmount();
  });

  it('keeps the load-board counter in sync when a compatible order is dismissed', async () => {
    const screen = await render(
      <DriverOrdersScreen view={createDriverListFixture('D-LIST-REQUESTED')} />,
    );

    // Initial state: 2 orders matching
    expect(screen.getByText('2 đơn phù hợp gần bạn')).toBeTruthy();

    // Press "Bỏ qua" on the first order
    const declineButtons = screen.getAllByRole('button', { name: 'Bỏ qua đơn này' });
    expect(declineButtons.length).toBe(2);
    await fireEvent.press(declineButtons[0]);

    // Counter updates to 1 order
    expect(screen.getByText('1 đơn phù hợp gần bạn')).toBeTruthy();

    await screen.unmount();
  });

  it('shows dispatch simulation only in an explicitly enabled preview harness', async () => {
    const screen = await render(
      <DriverOrdersScreen
        showDebugActions
        view={createDriverListFixture('D-LIST-REQUESTED')}
      />,
    );

    expect(screen.getByRole('button', { name: 'Mô phỏng nổ đơn' })).toBeTruthy();
    await screen.unmount();
  });

  it('does not mount a second local sidebar and hides the dock during an active trip', async () => {
    const screen = await render(
      <DriverOrdersScreen view={createDriverListFixture('D-LIST-ACTIVE-REQUESTED')} />,
    );

    expect(screen.queryByTestId('driver-sidebar-container')).toBeNull();
    expect(screen.queryByTestId('driver-bottom-navigation')).toBeNull();
    await screen.unmount();
  });

  it('hides radar scan strip and provides safe contact actions when activeTrip is present', async () => {
    const onNavigate = jest.fn();
    const screen = await render(
      <DriverOrdersScreen
        onNavigate={onNavigate}
        view={createDriverListFixture('D-LIST-ACTIVE-REQUESTED')}
      />,
    );

    // Radar strip MUST NOT be rendered when on active trip
    expect(screen.queryByText(/Radar đang quét bán kính/)).toBeNull();
    expect(screen.queryByRole('button', { name: 'Mô phỏng nổ đơn' })).toBeNull();

    // Contact buttons work safely
    const callBtn = screen.getByTestId('driver-call-btn');
    const chatBtn = screen.getByTestId('driver-chat-btn');

    await fireEvent.press(callBtn);

    await fireEvent.press(chatBtn);
    expect(onNavigate).toHaveBeenCalledWith('/chat');

    await screen.unmount();
  });
});
