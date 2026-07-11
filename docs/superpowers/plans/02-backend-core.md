# Backend Core Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Tạo NestJS API core, PostgreSQL/PostGIS schema baseline, standard error/log pipeline và OpenAPI contract foundation.

**Architecture:** Modular monolith; controller parse/validate, application service sở hữu use case, repository sở hữu Prisma access. Global middleware tạo request ID; exception filter trả stable error envelope.

**Tech Stack:** NestJS 11.1.28, Prisma 7.8.0 ESM, PostgreSQL 17, PostGIS 3.5, Jest 30.4.2, Supertest.

## Global Constraints

- Branch `codex/ph-02-backend-core` từ Wave 0 baseline.
- PH-02 sở hữu `apps/api/prisma/**` và `apps/api/openapi/**` trong Wave 1.
- ID UUID, UTC timestamps, integer VND, PostGIS geography Point 4326.
- Không implement feature endpoint ngoài health và contract smoke.

---

### Task PH-02-T01: NestJS Application Shell

**Files:**
- Create: `apps/api/package.json`
- Create: `apps/api/tsconfig.json`
- Create: `apps/api/nest-cli.json`
- Create: `apps/api/src/main.ts`
- Create: `apps/api/src/app.module.ts`
- Create: `apps/api/src/config/env.schema.ts`
- Test: `apps/api/src/app.e2e-spec.ts`

**Interfaces:**
- Consumes: `@leopard/shared`, `@leopard/validators`.
- Produces: Nest app on `PORT`, prefix `/api/v1`, CORS allowlist, validation pipe.

- [ ] Write an E2E test expecting `GET /api/v1/health/live` to return 200; run `pnpm --filter api test:e2e` and observe missing app failure.
- [ ] Bootstrap Nest with `rawBody: false`, shutdown hooks, global prefix and strict env validation for `NODE_ENV`, `PORT`, `DATABASE_URL`.
- [ ] Run `pnpm --filter api test:e2e`; expected health route still 404, proving shell starts but HealthModule remains T05.
- [ ] Commit with `git commit -m "build(api): scaffold NestJS application"`.

### Task PH-02-T02: Prisma and PostGIS Baseline

**Files:**
- Create: `apps/api/prisma/schema.prisma`
- Create: `apps/api/prisma.config.ts`
- Create: `apps/api/prisma/migrations/0001_baseline/migration.sql`
- Create: `apps/api/src/database/prisma.service.ts`
- Create: `apps/api/src/database/database.module.ts`
- Test: `apps/api/test/database-schema.spec.ts`

**Interfaces:**
- Produces models: `User`, `RefreshSession`, `Fleet`, `FleetMember`, `DriverProfile`, `Order`, `OrderStop`, `OrderStatusHistory`, `TrackingPoint`, `MediaObject`, `Payment`, `AuditLog` exactly as `docs/data/01-database-design.md`.

- [ ] Write schema tests that query PostgreSQL metadata for required tables, unique active Driver assignment constraint, indexes on order status/date and GiST tracking location; run against empty DB and observe failure.
- [ ] Add `CREATE EXTENSION IF NOT EXISTS postgis`; use Prisma-supported scalar columns plus SQL migration for geography Point/index where Prisma representation is unsupported.
- [ ] Run `pnpm --filter api prisma:migrate:test`; expected migration applies twice safely on recreated test database and metadata tests pass.
- [ ] Commit with `git commit -m "feat(data): add pilot database baseline"`.

### Task PH-02-T03: Request Context, Errors and Logging

**Files:**
- Create: `apps/api/src/common/request-context.middleware.ts`
- Create: `apps/api/src/common/api-exception.filter.ts`
- Create: `apps/api/src/common/domain-error.ts`
- Create: `apps/api/src/common/logger.service.ts`
- Test: `apps/api/src/common/api-exception.filter.spec.ts`

**Interfaces:**
- Produces: `DomainError(code: string, status: number, message: string, details?: Record<string, unknown>)`; response `ApiErrorEnvelope`.

- [ ] Test generated/preserved `x-request-id`, 422 validation envelope, unknown 500 without stack/secret and structured fields `requestId`, `actorId`, `method`, `path`, `durationMs`.
- [ ] Run scoped tests and observe missing filter/middleware failure.
- [ ] Implement AsyncLocalStorage request context, stable filter mapping and JSON logger redaction for authorization/cookie/token/phone.
- [ ] Run `pnpm --filter api test -- common`; expected all tests pass.
- [ ] Commit with `git commit -m "feat(api): standardize errors and request logs"`.

### Task PH-02-T04: OpenAPI Contract Foundation

**Files:**
- Create: `apps/api/openapi/openapi.yaml`
- Create: `apps/api/test/openapi-contract.spec.ts`
- Create: `apps/api/src/docs/docs.module.ts`
- Modify: `apps/api/src/app.module.ts`

**Interfaces:**
- Produces OpenAPI 3.1 components for bearer auth, `ApiError`, `PageMeta`, roles/status enums, `GeoPoint`, `RouteEstimate`; path placeholders matching `docs/api/01-rest-api-spec.md`.

- [ ] Write tests validating OpenAPI 3.1 syntax, unique operation IDs, bearer security on private paths and exact enum values; observe failure without document.
- [ ] Define schemas and endpoint signatures without implementation; expose Swagger only when `ENABLE_API_DOCS=true` and never in production by default.
- [ ] Run `pnpm --filter api test:contract`; expected OpenAPI tests pass.
- [ ] Commit with `git commit -m "docs(api): establish OpenAPI contract baseline"`.

### Task PH-02-T05: Health and Backend Gate

**Files:**
- Create: `apps/api/src/health/health.module.ts`
- Create: `apps/api/src/health/health.controller.ts`
- Create: `apps/api/src/health/health.service.ts`
- Test: `apps/api/src/health/health.e2e-spec.ts`
- Modify: `apps/api/src/app.module.ts`

**Interfaces:**
- Produces: `GET /api/v1/health/live`, `GET /api/v1/health/ready`.

- [ ] Test liveness 200 without DB query; readiness 200 when `SELECT 1` succeeds and 503 with code `SERVICE_NOT_READY` when DB fails.
- [ ] Implement process liveness and bounded database readiness timeout.
- [ ] Run `pnpm --filter api lint`, `typecheck`, `test`, `test:e2e`, `build`, `prisma:migrate:test`; expected all exit 0.
- [ ] Commit with `git commit -m "feat(health): add liveness and readiness checks"`.

## Phase Boundary Rules

- Do not implement login, order, map, tracking, media, payment, Fleet or Admin endpoints.
- Do not let controllers access Prisma directly.
- Do not log request bodies, tokens, phone numbers or media content.
- Schema changes after this phase require a numbered additive migration and Contract Owner approval.
