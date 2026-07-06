# LEOPARD 6-Week Sprint Plan

**Version:** 1.0  
**Date:** 2026-07-06  
**Purpose:** Split LEOPARD MVP into 6 weekly sprint phases for agent coding and human review.

---

## 1. Sprint Principles

- One week equals one phase.
- Each phase must produce a working, reviewable increment.
- Backend foundations come before UI integration.
- UI screens can be scaffolded early but must not fake backend behavior after the API exists.
- Week 6 is stabilization and handover only.
- New features after Week 4 require human approval.

---

## 2. Phase Summary

| Week | Phase | Goal | Review Gate |
| --- | --- | --- | --- |
| Week 1 | Foundation and Scope Freeze | Repo, docs, auth base, DB base | Demo accounts and local runtime ready |
| Week 2 | Core Backend | Auth, Prisma schema, order foundation, map provider | API can create and read basic orders |
| Week 3 | Customer Booking | Customer order UI, map/route, price estimate | Customer creates order end to end |
| Week 4 | Driver and Tracking | Driver accept/status, Socket.IO tracking | Driver accepts order and sends tracking |
| Week 5 | Admin, Media, Payment | Admin dashboard, uploads, QR payment | Full local demo flow works |
| Week 6 | Stabilization and Handover | Deploy, UAT, bug fixing, docs | Staging demo accepted |

---

## 3. Week 1: Foundation and Scope Freeze

### Goal

Create the project foundation and remove ambiguity before feature implementation.

### Source Docs

- `docs/srs-leopard-mvp.md`
- `docs/project/01-product-backlog-user-stories.md`
- `docs/project/02-system-architecture.md`
- `docs/project/03-database-design-erd.md`

### Stories

| Story | Priority | Output |
| --- | --- | --- |
| STORY-DEP-001 | P0 | Local setup runnable. |
| STORY-AUTH-001 foundation | P0 | Demo user seed approach ready. |
| Architecture foundation | P0 | Monorepo and module structure ready. |

### Tasks

- [ ] Create monorepo structure.
- [ ] Create `apps/web`, `apps/api`, and `packages/shared`.
- [ ] Record scope correction: Customer/Driver flows are implemented in `apps/mobile`; `apps/web` is Admin-only.
- [ ] Add root scripts for dev, build, lint, test, typecheck.
- [ ] Add Docker Compose PostgreSQL/PostGIS.
- [ ] Add `.env.example`.
- [ ] Add Prisma initial setup.
- [ ] Add shared enums and DTOs.
- [ ] Add seed plan for demo accounts.
- [ ] Confirm final MVP scope with human reviewer.

### Required Verification

Run:

```bash
pnpm install
pnpm typecheck
docker compose up -d db
```

Expected:

```text
Dependencies install successfully.
Typecheck has no errors for created packages.
Database container starts.
```

### Human Review Gate

Human reviewer checks:

- Scope is frozen.
- File structure matches architecture doc.
- `.env.example` does not contain secrets.
- Local DB starts.

### Exit Criteria

- Repo structure is ready.
- Database can start locally.
- Shared types exist.
- Demo account seed strategy is clear.

---

## 4. Week 2: Core Backend

### Goal

Build the backend core needed for Customer, Driver, and Admin flows.

### Source Docs

- `docs/project/03-database-design-erd.md`
- `docs/project/04-api-specification.md`
- `docs/project/01-product-backlog-user-stories.md`

### Stories

| Story | Priority | Output |
| --- | --- | --- |
| STORY-AUTH-001 | P0 | Login API works. |
| STORY-AUTH-002 | P0 | Role guards work. |
| STORY-MAP-001 | P0 | Address search provider works. |
| STORY-MAP-002 | P0 | Route provider works. |
| STORY-ORD-001 backend | P0 | Order creation API works. |
| STORY-ORD-002 backend | P0 | Order list/detail API works. |

### Tasks

- [ ] Implement Prisma schema from database design.
- [ ] Implement seed data for Customer, Driver, Admin.
- [ ] Implement Auth module.
- [ ] Implement role guard.
- [ ] Scaffold `apps/mobile` with Expo React Native and shared contracts.
- [ ] Implement MapProvider interface.
- [ ] Implement DemoMapProvider.
- [ ] Implement VietmapProvider boundary.
- [ ] Implement order creation endpoint.
- [ ] Implement customer order list endpoint.
- [ ] Implement order detail access rules.
- [ ] Implement MVP price estimate function.
- [ ] Add tests for auth, role access, order creation, and stop limit.

### Required Verification

Run:

```bash
pnpm --filter api test
pnpm --filter api typecheck
pnpm --filter api lint
```

Expected:

```text
Auth tests pass.
Order creation tests pass.
Role guard tests pass.
No TypeScript errors.
No lint errors.
```

### Human Review Gate

Human reviewer checks through API client or basic UI:

- Demo users can log in.
- Customer can create an order through API.
- Stops are limited to 3.
- Demo map provider works without Vietmap key.

### Exit Criteria

- Backend can create/read customer orders.
- Auth and role protection work.
- Map route returns distance and ETA.

---

## 5. Week 3: Customer Booking

### Goal

Build the Customer-facing order creation and order tracking/detail experience.

### Source Docs

- `docs/project/05-ui-flow-screen-spec.md`
- `docs/project/04-api-specification.md`
- `docs/project/01-product-backlog-user-stories.md`

### Stories

| Story | Priority | Output |
| --- | --- | --- |
| STORY-AUTH-001 frontend | P0 | Login UI works. |
| STORY-ORD-001 frontend | P0 | Customer creates order in UI. |
| STORY-ORD-002 frontend | P0 | Customer sees order list/detail. |
| STORY-MAP-001 frontend | P0 | Address search UI works. |
| STORY-MAP-002 frontend | P0 | Route preview UI works. |
| STORY-ORD-003 | P1 | Price estimate shown. |

### Tasks

- [ ] Implement login screen.
- [ ] Implement role-based redirect.
- [ ] Implement customer order list.
- [ ] Implement customer create order form.
- [ ] Implement address search component.
- [ ] Implement stop add/remove UI with max 3.
- [ ] Implement route preview panel.
- [ ] Implement estimated price display.
- [ ] Implement customer order detail screen.
- [ ] Add loading, empty, error, and success states.
- [ ] Run UI/UX review using operational logistics design read.

### Required Verification

Run:

```bash
pnpm --filter web typecheck
pnpm --filter web lint
pnpm --filter web test
```

Manual:

```text
Log in as Customer.
Create order with pickup, dropoff, one stop, vehicle type, and notes.
Refresh page.
Confirm order appears in list and detail.
```

### Human Review Gate

Human reviewer checks:

- Customer flow is understandable.
- Form does not feel generic or confusing.
- Route and price are visible.
- Mobile layout is usable.

### Exit Criteria

- Customer can create order end to end from UI.
- Customer can view created order.
- Customer UI is approved for demo-level quality.

---

## 6. Week 4: Driver and Tracking

### Goal

Build Driver order acceptance, delivery status updates, and tracking demo.

### Source Docs

- `docs/project/04-api-specification.md`
- `docs/project/05-ui-flow-screen-spec.md`
- `docs/project/01-product-backlog-user-stories.md`

### Stories

| Story | Priority | Output |
| --- | --- | --- |
| STORY-DRV-001 | P0 | Driver sees available orders. |
| STORY-DRV-002 | P0 | Driver accepts order. |
| STORY-DRV-003 | P0 | Driver updates status. |
| STORY-TRK-001 | P0 | Driver sends tracking point. |
| STORY-TRK-002 | P0 | Customer/Admin receives tracking update. |

### Tasks

- [ ] Implement driver available orders API.
- [ ] Implement accept order API.
- [ ] Implement status update API.
- [ ] Implement status transition validation.
- [ ] Implement driver order list UI.
- [ ] Implement driver order detail UI.
- [ ] Implement driver action panel by status.
- [ ] Implement Socket.IO tracking gateway.
- [ ] Implement tracking persistence.
- [ ] Implement simulated tracking button.
- [ ] Implement customer tracking marker update.
- [ ] Add tests for duplicate accept and invalid status transition.

### Required Verification

Run:

```bash
pnpm --filter api test
pnpm --filter api typecheck
pnpm --filter web typecheck
pnpm --filter web lint
```

Manual:

```text
Customer creates order.
Driver logs in.
Driver sees requested order.
Driver accepts order.
Driver changes status to PICKING_UP.
Driver sends simulated tracking point.
Customer sees updated status and location.
```

### Human Review Gate

Human reviewer checks:

- Driver flow is fast and mobile-friendly.
- Status progression is clear.
- Tracking demo is visible and repeatable.
- No unassigned driver can update the order.

### Exit Criteria

- Driver can accept and progress order.
- Tracking point appears to customer.
- Status lifecycle works.

---

## 7. Week 5: Admin, Media, Payment

### Goal

Complete Admin monitoring, image upload, and QR payment demo so the full local demo flow works.

### Source Docs

- `docs/project/04-api-specification.md`
- `docs/project/05-ui-flow-screen-spec.md`
- `docs/project/01-product-backlog-user-stories.md`

### Stories

| Story | Priority | Output |
| --- | --- | --- |
| STORY-ADM-002 | P0 | Admin order monitoring works. |
| STORY-ADM-003 | P0 | Admin users/drivers work. |
| STORY-ADM-001 | P1 | Admin summary works. |
| STORY-MED-001 | P1 | Cargo image upload works. |
| STORY-MED-002 | P1 | Delivery image upload works. |
| STORY-PAY-001 | P0 | QR payment intent works. |
| STORY-PAY-002 | P0 | Admin sees payment status. |

### Tasks

- [ ] Implement admin users endpoint and UI.
- [ ] Implement admin drivers endpoint and UI.
- [ ] Implement admin orders endpoint and UI.
- [ ] Implement admin order detail endpoint and UI.
- [ ] Implement dashboard summary.
- [ ] Implement local storage provider.
- [ ] Implement S3-compatible storage provider boundary.
- [ ] Implement cargo image upload.
- [ ] Implement delivery confirmation upload.
- [ ] Implement demo payment provider.
- [ ] Implement payOS/VietQR provider boundary.
- [ ] Implement payment intent UI.
- [ ] Run full local demo script.

### Required Verification

Run:

```bash
pnpm test
pnpm typecheck
pnpm lint
```

Manual:

```text
Customer creates order.
Customer uploads cargo image.
Driver accepts order.
Driver sends tracking point.
Customer creates QR payment.
Admin sees order detail with customer, driver, status, tracking, image, and payment.
```

### Human Review Gate

Human reviewer checks:

- Admin can inspect all important demo data.
- Payment demo is understandable.
- Upload does not break order flow.
- Full demo works locally.

### Exit Criteria

- Full local demo script passes.
- Admin view is demo-ready.
- Upload and payment demo work.

---

## 8. Week 6: Stabilization and Handover

### Goal

Deploy staging, run UAT, fix P0/P1 issues, and prepare handover.

### Source Docs

- `docs/workflows/04-review-and-verification-gates.md`
- `docs/project/01-product-backlog-user-stories.md`
- `docs/srs-leopard-mvp.md`

### Stories

| Story | Priority | Output |
| --- | --- | --- |
| STORY-DEP-002 | P0 | Staging deploy works. |
| STORY-DEP-003 | P0 | Handover docs complete. |

### Tasks

- [ ] Prepare staging environment variables.
- [ ] Run database migration on staging.
- [ ] Seed demo accounts on staging.
- [ ] Deploy API.
- [ ] Deploy Web app.
- [ ] Verify WebSocket works on staging.
- [ ] Run full UAT checklist.
- [ ] Fix all P0 bugs.
- [ ] Fix P1 bugs required by demo.
- [ ] Document known limitations.
- [ ] Write handover notes.
- [ ] Record final demo script result.

### Required Verification

Run:

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm build
```

Manual staging:

```text
Open staging web app.
Log in as Customer.
Create order.
Log in as Driver.
Accept and update order.
Send tracking point.
Create QR payment.
Log in as Admin.
Confirm full order detail.
Mark delivered.
```

### Human Review Gate

Human reviewer checks:

- Staging demo passes.
- Known limits are documented.
- Handover docs are clear.
- No P0 issue remains.

### Exit Criteria

- Project is ready for final demo and handover.

---

## 9. Timeline Control Rules

If behind schedule:

- Week 2 slip: reduce UI polish, keep backend correct.
- Week 3 slip: keep Customer flow, defer media upload.
- Week 4 slip: keep simulated tracking, defer browser GPS polish.
- Week 5 slip: keep Admin order detail and payment demo, defer dashboard summary.
- Week 6 slip: stop adding features, fix P0 only.

Do not cut:

- Auth.
- Customer order creation.
- Driver acceptance.
- Status update.
- Admin order detail.
- Staging demo.

Can cut or simplify:

- OTP.
- Cloud storage.
- Browser GPS.
- Admin summary widgets.
- Delivery image upload.
- Real payOS integration.
