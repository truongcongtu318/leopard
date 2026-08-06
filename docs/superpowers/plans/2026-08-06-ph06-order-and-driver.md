# Phase PH-06 Order and Driver Domain Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement FR-02/FR-03 and AC-02/AC-03 for Order state machine, Customer order creation & query, Driver availability, race-safe order acceptance under concurrent requests, audited status transitions, and data-driven authorization matrix.

**Architecture:** `OrdersModule` owns order aggregate & lifecycle state machine. `DriversModule` owns availability state and delegates assignment transactions. Order creation verifies HMAC estimate tokens from `MapsModule` (`EstimateTokenService`). Race-safe order acceptance uses Prisma transactions with conditional updates to guarantee exactly one winning driver. Status transitions enforce `DeliveryProofReader` checks before reaching `DELIVERED`.

**Tech Stack:** NestJS 11.1.28, Prisma 7.8.0, PostgreSQL 17 + PostGIS 3.5, Zod 3.24.2, Jest 30.0.5, Supertest 7.2.2.

## Global Constraints

- **Lifecycle:** `REQUESTED` -> `ACCEPTED` -> `PICKING_UP` -> `IN_TRANSIT` -> `DELIVERED` | `CANCELLED`.
- **Ownership & Isolation:** Customer owns only their own orders (`404` non-disclosure for orders belonging to others). Driver only mutates active order assigned to them.
- **Race Safety:** `POST /driver/orders/:id/accept` must guarantee exactly 1 winner under concurrent requests (`409 ORDER_ALREADY_ASSIGNED` for others).
- **Delivery Proof:** Transition to `DELIVERED` requires delivery proof (`hasDeliveryProof=true`).
- **TDD:** Write failing tests first, observe RED, implement minimal code, verify GREEN, then commit.

---

### Task 1: Order State Machine & Delivery Proof Boundary

**Files:**
- Create: `apps/api/src/orders/domain/delivery-proof-reader.ts`
- Create: `apps/api/src/orders/domain/order-state-machine.ts`
- Test: `apps/api/src/orders/domain/order-state-machine.spec.ts`

**Interfaces:**
- Produces: `DeliveryProofReader { hasDeliveryProof(orderId: string): Promise<boolean> }`
- Produces: `assertOrderTransition(input: { from: OrderStatus; to: OrderStatus; actorRole: Role; hasDeliveryProof: boolean; cancelReason?: string }): void`

- [ ] **Step 1: Write failing tests for Order State Machine**

Create `apps/api/src/orders/domain/order-state-machine.spec.ts`:
- Table-driven test for valid transitions: `REQUESTED` -> `ACCEPTED` (DRIVER), `ACCEPTED` -> `PICKING_UP` (DRIVER), `PICKING_UP` -> `IN_TRANSIT` (DRIVER), `IN_TRANSIT` -> `DELIVERED` (DRIVER with `hasDeliveryProof=true`).
- Rejection of invalid transitions: skipping states (`REQUESTED` -> `DELIVERED`), backwards transitions (`IN_TRANSIT` -> `PICKING_UP`).
- Customer cancellation rules: allowed from `REQUESTED` only.
- Admin cancellation rules: allowed from any active state with required non-empty `cancelReason`.
- Missing delivery proof on `DELIVERED`: throws `ApiError` 422 `DELIVERY_PROOF_REQUIRED`.

- [ ] **Step 2: Run test to verify failure**

Run: `npx jest apps/api/src/orders/domain/order-state-machine.spec.ts`
Expected: FAIL (Modules not found)

- [ ] **Step 3: Implement Order State Machine & Delivery Proof Interface**

Create `apps/api/src/orders/domain/delivery-proof-reader.ts`:
```ts
export interface DeliveryProofReader {
  hasDeliveryProof(orderId: string): Promise<boolean>;
}
```

Create `apps/api/src/orders/domain/order-state-machine.ts`:
Pure state machine function `assertOrderTransition(input)` validating role, current state, next state, delivery proof, and cancellation reason.

- [ ] **Step 4: Run test to verify pass**

Run: `npx jest apps/api/src/orders/domain/order-state-machine.spec.ts`
Expected: PASS with 100% branch coverage for domain state machine.

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/orders/domain/
git commit -m "feat(order): define delivery lifecycle state machine"
```

---

### Task 2: Create and Query Customer Orders

**Files:**
- Create: `apps/api/src/orders/orders.module.ts`
- Create: `apps/api/src/orders/orders.controller.ts`
- Create: `apps/api/src/orders/orders.service.ts`
- Create: `apps/api/src/orders/orders.repository.ts`
- Create: `apps/api/src/orders/dto/create-order.dto.ts`
- Create: `apps/api/src/orders/dto/order-response.mapper.ts`
- Modify: `apps/api/src/app.module.ts`
- Test: `apps/api/src/orders/customer-orders.e2e-spec.ts`

**Interfaces:**
- Consumes: `EstimateTokenService.verify(token: string): VerifiedOrderEstimate` from `MapsModule`
- Produces: Endpoints `POST /api/v1/orders`, `GET /api/v1/orders`, `GET /api/v1/orders/:id`

- [ ] **Step 1: Write failing E2E tests for Customer Orders**

Create `apps/api/src/orders/customer-orders.e2e-spec.ts`:
- Test order creation with valid signed estimate token.
- Rejection of tampered / expired estimate tokens (422 `ESTIMATE_TOKEN_INVALID`).
- Pagination and listing of own orders only for `CUSTOMER`.
- Detail lookup returning 404 for orders belonging to other customers (privacy non-disclosure).

- [ ] **Step 2: Run test to verify failure**

Run: `npx jest apps/api/src/orders/customer-orders.e2e-spec.ts`
Expected: FAIL (404 / Controller not registered)

- [ ] **Step 3: Implement OrdersModule, Controller, Service & Repository**

Implement DTOs, Repository (Prisma `order`, `orderStop`, `orderStatusHistory` in single `$transaction`), Service consuming `EstimateTokenService`, Controller with `@UseGuards(AccessTokenGuard, RoleGuard)`, `@RequireRoles('CUSTOMER', 'ADMIN')`, and register `OrdersModule` in `AppModule`.

- [ ] **Step 4: Run test to verify pass**

Run: `npx jest apps/api/src/orders/customer-orders.e2e-spec.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/orders/ apps/api/src/app.module.ts
git commit -m "feat(order): create and query customer orders"
```

---

### Task 3: Driver Availability and Queue Management

**Files:**
- Create: `apps/api/src/drivers/drivers.module.ts`
- Create: `apps/api/src/drivers/drivers.controller.ts`
- Create: `apps/api/src/drivers/drivers.service.ts`
- Create: `apps/api/src/drivers/drivers.repository.ts`
- Create: `apps/api/src/drivers/dto/update-availability.dto.ts`
- Modify: `apps/api/src/app.module.ts`
- Test: `apps/api/src/drivers/availability.e2e-spec.ts`

**Interfaces:**
- Produces: Endpoints `PATCH /api/v1/driver/availability`, `GET /api/v1/driver/orders/available`, `GET /api/v1/driver/orders/active`

- [ ] **Step 1: Write failing E2E tests for Driver Availability & Queue**

Create `apps/api/src/drivers/availability.e2e-spec.ts`:
- Driver-only access (403 for `CUSTOMER`).
- Updating availability to `AVAILABLE` / `OFFLINE`.
- Rejection of client directly setting `BUSY` (derived from active assignment only).
- Querying available `REQUESTED` order queue and active assigned order.

- [ ] **Step 2: Run test to verify failure**

Run: `npx jest apps/api/src/drivers/availability.e2e-spec.ts`
Expected: FAIL

- [ ] **Step 3: Implement DriversModule**

Implement Driver availability management, active assignment lookup, available orders query, and register `DriversModule` in `AppModule`.

- [ ] **Step 4: Run test to verify pass**

Run: `npx jest apps/api/src/drivers/availability.e2e-spec.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/drivers/ apps/api/src/app.module.ts
git commit -m "feat(driver): manage availability and order queue"
```

---

### Task 4: Race-Safe Order Acceptance

**Files:**
- Create: `apps/api/src/orders/accept-order.service.ts`
- Test: `apps/api/src/orders/accept-order.integration-spec.ts`
- Modify: `apps/api/src/orders/orders.controller.ts`
- Modify: `apps/api/src/drivers/drivers.controller.ts`

**Interfaces:**
- Produces: Endpoint `POST /api/v1/driver/orders/:id/accept`

- [ ] **Step 1: Write failing integration test for concurrent order acceptance**

Create `apps/api/src/orders/accept-order.integration-spec.ts`:
- Launch two concurrent real DB transactions (`Promise.all`) for two `AVAILABLE` Drivers accepting the same `REQUESTED` order.
- Assert exactly ONE succeeds (200 OK) and ONE fails (409 Conflict `ORDER_ALREADY_ASSIGNED`).
- Assert Driver with existing active assignment cannot accept another order (409 Conflict `DRIVER_BUSY`).

- [ ] **Step 2: Run test to verify failure**

Run: `npx jest apps/api/src/orders/accept-order.integration-spec.ts`
Expected: FAIL

- [ ] **Step 3: Implement AcceptOrderService with conditional transaction**

Implement `acceptOrder` using `prisma.$transaction`:
Use conditional update `updateMany({ where: { id: orderId, status: 'REQUESTED' }, data: { status: 'ACCEPTED', driverId } })` and update Driver availability to `BUSY` within the same transaction.

- [ ] **Step 4: Run integration test repeatedly (20 iterations)**

Run loop test to verify 0 double assignments.
Expected: PASS (20/20 iterations pass).

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/orders/accept-order.service.ts apps/api/src/orders/accept-order.integration-spec.ts apps/api/src/orders/orders.controller.ts apps/api/src/drivers/drivers.controller.ts
git commit -m "feat(order): make driver acceptance atomic"
```

---

### Task 5: Status Update and Audited Cancellation

**Files:**
- Create: `apps/api/src/orders/update-order-status.service.ts`
- Create: `apps/api/src/orders/cancel-order.service.ts`
- Test: `apps/api/src/orders/order-lifecycle.e2e-spec.ts`
- Modify: `apps/api/src/orders/orders.controller.ts`

**Interfaces:**
- Produces: Endpoints `POST /api/v1/driver/orders/:id/status`, `POST /api/v1/orders/:id/cancel`

- [ ] **Step 1: Write failing lifecycle & cancellation E2E tests**

Create `apps/api/src/orders/order-lifecycle.e2e-spec.ts`:
- Full lifecycle flow: `REQUESTED` -> `ACCEPTED` -> `PICKING_UP` -> `IN_TRANSIT` -> `DELIVERED`.
- Rejection of unassigned Driver attempting status update (403 Forbidden).
- Rejection of `DELIVERED` when `hasDeliveryProof` is false (422 Unprocessable Entity).
- Customer cancellation from `REQUESTED` and Admin cancellation with audit reason.

- [ ] **Step 2: Run test to verify failure**

Run: `npx jest apps/api/src/orders/order-lifecycle.e2e-spec.ts`
Expected: FAIL

- [ ] **Step 3: Implement UpdateOrderStatusService & CancelOrderService**

Implement status transition logic calling `assertOrderTransition`, recording `orderStatusHistory`, updating Driver availability to `AVAILABLE` upon `DELIVERED` or `CANCELLED`, and audit trail logging.

- [ ] **Step 4: Run test to verify pass**

Run: `npx jest apps/api/src/orders/order-lifecycle.e2e-spec.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/orders/ apps/api/src/drivers/
git commit -m "feat(order): enforce audited lifecycle transitions"
```

---

### Task 6: Order Domain Gate & Authorization Matrix

**Files:**
- Modify: `docs/api/01-rest-api-spec.md` (only if exact implementation details were clarified)
- Test: `apps/api/test/order-authorization.matrix-spec.ts`

- [ ] **Step 1: Write data-driven authorization matrix test**

Create `apps/api/test/order-authorization.matrix-spec.ts`:
Matrix testing all roles (`CUSTOMER` owner/non-owner, `DRIVER` assigned/unassigned/offline, `FLEET_OWNER` read-only, `ADMIN`) across all order endpoints.

- [ ] **Step 2: Run full API verification suite**

Run:
```bash
pnpm --filter api test
pnpm --filter api test:e2e
pnpm --filter api test:contract
pnpm --filter api typecheck
pnpm --filter api lint
pnpm --filter api build
```
Expected: All exit 0; no role accesses out-of-scope data.

- [ ] **Step 3: Commit Gate Record**

```bash
git add apps/api/test/order-authorization.matrix-spec.ts docs/api/01-rest-api-spec.md
git commit -m "test(order): verify role and ownership matrix"
```
