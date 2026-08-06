import { Buffer } from 'node:buffer';
import { createHmac, timingSafeEqual } from 'node:crypto';

import type { PricingQuote } from './pricing.service.js';
import type {
  GeoPoint,
  RouteEstimate,
  RouteInput,
  VerifiedOrderEstimate,
} from '../providers/map-provider.js';

const DEFAULT_TOKEN_TTL_MS = 10 * 60 * 1_000;
const COORDINATE_PRECISION = 6;
const TOKEN_VERSION = 1;

export interface IssueEstimateTokenInput {
  routeInput: RouteInput;
  estimate: RouteEstimate;
  quote: PricingQuote;
}

export interface EstimateTokenServiceOptions {
  secret: string;
  now?: () => Date;
  ttlMs?: number;
}

interface EstimateTokenPayload {
  v: typeof TOKEN_VERSION;
  routeInput: RouteInput;
  estimate: RouteEstimate;
  quote: PricingQuote;
  expiresAt: string;
}

export class EstimateTokenService {
  private readonly now: () => Date;
  private readonly secret: string;
  private readonly ttlMs: number;

  constructor(options: EstimateTokenServiceOptions) {
    this.secret = validateSecret(options.secret);
    this.now = options.now ?? (() => new Date());
    this.ttlMs = options.ttlMs ?? DEFAULT_TOKEN_TTL_MS;

    if (!Number.isSafeInteger(this.ttlMs) || this.ttlMs <= 0) {
      throw new EstimateTokenConfigError('Estimate token config is invalid');
    }
  }

  static fromEnv(source: NodeJS.ProcessEnv = process.env): EstimateTokenService {
    return new EstimateTokenService({
      secret: source.ESTIMATE_TOKEN_HMAC_SECRET ?? '',
    });
  }

  issue(input: IssueEstimateTokenInput): string {
    const expiresAt = new Date(this.now().getTime() + this.ttlMs).toISOString();
    const payload: EstimateTokenPayload = {
      v: TOKEN_VERSION,
      routeInput: normalizeRouteInput(input.routeInput),
      estimate: {
        ...input.estimate,
        estimatedPriceVnd: validateQuote(input.quote).amountVnd,
      },
      quote: validateQuote(input.quote),
      expiresAt,
    };
    const encodedPayload = encodePayload(payload);

    return `${encodedPayload}.${this.sign(encodedPayload)}`;
  }

  verify(token: string, requestedInput?: RouteInput): VerifiedOrderEstimate {
    const payload = this.verifyPayload(token);
    const expiresAtMs = Date.parse(payload.expiresAt);

    if (!Number.isFinite(expiresAtMs) || expiresAtMs <= this.now().getTime()) {
      throw new EstimateTokenError('Estimate token has expired');
    }

    if (requestedInput) {
      const normalizedRequested = normalizeRouteInput(requestedInput);
      const isMatch =
        normalizedRequested.vehicleType === payload.routeInput.vehicleType &&
        isEqualPoint(normalizedRequested.pickup, payload.routeInput.pickup) &&
        isEqualPoint(normalizedRequested.dropoff, payload.routeInput.dropoff) &&
        normalizedRequested.stops.length === payload.routeInput.stops.length &&
        normalizedRequested.stops.every((stop, i) => isEqualPoint(stop, payload.routeInput.stops[i]!));

      if (!isMatch) {
        throw new EstimateMismatchError('Estimate parameters mismatch');
      }
    }

    return {
      ...payload.estimate,
      estimatedPriceVnd: payload.quote.amountVnd,
      normalizedInput: payload.routeInput,
      expiresAt: payload.expiresAt,
    };
  }

  private verifyPayload(token: string): EstimateTokenPayload {
    const parts = token.split('.');

    if (parts.length !== 2 || parts[0] === undefined || parts[1] === undefined) {
      throw new EstimateTokenError('Estimate token is malformed');
    }

    const [encodedPayload, signature] = parts;

    if (!this.signatureMatches(encodedPayload, signature)) {
      throw new EstimateTokenError('Estimate token signature is invalid');
    }

    return decodePayload(encodedPayload);
  }

  private sign(encodedPayload: string): string {
    return createHmac('sha256', this.secret).update(encodedPayload).digest('base64url');
  }

  private signatureMatches(encodedPayload: string, signature: string): boolean {
    const expectedSignature = this.sign(encodedPayload);
    const expected = Buffer.from(expectedSignature, 'utf8');
    const actual = Buffer.from(signature, 'utf8');

    return expected.length === actual.length && timingSafeEqual(expected, actual);
  }
}

export class EstimateTokenConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'EstimateTokenConfigError';
  }
}

export class EstimateTokenError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'EstimateTokenError';
  }
}

export class EstimateMismatchError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'EstimateMismatchError';
  }
}

function encodePayload(payload: EstimateTokenPayload): string {
  return Buffer.from(JSON.stringify(payload)).toString('base64url');
}

function decodePayload(encodedPayload: string): EstimateTokenPayload {
  try {
    const payload = JSON.parse(Buffer.from(encodedPayload, 'base64url').toString('utf8')) as unknown;

    return validatePayload(payload);
  } catch (error) {
    if (error instanceof EstimateTokenError) {
      throw error;
    }

    throw new EstimateTokenError('Estimate token is malformed');
  }
}

function validatePayload(payload: unknown): EstimateTokenPayload {
  if (!isRecord(payload) || payload.v !== TOKEN_VERSION) {
    throw new EstimateTokenError('Estimate token is malformed');
  }

  const routeInput = routeInputOrNull(payload.routeInput);
  const estimate = routeEstimateOrNull(payload.estimate);
  const quote = quoteOrNull(payload.quote);

  if (routeInput === null || estimate === null || quote === null || typeof payload.expiresAt !== 'string') {
    throw new EstimateTokenError('Estimate token is malformed');
  }

  return {
    v: TOKEN_VERSION,
    routeInput,
    estimate,
    quote,
    expiresAt: payload.expiresAt,
  };
}

function validateSecret(secret: string): string {
  if (secret.trim().length < 32) {
    throw new EstimateTokenConfigError('Estimate token config is invalid');
  }

  return secret;
}

function validateQuote(quote: PricingQuote): PricingQuote {
  if (!isSafePositiveInteger(quote.amountVnd) || quote.currency !== 'VND') {
    throw new EstimateTokenError('Estimate token quote is invalid');
  }

  return quote;
}

function normalizeRouteInput(input: RouteInput): RouteInput {
  return {
    pickup: normalizePoint(input.pickup),
    stops: input.stops.map((stop) => normalizePoint(stop)),
    dropoff: normalizePoint(input.dropoff),
    vehicleType: input.vehicleType.trim().toUpperCase(),
  };
}

function normalizePoint(point: GeoPoint): GeoPoint {
  return {
    latitude: roundCoordinate(point.latitude),
    longitude: roundCoordinate(point.longitude),
  };
}

function isEqualPoint(a: GeoPoint, b: GeoPoint): boolean {
  return a.latitude === b.latitude && a.longitude === b.longitude;
}

function roundCoordinate(value: number): number {
  const factor = 10 ** COORDINATE_PRECISION;

  return Math.round(value * factor) / factor;
}

function routeInputOrNull(value: unknown): RouteInput | null {
  if (!isRecord(value) || !Array.isArray(value.stops) || typeof value.vehicleType !== 'string') {
    return null;
  }

  const pickup = pointOrNull(value.pickup);
  const stops = value.stops.map((stop) => pointOrNull(stop));
  const dropoff = pointOrNull(value.dropoff);

  if (pickup === null || dropoff === null || stops.some((stop) => stop === null)) {
    return null;
  }

  return {
    pickup,
    stops: stops as GeoPoint[],
    dropoff,
    vehicleType: value.vehicleType,
  };
}

function routeEstimateOrNull(value: unknown): RouteEstimate | null {
  if (!isRecord(value)) {
    return null;
  }

  if (
    typeof value.polyline !== 'string' ||
    !isSafeNonNegativeInteger(value.distanceM) ||
    !isSafeNonNegativeInteger(value.durationS) ||
    typeof value.estimatedArrivalAt !== 'string' ||
    !isSafePositiveInteger(value.estimatedPriceVnd) ||
    (value.source !== 'VIETMAP' && value.source !== 'DEMO') ||
    typeof value.calculatedAt !== 'string' ||
    typeof value.isEstimate !== 'boolean'
  ) {
    return null;
  }

  return {
    polyline: value.polyline,
    distanceM: value.distanceM,
    durationS: value.durationS,
    estimatedArrivalAt: value.estimatedArrivalAt,
    estimatedPriceVnd: value.estimatedPriceVnd,
    source: value.source,
    calculatedAt: value.calculatedAt,
    isEstimate: value.isEstimate,
  };
}

function quoteOrNull(value: unknown): PricingQuote | null {
  if (!isRecord(value) || !isSafePositiveInteger(value.amountVnd) || value.currency !== 'VND') {
    return null;
  }

  return {
    amountVnd: value.amountVnd,
    currency: 'VND',
  };
}

function pointOrNull(value: unknown): GeoPoint | null {
  if (!isRecord(value) || !isCoordinate(value.latitude) || !isCoordinate(value.longitude)) {
    return null;
  }

  return {
    latitude: value.latitude,
    longitude: value.longitude,
  };
}

function isCoordinate(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

function isSafePositiveInteger(value: unknown): value is number {
  return typeof value === 'number' && Number.isSafeInteger(value) && value > 0;
}

function isSafeNonNegativeInteger(value: unknown): value is number {
  return typeof value === 'number' && Number.isSafeInteger(value) && value >= 0;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}
