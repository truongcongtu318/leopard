# Cross-Client Integration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Hoàn thiện bốn user journeys Customer, Driver, Fleet Owner và Admin trên API contracts đã tích hợp, bao gồm mọi UI state và responsive requirement.

**Architecture:** Mỗi role là một independent lane/worktree. Mobile lanes dùng Expo Router/TanStack Query; web lanes dùng App Router/TanStack Query/Table. Integration tests dùng deterministic seed và shared test IDs ở client boundary, không dùng implementation detail selector.

**Tech Stack:** Expo 57, Next.js 16, Socket.IO client 4.8.3, Playwright 1.61.1, Maestro CLI 2.3.0.

## Global Constraints

- Bốn lane không sửa API, shared contracts, root navigation shell hoặc design tokens.
- Mọi main screen có loading, empty, error, success và permission-denied state.
- Customer/Driver không tràn ngang tại 360 px; web kiểm tra 768/1024/1440.
- Data persists after refresh/relaunch through API, không dùng fake client state ngoài tests.

---

### Task PH-12-T01: Customer Order List and Creation

**Files:**
- Create: `apps/mobile/app/(customer)/orders/new.tsx`, `[id].tsx`
- Create: `apps/mobile/src/features/customer/OrderListScreen.tsx`, `CreateOrderScreen.tsx`, `AddressField.tsx`, `RouteEstimatePanel.tsx`
- Test: `apps/mobile/src/features/customer/OrderListScreen.test.tsx`, `CreateOrderScreen.test.tsx`, `AddressField.test.tsx`, `RouteEstimatePanel.test.tsx`, `apps/mobile/e2e/customer-create-order.yaml`

**Interfaces:** Consumes map search/route estimate, POST/GET orders; estimate token required on submit.

- [ ] Test ordered 0–3 stops, coordinate validation, estimate loading/error/expiry, DEMO label, price/ETA and double-submit prevention.
- [ ] Implement address search debounce/cancellation, route panel and persisted order navigation.
- [ ] Run mobile tests and `pnpm --filter mobile test:e2e -- e2e/customer-create-order.yaml` at 360x800.
- [ ] Commit `feat(customer): create and review shipment orders`.

### Task PH-12-T02: Customer Tracking and Payment

**Files:**
- Create: `apps/mobile/src/features/customer/OrderDetailScreen.tsx`, `TrackingMap.tsx`, `PaymentPanel.tsx`
- Test: `apps/mobile/src/features/customer/OrderDetailScreen.test.tsx`, `TrackingMap.test.tsx`, `PaymentPanel.test.tsx`, `apps/mobile/e2e/customer-track-pay.yaml`

**Interfaces:** Consumes order room events, tracking history, QR/payment endpoints and cancellation.

- [ ] Test reconnect/history reconciliation, stale/no-location state, QR expiry, payment status refresh and valid cancellation visibility.
- [ ] Implement socket lifecycle tied to visible order; REST history fills event gaps after reconnect.
- [ ] Run tests and `pnpm --filter mobile test:e2e -- e2e/customer-track-pay.yaml`, including demo ETA/payment labels and refresh persistence.
- [ ] Commit `feat(customer): track orders and manage payment`.

### Task PH-12-T03: Driver Availability and Acceptance

**Files:**
- Create: `apps/mobile/app/(driver)/orders/[id].tsx`
- Create: `apps/mobile/src/features/driver/DriverOrderListScreen.tsx`, `DriverOrderScreen.tsx`
- Test: `apps/mobile/src/features/driver/DriverOrderListScreen.test.tsx`, `DriverOrderScreen.test.tsx`, `apps/mobile/e2e/driver-accept-order.yaml`

**Interfaces:** Consumes availability/list/accept endpoints.

- [ ] Test availability control, active-order banner, accept race conflict refresh and only one active order.
- [ ] Implement optimistic state only where server result is reversible; 409 acceptance triggers queue refresh and clear message.
- [ ] Run mobile tests and `pnpm --filter mobile test:e2e -- e2e/driver-accept-order.yaml` with two seeded Drivers.
- [ ] Commit `feat(driver): manage availability and accept orders`.

### Task PH-12-T04: Driver Delivery and Tracking

**Files:**
- Create: `apps/mobile/src/features/driver/DeliveryWorkflow.tsx`, `TrackingSender.ts`, `DeliveryProofField.tsx`
- Test: `apps/mobile/src/features/driver/DeliveryWorkflow.test.tsx`, `TrackingSender.test.ts`, `DeliveryProofField.test.tsx`, `apps/mobile/e2e/driver-delivery.yaml`

**Interfaces:** Consumes status, media and tracking socket contracts.

- [ ] Test next-state-only actions, foreground location permission denial, throttled points, offline retry without duplicate and delivery proof before DELIVERED.
- [ ] Implement foreground tracking lifecycle; stop sender on logout/order terminal/app background per pilot policy.
- [ ] Run `pnpm --filter mobile test:e2e -- e2e/driver-delivery.yaml` from REQUESTED through DELIVERED and verify Customer receives events.
- [ ] Commit `feat(driver): complete tracked delivery workflow`.

### Task PH-12-T05: Fleet Owner Web Journey

**Files:**
- Test: `apps/admin/e2e/fleet-owner-journey.spec.ts`
- Modify: only Fleet feature files created in PH-10 when integration defects are found

**Interfaces:** Consumes Fleet pages/APIs from PH-10.

- [ ] Test login, overview, Driver filter, fleet order filter/detail, tracking reconnect, payment summary and foreign URL denial.
- [ ] Fix only client integration defects inside Fleet feature ownership; contract mismatch becomes blocker.
- [ ] Run web tests/build/Playwright at required widths.
- [ ] Commit `test(fleet): complete fleet owner journey`.

### Task PH-12-T06: Admin Web Journey and Client Gate

**Files:**
- Test: `apps/admin/e2e/admin-journey.spec.ts`, `e2e/role-route-isolation.spec.ts`
- Modify: only Admin feature files created in PH-11 when integration defects are found

**Interfaces:** Consumes Admin/Payment/Health APIs.

- [ ] Test operational filters, order detail, manual payment note/audit, user status, health warning and role-route isolation.
- [ ] Run mobile/admin lint/typecheck/test/build/export, `pnpm --filter mobile test:e2e` for all Maestro flows and `pnpm --filter web test:e2e` for all Playwright flows.
- [ ] Verify screenshots at 360x800, 390x844, 768x1024, 1024x768, 1440x900 show no overlap/overflow.
- [ ] Commit `test(clients): verify role-based pilot journeys`.

## Phase Boundary Rules

- Do not change backend contracts to fit client assumptions.
- Do not add background location, push notification or app-store release.
- Do not use hard-coded fake data in production paths.
- One worktree per role lane; never let Customer/Driver sessions edit the same feature file.
