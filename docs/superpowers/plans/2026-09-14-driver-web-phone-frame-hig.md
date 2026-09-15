# Driver Web Phone Frame & HIG Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Keep every Driver route inside a responsive, centered phone frame on web while preserving full-screen native behavior and Apple-HIG-aligned global interaction rules.

**Architecture:** Add one app-local viewport shell outside the Driver drawer provider, so routed content and provider-rendered overlays share one boundary. A pure resolver selects native, edge-to-edge web, centered web, or framed web presentation from platform and window width; the shell owns the single root safe area. A Driver-local modal surface keeps native platform modals but prevents web modal portals from escaping the frame. Shared `@leopard/mobile-core` layout remains unchanged.

**Tech Stack:** Expo 57, React Native 0.86, React Native Web 0.21, Expo Router, TypeScript, Jest Expo, React Native Testing Library.

**Spec:** `docs/ui/16-driver-web-phone-frame-apple-hig-spec.md`

## Global Constraints

- Modify `apps/driver` only, except for the already-created UI/testing/plan documents.
- Preserve the existing dirty working tree; do not revert or reformat unrelated files.
- Keep exactly one safe-area owner around the routed app.
- Native iOS/Android remains full-screen and uncapped.
- Web frame maximum is `430 x 932`; frame chrome begins at `768px` width.
- Do not add dependencies, browser DOM elements, a fake device notch, or a wrapper `ScrollView`.
- Do not change business rules, routes, APIs, permissions, providers, or persisted data.

---

### Task 1: Add the test-first viewport contract

**Files:**
- Create: `apps/driver/src/navigation/DriverViewportShell.test.tsx`
- Reference: `docs/testing/11-driver-web-phone-frame-hig-test-plan.md`

**Interfaces:**
- Consumes: Jest Expo and React Native Testing Library already present in `apps/driver/package.json`.
- Produces: executable expectations for `DRIVER_PHONE_FRAME`, `resolveDriverViewportMode`, and `DriverViewportShell`.

- [ ] **Step 1: Write failing boundary tests for the pure resolver**

```tsx
expect(resolveDriverViewportMode('native', 1440)).toBe('native');
expect(resolveDriverViewportMode('web', 479)).toBe('edge-to-edge-web');
expect(resolveDriverViewportMode('web', 480)).toBe('centered-web');
expect(resolveDriverViewportMode('web', 767)).toBe('centered-web');
expect(resolveDriverViewportMode('web', 768)).toBe('framed-web');
```

- [ ] **Step 2: Run the focused test and verify RED**

```bash
pnpm --filter driver test -- DriverViewportShell.test.tsx
```

Expected: FAIL because `DriverViewportShell` does not exist.

- [ ] **Step 3: Add failing render tests**

Mock the platform/window boundary through a small injected optional test seam or Jest
spies. Assert the exact test IDs and flattened styles described in the companion test
plan. Prefer testing public styles/behavior over snapshots.

- [ ] **Step 4: Run again and retain the expected RED evidence**

```bash
pnpm --filter driver test -- DriverViewportShell.test.tsx
```

Expected: resolver and render cases fail for missing implementation.

- [ ] **Step 5: Commit the test-only RED state if the team accepts red commits**

```bash
git add apps/driver/src/navigation/DriverViewportShell.test.tsx
git commit -m "test(driver): specify responsive web phone frame"
```

Otherwise keep the tests staged for Task 2 and make one green commit.

### Task 2: Implement the app-local viewport shell

**Files:**
- Create: `apps/driver/src/navigation/DriverViewportShell.tsx`
- Test: `apps/driver/src/navigation/DriverViewportShell.test.tsx`

**Interfaces:**
- Consumes: `Platform`, `SafeAreaView`, `StyleSheet`, `useWindowDimensions`, and `View`.
- Produces:

```ts
export const DRIVER_PHONE_FRAME: Readonly<{
  compactWebBreakpoint: 480;
  framedWebBreakpoint: 768;
  maxWidth: 430;
  maxHeight: 932;
  outerInset: 16;
}>;

export type DriverViewportMode = 'native' | 'edge-to-edge-web' | 'centered-web' | 'framed-web';
export function resolveDriverViewportMode(platform: 'web' | 'native', width: number): DriverViewportMode;
export function DriverViewportShell(props: Readonly<{ children: React.ReactNode }>): React.JSX.Element;
```

- [ ] **Step 1: Implement constants and the pure resolver**

Keep comparisons explicit: web width `<480` is edge-to-edge, `480–767` is centered,
and `>=768` is framed. Any non-web platform resolves to native.

- [ ] **Step 2: Implement the shell without a scroll wrapper**

Use an outer `View` (`driver-viewport-canvas`), an inner frame `View`
(`driver-viewport-frame`), and one `SafeAreaView` (`driver-safe-area`). On framed web,
calculate available frame height as `Math.min(932, Math.max(0, height - 32))`. On a
short viewport, fill available height instead of enforcing a minimum that causes body
overflow.

- [ ] **Step 3: Keep styles platform/mode specific**

Native and edge-to-edge web must not receive decorative radius, border, shadow, or
`maxWidth`. Centered web gets the width cap and neutral canvas but no device chrome.
Framed web gets the width/height cap, radius, border, shadow, and `overflow: 'hidden'`.

- [ ] **Step 4: Run the focused tests and verify GREEN**

```bash
pnpm --filter driver test -- DriverViewportShell.test.tsx
```

Expected: PASS for resolver boundaries, platform isolation, resizing, and containment.

- [ ] **Step 5: Typecheck the Driver package**

```bash
pnpm --filter driver typecheck
```

Expected: PASS; do not suppress React Native dimension/style errors with `any`.

- [ ] **Step 6: Commit the component and tests**

```bash
git add apps/driver/src/navigation/DriverViewportShell.tsx apps/driver/src/navigation/DriverViewportShell.test.tsx
git commit -m "feat(driver): constrain web app to responsive phone frame"
```

### Task 3: Integrate the shell outside routed content and drawer

**Files:**
- Modify: `apps/driver/app/_layout.tsx:3-5,57-73`
- Create: `apps/driver/app/root-layout.test.tsx`

**Interfaces:**
- Consumes: `DriverViewportShell` from Task 2.
- Produces: all Expo Router routes and the provider-rendered drawer inside the same
  Driver viewport boundary.

- [ ] **Step 1: Add the mandatory minimal composition test**

Mock `<Slot />` as routed content and mock `DriverDrawerProvider` to render both its child
and a drawer sentinel sibling. Assert both are descendants of `driver-viewport-frame`
and `driver-safe-area`. This catches the current provider-sibling containment risk.

- [ ] **Step 2: Replace the direct root safe-area wrapper**

Remove `SafeAreaView` from the imports in `_layout.tsx`, import
`DriverViewportShell`, and place the shell inside `SafeAreaProvider` but outside
`DriverDrawerProvider`:

```tsx
<QueryClientProvider client={queryClient}>
  <SafeAreaProvider>
    <DriverViewportShell>
      <DriverDrawerProvider>
        <DriverIdlePingListener />
        {children}
      </DriverDrawerProvider>
    </DriverViewportShell>
  </SafeAreaProvider>
</QueryClientProvider>
```

Keep `RootErrorBoundary`, query client, drawer behavior, and idle ping behavior unchanged.
`RootLayout` continues to pass `<Slot />` as the `RootProviders` child.

- [ ] **Step 3: Run the focused root/shell tests**

```bash
pnpm --filter driver test -- DriverViewportShell.test.tsx root-layout.test.tsx
```

Expected: both routed content and the mocked drawer sibling are inside the frame.

- [ ] **Step 4: Commit root integration**

```bash
git add apps/driver/app/_layout.tsx
git add apps/driver/app/root-layout.test.tsx
git commit -m "refactor(driver): apply viewport shell at app root"
```

### Task 4: Contain web modals and verify overlays

**Files:**
- Create: `apps/driver/src/navigation/DriverModalSurface.tsx`
- Create: `apps/driver/src/navigation/DriverModalSurface.test.tsx`
- Verify and modify only if a residual containment defect is reproduced:
  `apps/driver/src/navigation/DriverSidebarDrawer.tsx`
- Create only if that residual drawer defect is reproduced:
  `apps/driver/src/navigation/DriverSidebarDrawer.test.tsx`
- Modify only if a containment defect is reproduced:
  `apps/driver/src/features/orders/components/DriverBottomNavigation.tsx`
- Create only if that navigation defect is reproduced:
  `apps/driver/src/features/orders/components/DriverBottomNavigation.test.tsx`
- Modify: `apps/driver/src/features/orders/IncomingDispatchModal.tsx`
- Modify: `apps/driver/src/features/orders/DriverIncidentModal.tsx`
- Test: `apps/driver/src/features/orders/IncomingDispatchModal.test.tsx`
- Test: `apps/driver/src/features/orders/DriverIncidentModal.test.tsx`

**Interfaces:**
- Consumes: the root frame as the containing block.
- Produces: native platform modal behavior and web modal/drawer/dock containment inside
  the app frame.

- [ ] **Step 1: Write failing platform tests for `DriverModalSurface`**

Assert native delegates to React Native `Modal`; web visible state renders an
absolute-fill layer with modal semantics; web hidden state returns `null`.

- [ ] **Step 2: Implement the minimal platform-aware modal surface**

Use React Native primitives only. Do not add a DOM portal or dependency. Keep the web
layer in the framed React tree, use `StyleSheet.absoluteFillObject`, and preserve the
existing `visible`, `onRequestClose`, animation, and accessibility intent.

- [ ] **Step 3: Migrate the two known Driver operational modals**

Replace their direct React Native `Modal` wrapper with `DriverModalSurface`. Do not alter
countdown, incident validation, actions, copy, or business callbacks.

- [ ] **Step 4: Run focused modal tests**

```bash
pnpm --filter driver test -- DriverModalSurface.test.tsx IncomingDispatchModal.test.tsx DriverIncidentModal.test.tsx
```

Expected: PASS on native behavior and contained web rendering.

- [ ] **Step 5: Run web and inspect three representative viewports**

```bash
pnpm --filter driver web
```

Inspect `390x844`, `1024x768`, and `1440x900`. Open drawer, bottom navigation, incoming
offer, incident modal, chat keyboard, and a long order detail.

- [ ] **Step 6: For each residual drawer/dock escape, write one failing regression test**

The assertion must target the actual boundary issue (for example, overlay root uses
absolute fill within its parent) rather than snapshotting the whole screen.

- [ ] **Step 7: Apply the smallest residual local fix**

Prefer `absoluteFillObject`/parent-relative positioning and existing spacing tokens.
Do not change z-index globally, move components into a browser portal, or rewrite the
screen.

- [ ] **Step 8: Run the full overlay-focused set**

```bash
pnpm --filter driver test -- DriverModalSurface.test.tsx IncomingDispatchModal.test.tsx DriverIncidentModal.test.tsx
pnpm --filter driver test -- DriverSidebarDrawer.test.tsx
pnpm --filter driver test -- DriverBottomNavigation.test.tsx
```

The first command is mandatory. Run each latter command only when its named residual
test was created.

Expected: PASS and no new console error.

- [ ] **Step 9: Commit modal migration and any reproduced residual fixes**

```bash
git add apps/driver/src/navigation/DriverModalSurface.tsx apps/driver/src/navigation/DriverModalSurface.test.tsx
git add apps/driver/src/navigation/DriverSidebarDrawer.tsx apps/driver/src/navigation/DriverSidebarDrawer.test.tsx
git add apps/driver/src/features/orders/components/DriverBottomNavigation.tsx apps/driver/src/features/orders/components/DriverBottomNavigation.test.tsx
git add apps/driver/src/features/orders/IncomingDispatchModal.tsx apps/driver/src/features/orders/IncomingDispatchModal.test.tsx
git add apps/driver/src/features/orders/DriverIncidentModal.tsx apps/driver/src/features/orders/DriverIncidentModal.test.tsx
git commit -m "fix(driver): contain overlays within web phone frame"
```

Always stage the modal surface and two modal migrations. Stage the drawer/bottom-nav
pair only if its residual defect was reproduced and fixed.

### Task 5: Complete verification and evidence

**Files:**
- Verify: `docs/testing/11-driver-web-phone-frame-hig-test-plan.md`
- Update only if implementation differs by approved decision:
  `docs/ui/16-driver-web-phone-frame-apple-hig-spec.md`

**Interfaces:**
- Consumes: completed shell and any narrow containment fixes.
- Produces: merge-ready verification evidence with no P0/P1 issue.

- [ ] **Step 1: Run the full narrow gate**

```bash
pnpm --filter driver test
pnpm --filter driver typecheck
pnpm --filter driver lint
pnpm --filter driver export
pnpm --filter @leopard/mobile-core test
pnpm --filter @leopard/mobile-core typecheck
```

- [ ] **Step 2: Execute the full manual viewport matrix**

Use every route, viewport, interaction, and accessibility check in
`docs/testing/11-driver-web-phone-frame-hig-test-plan.md`. Capture the required evidence.

- [ ] **Step 3: Review the diff for scope and secrets**

```bash
git diff -- apps/driver docs/ui/16-driver-web-phone-frame-apple-hig-spec.md docs/testing/11-driver-web-phone-frame-hig-test-plan.md
```

Confirm no API/data/lifecycle changes, generated output, credentials, or unrelated
formatting are present.

- [ ] **Step 4: Request independent code and accessibility review**

Block completion on any P0/P1 finding: native frame capping, escaped overlays, hidden
primary actions, horizontal overflow, broken safe area, or inaccessible navigation.

- [ ] **Step 5: Commit any approved documentation correction**

```bash
git add docs/ui/16-driver-web-phone-frame-apple-hig-spec.md docs/testing/11-driver-web-phone-frame-hig-test-plan.md
git commit -m "docs(driver): record phone frame verification"
```

## Final acceptance checklist

- [ ] All eight acceptance criteria in the spec have direct test or visual evidence.
- [ ] Native remains full-screen; web never exceeds `430px` app width.
- [ ] Drawer, modal, dock, sticky action, and keyboard content stay within the frame.
- [ ] No shared mobile-core behavior changed.
- [ ] Driver tests, typecheck, lint, and export pass.
- [ ] Shared mobile-core tests and typecheck pass.
- [ ] No P0/P1 accessibility or responsive issue remains.
