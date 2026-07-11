# Map Pricing and ETA Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement FR-06/US-08 map search, geocode, route, deterministic demo ETA and backend-owned pilot pricing.

**Architecture:** `MapsModule` exposes application interfaces independent of Vietmap SDK. Provider selection is configuration-driven; estimate token binds route input and quote expiry before order creation.

**Tech Stack:** NestJS, native fetch with timeout, Haversine pure functions, Jest contract tests.

## Global Constraints

- Provider timeout 5 seconds; at most one retry for idempotent reads.
- Demo route distance = Haversine legs * 1.25; speed 30 km/h; add 5 minutes per stop; no random.
- Response includes source, calculatedAt and isEstimate.
- Vietmap fallback only when `ALLOW_DEMO_PROVIDER=true`.

---

### Task PH-07-T01: Provider Contract and Demo ETA

**Files:**
- Create: `apps/api/src/maps/providers/map-provider.ts`, `demo-map.provider.ts`
- Create: `apps/api/src/maps/domain/haversine.ts`, `demo-route-estimator.ts`
- Test: `apps/api/src/maps/domain/haversine.spec.ts`, `apps/api/src/maps/domain/demo-route-estimator.spec.ts`

**Interfaces:** `MapProvider.search(query: string): Promise<PlaceCandidate[]>`, `geocode(placeId: string): Promise<GeoPoint>`, `route(input: RouteInput): Promise<RouteEstimate>`; `RouteEstimator.estimate(input: RouteInput): Promise<RouteEstimate>`.

```ts
interface RouteInput {
  pickup: GeoPoint;
  stops: GeoPoint[];
  dropoff: GeoPoint;
  vehicleType: string;
}

interface VerifiedOrderEstimate extends RouteEstimate {
  normalizedInput: RouteInput;
  expiresAt: string;
}
```

- [ ] Test known coordinate distance, multi-leg sum, 1.25 factor, 30 km/h duration, stop delay, deterministic repeated output and DEMO labels.
- [ ] Implement pure math with rounded minute duration and injectable clock for deterministic tests.
- [ ] Run map domain tests; expected exact snapshots stable across runs.
- [ ] Commit `feat(map): add deterministic demo route estimator`.

### Task PH-07-T02: Vietmap Adapter and Failure Policy

**Files:**
- Create: `apps/api/src/maps/providers/vietmap.provider.ts`, `resilient-map.provider.ts`
- Test: `apps/api/src/maps/providers/vietmap.provider.spec.ts`

**Interfaces:** Maps Vietmap payloads to shared `PlaceCandidate`, `GeoPoint`, `RouteEstimate` without leaking SDK types.

- [ ] Test URL encoding, response mapping, 5-second abort, one retry on transient GET, no retry on 4xx and conditional demo fallback.
- [ ] Implement adapter with mocked HTTP; redact API key from log/errors.
- [ ] Run provider tests; expected zero real network requests.
- [ ] Commit `feat(map): integrate Vietmap provider boundary`.

### Task PH-07-T03: Pricing and Estimate Token

**Files:**
- Create: `apps/api/src/maps/domain/pricing.service.ts`, `estimate-token.service.ts`
- Test: `apps/api/src/maps/domain/pricing.service.spec.ts`, `apps/api/src/maps/domain/estimate-token.service.spec.ts`

**Interfaces:** `PricingService.quote({vehicleType,distanceMeters,stopCount}): {amountVnd:number;currency:'VND'}`; signed estimate token binds normalized route, quote and 10-minute expiry.

- [ ] Test integer VND, vehicle rates from config, stop surcharge, minimum fare, tampered/expired token rejection.
- [ ] Implement config-validated pricing and HMAC token without exposing secret.
- [ ] Run unit tests and typecheck.
- [ ] Commit `feat(pricing): issue bounded route estimates`.

### Task PH-07-T04: Map REST API and Gate

**Files:**
- Create: `apps/api/src/maps/maps.module.ts`, `maps.controller.ts`, `maps.service.ts`
- Test: `apps/api/src/maps/maps.e2e-spec.ts`
- Modify: `apps/api/src/app.module.ts`

**Interfaces:** `GET /maps/search?q=`, `GET /maps/geocode/:placeId`, and `POST /orders/estimate`; estimate returns `estimateToken`, `polyline`, `distanceM`, `durationS`, `estimatedArrivalAt`, `estimatedPriceVnd`, `source`, `isEstimate`, `calculatedAt`.

- [ ] Test auth, input bounds, provider source fields, demo label, provider unavailable error and rate limiting.
- [ ] Implement the endpoint and publish `EstimateTokenService.verify(token: string): VerifiedOrderEstimate` for PH-06; do not edit PH-06 files.
- [ ] Run `pnpm --filter api test:e2e -- maps.e2e-spec.ts`, `pnpm --filter api test:contract`, API lint/typecheck/test/build; PH-06 owns later order-consumer E2E.
- [ ] Commit `feat(map): expose route price and ETA endpoints`.

## Phase Boundary Rules

- Do not claim realtime/precise ETA for demo data.
- Do not call Vietmap from clients or store provider API key client-side.
- Do not accept client-submitted price/distance without verified estimate token.
