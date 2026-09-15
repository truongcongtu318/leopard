# Mobile UI Flow Audit & Regression Test Suite Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a verified, up-to-date test suite (`*.audit.test.tsx` / `*.audit.test.ts`) across `apps/driver` and `apps/mobile` that encodes the correct behavior for every driver/customer UI flow tied to `docs/api/05-driver-backend-api-refactor-spec.md`, so every currently-broken or missing flow has a named, failing test that stands as regression evidence until fixed — mirroring the project's existing `.audit.test.*` convention (see `apps/driver/src/features/orders/socket-contract.audit.test.ts`).

**Architecture:** This is an **audit-test-first** plan, not a standard TDD-to-green plan. Each task writes a test that asserts the *correct* behavior per the backend spec / product intent. For flows already broken, the new test is expected to go RED and stays RED — that RED result **is** the deliverable (documented proof of the gap), matching the repo's existing pattern: *"Audit assertions encode the intended BE contract. They deliberately remain RED until the implementation is corrected."* Only two small production-code changes are included (Task 8's minimal `DriverIncidentModal` stub and Task 8's button wiring) because there is currently zero UI surface to assert against for incident reporting — everything else is test-only. Fixing the other 11 confirmed bugs is explicitly out of scope for this plan; it produces the verification harness a follow-up fix plan will turn green.

**Tech Stack:** Expo/React Native (v57 / RN 0.86), Jest + `@testing-library/react-native`, TanStack Query, Expo Router (mocked in tests).

**Spec:** [docs/api/05-driver-backend-api-refactor-spec.md](../../api/05-driver-backend-api-refactor-spec.md) — backend contract (vehicle matching, dynamic contact projection, incident reporting, delivery proof gate, realtime cancellation). This plan's tests assert the **mobile UI** side of that contract.

## Global Constraints

- Every new test file follows the existing naming convention: `<Component>.audit.test.tsx` (or `.ts` for non-component logic) when it documents a confirmed gap; a plain `.test.tsx` when it verifies something already fixed (e.g. Task 4's badge regression test).
- Every audit test file must open with the same header comment used in existing audit tests: `// Audit expectations express desired behavior. Known failures are deliberately retained as regression evidence.`
- Use RTL query priority: `getByRole` + accessible name first, `getByText` only when no role/label exists, never `getByTestId` unless the codebase already exposes one for that element (e.g. `testID="route-map-schematic"`).
- Mock at the adapter/port boundary (`createDriverHttpAdapter`, `createDriverProofAdapter`, the customer `adapter.ts` functions) — never mock `react`, and never mock the component under test.
- Every async interaction (`fireEvent.press` on an item that triggers a promise) must be followed by `waitFor`/`findBy*`, per `apps/driver/src/features/orders/DriverOrderDetailRuntime.audit.test.tsx`.
- Do not fix the 11 non-D-08 bugs as part of this plan — only Task 8 introduces production code (the incident modal did not exist to test against).
- Run `pnpm --filter driver test` / `pnpm --filter mobile test` after each task; a task is done when its new test file executes (RED or GREEN as specified) — not when the suite fully passes.

---

## File Structure

### `apps/driver` (new/modified files)

| File | Purpose |
|---|---|
| `apps/driver/src/auth/session-restore.audit.test.tsx` [NEW] | D-01: session restore must call `refreshSession()` before declaring the user logged out |
| `apps/driver/src/features/orders/idle-location-ping.audit.test.ts` [NEW] | D-03a: stationary heartbeat must still PATCH `/driver/location` |
| `apps/driver/src/auth/DriverSettingsScreen.audit.test.tsx` [NEW] | D-03b: "auto offline after this trip" toggle must exist and be wired |
| `apps/driver/src/features/orders/IncomingDispatchModal.test.tsx` [MODIFY] | D-04: strengthen existing vehicle-badge assertion into a structural regression test |
| `apps/driver/src/features/orders/DriverOrderDetailScreen.navigation.audit.test.tsx` [NEW] | D-05: Maps button must target pickup (origin) before pickup, dropoff (destination) after, using GPS coords |
| `apps/driver/src/features/orders/DriverOrderDetailScreen.calling.audit.test.tsx` [NEW] | D-06: call button must never fall back to `19001234` |
| `apps/driver/src/features/orders/DriverIncidentModal.tsx` [NEW, minimal] | D-08: incident-reason picker modal (does not yet exist) |
| `apps/driver/src/features/orders/DriverIncidentModal.test.tsx` [NEW] | D-08: modal renders reasons, validates "other" note, calls `reportIncident` |
| `apps/driver/src/features/orders/DriverOrderDetailScreen.incident.audit.test.tsx` [NEW] | D-08: order detail screen must expose a "Báo sự cố" button wired to the modal |

### `apps/mobile` (new files)

| File | Purpose |
|---|---|
| `apps/mobile/src/features/customer/orders/create-order-idempotency.audit.test.ts` [NEW] | C-01: `createOrder` must send `clientRequestId`; submit must guard against double-tap |
| `apps/mobile/src/features/customer/orders/components/VietQRPaymentModal.audit.test.tsx` [NEW] | C-02: QR modal must warn when the order is already cancelled |
| `apps/mobile/src/features/customer/orders/CustomerOrderDetailRuntime.tracking.audit.test.tsx` [NEW] | C-03: live tracking/polling must be active from `REQUESTED`/`ACCEPTED`, not just once a QR exists |
| `apps/mobile/src/features/customer/orders/CustomerOrderDetailScreen.driverContact.audit.test.tsx` [NEW] | C-04: call-driver button must use the real driver phone, never the hardcoded number |
| `apps/mobile/src/features/customer/orders/CustomerOrderDetailScreen.cargo.audit.test.tsx` [NEW] | C-05: cargo section must never show the "Xi măng / 250 kg / bốc xếp 2 đầu" mock fallback |
| `apps/mobile/src/features/customer/orders/CustomerOrderDetailRuntime.cancellation.audit.test.tsx` [NEW] | C-06: a system-driven `CANCELLED`/`INCIDENT_CANCELLED` status push must surface a reason + "book again" sheet |

---

## Task 1: D-01 — Session restore must attempt refresh before forcing logout

**Files:**
- Create: `apps/driver/src/auth/session-restore.audit.test.tsx`
- Read (no changes): `apps/driver/app/index.tsx`, `packages/mobile-core/src/auth/session-store.ts`, `packages/mobile-core/src/api/http-client.ts`

**Interfaces:**
- Consumes: `sessionStore.hydrate(): Promise<boolean>`, `sessionStore.getAccessToken(): string | null`, `sessionStore.getRefreshToken(): Promise<string | null>`, `refreshSession(): Promise<boolean>` (all from `@leopard/mobile-core`), `resolveDriverLogin(input: { isAuthenticated: boolean; role: Role | null }): DriverLoginOutcome` (from `../src/navigation/driver-session`).
- Produces: nothing consumed by later tasks — this is a leaf test.

Confirmed bug (`apps/driver/app/index.tsx:14-19`): after `hydrate()`, the effect reads `sessionStore.getAccessToken()` — which is always `null` post cold-start because the access token is RAM-only and `hydrate()` only restores `refreshToken`/`role` — and never calls `refreshSession()`, so a driver with a valid refresh token is sent to `/login` on every app restart.

- [ ] **Step 1: Write the failing test**

```tsx
// apps/driver/src/auth/session-restore.audit.test.tsx
import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';
import { render, waitFor, cleanup } from '@testing-library/react-native';

// Audit expectations express desired behavior. Known failures are deliberately
// retained as regression evidence.

const mockReplace = jest.fn();
jest.mock('expo-router', () => ({ useRouter: () => ({ replace: mockReplace }) }));

const hydrate = jest.fn<() => Promise<boolean>>().mockResolvedValue(true);
const getAccessToken = jest.fn<() => string | null>().mockReturnValue(null);
const getRefreshToken = jest.fn<() => Promise<string | null>>().mockResolvedValue('valid-refresh-token');
const getRole = jest.fn().mockReturnValue('DRIVER');
const refreshSession = jest.fn<() => Promise<boolean>>().mockResolvedValue(true);

jest.mock('@leopard/mobile-core', () => ({
  __esModule: true,
  sessionStore: { hydrate, getAccessToken, getRefreshToken, getRole },
  refreshSession,
}));

import DriverIndex from '../../app/index';

describe('Driver cold-start session restore audit', () => {
  beforeEach(() => jest.clearAllMocks());
  afterEach(() => cleanup());

  it('attempts a token refresh before treating a hydrated driver as logged out', async () => {
    hydrate.mockResolvedValue(true);
    getAccessToken.mockReturnValue(null);
    getRefreshToken.mockResolvedValue('valid-refresh-token');
    refreshSession.mockResolvedValue(true);

    render(<DriverIndex />);

    await waitFor(() => expect(refreshSession).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(mockReplace).toHaveBeenCalledWith('/orders'));
    expect(mockReplace).not.toHaveBeenCalledWith('/(public)/login');
  });

  it('only redirects to login when there is no refresh token to recover with', async () => {
    hydrate.mockResolvedValue(true);
    getAccessToken.mockReturnValue(null);
    getRefreshToken.mockResolvedValue(null);

    render(<DriverIndex />);

    await waitFor(() => expect(mockReplace).toHaveBeenCalledWith('/(public)/login'));
    expect(refreshSession).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter driver test -- src/auth/session-restore.audit.test.tsx`
Expected: FAIL on the first test — `refreshSession` is never called and `mockReplace` receives `/(public)/login` instead of `/orders`, confirming D-01.

- [ ] **Step 3: No implementation step — this is audit-only**

Do not modify `app/index.tsx` in this plan. Leave the test RED.

- [ ] **Step 4: Confirm the second (control) case passes**

Run the same command; the second test ("only redirects... no refresh token") should PASS since it matches current behavior — this proves the test file itself is correctly wired, not just failing due to a mock mistake.

- [ ] **Step 5: Commit**

```bash
git add apps/driver/src/auth/session-restore.audit.test.tsx
git commit -m "test(driver): add audit test for cold-start session refresh gap (D-01)"
```

---

## Task 2: D-03a — Stationary drivers must not disappear from the 90s radar

**Files:**
- Create: `apps/driver/src/features/orders/idle-location-ping.audit.test.ts`
- Read: `apps/driver/src/features/orders/idle-location-ping.ts`

**Interfaces:**
- Consumes: `DriverIdleLocationPing` class — constructor `(client: IdleLocationHttpClient, location: LocationProvider, intervalMs?: number)`, `.start()`, `.stop()`.
- Produces: nothing for later tasks.

Confirmed bug (`idle-location-ping.ts:84-86`): `tick()` returns early — skipping the `PATCH /driver/location` call — whenever the driver has moved less than `MIN_MOVE_METERS` (25m) since the last successful ping. A driver parked for the backend's 90-second radar window (`docs/api/05-driver-backend-api-refactor-spec.md` §3.2.A) drops off dispatch.

- [ ] **Step 1: Write the failing test**

```ts
// apps/driver/src/features/orders/idle-location-ping.audit.test.ts
import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';
import { DriverIdleLocationPing } from './idle-location-ping';

// Audit expectations express desired behavior. Known failures are deliberately
// retained as regression evidence.
describe('DriverIdleLocationPing audit: stationary radar heartbeat', () => {
  const patch = jest.fn().mockResolvedValue(undefined);
  const client = { patch };
  const samePoint = { coords: { latitude: 10.7326, longitude: 106.7168 } };
  const location = {
    requestForegroundPermissionsAsync: jest.fn().mockResolvedValue({ status: 'granted' }),
    getCurrentPositionAsync: jest.fn().mockResolvedValue(samePoint),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
  });
  afterEach(() => jest.useRealTimers());

  it('still PATCHes /driver/location on the 90s heartbeat even when the driver has not moved', async () => {
    const ping = new DriverIdleLocationPing(client as any, location as any, 12_000);
    ping.start();

    // 8 ticks * 12s = 96s of standing still — must have pinged at least once
    // past the 90s mark to keep the backend's lastKnownAt fresh.
    for (let i = 0; i < 8; i += 1) {
      await jest.advanceTimersByTimeAsync(12_000);
    }
    ping.stop();

    expect(patch).toHaveBeenCalledWith(
      '/driver/location',
      expect.objectContaining({ isStationaryHeartbeat: true }),
    );
    expect(patch.mock.calls.length).toBeGreaterThanOrEqual(2);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter driver test -- src/features/orders/idle-location-ping.audit.test.ts`
Expected: FAIL — `patch` is called exactly once (the initial `void this.tick()` in `start()`), then every subsequent tick short-circuits at the `MIN_MOVE_METERS` check, so no `isStationaryHeartbeat` payload is ever sent (that field doesn't exist in the current `tick()` at all — the test fails both on call count and on shape).

- [ ] **Step 3: No implementation step — audit-only**

- [ ] **Step 4: Commit**

```bash
git add apps/driver/src/features/orders/idle-location-ping.audit.test.ts
git commit -m "test(driver): add audit test for missing stationary heartbeat ping (D-03a)"
```

---

## Task 3: D-03b — "Auto offline after this trip" toggle must exist

**Files:**
- Create: `apps/driver/src/auth/DriverSettingsScreen.audit.test.tsx`
- Read: `apps/driver/src/auth/DriverSettingsScreen.tsx` (confirm current 8 `Switch` controls before writing the test's negative assertion)

**Interfaces:**
- Consumes: `DriverSettingsScreen` component's public props (read the file first; do not assume a specific prop name beyond what's used by sibling screens — mirror `DriverScreens.test.tsx`'s render helper).
- Produces: nothing for later tasks.

Confirmed gap: no `autoOfflineOnComplete` control exists anywhere in `apps/driver/src` (`grep` returned zero matches). The backend already supports `PATCH /driver/availability { autoOfflineOnComplete: boolean }` (spec §3.2.B).

- [ ] **Step 1: Write the failing test**

```tsx
// apps/driver/src/auth/DriverSettingsScreen.audit.test.tsx
import { afterEach, describe, expect, it } from '@jest/globals';
import { cleanup, render, screen } from '@testing-library/react-native';
import { DriverSettingsScreen } from './DriverSettingsScreen';

// Audit expectations express desired behavior. Known failures are deliberately
// retained as regression evidence.
describe('DriverSettingsScreen audit: end-of-shift auto-offline control', () => {
  afterEach(() => cleanup());

  it('exposes a switch to automatically go OFFLINE after the current trip completes', () => {
    render(<DriverSettingsScreen />);

    expect(
      screen.getByRole('switch', { name: /tự động nghỉ sau chuyến này/i }),
    ).toBeTruthy();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter driver test -- src/auth/DriverSettingsScreen.audit.test.tsx`
Expected: FAIL with a `getByRole` "unable to find an element" error — confirms no such switch exists (D-03b). If `DriverSettingsScreen` requires props/providers not shown above, adjust the render call to match the pattern in `DriverScreens.test.tsx`, but keep the assertion itself unchanged.

- [ ] **Step 3: No implementation step — audit-only**

- [ ] **Step 4: Commit**

```bash
git add apps/driver/src/auth/DriverSettingsScreen.audit.test.tsx
git commit -m "test(driver): add audit test for missing auto-offline-after-trip toggle (D-03b)"
```

---

## Task 4: D-04 — Lock in the vehicle-type badge fix with a structural test

**Files:**
- Modify: `apps/driver/src/features/orders/IncomingDispatchModal.test.tsx`
- Read: `apps/driver/src/features/orders/IncomingDispatchModal.tsx` (lines 229-233 confirmed: `specChip` with `IconSpeedTruck` + `offer.vehicleLabel`)

**Interfaces:**
- Consumes: `IncomingDispatchModal` props including an `offer` object with `vehicleLabel: string` (populated via `formatVehicleLabel` in `dispatch-offer-listener.ts:27`).

This is the one item (of 14) already fixed by the recent UI-overhaul commits. The existing test reportedly only asserts the label text renders somewhere, which would also pass for a plain, unstyled `<Text>` — it doesn't lock in that the badge is a distinct visual chip. Add a regression assertion so a future refactor can't silently drop the chip back to plain inline text.

- [ ] **Step 1: Write the regression assertion (append to existing describe block)**

```tsx
// apps/driver/src/features/orders/IncomingDispatchModal.test.tsx (append)
it('renders the vehicle type as a distinct spec chip, not inline text', () => {
  const offer = createDispatchOfferFixture({ vehicleType: 'TRUCK' });
  render(<IncomingDispatchModal offer={offer} onAccept={jest.fn()} onDecline={jest.fn()} />);

  const chip = screen.getByTestId('dispatch-vehicle-spec-chip');
  expect(chip).toBeTruthy();
  expect(screen.getByText('Xe tải')).toBeTruthy();
});
```

Note for implementer: if `IncomingDispatchModal.tsx:229-233`'s `specChip` View has no `testID` yet, add `testID="dispatch-vehicle-spec-chip"` to that View as part of this task (this is the one trivial, low-risk production touch justified by "lock in an already-fixed regression" rather than "fix a new bug").

- [ ] **Step 2: Run test to verify it passes**

Run: `pnpm --filter driver test -- src/features/orders/IncomingDispatchModal.test.tsx`
Expected: PASS (badge already renders; only the `testID` addition is new).

- [ ] **Step 3: Commit**

```bash
git add apps/driver/src/features/orders/IncomingDispatchModal.tsx apps/driver/src/features/orders/IncomingDispatchModal.test.tsx
git commit -m "test(driver): lock in vehicle-type spec chip on dispatch modal (D-04)"
```

---

## Task 5: D-05 — Maps navigation must target the current leg, with GPS coordinates

**Files:**
- Create: `apps/driver/src/features/orders/DriverOrderDetailScreen.navigation.audit.test.tsx`
- Read: `apps/driver/src/features/orders/DriverOrderDetailScreen.tsx:35-38` (`openExternalNavigation`), `:959`, `:986-994`, `:1032-1034` (call sites always pass `destinationLabel`), `apps/driver/src/features/orders/fixtures.ts` (`createDriverDetailFixture`)

**Interfaces:**
- Consumes: `DriverOrderDetailScreen` component, `view.order.route.origin.label` / `view.order.route.destination.label`, fixture keys `'D-DETAIL-ACCEPTED'`, `'D-DETAIL-IN-TRANSIT'` (confirm the exact IN_TRANSIT fixture key name in `fixtures.ts` before writing; the plan assumes it follows the `D-DETAIL-<STATUS>` convention already seen for `D-DETAIL-ACCEPTED` / `D-DETAIL-PICKING-UP` / `D-DETAIL-PROOF-REQUIRED`).

Confirmed bug: the "Mở Google Maps chỉ đường" button (accessible name confirmed at `DriverOrderDetailScreen.tsx:689`) always calls `openExternalNavigation(view.order.route.destination.label)` — even in `ACCEPTED`/`PICKING_UP`, when the driver should be routed to the **pickup** point — and always uses a text label, never `lat,lng`.

- [ ] **Step 1: Write the failing test**

```tsx
// apps/driver/src/features/orders/DriverOrderDetailScreen.navigation.audit.test.tsx
import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';
import { Linking } from 'react-native';
import { cleanup, fireEvent, render, screen } from '@testing-library/react-native';
import { DriverOrderDetailScreen } from './DriverOrderDetailScreen';
import { createDriverDetailFixture } from './fixtures';

// Audit expectations express desired behavior. Known failures are deliberately
// retained as regression evidence.
describe('DriverOrderDetailScreen audit: maps navigation targets the current leg', () => {
  beforeEach(() => {
    jest.spyOn(Linking, 'openURL').mockResolvedValue(true);
  });
  afterEach(() => {
    jest.restoreAllMocks();
    cleanup();
  });

  it('routes to the pickup point while ACCEPTED, using GPS coordinates', () => {
    const view = createDriverDetailFixture('D-DETAIL-ACCEPTED');
    render(<DriverOrderDetailScreen view={view} />);

    fireEvent.press(screen.getByRole('button', { name: 'Mở Google Maps chỉ đường' }));

    const { origin } = view.order.route;
    expect(Linking.openURL).toHaveBeenCalledWith(
      expect.stringContaining(`destination=${origin.lat}%2C${origin.lng}`),
    );
  });

  it('routes to the dropoff point while IN_TRANSIT, using GPS coordinates', () => {
    const view = createDriverDetailFixture('D-DETAIL-IN-TRANSIT');
    render(<DriverOrderDetailScreen view={view} />);

    fireEvent.press(screen.getByRole('button', { name: 'Mở Google Maps chỉ đường' }));

    const { destination } = view.order.route;
    expect(Linking.openURL).toHaveBeenCalledWith(
      expect.stringContaining(`destination=${destination.lat}%2C${destination.lng}`),
    );
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter driver test -- src/features/orders/DriverOrderDetailScreen.navigation.audit.test.tsx`
Expected: FAIL on both — `openExternalNavigation` always encodes `route.destination.label` (a text address), never `lat,lng`, and never switches to `origin` for the ACCEPTED case. If the fixture for IN_TRANSIT has a different key name, adjust the string literal but keep the assertion intent (dropoff coords used once in-transit).

- [ ] **Step 3: No implementation step — audit-only**

- [ ] **Step 4: Commit**

```bash
git add apps/driver/src/features/orders/DriverOrderDetailScreen.navigation.audit.test.tsx
git commit -m "test(driver): add audit test for maps button ignoring current leg / using text address (D-05)"
```

---

## Task 6: D-06 — Call button must never fall back to the hotline

**Files:**
- Create: `apps/driver/src/features/orders/DriverOrderDetailScreen.calling.audit.test.tsx`
- Read: `apps/driver/src/features/orders/DriverOrderDetailScreen.tsx:41-45` (`callPhoneNumber`), `:617-627` (contact card call button, accessible name `"Gọi điện thoại"`)

**Interfaces:**
- Consumes: `DriverOrderDetailScreen` + `createDriverDetailFixture`.

Confirmed bug (`DriverOrderDetailScreen.tsx:41-45`): `callPhoneNumber` regex-matches 8-15 digits out of the contact string; if nothing matches, it dials the fallback `'19001234'` (a real hotline number) instead of surfacing an error.

- [ ] **Step 1: Write the failing test**

```tsx
// apps/driver/src/features/orders/DriverOrderDetailScreen.calling.audit.test.tsx
import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';
import { Linking } from 'react-native';
import { cleanup, fireEvent, render, screen } from '@testing-library/react-native';
import { DriverOrderDetailScreen } from './DriverOrderDetailScreen';
import { createDriverDetailFixture } from './fixtures';

// Audit expectations express desired behavior. Known failures are deliberately
// retained as regression evidence.
describe('DriverOrderDetailScreen audit: call button never dials the hotline fallback', () => {
  beforeEach(() => {
    jest.spyOn(Linking, 'openURL').mockResolvedValue(true);
  });
  afterEach(() => {
    jest.restoreAllMocks();
    cleanup();
  });

  it('does not dial 19001234 when the contact string has no parseable phone number', () => {
    const view = createDriverDetailFixture('D-DETAIL-ACCEPTED');
    const brokenView = {
      ...view,
      order: {
        ...view.order,
        customerContact: 'Chị Lan (Chủ shop)', // no phone digits present
      },
    };
    render(<DriverOrderDetailScreen view={brokenView as typeof view} />);

    fireEvent.press(screen.getByRole('button', { name: 'Gọi điện thoại' }));

    expect(Linking.openURL).not.toHaveBeenCalledWith(expect.stringContaining('19001234'));
  });

  it('dials the real parsed number when one is present', () => {
    const view = createDriverDetailFixture('D-DETAIL-ACCEPTED');
    const withPhone = {
      ...view,
      order: { ...view.order, customerContact: 'Chị Lan (Chủ shop) — 0912345678' },
    };
    render(<DriverOrderDetailScreen view={withPhone as typeof view} />);

    fireEvent.press(screen.getByRole('button', { name: 'Gọi điện thoại' }));

    expect(Linking.openURL).toHaveBeenCalledWith('tel:0912345678');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter driver test -- src/features/orders/DriverOrderDetailScreen.calling.audit.test.tsx`
Expected: the first test FAILS (`Linking.openURL` is called with `'tel:19001234'`); the second PASSES (proves the file is correctly wired, not failing on a setup mistake). Adjust the `customerContact` field path if the real prop name on `view.order` differs — confirm via `DriverDetailContentView` in `./model.ts` before finalizing.

- [ ] **Step 3: No implementation step — audit-only**

- [ ] **Step 4: Commit**

```bash
git add apps/driver/src/features/orders/DriverOrderDetailScreen.calling.audit.test.tsx
git commit -m "test(driver): add audit test for hotline fallback on unparseable contact (D-06)"
```

---

## Task 7: D-08 — Incident reporting UI is completely missing

This is the one task in the plan that adds production code, because there is nothing to assert against otherwise. Keep the modal minimal — this plan's job is to prove the gap and give the fix-plan a concrete starting shape, not to fully implement incident handling (contact projection, socket events, etc. are out of scope here).

**Files:**
- Create: `apps/driver/src/features/orders/DriverIncidentModal.tsx`
- Create: `apps/driver/src/features/orders/DriverIncidentModal.test.tsx`
- Create: `apps/driver/src/features/orders/DriverOrderDetailScreen.incident.audit.test.tsx`
- Read: `docs/api/05-driver-backend-api-refactor-spec.md` §3.6 for the 6 `incidentReason` codes and request shape.

**Interfaces:**
- Produces: `DriverIncidentModal` component — `type Props = { visible: boolean; onSubmit: (input: { reason: IncidentReason; note?: string }) => void; onClose: () => void }`.
- `type IncidentReason = 'VEHICLE_BREAKDOWN' | 'SENDER_NO_SHOW' | 'SENDER_CANCELLED' | 'RECIPIENT_REJECTED' | 'WRONG_ADDRESS' | 'FORCE_MAJEURE' | 'OTHER'`.

- [ ] **Step 1: Write the failing test for the order-detail screen's missing entry point**

```tsx
// apps/driver/src/features/orders/DriverOrderDetailScreen.incident.audit.test.tsx
import { afterEach, describe, expect, it } from '@jest/globals';
import { cleanup, render, screen } from '@testing-library/react-native';
import { DriverOrderDetailScreen } from './DriverOrderDetailScreen';
import { createDriverDetailFixture } from './fixtures';

// Audit expectations express desired behavior. Known failures are deliberately
// retained as regression evidence.
describe('DriverOrderDetailScreen audit: incident exit route entry point', () => {
  afterEach(() => cleanup());

  it('offers a "Báo sự cố" action while an order is ACCEPTED/PICKING_UP/IN_TRANSIT', () => {
    const view = createDriverDetailFixture('D-DETAIL-ACCEPTED');
    render(<DriverOrderDetailScreen view={view} />);

    expect(screen.getByRole('button', { name: /báo sự cố/i })).toBeTruthy();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter driver test -- src/features/orders/DriverOrderDetailScreen.incident.audit.test.tsx`
Expected: FAIL — no such button exists anywhere in the driver app (confirmed repo-wide `grep` for "incident" returns zero matches).

- [ ] **Step 3: Write the modal component (minimal, testable shape)**

```tsx
// apps/driver/src/features/orders/DriverIncidentModal.tsx
import { useState } from 'react';
import { Modal, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { colors, radius, spacing, typography, Button } from '@leopard/mobile-core';

export type IncidentReason =
  | 'VEHICLE_BREAKDOWN'
  | 'SENDER_NO_SHOW'
  | 'SENDER_CANCELLED'
  | 'RECIPIENT_REJECTED'
  | 'WRONG_ADDRESS'
  | 'FORCE_MAJEURE'
  | 'OTHER';

const REASON_LABELS: Readonly<Record<IncidentReason, string>> = {
  VEHICLE_BREAKDOWN: 'Hỏng xe / tai nạn',
  SENDER_NO_SHOW: 'Người gửi không có mặt',
  SENDER_CANCELLED: 'Người gửi hủy tại chỗ',
  RECIPIENT_REJECTED: 'Người nhận từ chối / khách bom hàng',
  WRONG_ADDRESS: 'Sai địa chỉ',
  FORCE_MAJEURE: 'Bất khả kháng (thời tiết, phong tỏa)',
  OTHER: 'Lý do khác',
};

export type DriverIncidentModalProps = Readonly<{
  visible: boolean;
  onSubmit: (input: { reason: IncidentReason; note?: string }) => void;
  onClose: () => void;
}>;

export function DriverIncidentModal({ visible, onSubmit, onClose }: DriverIncidentModalProps) {
  const [reason, setReason] = useState<IncidentReason | null>(null);
  const [note, setNote] = useState('');
  const requiresNote = reason === 'OTHER';
  const canSubmit = reason !== null && (!requiresNote || note.trim().length > 0);

  return (
    <Modal animationType="slide" transparent visible={visible}>
      <View style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.4)' }}>
        <View style={{ backgroundColor: colors.surface, borderTopLeftRadius: radius.lg, borderTopRightRadius: radius.lg, padding: spacing.lg }}>
          <Text style={typography.h3} accessibilityRole="header">Báo sự cố giao hàng</Text>
          <ScrollView>
            {(Object.keys(REASON_LABELS) as IncidentReason[]).map((key) => (
              <Pressable
                key={key}
                accessibilityRole="radio"
                accessibilityState={{ checked: reason === key }}
                onPress={() => setReason(key)}
                style={{ paddingVertical: spacing.sm }}
              >
                <Text>{REASON_LABELS[key]}</Text>
              </Pressable>
            ))}
          </ScrollView>
          {requiresNote ? (
            <TextInput
              accessibilityLabel="Ghi chú sự cố"
              onChangeText={setNote}
              placeholder="Mô tả chi tiết lý do..."
              style={{ borderWidth: 1, borderColor: colors.border, borderRadius: radius.sm, padding: spacing.sm }}
              value={note}
            />
          ) : null}
          <Button
            disabled={!canSubmit}
            label="Gửi báo cáo"
            onPress={() => reason && onSubmit({ reason, note: note.trim() || undefined })}
          />
          <Pressable accessibilityRole="button" onPress={onClose}>
            <Text>Hủy</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}
```

- [ ] **Step 4: Write the modal's own test**

```tsx
// apps/driver/src/features/orders/DriverIncidentModal.test.tsx
import { afterEach, describe, expect, it, jest } from '@jest/globals';
import { cleanup, fireEvent, render, screen } from '@testing-library/react-native';
import { DriverIncidentModal } from './DriverIncidentModal';

describe('DriverIncidentModal', () => {
  afterEach(() => cleanup());

  it('lists all six standard incident reasons plus "other"', () => {
    render(<DriverIncidentModal visible onClose={jest.fn()} onSubmit={jest.fn()} />);
    ['Hỏng xe / tai nạn', 'Người gửi không có mặt', 'Người gửi hủy tại chỗ', 'Người nhận từ chối / khách bom hàng', 'Sai địa chỉ', 'Bất khả kháng (thời tiết, phong tỏa)', 'Lý do khác'].forEach((label) => {
      expect(screen.getByText(label)).toBeTruthy();
    });
  });

  it('requires a note when "Lý do khác" is selected', () => {
    const onSubmit = jest.fn();
    render(<DriverIncidentModal visible onClose={jest.fn()} onSubmit={onSubmit} />);

    fireEvent.press(screen.getByText('Lý do khác'));
    fireEvent.press(screen.getByText('Gửi báo cáo'));
    expect(onSubmit).not.toHaveBeenCalled();

    fireEvent.changeText(screen.getByLabelText('Ghi chú sự cố'), 'Khách không nghe máy 3 lần');
    fireEvent.press(screen.getByText('Gửi báo cáo'));
    expect(onSubmit).toHaveBeenCalledWith({ reason: 'OTHER', note: 'Khách không nghe máy 3 lần' });
  });

  it('submits immediately for a standard reason with no note', () => {
    const onSubmit = jest.fn();
    render(<DriverIncidentModal visible onClose={jest.fn()} onSubmit={onSubmit} />);

    fireEvent.press(screen.getByText('Hỏng xe / tai nạn'));
    fireEvent.press(screen.getByText('Gửi báo cáo'));

    expect(onSubmit).toHaveBeenCalledWith({ reason: 'VEHICLE_BREAKDOWN', note: undefined });
  });
});
```

- [ ] **Step 5: Run the modal test to verify it passes**

Run: `pnpm --filter driver test -- src/features/orders/DriverIncidentModal.test.tsx`
Expected: PASS — this is a genuinely new, self-contained component with no wiring into the screen yet.

- [ ] **Step 6: Confirm the screen-level audit test in Step 1 is still RED**

Run: `pnpm --filter driver test -- src/features/orders/DriverOrderDetailScreen.incident.audit.test.tsx`
Expected: still FAILS — the modal exists now, but `DriverOrderDetailScreen` does not render a "Báo sự cố" button or mount `DriverIncidentModal` yet. Wiring it in (plus calling `reportIncident` on the adapter) is explicitly left to the follow-up fix plan.

- [ ] **Step 7: Commit**

```bash
git add apps/driver/src/features/orders/DriverIncidentModal.tsx apps/driver/src/features/orders/DriverIncidentModal.test.tsx apps/driver/src/features/orders/DriverOrderDetailScreen.incident.audit.test.tsx
git commit -m "feat(driver): add minimal incident report modal + audit test for missing entry point (D-08)"
```

---

## Task 8: C-01 — Order creation must be idempotent and double-tap safe

**Files:**
- Create: `apps/mobile/src/features/customer/orders/create-order-idempotency.audit.test.ts`
- Read: `apps/mobile/src/features/customer/orders/adapter.ts:1076-1157` (`createOrder`), `:1379-1387` (`createPaymentQr`'s existing `clientRequestId` pattern to mirror)

**Interfaces:**
- Consumes: `createOrder(input: CreateOrderInput): Promise<...>` exported (or returned by a factory) from `adapter.ts` — read the file to confirm the exact export shape (function vs. method on an adapter object) before finalizing the import line below.

Confirmed bug: `createOrder` never generates a `clientRequestId`, unlike `createPaymentQr` in the same file which does (`crypto.randomUUID()` fallback to `req-${Date.now()}-...`).

- [ ] **Step 1: Write the failing test**

```ts
// apps/mobile/src/features/customer/orders/create-order-idempotency.audit.test.ts
import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';

// Audit expectations express desired behavior. Known failures are deliberately
// retained as regression evidence.
const request = jest.fn().mockResolvedValue({ id: 'order-1', status: 'REQUESTED' });
jest.mock('@leopard/mobile-core', () => ({ httpClient: { post: request } }));

import { createOrder } from './adapter';

describe('Customer createOrder audit: idempotency key', () => {
  beforeEach(() => jest.clearAllMocks());
  afterEach(() => jest.restoreAllMocks());

  it('always sends a clientRequestId so a retried/duplicated submit is deduplicated server-side', async () => {
    await createOrder({
      pickup: { lat: 10.77, lng: 106.7 },
      dropoff: { lat: 10.78, lng: 106.71 },
      vehicleType: 'MOTORBIKE',
    } as Parameters<typeof createOrder>[0]);

    expect(request).toHaveBeenCalledWith(
      '/orders',
      expect.objectContaining({ clientRequestId: expect.any(String) }),
    );
    const [, body] = request.mock.calls[0] as [string, { clientRequestId: string }];
    expect(body.clientRequestId).toMatch(/^[0-9a-f-]{36}$|^req-\d+-/);
  });

  it('generates a different clientRequestId per distinct call', async () => {
    await createOrder({ pickup: { lat: 1, lng: 1 }, dropoff: { lat: 2, lng: 2 }, vehicleType: 'MOTORBIKE' } as Parameters<typeof createOrder>[0]);
    await createOrder({ pickup: { lat: 1, lng: 1 }, dropoff: { lat: 2, lng: 2 }, vehicleType: 'MOTORBIKE' } as Parameters<typeof createOrder>[0]);

    const [first, second] = request.mock.calls.map(([, body]: [string, { clientRequestId: string }]) => body.clientRequestId);
    expect(first).not.toEqual(second);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter mobile test -- src/features/customer/orders/create-order-idempotency.audit.test.ts`
Expected: FAIL — `request` (the mocked `httpClient.post`) is called with a body that has no `clientRequestId` key at all, confirmed by `adapter.ts:1096-1121`'s `createPayload` construction. Adjust the import path/shape (named export vs. factory method) once you've read the file — the assertions themselves should not need to change.

- [ ] **Step 3: No implementation step — audit-only**

- [ ] **Step 4: Commit**

```bash
git add apps/mobile/src/features/customer/orders/create-order-idempotency.audit.test.ts
git commit -m "test(mobile): add audit test for missing clientRequestId on createOrder (C-01)"
```

---

## Task 9: C-02 — VietQR screen must warn if the order is already cancelled

**Files:**
- Create: `apps/mobile/src/features/customer/orders/components/VietQRPaymentModal.audit.test.tsx`
- Read: `apps/mobile/src/features/customer/orders/components/VietQRPaymentModal.tsx:15-26` (current props list — confirmed to have no order-status field)

**Interfaces:**
- Consumes: `VietQRPaymentModal` — this task's test asserts the **desired** prop surface (`orderStatus`) before it exists, per the spec's cancellation notice requirement (spec §3.7.A: customer-side cancellation must be visible immediately).

- [ ] **Step 1: Write the failing test**

```tsx
// apps/mobile/src/features/customer/orders/components/VietQRPaymentModal.audit.test.tsx
import { afterEach, describe, expect, it, jest } from '@jest/globals';
import { cleanup, render, screen } from '@testing-library/react-native';
import { VietQRPaymentModal } from './VietQRPaymentModal';

// Audit expectations express desired behavior. Known failures are deliberately
// retained as regression evidence.
describe('VietQRPaymentModal audit: cancelled-order warning', () => {
  afterEach(() => cleanup());

  it('shows a cancellation banner instead of the QR when the order is already CANCELLED', () => {
    render(
      <VietQRPaymentModal
        visible
        orderStatus="CANCELLED"
        qrPayload="00020101021138570010A00000072701270006970..."
        amountVnd={45000}
        onClose={jest.fn()}
      />,
    );

    expect(screen.getByText(/đơn hàng đã bị hủy/i)).toBeTruthy();
    expect(screen.queryByTestId('vietqr-code-image')).toBeNull();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter mobile test -- src/features/customer/orders/components/VietQRPaymentModal.audit.test.tsx`
Expected: FAIL — TypeScript/prop-shape error or a straightforward "text not found" failure, since `VietQRPaymentModal` currently accepts no `orderStatus` prop and always renders the QR. If the component isn't a named export, adjust the import — check `CustomerCreateOrderScreen.tsx:2443-2458` for how it's currently imported/mounted.

- [ ] **Step 3: No implementation step — audit-only**

- [ ] **Step 4: Commit**

```bash
git add apps/mobile/src/features/customer/orders/components/VietQRPaymentModal.audit.test.tsx
git commit -m "test(mobile): add audit test for missing cancelled-order warning on VietQR modal (C-02)"
```

---

## Task 10: C-03 — Order detail must stay live from REQUESTED/ACCEPTED, not just once a QR exists

**Files:**
- Create: `apps/mobile/src/features/customer/orders/CustomerOrderDetailRuntime.tracking.audit.test.tsx`
- Read: `apps/mobile/src/features/customer/orders/CustomerOrderDetailRuntime.tsx:17-19` (`isTrackingEligibleStatus`), `:51` (gate usage), `apps/mobile/src/features/customer/orders/tracking-socket.ts:575-581` (`order:status_changed` handling), sibling test `CustomerOrderDetailRoute.test.tsx` for the mount helper convention.

**Interfaces:**
- Consumes: `CustomerOrderDetailRuntime` component, `getOrderDetailView` port function (mocked), `CustomerTrackingSocketManager` (mocked to a spy).

Confirmed bug: `isTrackingEligibleStatus` only returns `true` for `PICKING_UP`/`IN_TRANSIT`, so the tracking socket is never joined — and no polling `refetchInterval` runs either — while an order sits in `REQUESTED`/`ACCEPTED`, leaving the customer's screen static right after a driver accepts.

- [ ] **Step 1: Write the failing test**

```tsx
// apps/mobile/src/features/customer/orders/CustomerOrderDetailRuntime.tracking.audit.test.tsx
import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, render, waitFor } from '@testing-library/react-native';

// Audit expectations express desired behavior. Known failures are deliberately
// retained as regression evidence.
jest.mock('expo-router', () => ({ useLocalSearchParams: () => ({ id: 'order-1' }) }));

const getOrderDetailView = jest.fn();
jest.mock('./adapter', () => ({ createCustomerHttpAdapter: () => ({ getOrderDetailView }) }));

const joinOrder = jest.fn();
const connect = jest.fn();
jest.mock('./tracking-socket', () => ({
  createCustomerTrackingSocketManager: () => ({ joinOrder, connect, disconnect: jest.fn(), on: jest.fn() }),
}));

import { CustomerOrderDetailRuntime } from './CustomerOrderDetailRuntime';

describe('CustomerOrderDetailRuntime audit: live updates start at REQUESTED', () => {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } });
  beforeEach(() => {
    jest.clearAllMocks();
    getOrderDetailView.mockResolvedValue({ id: 'order-1', status: 'REQUESTED' });
  });
  afterEach(async () => {
    cleanup();
    client.clear();
  });

  it('joins the tracking socket while the order is still REQUESTED, awaiting driver match', async () => {
    render(
      <QueryClientProvider client={client}>
        <CustomerOrderDetailRuntime orderId="order-1" />
      </QueryClientProvider>,
    );

    await waitFor(() => expect(getOrderDetailView).toHaveBeenCalled());
    await waitFor(() => expect(connect).toHaveBeenCalled());
    expect(joinOrder).toHaveBeenCalledWith('order-1');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter mobile test -- src/features/customer/orders/CustomerOrderDetailRuntime.tracking.audit.test.tsx`
Expected: FAIL — `connect`/`joinOrder` are never called because `isTrackingEligibleStatus('REQUESTED')` is `false`. Adjust the mock's shape (`createCustomerTrackingSocketManager` vs. a differently-named factory/singleton import) once confirmed by reading `CustomerOrderDetailRuntime.tsx` in full — the intent of the assertion should not change.

- [ ] **Step 3: No implementation step — audit-only**

- [ ] **Step 4: Commit**

```bash
git add apps/mobile/src/features/customer/orders/CustomerOrderDetailRuntime.tracking.audit.test.tsx
git commit -m "test(mobile): add audit test for frozen order-detail screen during REQUESTED/ACCEPTED (C-03)"
```

---

## Task 11: C-04 — Call-driver button must use the real driver phone

**Files:**
- Create: `apps/mobile/src/features/customer/orders/CustomerOrderDetailScreen.driverContact.audit.test.tsx`
- Read: `apps/mobile/src/features/customer/orders/CustomerOrderDetailScreen.tsx:111-136` (`DriverCard`), confirmed hardcode at `:129-130`.

**Interfaces:**
- Consumes: `CustomerOrderDetailScreen` (or its `DriverCard` sub-component, whichever is exported/testable per the file — prefer testing `DriverCard` directly if it's exported, otherwise mount the full screen with a `view` fixture, per the pattern in `CustomerScreens.test.tsx`).

Confirmed bug: `Linking.openURL('tel:0901234567')` is hardcoded; `DriverCard` never receives a real phone prop, and `MappedOrderResponse` (`adapter.ts:255-279`) has no driver phone field at all.

- [ ] **Step 1: Write the failing test**

```tsx
// apps/mobile/src/features/customer/orders/CustomerOrderDetailScreen.driverContact.audit.test.tsx
import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';
import { Linking } from 'react-native';
import { cleanup, fireEvent, render, screen } from '@testing-library/react-native';
import { CustomerOrderDetailScreen } from './CustomerOrderDetailScreen';
import { createCustomerDetailFixture } from './fixtures';

// Audit expectations express desired behavior. Known failures are deliberately
// retained as regression evidence.
describe('CustomerOrderDetailScreen audit: call-driver uses the real phone number', () => {
  beforeEach(() => jest.spyOn(Linking, 'openURL').mockResolvedValue(true));
  afterEach(() => {
    jest.restoreAllMocks();
    cleanup();
  });

  it('dials the assigned driver\'s real phone number, not the placeholder 0901234567', () => {
    const view = createCustomerDetailFixture('C-DETAIL-PICKING-UP');
    const withRealDriverPhone = {
      ...view,
      order: { ...view.order, driver: { ...view.order.driver, phone: '0987654321' } },
    };
    render(<CustomerOrderDetailScreen view={withRealDriverPhone as typeof view} />);

    fireEvent.press(screen.getByRole('button', { name: /gọi (tài xế|điện thoại)/i }));

    expect(Linking.openURL).toHaveBeenCalledWith('tel:0987654321');
    expect(Linking.openURL).not.toHaveBeenCalledWith('tel:0901234567');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter mobile test -- src/features/customer/orders/CustomerOrderDetailScreen.driverContact.audit.test.tsx`
Expected: FAIL — `Linking.openURL` is called with the hardcoded `'tel:0901234567'` regardless of the fixture's driver phone, and `MappedOrderResponse`/the view model has no `driver.phone` field to even set (confirm exact fixture shape/name — `createCustomerDetailFixture` naming assumed from the driver-side convention `createDriverDetailFixture`; adjust to whatever `apps/mobile/.../fixtures.ts` actually exports).

- [ ] **Step 3: No implementation step — audit-only**

- [ ] **Step 4: Commit**

```bash
git add apps/mobile/src/features/customer/orders/CustomerOrderDetailScreen.driverContact.audit.test.tsx
git commit -m "test(mobile): add audit test for hardcoded driver phone number (C-04)"
```

---

## Task 12: C-05 — Cargo section must not show mock fallback data

**Files:**
- Create: `apps/mobile/src/features/customer/orders/CustomerOrderDetailScreen.cargo.audit.test.tsx`
- Read: `apps/mobile/src/features/customer/orders/CustomerOrderDetailScreen.tsx:561,566,571` (confirmed hardcoded fallbacks), `:716-727`'s `extractCargoFromRouteSnapshot` (the correct-data path that already works).

**Interfaces:**
- Consumes: `CustomerOrderDetailScreen`, a fixture/view with `order.cargo.note` and `order.cargo.weightKg` both unset (`null`/`undefined`).

- [ ] **Step 1: Write the failing test**

```tsx
// apps/mobile/src/features/customer/orders/CustomerOrderDetailScreen.cargo.audit.test.tsx
import { afterEach, describe, expect, it } from '@jest/globals';
import { cleanup, render, screen } from '@testing-library/react-native';
import { CustomerOrderDetailScreen } from './CustomerOrderDetailScreen';
import { createCustomerDetailFixture } from './fixtures';

// Audit expectations express desired behavior. Known failures are deliberately
// retained as regression evidence.
describe('CustomerOrderDetailScreen audit: no cargo mock-slop fallback', () => {
  afterEach(() => cleanup());

  it('shows a neutral placeholder instead of "Xi măng (VLXD)" / "250 kg" when the order has no cargo note', () => {
    const view = createCustomerDetailFixture('C-DETAIL-ACCEPTED');
    const noCargoData = {
      ...view,
      order: { ...view.order, cargo: { note: null, weightKg: null, requiresLoadingSupport: false } },
    };
    render(<CustomerOrderDetailScreen view={noCargoData as typeof view} />);

    expect(screen.queryByText('Xi măng (VLXD)')).toBeNull();
    expect(screen.queryByText('250 kg')).toBeNull();
    expect(screen.queryByText('Có bốc xếp 2 đầu')).toBeNull();
    expect(screen.getByText(/hàng hóa tiêu chuẩn/i)).toBeTruthy();
  });

  it('never shows the hardcoded loading-support note when the order does not request it', () => {
    const view = createCustomerDetailFixture('C-DETAIL-ACCEPTED');
    const noLoadingSupport = {
      ...view,
      order: { ...view.order, cargo: { note: 'Đồ điện tử dễ vỡ', weightKg: 12, requiresLoadingSupport: false } },
    };
    render(<CustomerOrderDetailScreen view={noLoadingSupport as typeof view} />);

    expect(screen.queryByText('Có bốc xếp 2 đầu')).toBeNull();
    expect(screen.getByText('Đồ điện tử dễ vỡ')).toBeTruthy();
    expect(screen.getByText('12 kg')).toBeTruthy();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter mobile test -- src/features/customer/orders/CustomerOrderDetailScreen.cargo.audit.test.tsx`
Expected: FAIL on both — `CustomerOrderDetailScreen.tsx:561/566` unconditionally fall back to the mock strings when `note`/`weightKg` are falsy, and line 571's "Có bốc xếp 2 đầu" is rendered unconditionally regardless of `requiresLoadingSupport`.

- [ ] **Step 3: No implementation step — audit-only**

- [ ] **Step 4: Commit**

```bash
git add apps/mobile/src/features/customer/orders/CustomerOrderDetailScreen.cargo.audit.test.tsx
git commit -m "test(mobile): add audit test for hardcoded cargo mock data (C-05)"
```

---

## Task 13: C-06 — System-driven cancellation/incident must surface a reason + rebook CTA

**Files:**
- Create: `apps/mobile/src/features/customer/orders/CustomerOrderDetailRuntime.cancellation.audit.test.tsx`
- Read: `apps/mobile/src/features/customer/orders/CustomerOrderDetailRuntime.tsx:71-74` (`onStatusUpdated` — currently only `query.refetch()`), `adapter.ts:1449-1456` (`executeIntent` — the only path that currently sets a cancellation notice, and only for customer-initiated cancels).

**Interfaces:**
- Consumes: `CustomerOrderDetailRuntime`, the tracking socket's `on('order:status_changed', ...)` callback (mocked to be invoked manually from the test).

- [ ] **Step 1: Write the failing test**

```tsx
// apps/mobile/src/features/customer/orders/CustomerOrderDetailRuntime.cancellation.audit.test.tsx
import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, render, screen, waitFor } from '@testing-library/react-native';

// Audit expectations express desired behavior. Known failures are deliberately
// retained as regression evidence.
jest.mock('expo-router', () => ({ useLocalSearchParams: () => ({ id: 'order-1' }) }));

const getOrderDetailView = jest.fn();
jest.mock('./adapter', () => ({ createCustomerHttpAdapter: () => ({ getOrderDetailView }) }));

let statusChangedHandler: ((payload: { status: string; reason?: string }) => void) | undefined;
jest.mock('./tracking-socket', () => ({
  createCustomerTrackingSocketManager: () => ({
    joinOrder: jest.fn(),
    connect: jest.fn(),
    disconnect: jest.fn(),
    on: jest.fn((event: string, handler: typeof statusChangedHandler) => {
      if (event === 'order:status_changed') statusChangedHandler = handler;
    }),
  }),
}));

import { CustomerOrderDetailRuntime } from './CustomerOrderDetailRuntime';

describe('CustomerOrderDetailRuntime audit: system-driven cancellation notice', () => {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } });
  beforeEach(() => {
    jest.clearAllMocks();
    statusChangedHandler = undefined;
    getOrderDetailView.mockResolvedValue({ id: 'order-1', status: 'IN_TRANSIT' });
  });
  afterEach(async () => {
    cleanup();
    client.clear();
  });

  it('shows a reason + rebook sheet when the driver reports an incident that cancels the order', async () => {
    render(
      <QueryClientProvider client={client}>
        <CustomerOrderDetailRuntime orderId="order-1" />
      </QueryClientProvider>,
    );
    await waitFor(() => expect(getOrderDetailView).toHaveBeenCalled());

    statusChangedHandler?.({ status: 'INCIDENT_CANCELLED', reason: 'Người nhận từ chối nhận hàng' });

    await waitFor(() => expect(screen.getByText(/người nhận từ chối nhận hàng/i)).toBeTruthy());
    expect(screen.getByRole('button', { name: /đặt lại|đặt xe mới/i })).toBeTruthy();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter mobile test -- src/features/customer/orders/CustomerOrderDetailRuntime.cancellation.audit.test.tsx`
Expected: FAIL — the current `onStatusUpdated` handler only calls `query.refetch()`; no reason text or "book again" CTA is ever rendered from a socket-pushed status change (confirmed: no `BottomSheet`/`Modal` referencing `CANCELLED`/`INCIDENT` exists anywhere in the customer orders feature).

- [ ] **Step 3: No implementation step — audit-only**

- [ ] **Step 4: Commit**

```bash
git add apps/mobile/src/features/customer/orders/CustomerOrderDetailRuntime.cancellation.audit.test.tsx
git commit -m "test(mobile): add audit test for missing cancellation/incident notice sheet (C-06)"
```

---

## Self-Review Notes (for the executor)

1. **Fixture/adapter names marked "confirm before finalizing"** (Tasks 5, 6, 8, 10, 11, 12, 13): the driver-app citations (fixture keys, `model.ts` field names) come from direct file reads in this planning session and are high-confidence; the customer-app citations come from a sub-agent's file reads reported back as text, not a second direct read in this session — so before writing each customer test, open the cited file/line once to confirm the exact export name, prop path, and fixture key, then adjust only the names (not the assertions) to match.
2. **D-02 and D-07 already have failing audit coverage** (`driver-register-recovery.audit.test.tsx`, `DriverOrderDetailRuntime.audit.test.tsx`) — do not duplicate; this plan intentionally has no task for them. When the follow-up fix plan lands, these two files are the acceptance test.
3. **D-04's socket-URL sub-bug** already has failing coverage in `socket-contract.audit.test.ts` — Task 4 only adds the badge regression test, it does not re-test the socket prefix.
4. **Scope boundary**: this plan produces RED tests as the deliverable for 11 of 13 tasks. Do not "fix the implementation to make CI green" while executing this plan — that is a separate, subsequent plan scoped from these tests.
