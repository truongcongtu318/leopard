import { describe, expect, test } from '@jest/globals';

import { extractOrderId } from './notification-data.util.js';

describe('extractOrderId', () => {
  test('returns the orderId when present as a string', () => {
    expect(extractOrderId({ orderId: 'order-1' })).toBe('order-1');
  });

  test('returns undefined for null', () => {
    expect(extractOrderId(null)).toBeUndefined();
  });

  test('returns undefined for undefined', () => {
    expect(extractOrderId(undefined)).toBeUndefined();
  });

  test('returns undefined when data has no orderId field', () => {
    expect(extractOrderId({ someOtherField: 'x' })).toBeUndefined();
  });

  test('returns undefined when orderId is not a string', () => {
    expect(extractOrderId({ orderId: 123 })).toBeUndefined();
  });

  test('returns undefined for an array', () => {
    expect(extractOrderId(['not', 'an', 'object'])).toBeUndefined();
  });

  test('returns undefined for a primitive JSON value', () => {
    expect(extractOrderId('just a string' as any)).toBeUndefined();
  });
});
