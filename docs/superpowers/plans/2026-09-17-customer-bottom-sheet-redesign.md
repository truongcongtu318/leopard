# Customer App 3-Stage Gesture Bottom Sheet Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Redesign Customer App (`apps/mobile`) to use an Apple HIG 3-Stage Gesture Bottom Sheet with One-Thumb Ergonomics, eliminating obscuring full-screen modals while keeping 100% E2E test and unit test compatibility.

**Architecture:** A unified 3-stage draggable/tappable Bottom Sheet mounted over the full-bleed map in `HomeDashboardScreen.tsx`. Transitions smoothly between Stage 1 (25% Search/Hubs), Stage 2 (58% Routing & Vehicle Matrix), and Stage 3 (88% Add-ons & Confirmation).

**Tech Stack:** React Native, Expo, `@leopard/mobile-core` (Apple HIG tokens, `iosContinuousCurve`, `haptic`), Jest + React Native Testing Library, Playwright.

**Spec:** `docs/superpowers/specs/2026-09-17-customer-bottom-sheet-redesign.md`

## Global Constraints
- Primary color: Midnight Navy `#0B2545`, Accent: Cheetah Amber `#F59E0B`
- Continuous curves with `borderCurve: 'continuous'` (`...iosContinuousCurve`)
- Preserve all existing `testID`s: `home-fleet-matrix`, `vehicle-row-${id}`, `home-main-cta-btn`, `hub-chip-*`, `btn-confirm-booking-details`
- Zero regression on `pnpm --filter mobile test` and Playwright E2E test suite

---

### Task 1: Refactor HomeDashboardScreen Layout & Integrated Sheet Snap Points

**Files:**
- Modify: `apps/mobile/src/features/home/HomeDashboardScreen.tsx`
- Test: `apps/mobile/src/features/home/HomeDashboardScreen.test.tsx`

**Interfaces:**
- Consumes: `FLEET_VEHICLES`, `StopItem`, `BookingDetails`, `@leopard/mobile-core` design tokens.
- Produces: `HomeDashboardScreen` with 3-stage sheet states (`stage` 1 | 2 | 3).

- [ ] **Step 1: Check existing unit tests before refactoring**
Run: `pnpm --filter mobile test -- src/features/home/HomeDashboardScreen.test.tsx`
Expected: PASS

- [ ] **Step 2: Update HomeDashboardScreen state machine for 3 Snap Stages**
Introduce `sheetStage` (1: collapsed, 2: routing & vehicle matrix, 3: details & confirm). When dropoff is selected, automatically transition to Stage 2. When CTA is tapped in Stage 2, transition to Stage 3 or open details inline without a modal blocking the screen. Keep `btn-confirm-booking-details` and `home-main-cta-btn` active.

- [ ] **Step 3: Run unit tests to verify compatibility**
Run: `pnpm --filter mobile test -- src/features/home/HomeDashboardScreen.test.tsx`
Expected: PASS

- [ ] **Step 4: Verify with Playwright E2E spec 01 and 05**
Run: `pnpm --filter @leopard/e2e test specs/01-happy-path.spec.ts specs/05-fleet-vehicles.spec.ts`
Expected: PASS

- [ ] **Step 5: Commit changes**
```bash
git add apps/mobile/src/features/home/HomeDashboardScreen.tsx
git commit -m "feat(mobile): implement 3-stage gesture bottom sheet on Customer Home"
```

---

### Task 2: Polish One-Thumb Ergonomics, Add-on Toggles, and Visual Hierarchy

**Files:**
- Modify: `apps/mobile/src/features/home/HomeDashboardScreen.tsx`
- Modify: `apps/mobile/src/features/home/components/BookingDetailsModal.tsx`
- Test: `apps/mobile/src/features/home/HomeDashboardScreen.test.tsx`

- [ ] **Step 1: Style Stage 2 and Stage 3 with Apple HIG 2026 aesthetics**
Ensure vehicle cards display `name`, `badge`, `dimensions`, tabular monospace `estimatedPrice`, and ETA badge. Stage 3 presents clean iOS toggles for `hasLoadingSupport`, `hasVatInvoice`, and payment method chips with haptic feedback.

- [ ] **Step 2: Run all mobile unit tests**
Run: `pnpm --filter mobile test`
Expected: PASS

- [ ] **Step 3: Run full Playwright test suite**
Run: `pnpm --filter @leopard/e2e test`
Expected: All passing

- [ ] **Step 4: Commit changes**
```bash
git add apps/mobile/src/features/home/
git commit -m "style(mobile): refine One-Thumb Ergonomics and vehicle cards in bottom sheet"
```
