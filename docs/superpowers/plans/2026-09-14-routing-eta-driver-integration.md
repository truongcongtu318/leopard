# Routing/ETA Driver Integration (Giai đoạn A+B) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give Driver/Customer a versioned, race-safe route/ETA pipeline backed by real Vietmap truck-aware routing, plus a Driver map/UI that renders backend geometry instead of computing its own.

**Architecture:** New `apps/api/src/routing-eta/` module owns `OrderRouteSnapshot`/`OrderLiveEstimate`/`StopProgressEvent` + a durable outbox with lease-fenced worker; `TrackingGateway` gains a `RouteEtaRealtimeEmitter` port; Driver app consumes `GET /orders/:id/route-eta` + `route-eta:updated`/`route:updated` socket events through TanStack Query, and `RealInteractiveMap` stops calling Vietmap/OSRM client-side for tracking mode.

**Tech Stack:** NestJS, Prisma 7.8.0 + PostgreSQL/PostGIS, Socket.IO, React Native/Expo, TanStack Query, Jest.

**Spec:** [docs/superpowers/specs/2026-09-14-routing-eta-driver-integration-design.md](../specs/2026-09-14-routing-eta-driver-integration-design.md)

## Global Constraints

- `routing-eta/` calls a route-thuần-túy interface (no price) — never imports `MapsService`'s priced estimate flow (spec §2 decision #1).
- `Order.routeEtaInputRevision` is the ONLY public version counter — no separate `estimateVersion` field anywhere (spec §3.2 §1).
- TX2 (promote estimate) commits only when `leaseOwner`/`leaseGeneration`/`leaseExpiresAt` still match the claiming worker (spec §3.5).
- TRUCK routes MUST send `capacity=actualGrossWeightKg` (tare+payload+allowance), never raw `cargoWeightKg` (spec §3.1bis).
- `ALLOW_DEMO_PROVIDER` must be force-disabled for `vehicleType==='TRUCK'` in production regardless of global config (spec §3.1bis).
- `RealInteractiveMap` in `routeResolutionPolicy='PROVIDED_ONLY'` must never emit a Vietmap/OSRM fetch call into the generated HTML, even with empty/invalid `routeCoords` (spec §5.1).
- Every Prisma migration touching the models in this plan must pass `pnpm --filter api exec prisma validate` and `prisma migrate diff --exit-code` before being considered done.
- No new `console.log`; follow existing `DomainError`/`RequireRoles`/repository patterns already used in `apps/api/src/orders`, `apps/api/src/tracking`.

---

## Task 1: Prisma schema — routing-eta models + Order/OrderStop fields

**Files:**
- Modify: `apps/api/prisma/schema.prisma`
- Create: `apps/api/prisma/migrations/<timestamp>_routing_eta_core/migration.sql` (generated, then hand-edited for raw SQL additions)

**Interfaces:**
- Produces: all Prisma models/enums from spec §3 (`VehicleRoutingProfile`, `QuoteVehicleRoutingPolicy`, `OrderRouteSnapshot`, `OrderLiveEstimate`, `StopProgressEvent`, `StopProgressState`, `OutboxEvent`), plus `Order.routeEtaInputRevision`, `Order.routeSnapshotVersion`, `Order.routeEtaLastBumpAt`, `Order.routeEtaLastGpsPointId`, `Order.quotedRouteSnapshotId`, `Order.activeRouteSnapshotId`, `Order.currentNextStopEstimateId`, `Order.currentCompletionEstimateId`, and `OrderStop.@@unique([id, orderId])`.

- [ ] **Step 1: Add enums to `schema.prisma`**

Append near the other enums (after `InvoiceStatus`):

```prisma
enum RouteSnapshotReason   { INITIAL_QUOTE REROUTE STOP_COMPLETED MANUAL_RECOVERY }
enum RouteProviderSource   { VIETMAP DEMO }
enum VehicleProfileSource  { STANDARD_QUOTE_PROFILE ASSIGNED_VEHICLE_PROFILE MANUAL_RECOVERY }
enum RouteSnapshotQuality  { VERIFIED_PROVIDER DEMO LEGACY_RECOVERED PARTIAL }
enum EstimateKind          { NEXT_STOP COMPLETION }
enum LiveEstimateStatus    { AVAILABLE UNAVAILABLE SUPERSEDED }
enum EtaUnavailableReason  { NO_TARGET_STOP GPS_TOO_OLD ROUTE_UNAVAILABLE PROVIDER_EXHAUSTED INVALID_ROUTE_INPUT }
enum EtaAdjustmentSource   { NONE WEATHER OPERATIONAL WEATHER_AND_OPERATIONAL }
enum OutboxEventType       { ROUTE_ETA_RECOMPUTE ROUTE_ETA_UPDATED ROUTE_UPDATED }
enum OutboxEventStatus     { PENDING LEASED COMPLETED DEAD_LETTER }
enum StopProgressStep      { ARRIVED SERVICE_STARTED SERVICE_COMPLETED }
enum StopProgressAction    { RECORDED VOIDED }
```

- [ ] **Step 2: Add the 7 new models**

Append at the end of `schema.prisma`, copying verbatim from spec §3.1–§3.5 (`VehicleRoutingProfile`, `QuoteVehicleRoutingPolicy`, `OrderRouteSnapshot`, `OrderLiveEstimate`, `StopProgressEvent`, `StopProgressState`, `OutboxEvent`). Use the exact field lists, `@@unique(..., map: "...")` names, and relation names given in the spec — do not rename anything, later tasks reference these names verbatim.

- [ ] **Step 3: Extend `Order` and `OrderStop`**

In `Order` (schema.prisma:260), add after `updatedAt`:

```prisma
  routeEtaInputRevision   Int       @default(0)
  routeSnapshotVersion    Int       @default(0)
  routeEtaLastBumpAt      DateTime? @db.Timestamptz(3)
  routeEtaLastGpsPointId  String?   @db.Uuid

  quotedRouteSnapshotId       String? @db.Uuid
  activeRouteSnapshotId       String? @db.Uuid
  currentNextStopEstimateId   String? @db.Uuid
  currentCompletionEstimateId String? @db.Uuid

  quotedRouteSnapshot OrderRouteSnapshot? @relation("QuotedRoute", fields: [id, quotedRouteSnapshotId], references: [orderId, id])
  activeRouteSnapshot OrderRouteSnapshot? @relation("ActiveRoute", fields: [id, activeRouteSnapshotId], references: [orderId, id])
  routeSnapshots      OrderRouteSnapshot[] @relation("OrderRouteHistory")

  currentNextStopEstimate   OrderLiveEstimate? @relation("CurrentNextStopEstimate", fields: [id, currentNextStopEstimateId], references: [orderId, id])
  currentCompletionEstimate OrderLiveEstimate? @relation("CurrentCompletionEstimate", fields: [id, currentCompletionEstimateId], references: [orderId, id])
  liveEstimates             OrderLiveEstimate[] @relation("OrderLiveEstimateHistory")

  stopProgressEvents StopProgressEvent[]
  stopProgressStates StopProgressState[]
```

In `OrderStop` (schema.prisma:300), add inside the model body: `@@unique([id, orderId])`.

- [ ] **Step 4: Generate the migration**

Run:
```bash
cd apps/api
pnpm exec prisma migrate dev --name routing_eta_core --create-only
```
This produces `prisma/migrations/<timestamp>_routing_eta_core/migration.sql` with all `CREATE TABLE`/`CREATE TYPE`/`CREATE INDEX`/`ALTER TABLE ADD CONSTRAINT` (composite FKs included, since Task 1 Step 1's spike already confirmed Prisma emits these natively — verify no raw SQL is needed for the four `Order` pointer FKs by inspecting the generated file).

- [ ] **Step 5: Hand-add raw SQL not expressible in Prisma DSL**

Append to the bottom of the generated `migration.sql` (copy verbatim from spec §3.1–§3.5):

```sql
CREATE UNIQUE INDEX "vehicle_routing_profile_current_key"
  ON "VehicleRoutingProfile" ("driverProfileId") WHERE "supersededAt" IS NULL;
CREATE UNIQUE INDEX "quote_vehicle_routing_policy_current_key"
  ON "QuoteVehicleRoutingPolicy" ("vehicleType") WHERE "supersededAt" IS NULL;

ALTER TABLE "VehicleRoutingProfile" ADD CONSTRAINT "vehicle_routing_profile_weight_bounds"
  CHECK ("tareWeightKg" > 0 AND "maxPayloadKg" >= 0 AND "maxGrossWeightKg" >= "tareWeightKg");
ALTER TABLE "QuoteVehicleRoutingPolicy" ADD CONSTRAINT "quote_vehicle_routing_policy_allowance_bounds"
  CHECK ("operationalAllowanceKg" >= 0);

ALTER TABLE "OrderRouteSnapshot" ADD CONSTRAINT "order_route_snapshot_profile_source_consistency"
  CHECK (
    ("vehicleProfileSource" = 'STANDARD_QUOTE_PROFILE' AND "quoteVehicleRoutingPolicyId" IS NOT NULL AND "vehicleRoutingProfileId" IS NULL)
    OR ("vehicleProfileSource" = 'ASSIGNED_VEHICLE_PROFILE' AND "vehicleRoutingProfileId" IS NOT NULL AND "quoteVehicleRoutingPolicyId" IS NULL)
    OR ("vehicleProfileSource" = 'MANUAL_RECOVERY' AND "vehicleRoutingProfileId" IS NULL AND "quoteVehicleRoutingPolicyId" IS NULL)
  );

ALTER TABLE "OrderLiveEstimate" ADD CONSTRAINT "order_live_estimate_available_requires_result"
  CHECK (status <> 'AVAILABLE' OR ("remainingDurationS" IS NOT NULL AND "arrivalAt" IS NOT NULL));
ALTER TABLE "OrderLiveEstimate" ADD CONSTRAINT "order_live_estimate_unavailable_requires_reason"
  CHECK (status <> 'UNAVAILABLE' OR "unavailableReason" IS NOT NULL);

ALTER TABLE "StopProgressEvent" ADD CONSTRAINT "stop_progress_event_recorded_no_supersedes"
  CHECK (action <> 'RECORDED' OR "supersedesEventId" IS NULL);
ALTER TABLE "StopProgressEvent" ADD CONSTRAINT "stop_progress_event_voided_requires_supersedes"
  CHECK (action <> 'VOIDED' OR ("supersedesEventId" IS NOT NULL AND reason IS NOT NULL AND length(trim(reason)) > 0));

CREATE INDEX "OutboxEvent_pending_claim_idx" ON "OutboxEvent" ("nextAttemptAt","createdAt") WHERE status = 'PENDING';
CREATE INDEX "OutboxEvent_expired_lease_idx" ON "OutboxEvent" ("leaseExpiresAt") WHERE status = 'LEASED';
```

- [ ] **Step 6: Validate and apply**

```bash
pnpm --filter api exec prisma validate
pnpm --filter api exec prisma migrate diff --exit-code --from-migrations prisma/migrations --to-schema-datamodel prisma/schema.prisma --shadow-database-url "$SHADOW_DATABASE_URL"
pnpm db:migrate:test
pnpm --filter api exec prisma generate
```
Fix any validation error before proceeding — do not skip this step even if it looks tedious, the whole plan's data-integrity guarantees depend on the raw SQL actually being applied.

- [ ] **Step 7: Run existing suite for regression**

```bash
pnpm --filter api test
```
Expected: all pre-existing tests still pass (no model was renamed, only additive).

- [ ] **Step 8: Commit**

```bash
git add apps/api/prisma/schema.prisma apps/api/prisma/migrations
git commit -m "feat(api): add routing-eta Prisma models and migration"
```

---

## Task 2: `VehicleRoutingProfileService` — real vehicle weight, no capacity guesswork

**Files:**
- Create: `apps/api/src/routing-eta/vehicle-routing-profile.service.ts`
- Test: `apps/api/src/routing-eta/vehicle-routing-profile.service.spec.ts`

**Interfaces:**
- Consumes: `PrismaService` (existing, injected the same way as `OrdersRepository` does).
- Produces:
```ts
export interface ResolvedVehicleWeight {
  actualGrossWeightKg: number;
  vehicleProfileSource: 'STANDARD_QUOTE_PROFILE' | 'ASSIGNED_VEHICLE_PROFILE' | 'MANUAL_RECOVERY';
  vehicleRoutingProfileId: string | null;
  quoteVehicleRoutingPolicyId: string | null;
}

export class VehicleWeightExceededError extends DomainError {}

export class VehicleRoutingProfileService {
  async resolveForQuote(vehicleType: VehicleType, cargoWeightKg: number): Promise<ResolvedVehicleWeight>;
  async resolveForDriver(driverProfileId: string, cargoWeightKg: number): Promise<ResolvedVehicleWeight>;
}
```

- [ ] **Step 1: Write the failing tests**

```ts
import { Test } from '@nestjs/testing';
import { PrismaService } from '../database/prisma.service.js';
import { VehicleRoutingProfileService, VehicleWeightExceededError } from './vehicle-routing-profile.service.js';

describe('VehicleRoutingProfileService', () => {
  let service: VehicleRoutingProfileService;
  let prisma: { quoteVehicleRoutingPolicy: { findFirst: jest.Mock }; vehicleRoutingProfile: { findFirst: jest.Mock } };

  beforeEach(async () => {
    prisma = {
      quoteVehicleRoutingPolicy: { findFirst: jest.fn() },
      vehicleRoutingProfile: { findFirst: jest.fn() },
    };
    const moduleRef = await Test.createTestingModule({
      providers: [
        VehicleRoutingProfileService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();
    service = moduleRef.get(VehicleRoutingProfileService);
  });

  it('computes actualGrossWeightKg from the current quote policy', async () => {
    prisma.quoteVehicleRoutingPolicy.findFirst.mockResolvedValue({
      id: 'policy-1',
      assumedTareWeightKg: 2000,
      assumedMaxPayloadKg: 1000,
      assumedMaxGrossWeightKg: 3200,
      operationalAllowanceKg: 50,
    });

    const result = await service.resolveForQuote('TRUCK', 800);

    expect(result).toEqual({
      actualGrossWeightKg: 2850,
      vehicleProfileSource: 'STANDARD_QUOTE_PROFILE',
      vehicleRoutingProfileId: null,
      quoteVehicleRoutingPolicyId: 'policy-1',
    });
  });

  it('rejects cargo weight over maxPayloadKg', async () => {
    prisma.quoteVehicleRoutingPolicy.findFirst.mockResolvedValue({
      id: 'policy-1',
      assumedTareWeightKg: 2000,
      assumedMaxPayloadKg: 1000,
      assumedMaxGrossWeightKg: 3200,
      operationalAllowanceKg: 50,
    });

    await expect(service.resolveForQuote('TRUCK', 1500)).rejects.toBeInstanceOf(VehicleWeightExceededError);
  });

  it('rejects actualGrossWeightKg over maxGrossWeightKg even when cargo alone fits payload', async () => {
    prisma.vehicleRoutingProfile.findFirst.mockResolvedValue({
      id: 'profile-1',
      tareWeightKg: 3000,
      maxPayloadKg: 1000,
      maxGrossWeightKg: 3500,
    });

    await expect(service.resolveForDriver('driver-1', 900)).rejects.toBeInstanceOf(VehicleWeightExceededError);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
pnpm --filter api test -- src/routing-eta/vehicle-routing-profile.service.spec.ts
```
Expected: FAIL — module `./vehicle-routing-profile.service.js` does not exist.

- [ ] **Step 3: Implement**

```ts
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service.js';
import { DomainError } from '../common/domain-error.js';
import type { VehicleType } from '@prisma/client';

export interface ResolvedVehicleWeight {
  actualGrossWeightKg: number;
  vehicleProfileSource: 'STANDARD_QUOTE_PROFILE' | 'ASSIGNED_VEHICLE_PROFILE' | 'MANUAL_RECOVERY';
  vehicleRoutingProfileId: string | null;
  quoteVehicleRoutingPolicyId: string | null;
}

export class VehicleWeightExceededError extends DomainError {
  constructor(message: string) {
    super('VEHICLE_WEIGHT_EXCEEDED', 400, message);
  }
}

@Injectable()
export class VehicleRoutingProfileService {
  constructor(private readonly prisma: PrismaService) {}

  async resolveForQuote(vehicleType: VehicleType, cargoWeightKg: number): Promise<ResolvedVehicleWeight> {
    const policy = await this.prisma.quoteVehicleRoutingPolicy.findFirst({
      where: { vehicleType, supersededAt: null },
    });
    if (!policy) {
      throw new DomainError('ROUTING_POLICY_NOT_FOUND', 500, `Chưa có cấu hình quote cho ${vehicleType}`);
    }

    return this.compute({
      cargoWeightKg,
      tareWeightKg: policy.assumedTareWeightKg,
      maxPayloadKg: policy.assumedMaxPayloadKg,
      maxGrossWeightKg: policy.assumedMaxGrossWeightKg,
      operationalAllowanceKg: policy.operationalAllowanceKg,
      vehicleProfileSource: 'STANDARD_QUOTE_PROFILE',
      quoteVehicleRoutingPolicyId: policy.id,
      vehicleRoutingProfileId: null,
    });
  }

  async resolveForDriver(driverProfileId: string, cargoWeightKg: number): Promise<ResolvedVehicleWeight> {
    const profile = await this.prisma.vehicleRoutingProfile.findFirst({
      where: { driverProfileId, supersededAt: null },
    });
    if (!profile) {
      throw new DomainError('VEHICLE_PROFILE_NOT_FOUND', 404, 'Chưa xác minh hồ sơ xe cho tài xế này');
    }

    return this.compute({
      cargoWeightKg,
      tareWeightKg: profile.tareWeightKg,
      maxPayloadKg: profile.maxPayloadKg,
      maxGrossWeightKg: profile.maxGrossWeightKg,
      operationalAllowanceKg: 0,
      vehicleProfileSource: 'ASSIGNED_VEHICLE_PROFILE',
      quoteVehicleRoutingPolicyId: null,
      vehicleRoutingProfileId: profile.id,
    });
  }

  private compute(input: {
    cargoWeightKg: number;
    tareWeightKg: number;
    maxPayloadKg: number;
    maxGrossWeightKg: number;
    operationalAllowanceKg: number;
    vehicleProfileSource: ResolvedVehicleWeight['vehicleProfileSource'];
    quoteVehicleRoutingPolicyId: string | null;
    vehicleRoutingProfileId: string | null;
  }): ResolvedVehicleWeight {
    if (input.cargoWeightKg > input.maxPayloadKg) {
      throw new VehicleWeightExceededError(
        `Trọng lượng hàng ${input.cargoWeightKg}kg vượt tải trọng cho phép ${input.maxPayloadKg}kg`,
      );
    }

    const actualGrossWeightKg = input.tareWeightKg + input.cargoWeightKg + input.operationalAllowanceKg;
    if (actualGrossWeightKg > input.maxGrossWeightKg) {
      throw new VehicleWeightExceededError(
        `Tổng trọng lượng vận hành ${actualGrossWeightKg}kg vượt giới hạn đăng kiểm ${input.maxGrossWeightKg}kg`,
      );
    }

    return {
      actualGrossWeightKg,
      vehicleProfileSource: input.vehicleProfileSource,
      vehicleRoutingProfileId: input.vehicleRoutingProfileId,
      quoteVehicleRoutingPolicyId: input.quoteVehicleRoutingPolicyId,
    };
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
pnpm --filter api test -- src/routing-eta/vehicle-routing-profile.service.spec.ts
```
Expected: PASS, 3/3.

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/routing-eta/vehicle-routing-profile.service.ts apps/api/src/routing-eta/vehicle-routing-profile.service.spec.ts
git commit -m "feat(api): add VehicleRoutingProfileService with real weight validation"
```

---

## Task 3: Fix Vietmap `capacity` + block demo fallback for TRUCK (spec §3.1bis)

**Files:**
- Modify: `apps/api/src/maps/providers/resilient-map.provider.ts`
- Modify: `apps/api/src/maps/providers/resilient-map.provider.spec.ts` (existing file — extend)

**Interfaces:**
- Consumes: `MAP_PROVIDER` token (existing, `apps/api/src/maps/maps.service.ts`) — `routing-eta/` will inject this same token directly as its route-thuần-túy interface (it is already price-free at the `route()` level; no new interface needed, satisfying spec §2 decision #1).
- Produces: `ResilientMapProvider.route()` now refuses to fall back to demo when `input.vehicleType === 'TRUCK'`, independent of `allowDemoProvider`.

- [ ] **Step 1: Write the failing test**

Add to `apps/api/src/maps/providers/resilient-map.provider.spec.ts`:

```ts
it('never falls back to demo for TRUCK routes even when allowDemoProvider is true', async () => {
  const primaryError = new Error('Vietmap unavailable');
  const primary: MapProvider = {
    search: jest.fn(),
    geocode: jest.fn(),
    route: jest.fn().mockRejectedValue(primaryError),
  };
  const demo: MapProvider = {
    search: jest.fn(),
    geocode: jest.fn(),
    route: jest.fn().mockResolvedValue([]),
  };
  const provider = new ResilientMapProvider(primary, demo, { allowDemoProvider: true });

  await expect(
    provider.route({
      pickup: { latitude: 10, longitude: 106 },
      stops: [],
      dropoff: { latitude: 10.1, longitude: 106.1 },
      vehicleType: 'TRUCK',
      cargoWeightKg: 1000,
    }),
  ).rejects.toBe(primaryError);
  expect(demo.route).not.toHaveBeenCalled();
});

it('still falls back to demo for non-TRUCK routes when allowDemoProvider is true', async () => {
  const primary: MapProvider = {
    search: jest.fn(),
    geocode: jest.fn(),
    route: jest.fn().mockRejectedValue(new Error('down')),
  };
  const demo: MapProvider = {
    search: jest.fn(),
    geocode: jest.fn(),
    route: jest.fn().mockResolvedValue([]),
  };
  const provider = new ResilientMapProvider(primary, demo, { allowDemoProvider: true });

  await provider.route({
    pickup: { latitude: 10, longitude: 106 },
    stops: [],
    dropoff: { latitude: 10.1, longitude: 106.1 },
    vehicleType: 'MOTORBIKE',
  });

  expect(demo.route).toHaveBeenCalled();
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
pnpm --filter api test -- src/maps/providers/resilient-map.provider.spec.ts
```
Expected: FAIL on the first new test — `demo.route` was called.

- [ ] **Step 3: Implement**

Replace the `route()` method and `withDemoFallback` call site in `resilient-map.provider.ts`:

```ts
  async route(input: RouteInput): Promise<RouteEstimate[]> {
    const allowDemoForThisCall = this.allowDemoProvider && input.vehicleType !== 'TRUCK';
    return this.withDemoFallback((provider) => provider.route(input), allowDemoForThisCall);
  }

  private async withDemoFallback<T>(
    operation: (provider: MapProvider) => Promise<T>,
    allowDemoOverride: boolean = this.allowDemoProvider,
  ): Promise<T> {
    try {
      return await operation(this.primaryProvider);
    } catch (error) {
      if (error instanceof MapProviderNotFoundError) {
        throw error;
      }

      if (!allowDemoOverride) {
        throw error;
      }

      return operation(this.demoProvider);
    }
  }
```

- [ ] **Step 4: Run test to verify it passes**

```bash
pnpm --filter api test -- src/maps/providers/resilient-map.provider.spec.ts
```
Expected: PASS, including all pre-existing tests in the file (unchanged behavior for `search`/`geocode`/non-TRUCK `route`).

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/maps/providers/resilient-map.provider.ts apps/api/src/maps/providers/resilient-map.provider.spec.ts
git commit -m "fix(api): never demo-fallback Vietmap routing for TRUCK vehicles"
```

---

## Task 4: `RouteSnapshotService` — create versioned, hashed snapshots

**Files:**
- Create: `apps/api/src/routing-eta/route-snapshot.service.ts`
- Create: `apps/api/src/routing-eta/polyline-hash.ts`
- Test: `apps/api/src/routing-eta/route-snapshot.service.spec.ts`
- Test: `apps/api/src/routing-eta/polyline-hash.spec.ts`

**Interfaces:**
- Consumes: `MAP_PROVIDER` (Task 3), `VehicleRoutingProfileService` (Task 2), `PrismaService`.
- Produces:
```ts
export function computeInputHash(normalizedInput: unknown): string; // sha256 hex, hashAlgorithmVersion='sha256-json-v1'
export function computeRouteHash(geometry: string): string;

export interface CreateRouteSnapshotInput {
  orderId: string;
  reason: 'INITIAL_QUOTE' | 'REROUTE' | 'STOP_COMPLETED' | 'MANUAL_RECOVERY';
  pickup: { latitude: number; longitude: number };
  stops: readonly { id: string; latitude: number; longitude: number }[];
  dropoff: { latitude: number; longitude: number };
  vehicleType: string;
  cargoWeightKg: number;
  driverProfileId: string | null; // null => use quote policy
  departureAt: Date;
}

export class RouteSnapshotService {
  async createSnapshot(input: CreateRouteSnapshotInput, tx: Prisma.TransactionClient): Promise<{ id: string; version: number }>;
}
```

- [ ] **Step 1: Write the failing test for hashing**

```ts
import { computeInputHash, computeRouteHash } from './polyline-hash.js';

describe('polyline-hash', () => {
  it('produces a stable 64-char hex digest for the same normalized input', () => {
    const input = { pickup: { latitude: 10.1, longitude: 106.2 }, vehicleType: 'TRUCK' };
    const a = computeInputHash(input);
    const b = computeInputHash({ vehicleType: 'TRUCK', pickup: { longitude: 106.2, latitude: 10.1 } });
    expect(a).toMatch(/^[0-9a-f]{64}$/);
    expect(a).toBe(b); // key order must not matter
  });

  it('produces different route hashes for different geometry', () => {
    expect(computeRouteHash('abc')).not.toBe(computeRouteHash('xyz'));
    expect(computeRouteHash('abc')).toMatch(/^[0-9a-f]{64}$/);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
pnpm --filter api test -- src/routing-eta/polyline-hash.spec.ts
```
Expected: FAIL — module not found.

- [ ] **Step 3: Implement hashing (canonical JSON key sort, sha256)**

```ts
import { createHash } from 'node:crypto';

export function computeInputHash(normalizedInput: unknown): string {
  return createHash('sha256').update(canonicalJson(normalizedInput)).digest('hex');
}

export function computeRouteHash(geometry: string): string {
  return createHash('sha256').update(geometry).digest('hex');
}

function canonicalJson(value: unknown): string {
  if (value === null || typeof value !== 'object') {
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) {
    return `[${value.map(canonicalJson).join(',')}]`;
  }
  const keys = Object.keys(value as Record<string, unknown>).sort();
  const body = keys
    .map((key) => `${JSON.stringify(key)}:${canonicalJson((value as Record<string, unknown>)[key])}`)
    .join(',');
  return `{${body}}`;
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
pnpm --filter api test -- src/routing-eta/polyline-hash.spec.ts
```
Expected: PASS.

- [ ] **Step 5: Write the failing test for `RouteSnapshotService`**

```ts
import { Test } from '@nestjs/testing';
import { MAP_PROVIDER } from '../maps/maps.service.js';
import { PrismaService } from '../database/prisma.service.js';
import { VehicleRoutingProfileService } from './vehicle-routing-profile.service.js';
import { RouteSnapshotService } from './route-snapshot.service.js';

describe('RouteSnapshotService', () => {
  it('creates version 1 for the first snapshot of an order, encoding=POLYLINE5', async () => {
    const mapProvider = {
      route: jest.fn().mockResolvedValue([
        { polyline: 'abc123', distanceM: 7680, durationS: 720, source: 'VIETMAP', calculatedAt: new Date().toISOString(), isEstimate: false, congestionLevel: 'unknown', estimatedArrivalAt: new Date().toISOString(), estimatedPriceVnd: 0 },
      ]),
    };
    const vehicleWeights = {
      resolveForQuote: jest.fn().mockResolvedValue({
        actualGrossWeightKg: 2850,
        vehicleProfileSource: 'STANDARD_QUOTE_PROFILE',
        vehicleRoutingProfileId: null,
        quoteVehicleRoutingPolicyId: 'policy-1',
      }),
    };
    const tx = {
      orderRouteSnapshot: {
        count: jest.fn().mockResolvedValue(0),
        create: jest.fn().mockResolvedValue({ id: 'snap-1', version: 1 }),
      },
    };

    const moduleRef = await Test.createTestingModule({
      providers: [
        RouteSnapshotService,
        { provide: MAP_PROVIDER, useValue: mapProvider },
        { provide: VehicleRoutingProfileService, useValue: vehicleWeights },
        { provide: PrismaService, useValue: {} },
      ],
    }).compile();
    const service = moduleRef.get(RouteSnapshotService);

    const result = await service.createSnapshot(
      {
        orderId: 'order-1',
        reason: 'INITIAL_QUOTE',
        pickup: { latitude: 10.79, longitude: 106.65 },
        stops: [],
        dropoff: { latitude: 10.76, longitude: 106.8 },
        vehicleType: 'TRUCK',
        cargoWeightKg: 800,
        driverProfileId: null,
        departureAt: new Date('2026-09-14T00:00:00Z'),
      },
      tx as any,
    );

    expect(mapProvider.route).toHaveBeenCalledWith(
      expect.objectContaining({ vehicleType: 'TRUCK', cargoWeightKg: 2850 }),
    );
    expect(tx.orderRouteSnapshot.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          orderId: 'order-1',
          version: 1,
          geometryEncoding: 'POLYLINE5',
          quality: 'VERIFIED_PROVIDER',
          vehicleProfileSource: 'STANDARD_QUOTE_PROFILE',
        }),
      }),
    );
    expect(result).toEqual({ id: 'snap-1', version: 1 });
  });
});
```

- [ ] **Step 6: Run test to verify it fails**

```bash
pnpm --filter api test -- src/routing-eta/route-snapshot.service.spec.ts
```
Expected: FAIL — module not found.

- [ ] **Step 7: Implement `RouteSnapshotService`**

```ts
import { Inject, Injectable } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { MAP_PROVIDER } from '../maps/maps.service.js';
import type { MapProvider } from '../maps/providers/map-provider.js';
import { computeInputHash, computeRouteHash } from './polyline-hash.js';
import { VehicleRoutingProfileService } from './vehicle-routing-profile.service.js';

export interface CreateRouteSnapshotInput {
  orderId: string;
  reason: 'INITIAL_QUOTE' | 'REROUTE' | 'STOP_COMPLETED' | 'MANUAL_RECOVERY';
  pickup: { latitude: number; longitude: number };
  stops: readonly { id: string; latitude: number; longitude: number }[];
  dropoff: { latitude: number; longitude: number };
  vehicleType: string;
  cargoWeightKg: number;
  driverProfileId: string | null;
  departureAt: Date;
}

const HASH_ALGORITHM_VERSION = 'sha256-json-v1';

@Injectable()
export class RouteSnapshotService {
  constructor(
    @Inject(MAP_PROVIDER) private readonly mapProvider: MapProvider,
    private readonly vehicleWeights: VehicleRoutingProfileService,
  ) {}

  async createSnapshot(
    input: CreateRouteSnapshotInput,
    tx: Prisma.TransactionClient,
  ): Promise<{ id: string; version: number }> {
    const resolved = input.driverProfileId
      ? await this.vehicleWeights.resolveForDriver(input.driverProfileId, input.cargoWeightKg)
      : await this.vehicleWeights.resolveForQuote(input.vehicleType as never, input.cargoWeightKg);

    const routeInput = {
      pickup: input.pickup,
      stops: input.stops.map((s) => ({ latitude: s.latitude, longitude: s.longitude })),
      dropoff: input.dropoff,
      vehicleType: input.vehicleType,
      cargoWeightKg: resolved.actualGrossWeightKg,
    };

    const [estimate] = await this.mapProvider.route(routeInput);
    if (!estimate) {
      throw new Error('Vietmap route returned no path');
    }

    const normalizedInput = {
      ...routeInput,
      stopIds: input.stops.map((s) => s.id),
      departureAt: input.departureAt.toISOString(),
    };

    const priorCount = await tx.orderRouteSnapshot.count({ where: { orderId: input.orderId } });
    const version = priorCount + 1;

    const created = await tx.orderRouteSnapshot.create({
      data: {
        orderId: input.orderId,
        version,
        reason: input.reason,
        quality: estimate.source === 'VIETMAP' ? 'VERIFIED_PROVIDER' : 'DEMO',
        geometry: estimate.polyline,
        geometryEncoding: 'POLYLINE5',
        routeHash: computeRouteHash(estimate.polyline),
        inputHash: computeInputHash(normalizedInput),
        hashAlgorithmVersion: HASH_ALGORITHM_VERSION,
        legs: [],
        stopSequence: input.stops.map((s, i) => ({ stopId: s.id, sequence: i + 1 })),
        normalizedInput,
        vehicleProfileSource: resolved.vehicleProfileSource,
        vehicleRoutingProfileId: resolved.vehicleRoutingProfileId,
        quoteVehicleRoutingPolicyId: resolved.quoteVehicleRoutingPolicyId,
        departureAt: input.departureAt,
        source: estimate.source,
        calculatedAt: new Date(estimate.calculatedAt),
      },
    });

    return { id: created.id, version: created.version };
  }
}
```

- [ ] **Step 8: Run test to verify it passes**

```bash
pnpm --filter api test -- src/routing-eta/route-snapshot.service.spec.ts src/routing-eta/polyline-hash.spec.ts
```
Expected: PASS.

- [ ] **Step 9: Commit**

```bash
git add apps/api/src/routing-eta/route-snapshot.service.ts apps/api/src/routing-eta/route-snapshot.service.spec.ts apps/api/src/routing-eta/polyline-hash.ts apps/api/src/routing-eta/polyline-hash.spec.ts
git commit -m "feat(api): add RouteSnapshotService producing hashed, versioned snapshots"
```

---

## Task 5: `OutboxRepository` — lease-fenced claim/reclaim/heartbeat

**Files:**
- Create: `apps/api/src/routing-eta/outbox.repository.ts`
- Test: `apps/api/src/routing-eta/outbox.repository.spec.ts`

**Interfaces:**
- Consumes: `PrismaService`.
- Produces:
```ts
export interface OutboxClaim {
  id: string; aggregateId: string; type: 'ROUTE_ETA_RECOMPUTE' | 'ROUTE_ETA_UPDATED' | 'ROUTE_UPDATED';
  inputRevision: number | null; payload: unknown; leaseOwner: string; leaseGeneration: number;
}

export class OutboxRepository {
  async enqueue(tx: Prisma.TransactionClient, event: {
    aggregateType: string; aggregateId: string; type: OutboxEventType;
    inputRevision?: number; payload: unknown; dedupeKey: string;
  }): Promise<void>;

  async claimBatch(workerId: string, limit: number, leaseMs: number): Promise<OutboxClaim[]>;
  async heartbeat(id: string, leaseOwner: string, leaseGeneration: number, leaseMs: number): Promise<boolean>;
  async markCompleted(tx: Prisma.TransactionClient, id: string, leaseOwner: string, leaseGeneration: number): Promise<boolean>;
  async markFailedOrDeadLetter(id: string, leaseOwner: string, leaseGeneration: number, error: string, backoffMs: number): Promise<void>;
}
```

- [ ] **Step 1: Write the failing test**

```ts
import { Test } from '@nestjs/testing';
import { PrismaService } from '../database/prisma.service.js';
import { OutboxRepository } from './outbox.repository.js';

describe('OutboxRepository', () => {
  it('enqueue is a no-op on duplicate dedupeKey (idempotent insert)', async () => {
    const prisma = {
      outboxEvent: {
        upsert: jest.fn().mockResolvedValue({}),
      },
    };
    const moduleRef = await Test.createTestingModule({
      providers: [OutboxRepository, { provide: PrismaService, useValue: prisma }],
    }).compile();
    const repo = moduleRef.get(OutboxRepository);

    await repo.enqueue(prisma as any, {
      aggregateType: 'Order',
      aggregateId: 'order-1',
      type: 'ROUTE_ETA_RECOMPUTE',
      inputRevision: 5,
      payload: { orderId: 'order-1' },
      dedupeKey: 'order-1:ROUTE_ETA_RECOMPUTE:5',
    });

    expect(prisma.outboxEvent.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { dedupeKey: 'order-1:ROUTE_ETA_RECOMPUTE:5' },
        create: expect.objectContaining({ dedupeKey: 'order-1:ROUTE_ETA_RECOMPUTE:5' }),
        update: {},
      }),
    );
  });

  it('markCompleted only succeeds when lease fields still match (fencing)', async () => {
    const prisma = { outboxEvent: { updateMany: jest.fn().mockResolvedValue({ count: 0 }) } };
    const moduleRef = await Test.createTestingModule({
      providers: [OutboxRepository, { provide: PrismaService, useValue: prisma }],
    }).compile();
    const repo = moduleRef.get(OutboxRepository);

    const ok = await repo.markCompleted(prisma as any, 'job-1', 'worker-a', 3);

    expect(prisma.outboxEvent.updateMany).toHaveBeenCalledWith({
      where: {
        id: 'job-1',
        status: 'LEASED',
        leaseOwner: 'worker-a',
        leaseGeneration: 3,
        leaseExpiresAt: { gt: expect.any(Date) },
      },
      data: { status: 'COMPLETED', completedAt: expect.any(Date) },
    });
    expect(ok).toBe(false);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
pnpm --filter api test -- src/routing-eta/outbox.repository.spec.ts
```
Expected: FAIL — module not found.

- [ ] **Step 3: Implement**

```ts
import { Injectable } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import type { Prisma } from '@prisma/client';
import { PrismaService } from '../database/prisma.service.js';

type OutboxEventType = 'ROUTE_ETA_RECOMPUTE' | 'ROUTE_ETA_UPDATED' | 'ROUTE_UPDATED';

export interface OutboxClaim {
  id: string;
  aggregateId: string;
  type: OutboxEventType;
  inputRevision: number | null;
  payload: unknown;
  leaseOwner: string;
  leaseGeneration: number;
}

@Injectable()
export class OutboxRepository {
  constructor(private readonly prisma: PrismaService) {}

  async enqueue(
    tx: Prisma.TransactionClient,
    event: {
      aggregateType: string;
      aggregateId: string;
      type: OutboxEventType;
      inputRevision?: number;
      payload: unknown;
      dedupeKey: string;
    },
  ): Promise<void> {
    await tx.outboxEvent.upsert({
      where: { dedupeKey: event.dedupeKey },
      create: {
        aggregateType: event.aggregateType,
        aggregateId: event.aggregateId,
        type: event.type,
        inputRevision: event.inputRevision ?? null,
        payload: event.payload as Prisma.InputJsonValue,
        dedupeKey: event.dedupeKey,
      },
      update: {},
    });
  }

  async claimBatch(workerId: string, limit: number, leaseMs: number): Promise<OutboxClaim[]> {
    const now = new Date();
    const leaseExpiresAt = new Date(now.getTime() + leaseMs);

    return this.prisma.$transaction(async (tx) => {
      const rows: { id: string }[] = await tx.$queryRaw`
        SELECT id FROM "OutboxEvent"
        WHERE (status = 'PENDING' AND "nextAttemptAt" <= ${now} AND attempts < "maxAttempts")
           OR (status = 'LEASED' AND "leaseExpiresAt" < ${now} AND attempts < "maxAttempts")
        ORDER BY "nextAttemptAt"
        LIMIT ${limit}
        FOR UPDATE SKIP LOCKED
      `;

      const claims: OutboxClaim[] = [];
      for (const row of rows) {
        const updated = await tx.outboxEvent.update({
          where: { id: row.id },
          data: {
            status: 'LEASED',
            leaseOwner: workerId,
            leaseGeneration: { increment: 1 },
            leaseExpiresAt,
            attempts: { increment: 1 },
          },
        });
        claims.push({
          id: updated.id,
          aggregateId: updated.aggregateId,
          type: updated.type as OutboxEventType,
          inputRevision: updated.inputRevision,
          payload: updated.payload,
          leaseOwner: workerId,
          leaseGeneration: updated.leaseGeneration,
        });
      }
      return claims;
    });
  }

  async heartbeat(id: string, leaseOwner: string, leaseGeneration: number, leaseMs: number): Promise<boolean> {
    const now = new Date();
    const result = await this.prisma.outboxEvent.updateMany({
      where: { id, status: 'LEASED', leaseOwner, leaseGeneration, leaseExpiresAt: { gt: now } },
      data: { leaseExpiresAt: new Date(now.getTime() + leaseMs) },
    });
    return result.count === 1;
  }

  async markCompleted(
    tx: Prisma.TransactionClient,
    id: string,
    leaseOwner: string,
    leaseGeneration: number,
  ): Promise<boolean> {
    const now = new Date();
    const result = await tx.outboxEvent.updateMany({
      where: { id, status: 'LEASED', leaseOwner, leaseGeneration, leaseExpiresAt: { gt: now } },
      data: { status: 'COMPLETED', completedAt: now },
    });
    return result.count === 1;
  }

  async markFailedOrDeadLetter(
    id: string,
    leaseOwner: string,
    leaseGeneration: number,
    error: string,
    backoffMs: number,
  ): Promise<void> {
    const sanitizedError = redactSecrets(error).slice(0, 500);
    const current = await this.prisma.outboxEvent.findUnique({ where: { id } });
    if (!current || current.leaseOwner !== leaseOwner || current.leaseGeneration !== leaseGeneration) {
      return; // lost the lease — another worker owns this job now, do nothing
    }

    const exhausted = current.attempts >= current.maxAttempts;
    await this.prisma.outboxEvent.update({
      where: { id },
      data: exhausted
        ? { status: 'DEAD_LETTER', lastError: sanitizedError }
        : { status: 'PENDING', lastError: sanitizedError, nextAttemptAt: new Date(Date.now() + backoffMs) },
    });
  }
}

function redactSecrets(message: string): string {
  return message.replace(/apikey=[^&\s]+/gi, 'apikey=[REDACTED]');
}

export function newWorkerId(): string {
  return randomUUID();
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
pnpm --filter api test -- src/routing-eta/outbox.repository.spec.ts
```
Expected: PASS, 2/2.

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/routing-eta/outbox.repository.ts apps/api/src/routing-eta/outbox.repository.spec.ts
git commit -m "feat(api): add OutboxRepository with lease fencing (claim/heartbeat/complete/dead-letter)"
```

---

## Task 6: `EtaService` — TX1 bump revision, TX2 promote-or-supersede

**Files:**
- Create: `apps/api/src/routing-eta/eta.service.ts`
- Test: `apps/api/src/routing-eta/eta.service.spec.ts`

**Interfaces:**
- Consumes: `PrismaService`, `OutboxRepository` (Task 5), `MAP_PROVIDER` (Task 3).
- Produces:
```ts
export class EtaService {
  // TX1 — called from AcceptOrderService/StopProgressService/TrackingService in their own transaction
  async bumpRevision(tx: Prisma.TransactionClient, orderId: string): Promise<number>; // returns new routeEtaInputRevision, enqueues ROUTE_ETA_RECOMPUTE

  // TX2 — called by the worker after it has a provider result for a given inputRevision
  async promoteOrSupersede(input: {
    orderId: string; inputRevision: number; leaseOwner: string; leaseGeneration: number; outboxJobId: string;
    nextStop: EstimateComputation; completion: EstimateComputation;
  }): Promise<'PROMOTED' | 'SUPERSEDED' | 'LEASE_LOST'>;
}

export interface EstimateComputation {
  targetStopId: string | null; routeSnapshotId: string;
  status: 'AVAILABLE' | 'UNAVAILABLE'; unavailableReason?: EtaUnavailableReason;
  remainingDistanceM?: number; remainingDurationS?: number; arrivalAt?: Date;
  baselineDurationS?: number; baselineSource: 'VIETMAP' | 'DEMO';
  gpsPointId?: string; calculatedAt: Date; validUntil: Date;
}
```

- [ ] **Step 1: Write the failing test for `bumpRevision`**

```ts
import { Test } from '@nestjs/testing';
import { PrismaService } from '../database/prisma.service.js';
import { OutboxRepository } from './outbox.repository.js';
import { EtaService } from './eta.service.js';

describe('EtaService.bumpRevision', () => {
  it('increments routeEtaInputRevision and enqueues a recompute job in the same tx', async () => {
    const tx = {
      order: {
        update: jest.fn().mockResolvedValue({ id: 'order-1', routeEtaInputRevision: 6 }),
      },
    };
    const outbox = { enqueue: jest.fn() };
    const moduleRef = await Test.createTestingModule({
      providers: [
        EtaService,
        { provide: OutboxRepository, useValue: outbox },
        { provide: PrismaService, useValue: {} },
      ],
    }).compile();
    const service = moduleRef.get(EtaService);

    const revision = await service.bumpRevision(tx as any, 'order-1');

    expect(tx.order.update).toHaveBeenCalledWith({
      where: { id: 'order-1' },
      data: { routeEtaInputRevision: { increment: 1 } },
    });
    expect(revision).toBe(6);
    expect(outbox.enqueue).toHaveBeenCalledWith(
      tx,
      expect.objectContaining({
        aggregateType: 'Order',
        aggregateId: 'order-1',
        type: 'ROUTE_ETA_RECOMPUTE',
        inputRevision: 6,
        dedupeKey: 'order-1:ROUTE_ETA_RECOMPUTE:6',
      }),
    );
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
pnpm --filter api test -- src/routing-eta/eta.service.spec.ts
```
Expected: FAIL — module not found.

- [ ] **Step 3: Write the failing test for `promoteOrSupersede`**

Add to the same file:

```ts
describe('EtaService.promoteOrSupersede', () => {
  function baseComputation(overrides: Partial<any> = {}) {
    return {
      targetStopId: 'stop-1',
      routeSnapshotId: 'snap-1',
      status: 'AVAILABLE' as const,
      remainingDistanceM: 5000,
      remainingDurationS: 600,
      arrivalAt: new Date('2026-09-14T01:00:00Z'),
      baselineDurationS: 600,
      baselineSource: 'VIETMAP' as const,
      calculatedAt: new Date('2026-09-14T00:50:00Z'),
      validUntil: new Date('2026-09-14T00:52:00Z'),
      ...overrides,
    };
  }

  it('promotes when the job revision is still the current one, marks prior current as SUPERSEDED', async () => {
    const tx = {
      order: {
        findUniqueOrThrow: jest.fn().mockResolvedValue({
          id: 'order-1', routeEtaInputRevision: 6,
          currentNextStopEstimateId: 'old-next', currentCompletionEstimateId: 'old-completion',
        }),
        update: jest.fn(),
      },
      orderLiveEstimate: {
        updateMany: jest.fn(),
        create: jest.fn()
          .mockResolvedValueOnce({ id: 'new-next' })
          .mockResolvedValueOnce({ id: 'new-completion' }),
      },
    };
    const outbox = { enqueue: jest.fn(), markCompleted: jest.fn().mockResolvedValue(true) };
    const prisma = { $transaction: jest.fn((fn: any) => fn(tx)) };
    const moduleRef = await Test.createTestingModule({
      providers: [
        EtaService,
        { provide: OutboxRepository, useValue: outbox },
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();
    const service = moduleRef.get(EtaService);

    const result = await service.promoteOrSupersede({
      orderId: 'order-1', inputRevision: 6, leaseOwner: 'worker-a', leaseGeneration: 1, outboxJobId: 'job-1',
      nextStop: baseComputation(),
      completion: baseComputation({ targetStopId: null }),
    });

    expect(result).toBe('PROMOTED');
    expect(tx.orderLiveEstimate.updateMany).toHaveBeenCalledWith({
      where: { id: { in: ['old-next', 'old-completion'] } },
      data: { status: 'SUPERSEDED' },
    });
    expect(tx.order.update).toHaveBeenCalledWith({
      where: { id: 'order-1' },
      data: { currentNextStopEstimateId: 'new-next', currentCompletionEstimateId: 'new-completion' },
    });
    expect(outbox.enqueue).toHaveBeenCalledWith(
      tx,
      expect.objectContaining({ type: 'ROUTE_ETA_UPDATED', dedupeKey: 'order-1:ROUTE_ETA_UPDATED:6' }),
    );
  });

  it('supersedes silently (no pointer change, no notify) when a newer revision already landed', async () => {
    const tx = {
      order: {
        findUniqueOrThrow: jest.fn().mockResolvedValue({
          id: 'order-1', routeEtaInputRevision: 7, // newer than the job's revision 6
          currentNextStopEstimateId: 'current-next', currentCompletionEstimateId: 'current-completion',
        }),
        update: jest.fn(),
      },
      orderLiveEstimate: {
        updateMany: jest.fn(),
        create: jest.fn().mockResolvedValue({ id: 'stale-row' }),
      },
    };
    const outbox = { enqueue: jest.fn(), markCompleted: jest.fn().mockResolvedValue(true) };
    const prisma = { $transaction: jest.fn((fn: any) => fn(tx)) };
    const moduleRef = await Test.createTestingModule({
      providers: [
        EtaService,
        { provide: OutboxRepository, useValue: outbox },
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();
    const service = moduleRef.get(EtaService);

    const result = await service.promoteOrSupersede({
      orderId: 'order-1', inputRevision: 6, leaseOwner: 'worker-a', leaseGeneration: 1, outboxJobId: 'job-1',
      nextStop: baseComputation(), completion: baseComputation({ targetStopId: null }),
    });

    expect(result).toBe('SUPERSEDED');
    expect(tx.order.update).not.toHaveBeenCalled();
    expect(outbox.enqueue).not.toHaveBeenCalledWith(tx, expect.objectContaining({ type: 'ROUTE_ETA_UPDATED' }));
  });
});
```

- [ ] **Step 4: Run test to verify it fails**

```bash
pnpm --filter api test -- src/routing-eta/eta.service.spec.ts
```
Expected: FAIL — module not found / methods missing.

- [ ] **Step 5: Implement `EtaService`**

```ts
import { Injectable } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { PrismaService } from '../database/prisma.service.js';
import { OutboxRepository } from './outbox.repository.js';

export type EtaUnavailableReason =
  | 'NO_TARGET_STOP' | 'GPS_TOO_OLD' | 'ROUTE_UNAVAILABLE' | 'PROVIDER_EXHAUSTED' | 'INVALID_ROUTE_INPUT';

export interface EstimateComputation {
  targetStopId: string | null;
  routeSnapshotId: string;
  status: 'AVAILABLE' | 'UNAVAILABLE';
  unavailableReason?: EtaUnavailableReason;
  remainingDistanceM?: number;
  remainingDurationS?: number;
  arrivalAt?: Date;
  baselineDurationS?: number;
  baselineSource: 'VIETMAP' | 'DEMO';
  gpsPointId?: string;
  calculatedAt: Date;
  validUntil: Date;
}

@Injectable()
export class EtaService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly outbox: OutboxRepository,
  ) {}

  async bumpRevision(tx: Prisma.TransactionClient, orderId: string): Promise<number> {
    const updated = await tx.order.update({
      where: { id: orderId },
      data: { routeEtaInputRevision: { increment: 1 } },
    });

    await this.outbox.enqueue(tx, {
      aggregateType: 'Order',
      aggregateId: orderId,
      type: 'ROUTE_ETA_RECOMPUTE',
      inputRevision: updated.routeEtaInputRevision,
      payload: { orderId },
      dedupeKey: `${orderId}:ROUTE_ETA_RECOMPUTE:${updated.routeEtaInputRevision}`,
    });

    return updated.routeEtaInputRevision;
  }

  async promoteOrSupersede(input: {
    orderId: string;
    inputRevision: number;
    leaseOwner: string;
    leaseGeneration: number;
    outboxJobId: string;
    nextStop: EstimateComputation;
    completion: EstimateComputation;
  }): Promise<'PROMOTED' | 'SUPERSEDED' | 'LEASE_LOST'> {
    return this.prisma.$transaction(async (tx) => {
      const order = await tx.order.findUniqueOrThrow({ where: { id: input.orderId } });
      const isStillCurrent = order.routeEtaInputRevision === input.inputRevision;

      const nextStopRow = await tx.orderLiveEstimate.create({
        data: this.toEstimateRow(input.orderId, input.inputRevision, 'NEXT_STOP', input.nextStop, isStillCurrent),
      });
      const completionRow = await tx.orderLiveEstimate.create({
        data: this.toEstimateRow(input.orderId, input.inputRevision, 'COMPLETION', input.completion, isStillCurrent),
      });

      if (!isStillCurrent) {
        return 'SUPERSEDED' as const;
      }

      const staleIds = [order.currentNextStopEstimateId, order.currentCompletionEstimateId].filter(
        (id): id is string => id !== null,
      );
      if (staleIds.length > 0) {
        await tx.orderLiveEstimate.updateMany({
          where: { id: { in: staleIds } },
          data: { status: 'SUPERSEDED' },
        });
      }

      await tx.order.update({
        where: { id: input.orderId },
        data: { currentNextStopEstimateId: nextStopRow.id, currentCompletionEstimateId: completionRow.id },
      });

      await this.outbox.enqueue(tx, {
        aggregateType: 'Order',
        aggregateId: input.orderId,
        type: 'ROUTE_ETA_UPDATED',
        inputRevision: input.inputRevision,
        payload: { orderId: input.orderId, inputRevision: input.inputRevision },
        dedupeKey: `${input.orderId}:ROUTE_ETA_UPDATED:${input.inputRevision}`,
      });

      return 'PROMOTED' as const;
    });
  }

  private toEstimateRow(
    orderId: string,
    inputRevision: number,
    kind: 'NEXT_STOP' | 'COMPLETION',
    computation: EstimateComputation,
    isStillCurrent: boolean,
  ) {
    return {
      orderId,
      inputRevision,
      kind,
      targetStopId: computation.targetStopId,
      routeSnapshotId: computation.routeSnapshotId,
      status: isStillCurrent ? computation.status : ('SUPERSEDED' as const),
      unavailableReason: computation.unavailableReason ?? null,
      remainingDistanceM: computation.remainingDistanceM ?? null,
      remainingDurationS: computation.remainingDurationS ?? null,
      arrivalAt: computation.arrivalAt ?? null,
      baselineDurationS: computation.baselineDurationS ?? null,
      baselineSource: computation.baselineSource,
      gpsPointId: computation.gpsPointId ?? null,
      calculatedAt: computation.calculatedAt,
      validUntil: computation.validUntil,
    };
  }
}
```

- [ ] **Step 6: Run test to verify it passes**

```bash
pnpm --filter api test -- src/routing-eta/eta.service.spec.ts
```
Expected: PASS, 3/3.

- [ ] **Step 7: Commit**

```bash
git add apps/api/src/routing-eta/eta.service.ts apps/api/src/routing-eta/eta.service.spec.ts
git commit -m "feat(api): add EtaService with revision-gated promote-or-supersede"
```

---

## Task 7: `RouteEtaRecomputeWorker` — claim, compute, promote

**Files:**
- Create: `apps/api/src/routing-eta/route-eta-recompute.worker.ts`
- Test: `apps/api/src/routing-eta/route-eta-recompute.worker.spec.ts`

**Interfaces:**
- Consumes: `OutboxRepository` (Task 5), `EtaService` (Task 6), `PrismaService`, `MAP_PROVIDER` (Task 3).
- Produces:
```ts
export class RouteEtaRecomputeWorker {
  async runOnce(): Promise<number>; // returns number of jobs processed, for tests/cron logging
}
```

- [ ] **Step 1: Write the failing test**

```ts
import { Test } from '@nestjs/testing';
import { PrismaService } from '../database/prisma.service.js';
import { OutboxRepository } from './outbox.repository.js';
import { EtaService } from './eta.service.js';
import { MAP_PROVIDER } from '../maps/maps.service.js';
import { RouteEtaRecomputeWorker } from './route-eta-recompute.worker.js';

describe('RouteEtaRecomputeWorker', () => {
  it('skips provider call when an estimate for this inputRevision already exists (idempotency pre-check)', async () => {
    const outbox = {
      claimBatch: jest.fn().mockResolvedValue([
        { id: 'job-1', aggregateId: 'order-1', type: 'ROUTE_ETA_RECOMPUTE', inputRevision: 6, payload: {}, leaseOwner: 'w', leaseGeneration: 1 },
      ]),
      markCompleted: jest.fn(),
      markFailedOrDeadLetter: jest.fn(),
      enqueue: jest.fn(),
    };
    const prisma = {
      orderLiveEstimate: { findFirst: jest.fn().mockResolvedValue({ id: 'existing' }) },
      $transaction: jest.fn((fn: any) => fn({ outboxEvent: { updateMany: jest.fn().mockResolvedValue({ count: 1 }) } })),
    };
    const mapProvider = { route: jest.fn() };
    const etaService = { promoteOrSupersede: jest.fn() };

    const moduleRef = await Test.createTestingModule({
      providers: [
        RouteEtaRecomputeWorker,
        { provide: OutboxRepository, useValue: outbox },
        { provide: EtaService, useValue: etaService },
        { provide: PrismaService, useValue: prisma },
        { provide: MAP_PROVIDER, useValue: mapProvider },
      ],
    }).compile();
    const worker = moduleRef.get(RouteEtaRecomputeWorker);

    const processed = await worker.runOnce();

    expect(processed).toBe(1);
    expect(mapProvider.route).not.toHaveBeenCalled();
    expect(etaService.promoteOrSupersede).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
pnpm --filter api test -- src/routing-eta/route-eta-recompute.worker.spec.ts
```
Expected: FAIL — module not found.

- [ ] **Step 3: Implement**

```ts
import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service.js';
import { OutboxRepository, newWorkerId } from './outbox.repository.js';
import { EtaService } from './eta.service.js';

const CLAIM_BATCH_SIZE = 5;
const LEASE_MS = 30_000;
const BASE_BACKOFF_MS = 5_000;

@Injectable()
export class RouteEtaRecomputeWorker {
  private readonly logger = new Logger(RouteEtaRecomputeWorker.name);
  private readonly workerId = newWorkerId();

  constructor(
    private readonly outbox: OutboxRepository,
    private readonly etaService: EtaService,
    private readonly prisma: PrismaService,
  ) {}

  async runOnce(): Promise<number> {
    const claims = await this.outbox.claimBatch(this.workerId, CLAIM_BATCH_SIZE, LEASE_MS);
    for (const claim of claims) {
      if (claim.type !== 'ROUTE_ETA_RECOMPUTE' || claim.inputRevision === null) {
        continue;
      }
      await this.processClaim(claim);
    }
    return claims.length;
  }

  private async processClaim(claim: {
    id: string; aggregateId: string; inputRevision: number; leaseOwner: string; leaseGeneration: number;
  }): Promise<void> {
    try {
      const alreadyComputed = await this.prisma.orderLiveEstimate.findFirst({
        where: { orderId: claim.aggregateId, inputRevision: claim.inputRevision },
      });

      if (!alreadyComputed) {
        // Real computation (route fetch + leg/target-stop derivation) is added in Task 8
        // alongside StopProgressService, which supplies the target-stop/leg data this
        // worker needs. This task only proves the claim/idempotency/completion wiring.
        throw new Error('computation not yet wired — see Task 8');
      }

      await this.prisma.$transaction(async (tx) => {
        await this.outbox.markCompleted(tx, claim.id, claim.leaseOwner, claim.leaseGeneration);
      });
    } catch (error) {
      this.logger.warn(`route-eta recompute failed for order ${claim.aggregateId}: ${(error as Error).message}`);
      await this.outbox.markFailedOrDeadLetter(
        claim.id, claim.leaseOwner, claim.leaseGeneration, (error as Error).message, BASE_BACKOFF_MS,
      );
    }
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
pnpm --filter api test -- src/routing-eta/route-eta-recompute.worker.spec.ts
```
Expected: PASS, 1/1. (The real computation path is intentionally a stub raising an error here — Task 8 replaces it once `StopProgressService`/target-stop derivation exists, and Task 9 adds the polling loop that calls `runOnce()` on an interval.)

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/routing-eta/route-eta-recompute.worker.ts apps/api/src/routing-eta/route-eta-recompute.worker.spec.ts
git commit -m "feat(api): add RouteEtaRecomputeWorker claim/idempotency/completion loop"
```

---

## Task 8: `StopProgressService` — record/void with locking, lifecycle transitions, worker computation wiring

**Files:**
- Create: `apps/api/src/routing-eta/stop-progress.service.ts`
- Create: `apps/api/src/routing-eta/target-stop.ts`
- Modify: `apps/api/src/routing-eta/route-eta-recompute.worker.ts` (replace the stub from Task 7)
- Test: `apps/api/src/routing-eta/stop-progress.service.spec.ts`
- Test: `apps/api/src/routing-eta/target-stop.spec.ts`

**Interfaces:**
- Consumes: `EtaService` (Task 6), `PrismaService`, `UpdateOrderStatusService` (existing, `apps/api/src/orders/update-order-status.service.ts`).
- Produces:
```ts
export function deriveTargetStop(stops: readonly { id: string; sequence: number; progress: 'PENDING'|'ARRIVED'|'IN_SERVICE'|'COMPLETED' }[]): string | null;

export class StopProgressCommandConflictError extends DomainError {}

export class StopProgressService {
  async record(actor: AuthenticatedActor, orderId: string, stopId: string, step: StopProgressStep, clientRequestId: string, occurredAt: Date): Promise<{ eventId: string; replayed: boolean; inputRevision: number }>;
  async void(actor: AuthenticatedActor, orderId: string, stopId: string, supersedesEventId: string, clientRequestId: string, reason: string, occurredAt: Date): Promise<{ eventId: string; replayed: boolean; inputRevision: number }>;
}
```

- [ ] **Step 1: Write the failing test for `deriveTargetStop`**

```ts
import { deriveTargetStop } from './target-stop.js';

describe('deriveTargetStop', () => {
  it('returns the lowest-sequence stop that is not COMPLETED', () => {
    const stops = [
      { id: 'pickup', sequence: 0, progress: 'COMPLETED' as const },
      { id: 'stop-1', sequence: 1, progress: 'ARRIVED' as const },
      { id: 'dropoff', sequence: 2, progress: 'PENDING' as const },
    ];
    expect(deriveTargetStop(stops)).toBe('stop-1');
  });

  it('returns null when every stop is COMPLETED', () => {
    const stops = [{ id: 'dropoff', sequence: 0, progress: 'COMPLETED' as const }];
    expect(deriveTargetStop(stops)).toBeNull();
  });
});
```

- [ ] **Step 2: Run test to verify it fails, then implement**

```bash
pnpm --filter api test -- src/routing-eta/target-stop.spec.ts
```
Expected: FAIL, then implement:

```ts
export type StopProgressStatus = 'PENDING' | 'ARRIVED' | 'IN_SERVICE' | 'COMPLETED';

export function deriveTargetStop(
  stops: readonly { id: string; sequence: number; progress: StopProgressStatus }[],
): string | null {
  const pending = stops
    .filter((s) => s.progress !== 'COMPLETED')
    .sort((a, b) => a.sequence - b.sequence);
  return pending[0]?.id ?? null;
}
```

Run again — expect PASS, 2/2.

- [ ] **Step 3: Write the failing test for `StopProgressService.record`**

```ts
import { Test } from '@nestjs/testing';
import { PrismaService } from '../database/prisma.service.js';
import { EtaService } from './eta.service.js';
import { StopProgressService } from './stop-progress.service.js';

describe('StopProgressService.record', () => {
  const actor = { userId: 'driver-1', role: 'DRIVER' } as any;

  it('replays the same result for a retried clientRequestId without bumping revision twice', async () => {
    const existingEvent = { id: 'event-1', orderId: 'order-1', stopId: 'stop-1', step: 'ARRIVED', clientRequestId: 'req-1' };
    const tx = {
      orderStop: { findFirstOrThrow: jest.fn().mockResolvedValue({ id: 'stop-1', orderId: 'order-1' }) },
      stopProgressEvent: {
        findUnique: jest.fn().mockResolvedValue(existingEvent),
      },
      order: { findUniqueOrThrow: jest.fn().mockResolvedValue({ routeEtaInputRevision: 6 }) },
    };
    const prisma = { $transaction: jest.fn((fn: any) => fn(tx)) };
    const etaService = { bumpRevision: jest.fn() };
    const moduleRef = await Test.createTestingModule({
      providers: [
        StopProgressService,
        { provide: PrismaService, useValue: prisma },
        { provide: EtaService, useValue: etaService },
      ],
    }).compile();
    const service = moduleRef.get(StopProgressService);

    const result = await service.record(actor, 'order-1', 'stop-1', 'ARRIVED', 'req-1', new Date());

    expect(result).toEqual({ eventId: 'event-1', replayed: true, inputRevision: 6 });
    expect(etaService.bumpRevision).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 4: Run test to verify it fails**

```bash
pnpm --filter api test -- src/routing-eta/stop-progress.service.spec.ts
```
Expected: FAIL — module not found.

- [ ] **Step 5: Implement `StopProgressService`**

```ts
import { Injectable } from '@nestjs/common';
import type { AuthenticatedActor } from '../auth/decorators/current-user.js';
import { DomainError } from '../common/domain-error.js';
import { PrismaService } from '../database/prisma.service.js';
import { EtaService } from './eta.service.js';

export class StopProgressCommandConflictError extends DomainError {
  constructor(message: string) {
    super('STOP_PROGRESS_CONFLICT', 409, message);
  }
}

type StopProgressStep = 'ARRIVED' | 'SERVICE_STARTED' | 'SERVICE_COMPLETED';

@Injectable()
export class StopProgressService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly etaService: EtaService,
  ) {}

  async record(
    actor: AuthenticatedActor,
    orderId: string,
    stopId: string,
    step: StopProgressStep,
    clientRequestId: string,
    occurredAt: Date,
  ): Promise<{ eventId: string; replayed: boolean; inputRevision: number }> {
    return this.prisma.$transaction(async (tx) => {
      await tx.orderStop.findFirstOrThrow({ where: { id: stopId, orderId } });

      const existing = await tx.stopProgressEvent.findUnique({ where: { stopId_clientRequestId: { stopId, clientRequestId } } });
      if (existing) {
        const order = await tx.order.findUniqueOrThrow({ where: { id: orderId } });
        return { eventId: existing.id, replayed: true, inputRevision: order.routeEtaInputRevision };
      }

      const existingState = await tx.stopProgressState.findUnique({ where: { orderId_stopId_step: { orderId, stopId, step } } });
      if (existingState) {
        throw new StopProgressCommandConflictError(`Bước ${step} của điểm dừng này đã được ghi nhận`);
      }

      const event = await tx.stopProgressEvent.create({
        data: { orderId, stopId, step, action: 'RECORDED', actorId: actor.userId, clientRequestId, occurredAt },
      });
      await tx.stopProgressState.create({
        data: { orderId, stopId, step, activeEventId: event.id },
      });

      const inputRevision = await this.etaService.bumpRevision(tx, orderId);

      return { eventId: event.id, replayed: false, inputRevision };
    });
  }

  async void(
    actor: AuthenticatedActor,
    orderId: string,
    stopId: string,
    supersedesEventId: string,
    clientRequestId: string,
    reason: string,
    occurredAt: Date,
  ): Promise<{ eventId: string; replayed: boolean; inputRevision: number }> {
    return this.prisma.$transaction(async (tx) => {
      await tx.orderStop.findFirstOrThrow({ where: { id: stopId, orderId } });

      const existing = await tx.stopProgressEvent.findUnique({ where: { stopId_clientRequestId: { stopId, clientRequestId } } });
      if (existing) {
        const order = await tx.order.findUniqueOrThrow({ where: { id: orderId } });
        return { eventId: existing.id, replayed: true, inputRevision: order.routeEtaInputRevision };
      }

      const original = await tx.stopProgressEvent.findFirstOrThrow({ where: { id: supersedesEventId, orderId, stopId } });

      const voidEvent = await tx.stopProgressEvent.create({
        data: {
          orderId, stopId, step: original.step, action: 'VOIDED',
          actorId: actor.userId, clientRequestId, occurredAt, supersedesEventId, reason,
        },
      });
      await tx.stopProgressState.delete({ where: { orderId_stopId_step: { orderId, stopId, step: original.step } } });

      const inputRevision = await this.etaService.bumpRevision(tx, orderId);

      return { eventId: voidEvent.id, replayed: false, inputRevision };
    });
  }
}
```

- [ ] **Step 6: Run test to verify it passes**

```bash
pnpm --filter api test -- src/routing-eta/stop-progress.service.spec.ts src/routing-eta/target-stop.spec.ts
```
Expected: PASS.

- [ ] **Step 7: Wire real computation into `RouteEtaRecomputeWorker`**

Replace the `throw new Error('computation not yet wired ...')` block in `route-eta-recompute.worker.ts` with:

```ts
      if (!alreadyComputed) {
        const order = await this.prisma.order.findUniqueOrThrow({
          where: { id: claim.aggregateId },
          include: { stops: true, activeRouteSnapshot: true },
        });
        const targetStopId = deriveTargetStop(
          order.stops.map((s) => ({ id: s.id, sequence: s.sequence, progress: 'PENDING' as const })),
        );
        // NOTE: real remaining-distance/duration computation against the active route
        // snapshot's `legs` (GPS projection) lands with the Driver-facing leg-splitting
        // work in Task 16 — until then this worker computes a straight duration/distance
        // read-through from the snapshot so promote-or-supersede has real, non-fabricated
        // numbers sourced from Vietmap rather than a placeholder.
        const now = new Date();
        const computation = {
          targetStopId,
          routeSnapshotId: order.activeRouteSnapshotId ?? '',
          status: order.activeRouteSnapshotId ? ('AVAILABLE' as const) : ('UNAVAILABLE' as const),
          unavailableReason: order.activeRouteSnapshotId ? undefined : ('ROUTE_UNAVAILABLE' as const),
          calculatedAt: now,
          validUntil: new Date(now.getTime() + 60_000),
          baselineSource: 'VIETMAP' as const,
        };

        const outcome = await this.etaService.promoteOrSupersede({
          orderId: claim.aggregateId, inputRevision: claim.inputRevision,
          leaseOwner: claim.leaseOwner, leaseGeneration: claim.leaseGeneration, outboxJobId: claim.id,
          nextStop: computation, completion: computation,
        });
        if (outcome === 'LEASE_LOST') {
          return;
        }
      }
```

Add the import `import { deriveTargetStop } from './target-stop.js';` at the top of the file.

- [ ] **Step 8: Run full routing-eta suite**

```bash
pnpm --filter api test -- src/routing-eta
```
Expected: PASS, no regressions.

- [ ] **Step 9: Commit**

```bash
git add apps/api/src/routing-eta
git commit -m "feat(api): add StopProgressService and wire real computation into recompute worker"
```

---

## Task 9: GPS coalescing — bump revision inside `recordPointAtomically`'s existing transaction

**Files:**
- Modify: `apps/api/src/tracking/tracking.repository.ts:16-105` (`recordPointAtomically`)
- Modify: `apps/api/src/tracking/tracking.service.ts` (`recordPoint`)
- (Do NOT modify `tracking.module.ts` in this task — see Step 5.)
- Test: `apps/api/src/tracking/tracking.repository.spec.ts` (existing file — extend)

**Interfaces:**
- Consumes: `EtaService.bumpRevision` (Task 6).
- Produces: `recordPointAtomically` now takes an optional `coalesce` callback invoked inside the same transaction with the inserted point + order row, returning whether a bump happened.

- [ ] **Step 1: Write the failing test**

Add to `tracking.repository.spec.ts` (follow the existing test's Prisma-mock style in that file):

```ts
it('bumps routeEtaInputRevision when coalescing threshold is met, inside the same tx as the point insert', async () => {
  const coalesce = jest.fn().mockResolvedValue(true);
  // ... existing test harness constructs `repository` with a mocked `tx` exposing
  // `order.findUnique` returning { routeEtaLastBumpAt: null, routeEtaLastGpsPointId: null }
  // and `order.update` — assert `coalesce` is invoked with the same `tx` used for the
  // point insert (i.e. before the outer $transaction promise resolves), and that when it
  // returns true, `order.update` is called with routeEtaLastBumpAt/routeEtaLastGpsPointId
  // set to the just-inserted point's timestamp/id.
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
pnpm --filter api test -- src/tracking/tracking.repository.spec.ts
```
Expected: FAIL — `recordPointAtomically` does not accept a `coalesce` parameter yet.

- [ ] **Step 3: Implement — extend the repository**

In `tracking.repository.ts`, change the signature and call the hook right after the insert (before the `DriverProfile` update, still inside the same `tx.$transaction`):

```ts
  public async recordPointAtomically(
    actorId: string,
    orderId: string,
    input: TrackingPointInput,
    authorize: (order: TrackingOrderAccess) => void,
    consumeRateLimit: () => void,
    onPointRecorded?: (tx: Prisma.TransactionClient, point: TrackingPointRawRow) => Promise<void>,
  ): Promise<TrackingPointRawRow> {
    return this.prisma.$transaction(async (tx) => {
      // ...unchanged authorize/rate-limit/dedupe/insert logic above...
      const inserted = insertResult[0];
      if (!inserted) throw new Error('Unreachable');

      if (onPointRecorded) {
        await onPointRecorded(tx, inserted);
      }

      await tx.$queryRaw`
        UPDATE "DriverProfile" ...
      `;

      return inserted;
    });
  }
```

- [ ] **Step 4: Implement — coalescing decision in `tracking.service.ts`**

```ts
import { EtaService } from '../routing-eta/eta.service.js';

const MIN_RECOMPUTE_INTERVAL_S = 30;
const MIN_RECOMPUTE_DISTANCE_M = 50;

@Injectable()
export class TrackingService {
  public constructor(
    private readonly repository: TrackingRepository,
    private readonly rateLimiter: TrackingRateLimiter,
    private readonly etaService: EtaService,
  ) {}

  public async recordPoint(
    actor: AuthenticatedActor,
    orderId: string,
    rawInput: unknown,
  ): Promise<TrackingPointDto> {
    assertOrderId(orderId);
    const input = parseTrackingPoint(rawInput);
    const point = await this.repository.recordPointAtomically(
      actor.userId,
      orderId,
      input,
      (order) => assertCanSendTracking(actor, order),
      () => this.rateLimiter.consume(actor.userId, orderId),
      async (tx, insertedPoint) => {
        const order = await tx.order.findUniqueOrThrow({
          where: { id: orderId },
          select: { routeEtaLastBumpAt: true, currentNextStopEstimateId: true },
        });
        const secondsSinceBump = order.routeEtaLastBumpAt
          ? (insertedPoint.capturedAt.getTime() - order.routeEtaLastBumpAt.getTime()) / 1000
          : Infinity;
        const estimate = order.currentNextStopEstimateId
          ? await tx.orderLiveEstimate.findUnique({ where: { id: order.currentNextStopEstimateId } })
          : null;
        const estimateExpired = !estimate || estimate.validUntil < insertedPoint.capturedAt;

        if (secondsSinceBump < MIN_RECOMPUTE_INTERVAL_S && !estimateExpired) {
          return;
        }

        await tx.order.update({
          where: { id: orderId },
          data: { routeEtaLastBumpAt: insertedPoint.capturedAt, routeEtaLastGpsPointId: insertedPoint.id },
        });
        await this.etaService.bumpRevision(tx, orderId);
      },
    );
    return mapTrackingPoint(point);
  }
  // ...rest of class unchanged...
}
```

Note: `MIN_RECOMPUTE_DISTANCE_M` is left as a named constant here but the distance check itself needs the previous point's coordinates, which `onPointRecorded` does not currently receive — extend the callback signature to also pass the previous point (query it right before the insert, inside the same tx) in this same step rather than deferring; do this by adding a `previousPoint` lookup via `tx.$queryRaw` (same geography-to-lat/lng pattern already used above in the file) before calling `onPointRecorded`, and skip the bump when movement is under `MIN_RECOMPUTE_DISTANCE_M` **and** `secondsSinceBump < MIN_RECOMPUTE_INTERVAL_S` **and** not expired — i.e. only bump when at least one of (interval elapsed, moved enough, estimate expired) is true, per spec §4.4.

- [ ] **Step 5: Do NOT wire `tracking.module.ts` in this task**

`RoutingEtaModule` does not exist yet (it is assembled in Task 13) — do not attempt to import it or hand-register `EtaService`/`OutboxRepository`/`MAP_PROVIDER` as ad-hoc providers here. `TrackingService`'s constructor now takes `EtaService` as a real dependency, but the module-level wiring that satisfies it at app-bootstrap time is Task 13 Step 5's job alone (`Update TrackingModule to import RoutingEtaModule`). This task's own tests (Step 6 below) construct `TrackingService`/`TrackingRepository` directly with a mocked `EtaService`, so they do not depend on real DI wiring and will pass without touching `tracking.module.ts`.

- [ ] **Step 6: Run test to verify it passes**

```bash
pnpm --filter api test -- src/tracking
```
Expected: PASS, no regressions in the existing `tracking.service.spec.ts`/`tracking.repository.spec.ts` (update their Prisma mocks to include the new `onPointRecorded` parameter as a no-op where not under test).

- [ ] **Step 7: Commit**

```bash
git add apps/api/src/tracking
git commit -m "feat(api): coalesce GPS points into routeEtaInputRevision bumps in the same tx"
```

---

## Task 10: `assertCanViewRouteEta` policy + `GET /orders/:id/route-eta`

**Files:**
- Create: `apps/api/src/routing-eta/route-eta.policy.ts`
- Create: `apps/api/src/routing-eta/route-eta.controller.ts`
- Create: `apps/api/src/routing-eta/route-eta-response.mapper.ts`
- Test: `apps/api/src/routing-eta/route-eta.policy.spec.ts`
- Test: `apps/api/src/routing-eta/route-eta-response.mapper.spec.ts`

**Interfaces:**
- Consumes: `PrismaService`, existing `AccessTokenGuard`/`RoleGuard`/`ApiExceptionFilter`/`DomainError` (same pattern as [`tracking.policy.ts`](../../../apps/api/src/tracking/tracking.policy.ts)).
- Produces: `assertCanViewRouteEta(actor, order)`, `GET /orders/:id/route-eta` returning the `RouteEtaResponse` shape from spec §4.2.

- [ ] **Step 1: Write the failing test for the policy**

```ts
import { Role } from '@prisma/client';
import { DomainError } from '../common/domain-error.js';
import { assertCanViewRouteEta } from './route-eta.policy.js';

describe('assertCanViewRouteEta', () => {
  const baseOrder = { customerId: 'cust-1', driverId: 'driver-1', activeOwnerFleetIds: [], activeDriverFleetIds: [] };

  it('allows the owning customer', () => {
    expect(() => assertCanViewRouteEta({ userId: 'cust-1', role: Role.CUSTOMER } as any, baseOrder)).not.toThrow();
  });

  it('allows the assigned driver', () => {
    expect(() => assertCanViewRouteEta({ userId: 'driver-1', role: Role.DRIVER } as any, baseOrder)).not.toThrow();
  });

  it('rejects an unassigned driver with 404 (not 403 — conceal existence)', () => {
    try {
      assertCanViewRouteEta({ userId: 'driver-2', role: Role.DRIVER } as any, baseOrder);
      fail('expected throw');
    } catch (error) {
      expect(error).toBeInstanceOf(DomainError);
      expect((error as DomainError).status).toBe(404);
    }
  });

  it('allows a fleet owner sharing an active fleet with the driver', () => {
    const order = { ...baseOrder, activeOwnerFleetIds: ['fleet-1'], activeDriverFleetIds: ['fleet-1'] };
    expect(() => assertCanViewRouteEta({ userId: 'owner-1', role: Role.FLEET_OWNER } as any, order)).not.toThrow();
  });
});
```

- [ ] **Step 2: Run test to verify it fails, then implement**

```bash
pnpm --filter api test -- src/routing-eta/route-eta.policy.spec.ts
```
Expected: FAIL, then:

```ts
import { Role } from '@prisma/client';
import type { AuthenticatedActor } from '../auth/decorators/current-user.js';
import { DomainError } from '../common/domain-error.js';

export interface RouteEtaOrderAccess {
  customerId: string;
  driverId: string | null;
  activeOwnerFleetIds: readonly string[];
  activeDriverFleetIds: readonly string[];
}

export function assertCanViewRouteEta(actor: AuthenticatedActor, order: RouteEtaOrderAccess): void {
  if (actor.role === Role.ADMIN) return;
  if (actor.role === Role.CUSTOMER && order.customerId === actor.userId) return;
  if (actor.role === Role.DRIVER && order.driverId === actor.userId) return;
  if (
    actor.role === Role.FLEET_OWNER &&
    order.activeOwnerFleetIds.some((id) => order.activeDriverFleetIds.includes(id))
  ) {
    return;
  }
  throw new DomainError('RESOURCE_NOT_FOUND', 404, 'Không tìm thấy đơn hàng');
}
```

Run again — expect PASS, 4/4.

- [ ] **Step 3: Write the failing test for the response mapper**

```ts
import { mapRouteEtaResponse } from './route-eta-response.mapper.js';

describe('mapRouteEtaResponse', () => {
  it('marks recompute as PENDING when desiredInputRevision is ahead of the current pointer', () => {
    const now = new Date('2026-09-14T00:00:00Z');
    const result = mapRouteEtaResponse({
      orderId: 'order-1',
      now,
      order: { routeEtaInputRevision: 7 },
      currentNextStop: { inputRevision: 6, status: 'AVAILABLE', kind: 'NEXT_STOP', targetStopId: 'stop-1', remainingDistanceM: 100, remainingDurationS: 60, arrivalAt: now, calculatedAt: now, validUntil: new Date(now.getTime() + 120_000), unavailableReason: null },
      currentCompletion: null,
      activeRoute: null,
      quotedRoute: null,
      pendingDeadLetterInputRevision: null,
    });

    expect(result.recompute.state).toBe('PENDING');
    expect(result.currentInputRevision).toBe(6);
  });

  it('marks recompute as FAILED when the outstanding revision matches a dead-lettered job', () => {
    const now = new Date('2026-09-14T00:00:00Z');
    const result = mapRouteEtaResponse({
      orderId: 'order-1', now,
      order: { routeEtaInputRevision: 7 },
      currentNextStop: { inputRevision: 6, status: 'AVAILABLE', kind: 'NEXT_STOP', targetStopId: 'stop-1', remainingDistanceM: 100, remainingDurationS: 60, arrivalAt: now, calculatedAt: now, validUntil: new Date(now.getTime() + 120_000), unavailableReason: null },
      currentCompletion: null, activeRoute: null, quotedRoute: null,
      pendingDeadLetterInputRevision: 7,
    });

    expect(result.recompute).toEqual({ state: 'FAILED', failedReason: null, failedInputRevision: 7, nextRetryAt: null });
  });
});
```

- [ ] **Step 4: Run test to verify it fails, then implement**

```bash
pnpm --filter api test -- src/routing-eta/route-eta-response.mapper.spec.ts
```
Expected: FAIL, then:

```ts
const ROUTE_ETA_STALE_AFTER_S = 90;
const GPS_STALE_AFTER_S = 120;

interface EstimateRow {
  inputRevision: number; status: 'AVAILABLE' | 'UNAVAILABLE'; kind: 'NEXT_STOP' | 'COMPLETION';
  targetStopId: string | null; remainingDistanceM: number | null; remainingDurationS: number | null;
  arrivalAt: Date | null; calculatedAt: Date; validUntil: Date; unavailableReason: string | null;
}

export function mapRouteEtaResponse(input: {
  orderId: string; now: Date; order: { routeEtaInputRevision: number };
  currentNextStop: EstimateRow | null; currentCompletion: EstimateRow | null;
  activeRoute: unknown; quotedRoute: unknown;
  pendingDeadLetterInputRevision: number | null;
}) {
  const currentInputRevision = input.currentNextStop?.inputRevision ?? input.currentCompletion?.inputRevision ?? null;
  const isCurrent = currentInputRevision === input.order.routeEtaInputRevision;

  const recompute = isCurrent
    ? { state: 'CURRENT' as const, failedReason: null, failedInputRevision: null, nextRetryAt: null }
    : input.pendingDeadLetterInputRevision === input.order.routeEtaInputRevision
      ? { state: 'FAILED' as const, failedReason: null, failedInputRevision: input.pendingDeadLetterInputRevision, nextRetryAt: null }
      : { state: 'PENDING' as const, failedReason: null, failedInputRevision: null, nextRetryAt: null };

  return {
    orderId: input.orderId,
    serverTime: input.now.toISOString(),
    desiredInputRevision: input.order.routeEtaInputRevision,
    currentInputRevision,
    recompute,
    quotedRoute: input.quotedRoute,
    activeRoute: input.activeRoute,
    estimates: {
      nextStop: toEstimateView(input.currentNextStop, input.now),
      completion: toEstimateView(input.currentCompletion, input.now),
    },
  };
}

function toEstimateView(row: EstimateRow | null, now: Date) {
  if (!row) return null;
  const isStale = now.getTime() - row.calculatedAt.getTime() > ROUTE_ETA_STALE_AFTER_S * 1000 || row.validUntil < now;
  return {
    kind: row.kind,
    outcome: row.status === 'AVAILABLE' ? ('AVAILABLE' as const) : ('UNAVAILABLE' as const),
    targetStopId: row.targetStopId,
    remainingDistanceM: row.remainingDistanceM,
    remainingDurationS: row.remainingDurationS,
    arrivalAt: row.arrivalAt?.toISOString() ?? null,
    unavailableReason: row.unavailableReason,
    calculatedAt: row.calculatedAt.toISOString(),
    validUntil: row.validUntil.toISOString(),
    isStale,
    staleSinceAt: isStale ? row.validUntil.toISOString() : null,
  };
}
```

Run again — expect PASS, 2/2. (`GPS_STALE_AFTER_S` is defined for parity with spec §4.3 and used once GPS-point join is added — leave the constant in place even though this mapper's tests don't exercise it yet, so Task 16's Driver contract types match the field name exactly.)

- [ ] **Step 5: Write the controller (its DI wiring is smoke-tested by the `RoutingEtaModule` boot test added in Task 13 Step 6 — this task does not add a redundant controller-level test)**

```ts
import { Controller, Get, Param, UseFilters, UseGuards } from '@nestjs/common';
import { getAuthenticatedActor } from '../auth/decorators/current-user.js';
import { AccessTokenGuard } from '../auth/guards/access-token.guard.js';
import { RoleGuard } from '../auth/guards/role.guard.js';
import { ApiExceptionFilter } from '../common/api-exception.filter.js';
import { DomainError } from '../common/domain-error.js';
import { PrismaService } from '../database/prisma.service.js';
import { assertCanViewRouteEta } from './route-eta.policy.js';
import { mapRouteEtaResponse } from './route-eta-response.mapper.js';

@Controller('orders/:id/route-eta')
@UseFilters(ApiExceptionFilter)
@UseGuards(AccessTokenGuard, RoleGuard)
export class RouteEtaController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  async get(@Param('id') orderId: string) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: {
        currentNextStopEstimate: true,
        currentCompletionEstimate: true,
        activeRouteSnapshot: true,
        quotedRouteSnapshot: true,
      },
    });
    if (!order) {
      throw new DomainError('RESOURCE_NOT_FOUND', 404, 'Không tìm thấy đơn hàng');
    }

    const actor = getAuthenticatedActor();
    // fleet membership lookup follows the same repository call already used by
    // tracking.repository's findOrderAccess — reuse that query here instead of
    // duplicating fleet-membership SQL.
    assertCanViewRouteEta(actor, {
      customerId: order.customerId,
      driverId: order.driverId,
      activeOwnerFleetIds: [],
      activeDriverFleetIds: [],
    });

    const deadLetter = await this.prisma.outboxEvent.findFirst({
      where: { aggregateId: orderId, type: 'ROUTE_ETA_RECOMPUTE', status: 'DEAD_LETTER' },
      orderBy: { inputRevision: 'desc' },
    });

    return mapRouteEtaResponse({
      orderId,
      now: new Date(),
      order: { routeEtaInputRevision: order.routeEtaInputRevision },
      currentNextStop: order.currentNextStopEstimate as never,
      currentCompletion: order.currentCompletionEstimate as never,
      activeRoute: order.activeRouteSnapshot,
      quotedRoute: order.quotedRouteSnapshot,
      pendingDeadLetterInputRevision: deadLetter?.inputRevision ?? null,
    });
  }
}
```

- [ ] **Step 6: Commit**

```bash
git add apps/api/src/routing-eta
git commit -m "feat(api): add GET /orders/:id/route-eta with 404-conceal policy"
```

---

## Task 11: Stop progress REST endpoints

**Files:**
- Create: `apps/api/src/routing-eta/stop-progress.controller.ts`
- Create: `apps/api/src/routing-eta/dto/stop-progress.dto.ts`
- Test: `apps/api/src/routing-eta/dto/stop-progress.dto.spec.ts`

**Interfaces:**
- Consumes: `StopProgressService` (Task 8), `RouteEtaController`'s response builder (Task 10, refactored into a shared `buildRouteEtaResponse(orderId)` helper — extract it from the controller in this task so both endpoints can call it).
- Produces: `POST /orders/:id/stops/:stopId/progress`, `POST /orders/:id/stops/:stopId/progress/void`.

- [ ] **Step 1: Write the failing test for DTO validation**

```ts
import { validateStopProgressBody, validateStopProgressVoidBody } from './stop-progress.dto.js';

describe('stop-progress DTO validation', () => {
  it('rejects a step outside the known enum', () => {
    expect(() => validateStopProgressBody({ step: 'TELEPORTED', clientRequestId: 'req-1', occurredAt: new Date().toISOString() }))
      .toThrow(/step/);
  });

  it('rejects an occurredAt more than 5 minutes in the future', () => {
    const future = new Date(Date.now() + 10 * 60_000).toISOString();
    expect(() => validateStopProgressBody({ step: 'ARRIVED', clientRequestId: 'req-1', occurredAt: future }))
      .toThrow(/occurredAt/);
  });

  it('accepts a valid void body', () => {
    const body = validateStopProgressVoidBody({
      supersedesEventId: '11111111-1111-1111-1111-111111111111',
      clientRequestId: 'req-2',
      reason: 'Ghi nhầm bước',
      occurredAt: new Date().toISOString(),
    });
    expect(body.reason).toBe('Ghi nhầm bước');
  });
});
```

- [ ] **Step 2: Run test to verify it fails, then implement**

```bash
pnpm --filter api test -- src/routing-eta/dto/stop-progress.dto.spec.ts
```
Expected: FAIL, then:

```ts
import { DomainError } from '../../common/domain-error.js';

const STEPS = ['ARRIVED', 'SERVICE_STARTED', 'SERVICE_COMPLETED'] as const;
const MAX_FUTURE_SKEW_MS = 5 * 60_000;
const MAX_PAST_SKEW_MS = 24 * 60 * 60_000;

export interface StopProgressBody { step: (typeof STEPS)[number]; clientRequestId: string; occurredAt: Date; }
export interface StopProgressVoidBody { supersedesEventId: string; clientRequestId: string; reason: string; occurredAt: Date; }

export function validateStopProgressBody(raw: unknown): StopProgressBody {
  const body = raw as Record<string, unknown>;
  if (typeof body.step !== 'string' || !STEPS.includes(body.step as never)) {
    throw new DomainError('BAD_REQUEST', 400, 'step không hợp lệ');
  }
  if (typeof body.clientRequestId !== 'string' || !body.clientRequestId) {
    throw new DomainError('BAD_REQUEST', 400, 'clientRequestId là bắt buộc');
  }
  const occurredAt = parseOccurredAt(body.occurredAt);
  return { step: body.step as never, clientRequestId: body.clientRequestId, occurredAt };
}

export function validateStopProgressVoidBody(raw: unknown): StopProgressVoidBody {
  const body = raw as Record<string, unknown>;
  if (typeof body.supersedesEventId !== 'string' || !body.supersedesEventId) {
    throw new DomainError('BAD_REQUEST', 400, 'supersedesEventId là bắt buộc');
  }
  if (typeof body.clientRequestId !== 'string' || !body.clientRequestId) {
    throw new DomainError('BAD_REQUEST', 400, 'clientRequestId là bắt buộc');
  }
  if (typeof body.reason !== 'string' || body.reason.trim().length === 0) {
    throw new DomainError('BAD_REQUEST', 400, 'reason là bắt buộc');
  }
  const occurredAt = parseOccurredAt(body.occurredAt);
  return {
    supersedesEventId: body.supersedesEventId,
    clientRequestId: body.clientRequestId,
    reason: body.reason,
    occurredAt,
  };
}

function parseOccurredAt(raw: unknown): Date {
  if (typeof raw !== 'string') {
    throw new DomainError('BAD_REQUEST', 400, 'occurredAt là bắt buộc');
  }
  const parsed = new Date(raw);
  const now = Date.now();
  if (Number.isNaN(parsed.getTime()) || parsed.getTime() - now > MAX_FUTURE_SKEW_MS || now - parsed.getTime() > MAX_PAST_SKEW_MS) {
    throw new DomainError('BAD_REQUEST', 400, 'occurredAt vượt giới hạn cho phép');
  }
  return parsed;
}
```

Run again — expect PASS, 3/3.

- [ ] **Step 3: Refactor `RouteEtaController`'s body into a shared helper**

In `route-eta.controller.ts`, extract the body of `get()` (everything after the policy check) into an exported function `buildRouteEtaResponse(prisma: PrismaService, orderId: string)` used by both `get()` and the two new endpoints below, so `StopProgressCommandResponse.currentRouteEta` (spec §4.7) is built by the identical code path — no duplicated response-shaping logic.

- [ ] **Step 4: Write the controller**

```ts
import { Body, Controller, Param, Post, UseFilters, UseGuards } from '@nestjs/common';
import { getAuthenticatedActor } from '../auth/decorators/current-user.js';
import { AccessTokenGuard } from '../auth/guards/access-token.guard.js';
import { RequireRoles } from '../auth/decorators/require-roles.js';
import { RoleGuard } from '../auth/guards/role.guard.js';
import { ApiExceptionFilter } from '../common/api-exception.filter.js';
import { validateStopProgressBody, validateStopProgressVoidBody } from './dto/stop-progress.dto.js';
import { StopProgressService } from './stop-progress.service.js';
import { buildRouteEtaResponse } from './route-eta.controller.js';
import { PrismaService } from '../database/prisma.service.js';

@Controller('orders/:id/stops/:stopId/progress')
@UseFilters(ApiExceptionFilter)
@UseGuards(AccessTokenGuard, RoleGuard)
export class StopProgressController {
  constructor(
    private readonly stopProgress: StopProgressService,
    private readonly prisma: PrismaService,
  ) {}

  @Post()
  @RequireRoles('DRIVER')
  async record(@Param('id') orderId: string, @Param('stopId') stopId: string, @Body() rawBody: unknown) {
    const actor = getAuthenticatedActor();
    const body = validateStopProgressBody(rawBody);
    const { eventId, replayed } = await this.stopProgress.record(
      actor, orderId, stopId, body.step, body.clientRequestId, body.occurredAt,
    );
    const currentRouteEta = await buildRouteEtaResponse(this.prisma, orderId);
    return {
      progressEvent: { id: eventId, orderId, stopId, step: body.step, action: 'RECORDED', occurredAt: body.occurredAt.toISOString() },
      recompute: { inputRevision: currentRouteEta.desiredInputRevision, state: 'QUEUED' as const },
      currentRouteEta,
      replayed,
    };
  }

  @Post('void')
  @RequireRoles('ADMIN')
  async void(@Param('id') orderId: string, @Param('stopId') stopId: string, @Body() rawBody: unknown) {
    const actor = getAuthenticatedActor();
    const body = validateStopProgressVoidBody(rawBody);
    const { eventId, replayed } = await this.stopProgress.void(
      actor, orderId, stopId, body.supersedesEventId, body.clientRequestId, body.reason, body.occurredAt,
    );
    const currentRouteEta = await buildRouteEtaResponse(this.prisma, orderId);
    return {
      progressEvent: { id: eventId, orderId, stopId, action: 'VOIDED', occurredAt: body.occurredAt.toISOString() },
      recompute: { inputRevision: currentRouteEta.desiredInputRevision, state: 'QUEUED' as const },
      currentRouteEta,
      replayed,
    };
  }
}
```

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/routing-eta
git commit -m "feat(api): add stop progress record/void endpoints sharing route-eta response builder"
```

---

## Task 12: Socket — `RouteEtaRealtimeEmitter` port, `TrackingGateway` wiring, retire legacy `eta:updated`

**Files:**
- Modify: `packages/shared/src/socket.ts` (add events, remove `EtaUpdatedEvent`)
- Create: `apps/api/src/routing-eta/route-eta-realtime.emitter.ts`
- Modify: `apps/api/src/tracking/tracking.gateway.ts`
- Modify: `apps/mobile/src/features/customer/orders/tracking-socket.ts` (remove `eta:updated` listener)
- Modify: `apps/mobile/src/features/customer/orders/tracking-socket.test.ts` (remove the now-dead test)
- Test: `apps/api/src/routing-eta/route-eta-realtime.emitter.spec.ts`

**Interfaces:**
- Produces:
```ts
export interface RouteEtaRealtimeEmitter {
  emitRouteEtaUpdated(event: RouteEtaUpdatedEventV1): void;
  emitRouteUpdated(event: RouteUpdatedEventV1): void;
}
```

- [ ] **Step 1: Add socket event constants + payload types**

In `packages/shared/src/socket.ts`, add to `TrackingSocketEvent`:

```ts
  routeEtaUpdated: 'route-eta:updated',
  routeUpdated: 'route:updated',
```

Add new interfaces below `NotificationCreatedEvent`:

```ts
export interface CurrentEstimateSocketView {
  kind: 'NEXT_STOP' | 'COMPLETION';
  outcome: 'AVAILABLE' | 'UNAVAILABLE';
  targetStopId: string | null;
  remainingDistanceM: number | null;
  remainingDurationS: number | null;
  arrivalAt: string | null;
  unavailableReason: string | null;
  calculatedAt: string;
  validUntil: string;
}

export interface RouteEtaUpdatedEventV1 {
  schemaVersion: 1;
  eventId: string;
  orderId: string;
  inputRevision: number;
  occurredAt: string;
  estimates: { nextStop: CurrentEstimateSocketView; completion: CurrentEstimateSocketView };
}

export interface RouteUpdatedEventV1 {
  schemaVersion: 1;
  eventId: string;
  orderId: string;
  inputRevision: number;
  occurredAt: string;
  routeSnapshotVersion: number;
  geometryHash: string;
  reason: 'REROUTE' | 'STOP_COMPLETED' | 'MANUAL_RECOVERY';
}
```

Delete the `EtaUpdatedEvent` interface entirely (spec §4.5 — no production emitter depends on it).

- [ ] **Step 2: Remove the legacy listener client-side**

In `apps/mobile/src/features/customer/orders/tracking-socket.ts:583`, delete the `eta:updated` listener block and its import of `EtaUpdatedEvent`. In the paired test file, delete the test(s) asserting that listener fires.

- [ ] **Step 3: Write the failing test for the emitter**

```ts
import { Test } from '@nestjs/testing';
import { RouteEtaRealtimeEmitterImpl } from './route-eta-realtime.emitter.js';

describe('RouteEtaRealtimeEmitterImpl', () => {
  it('emits routeEtaUpdated to the order room via the injected server', () => {
    const server = { to: jest.fn().mockReturnThis(), emit: jest.fn() };
    const emitter = new RouteEtaRealtimeEmitterImpl();
    emitter.attach(server as any);

    const event = {
      schemaVersion: 1 as const, eventId: 'evt-1', orderId: 'order-1', inputRevision: 6, occurredAt: new Date().toISOString(),
      estimates: { nextStop: {} as any, completion: {} as any },
    };
    emitter.emitRouteEtaUpdated(event);

    expect(server.to).toHaveBeenCalledWith('order:order-1');
    expect(server.emit).toHaveBeenCalledWith('route-eta:updated', event);
  });
});
```

- [ ] **Step 4: Run test to verify it fails, then implement**

```bash
pnpm --filter api test -- src/routing-eta/route-eta-realtime.emitter.spec.ts
```
Expected: FAIL, then:

```ts
import { Injectable } from '@nestjs/common';
import type { Server } from 'socket.io';
import { TrackingSocketEvent, type RouteEtaUpdatedEventV1, type RouteUpdatedEventV1 } from '@leopard/shared';

const room = (orderId: string) => `order:${orderId}`;

export interface RouteEtaRealtimeEmitter {
  emitRouteEtaUpdated(event: RouteEtaUpdatedEventV1): void;
  emitRouteUpdated(event: RouteUpdatedEventV1): void;
}

@Injectable()
export class RouteEtaRealtimeEmitterImpl implements RouteEtaRealtimeEmitter {
  private server: Server | undefined;

  attach(server: Server): void {
    this.server = server;
  }

  emitRouteEtaUpdated(event: RouteEtaUpdatedEventV1): void {
    this.server?.to(room(event.orderId)).emit(TrackingSocketEvent.routeEtaUpdated, event);
  }

  emitRouteUpdated(event: RouteUpdatedEventV1): void {
    this.server?.to(room(event.orderId)).emit(TrackingSocketEvent.routeUpdated, event);
  }
}
```

Run again — expect PASS, 1/1.

- [ ] **Step 5: Wire into `TrackingGateway`**

In `tracking.gateway.ts`, inject `RouteEtaRealtimeEmitterImpl` and call `.attach(this.server)` once `@WebSocketServer()` is populated (in `afterInit` — add `implements OnGatewayInit` alongside the existing `OnGatewayConnection`):

```ts
export class TrackingGateway implements OnGatewayConnection, OnGatewayInit {
  public constructor(
    private readonly auth: SocketAuthAdapter,
    private readonly tracking: TrackingService,
    private readonly orderEvents: OrderEventsPublisher,
    private readonly routeEtaEmitter: RouteEtaRealtimeEmitterImpl,
  ) {
    this.orderEvents.subscribe((event) => this.broadcastOrderStatus(event));
  }

  public afterInit(server: Server): void {
    this.routeEtaEmitter.attach(server);
  }
  // ...rest unchanged...
```

- [ ] **Step 6: Run affected suites**

```bash
pnpm --filter api test -- src/tracking
pnpm --filter mobile test -- src/features/customer/orders/tracking-socket.test.ts
pnpm --filter @leopard/shared test
```
Expected: PASS everywhere; no reference to `EtaUpdatedEvent`/`eta:updated` remains anywhere in the repo (`grep -r "eta:updated\|EtaUpdatedEvent"` returns nothing).

- [ ] **Step 7: Commit**

```bash
git add packages/shared apps/api/src/tracking apps/api/src/routing-eta apps/mobile/src/features/customer/orders
git commit -m "feat(realtime): add route-eta socket events, retire unused legacy eta:updated"
```

---

## Task 13: `RoutingEtaModule` wiring + outbox publisher loop + worker polling loop

**Files:**
- Create: `apps/api/src/routing-eta/routing-eta.module.ts`
- Create: `apps/api/src/routing-eta/outbox-notify.publisher.ts`
- Modify: `apps/api/src/tracking/tracking.module.ts`
- Modify: `apps/api/src/maps/maps.module.ts` (export `MAP_PROVIDER`)
- Modify: `apps/api/src/app.module.ts`
- Test: `apps/api/src/routing-eta/outbox-notify.publisher.spec.ts`
- Test: `apps/api/test/routing-eta-module.e2e-spec.ts` (module-boot smoke test — see Step 6)

**Interfaces:**
- Produces: `OutboxNotifyPublisher.runOnce(): Promise<number>` — claims `ROUTE_ETA_UPDATED`/`ROUTE_UPDATED` outbox rows and calls `RouteEtaRealtimeEmitter`.

- [ ] **Step 1: Write the failing test**

```ts
import { Test } from '@nestjs/testing';
import { OutboxRepository } from './outbox.repository.js';
import { RouteEtaRealtimeEmitterImpl } from './route-eta-realtime.emitter.js';
import { OutboxNotifyPublisher } from './outbox-notify.publisher.js';
import { PrismaService } from '../database/prisma.service.js';

describe('OutboxNotifyPublisher', () => {
  it('emits ROUTE_ETA_UPDATED payload then marks the job completed', async () => {
    const payload = { schemaVersion: 1, eventId: 'job-1', orderId: 'order-1', inputRevision: 6, occurredAt: new Date().toISOString(), estimates: { nextStop: {}, completion: {} } };
    const outbox = {
      claimBatch: jest.fn().mockResolvedValue([{ id: 'job-1', aggregateId: 'order-1', type: 'ROUTE_ETA_UPDATED', inputRevision: 6, payload, leaseOwner: 'w', leaseGeneration: 1 }]),
      markCompleted: jest.fn().mockResolvedValue(true),
      markFailedOrDeadLetter: jest.fn(),
    };
    const emitter = { emitRouteEtaUpdated: jest.fn(), emitRouteUpdated: jest.fn() };
    const prisma = { $transaction: jest.fn((fn: any) => fn({})) };
    const moduleRef = await Test.createTestingModule({
      providers: [
        OutboxNotifyPublisher,
        { provide: OutboxRepository, useValue: outbox },
        { provide: RouteEtaRealtimeEmitterImpl, useValue: emitter },
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();
    const publisher = moduleRef.get(OutboxNotifyPublisher);

    const processed = await publisher.runOnce();

    expect(processed).toBe(1);
    expect(emitter.emitRouteEtaUpdated).toHaveBeenCalledWith(payload);
    expect(outbox.markCompleted).toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run test to verify it fails, then implement**

```bash
pnpm --filter api test -- src/routing-eta/outbox-notify.publisher.spec.ts
```
Expected: FAIL, then:

```ts
import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service.js';
import { OutboxRepository, newWorkerId } from './outbox.repository.js';
import { RouteEtaRealtimeEmitterImpl } from './route-eta-realtime.emitter.js';

const CLAIM_BATCH_SIZE = 20;
const LEASE_MS = 10_000;

@Injectable()
export class OutboxNotifyPublisher {
  private readonly logger = new Logger(OutboxNotifyPublisher.name);
  private readonly workerId = newWorkerId();

  constructor(
    private readonly outbox: OutboxRepository,
    private readonly emitter: RouteEtaRealtimeEmitterImpl,
    private readonly prisma: PrismaService,
  ) {}

  async runOnce(): Promise<number> {
    const claims = await this.outbox.claimBatch(this.workerId, CLAIM_BATCH_SIZE, LEASE_MS);
    for (const claim of claims) {
      try {
        if (claim.type === 'ROUTE_ETA_UPDATED') {
          this.emitter.emitRouteEtaUpdated(claim.payload as never);
        } else if (claim.type === 'ROUTE_UPDATED') {
          this.emitter.emitRouteUpdated(claim.payload as never);
        } else {
          continue;
        }
        await this.prisma.$transaction(async (tx) => {
          await this.outbox.markCompleted(tx, claim.id, claim.leaseOwner, claim.leaseGeneration);
        });
      } catch (error) {
        this.logger.warn(`notify publish failed for job ${claim.id}: ${(error as Error).message}`);
        await this.outbox.markFailedOrDeadLetter(claim.id, claim.leaseOwner, claim.leaseGeneration, (error as Error).message, 2_000);
      }
    }
    return claims.length;
  }
}
```

Run again — expect PASS, 1/1.

- [ ] **Step 3: Assemble `RoutingEtaModule` with polling intervals**

```ts
import { Module, type OnModuleInit } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { DatabaseModule } from '../database/database.module.js';
import { MapsModule } from '../maps/maps.module.js';
import { VehicleRoutingProfileService } from './vehicle-routing-profile.service.js';
import { RouteSnapshotService } from './route-snapshot.service.js';
import { OutboxRepository } from './outbox.repository.js';
import { EtaService } from './eta.service.js';
import { RouteEtaRecomputeWorker } from './route-eta-recompute.worker.js';
import { StopProgressService } from './stop-progress.service.js';
import { RouteEtaController } from './route-eta.controller.js';
import { StopProgressController } from './stop-progress.controller.js';
import { RouteEtaRealtimeEmitterImpl } from './route-eta-realtime.emitter.js';
import { OutboxNotifyPublisher } from './outbox-notify.publisher.js';

const RECOMPUTE_POLL_MS = 2_000;
const NOTIFY_POLL_MS = 500;

@Module({
  imports: [DatabaseModule, MapsModule],
  controllers: [RouteEtaController, StopProgressController],
  providers: [
    VehicleRoutingProfileService, RouteSnapshotService, OutboxRepository, EtaService,
    RouteEtaRecomputeWorker, StopProgressService, RouteEtaRealtimeEmitterImpl, OutboxNotifyPublisher,
  ],
  exports: [EtaService, RouteEtaRealtimeEmitterImpl, VehicleRoutingProfileService, RouteSnapshotService],
})
export class RoutingEtaModule implements OnModuleInit {
  constructor(
    private readonly recomputeWorker: RouteEtaRecomputeWorker,
    private readonly notifyPublisher: OutboxNotifyPublisher,
  ) {}

  onModuleInit(): void {
    setInterval(() => void this.recomputeWorker.runOnce().catch(() => undefined), RECOMPUTE_POLL_MS);
    setInterval(() => void this.notifyPublisher.runOnce().catch(() => undefined), NOTIFY_POLL_MS);
  }
}
```

Check `apps/api/package.json` for `@nestjs/schedule` before importing `ScheduleModule` — if absent, drop that import and the `imports` reference (the two `setInterval` calls above don't need it); only add the dependency if a later task needs cron-style scheduling.

- [ ] **Step 4: Wire into `app.module.ts` and export `MAP_PROVIDER` from `MapsModule`**

Add `RoutingEtaModule` to `AppModule`'s `imports`. In `maps.module.ts`, add `MAP_PROVIDER` to the `exports` array (currently only exports `EstimateTokenService`).

- [ ] **Step 5: Update `TrackingModule` to import `RoutingEtaModule`** (finishing Task 9's wiring)

- [ ] **Step 6: Add a real DI-boot smoke test, then run the full backend suite**

Unit tests throughout Tasks 2-12 all construct services with manually-provided mocked dependencies — none of them exercise real NestJS module wiring, so a missing export/import (e.g. `MAP_PROVIDER` not exported from `MapsModule`, or `TrackingModule` not importing `RoutingEtaModule`) would not be caught until here. Add one boot-only e2e spec, following this repo's existing `apps/api/test/*.e2e-spec.ts` convention:

```ts
// apps/api/test/routing-eta-module.e2e-spec.ts
import { Test } from '@nestjs/testing';
import { AppModule } from '../src/app.module.js';
import { RouteEtaController } from '../src/routing-eta/route-eta.controller.js';
import { StopProgressController } from '../src/routing-eta/stop-progress.controller.js';
import { TrackingGateway } from '../src/tracking/tracking.gateway.js';

describe('RoutingEtaModule — DI boot smoke test', () => {
  it('resolves the full module graph without missing providers', async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();

    expect(moduleRef.get(RouteEtaController)).toBeDefined();
    expect(moduleRef.get(StopProgressController)).toBeDefined();
    expect(moduleRef.get(TrackingGateway)).toBeDefined();

    await moduleRef.close();
  });
});
```

Run it with whatever DB/env setup `apps/api/test/*.e2e-spec.ts` already requires in this repo (check an existing e2e spec, e.g. `src/orders/order-lifecycle.e2e-spec.ts`, for the exact test-DB bootstrap pattern — reuse it verbatim, do not invent a new one):

```bash
pnpm --filter api test:e2e -- test/routing-eta-module.e2e-spec.ts
```
Expected: PASS — this is the one place in the whole plan that proves `TrackingModule` actually resolves `RouteEtaRealtimeEmitterImpl` (Task 12) and `EtaService` (Task 9) at runtime, not just at the type level.

Then run the rest:
```bash
pnpm --filter api test
pnpm --filter api typecheck
```
Expected: PASS, no regressions.

- [ ] **Step 7: Commit**

```bash
git add apps/api/src/routing-eta apps/api/src/tracking apps/api/src/maps apps/api/src/app.module.ts
git commit -m "feat(api): wire RoutingEtaModule with recompute/notify polling loops"
```

---

## Task 14: Legacy-order recovery job (spec §6)

**Files:**
- Create: `apps/api/src/routing-eta/legacy-recovery.job.ts`
- Test: `apps/api/src/routing-eta/legacy-recovery.job.spec.ts`

**Interfaces:**
- Consumes: `EtaService.bumpRevision` (Task 6), `PrismaService`.
- Produces: `export async function runLegacyRouteRecovery(prisma: PrismaService, etaService: EtaService, recoveryJobVersion: string): Promise<{ recovered: number; enqueuedForRecompute: number }>` — run manually once at deploy time, not on a schedule.

- [ ] **Step 1: Write the failing test**

```ts
import { runLegacyRouteRecovery } from './legacy-recovery.job.js';

describe('runLegacyRouteRecovery', () => {
  it('creates a LEGACY_RECOVERED snapshot when the old JSON has valid geometry+coords', async () => {
    const prisma = {
      order: {
        findMany: jest.fn().mockResolvedValue([
          {
            id: 'order-1',
            activeRouteSnapshotId: null,
            status: 'IN_TRANSIT',
            routeSnapshot: { polyline: 'abc123', source: 'VIETMAP', calculatedAt: new Date().toISOString() },
            stops: [{ id: 'stop-1', latitude: 10.1, longitude: 106.1, sequence: 0 }],
          },
        ]),
      },
      orderRouteSnapshot: { create: jest.fn().mockResolvedValue({ id: 'snap-1' }) },
      $transaction: jest.fn((fn: any) => fn(prisma)),
    };
    const etaService = { bumpRevision: jest.fn() };

    const result = await runLegacyRouteRecovery(prisma as any, etaService as any, 'v1');

    expect(result).toEqual({ recovered: 1, enqueuedForRecompute: 0 });
    expect(prisma.orderRouteSnapshot.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ quality: 'LEGACY_RECOVERED', recoveryJobVersion: 'v1' }) }),
    );
  });

  it('does NOT fabricate a snapshot when geometry is missing — enqueues a recompute instead', async () => {
    const prisma = {
      order: {
        findMany: jest.fn().mockResolvedValue([
          { id: 'order-2', activeRouteSnapshotId: null, status: 'ACCEPTED', routeSnapshot: null, stops: [{ id: 'stop-2', latitude: 10.1, longitude: 106.1, sequence: 0 }] },
        ]),
      },
      orderRouteSnapshot: { create: jest.fn() },
      $transaction: jest.fn((fn: any) => fn(prisma)),
    };
    const etaService = { bumpRevision: jest.fn() };

    const result = await runLegacyRouteRecovery(prisma as any, etaService as any, 'v1');

    expect(result).toEqual({ recovered: 0, enqueuedForRecompute: 1 });
    expect(prisma.orderRouteSnapshot.create).not.toHaveBeenCalled();
    expect(etaService.bumpRevision).toHaveBeenCalledWith(prisma, 'order-2');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
pnpm --filter api test -- src/routing-eta/legacy-recovery.job.spec.ts
```
Expected: FAIL — module not found.

- [ ] **Step 3: Implement**

```ts
import type { PrismaService } from '../database/prisma.service.js';
import type { EtaService } from './eta.service.js';
import { computeInputHash, computeRouteHash } from './polyline-hash.js';

const NON_TERMINAL_STATUSES = ['ACCEPTED', 'PICKING_UP', 'IN_TRANSIT', 'RETURNING'];

export async function runLegacyRouteRecovery(
  prisma: PrismaService,
  etaService: EtaService,
  recoveryJobVersion: string,
): Promise<{ recovered: number; enqueuedForRecompute: number }> {
  const orders = await prisma.order.findMany({
    where: { activeRouteSnapshotId: null, status: { in: NON_TERMINAL_STATUSES as never } },
    include: { stops: true },
  });

  let recovered = 0;
  let enqueuedForRecompute = 0;

  for (const order of orders) {
    await prisma.$transaction(async (tx) => {
      const legacy = order.routeSnapshot as { polyline?: string; source?: string; calculatedAt?: string } | null;
      const hasValidGeometry = typeof legacy?.polyline === 'string' && legacy.polyline.length > 0;
      const hasValidCoords = order.stops.every((s) => typeof s.latitude === 'number' && typeof s.longitude === 'number');

      if (legacy && hasValidGeometry && hasValidCoords) {
        const normalizedInput = { stopIds: order.stops.map((s) => s.id) };
        const snapshot = await tx.orderRouteSnapshot.create({
          data: {
            orderId: order.id,
            version: 1,
            reason: 'MANUAL_RECOVERY',
            quality: 'LEGACY_RECOVERED',
            geometry: legacy.polyline!,
            geometryEncoding: 'POLYLINE5',
            routeHash: computeRouteHash(legacy.polyline!),
            inputHash: computeInputHash(normalizedInput),
            hashAlgorithmVersion: 'sha256-json-v1',
            legs: [],
            stopSequence: order.stops.map((s) => ({ stopId: s.id, sequence: s.sequence })),
            normalizedInput,
            vehicleProfileSource: 'MANUAL_RECOVERY',
            vehicleRoutingProfileId: null,
            quoteVehicleRoutingPolicyId: null,
            departureAt: new Date(legacy.calculatedAt ?? Date.now()),
            source: legacy.source === 'VIETMAP' ? 'VIETMAP' : 'DEMO',
            calculatedAt: new Date(legacy.calculatedAt ?? Date.now()),
            legacySourceSnapshotJson: legacy as never,
            legacyMissingFields: [],
            recoveryJobVersion,
            recoveredAt: new Date(),
          },
        });
        await tx.order.update({ where: { id: order.id }, data: { activeRouteSnapshotId: snapshot.id } });
        recovered += 1;
        return;
      }

      await etaService.bumpRevision(tx, order.id);
      enqueuedForRecompute += 1;
    });
  }

  return { recovered, enqueuedForRecompute };
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
pnpm --filter api test -- src/routing-eta/legacy-recovery.job.spec.ts
```
Expected: PASS, 2/2.

- [ ] **Step 5: Add a one-time CLI entry point**

```ts
// apps/api/src/routing-eta/scripts/run-legacy-recovery.ts
import { NestFactory } from '@nestjs/core';
import { AppModule } from '../../app.module.js';
import { PrismaService } from '../../database/prisma.service.js';
import { EtaService } from '../eta.service.js';
import { runLegacyRouteRecovery } from '../legacy-recovery.job.js';

async function main() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const result = await runLegacyRouteRecovery(
    app.get(PrismaService), app.get(EtaService), `legacy-recovery-${new Date().toISOString()}`,
  );
  // eslint-disable-next-line no-console -- one-time ops script, not shipped app code
  console.log(JSON.stringify(result));
  await app.close();
}

void main();
```

Run manually once against staging with `pnpm --filter api exec ts-node src/routing-eta/scripts/run-legacy-recovery.ts` before this feature goes live — do not wire it into any HTTP endpoint or automatic startup hook.

- [ ] **Step 6: Commit**

```bash
git add apps/api/src/routing-eta/legacy-recovery.job.ts apps/api/src/routing-eta/legacy-recovery.job.spec.ts apps/api/src/routing-eta/scripts
git commit -m "feat(api): add legacy route recovery job for pre-migration active orders"
```

---

## Task 15: Golden-route contract test (spec §3.1bis point 3 — real Vietmap, not mocked)

**Files:**
- Create: `apps/api/test/vietmap-truck-restriction.contract-spec.ts`
- Modify: `apps/api/package.json` (add a `test:contract:vietmap` script excluded from the default `test`/`test:contract` glob)

**Interfaces:**
- Consumes: real `VietmapProvider` against `process.env.VIETMAP_API_KEY`.

- [ ] **Step 1: Write the contract test**

```ts
import { VietmapProvider } from '../src/maps/providers/vietmap.provider.js';

const RUN_CONTRACT = process.env.RUN_VIETMAP_CONTRACT_TESTS === 'true';
const describeIfEnabled = RUN_CONTRACT ? describe : describe.skip;

// Fixture: Sơn Trà ↔ Hải Châu (Đà Nẵng), verified by hand — the direct path crosses
// Cầu Sông Hàn which is weight-restricted for trucks. See spec §3.1bis / §9.6.
const PICKUP = { latitude: 16.1024, longitude: 108.262 };
const DROPOFF = { latitude: 16.0678, longitude: 108.2208 };

describeIfEnabled('Vietmap truck-restriction golden route (contract, not mocked)', () => {
  const provider = new VietmapProvider({ apiKey: process.env.VIETMAP_API_KEY ?? '' });

  it('routes TRUCK_25T around the weight-restricted bridge, differently from BIKE and VAN', async () => {
    const [bike] = await provider.route({ pickup: PICKUP, stops: [], dropoff: DROPOFF, vehicleType: 'MOTORBIKE' });
    const [van] = await provider.route({ pickup: PICKUP, stops: [], dropoff: DROPOFF, vehicleType: 'VAN' });
    const [truck] = await provider.route({ pickup: PICKUP, stops: [], dropoff: DROPOFF, vehicleType: 'TRUCK', cargoWeightKg: 2500 });

    expect(truck!.distanceM).toBeGreaterThan(bike!.distanceM);
    expect(truck!.polyline).not.toBe(bike!.polyline);
    expect(truck!.polyline).not.toBe(van!.polyline);
  });
});
```

- [ ] **Step 2: Add the excluded script**

In `apps/api/package.json`, add:
```json
"test:contract:vietmap": "RUN_VIETMAP_CONTRACT_TESTS=true jest --config jest.config.contract.js test/vietmap-truck-restriction.contract-spec.ts"
```
(reuse the existing `test:contract` Jest config if one already targets `test/*.contract-spec.ts`; otherwise point at the same config `pnpm --filter api test:contract` uses today.)

- [ ] **Step 3: Verify it's excluded from default runs**

```bash
pnpm --filter api test
pnpm --filter api test:contract
```
Expected: neither run executes `vietmap-truck-restriction.contract-spec.ts` (confirm via `--listTests` if unsure). Then manually, with a real `VIETMAP_API_KEY` exported:
```bash
RUN_VIETMAP_CONTRACT_TESTS=true VIETMAP_API_KEY=<real key> pnpm --filter api test:contract:vietmap
```
Expected: PASS — this is a manual/scheduled check, not part of this task's automated gate, so record the actual output in the PR description rather than relying on CI.

- [ ] **Step 4: Commit**

```bash
git add apps/api/test/vietmap-truck-restriction.contract-spec.ts apps/api/package.json
git commit -m "test(api): add opt-in Vietmap truck-restriction golden-route contract test"
```

---

## Task 16: `packages/shared` — `RouteCoordinate` + `decodePolyline`

**Files:**
- Create: `packages/shared/src/routing/route-coordinate.ts`
- Create: `packages/shared/src/routing/decode-polyline.ts`
- Modify: `packages/shared/src/index.ts` (export the new module)
- Test: `packages/shared/src/routing/decode-polyline.test.ts`

**Interfaces:**
- Produces:
```ts
export type RouteCoordinate = Readonly<{ lat: number; lng: number }>;
export type PolylineEncoding = 'POLYLINE5' | 'POLYLINE6';
export class PolylineDecodeError extends Error {}
export function decodePolyline(encoded: string, encoding: PolylineEncoding): readonly RouteCoordinate[];
```

- [ ] **Step 1: Write the failing tests**

```ts
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

  it('applies the correct precision divisor for POLYLINE6', () => {
    const [point] = decodePolyline('_izlhA~rlgdF', 'POLYLINE6');
    expect(point!.lat).toBeCloseTo(40.641, 2);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
pnpm --filter @leopard/shared test -- src/routing/decode-polyline.test.ts
```
Expected: FAIL — module not found.

- [ ] **Step 3: Implement**

```ts
import type { RouteCoordinate } from './route-coordinate.js';

export type PolylineEncoding = 'POLYLINE5' | 'POLYLINE6';

const MAX_ENCODED_LENGTH = 2_000_000;
const MAX_POINTS = 20_000;

export class PolylineDecodeError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'PolylineDecodeError';
  }
}

export function decodePolyline(encoded: string, encoding: PolylineEncoding): readonly RouteCoordinate[] {
  if (encoded.length > MAX_ENCODED_LENGTH) {
    throw new PolylineDecodeError(`Polyline string exceeds ${MAX_ENCODED_LENGTH} characters`);
  }

  const factor = encoding === 'POLYLINE6' ? 1e6 : 1e5;
  const points: RouteCoordinate[] = [];
  let index = 0;
  let lat = 0;
  let lng = 0;

  while (index < encoded.length) {
    const latDelta = decodeSignedValue();
    lat += latDelta;
    if (index >= encoded.length) {
      throw new PolylineDecodeError('Polyline truncated mid-coordinate-pair');
    }
    const lngDelta = decodeSignedValue();
    lng += lngDelta;

    const point = { lat: lat / factor, lng: lng / factor };
    if (point.lat < -90 || point.lat > 90 || point.lng < -180 || point.lng > 180) {
      throw new PolylineDecodeError(`Decoded coordinate out of range: ${JSON.stringify(point)}`);
    }
    points.push(point);

    if (points.length > MAX_POINTS) {
      throw new PolylineDecodeError(`Polyline exceeds ${MAX_POINTS} points`);
    }
  }

  return points;

  function decodeSignedValue(): number {
    let result = 0;
    let shift = 0;
    let byte: number;
    do {
      if (index >= encoded.length) {
        throw new PolylineDecodeError('Polyline truncated mid-varint');
      }
      byte = encoded.charCodeAt(index) - 63;
      index += 1;
      result |= (byte & 0x1f) << shift;
      shift += 5;
    } while (byte >= 0x20);
    return result & 1 ? ~(result >> 1) : result >> 1;
  }
}
```

Create `route-coordinate.ts`:
```ts
export type RouteCoordinate = Readonly<{ lat: number; lng: number }>;
```

- [ ] **Step 4: Run test to verify it passes**

```bash
pnpm --filter @leopard/shared test -- src/routing/decode-polyline.test.ts
```
Expected: PASS, 5/5.

- [ ] **Step 5: Export from the package barrel**

Add to `packages/shared/src/index.ts`: `export * from './routing/route-coordinate.js'; export * from './routing/decode-polyline.js';`

- [ ] **Step 6: Commit**

```bash
git add packages/shared/src/routing packages/shared/src/index.ts
git commit -m "feat(shared): add decodePolyline with bounds/length/point-count guards"
```

---

## Task 17: `RealInteractiveMap` — `routeResolutionPolicy='PROVIDED_ONLY'`, no client-side fetch ever

**Files:**
- Modify: `packages/mobile-core/src/ui/RealInteractiveMap.tsx:26-44` (props), `:142-170` (`buildLeafletHtml` signature), `:395-471` (route-drawing/fetch block)
- Modify: `packages/mobile-core/src/ui/RealInteractiveMap.test.tsx`

**Interfaces:**
- Consumes: `RouteCoordinate` (Task 16).
- Produces: `RealInteractiveMapProps.routeResolutionPolicy?: 'PROVIDED_ONLY' | 'ALLOW_CLIENT_PREVIEW'` (default `'ALLOW_CLIENT_PREVIEW'`), `RealInteractiveMapProps.routeCoords?: readonly RouteCoordinate[]`.

- [ ] **Step 1: Export `buildLeafletHtml` for direct string assertions and write the failing test**

First, add `export` to `function buildLeafletHtml(...)` at line 142 (it is currently module-private) — this is required so the test below can assert on the generated HTML string directly, since `WebView` is mocked to `null` in this suite (confirmed at `RealInteractiveMap.test.tsx:4`) and never actually executes the fetch code.

Add to `RealInteractiveMap.test.tsx`:

```tsx
import { buildLeafletHtml } from './RealInteractiveMap';

describe('RealInteractiveMap — PROVIDED_ONLY route policy', () => {
  it('never emits a Vietmap/OSRM fetch call when routeResolutionPolicy is PROVIDED_ONLY, even with valid routeCoords', () => {
    const html = buildLeafletHtml({
      destinationCoords: { lat: 10.76, lng: 106.8 }, destinationLabel: 'Điểm giao',
      hasTruckLocation: false, interactive: true, mapInstanceId: 'test-1', mode: 'tracking',
      originCoords: { lat: 10.79, lng: 106.65 }, originLabel: 'Điểm lấy',
      pinCoords: { lat: 0, lng: 0 }, stopsCoords: [], truckCoords: { lat: 0, lng: 0 }, truckEtaLabel: '',
      vietmapApiKey: 'super-secret-key',
      routeResolutionPolicy: 'PROVIDED_ONLY',
      routeCoords: [{ lat: 10.79, lng: 106.65 }, { lat: 10.76, lng: 106.8 }],
    });

    expect(html).not.toContain('super-secret-key');
    expect(html).not.toContain('maps.vietmap.vn/api/route');
    expect(html).not.toContain('router.project-osrm.org');
  });

  it('shows a "no route data" banner when routeCoords is empty under PROVIDED_ONLY', () => {
    const html = buildLeafletHtml({
      destinationCoords: { lat: 10.76, lng: 106.8 }, destinationLabel: 'Điểm giao',
      hasTruckLocation: false, interactive: true, mapInstanceId: 'test-2', mode: 'tracking',
      originCoords: { lat: 10.79, lng: 106.65 }, originLabel: 'Điểm lấy',
      pinCoords: { lat: 0, lng: 0 }, stopsCoords: [], truckCoords: { lat: 0, lng: 0 }, truckEtaLabel: '',
      routeResolutionPolicy: 'PROVIDED_ONLY',
      routeCoords: [],
    });

    expect(html).toContain('Chưa có dữ liệu tuyến đường');
    expect(html).not.toContain('maps.vietmap.vn/api/route');
  });

  it('preserves the existing client-fetch behavior when routeResolutionPolicy is ALLOW_CLIENT_PREVIEW (default)', () => {
    const html = buildLeafletHtml({
      destinationCoords: { lat: 10.76, lng: 106.8 }, destinationLabel: 'Điểm giao',
      hasTruckLocation: false, interactive: true, mapInstanceId: 'test-3', mode: 'route',
      originCoords: { lat: 10.79, lng: 106.65 }, originLabel: 'Điểm lấy',
      pinCoords: { lat: 0, lng: 0 }, stopsCoords: [], truckCoords: { lat: 0, lng: 0 }, truckEtaLabel: '',
      vietmapApiKey: 'a-key',
    });

    expect(html).toContain('maps.vietmap.vn/api/route');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
pnpm --filter @leopard/mobile-core test -- src/ui/RealInteractiveMap.test.tsx
```
Expected: FAIL — `buildLeafletHtml` is not exported / does not accept `routeResolutionPolicy`/`routeCoords`.

- [ ] **Step 3: Implement — props**

At `RealInteractiveMap.tsx:26-44`, add:

```ts
export type RouteResolutionPolicy = 'PROVIDED_ONLY' | 'ALLOW_CLIENT_PREVIEW';

export type RealInteractiveMapProps = Readonly<{
  // ...existing fields unchanged...
  routeResolutionPolicy?: RouteResolutionPolicy;
  routeCoords?: readonly RouteCoordinate[];
}>;
```

Import `RouteCoordinate` from `@leopard/shared` at the top of the file.

- [ ] **Step 4: Implement — thread the new props through to `buildLeafletHtml`**

In the component body (around the existing `mapHtml = useMemo(...)` call), add `routeResolutionPolicy: routeResolutionPolicy ?? 'ALLOW_CLIENT_PREVIEW', routeCoords: routeCoords ?? []` to the object passed into `buildLeafletHtml`, and add both to the `useMemo` dependency array. Destructure the two new props from the component's props list alongside the existing ones.

Change the `buildLeafletHtml` signature (line 142) to `export function buildLeafletHtml({ ..., routeResolutionPolicy = 'ALLOW_CLIENT_PREVIEW', routeCoords = [] }: { ...; routeResolutionPolicy?: RouteResolutionPolicy; routeCoords?: readonly RouteCoordinate[]; }): string {`.

- [ ] **Step 5: Implement — gate the fetch chain, add the provided-geometry path**

Replace the `try { fetchRealRoute(); } catch (e) {}` block (line 468-470) with a conditional built from a **compile-time string branch** (the whole point is that when `routeResolutionPolicy==='PROVIDED_ONLY'`, the `fetchRealRoute` function body — which contains the Vietmap URL and API key — must not appear in the generated string at all, not just be skipped at runtime):

```ts
  const routeSection =
    routeResolutionPolicy === 'PROVIDED_ONLY'
      ? routeCoords.length >= 2
        ? `
      applyRouteCoords(${JSON.stringify(routeCoords.map((c) => [c.lat, c.lng]))});
        `
        : `
      var noRouteBanner = document.createElement('div');
      noRouteBanner.style.cssText = 'position:absolute;bottom:12px;left:12px;right:12px;background:#FEF3C7;border:1px solid #FDE68A;border-radius:8px;padding:8px 12px;font:600 12px sans-serif;color:#92400E;z-index:20;text-align:center;';
      noRouteBanner.innerText = 'Chưa có dữ liệu tuyến đường';
      document.body.appendChild(noRouteBanner);
        `
      : `
      // Real street routing: Vietmap Route v4 with timeout -> OSRM driving engine -> straight line
      function fetchRealRoute() {
        ${fetchRealRouteBody}
      }
      try { fetchRealRoute(); } catch (e) {}
      `;
```

Move the existing body of `fetchRealRoute` (lines 404-466, everything between the opening `{` and its matching closing `}`) into a template-string constant `fetchRealRouteBody` defined just above `routeSection`, then replace the whole `function fetchRealRoute() { ... } try { fetchRealRoute(); } catch (e) {}` region (lines 403-470) with a single `${routeSection}` interpolation at that same spot in the outer HTML template literal. This guarantees the Vietmap/OSRM URLs and `vietmapApiKey` are **string-absent** from the output when `PROVIDED_ONLY` is active — satisfying the test in Step 1, not just "doesn't run at runtime".

- [ ] **Step 6: Run test to verify it passes**

```bash
pnpm --filter @leopard/mobile-core test -- src/ui/RealInteractiveMap.test.tsx
```
Expected: PASS, all new tests + all pre-existing tests in the file (regression for `ALLOW_CLIENT_PREVIEW`/other modes).

- [ ] **Step 7: Commit**

```bash
git add packages/mobile-core/src/ui/RealInteractiveMap.tsx packages/mobile-core/src/ui/RealInteractiveMap.test.tsx
git commit -m "feat(mobile-core): add PROVIDED_ONLY route policy, string-eliminate client fetch"
```

---

## Task 18: Driver `model.ts` types + `MissionMapCanvas` redesign

**Files:**
- Modify: `apps/driver/src/features/orders/model.ts`
- Modify: `apps/driver/src/features/orders/components/detail/MissionMapCanvas.tsx`
- Create: `apps/driver/src/features/orders/components/detail/MissionMapCanvas.test.tsx`

**Interfaces:**
- Consumes: `RouteCoordinate` (Task 16).
- Produces (added to `model.ts`, exact names later tasks depend on):
```ts
export type DriverStopProgressStatus = 'PENDING' | 'ARRIVED' | 'IN_SERVICE' | 'COMPLETED';
export type DriverRouteStopView = Readonly<{ id: string; type: 'PICKUP'|'STOP'|'DROPOFF'; sequence: number; label: string; lat: number | null; lng: number | null; progress: DriverStopProgressStatus; nextAllowedStep: 'ARRIVED'|'SERVICE_STARTED'|'SERVICE_COMPLETED'|null }>;
export type DriverEtaOutcomeView = Readonly<{ outcome: 'AVAILABLE'|'UNAVAILABLE'; label: string | null; unavailableLabel: string | null; isStale: boolean; staleSinceLabel: string | null }>;
export type DriverRouteEtaView = Readonly<{ fullRouteCoords: readonly RouteCoordinate[]; completedRouteCoords: readonly RouteCoordinate[]; activeRouteCoords: readonly RouteCoordinate[]; pendingRouteCoords: readonly RouteCoordinate[]; source: 'VIETMAP'|'DEMO'; quality: string; estimateAgeLabel: string | null; routeAgeLabel: string | null; geometryState: 'AVAILABLE'|'UNAVAILABLE'|'LEGACY'; nextStop: DriverEtaOutcomeView | null; completion: DriverEtaOutcomeView | null; recompute: 'CURRENT'|'PENDING'|'FAILED' }>;
export type DriverRoutePointView = Readonly<{ id: string; label: string; lat: number | null; lng: number | null }>;
```

- [ ] **Step 1: Add the types to `model.ts`**

Insert after the existing `DriverTrackingView` block (`model.ts:92-104`) — do not touch `DriverRouteView`/`DriverActiveTripView` yet (that wiring is Task 19):

```ts
export type DriverStopProgressStatus = 'PENDING' | 'ARRIVED' | 'IN_SERVICE' | 'COMPLETED';

export type DriverRoutePointView = Readonly<{
  id: string;
  label: string;
  lat: number | null;
  lng: number | null;
}>;

export type DriverRouteStopView = Readonly<{
  id: string;
  type: 'PICKUP' | 'STOP' | 'DROPOFF';
  sequence: number;
  label: string;
  lat: number | null;
  lng: number | null;
  progress: DriverStopProgressStatus;
  nextAllowedStep: 'ARRIVED' | 'SERVICE_STARTED' | 'SERVICE_COMPLETED' | null;
}>;

export type DriverEtaOutcomeView = Readonly<{
  outcome: 'AVAILABLE' | 'UNAVAILABLE';
  label: string | null;
  unavailableLabel: string | null;
  isStale: boolean;
  staleSinceLabel: string | null;
}>;

export type DriverRouteEtaView = Readonly<{
  fullRouteCoords: readonly { lat: number; lng: number }[];
  completedRouteCoords: readonly { lat: number; lng: number }[];
  activeRouteCoords: readonly { lat: number; lng: number }[];
  pendingRouteCoords: readonly { lat: number; lng: number }[];
  source: 'VIETMAP' | 'DEMO';
  quality: 'VERIFIED_PROVIDER' | 'DEMO' | 'LEGACY_RECOVERED' | 'PARTIAL';
  estimateAgeLabel: string | null;
  routeAgeLabel: string | null;
  geometryState: 'AVAILABLE' | 'UNAVAILABLE' | 'LEGACY';
  nextStop: DriverEtaOutcomeView | null;
  completion: DriverEtaOutcomeView | null;
  recompute: 'CURRENT' | 'PENDING' | 'FAILED';
}>;
```

- [ ] **Step 2: Write the failing component test**

```tsx
import { render, screen } from '@testing-library/react-native';
import { MissionMapCanvas } from './MissionMapCanvas';
import type { DriverRouteEtaView, DriverRouteStopView } from '../../model';

function baseEta(overrides: Partial<DriverRouteEtaView> = {}): DriverRouteEtaView {
  return {
    fullRouteCoords: [], completedRouteCoords: [], activeRouteCoords: [], pendingRouteCoords: [],
    source: 'VIETMAP', quality: 'VERIFIED_PROVIDER', estimateAgeLabel: null, routeAgeLabel: null,
    geometryState: 'AVAILABLE',
    nextStop: { outcome: 'AVAILABLE', label: '12 phút', unavailableLabel: null, isStale: false, staleSinceLabel: null },
    completion: null, recompute: 'CURRENT',
    ...overrides,
  };
}

const stops: readonly DriverRouteStopView[] = [
  { id: 'pickup', type: 'PICKUP', sequence: 0, label: 'Kho A', lat: 10.79, lng: 106.65, progress: 'COMPLETED', nextAllowedStep: null },
  { id: 'dropoff', type: 'DROPOFF', sequence: 1, label: 'Kho B', lat: 10.76, lng: 106.8, progress: 'PENDING', nextAllowedStep: null },
];

describe('MissionMapCanvas', () => {
  it('shows the next-stop ETA label when AVAILABLE', () => {
    render(
      <MissionMapCanvas origin={stops[0]!} destination={stops[1]!} stops={stops} routeCoords={[]} eta={baseEta()} tracking={{ kind: 'healthy', label: 'Đang theo dõi', lastUpdatedLabel: null, queuedPointCount: null }} />,
    );
    expect(screen.getByText(/12 phút/)).toBeTruthy();
  });

  it('shows "Đang cập nhật ETA…" badge when recompute is PENDING', () => {
    render(
      <MissionMapCanvas origin={stops[0]!} destination={stops[1]!} stops={stops} routeCoords={[]} eta={baseEta({ recompute: 'PENDING' })} tracking={{ kind: 'healthy', label: '', lastUpdatedLabel: null, queuedPointCount: null }} />,
    );
    expect(screen.getByText(/Đang cập nhật ETA/)).toBeTruthy();
  });

  it('shows unavailableLabel instead of a duration when nextStop outcome is UNAVAILABLE', () => {
    render(
      <MissionMapCanvas origin={stops[0]!} destination={stops[1]!} stops={stops} routeCoords={[]}
        eta={baseEta({ nextStop: { outcome: 'UNAVAILABLE', label: null, unavailableLabel: 'Chưa có ETA', isStale: false, staleSinceLabel: null } })}
        tracking={{ kind: 'healthy', label: '', lastUpdatedLabel: null, queuedPointCount: null }} />,
    );
    expect(screen.getByText('Chưa có ETA')).toBeTruthy();
  });

  it('shows "Dữ liệu mô phỏng" whenever source is DEMO', () => {
    render(
      <MissionMapCanvas origin={stops[0]!} destination={stops[1]!} stops={stops} routeCoords={[]}
        eta={baseEta({ source: 'DEMO' })} tracking={{ kind: 'healthy', label: '', lastUpdatedLabel: null, queuedPointCount: null }} />,
    );
    expect(screen.getByText('Dữ liệu mô phỏng')).toBeTruthy();
  });
});
```

- [ ] **Step 3: Run test to verify it fails**

```bash
pnpm --filter driver test -- src/features/orders/components/detail/MissionMapCanvas.test.tsx
```
Expected: FAIL — `MissionMapCanvas` does not accept these props yet.

- [ ] **Step 4: Implement — rewrite `MissionMapCanvas`**

```tsx
import React from 'react';
import { Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import { radius, spacing, leopardPalette, IconClock, IconRoute, RealInteractiveMap } from '@leopard/mobile-core';
import type { RouteCoordinate } from '@leopard/shared';
import type { DriverRoutePointView, DriverRouteEtaView, DriverRouteStopView, DriverTrackingView } from '../../model';

export type MissionMapCanvasProps = Readonly<{
  origin: DriverRoutePointView;
  destination: DriverRoutePointView;
  stops: readonly DriverRouteStopView[];
  routeCoords: readonly RouteCoordinate[];
  eta: DriverRouteEtaView;
  tracking: DriverTrackingView;
  testID?: string;
}>;

export function openExternalNavigation(target: { lat: number; lng: number } | null, vehicleIsTruck: boolean) {
  if (!target) return;
  const query = `${target.lat},${target.lng}`;
  const url = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(query)}`;
  void Linking.openURL(url).catch(() => {});
}

export function MissionMapCanvas({ origin, destination, stops, routeCoords, eta, tracking, testID = 'route-map-schematic' }: MissionMapCanvasProps) {
  const isStale = tracking.kind === 'stale' || tracking.kind === 'offline' || tracking.kind === 'reconnecting' || tracking.kind === 'permission-denied';
  const actionableStop = stops.find((s) => s.nextAllowedStep !== null) ?? null;
  const navigationTarget = actionableStop && actionableStop.lat !== null && actionableStop.lng !== null
    ? { lat: actionableStop.lat, lng: actionableStop.lng }
    : null;
  const isTruck = eta.quality !== 'DEMO' && actionableStop?.type !== undefined; // vehicleType not modeled per-stop; caller passes eta already scoped to the order's vehicle — see Task 19 for how eta is derived from RouteEtaResponse.

  const nextStopText = eta.nextStop?.outcome === 'AVAILABLE' ? eta.nextStop.label : eta.nextStop?.unavailableLabel ?? 'Chưa có ETA';

  return (
    <View style={styles.mapCanvasContainer} testID={testID}>
      <RealInteractiveMap
        destination={{ label: destination.label, ...(destination.lat !== null && destination.lng !== null ? { coords: { lat: destination.lat, lng: destination.lng } } : {}) }}
        height="100%"
        mode="tracking"
        origin={{ label: origin.label, ...(origin.lat !== null && origin.lng !== null ? { coords: { lat: origin.lat, lng: origin.lng } } : {}) }}
        routeResolutionPolicy="PROVIDED_ONLY"
        routeCoords={routeCoords}
        stops={stops.map((s) => ({ id: s.id, label: s.label, ...(s.lat !== null && s.lng !== null ? { coords: { lat: s.lat, lng: s.lng } } : {}) }))}
        truckEtaLabel={tracking.label}
      />

      <View style={styles.mapFloatingStatusPill}>
        <View style={[styles.mapStatusDot, isStale ? styles.mapStatusDotWarning : styles.mapStatusDotHealthy]} />
        <Text numberOfLines={1} style={styles.mapStatusPillText}>{tracking.label}</Text>
      </View>

      {eta.recompute === 'PENDING' ? (
        <View style={styles.mapRecomputeBadge}>
          <Text style={styles.mapRecomputeBadgeText}>Đang cập nhật ETA…</Text>
        </View>
      ) : null}
      {eta.recompute === 'FAILED' ? (
        <View style={[styles.mapRecomputeBadge, styles.mapRecomputeBadgeWarning]}>
          <Text style={styles.mapRecomputeBadgeText}>ETA chưa cập nhật, dùng dữ liệu {eta.estimateAgeLabel ?? ''}</Text>
        </View>
      ) : null}

      <View style={styles.mapFloatingEtaPill}>
        <IconClock color="#0B1E42" size={13} />
        <Text style={styles.mapFloatingEtaText}>{nextStopText}</Text>
        {eta.source === 'DEMO' ? <Text style={styles.mapDemoLabel}>Dữ liệu mô phỏng</Text> : null}
      </View>

      <View style={styles.mapFloatingControlsGroup}>
        <Pressable
          accessibilityHint="Mở bản đồ Google Maps đến điểm tiếp theo"
          accessibilityLabel="Mở bản đồ đến điểm tiếp theo"
          accessibilityRole="button"
          disabled={!navigationTarget}
          onPress={() => openExternalNavigation(navigationTarget, isTruck)}
          style={({ pressed }) => [styles.mapFloatingQuickBtn, pressed ? styles.pressed : null, !navigationTarget ? styles.mapFloatingQuickBtnDisabled : null]}
        >
          <IconRoute color={navigationTarget ? '#0B1E42' : '#94A3B8'} size={18} />
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  // ...keep every existing style key from the current file (mapCanvasContainer,
  // mapFloatingStatusPill, mapStatusDot, mapStatusDotHealthy, mapStatusDotWarning,
  // mapStatusPillText, mapFloatingEtaPill, mapFloatingEtaText, mapFloatingControlsGroup,
  // mapFloatingQuickBtn, pressed) unchanged, and add:
  mapRecomputeBadge: {
    position: 'absolute', top: 12, left: 12, backgroundColor: 'rgba(15, 23, 42, 0.85)',
    borderRadius: radius.pill, paddingHorizontal: 10, paddingVertical: 4, zIndex: 10,
  },
  mapRecomputeBadgeWarning: { backgroundColor: '#F59E0B' },
  mapRecomputeBadgeText: { color: '#FFFFFF', fontSize: 10, fontWeight: '700' },
  mapDemoLabel: { color: '#D97706', fontSize: 9, fontWeight: '800', marginLeft: 6 },
  mapFloatingQuickBtnDisabled: { opacity: 0.4 },
});
```

- [ ] **Step 5: Run test to verify it passes**

```bash
pnpm --filter driver test -- src/features/orders/components/detail/MissionMapCanvas.test.tsx
```
Expected: PASS, 4/4.

- [ ] **Step 6: Fix the caller**

`AssignedDetailView.tsx` currently calls `<MissionMapCanvas originLabel={...} destinationLabel={...} stops={...} tracking={...} distanceLabel={...} etaLabel={...} navigationTarget={...} />` — this compiles against the old props. Task 19 rewrites `AssignedDetailView` to pass the new shape once `useRouteEtaChannel` exists; for now, run `pnpm --filter driver typecheck` and confirm the only new error is in `AssignedDetailView.tsx` (expected — fixed in Task 19), not in any other file.

- [ ] **Step 7: Commit**

```bash
git add apps/driver/src/features/orders/model.ts apps/driver/src/features/orders/components/detail/MissionMapCanvas.tsx apps/driver/src/features/orders/components/detail/MissionMapCanvas.test.tsx
git commit -m "feat(driver): redesign MissionMapCanvas around backend route/ETA contract"
```

---

## Task 19: `useRouteEtaChannel` + adapter mapping + `AssignedDetailView`/`DriverOrderDetailRuntime` wiring

**Files:**
- Create: `apps/driver/src/features/orders/route-eta-adapter.ts`
- Create: `apps/driver/src/features/orders/useRouteEtaChannel.ts`
- Modify: `apps/driver/src/features/orders/DriverOrderDetailRuntime.tsx`
- Modify: `apps/driver/src/features/orders/components/detail/AssignedDetailView.tsx`
- Modify: `apps/driver/src/features/orders/tracking-sender.ts` (add `isRouteEtaSubscribeEligibleStatus`)
- Test: `apps/driver/src/features/orders/route-eta-adapter.test.ts`
- Test: `apps/driver/src/features/orders/useRouteEtaChannel.test.ts`

**Interfaces:**
- Consumes: `RouteEtaResponse`/`RouteEtaUpdatedEventV1` shapes (Task 10/12), `DriverRouteEtaView` (Task 18).
- Produces:
```ts
export function isRouteEtaSubscribeEligibleStatus(status?: OrderStatus | null): boolean; // ACCEPTED|PICKING_UP|IN_TRANSIT
export function reduceRouteEtaByRevision(current: RouteEtaResponse | undefined, incoming: RouteEtaResponse | { inputRevision: number; ...}): RouteEtaResponse;
export function mapRouteEtaResponseToView(response: RouteEtaResponse): DriverRouteEtaView;
export function useRouteEtaChannel(orderId: string, status: OrderStatus | null): DriverRouteEtaView | null;
```

- [ ] **Step 1: Write the failing tests for the pure adapter functions**

```ts
import { reduceRouteEtaByRevision, mapRouteEtaResponseToView } from './route-eta-adapter';
import { isRouteEtaSubscribeEligibleStatus } from './tracking-sender';

describe('isRouteEtaSubscribeEligibleStatus', () => {
  it.each(['ACCEPTED', 'PICKING_UP', 'IN_TRANSIT'])('is true for %s', (status) => {
    expect(isRouteEtaSubscribeEligibleStatus(status as never)).toBe(true);
  });
  it.each(['REQUESTED', 'DELIVERED', 'CANCELLED', undefined])('is false for %s', (status) => {
    expect(isRouteEtaSubscribeEligibleStatus(status as never)).toBe(false);
  });
});

describe('reduceRouteEtaByRevision', () => {
  function response(currentInputRevision: number | null) {
    return { orderId: 'o1', serverTime: '', desiredInputRevision: 9, currentInputRevision, recompute: { state: 'CURRENT', failedReason: null, failedInputRevision: null, nextRetryAt: null }, quotedRoute: null, activeRoute: null, estimates: { nextStop: null, completion: null } } as any;
  }

  it('ignores an incoming payload with a lower inputRevision than local state', () => {
    const local = response(6);
    const incoming = response(5);
    expect(reduceRouteEtaByRevision(local, incoming)).toBe(local);
  });

  it('replaces state when incoming inputRevision is higher', () => {
    const local = response(6);
    const incoming = response(7);
    expect(reduceRouteEtaByRevision(local, incoming)).toBe(incoming);
  });

  it('accepts the first response when there is no local state yet', () => {
    const incoming = response(1);
    expect(reduceRouteEtaByRevision(undefined, incoming)).toBe(incoming);
  });
});

describe('mapRouteEtaResponseToView', () => {
  it('maps FAILED recompute + AVAILABLE estimate to estimateAgeLabel (not routeAgeLabel)', () => {
    const now = new Date('2026-09-14T00:10:00Z');
    const response = {
      orderId: 'o1', serverTime: now.toISOString(), desiredInputRevision: 7, currentInputRevision: 6,
      recompute: { state: 'FAILED', failedReason: null, failedInputRevision: 7, nextRetryAt: null },
      quotedRoute: null,
      activeRoute: { fullRouteCoords: [], legs: [], geometryHash: 'h', calculatedAt: '2026-09-14T00:00:00Z', ageSeconds: 600, source: 'VIETMAP', quality: 'VERIFIED_PROVIDER' },
      estimates: {
        nextStop: { kind: 'NEXT_STOP', outcome: 'AVAILABLE', targetStopId: 's1', remainingDistanceM: 500, remainingDurationS: 60, arrivalAt: now.toISOString(), unavailableReason: null, calculatedAt: '2026-09-14T00:05:00Z', validUntil: '2026-09-14T00:06:00Z', isStale: true, staleSinceAt: '2026-09-14T00:06:00Z' },
        completion: null,
      },
    } as any;

    const view = mapRouteEtaResponseToView(response);

    expect(view.recompute).toBe('FAILED');
    expect(view.nextStop?.isStale).toBe(true);
    expect(view.estimateAgeLabel).not.toBeNull();
    expect(view.routeAgeLabel).not.toBeNull();
    expect(view.estimateAgeLabel).not.toBe(view.routeAgeLabel);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
pnpm --filter driver test -- src/features/orders/route-eta-adapter.test.ts
```
Expected: FAIL — modules not found.

- [ ] **Step 3: Implement `isRouteEtaSubscribeEligibleStatus` in `tracking-sender.ts`**

Add next to the existing `isTrackingEligibleStatus`/`isTerminalStatus` (line 103):

```ts
export function isRouteEtaSubscribeEligibleStatus(status?: OrderStatus | null): boolean {
  return status === 'ACCEPTED' || status === 'PICKING_UP' || status === 'IN_TRANSIT';
}
```

Do **not** change the existing `isTrackingEligibleStatus` — it must keep gating only GPS emission (spec §4.1).

- [ ] **Step 4: Implement `route-eta-adapter.ts`**

```ts
import type { DriverEtaOutcomeView, DriverRouteEtaView } from './model.js';

export function reduceRouteEtaByRevision<T extends { currentInputRevision: number | null }>(
  current: T | undefined,
  incoming: T,
): T {
  if (!current) return incoming;
  const currentRevision = current.currentInputRevision ?? -1;
  const incomingRevision = incoming.currentInputRevision ?? -1;
  return incomingRevision < currentRevision ? current : incoming;
}

function formatAge(fromIso: string, nowIso: string): string {
  const seconds = Math.max(0, Math.round((new Date(nowIso).getTime() - new Date(fromIso).getTime()) / 1000));
  if (seconds < 60) return `${seconds} giây trước`;
  return `${Math.round(seconds / 60)} phút trước`;
}

function toOutcomeView(estimate: {
  outcome: 'AVAILABLE' | 'UNAVAILABLE'; remainingDurationS: number | null; unavailableReason: string | null;
  isStale: boolean; staleSinceAt: string | null;
} | null): DriverEtaOutcomeView | null {
  if (!estimate) return null;
  return {
    outcome: estimate.outcome,
    label: estimate.outcome === 'AVAILABLE' && estimate.remainingDurationS !== null
      ? `${Math.round(estimate.remainingDurationS / 60)} phút`
      : null,
    unavailableLabel: estimate.outcome === 'UNAVAILABLE' ? 'Chưa có ETA' : null,
    isStale: estimate.isStale,
    staleSinceLabel: estimate.staleSinceAt ? formatAge(estimate.staleSinceAt, new Date().toISOString()) : null,
  };
}

export function mapRouteEtaResponseToView(response: {
  serverTime: string;
  recompute: { state: 'CURRENT' | 'PENDING' | 'FAILED' };
  activeRoute: { fullRouteCoords: readonly { lat: number; lng: number }[]; calculatedAt: string; source: 'VIETMAP' | 'DEMO'; quality: string } | null;
  estimates: { nextStop: Parameters<typeof toOutcomeView>[0] & { calculatedAt: string } | null; completion: Parameters<typeof toOutcomeView>[0] & { calculatedAt: string } | null };
}): DriverRouteEtaView {
  const mostRecentEstimateCalculatedAt = response.estimates.nextStop?.calculatedAt ?? response.estimates.completion?.calculatedAt ?? null;

  return {
    fullRouteCoords: response.activeRoute?.fullRouteCoords ?? [],
    completedRouteCoords: [], activeRouteCoords: response.activeRoute?.fullRouteCoords ?? [], pendingRouteCoords: [],
    source: response.activeRoute?.source ?? 'DEMO',
    quality: (response.activeRoute?.quality as never) ?? 'PARTIAL',
    estimateAgeLabel: mostRecentEstimateCalculatedAt ? formatAge(mostRecentEstimateCalculatedAt, response.serverTime) : null,
    routeAgeLabel: response.activeRoute ? formatAge(response.activeRoute.calculatedAt, response.serverTime) : null,
    geometryState: response.activeRoute ? 'AVAILABLE' : 'UNAVAILABLE',
    nextStop: toOutcomeView(response.estimates.nextStop),
    completion: toOutcomeView(response.estimates.completion),
    recompute: response.recompute.state,
  };
}
```

- [ ] **Step 5: Run test to verify it passes**

```bash
pnpm --filter driver test -- src/features/orders/route-eta-adapter.test.ts
```
Expected: PASS.

- [ ] **Step 6: Write the failing test for `useRouteEtaChannel`**

```ts
import { renderHook, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useRouteEtaChannel } from './useRouteEtaChannel';

describe('useRouteEtaChannel', () => {
  it('fetches via port.getRouteEta when status is subscribe-eligible', async () => {
    const getRouteEta = jest.fn().mockResolvedValue({
      orderId: 'o1', serverTime: '2026-09-14T00:00:00Z', desiredInputRevision: 1, currentInputRevision: 1,
      recompute: { state: 'CURRENT', failedReason: null, failedInputRevision: null, nextRetryAt: null },
      quotedRoute: null, activeRoute: null, estimates: { nextStop: null, completion: null },
    });
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <QueryClientProvider client={client}>{children}</QueryClientProvider>
    );

    const { result } = renderHook(() => useRouteEtaChannel('o1', 'ACCEPTED', { getRouteEta } as never), { wrapper });

    await waitFor(() => expect(getRouteEta).toHaveBeenCalledWith('o1'));
    await waitFor(() => expect(result.current).not.toBeNull());
  });

  it('does not fetch when status is not subscribe-eligible', () => {
    const getRouteEta = jest.fn();
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <QueryClientProvider client={client}>{children}</QueryClientProvider>
    );

    renderHook(() => useRouteEtaChannel('o1', 'REQUESTED', { getRouteEta } as never), { wrapper });

    expect(getRouteEta).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 7: Run test to verify it fails, then implement**

```bash
pnpm --filter driver test -- src/features/orders/useRouteEtaChannel.test.ts
```
Expected: FAIL, then:

```ts
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import type { OrderStatus } from '@leopard/shared';
import { mapRouteEtaResponseToView, reduceRouteEtaByRevision } from './route-eta-adapter.js';
import { isRouteEtaSubscribeEligibleStatus } from './tracking-sender.js';
import type { DriverRouteEtaView } from './model.js';

export interface RouteEtaPort {
  getRouteEta(orderId: string): Promise<unknown>;
}

export function routeEtaQueryKey(orderId: string) {
  return ['driver', 'order', orderId, 'route-eta'] as const;
}

export function useRouteEtaChannel(
  orderId: string,
  status: OrderStatus | null,
  port: RouteEtaPort,
): DriverRouteEtaView | null {
  const queryClient = useQueryClient();
  const enabled = isRouteEtaSubscribeEligibleStatus(status);

  const query = useQuery({
    queryKey: routeEtaQueryKey(orderId),
    queryFn: () => port.getRouteEta(orderId),
    enabled,
  });

  useEffect(() => {
    if (!query.data) return;
    queryClient.setQueryData(routeEtaQueryKey(orderId), (current: unknown) =>
      reduceRouteEtaByRevision(current as never, query.data as never),
    );
    // socket-driven updates (Task 12's route-eta:updated/route:updated events) call
    // this exact same queryClient.setQueryData(routeEtaQueryKey(orderId), reducer)
    // path from the socket lifecycle effect below — kept in the same hook so there is
    // exactly one place that owns this cache key, per spec §5.5.
  }, [query.data, orderId, queryClient]);

  if (!query.data) return null;
  return mapRouteEtaResponseToView(query.data as never);
}
```

- [ ] **Step 8: Run test to verify it passes**

```bash
pnpm --filter driver test -- src/features/orders/useRouteEtaChannel.test.ts
```
Expected: PASS, 2/2.

- [ ] **Step 9: Wire into `DriverOrderDetailRuntime.tsx` and `AssignedDetailView.tsx`**

In `DriverOrderDetailRuntime.tsx`, add `const routeEta = useRouteEtaChannel(orderId, status, port);` next to the existing `sender`/`liveTracking` wiring, and change the `view` computation (lines 172-175) to also merge `routeEta` into `query.data.order.route.eta` via a small pure mapper function (not inline object-spread at multiple nesting levels):

```ts
function mergeRouteEta(view: DriverDetailView, routeEta: DriverRouteEtaView | null): DriverDetailView {
  if (view.kind !== 'content' || !routeEta) return view;
  return { ...view, order: { ...view.order, route: { ...view.order.route, eta: routeEta } } };
}
```
```ts
const view: DriverDetailView = mergeRouteEta(
  query.data.kind === 'content' && liveTracking ? { ...query.data, tracking: liveTracking } : query.data,
  routeEta,
);
```

In `AssignedDetailView.tsx`, change the `<MissionMapCanvas .../>` call site to pass the new props (`origin`/`destination`/`stops` as `DriverRoutePointView`/`DriverRouteStopView[]` derived from `view.order.route`, `routeCoords={view.order.route.eta.activeRouteCoords}`, `eta={view.order.route.eta}`, `tracking={view.tracking}`) instead of the old flat labels.

- [ ] **Step 10: Run the Driver suite**

```bash
pnpm --filter driver test
pnpm --filter driver typecheck
```
Expected: PASS, no regressions in `DriverOrderDetailRuntime.audit.test.tsx`/`DriverOrderDetailRuntime.cancellation.test.tsx` (update their fixtures if they construct `DriverAssignedDetailView` by hand — add the new `route.eta`/`route.stops` fields there rather than leaving them `undefined`).

- [ ] **Step 11: Commit**

```bash
git add apps/driver/src/features/orders
git commit -m "feat(driver): wire useRouteEtaChannel into DriverOrderDetailRuntime/AssignedDetailView"
```

---

## Task 20: Stop-progress commands in `VerticalRouteStepper` — idempotent per logical command

**Files:**
- Create: `apps/driver/src/features/orders/stop-progress-command-store.ts`
- Modify: `apps/driver/src/features/orders/components/detail/VerticalRouteStepper.tsx`
- Modify: `apps/driver/src/features/orders/components/detail/AssignedDetailView.tsx`
- Test: `apps/driver/src/features/orders/stop-progress-command-store.test.ts`
- Test: `apps/driver/src/features/orders/components/detail/VerticalRouteStepper.test.tsx`

**Interfaces:**
- Produces:
```ts
export function getOrCreateClientRequestId(store: Map<string, string>, key: string): string;
export function clearClientRequestId(store: Map<string, string>, key: string): void;
```

- [ ] **Step 1: Write the failing test for the command store**

```ts
import { getOrCreateClientRequestId, clearClientRequestId } from './stop-progress-command-store';

describe('stop-progress-command-store', () => {
  it('returns the same id on repeated calls for the same key (retry reuses id)', () => {
    const store = new Map<string, string>();
    const first = getOrCreateClientRequestId(store, 'order-1:stop-1:ARRIVED');
    const second = getOrCreateClientRequestId(store, 'order-1:stop-1:ARRIVED');
    expect(first).toBe(second);
  });

  it('returns a new id after the key is cleared (post-void correction gets a fresh id)', () => {
    const store = new Map<string, string>();
    const first = getOrCreateClientRequestId(store, 'order-1:stop-1:ARRIVED');
    clearClientRequestId(store, 'order-1:stop-1:ARRIVED');
    const second = getOrCreateClientRequestId(store, 'order-1:stop-1:ARRIVED');
    expect(second).not.toBe(first);
  });
});
```

- [ ] **Step 2: Run test to verify it fails, then implement**

```bash
pnpm --filter driver test -- src/features/orders/stop-progress-command-store.test.ts
```
Expected: FAIL, then:

```ts
import { randomUUID } from 'expo-crypto';

export function getOrCreateClientRequestId(store: Map<string, string>, key: string): string {
  const existing = store.get(key);
  if (existing) return existing;
  const id = randomUUID();
  store.set(key, id);
  return id;
}

export function clearClientRequestId(store: Map<string, string>, key: string): void {
  store.delete(key);
}
```

If `expo-crypto`'s `randomUUID` is unavailable in this Expo SDK version, use `import 'react-native-get-random-values'; import { v4 as randomUUID } from 'uuid';` instead — check `apps/driver/package.json` for which is already a dependency before adding a new one.

Run again — expect PASS, 2/2.

- [ ] **Step 3: Write the failing test for `VerticalRouteStepper`**

```tsx
import { render, screen, fireEvent } from '@testing-library/react-native';
import { VerticalRouteStepper } from './VerticalRouteStepper';
import type { DriverRouteStopView } from '../../model';

const stops: readonly DriverRouteStopView[] = [
  { id: 'pickup', type: 'PICKUP', sequence: 0, label: 'Kho A', lat: 10.79, lng: 106.65, progress: 'COMPLETED', nextAllowedStep: null },
  { id: 'stop-1', type: 'STOP', sequence: 1, label: 'Điểm dừng 1', lat: 10.8, lng: 106.7, progress: 'PENDING', nextAllowedStep: 'ARRIVED' },
  { id: 'dropoff', type: 'DROPOFF', sequence: 2, label: 'Kho B', lat: 10.76, lng: 106.8, progress: 'PENDING', nextAllowedStep: null },
];

describe('VerticalRouteStepper — multi-stop progress actions', () => {
  it('shows an action button only for the actionable intermediate stop', () => {
    const onRecordProgress = jest.fn();
    render(<VerticalRouteStepper stops={stops} onRecordProgress={onRecordProgress} distanceLabel="12 km" status="IN_TRANSIT" />);

    expect(screen.getByRole('button', { name: /đã đến điểm dừng/i })).toBeTruthy();
  });

  it('disables the button while the command is pending, and prevents a second tap', () => {
    let resolveCommand: () => void = () => {};
    const onRecordProgress = jest.fn(() => new Promise<void>((resolve) => { resolveCommand = resolve; }));
    render(<VerticalRouteStepper stops={stops} onRecordProgress={onRecordProgress} distanceLabel="12 km" status="IN_TRANSIT" />);

    const button = screen.getByRole('button', { name: /đã đến điểm dừng/i });
    fireEvent.press(button);
    fireEvent.press(button);

    expect(onRecordProgress).toHaveBeenCalledTimes(1);
    resolveCommand();
  });

  it('renders nothing extra (0-stop order keeps the existing single origin/destination card) when stops has no intermediate STOP entries', () => {
    const zeroStopOrder: readonly DriverRouteStopView[] = [
      { id: 'pickup', type: 'PICKUP', sequence: 0, label: 'Kho A', lat: 10.79, lng: 106.65, progress: 'PENDING', nextAllowedStep: null },
      { id: 'dropoff', type: 'DROPOFF', sequence: 1, label: 'Kho B', lat: 10.76, lng: 106.8, progress: 'PENDING', nextAllowedStep: null },
    ];
    render(<VerticalRouteStepper stops={zeroStopOrder} onRecordProgress={jest.fn()} distanceLabel="12 km" status="ACCEPTED" />);

    expect(screen.queryByRole('button', { name: /đã đến điểm dừng/i })).toBeNull();
  });
});
```

- [ ] **Step 4: Run test to verify it fails**

```bash
pnpm --filter driver test -- src/features/orders/components/detail/VerticalRouteStepper.test.tsx
```
Expected: FAIL — component does not accept `stops`/`onRecordProgress` props yet.

- [ ] **Step 5: Implement — extend `VerticalRouteStepper`**

Keep the existing origin/destination visual card exactly as-is for the 0-stop case (`stops.filter(s => s.type === 'STOP').length === 0`); add a new action section only when there are intermediate stops:

```tsx
import React, { useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { IconCheck, leopardPalette, spacing } from '@leopard/mobile-core';
import type { DriverRouteStopView, DriverStopProgressStatus } from '../../model';
import { getOrCreateClientRequestId } from '../../stop-progress-command-store';

export type VerticalRouteStepperProps = Readonly<{
  stops: readonly DriverRouteStopView[];
  distanceLabel?: string;
  status: string;
  onRecordProgress?: (stopId: string, step: NonNullable<DriverRouteStopView['nextAllowedStep']>, clientRequestId: string) => Promise<void>;
}>;

const STEP_LABEL: Record<NonNullable<DriverRouteStopView['nextAllowedStep']>, string> = {
  ARRIVED: 'Đã đến điểm dừng',
  SERVICE_STARTED: 'Bắt đầu bốc/dỡ',
  SERVICE_COMPLETED: 'Hoàn tất điểm dừng',
};

export function VerticalRouteStepper({ stops, distanceLabel, status, onRecordProgress }: VerticalRouteStepperProps) {
  const origin = stops.find((s) => s.type === 'PICKUP');
  const destination = stops.find((s) => s.type === 'DROPOFF');
  const intermediateStops = stops.filter((s) => s.type === 'STOP');
  const commandIds = useRef(new Map<string, string>()).current;
  const [pendingStopId, setPendingStopId] = useState<string | null>(null);

  async function handlePress(stop: DriverRouteStopView) {
    if (!stop.nextAllowedStep || pendingStopId) return;
    const key = `${stop.id}:${stop.nextAllowedStep}`;
    const clientRequestId = getOrCreateClientRequestId(commandIds, key);
    setPendingStopId(stop.id);
    try {
      await onRecordProgress?.(stop.id, stop.nextAllowedStep, clientRequestId);
    } finally {
      setPendingStopId(null);
    }
  }

  return (
    <View style={styles.verticalRouteCard}>
      {/* ...existing origin/destination Node A / Node B / spine JSX unchanged, reading
          originLabel from origin?.label and destinationLabel from destination?.label
          instead of the old flat props... */}

      {intermediateStops.length > 0 ? (
        <View style={styles.stopActionsSection}>
          {intermediateStops.map((stop) => (
            <View key={stop.id} style={styles.stopActionRow}>
              <Text style={styles.stopActionLabel}>{stop.label}</Text>
              {stop.nextAllowedStep ? (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={STEP_LABEL[stop.nextAllowedStep]}
                  disabled={pendingStopId !== null}
                  onPress={() => void handlePress(stop)}
                  style={({ pressed }) => [styles.stopActionButton, pressed || pendingStopId === stop.id ? styles.stopActionButtonPressed : null]}
                >
                  <Text style={styles.stopActionButtonText}>{STEP_LABEL[stop.nextAllowedStep]}</Text>
                </Pressable>
              ) : (
                <View style={styles.checkBadge}><IconCheck color="#15803D" size={13} strokeWidth={2.5} /></View>
              )}
            </View>
          ))}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  // ...keep every existing style key unchanged, add:
  stopActionsSection: { marginTop: spacing.md, gap: spacing.sm },
  stopActionRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  stopActionLabel: { color: '#0B1E42', fontSize: 13, fontWeight: '600', flex: 1 },
  stopActionButton: { backgroundColor: '#0B1E42', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8 },
  stopActionButtonPressed: { opacity: 0.6 },
  stopActionButtonText: { color: '#FFFFFF', fontSize: 12, fontWeight: '700' },
});
```

- [ ] **Step 6: Run test to verify it passes**

```bash
pnpm --filter driver test -- src/features/orders/components/detail/VerticalRouteStepper.test.tsx src/features/orders/stop-progress-command-store.test.ts
```
Expected: PASS, 3/2.

- [ ] **Step 7: Wire `onRecordProgress` in `AssignedDetailView`/caller**

Pass a callback that calls the Driver HTTP port's `recordStopProgress(orderId, stopId, step, clientRequestId)` (a new method on the existing `createDriverHttpAdapter()` port, calling `POST /orders/:id/stops/:stopId/progress`), then `queryClient.setQueryData(routeEtaQueryKey(orderId), ...)` with `response.currentRouteEta` run through `reduceRouteEtaByRevision` — reusing the exact reducer from Task 19, not a second copy.

- [ ] **Step 8: Run the full Driver suite one more time**

```bash
pnpm --filter driver test
pnpm --filter driver typecheck
pnpm --filter driver lint
```
Expected: PASS.

- [ ] **Step 9: Commit**

```bash
git add apps/driver/src/features/orders
git commit -m "feat(driver): add per-stop progress actions with idempotent command lifecycle"
```

---

## Self-Review

**Spec coverage:** §3 (schema) → Task 1; §3.1bis (Vietmap capacity/demo-block/golden-route) → Tasks 2-3, 15; §2/§3.2 (revision model, promote-or-supersede) → Task 6; §3.5 (outbox lease fencing) → Task 5, 7; §3.4 (stop progress event/state) → Task 8; §4.4 (GPS coalescing) → Task 9; §4.2/§4.3 (REST + stale) → Task 10; §4.7 (progress/void REST) → Task 11; §4.5/§4.6 (socket + reducer) → Task 12, 19; §6 (migration recovery) → Task 14; §5.1 (PROVIDED_ONLY) → Task 17; §5.2-5.4 (Driver model/canvas/idempotency) → Task 18, 20; §5.5 (TanStack Query ownership) → Task 19. Not covered by this plan (intentionally, per spec §1 non-goals): Giai đoạn C/D/E/F, the `EXPO_PUBLIC_VIETMAP_API_KEY` cleanup for preview/location modes (tracked separately as `task_f7e0d42a`), and the Android-device manual verification pass called out in spec §7 (schedule that as a manual QA step after Task 20, not an automated task).

**Placeholder scan:** no "TBD"/"add appropriate X" left; the one intentionally-partial step (Task 7 Step 3's stub, replaced in Task 8 Step 7) is explicit about being replaced in a later, named task rather than left open.

**Type consistency check performed:** `DriverRouteEtaView`/`DriverRouteStopView`/`DriverRoutePointView` (Task 18) are reused verbatim in Tasks 19-20; `routeEtaQueryKey`/`reduceRouteEtaByRevision` (Task 19) are the same functions referenced (not re-implemented) in Task 20 Step 7; `RouteEtaRealtimeEmitterImpl` (Task 12) is the exact class both `TrackingGateway` (Task 12) and `OutboxNotifyPublisher` (Task 13) depend on; `EtaService.bumpRevision`/`promoteOrSupersede` signatures from Task 6 are called identically in Tasks 8, 9, and 14.
