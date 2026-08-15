import { describe, expect, it } from '@jest/globals';

import { normalizeRouteParam, parseCustomerOrderId } from './adapter';

describe('Customer route adapter', () => {
  it('normalizes scalar and array Expo Router params', () => {
    expect(normalizeRouteParam('success')).toBe('success');
    expect(normalizeRouteParam(['first', 'second'])).toBe('first');
    expect(normalizeRouteParam(undefined)).toBeNull();
  });

  it('accepts canonical UUID order IDs and rejects untrusted route input', () => {
    expect(parseCustomerOrderId('11111111-1111-4111-8111-111111111001')).toBe(
      '11111111-1111-4111-8111-111111111001',
    );
    expect(parseCustomerOrderId('../admin/orders')).toBeNull();
    expect(parseCustomerOrderId(['not-a-uuid'])).toBeNull();
  });
});
