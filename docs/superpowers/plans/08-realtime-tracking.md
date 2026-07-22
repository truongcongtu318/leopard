# Realtime Tracking Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement FR-05/AC-04 authenticated tracking ingestion, persistence, history and Socket.IO room broadcast.

**Architecture:** Socket gateway authenticates handshake and delegates policy/persistence to `TrackingService`. Point is committed before broadcast; REST history and realtime event share one response mapper.

**Tech Stack:** Socket.IO server/client 4.8.3, `@nestjs/platform-socket.io` 11.1.28, Prisma 7.8.0/PostGIS 3.5, Jest 30.0.5.

## Global Constraints

- Only assigned Driver sends points for active order.
- Customer owner, Fleet Owner of assigned Driver and Admin may join.
- Invalid/rate-limited point returns event error without disconnecting session.
- Target delivery to subscriber under 3 seconds in staging-like network.

---

### Task PH-08-T01: Tracking Policy and Validation

**Files:**
- Create: `apps/api/src/tracking/tracking.policy.ts`, `tracking-point.schema.ts`, `tracking-rate-limiter.ts`
- Test: `apps/api/src/tracking/tracking.policy.spec.ts`, `apps/api/src/tracking/tracking-point.schema.spec.ts`, `apps/api/src/tracking/tracking-rate-limiter.spec.ts`

**Interfaces:** `assertCanSend(actor:AuthenticatedActor,order:OrderAccessView): void`, `assertCanView(actor:AuthenticatedActor,order:OrderAccessView): void`, point `{orderId,clientPointId,latitude,longitude,accuracyM?,capturedAt}`.

- [ ] Table-test all role/ownership/membership combinations, coordinate/time bounds and configurable per-Driver rate limit.
- [ ] Implement pure policy plus limiter; return stable `TRACKING_FORBIDDEN`, `TRACKING_INVALID_POINT`, `TRACKING_RATE_LIMITED`.
- [ ] Run unit tests; expected full policy matrix pass.
- [ ] Commit `feat(tracking): define point and access policies`.

### Task PH-08-T02: Persistence and History API

**Files:**
- Create: `apps/api/src/tracking/tracking.module.ts`, `tracking.service.ts`, `tracking.repository.ts`, `tracking.controller.ts`
- Test: `apps/api/src/tracking/tracking.integration-spec.ts`

**Interfaces:** `recordPoint(actor,orderId,input): TrackingPointDto`; `GET /orders/:id/tracking?from&to&page&pageSize`.

- [ ] Test UTC ordering, PostGIS point persistence/index query, pagination and view policy isolation.
- [ ] Implement repository insert/query and update Driver last-known location after valid point.
- [ ] Run migration/integration/contract tests.
- [ ] Commit `feat(tracking): persist and query order positions`.

### Task PH-08-T03: Socket Authentication and Rooms

**Files:**
- Create: `apps/api/src/tracking/tracking.gateway.ts`, `socket-auth.adapter.ts`, `tracking.events.ts`
- Test: `apps/api/src/tracking/tracking.gateway-spec.ts`

**Interfaces:** namespace `/tracking`; client `tracking:join-order`, `tracking:leave-order`, `tracking:send-point`; server `tracking:point-updated`, `order:status-updated`, `session:error` exactly as `docs/api/02-socket-events.md`.

- [ ] Test invalid handshake rejection, authorized joins, cross-order denial, leave behavior, persist-before-broadcast and invalid event without disconnect.
- [ ] Implement rooms `order:<uuid>` and delegate all policy to services.
- [ ] Run real in-process Socket.IO integration suite.
- [ ] Commit `feat(tracking): add authenticated order rooms`.

### Task PH-08-T04: Tracking Gate and Latency Harness

**Files:**
- Create: `apps/api/test/tracking-latency.e2e-spec.ts`, `apps/api/test/tracking-authorization.matrix-spec.ts`
- Modify: `docs/api/02-socket-events.md` only for clarified implemented detail

**Interfaces:** Produces measurable event latency evidence and full actor matrix.

- [ ] Run 100 local events with seeded order and assert p95 persistence-to-receive below 3 seconds.
- [ ] Test Customer non-owner, unassigned Driver and wrong-fleet Owner denial.
- [ ] Run API full gate plus tracking E2E repeatedly; expected zero leaked events.
- [ ] Commit `test(tracking): verify realtime latency and isolation`.

## Phase Boundary Rules

- Do not broadcast before successful database commit.
- Do not trust room name or order ID without policy lookup.
- Do not add Redis adapter in pilot default; document it only as scale path.
