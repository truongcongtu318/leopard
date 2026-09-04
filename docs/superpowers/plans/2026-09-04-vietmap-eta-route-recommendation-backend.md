# Vietmap ETA + Route Recommendation (Backend) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make `POST /orders/estimate` return multiple Vietmap route alternatives (each with its own price + `estimateToken`), driven by congestion annotations and truck cargo capacity, instead of a single flat estimate.

**Architecture:** `MapProvider.route()` changes from returning one `RouteEstimate` to `RouteEstimate[]` (Vietmap's `alternative=true` returns several paths in one call). `MapsService.estimate()` prices and tokenizes every route independently, tags the fastest as recommended, and caps the response at 3 routes. `EstimateTokenService` embeds a `routeId` per token for traceability and binds `cargoWeightKg` into what it signs. No changes to the `orders` module — `verify()` keeps accepting any token issued for the same trip input.

**Tech Stack:** NestJS, native `fetch`, Jest, `js-yaml` (openapi contract test), Vietmap Route API v4.

**Spec:** [docs/superpowers/specs/2026-09-04-vietmap-eta-route-recommendation-design.md](../specs/2026-09-04-vietmap-eta-route-recommendation-design.md)

## Global Constraints

- Max routes returned to the client: **3** (D6). If Vietmap returns more, keep the 3 with lowest `durationS`.
- Recommended route = **lowest `durationS`** among the returned routes (D5). No congestion-weighted scoring.
- `congestionLevel` defaults to `'unknown'` when Vietmap does not provide `annotations.congestion` for a path, or on the demo provider — never guess a level.
- `cargoWeightKg` is **required and validated against `VEHICLE_OPTIONS['TRUCK'].maxWeightKg`** (from `@leopard/shared`) only when `vehicleType === 'TRUCK'`. Never hard-code the weight ceiling as a literal.
- Do not touch any file under `apps/api/src/orders/**` — token verification already works across route alternatives because `pickup/dropoff/stops/vehicleType/cargoWeightKg` are identical for every alternative in one estimate call (D3).
- Do not add toll cost to pricing. `PricingService.quote()` stays unchanged.
- Provider timeout / retry behavior (5s timeout, 1 retry on transient GET) is unchanged — do not touch `fetchWithTimeout`/`getJson`.

---

### Task 1: Core types + `DemoRouteEstimator` return an array with `congestionLevel`

**Files:**
- Modify: `apps/api/src/maps/providers/map-provider.ts`
- Modify: `apps/api/src/maps/domain/demo-route-estimator.ts`
- Modify: `apps/api/src/maps/providers/demo-map.provider.ts:45` (return type annotation only)
- Test: `apps/api/src/maps/domain/demo-route-estimator.spec.ts`

**Interfaces:**
- Produces: `CongestionLevel = 'low' | 'moderate' | 'heavy' | 'severe' | 'unknown'` (exported from `map-provider.ts`).
- Produces: `RouteInput.cargoWeightKg?: number`, `RouteEstimate.congestionLevel: CongestionLevel`, `VerifiedOrderEstimate.routeId: string`.
- Produces: `MapProvider.route(input): Promise<RouteEstimate[]>` and `RouteEstimator.estimate(input): Promise<RouteEstimate[]>` — every later task consumes these as arrays, never a single object.

- [ ] **Step 1: Update the failing test first**

Replace the contents of `apps/api/src/maps/domain/demo-route-estimator.spec.ts`:

```ts
import { describe, expect, it } from '@jest/globals';

import { DemoRouteEstimator } from './demo-route-estimator.js';

describe('DemoRouteEstimator', () => {
  const calculatedAt = new Date('2026-08-01T03:00:00.000Z');

  it('applies the deterministic demo route factor, speed and stop delay', async () => {
    const estimator = new DemoRouteEstimator(() => calculatedAt);

    const estimate = await estimator.estimate({
      pickup: { latitude: 0, longitude: 0 },
      stops: [{ latitude: 0, longitude: 1 }],
      dropoff: { latitude: 1, longitude: 1 },
      vehicleType: 'MOTORBIKE',
    });

    expect(estimate).toEqual([
      {
        polyline: '???_ibE_ibE?',
        distanceM: 277_987,
        durationS: 33_660,
        estimatedArrivalAt: '2026-08-01T12:21:00.000Z',
        estimatedPriceVnd: 0,
        source: 'DEMO',
        isEstimate: true,
        calculatedAt: '2026-08-01T03:00:00.000Z',
        congestionLevel: 'unknown',
      },
    ]);
  });

  it('returns stable output for repeated estimates with the same input and clock', async () => {
    const estimator = new DemoRouteEstimator(() => calculatedAt);
    const input = {
      pickup: { latitude: 10.762622, longitude: 106.660172 },
      stops: [
        { latitude: 10.776889, longitude: 106.700806 },
        { latitude: 10.801465, longitude: 106.652597 },
      ],
      dropoff: { latitude: 10.823099, longitude: 106.629664 },
      vehicleType: 'VAN',
    };

    await expect(estimator.estimate(input)).resolves.toEqual(
      await estimator.estimate(input),
    );
  });

  it('always returns exactly one route (demo data does not simulate alternatives)', async () => {
    const estimator = new DemoRouteEstimator(() => calculatedAt);

    const estimate = await estimator.estimate({
      pickup: { latitude: 10.7, longitude: 106.6 },
      stops: [],
      dropoff: { latitude: 10.8, longitude: 106.7 },
      vehicleType: 'TRUCK',
      cargoWeightKg: 2_000,
    });

    expect(estimate).toHaveLength(1);
    expect(estimate[0]?.congestionLevel).toBe('unknown');
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `pnpm --filter api test -- demo-route-estimator.spec.ts`
Expected: FAIL — `estimate` resolves to an object, not an array, and has no `congestionLevel` field.

- [ ] **Step 3: Update the shared provider types**

In `apps/api/src/maps/providers/map-provider.ts`, apply these changes:

```ts
export type CongestionLevel = 'low' | 'moderate' | 'heavy' | 'severe' | 'unknown';

export interface RouteInput {
  pickup: GeoPoint;
  stops: GeoPoint[];
  dropoff: GeoPoint;
  vehicleType: string;
  cargoWeightKg?: number;
}

export interface RouteEstimate {
  polyline: string;
  distanceM: number;
  durationS: number;
  estimatedArrivalAt: string;
  estimatedPriceVnd: number;
  source: MapProviderSource;
  calculatedAt: string;
  isEstimate: boolean;
  congestionLevel: CongestionLevel;
}

export interface VerifiedOrderEstimate extends RouteEstimate {
  routeId: string;
  normalizedInput: RouteInput;
  expiresAt: string;
}

export interface RouteEstimator {
  estimate(input: RouteInput): Promise<RouteEstimate[]>;
}

export interface MapProvider {
  search(query: string): Promise<PlaceCandidate[]>;
  geocode(placeId: string): Promise<GeocodeResult>;
  route(input: RouteInput): Promise<RouteEstimate[]>;
}
```

(`GeoPoint`, `MapProviderNotFoundError`, `MapProviderSource`, `PlaceCandidate`, `GeocodeResult` stay exactly as they are today — only the blocks shown above change.)

- [ ] **Step 4: Update `DemoRouteEstimator` to return an array**

In `apps/api/src/maps/domain/demo-route-estimator.ts`, replace the `estimate` method body:

```ts
  async estimate(input: RouteInput): Promise<RouteEstimate[]> {
    const calculatedAt = this.now();
    const routePoints = [input.pickup, ...input.stops, input.dropoff];
    const distanceM = Math.round(sumHaversineLegsMeters(routePoints) * ROAD_FACTOR);
    const durationS = roundToMinute(
      distanceM / SPEED_METERS_PER_SECOND + input.stops.length * STOP_DELAY_SECONDS,
    );
    const estimatedArrivalAt = new Date(calculatedAt.getTime() + durationS * 1_000);

    return [
      {
        polyline: encodePolyline(routePoints),
        distanceM,
        durationS,
        estimatedArrivalAt: estimatedArrivalAt.toISOString(),
        estimatedPriceVnd: 0,
        source: 'DEMO',
        isEstimate: true,
        calculatedAt: calculatedAt.toISOString(),
        congestionLevel: 'unknown',
      },
    ];
  }
```

- [ ] **Step 5: Fix `DemoMapProvider`'s return type annotation**

In `apps/api/src/maps/providers/demo-map.provider.ts`, change:

```ts
  async route(input: RouteInput): Promise<RouteEstimate> {
    return this.estimator.estimate(input);
  }
```

to:

```ts
  async route(input: RouteInput): Promise<RouteEstimate[]> {
    return this.estimator.estimate(input);
  }
```

- [ ] **Step 6: Run the tests to verify they pass**

Run: `pnpm --filter api test -- demo-route-estimator.spec.ts`
Expected: PASS (3 tests). Also run `pnpm --filter api typecheck` — it will still fail here because `VietmapProvider` and `ResilientMapProvider` haven't been updated yet (Task 2). That is expected; do not fix those files in this task.

- [ ] **Step 7: Commit**

```bash
git add apps/api/src/maps/providers/map-provider.ts apps/api/src/maps/domain/demo-route-estimator.ts apps/api/src/maps/providers/demo-map.provider.ts apps/api/src/maps/domain/demo-route-estimator.spec.ts
git commit -m "feat(maps): return route estimates as arrays with congestion level"
```

---

### Task 2: `VietmapProvider` — alternatives, congestion, truck capacity

**Files:**
- Modify: `apps/api/src/maps/providers/vietmap.provider.ts`
- Modify: `apps/api/src/maps/providers/resilient-map.provider.ts:34` (return type annotation only)
- Test: `apps/api/src/maps/providers/vietmap.provider.spec.ts`

**Interfaces:**
- Consumes: `RouteInput.cargoWeightKg`, `RouteEstimate.congestionLevel`, `CongestionLevel` from Task 1.
- Produces: `VietmapProvider.route(input): Promise<RouteEstimate[]>` — one entry per Vietmap `paths[]` element, congestion derived per path. Later tasks (`MapsService`) consume this array directly.

- [ ] **Step 1: Update the failing tests first**

In `apps/api/src/maps/providers/vietmap.provider.spec.ts`, replace the existing `'maps Route v4 payloads to shared route estimates without leaking SDK types'` test with:

```ts
  it('requests alternatives and congestion annotations, mapping every returned path', async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse(200, {
        code: 'OK',
        paths: [
          {
            distance: 2_194.4,
            time: 351_400,
            points: '}s{`Ac_hjSjAkCFQRu@',
            annotations: { congestion: ['low', 'moderate'] },
          },
          {
            distance: 2_600.1,
            time: 300_000,
            points: 'abcDefgHijkL',
            annotations: { congestion: ['severe'] },
          },
        ],
      }),
    );
    const provider = vietmapProvider(fetchMock);

    await expect(provider.route(routeInput())).resolves.toEqual([
      {
        polyline: '}s{`Ac_hjSjAkCFQRu@',
        distanceM: 2_194,
        durationS: 351,
        estimatedArrivalAt: '2026-08-01T03:05:51.000Z',
        estimatedPriceVnd: 0,
        source: 'VIETMAP',
        calculatedAt: '2026-08-01T03:00:00.000Z',
        isEstimate: true,
        congestionLevel: 'moderate',
      },
      {
        polyline: 'abcDefgHijkL',
        distanceM: 2_600,
        durationS: 300,
        estimatedArrivalAt: '2026-08-01T03:05:00.000Z',
        estimatedPriceVnd: 0,
        source: 'VIETMAP',
        calculatedAt: '2026-08-01T03:00:00.000Z',
        isEstimate: true,
        congestionLevel: 'severe',
      },
    ]);

    const requestedUrl = getRequestedUrl(fetchMock);
    expect(requestedUrl.pathname).toBe('/api/route/v4');
    expect(requestedUrl.searchParams.get('alternative')).toBe('true');
    expect(requestedUrl.searchParams.get('annotations')).toBe('congestion');
    expect(requestedUrl.searchParams.get('vehicle')).toBe('motorcycle');
    expect(requestedUrl.searchParams.get('points_encoded')).toBe('true');
  });

  it('falls back to unknown congestion when a path has no annotations', async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse(200, {
        code: 'OK',
        paths: [{ distance: 1_000, time: 60_000, points: 'poly' }],
      }),
    );
    const provider = vietmapProvider(fetchMock);

    const [route] = await provider.route(routeInput());
    expect(route?.congestionLevel).toBe('unknown');
  });

  it('skips invalid paths but keeps the valid alternatives', async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse(200, {
        code: 'OK',
        paths: [
          { distance: 1_000, time: 60_000, points: 'valid-poly' },
          { distance: 'not-a-number', time: 60_000, points: 'broken' },
        ],
      }),
    );
    const provider = vietmapProvider(fetchMock);

    await expect(provider.route(routeInput())).resolves.toHaveLength(1);
  });

  it('fails when every returned path is invalid', async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse(200, {
        code: 'OK',
        paths: [{ distance: 'not-a-number', time: 60_000, points: 'broken' }],
      }),
    );
    const provider = vietmapProvider(fetchMock);

    const error = await catchError(provider.route(routeInput()));
    expect(error.message).toBe('Vietmap route failed: no valid route path in response');
  });

  it('sends truck capacity from cargoWeightKg and rejects trucks missing it', async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse(200, {
        code: 'OK',
        paths: [{ distance: 5_000, time: 900_000, points: 'truck-poly' }],
      }),
    );
    const provider = vietmapProvider(fetchMock);

    await provider.route({ ...routeInput(), vehicleType: 'TRUCK', cargoWeightKg: 1_250 });

    const requestedUrl = getRequestedUrl(fetchMock);
    expect(requestedUrl.searchParams.get('vehicle')).toBe('truck');
    expect(requestedUrl.searchParams.get('capacity')).toBe('1250');

    const error = await catchError(
      provider.route({ ...routeInput(), vehicleType: 'TRUCK' }),
    );
    expect(error.message).toBe('Vietmap route failed: cargoWeightKg is required for truck routing');
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
```

Also update the two `ResilientMapProvider` tests that assert on `route()` (they now resolve to an array):

```ts
  it('falls back to the demo provider only when ALLOW_DEMO_PROVIDER=true', async () => {
    process.env.ALLOW_DEMO_PROVIDER = 'true';
    const provider = new ResilientMapProvider(
      failingProvider(),
      new DemoMapProvider(),
    );

    const result = await provider.route(routeInput());
    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({ source: 'DEMO', isEstimate: true });
  });
```

(the `'does not use demo fallback...'` and `'does not replace a provider not-found...'` tests are unchanged — they assert on rejection, not on the resolved shape).

- [ ] **Step 2: Run the tests to verify they fail**

Run: `pnpm --filter api test -- vietmap.provider.spec.ts`
Expected: FAIL — no `alternative`/`annotations` params sent yet, `route()` still returns a single object, no `capacity` handling.

- [ ] **Step 3: Implement in `vietmap.provider.ts`**

Add `CongestionLevel` to the type-only import at the top of the file:

```ts
import type {
  GeocodeResult,
  GeoPoint,
  MapProvider,
  PlaceCandidate,
  RouteEstimate,
  RouteInput,
  CongestionLevel,
} from './map-provider.js';
```

Add an `annotations` field to `VietmapRoutePath`:

```ts
interface VietmapRoutePath {
  distance?: unknown;
  time?: unknown;
  points?: unknown;
  annotations?: unknown;
}
```

Replace the `route` method and `buildRouteUrl` method:

```ts
  async route(input: RouteInput): Promise<RouteEstimate[]> {
    const url = this.buildRouteUrl(input);
    const payload = await this.getJson<VietmapRouteResponse>(url, 'route');
    const paths = allRoutePaths(payload, this.options.apiKey);
    const calculatedAt = this.now();

    const estimates = paths.flatMap((path) => {
      const distance = numberOrNull(path.distance);
      const durationMs = numberOrNull(path.time);

      if (distance === null || durationMs === null || typeof path.points !== 'string') {
        return [];
      }

      const durationS = Math.round(durationMs / 1_000);
      const estimatedArrivalAt = new Date(calculatedAt.getTime() + durationS * 1_000);

      return [
        {
          polyline: path.points,
          distanceM: Math.round(distance),
          durationS,
          estimatedArrivalAt: estimatedArrivalAt.toISOString(),
          estimatedPriceVnd: 0,
          source: 'VIETMAP' as const,
          calculatedAt: calculatedAt.toISOString(),
          isEstimate: true,
          congestionLevel: deriveCongestionLevel(path),
        },
      ];
    });

    if (estimates.length === 0) {
      throw new VietmapProviderError('Vietmap route failed: no valid route path in response');
    }

    return estimates;
  }

  private buildRouteUrl(input: RouteInput): URL {
    const points = [input.pickup, ...input.stops, input.dropoff];
    const params: Record<string, string> = {
      points_encoded: 'true',
      vehicle: mapVehicleType(input.vehicleType),
      alternative: 'true',
      annotations: 'congestion',
    };

    if (input.vehicleType === 'TRUCK') {
      if (input.cargoWeightKg === undefined) {
        throw new VietmapProviderError('Vietmap route failed: cargoWeightKg is required for truck routing');
      }

      params.capacity = String(input.cargoWeightKg);
    }

    const url = this.buildUrl('/api/route/v4', params);

    for (const point of points) {
      url.searchParams.append('point', `${point.latitude},${point.longitude}`);
    }

    return url;
  }
```

Replace `firstRoutePath` with `allRoutePaths` and add `deriveCongestionLevel`:

```ts
function allRoutePaths(payload: VietmapRouteResponse, apiKey: string): VietmapRoutePath[] {
  if (payload.code !== 'OK' || !Array.isArray(payload.paths) || payload.paths.length === 0) {
    throw new VietmapProviderError(
      redactSecrets(
        `Vietmap route failed: ${stringOrNull(payload.messages) ?? 'no route found'}`,
        apiKey,
      ),
    );
  }

  return payload.paths.filter((path): path is VietmapRoutePath => isRecord(path));
}

const CONGESTION_SEVERITY: readonly CongestionLevel[] = ['low', 'moderate', 'heavy', 'severe'];

function deriveCongestionLevel(path: VietmapRoutePath): CongestionLevel {
  const annotations = path.annotations;

  if (!isRecord(annotations) || !Array.isArray(annotations.congestion)) {
    return 'unknown';
  }

  let worst: CongestionLevel = 'unknown';
  let worstRank = -1;

  for (const level of annotations.congestion) {
    const rank = CONGESTION_SEVERITY.indexOf(level as CongestionLevel);

    if (rank > worstRank) {
      worstRank = rank;
      worst = level as CongestionLevel;
    }
  }

  return worst;
}
```

- [ ] **Step 4: Fix `ResilientMapProvider`'s return type annotation**

In `apps/api/src/maps/providers/resilient-map.provider.ts`, change:

```ts
  async route(input: RouteInput): Promise<RouteEstimate> {
    return this.withDemoFallback((provider) => provider.route(input));
  }
```

to:

```ts
  async route(input: RouteInput): Promise<RouteEstimate[]> {
    return this.withDemoFallback((provider) => provider.route(input));
  }
```

- [ ] **Step 5: Run the tests to verify they pass**

Run: `pnpm --filter api test -- vietmap.provider.spec.ts`
Expected: PASS (all tests, including the 5 new/updated ones).

- [ ] **Step 6: Verify the assumed `annotations.congestion` shape against the real API**

Vietmap's docs describe `annotations` as `object[]` but the published example response doesn't show it populated. Using your Default Key, run one real request with `annotations=congestion` (curl or Postman) against `/api/route/v4` and inspect the actual JSON shape of `paths[].annotations`. If it differs from `{ congestion: string[] }` (e.g. nested per-leg, or objects instead of plain strings), update `deriveCongestionLevel` and its test fixtures in this task before moving on — this is a required verification, not optional cleanup, because `congestionLevel` is user-facing.

- [ ] **Step 7: Commit**

```bash
git add apps/api/src/maps/providers/vietmap.provider.ts apps/api/src/maps/providers/resilient-map.provider.ts apps/api/src/maps/providers/vietmap.provider.spec.ts
git commit -m "feat(maps): request Vietmap alternatives, congestion and truck capacity"
```

---

### Task 3: `EstimateTokenService` — per-route `routeId` + `cargoWeightKg` binding

**Files:**
- Modify: `apps/api/src/maps/domain/estimate-token.service.ts`
- Test: `apps/api/src/maps/domain/estimate-token.service.spec.ts`

**Interfaces:**
- Consumes: `CongestionLevel`, `RouteEstimate.congestionLevel`, `RouteInput.cargoWeightKg` from Task 1.
- Produces: `IssueEstimateTokenInput.routeId: string` (required), `VerifiedOrderEstimate.routeId: string` — `MapsService` (Task 4) calls `issue()` once per route with a distinct `routeId` and reads `routeId` back from `verify()`.

- [ ] **Step 1: Rewrite the test file first**

Replace the contents of `apps/api/src/maps/domain/estimate-token.service.spec.ts`:

```ts
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
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `pnpm --filter api test -- estimate-token.service.spec.ts`
Expected: FAIL — `issue()` doesn't accept `routeId` yet, `verify()` doesn't return it, `cargoWeightKg` isn't part of the match.

- [ ] **Step 3: Implement in `estimate-token.service.ts`**

Add `CongestionLevel` to the type-only import:

```ts
import type {
  GeoPoint,
  RouteEstimate,
  RouteInput,
  VerifiedOrderEstimate,
  CongestionLevel,
} from '../providers/map-provider.js';
```

Update `IssueEstimateTokenInput` and `EstimateTokenPayload`:

```ts
export interface IssueEstimateTokenInput {
  routeInput: RouteInput;
  estimate: RouteEstimate;
  quote: PricingQuote;
  routeId: string;
}

interface EstimateTokenPayload {
  v: typeof TOKEN_VERSION;
  routeInput: RouteInput;
  estimate: RouteEstimate;
  quote: PricingQuote;
  routeId: string;
  expiresAt: string;
}
```

Update `issue()`:

```ts
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
      routeId: validateRouteId(input.routeId),
      expiresAt,
    };
    const encodedPayload = encodePayload(payload);

    return `${encodedPayload}.${this.sign(encodedPayload)}`;
  }
```

Update `verify()`'s match check and return value:

```ts
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
        normalizedRequested.stops.every((stop, i) => isEqualPoint(stop, payload.routeInput.stops[i]!)) &&
        normalizedRequested.cargoWeightKg === payload.routeInput.cargoWeightKg;

      if (!isMatch) {
        throw new EstimateMismatchError('Estimate parameters mismatch');
      }
    }

    return {
      ...payload.estimate,
      estimatedPriceVnd: payload.quote.amountVnd,
      routeId: payload.routeId,
      normalizedInput: payload.routeInput,
      expiresAt: payload.expiresAt,
    };
  }
```

Add `validateRouteId` next to `validateSecret`:

```ts
function validateRouteId(routeId: string): string {
  if (routeId.trim().length === 0) {
    throw new EstimateTokenError('Estimate token routeId is invalid');
  }

  return routeId;
}
```

Update `normalizeRouteInput` to carry `cargoWeightKg`:

```ts
function normalizeRouteInput(input: RouteInput): RouteInput {
  return {
    pickup: normalizePoint(input.pickup),
    stops: input.stops.map((stop) => normalizePoint(stop)),
    dropoff: normalizePoint(input.dropoff),
    vehicleType: input.vehicleType.trim().toUpperCase(),
    ...(input.cargoWeightKg === undefined ? {} : { cargoWeightKg: Math.round(input.cargoWeightKg) }),
  };
}
```

Update `validatePayload` to require `routeId`:

```ts
function validatePayload(payload: unknown): EstimateTokenPayload {
  if (!isRecord(payload) || payload.v !== TOKEN_VERSION) {
    throw new EstimateTokenError('Estimate token is malformed');
  }

  const routeInput = routeInputOrNull(payload.routeInput);
  const estimate = routeEstimateOrNull(payload.estimate);
  const quote = quoteOrNull(payload.quote);

  if (
    routeInput === null ||
    estimate === null ||
    quote === null ||
    typeof payload.routeId !== 'string' ||
    payload.routeId.length === 0 ||
    typeof payload.expiresAt !== 'string'
  ) {
    throw new EstimateTokenError('Estimate token is malformed');
  }

  return {
    v: TOKEN_VERSION,
    routeInput,
    estimate,
    quote,
    routeId: payload.routeId,
    expiresAt: payload.expiresAt,
  };
}
```

Update `routeInputOrNull` to parse optional `cargoWeightKg`:

```ts
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

  if (value.cargoWeightKg !== undefined && !isSafePositiveInteger(value.cargoWeightKg)) {
    return null;
  }

  return {
    pickup,
    stops: stops as GeoPoint[],
    dropoff,
    vehicleType: value.vehicleType,
    ...(value.cargoWeightKg === undefined ? {} : { cargoWeightKg: value.cargoWeightKg }),
  };
}
```

Update `routeEstimateOrNull` to require `congestionLevel`, and add `isCongestionLevel`:

```ts
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
    typeof value.isEstimate !== 'boolean' ||
    !isCongestionLevel(value.congestionLevel)
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
    congestionLevel: value.congestionLevel,
  };
}

function isCongestionLevel(value: unknown): value is CongestionLevel {
  return (
    value === 'low' ||
    value === 'moderate' ||
    value === 'heavy' ||
    value === 'severe' ||
    value === 'unknown'
  );
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `pnpm --filter api test -- estimate-token.service.spec.ts`
Expected: PASS (9 tests).

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/maps/domain/estimate-token.service.ts apps/api/src/maps/domain/estimate-token.service.spec.ts
git commit -m "feat(maps): bind routeId and cargoWeightKg into estimate tokens"
```

---

### Task 4: `MapsService` — compose the multi-route response

**Files:**
- Modify: `apps/api/src/maps/maps.service.ts`
- Test: `apps/api/src/maps/maps.service.spec.ts` (new file)

**Interfaces:**
- Consumes: `MapProvider.route(): Promise<RouteEstimate[]>` (Task 2), `EstimateTokenService.issue({..., routeId})` (Task 3).
- Produces: `OrderEstimateResponse = { routes: RouteOptionResponse[] }`, `RouteOptionResponse extends RouteEstimate { routeId: string; estimateToken: string; isRecommended: boolean }` — `maps.controller.ts` (Task 5) returns this directly.

- [ ] **Step 1: Write the failing test first**

Create `apps/api/src/maps/maps.service.spec.ts`:

```ts
import { describe, expect, it, jest } from '@jest/globals';

import { MapsService } from './maps.service.js';
import type { EstimateTokenService } from './domain/estimate-token.service.js';
import type { PricingService } from './domain/pricing.service.js';
import type { MapProvider, RouteEstimate, RouteInput } from './providers/map-provider.js';

describe('MapsService.estimate', () => {
  const routeInput: RouteInput = {
    pickup: { latitude: 10.76, longitude: 106.66 },
    stops: [],
    dropoff: { latitude: 10.8, longitude: 106.7 },
    vehicleType: 'MOTORBIKE',
  };

  function estimateOf(durationS: number, distanceM: number): RouteEstimate {
    return {
      polyline: `polyline-${durationS}`,
      distanceM,
      durationS,
      estimatedArrivalAt: '2026-08-01T03:30:00.000Z',
      estimatedPriceVnd: 0,
      source: 'VIETMAP',
      calculatedAt: '2026-08-01T03:00:00.000Z',
      isEstimate: true,
      congestionLevel: 'unknown',
    };
  }

  function services(routeEstimates: RouteEstimate[]) {
    const mapProvider: MapProvider = {
      search: jest.fn<MapProvider['search']>(),
      geocode: jest.fn<MapProvider['geocode']>(),
      route: jest.fn<MapProvider['route']>().mockResolvedValue(routeEstimates),
    };
    const pricingService = {
      quote: jest
        .fn<PricingService['quote']>()
        .mockImplementation(({ distanceMeters }) => ({
          amountVnd: 10_000 + distanceMeters,
          currency: 'VND',
        })),
    } as unknown as PricingService;
    const estimateTokenService = {
      issue: jest
        .fn<EstimateTokenService['issue']>()
        .mockImplementation(({ routeId }) => `token-${routeId}`),
    } as unknown as EstimateTokenService;

    return { mapProvider, pricingService, estimateTokenService };
  }

  it('recommends the route with the lowest durationS', async () => {
    const { mapProvider, pricingService, estimateTokenService } = services([
      estimateOf(1_800, 12_000),
      estimateOf(1_620, 14_000),
      estimateOf(2_100, 11_000),
    ]);
    const service = new MapsService(mapProvider, pricingService, estimateTokenService);

    const result = await service.estimate(routeInput);

    expect(result.routes).toHaveLength(3);
    const recommended = result.routes.filter((route) => route.isRecommended);
    expect(recommended).toHaveLength(1);
    expect(recommended[0]?.durationS).toBe(1_620);
  });

  it('limits the response to at most 3 routes, keeping the fastest ones', async () => {
    const { mapProvider, pricingService, estimateTokenService } = services([
      estimateOf(2_000, 10_000),
      estimateOf(1_500, 9_000),
      estimateOf(1_800, 11_000),
      estimateOf(2_500, 8_000),
    ]);
    const service = new MapsService(mapProvider, pricingService, estimateTokenService);

    const result = await service.estimate(routeInput);

    expect(result.routes).toHaveLength(3);
    expect(result.routes.map((route) => route.durationS).sort((a, b) => a - b)).toEqual([
      1_500, 1_800, 2_000,
    ]);
  });

  it('issues a distinct token and routeId for every route, priced from its own distance', async () => {
    const { mapProvider, pricingService, estimateTokenService } = services([
      estimateOf(1_800, 12_000),
      estimateOf(1_620, 14_000),
    ]);
    const service = new MapsService(mapProvider, pricingService, estimateTokenService);

    const result = await service.estimate(routeInput);

    expect(result.routes.map((route) => route.routeId)).toEqual(['route-0', 'route-1']);
    expect(result.routes.map((route) => route.estimateToken)).toEqual([
      'token-route-0',
      'token-route-1',
    ]);
    expect(result.routes[0]?.estimatedPriceVnd).toBe(10_000 + 12_000);
    expect(result.routes[1]?.estimatedPriceVnd).toBe(10_000 + 14_000);
  });

  it('throws MAP_PROVIDER_UNAVAILABLE when the provider returns no routes', async () => {
    const { mapProvider, pricingService, estimateTokenService } = services([]);
    const service = new MapsService(mapProvider, pricingService, estimateTokenService);

    await expect(service.estimate(routeInput)).rejects.toMatchObject({
      code: 'MAP_PROVIDER_UNAVAILABLE',
    });
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm --filter api test -- maps.service.spec.ts`
Expected: FAIL — `estimate()` still returns a flat single-route object, `routeId`/`isRecommended` don't exist, no 3-route cap.

- [ ] **Step 3: Implement in `maps.service.ts`**

Replace the full file:

```ts
import { Inject, Injectable } from '@nestjs/common';

import { DomainError } from '../common/domain-error.js';
import { EstimateTokenService } from './domain/estimate-token.service.js';
import { PricingService } from './domain/pricing.service.js';
import { DemoMapProvider } from './providers/demo-map.provider.js';
import type {
  GeocodeResult,
  MapProviderSource,
  MapProvider,
  PlaceCandidate,
  RouteEstimate,
  RouteInput,
} from './providers/map-provider.js';
import { MapProviderNotFoundError } from './providers/map-provider.js';

export const MAP_PROVIDER = Symbol('MAP_PROVIDER');
const MAX_ROUTES = 3;

export interface RouteOptionResponse extends RouteEstimate {
  routeId: string;
  estimateToken: string;
  isRecommended: boolean;
}

export interface OrderEstimateResponse {
  routes: RouteOptionResponse[];
}

export class MapPlaceNotFoundError extends Error {
  constructor() {
    super('Map place not found');
    this.name = 'MapPlaceNotFoundError';
    Object.setPrototypeOf(this, MapPlaceNotFoundError.prototype);
  }
}

@Injectable()
export class MapsService {
  constructor(
    @Inject(MAP_PROVIDER) private readonly mapProvider: MapProvider,
    private readonly pricingService: PricingService,
    private readonly estimateTokenService: EstimateTokenService,
  ) {}

  async search(query: string): Promise<PlaceCandidate[]> {
    return this.withProvider(() => this.mapProvider.search(query));
  }

  async geocode(placeId: string): Promise<GeocodeResult> {
    try {
      return await this.mapProvider.geocode(placeId);
    } catch (error) {
      if (error instanceof MapProviderNotFoundError) {
        throw new MapPlaceNotFoundError();
      }

      throw this.providerUnavailableError();
    }
  }

  async estimate(input: RouteInput): Promise<OrderEstimateResponse> {
    const routeEstimates = await this.withProvider(() => this.mapProvider.route(input));

    if (routeEstimates.length === 0) {
      throw this.providerUnavailableError();
    }

    const limited = [...routeEstimates]
      .sort((a, b) => a.durationS - b.durationS)
      .slice(0, MAX_ROUTES);

    const routes = limited.map((estimate, index) => {
      const routeId = `route-${index}`;
      const quote = this.pricingService.quote({
        vehicleType: input.vehicleType,
        distanceMeters: estimate.distanceM,
        stopCount: input.stops.length,
      });
      const pricedEstimate = { ...estimate, estimatedPriceVnd: quote.amountVnd };
      const estimateToken = this.estimateTokenService.issue({
        routeInput: input,
        estimate: pricedEstimate,
        quote,
        routeId,
      });

      return {
        ...pricedEstimate,
        routeId,
        estimateToken,
        isRecommended: index === 0,
      };
    });

    return { routes };
  }

  defaultSource(): MapProviderSource {
    return this.mapProvider instanceof DemoMapProvider ? 'DEMO' : 'VIETMAP';
  }

  private async withProvider<T>(operation: () => Promise<T>): Promise<T> {
    try {
      return await operation();
    } catch {
      throw this.providerUnavailableError();
    }
  }

  private providerUnavailableError(): DomainError {
    return new DomainError(
      'MAP_PROVIDER_UNAVAILABLE',
      503,
      'Dịch vụ bản đồ tạm thời không khả dụng',
    );
  }
}
```

(`index === 0` is correct because `limited` is already sorted ascending by `durationS` before mapping.)

- [ ] **Step 4: Run the test to verify it passes**

Run: `pnpm --filter api test -- maps.service.spec.ts`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/maps/maps.service.ts apps/api/src/maps/maps.service.spec.ts
git commit -m "feat(maps): compose multi-route estimate responses with per-route pricing"
```

---

### Task 5: `maps.controller.ts` — `cargoWeightKg` validation + response wiring

**Files:**
- Modify: `apps/api/src/maps/maps.controller.ts`
- Modify: `apps/api/src/maps/maps.e2e-spec.ts`

**Interfaces:**
- Consumes: `OrderEstimateResponse` from `maps.service.ts` (Task 4), `VEHICLE_OPTIONS` from `@leopard/shared`.
- Produces: `EstimateRequestDto.cargoWeightKg?: number`, HTTP 400 when a `TRUCK` request omits or exceeds `cargoWeightKg`.

- [ ] **Step 1: Update the failing e2e tests first**

In `apps/api/src/maps/maps.e2e-spec.ts`, update the `'issues a bounded route estimate token with route, price, ETA and source fields'` test's assertion (keep the `.send({...})` block unchanged):

```ts
      expect(response.body).toEqual({
        routes: [
          {
            routeId: 'route-0',
            estimateToken: expect.any(String) as string,
            isRecommended: true,
            polyline: expect.any(String) as string,
            distanceM: 0,
            durationS: 0,
            estimatedArrivalAt: expect.any(String) as string,
            estimatedPriceVnd: 10_000,
            source: 'DEMO',
            isEstimate: true,
            calculatedAt: expect.any(String) as string,
            congestionLevel: 'unknown',
          },
        ],
      });
      expect(response.body.routes[0].estimateToken).toContain('.');
```

Then add three new tests right after it (still inside the same `describe` block):

```ts
  it('rejects truck route estimates missing cargoWeightKg', async () => {
    const app = await createApp();
    const session = await loginDemo(app);
    const point = { latitude: 10.762622, longitude: 106.660172 };

    try {
      const response = await request(app.getHttpServer())
        .post('/orders/estimate')
        .set('Authorization', bearer(session))
        .send({
          pickup: { type: 'PICKUP', address: 'A', lat: point.latitude, lng: point.longitude },
          dropoff: { type: 'DROPOFF', address: 'B', lat: point.latitude, lng: point.longitude },
          vehicleType: 'TRUCK',
        })
        .expect(400);

      expect(response.body).toMatchObject({ statusCode: 400, code: 'BAD_REQUEST' });
    } finally {
      await app.close();
    }
  });

  it('rejects truck route estimates whose cargoWeightKg exceeds the vehicle max', async () => {
    const app = await createApp();
    const session = await loginDemo(app);
    const point = { latitude: 10.762622, longitude: 106.660172 };

    try {
      const response = await request(app.getHttpServer())
        .post('/orders/estimate')
        .set('Authorization', bearer(session))
        .send({
          pickup: { type: 'PICKUP', address: 'A', lat: point.latitude, lng: point.longitude },
          dropoff: { type: 'DROPOFF', address: 'B', lat: point.latitude, lng: point.longitude },
          vehicleType: 'TRUCK',
          cargoWeightKg: 999_999,
        })
        .expect(400);

      expect(response.body).toMatchObject({ statusCode: 400, code: 'BAD_REQUEST' });
    } finally {
      await app.close();
    }
  });

  it('accepts a truck route estimate with a valid cargoWeightKg', async () => {
    const app = await createApp();
    const session = await loginDemo(app);
    const point = { latitude: 10.762622, longitude: 106.660172 };

    try {
      const response = await request(app.getHttpServer())
        .post('/orders/estimate')
        .set('Authorization', bearer(session))
        .send({
          pickup: { type: 'PICKUP', address: 'A', lat: point.latitude, lng: point.longitude },
          dropoff: { type: 'DROPOFF', address: 'B', lat: point.latitude, lng: point.longitude },
          vehicleType: 'TRUCK',
          cargoWeightKg: 2_500,
        })
        .expect(200);

      expect(response.body.routes[0]).toMatchObject({ isRecommended: true });
    } finally {
      await app.close();
    }
  });
```

- [ ] **Step 2: Run the e2e tests to verify they fail**

Run: `pnpm --filter api test:e2e -- maps.e2e-spec.ts`
Expected: FAIL — response is still the old flat shape, and `TRUCK` requests aren't rejected/validated for `cargoWeightKg`.

- [ ] **Step 3: Implement in `maps.controller.ts`**

Add the import:

```ts
import { VEHICLE_OPTIONS } from '@leopard/shared';
```

Update `EstimateRequestDto`:

```ts
interface EstimateRequestDto {
  pickup: EstimateStop;
  stops: EstimateStop[];
  dropoff: EstimateStop;
  vehicleType: VehicleType;
  cargoWeightKg?: number;
}
```

Update `validateEstimateRequest`:

```ts
function validateEstimateRequest(rawBody: unknown): EstimateRequestDto {
  const issues: ValidationIssue[] = [];
  const body = recordOrNull(rawBody);

  if (body === null) {
    validationError([{ field: 'body', messages: ['must be an object'] }]);
  }

  const pickup = validateEstimateStop(body.pickup, 'pickup', issues);
  const stops = validateStops(body.stops, issues);
  const dropoff = validateEstimateStop(body.dropoff, 'dropoff', issues);
  const vehicleType = validateVehicleType(body.vehicleType, issues);
  const cargoWeightKg = validateCargoWeightKg(body.cargoWeightKg, vehicleType, issues);

  if (issues.length > 0 || pickup === null || dropoff === null || vehicleType === null) {
    validationError(issues);
  }

  return {
    pickup,
    stops,
    dropoff,
    vehicleType,
    ...(cargoWeightKg === undefined ? {} : { cargoWeightKg }),
  };
}

function validateCargoWeightKg(
  rawValue: unknown,
  vehicleType: VehicleType | null,
  issues: ValidationIssue[],
): number | undefined {
  if (vehicleType !== 'TRUCK') {
    return undefined;
  }

  if (typeof rawValue !== 'number' || !Number.isSafeInteger(rawValue) || rawValue <= 0) {
    issues.push({
      field: 'cargoWeightKg',
      messages: ['is required and must be a positive integer when vehicleType is TRUCK'],
    });
    return undefined;
  }

  const maxWeightKg = VEHICLE_OPTIONS.find((option) => option.type === 'TRUCK')?.maxWeightKg ?? 0;

  if (rawValue > maxWeightKg) {
    issues.push({ field: 'cargoWeightKg', messages: [`must not exceed ${maxWeightKg}`] });
    return undefined;
  }

  return rawValue;
}
```

Update `toRouteInput`:

```ts
function toRouteInput(request: EstimateRequestDto): RouteInput {
  return {
    pickup: toGeoPoint(request.pickup),
    stops: request.stops.map(toGeoPoint),
    dropoff: toGeoPoint(request.dropoff),
    vehicleType: request.vehicleType,
    ...(request.cargoWeightKg === undefined ? {} : { cargoWeightKg: request.cargoWeightKg }),
  };
}
```

- [ ] **Step 4: Run the e2e tests to verify they pass**

Run: `pnpm --filter api test:e2e -- maps.e2e-spec.ts`
Expected: PASS (all tests, including the 3 new truck-validation ones).

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/maps/maps.controller.ts apps/api/src/maps/maps.e2e-spec.ts
git commit -m "feat(maps): validate cargoWeightKg against VEHICLE_OPTIONS and return multi-route estimates"
```

---

### Task 6: OpenAPI contract sync

**Files:**
- Modify: `apps/api/openapi/openapi.yaml`

**Interfaces:**
- Consumes: the final request/response shape from Task 5.

- [ ] **Step 1: Update `EstimateRequest` and `EstimateResponse` schemas**

In `apps/api/openapi/openapi.yaml`, replace the `EstimateRequest` and `EstimateResponse` schema blocks (around line 1220) with:

```yaml
    EstimateRequest:
      type: object
      required: [pickup, dropoff, vehicleType]
      properties:
        pickup:
          $ref: "#/components/schemas/EstopSchema"
        stops:
          type: array
          maxItems: 3
          items:
            $ref: "#/components/schemas/EstopSchema"
        dropoff:
          $ref: "#/components/schemas/EstopSchema"
        vehicleType:
          $ref: "#/components/schemas/VehicleType"
        cargoWeightKg:
          type: integer
          description: Cargo weight in kilograms; required when vehicleType is TRUCK

    RouteOption:
      type: object
      required:
        [routeId, estimateToken, isRecommended, polyline, distanceM, durationS,
         estimatedArrivalAt, estimatedPriceVnd, source, isEstimate, calculatedAt,
         congestionLevel]
      properties:
        routeId:
          type: string
        estimateToken:
          type: string
          description: Opaque token valid for 10 minutes, bound to this specific route
        isRecommended:
          type: boolean
        polyline:
          type: string
          description: Encoded route polyline
        distanceM:
          type: integer
          description: Distance in meters
        durationS:
          type: integer
          description: Duration in seconds
        estimatedArrivalAt:
          type: string
          format: date-time
        estimatedPriceVnd:
          type: integer
          description: Estimated price in VND
        source:
          $ref: "#/components/schemas/ProviderSource"
        isEstimate:
          type: boolean
        calculatedAt:
          type: string
          format: date-time
        congestionLevel:
          type: string
          enum: [low, moderate, heavy, severe, unknown]

    EstimateResponse:
      type: object
      required: [routes]
      properties:
        routes:
          type: array
          minItems: 1
          items:
            $ref: "#/components/schemas/RouteOption"
```

- [ ] **Step 2: Run the contract and e2e suites**

Run: `pnpm --filter api test:contract`
Expected: PASS — this test validates YAML structure (enums, security schemes, path registration), not per-field response shape for this endpoint, so it should already pass; it exists to catch you if you break YAML syntax or an unrelated shared enum.

Run: `pnpm --filter api test:e2e -- maps.e2e-spec.ts`
Expected: PASS (confirms the whole stack — controller, service, token, provider — still works together).

- [ ] **Step 3: Full verification**

Run: `pnpm --filter api lint && pnpm --filter api typecheck && pnpm --filter api test && pnpm --filter api build`
Expected: all green. This is the final gate for the backend slice of this feature.

- [ ] **Step 4: Commit**

```bash
git add apps/api/openapi/openapi.yaml
git commit -m "docs(openapi): document multi-route estimate response and cargoWeightKg"
```

---

## Not in this plan (see spec §3 Non-goals, and the follow-up mobile plan)

- Mobile UI (route picker, congestion badges, cargo weight input) — separate plan, `docs/superpowers/plans/2026-09-04-vietmap-eta-route-recommendation-mobile.md` (write after this backend plan ships and is demoable via curl/Postman).
- VRP/dispatch, toll pricing, deep truck-restriction rules — explicitly out of scope per the design spec.
