# LEOPARD Agent Goal Cards

**Version:** 1.0  
**Date:** 2026-07-06  
**Purpose:** Define clear goals for each agent execution phase. These can be copied into a coding agent as the task objective.

---

## 1. How To Use Goal Cards

For every work session:

1. Select one goal card.
2. Give the agent the linked source docs.
3. Tell the agent to implement only that goal.
4. Require `STATUS`, `Implemented`, `Verification`, `Files changed`, and `Risks`.
5. Run Spec Review.
6. Run Code Quality Review.
7. Run UI Review if the goal touches UI.

Do not combine more than one goal card unless the goals touch the same files and are small.

---

## 2. Goal Card Template

```text
Goal ID:
Goal:
Source docs:
Allowed files/areas:
Acceptance criteria:
Verification:
Stop conditions:
```

---

## 3. Week 1 Goal Cards

### GOAL-W1-01: Monorepo Foundation

**Goal:** Create the monorepo foundation for LEOPARD with Admin web, API, shared package, local DB runtime, and root scripts.

**Source docs:**

- `docs/project/02-system-architecture.md`
- `docs/project/03-database-design-erd.md`
- `docs/workflows/01-six-week-sprint-plan.md`

**Allowed files/areas:**

- Root workspace files.
- `apps/web`
- `apps/api`
- `packages/shared`
- `.env.example`
- `docker-compose.yml`

**Acceptance criteria:**

- Root workspace exists.
- Admin web/API/shared package folders exist.
- Customer/Driver mobile app scope is recorded for Phase 2.
- Docker Compose includes PostgreSQL/PostGIS.
- Root scripts exist for dev, build, lint, test, typecheck.
- `.env.example` has no real secrets.

**Verification:**

```bash
pnpm install
pnpm typecheck
docker compose up -d db
```

**Stop conditions:**

- Package manager conflict.
- Existing app structure conflicts with architecture.

### GOAL-W1-02: Shared Contracts

**Goal:** Create shared DTOs and enums for users, orders, tracking, and payments.

**Source docs:**

- `docs/project/03-database-design-erd.md`
- `docs/project/04-api-specification.md`

**Allowed files/areas:**

- `packages/shared`

**Acceptance criteria:**

- Role enum exists.
- Vehicle type enum exists.
- Order status enum exists.
- Payment status enum exists.
- DTOs match API spec.

**Verification:**

```bash
pnpm --filter @leopard/shared typecheck
```

**Stop conditions:**

- Shared package naming differs from workspace setup.

---

## 4. Week 2 Goal Cards

### GOAL-W2-01: Database Schema and Seed

**Goal:** Implement Prisma schema and seed demo accounts.

**Source docs:**

- `docs/project/03-database-design-erd.md`

**Allowed files/areas:**

- `apps/api/prisma`
- `apps/api/src/database`

**Acceptance criteria:**

- Prisma schema includes User, DriverProfile, Order, OrderStop, OrderImage, TrackingPoint, PaymentIntent.
- Enums match database design.
- Seed creates Customer, Driver, Admin.
- Seed creates DriverProfile.
- Passwords are hashed.

**Verification:**

```bash
pnpm --filter api prisma migrate dev
pnpm --filter api db:seed
```

**Stop conditions:**

- Database connection unavailable.
- Prisma setup differs from planned structure.

### GOAL-W2-02: Auth and Role Guards

**Goal:** Implement login, current user endpoint, JWT/session handling, and role guards.

**Source docs:**

- `docs/project/04-api-specification.md`
- `docs/project/01-product-backlog-user-stories.md`

**Allowed files/areas:**

- `apps/api/src/auth`
- `apps/api/src/users`
- `apps/api/test`

**Acceptance criteria:**

- `POST /auth/login` works.
- `GET /auth/me` works.
- Wrong credentials return `401`.
- Wrong role returns `403`.
- Customer, Driver, Admin demo accounts can log in.

**Verification:**

```bash
pnpm --filter api test auth
pnpm --filter api typecheck
```

**Stop conditions:**

- Seed accounts do not exist.

### GOAL-W2-03: Order and Map Backend

**Goal:** Implement order creation, customer order list/detail, map provider fallback, route summary, and price estimate.

**Source docs:**

- `docs/project/04-api-specification.md`
- `docs/project/03-database-design-erd.md`

**Allowed files/areas:**

- `apps/api/src/orders`
- `apps/api/src/maps`
- `apps/api/src/integrations/maps`
- `apps/api/test`

**Acceptance criteria:**

- Customer can create order.
- Stops are limited to 3.
- Demo map provider works without API key.
- Route result includes distance and ETA.
- Estimated price is stored.
- Customer can read own orders only.

**Verification:**

```bash
pnpm --filter api test orders
pnpm --filter api test maps
pnpm --filter api typecheck
```

**Stop conditions:**

- Database schema missing required order fields.

---

## 5. Week 3 Goal Cards

### GOAL-W3-01: Login and Role Routing UI

**Goal:** Implement login screen, session handling, and role-based redirects.

**Source docs:**

- `docs/project/05-ui-flow-screen-spec.md`
- `docs/project/04-api-specification.md`

**Allowed files/areas:**

- `apps/mobile/src/features/auth`
- `apps/mobile/src/features/customer`
- `apps/mobile/src/features/driver`
- `apps/mobile/src/lib/api.ts`
- `apps/mobile/src/components/layout`
- `apps/web/src/app/login`
- `apps/web/src/app/admin`

**Acceptance criteria:**

- Customer login opens the Customer mobile order flow.
- Driver login opens the Driver mobile order flow.
- Admin login redirects to `/admin`.
- Invalid credentials show readable error.
- Logout clears session.

**Verification:**

```bash
pnpm --filter mobile typecheck
pnpm --filter mobile lint
pnpm --filter web typecheck
pnpm --filter web lint
```

**Stop conditions:**

- Auth API not available.

### GOAL-W3-02: Customer Booking UI

**Goal:** Implement customer order list, create order form, route preview, and order detail.

**Source docs:**

- `docs/project/05-ui-flow-screen-spec.md`
- `docs/project/04-api-specification.md`
- `docs/project/01-product-backlog-user-stories.md`

**Allowed files/areas:**

- `apps/mobile/src/features/customer`
- `apps/mobile/src/components/orders`
- `apps/mobile/src/components/maps`
- `apps/mobile/src/lib/api.ts`

**Acceptance criteria:**

- Customer can create order with pickup/dropoff.
- Customer can add 0 to 3 stops.
- Customer cannot add 4th stop.
- Route preview shows distance and ETA.
- Price estimate is visible.
- Created order appears after refresh.

**Verification:**

```bash
pnpm --filter mobile typecheck
pnpm --filter mobile lint
```

Manual:

```text
Log in as Customer.
Create order.
Refresh order list.
Open order detail.
```

**Stop conditions:**

- Order API not available.

---

## 6. Week 4 Goal Cards

### GOAL-W4-01: Driver Backend

**Goal:** Implement driver available orders, accept order, and update order status.

**Source docs:**

- `docs/project/04-api-specification.md`
- `docs/project/01-product-backlog-user-stories.md`

**Allowed files/areas:**

- `apps/api/src/drivers`
- `apps/api/src/orders`
- `apps/api/test`

**Acceptance criteria:**

- Driver sees only `REQUESTED` orders.
- Driver can accept order.
- Duplicate accept is rejected.
- Driver can update assigned order through allowed status flow.
- Invalid transition is rejected.

**Verification:**

```bash
pnpm --filter api test drivers
pnpm --filter api typecheck
```

**Stop conditions:**

- Order backend not complete.

### GOAL-W4-02: Driver UI

**Goal:** Implement driver order list, detail, accept action, and status action panel.

**Source docs:**

- `docs/project/05-ui-flow-screen-spec.md`
- `docs/project/04-api-specification.md`

**Allowed files/areas:**

- `apps/mobile/src/features/driver`
- `apps/mobile/src/components/orders`
- `apps/mobile/src/lib/api.ts`

**Acceptance criteria:**

- Driver sees requested orders.
- Driver opens order detail.
- Driver accepts order.
- Driver sees next status action by current status.
- Driver can mark order delivered through valid flow.

**Verification:**

```bash
pnpm --filter mobile typecheck
pnpm --filter mobile lint
```

Manual:

```text
Create order as Customer.
Log in as Driver.
Accept order.
Update status to PICKING_UP, IN_TRANSIT, DELIVERED.
```

**Stop conditions:**

- Driver API not available.

### GOAL-W4-03: Tracking

**Goal:** Implement Socket.IO tracking and simulated tracking UI.

**Source docs:**

- `docs/project/04-api-specification.md`
- `docs/project/05-ui-flow-screen-spec.md`

**Allowed files/areas:**

- `apps/api/src/tracking`
- `apps/mobile/src/lib/socket.ts`
- `apps/mobile/src/components/tracking`
- Customer and Driver order detail pages.

**Acceptance criteria:**

- Driver sends tracking point for assigned order.
- Backend persists tracking point.
- Customer receives `tracking:point-updated`.
- Customer sees latest marker/location.
- Simulated tracking works without browser GPS.

**Verification:**

```bash
pnpm --filter api test tracking
pnpm --filter api typecheck
pnpm --filter mobile typecheck
```

Manual:

```text
Driver sends simulated point.
Customer order detail updates marker/location.
Refresh customer page and confirm latest point remains.
```

**Stop conditions:**

- Socket.IO setup conflicts with deployment/runtime.

---

## 7. Week 5 Goal Cards

### GOAL-W5-01: Admin Dashboard

**Goal:** Implement Admin users, drivers, orders, order detail, and summary screens.

**Source docs:**

- `docs/project/04-api-specification.md`
- `docs/project/05-ui-flow-screen-spec.md`

**Allowed files/areas:**

- `apps/api/src/admin`
- `apps/web/src/app/admin`
- `apps/web/src/components/admin`

**Acceptance criteria:**

- Admin can view users.
- Admin can view drivers.
- Admin can view orders.
- Admin can filter orders by status.
- Admin order detail shows customer, driver, route, stops, images, tracking, and payment.
- Non-admin access is blocked.

**Verification:**

```bash
pnpm --filter api test admin
pnpm --filter api typecheck
pnpm --filter web typecheck
pnpm --filter web lint
```

**Stop conditions:**

- Auth role guard incomplete.

### GOAL-W5-02: Media Upload

**Goal:** Implement cargo and delivery image upload with local storage and S3-compatible provider boundary.

**Source docs:**

- `docs/project/04-api-specification.md`
- `docs/project/03-database-design-erd.md`

**Allowed files/areas:**

- `apps/api/src/media`
- `apps/api/src/integrations/storage`
- `apps/mobile/src/components/upload`
- `apps/web/src/components/admin`
- Customer and Driver order detail pages.

**Acceptance criteria:**

- JPG, PNG, WebP upload works.
- Invalid file type rejected.
- Oversized file rejected.
- Local storage works without cloud credentials.
- Uploaded image appears in order detail.

**Verification:**

```bash
pnpm --filter api test media
pnpm --filter api typecheck
pnpm --filter mobile typecheck
pnpm --filter web typecheck
```

**Stop conditions:**

- File storage path is unavailable.

### GOAL-W5-03: Payment QR

**Goal:** Implement QR payment intent using demo provider and real provider boundary.

**Source docs:**

- `docs/project/04-api-specification.md`
- `docs/project/01-product-backlog-user-stories.md`

**Allowed files/areas:**

- `apps/api/src/payments`
- `apps/api/src/integrations/payment`
- `apps/mobile/src/components/payments`
- `apps/web/src/components/admin`
- Customer and Admin order detail pages.

**Acceptance criteria:**

- Customer creates payment intent for own order.
- Demo QR content works without credentials.
- Payment status appears in customer and admin detail.
- Automatic bank reconciliation is not implemented.

**Verification:**

```bash
pnpm --filter api test payments
pnpm --filter api typecheck
pnpm --filter mobile typecheck
pnpm --filter web typecheck
```

**Stop conditions:**

- Order estimated price is unavailable.

---

## 8. Week 6 Goal Cards

### GOAL-W6-01: Staging Deployment

**Goal:** Deploy Web, API, database migration, seed data, and WebSocket support to staging.

**Source docs:**

- `docs/workflows/01-six-week-sprint-plan.md`
- `docs/workflows/04-review-and-verification-gates.md`

**Allowed files/areas:**

- Deployment configuration.
- Environment documentation.
- `docs/deploy.md`

**Acceptance criteria:**

- Staging web URL opens.
- Staging API responds.
- Demo accounts work.
- WebSocket tracking works.
- Full demo can run on staging.

**Verification:**

```bash
pnpm build
```

Manual staging:

```text
Run full demo flow from Customer to Driver to Admin.
```

**Stop conditions:**

- Hosting credentials unavailable.
- Database cannot be provisioned.

### GOAL-W6-02: UAT Fixes and Handover

**Goal:** Run UAT, fix P0/P1 blockers, document limitations, and prepare handover.

**Source docs:**

- `docs/workflows/04-review-and-verification-gates.md`
- `docs/srs-leopard-mvp.md`

**Allowed files/areas:**

- Bug fix areas.
- `docs/uat-checklist.md`
- `docs/handover.md`
- `docs/deploy.md`

**Acceptance criteria:**

- No P0 issue remains.
- P1 demo blockers are fixed or documented with approved workaround.
- Handover docs exist.
- Known limitations are explicit.

**Verification:**

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm build
```

Manual:

```text
Full staging demo passes.
```

**Stop conditions:**

- P0 issue requires scope or architecture decision.
