import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { fireEvent, render } from '@testing-library/react-native';
import React from 'react';
import { httpClient } from '@leopard/mobile-core';
import { BookingScreen } from './BookingScreen';
import { bookingDraftStore } from './bookingDraftStore';

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
    // 20 km × 18,000 = 360,000, which must beat the 200,000 base fare.
    mockEstimate(20_000, 2_400);
    const screen = await render(<BookingScreen {...ROUTE_PROPS} />);

    expect((await screen.findAllByText('360.000 đ')).length).toBeGreaterThan(0);
  });

  it('recalculates fare live to 378,000 VND when loading (+150k) and VAT (+8%) are enabled', async () => {
    mockEstimate(5_000, 1_200);
    const screen = await render(<BookingScreen {...ROUTE_PROPS} />);

    // Wait for the estimate so the fare exists before toggling add-ons.
    await screen.findByText(/Khoảng 5,0 km/);

    fireEvent(await screen.findByLabelText('Tài xế hỗ trợ bốc xếp'), 'valueChange', true);
    fireEvent(await screen.findByLabelText('Xuất hóa đơn VAT'), 'valueChange', true);

    // Base 200k (5 km distance fare is lower) + Loading 150k = 350k; VAT 8% = 28k => 378k
    expect((await screen.findAllByText('378.000 đ')).length).toBeGreaterThan(0);
  });

  it('never quotes a fare before the real distance is known', async () => {
    // No estimate available: the screen must withhold the price, not fall back
    // to the base fare or a hardcoded kilometre figure.
    jest.spyOn(httpClient, 'post').mockRejectedValue(new Error('routing unavailable'));
    const screen = await render(<BookingScreen {...ROUTE_PROPS} />);

    // The bottom bar and every vehicle row withhold their price.
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

  it('opens Price Detail Sheet when "Chi tiết ⌵" is tapped', async () => {
    mockEstimate(5_000, 1_200);
    const screen = await render(<BookingScreen {...ROUTE_PROPS} />);

    fireEvent.press(await screen.findByText('Chi tiết ⌵'));
    expect(await screen.findByText('Chi tiết cước vận chuyển')).toBeTruthy();
  });
});
