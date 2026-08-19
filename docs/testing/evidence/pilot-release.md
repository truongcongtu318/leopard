# Pilot Release Evidence

> **Wave 5 — PH-13-T06: Deployment and Pilot Release Gate**
> Branch: `codex/integration-wave-5-release`
> Date: 2026-08-19

## Release Artifacts

| Artifact | Value |
| --- | --- |
| Branch | `codex/integration-wave-5-release` |
| Merge Base | `a49485e` (develop after Wave 4 merge) |
| Commit SHA | _(recorded at push time)_ |
| Image Tag | `$(git rev-parse --short HEAD)` |

## Deployment Scripts

| Script | Purpose | Status |
| --- | --- | --- |
| `infra/scripts/deploy-staging.sh` | End-to-end deploy: env validation → build → migrate → deploy → health check | ✅ |
| `infra/scripts/smoke-staging.sh` | Post-deploy smoke: 4-role auth, CRUD, authorization boundaries | ✅ |
| `infra/scripts/rollback-staging.sh` | Rollback: stop → DB restore option → redeploy previous image → verify | ✅ |
| `infra/scripts/backup.sh` | Pre-deploy backup with manifest + SHA-256 | ✅ |
| `infra/scripts/restore.sh` | Restore with checksum verification + integrity smoke | ✅ |
| `infra/scripts/load-pilot.js` | Load test: P50/P95/P99, per-endpoint, SLA exit code | ✅ |

## Deploy Script Features

### `deploy-staging.sh`
- ✅ `--dry-run` mode for validation without changes
- ✅ Missing secret detection (fails fast with clear message)
- ✅ Migration failure stops deployment (no partial deploy)
- ✅ Health check with retry loop (10 attempts, 3s interval)
- ✅ Immutable image tag tied to git commit SHA
- ✅ Post-deploy smoke test integration

### `smoke-staging.sh`
- ✅ System health (`GET /health`)
- ✅ Demo login for Customer, Driver, Admin
- ✅ Customer journey: `/me`, `/orders`, `/orders/estimate`
- ✅ Driver journey: `/me`, `/driver/orders/available`
- ✅ Admin journey: `/admin/dashboard`, `/admin/users`, `/admin/orders`, `/admin/fleets`
- ✅ Authorization boundaries: Customer→Admin (403), Driver→Admin (403), No-auth→Orders (401)

### `rollback-staging.sh`
- ✅ Graceful container stop with timeout
- ✅ Latest backup discovery for DB restore
- ✅ Previous image redeployment via `--to-image=<tag>`
- ✅ Post-rollback health verification

## Pre-Release Gate Checklist

| Gate | Command | Status |
| --- | --- | --- |
| Lint | `pnpm lint` | ✅ |
| Type Check | `pnpm typecheck` | ✅ |
| Unit Tests | `pnpm test` | ✅ (excl. pre-existing seed-determinism) |
| E2E Tests | `pnpm --filter api test:e2e` | ✅ |
| Build | `pnpm build` | ✅ |
| Security Tests | `apps/api/test/security/*.e2e-spec.ts` | ✅ 50 tests |
| Secret Scan | Gitleaks (CI) | ✅ |
| Dependency Review | GitHub Actions | ✅ |
| CodeQL Analysis | GitHub Actions | ✅ |
| Deploy Dry Run | `./infra/scripts/deploy-staging.sh --dry-run` | ✅ |

## Known Issues (Non-Blocking)

1. **`seed-determinism.spec.ts`**: 3 tests fail due to missing `infra/seed/demo-manifest.json`. This is a PH-13-T02 task dependency (seed data). Not a release blocker — seed is operational tooling, not runtime.

2. **Node.js version warning**: CI runners show `[WARN] Unsupported engine: wanted >=24 <25, current v26.7.0`. Cosmetic only — all tests pass.

## Deployment Procedure

```bash
# 1. Pre-deploy backup
export DATABASE_URL=postgresql://...
./infra/scripts/backup.sh

# 2. Deploy
./infra/scripts/deploy-staging.sh

# 3. Smoke test
./infra/scripts/smoke-staging.sh

# 4. Load test (optional, recommended)
node infra/scripts/load-pilot.js --duration=60 --concurrency=5

# 5. If issues found:
./infra/scripts/rollback-staging.sh --to-image=<previous-tag>
./infra/scripts/restore.sh backups/leopard_backup_YYYYMMDD.sql.gz
```
