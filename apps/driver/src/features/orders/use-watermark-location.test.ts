import { describe, expect, it, jest } from '@jest/globals';

import {
  WATERMARK_GPS_UNAVAILABLE,
  formatWatermarkCoords,
  formatWatermarkTimestamp,
} from './use-watermark-location';

describe('formatWatermarkCoords', () => {
  it('renders a northern/eastern position with hemisphere suffixes', () => {
    expect(formatWatermarkCoords({ lat: 21.028, lng: 105.8345 })).toBe(
      '21.02800° N, 105.83450° E',
    );
  });

  it('renders southern/western hemispheres correctly', () => {
    expect(formatWatermarkCoords({ lat: -6.2, lng: -106.8 })).toBe('6.20000° S, 106.80000° W');
  });
});

describe('formatWatermarkTimestamp', () => {
  it('formats a real capture date as HH:mm:ss DD/MM/YYYY', () => {
    expect(formatWatermarkTimestamp(new Date(2026, 7, 15, 14, 30, 15))).toBe(
      '14:30:15 15/08/2026',
    );
  });

  it('zero-pads single-digit time parts', () => {
    expect(formatWatermarkTimestamp(new Date(2026, 0, 5, 9, 5, 3))).toBe('09:05:03 05/01/2026');
  });

  it('never invents a time when the capture timestamp is missing or invalid', () => {
    // An honest gap on delivery evidence beats a plausible-looking fabrication.
    expect(formatWatermarkTimestamp(null)).toBe('Chưa có thời gian');
    expect(formatWatermarkTimestamp(undefined)).toBe('Chưa có thời gian');
    expect(formatWatermarkTimestamp(new Date('not-a-date'))).toBe('Chưa có thời gian');
  });
});

describe('WATERMARK_GPS_UNAVAILABLE', () => {
  it('is an explicit "no fix" label rather than a placeholder coordinate', () => {
    expect(WATERMARK_GPS_UNAVAILABLE).toBe('Chưa có vị trí GPS');
  });
});
