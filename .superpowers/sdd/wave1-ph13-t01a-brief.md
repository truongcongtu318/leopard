# PH-13-T01A Brief — Agent A

## Task contract

- Task ID: `PH-13-T01A` (database slice of canonical `PH-13-T01`)
- Goal: provide a deterministic PostgreSQL 17/PostGIS 3.5 local service and cleanup-safe verification so PH-02-T02 can run against a clean database.
- Baseline HEAD: `289e6a9`
- Dependencies verified: PH-02-T01 and D1 are VERIFIED.

## Required context

Read `AGENTS.md`, the PH-13-T01A section of `docs/superpowers/plans/2026-07-21-wave-1-two-agent-parallel-plan.md`, PH-13-T01 in `docs/superpowers/plans/13-quality-security-pilot-release.md`, `docs/development/01-local-setup.md`, the PH-02 env contract, and database/testing source-of-truth docs.

## Owned paths

- `compose.yaml` — PostgreSQL/PostGIS service only in this slice
- `.env.example`
- `infra/scripts/wait-for-db.sh`
- `infra/scripts/with-compose-cleanup.sh`
- `infra/scripts/test-compose.sh`
- Report: `.superpowers/sdd/wave1-ph13-t01a-report.md`

## Required RED

1. Write checks first for the exact PostGIS image/version, health check, environment interpolation/no real credential, and cleanup wrapper behavior.
2. Run `bash infra/scripts/test-compose.sh` before creating `compose.yaml`; record non-zero failure caused by the absent service/config.

## Implementation constraints

1. Use PostgreSQL 17/PostGIS 3.5 (expected image line `postgis/postgis:17-3.5`) with a `postgres` service and `pg_isready` health check.
2. Use environment interpolation and clearly demo-local defaults; never commit a real provider credential or personal data. `.env.example` must include the exact API contract names `NODE_ENV`, `PORT`, `DATABASE_URL`, `CORS_ORIGINS` and DB/demo-provider names needed by this slice. Real-provider credential values remain blank.
3. `wait-for-db.sh` must be bounded, fail non-zero on timeout, and avoid logging credentials.
4. `with-compose-cleanup.sh` must implement the exact status policy in the approved plan: preserve a command failure, always run `docker compose down`, and otherwise surface cleanup failure.
5. `test-compose.sh` must prove config/image/health/PostGIS readiness and a deliberate wrapped command failure remains non-zero with no service left running.
6. Do not add API/admin Dockerfiles or object-storage/application services yet; PH-13-T01 remains IN_PROGRESS after this slice.
7. Do not edit apps, mobile/admin/UI/shared, docs, root package/lock/workspace, CI, or Git state.

## Required GREEN

```text
docker compose config
bash infra/scripts/with-compose-cleanup.sh bash -lc 'docker compose up -d --wait postgres && bash infra/scripts/test-compose.sh'
```

Also verify a deliberately failing wrapped command returns its original non-zero status and `docker compose ps --status running` shows no service after cleanup. If Docker is unavailable or image pull is blocked, report the exact environmental blocker after static checks; do not weaken tests.

## Done when

- RED and GREEN/static/runtime evidence are recorded.
- Cleanup behavior is proven and no Compose service remains.
- Report state is `IN_REVIEW` or a precise `BLOCKED`.
- No Git mutation or out-of-ownership write occurred.
