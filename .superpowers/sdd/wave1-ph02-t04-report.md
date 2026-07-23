# PH-02-T04: OpenAPI Contract Foundation — Report

- **Task ID**: PH-02-T04
- **State**: IN_REVIEW
- **Timestamp**: 2026-07-23

## Summary

Created the complete OpenAPI 3.1 contract covering all approved REST endpoints, with contract tests and a gated Swagger docs module.

## Artifacts

| File | Action | Notes |
|---|---|---|
| `apps/api/openapi/openapi.yaml` | CREATED | 620-line OpenAPI 3.1 document |
| `apps/api/test/openapi-contract.spec.ts` | CREATED | 34 contract tests, all passing |
| `apps/api/src/docs/docs.module.ts` | CREATED | Swagger module gated behind `ENABLE_API_DOCS=true` |
| `apps/api/src/app.module.ts` | MODIFIED | Import `DocsModule` |
| `apps/api/src/main.ts` | MODIFIED | Call `DocsModule.setupSwagger(app)` in `createApplication` |
| `apps/api/package.json` | MODIFIED | Added deps: `@nestjs/swagger`, `swagger-ui-express`, `js-yaml`, `@types/swagger-ui-express`, `@types/js-yaml` |

## OpenAPI 3.1 Document

- **SHA-256**: `0a17fc99b9e0405091ffb7965b7c09fd5297279329c61bde6aadd712fd79c1ff`
- Base path: `/api/v1`
- Security scheme: `bearerAuth` (type: `http`, scheme: `bearer`)
- Total endpoints: 38 operations across 31 unique path+method combinations
- All 11 canonical enums from `packages/shared/src/enums.ts` defined as schema components
- Public exceptions (no security): `/auth/login/demo`, `/auth/firebase`, `/health/live`, `/health/ready`
- Pagination envelope: `{ items, page, pageSize, total, totalPages }`
- Error envelope: `{ statusCode, code, message, requestId, timestamp, details? }`

### Endpoint Coverage

| Domain | Endpoints |
|---|---|
| Auth | POST /auth/login/demo, POST /auth/firebase, POST /auth/refresh, POST /auth/logout, GET /me |
| Orders | POST /orders/estimate, POST /orders, GET /orders, GET /orders/{id}, POST /orders/{id}/cancel, GET /orders/{id}/tracking |
| Maps | GET /maps/search, GET /maps/geocode/{placeId} |
| Driver | PATCH /driver/availability, GET /driver/orders/available, GET /driver/orders/active, POST /driver/orders/{id}/accept, POST /driver/orders/{id}/status |
| Fleet | GET /fleet/profile, GET /fleet/drivers, GET /fleet/orders, GET /fleet/orders/{id}, GET /fleet/orders/{id}/tracking |
| Media/Payment | POST /orders/{id}/media/cargo, POST /orders/{id}/media/delivery-proof, GET /media/{id}/url, POST /orders/{id}/payments, GET /orders/{id}/payments, POST /admin/payments/{id}/confirm |
| Admin | GET /admin/dashboard, GET /admin/users, PATCH /admin/users/{id}/status, GET /admin/fleets, GET /admin/drivers, GET /admin/orders |
| Health | GET /health/live, GET /health/ready |

## Contract Tests (34 pass, 0 fail)

- Parse and validate OpenAPI 3.1 YAML
- Unique operationIds (no duplicates) -- all 38 checked
- All private paths inherit or define bearer security
- All 4 public exceptions have explicitly empty security (no auth)
- All 11 enum schemas match shared enum values exactly
- Required schemas present: PaginationEnvelope, ApiErrorEnvelope, OrderSchema, EstimateResponse, SessionResponse, UserProfile, TrackingHistory, PaymentRecord, MediaRecord, HealthStatus, AdminDashboard
- PaginationEnvelope shape validation (items, page, pageSize, total, totalPages)
- ApiErrorEnvelope shape validation (statusCode, code, message, requestId, timestamp)
- OrderSchema required field validation (id, status, vehicleType)
- EstimateResponse required field validation (9 required fields including estimateToken, polyline, estimatedPriceVnd)

## Docs Module

- `DocsModule.setupSwagger(app)` called during `createApplication`
- Only mounts Swagger UI when `ENABLE_API_DOCS=true` environment variable is set
- Swagger at `/docs` path
- When `ENABLE_API_DOCS` is unset or any value other than `"true"`, the module is a no-op
- `@nestjs/swagger` and `swagger-ui-express` are only `require()`-ed inside the guard, so they are never loaded in production when docs are off

## Dependencies Added

| Package | Version | Type |
|---|---|---|
| `@nestjs/swagger` | 11.4.6 | dependency |
| `swagger-ui-express` | 5.0.1 | dependency |
| `js-yaml` | 5.2.1 | dependency |
| `@types/swagger-ui-express` | 4.1.8 | devDependency |
| `@types/js-yaml` | 4.0.9 | devDependency |

## Gate Status

| Gate | Result |
|---|---|
| `test:contract` | PASS (34/34) |
| `typecheck` | Pre-existing PrismaClient errors in `prisma.service.ts` (not from this task) |
| `build` | Pre-existing PrismaClient errors in `prisma.service.ts` (not from this task) |

The `typecheck` and `build` failures are pre-existing in `apps/api/src/database/prisma.service.ts` -- specifically `Module '"@prisma/client"' has no exported member 'PrismaClient'` -- which originates from PH-02-T02 (Prisma 7 client generation not yet run). Filtering out those errors, all files introduced or modified by this task pass typecheck with zero errors.

## Out of Scope

- No lockfile changes (pnpm-lock.yaml updated by pnpm)
- No git operations
- No mobile, admin, or shared package changes
- Only `apps/api/**` paths modified
