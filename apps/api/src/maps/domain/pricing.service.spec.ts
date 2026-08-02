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

    expect(quote).toEqual({ amountVnd: 14_320, currency: 'VND' });
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

    expect(quote).toEqual({ amountVnd: 114_000, currency: 'VND' });
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

    expect(quote).toEqual({ amountVnd: 35_000, currency: 'VND' });
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
});
