# LEOPARD Wave 3A Execution Plan

> **For agentic workers:** Execute task-by-task with TDD. Do not edit controlled surfaces unless assigned as Contract/Data/Integration Owner.

**Goal:** Implement PH-08 Realtime Tracking and PH-09 Media/Payment on a shared Wave 3 integration baseline.  
**Context:** `docs/superpowers/specs/2026-08-09-wave-3-delivery-design.md`, PH-08/PH-09 plans, FR-05/FR-07/FR-08, AC-04/AC-06.  
**Constraints:** Wave 2 remediation is deferred by explicit decision; Wave 3 must not silently mark it complete. Backend owns authorization, transaction, idempotency and provider orchestration.  
**Done when:** All tasks below are verified, no P0/P1 remains in Wave 3A scope, and the Wave 3A integration gate exits 0.

## 1. Baseline and Branch Setup

- [ ] Integration Owner records exact `develop` commit SHA used for Wave 3.
- [ ] Create `codex/integration-wave-3` from that SHA in a clean worktree.
- [ ] Confirm unrelated dirty files are not copied into the worktree.
- [ ] Record deferred Wave 2 findings without changing them to complete.
- [ ] Run current API test/typecheck/lint/build baseline and record known failures separately from Wave 3 regressions.

## 2. Task W3A-T00: Contract, Data and Dependency Preflight

**Owner:** Contract/Data/Integration Owner  
**Blocks:** Every PH-08/PH-09 feature task that consumes a changed contract or schema

**Files:**

- `packages/shared/src/**`
- `apps/api/openapi/openapi.yaml`
- `docs/api/01-rest-api-spec.md`
- `docs/api/02-socket-events.md`
- `docs/api/03-error-codes.md`
- `docs/data/01-database-design.md`
- `apps/api/prisma/schema.prisma`
- One new forward migration under `apps/api/prisma/migrations/**`
- `apps/api/package.json`, lockfile and provider env schema

**RED:**

- [ ] Extend contract tests to require TrackingPoint page/query definitions.
- [ ] Add contract tests for payment create idempotency request and QR fields.
- [ ] Add schema tests for tracking accuracy, media idempotency/checksum and payment idempotency/reference/confirmation fields.
- [ ] Add configuration tests for Socket/storage/payment provider selection and secret redaction.
- [ ] Run tests and record expected failures.

**GREEN:**

- [ ] Publish shared Socket event/ack DTOs.
- [ ] Replace tracking status-event REST schema with point-history pagination schema.
- [ ] Add Wave 3 stable error codes.
- [ ] Add `TrackingPoint.accuracyM`.
- [ ] Add Media checksum/request-id fields and unique rule.
- [ ] Make initial `PaymentIntent.provider` nullable while `UNPAID`.
- [ ] Add payment request/reference/confirmation fields and indexes.
- [ ] Preserve partial unique active payment intent index.
- [ ] Normalize existing `UNPAID` payment records that incorrectly use Map source as Payment provider.
- [ ] Pin Socket.IO, streaming upload, S3 and test dependencies.
- [ ] Update `.env.example` names without committing real credentials.

**VERIFY:**

- [ ] Clean migration on disposable PostgreSQL/PostGIS database.
- [ ] Upgrade migration from current Wave 2 schema.
- [ ] Prisma generate and API typecheck.
- [ ] OpenAPI contract tests.
- [ ] `git diff --check`.

**Commit:** `feat(platform): publish wave 3 contracts and data baseline`

## 3. PH-08 Realtime Tracking Lane

### Task PH-08-T01: Tracking Policy and Validation

**Owner:** Tracking Domain Owner  
**Depends on:** W3A-T00 shared DTO/error contract

**Files:**

- Create `apps/api/src/tracking/tracking.policy.ts`
- Create `apps/api/src/tracking/tracking-point.schema.ts`
- Create `apps/api/src/tracking/tracking-rate-limiter.ts`
- Create corresponding unit specs

**RED:**

- [ ] Table-test every role and order state.
- [ ] Test Customer owner/non-owner.
- [ ] Test assigned/unassigned Driver.
- [ ] Test active/inactive/wrong-fleet Owner membership.
- [ ] Test Admin view but no send.
- [ ] Test lat/lng, accuracy, UUID and captured-time bounds.
- [ ] Test per-Driver rate limit and recovery after window expiry.

**GREEN:**

- [ ] Implement pure `assertCanSend` and `assertCanView` policies.
- [ ] Implement schema validation with stable error details.
- [ ] Implement bounded in-memory limiter keyed by Driver/order.
- [ ] Do not trust actor/order/room data supplied by client.

**VERIFY:**

- [ ] Policy/state tests pass with critical branch coverage at 100%.
- [ ] No database/network dependency in unit suite.

**Commit:** `feat(tracking): define point and access policies`

### Task PH-08-T02: Persistence and History API

**Owner:** Tracking Persistence Owner  
**Depends on:** PH-08-T01, W3A-T00 migration

**Files:**

- Create `tracking.module.ts`, `tracking.service.ts`, `tracking.repository.ts`, `tracking.controller.ts`, response mapper
- Create tracking integration/E2E specs
- Do not edit `app.module.ts`; Integration Owner wires it later

**RED:**

- [ ] Test PostGIS point persistence and coordinate readback.
- [ ] Test duplicate `clientPointId` same/different payload.
- [ ] Test Driver last-known location update in same transaction.
- [ ] Test rollback leaves no point or last-known update.
- [ ] Test UTC ordering, `from/to`, pagination and max page size.
- [ ] Test owner/assigned/fleet/admin view matrix and foreign-resource non-disclosure.

**GREEN:**

- [ ] Implement `recordPoint(actor, orderId, input)`.
- [ ] Lock/read order assignment and active status in transaction.
- [ ] Insert geography point through parameterized query.
- [ ] Update DriverProfile atomically.
- [ ] Implement authorized history query with stable page envelope.

**VERIFY:**

- [ ] Unit/integration/E2E and contract tests pass.
- [ ] Query plan uses tracking order/time index at seed volume.

**Commit:** `feat(tracking): persist and query order positions`

### Task PH-08-T03: Socket Authentication, Rooms and Events

**Owner:** Realtime Owner  
**Depends on:** PH-08-T02

**Files:**

- Create `tracking.gateway.ts`, `socket-auth.adapter.ts`, `tracking.events.ts`
- Create `session-authenticator.ts` or extract reusable auth service through Integration Owner
- Create in-process Socket.IO integration spec

**RED:**

- [ ] Reject missing, invalid, expired and revoked handshake tokens.
- [ ] Test database role/status is authoritative.
- [ ] Test authorized join and cross-order denial.
- [ ] Test idempotent leave.
- [ ] Test invalid/rate-limited event returns ack error without disconnect.
- [ ] Test point is visible in database before subscriber event.
- [ ] Test no event reaches unauthorized room/client.

**GREEN:**

- [ ] Implement namespace `/tracking` and rooms `order:<uuid>`.
- [ ] Delegate all access decisions to TrackingService/policy.
- [ ] Persist point before broadcast.
- [ ] Emit deterministic `eventId` and `occurredAt`.
- [ ] Emit `session:error` for session expiry and require REST refresh/reconnect.

**VERIFY:**

- [ ] Real in-process Socket.IO suite passes repeatedly.
- [ ] Open handles are closed and test process exits cleanly.

**Commit:** `feat(tracking): add authenticated order rooms`

### Task PH-08-T04: Order Event Integration and Tracking Gate

**Owner:** Integration Owner + Tracking Test Owner  
**Depends on:** PH-08-T03

**Files:**

- Add `OrderEventsPublisher` port/adapter
- Modify Order status integration only through Integration Owner
- Create tracking latency and authorization matrix tests

**RED/GREEN:**

- [ ] Prove rollback emits no status event.
- [ ] Prove committed transition emits exactly one event.
- [ ] Send 100 local point events and measure persistence-to-receive latency.
- [ ] Assert p95 below 3 seconds.
- [ ] Assert zero leaked events across Customer/Driver/Fleet/Admin matrix.
- [ ] Verify duplicate point does not produce inconsistent duplicate state.

**VERIFY:**

- [ ] API full gate plus repeated tracking suite pass.

**Commit:** `test(tracking): verify realtime latency and isolation`

## 4. PH-09 Media Lane

### Task PH-09-T01: Storage Provider and Streaming Upload Policy

**Owner:** Media Provider Owner  
**Depends on:** W3A-T00 dependency/config contract

**Files:**

- Create `apps/api/src/media/providers/storage-provider.ts`
- Create local and S3-compatible adapters
- Create `upload-policy.ts`
- Create provider/policy unit tests

**RED:**

- [ ] JPEG/PNG/WebP magic-byte fixtures.
- [ ] Extension/MIME mismatch, polyglot header, empty file and >10 MB stream.
- [ ] Path traversal and unsafe filename.
- [ ] Local temp-file cleanup and atomic rename.
- [ ] S3 private object options and signed URL expiry with mocked client.
- [ ] Provider errors redact bucket, key credentials and signed query values.

**GREEN:**

- [ ] Implement stream-based byte limit, hashing and prefix validation.
- [ ] Implement deterministic private storage key.
- [ ] Implement `put`, `createReadUrl`, `delete` provider interface.
- [ ] Do not buffer full file and do not call real S3.

**VERIFY:**

- [ ] Unit tests and memory-bound streaming test pass.

**Commit:** `feat(media): add secure storage provider boundary`

### Task PH-09-T02: Media REST and Delivery Proof

**Owner:** Media Application Owner  
**Depends on:** PH-09-T01, Order access query port

**Files:**

- Create `media.module.ts`, `media.controller.ts`, `media.service.ts`, `media.repository.ts`
- Create media E2E tests
- Integration Owner owns AppModule and DeliveryProofReader wiring

**RED:**

- [ ] Customer own/foreign cargo upload.
- [ ] Assigned/unassigned Driver proof upload.
- [ ] Unauthorized signed URL access.
- [ ] Same request ID idempotency and mismatched duplicate conflict.
- [ ] Storage success + DB failure triggers compensating delete.
- [ ] Storage failure creates no metadata.
- [ ] Persisted proof enables DELIVERED; failed/orphan upload does not.

**GREEN:**

- [ ] Authorize before consuming full stream.
- [ ] Storage-first, metadata transaction, compensating delete.
- [ ] Persist checksum/content type/size/provider/storage key.
- [ ] Generate signed URL only after order-derived authorization.
- [ ] Implement single DeliveryProofReader binding.

**VERIFY:**

- [ ] Media E2E and Order lifecycle regression pass.
- [ ] Test storage directory/bucket mock has no orphan objects.

**Commit:** `feat(media): upload cargo and delivery evidence`

## 5. PH-09 Payment Lane

### Task PH-09-T03: Payment Provider Contracts

**Owner:** Payment Provider Owner  
**Depends on:** W3A-T00 config/shared contract  
**May run in parallel with:** PH-09-T01

**Files:**

- Create payment provider interface
- Create demo, payOS and VietQR adapters
- Create provider contract tests

**RED:**

- [ ] Deterministic demo QR and stable provider reference.
- [ ] Exact integer VND amount/reference.
- [ ] Five-second timeout and provider error mapping.
- [ ] Idempotency key propagation.
- [ ] No retry for non-idempotent call; at most one retry when provider contract guarantees same idempotency key.
- [ ] Secret/API response redaction.

**GREEN:**

- [ ] Implement provider adapters behind `PaymentProvider`.
- [ ] Do not implement automatic paid callback handling.
- [ ] Do not call real provider in tests.

**VERIFY:**

- [ ] Provider contract suite passes.

**Commit:** `feat(payment): add QR provider adapters`

### Task PH-09-T04: Payment Intent and Audited Confirmation

**Owner:** Payment Application Owner + Audit Owner  
**Depends on:** PH-09-T03, W3A-T00 migration

**Files:**

- Create payment module/controller/service/repository
- Create audit module/service/repository if not already published by Integration Owner
- Create payment E2E and rollback tests

**RED:**

- [ ] Customer owner/Admin create; other roles/foreign owner denied.
- [ ] Amount always equals persisted order price.
- [ ] Same create request ID returns same intent.
- [ ] Different key with active intent returns conflict.
- [ ] Concurrent create leaves one active intent.
- [ ] Provider failure becomes FAILED and never PAID.
- [ ] Customer/Fleet Owner/Admin payment-history permissions.
- [ ] Admin-only confirmation, note 5-500, self-consistent response.
- [ ] Duplicate confirmation is idempotent.
- [ ] Confirmation and AuditLog commit/rollback together.

**GREEN:**

- [ ] Implement payment state transitions and active-intent policy.
- [ ] Never trust client amount.
- [ ] Keep provider call outside long database transaction with reserved idempotent intent.
- [ ] Append sanitized audit via `AuditService.append(input, tx)`.
- [ ] Do not infer paid from QR creation.

**VERIFY:**

- [ ] Payment E2E, real-DB concurrency and rollback tests pass.

**Commit:** `feat(payment): add QR and audited manual confirmation`

### Task PH-09-T05: Media and Payment Gate

**Owner:** Security/Test Owner  
**Depends on:** PH-09-T02, PH-09-T04

- [ ] Add full media/payment role and ownership matrix.
- [ ] Test malicious upload corpus and exact 10 MB boundary.
- [ ] Test provider timeout/failure/redaction.
- [ ] Test duplicate upload/payment/confirmation requests.
- [ ] Test no public object and signed URL expiry.
- [ ] Test no orphan file/object after every failure path.
- [ ] Test every manual confirmation creates exactly one audit record.
- [ ] Run API full gate and contract tests.

**Commit:** `test(payment): verify media and payment boundaries`

## 6. Wave 3A Integration Gate

**Owner:** Integration Owner  
**Merge order:**

1. W3A-T00 contract/data/dependency baseline.
2. PH-08-T01.
3. PH-09-T01 and PH-09-T03 in either order.
4. PH-08-T02.
5. PH-09-T02 and PH-09-T04 after their dependencies.
6. PH-08-T03.
7. PH-08-T04 and PH-09-T05.
8. AppModule/cross-module wiring commit if not already isolated.

**Gate commands:**

```bash
pnpm --filter api test
pnpm --filter api test:e2e
pnpm --filter api test:contract
pnpm --filter api typecheck
pnpm --filter api lint
pnpm --filter api build
git diff --check
```

Additional gates:

- [ ] Clean and upgrade migration.
- [ ] Deterministic seed twice.
- [ ] Real PostGIS tracking suite.
- [ ] Real payment/idempotency transaction suite.
- [ ] In-process Socket.IO suite.
- [ ] 100-event p95 tracking latency below 3 seconds.
- [ ] Secret scan and dependency audit.
- [ ] Independent correctness/security review has no P0/P1.
- [ ] Record verified Wave 3A baseline SHA before opening Wave 3B.
