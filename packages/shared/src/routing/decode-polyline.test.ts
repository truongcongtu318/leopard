import { describe, expect, it } from 'vitest';

import { decodePolyline, PolylineDecodeError } from './decode-polyline.js';

describe('decodePolyline', () => {
  it('decodes a known POLYLINE5 string into coordinates within valid ranges', () => {
    // "_p~iF~ps|U" is the canonical Google polyline-algorithm example: [(38.5,-120.2),(40.7,-120.95),(43.252,-126.453)]
    const result = decodePolyline('_p~iF~ps|U_ulLnnqC_mqNvxq`@', 'POLYLINE5');
    expect(result.length).toBe(3);
    expect(result[0]!.lat).toBeCloseTo(38.5, 3);
    expect(result[0]!.lng).toBeCloseTo(-120.2, 3);
    for (const point of result) {
      expect(point.lat).toBeGreaterThanOrEqual(-90);
      expect(point.lat).toBeLessThanOrEqual(90);
      expect(point.lng).toBeGreaterThanOrEqual(-180);
      expect(point.lng).toBeLessThanOrEqual(180);
    }
  });

  it('throws PolylineDecodeError on a string truncated mid-varint', () => {
    expect(() => decodePolyline('_p~iF~ps|U_ulLnnqC_mqNvxq`', 'POLYLINE5')).toThrow(PolylineDecodeError);
  });

  it('throws PolylineDecodeError when the input exceeds the max length guard', () => {
    const huge = '_'.repeat(2_000_001);
    expect(() => decodePolyline(huge, 'POLYLINE5')).toThrow(PolylineDecodeError);
  });

  it('throws PolylineDecodeError when the decoded point count exceeds the max points guard', () => {
    const manyPoints = '?'.repeat(20_001 * 2); // each "??" decodes to one zero-delta point
    expect(() => decodePolyline(manyPoints, 'POLYLINE5')).toThrow(PolylineDecodeError);
  });

  it('throws PolylineDecodeError when a decoded coordinate is out of range', () => {
    // '_gjaR' encodes a latitude delta of 10,000,000 (== 100 * 1e5), which is
    // out of the valid [-90, 90] range at POLYLINE5 precision. '?' encodes a
    // valid, in-range longitude delta of 0. Derived and independently
    // verified via the standard polyline encode/decode algorithm.
    expect(() => decodePolyline('_gjaR?', 'POLYLINE5')).toThrow(PolylineDecodeError);
  });

  it('throws PolylineDecodeError when a complete latitude varint has no longitude varint after it', () => {
    // '?' alone is one complete, well-formed varint (decodes to a latitude
    // delta of 0) with nothing left in the string for the longitude half of
    // the pair. This is distinct from the mid-varint truncation case above,
    // which cuts a single varint's own continuation-byte sequence short.
    //
    // Asserting on the specific message (not just the error class) matters
    // here: if the dedicated "mid-coordinate-pair" guard were removed, the
    // very next decodeSignedValue() call (for longitude) would immediately
    // hit its own end-of-string check and throw a PolylineDecodeError too —
    // just with the generic "mid-varint" message instead. A class-only
    // assertion would pass either way and would not actually exercise this
    // guard, so the message is asserted to give the test real teeth.
    expect(() => decodePolyline('?', 'POLYLINE5')).toThrow(/mid-coordinate-pair/);
  });

  it('applies the correct precision divisor for POLYLINE6', () => {
    // Brief's original fixture ('_izlhA~rlgdF') decodes to (38.5, -120.2) at 1e6
    // precision, not (40.641, ...): it is the 1e6-scaled re-encoding of the same
    // canonical (38.5, -120.2) point used in the POLYLINE5 test above, not an
    // encoding of 40.641. Re-derived here via the standard polyline encode
    // algorithm: round(40.641 * 1e6) => 'o}oolA', round(-73.985 * 1e6) => 'n}tblC'.
    const [point] = decodePolyline('o}oolAn}tblC', 'POLYLINE6');
    expect(point!.lat).toBeCloseTo(40.641, 2);
    expect(point!.lng).toBeCloseTo(-73.985, 2);
  });
});
