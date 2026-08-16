import { z } from 'zod';

import { DomainError } from '../common/domain-error.js';

const DEFAULT_MAX_TIME_SKEW_MS = 10 * 60 * 1_000;
const MAX_ACCURACY_M = 10_000;

const trackingPointSchema = z.strictObject({
  clientPointId: z.uuid(),
  latitude: z.number().finite().min(-90).max(90),
  longitude: z.number().finite().min(-180).max(180),
  accuracyM: z.number().finite().positive().max(MAX_ACCURACY_M).optional(),
  capturedAt: z.iso.datetime({ offset: true }),
});

export interface TrackingPointInput {
  readonly clientPointId: string;
  readonly latitude: number;
  readonly longitude: number;
  readonly accuracyM?: number;
  readonly capturedAt: Date;
}

export interface TrackingTimeLimits {
  readonly maxPastAgeMs?: number;
  readonly maxFutureSkewMs?: number;
}

export function parseTrackingPoint(
  input: unknown,
  now: Date = new Date(),
  limits: TrackingTimeLimits = {},
): TrackingPointInput {
  const parsed = trackingPointSchema.safeParse(input);
  if (!parsed.success) {
    throw invalidPoint({ fields: parsed.error.flatten().fieldErrors });
  }

  const maxPastAgeMs = limits.maxPastAgeMs ?? DEFAULT_MAX_TIME_SKEW_MS;
  const maxFutureSkewMs = limits.maxFutureSkewMs ?? DEFAULT_MAX_TIME_SKEW_MS;
  assertNonNegativeLimit(maxPastAgeMs, 'maxPastAgeMs');
  assertNonNegativeLimit(maxFutureSkewMs, 'maxFutureSkewMs');

  const capturedAt = new Date(parsed.data.capturedAt);
  const ageMs = now.getTime() - capturedAt.getTime();
  if (ageMs > maxPastAgeMs) {
    throw invalidPoint({ field: 'capturedAt', reason: 'too_old' });
  }
  if (ageMs < -maxFutureSkewMs) {
    throw invalidPoint({ field: 'capturedAt', reason: 'too_far_in_future' });
  }

  return {
    clientPointId: parsed.data.clientPointId,
    latitude: parsed.data.latitude,
    longitude: parsed.data.longitude,
    ...(parsed.data.accuracyM === undefined
      ? {}
      : { accuracyM: parsed.data.accuracyM }),
    capturedAt,
  };
}

function assertNonNegativeLimit(value: number, name: string): void {
  if (!Number.isFinite(value) || value < 0) {
    throw new RangeError(`${name} must be a non-negative finite number`);
  }
}

function invalidPoint(details: Record<string, unknown>): DomainError {
  return new DomainError(
    'TRACKING_INVALID_POINT',
    400,
    'Tracking point is invalid',
    details,
  );
}
