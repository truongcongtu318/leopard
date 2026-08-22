# Wave 2 Remediation Plan (Wave 2A & Wave 2B Defect Resolution)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix all 11 P1 & P2 defects in Wave 2A (PH-05-T05 Client Login) and Wave 2B (PH-06 Order & Driver Domain) to achieve complete spec compliance, security, and race safety.

**Architecture:** 
- Mobile and Admin clients parse `{ user, session: { accessToken, refreshToken, expiresAt } }` correctly, store session tokens securely, and send `Authorization: Bearer <token>` on HTTP calls.
- Demo logins map `admin`, `fleet-owner`, `driver`, `customer` account IDs matching backend `DEMO_ROLES`.
- Backend enforces atomic driver availability checks (blocked when active orders exist), estimate token binding validation, atomic status/cancel state machine transactions, Fleet Owner `OWNER` role membership, and idempotency key persistence.
- Integration tests verify real PostgreSQL PostGIS transaction isolation under concurrent load.

**Tech Stack:** React Native (Expo), Next.js 16 (React 19), NestJS, Prisma ORM, PostGIS.

## Global Constraints

- Backend owns business rules, pricing, ETA, lifecycle, and authorization.
- Mobile/Admin UI operational aesthetic: clean, WCAG contrast, no purple gradients/glassmorphism.
- Strict TDD: Write failing test first -> Run RED -> Implement -> Run GREEN -> Commit.
- 80%+ test coverage target.

---

### Task 1: Fix Wave 2A Mobile & Admin Auth Token & Demo Handoff (P1 Findings #1, #2, #3, #4)

**Files:**
- Modify: `apps/mobile/src/auth/LoginScreen.tsx:43-47`
- Modify: `apps/admin/src/features/auth/LoginForm.tsx:14-22, 41-55, 81-95, 225-275`
- Modify: `apps/admin/src/lib/api/browser-client.ts`
- Test: `apps/mobile/src/auth/LoginScreen.test.tsx`
- Test: `apps/admin/src/features/auth/LoginForm.test.tsx`

**Interfaces:**
- Consumes: Backend `POST /auth/firebase` and `POST /auth/login/demo` returning `{ user: AuthUser, session: AuthSession }`.
- Produces: Correct token extraction `res.session.accessToken` and `res.session.refreshToken`, header injection `Authorization: Bearer <token>`, and correct demo account IDs (`admin`, `fleet-owner`, `driver`, `customer`).

- [ ] **Step 1: Write failing tests for Mobile LoginScreen token extraction**

Update `apps/mobile/src/auth/LoginScreen.test.tsx` to assert that `sessionStore.setSession` receives `res.session.accessToken` and `res.session.refreshToken`:

```tsx
it('extracts session tokens from res.session on login success', async () => {
  const mockResponse = {
    user: { id: 'u1', phone: '0901234567', role: 'CUSTOMER', status: 'ACTIVE' },
    session: { accessToken: 'acc_123', refreshToken: 'ref_123', expiresAt: '2026-08-07' },
  };
  (httpClient.post as jest.Mock).mockResolvedValueOnce(mockResponse);

  render(<LoginScreen onLoginSuccess={jest.fn()} />);
  // simulate submitting idToken
});
```

- [ ] **Step 2: Run Mobile unit tests to verify RED**

Run: `pnpm --filter mobile test`
Expected: FAIL due to `res.session` being undefined or reading top-level `res.accessToken`.

- [ ] **Step 3: Fix Mobile LoginScreen token parsing**

In `apps/mobile/src/auth/LoginScreen.tsx`, update response parsing:

```tsx
const res = await httpClient.post<AuthResponse>('/auth/firebase', { idToken });
const accessToken = res.session?.accessToken ?? '';
const refreshToken = res.session?.refreshToken ?? '';
await sessionStore.setSession(accessToken, refreshToken);
```

- [ ] **Step 4: Fix Admin LoginForm response type, token storage, and demo account IDs**

In `apps/admin/src/features/auth/LoginForm.tsx`:
1. Update `AuthResponse` interface to match `{ user: { id: string; role: string }; session: { accessToken: string; refreshToken: string; expiresAt: string } }`.
2. Extract `res.session.accessToken` and store in `browserClient.setHeader('Authorization', `Bearer ${res.session.accessToken}`)`.
3. Update demo buttons to use `admin`, `fleet-owner`, `driver`, `customer`.

- [ ] **Step 5: Run Mobile and Admin tests to verify GREEN**

Run: `pnpm --filter mobile test && pnpm --filter web test`
Expected: PASS

- [ ] **Step 6: Commit Task 1**

```bash
git add apps/mobile/src/auth/ apps/admin/src/
git commit -m "fix(auth): correct AuthResponse token parsing, Authorization header, and demo IDs"
```

---

### Task 2: Fix Wave 2A Mobile Layout Loading State & Session Recovery (P2 Finding #5)

**Files:**
- Modify: `apps/mobile/app/(protected)/_layout.tsx`
- Test: `apps/mobile/src/navigation/role-router.test.ts`

- [ ] **Step 1: Write failing test for protected layout loading resolution**

In `apps/mobile/src/navigation/role-router.test.ts`, assert that initial session check resolves `isLoading` to false after session check completes.

- [ ] **Step 2: Run Mobile test to verify RED**

Run: `pnpm --filter mobile test`
Expected: FAIL

- [ ] **Step 3: Fix protected layout state machine**

In `apps/mobile/app/(protected)/_layout.tsx`, ensure `setIsLoading(false)` is invoked in a `finally` block during session initialization.

- [ ] **Step 4: Run Mobile tests to verify GREEN**

Run: `pnpm --filter mobile test`
Expected: PASS

- [ ] **Step 5: Commit Task 2**

```bash
git add apps/mobile/
git commit -m "fix(mobile): resolve protected layout infinite loading state"
```

---

### Task 3: Fix Wave 2B Driver Availability & Active Order Guard (P1 Finding #6)

**Files:**
- Modify: `apps/api/src/drivers/drivers.service.ts`
- Modify: `apps/api/src/drivers/drivers.repository.ts`
- Test: `apps/api/src/drivers/availability.e2e-spec.ts`

- [ ] **Step 1: Write failing E2E test for blocking AVAILABILITY when driver has active order**

In `apps/api/src/drivers/availability.e2e-spec.ts`:

```ts
it('blocks setting availability to AVAILABLE if driver has active order (ACCEPTED/PICKING_UP/IN_TRANSIT)', async () => {
  // Setup driver with active order in ACCEPTED state
  // PUT /drivers/availability with AVAILABLE
  // Expect 409 Conflict "DRIVER_HAS_ACTIVE_ORDER"
});
```

- [ ] **Step 2: Run API e2e test to verify RED**

Run: `pnpm --filter api test apps/api/src/drivers/availability.e2e-spec.ts`
Expected: FAIL (currently returns 200 OK)

- [ ] **Step 3: Implement active order check in DriversService**

In `apps/api/src/drivers/drivers.service.ts`:
Check if driver has any active order (`status IN ['ACCEPTED', 'PICKING_UP', 'IN_TRANSIT']`). If status target is `AVAILABLE` and active orders exist, throw `DomainError('DRIVER_HAS_ACTIVE_ORDER', 409, 'Driver has an active order')`.

- [ ] **Step 4: Run tests to verify GREEN**

Run: `pnpm --filter api test apps/api/src/drivers/availability.e2e-spec.ts`
Expected: PASS

- [ ] **Step 5: Commit Task 3**

```bash
git add apps/api/src/drivers/
git commit -m "fix(driver): prevent setting AVAILABLE status while having active order"
```

---

### Task 4: Fix Wave 2B Estimate Token Parameters Binding (P1 Finding #7)

**Files:**
- Modify: `apps/api/src/maps/domain/estimate-token.service.ts`
- Modify: `apps/api/src/orders/orders.service.ts`
- Test: `apps/api/src/maps/domain/estimate-token.service.spec.ts`
- Test: `apps/api/src/orders/customer-orders.e2e-spec.ts`

- [ ] **Step 1: Write failing test for estimate token parameter binding**

In `apps/api/src/maps/domain/estimate-token.service.spec.ts`, assert token payload hashing includes `pickup`, `stops`, `dropoff`, `vehicleType`, and `totalPriceCent`.

- [ ] **Step 2: Run test to verify RED**

Run: `pnpm --filter api test apps/api/src/maps/domain/estimate-token.service.spec.ts`
Expected: FAIL

- [ ] **Step 3: Update EstimateTokenService to bind full route & vehicle payload**

In `apps/api/src/maps/domain/estimate-token.service.ts`:
Include canonical JSON representation of route coordinates, vehicleType, and estimate amount in HMAC signature.

- [ ] **Step 4: Run tests to verify GREEN**

Run: `pnpm --filter api test`
Expected: PASS

- [ ] **Step 5: Commit Task 4**

```bash
git add apps/api/src/maps/ apps/api/src/orders/
git commit -m "fix(order): bind estimate token HMAC to full route and vehicleType payload"
```

---

### Task 5: Fix Wave 2B Atomic Cancel & Status Transition Transactions (P1 Finding #8)

**Files:**
- Modify: `apps/api/src/orders/cancel-order.service.ts`
- Modify: `apps/api/src/orders/update-order-status.service.ts`
- Test: `apps/api/src/orders/order-lifecycle.e2e-spec.ts`

- [ ] **Step 1: Write failing test for concurrent Cancel vs Accept order race**

In `apps/api/src/orders/order-lifecycle.e2e-spec.ts`:
Simulate concurrent `POST /orders/:id/cancel` and `POST /orders/:id/accept`. Assert that exactly one succeeds and order status remains consistent.

- [ ] **Step 2: Run test to verify RED**

Run: `pnpm --filter api test apps/api/src/orders/order-lifecycle.e2e-spec.ts`
Expected: FAIL

- [ ] **Step 3: Wrap Cancel and Status transitions in atomic `$transaction` with `updateMany` conditional checks**

In `cancel-order.service.ts` and `update-order-status.service.ts`:
Perform status updates inside `prisma.$transaction` using `tx.order.updateMany({ where: { id, status: currentStatus } })`. If `count === 0`, throw 409 Conflict.

- [ ] **Step 4: Run tests to verify GREEN**

Run: `pnpm --filter api test`
Expected: PASS

- [ ] **Step 5: Commit Task 5**

```bash
git add apps/api/src/orders/
git commit -m "fix(order): wrap cancel and status transitions in atomic conditional transactions"
```

---

### Task 6: Fix Fleet Owner OWNER Role Guard & Idempotency Key (P2 Findings #9, #10)

**Files:**
- Modify: `apps/api/src/orders/orders.repository.ts`
- Modify: `apps/api/src/orders/orders.service.ts`
- Test: `apps/api/test/order-authorization.matrix-spec.ts`
- Test: `apps/api/src/orders/customer-orders.e2e-spec.ts`

- [ ] **Step 1: Write failing test for Fleet Owner role=OWNER guard & clientRequestId idempotency**

In `order-authorization.matrix-spec.ts`, assert `FleetMember.role === 'OWNER'` is required.
In `customer-orders.e2e-spec.ts`, assert duplicate `clientRequestId` returns original order.

- [ ] **Step 2: Run tests to verify RED**

Run: `pnpm --filter api test`
Expected: FAIL

- [ ] **Step 3: Implement OWNER role filter and idempotency key check**

In `orders.repository.ts`: Add `role: 'OWNER'` to `fleetMember.findMany`.
In `orders.service.ts`: Add `clientRequestId` lookup before creating order.

- [ ] **Step 4: Run tests to verify GREEN**

Run: `pnpm --filter api test`
Expected: PASS

- [ ] **Step 5: Commit Task 6**

```bash
git add apps/api/src/orders/
git commit -m "fix(order): enforce FleetMember OWNER role and clientRequestId idempotency"
```

---

### Task 7: Real Database PostGIS Integration Test Suite (P2 Finding #11)

**Files:**
- Create: `apps/api/test/real-db-race-condition.integration-spec.ts`

- [ ] **Step 1: Write real DB integration test using test database URL**

Create `apps/api/test/real-db-race-condition.integration-spec.ts` executing 20 concurrent transactions on a live PostgreSQL PostGIS database instance.

- [ ] **Step 2: Run real DB integration test**

Run: `DATABASE_URL="postgresql://leopard:leopard@localhost:5432/leopard_test" npx jest apps/api/test/real-db-race-condition.integration-spec.ts`
Expected: PASS (1 winner, 19 conflicts)

- [ ] **Step 3: Commit Task 7**

```bash
git add apps/api/test/
git commit -m "test(order): add real DB PostGIS race condition integration test suite"
```
