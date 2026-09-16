# Driver Mission Cockpit — Map-First Floating Layout Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Redesign the driver's active-order cockpit (`AssignedDetailView`) from a scroll-of-cards layout into a Grab-style map-first layout: full-bleed map background, no header bar, and floating panels on top — matching the layered pattern already used on the driver home screen (`DriverOrdersScreen.tsx`).

**Architecture:** `AssignedDetailView` stops wrapping its content in `ScreenScaffold` (which renders a title header) and instead renders three absolutely-positioned layers over a full-bleed `MissionMapCanvas`: (1) a top-left floating back button, (2) a floating bottom action bar that is always visible (call / navigate / report-incident / current-leg label / the primary status-change control), and (3) a floating scrollable sheet, docked just above the action bar, that holds stage-required content (route stepper, pickup checklist, cash collection, e-POD) plus a collapsed-by-default "more details" toggle for purely informational content (progress dots, cargo spec chips, status timeline). No existing business logic, props, or test IDs change — this is a pure layout/composition refactor split across new small presentational components.

**Tech Stack:** React Native (Expo), TypeScript, `@leopard/mobile-core` design tokens/icons, Jest + `@testing-library/react-native`.

**Spec:** No separate spec file — the full design was agreed inline in chat (bounded-task path). This plan document is self-contained: every decision and constraint from that conversation is captured below.

## Global Constraints

- Do not change any existing `testID` string, `accessibilityLabel` string, or component prop contract used by current tests. Grep for the string before moving it; if it moves to a new file, copy it verbatim.
- Do not delete any business logic (cash confirmation, e-POD, picking checklist, incident reporting, permission-denied recovery). Only its position on screen changes.
- Content that is asserted to render **without any user interaction** in existing tests must remain rendered without interaction after the refactor (see Task 0 below for the exact list — this was verified against the test suite before writing this plan).
- Content that is purely informational and re-derivable from the map or from a stage-specific panel (progress dots, cargo spec chips + secondary contact card, status timeline, decorative "DRIVER · ACTIVE MISSION" eyebrow/title) is the "thông tin thừa" to declutter: it moves behind a collapsed-by-default toggle, not deleted.
- The floating bottom action bar must never be a header bar and must never span edge-to-edge with square corners — it is a rounded, shadowed card with side/bottom margin, matching the "floating" style the user asked for (reference: `DriverActiveTripCard`'s card styling and `DriverOrdersScreen.tsx`'s `capsuleLayer`/`mapControlLayer` floating overlays).
- No new dependencies. Reuse `@leopard/mobile-core` tokens (`colors`, `spacing`, `leopardPalette`, `iosContinuousCurve`, icons) exactly as the surrounding code already does.

---

## Task 0: Verify the pinned-visible content list (no code change — a safety check)

This task exists so the executor does not have to re-derive, from scratch, which content is allowed to move behind a toggle. It was already derived by reading every test file that touches `DriverOrderDetailScreen`/`AssignedDetailView`. Confirm it still holds before touching code (the fixtures/tests may have moved since this plan was written).

- [ ] **Step 1: Run the current test suite as a baseline**

Run: `pnpm --filter driver test -- DriverOrderDetailScreen DriverOrderDetailRuntime`
Expected: all tests PASS (this is the pre-refactor baseline; save the output for comparison after each later task).

- [ ] **Step 2: Confirm which testIDs/labels are asserted with NO prior interaction**

Run: `grep -rn "getByTestId\|getByLabelText" apps/driver/src/features/orders/DriverOrderDetailScreen.test.tsx apps/driver/src/features/orders/DriverOrderDetailScreen.calling.audit.test.tsx apps/driver/src/features/orders/DriverOrderDetailScreen.incident.audit.test.tsx apps/driver/src/features/orders/DriverOrderDetailScreen.navigation.audit.test.tsx`

Confirm the result still includes, at minimum, all of these (if any is missing/renamed, stop and re-derive the "must stay always-visible" list before proceeding — it changes Task 3/4 below):
- `btn-advance-leg-slide` (the swipe-to-advance control)
- `Gọi cho người nhận` (accessibility label, call button)
- `btn-navigate-active-leg` (navigate-to-leg button)
- `btn-open-incident-modal` (icon incident trigger)
- `btn-report-incident` (banner incident trigger)
- `cargo-specs-checklist`, `btn-preloading-cargo-photo` (PICKING_UP stage checklist)
- `epod-verification-container`, `epod-payment-reminder`, `epod-recipient-name-input`, `btn-capture-cargo-photo`, `camera-watermark-overlay`, `epod-signature-pad`, `btn-epod-complete-delivery` (e-POD panel)
- `btn-terminal-home` (terminal-state fallback button)
- The exact origin address text (e.g. `'Kho Gốc Tân Bình, 123 Lý Thường Kiệt'`) rendered as plain text — this comes from `VerticalRouteStepper`, confirming that component must also stay always-visible (not behind a toggle).

These items define **Tier 1 (always visible, in the bottom action bar)** and **Tier 2 (always visible, in the floating sheet)** in the tasks below. Everything NOT in this list — `MissionStepper`, `CargoAndContactCard`'s cargo-chip/contact-card body, the `missionHeaderRow` eyebrow/title text, and the status timeline accordion — is **Tier 3 (collapsed by default)**.

---

## Task 1: Full-bleed mode for `MissionMapCanvas`

**Files:**
- Modify: `apps/driver/src/features/orders/components/detail/MissionMapCanvas.tsx:20-37` (props type), `:290-291` (root `View`), `:396-404` (`mapCanvasContainer` style)
- Test: `apps/driver/src/features/orders/components/detail/MissionMapCanvas.test.tsx` (add a case)

**Interfaces:**
- Produces: `MissionMapCanvasProps.fillContainer?: boolean` — when `true`, the root container fills its parent (`position: 'absolute', inset: 0`, no `borderRadius`, no fixed `height`) instead of the current fixed 270px rounded card. Default `false` preserves today's behavior exactly (no other current usage exists outside `AssignedDetailView`, confirmed via `grep -rn "MissionMapCanvas" apps/driver/src --include="*.tsx"`).

- [ ] **Step 1: Write the failing test**

Add to `MissionMapCanvas.test.tsx` (create the file if it does not exist yet — check first with `ls apps/driver/src/features/orders/components/detail/MissionMapCanvas.test.tsx`):

```tsx
import { render } from '@testing-library/react-native';
import React from 'react';
import { MissionMapCanvas } from './MissionMapCanvas';

describe('MissionMapCanvas fillContainer mode', () => {
  it('renders as an absolute full-bleed layer when fillContainer is true', async () => {
    const screen = await render(
      <MissionMapCanvas
        fillContainer
        origin={{ label: 'A' }}
        destination={{ label: 'B' }}
        tracking={{ kind: 'not-started', label: 'Chưa bắt đầu' }}
      />,
    );
    const canvas = screen.getByTestId('route-map-schematic');
    const flatStyle = Array.isArray(canvas.props.style)
      ? Object.assign({}, ...canvas.props.style)
      : canvas.props.style;
    expect(flatStyle.position).toBe('absolute');
    expect(flatStyle.borderRadius).toBeUndefined();
    await screen.unmount();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter driver test -- MissionMapCanvas.test.tsx`
Expected: FAIL — `fillContainer` prop does not exist / style assertion fails.

- [ ] **Step 3: Implement `fillContainer`**

In `MissionMapCanvas.tsx`, add to the props type (around line 33, right after `testID?: string;`):

```ts
  fillContainer?: boolean;
```

Change the function signature (around line 138) to destructure it:

```ts
  testID = 'route-map-schematic',
  fillContainer = false,
```

Change the root `View` (line 291) to:

```tsx
    <View
      style={[styles.mapCanvasContainer, fillContainer ? styles.mapCanvasContainerFill : null]}
      testID={testID}
    >
```

Add a new style entry right after `mapCanvasContainer` (around line 404):

```ts
  mapCanvasContainerFill: {
    borderRadius: 0,
    height: undefined,
    position: 'absolute',
    inset: 0,
  },
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm --filter driver test -- MissionMapCanvas.test.tsx`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add apps/driver/src/features/orders/components/detail/MissionMapCanvas.tsx apps/driver/src/features/orders/components/detail/MissionMapCanvas.test.tsx
git commit -m "feat(driver): add full-bleed mode to MissionMapCanvas"
```

---

## Task 2: `DriverMissionBackButton` — floating back button (top-left overlay)

**Files:**
- Create: `apps/driver/src/features/orders/components/detail/DriverMissionBackButton.tsx`
- Test: `apps/driver/src/features/orders/components/detail/DriverMissionBackButton.test.tsx`

**Interfaces:**
- Produces: `DriverMissionBackButtonProps = Readonly<{ onBack?: () => void }>`, default export-free named export `DriverMissionBackButton`. Renders `null` when `onBack` is undefined (same behavior `ScreenScaffold` had: no back control without a handler).

- [ ] **Step 1: Write the failing test**

```tsx
import { fireEvent, render } from '@testing-library/react-native';
import React from 'react';
import { DriverMissionBackButton } from './DriverMissionBackButton';

describe('DriverMissionBackButton', () => {
  it('calls onBack when pressed', async () => {
    const onBack = jest.fn();
    const screen = await render(<DriverMissionBackButton onBack={onBack} />);
    await fireEvent.press(screen.getByLabelText('Quay lại'));
    expect(onBack).toHaveBeenCalledTimes(1);
    await screen.unmount();
  });

  it('renders nothing when onBack is not provided', async () => {
    const screen = await render(<DriverMissionBackButton />);
    expect(screen.queryByLabelText('Quay lại')).toBeNull();
    await screen.unmount();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter driver test -- DriverMissionBackButton.test.tsx`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement the component**

```tsx
import React from 'react';
import { Pressable, StyleSheet } from 'react-native';
import { IconChevronLeft, driverPrimitives, iosContinuousCurve } from '@leopard/mobile-core';

export type DriverMissionBackButtonProps = Readonly<{
  onBack?: () => void;
}>;

export function DriverMissionBackButton({ onBack }: DriverMissionBackButtonProps) {
  if (!onBack) return null;

  return (
    <Pressable
      accessibilityLabel="Quay lại"
      accessibilityRole="button"
      hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
      onPress={onBack}
      style={({ pressed }) => [styles.btn, pressed ? styles.pressed : null]}
      testID="driver-mission-back-btn"
    >
      <IconChevronLeft color={driverPrimitives.colors.gray900} size={22} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  btn: {
    alignItems: 'center',
    backgroundColor: driverPrimitives.colors.white,
    borderColor: driverPrimitives.colors.gray200,
    borderRadius: 9999,
    ...iosContinuousCurve,
    borderWidth: 1,
    height: 44,
    justifyContent: 'center',
    width: 44,
    ...driverPrimitives.shadows.md,
  },
  pressed: {
    opacity: 0.85,
    transform: [{ scale: 0.94 }],
  },
});
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm --filter driver test -- DriverMissionBackButton.test.tsx`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add apps/driver/src/features/orders/components/detail/DriverMissionBackButton.tsx apps/driver/src/features/orders/components/detail/DriverMissionBackButton.test.tsx
git commit -m "feat(driver): add floating back button for mission cockpit"
```

---

## Task 3: `DriverMissionActionBar` — floating bottom bar (Tier 1, always visible)

This extracts the current `stickyFooter` content of `AssignedDetailView.tsx` (lines 88–146) into its own component, restyled as a floating card instead of an edge-to-edge sticky bar. All testIDs/labels are copied verbatim.

**Files:**
- Create: `apps/driver/src/features/orders/components/detail/DriverMissionActionBar.tsx`
- Test: `apps/driver/src/features/orders/components/detail/DriverMissionActionBar.test.tsx`

**Interfaces:**
- Consumes: `callPhoneNumber` from `./CargoAndContactCard`, `openExternalNavigation` from `./MissionMapCanvas` (same imports `AssignedDetailView.tsx` already uses).
- Produces:

```ts
export type DriverMissionActionBarProps = Readonly<{
  legTitle: string;
  isTerminal: boolean;
  isMissionActive: boolean;
  customerContact?: string | null;
  navigationTarget: { lat?: number; lng?: number; label?: string } | null | undefined;
  taskButtonComponent?: React.ReactNode;
  onOpenIncidentModal?: () => void;
  onBack?: () => void;
}>;
```

- [ ] **Step 1: Write the failing test**

```tsx
import { fireEvent, render } from '@testing-library/react-native';
import React from 'react';
import { Linking } from 'react-native';
import { DriverMissionActionBar } from './DriverMissionActionBar';

describe('DriverMissionActionBar', () => {
  it('exposes call, navigate, and incident controls with stable testIDs', async () => {
    const onOpenIncidentModal = jest.fn();
    const openURLSpy = jest.spyOn(Linking, 'openURL').mockResolvedValue(true as any);

    const screen = await render(
      <DriverMissionActionBar
        customerContact="Kho Tổng Nam (0912345678)"
        isMissionActive
        isTerminal={false}
        legTitle="ĐẾN ĐIỂM LẤY HÀNG"
        navigationTarget={{ lat: 10.79, lng: 106.65, label: 'Kho' }}
        onOpenIncidentModal={onOpenIncidentModal}
        taskButtonComponent={<></>}
      />,
    );

    expect(screen.getByLabelText('Gọi cho người nhận')).toBeTruthy();
    await fireEvent.press(screen.getByTestId('btn-navigate-active-leg'));
    expect(openURLSpy).toHaveBeenCalled();

    await fireEvent.press(screen.getByTestId('btn-open-incident-modal'));
    await fireEvent.press(screen.getByTestId('btn-report-incident'));
    expect(onOpenIncidentModal).toHaveBeenCalledTimes(2);

    openURLSpy.mockRestore();
    await screen.unmount();
  });

  it('shows the terminal fallback button when isTerminal is true and hides call/nav/incident', async () => {
    const screen = await render(
      <DriverMissionActionBar
        isMissionActive={false}
        isTerminal
        legTitle="HOÀN TẤT"
        navigationTarget={null}
      />,
    );
    expect(screen.getByTestId('btn-terminal-home')).toBeTruthy();
    expect(screen.queryByTestId('btn-navigate-active-leg')).toBeNull();
    expect(screen.queryByTestId('btn-open-incident-modal')).toBeNull();
    await screen.unmount();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter driver test -- DriverMissionActionBar.test.tsx`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement the component**

```tsx
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import {
  Button,
  IconPhone,
  IconRoute,
  IconShieldAlert,
  colors,
  driverPrimitives,
  iosContinuousCurve,
  leopardPalette,
  spacing,
} from '@leopard/mobile-core';
import { callPhoneNumber } from './CargoAndContactCard';
import { openExternalNavigation } from './MissionMapCanvas';

export type DriverMissionActionBarProps = Readonly<{
  legTitle: string;
  isTerminal: boolean;
  isMissionActive: boolean;
  customerContact?: string | null;
  navigationTarget?: { lat?: number; lng?: number; label?: string } | null;
  taskButtonComponent?: React.ReactNode;
  onOpenIncidentModal?: () => void;
  onBack?: () => void;
}>;

export function DriverMissionActionBar({
  customerContact,
  isMissionActive,
  isTerminal,
  legTitle,
  navigationTarget,
  onBack,
  onOpenIncidentModal,
  taskButtonComponent,
}: DriverMissionActionBarProps) {
  return (
    <View style={styles.card} testID="driver-mission-action-bar">
      <Text numberOfLines={1} style={styles.legTitle}>
        {legTitle}
      </Text>

      <View style={styles.row}>
        {!isTerminal && (
          <>
            <Pressable
              accessibilityHint="Gọi điện thoại trực tiếp cho người nhận hoặc thủ kho"
              accessibilityLabel="Gọi cho người nhận"
              accessibilityRole="button"
              onPress={() => callPhoneNumber(customerContact)}
              style={({ pressed }) => [styles.roundBtn, pressed ? styles.pressed : null]}
            >
              <IconPhone color={leopardPalette.primary} size={20} />
            </Pressable>

            <Pressable
              accessibilityHint="Mở ứng dụng Google Maps để dẫn đường"
              accessibilityLabel="Mở Google Maps chỉ đường"
              accessibilityRole="button"
              onPress={() => navigationTarget && openExternalNavigation(navigationTarget)}
              style={({ pressed }) => [styles.roundBtn, pressed ? styles.pressed : null]}
              testID="btn-navigate-active-leg"
            >
              <IconRoute color={leopardPalette.primary} size={20} />
            </Pressable>

            {onOpenIncidentModal && isMissionActive ? (
              <>
                <Pressable
                  accessibilityHint="Báo cáo sự cố khẩn cấp cho chuyến đi"
                  accessibilityLabel="Báo sự cố"
                  accessibilityRole="button"
                  onPress={onOpenIncidentModal}
                  style={({ pressed }) => [styles.roundBtn, styles.incidentBtn, pressed ? styles.pressed : null]}
                  testID="btn-open-incident-modal"
                >
                  <IconShieldAlert color={colors.danger.text} size={20} />
                </Pressable>

                <Pressable
                  accessibilityHint="Báo cáo sự cố khẩn cấp để huỷ chuyến và giải phóng tài xế"
                  accessibilityLabel="Báo sự cố chuyến đi"
                  accessibilityRole="button"
                  onPress={onOpenIncidentModal}
                  style={({ pressed }) => [styles.incidentBannerBtn, pressed ? styles.pressed : null]}
                  testID="btn-report-incident"
                >
                  <Text style={styles.incidentBannerBtnText}>Báo sự cố</Text>
                </Pressable>
              </>
            ) : null}
          </>
        )}

        <View style={styles.primaryBtnWrap}>
          {!isTerminal && taskButtonComponent ? (
            taskButtonComponent
          ) : (
            <Button label="Về trang chủ" onPress={onBack} size="driver-primary" testID="btn-terminal-home" variant="primary" />
          )}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: driverPrimitives.colors.white,
    borderRadius: 22,
    ...iosContinuousCurve,
    gap: 8,
    marginHorizontal: spacing.md,
    marginBottom: spacing.md,
    padding: 14,
    ...driverPrimitives.shadows.md,
  },
  legTitle: {
    color: colors.neutral.text,
    fontSize: 13,
    fontWeight: '700',
  },
  row: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 10,
  },
  roundBtn: {
    alignItems: 'center',
    backgroundColor: colors.neutral.surface,
    borderColor: colors.neutral.border,
    borderRadius: 24,
    borderWidth: 1,
    height: 48,
    justifyContent: 'center',
    width: 48,
    ...driverPrimitives.shadows.sm,
  },
  incidentBtn: {
    backgroundColor: '#FEF2F2',
    borderColor: '#FECACA',
  },
  incidentBannerBtn: {
    alignItems: 'center',
    backgroundColor: '#FEE2E2',
    borderColor: '#FECACA',
    borderRadius: 12,
    borderWidth: 1,
    justifyContent: 'center',
    paddingHorizontal: 10,
    height: 48,
  },
  incidentBannerBtnText: {
    color: colors.danger.text,
    fontSize: 11,
    fontWeight: '700',
  },
  primaryBtnWrap: {
    flex: 1,
  },
  pressed: {
    opacity: 0.75,
  },
});
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm --filter driver test -- DriverMissionActionBar.test.tsx`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add apps/driver/src/features/orders/components/detail/DriverMissionActionBar.tsx apps/driver/src/features/orders/components/detail/DriverMissionActionBar.test.tsx
git commit -m "feat(driver): extract floating mission action bar"
```

---

## Task 4: `DriverMissionExtras` — Tier 3 collapsed-by-default drawer content

Wraps `MissionStepper`, `CargoAndContactCard`, and the status-timeline accordion behind a single toggle row, collapsed by default. This is the actual "loại bỏ thông tin thừa" cut the user asked for.

**Files:**
- Create: `apps/driver/src/features/orders/components/detail/DriverMissionExtras.tsx`
- Test: `apps/driver/src/features/orders/components/detail/DriverMissionExtras.test.tsx`

**Interfaces:**
- Consumes: `MissionStepper` (`./MissionStepper`), `CargoAndContactCard` (`./CargoAndContactCard`), `StatusTimeline` (`@leopard/mobile-core`).
- Produces:

```ts
export type DriverMissionExtrasProps = Readonly<{
  status: string;
  cargoSummary: string;
  cargoWeightKg?: number | null;
  contactRoleLabel: string;
  customerContact: string;
  vehicleLabel: string;
  history: readonly { label: string; timestampLabel: string }[];
}>;
```

- [ ] **Step 1: Write the failing test**

```tsx
import { fireEvent, render } from '@testing-library/react-native';
import React from 'react';
import { DriverMissionExtras } from './DriverMissionExtras';

describe('DriverMissionExtras', () => {
  const baseProps = {
    cargoSummary: '20 bao xi măng',
    cargoWeightKg: 1000,
    contactRoleLabel: 'Người nhận',
    customerContact: '0987654321',
    history: [],
    status: 'PICKING_UP',
    vehicleLabel: 'Xe tải 1.25T',
  };

  it('hides cargo details until the toggle is pressed', async () => {
    const screen = await render(<DriverMissionExtras {...baseProps} />);
    expect(screen.queryByText('20 bao xi măng')).toBeNull();

    await fireEvent.press(screen.getByTestId('btn-toggle-mission-extras'));
    expect(screen.getByText('20 bao xi măng')).toBeTruthy();
    await screen.unmount();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter driver test -- DriverMissionExtras.test.tsx`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement the component**

```tsx
import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { IconClock, StatusTimeline, colors, leopardPalette, spacing } from '@leopard/mobile-core';
import { MissionStepper } from './MissionStepper';
import { CargoAndContactCard } from './CargoAndContactCard';

export type DriverMissionExtrasProps = Readonly<{
  status: string;
  cargoSummary: string;
  cargoWeightKg?: number | null;
  contactRoleLabel: string;
  customerContact: string;
  vehicleLabel: string;
  history: readonly { label: string; timestampLabel: string }[];
}>;

export function DriverMissionExtras({
  cargoSummary,
  cargoWeightKg,
  contactRoleLabel,
  customerContact,
  history,
  status,
  vehicleLabel,
}: DriverMissionExtrasProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <View style={styles.container}>
      <Pressable
        accessibilityHint="Bấm để ẩn hoặc hiện tiến độ, hàng hóa, và nhật ký trạng thái"
        accessibilityLabel="Xem thêm chi tiết chuyến"
        accessibilityRole="button"
        onPress={() => setIsOpen(!isOpen)}
        style={({ pressed }) => [styles.toggleBtn, pressed ? styles.pressed : null]}
        testID="btn-toggle-mission-extras"
      >
        <View style={styles.toggleLeft}>
          <IconClock color={leopardPalette.primary} size={15} />
          <Text style={styles.toggleText}>Xem thêm chi tiết chuyến</Text>
        </View>
        <Text style={styles.toggleArrow}>{isOpen ? '▲' : '▼'}</Text>
      </Pressable>

      {isOpen ? (
        <View style={styles.content}>
          <MissionStepper status={status} />
          <CargoAndContactCard
            cargoSummary={cargoSummary}
            cargoWeightKg={cargoWeightKg}
            contactRoleLabel={contactRoleLabel}
            customerContact={customerContact}
            vehicleLabel={vehicleLabel}
          />
          {history.length > 0 ? <StatusTimeline entries={history} /> : null}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderColor: colors.neutral.border,
    borderRadius: 12,
    borderWidth: 1,
    overflow: 'hidden',
  },
  toggleBtn: {
    alignItems: 'center',
    backgroundColor: colors.neutral.canvas,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  toggleLeft: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  toggleText: {
    color: leopardPalette.primary,
    fontSize: 12,
    fontWeight: '700',
  },
  toggleArrow: {
    color: colors.neutral.subtleText,
    fontSize: 11,
    fontWeight: '700',
  },
  content: {
    backgroundColor: colors.neutral.surface,
    gap: spacing.sm,
    padding: 12,
  },
  pressed: {
    opacity: 0.8,
  },
});
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm --filter driver test -- DriverMissionExtras.test.tsx`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add apps/driver/src/features/orders/components/detail/DriverMissionExtras.tsx apps/driver/src/features/orders/components/detail/DriverMissionExtras.test.tsx
git commit -m "feat(driver): add collapsed-by-default mission extras drawer"
```

---

## Task 5: Rewrite `AssignedDetailView` composition (map-first, no header)

This is the integration task: swap the `ScreenScaffold` + `ScrollView`-of-cards layout for the full-bleed map with the three new floating components, while keeping every Tier 2 block (`VerticalRouteStepper`, the PICKING_UP checklist, the cash card, `EpodPanel`, the permission-denied block) rendered exactly as before, just inside a floating sheet instead of a page-scroll.

**Files:**
- Modify: `apps/driver/src/features/orders/components/detail/AssignedDetailView.tsx` (full rewrite of the `return` block and styles; business logic in the function body above the `return` — lines 48–83 — is unchanged)
- Test: `apps/driver/src/features/orders/DriverOrderDetailScreen.test.tsx` (should pass unmodified — see Task 0), plus the three audit test files (should pass unmodified)

**Interfaces:**
- Consumes: `DriverMissionBackButton` (Task 2), `DriverMissionActionBar` (Task 3), `DriverMissionExtras` (Task 4), `MissionMapCanvas` with `fillContainer` (Task 1).
- No change to `AssignedDetailViewProps` — same public interface `DriverOrderDetailScreen.tsx` already calls.

- [ ] **Step 1: Replace the imports**

In `AssignedDetailView.tsx`, replace the import block (lines 1–28) with:

```tsx
import React, { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import {
  Button,
  IconCamera,
  IconCheck,
  IconTxPayment,
  colors,
  leopardPalette,
  spacing,
} from '@leopard/mobile-core';
import type { DriverAssignedDetailView, DriverPrimaryTaskView } from '../../model';
import { formatVndPrice } from '../../adapter';
import { MissionMapCanvas, openExternalNavigation } from './MissionMapCanvas';
import { VerticalRouteStepper } from './VerticalRouteStepper';
import { EpodPanel } from './EpodPanel';
import { CompletionSummaryCard } from './CompletionSummaryCard';
import { DriverMissionBackButton } from './DriverMissionBackButton';
import { DriverMissionActionBar } from './DriverMissionActionBar';
import { DriverMissionExtras } from './DriverMissionExtras';
```

(Note: `StatusBadge`, `IconRoute`, `IconClock`, `IconShieldAlert`, `ScreenScaffold`, `StatusTimeline`, `radius`, `MissionStepper`, `CargoAndContactCard`/`callPhoneNumber` are no longer imported directly here — they moved into the new Task 2–4 components, except `openExternalNavigation` which the checklist/cash sections don't use but the action bar's own file does; `AssignedDetailView` itself no longer needs `callPhoneNumber` or `IconPhone`/`IconRoute` since those live in `DriverMissionActionBar` now.)

- [ ] **Step 2: Compute the leg title string (unchanged logic, kept in the parent)**

Right after the existing `isMissionActive`/`isCashOrder`/`isCashConfirmed` block (around line 82, before the `return`), add:

```tsx
  const legTitle = isTerminal
    ? 'HOÀN TẤT'
    : view.order.status === 'ACCEPTED' || view.order.status === 'PICKING_UP'
      ? 'ĐẾN ĐIỂM LẤY HÀNG'
      : view.order.status === 'IN_TRANSIT'
        ? 'VẬN CHUYỂN ĐẾN ĐIỂM GIAO'
        : view.order.status === 'RETURNING'
          ? 'HOÀN HÀNG VỀ ĐIỂM GỬI'
          : 'TIẾN ĐỘ CHUYẾN ĐI';
```

- [ ] **Step 3: Replace the `return` block**

Replace everything from the opening `return (` through the matching closing `);` (originally lines 84–502) with:

```tsx
  return (
    <View style={styles.root} testID="assigned-detail-view">
      <MissionMapCanvas
        destination={{
          label: view.order.route.destination.label,
          coords:
            view.order.route.destination.lat != null && view.order.route.destination.lng != null
              ? { lat: view.order.route.destination.lat, lng: view.order.route.destination.lng }
              : undefined,
        }}
        destinationLabel={view.order.route.destination.label}
        distanceLabel={view.order.route.distanceLabel}
        eta={view.order.route.eta}
        etaLabel={
          view.order.route.etaDurationSeconds > 0
            ? `${Math.round(view.order.route.etaDurationSeconds / 60)} phút`
            : undefined
        }
        fillContainer
        navigationTarget={activeNavigationTarget}
        origin={{
          label: view.order.route.origin.label,
          coords:
            view.order.route.origin.lat != null && view.order.route.origin.lng != null
              ? { lat: view.order.route.origin.lat, lng: view.order.route.origin.lng }
              : undefined,
        }}
        originLabel={view.order.route.origin.label}
        routeCoords={view.order.route.routeCoords}
        routeSegments={view.order.route.routeSegments}
        stops={view.order.route.stops}
        tracking={view.tracking}
        vehicleType={view.order.vehicleType}
      />

      <View style={styles.topOverlay} pointerEvents="box-none">
        <DriverMissionBackButton onBack={onBack} />
      </View>

      <View style={styles.bottomStack} pointerEvents="box-none">
        <ScrollView
          contentContainerStyle={styles.sheetContent}
          showsVerticalScrollIndicator={false}
          style={styles.sheet}
        >
          {view.notice ? (
            <View style={styles.notice}>
              <Text accessibilityLiveRegion="polite" style={styles.warningText}>
                {view.notice}
              </Text>
            </View>
          ) : null}

          {isTerminal ? (
            <CompletionSummaryCard
              deliveredAtLabel={view.order.updatedAtLabel}
              priceLabel={view.order.priceLabel}
              reference={view.order.reference}
              status={view.order.status}
            />
          ) : null}

          <VerticalRouteStepper
            destination={view.order.route.destination}
            destinationLabel={view.order.route.destination.label}
            distanceLabel={view.order.route.distanceLabel}
            inFlightCommand={inFlightStopCommand}
            onRecordProgress={onRecordStopProgress}
            origin={view.order.route.origin}
            originLabel={view.order.route.origin.label}
            status={view.order.status}
            stops={view.order.route.stops}
          />

          {/* Stage 2 Checklist: Kiểm hàng & Bốc hàng */}
          {view.order.status === 'PICKING_UP' && (
            <View style={styles.pickingChecklistCard} testID="cargo-specs-checklist">
              <View style={styles.pickingChecklistHeader}>
                <View style={styles.pickingChecklistIconBadge}>
                  <IconCamera color={leopardPalette.primary} size={18} />
                </View>
                <View style={styles.pickingChecklistTitleCol}>
                  <Text style={styles.pickingChecklistTitle}>DANH SÁCH KIỂM HÀNG & BỐC HÀNG</Text>
                  <Text style={styles.pickingChecklistSubtitle}>
                    Kiểm tra đúng quy cách trước khi tài xế bốc hàng lên xe
                  </Text>
                </View>
              </View>

              <View style={styles.checklistItemsCol}>
                <View style={styles.checklistItemRow}>
                  <IconCheck color="#16A34A" size={16} strokeWidth={2.5} />
                  <Text style={styles.checklistItemLabel}>Tên hàng hóa:</Text>
                  <Text style={styles.checklistItemValue}>{view.order.cargoSummary}</Text>
                </View>
                <View style={styles.checklistItemRow}>
                  <IconCheck color="#16A34A" size={16} strokeWidth={2.5} />
                  <Text style={styles.checklistItemLabel}>Khối lượng:</Text>
                  <Text style={styles.checklistItemValue}>
                    {view.order.cargoWeightKg ? `${view.order.cargoWeightKg} kg` : 'Theo tải trọng xe'}
                  </Text>
                </View>
                <View style={styles.checklistItemRow}>
                  <IconCheck color="#16A34A" size={16} strokeWidth={2.5} />
                  <Text style={styles.checklistItemLabel}>Phí bốc xếp:</Text>
                  <Text style={styles.checklistItemValue}>Miễn phí bốc xếp tiêu chuẩn</Text>
                </View>
              </View>

              <Pressable
                accessibilityHint="Chụp ảnh hàng hóa trước khi bốc lên xe để làm bằng chứng tránh khiếu nại"
                accessibilityLabel="Chụp ảnh hàng trước khi bốc"
                accessibilityRole="button"
                onPress={() => {
                  setPreloadingPhotoCaptured(true);
                  if (onSelectProof) onSelectProof();
                }}
                style={({ pressed }) => [
                  styles.preloadingCaptureBtn,
                  preloadingPhotoCaptured ? styles.preloadingCaptureBtnDone : null,
                  pressed ? styles.pressed : null,
                ]}
                testID="btn-preloading-cargo-photo"
              >
                {preloadingPhotoCaptured ? (
                  <View style={styles.preloadingCaptureInner}>
                    <IconCheck color="#16A34A" size={16} strokeWidth={2.5} />
                    <Text style={styles.preloadingCaptureTextDone}>
                      Đã chụp ảnh kiểm hàng trước khi bốc (tránh khiếu nại)
                    </Text>
                  </View>
                ) : (
                  <View style={styles.preloadingCaptureInner}>
                    <IconCamera color={leopardPalette.primary} size={16} />
                    <Text style={styles.preloadingCaptureText}>
                      Chụp ảnh hàng trước khi bốc (tránh khiếu nại)
                    </Text>
                  </View>
                )}
              </Pressable>
            </View>
          )}

          {/* Thu tiền mặt (Cash on Delivery) khi đơn thanh toán CASH */}
          {isCashOrder && (view.order.status === 'IN_TRANSIT' || isTerminal) && (
            <View style={styles.cashCardOuter} testID="cash-collection-container">
              <View style={styles.cashCardInner}>
                <View style={styles.cashHeaderRow}>
                  <View style={[styles.cashIconBadge, isCashConfirmed ? styles.cashIconBadgeSuccess : null]}>
                    {isCashConfirmed ? (
                      <IconCheck color="#10B981" size={18} strokeWidth={2.5} />
                    ) : (
                      <IconTxPayment color="#D97706" size={18} />
                    )}
                  </View>
                  <View style={styles.cashHeaderTextCol}>
                    <Text style={styles.cashSectionTitle}>THU TIỀN MẶT KHI GIAO HÀNG (CASH)</Text>
                    <Text style={styles.cashSectionSubtitle}>
                      {isCashConfirmed ? 'Đã xác nhận thu tiền mặt từ khách' : 'Thu đúng cước tiền mặt khi bàn giao đơn hàng'}
                    </Text>
                  </View>
                  <View style={[styles.cashStatusPill, isCashConfirmed ? styles.cashStatusPillReady : styles.cashStatusPillPending]}>
                    <Text style={[styles.cashStatusPillText, isCashConfirmed ? styles.cashStatusPillTextReady : styles.cashStatusPillTextPending]}>
                      {isCashConfirmed ? 'ĐÃ THU TIỀN MẶT' : 'CHƯA THU TIỀN'}
                    </Text>
                  </View>
                </View>

                <View style={styles.cashAmountRow}>
                  <Text style={styles.cashAmountLabel}>Số tiền cước cần thu:</Text>
                  <Text style={styles.cashAmountValue} testID="cash-amount-to-collect">
                    {view.order.priceLabel ?? (view.order.priceVnd ? formatVndPrice(view.order.priceVnd) : 'Đang cập nhật')}
                  </Text>
                </View>

                {isCashConfirmed ? (
                  <View style={styles.cashSuccessNotice} testID="cash-confirmed-notice">
                    <IconCheck color="#15803D" size={16} strokeWidth={2.5} />
                    <Text style={styles.cashSuccessNoticeText}>
                      Đã xác nhận thu tiền mặt thành công. Hệ thống tự động xuất hóa đơn VAT điện tử.
                    </Text>
                  </View>
                ) : onConfirmCashPayment ? (
                  <View style={styles.cashActionWrap}>
                    <Button
                      disabled={isConfirmingCash}
                      isLoading={isConfirmingCash}
                      label="XÁC NHẬN ĐÃ THU TIỀN MẶT"
                      loadingLabel="Đang ghi nhận thu tiền..."
                      onPress={onConfirmCashPayment}
                      size="driver-primary"
                      testID="btn-confirm-cash"
                      variant="primary"
                    />
                    <Text style={styles.cashActionHint}>Bấm xác nhận sau khi đã nhận đủ tiền mặt từ khách</Text>
                  </View>
                ) : null}
              </View>
            </View>
          )}

          {(view.order.status === 'IN_TRANSIT' || view.order.status === 'DELIVERED') && (
            <EpodPanel
              isCashConfirmed={isCashConfirmed}
              onExecuteTask={onExecuteTask}
              onRetryProof={onRetryProof}
              onSelectProof={onSelectProof}
              orderId={view.order.id}
              paymentMethod={view.order.paymentMethod}
              paymentStatus={view.order.paymentStatus}
              priceLabel={view.order.priceLabel || (view.order.priceVnd ? formatVndPrice(view.order.priceVnd) : undefined)}
              proof={view.proof}
              status={view.order.status}
            />
          )}

          {view.tracking.kind === 'permission-denied' ? (
            <View style={styles.permissionAlertBox}>
              <Text accessibilityRole="alert" style={styles.permissionAlertTitle}>Quyền vị trí bị từ chối</Text>
              <Text style={styles.permissionAlertMessage}>
                Ứng dụng cần quyền vị trí để tiếp tục cập nhật lộ trình di chuyển của xe.
              </Text>
              <Button label="Mở cài đặt vị trí" onPress={onOpenLocationSettings} variant="secondary" />
            </View>
          ) : null}

          <DriverMissionExtras
            cargoSummary={view.order.cargoSummary}
            cargoWeightKg={view.order.cargoWeightKg}
            contactRoleLabel={view.order.contactRoleLabel}
            customerContact={view.order.customerContact}
            history={view.order.history}
            status={view.order.status}
            vehicleLabel={view.order.vehicleLabel}
          />
        </ScrollView>

        <DriverMissionActionBar
          customerContact={view.order.customerContact}
          isMissionActive={isMissionActive}
          isTerminal={isTerminal}
          legTitle={legTitle}
          navigationTarget={activeNavigationTarget}
          onBack={onBack}
          onOpenIncidentModal={onOpenIncidentModal}
          taskButtonComponent={
            !isTerminal && taskButtonComponent ? taskButtonComponent : undefined
          }
        />
      </View>
    </View>
  );
}
```

- [ ] **Step 4: Replace the styles block**

Replace the entire `const styles = StyleSheet.create({...})` (everything after the closing `}` of the component function) with:

```tsx
const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  topOverlay: {
    left: spacing.md,
    position: 'absolute',
    top: spacing.xl,
  },
  bottomStack: {
    bottom: 0,
    left: 0,
    position: 'absolute',
    right: 0,
  },
  sheet: {
    maxHeight: '48%',
  },
  sheetContent: {
    gap: 12,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
  },
  notice: {
    backgroundColor: '#FEF3C7',
    borderColor: '#FDE68A',
    borderRadius: 10,
    borderWidth: 1,
    padding: 10,
  },
  warningText: {
    color: '#B45309',
    fontSize: 11.5,
    fontWeight: '600',
  },
  permissionAlertBox: {
    backgroundColor: '#FEF2F2',
    borderColor: '#FECACA',
    borderRadius: 12,
    borderWidth: 1,
    gap: 8,
    padding: 12,
  },
  permissionAlertTitle: {
    color: '#991B1B',
    fontSize: 12.5,
    fontWeight: '800',
  },
  permissionAlertMessage: {
    color: '#7F1D1D',
    fontSize: 11.5,
    lineHeight: 16,
  },
  pickingChecklistCard: {
    backgroundColor: colors.neutral.surface,
    borderColor: colors.neutral.border,
    borderRadius: 14,
    borderWidth: 1,
    gap: 10,
    padding: 12,
  },
  pickingChecklistHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 10,
  },
  pickingChecklistIconBadge: {
    alignItems: 'center',
    backgroundColor: colors.neutral.canvas,
    borderRadius: 10,
    height: 36,
    justifyContent: 'center',
    width: 36,
  },
  pickingChecklistTitleCol: {
    flex: 1,
    gap: 2,
  },
  pickingChecklistTitle: {
    color: colors.neutral.text,
    fontSize: 11.5,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  pickingChecklistSubtitle: {
    color: colors.neutral.subtleText,
    fontSize: 11,
  },
  checklistItemsCol: {
    gap: 6,
  },
  checklistItemRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 6,
  },
  checklistItemLabel: {
    color: colors.neutral.subtleText,
    fontSize: 12,
    fontWeight: '600',
  },
  checklistItemValue: {
    color: colors.neutral.text,
    flexShrink: 1,
    fontSize: 12,
    fontWeight: '700',
  },
  preloadingCaptureBtn: {
    backgroundColor: colors.neutral.canvas,
    borderColor: colors.neutral.border,
    borderRadius: 10,
    borderWidth: 1,
    padding: 10,
  },
  preloadingCaptureBtnDone: {
    backgroundColor: '#F0FDF4',
    borderColor: '#BBF7D0',
  },
  preloadingCaptureInner: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  preloadingCaptureText: {
    color: leopardPalette.primary,
    flexShrink: 1,
    fontSize: 12,
    fontWeight: '700',
  },
  preloadingCaptureTextDone: {
    color: '#15803D',
    flexShrink: 1,
    fontSize: 12,
    fontWeight: '700',
  },
  cashCardOuter: {
    borderRadius: 14,
    overflow: 'hidden',
  },
  cashCardInner: {
    backgroundColor: colors.neutral.surface,
    borderColor: colors.neutral.border,
    borderRadius: 14,
    borderWidth: 1,
    gap: 10,
    padding: 12,
  },
  cashHeaderRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 10,
  },
  cashIconBadge: {
    alignItems: 'center',
    backgroundColor: '#FFFBEB',
    borderRadius: 10,
    height: 36,
    justifyContent: 'center',
    width: 36,
  },
  cashIconBadgeSuccess: {
    backgroundColor: '#F0FDF4',
  },
  cashHeaderTextCol: {
    flex: 1,
    gap: 2,
  },
  cashSectionTitle: {
    color: colors.neutral.text,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  cashSectionSubtitle: {
    color: colors.neutral.subtleText,
    fontSize: 10.5,
  },
  cashStatusPill: {
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  cashStatusPillReady: {
    backgroundColor: '#F0FDF4',
  },
  cashStatusPillPending: {
    backgroundColor: '#FFFBEB',
  },
  cashStatusPillText: {
    fontSize: 9.5,
    fontWeight: '800',
  },
  cashStatusPillTextReady: {
    color: '#15803D',
  },
  cashStatusPillTextPending: {
    color: '#B45309',
  },
  cashAmountRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  cashAmountLabel: {
    color: colors.neutral.subtleText,
    fontSize: 12,
    fontWeight: '600',
  },
  cashAmountValue: {
    color: colors.neutral.text,
    fontSize: 16,
    fontWeight: '800',
  },
  cashSuccessNotice: {
    alignItems: 'center',
    backgroundColor: '#F0FDF4',
    borderRadius: 10,
    flexDirection: 'row',
    gap: 8,
    padding: 10,
  },
  cashSuccessNoticeText: {
    color: '#15803D',
    flexShrink: 1,
    fontSize: 11,
    fontWeight: '600',
  },
  cashActionWrap: {
    gap: 6,
  },
  cashActionHint: {
    color: colors.neutral.subtleText,
    fontSize: 10.5,
    textAlign: 'center',
  },
  pressed: {
    opacity: 0.8,
  },
});
```

- [ ] **Step 5: Run the full targeted test suite**

Run: `pnpm --filter driver test -- DriverOrderDetailScreen DriverOrderDetailRuntime AssignedDetailView`
Expected: PASS — every pre-existing test from the Task 0 baseline still passes unmodified, because every testID/label it queries is still rendered without prior interaction (verify by re-reading the Task 0 list against the new JSX above: `btn-advance-leg-slide` renders inside `taskButtonComponent` passed through to `DriverMissionActionBar`; `Gọi cho người nhận`, `btn-navigate-active-leg`, `btn-open-incident-modal`, `btn-report-incident`, `btn-terminal-home` all render inside `DriverMissionActionBar`; `cargo-specs-checklist`/`btn-preloading-cargo-photo`, the e-POD testIDs, `cash-amount-to-collect`, and the `VerticalRouteStepper` origin-label text all render inside the sheet `ScrollView` without needing the `DriverMissionExtras` toggle).

- [ ] **Step 6: Run driver typecheck**

Run: `pnpm --filter driver typecheck`
Expected: no errors. If `isMissionActive`/`activeNavigationTarget`/etc. show as unused-import or type errors, confirm they are still referenced in the new `return` block and `legTitle` computation — they should be.

- [ ] **Step 7: Commit**

```bash
git add apps/driver/src/features/orders/components/detail/AssignedDetailView.tsx
git commit -m "refactor(driver): rebuild mission cockpit as map-first floating layout"
```

---

## Task 6: Manual verification checklist (no automated test — record results in the PR description)

- [ ] **Step 1: Start the Driver Expo app**

Run: `pnpm --filter driver start`

- [ ] **Step 2: Walk the flow**

Accept a demo order from the board → confirm the order detail screen now shows: no title header bar, the map filling the screen behind everything, a small floating back button top-left, a floating rounded action bar at the bottom with call/navigate/incident icons + the swipe-to-advance control, and a floating sheet above it showing the route stepper and (at the PICKING_UP stage) the cargo checklist. Tap "Xem thêm chi tiết chuyến" and confirm the progress dots, cargo spec chips, and timeline appear/collapse correctly.

- [ ] **Step 3: Record the result**

Note pass/fail and any visual issues (safe-area overlap with the floating back button, sheet `maxHeight` clipping content on small devices, etc.) in the PR description for the reviewing engineer.

---

## Self-Review Notes (already applied above)

- Every new file has a paired test written test-first.
- Every testID/accessibilityLabel referenced by the pre-existing test suite (enumerated in Task 0) is preserved verbatim and confirmed to still render without prior interaction.
- No task references a type/prop not defined by an earlier task (`DriverMissionActionBar`, `DriverMissionExtras`, `DriverMissionBackButton`, and `fillContainer` are all defined before Task 5 consumes them).
- Scope is a single file's composition plus three new small presentational components — no change to `apps/driver/src/features/orders/DriverOrderDetailScreen.tsx`, `DriverOrderDetailRuntime.tsx`, `model.ts`, or any backend/API contract.
