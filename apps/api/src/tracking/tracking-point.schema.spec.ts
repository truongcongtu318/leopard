import { DomainError } from '../common/domain-error.js';
import { parseTrackingPoint } from './tracking-point.schema.js';

const NOW = new Date('2026-08-09T10:00:00.000Z');

describe('parseTrackingPoint', () => {
  it('accepts and normalizes a valid point', () => {
    expect(
      parseTrackingPoint(
        {
          clientPointId: '10000000-0000-4000-8000-000000000001',
          latitude: 10.7769,
          longitude: 106.7009,
          accuracyM: 12.5,
          capturedAt: '2026-08-09T09:59:30.000Z',
        },
        NOW,
      ),
    ).toEqual({
      clientPointId: '10000000-0000-4000-8000-000000000001',
      latitude: 10.7769,
      longitude: 106.7009,
      accuracyM: 12.5,
      capturedAt: new Date('2026-08-09T09:59:30.000Z'),
    });
  });

  it('omits optional accuracy and rejects unknown transport fields', () => {
    const point = parseTrackingPoint(
      {
        clientPointId: '10000000-0000-4000-8000-000000000001',
        latitude: 10,
        longitude: 106,
        capturedAt: NOW.toISOString(),
      },
      NOW,
    );

    expect(point).not.toHaveProperty('accuracyM');
    expectInvalid({
      clientPointId: '10000000-0000-4000-8000-000000000001',
      orderId: '10000000-0000-4000-8000-000000000002',
      latitude: 10,
      longitude: 106,
      capturedAt: NOW.toISOString(),
    });
  });

  it.each([
    ['invalid UUID', { clientPointId: 'not-a-uuid' }],
    ['latitude below range', { latitude: -90.1 }],
    ['latitude above range', { latitude: 90.1 }],
    ['longitude below range', { longitude: -180.1 }],
    ['longitude above range', { longitude: 180.1 }],
    ['zero accuracy', { accuracyM: 0 }],
    ['excessive accuracy', { accuracyM: 10_001 }],
    ['invalid timestamp', { capturedAt: 'yesterday' }],
  ])('rejects %s', (_label, override) => {
    expectInvalid({
      clientPointId: '10000000-0000-4000-8000-000000000001',
      latitude: 10,
      longitude: 106,
      capturedAt: NOW.toISOString(),
      ...override,
    });
  });

  it('rejects points too far in the future', () => {
    expectInvalid({
      clientPointId: '10000000-0000-4000-8000-000000000001',
      latitude: 10,
      longitude: 106,
      capturedAt: '2026-08-09T10:10:01.000Z',
    });
  });

  it('rejects points older than the default ten-minute skew', () => {
    expectInvalid({
      clientPointId: '10000000-0000-4000-8000-000000000001',
      latitude: 10,
      longitude: 106,
      capturedAt: '2026-08-09T09:49:59.000Z',
    });
  });

  it('accepts the exact default time boundaries', () => {
    for (const capturedAt of [
      '2026-08-09T09:50:00.000Z',
      '2026-08-09T10:10:00.000Z',
    ]) {
      expect(() =>
        parseTrackingPoint(
          {
            clientPointId: '10000000-0000-4000-8000-000000000001',
            latitude: 10,
            longitude: 106,
            capturedAt,
          },
          NOW,
        ),
      ).not.toThrow();
    }
  });

  it('supports a stricter configured maximum age', () => {
    expectInvalid(
      {
        clientPointId: '10000000-0000-4000-8000-000000000001',
        latitude: 10,
        longitude: 106,
        capturedAt: '2026-08-09T09:54:59.000Z',
      },
      { maxPastAgeMs: 5 * 60_000 },
    );
  });
});

function expectInvalid(
  input: Record<string, unknown>,
  limits?: { readonly maxPastAgeMs?: number; readonly maxFutureSkewMs?: number },
): void {
  try {
    parseTrackingPoint(input, NOW, limits);
    throw new Error('Expected invalid tracking point');
  } catch (error) {
    expect(error).toBeInstanceOf(DomainError);
    expect((error as DomainError).code).toBe('TRACKING_INVALID_POINT');
  }
}
