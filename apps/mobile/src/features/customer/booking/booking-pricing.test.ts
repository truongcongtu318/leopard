import { calculateBookingFare, VEHICLE_RATES } from './booking-pricing';

describe('calculateBookingFare', () => {
  it('calculates default Truck 1.25T fare for baseline 12.5km without add-ons', () => {
    const breakdown = calculateBookingFare({
      vehicleId: 'TRUCK_125T',
      distanceKm: 12.5,
      stopCount: 0,
      hasLoadingSupport: false,
      hasVatInvoice: false,
    });

    // Base fare: 200,000 VND. Distance fare: 12.5 * 18,000 = 225,000 VND
    // Transport fare: max(200,000, 225,000) = 225,000 VND
    expect(breakdown.baseFare).toBe(200_000);
    expect(breakdown.distanceFare).toBe(225_000);
    expect(breakdown.stopFare).toBe(0);
    expect(breakdown.loadingFee).toBe(0);
    expect(breakdown.vatFee).toBe(0);
    expect(breakdown.totalFare).toBe(225_000);
  });

  it('guarantees minimum base fare when distance fare is smaller than base fare', () => {
    const breakdown = calculateBookingFare({
      vehicleId: 'TRUCK_125T',
      distanceKm: 4.0, // 4 * 18,000 = 72,000 < 200,000 base
      stopCount: 0,
      hasLoadingSupport: false,
      hasVatInvoice: false,
    });

    expect(breakdown.transportFare).toBe(200_000);
    expect(breakdown.totalFare).toBe(200_000);
  });

  it('accurately calculates State 7 (Base 200k + Loading 150k + VAT 8% = 378k) when distance within base fare', () => {
    const breakdown = calculateBookingFare({
      vehicleId: 'TRUCK_125T',
      distanceKm: 5.0,
      stopCount: 0,
      hasLoadingSupport: true,
      hasVatInvoice: true,
    });

    // Transport fare = 200,000
    // Loading fee = 150,000
    // Subtotal = 350,000
    // VAT 8% = 28,000
    // Total = 378,000
    expect(breakdown.transportFare).toBe(200_000);
    expect(breakdown.loadingFee).toBe(150_000);
    expect(breakdown.subtotal).toBe(350_000);
    expect(breakdown.vatFee).toBe(28_000);
    expect(breakdown.totalFare).toBe(378_000);
  });

  it('includes intermediate stop surcharges at 30,000 VND per stop', () => {
    const breakdown = calculateBookingFare({
      vehicleId: 'TRUCK_125T',
      distanceKm: 5.0,
      stopCount: 2,
      hasLoadingSupport: false,
      hasVatInvoice: false,
    });

    expect(breakdown.stopFare).toBe(60_000);
    expect(breakdown.transportFare).toBe(260_000);
    expect(breakdown.totalFare).toBe(260_000);
  });
});
