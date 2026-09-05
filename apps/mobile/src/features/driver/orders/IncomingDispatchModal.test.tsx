import { describe, expect, it, jest } from '@jest/globals';
import { fireEvent, render } from '@testing-library/react-native';
import React from 'react';

import { IncomingDispatchModal } from './IncomingDispatchModal';
import type { IncomingDispatchOffer } from './IncomingDispatchModal';

const sampleOffer: IncomingDispatchOffer = {
  id: 'ord-incoming-101',
  reference: 'LP-D-260905-101',
  pickupDistanceLabel: '1.2 km · 4 phút',
  pickupAddress: 'Kho Depot Tân Bình, 108 Trường Chinh, Q.Tân Bình',
  dropoffAddress: 'Saigon Centre, 65 Lê Lợi, Bến Nghé, Quận 1',
  tripDistanceLabel: '14.2 km',
  etaLabel: '28 phút',
  priceLabel: '245.000 ₫',
  vehicleLabel: 'Xe tải thùng kín 2.5T',
  cargoSummary: '120 kg linh kiện điện tử',
  notes: 'Hàng dễ vỡ, bốc xếp nhẹ tay',
  timeoutSeconds: 25,
};

describe('IncomingDispatchModal', () => {
  it('renders incoming offer with prominent fare, route, and countdown', async () => {
    const onAccept = jest.fn();
    const onDecline = jest.fn();

    const screen = await render(
      <IncomingDispatchModal
        offer={sampleOffer}
        onAccept={onAccept}
        onDecline={onDecline}
        visible={true}
      />,
    );

    expect(screen.getByText('ĐƠN HÀNG MỚI TRONG KHU VỰC')).toBeTruthy();
    expect(screen.getByText('CƯỚC THỰC NHẬN DỰ KIẾN')).toBeTruthy();
    expect(screen.getByText('245.000 ₫')).toBeTruthy();
    expect(screen.getByText('Cách bạn 1.2 km · 4 phút')).toBeTruthy();
    expect(screen.getByText('Kho Depot Tân Bình, 108 Trường Chinh, Q.Tân Bình')).toBeTruthy();
    expect(screen.getByText('Saigon Centre, 65 Lê Lợi, Bến Nghé, Quận 1')).toBeTruthy();
    expect(screen.getByText('Xe tải thùng kín 2.5T')).toBeTruthy();
    expect(screen.getByText('120 kg linh kiện điện tử')).toBeTruthy();
    expect(screen.getByText('Hàng dễ vỡ, bốc xếp nhẹ tay')).toBeTruthy();

    const acceptBtn = screen.getByRole('button', { name: 'NHẬN ĐƠN NGAY' });
    await fireEvent.press(acceptBtn);
    expect(onAccept).toHaveBeenCalledWith('ord-incoming-101');

    await screen.unmount();
  });

  it('calls onDecline when pressing Bỏ qua', async () => {
    const onAccept = jest.fn();
    const onDecline = jest.fn();

    const screen = await render(
      <IncomingDispatchModal
        offer={sampleOffer}
        onAccept={onAccept}
        onDecline={onDecline}
        visible={true}
      />,
    );

    const declineBtn = screen.getByRole('button', { name: 'Bỏ qua' });
    await fireEvent.press(declineBtn);
    expect(onDecline).toHaveBeenCalledWith('ord-incoming-101');

    await screen.unmount();
  });

  it('renders nothing when visible is false', async () => {
    const screen = await render(
      <IncomingDispatchModal
        offer={sampleOffer}
        onAccept={jest.fn()}
        onDecline={jest.fn()}
        visible={false}
      />,
    );

    expect(screen.queryByText('ĐƠN HÀNG MỚI TRONG KHU VỰC')).toBeNull();
    await screen.unmount();
  });
});
