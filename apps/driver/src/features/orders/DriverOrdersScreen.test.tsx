import { describe, expect, it, jest } from '@jest/globals';
import { fireEvent, render } from '@testing-library/react-native';
import React from 'react';

import { DriverOrdersScreen } from './DriverOrdersScreen';
import { createDriverListFixture } from './fixtures';

describe('DriverOrdersScreen - Hero Duty Control & Dispatch', () => {
  it('renders large hero online switch and 15s countdown push offer modal', async () => {
    const screen = await render(
      <DriverOrdersScreen view={createDriverListFixture('D-LIST-ACTIVE-REQUESTED')} />,
    );

    // Hero Duty Control: Large prominent switch for TRỰC TUYẾN / NGOẠI TUYẾN
    expect(screen.getByText('TRỰC TUYẾN')).toBeTruthy();
    expect(screen.getByText('NGOẠI TUYẾN')).toBeTruthy();

    // In-day operational stats: Completed trips, today's income, online hours
    expect(screen.getByText('Chuyến xong')).toBeTruthy();
    expect(screen.getByText('Thu nhập hôm nay')).toBeTruthy();
    expect(screen.getByText('Giờ online')).toBeTruthy();

    // Load-board section header
    expect(screen.getByRole('header', { name: 'Đơn có thể nhận' })).toBeTruthy();

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
