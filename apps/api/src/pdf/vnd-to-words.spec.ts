// apps/api/src/pdf/vnd-to-words.spec.ts
import { describe, expect, it } from '@jest/globals';
import { vndAmountToWords } from './vnd-to-words.js';

describe('vndAmountToWords', () => {
  it('renders zero', () => {
    expect(vndAmountToWords(0)).toBe('Không đồng');
  });

  it('renders a single-digit amount', () => {
    expect(vndAmountToWords(5)).toBe('Năm đồng');
  });

  it('renders a representative fare total (528,000)', () => {
    expect(vndAmountToWords(528_000)).toBe('Năm trăm hai mươi tám nghìn đồng');
  });

  it('renders a value with a "lẻ" gap (1,005,000)', () => {
    expect(vndAmountToWords(1_005_000)).toBe('Một triệu không trăm lẻ năm nghìn đồng');
  });

  it('renders "mười" instead of "một mươi" for the tens group', () => {
    expect(vndAmountToWords(10_000)).toBe('Mười nghìn đồng');
  });

  it('renders "mốt" instead of "một" for a trailing 1 above 20', () => {
    expect(vndAmountToWords(21_000)).toBe('Hai mươi mốt nghìn đồng');
  });

  it('renders "lăm" instead of "năm" for a trailing 5 above 10', () => {
    expect(vndAmountToWords(25_000)).toBe('Hai mươi lăm nghìn đồng');
  });

  it('renders a value spanning billions', () => {
    expect(vndAmountToWords(1_234_567_000)).toBe(
      'Một tỷ hai trăm ba mươi tư triệu năm trăm sáu mươi bảy nghìn đồng',
    );
  });

  it('rounds a fractional đồng down before rendering', () => {
    expect(vndAmountToWords(1_000.9)).toBe('Một nghìn đồng');
  });
});
