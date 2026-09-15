# Driver Order-Lifecycle Loop — Bug Fix Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Close the gap where a driver who just delivered an order is stranded on the detail screen, the orders list never refreshes to show them as available, and the idle-location-ping never resumes — plus two adjacent correctness bugs (dispatch offers ignoring vehicle type, accept-order having no idempotent replay) found in the same audit.

**Architecture:** Five independent, narrowly-scoped call-site fixes — no new abstractions, no schema changes, no new endpoints. Each fix makes an existing mechanism (React Query cache invalidation, the already-rendered `onResolveConflict` button, the already-computed `DriverConflictView` result, the already-supported `vehicleType` repository filter, the already-established `clientRequestId` replay pattern used by every other driver mutation) actually get used at the one call site that currently skips it.

**Tech Stack:** NestJS (`apps/api`), Expo/React Native + TanStack Query (`apps/driver`), Jest for both.

**Spec:** [docs/superpowers/specs/2026-09-13-driver-order-loop-fix-design.md](../specs/2026-09-13-driver-order-loop-fix-design.md)

## Global Constraints

- No behavior change for a request that omits the new optional `clientRequestId` on accept — it must work exactly as it does today.
- The list-invalidation-and-navigate fix in Task 3 must fire ONLY on the two driver-reachable terminal statuses (`DELIVERED`, `RETURNED`) — not on every lifecycle transition (e.g. ACCEPTED → PICKING_UP must NOT navigate away).
- Do not touch `useDriverIdlePing`'s own logic (`apps/driver/src/features/orders/useDriverIdlePing.ts`) — per the spec, it already does the right thing once its query is fresh; only the upstream invalidation is missing.
- Every task must leave the full existing test suite green — this is a bug-fix plan touching live call sites, regressions are unacceptable.

---

## File Structure

| File | Purpose |
|---|---|
| `apps/api/src/dispatch/dispatch.service.ts` [MODIFY] | accept optional `vehicleType`, forward to the repository |
| `apps/api/src/dispatch/dispatch.service.spec.ts` [MODIFY] | update existing call-shape assertions + new vehicleType test |
| `apps/api/src/dispatch/dispatch.gateway.ts` [MODIFY] | pass `event.vehicleType` through |
| `apps/api/src/orders/accept-order.service.ts` [MODIFY] | idempotent replay via `clientRequestId` |
| `apps/api/src/orders/accept-order.service.spec.ts` [MODIFY] | new replay tests |
| `apps/api/src/orders/accept-order.integration-spec.ts` [MODIFY] | new end-to-end replay test |
| `apps/api/src/orders/dto/accept-order.dto.ts` [NEW] | `AcceptOrderDto { clientRequestId?: string }` |
| `apps/api/src/drivers/drivers.controller.ts` [MODIFY] | accept `@Body() dto: AcceptOrderDto` on the accept route |
| `apps/driver/src/features/orders/DriverOrderDetailRuntime.tsx` [MODIFY] | Task 3 (terminal-transition nav) + Task 5 (`onResolveConflict`) |
| `apps/driver/src/features/orders/DriverOrderDetailRuntime.audit.test.tsx` [MODIFY] | new tests for both |
| `apps/driver/src/features/orders/DriverOrdersListRuntime.tsx` [MODIFY] | Task 4 (accept result handling) |
| `apps/driver/src/features/orders/DriverOrdersListRuntime.test.tsx` [MODIFY] | new tests |

---

## Task 1: Backend — dispatch offers respect vehicle type

**Files:**
- Modify: `apps/api/src/dispatch/dispatch.service.ts`
- Modify: `apps/api/src/dispatch/dispatch.service.spec.ts`
- Modify: `apps/api/src/dispatch/dispatch.gateway.ts`

**Interfaces:**
- Consumes: `DriversRepository.findNearbyAvailableDrivers(lat, lng, radiusM, limit, vehicleType?)` (already exists, unchanged signature).
- Produces: `DispatchService.findCandidates(pickup, radiusM?, limit?, vehicleType?)` — the new 4th parameter is consumed by `DispatchGateway.dispatchOrder`.

- [ ] **Step 1: Update the existing test's call-shape assertions (they currently expect exactly 4 positional args)**

In `apps/api/src/dispatch/dispatch.service.spec.ts`, change both `toHaveBeenCalledWith` assertions to include the new trailing `undefined` (no vehicleType passed in these two existing tests):

```ts
    expect(driversRepository.findNearbyAvailableDrivers).toHaveBeenCalledWith(
      10.7326,
      106.7168,
      3_000,
      6,
      undefined,
    );
```

```ts
    expect(driversRepository.findNearbyAvailableDrivers).toHaveBeenCalledWith(1, 2, 6_000, 10, undefined);
```

- [ ] **Step 2: Write the new failing test**

Add this test to the same `describe('DispatchService', ...)` block:

```ts
  it('forwards vehicleType through to the repository so candidates are pre-filtered', async () => {
    const driversRepository = createMockDriversRepository();
    driversRepository.findNearbyAvailableDrivers.mockResolvedValue([]);

    const service = new DispatchService(driversRepository as unknown as DriversRepository);
    await service.findCandidates({ lat: 10.7326, lng: 106.7168 }, 3_000, 6, 'TRUCK');

    expect(driversRepository.findNearbyAvailableDrivers).toHaveBeenCalledWith(
      10.7326,
      106.7168,
      3_000,
      6,
      'TRUCK',
    );
  });
```

- [ ] **Step 3: Run to verify it fails**

Run: `pnpm --filter api test -- src/dispatch/dispatch.service.spec.ts`
Expected: the new test FAILs (`findCandidates` doesn't accept a 4th argument yet); Step 1's two edits currently also fail since the real call has only 4 args, not 5.

- [ ] **Step 4: Implement**

```ts
// apps/api/src/dispatch/dispatch.service.ts
import { Injectable } from '@nestjs/common';
import type { VehicleType } from '@prisma/client';

import { DriversRepository } from '../drivers/drivers.repository.js';

const DEFAULT_RADIUS_M = 3_000;
const DEFAULT_CANDIDATE_LIMIT = 6;

@Injectable()
export class DispatchService {
  constructor(private readonly driversRepository: DriversRepository) {}

  async findCandidates(
    pickup: { lat: number; lng: number },
    radiusM: number = DEFAULT_RADIUS_M,
    limit: number = DEFAULT_CANDIDATE_LIMIT,
    vehicleType?: VehicleType,
  ): Promise<Array<{ userId: string; distanceM: number }>> {
    return this.driversRepository.findNearbyAvailableDrivers(
      pickup.lat,
      pickup.lng,
      radiusM,
      limit,
      vehicleType,
    );
  }
}
```

- [ ] **Step 5: Wire it from the gateway**

In `apps/api/src/dispatch/dispatch.gateway.ts`, change line 47 from:

```ts
    const candidates = await this.dispatch.findCandidates(event.pickup);
```

to:

```ts
    const candidates = await this.dispatch.findCandidates(
      event.pickup,
      undefined,
      undefined,
      event.vehicleType,
    );
```

- [ ] **Step 6: Run to verify it passes**

Run: `pnpm --filter api test -- src/dispatch/dispatch.service.spec.ts`
Expected: PASS, all 3 tests.

- [ ] **Step 7: Run the full backend unit suite**

Run: `pnpm --filter api test`
Expected: PASS, no regressions.

- [ ] **Step 8: Commit**

```bash
git add apps/api/src/dispatch
git commit -m "fix(api): forward vehicleType to dispatch candidate matching"
```

---

## Task 2: Backend — idempotent accept-order

**Files:**
- Create: `apps/api/src/orders/dto/accept-order.dto.ts`
- Modify: `apps/api/src/orders/accept-order.service.ts`
- Modify: `apps/api/src/orders/accept-order.service.spec.ts`
- Modify: `apps/api/src/orders/accept-order.integration-spec.ts`
- Modify: `apps/api/src/drivers/drivers.controller.ts`

**Interfaces:**
- Consumes: `orderStatusHistory` table (existing), same lookup shape as `UpdateOrderStatusService.updateStatus` (`apps/api/src/orders/update-order-status.service.ts:43-58`: `findFirst({ where: { orderId, actorId, clientRequestId } })`).
- Produces: `AcceptOrderService.acceptOrder(actor, orderId, clientRequestId?)` — the 3rd parameter is new and optional; all existing callers (with 2 args) keep working unchanged.

- [ ] **Step 1: Write the DTO**

```ts
// apps/api/src/orders/dto/accept-order.dto.ts
import { IsOptional, IsString } from 'class-validator';

export class AcceptOrderDto {
  @IsOptional()
  @IsString()
  clientRequestId?: string;
}
```

- [ ] **Step 2: Write the failing unit tests**

`apps/api/src/orders/accept-order.service.spec.ts` builds its own inline `prisma`/`ordersRepository`/`eventsPublisher` mocks in `beforeEach` (no shared helper file) and constructs `service = new AcceptOrderService(prisma, ordersRepository, eventsPublisher)` directly. Add `orderStatusHistory.findFirst: jest.fn()` to the existing `prisma.orderStatusHistory = { create: jest.fn() }` line, then add these two tests inside the `describe('AcceptOrderService', ...)` block:

```ts
  test('returns the existing order state on a clientRequestId replay instead of re-running the transaction', async () => {
    prisma.orderStatusHistory.findFirst.mockResolvedValue({
      id: 'hist-1',
      orderId: 'order-1',
      actorId: 'driver-1',
      clientRequestId: 'req-accept-1',
    });
    ordersRepository.findById.mockResolvedValue({
      id: 'order-1',
      status: 'ACCEPTED',
      driverId: 'driver-1',
      createdAt: new Date('2026-09-05T00:00:00.000Z'),
      updatedAt: new Date('2026-09-05T00:00:00.000Z'),
    });

    const result = await service.acceptOrder(driverActor, 'order-1', 'req-accept-1');

    expect(result.status).toBe('ACCEPTED');
    expect(prisma.$transaction).not.toHaveBeenCalled();
    expect(prisma.driverProfile.updateMany).not.toHaveBeenCalled();
    expect(eventsPublisher.publishStatusChanged).not.toHaveBeenCalled();
  });

  test('runs the normal accept flow when clientRequestId has no prior history row', async () => {
    prisma.orderStatusHistory.findFirst.mockResolvedValue(null);
    prisma.user.findUnique.mockResolvedValue({ id: 'driver-1', status: 'ACTIVE' });
    prisma.order.findUnique.mockResolvedValue({
      id: 'order-1',
      status: 'REQUESTED',
      driverId: null,
      vehicleType: 'MOTORBIKE',
    });
    prisma.driverProfile.updateMany.mockResolvedValue({ count: 1 });
    prisma.order.updateMany.mockResolvedValue({ count: 1 });
    prisma.orderStatusHistory.create.mockResolvedValue({
      id: 'hist-2',
      createdAt: new Date('2026-09-05T00:00:00.000Z'),
    });
    ordersRepository.findById.mockResolvedValue({
      id: 'order-1',
      status: 'ACCEPTED',
      driverId: 'driver-1',
      createdAt: new Date('2026-09-05T00:00:00.000Z'),
      updatedAt: new Date('2026-09-05T00:00:00.000Z'),
    });

    await service.acceptOrder(driverActor, 'order-1', 'req-accept-2');

    expect(prisma.orderStatusHistory.findFirst).toHaveBeenCalledWith({
      where: { orderId: 'order-1', actorId: 'driver-1', clientRequestId: 'req-accept-2' },
    });
    expect(eventsPublisher.publishStatusChanged).toHaveBeenCalledTimes(1);
    expect(prisma.orderStatusHistory.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ clientRequestId: 'req-accept-2' }),
      }),
    );
  });
```

- [ ] **Step 3: Write the failing integration test**

In `apps/api/src/orders/accept-order.integration-spec.ts`, read the existing `beforeEach` setup (driver session, REQUESTED order creation) and add:

```ts
  it('replays the same accept request idempotently via clientRequestId', async () => {
    const order = await prismaMock.order.create({
      data: { customerId: 'customer-1', status: 'REQUESTED', vehicleType: 'MOTORBIKE' },
    });

    const first = await request(app.getHttpServer())
      .post(`/driver/orders/${order.id}/accept`)
      .set('Authorization', `Bearer ${driverSession.accessToken}`)
      .send({ clientRequestId: 'req-accept-idempotent-1' })
      .expect(200);

    const second = await request(app.getHttpServer())
      .post(`/driver/orders/${order.id}/accept`)
      .set('Authorization', `Bearer ${driverSession.accessToken}`)
      .send({ clientRequestId: 'req-accept-idempotent-1' })
      .expect(200);

    expect(second.body.id).toBe(first.body.id);
    expect(second.body.status).toBe('ACCEPTED');

    const histories = Array.from(prismaMock.orderStatusHistories.values()).filter(
      (h) => h.orderId === order.id,
    );
    expect(histories).toHaveLength(1); // no duplicate history row on replay
  });
```

(Read the file's existing imports/setup — `prismaMock`, `driverSession`, `request`, `app` — before adding this; match the exact variable names already in scope in that file rather than assuming.)

- [ ] **Step 4: Run to verify both fail**

Run: `pnpm --filter api test -- src/orders/accept-order.service.spec.ts`
Run: `pnpm --filter api exec jest --config jest-e2e.config.cjs accept-order.integration-spec`
Expected: FAIL — `acceptOrder` doesn't accept/check `clientRequestId` yet.

- [ ] **Step 5: Implement the idempotency check and DTO plumbing**

`apps/api/src/orders/accept-order.service.ts:17-23` currently reads:

```ts
  async acceptOrder(
    actor: AuthenticatedActor,
    orderId: string,
  ): Promise<MappedOrderResponse> {
    if (actor.role !== 'DRIVER') {
      throw new DomainError('FORBIDDEN', 403, 'Chỉ tài xế mới có thể nhận đơn hàng');
    }
```

Change it to:

```ts
  async acceptOrder(
    actor: AuthenticatedActor,
    orderId: string,
    clientRequestId?: string,
  ): Promise<MappedOrderResponse> {
    if (actor.role !== 'DRIVER') {
      throw new DomainError('FORBIDDEN', 403, 'Chỉ tài xế mới có thể nhận đơn hàng');
    }

    if (clientRequestId) {
      const existingHistory = await this.prisma.orderStatusHistory.findFirst({
        where: { orderId, actorId: actor.userId, clientRequestId },
      });
      if (existingHistory) {
        const order = await this.ordersRepository.findById(orderId);
        if (order) return mapOrderResponse(order);
      }
    }
```

The rest of the method (lines 25-141: driver lookup, `existingOrder` guard, `driverProfile` vehicle-type check, the `$transaction` block) is unchanged, with one addition: inside the transaction, `accept-order.service.ts:109-116`'s `tx.orderStatusHistory.create` call currently is:

```ts
      const history = await tx.orderStatusHistory.create({
        data: {
          orderId,
          fromStatus: 'REQUESTED',
          toStatus: 'ACCEPTED',
          actorId: actor.userId,
        },
      });
```

Add `clientRequestId` to the `data` object so a later replay can find this row:

```ts
      const history = await tx.orderStatusHistory.create({
        data: {
          orderId,
          fromStatus: 'REQUESTED',
          toStatus: 'ACCEPTED',
          actorId: actor.userId,
          clientRequestId: clientRequestId ?? null,
        },
      });
```

- [ ] **Step 6: Wire the DTO into the controller**

In `apps/api/src/drivers/drivers.controller.ts`, add the import:

```ts
import { AcceptOrderDto } from '../orders/dto/accept-order.dto.js';
```

Change the route:

```ts
  @Post('orders/:id/accept')
  @RequireRoles('DRIVER')
  @HttpCode(HttpStatus.OK)
  acceptOrder(
    @CurrentUser() actor: AuthenticatedActor,
    @Param('id') id: string,
    @Body() dto: AcceptOrderDto,
  ) {
    return this.acceptOrderService.acceptOrder(actor, id, dto.clientRequestId);
  }
```

- [ ] **Step 7: Run to verify both pass**

Run: `pnpm --filter api test -- src/orders/accept-order.service.spec.ts`
Run: `pnpm --filter api exec jest --config jest-e2e.config.cjs accept-order.integration-spec`
Expected: PASS.

- [ ] **Step 8: Run the full backend suite**

Run: `pnpm --filter api test && pnpm --filter api typecheck`
Expected: PASS, no regressions.

- [ ] **Step 9: Commit**

```bash
git add apps/api/src/orders/dto/accept-order.dto.ts apps/api/src/orders/accept-order.service.ts apps/api/src/orders/accept-order.service.spec.ts apps/api/src/orders/accept-order.integration-spec.ts apps/api/src/drivers/drivers.controller.ts
git commit -m "fix(api): make accept-order idempotent via clientRequestId replay"
```

---

## Task 3: Driver mobile — return to the list and refresh it on delivery/return

**Files:**
- Modify: `apps/driver/src/features/orders/DriverOrderDetailRuntime.tsx`
- Modify: `apps/driver/src/features/orders/DriverOrderDetailRuntime.audit.test.tsx`

**Interfaces:**
- Consumes: `DriverDetailView` (existing, from `./model`) — `next.kind === 'content'` narrows to `DriverPublicDetailView | DriverAssignedDetailView`, both of which have `order.status`.
- Produces: on a `DELIVERED` or `RETURNED` result, invalidates the `['driver','orders']` query key (read by `DriverOrdersListRuntime` and `useDriverIdlePing`) and calls `router.back()`.

- [ ] **Step 1: Write the failing tests**

Open `apps/driver/src/features/orders/DriverOrderDetailRuntime.audit.test.tsx` and read its existing mock setup (it already mocks `expo-router`'s `useRouter` returning `{ back: jest.fn() }` — capture that same mock function reference to assert against). Add these two tests to the existing `describe` block:

```tsx
  it('invalidates the driver orders list and navigates back after a DELIVERED transition', async () => {
    getOrderDetailView.mockResolvedValue(createDriverDetailFixture('D-DETAIL-PROOF-REQUIRED'));
    const deliveredView = {
      ...createDriverDetailFixture('D-DETAIL-PROOF-REQUIRED'),
      order: { ...createDriverDetailFixture('D-DETAIL-PROOF-REQUIRED').order, status: 'DELIVERED' },
    } as DriverDetailView;
    executeLifecycle.mockResolvedValue(deliveredView);
    const invalidateSpy = jest.spyOn(client, 'invalidateQueries');

    const screen = await mount();
    await waitFor(() => expect(screen.getByRole('button', { name: 'Xác nhận hoàn tất giao hàng' })).toBeTruthy());
    await fireEvent.press(screen.getByRole('button', { name: 'Xác nhận hoàn tất giao hàng' }));

    await waitFor(() =>
      expect(invalidateSpy).toHaveBeenCalledWith(
        expect.objectContaining({ queryKey: ['driver', 'orders'] }),
      ),
    );
    expect(mockRouterBack).toHaveBeenCalledTimes(1);
  });

  it('does NOT navigate away or invalidate the list on a non-terminal transition', async () => {
    getOrderDetailView.mockResolvedValue(createDriverDetailFixture('D-DETAIL-ACCEPTED'));
    executeLifecycle.mockResolvedValue(createDriverDetailFixture('D-DETAIL-PICKING-UP'));
    const invalidateSpy = jest.spyOn(client, 'invalidateQueries');
    invalidateSpy.mockClear();
    mockRouterBack.mockClear();

    const screen = await mount();
    await waitFor(() => expect(screen.getByRole('button', { name: 'Bắt đầu đi lấy hàng' })).toBeTruthy());
    await fireEvent.press(screen.getByRole('button', { name: 'Bắt đầu đi lấy hàng' }));

    await waitFor(() => expect(screen.getByRole('button', { name: 'Đã lấy hàng — bắt đầu giao' })).toBeTruthy());
    expect(invalidateSpy).not.toHaveBeenCalledWith(
      expect.objectContaining({ queryKey: ['driver', 'orders'] }),
    );
    expect(mockRouterBack).not.toHaveBeenCalled();
  });
```

(This file's existing `jest.mock('expo-router', ...)` mock must expose its `back` jest.fn() under a name you can reference — e.g. `const mockRouterBack = jest.fn(); jest.mock('expo-router', () => ({ useRouter: () => ({ back: mockRouterBack }) }));`. If the file currently does `useRouter: () => ({ back: jest.fn() })` inline without a named reference, refactor it to a named `mockRouterBack` first — this is a required, not optional, prerequisite edit for these tests to be able to assert on it.)

- [ ] **Step 2: Run to verify the new tests fail**

Run: `pnpm --filter driver test -- src/features/orders/DriverOrderDetailRuntime.audit.test.tsx`
Expected: FAIL — no invalidate-and-navigate behavior exists yet for DELIVERED.

- [ ] **Step 3: Implement**

In `apps/driver/src/features/orders/DriverOrderDetailRuntime.tsx`, add near the top of the file (module scope, alongside other constants/imports):

```ts
const DRIVER_TERMINAL_STATUSES = new Set(['DELIVERED', 'RETURNED']);
```

Replace `handleExecuteTask`:

```ts
  async function handleExecuteTask(commandId: string) {
    if (executingRef.current) return;
    executingRef.current = true;
    try {
      const next = await port.executeLifecycle(commandId);
      queryClient.setQueryData(queryKey, next);
      const nextStatus =
        next.kind === 'content' && 'status' in next.order ? next.order.status : null;
      if (nextStatus && DRIVER_TERMINAL_STATUSES.has(nextStatus)) {
        void queryClient.invalidateQueries({ queryKey: ['driver', 'orders'] });
        router.back();
      }
    } finally {
      executingRef.current = false;
    }
  }
```

- [ ] **Step 4: Run to verify it passes**

Run: `pnpm --filter driver test -- src/features/orders/DriverOrderDetailRuntime.audit.test.tsx`
Expected: PASS, all tests including the two new ones and the pre-existing ones (the CANCELLED-alert test and the proof-upload test from earlier sessions must still pass unchanged).

- [ ] **Step 5: Commit**

```bash
git add apps/driver/src/features/orders/DriverOrderDetailRuntime.tsx apps/driver/src/features/orders/DriverOrderDetailRuntime.audit.test.tsx
git commit -m "fix(driver): return to orders list and refresh it after DELIVERED/RETURNED"
```

---

## Task 4: Driver mobile — react to the accept result (navigate on success, alert on conflict)

**Files:**
- Modify: `apps/driver/src/features/orders/DriverOrdersListRuntime.tsx`
- Modify: `apps/driver/src/features/orders/DriverOrdersListRuntime.test.tsx`

**Interfaces:**
- Consumes: `port.acceptOrder(orderId): Promise<DriverDetailView>` (existing, from `./adapter`) — resolves to `{kind:'content', ...}` on success or `{kind:'conflict', title, message, recoveryLabel, ...}` on a vehicle-mismatch/race.
- Produces: on success, calls `onOpenOrder(orderId)` (the prop this component already receives); on conflict, shows a native `Alert` with the conflict's `title`/`message`.

- [ ] **Step 1: Read the existing test file's mount/mock helper first**

`apps/driver/src/features/orders/DriverOrdersListRuntime.test.tsx` already has: a `renderWithClient(ui)` helper wrapping in `QueryClientProvider`; a `mockUseDispatchOffer` mock of `./useDispatchOffer`; a `createDriverHttpAdapter` mock (`jest.mock('./adapter', ...)`); a `SAMPLE_OFFER` fixture; and an existing test `'shows an incoming dispatch offer and accepts it via POST /driver/orders/:id/accept'` that triggers accept via `fireEvent(screen.getByTestId('dispatch-slide-action'), 'accessibilityAction', { nativeEvent: { actionName: 'activate' } })`. Reuse all of this verbatim.

- [ ] **Step 2: Write the failing tests**

Add `import { Alert } from 'react-native';` to the top of the file, then add these two tests to the `describe('DriverOrdersListRuntime', ...)` block:

```tsx
  it('navigates to the order detail screen after a successful accept', async () => {
    const declineOffer = jest.fn();
    const acceptOrder = jest.fn(async () => ({ kind: 'content' }));
    const onOpenOrder = jest.fn();
    mockUseDispatchOffer.mockReturnValue({ offer: SAMPLE_OFFER, declineOffer });
    (createDriverHttpAdapter as jest.Mock<any>).mockReturnValue({
      getOrdersView: jest.fn(async () => CONTENT_VIEW),
      acceptOrder,
    });

    const screen = await renderWithClient(<DriverOrdersListRuntime onOpenOrder={onOpenOrder} />);

    await waitFor(() => {
      expect(screen.getByText('68.000 ₫')).toBeTruthy();
    });

    await fireEvent(screen.getByTestId('dispatch-slide-action'), 'accessibilityAction', {
      nativeEvent: { actionName: 'activate' },
    });

    await waitFor(() => {
      expect(onOpenOrder).toHaveBeenCalledWith(SAMPLE_OFFER.id);
    });

    await screen.unmount();
    screen.client.clear();
  }, 15000);

  it('shows an alert with the conflict message instead of silently dropping it', async () => {
    const declineOffer = jest.fn();
    const acceptOrder = jest.fn(async () => ({
      kind: 'conflict',
      title: 'Đơn không phù hợp với loại xe của bạn',
      message: 'Đơn hàng này yêu cầu loại phương tiện khác.',
      recoveryLabel: 'Xem đơn còn trống',
    }));
    const onOpenOrder = jest.fn();
    const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
    mockUseDispatchOffer.mockReturnValue({ offer: SAMPLE_OFFER, declineOffer });
    (createDriverHttpAdapter as jest.Mock<any>).mockReturnValue({
      getOrdersView: jest.fn(async () => CONTENT_VIEW),
      acceptOrder,
    });

    const screen = await renderWithClient(<DriverOrdersListRuntime onOpenOrder={onOpenOrder} />);

    await waitFor(() => {
      expect(screen.getByText('68.000 ₫')).toBeTruthy();
    });

    await fireEvent(screen.getByTestId('dispatch-slide-action'), 'accessibilityAction', {
      nativeEvent: { actionName: 'activate' },
    });

    await waitFor(() => {
      expect(alertSpy).toHaveBeenCalledWith(
        'Đơn không phù hợp với loại xe của bạn',
        'Đơn hàng này yêu cầu loại phương tiện khác.',
      );
    });
    expect(onOpenOrder).not.toHaveBeenCalled();

    alertSpy.mockRestore();
    await screen.unmount();
    screen.client.clear();
  }, 15000);
```

(These reuse the same `CONTENT_VIEW`/`SAMPLE_OFFER` fixtures and `renderWithClient` helper already defined at the top of the file — no new scaffolding needed.)

- [ ] **Step 3: Run to verify both fail**

Run: `pnpm --filter driver test -- src/features/orders/DriverOrdersListRuntime.test.tsx`
Expected: FAIL.

- [ ] **Step 4: Implement**

Add the import at the top of `apps/driver/src/features/orders/DriverOrdersListRuntime.tsx`:

```ts
import { Alert } from 'react-native';
```

Replace `handleAcceptOffer`:

```ts
  async function handleAcceptOffer(orderId: string) {
    declineOffer();
    const result = await port.acceptOrder(orderId);
    void queryClient.invalidateQueries({ queryKey });
    if (result.kind === 'content') {
      onOpenOrder(orderId);
    } else if (result.kind === 'conflict') {
      Alert.alert(result.title, result.message);
    }
  }
```

- [ ] **Step 5: Run to verify it passes**

Run: `pnpm --filter driver test -- src/features/orders/DriverOrdersListRuntime.test.tsx`
Expected: PASS, all tests.

- [ ] **Step 6: Commit**

```bash
git add apps/driver/src/features/orders/DriverOrdersListRuntime.tsx apps/driver/src/features/orders/DriverOrdersListRuntime.test.tsx
git commit -m "fix(driver): navigate to accepted order and surface accept conflicts instead of dropping them"
```

---

## Task 5: Driver mobile — wire the conflict view's recovery button

**Files:**
- Modify: `apps/driver/src/features/orders/DriverOrderDetailRuntime.tsx`
- Modify: `apps/driver/src/features/orders/DriverOrderDetailRuntime.audit.test.tsx`

**Interfaces:**
- Consumes: `DriverOrderDetailScreen`'s existing `onResolveConflict?: () => void` prop (`apps/driver/src/features/orders/DriverOrderDetailScreen.tsx:31`, already wired to the conflict view's action button at lines 1207-1209 — no Screen-side change needed).

- [ ] **Step 1: Write the failing test**

Add to `DriverOrderDetailRuntime.audit.test.tsx`:

```tsx
  it('navigates back when the conflict view\'s recovery action is triggered', async () => {
    getOrderDetailView.mockResolvedValue({
      scenarioId: 'D-DETAIL-VEHICLE-MISMATCH',
      kind: 'conflict',
      title: 'Đơn không phù hợp với loại xe của bạn',
      message: 'Đơn hàng này yêu cầu loại phương tiện khác.',
      recoveryLabel: 'Xem đơn còn trống',
    } as DriverDetailView);
    mockRouterBack.mockClear();

    const screen = await mount();
    await waitFor(() => expect(screen.getByRole('button', { name: 'Xem đơn còn trống' })).toBeTruthy());
    await fireEvent.press(screen.getByRole('button', { name: 'Xem đơn còn trống' }));

    expect(mockRouterBack).toHaveBeenCalledTimes(1);
  });
```

- [ ] **Step 2: Run to verify it fails**

Run: `pnpm --filter driver test -- src/features/orders/DriverOrderDetailRuntime.audit.test.tsx`
Expected: FAIL — pressing the button currently does nothing (`onResolveConflict` is undefined).

- [ ] **Step 3: Implement**

In `apps/driver/src/features/orders/DriverOrderDetailRuntime.tsx`, add the prop to the `<DriverOrderDetailScreen>` render:

```tsx
      <DriverOrderDetailScreen
        onBack={() => router.back()}
        onExecuteTask={(commandId) => void handleExecuteTask(commandId)}
        onOpenIncidentModal={() => setIncidentModalVisible(true)}
        onOpenLocationSettings={() => void Linking.openSettings()}
        onResolveConflict={() => router.back()}
        onRetry={() => {
          void query.refetch();
          void sender.retryConnection(orderId);
        }}
```

- [ ] **Step 4: Run to verify it passes**

Run: `pnpm --filter driver test -- src/features/orders/DriverOrderDetailRuntime.audit.test.tsx`
Expected: PASS, all tests.

- [ ] **Step 5: Commit**

```bash
git add apps/driver/src/features/orders/DriverOrderDetailRuntime.tsx apps/driver/src/features/orders/DriverOrderDetailRuntime.audit.test.tsx
git commit -m "fix(driver): wire the accept-conflict recovery button to navigate back"
```

---

## Task 6: Full verification gate

**Files:** none (verification only)

- [ ] **Step 1: Backend**

```bash
pnpm --filter api test
pnpm --filter api typecheck
pnpm --filter api exec jest --config jest-e2e.config.cjs --forceExit --testPathIgnorePatterns="real-db|customer-orders|admin-command"
```
Expected: all PASS (the two excluded suites are pre-existing unrelated environment timeouts, confirmed in an earlier session — do not treat their exclusion as hiding a regression from this plan's changes; if time permits, run them too and confirm they fail identically to before, not differently).

- [ ] **Step 2: Driver mobile**

```bash
pnpm --filter driver test
pnpm --filter driver typecheck
```
Expected: all PASS.

- [ ] **Step 3: Manual smoke check (documented, not automated)**

Using the dev backend + driver app: go online as a driver with a vehicle type that has at least one matching REQUESTED order and one mismatched one queued — confirm only the matching one triggers a dispatch push. Accept it, ride through PICKING_UP → IN_TRANSIT → upload proof → DELIVERED, and confirm: (a) the app returns to the orders list automatically, (b) the radar/available-orders view is visibly live again (not stale), (c) within one idle-ping interval the driver's location updates continue (check via the admin/dispatch view or a second device watching `lastKnownAt`). Then trigger a vehicle-mismatch accept attempt and confirm an alert appears with a real message instead of the offer just silently vanishing.
