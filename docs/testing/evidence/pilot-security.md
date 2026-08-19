# Pilot Security Evidence

> **Wave 5 — PH-13-T04: Security and Privacy Validation**
> Branch: `codex/integration-wave-5-release`
> Date: 2026-08-19

## Test Suite Summary

| Test File | Category | Tests | Status |
| --- | --- | --- | --- |
| `authorization.e2e-spec.ts` | IDOR, Role Escalation, Fleet Boundaries | 22 | ✅ |
| `session-security.e2e-spec.ts` | Token Rotation, Replay, Forgery, Logout | 14 | ✅ |
| `input-hardening.e2e-spec.ts` | Coordinate Validation, Pagination, Media, Error Redaction | 14 | ✅ |
| **Total** | | **50** | **✅ PASS** |

## AC / NFR Mapping Matrix

| Requirement | Test Evidence | Verdict |
| --- | --- | --- |
| AC-01: Customer creates and tracks own orders only | `authorization.e2e-spec.ts` — IDOR tests (Customer 2 → Order 1 = 404) | ✅ |
| AC-02: Driver accepts and manages assigned orders only | `authorization.e2e-spec.ts` — Driver IDOR (Driver 2 → Order 1 status = 403) | ✅ |
| AC-03: Fleet Owner sees only own fleet data | `authorization.e2e-spec.ts` — Fleet multi-tenancy (FO1 → Fleet 2 drivers/orders = filtered/404) | ✅ |
| AC-04: Admin oversees all with audit trail | `authorization.e2e-spec.ts` — Admin endpoint access (200), non-Admin (403) | ✅ |
| AC-05: Phone auth with OTP | `session-security.e2e-spec.ts` — Token lifecycle, refresh rotation | ✅ |
| AC-06: Realtime GPS tracking authorization | `authorization.e2e-spec.ts` — Tracking IDOR (cross-customer/driver = 404) | ✅ |
| AC-07: Payment authorization boundaries | `authorization.e2e-spec.ts` — Payment IDOR (cross-customer = 403) | ✅ |
| NFR-04: Input validation | `input-hardening.e2e-spec.ts` — Lat/Lng boundaries, vehicle type injection | ✅ |
| NFR-05: Error redaction | `input-hardening.e2e-spec.ts` — No stack traces, SQL, or file paths in 500 responses | ✅ |
| NFR-06: Session security | `session-security.e2e-spec.ts` — Refresh replay rejection, JWT tampering, alg:none rejection | ✅ |
| NFR-07: Media upload safety | `input-hardening.e2e-spec.ts` — 10MB limit, magic-byte MIME validation, PHP shell rejection | ✅ |
| NFR-11: Fleet membership boundaries | `authorization.e2e-spec.ts` — INVITED/REMOVED/no-membership = 403 | ✅ |

## Verification Commands

```bash
# Run all security tests (unit-level, uses InMemoryPrismaService)
DATABASE_URL=postgresql://leopard:leopard_local@localhost:5432/leopard pnpm --filter api test

# Run E2E tests (integration with real database)
DATABASE_URL=postgresql://leopard:leopard_local@localhost:5432/leopard pnpm --filter api test:e2e
```

## Pre-Existing Issues (Out of Scope)

- `test/seed-determinism.spec.ts`: 3 tests fail due to missing seed file (`infra/seed/demo-manifest.json`). This is a Task PH-13-T02 dependency and will be addressed in that task.

## Secret Scan

```bash
# Gitleaks scan (automated in CI via .github/workflows/security.yml)
gitleaks detect --source . --verbose --redact
# Result: No secrets found ✅
```

## Dependency Audit

```bash
# npm audit (automated in CI via dependency-review-action)
pnpm audit --prod
# Result: No critical vulnerabilities ✅
```
