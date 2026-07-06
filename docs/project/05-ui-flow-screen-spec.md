# LEOPARD UI Flow and Screen Specification

**Version:** 1.0  
**Date:** 2026-07-06  
**Source of truth:** `docs/srs-leopard-mvp.md`  
**Purpose:** Define screens, navigation, states, and UI acceptance criteria for devs and coding agents.

---

## 1. UI Principles

The UI is for a logistics MVP/demo. It should feel operational, clear, and fast to scan.

Rules:

- Build the actual app first, not a landing page.
- Keep Customer, Driver, and Admin flows separate after login.
- Prioritize clear forms, tables, status badges, and map/tracking visibility.
- Every main screen must have loading, empty, error, and success states.
- Mobile must be usable for Customer and Driver flows.
- Admin can be denser and desktop-oriented but still responsive enough for review.

---

## 2. Navigation Map

```text
/login
  -> Customer: /customer/orders
  -> Driver: /driver/orders
  -> Admin: /admin

/customer/orders
  -> /customer/orders/new
  -> /customer/orders/[id]

/driver/orders
  -> /driver/orders/[id]

/admin
  -> /admin/orders
  -> /admin/orders/[id]
  -> /admin/users
  -> /admin/drivers
```

---

## 3. Shared UI Components

### 3.1 App Shell

Used by authenticated pages.

Elements:

- Top bar with product name `LEOPARD`.
- Current role label.
- User name/email.
- Logout button.
- Role-specific navigation.

Acceptance:

- Logout clears session and returns to `/login`.
- Navigation only shows links for current role.
- App shell does not flash admin links for non-admin users.

### 3.2 Status Badge

Used for order and payment statuses.

Order status labels:

| Status | Label |
| --- | --- |
| REQUESTED | Chờ tài xế |
| ACCEPTED | Đã nhận |
| PICKING_UP | Đang lấy hàng |
| IN_TRANSIT | Đang vận chuyển |
| DELIVERED | Đã giao |
| CANCELLED | Đã hủy |

Payment status labels:

| Status | Label |
| --- | --- |
| UNPAID | Chưa thanh toán |
| QR_CREATED | Đã tạo QR |
| PAID_DEMO | Đã thanh toán demo |
| FAILED | Thanh toán lỗi |

### 3.3 Map Panel

Used by customer order creation and tracking/detail pages.

States:

- Empty: no address selected.
- Loading: route is being calculated.
- Ready: map shows pickup, stops, dropoff, and route summary.
- Error: map provider failed with retry/fallback message.

### 3.4 Data Table

Used by Admin lists.

Requirements:

- Header row.
- Empty state.
- Loading state.
- Row click or detail action.
- Status badge cells.
- Mobile fallback can stack rows as cards.

---

## 4. Login Screen

Route:

```text
/login
```

Purpose:

- Authenticate Customer, Driver, or Admin.

Fields:

- Email.
- Password.

Actions:

- Login.

Demo helper:

- Show three demo account buttons or compact helper text:
  - Customer: `customer@leopard.demo`
  - Driver: `driver@leopard.demo`
  - Admin: `admin@leopard.demo`

States:

- Loading while submitting.
- Error for invalid credentials.
- Redirect after success.

Acceptance:

- Invalid login shows message.
- Successful Customer login goes to `/customer/orders`.
- Successful Driver login goes to `/driver/orders`.
- Successful Admin login goes to `/admin`.

---

## 5. Customer Screens

### 5.1 Customer Order List

Route:

```text
/customer/orders
```

Purpose:

- Show current customer's shipment orders.

Content:

- Page title: `Đơn vận chuyển của tôi`.
- Primary action: `Tạo đơn mới`.
- Order cards/list with:
  - Status badge.
  - Pickup address.
  - Dropoff address.
  - Distance.
  - ETA.
  - Estimated price.
  - Payment status.
  - Created time.

States:

- Empty: no orders, show action to create first order.
- Loading: skeleton or spinner.
- Error: retry action.

Acceptance:

- Only current customer's orders appear.
- Clicking an order opens detail.
- Create button opens `/customer/orders/new`.

### 5.2 Customer Create Order

Route:

```text
/customer/orders/new
```

Purpose:

- Create shipment order.

Sections:

1. Pickup address.
2. Dropoff address.
3. Optional stops.
4. Vehicle type.
5. Cargo notes.
6. Cargo image upload.
7. Route preview.
8. Estimated price.
9. Submit.

Fields:

| Field | Required | Notes |
| --- | --- | --- |
| Pickup address | Yes | Search/autocomplete with coordinates. |
| Dropoff address | Yes | Search/autocomplete with coordinates. |
| Stops | No | 0 to 3 stops. |
| Vehicle type | Yes | VAN, SMALL_TRUCK, MEDIUM_TRUCK. |
| Cargo notes | No | Text area. |
| Cargo image | No for P0, Yes for P1 | Upload after or during create depending implementation. |

Actions:

- Add stop.
- Remove stop.
- Preview route.
- Submit order.

Validation:

- Missing pickup blocks submit.
- Missing dropoff blocks submit.
- Missing vehicle type blocks submit.
- More than 3 stops blocked.
- Invalid coordinates blocked.

Acceptance:

- Customer can create order with 0 stops.
- Customer can create order with 3 stops.
- UI blocks 4th stop.
- Route summary shows distance and ETA.
- Submit routes to order detail.

### 5.3 Customer Order Detail and Tracking

Route:

```text
/customer/orders/[id]
```

Purpose:

- Show shipment status, tracking, images, and payment.

Content:

- Status badge.
- Pickup/dropoff/stops.
- Route summary.
- Driver info when assigned.
- Latest tracking marker.
- Cargo images.
- Payment status.
- Create QR payment action.

Actions:

- Upload cargo image.
- Create QR payment.
- Refresh order.

Realtime behavior:

- Join tracking room for order.
- Update latest marker when `tracking:point-updated` event arrives.
- Update status when order status event arrives.

Acceptance:

- Customer sees status after Driver accepts.
- Customer sees tracking point after Driver sends location.
- Customer can create payment intent.

---

## 6. Driver Screens

### 6.1 Driver Available Orders

Route:

```text
/driver/orders
```

Purpose:

- Show orders available for acceptance.

Content:

- Page title: `Đơn có thể nhận`.
- Available order cards with:
  - Pickup.
  - Dropoff.
  - Vehicle type.
  - Distance.
  - ETA.
  - Estimated price.
  - Created time.

States:

- Empty: no requested orders.
- Loading.
- Error.

Acceptance:

- Only `REQUESTED` orders appear.
- Clicking order opens detail.

### 6.2 Driver Order Detail

Route:

```text
/driver/orders/[id]
```

Purpose:

- Let Driver inspect, accept, update, track, and upload delivery proof.

Content:

- Order status.
- Pickup/dropoff/stops.
- Map/route summary.
- Cargo notes.
- Cargo images.
- Customer name if allowed.
- Current action panel.

Actions by state:

| Status | Driver Action |
| --- | --- |
| REQUESTED | Accept order |
| ACCEPTED | Set PICKING_UP |
| PICKING_UP | Set IN_TRANSIT |
| IN_TRANSIT | Set DELIVERED |
| DELIVERED | No status action |

Tracking controls:

- Send current browser location.
- Send simulated demo location.

Upload controls:

- Upload delivery confirmation image.

Acceptance:

- Driver can accept requested order.
- Driver can update through allowed status flow.
- Driver cannot update unassigned order.
- Driver can send at least one tracking point.

---

## 7. Admin Screens

### 7.1 Admin Dashboard

Route:

```text
/admin
```

Purpose:

- Show operational summary.

Content:

- Total users.
- Total drivers.
- Total orders.
- Orders by status.
- Quick links to orders, users, drivers.

Acceptance:

- Summary values load from API.
- Non-admin access is blocked.

### 7.2 Admin Orders

Route:

```text
/admin/orders
```

Purpose:

- Monitor all shipment orders.

Content:

- Status filter.
- Order table:
  - Order ID.
  - Customer.
  - Driver.
  - Pickup.
  - Dropoff.
  - Status.
  - Payment status.
  - Created time.

States:

- Loading.
- Empty after filter.
- Error with retry.

Acceptance:

- Admin can see all orders.
- Admin can filter by status.
- Clicking row opens detail.

### 7.3 Admin Order Detail

Route:

```text
/admin/orders/[id]
```

Purpose:

- Inspect full operational state of an order.

Content:

- Customer information.
- Driver information.
- Order status.
- Payment status.
- Pickup/dropoff/stops.
- Distance, ETA, estimated price.
- Images.
- Latest tracking point.
- Payment intents.

Acceptance:

- Admin sees full order state.
- Admin sees latest tracking point after Driver sends location.
- Admin sees QR payment intent after Customer creates it.

### 7.4 Admin Users

Route:

```text
/admin/users
```

Purpose:

- View system users.

Content:

- User table with name, email, role, created time.

Acceptance:

- Admin can list users.
- Non-admin cannot access.

### 7.5 Admin Drivers

Route:

```text
/admin/drivers
```

Purpose:

- View driver profiles.

Content:

- Driver table with name, email, vehicle type, availability, license plate.

Acceptance:

- Admin can list drivers.
- Non-admin cannot access.

---

## 8. Responsive Requirements

Mobile width target:

```text
390px
```

Desktop width target:

```text
1440px
```

Rules:

- Customer and Driver flows must work on mobile.
- Forms stack vertically on mobile.
- Primary action remains visible without horizontal scrolling.
- Admin tables may become cards on mobile.
- Text must not overflow buttons or cards.
- Map panel must have stable height on mobile and desktop.

---

## 9. UI State Checklist

Every data-loading screen must handle:

- Loading.
- Empty.
- Error.
- Success.
- Unauthorized.

Every form must handle:

- Initial state.
- Dirty state.
- Submitting state.
- Validation error state.
- Submit success state.
- Submit failure state.

---

## 10. Final Demo Flow

The UI must support this sequence without code changes:

1. Admin confirms seeded data exists.
2. Customer logs in.
3. Customer creates order with pickup, dropoff, one stop, vehicle type, and notes.
4. Customer previews route, distance, ETA, and price.
5. Customer submits order.
6. Driver logs in.
7. Driver opens available orders.
8. Driver accepts order.
9. Driver updates status to `PICKING_UP`.
10. Driver sends simulated tracking point.
11. Customer sees updated status and tracking marker.
12. Customer creates QR payment.
13. Admin logs in.
14. Admin opens order detail and sees status, driver, tracking, image/payment info.
15. Driver updates status to `IN_TRANSIT`.
16. Driver updates status to `DELIVERED`.
17. Customer and Admin see final delivered state.

---

## 11. UI Acceptance Checklist

- Login works for all demo accounts.
- Customer can complete order form.
- Customer can see route summary.
- Customer can see created order after refresh.
- Driver can see requested order.
- Driver can accept and update order.
- Driver can send tracking point.
- Customer/Admin see tracking update.
- Payment QR section appears after creating payment.
- Admin can inspect orders, users, and drivers.
- Mobile Customer and Driver flows are usable.
- Desktop Admin dashboard is readable.

