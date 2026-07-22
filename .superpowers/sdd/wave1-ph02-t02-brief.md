# PH-02-T02 Brief — Agent A

## Task contract

- Task ID: `PH-02-T02`
- Goal: create the canonical pilot Prisma/PostGIS baseline and prove it by applying the migration to a clean PostgreSQL 17/PostGIS 3.5 database and querying metadata.
- Baseline HEAD: `4a1527b`
- Dependencies verified: PH-02-T01 VERIFIED; PH-13-T01A database slice GREEN/APPROVED and available in the shared working tree.

## Required context

Read `AGENTS.md`, PH-02-T02 in the Wave 1 and backend phase plans, all of `docs/data/01-database-design.md`, canonical enums in `packages/shared/src/enums.ts`, relevant SRS/API constraints, Prisma 7 installed package/docs, and the PH-13-T01A report. Treat shared/docs/root config as read-only.

## Owned paths

- `apps/api/prisma/schema.prisma`
- `apps/api/prisma.config.ts`
- `apps/api/prisma/migrations/0001_baseline/migration.sql`
- `apps/api/src/database/prisma.service.ts`
- `apps/api/src/database/database.module.ts`
- `apps/api/test/database-schema.spec.ts`
- Existing `apps/api/package.json` only for an explicit dependency blocker proposal; do not change it without Coordinator approval
- Report: `.superpowers/sdd/wave1-ph02-t02-report.md`

## Required RED

Write metadata tests first, then run against an empty clean database:

```text
pnpm --filter api --fail-if-no-match prisma:migrate:test
```

RED must fail because schema/migration objects are absent, not because the API workspace or Jest test is undiscovered. Use the PH-13 cleanup wrapper and `POSTGRES_PORT=55432` on this host if 5432 cannot bind.

## Canonical schema requirements

1. Models/tables: `User`, `RefreshSession`, `Fleet`, `FleetMember`, `DriverProfile`, `Order`, `OrderStop`, `OrderStatusHistory`, `TrackingPoint`, `MediaObject`, `PaymentIntent`, `AuditLog`.
2. Canonical enum values must exactly match `packages/shared/src/enums.ts` and `docs/data/01-database-design.md`.
3. UUID primary keys; every timestamp is `timestamptz`; VND/meters/seconds are integers; JSONB only for provider/audit snapshots.
4. `CREATE EXTENSION IF NOT EXISTS postgis`; stop/tracking/last-known positions use `geography(Point,4326)` where required, with GiST indexes.
5. Required indexes/constraints include:
   - order customer/date and status/date indexes;
   - partial active-order index/constraint for assigned Driver;
   - `FleetMember(fleetId, role, status)` plus pilot active-driver membership uniqueness;
   - tracking order/date index and unique `(orderId, clientPointId)` deduplication;
   - payment order/date index and partial unique active payment intent;
   - ordered stops and append-only history structure.
6. Foreign keys, nullability and delete behavior must protect ownership/history; do not add feature business logic or seed data.
7. Prisma schema/config and service must follow installed Prisma 7 ESM APIs. DatabaseModule exports PrismaService and no controller accesses Prisma.

## Dependency barrier

Do not run pnpm install or edit lockfile. If Prisma 7 runtime demonstrably requires a missing direct adapter/driver/generator dependency, stop and report exact package/version/peer evidence and minimal manifest change. Coordinator owns dependency synchronization.

## Required GREEN

```text
bash infra/scripts/with-compose-cleanup.sh bash -lc 'POSTGRES_PORT=55432 DATABASE_URL=postgresql://leopard:leopard_local@127.0.0.1:55432/leopard?schema=public docker compose up -d --wait postgres && POSTGRES_PORT=55432 DATABASE_URL=postgresql://leopard:leopard_local@127.0.0.1:55432/leopard?schema=public pnpm --filter api --fail-if-no-match prisma:migrate:test && pnpm --filter api --fail-if-no-match test -- database-schema && pnpm --filter api --fail-if-no-match typecheck'
```

Also prove migration deployment on a recreated clean database and record the SHA-256 checksum of `0001_baseline/migration.sql`. Do not claim idempotent reapplication of the same migration to the same history unless Prisma itself supports that exact flow.

## Done when

- RED is meaningful; migration applies cleanly; every required metadata assertion passes.
- Typecheck passes and cleanup leaves no Compose service.
- Report is `IN_REVIEW`, with checksum, contract impact, risks and ownership confirmation.
- No Git mutation, lockfile change, seed or out-of-scope feature exists.
