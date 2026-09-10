# PH-03-T03 Mobile Theme and UI Primitives Report

## State

`APPROVED` — cross-review passed with 0 findings (2026-07-23).

## Task and environment

- Goal: provide accessible semantic mobile theme and reusable state primitives without implementing feature screens.
- Baseline supplied by the task brief: `4a1527b`.
- Runtime used for all evidence: Node `24.14.0`, pnpm `11.11.0`, `CI=true`; Expo export also used `EXPO_NO_TELEMETRY=1`.
- No dependency was added or installed, and no manifest, lockfile, root/shared/API/admin/docs/infra/CI or Git state was changed.

## TDD evidence

### RED

The observable component suite was authored before the production primitives. The exact scoped command was discovered correctly and failed with exit code 1 because the implementation was absent:

```text
pnpm --filter mobile --fail-if-no-match test -- primitives
FAIL src/ui/primitives.test.tsx
Cannot find module '../theme/tokens'
```

This was a valid product RED, not a Jest configuration or package-resolution failure.

### GREEN and diagnostic correction

The first post-implementation run exposed overlapping asynchronous `act()` calls. Inspection of the installed React Native Testing Library 14 declarations/source confirmed that `fireEvent.press` returns a Promise. The tests were corrected to await each press; production behavior was not weakened to accommodate the harness.

A later typecheck identified that this React Native version does not declare `accessibilityDescribedBy` on `TextInput`. `FormField` now uses the supported `accessibilityHint` for spoken hint/error context and `nativeID` plus `accessibilityLabelledBy` for the explicit label relationship. Tests assert both observable relationships.

Final scoped result:

```text
PASS src/ui/primitives.test.tsx
Tests: 17 passed, 17 total
```

## Implemented behavior

- `tokens.ts`: the only spacing steps are `4/8/12/16/24/32`; control/card radius is `6`; typography and the required `neutral`, `brand`, `info`, `warning`, `active`, `success`, and `danger` semantic roles are centralized.
- `Button`: primary/secondary/destructive variants, 44px minimum touch height, stable loading/disabled copy, busy/disabled accessibility state, and duplicate-press blocking.
- `FormField`: visible label, input, wrapping hint, reserved inline error height, alert semantics, and accessible label plus spoken hint/error context.
- `StatusBadge`: exhaustive canonical shared-enum mapping to semantic roles while always displaying canonical status text.
- `ScreenState`: understandable loading, empty, error, success, permission-denied, and offline boundaries; optional actions; permission denial suppresses private children.
- `EtaIndicator`: `ETA dự kiến`, loading without a false zero value, understandable unavailable/error state, optional retry, rounded-up minute values, and exact adjacent `Dữ liệu mô phỏng` copy for every `DEMO` source state.

Tests use observable output and interaction assertions; no snapshots are used.

## Required GREEN gates

| Gate | Result |
| --- | --- |
| `pnpm --filter mobile --fail-if-no-match test -- primitives` | PASS — 17/17 |
| `pnpm --filter mobile --fail-if-no-match typecheck` | PASS |
| `pnpm --filter mobile --fail-if-no-match lint` | PASS |
| `pnpm --filter mobile --fail-if-no-match test` | PASS — 34/34 across 3 suites |
| `pnpm --filter mobile --fail-if-no-match export` | PASS — web bundle exported successfully |

## Viewport and layout evidence

Structural review covers both required `360x800` and `390x844` viewports:

- Every root primitive uses normal one-column flow and `alignSelf: 'stretch'` or content-sized `alignSelf: 'flex-start'`; no fixed content width, absolute positioning, horizontal row, gradient, glass layer, hero, or marketing card exists.
- Long labels/messages/hints/errors use `flexShrink: 1`; the badge is capped at `maxWidth: '100%'`; controls use horizontal padding within the available width.
- Loading/disabled Button labels render inside the same 44px-minimum control, so state changes do not introduce a separate control or fixed-width layout shift.
- The stable FormField error area reserves one caption line while allowing longer error copy to expand vertically in normal flow.
- Expo's web production export bundles the primitives without layout/build integration errors.

Browser/device screenshot tooling was not used for these standalone primitives, so no screenshots are claimed or fabricated. The layout properties above are directly testable at both target widths when feature screens consume the components.

## Owned files

- `apps/mobile/src/theme/tokens.ts`
- `apps/mobile/src/ui/Button.tsx`
- `apps/mobile/src/ui/FormField.tsx`
- `apps/mobile/src/ui/StatusBadge.tsx`
- `apps/mobile/src/ui/ScreenState.tsx`
- `apps/mobile/src/ui/EtaIndicator.tsx`
- `apps/mobile/src/ui/primitives.test.tsx`
- `.superpowers/sdd/wave1-ph03-t03-report.md`

No private fixture, feature/API/session behavior, generated file, dependency, lockfile, or Git mutation is part of this task.
