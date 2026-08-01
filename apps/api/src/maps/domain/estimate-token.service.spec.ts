import { Buffer } from 'node:buffer';

import { describe, expect, it } from '@jest/globals';

import { EstimateTokenService } from './estimate-token.service.js';
import type { RouteEstimate, RouteInput } from '../providers/map-provider.js';

describe('EstimateTokenService', () => {
  const issuedAt = new Date('2026-08-01T03:00:00.000Z');
  const secret = 'test-estimate-token-secret-32-bytes';

  it('issues a signed token that binds the normalized route, quote and 10-minute expiry', () => {
    const service = new EstimateTokenService({
      secret,
      now: () => issuedAt,
    });

    const token = service.issue({
      routeInput: routeInput(),
      estimate: routeEstimate(),
      quote: { amountVnd: 87_654, currency: 'VND' },
    });

    const verified = service.verify(token);

    expect(verified).toEqual({
      ...routeEstimate(),
      estimatedPriceVnd: 87_654,
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
    const service = new EstimateTokenService({
      secret,
      now: () => issuedAt,
    });
    const token = service.issue({
      routeInput: routeInput(),
      estimate: routeEstimate(),
      quote: { amountVnd: 87_654, currency: 'VND' },
    });
    const [payload, signature] = token.split('.');
    const tamperedPayload = JSON.parse(
      Buffer.from(payload ?? '', 'base64url').toString('utf8'),
    ) as {
      routeInput: RouteInput;
    };

    tamperedPayload.routeInput.vehicleType = 'TRUCK';
    const tamperedToken = `${Buffer.from(JSON.stringify(tamperedPayload)).toString(
      'base64url',
    )}.${signature}`;

    expect(() => service.verify(tamperedToken)).toThrow('Estimate token signature is invalid');
  });

  it('rejects a token whose signed quote payload was tampered', () => {
    const service = new EstimateTokenService({
      secret,
      now: () => issuedAt,
    });
    const token = service.issue({
      routeInput: routeInput(),
      estimate: routeEstimate(),
      quote: { amountVnd: 87_654, currency: 'VND' },
    });
    const [payload, signature] = token.split('.');
    const tamperedPayload = JSON.parse(
      Buffer.from(payload ?? '', 'base64url').toString('utf8'),
    ) as {
      quote: { amountVnd: number };
    };

    tamperedPayload.quote.amountVnd = 1;
    const tamperedToken = `${Buffer.from(JSON.stringify(tamperedPayload)).toString(
      'base64url',
    )}.${signature}`;

    expect(() => service.verify(tamperedToken)).toThrow('Estimate token signature is invalid');
  });

  it('rejects expired estimate tokens', () => {
    let now = issuedAt;
    const service = new EstimateTokenService({
      secret,
      now: () => now,
    });
    const token = service.issue({
      routeInput: routeInput(),
      estimate: routeEstimate(),
      quote: { amountVnd: 87_654, currency: 'VND' },
    });

    now = new Date('2026-08-01T03:10:00.001Z');

    expect(() => service.verify(token)).toThrow('Estimate token has expired');
  });

  it('does not expose the HMAC secret in token errors', () => {
    const service = new EstimateTokenService({
      secret,
      now: () => issuedAt,
    });

    expect(() => service.verify('bad.token')).toThrow(/Estimate token/);

    try {
      service.verify('bad.token');
    } catch (error) {
      expect(error).toBeInstanceOf(Error);
      expect((error as Error).message).not.toContain(secret);
    }
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
  };
}
