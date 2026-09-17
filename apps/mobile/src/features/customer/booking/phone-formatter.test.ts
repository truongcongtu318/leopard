import { describe, expect, it } from '@jest/globals';
import { formatVietnamPhoneNumber } from './phone-formatter';

describe('formatVietnamPhoneNumber', () => {
  it('strips leading zero and formats 9 digits as "90 123 4567"', () => {
    const result = formatVietnamPhoneNumber('0901234567');
    expect(result.display).toBe('90 123 4567');
    expect(result.rawDigits).toBe('901234567');
    expect(result.isValid).toBe(true);
  });

  it('handles input without leading zero', () => {
    const result = formatVietnamPhoneNumber('901234567');
    expect(result.display).toBe('90 123 4567');
    expect(result.rawDigits).toBe('901234567');
    expect(result.isValid).toBe(true);
  });

  it('marks incomplete numbers as invalid', () => {
    const result = formatVietnamPhoneNumber('090123');
    expect(result.display).toBe('90 123');
    expect(result.isValid).toBe(false);
  });

  it('filters out non-digit characters', () => {
    const result = formatVietnamPhoneNumber('(090) 123-4567');
    expect(result.display).toBe('90 123 4567');
    expect(result.rawDigits).toBe('901234567');
    expect(result.isValid).toBe(true);
  });
});
