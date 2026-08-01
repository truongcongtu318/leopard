import { describe, expect, it } from '@jest/globals';

import { DemoRouteEstimator } from './demo-route-estimator.js';

describe('DemoRouteEstimator', () => {
  const calculatedAt = new Date('2026-08-01T03:00:00.000Z');

  it('applies the deterministic demo route factor, speed and stop delay', async () => {
    const estimator = new DemoRouteEstimator(() => calculatedAt);

    const estimate = await estimator.estimate({
      pickup: { latitude: 0, longitude: 0 },
      stops: [{ latitude: 0, longitude: 1 }],
      dropoff: { latitude: 1, longitude: 1 },
      vehicleType: 'MOTORBIKE',
    });

    expect(estimate).toEqual({
      polyline: '???_ibE_ibE?',
      distanceM: 277_987,
      durationS: 33_660,
      estimatedArrivalAt: '2026-08-01T12:21:00.000Z',
      estimatedPriceVnd: 0,
      source: 'DEMO',
      isEstimate: true,
      calculatedAt: '2026-08-01T03:00:00.000Z',
    });
  });

  it('returns stable output for repeated estimates with the same input and clock', async () => {
    const estimator = new DemoRouteEstimator(() => calculatedAt);
    const input = {
      pickup: { latitude: 10.762622, longitude: 106.660172 },
      stops: [
        { latitude: 10.776889, longitude: 106.700806 },
        { latitude: 10.801465, longitude: 106.652597 },
      ],
      dropoff: { latitude: 10.823099, longitude: 106.629664 },
      vehicleType: 'VAN',
    };

    await expect(estimator.estimate(input)).resolves.toEqual(
      await estimator.estimate(input),
    );
  });
});
