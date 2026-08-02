# PH-13-T02 Report - Seed and Migration Operations

- Status: GREEN
- Branch: `codex/ph-13-t02-seed-migration-ops`
- Base: `37f67bfacef76d73b44a9ae34d3fd9da5e36061d`
- Commit SHA: recorded in final task handoff because embedding the final self-referential SHA in this file would change the commit hash again

## Changed Files

- `apps/api/prisma/seed.ts`
- `apps/api/test/seed-determinism.spec.ts`
- `infra/seed/demo-manifest.json`
- `infra/scripts/reset-demo.sh`
- `infra/scripts/test-migrations.sh`

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
- Failure reason: `Cannot find module '/home/tutruong/project/leopard/.worktrees/ph-13-t02-seed-migration-ops/apps/api/prisma/seed.ts'`
- This proved the deterministic seed entrypoint and dataset were missing before implementation.

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

## Exact Commands Run

```bash
docker compose up -d postgres
DATABASE_URL='postgresql://leopard:leopard_local@127.0.0.1:5432/leopard?schema=public' ./apps/api/node_modules/.bin/prisma generate --config apps/api/prisma.config.ts --schema apps/api/prisma/schema.prisma
DATABASE_URL='postgresql://leopard:leopard_local@127.0.0.1:5432/leopard?schema=public' ./infra/scripts/test-migrations.sh
DATABASE_URL='postgresql://leopard:leopard_local@127.0.0.1:5432/leopard?schema=public' ./apps/api/node_modules/.bin/jest --config apps/api/jest.config.cjs --runInBand --testRegex='(database-schema|seed-determinism)\.spec\.ts$' --testPathIgnorePatterns='.*\.e2e-spec\.ts$'
DATABASE_URL='postgresql://leopard:leopard_local@127.0.0.1:5432/leopard?schema=public' ./apps/api/node_modules/.bin/jest --config apps/api/jest-e2e.config.cjs --runInBand --testRegex='(health|app)\.e2e-spec\.ts$' --testPathIgnorePatterns='database-schema\.spec\.ts$'
```

## Implementation Notes

- Seed data is driven by `infra/seed/demo-manifest.json` with fixed UUIDs and reserved example phones only.
- The manifest includes support Driver accounts so the dataset can satisfy the existing partial unique index on active `Order.driverId` while still covering `ACCEPTED`, `PICKING_UP`, and `IN_TRANSIT` at the same time.
- `seed.ts` uses the repo's Prisma 7 adapter pattern (`PrismaPg`) instead of a zero-argument client constructor.
- `test-migrations.sh` uses CLI regex overrides because the repo Jest configs intentionally ignore `database-schema.spec.ts` and `.e2e-spec.ts` by default.

## Concerns

- The e2e Jest run finishes green but still emits the pre-existing warning: `Jest did not exit one second after the test run has completed.` No failing assertions accompanied it, and this task stayed within the owned seed/migration surface instead of changing shared test/runtime behavior.
