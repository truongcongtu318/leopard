import { describe, expect, it } from '@jest/globals';

import { isLikelyVnPhone, toE164Vn } from './phone';

describe('toE164Vn', () => {
  it('converts a local 0-prefixed number to +84', () => {
    expect(toE164Vn('0900000001')).toBe('+84900000001');
  });

  it('passes through an already-normalized +84 number', () => {
    expect(toE164Vn('+84900000001')).toBe('+84900000001');
  });

  it('adds + to an 84-prefixed number', () => {
    expect(toE164Vn('84900000001')).toBe('+84900000001');
  });

  it('strips spaces, dots and dashes', () => {
    expect(toE164Vn('090 000 00.01')).toBe('+84900000001');
    expect(toE164Vn('+84 900-000-001')).toBe('+84900000001');
    expect(toE164Vn('+84 900 000 001')).toBe('+84900000001');
  });

  it('handles accidental double prefix with 0', () => {
    expect(toE164Vn('+840900000001')).toBe('+84900000001');
    expect(toE164Vn('840900000001')).toBe('+84900000001');
    expect(toE164Vn('+84 0900 000 001')).toBe('+84900000001');
  });

  it('prefixes bare local digits with +84', () => {
    expect(toE164Vn('900000001')).toBe('+84900000001');
  });
});

describe('isLikelyVnPhone', () => {
  it('accepts a valid VN mobile number in several formats', () => {
    expect(isLikelyVnPhone('0900000001')).toBe(true);
    expect(isLikelyVnPhone('+84900000001')).toBe(true);
    expect(isLikelyVnPhone('900000001')).toBe(true);
  });

  it('rejects too-short or non-numeric input', () => {
    expect(isLikelyVnPhone('12345')).toBe(false);
    expect(isLikelyVnPhone('abc')).toBe(false);
    expect(isLikelyVnPhone('')).toBe(false);
  });
});
