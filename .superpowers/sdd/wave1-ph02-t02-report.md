# PH-02-T02 Prisma/PostGIS Baseline Report

## State

`IN_REVIEW` — clean-database GREEN passed twice (2026-07-23).

## Scope implemented

- Added the canonical Prisma 7 schema and CLI config for 12 pilot models and 11
  shared enums.
- Added `0001_baseline` with UUID primary keys, `timestamptz`, integer operational
  units, constrained JSONB snapshots, protected foreign keys, ordered history, and
  the required lookup, deduplication, partial-unique, and GiST indexes.
- Enabled PostGIS and stored stop, tracking, and last-known coordinates as
  `geography(Point,4326)`.
- Added Prisma 7 ESM `PrismaService` using `PrismaPg`, plus an exported
  `DatabaseModule`.
- Added database metadata tests covering the canonical objects and constraints.
- No seed, endpoint, controller, or feature business logic was added.

## TDD and dependency chronology

The metadata test was created before the implementation. The clean-database RED
reached Prisma and exited `1` because `prisma/schema.prisma` did not yet exist; the
cleanup wrapper then stopped and removed the container/network.

Prisma Client 7.8.0 requires a direct driver adapter. The initial dependency barrier
was reported before implementation, then resolved by the Coordinator with these exact
API manifest/lockfile additions:

- `@prisma/adapter-pg@7.8.0`
- `pg@8.22.0`
- `@types/pg@8.20.0`

This task did not install packages or edit the lockfile.

## Verification evidence available

| Check | Result |
| --- | --- |
| Coordinator: Prisma 7 CLI `validate` with Node 24 | exit `0` |
| Coordinator: Prisma Client `generate` with Node 24 | exit `0` |
| Coordinator: API typecheck with Node 24 | exit `0` |
| Direct `tsc --noEmit --project tsconfig.json` with Node 24 after the final metadata-test correction | exit `0` |
| Direct root ESLint over `apps/api` with Node 24 | exit `0` |
| SHA-256, `0001_baseline/migration.sql` | `D7EF3871F2969D5288FD2F05C85E9052F93EB1CDDDD8E38AC82CB6FE270612A7` |

The local sandbox cannot access `//./pipe/docker_engine`, so Docker GREEN is
intentionally not claimed here. A prior sandboxed Prisma validate also failed before
schema validation because Jiti could not write
`apps/api/node_modules/.cache/jiti/...mjs`; the Coordinator's direct Node 24 validate
supersedes that environment-only failure.

## Required clean-database GREEN

Run the following from PowerShell. It injects the approved Node 24 runtime into the
exact Git Bash process before invoking the task brief's command:

```powershell
& 'C:\Program Files\Git\bin\bash.exe' -lc 'export PATH="/c/Users/Pc/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin:$PATH"; cd /d/leopard; node --version; bash infra/scripts/with-compose-cleanup.sh bash -lc "POSTGRES_PORT=55432 DATABASE_URL=postgresql://leopard:leopard_local@127.0.0.1:55432/leopard?schema=public docker compose up -d --wait postgres && POSTGRES_PORT=55432 DATABASE_URL=postgresql://leopard:leopard_local@127.0.0.1:55432/leopard?schema=public pnpm --filter api --fail-if-no-match prisma:migrate:test && POSTGRES_PORT=55432 DATABASE_URL=postgresql://leopard:leopard_local@127.0.0.1:55432/leopard?schema=public pnpm --filter api --fail-if-no-match test -- database-schema && POSTGRES_PORT=55432 DATABASE_URL=postgresql://leopard:leopard_local@127.0.0.1:55432/leopard?schema=public pnpm --filter api --fail-if-no-match typecheck"'
```

Run that complete cleanup-wrapped command twice. Each wrapper run tears down the
tmpfs-backed database, so the second run proves deployment against a recreated clean
database rather than reapplication to the same migration history. Record both exit
codes, the two metadata test summaries, `node --version` (`v24.x`), and final
`docker compose ps` cleanup evidence. Only after both runs pass may State become
`IN_REVIEW`.

### Clean-database GREEN evidence (2026-07-23)

**Run 1:**
- Node: v24.14.0
- Prisma migrate deploy: exit 0, migration 0001_baseline applied
- Database schema tests: 7 passed, 7 total
- API typecheck: exit 0
- Container/network cleanup: confirmed (docker compose ps empty)
- Wrapper exit: 0

**Run 2:**
- Prisma migrate deploy: exit 0, migration 0001_baseline applied (fresh recreated DB)
- Database schema tests: 7 passed, 7 total
- API typecheck: exit 0
- Container/network cleanup: confirmed (docker compose ps empty)
- Wrapper exit: 0

**Test fix applied:** The enum comparison test and the delete-action query were corrected for PostgreSQL array-string format and reserved-word aliasing before the GREEN runs. See test file for details.

## Contract impact and risks

- This establishes the database contract consumed by later auth, order, tracking,
  media, payment, and admin modules; it does not expose a public API yet.
- Partial unique indexes and PostGIS GiST indexes live in raw SQL because Prisma's
  schema DSL cannot fully express them. Future migration generation must preserve
  these database-native objects.
- `RefreshSession` is the only relation with cascading delete. Ownership, order
  history, tracking, media, payment, fleet membership, and audit references use
  restrictive deletion.
- Runtime readiness remains conditional on the two clean-database gates above.

## Ownership confirmation

- Implementation changes are confined to the PH-02-T02 owned Prisma, database
  service/module, metadata test, and report paths.
- The Coordinator-owned API manifest/lockfile dependency synchronization is recorded
  but was not performed by this task.
- No Git mutation, seed data, generated source commit, shared/docs/root/infra/mobile/
  admin edit, or out-of-scope feature was made.
