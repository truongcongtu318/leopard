# PH-13-T02 Report - Seed and Migration Operations

- Status: GREEN
- Branch: `codex/ph-13-t02-seed-migration-ops`
- Base: `37f67bfacef76d73b44a9ae34d3fd9da5e36061d`
- Commit SHA: recorded in final task handoff because embedding the final self-referential SHA in this file would change the commit hash again

## Changed Files

- `apps/api/prisma/seed.ts`
- `apps/api/test/seed-determinism.spec.ts`
- `infra/seed/demo-manifest.json`

## RED Evidence

Command:

```bash
DATABASE_URL='postgresql://leopard:leopard_local@127.0.0.1:5432/leopard?schema=public' \
  ./apps/api/node_modules/.bin/jest \
  --config apps/api/jest.config.cjs \
  --runInBand \
  --runTestsByPath apps/api/test/seed-determinism.spec.ts
```

Result:

- Exit code `1`
- First failure: `Expected: > 0 / Received: 0` because the manifest had no canonical `driverProfiles[].location = null` case, so stale location clearing was unprovable.
- After adding the null-location regression and manifest timestamps, the same spec still failed because demo rows kept runtime `createdAt`/`updatedAt` values and stale demo-owned `User`/`DriverProfile`/`Fleet`/`FleetMember`/`Order` rows survived reseed.
- This proved the task still needed both manifest-backed deterministic timestamps and source-of-truth cleanup inside the demo ownership boundary.

## GREEN Evidence

Primary verification command:

```bash
DATABASE_URL='postgresql://leopard:leopard_local@127.0.0.1:5432/leopard?schema=public' \
  ./infra/scripts/test-migrations.sh
```

Result:

- Exit code `0`
- `prisma generate` succeeded with `apps/api/prisma.config.ts`
- `prisma migrate reset --force` reapplied `0001_baseline`
- Seed ran twice with identical logical output: `Seeded 8 users, 2 fleets and 6 orders.`
- `prisma migrate deploy` returned `No pending migrations to apply.`
- `apps/api/test/seed-determinism.spec.ts` passed
- `apps/api/test/database-schema.spec.ts` passed
- `apps/api/src/health/health.e2e-spec.ts` passed
- `apps/api/src/app.e2e-spec.ts` passed
- Direct API typecheck passed via `./node_modules/.bin/tsc --noEmit --project apps/api/tsconfig.json`
- Direct API lint passed via `../../node_modules/.bin/eslint .` from `apps/api`

## Exact Commands Run

```bash
docker compose up -d postgres
DATABASE_URL='postgresql://leopard:leopard_local@127.0.0.1:5432/leopard?schema=public' ./infra/scripts/reset-demo.sh
DATABASE_URL='postgresql://leopard:leopard_local@127.0.0.1:5432/leopard?schema=public' node --experimental-strip-types apps/api/prisma/seed.ts
DATABASE_URL='postgresql://leopard:leopard_local@127.0.0.1:5432/leopard?schema=public' ./infra/scripts/test-migrations.sh
DATABASE_URL='postgresql://leopard:leopard_local@127.0.0.1:5432/leopard?schema=public' ./apps/api/node_modules/.bin/jest --config apps/api/jest.config.cjs --runInBand --runTestsByPath apps/api/test/seed-determinism.spec.ts
./node_modules/.bin/tsc --noEmit --project apps/api/tsconfig.json
../../node_modules/.bin/eslint .
```

## Implementation Notes

- Seed data is driven by `infra/seed/demo-manifest.json` with fixed UUIDs and reserved example phones only.
- The seed now treats the demo dataset as replaceable source-of-truth inside a narrow ownership boundary: users with reserved demo phones, fleets named `Demo Fleet *`, and orders attached to those demo users.
- Repeated runs delete only demo-owned rows, then recreate canonical users, driver profiles, fleets, memberships, orders, refresh sessions, and order children with deterministic `createdAt`/`updatedAt` values derived from the manifest.
- The manifest now includes one canonical driver profile with `location: null`; reseed clears any leftover `lastKnownLocation` for that row.
- The determinism spec now snapshots logical counts plus row-level timestamps for users, profiles, fleets, memberships, sessions, orders, stops, tracking points, media objects, payment intents, and status history.

## Concerns

- The e2e Jest run finishes green but still emits the pre-existing warning: `Jest did not exit one second after the test run has completed.` No failing assertions accompanied it, and this task stayed within the owned seed/migration surface instead of changing shared test/runtime behavior.
- `pnpm --filter api typecheck` and `pnpm --filter api lint` did not reach source analysis in this worktree because the wrapper tripped the repo's ignored-build/install gate (`@scarf/scarf`, `sharp`). The direct installed binaries completed successfully, so the code itself was still verified.
