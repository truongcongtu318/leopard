import { describe, expect, it } from '@jest/globals';

import { PricingService } from './pricing.service.js';

describe('PricingService', () => {
  it('uses the configured vehicle rate and returns integer VND', () => {
    const service = new PricingService({
      minimumFareVnd: 10_000,
      stopSurchargeVnd: 2_500,
      vehicleRates: {
        MOTORBIKE: { baseFareVnd: 10_000, perKmVnd: 3_501 },
        VAN: { baseFareVnd: 20_000, perKmVnd: 8_000 },
      },
    });

    const quote = service.quote({
      vehicleType: 'MOTORBIKE',
      distanceMeters: 1_234,
      stopCount: 0,
    });

    const expectedTransport = Math.max(14_320, 10_000);
    expect(quote).toEqual({
      amountVnd: expectedTransport,
      baseFareVnd: 10_000,
      distanceFareVnd: Math.round((1_234 * 3_501) / 1_000),
      stopFareVnd: 0,
      loadingFeeVnd: 0,
      vatFeeVnd: 0,
      platformFeeVnd: Math.round(expectedTransport * 0.15),
      driverPayoutVnd: expectedTransport - Math.round(expectedTransport * 0.15),
      currency: 'VND',
    });
  });

  it('adds the configured stop surcharge for every intermediate stop', () => {
    const service = new PricingService({
      minimumFareVnd: 10_000,
      stopSurchargeVnd: 7_000,
      vehicleRates: {
        VAN: { baseFareVnd: 20_000, perKmVnd: 8_000 },
      },
    });

    const quote = service.quote({
      vehicleType: 'VAN',
      distanceMeters: 10_000,
      stopCount: 2,
    });

    expect(quote).toEqual({
      amountVnd: 114_000,
      baseFareVnd: 20_000,
      distanceFareVnd: 80_000,
      stopFareVnd: 14_000,
      loadingFeeVnd: 0,
      vatFeeVnd: 0,
      platformFeeVnd: Math.round(114_000 * 0.15),
      driverPayoutVnd: 114_000 - Math.round(114_000 * 0.15),
      currency: 'VND',
    });
  });

  it('applies the configured minimum fare after distance and stop pricing', () => {
    const service = new PricingService({
      minimumFareVnd: 35_000,
      stopSurchargeVnd: 5_000,
      vehicleRates: {
        TRUCK: { baseFareVnd: 15_000, perKmVnd: 4_000 },
      },
    });

    const quote = service.quote({
      vehicleType: 'TRUCK',
      distanceMeters: 1_000,
      stopCount: 0,
    });

    expect(quote).toEqual({
      amountVnd: 35_000,
      baseFareVnd: 15_000,
      distanceFareVnd: 4_000,
      stopFareVnd: 0,
      loadingFeeVnd: 0,
      vatFeeVnd: 0,
      platformFeeVnd: Math.round(35_000 * 0.15),
      driverPayoutVnd: 35_000 - Math.round(35_000 * 0.15),
      currency: 'VND',
    });
  });

  it('rejects invalid pricing config before issuing quotes', () => {
    expect(
      () =>
        new PricingService({
          minimumFareVnd: 10_000,
          stopSurchargeVnd: 1_500.5,
          vehicleRates: {
            MOTORBIKE: { baseFareVnd: 10_000, perKmVnd: 3_000 },
          },
        }),
    ).toThrow('Pricing config is invalid');
  });

  it('differentiates 1.25T and 2.5T truck rates based on cargoWeightKg', () => {
    const service = new PricingService({
      minimumFareVnd: 50_000,
      stopSurchargeVnd: 30_000,
      vehicleRates: {
        MOTORBIKE: { baseFareVnd: 70_000, perKmVnd: 10_000, loadingFeeVnd: 60_000 },
        VAN: { baseFareVnd: 130_000, perKmVnd: 14_000, loadingFeeVnd: 100_000 },
        TRUCK: { baseFareVnd: 200_000, perKmVnd: 18_000, loadingFeeVnd: 150_000 },
      },
    });

    // Test tải 1.25T (cargoWeightKg <= 1250):
    const quote125T = service.quote({
      vehicleType: 'TRUCK',
      cargoWeightKg: 1250,
      distanceMeters: 10_000,
      stopCount: 1,
      hasLoadingSupport: true,
    });
    // base 200k + distance 180k + stop 30k = 410k + loading 150k = 560_000 ₫
    expect(quote125T.baseFareVnd).toBe(200_000);
    expect(quote125T.distanceFareVnd).toBe(180_000);
    expect(quote125T.stopFareVnd).toBe(30_000);
    expect(quote125T.loadingFeeVnd).toBe(150_000);
    expect(quote125T.vatFeeVnd).toBe(0);
    expect(quote125T.platformFeeVnd).toBe(Math.round(410_000 * 0.15));
    expect(quote125T.driverPayoutVnd).toBe(410_000 - Math.round(410_000 * 0.15) + 150_000);
    expect(quote125T.amountVnd).toBe(560_000);

    // Test tải 2.5T (cargoWeightKg > 1250):
    const quote25T = service.quote({
      vehicleType: 'TRUCK',
      cargoWeightKg: 2500,
      distanceMeters: 10_000,
      stopCount: 1,
      hasLoadingSupport: true,
      hasVatInvoice: true,
    });
    // Xe 2.5T tự động áp mức cước cao: base 320k, 22k/km, loading 250k
    // base 320k + distance 220k + stop 30k = 570k + loading 250k = 820k
    // VAT 8% = Math.round(820_000 * 0.08) = 65_600 ₫
    // total = 820_000 + 65_600 = 885_600 ₫
    // platformFee = Math.round(570_000 * 0.15) = 85_500 ₫
    // driverPayout = (570_000 - 85_500) + 250_000 = 734_500 ₫
    expect(quote25T.baseFareVnd).toBe(320_000);
    expect(quote25T.distanceFareVnd).toBe(220_000);
    expect(quote25T.stopFareVnd).toBe(30_000);
    expect(quote25T.loadingFeeVnd).toBe(250_000);
    expect(quote25T.vatFeeVnd).toBe(65_600);
    expect(quote25T.amountVnd).toBe(885_600);
    expect(quote25T.platformFeeVnd).toBe(85_500);
    expect(quote25T.driverPayoutVnd).toBe(734_500);
  });

  it('uses default fallback loading fees when not configured in rate', () => {
    const service = new PricingService({
      minimumFareVnd: 50_000,
      stopSurchargeVnd: 10_000,
      vehicleRates: {
        MOTORBIKE: { baseFareVnd: 70_000, perKmVnd: 10_000 },
        VAN: { baseFareVnd: 130_000, perKmVnd: 14_000 },
        TRUCK: { baseFareVnd: 200_000, perKmVnd: 18_000 },
      },
    });

    const bikeQuote = service.quote({
      vehicleType: 'MOTORBIKE',
      distanceMeters: 5_000,
      stopCount: 0,
      hasLoadingSupport: true,
    });
    expect(bikeQuote.loadingFeeVnd).toBe(60_000);

    const vanQuote = service.quote({
      vehicleType: 'VAN',
      distanceMeters: 5_000,
      stopCount: 0,
      hasLoadingSupport: true,
    });
    expect(vanQuote.loadingFeeVnd).toBe(100_000);

    const truckQuote = service.quote({
      vehicleType: 'TRUCK',
      cargoWeightKg: 1000,
      distanceMeters: 5_000,
      stopCount: 0,
      hasLoadingSupport: true,
    });
    expect(truckQuote.loadingFeeVnd).toBe(150_000);
  });
});
