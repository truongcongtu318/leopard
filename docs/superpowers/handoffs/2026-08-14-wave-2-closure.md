# Wave 2 Closure Handoff

Updated: 2026-08-14

## Status

Wave 2 is implementation-complete and its current `develop` baseline is:

`ae8e5a5ee27c482b9f5914af5e9b2f8cbd7fe4a7`

The baseline contains the PH-05 authentication/client fixes, PH-06 order and
driver domain, PH-07 map/pricing/ETA, and PH-13-T02 seed/migration operations.
Tracking, media, payment, Fleet Owner operations, and Admin operations remain
Wave 3 scope.

## Verification evidence

The following checks passed on the current workspace:

- `node scripts/check-workspace.mjs`
- `node scripts/verify-foundation.mjs`
- `node scripts/verify-ci.mjs`
- `DATABASE_URL=postgresql://leopard:leopard_local@localhost:5432/leopard prisma generate --schema prisma/schema.prisma`
- `./node_modules/.bin/turbo run lint typecheck test build --concurrency=1`
- `git diff --check`

Direct test evidence included 120 API unit tests, 64 API E2E tests, 81 web
tests, 96 mobile tests, 55 shared UI tests, and 3 shared contract tests. The
API suites reported three database-dependent tests skipped without a local
PostgreSQL service. API/web/mobile/shared typecheck and lint passed, API
TypeScript build passed, and mobile web export passed. Turbo also reported 23
successful cached tasks for the full workspace gate.

## Known verification boundary

- The local runtime uses Node 26.5.1 while the repository requires Node 24.
- The local Docker daemon is unavailable, so the real PostgreSQL/PostGIS race,
  migration, and seed upgrade path remains for the CI service.
- The direct Admin production build compiled but attempted to install a missing
  local TypeScript dependency; the existing typecheck passed and CI's frozen
  install should provide the dependency.
- The CI workflow now triggers on both `develop` and `main`; branch protection
  and required checks must be confirmed in GitHub after this change is merged.
- CI explicitly generates Prisma Client after dependency installation before
  lint, typecheck, test, integration, and build jobs.
- Migration verification uses a dedicated Jest schema config so
  `database-schema.spec.ts` is selected instead of being excluded by the
  default unit-test ignore patterns.

## Next baseline

Wave 3 may branch from this baseline. PH-08 Realtime Tracking and PH-09
Media/Payment can start in parallel. PH-10 Fleet Owner waits for tracking;
PH-11 Admin waits for payment and order dependencies.
