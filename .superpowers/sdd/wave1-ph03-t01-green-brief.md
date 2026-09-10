# PH-03-T01 GREEN Brief — Agent B

## Task contract

- Task ID: `PH-03-T01`
- Goal: implement the minimal Expo Router runtime shell now that D1 dependencies and RED evidence are confirmed.
- Baseline HEAD: `ae64d68`
- Dependencies verified: D1 frozen install PASS, peer check PASS, mobile RED exits 1 only because `../app/_layout` is missing.

## Required context

Read `AGENTS.md`, the PH-03-T01 section of `docs/superpowers/plans/2026-07-21-wave-1-two-agent-parallel-plan.md`, `docs/superpowers/plans/03-expo-mobile-foundation.md`, relevant UI rules, and the completed pre-D1 brief/report.

## Owned paths

- `apps/mobile/app/_layout.tsx`
- `apps/mobile/app/index.tsx`
- Existing PH-03-T01 files under `apps/mobile/**` only when required to make this task correct
- Report: `.superpowers/sdd/wave1-ph03-t01-green-report.md`

## Behavior and constraints

1. Create the Expo Router root with application identity already fixed as `com.leopard.pilot`.
2. Provide a minimal safe-area boundary, error boundary, and explicit provider slot suitable for later providers.
3. The initial route may only be a neutral operational placeholder. Do not implement login, order, tracking, role navigation, business rules, decorative hero, marketing cards, gradients, or glassmorphism.
4. Preserve the smoke test intent: root layout mounts without logging an error.
5. Keep layouts usable at 360x800 and 390x844 with no horizontal overflow; do not introduce raw design-system behavior beyond the minimal shell.
6. Do not add dependencies, run install, edit `pnpm-lock.yaml`, root/shared/API/admin/UI/docs/infra/CI files, or mutate Git.

## Required GREEN verification

Run with Node 24 and pnpm 11.11:

```text
pnpm --filter mobile --fail-if-no-match test
pnpm --filter mobile --fail-if-no-match typecheck
pnpm --filter mobile --fail-if-no-match lint
pnpm --filter mobile --fail-if-no-match export
```

If a command fails because a dependency is truly missing, stop and report `BLOCKED` rather than editing the manifest or running install. Append exact commands, exit results, files changed, manual viewport reasoning/evidence, risks, and ownership confirmation to the report.

## Done when

- All four scoped commands exit 0.
- No feature screen or protected data exists.
- Report state is `IN_REVIEW` with RED and GREEN evidence.
- No Git mutation or lockfile modification occurred.
