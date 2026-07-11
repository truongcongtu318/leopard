# Fleet Owner Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement FR-04/AC-05 Fleet Owner Lite profile, Driver list, fleet-scoped orders, tracking and payment summary.

**Architecture:** Fleet authorization resolves active `FleetMember` then constrains every query by fleet ID and assigned Driver membership. Fleet Owner endpoints are read-only except permitted profile fields explicitly documented.

**Tech Stack:** NestJS/Prisma, Next.js operations web, TanStack Query/Table, Playwright.

## Global Constraints

- Fleet Owner never inherits Admin permissions.
- Inactive membership returns 403; data from another fleet is never returned.
- Orders become visible only when assigned Driver has active membership in Owner's fleet according to documented temporal policy.
- No dispatch, lifecycle update, payment confirmation or user disable.

---

### Task PH-10-T01: Fleet Membership Policy

**Files:**
- Create: `apps/api/src/fleets/fleet-membership.policy.ts`, `fleet-scope.repository.ts`
- Test: `apps/api/src/fleets/fleet-membership.policy.spec.ts`

**Interfaces:** `resolveFleetScope(actor): Promise<{fleetId:string;memberId:string}>`; `assertOrderInFleet(fleetId,orderId): Promise<void>`.

- [ ] Test active/inactive membership, Owner with no fleet, wrong fleet, unassigned order and assigned Driver membership.
- [ ] Implement server-side scope resolution without accepting fleet ID as authority from client.
- [ ] Run policy tests; expected 404 non-disclosure for foreign resources where appropriate and 403 inactive membership.
- [ ] Commit `feat(fleet): enforce active membership scope`.

### Task PH-10-T02: Fleet Read APIs

**Files:**
- Create: `apps/api/src/fleets/fleets.module.ts`, `fleet-owner.controller.ts`, `fleet-owner.service.ts`
- Test: `apps/api/src/fleets/fleet-owner.e2e-spec.ts`

**Interfaces:** `GET /fleet/profile`, `/fleet/drivers`, `/fleet/orders`, `/fleet/orders/:id`, `/fleet/orders/:id/tracking`.

- [ ] Test server pagination/filtering, Driver availability/active order/last location, order payment summary and strict fleet isolation.
- [ ] Implement select lists that omit private fields not required by UI; reuse Order/Tracking public query services.
- [ ] Run E2E/OpenAPI tests with two fleets and cross-fleet attack cases.
- [ ] Commit `feat(fleet): expose scoped fleet operations data`.

### Task PH-10-T03: Fleet Operations Pages

**Files:**
- Create: `apps/admin/src/app/(fleet)/fleet/page.tsx`, `drivers/page.tsx`, `orders/page.tsx`, `orders/[id]/page.tsx`
- Create: `apps/admin/src/features/fleet/FleetOverview.tsx`, `DriverTable.tsx`, `FleetOrderTable.tsx`, `FleetOrderDetail.tsx`
- Test: `apps/admin/src/features/fleet/FleetOverview.test.tsx`, `DriverTable.test.tsx`, `FleetOrderTable.test.tsx`, `FleetOrderDetail.test.tsx`

**Interfaces:** Consumes PH-10 APIs; URL owns `page`, `status`, `driverId`, `from`, `to` filters.

- [ ] Test KPI/empty/error/permission states, server pagination, clear filters, no mutation actions and DEMO ETA label.
- [ ] Implement dense responsive views using `packages/ui`; map has stable aspect and fallback/retry.
- [ ] Run component/a11y tests and Playwright at 768, 1024, 1440 widths.
- [ ] Commit `feat(fleet): add read-only operations dashboard`.

### Task PH-10-T04: Fleet Authorization Gate

**Files:**
- Test: `apps/api/test/fleet-isolation.e2e-spec.ts`, `apps/admin/e2e/fleet-owner.spec.ts`

**Interfaces:** Cross-fleet and forbidden-command evidence.

- [ ] Seed two fleets, active/inactive memberships, assigned/unassigned orders and tracking/payment records.
- [ ] Assert Owner cannot call status/payment/admin commands and cannot observe foreign IDs through list/count/detail/socket.
- [ ] Run API and admin full gates; expected all pass with no horizontal data leak.
- [ ] Commit `test(fleet): verify fleet owner isolation`.

## Phase Boundary Rules

- Do not add fleet revenue, commission, branches, configurable roles or dispatch.
- Do not implement fleet scope by filtering data already returned to browser.
- Do not show phone/address fields unless explicitly required and authorized.
