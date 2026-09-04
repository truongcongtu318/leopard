import { Buffer } from 'node:buffer';

import { describe, expect, it } from '@jest/globals';

import { EstimateTokenService } from './estimate-token.service.js';
import type { RouteEstimate, RouteInput } from '../providers/map-provider.js';

describe('EstimateTokenService', () => {
  const issuedAt = new Date('2026-08-01T03:00:00.000Z');
  const secret = 'test-estimate-token-secret-32-bytes';

  it('issues a signed token that binds the normalized route, quote, routeId and 10-minute expiry', () => {
    const service = new EstimateTokenService({
      secret,
      now: () => issuedAt,
    });

    const token = service.issue({
      routeInput: routeInput(),
      estimate: routeEstimate(),
      quote: { amountVnd: 87_654, currency: 'VND' },
      routeId: 'route-0',
    });

    const verified = service.verify(token);

    expect(verified).toEqual({
      ...routeEstimate(),
      estimatedPriceVnd: 87_654,
      routeId: 'route-0',
      normalizedInput: {
        pickup: { latitude: 10.762623, longitude: 106.660172 },
        stops: [{ latitude: 10.776889, longitude: 106.700807 }],
        dropoff: { latitude: 10.823099, longitude: 106.629664 },
        vehicleType: 'VAN',
      },
      expiresAt: '2026-08-01T03:10:00.000Z',
    });
  });

  it('rejects a token whose signed route payload was tampered', () => {
    const service = new EstimateTokenService({ secret, now: () => issuedAt });
    const token = service.issue({
      routeInput: routeInput(),
      estimate: routeEstimate(),
      quote: { amountVnd: 87_654, currency: 'VND' },
      routeId: 'route-0',
    });
    const [payload, signature] = token.split('.');
    const tamperedPayload = JSON.parse(
      Buffer.from(payload ?? '', 'base64url').toString('utf8'),
    ) as { routeInput: RouteInput };

    tamperedPayload.routeInput.vehicleType = 'TRUCK';
    const tamperedToken = `${Buffer.from(JSON.stringify(tamperedPayload)).toString(
      'base64url',
    )}.${signature}`;

    expect(() => service.verify(tamperedToken)).toThrow('Estimate token signature is invalid');
  });

  it('rejects a token whose signed quote payload was tampered', () => {
    const service = new EstimateTokenService({ secret, now: () => issuedAt });
    const token = service.issue({
      routeInput: routeInput(),
      estimate: routeEstimate(),
      quote: { amountVnd: 87_654, currency: 'VND' },
      routeId: 'route-0',
    });
    const [payload, signature] = token.split('.');
    const tamperedPayload = JSON.parse(
      Buffer.from(payload ?? '', 'base64url').toString('utf8'),
    ) as { quote: { amountVnd: number } };

    tamperedPayload.quote.amountVnd = 1;
    const tamperedToken = `${Buffer.from(JSON.stringify(tamperedPayload)).toString(
      'base64url',
    )}.${signature}`;

    expect(() => service.verify(tamperedToken)).toThrow('Estimate token signature is invalid');
  });

  it('rejects expired estimate tokens', () => {
    let now = issuedAt;
    const service = new EstimateTokenService({ secret, now: () => now });
    const token = service.issue({
      routeInput: routeInput(),
      estimate: routeEstimate(),
      quote: { amountVnd: 87_654, currency: 'VND' },
      routeId: 'route-0',
    });

    now = new Date('2026-08-01T03:10:00.001Z');

    expect(() => service.verify(token)).toThrow('Estimate token has expired');
  });

  it('does not expose the HMAC secret in token errors', () => {
    const service = new EstimateTokenService({ secret, now: () => issuedAt });

    expect(() => service.verify('bad.token')).toThrow(/Estimate token/);

    try {
      service.verify('bad.token');
    } catch (error) {
      expect(error).toBeInstanceOf(Error);
      expect((error as Error).message).not.toContain(secret);
    }
  });

  it('rejects issuing a token with an empty routeId', () => {
    const service = new EstimateTokenService({ secret, now: () => issuedAt });

    expect(() =>
      service.issue({
        routeInput: routeInput(),
        estimate: routeEstimate(),
        quote: { amountVnd: 87_654, currency: 'VND' },
        routeId: '',
      }),
    ).toThrow('Estimate token routeId is invalid');
  });

  it('binds cargoWeightKg into the signed route and rejects a mismatched weight at verify time', () => {
    const service = new EstimateTokenService({ secret, now: () => issuedAt });
    const token = service.issue({
      routeInput: { ...routeInput(), vehicleType: 'TRUCK', cargoWeightKg: 1_250 },
      estimate: routeEstimate(),
      quote: { amountVnd: 87_654, currency: 'VND' },
      routeId: 'route-0',
    });

    expect(() =>
      service.verify(token, { ...routeInput(), vehicleType: 'TRUCK', cargoWeightKg: 2_000 }),
    ).toThrow('Estimate parameters mismatch');

    expect(() =>
      service.verify(token, { ...routeInput(), vehicleType: 'TRUCK', cargoWeightKg: 1_250 }),
    ).not.toThrow();
  });

  it('keeps every route in a multi-route estimate bound to its own token: decoding Token A never returns Route B data', () => {
    const service = new EstimateTokenService({ secret, now: () => issuedAt });
    const tokenA = service.issue({
      routeInput: routeInput(),
      estimate: { ...routeEstimate(), distanceM: 12_000, durationS: 1_800 },
      quote: { amountVnd: 50_000, currency: 'VND' },
      routeId: 'route-0',
    });
    const tokenB = service.issue({
      routeInput: routeInput(),
      estimate: { ...routeEstimate(), distanceM: 14_000, durationS: 1_620 },
      quote: { amountVnd: 58_000, currency: 'VND' },
      routeId: 'route-1',
    });

    const verifiedA = service.verify(tokenA);
    const verifiedB = service.verify(tokenB);

    expect(verifiedA.routeId).toBe('route-0');
    expect(verifiedA.distanceM).toBe(12_000);
    expect(verifiedA.estimatedPriceVnd).toBe(50_000);

    expect(verifiedB.routeId).toBe('route-1');
    expect(verifiedB.distanceM).toBe(14_000);
    expect(verifiedB.estimatedPriceVnd).toBe(58_000);

    expect(verifiedA.routeId).not.toBe(verifiedB.routeId);
    expect(verifiedA.distanceM).not.toBe(verifiedB.distanceM);
  });
});

function routeInput(): RouteInput {
  return {
    pickup: { latitude: 10.7626226, longitude: 106.6601724 },
    stops: [{ latitude: 10.7768892, longitude: 106.7008068 }],
    dropoff: { latitude: 10.823099, longitude: 106.629664 },
    vehicleType: ' van ',
  };
}

function routeEstimate(): RouteEstimate {
  return {
    polyline: 'demo-polyline',
    distanceM: 12_345,
    durationS: 1_980,
    estimatedArrivalAt: '2026-08-01T03:33:00.000Z',
    estimatedPriceVnd: 0,
    source: 'DEMO',
    calculatedAt: '2026-08-01T03:00:00.000Z',
    isEstimate: true,
    congestionLevel: 'low',
  };
}
