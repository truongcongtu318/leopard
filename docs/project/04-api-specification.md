# LEOPARD API Specification

**Version:** 1.0  
**Date:** 2026-07-06  
**Source of truth:** `docs/srs-leopard-mvp.md`  
**Purpose:** Define API endpoints, payloads, responses, auth rules, and error standards for devs and coding agents.

---

## 1. API Conventions

### 1.1 Base URLs

Local:

```text
http://localhost:4000
```

Staging:

```text
https://api.<staging-domain>
```

### 1.2 Authentication

Use bearer token:

```http
Authorization: Bearer <accessToken>
```

### 1.3 Response Format

Success responses return JSON objects or arrays.

Error responses use:

```json
{
  "statusCode": 400,
  "code": "ORDER_TOO_MANY_STOPS",
  "message": "Order can have at most 3 stops.",
  "details": {}
}
```

### 1.4 Common Status Codes

| Status | Meaning |
| --- | --- |
| 200 | Success. |
| 201 | Resource created. |
| 400 | Validation or business rule error. |
| 401 | Missing or invalid authentication. |
| 403 | Authenticated but wrong role/access. |
| 404 | Resource not found or hidden by access rule. |
| 409 | Conflict such as already accepted order. |
| 500 | Unexpected server error. |

---

## 2. Shared DTOs

### 2.1 UserDto

```json
{
  "id": "usr_123",
  "email": "customer@leopard.demo",
  "name": "Demo Customer",
  "role": "CUSTOMER"
}
```

### 2.2 GeoPointDto

```json
{
  "address": "Khu đô thị FPT City, Đà Nẵng",
  "lat": 15.9759,
  "lng": 108.2529
}
```

### 2.3 OrderDto

```json
{
  "id": "ord_123",
  "customerId": "usr_customer",
  "driverId": "drv_123",
  "pickup": {
    "address": "Khu đô thị FPT City, Đà Nẵng",
    "lat": 15.9759,
    "lng": 108.2529
  },
  "dropoff": {
    "address": "Cầu Rồng, Đà Nẵng",
    "lat": 16.061,
    "lng": 108.2278
  },
  "stops": [
    {
      "sequence": 1,
      "address": "Chợ Hàn, Đà Nẵng",
      "lat": 16.0682,
      "lng": 108.224
    }
  ],
  "vehicleType": "SMALL_TRUCK",
  "cargoNotes": "Hàng đóng thùng, cần giao trong ngày.",
  "status": "ACCEPTED",
  "distanceKm": 12.5,
  "etaMinutes": 32,
  "estimatedPriceVnd": 195000,
  "paymentStatus": "QR_CREATED",
  "createdAt": "2026-07-06T01:00:00.000Z",
  "updatedAt": "2026-07-06T01:15:00.000Z"
}
```

---

## 3. Auth API

### POST /auth/login

**Auth:** Public  
**Purpose:** Authenticate a user.

Request:

```json
{
  "email": "customer@leopard.demo",
  "password": "Password123!"
}
```

Response `200`:

```json
{
  "accessToken": "jwt-token",
  "user": {
    "id": "usr_customer",
    "email": "customer@leopard.demo",
    "name": "Demo Customer",
    "role": "CUSTOMER"
  }
}
```

Errors:

| Code | Status | Meaning |
| --- | --- | --- |
| AUTH_INVALID_CREDENTIALS | 401 | Email or password is invalid. |

### GET /auth/me

**Auth:** Customer, Driver, Admin  
**Purpose:** Return current authenticated user.

Response `200`:

```json
{
  "id": "usr_customer",
  "email": "customer@leopard.demo",
  "name": "Demo Customer",
  "role": "CUSTOMER"
}
```

---

## 4. Map API

### GET /maps/search

**Auth:** Customer, Driver, Admin  
**Purpose:** Search address suggestions.

Query:

```text
?q=fpt da nang
```

Response `200`:

```json
[
  {
    "address": "Khu đô thị FPT City, Đà Nẵng",
    "lat": 15.9759,
    "lng": 108.2529
  }
]
```

Rules:

- Use Vietmap if `VIETMAP_API_KEY` exists.
- Use demo provider otherwise.
- Empty query returns `400`.

### POST /maps/route

**Auth:** Customer, Driver, Admin  
**Purpose:** Calculate route summary.

Request:

```json
{
  "points": [
    {
      "address": "Khu đô thị FPT City, Đà Nẵng",
      "lat": 15.9759,
      "lng": 108.2529
    },
    {
      "address": "Cầu Rồng, Đà Nẵng",
      "lat": 16.061,
      "lng": 108.2278
    }
  ]
}
```

Response `200`:

```json
{
  "distanceKm": 12.5,
  "etaMinutes": 32,
  "polyline": "encoded-or-demo-polyline"
}
```

---

## 5. Customer Orders API

### POST /orders

**Auth:** Customer  
**Purpose:** Create shipment order.

Request:

```json
{
  "pickup": {
    "address": "Khu đô thị FPT City, Đà Nẵng",
    "lat": 15.9759,
    "lng": 108.2529
  },
  "dropoff": {
    "address": "Cầu Rồng, Đà Nẵng",
    "lat": 16.061,
    "lng": 108.2278
  },
  "stops": [
    {
      "sequence": 1,
      "address": "Chợ Hàn, Đà Nẵng",
      "lat": 16.0682,
      "lng": 108.224
    }
  ],
  "vehicleType": "SMALL_TRUCK",
  "cargoNotes": "Hàng đóng thùng, cần giao trong ngày."
}
```

Response `201`: `OrderDto`

Business rules:

- Customer role required.
- Stops length must be 0 to 3.
- Pickup/dropoff coordinates required.
- New order status is `REQUESTED`.
- Route, ETA, and estimated price are calculated before save.

Errors:

| Code | Status | Meaning |
| --- | --- | --- |
| ORDER_TOO_MANY_STOPS | 400 | More than 3 stops. |
| ORDER_INVALID_COORDINATES | 400 | Invalid lat/lng. |
| AUTH_FORBIDDEN_ROLE | 403 | Non-customer tried to create order. |

### GET /orders/my

**Auth:** Customer  
**Purpose:** List current customer's orders.

Response `200`:

```json
[
  {
    "id": "ord_123",
    "status": "REQUESTED",
    "pickupAddress": "Khu đô thị FPT City, Đà Nẵng",
    "dropoffAddress": "Cầu Rồng, Đà Nẵng",
    "distanceKm": 12.5,
    "etaMinutes": 32,
    "estimatedPriceVnd": 195000,
    "paymentStatus": "UNPAID",
    "createdAt": "2026-07-06T01:00:00.000Z"
  }
]
```

### GET /orders/:id

**Auth:** Customer owner, assigned Driver, or Admin  
**Purpose:** View order detail.

Response `200`: Expanded order detail with stops, images, payment intents, latest tracking point, customer, and driver.

Access rules:

- Customer can access own order.
- Driver can access available order or assigned order.
- Admin can access all orders.

---

## 6. Media API

### POST /orders/:id/images

**Auth:** Customer owner, assigned Driver, or Admin  
**Content-Type:** `multipart/form-data`  
**Purpose:** Upload cargo, delivery confirmation, or document image.

Form fields:

```text
file: binary
type: CARGO | DELIVERY_CONFIRMATION | DOCUMENT
```

Response `201`:

```json
{
  "id": "img_123",
  "orderId": "ord_123",
  "type": "CARGO",
  "url": "/uploads/img_123.jpg",
  "mimeType": "image/jpeg",
  "sizeBytes": 123456,
  "createdAt": "2026-07-06T01:05:00.000Z"
}
```

Errors:

| Code | Status | Meaning |
| --- | --- | --- |
| MEDIA_INVALID_TYPE | 400 | MIME type not allowed. |
| MEDIA_FILE_TOO_LARGE | 400 | File exceeds configured limit. |
| ORDER_ACCESS_DENIED | 403 | User cannot upload to this order. |

---

## 7. Driver API

### GET /driver/orders/available

**Auth:** Driver  
**Purpose:** List orders available for acceptance.

Response `200`:

```json
[
  {
    "id": "ord_123",
    "pickupAddress": "Khu đô thị FPT City, Đà Nẵng",
    "dropoffAddress": "Cầu Rồng, Đà Nẵng",
    "vehicleType": "SMALL_TRUCK",
    "distanceKm": 12.5,
    "etaMinutes": 32,
    "estimatedPriceVnd": 195000,
    "createdAt": "2026-07-06T01:00:00.000Z"
  }
]
```

Rules:

- Only `REQUESTED` orders are returned.

### POST /driver/orders/:id/accept

**Auth:** Driver  
**Purpose:** Accept an available order.

Response `200`: `OrderDto` with `status = ACCEPTED` and `driverId`.

Errors:

| Code | Status | Meaning |
| --- | --- | --- |
| ORDER_ALREADY_ACCEPTED | 409 | Order is already assigned. |
| AUTH_FORBIDDEN_ROLE | 403 | Non-driver attempted accept. |

### PATCH /driver/orders/:id/status

**Auth:** Assigned Driver  
**Purpose:** Update assigned order status.

Request:

```json
{
  "status": "PICKING_UP"
}
```

Response `200`: `OrderDto`

Allowed transitions:

```text
ACCEPTED -> PICKING_UP
PICKING_UP -> IN_TRANSIT
IN_TRANSIT -> DELIVERED
```

Errors:

| Code | Status | Meaning |
| --- | --- | --- |
| ORDER_INVALID_STATUS_TRANSITION | 400 | Transition not allowed. |
| ORDER_NOT_ASSIGNED_TO_DRIVER | 403 | Driver is not assigned to order. |

---

## 8. Tracking API and Socket.IO

### POST /tracking/points

**Auth:** Assigned Driver  
**Purpose:** HTTP fallback for sending tracking point.

Request:

```json
{
  "orderId": "ord_123",
  "lat": 16.061,
  "lng": 108.2278
}
```

Response `201`:

```json
{
  "id": "trk_123",
  "orderId": "ord_123",
  "driverId": "drv_123",
  "lat": 16.061,
  "lng": 108.2278,
  "recordedAt": "2026-07-06T01:10:00.000Z"
}
```

### Socket Event: tracking:join-order

Client emits:

```json
{
  "orderId": "ord_123"
}
```

Server behavior:

- Validates user can view order.
- Joins socket to room `order:ord_123`.

### Socket Event: tracking:send-point

Driver emits:

```json
{
  "orderId": "ord_123",
  "lat": 16.061,
  "lng": 108.2278
}
```

Server behavior:

- Validates driver assignment.
- Persists point.
- Emits `tracking:point-updated` to room.

### Socket Event: tracking:point-updated

Server emits:

```json
{
  "id": "trk_123",
  "orderId": "ord_123",
  "driverId": "drv_123",
  "lat": 16.061,
  "lng": 108.2278,
  "recordedAt": "2026-07-06T01:10:00.000Z"
}
```

---

## 9. Payment API

### POST /orders/:id/payment-intents

**Auth:** Customer owner or Admin  
**Purpose:** Create QR payment intent.

Request:

```json
{
  "provider": "DEMO"
}
```

Response `201`:

```json
{
  "id": "pay_123",
  "orderId": "ord_123",
  "status": "QR_CREATED",
  "provider": "DEMO",
  "amountVnd": 195000,
  "qrContent": "LEOPARD-DEMO-PAYMENT|ord_123|195000",
  "createdAt": "2026-07-06T01:20:00.000Z"
}
```

Rules:

- Amount defaults to order `estimatedPriceVnd`.
- Demo provider must work without credentials.
- payOS/VietQR provider requires environment credentials.
- Automatic bank reconciliation is not required.

---

## 10. Admin API

### GET /admin/users

**Auth:** Admin  
**Purpose:** List users.

Response `200`:

```json
[
  {
    "id": "usr_customer",
    "email": "customer@leopard.demo",
    "name": "Demo Customer",
    "role": "CUSTOMER",
    "createdAt": "2026-07-06T01:00:00.000Z"
  }
]
```

### GET /admin/drivers

**Auth:** Admin  
**Purpose:** List drivers.

Response `200`:

```json
[
  {
    "id": "drv_123",
    "user": {
      "id": "usr_driver",
      "email": "driver@leopard.demo",
      "name": "Demo Driver"
    },
    "vehicleType": "SMALL_TRUCK",
    "availability": "AVAILABLE",
    "licensePlate": "43C-12345"
  }
]
```

### GET /admin/orders

**Auth:** Admin  
**Purpose:** List orders with optional status filter.

Query:

```text
?status=REQUESTED
```

Response `200`:

```json
[
  {
    "id": "ord_123",
    "customerName": "Demo Customer",
    "driverName": "Demo Driver",
    "status": "ACCEPTED",
    "paymentStatus": "QR_CREATED",
    "pickupAddress": "Khu đô thị FPT City, Đà Nẵng",
    "dropoffAddress": "Cầu Rồng, Đà Nẵng",
    "createdAt": "2026-07-06T01:00:00.000Z"
  }
]
```

### GET /admin/orders/:id

**Auth:** Admin  
**Purpose:** View full order detail.

Response `200`:

```json
{
  "order": {
    "id": "ord_123",
    "status": "ACCEPTED",
    "distanceKm": 12.5,
    "etaMinutes": 32,
    "estimatedPriceVnd": 195000
  },
  "customer": {
    "id": "usr_customer",
    "name": "Demo Customer",
    "email": "customer@leopard.demo"
  },
  "driver": {
    "id": "drv_123",
    "name": "Demo Driver",
    "vehicleType": "SMALL_TRUCK"
  },
  "stops": [],
  "images": [],
  "latestTrackingPoint": null,
  "paymentIntents": []
}
```

---

## 11. Error Code Catalog

| Code | Status | Meaning |
| --- | --- | --- |
| AUTH_INVALID_CREDENTIALS | 401 | Email/password is invalid. |
| AUTH_TOKEN_REQUIRED | 401 | Missing bearer token. |
| AUTH_FORBIDDEN_ROLE | 403 | Wrong role for endpoint. |
| ORDER_NOT_FOUND | 404 | Order not found or inaccessible. |
| ORDER_TOO_MANY_STOPS | 400 | More than 3 stops. |
| ORDER_INVALID_COORDINATES | 400 | Invalid latitude/longitude. |
| ORDER_ALREADY_ACCEPTED | 409 | Order already has driver. |
| ORDER_NOT_ASSIGNED_TO_DRIVER | 403 | Driver is not assigned to order. |
| ORDER_INVALID_STATUS_TRANSITION | 400 | Status transition not allowed. |
| MAP_PROVIDER_UNAVAILABLE | 500 | Map provider failed and no fallback available. |
| MEDIA_INVALID_TYPE | 400 | File MIME type not allowed. |
| MEDIA_FILE_TOO_LARGE | 400 | File size too large. |
| PAYMENT_PROVIDER_UNAVAILABLE | 500 | Payment provider unavailable. |

---

## 12. API Acceptance Checklist

- Auth endpoints work for all demo roles.
- Customer can create and read own order.
- Driver can see and accept requested order.
- Driver can update assigned order status.
- Admin can list users, drivers, and orders.
- Map endpoints work with demo provider.
- Payment endpoint works with demo provider.
- Tracking Socket.IO event updates subscribed client.
- Wrong role receives `403`.
- Missing token receives `401`.

