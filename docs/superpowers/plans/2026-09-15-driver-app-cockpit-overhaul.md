# LEOPARD Driver Cockpit Overhaul Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild the LEOPARD Driver app (`apps/driver`) from a fragmented, drawer-and-dock UI into a high-contrast, mission-centric Field Cockpit (Grab Driver / Lalamove style) with Cargo-First dispatch, 4-stage lifecycle, e-POD proof capture, and a streamlined 3-step KYC onboarding wizard with single-vehicle registration.

**Architecture:** A full-bleed live GPS map layer (Layer 0) powers the background. The top HUD displays driver profile, the primary duty toggle switch (ONLINE/OFFLINE), and today's earnings pill. The bottom operational sheet dynamically switches between an Idle radar & cargo load-board when waiting, and a focused Active Trip mission card with `SlideToAction` when running cuốc.

**Tech Stack:** React Native (Expo v57 / React Native 0.86), Expo Router, `@leopard/mobile-core`, `@leopard/shared`, TanStack React Query, TypeScript.

**Spec:** `docs/superpowers/specs/2026-09-15-driver-app-cockpit-overhaul-design.md`

## Global Constraints

- Do not alter canonical backend API contracts, endpoints, or Prisma schema.
- Preserve order lifecycle state machine: `ACCEPTED ➔ PICKING_UP ➔ IN_TRANSIT ➔ DELIVERED`.
- 100% vector SVG icons via `@leopard/mobile-core` (no raw emoji for status/actions).
- Numbers, monetary amounts (VND), distance, and countdowns must use `fontVariant: ['tabular-nums']`.
- Slide-to-Action gesture requires >= 75% swipe threshold to trigger state mutation.
- Each driver registers exactly one vehicle type (`VAN_500KG`, `TRUCK_1250KG`, `TRUCK_2500KG`, `TRICYCLE_500KG`).

---

### Task 1: Top Cockpit HUD Component (`DriverTopHud.tsx`)

**Files:**
- Create: `apps/driver/src/features/orders/components/DriverTopHud.tsx`
- Test: `apps/driver/src/features/orders/components/DriverTopHud.test.tsx`

**Interfaces:**
- Consumes: `@leopard/mobile-core` (`colors`, `radius`, `spacing`, `typography`, `IconUser`, `IconSpeedTruck`, `IconWallet`)
- Produces:
  ```ts
  export type DriverTopHudProps = Readonly<{
    driverName?: string | null;
    vehiclePlate?: string | null;
    vehicleType?: string | null;
    isOnline: boolean;
    onToggleAvailability: () => void;
    todayEarningsLabel?: string;
    todayTripsCount?: number;
    onOpenProfile?: () => void;
    onOpenEarnings?: () => void;
  }>;
  export function DriverTopHud(props: DriverTopHudProps): React.JSX.Element;
  ```

- [ ] **Step 1: Write the failing test**

```tsx
// apps/driver/src/features/orders/components/DriverTopHud.test.tsx
import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { DriverTopHud } from './DriverTopHud';

describe('DriverTopHud', () => {
  it('renders driver info, duty switch, and earnings pill', () => {
    const onToggleAvailability = jest.fn();
    const onOpenProfile = jest.fn();
    const onOpenEarnings = jest.fn();

    const { getByText, getByTestId } = render(
      <DriverTopHud
        driverName="Nguyễn Văn A"
        vehiclePlate="51D-123.45"
        vehicleType="1.25T"
        isOnline={true}
        onToggleAvailability={onToggleAvailability}
        todayEarningsLabel="450.000 ₫"
        todayTripsCount={3}
        onOpenProfile={onOpenProfile}
        onOpenEarnings={onOpenEarnings}
      />,
    );

    expect(getByText(/51D-123.45/)).toBeTruthy();
    expect(getByText(/TRỰC TUYẾN/)).toBeTruthy();
    expect(getByText('450.000 ₫')).toBeTruthy();

    fireEvent.press(getByTestId('driver-duty-toggle'));
    expect(onToggleAvailability).toHaveBeenCalledTimes(1);

    fireEvent.press(getByTestId('driver-earnings-pill'));
    expect(onOpenEarnings).toHaveBeenCalledTimes(1);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter driver test -- src/features/orders/components/DriverTopHud.test.tsx`  
Expected: FAIL ("Cannot find module './DriverTopHud'")

- [ ] **Step 3: Write minimal implementation**

Implement `apps/driver/src/features/orders/components/DriverTopHud.tsx` with:
- Semi-transparent floating glass card (`backgroundColor: 'rgba(255, 255, 255, 0.94)'`, shadow, rounded-2xl).
- Left pill: Driver avatar / plate button (`testID="driver-profile-pill"`).
- Center pill: Duty switch button (`testID="driver-duty-toggle"`) with animated green/gray LED circle and text `TRỰC TUYẾN` / `NGHỈ`.
- Right pill: Earnings badge (`testID="driver-earnings-pill"`) displaying today's VND and trip count.

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm --filter driver test -- src/features/orders/components/DriverTopHud.test.tsx`  
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add apps/driver/src/features/orders/components/DriverTopHud.tsx apps/driver/src/features/orders/components/DriverTopHud.test.tsx
git commit -m "feat(driver): add DriverTopHud component with duty toggle and earnings pill"
```

---

### Task 2: Cargo-First Dispatch Offer Modal (`IncomingDispatchModal.tsx`)

**Files:**
- Modify: `apps/driver/src/features/orders/IncomingDispatchModal.tsx`
- Modify: `apps/driver/src/features/orders/IncomingDispatchModal.test.tsx`

**Interfaces:**
- Consumes: `SlideToAction` from `@leopard/mobile-core`
- Enhances: `IncomingDispatchOffer` with cargo details:
  ```ts
  export type IncomingDispatchOffer = Readonly<{
    orderId: string;
    pickupAddress: string;
    dropoffAddress: string;
    earningsAmount: number;
    distanceKm: number;
    pickupDistanceKm?: number;
    expiresAtEpochMs: number;
    cargoName?: string;
    cargoWeightKg?: number;
    cargoDimensions?: string;
    loadingFee?: number;
    loadingDescription?: string;
    cargoPhotoUrl?: string;
    specialNotes?: string;
  }>;
  ```

- [ ] **Step 1: Write the failing test**

Update `apps/driver/src/features/orders/IncomingDispatchModal.test.tsx` to assert:
- Cargo name (e.g. "Thiết bị điện máy") is displayed.
- Cargo weight and dimensions (e.g. "450 kg · 1.8m x 1.2m") are rendered.
- Loading fee badge (e.g. "Bốc xếp (+100.000₫)") is rendered when `loadingFee > 0`.
- Cargo notes (e.g. "Hàng dễ vỡ") are rendered.
- Accepts via `SlideToAction` triggering `onAccept(orderId)`.

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter driver test -- src/features/orders/IncomingDispatchModal.test.tsx`  
Expected: FAIL

- [ ] **Step 3: Update implementation**

Update `apps/driver/src/features/orders/IncomingDispatchModal.tsx`:
- Render Cargo Spec Bento Box prominently above the accept slider.
- Add cargo photo preview modal when thumbnail is tapped.
- Integrate `SlideToAction` with `colorVariant="success"` and `label="Vuốt để nhận cuốc ➔"`.

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm --filter driver test -- src/features/orders/IncomingDispatchModal.test.tsx`  
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add apps/driver/src/features/orders/IncomingDispatchModal.tsx apps/driver/src/features/orders/IncomingDispatchModal.test.tsx
git commit -m "feat(driver): upgrade IncomingDispatchModal to Cargo-First specification"
```

---

### Task 3: Ground-up Modernization of Home Screen (`DriverOrdersScreen.tsx`)

**Files:**
- Modify: `apps/driver/src/features/orders/DriverOrdersScreen.tsx`
- Modify: `apps/driver/src/features/orders/components/DriverNearbyOrderCard.tsx`
- Test: `apps/driver/src/features/orders/DriverOrdersScreen.test.tsx`

**Interfaces:**
- Consumes: `DriverTopHud`, `RealInteractiveMap`, `IncomingDispatchModal`, `DriverNearbyOrderCard`
- Produces: Clean Cockpit view switching between Idle Radar / Load-board and Active Trip.

- [ ] **Step 1: Write the failing test**

Update `apps/driver/src/features/orders/DriverOrdersScreen.test.tsx` to assert:
- `DriverTopHud` is rendered at top with proper props.
- Map is rendered with full viewport background.
- Radar scanning card is shown when driver is online and idle.
- Nearby orders render cargo specifications (weight, dimensions, cargo name).

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter driver test -- src/features/orders/DriverOrdersScreen.test.tsx`  
Expected: FAIL

- [ ] **Step 3: Implement clean modern layout**

In `apps/driver/src/features/orders/DriverOrdersScreen.tsx`:
- Clean up monolithic styling and dead code.
- Replace top header with `DriverTopHud`.
- Ensure `DriverNearbyOrderCard` highlights cargo name, weight, and loading fee.
- Keep docked bottom bar flat and clean without blocking buttons.

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm --filter driver test -- src/features/orders/DriverOrdersScreen.test.tsx`  
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add apps/driver/src/features/orders/DriverOrdersScreen.tsx apps/driver/src/features/orders/components/DriverNearbyOrderCard.tsx apps/driver/src/features/orders/DriverOrdersScreen.test.tsx
git commit -m "feat(driver): modernize Home Cockpit with DriverTopHud and Cargo Load-board"
```

---

### Task 4: Active Trip 4-Stage Cockpit & e-POD (`DriverOrderDetailScreen.tsx` & `EpodPanel.tsx`)

**Files:**
- Modify: `apps/driver/src/features/orders/DriverOrderDetailScreen.tsx`
- Modify: `apps/driver/src/features/orders/components/detail/EpodPanel.tsx`
- Test: `apps/driver/src/features/orders/DriverOrderDetailScreen.test.tsx`

**Interfaces:**
- Consumes: `SlideToAction`, `RealInteractiveMap`, `VerticalRouteStepper`, `EpodPanel`
- Produces: 4-stage lifecycle view with pre-loading checklist, navigation, and e-POD signature/photo proof.

- [ ] **Step 1: Write the failing test**

Update `apps/driver/src/features/orders/DriverOrderDetailScreen.test.tsx` to verify:
- Stage `ACCEPTED`: Shows pickup address, Call/Chat sender, and `SlideToAction` ("Vuốt đã tới điểm lấy").
- Stage `PICKING_UP`: Shows cargo checklist, pre-loading photo capture, and `SlideToAction` ("Vuốt đã bốc hàng xong").
- Stage `IN_TRANSIT`: Shows dropoff address, ETA, Call/Chat recipient, and `SlideToAction` ("Vuốt đã tới điểm giao").
- Stage `DELIVERED`: Opens `EpodPanel` requiring recipient name, touch signature, delivery photo, and payment collection note.

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter driver test -- src/features/orders/DriverOrderDetailScreen.test.tsx`  
Expected: FAIL

- [ ] **Step 3: Implement 4-stage mission cockpit**

Update `apps/driver/src/features/orders/DriverOrderDetailScreen.tsx`:
- Refactor screen to clear 4-step mission state machine.
- Integrate `SlideToAction` for each step progression.
- Ensure `EpodPanel` cleanly handles touch signature capture and photo attachment upload.

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm --filter driver test -- src/features/orders/DriverOrderDetailScreen.test.tsx`  
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add apps/driver/src/features/orders/DriverOrderDetailScreen.tsx apps/driver/src/features/orders/components/detail/EpodPanel.tsx apps/driver/src/features/orders/DriverOrderDetailScreen.test.tsx
git commit -m "feat(driver): streamline Active Trip Cockpit with 4-stage lifecycle and e-POD"
```

---

### Task 5: Driver Onboarding & KYC Wizard (`driver-register.tsx` & `kyc.tsx`)

**Files:**
- Modify: `apps/driver/app/(public)/driver-register.tsx`
- Modify: `apps/driver/src/auth/driver-register-route.test.tsx`

**Interfaces:**
- Single vehicle selection constraint: `VAN_500KG`, `TRUCK_1250KG`, `TRUCK_2500KG`, `TRICYCLE_500KG`.
- Auto-save form draft to `AsyncStorage` via key `@leopard/driver_register_draft`.

- [ ] **Step 1: Write the failing test**

Update `apps/driver/src/auth/driver-register-route.test.tsx` to verify:
- Wizard renders Step 1 (Personal info), Step 2 (Single vehicle selection with plate), Step 3 (CCCD, GPLX, Cavet photo uploads).
- Enforces single vehicle selection (radio behavior, cannot select multiple).
- Draft state restores on reload.

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter driver test -- src/auth/driver-register-route.test.tsx`  
Expected: FAIL

- [ ] **Step 3: Implement clean 3-step wizard**

Refactor `apps/driver/app/(public)/driver-register.tsx`:
- Break monolithic structure into clean Step components (`StepPersonalInfo`, `StepVehicleSelection`, `StepDocumentUploads`, `StepReviewSubmit`).
- Provide visual vehicle cards with payload limits.
- Add local draft auto-save and restore.

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm --filter driver test -- src/auth/driver-register-route.test.tsx`  
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add apps/driver/app/(public)/driver-register.tsx apps/driver/src/auth/driver-register-route.test.tsx
git commit -m "feat(driver): refactor driver registration into 3-step wizard with single vehicle constraint"
```

---

### Task 6: Modernize Wallet, Earnings & History (`wallet.tsx`, `earnings.tsx`, `history.tsx`)

**Files:**
- Modify: `apps/driver/src/features/wallet/DriverWalletScreen.tsx`
- Modify: `apps/driver/src/features/earnings/DriverEarningsScreen.tsx`
- Modify: `apps/driver/src/features/history/DriverHistoryScreen.tsx`
- Test: `apps/driver/src/features/wallet/DriverWalletScreen.test.tsx`
- Test: `apps/driver/src/features/history/DriverHistoryScreen.test.tsx`

**Interfaces:**
- Bento cards for earnings (Today/Week/Month net payout, completed trips, online hours).
- Modal to review saved e-POD (signature + delivery photo) in history.

- [ ] **Step 1: Write the failing test**

Update `apps/driver/src/features/history/DriverHistoryScreen.test.tsx` to assert:
- Status filter buttons work (All, Delivered, Cancelled).
- e-POD proof button opens modal displaying customer signature and photo for completed trips.

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter driver test -- src/features/history/DriverHistoryScreen.test.tsx`  
Expected: FAIL

- [ ] **Step 3: Update Wallet, Earnings and History UI**

Update the screens with:
- Clean Bento stats cards (`#F4F7FB` canvas, crisp white cards, `radius.cardXl`).
- Big tabular-nums balance card and clear withdrawal action.
- History trip cards with clear cargo tag, distance, and e-POD review.

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm --filter driver test -- src/features/wallet/DriverWalletScreen.test.tsx src/features/history/DriverHistoryScreen.test.tsx`  
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add apps/driver/src/features/wallet/DriverWalletScreen.tsx apps/driver/src/features/earnings/DriverEarningsScreen.tsx apps/driver/src/features/history/DriverHistoryScreen.tsx
git commit -m "feat(driver): modernize Wallet, Earnings and Trip History screens with bento cards and e-POD review"
```

---

### Task 7: Full Monorepo Quality Gate & Verification

**Files:**
- Entire `apps/driver` and `@leopard/mobile-core` packages

- [ ] **Step 1: Run driver unit & component tests**

Run: `pnpm --filter driver test`  
Expected: PASS (all test suites pass)

- [ ] **Step 2: Run driver typecheck**

Run: `pnpm --filter driver typecheck`  
Expected: PASS (0 type errors)

- [ ] **Step 3: Run mobile-core tests**

Run: `pnpm --filter @leopard/mobile-core test`  
Expected: PASS

- [ ] **Step 4: Verify web preview on port 8082**

Test that web build compiles without breaking:
Run: `pnpm --filter driver build` (or verify running Expo web server on 8082 responds with HTTP 200).

- [ ] **Step 5: Final review and commit**

```bash
git status
git commit -m "chore(driver): complete driver app cockpit overhaul verification"
```
