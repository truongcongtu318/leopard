# Order and Driver Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement FR-02/FR-03 and AC-02/AC-03 for order creation/query, lifecycle, Driver availability and race-safe acceptance.

**Architecture:** `OrdersModule` owns order aggregate/state machine; `DriversModule` owns availability and delegates assignment transaction to an application service. Route estimate is consumed through PH-07 interface.

**Tech Stack:** NestJS, Prisma/PostgreSQL transactions, Zod validators, Jest/Supertest.

## Global Constraints

- Valid lifecycle: REQUESTED -> ACCEPTED -> PICKING_UP -> IN_TRANSIT -> DELIVERED; cancellation rules follow business process.
- Customer only owns own orders; assigned Driver only mutates assigned active order.
- Accept order must guarantee one winner under concurrent requests.
- `DELIVERED` requires delivery proof from PH-09.

---

### Task PH-06-T01: Order State Machine

**Files:**
- Create: `apps/api/src/orders/domain/order-state-machine.ts`
- Test: `apps/api/src/orders/domain/order-state-machine.spec.ts`

**Interfaces:** Produces `assertOrderTransition(input:{from;to;actorRole;hasDeliveryProof;cancelReason?}): void`.

- [ ] Table-test every allowed transition and reject skips/reversals with `ORDER_INVALID_TRANSITION`; test Customer cancellation only from REQUESTED and Admin reason requirement.
- [ ] Observe failure, implement pure exhaustive state machine, run unit test and mutation-sensitive branch coverage.
- [ ] Expected: 100% branches for this pure state machine.
- [ ] Commit `feat(order): define delivery lifecycle state machine`.

### Task PH-06-T02: Create and Query Customer Orders

**Files:**
- Create: `apps/api/src/orders/orders.module.ts`, `orders.controller.ts`, `orders.service.ts`, `orders.repository.ts`
- Create: `apps/api/src/orders/dto/create-order.dto.ts`, `order-response.mapper.ts`
- Test: `apps/api/src/orders/customer-orders.e2e-spec.ts`
- Modify: OpenAPI and app module

**Interfaces:** `POST /orders`, `GET /orders`, `GET /orders/:id`; consumes `RouteEstimator.estimate(RouteInput)` from PH-07.

- [ ] Test 0–3 ordered stops, invalid coordinates/vehicle, route snapshot fields, pagination, own-order isolation and 404 non-disclosure for other Customer.
- [ ] Implement transaction creating order/stops/status history and snapshot fields; default payment `UNPAID`.
- [ ] Run E2E/OpenAPI contract tests.
- [ ] Commit `feat(order): create and query customer orders`.

### Task PH-06-T03: Driver Availability and Available Orders

**Files:**
- Create: `apps/api/src/drivers/drivers.module.ts`, `drivers.controller.ts`, `drivers.service.ts`, `drivers.repository.ts`
- Test: `apps/api/src/drivers/availability.e2e-spec.ts`
- Modify: OpenAPI

**Interfaces:** `PATCH /drivers/me/availability {availability}`, `GET /driver/orders/available`.

- [ ] Test Driver-only access, AVAILABLE/OFFLINE updates, BUSY derived from active assignment and available list limited to REQUESTED.
- [ ] Implement availability policy and paginated query; client cannot set BUSY directly.
- [ ] Run E2E and authorization tests.
- [ ] Commit `feat(driver): manage availability and order queue`.

### Task PH-06-T04: Race-Safe Order Acceptance

**Files:**
- Create: `apps/api/src/orders/accept-order.service.ts`
- Test: `apps/api/src/orders/accept-order.integration-spec.ts`
- Modify: order/driver controllers and OpenAPI

**Interfaces:** `POST /driver/orders/:id/accept` -> accepted order.

- [ ] Start two real DB transactions for two AVAILABLE Drivers accepting one order; assert exactly one 200 and one 409 `ORDER_ALREADY_ASSIGNED`.
- [ ] Test Driver with active order/Offline receives 409 without mutation.
- [ ] Implement conditional update and Driver BUSY update in one transaction with status history.
- [ ] Run integration test repeatedly (minimum 20 iterations); expected no double assignment.
- [ ] Commit `feat(order): make driver acceptance atomic`.

### Task PH-06-T05: Status Update and Cancellation

**Files:**
- Create: `apps/api/src/orders/update-order-status.service.ts`, `cancel-order.service.ts`
- Test: `apps/api/src/orders/order-lifecycle.e2e-spec.ts`
- Modify: controllers/OpenAPI

**Interfaces:** `POST /driver/orders/:id/status {status}`, `POST /orders/:id/cancel {reason?}`.

- [ ] Test assigned Driver only, transaction history, invalid transition unchanged, delivery proof condition and role-specific cancellation.
- [ ] Implement transition service using PH-06-T01 and audit Admin cancellation.
- [ ] Run lifecycle E2E and DB rollback assertions.
- [ ] Commit `feat(order): enforce audited lifecycle transitions`.

### Task PH-06-T06: Order Domain Gate

**Files:**
- Modify: `docs/api/01-rest-api-spec.md` only if implemented contract differs in clarified detail
- Test: `apps/api/test/order-authorization.matrix-spec.ts`

**Interfaces:** Matrix covers Customer owner/non-owner, assigned/unassigned Driver, Fleet Owner read-only, Admin.

- [ ] Add data-driven authorization tests for list/detail/create/accept/status/cancel.
- [ ] Run API lint/typecheck/unit/integration/E2E/build and `pnpm test:contract`.
- [ ] Expected: every command exits 0; no role accesses out-of-scope data.
- [ ] Commit `test(order): verify role and ownership matrix`.

## Phase Boundary Rules

- Do not calculate price/ETA in controller or mobile.
- Do not directly update status outside state-machine service.
- Do not use read-then-write acceptance without conditional transaction.
