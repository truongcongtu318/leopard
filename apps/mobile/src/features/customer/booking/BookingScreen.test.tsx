import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { fireEvent, render, waitFor } from '@testing-library/react-native';
import React from 'react';
import * as Location from 'expo-location';
import { httpClient } from '@leopard/mobile-core';
import { BookingScreen } from './BookingScreen';
import { bookingDraftStore } from './bookingDraftStore';

jest.mock('expo-location', () => ({
  Accuracy: { High: 6, Balanced: 3 },
  PermissionStatus: { GRANTED: 'granted', DENIED: 'denied', UNDETERMINED: 'undetermined' },
  getCurrentPositionAsync: jest.fn<() => Promise<any>>(),
  requestForegroundPermissionsAsync: jest
    .fn<() => Promise<{ status: string }>>()
    .mockResolvedValue({ status: 'denied' }),
}));

/**
 * Distance and fare now come from the routing backend, so every case below
 * stubs `/orders/estimate` and asserts against those real numbers.
 */
function mockEstimate(distanceM: number, durationS: number) {
  return jest.spyOn(httpClient, 'post').mockResolvedValue({ routes: [{ distanceM, durationS }] } as never);
}

const ROUTE_PROPS = {
  initialDropoff: 'Công trình Jamona City',
  initialDropoffLat: 10.7325,
  initialDropoffLng: 106.7351,
  initialPickup: 'Kho VLXD Đại Phát',
  initialPickupLat: 10.8421,
  initialPickupLng: 106.6192,
} as const;

describe('BookingScreen Full Page Flow', () => {
  beforeEach(() => {
    bookingDraftStore.reset();
    jest.restoreAllMocks();
  });

  it('shows the routed distance and duration returned by the estimate API', async () => {
    mockEstimate(5_000, 1_200);
    const screen = await render(<BookingScreen {...ROUTE_PROPS} />);

    expect((await screen.findAllByText('Kho VLXD Đại Phát')).length).toBeGreaterThan(0);
    expect((await screen.findAllByText('Công trình Jamona City')).length).toBeGreaterThan(0);
    // 5 km and 20 minutes are the server's numbers, not a placeholder.
    expect(await screen.findByText(/Khoảng 5,0 km · dự kiến 20 phút/)).toBeTruthy();
  });

  it('prices the trip from the real distance rather than the base fare', async () => {
    // 20 km × 18,000 = 360,000 + 200,000 base fare = 560,000 VND.
    mockEstimate(20_000, 2_400);
    const screen = await render(<BookingScreen {...ROUTE_PROPS} />);

    expect((await screen.findAllByText('560.000 đ')).length).toBeGreaterThan(0);
  });

  it('recalculates fare live to 475,200 VND when loading (+150k) and VAT (+8%) are enabled', async () => {
    mockEstimate(5_000, 1_200);
    const screen = await render(<BookingScreen {...ROUTE_PROPS} />);

    // Wait for the estimate so the fare exists before toggling add-ons.
    await screen.findByText(/Khoảng 5,0 km/);

    fireEvent(await screen.findByLabelText('Tài xế hỗ trợ bốc xếp'), 'valueChange', true);
    fireEvent(await screen.findByLabelText('Xuất hóa đơn VAT'), 'valueChange', true);

    // Base 200k + Distance 90k (5 km * 18k) = 290k; Loading 150k = 440k; VAT 8% = 35.2k => 475.200 đ
    expect((await screen.findAllByText('475.200 đ')).length).toBeGreaterThan(0);
  });

  it('never quotes a fare before the real distance is known', async () => {
    // No estimate available: the screen must withhold the price, not fall back
    // to the base fare or a hardcoded kilometre figure.
    jest.spyOn(httpClient, 'post').mockRejectedValue(new Error('routing unavailable'));
    const screen = await render(<BookingScreen {...ROUTE_PROPS} />);

    expect((await screen.findAllByText('Đang tính…')).length).toBeGreaterThan(0);
    expect(screen.queryByText(/Khoảng \d/)).toBeNull();
    // The 1.25T base fare must not stand in for a real computed fare.
    expect(screen.queryByText('200.000 đ')).toBeNull();
  });

  it('leaves the pickup and dropoff blank when the route was never chosen', async () => {
    mockEstimate(5_000, 1_200);
    const screen = await render(<BookingScreen />);

    // No placeholder warehouse or destination is injected.
    expect(screen.queryByText(/Kho VLXD Đại Phát/)).toBeNull();
    expect(screen.queryByText(/Jamona City/)).toBeNull();
    // And with no coords there is no estimate, so no fare is quoted.
    expect((await screen.findAllByText('Đang tính…')).length).toBeGreaterThan(0);
    expect(screen.queryByText('200.000 đ')).toBeNull();
  });

  it('allows user to switch vehicle type when initialVehicleId is provided', async () => {
    mockEstimate(5_000, 1_200);
    const screen = await render(
      <BookingScreen {...ROUTE_PROPS} initialVehicleId="TRUCK_125T" />,
    );

    await screen.findByText(/Khoảng 5,0 km/);
    expect(bookingDraftStore.getDraft().vehicleId).toBe('TRUCK_125T');

    // Tap on 'Xe Van 500kg'
    const vanOption = await screen.findByText('Xe Van 500kg');
    fireEvent.press(vanOption);

    await waitFor(() => {
      expect(bookingDraftStore.getDraft().vehicleId).toBe('VAN_500KG');
    });
    await new Promise((r) => setTimeout(r, 100));
    expect(bookingDraftStore.getDraft().vehicleId).toBe('VAN_500KG');
  });

  it('opens Price Detail Sheet when "Chi tiết ⌵" is tapped', async () => {
    mockEstimate(5_000, 1_200);
    const screen = await render(<BookingScreen {...ROUTE_PROPS} />);

    fireEvent.press(await screen.findByText('Chi tiết ⌵'));
    expect(await screen.findByText('Chi tiết cước vận chuyển')).toBeTruthy();
  });

  it('keeps vehicle price tags stable when switching vehicles', async () => {
    mockEstimate(20_000, 2_400);
    const screen = await render(
      <BookingScreen {...ROUTE_PROPS} initialVehicleId="TRUCK_125T" />,
    );

    await screen.findByText(/Khoảng 20,0 km/);

    expect((await screen.findAllByText('560.000 đ')).length).toBeGreaterThan(0);
    expect((await screen.findAllByText('410.000 đ')).length).toBeGreaterThan(0);
    expect((await screen.findAllByText('270.000 đ')).length).toBeGreaterThan(0);
    expect((await screen.findAllByText('760.000 đ')).length).toBeGreaterThan(0);

    fireEvent.press(await screen.findByText('Xe Van 500kg'));
    await waitFor(() => {
      expect(bookingDraftStore.getDraft().vehicleId).toBe('VAN_500KG');
    });

    expect((await screen.findAllByText('560.000 đ')).length).toBeGreaterThan(0);
    expect((await screen.findAllByText('410.000 đ')).length).toBeGreaterThan(0);
    expect((await screen.findAllByText('270.000 đ')).length).toBeGreaterThan(0);
    expect((await screen.findAllByText('760.000 đ')).length).toBeGreaterThan(0);
  });

  it('fails closed and displays error banner without navigating when createOrder API fails', async () => {
    mockEstimate(5_000, 1_200);
    const onOrderCreated = jest.fn();

    const screen = await render(
      <BookingScreen {...ROUTE_PROPS} onOrderCreated={onOrderCreated} />,
    );

    bookingDraftStore.updateDraft({
      receiverName: 'Nguyễn Văn A',
      receiverPhone: '0901234567',
      cargoImages: ['file:///test-cargo.jpg'],
    });

    await screen.findByText(/Khoảng 5,0 km/);

    // Mock httpClient.post for /orders to fail
    jest.spyOn(httpClient, 'post').mockImplementation((url: string) => {
      if (url === '/orders') {
        return Promise.reject(new Error('Mất kết nối máy chủ'));
      }
      return Promise.resolve({
        kind: 'form',
        estimate: {
          kind: 'ready',
          routes: [{ distanceM: 5000, durationS: 1200, estimateToken: 'token-abc', priceLabel: '200.000 đ' }],
        },
      } as never);
    });

    const bookBtn = await screen.findByRole('button', { name: 'Đặt xe' });
    fireEvent.press(bookBtn);

    await waitFor(() => {
      expect(onOrderCreated).not.toHaveBeenCalled();
    });

    expect(await screen.findByTestId('booking-submission-error')).toBeTruthy();
  });

  it('automatically resolves GPS coordinates when pickup coordinates are not provided', async () => {
    (Location.requestForegroundPermissionsAsync as any).mockResolvedValueOnce({
      status: 'granted',
    });
    (Location.getCurrentPositionAsync as any).mockResolvedValueOnce({
      coords: { latitude: 10.7769, longitude: 106.7009 },
    });

    render(
      <BookingScreen
        initialPickup=""
        initialDropoff="Kho Quận 7, TP.HCM"
        initialDropoffLat={10.73}
        initialDropoffLng={106.72}
      />,
    );

    await waitFor(() => {
      const draft = bookingDraftStore.getDraft();
      expect(draft.pickupLat).toBe(10.7769);
      expect(draft.pickupLng).toBe(106.7009);
    });
  });
});


