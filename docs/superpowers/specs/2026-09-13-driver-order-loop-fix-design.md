# Driver Order-Lifecycle Loop — Bug Fix Design

**Date:** 2026-09-13
**Status:** Awaiting review
**Scope:** Backend (`apps/api`) dispatch + accept-order; driver mobile (`apps/driver`) post-lifecycle navigation and accept/conflict handling.

## 1. Purpose

A prior audit (this session) traced the full driver loop — AVAILABLE → receives dispatch offer → accepts → picks up → delivers → back to AVAILABLE → receives next offer — end to end across backend and mobile. Backend was mostly correct (5/7 checks passed). Driver mobile had three broken checks that chain into one real-world symptom: **a driver who just delivered an order is not returned to the radar/list screen, the list's cached view of "no active trip" never refreshes, and the idle-location-ping (which reads that same stale query) never resumes — so a driver can be AVAILABLE server-side while invisible on the dispatch radar client-side until some unrelated event happens to trigger a refetch.**

This is not a new feature — every fix below restores behavior the existing architecture already assumes (React Query cache invalidation on mutation, the `onResolveConflict` prop the conflict view already renders, the `DriverConflictView` result `handleAcceptOffer` already receives but discards). No new business decision is required; this is purely closing gaps between what the code already models and what actually runs.

## 2. Non-goals

- No redesign of the dispatch algorithm, the order state machine, or the React Query caching strategy — this fixes call sites that don't use the existing mechanisms correctly, not the mechanisms themselves.
- No push-notification work for dispatch offers (already handled by the existing socket `DispatchGateway`/`DispatchSocketEvent.offer`).
- No change to `useDriverIdlePing`'s design (gate ping start/stop on `['driver','orders']`'s `availability.status`) — it's correct; it just never gets fed a fresh read after delivery. Fixing the query invalidation upstream (§4.2) is sufficient; the ping hook needs no change.

## 3. Confirmed findings (verified by direct code reads, not assumption)

### Backend

**B1 — Dispatch offers ignore vehicle type** (`apps/api/src/dispatch/dispatch.service.ts:12-23`, `apps/api/src/dispatch/dispatch.gateway.ts:46-47`)
`DispatchGateway.dispatchOrder` calls `this.dispatch.findCandidates(event.pickup)` — only the pickup coordinate, even though `OrderRequestedEvent.vehicleType` is already on the event object (used two lines later at `dispatch.gateway.ts:54` to build the offer payload) and `DriversRepository.findNearbyAvailableDrivers` (called from `DispatchService.findCandidates`) already accepts an optional `vehicleType` filter (used correctly elsewhere, e.g. `GET /driver/orders/available`'s radius query). The dispatch push simply never passes it through. Result: a TRUCK order can be pushed to a MOTORBIKE driver, who will hit `422 VEHICLE_TYPE_MISMATCH` on accept (a real, already-correct backend guard) — the bug is offering it to them at all, wasting the accept round-trip and confusing the driver.

**B2 — `AcceptOrderService` has no idempotent-replay path** (`apps/api/src/orders/accept-order.service.ts:17-20, 89-99, 109-116`)
Every other mutating driver endpoint in this codebase (`UpdateOrderStatusService.updateStatus`, `ReportOrderIncidentService.reportIncident`) takes an optional `clientRequestId`, checks `orderStatusHistory` for an existing `(orderId, actorId, clientRequestId)` row first, and returns the prior result on replay instead of re-running the transition. `acceptOrder(actor, orderId)` has no such parameter at all — a network retry after a successful-but-unacknowledged accept hits `409 ORDER_ALREADY_ASSIGNED` on the retry, which is indistinguishable client-side from "another driver actually took it."

### Driver mobile

**F1 — No navigation or list-refresh after a terminal lifecycle transition** (`apps/driver/src/features/orders/DriverOrderDetailRuntime.tsx:175-184`)
```ts
async function handleExecuteTask(commandId: string) {
  if (executingRef.current) return;
  executingRef.current = true;
  try {
    const next = await port.executeLifecycle(commandId);
    queryClient.setQueryData(queryKey, next);   // only updates THIS order's cache entry
  } finally {
    executingRef.current = false;
  }
}
```
This never inspects `next`'s resulting status, never calls `queryClient.invalidateQueries({ queryKey: ['driver','orders'] })` (the list screen's query key, per `DriverOrdersListRuntime.tsx:16`), and never navigates. Contrast with the same file's `CANCELLED` handling (`DriverOrderDetailRuntime.tsx:77-83`), which does both `Alert.alert(...)` and `router.back()` on that one specific transition — DELIVERED (and RETURNED, the other driver-reachable terminal status) has no equivalent.

Because `packages/mobile-core/src/api/query-client.ts:11-21` sets `staleTime: 30_000` and `refetchOnWindowFocus: false`, and Expo Router's native-stack keeps `DriverOrdersListRuntime` mounted underneath the pushed detail screen (no remount on `router.back()`), nothing will refetch the list query until some unrelated event does — the driver can sit on a stale "you have an active trip" list view indefinitely after actually delivering.

**F2 — Idle-ping resumption is a direct downstream consequence of F1, not a separate bug**
`useDriverIdlePing` (`apps/driver/src/features/orders/useDriverIdlePing.ts:17-31`) reads `availability.status` from the exact same `['driver','orders']` query. Once F1 invalidates that key on a terminal transition, this hook's existing `useEffect` (already correctly gated on `status === 'AVAILABLE'`) will see the fresh `AVAILABLE` value and call `idlePing.start()` with no further changes needed here.

**F3 — Accept result (success or conflict) is captured and then discarded — no navigation, no error surfaced** (`apps/driver/src/features/orders/DriverOrdersListRuntime.tsx:62-66`, `apps/driver/src/features/orders/DriverOrdersScreen.tsx:1020-1029`)
```ts
async function handleAcceptOffer(orderId: string) {
  declineOffer();
  await port.acceptOrder(orderId);                          // return value thrown away
  void queryClient.invalidateQueries({ queryKey });          // this part is already correct
}
```
`port.acceptOrder` (`apps/driver/src/features/orders/adapter.ts:986`) is `Promise<DriverDetailView>` — on a 409/422 it does **not** reject; it resolves to a `DriverConflictView` object carrying a real `title`/`message`/`recoveryLabel` (confirmed by reading the adapter's catch blocks directly, e.g. `D-DETAIL-VEHICLE-MISMATCH`, `D-DETAIL-ACCEPT-RACE`). `handleAcceptOffer` never looks at this value. Two consequences:
1. On **success**, the driver is never navigated into the order-detail screen. `DriverOrdersScreen.tsx:1022-1028`'s `IncomingDispatchModal.onAccept` calls `onAcceptIncomingOffer(orderId)` (which resolves to this function) and explicitly does **not** also call `onOpenOrder(orderId)` (the `else if` branch is skipped whenever `onAcceptIncomingOffer` is provided, which it always is in the wired runtime) — so after accepting, the driver is left on the list with no automatic route to "go to pickup."
2. On **conflict** (vehicle mismatch or race), the informative message is silently dropped — the driver sees the offer disappear with no explanation.

(The list *does* correctly `invalidateQueries` either way, so a stale/no-longer-`REQUESTED` order won't stay tappable — that part of the original audit's claim doesn't hold up under direct inspection and needs no fix.)

**F4 — The conflict view's own recovery button is wired to nothing** (`apps/driver/src/features/orders/DriverOrderDetailRuntime.tsx:221-234`, `apps/driver/src/features/orders/DriverOrderDetailScreen.tsx:31, 1207-1209`)
`DriverOrderDetailScreen` accepts an `onResolveConflict?: () => void` prop and wires it to the conflict view's action button (`actionLabel={view.recoveryLabel}`, `onAction={props.onResolveConflict}`). `DriverOrderDetailRuntime`'s render of `<DriverOrderDetailScreen>` never passes this prop — pressing that button does nothing.

## 4. Fix design

### 4.1 Backend — B1: pass vehicle type through dispatch

`DispatchService.findCandidates` gains an optional `vehicleType` parameter, forwarded to `DriversRepository.findNearbyAvailableDrivers` (which already accepts it — no repository change needed). `DispatchGateway.dispatchOrder` passes `event.vehicleType`.

### 4.2 Backend — B2: idempotent accept

`AcceptOrderService.acceptOrder` gains an optional `clientRequestId` parameter. Before the vehicle/availability checks, it looks up `orderStatusHistory` for an existing `(orderId, actorId: actor.userId, clientRequestId)` row (same query shape as `UpdateOrderStatusService.updateStatus`'s existing idempotency check) and, if found, returns the current order state directly instead of re-running the transaction. The `orderStatusHistory.create` call inside the transaction stores the `clientRequestId`. `AcceptOrderDto` (new, or inline `@Body('clientRequestId')`) and the controller route pass it through — this is an additive, backward-compatible parameter (a request with no `clientRequestId` behaves exactly as today).

### 4.3 Driver mobile — F1: navigate and refresh the list on a terminal transition

In `DriverOrderDetailRuntime.handleExecuteTask`, after `setQueryData`, check whether the resulting view's order status is a terminal one reachable from a driver action (`DELIVERED` or `RETURNED`) and, if so, invalidate `['driver','orders']` and navigate back:

```ts
const TERMINAL_STATUSES = new Set(['DELIVERED', 'RETURNED']);

async function handleExecuteTask(commandId: string) {
  if (executingRef.current) return;
  executingRef.current = true;
  try {
    const next = await port.executeLifecycle(commandId);
    queryClient.setQueryData(queryKey, next);
    const nextStatus = next.kind === 'content' && 'status' in next.order ? next.order.status : null;
    if (nextStatus && TERMINAL_STATUSES.has(nextStatus)) {
      void queryClient.invalidateQueries({ queryKey: ['driver', 'orders'] });
      router.back();
    }
  } finally {
    executingRef.current = false;
  }
}
```

(Exact shape of `next`/`DriverDetailContentView` to be confirmed against `model.ts` during implementation — the plan's task will read it fresh rather than assume.)

### 4.4 Driver mobile — F3: react to the accept result

`DriverOrdersListRuntime.handleAcceptOffer` captures the result and branches:

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

### 4.5 Driver mobile — F4: wire the conflict recovery button

`DriverOrderDetailRuntime` passes `onResolveConflict={() => { router.back(); }}` (returning to the list is the correct recovery action for both `VEHICLE_MISMATCH` and `ACCEPT_RACE` conflict scenarios — there is nothing else to retry on the same screen since the order is no longer theirs to act on).

## 5. Testing

- Backend: unit test for `DispatchService.findCandidates` passing `vehicleType` through; integration test confirming a dispatch push excludes a driver whose profile vehicle type doesn't match. Integration tests for `AcceptOrderService`'s replay behavior (same `clientRequestId` twice → same result, no duplicate `orderStatusHistory` row, no double `BUSY` flip).
- Driver mobile: `DriverOrderDetailRuntime` test asserting `router.back()` and list-query invalidation fire on a DELIVERED (and separately RETURNED) transition, and do NOT fire on non-terminal transitions (e.g. ACCEPTED → PICKING_UP). `DriverOrdersListRuntime` test asserting `onOpenOrder` is called on a successful accept and an `Alert` is shown (not silently dropped) on a conflict result. `DriverOrderDetailRuntime` test asserting `onResolveConflict` is passed and triggers `router.back()`.
