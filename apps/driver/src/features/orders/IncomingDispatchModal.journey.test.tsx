import { describe, expect, it, jest } from '@jest/globals';
import React from 'react';
import { render } from '@testing-library/react-native';
import { colors } from '@leopard/mobile-core';
import { IncomingDispatchModal } from './IncomingDispatchModal';

describe('IncomingDispatchModal Journey & HIG Compliance (States 1, 2, 11)', () => {
  const baseOffer = {
    orderId: 'LP-8921',
    pickupAddress: '124 Hoàng Hoa Thám, Ba Đình, Hà Nội',
    dropoffAddress: '58 Trần Duy Hưng, Cầu Giấy, Hà Nội',
    earningsAmount: 245000,
    distanceKm: 8.4,
    pickupDistanceKm: 1.2,
    cargoName: '24 thùng sơn nước',
    vehicleLabel: 'Xe tải 1.5 tấn',
  };

  it('renders prominent 32pt tabular earnings, vehicle and distance (State 1)', async () => {
    const screen = await render(
      <IncomingDispatchModal
        visible
        offer={baseOffer}
        onAccept={jest.fn()}
        onDecline={jest.fn()}
      />
    );
    expect(screen.getByText(/245\.000/)).toBeTruthy();
    expect(screen.getAllByText(/1\.2 km/i).length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText(/Xe tải 1\.5 tấn/i)).toBeTruthy();
    expect(screen.getByText(/Bỏ qua/i)).toBeTruthy();
    expect(screen.getByTestId('dispatch-slide-action')).toBeTruthy();
  });

  it('turns countdown bar red when timer <= 5s (State 2)', async () => {
    const screen = await render(
      <IncomingDispatchModal
        visible
        offer={baseOffer}
        countdownSeconds={4}
        onAccept={jest.fn()}
        onDecline={jest.fn()}
      />
    );
    const progressBar = screen.getByTestId('countdown-progress-bar');
    expect(progressBar).toHaveStyle({ backgroundColor: colors.danger.text });
    expect(screen.getByText(/4s/)).toBeTruthy();
  });

  it('renders Queue Toast at the top when a second offer arrives in background (State 11)', async () => {
    const screen = await render(
      <IncomingDispatchModal
        visible
        offer={baseOffer}
        queuedOfferCount={1}
        onAccept={jest.fn()}
        onDecline={jest.fn()}
      />
    );
    expect(screen.getByTestId('queue-toast')).toBeTruthy();
    expect(screen.getByText(/CÓ 1 ĐƠN KHÁC ĐANG CHỜ TRONG HÀNG/i)).toBeTruthy();
  });
});
