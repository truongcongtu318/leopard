import { describe, expect, it } from '@jest/globals';
import { calculateBookingFare } from './booking-pricing';

describe('calculateBookingFare', () => {
  it('calculates Truck 1.25T fare for 12.5km: base + distance (additive)', () => {
    const breakdown = calculateBookingFare({
      vehicleId: 'TRUCK_125T',
      distanceKm: 12.5,
      stopCount: 0,
      hasLoadingSupport: false,
      hasVatInvoice: false,
    });

    // Base fare: 200,000. Distance fare: 12.5 * 18,000 = 225,000
    // Transport fare: 200,000 + 225,000 = 425,000 (additive, not max)
    expect(breakdown.baseFare).toBe(200_000);
    expect(breakdown.distanceFare).toBe(225_000);
    expect(breakdown.stopFare).toBe(0);
    expect(breakdown.loadingFee).toBe(0);
    expect(breakdown.vatFee).toBe(0);
    expect(breakdown.transportFare).toBe(425_000);
    expect(breakdown.totalFare).toBe(425_000);
  });

  it('short trip: base fare is always included alongside distance fare', () => {
    const breakdown = calculateBookingFare({
      vehicleId: 'TRUCK_125T',
      distanceKm: 4.0, // 4 * 18,000 = 72,000
      stopCount: 0,
      hasLoadingSupport: false,
      hasVatInvoice: false,
    });

    // Transport fare = 200,000 + 72,000 = 272,000
    expect(breakdown.distanceFare).toBe(72_000);
    expect(breakdown.transportFare).toBe(272_000);
    expect(breakdown.totalFare).toBe(272_000);
  });

  it('calculates loading + VAT on top of base+distance transport fare', () => {
    const breakdown = calculateBookingFare({
      vehicleId: 'TRUCK_125T',
      distanceKm: 5.0, // 5 * 18,000 = 90,000
      stopCount: 0,
      hasLoadingSupport: true,
      hasVatInvoice: true,
    });

    // Transport fare = 200,000 + 90,000 = 290,000
    // Loading fee = 150,000
    // Subtotal = 440,000
    // VAT 8% = 35,200
    // Total = 475,200
    expect(breakdown.transportFare).toBe(290_000);
    expect(breakdown.loadingFee).toBe(150_000);
    expect(breakdown.subtotal).toBe(440_000);
    expect(breakdown.vatFee).toBe(35_200);
    expect(breakdown.totalFare).toBe(475_200);
  });

  it('includes intermediate stop surcharges at 30,000 VND per stop', () => {
    const breakdown = calculateBookingFare({
      vehicleId: 'TRUCK_125T',
      distanceKm: 5.0, // 5 * 18,000 = 90,000
      stopCount: 2,
      hasLoadingSupport: false,
      hasVatInvoice: false,
    });

    // Transport fare = 200,000 + 90,000 + 60,000 = 350,000
    expect(breakdown.stopFare).toBe(60_000);
    expect(breakdown.transportFare).toBe(350_000);
    expect(breakdown.totalFare).toBe(350_000);
  });
});
