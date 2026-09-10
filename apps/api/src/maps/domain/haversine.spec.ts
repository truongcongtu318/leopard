import { describe, expect, it } from '@jest/globals';

import {
  haversineDistanceMeters,
  sumHaversineLegsMeters,
} from './haversine.js';

describe('haversineDistanceMeters', () => {
  it('returns the known one-degree equator distance in meters', () => {
    const distance = haversineDistanceMeters(
      { latitude: 0, longitude: 0 },
      { latitude: 0, longitude: 1 },
    );

    expect(distance).toBeCloseTo(111_195, 0);
  });

  it('sums every route leg in order', () => {
    const distance = sumHaversineLegsMeters([
      { latitude: 0, longitude: 0 },
      { latitude: 0, longitude: 1 },
      { latitude: 1, longitude: 1 },
    ]);

    expect(distance).toBeCloseTo(222_390, 0);
  });
});
