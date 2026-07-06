# LEOPARD Product Backlog and User Stories

**Version:** 1.0  
**Date:** 2026-07-06  
**Source of truth:** `docs/srs-leopard-mvp.md`  
**Purpose:** Convert the SRS into implementable user stories for devs and coding agents.

---

## 1. Backlog Rules

### 1.1 Priority Levels

| Priority | Meaning | Rule |
| --- | --- | --- |
| P0 | Required for MVP acceptance | Must be completed before final demo. |
| P1 | Important for demo quality | Should be completed if P0 is stable. |
| P2 | Nice-to-have or fallback | Can be deferred without blocking MVP. |

### 1.2 Definition of Ready

A story is ready for implementation when:

- Actor is clear.
- Acceptance criteria are listed.
- Required API/data dependencies are known.
- Out-of-scope behavior is explicitly excluded.
- Test path or manual verification path is defined.

### 1.3 Definition of Done

A story is done when:

- UI and API happy path work end to end.
- Role authorization is enforced.
- Invalid input returns a useful error.
- Data persists after refresh.
- Required tests or smoke checks pass.
- Related docs are updated if behavior changes.

---

## 2. Epic Overview

| Epic ID | Epic | Priority | Owner Area |
| --- | --- | --- | --- |
| EPIC-01 | Authentication and Role Access | P0 | Mobile + Admin Web + Backend |
| EPIC-02 | Customer Shipment Booking | P0 | Mobile + Backend |
| EPIC-03 | Map, Geocoding, Routing, ETA | P0 | Backend Integration + Mobile |
| EPIC-04 | Driver Order Flow | P0 | Mobile + Backend |
| EPIC-05 | Realtime Tracking | P0 | Backend Gateway + Mobile |
| EPIC-06 | Media Upload | P1 | Backend Integration + Mobile + Admin Web |
| EPIC-07 | Payment QR Creation | P0 | Backend Integration + Mobile + Admin Web |
| EPIC-08 | Admin Dashboard | P0 | Admin Web + Backend |
| EPIC-09 | Deployment and Handover | P0 | DevOps + Docs |

---

## 3. EPIC-01 Authentication and Role Access

### STORY-AUTH-001: Login with demo account

**As a** Customer, Driver, or Admin  
**I want** to log in with my account  
**So that** I can access the correct role-specific workspace.

**Priority:** P0  
**Dependencies:** User table, password hashing, auth API, login UI.

**Acceptance Criteria:**

- Valid demo account returns access token and user profile.
- Invalid email/password returns a readable error.
- User is redirected by role:
  - Customer -> `/customer/orders`
  - Driver -> `/driver/orders`
  - Admin -> `/admin`
- Login state survives page refresh during demo session.

**Verification:**

- Log in as `customer@leopard.demo`.
- Log in as `driver@leopard.demo`.
- Log in as `admin@leopard.demo`.
- Try invalid password and confirm error.

### STORY-AUTH-002: Protect pages by role

**As an** Admin/Customer/Driver  
**I want** unauthorized role pages blocked  
**So that** users cannot access data outside their role.

**Priority:** P0

**Acceptance Criteria:**

- Customer cannot open `/admin`.
- Driver cannot open `/admin`.
- Customer cannot open driver-only order actions.
- Unauthenticated user is sent to login.
- API returns `401` for missing token and `403` for wrong role.

**Verification:**

- Use Customer token against Admin endpoint and expect `403`.
- Open `/admin` after Customer login and expect blocked/redirect.

---

## 4. EPIC-02 Customer Shipment Booking

### STORY-ORD-001: Create shipment order

**As a** Customer  
**I want** to create a shipment order  
**So that** a driver can accept and deliver my goods.

**Priority:** P0  
**Dependencies:** Auth, order API, map provider, order form UI.

**Acceptance Criteria:**

- Customer can enter pickup address and dropoff address.
- Customer can add 0 to 3 stops.
- Customer can select vehicle type.
- Customer can enter cargo notes.
- System saves order with `REQUESTED` status.
- Created order appears in customer order list after refresh.
- More than 3 stops is rejected.

**Verification:**

- Create order with no stop.
- Create order with 3 stops.
- Attempt 4 stops and confirm rejection.
- Refresh page and confirm order persists.

### STORY-ORD-002: View customer order list and detail

**As a** Customer  
**I want** to see my orders and order details  
**So that** I can track shipment progress.

**Priority:** P0

**Acceptance Criteria:**

- Customer order list shows only orders created by current customer.
- Order row shows status, route summary, created time, and payment status.
- Order detail shows pickup, dropoff, stops, vehicle type, cargo notes, driver if assigned, images, tracking, and payment information.
- Customer cannot open another customer's order.

**Verification:**

- Seed two customers with separate orders.
- Confirm each customer only sees their own orders.

### STORY-ORD-003: Calculate MVP price estimate

**As a** Customer  
**I want** to see an estimated shipment price  
**So that** I understand expected cost before payment.

**Priority:** P1

**Recommended MVP Formula:**

```text
baseFee = 30000 VND
vehicleMultiplier:
  VAN = 1.0
  SMALL_TRUCK = 1.3
  MEDIUM_TRUCK = 1.6
distanceFee = distanceKm * 12000 VND
stopFee = numberOfStops * 10000 VND
estimatedPrice = roundToNearest1000((baseFee + distanceFee + stopFee) * vehicleMultiplier)
```

**Acceptance Criteria:**

- Estimate is calculated after route distance is available.
- Estimate is stored with order.
- Estimate is shown to Customer and Admin.
- Formula is documented in API or developer docs.

---

## 5. EPIC-03 Map, Geocoding, Routing, ETA

### STORY-MAP-001: Search and select address

**As a** Customer  
**I want** address autocomplete/search  
**So that** I can choose pickup and dropoff accurately.

**Priority:** P0

**Acceptance Criteria:**

- Search input returns address suggestions.
- Selecting a suggestion fills address and coordinates.
- Vietmap provider is used when API key exists.
- Demo provider returns stable Da Nang sample addresses when API key is missing.

### STORY-MAP-002: Preview route, distance, and ETA

**As a** Customer  
**I want** to preview route information  
**So that** I can verify shipment before submitting.

**Priority:** P0

**Acceptance Criteria:**

- Route is calculated from pickup -> stops -> dropoff.
- UI shows distance in kilometers.
- UI shows ETA in minutes.
- UI does not block order creation if map tiles fail but route data exists.
- System avoids repeated route calls on every keystroke.

---

## 6. EPIC-04 Driver Order Flow

### STORY-DRV-001: View available orders

**As a** Driver  
**I want** to view requested orders  
**So that** I can choose an order to accept.

**Priority:** P0

**Acceptance Criteria:**

- Driver sees orders with `REQUESTED` status.
- Already accepted orders do not appear.
- Order card shows pickup, dropoff, vehicle type, distance, ETA, and estimated price.

### STORY-DRV-002: Accept an order

**As a** Driver  
**I want** to accept one requested order  
**So that** I become assigned to it.

**Priority:** P0

**Acceptance Criteria:**

- Accepting sets `driverId`.
- Accepting changes status to `ACCEPTED`.
- Duplicate accept attempts are rejected.
- Customer and Admin can see assigned driver.

### STORY-DRV-003: Update delivery status

**As a** Driver  
**I want** to update shipment status  
**So that** Customer/Admin know current progress.

**Priority:** P0

**Allowed Flow:**

```text
REQUESTED -> ACCEPTED -> PICKING_UP -> IN_TRANSIT -> DELIVERED
```

**Acceptance Criteria:**

- Driver can update only assigned order.
- Invalid transition is rejected.
- Status update is visible to Customer and Admin.

---

## 7. EPIC-05 Realtime Tracking

### STORY-TRK-001: Send tracking point

**As a** Driver  
**I want** to send my location for an assigned order  
**So that** Customer/Admin can follow delivery progress.

**Priority:** P0

**Acceptance Criteria:**

- Driver can send browser geolocation or simulated coordinate.
- Backend validates the driver is assigned to the order.
- Tracking point is persisted.
- Latest point appears on customer order detail.

### STORY-TRK-002: Receive tracking updates

**As a** Customer/Admin  
**I want** to receive location updates  
**So that** I can monitor the driver on the order.

**Priority:** P0

**Acceptance Criteria:**

- Client joins order tracking room.
- Server emits `tracking:point-updated`.
- Marker updates at least once during demo.
- If WebSocket fails, page can still show latest persisted point after refresh.

---

## 8. EPIC-06 Media Upload

### STORY-MED-001: Upload cargo image

**As a** Customer  
**I want** to upload cargo images  
**So that** driver/admin can inspect shipment information.

**Priority:** P1

**Acceptance Criteria:**

- JPG, PNG, and WebP are accepted.
- Unsupported file type is rejected.
- File larger than configured limit is rejected.
- Uploaded image appears in order detail.

### STORY-MED-002: Upload delivery confirmation image

**As a** Driver  
**I want** to upload delivery confirmation image  
**So that** the order has delivery evidence.

**Priority:** P1

**Acceptance Criteria:**

- Driver can upload image only for assigned order.
- Image appears in Admin order detail.
- Local storage works in development.
- S3-compatible storage works when configured.

---

## 9. EPIC-07 Payment QR Creation

### STORY-PAY-001: Create QR payment intent

**As a** Customer  
**I want** to create a QR payment request  
**So that** I can pay for the shipment order.

**Priority:** P0

**Acceptance Criteria:**

- Customer can create payment intent for own order.
- Payment intent includes amount, status, provider, QR content, and timestamp.
- Demo provider works without payOS credentials.
- Order detail shows payment status.

### STORY-PAY-002: Admin views payment status

**As an** Admin  
**I want** to view payment status  
**So that** I can monitor order payment state.

**Priority:** P0

**Acceptance Criteria:**

- Admin order list or detail shows payment status.
- Payment status values include `UNPAID`, `QR_CREATED`, `PAID_DEMO`, and `FAILED`.
- Automatic bank reconciliation is not required for MVP.

---

## 10. EPIC-08 Admin Dashboard

### STORY-ADM-001: View dashboard summary

**As an** Admin  
**I want** to view operational summary  
**So that** I quickly understand demo system state.

**Priority:** P1

**Acceptance Criteria:**

- Summary shows total users, drivers, orders, and orders by status.
- Summary data is loaded from backend, not hardcoded.

### STORY-ADM-002: Manage order monitoring

**As an** Admin  
**I want** to view and filter orders  
**So that** I can monitor logistics operations.

**Priority:** P0

**Acceptance Criteria:**

- Admin can view order list.
- Admin can filter by order status.
- Admin can open order detail.
- Detail includes customer, driver, route, stops, images, tracking, and payment.

### STORY-ADM-003: View users and drivers

**As an** Admin  
**I want** to view users and drivers  
**So that** I can inspect system participants.

**Priority:** P0

**Acceptance Criteria:**

- Admin can view user list with role.
- Admin can view driver list with availability and vehicle type.
- Non-admin users cannot access these lists.

---

## 11. EPIC-09 Deployment and Handover

### STORY-DEP-001: Run project locally

**As a** Developer  
**I want** documented local setup  
**So that** I can run and test the project.

**Priority:** P0

**Acceptance Criteria:**

- `.env.example` exists.
- Local database can start through Docker Compose.
- Seed demo accounts exist.
- Frontend and backend start with documented commands.

### STORY-DEP-002: Deploy staging demo

**As a** Project team  
**I want** staging deployment  
**So that** stakeholders can review the MVP.

**Priority:** P0

**Acceptance Criteria:**

- Web app URL is available.
- API URL is available.
- Database is migrated and seeded.
- Demo script can be completed on staging.

### STORY-DEP-003: Final handover

**As a** Project team  
**I want** complete handover docs  
**So that** the system can be reviewed, maintained, and extended.

**Priority:** P0

**Acceptance Criteria:**

- Setup guide exists.
- Deploy guide exists.
- API summary exists.
- Known limitations are documented.
- UAT checklist is completed.

---

## 12. Recommended Implementation Order

1. `STORY-AUTH-001`
2. `STORY-AUTH-002`
3. `STORY-MAP-001`
4. `STORY-MAP-002`
5. `STORY-ORD-001`
6. `STORY-ORD-002`
7. `STORY-DRV-001`
8. `STORY-DRV-002`
9. `STORY-DRV-003`
10. `STORY-TRK-001`
11. `STORY-TRK-002`
12. `STORY-PAY-001`
13. `STORY-ADM-002`
14. `STORY-ADM-003`
15. `STORY-MED-001`
16. `STORY-MED-002`
17. `STORY-ADM-001`
18. `STORY-DEP-001`
19. `STORY-DEP-002`
20. `STORY-DEP-003`

---

## 13. Final MVP Pass Criteria

The backlog is complete enough for demo when:

- All P0 stories are done.
- P1 stories required by the demo script are done or have documented fallback.
- No P0 bug remains open.
- Staging can run the full demo flow.
