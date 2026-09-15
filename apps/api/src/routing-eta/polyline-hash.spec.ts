import { computeInputHash, computeRouteHash } from './polyline-hash.js';

describe('polyline-hash', () => {
  it('produces a stable 64-char hex digest for the same normalized input', () => {
    const input = { pickup: { latitude: 10.1, longitude: 106.2 }, vehicleType: 'TRUCK' };
    const a = computeInputHash(input);
    const b = computeInputHash({ vehicleType: 'TRUCK', pickup: { longitude: 106.2, latitude: 10.1 } });
    expect(a).toMatch(/^[0-9a-f]{64}$/);
    expect(a).toBe(b); // key order must not matter
  });

  it('produces different route hashes for different geometry', () => {
    expect(computeRouteHash('abc')).not.toBe(computeRouteHash('xyz'));
    expect(computeRouteHash('abc')).toMatch(/^[0-9a-f]{64}$/);
  });
});
