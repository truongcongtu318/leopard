# Admin Operations Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement FR-09/US-14/US-15 operational queries, filters, audited privileged commands and Admin dashboard.

**Architecture:** `AdminModule` orchestrates public application services; it does not mutate tables owned by other modules directly. All sensitive commands require reason/note and append audit in the same transaction.

**Tech Stack:** NestJS/Prisma, Next.js, TanStack Table, Playwright.

## Global Constraints

- Admin APIs require explicit `ADMIN`; no role implication.
- Pagination/filter/sort execute server-side with allowlisted fields.
- Sensitive actions record actor/action/target/time/requestId/metadata.
- No hard delete of operational records.

---

### Task PH-11-T01: Admin Query APIs

**Files:**
- Create: `apps/api/src/admin/admin.module.ts`, `admin.controller.ts`, `admin-query.service.ts`
- Test: `apps/api/src/admin/admin-query.e2e-spec.ts`

**Interfaces:** `GET /admin/dashboard`, `/admin/users`, `/admin/fleets`, `/admin/drivers`, `/admin/orders`; Admin order detail uses authorized `GET /orders/:id`.

- [ ] Test Admin-only access, page bounds, allowlisted sort, status/customer/driver/date filters, aggregate consistency and no N+1 query regression fixture.
- [ ] Implement bounded selects through module query services and stable page envelope.
- [ ] Run E2E/OpenAPI tests with seed volume.
- [ ] Commit `feat(admin): expose operational query APIs`.

### Task PH-11-T02: Audited Admin Commands

**Files:**
- Create: `apps/api/src/admin/admin-command.service.ts`
- Test: `apps/api/src/admin/admin-command.integration-spec.ts`
- Modify: `apps/api/src/admin/admin.controller.ts`, `apps/api/src/admin/admin-command.service.ts`

**Interfaces:** `PATCH /admin/users/:id/status {status,reason,clientRequestId}`; Admin cancellation uses `POST /orders/:id/cancel {reason}`; FleetMember mutation remains internal Admin service until a public endpoint is added through contract change; payment confirmation remains PH-09 service.

- [ ] Test mandatory reason, self-disable prevention, transaction rollback and immutable audit record.
- [ ] Implement commands by calling Users/Orders/Fleets application services inside declared transaction boundaries.
- [ ] Run integration tests and verify no direct cross-module repository mutation.
- [ ] Commit `feat(admin): add audited operational commands`.

### Task PH-11-T03: Admin Dashboard Pages

**Files:**
- Create: `apps/admin/src/app/(admin)/admin/page.tsx`, `orders/page.tsx`, `orders/[id]/page.tsx`, `users/page.tsx`, `fleets/page.tsx`, `drivers/page.tsx`
- Create: `apps/admin/src/features/admin/AdminOverview.tsx`, `AdminOrderTable.tsx`, `AdminOrderDetail.tsx`, `UserTable.tsx`, `FleetTable.tsx`, `DriverTable.tsx`, `AdminCommandDialog.tsx`
- Test: `apps/admin/src/features/admin/admin-pages.test.tsx`, `AdminCommandDialog.test.tsx`

**Interfaces:** Consumes PH-11 APIs and PH-09 confirmation command; filter state lives in URL.

- [ ] Test KPI/error states, filters/sort/pagination, clear filters, audited dialog requiring reason and permission denied.
- [ ] Implement operational layouts without marketing cards; preserve stable table columns and tablet row-detail fallback.
- [ ] Run component/a11y tests and visual Playwright at 768/1024/1440.
- [ ] Commit `feat(admin): build operational dashboard workflows`.

### Task PH-11-T04: Audit and Operations Gate

**Files:**
- Create: `apps/api/src/audit/audit.module.ts`, `audit.service.ts`, `audit.repository.ts`
- Test: `apps/api/test/admin-audit.e2e-spec.ts`, `apps/admin/e2e/admin-operations.spec.ts`

**Interfaces:** `AuditService.append(input)` is append-only; Admin detail can read authorized audit timeline.

- [ ] Test all privileged commands create exactly one audit record and failed transactions create none.
- [ ] Verify log requestId links to audit requestId without sensitive payload.
- [ ] Run API/admin full gates and E2E command flows.
- [ ] Commit `test(admin): verify audited operations workflows`.

## Phase Boundary Rules

- Do not create generic superuser bypass.
- Do not allow arbitrary sort column, raw SQL filter or hard delete.
- Do not display destructive action without confirmation and required reason.
