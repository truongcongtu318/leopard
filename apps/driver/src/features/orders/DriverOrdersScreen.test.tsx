import { describe, expect, it, jest } from '@jest/globals';
import { fireEvent, render } from '@testing-library/react-native';
import React from 'react';
import { Alert, Linking } from 'react-native';

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

  it('keeps the map full-bleed at Layer 0 with the Grab-style control stack over it', async () => {
    const onNavigate = jest.fn();
    const screen = await render(
      <DriverOrdersScreen
        driverIdentity={{
          name: 'Trần Minh',
          vehiclePlate: '29H-123.45',
          vehicleType: 'Xe tải 1.25T',
        }}
        onNavigate={onNavigate}
        view={createDriverListFixture('D-LIST-REQUESTED')}
      />,
    );

    // No greeting top bar: the reference layout is a pure full-bleed map.
    expect(screen.queryByTestId('driver-glass-topbar')).toBeNull();

    // Vertical map control stack performs real actions.
    expect(screen.getByTestId('driver-map-control-stack')).toBeTruthy();
    await fireEvent.press(screen.getByTestId('driver-map-radius'));
    expect(screen.getByTestId('driver-receiving-settings')).toBeTruthy();

    await screen.unmount();
  });

  it('exposes the floating connection capsule as the single availability control', async () => {
    const onSetAvailability = jest.fn();
    const screen = await render(
      <DriverOrdersScreen
        driverIdentity={{ name: 'Trần Minh', vehiclePlate: '29H-123.45', vehicleType: 'Xe tải 1.25T' }}
        onSetAvailability={onSetAvailability}
        view={createDriverListFixture('D-LIST-REQUESTED')}
      />,
    );

    // Online fixture: the status row confirms dispatch can see the driver, and
    // the subtitle shows the driver's registered vehicle (Home carries no order count —
    // that lives on the "Đơn" tab now).
    expect(screen.getByTestId('driver-connection-status')).toBeTruthy();
    expect(screen.getByText('Bạn đang bật kết nối.')).toBeTruthy();
    // Online capsule is icon-only — the label is already on the status card below it.
    expect(screen.queryByText('Đang nhận cuốc')).toBeNull();
    expect(screen.getByText('29H-123.45 · Xe tải 1.25T')).toBeTruthy();

    await fireEvent.press(screen.getByTestId('driver-connection-toggle'));
    expect(onSetAvailability).toHaveBeenCalledWith('set-availability-demo');

    await screen.unmount();
  });

  it('keeps the offline sheet minimal — status and quick actions only, no order board', async () => {
    const onSetAvailability = jest.fn();
    // D-LIST-EMPTY is the fixture set's offline + no-orders scenario. Matches
    // Grab Driver's own idle sheet: nothing below the quick-action row while
    // offline, since the duty pill already owns the "go online" action.
    const screen = await render(
      <DriverOrdersScreen
        onSetAvailability={onSetAvailability}
        view={createDriverListFixture('D-LIST-EMPTY')}
      />,
    );

    expect(screen.getByText('Bạn đang tắt kết nối.')).toBeTruthy();
    expect(screen.getByText('Bật kết nối')).toBeTruthy();
    expect(screen.getByTestId('driver-quick-action-grid')).toBeTruthy();
    expect(screen.queryByTestId('driver-offline-board')).toBeNull();

    // The pill above the sheet owns the action, so the sheet adds no second button.
    expect(screen.queryByRole('button', { name: 'Bật trực tuyến' })).toBeNull();

    await fireEvent.press(screen.getByTestId('driver-connection-toggle'));
    expect(onSetAvailability).toHaveBeenCalled();

    await screen.unmount();
  });

  it('routes the idle quick-action grid to order list, SOS, wallet and settings', async () => {
    const onNavigate = jest.fn();
    const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
    const screen = await render(
      <DriverOrdersScreen
        onNavigate={onNavigate}
        view={createDriverListFixture('D-LIST-REQUESTED')}
      />,
    );

    expect(screen.getByTestId('driver-quick-action-grid')).toBeTruthy();

    await fireEvent.press(screen.getByTestId('quick-action-order-list'));
    expect(onNavigate).toHaveBeenCalledWith('/board');

    await fireEvent.press(screen.getByTestId('quick-action-sos'));
    expect(alertSpy).toHaveBeenCalledWith(
      'Cuộc gọi khẩn cấp SOS',
      expect.stringContaining('Hiện chưa có số liên hệ'),
      expect.any(Array),
    );
    expect(Linking.openURL).not.toHaveBeenCalled();

    await fireEvent.press(screen.getByTestId('quick-action-wallet'));
    expect(onNavigate).toHaveBeenCalledWith('/wallet');

    await fireEvent.press(screen.getByTestId('quick-action-settings'));
    expect(screen.getByTestId('driver-receiving-settings')).toBeTruthy();

    alertSpy.mockRestore();

    await screen.unmount();
  });

  it('keeps the GestureBottomSheet cockpit mounted as the idle surface', async () => {
    const screen = await render(
      <DriverOrdersScreen view={createDriverListFixture('D-LIST-REQUESTED')} />,
    );

    expect(screen.getByTestId('driver-load-board-sheet')).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Mô phỏng nổ đơn' })).toBeNull();

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
    expect(screen.getByText('Đang chạy')).toBeTruthy();

    // Customer contact actions
    expect(screen.getByTestId('driver-call-btn')).toBeTruthy();
    expect(screen.getByTestId('driver-nav-leg-btn')).toBeTruthy();

    // 4-stage stepper
    expect(screen.getByText('Nhận đơn (ACCEPTED)')).toBeTruthy();

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

  it('hides the debug offer trigger and provides safe contact actions when activeTrip is present', async () => {
    const onNavigate = jest.fn();
    const screen = await render(
      <DriverOrdersScreen
        onNavigate={onNavigate}
        view={createDriverListFixture('D-LIST-ACTIVE-REQUESTED')}
      />,
    );

    expect(screen.queryByRole('button', { name: 'Mô phỏng nổ đơn' })).toBeNull();

    // Contact buttons work safely
    const callBtn = screen.getByTestId('driver-call-btn');
    await fireEvent.press(callBtn);

    await screen.unmount();
  });
});
