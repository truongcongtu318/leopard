# Quality Security and Pilot Release Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Tạo platform foundation sớm và đưa integrated application qua security, performance, recovery, deployment và pilot release gates.

**Architecture:** Platform task ở Wave 1 tạo local/staging contracts nhưng không phụ thuộc feature. Wave 5 chạy trên integrated baseline, dùng deterministic seed, black-box E2E and operational drills; remediation được tách thành task theo root cause.

**Tech Stack:** Docker Compose, PostgreSQL/PostGIS, GitHub Actions, Playwright, k6-compatible load harness, structured logs.

## Global Constraints

- Staging một region, one primary DB, API/Socket same deployment.
- TLS outside local; no secrets in repo/logs/artifacts.
- Daily staging backup and verified restore before UAT.
- No commercial SLA, active-active, multi-region or automated bank reconciliation.

---

### Task PH-13-T01: Local Infrastructure Foundation (Wave 1)

**Files:**
- Create: `compose.yaml`, `infra/docker/api.Dockerfile`, `infra/docker/admin.Dockerfile`
- Create: `.env.example`, `infra/scripts/wait-for-db.sh`
- Test: `infra/scripts/test-compose.sh`

**Interfaces:** PostgreSQL 17/PostGIS 3.5 health service, local object directory, app env names documented in provider design.

- [ ] Write compose test checking config validity, health checks, non-root app users and absence of literal credentials; observe failure.
- [ ] Implement local services and multi-stage Dockerfiles using Node 24 LTS; `.env.example` contains blank real-provider credentials and demo defaults.
- [ ] Run `docker compose config` and infrastructure test; expected exit 0.
- [ ] Commit `build(infra): add local pilot runtime`.

### Task PH-13-T02: Seed and Migration Operations (Wave 1)

**Files:**
- Create: `apps/api/prisma/seed.ts`, `infra/seed/demo-manifest.json`
- Create: `infra/scripts/reset-demo.sh`, `infra/scripts/test-migrations.sh`
- Test: `apps/api/test/seed-determinism.spec.ts`

**Interfaces:** Seed exact Customer, Driver, Fleet Owner, Admin, two fleets, active/inactive memberships and orders in every lifecycle state with fixed IDs.

- [ ] Test two seed runs produce same logical records and no duplicate active sessions/intents.
- [ ] Implement idempotent upserts without real personal data; demo phone numbers use reserved examples.
- [ ] Run clean migration, seed twice and upgrade-path test.
- [ ] Commit `build(data): add deterministic pilot seed`.

### Task PH-13-T03: CI Matrix and Supply Chain Gate

**Files:**
- Modify: `.github/workflows/ci.yml`
- Create: `.github/workflows/security.yml`, `.github/dependabot.yml`
- Test: `scripts/verify-ci.mjs`

**Interfaces:** PR jobs: install, lint, typecheck, unit, integration, build, contract; protected deployment job does not run on fork PR.

- [ ] Test pinned action majors, minimal permissions, frozen lockfile, no secret exposure and dependency audit policy.
- [ ] Implement service DB for integration and cache keyed by lockfile; upload only non-sensitive test artifacts.
- [ ] Run CI verifier and local equivalent commands.
- [ ] Commit `ci: expand pilot quality and security gates`.

### Task PH-13-T04: Security and Privacy Validation (Wave 5)

**Files:**
- Create: `apps/api/test/security/authorization.e2e-spec.ts`, `input-hardening.e2e-spec.ts`, `session-security.e2e-spec.ts`
- Create: `docs/testing/evidence/pilot-security.md`

**Interfaces:** Evidence maps tests to AC-01..AC-07 and NFR-04/05/06/07/11.

- [ ] Test IDOR for every resource, role escalation, inactive FleetMember, JWT/refresh replay, upload abuse, pagination abuse, provider error redaction and rate limits.
- [ ] Run secret scan and dependency audit; triage severity with exact package/path.
- [ ] Record commands/results and create remediation tasks for any P0/P1; release remains blocked until rerun passes.
- [ ] Commit `test(security): validate pilot access boundaries`.

### Task PH-13-T05: Performance, Recovery and Observability (Wave 5)

**Files:**
- Create: `infra/scripts/load-pilot.js`, `infra/scripts/backup.sh`, `infra/scripts/restore.sh`
- Create: `docs/testing/evidence/pilot-performance.md`, `pilot-recovery.md`
- Test: `apps/api/test/observability.e2e-spec.ts`

**Interfaces:** P95 ordinary API under 800 ms excluding provider; tracking under 3 seconds; logs include requestId/actorId/error code; backup restore manifest.

- [ ] Run representative read/write load with seed volume and record p50/p95/error rate/provider latency separately.
- [ ] Verify health state, request/audit correlation and secret/PII redaction.
- [ ] Backup staging-like DB, restore into fresh DB, run record-count/integrity smoke and main role journeys.
- [ ] Commit `test(operations): verify performance and recovery`.

### Task PH-13-T06: Deployment and Pilot Release Gate

**Files:**
- Create: `infra/scripts/deploy-staging.sh`, `infra/scripts/smoke-staging.sh`, `infra/scripts/rollback-staging.sh`
- Create: `docs/testing/evidence/pilot-release.md`
- Modify: `README.md`, `docs/architecture/06-deployment-architecture.md`

**Interfaces:** immutable image tag/commit SHA, migration-before-app procedure, health/smoke/rollback contract.

- [ ] Test deploy script dry-run, missing-secret failure, migration failure stop, readiness wait and rollback to previous image.
- [ ] Deploy staging candidate, run P0 E2E for four roles, provider fallback and health/audit smoke.
- [ ] Run final `pnpm lint`, `typecheck`, `test`, `test:e2e`, `build`, migration and Docker image gates; expected all exit 0.
- [ ] Record exact commit/images/migrations/evidence, then commit `docs(release): record pilot readiness evidence`.

## Phase Boundary Rules

- Do not mark release ready with open P0/P1 or failed recovery drill.
- Do not make CI require real provider credentials for deterministic tests.
- Do not mutate feature behavior inside QA task; open scoped remediation task.
- Do not deploy from unverified phase branch; only Wave 5 integration baseline.
