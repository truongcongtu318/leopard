import { describe, expect, it } from '@jest/globals';

import { normalizeDriverRouteParam, parseDriverOrderId } from './adapter';

describe('Driver route adapter', () => {
  it('normalizes Expo Router params without trusting repeated values', () => {
    expect(normalizeDriverRouteParam('enabled')).toBe('enabled');
    expect(normalizeDriverRouteParam(['first', 'second'])).toBe('first');
    expect(normalizeDriverRouteParam(undefined)).toBeNull();
  });

  it('accepts canonical UUID IDs and rejects malformed deep links', () => {
    expect(parseDriverOrderId('22222222-2222-4222-8222-222222222001')).toBe(
      '22222222-2222-4222-8222-222222222001',
    );
    expect(parseDriverOrderId('../customer/orders')).toBeNull();
    expect(parseDriverOrderId('not-a-uuid')).toBeNull();
  });
});
