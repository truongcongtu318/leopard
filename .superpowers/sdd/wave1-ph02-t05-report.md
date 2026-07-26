# PH-02-T05: Health (Liveness + Readiness) Endpoints -- Report

**State:** IN_REVIEW
**Date:** 2026-07-23
**Branch:** codex/wave-1-runtime-foundations

---

## Summary

Implemented Health (Liveness + Readiness) endpoints and e2e tests for LEOPARD API.

## Files Created

| File | Purpose |
|------|---------|
| `apps/api/src/health/health.service.ts` | Service with `getLiveness()` (no DB) and `getReadiness()` (SELECT 1 with 3s timeout) |
| `apps/api/src/health/health.controller.ts` | Controller mapping GET /health/live and GET /health/ready |
| `apps/api/src/health/health.module.ts` | Module importing DatabaseModule for PrismaService access |
| `apps/api/src/health/health.e2e-spec.ts` | E2E tests: liveness 200, readiness 200 (skipped without DB), readiness 503 (mocked) |

## Files Modified

| File | Change |
|------|--------|
| `apps/api/src/app.module.ts` | Added `HealthModule` to imports |

## Behavioral Contract

- **GET /health/live** -- returns `{ status: "ok", uptime: <seconds> }` with 200. No database access.
- **GET /health/ready** -- executes `SELECT 1` via PrismaService with 3-second bounded timeout.
  - On success: `{ status: "ready", database: "connected" }` with 200.
  - On failure/timeout: `{ status: "not_ready", code: "SERVICE_NOT_READY", message: "Database not available" }` with 503.

## GREEN Gate Results

| Gate | Result |
|------|--------|
| `pnpm --filter api test:e2e -- health` | 3 passed, 1 skipped (DB-available test requires DATABASE_URL) |
| `pnpm --filter api typecheck` | Passed |
| `pnpm --filter api lint` | Passed |
| `pnpm --filter api build` | Passed |
| `pnpm --filter api test:contract` | 34 passed (HealthStatus schema already in openapi.yaml) |
| `pnpm --filter api test` | 2/3 suites pass; database-schema.spec.ts fails due to missing DATABASE_URL (pre-existing, unrelated) |

## Test Coverage

- `/health/live` returns 200 with correct body shape (no DB)
- `/health/live` does not contact the database (PrismaService mocked to empty object)
- `/health/ready` with available DB: returns 200 (conditionally runs when DATABASE_URL is set)
- `/health/ready` with unavailable DB: returns 503 with SERVICE_NOT_READY envelope (PrismaService mocked to throw)
