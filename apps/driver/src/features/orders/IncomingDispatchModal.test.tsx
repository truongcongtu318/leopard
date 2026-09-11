import { afterEach, describe, expect, it, jest } from '@jest/globals';
import { act, fireEvent, render } from '@testing-library/react-native';
import React from 'react';
import { Animated, PanResponder, StyleSheet } from 'react-native';

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
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('renders incoming offer with prominent fare, route, countdown, and SlideToAction', async () => {
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
    expect(screen.getByText('25s')).toBeTruthy();
    expect(screen.getByText('Cách bạn 1.2 km · 4 phút')).toBeTruthy();
    expect(screen.getByText('Kho Depot Tân Bình, 108 Trường Chinh, Q.Tân Bình')).toBeTruthy();
    expect(screen.getByText('Saigon Centre, 65 Lê Lợi, Bến Nghé, Quận 1')).toBeTruthy();
    expect(screen.getByText('Xe tải thùng kín 2.5T')).toBeTruthy();
    expect(screen.getByText('120 kg linh kiện điện tử')).toBeTruthy();
    expect(screen.getByText('Hàng dễ vỡ, bốc xếp nhẹ tay')).toBeTruthy();

    // Verifies SlideToAction is rendered with Vietnamese label
    expect(screen.getByTestId('dispatch-slide-action')).toBeTruthy();
    expect(screen.getByText('Vuốt để nhận cuốc ➔')).toBeTruthy();

    // Verifies Decline button exists
    expect(screen.getByRole('button', { name: 'Bỏ qua' })).toBeTruthy();

    await screen.unmount();
  });

  it('disables SlideToAction when isAccepting is true', async () => {
    const screen = await render(
      <IncomingDispatchModal
        isAccepting={true}
        offer={sampleOffer}
        onAccept={jest.fn()}
        onDecline={jest.fn()}
        visible={true}
      />,
    );

    const slider = screen.getByTestId('dispatch-slide-action');
    expect(slider.props.accessibilityState.disabled).toBe(true);

    await screen.unmount();
  });

  it('calls onDecline when pressing Bỏ qua with >= 48px touch target', async () => {
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
    const flatStyle = StyleSheet.flatten(declineBtn.props.style);
    const effectiveHeight = Number(flatStyle.minHeight ?? flatStyle.height ?? 0);
    expect(effectiveHeight).toBeGreaterThanOrEqual(48);

    await fireEvent.press(declineBtn);
    expect(onDecline).toHaveBeenCalledWith('ord-incoming-101');

    await screen.unmount();
  });

  it('triggers onAccept when sliding SlideToAction past threshold', async () => {
    const panSpy = jest.spyOn(PanResponder, 'create');
    jest.spyOn(Animated, 'spring').mockImplementation((_, config: any) => ({
      start: (cb?: (result: { finished: boolean }) => void) => {
        cb?.({ finished: true });
        return undefined as any;
      },
      stop: jest.fn(),
      reset: jest.fn(),
    }));

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

    const slider = screen.getByTestId('dispatch-slide-action');
    expect(slider).toBeTruthy();

    const panConfig = panSpy.mock.calls[panSpy.mock.calls.length - 1][0];
    const mockEvent = {} as any;
    panConfig.onPanResponderGrant?.(mockEvent, { dx: 0, dy: 0 } as any);
    panConfig.onPanResponderMove?.(mockEvent, { dx: 240, dy: 0 } as any);
    panConfig.onPanResponderRelease?.(mockEvent, { dx: 240, dy: 0 } as any);

    expect(onAccept).toHaveBeenCalledWith('ord-incoming-101');
    await screen.unmount();
  });

  it('defaults to 15s countdown and auto-declines on timeout', async () => {
    jest.useFakeTimers();
    try {
      const onDecline = jest.fn();
      const offerWithoutTimeout: IncomingDispatchOffer = {
        ...sampleOffer,
        timeoutSeconds: undefined,
      };

      const screen = await render(
        <IncomingDispatchModal
          offer={offerWithoutTimeout}
          onAccept={jest.fn()}
          onDecline={onDecline}
          visible={true}
        />,
      );

      await act(async () => {
        await jest.advanceTimersByTimeAsync(0);
      });

      expect(screen.getByText('15s')).toBeTruthy();

      await act(async () => {
        await jest.advanceTimersByTimeAsync(15000);
      });

      expect(onDecline).toHaveBeenCalledWith('ord-incoming-101');
      await screen.unmount();
    } finally {
      jest.useRealTimers();
    }
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
