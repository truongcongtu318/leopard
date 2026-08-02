# PH-13-T02 Report - Seed and Migration Operations

- Status: GREEN (manifest-boundary and migration-guard follow-up)
- Branch: `codex/ph-13-t02-seed-migration-ops`
- Prior implementation: `7b6f56803e74fe309a8fe95c2a1af9f62000e87`
- Prior hardening commit: `332566d8f7d832c1b255b024bbafb840461f1cfd`
- Implementation commit: `563b50a`
- Report commit SHA: recorded in the final task handoff because embedding the self-referential SHA would change this commit hash

## Changed Files

- `apps/api/prisma/seed.ts`
- `apps/api/test/seed-determinism.spec.ts`
- `infra/scripts/assert-local-database-url.sh`
- `infra/scripts/reset-demo.sh`
- `infra/scripts/test-migration-safety.sh`
- `infra/scripts/test-migrations.sh`

No schema, feature endpoint, workspace configuration, or other worktree was changed.

## Review-Finding Evidence

The follow-up addressed two review findings without changing schema, endpoints, workspace configuration, or other worktrees:

- `seed.ts` now derives users, driver profiles, fleets, fleet members, refresh sessions, orders, and every manifest order child ID from `infra/seed/demo-manifest.json`. Cleanup uses those explicit IDs; actor-linked audit/history/tracking/media cleanup remains scoped to manifest user IDs. Prefix-based user/fleet discovery and both `DEMO_*_PREFIX` constants are gone.
- The determinism fixture is a non-demo user and fleet outside the manifest with the retired phone/name prefixes. It, its related rows, and the existing non-demo rows survive reseed, while manifest-null driver location is reset.
- The database URL guard accepts only `localhost`, `127.0.0.1`, and `::1` for PostgreSQL URLs. `ALLOW_DESTRUCTIVE_RESET=1` cannot bypass remote-host rejection, and the safety script asserts that behavior.

## Verification Evidence

Focused seed determinism:

```bash
DATABASE_URL='postgresql://leopard:leopard_local@127.0.0.1:5432/leopard?schema=public' \
  ./apps/api/node_modules/.bin/jest \
  --config apps/api/jest.config.cjs \
  --runInBand \
  --runTestsByPath apps/api/test/seed-determinism.spec.ts
```

Result: exit `0`; 1 suite and 3 tests passed, including prefix-collision preservation and transaction rollback.

Primary migration and seed gate:

```bash
DATABASE_URL='postgresql://leopard:leopard_local@127.0.0.1:5432/leopard?schema=public' \
  ./infra/scripts/test-migrations.sh
```

Result: exit `0`.

- Clean reset reapplied `0001_baseline`.
- Seed ran twice: `Seeded 8 users, 2 fleets and 6 orders.`
- Two consecutive `prisma migrate deploy` runs reported no pending migrations.
- The upgrade invariant passed: exactly one applied baseline migration, no rollback, and the recorded checksum matched `apps/api/prisma/migrations/0001_baseline/migration.sql`.
- `seed-determinism.spec.ts` and `database-schema.spec.ts`: 2 suites, 10 tests passed.
- Health and app e2e suites: 2 suites, 5 tests passed.

Additional verification:

```bash
bash -n infra/scripts/assert-local-database-url.sh infra/scripts/reset-demo.sh \
  infra/scripts/test-migrations.sh infra/scripts/test-migration-safety.sh
./infra/scripts/test-migration-safety.sh
./node_modules/.bin/tsc --noEmit --project apps/api/tsconfig.json
./node_modules/.bin/tsc --noEmit --target ES2022 --module NodeNext \
  --moduleResolution NodeNext --skipLibCheck apps/api/prisma/seed.ts
(cd apps/api && ../../node_modules/.bin/eslint .)
```

All direct verification commands exited `0`. The shell safety test verified that non-local hosts, including `127.evil`, fail before Docker or migration reset, both with and without `ALLOW_DESTRUCTIVE_RESET=1`.

The pnpm preflight commands below were also attempted and each exited `1` before source analysis because the repository's install policy rejected ignored builds for `@scarf/scarf@1.4.0` and `sharp@0.34.5` (`ERR_PNPM_IGNORED_BUILDS`):

```bash
pnpm --filter api typecheck
pnpm --filter api lint
pnpm --filter api test -- --runInBand --testPathPatterns='seed-determinism\.spec\.ts$'
```

The installed direct tsc, eslint, and database-backed commands above were used as the verified fallback. The e2e Jest command still emits the pre-existing open-handle warning after its passing assertions.

## Implementation Notes

- `reset-demo.sh` and `test-migrations.sh` parse `DATABASE_URL` before any generation, Docker, or reset command. Only loopback PostgreSQL hosts are accepted; remote hosts cannot be enabled by an environment variable.
- Demo cleanup uses one bounded transaction-scoped Prisma client. Top-level and order-child rows are deleted by IDs from the current manifest. Actor-owned `AuditLog`, `OrderStatusHistory`, `TrackingPoint`, and `MediaObject` rows are removed only for manifest user IDs; the regression fixture proves an outside-manifest prefix collision survives.
- All Prisma writes and raw PostGIS statements use the interactive transaction client. The `@prisma/adapter-pg` path supports transaction-scoped raw statements, so no adapter fallback was needed. The injected mid-seed trigger proves cleanup, Prisma writes, and raw PostGIS changes roll back together.
- The repository has one baseline migration only. The migration script tests the truthful upgrade invariant available here: repeated deploy is idempotent, the baseline is fully applied, no rollback is recorded, and its checksum matches the checked-in SQL. No unrelated migration was invented.

## Scope and Risks

- PH-05-T05 was not run, as explicitly excluded.
- The pnpm wrapper gate remains blocked by the existing ignored-build approval policy; direct installed verification passed.
- The pre-existing Jest open-handle warning remains after the passing e2e assertions and is outside this seed/migration scope.
- Ownership violations: none. Other worktrees were not touched.
