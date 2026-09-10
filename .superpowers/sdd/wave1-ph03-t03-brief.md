# PH-03-T03 Brief — Agent B

## Task contract

- Task ID: `PH-03-T03`
- Goal: provide accessible semantic mobile theme and reusable state primitives without implementing feature screens.
- Baseline HEAD: `4a1527b`
- Dependencies verified: PH-03-T01/T02 VERIFIED.

## Required context

Read `AGENTS.md`, PH-03-T03 in Wave 1 and the mobile phase plan, `docs/ui/01-ui-principles.md`, `03-screen-specs.md`, `04-design-system.md`, `05-responsive-rules.md`, `06-empty-loading-error-states.md`, and canonical enums in `@leopard/shared`.

## Owned paths

- `apps/mobile/src/theme/tokens.ts`
- `apps/mobile/src/ui/Button.tsx`
- `apps/mobile/src/ui/FormField.tsx`
- `apps/mobile/src/ui/StatusBadge.tsx`
- `apps/mobile/src/ui/ScreenState.tsx`
- `apps/mobile/src/ui/EtaIndicator.tsx`
- `apps/mobile/src/ui/primitives.test.tsx`
- Report: `.superpowers/sdd/wave1-ph03-t03-report.md`

## Required RED

Write observable component tests first and run:

```text
pnpm --filter mobile --fail-if-no-match test -- primitives
```

RED must fail because primitives/tokens are absent, not because test configuration or package resolution fails.

## Behavior and constraints

1. Tokens expose only spacing `4/8/12/16/24/32`, control/card radius `6`, typography and WCAG-AA-oriented semantic color roles `neutral`, `brand`, `info`, `warning`, `active`, `success`, `danger`. Component source consumes tokens rather than scattering raw colors.
2. `Button` supports clear primary/secondary/destructive states, minimum touch height 44, disabled/loading behavior and a visible loading/disabled label; loading must not change control size or permit duplicate press.
3. `FormField` provides label, input, hint and stable inline error area with accessibility relationships; long copy wraps.
4. `StatusBadge` always renders status text and maps canonical statuses to semantic roles; color alone is never the signal.
5. `ScreenState` covers loading, empty, error, success, permission-denied and offline copy/action boundaries. Permission denied renders no private content.
6. `EtaIndicator({durationSeconds, source, isLoading, error})`:
   - labels values as `ETA dự kiến`;
   - loading never displays `0 phút`;
   - error/unavailable is understandable and retry-capable where provided;
   - `source === 'DEMO'` always shows exact copy `Dữ liệu mô phỏng` adjacent to the ETA context.
7. Tests cover 44px target, loading/disabled labels and press blocking, badge text, each screen state, ETA loading/error/value, and mandatory DEMO label.
8. No gradient, glassmorphism, decorative hero, marketing card, fixed-width mobile content, feature/API/session behavior, or private fixture.
9. Keep 360x800 and 390x844 safe: one-column normal flow, wrapping copy, no horizontal overflow/layout shift.
10. Do not add dependencies/install, edit lockfile/root/shared/API/admin/UI package/docs/infra/CI, or mutate Git.

## Required GREEN

```text
pnpm --filter mobile --fail-if-no-match test -- primitives
pnpm --filter mobile --fail-if-no-match typecheck
pnpm --filter mobile --fail-if-no-match lint
pnpm --filter mobile --fail-if-no-match test
pnpm --filter mobile --fail-if-no-match export
```

Record structural/manual viewport evidence for 360x800 and 390x844. If browser/device screenshot tooling is unavailable, state that limitation and provide testable layout evidence; do not fabricate screenshots.

## Done when

- Valid RED and all scoped GREEN gates pass.
- Required copy/accessibility/state behavior is covered by tests.
- Report state is `IN_REVIEW` with viewport/scope evidence.
- No dependency, lockfile or Git mutation occurred.
