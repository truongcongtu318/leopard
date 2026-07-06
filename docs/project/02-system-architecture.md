# LEOPARD System Architecture Document

**Version:** 1.0  
**Date:** 2026-07-06  
**Source of truth:** `docs/srs-leopard-mvp.md`  
**Purpose:** Define the architecture that devs and coding agents must follow.

---

## 1. Architecture Goals

The architecture must support a 6-week MVP/demo while keeping the project clean enough to extend later.

Primary goals:

- Build a working browser-based logistics MVP.
- Keep Customer, Driver, and Admin flows in one coherent system.
- Keep external services behind provider interfaces.
- Allow local development without real third-party credentials.
- Keep backend modules separated by business capability.
- Keep data model simple and migration-friendly.

Non-goals:

- Production SLA.
- High concurrency guarantee.
- Native mobile app architecture.
- Advanced dispatch optimization.
- Full payment reconciliation.

---

## 2. Approved Tech Stack

| Layer | Technology | Purpose |
| --- | --- | --- |
| Frontend | Next.js, React, TypeScript | Web App/PWA for Customer, Driver, Admin. |
| Styling | Tailwind CSS | Fast responsive UI implementation. |
| Backend | NestJS, TypeScript | Modular API and business logic. |
| ORM | Prisma | Database schema, migrations, query layer. |
| Database | PostgreSQL + PostGIS | Users, orders, route coordinates, tracking, payments. |
| Realtime | Socket.IO/WebSocket | Tracking and order status events. |
| Map | Vietmap API | Search, geocoding, routing, distance, ETA. |
| OTP | Firebase Phone Auth | Optional OTP when configured. |
| Storage | DigitalOcean Spaces / S3-compatible | Media upload storage. |
| Payment | VietQR / payOS | QR payment creation. |
| Local Runtime | Docker Compose | Local PostgreSQL/PostGIS. |

---

## 3. High-Level System Diagram

```text
                                  +----------------------+
                                  |    Vietmap API       |
                                  +----------^-----------+
                                             |
+----------------------+          +----------+-----------+
| Customer Browser     |          |                      |
| Driver Browser       +--------->+ Next.js Web App/PWA  |
| Admin Browser        | HTTPS    |                      |
+----------------------+          +----------+-----------+
                                             |
                                             | HTTPS JSON + Socket.IO
                                             v
                                  +----------+-----------+
                                  | NestJS Backend API   |
                                  | REST + Socket.IO     |
                                  +----------+-----------+
                                             |
                         +-------------------+-------------------+
                         |                   |                   |
                         v                   v                   v
              +----------+---------+  +------+-------+  +--------+---------+
              | PostgreSQL/PostGIS |  | S3 Storage  |  | payOS / VietQR   |
              +--------------------+  +--------------+  +------------------+
```

---

## 4. Repository Layout

Recommended monorepo layout:

```text
leopard/
  apps/
    web/
      src/
        app/
          login/
          customer/
          driver/
          admin/
        components/
        lib/
        styles/
    api/
      prisma/
        schema.prisma
        seed.ts
      src/
        auth/
        users/
        drivers/
        orders/
        maps/
        tracking/
        media/
        payments/
        admin/
        integrations/
        common/
  packages/
    shared/
      src/
        user.ts
        order.ts
        tracking.ts
        payment.ts
        index.ts
  docs/
    srs-leopard-mvp.md
    project/
```

Rules:

- `apps/web` must not query the database directly.
- `apps/web` communicates only with `apps/api`.
- `apps/api` owns business rules.
- `packages/shared` contains DTOs, enums, and shared validation helpers when useful.
- Integration-specific code must stay under `apps/api/src/integrations`.

---

## 5. Backend Module Design

### 5.1 Auth Module

Responsibilities:

- Login.
- Current user endpoint.
- JWT creation/validation.
- Role guards.
- Demo account compatibility.
- Optional Firebase OTP boundary.

Key files:

```text
apps/api/src/auth/auth.module.ts
apps/api/src/auth/auth.controller.ts
apps/api/src/auth/auth.service.ts
apps/api/src/auth/jwt.strategy.ts
apps/api/src/auth/roles.guard.ts
apps/api/src/auth/current-user.decorator.ts
```

### 5.2 Orders Module

Responsibilities:

- Create order.
- Validate stops limit.
- Store pickup/dropoff/stops.
- Request map route.
- Calculate ETA and price estimate.
- Return customer order list/detail.

Key files:

```text
apps/api/src/orders/orders.module.ts
apps/api/src/orders/orders.controller.ts
apps/api/src/orders/orders.service.ts
apps/api/src/orders/dto/create-order.dto.ts
apps/api/src/orders/order-status.ts
```

### 5.3 Drivers Module

Responsibilities:

- Available order list.
- Accept order.
- Update assigned order status.
- Driver availability.

Key files:

```text
apps/api/src/drivers/drivers.module.ts
apps/api/src/drivers/drivers.controller.ts
apps/api/src/drivers/drivers.service.ts
apps/api/src/drivers/dto/update-order-status.dto.ts
```

### 5.4 Tracking Module

Responsibilities:

- Socket.IO gateway.
- Join/leave order room.
- Receive tracking points.
- Validate assigned driver.
- Persist point.
- Broadcast latest point.

Key files:

```text
apps/api/src/tracking/tracking.module.ts
apps/api/src/tracking/tracking.gateway.ts
apps/api/src/tracking/tracking.service.ts
apps/api/src/tracking/dto/send-tracking-point.dto.ts
```

### 5.5 Media Module

Responsibilities:

- Validate file size/type.
- Store local/S3 media.
- Attach image metadata to order.
- Enforce order access.

Key files:

```text
apps/api/src/media/media.module.ts
apps/api/src/media/media.controller.ts
apps/api/src/media/media.service.ts
apps/api/src/media/file-validation.ts
```

### 5.6 Payments Module

Responsibilities:

- Create payment intent.
- Select demo or real provider.
- Store QR content and payment status.
- Return payment status in order detail.

Key files:

```text
apps/api/src/payments/payments.module.ts
apps/api/src/payments/payments.controller.ts
apps/api/src/payments/payments.service.ts
apps/api/src/payments/payment-status.ts
```

### 5.7 Admin Module

Responsibilities:

- Admin-only user list.
- Admin-only driver list.
- Admin-only order list/detail.
- Status filtering.
- Dashboard counts.

Key files:

```text
apps/api/src/admin/admin.module.ts
apps/api/src/admin/admin.controller.ts
apps/api/src/admin/admin.service.ts
```

---

## 6. Frontend App Design

### 6.1 Route Structure

```text
/login

/customer/orders
/customer/orders/new
/customer/orders/[id]

/driver/orders
/driver/orders/[id]

/admin
/admin/orders
/admin/orders/[id]
/admin/users
/admin/drivers
```

### 6.2 Frontend Responsibilities

Frontend owns:

- Form state.
- Browser validation messages.
- Role-based routing.
- API calls through a single client wrapper.
- Socket.IO client connection.
- Map display.
- User-friendly loading/empty/error states.

Frontend does not own:

- Authorization decisions.
- Price calculation source of truth.
- Status transition source of truth.
- Payment state source of truth.
- Database access.

### 6.3 Recommended Frontend File Layout

```text
apps/web/src/
  app/
    login/page.tsx
    customer/orders/page.tsx
    customer/orders/new/page.tsx
    customer/orders/[id]/page.tsx
    driver/orders/page.tsx
    driver/orders/[id]/page.tsx
    admin/page.tsx
    admin/orders/page.tsx
    admin/orders/[id]/page.tsx
    admin/users/page.tsx
    admin/drivers/page.tsx
  components/
    layout/
    orders/
    maps/
    tracking/
    payments/
    upload/
  lib/
    api.ts
    auth.ts
    socket.ts
    routes.ts
```

---

## 7. Integration Provider Architecture

### 7.1 Map Provider

Interface:

```ts
export interface MapProvider {
  searchAddress(query: string): Promise<AddressCandidate[]>;
  route(points: RoutePoint[]): Promise<RouteResult>;
}
```

Providers:

- `VietmapProvider`: used when `VIETMAP_API_KEY` exists.
- `DemoMapProvider`: used when no API key exists.

Rules:

- Order module calls `MapProvider`, not Vietmap directly.
- Demo provider must return stable sample results for Da Nang demo.
- Routing should be called after address selection or explicit route preview, not every keystroke.

### 7.2 Storage Provider

Interface:

```ts
export interface StorageProvider {
  upload(input: UploadInput): Promise<StoredFile>;
}
```

Providers:

- `LocalStorageProvider`: development and fallback.
- `S3StorageProvider`: DigitalOcean Spaces/S3-compatible staging.

Rules:

- API stores metadata in database.
- Provider stores bytes.
- File URL/path is returned to frontend.

### 7.3 Payment Provider

Interface:

```ts
export interface PaymentProvider {
  createPaymentIntent(input: CreatePaymentInput): Promise<PaymentProviderResult>;
}
```

Providers:

- `DemoPaymentProvider`: deterministic QR content.
- `PayOSProvider`: real payOS when configured.
- `VietQRProvider`: optional QR content provider if selected.

Rules:

- Demo payment is enough for MVP if real credentials are delayed.
- Automatic bank reconciliation is not in MVP scope.

### 7.4 OTP Provider

Interface:

```ts
export interface OtpProvider {
  sendOtp(phone: string): Promise<void>;
  verifyOtp(phone: string, code: string): Promise<boolean>;
}
```

Providers:

- `DemoOtpProvider`.
- `FirebaseOtpProvider`.

Rules:

- Email/password demo login remains supported for MVP.
- Firebase SMS cost and quota must be controlled.

---

## 8. Runtime Configuration

Required environment variables:

```dotenv
DATABASE_URL="postgresql://leopard:leopard@localhost:5432/leopard?schema=public"
JWT_SECRET="replace-with-secret"
WEB_ORIGIN="http://localhost:3000"
API_PORT="4000"
VIETMAP_API_KEY=""
STORAGE_DRIVER="local"
LOCAL_UPLOAD_DIR="./uploads"
S3_ENDPOINT=""
S3_ACCESS_KEY_ID=""
S3_SECRET_ACCESS_KEY=""
S3_BUCKET=""
PAYMENT_MODE="demo"
PAYOS_CLIENT_ID=""
PAYOS_API_KEY=""
PAYOS_CHECKSUM_KEY=""
```

Rules:

- Empty integration keys must not crash local development if demo provider exists.
- Production-like payment mode must fail fast when required credentials are missing.
- Secrets must not be committed.

---

## 9. Security Architecture

Minimum security requirements:

- Hash passwords with bcrypt or argon2.
- Use JWT or secure session token.
- Enforce role guards on backend.
- Validate request DTOs.
- Validate file type and size.
- Restrict CORS to configured web origin in staging.
- Do not expose raw provider secrets to frontend.
- Do not trust frontend role state.

Authorization matrix:

| Resource | Customer | Driver | Admin |
| --- | --- | --- | --- |
| Own orders | Read/write own create flow | No | Read all |
| Available orders | No | Read | Read |
| Assigned order status | No | Update assigned only | Read |
| Tracking send | No | Assigned order only | No |
| Tracking view | Own order | Assigned order | All |
| Users | Own profile | Own profile | All |
| Drivers | No | Own profile | All |
| Payments | Own order | Read assigned order | All |

---

## 10. Error Handling Standards

API error shape:

```json
{
  "statusCode": 400,
  "code": "ORDER_TOO_MANY_STOPS",
  "message": "Order can have at most 3 stops.",
  "details": {}
}
```

Frontend rules:

- Show short readable message.
- Keep form data when validation fails.
- Provide retry for network/server failure.
- Do not show stack traces.

Common error codes:

| Code | Meaning |
| --- | --- |
| AUTH_INVALID_CREDENTIALS | Email/password is invalid. |
| AUTH_FORBIDDEN_ROLE | User role cannot access resource. |
| ORDER_TOO_MANY_STOPS | More than 3 stops requested. |
| ORDER_INVALID_STATUS_TRANSITION | Status transition not allowed. |
| ORDER_ALREADY_ACCEPTED | Driver tried to accept assigned order. |
| TRACKING_NOT_ASSIGNED_DRIVER | Driver is not assigned to order. |
| MEDIA_INVALID_TYPE | Uploaded file type not allowed. |
| MEDIA_FILE_TOO_LARGE | Uploaded file exceeds max size. |
| PAYMENT_PROVIDER_UNAVAILABLE | Payment provider failed or not configured. |

---

## 11. Deployment Architecture

### 11.1 Local

```text
Next.js dev server -> localhost:3000
NestJS API -> localhost:4000
PostgreSQL/PostGIS -> localhost:5432
Local uploads -> apps/api/uploads
```

### 11.2 Staging

Recommended staging topology:

```text
Web host:
  Next.js app

VPS/API host:
  NestJS API
  Socket.IO

Database:
  PostgreSQL/PostGIS

Object storage:
  DigitalOcean Spaces or local fallback for demo
```

Staging must support:

- Demo accounts.
- Seed data reset.
- HTTPS where possible.
- WebSocket traffic.
- Environment-specific integration config.

---

## 12. Architecture Decision Records

### ADR-001: Use monorepo

Decision: Use monorepo with `apps/web`, `apps/api`, and `packages/shared`.

Reason:

- Easier shared contracts.
- Easier local development.
- Faster agent/dev coordination.

### ADR-002: Use provider fallback for integrations

Decision: Use demo providers for map, payment, OTP, and storage.

Reason:

- Avoid blocking development on credentials.
- Keep demo flow stable.
- Allow real provider switch later.

### ADR-003: Use PostGIS but keep geospatial logic minimal

Decision: Use PostgreSQL + PostGIS, but avoid complex geo-query logic in MVP.

Reason:

- Stack remains future-ready.
- MVP avoids unnecessary complexity.

### ADR-004: Use Socket.IO for tracking

Decision: Use Socket.IO for demo realtime tracking.

Reason:

- Faster implementation than custom WebSocket protocol.
- Room-based order tracking is straightforward.

