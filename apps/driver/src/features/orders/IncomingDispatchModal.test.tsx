import { afterEach, describe, expect, it, jest } from '@jest/globals';
import { act, fireEvent, render } from '@testing-library/react-native';
import React from 'react';
import { Animated, PanResponder, Platform, StyleSheet } from 'react-native';

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

    expect(screen.getByText('Đơn mới trong khu vực')).toBeTruthy();
    expect(screen.getByText('Cước thực nhận dự kiến')).toBeTruthy();
    expect(screen.getByText('245.000 ₫')).toBeTruthy();
    expect(screen.getByText('25s')).toBeTruthy();
    expect(screen.getByText('Cách bạn 1.2 km · 4 phút')).toBeTruthy();
    expect(screen.getByText('Khu vực Q.Tân Bình')).toBeTruthy();
    expect(screen.getByText('Khu vực Quận 1')).toBeTruthy();
    expect(screen.queryByText('108 Trường Chinh')).toBeNull();
    expect(screen.queryByText('65 Lê Lợi')).toBeNull();
    expect(screen.getByText('Xe tải thùng kín 2.5T')).toBeTruthy();
    expect(screen.getByText('120 kg linh kiện điện tử')).toBeTruthy();
    expect(screen.getByText('Hàng dễ vỡ, bốc xếp nhẹ tay')).toBeTruthy();

    // Verifies SlideToAction is rendered with Vietnamese label
    expect(screen.getByTestId('dispatch-slide-action')).toBeTruthy();
    expect(screen.getByText('Vuốt để nhận cuốc')).toBeTruthy();

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
    await act(async () => {
      panConfig.onPanResponderGrant?.(mockEvent, { dx: 0, dy: 0 } as any);
      panConfig.onPanResponderMove?.(mockEvent, { dx: 240, dy: 0 } as any);
      panConfig.onPanResponderRelease?.(mockEvent, { dx: 240, dy: 0 } as any);
    });

    expect(onAccept).toHaveBeenCalledWith('ord-incoming-101');
    await screen.unmount();
  });

  it('triggers onAccept via native accessibilityAction activate on SlideToAction', async () => {
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

    await fireEvent(slider, 'accessibilityAction', {
      nativeEvent: { actionName: 'activate' },
    });

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

    expect(screen.queryByText('Đơn mới trong khu vực')).toBeNull();
    await screen.unmount();
  });

  it('renders the vehicle type as a distinct spec chip, not inline text', async () => {
    const screen = await render(
      <IncomingDispatchModal
        offer={{ ...sampleOffer, vehicleLabel: 'Xe tải' }}
        onAccept={jest.fn()}
        onDecline={jest.fn()}
        visible={true}
      />,
    );

    const chip = screen.getByTestId('dispatch-vehicle-spec-chip');
    expect(chip).toBeTruthy();
    expect(screen.getByText('Xe tải')).toBeTruthy();

    await screen.unmount();
  });

  it('uses the contained modal surface on web with dialog role', async () => {
    const originalOS = Platform.OS;
    Platform.OS = 'web';
    const originalAdd = (window as any).addEventListener;
    const originalRemove = (window as any).removeEventListener;
    (window as any).addEventListener = (window as any).addEventListener || jest.fn();
    (window as any).removeEventListener = (window as any).removeEventListener || jest.fn();

    try {
      const screen = await render(
        <IncomingDispatchModal
          offer={sampleOffer}
          onAccept={jest.fn()}
          onDecline={jest.fn()}
          visible={true}
        />,
      );

      const modalSurface = screen.getByTestId('incoming-dispatch-modal');
      expect(modalSurface).toBeTruthy();
      expect(modalSurface.props.accessibilityViewIsModal).toBe(true);

      await screen.unmount();
    } finally {
      Platform.OS = originalOS;
      (window as any).addEventListener = originalAdd;
      (window as any).removeEventListener = originalRemove;
    }
  });

  it('renders Cargo-First dispatch offer with cargo specifications, loading fee badge, and notes', async () => {
    const onAccept = jest.fn();
    const onDecline = jest.fn();

    const cargoOffer: IncomingDispatchOffer = {
      orderId: 'ord-cargo-202',
      pickupAddress: 'Kho Tân Bình, 123 Hoàng Hoa Thám, Tân Bình',
      dropoffAddress: 'Kho Quận 7, 456 Nguyễn Thị Thập, Quận 7',
      earningsAmount: 350000,
      distanceKm: 18.5,
      pickupDistanceKm: 2.4,
      expiresAtEpochMs: Date.now() + 25000,
      cargoName: 'Thiết bị điện máy',
      cargoWeightKg: 450,
      cargoDimensions: '1.8m x 1.2m x 1.0m',
      loadingFee: 100000,
      loadingDescription: 'Bốc xếp 2 đầu',
      specialNotes: 'Hàng dễ vỡ, tránh mưa',
    };

    const screen = await render(
      <IncomingDispatchModal
        offer={cargoOffer}
        onAccept={onAccept}
        onDecline={onDecline}
        visible={true}
      />,
    );

    // Earnings amount formatted in VND with tabular-nums
    expect(screen.getByText('350.000 ₫')).toBeTruthy();

    // Cargo Bento Card: name, weight, dimensions
    expect(screen.getByText('Thiết bị điện máy')).toBeTruthy();
    expect(screen.getByText('450 kg')).toBeTruthy();
    expect(screen.getByText('1.8m x 1.2m x 1.0m')).toBeTruthy();

    // Loading fee badge
    expect(screen.getByText('Bốc xếp 2 đầu (+100.000₫)')).toBeTruthy();

    // Special notes
    expect(screen.getByText('Hàng dễ vỡ, tránh mưa')).toBeTruthy();

    // Distance labels
    expect(screen.getByText('Cách bạn 2.4 km')).toBeTruthy();
    expect(screen.getByText('Lộ trình 18.5 km')).toBeTruthy();

    // SlideToAction uses colorVariant="success" and accepts with orderId
    const slider = screen.getByTestId('dispatch-slide-action');
    const sliderStyle = StyleSheet.flatten(slider.props.style);
    expect(sliderStyle.backgroundColor).toBe('#16A34A');

    await fireEvent(slider, 'accessibilityAction', {
      nativeEvent: { actionName: 'activate' },
    });
    expect(onAccept).toHaveBeenCalledWith('ord-cargo-202');

    await screen.unmount();
  });

  it('renders fallback cargo name when cargoName is omitted', async () => {
    const minimalOffer: IncomingDispatchOffer = {
      orderId: 'ord-cargo-203',
      pickupAddress: 'Điểm lấy',
      dropoffAddress: 'Điểm giao',
      earningsAmount: 200000,
      distanceKm: 10,
      expiresAtEpochMs: Date.now() + 15000,
    };

    const screen = await render(
      <IncomingDispatchModal
        offer={minimalOffer}
        onAccept={jest.fn()}
        onDecline={jest.fn()}
        visible={true}
      />,
    );

    expect(screen.getByText('Hàng hóa tiêu chuẩn')).toBeTruthy();
    await screen.unmount();
  });

  it('does not render loading fee badge when loadingFee is 0 or undefined', async () => {
    const noLoadingOffer: IncomingDispatchOffer = {
      orderId: 'ord-cargo-204',
      pickupAddress: 'Điểm lấy',
      dropoffAddress: 'Điểm giao',
      earningsAmount: 200000,
      distanceKm: 10,
      expiresAtEpochMs: Date.now() + 15000,
      cargoName: 'Thùng carton',
      loadingFee: 0,
    };

    const screen = await render(
      <IncomingDispatchModal
        offer={noLoadingOffer}
        onAccept={jest.fn()}
        onDecline={jest.fn()}
        visible={true}
      />,
    );

    expect(screen.queryByText(/Bốc xếp/)).toBeNull();
    await screen.unmount();
  });

  it('renders cargo thumbnail and opens/closes photo preview modal on tap', async () => {
    const photoOffer: IncomingDispatchOffer = {
      orderId: 'ord-cargo-205',
      pickupAddress: 'Điểm lấy',
      dropoffAddress: 'Điểm giao',
      earningsAmount: 200000,
      distanceKm: 10,
      expiresAtEpochMs: Date.now() + 15000,
      cargoName: 'Máy giặt công nghiệp',
      cargoPhotoUrl: 'https://example.com/cargo-washer.jpg',
    };

    const screen = await render(
      <IncomingDispatchModal
        offer={photoOffer}
        onAccept={jest.fn()}
        onDecline={jest.fn()}
        visible={true}
      />,
    );

    const thumbnail = screen.getByTestId('cargo-photo-thumbnail');
    expect(thumbnail).toBeTruthy();

    // Modal preview initially closed
    expect(screen.queryByTestId('cargo-photo-preview-modal')).toBeNull();

    // Tap thumbnail to open
    await fireEvent.press(thumbnail);
    expect(screen.getByTestId('cargo-photo-preview-modal')).toBeTruthy();

    // Tap close button in preview modal
    const closeBtn = screen.getByTestId('cargo-photo-preview-close');
    await fireEvent.press(closeBtn);
    expect(screen.queryByTestId('cargo-photo-preview-modal')).toBeNull();

    await screen.unmount();
  });

  it('calculates countdown timer from expiresAtEpochMs and auto-declines with orderId', async () => {
    jest.useFakeTimers();
    try {
      const onDecline = jest.fn();
      const epochOffer: IncomingDispatchOffer = {
        orderId: 'ord-cargo-206',
        pickupAddress: 'Điểm lấy',
        dropoffAddress: 'Điểm giao',
        earningsAmount: 200000,
        distanceKm: 10,
        expiresAtEpochMs: Date.now() + 20000,
      };

      const screen = await render(
        <IncomingDispatchModal
          offer={epochOffer}
          onAccept={jest.fn()}
          onDecline={onDecline}
          visible={true}
        />,
      );

      await act(async () => {
        await jest.advanceTimersByTimeAsync(0);
      });

      expect(screen.getByText('20s')).toBeTruthy();

      await act(async () => {
        await jest.advanceTimersByTimeAsync(20000);
      });

      expect(onDecline).toHaveBeenCalledWith('ord-cargo-206');
      await screen.unmount();
    } finally {
      jest.useRealTimers();
    }
  });

  it('declines offer via top "Từ chối" button calling onDecline with orderId', async () => {
    const onDecline = jest.fn();
    const cargoOffer: IncomingDispatchOffer = {
      orderId: 'ord-cargo-207',
      pickupAddress: 'Điểm lấy',
      dropoffAddress: 'Điểm giao',
      earningsAmount: 200000,
      distanceKm: 10,
      expiresAtEpochMs: Date.now() + 15000,
    };

    const screen = await render(
      <IncomingDispatchModal
        offer={cargoOffer}
        onAccept={jest.fn()}
        onDecline={onDecline}
        visible={true}
      />,
    );

    const topDeclineBtn = screen.getByRole('button', { name: 'Từ chối' });
    expect(topDeclineBtn).toBeTruthy();

    await fireEvent.press(topDeclineBtn);
    expect(onDecline).toHaveBeenCalledWith('ord-cargo-207');

    await screen.unmount();
  });
});
