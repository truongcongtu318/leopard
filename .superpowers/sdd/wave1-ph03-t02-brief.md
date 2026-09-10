# PH-03-T02 Brief — Agent B

## Task contract

- Task ID: `PH-03-T02`
- Goal: establish mobile role-routing and hydration policy for Customer/Driver without ever rendering protected content before session authorization.
- Baseline HEAD: `289e6a9`
- Dependencies verified: PH-03-T01 and D1 are VERIFIED.

## Required context

Read `AGENTS.md`, PH-03-T02 in both Wave 1 and `docs/superpowers/plans/03-expo-mobile-foundation.md`, `packages/shared/src/enums.ts`, user stories/acceptance criteria, and UI navigation/responsive/state docs.

## Owned paths

- `apps/mobile/app/(public)/login.tsx`
- `apps/mobile/app/(customer)/_layout.tsx`
- `apps/mobile/app/(customer)/orders/index.tsx`
- `apps/mobile/app/(driver)/_layout.tsx`
- `apps/mobile/app/(driver)/orders/index.tsx`
- `apps/mobile/src/navigation/role-router.ts`
- `apps/mobile/src/navigation/role-router.test.ts`
- Existing mobile config only if required by tests
- Report: `.superpowers/sdd/wave1-ph03-t02-report.md`

## Required RED

Write tests first and run:

```text
pnpm --filter mobile --fail-if-no-match test -- role-router
```

The RED must fail because role-routing policy is absent, not because test discovery/config/dependencies fail.

## Behavior and constraints

1. Consume the canonical `Role` type from `@leopard/shared`.
2. `getMobileHome(role)` maps exactly:
   - `CUSTOMER` -> `/(customer)/orders`
   - `DRIVER` -> `/(driver)/orders`
   - `FLEET_OWNER` and `ADMIN` -> `/(public)/login` with an explicit unsupported-mobile-role outcome in the guard policy.
3. Provide a small pure hydration/authorization policy that returns a non-content loading state before hydration and permits protected rendering only when the hydrated role exactly matches the route group. T04 will supply the real session store; do not invent/persist a fake session or token.
4. Route-group layouts and screens are neutral shells only. Login may state that authentication is not implemented; order placeholders must contain no order/private/demo data. Fleet Owner/Admin mobile access must not inherit Admin privileges.
5. Tests cover all four roles, pre-hydration denial, unauthenticated/unsupported denial, exact-role allow, and mismatched-role denial. They must prove no protected-content decision is true before hydration.
6. No real login/order/tracking behavior, API calls, business rules, gradients, glassmorphism, decorative hero, fake cards, or raw protected fixtures.
7. Keep 360x800 and 390x844 safe by normal-flow text/no fixed width; use existing shell primitives only.
8. Do not add dependencies, install, edit lockfile/root/shared/API/admin/UI/docs/infra/CI, or mutate Git.

## Required GREEN

```text
pnpm --filter mobile --fail-if-no-match test -- role-router
pnpm --filter mobile --fail-if-no-match typecheck
pnpm --filter mobile --fail-if-no-match lint
pnpm --filter mobile --fail-if-no-match export
```

Use Node 24/pnpm 11.11. If export hits sandbox network restrictions, preserve the evidence and ask Coordinator to run the identical command; do not modify code to mask environment failure.

## Done when

- RED is valid and all GREEN commands pass (Coordinator may supply external export evidence).
- No protected data can be selected before hydration or for a mismatched/unsupported role.
- Report state is `IN_REVIEW` with viewport reasoning and ownership confirmation.
- No Git mutation or lockfile change occurred.
