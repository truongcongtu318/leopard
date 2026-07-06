# Software Requirements Specification

## LEOPARD - MVP/Demo Logistics Connection System

**Document ID:** LEOPARD-SRS-MVP-001  
**Version:** 1.0  
**Date:** 2026-07-06  
**Status:** Draft for review  
**Project Type:** Web App/PWA + Admin Dashboard + Backend API  
**Target Release:** MVP/Demo  

---

## 1. Introduction

### 1.1 Purpose

This Software Requirements Specification defines the functional and non-functional requirements for LEOPARD, an MVP/Demo system for connecting customers who need cargo transportation with drivers who can accept and complete shipment orders.

The document is intended to be used during the SDLC process by:

- Business stakeholders to confirm scope and acceptance criteria.
- Developers and coding agents to implement the system.
- Reviewers to verify feature completeness.
- Testers to create test cases and UAT checklists.
- Project members to control scope changes.

### 1.2 Product Scope

LEOPARD MVP/Demo is a browser-based logistics connection system with three user roles:

- Customer: creates and tracks shipment orders.
- Driver: receives, accepts, and updates shipment orders.
- Admin: manages users, drivers, orders, statuses, and order details.

The system includes a Web App/PWA, Admin Dashboard, Backend API, database, map integration, realtime tracking demo, media upload, and QR payment creation.

This MVP is intended for demonstration, business validation, academic presentation, and future product development. It is not a production-grade commercial logistics platform and does not commit to 24/7 SLA, high concurrency, full payment reconciliation, advanced dispatch optimization, or native mobile app release.

### 1.3 SDLC Alignment

This SRS supports the following SDLC phases:

- Requirement Analysis: defines actors, scope, use cases, data, and acceptance criteria.
- Design: defines architecture, interfaces, entities, and integration boundaries.
- Implementation: provides feature-level requirements and priority.
- Testing: provides testable requirement IDs and acceptance criteria.
- Deployment: defines staging/demo environment expectations.
- Maintenance: defines known MVP limits and post-MVP items.

### 1.4 Definitions

| Term | Definition |
| --- | --- |
| MVP | Minimum Viable Product used for demonstration and validation. |
| PWA | Progressive Web App that works through a browser with responsive behavior. |
| Customer | User who creates shipment orders. |
| Driver | User who accepts and completes shipment orders. |
| Admin | User who monitors and manages operational data. |
| Order | A shipment request created by a customer. |
| Stop | Optional intermediate point between pickup and dropoff. |
| ETA | Estimated time of arrival, calculated at MVP level using map API or basic rules. |
| Tracking | Driver location updates shown to customer/admin in demo realtime. |
| QR Payment | Payment request represented by QR content or QR code. |
| UAT | User Acceptance Testing. |

### 1.5 References

- Project contract scope: consolidated into this SRS from the original contract draft.
- Implementation plan: `docs/superpowers/plans/2026-07-06-leopard-6-week-mvp.md`

---

## 2. Overall Description

### 2.1 Product Perspective

LEOPARD is a new web-based MVP system. It consists of:

- A frontend Web App/PWA for Customer, Driver, and Admin.
- A backend API for authentication, orders, users, drivers, tracking, uploads, payments, and integrations.
- A PostgreSQL/PostGIS database for users, orders, coordinates, tracking points, payments, and media metadata.
- Third-party integrations for map/routing, authentication/OTP when configured, media storage, and QR payment creation.

### 2.2 Product Functions Summary

The system shall provide:

- Role-based login and access control.
- Customer shipment order creation.
- Address search, geocoding, routing, distance, and ETA.
- Driver order discovery, acceptance, and status updates.
- Realtime tracking demo through WebSocket/Socket.IO.
- Media upload for cargo and delivery evidence.
- QR payment creation using VietQR/payOS or demo provider.
- Admin dashboard for users, drivers, orders, and order details.
- Deployment and handover documentation.

### 2.3 User Classes

| User Class | Description | Main Goals |
| --- | --- | --- |
| Customer | Person or organization needing goods transported. | Create shipment, view route/ETA, track order, create payment QR. |
| Driver | Transport provider who accepts orders. | View available orders, accept order, update delivery status, send location. |
| Admin | System operator or project demo administrator. | Manage users, drivers, orders, statuses, and details. |

### 2.4 Operating Environment

Frontend:

- Runs in common modern browsers: Chrome, Edge, Firefox, and Safari.
- Supports desktop and mobile responsive layouts.
- Delivered as Web App/PWA using Next.js and React.

Backend:

- Runs as a NestJS API service.
- Uses Prisma ORM.
- Connects to PostgreSQL with PostGIS extension.
- Supports WebSocket/Socket.IO for realtime tracking.

Deployment:

- Local development through Node.js, pnpm, and Docker Compose.
- Staging/demo deployment through VPS or equivalent hosting.

### 2.5 Design and Implementation Constraints

- The tech stack shall remain:
  - Next.js / React / TypeScript for frontend.
  - NestJS / Prisma for backend.
  - PostgreSQL + PostGIS for database.
  - Socket.IO/WebSocket for realtime tracking.
  - Vietmap API for map, geocoding, routing, and ETA where available.
  - Firebase Phone Auth for OTP if configured.
  - DigitalOcean Spaces or S3-compatible storage for media where configured.
  - VietQR/payOS for QR payment where configured.
- The MVP shall not require Figma/prototype handoff unless separately agreed.
- The MVP shall not be treated as a production system with high availability SLA.
- The MVP shall support demo/staging operation first.
- Third-party services may use demo fallback providers if credentials are unavailable.

### 2.6 Assumptions and Dependencies

Assumptions:

- Stakeholders freeze MVP scope before development starts.
- Customer, Driver, and Admin are the only required roles.
- Demo data is acceptable for presentation and UAT.
- API credentials may not be available at the start of development.
- The team accepts provider fallbacks for map, payment, storage, and OTP during local development.

Dependencies:

- Vietmap API availability and quota.
- Firebase Phone Auth configuration and SMS budget if OTP is enabled.
- DigitalOcean Spaces or S3-compatible storage credentials if cloud upload is enabled.
- VietQR/payOS account and credentials if real QR payment is enabled.
- VPS or staging host availability.

---

## 3. System Architecture Requirements

### 3.1 High-Level Architecture

The system shall use a client-server architecture:

```text
Customer / Driver / Admin Browser
        |
        v
Next.js Web App / PWA
        |
        v
NestJS Backend API + Socket.IO Gateway
        |
        v
PostgreSQL + PostGIS

External Services:
- Vietmap API
- Firebase Phone Auth
- DigitalOcean Spaces / S3-compatible storage
- VietQR / payOS
```

### 3.2 Logical Modules

| Module | Responsibility |
| --- | --- |
| Auth Module | Login, current user, JWT/session, role authorization. |
| User Module | User profile and account records. |
| Driver Module | Driver profile, availability, order acceptance, status updates. |
| Order Module | Shipment creation, order lifecycle, stops, pricing estimate, route summary. |
| Map Integration Module | Address search, geocoding, routing, distance, ETA. |
| Tracking Module | Driver location update and realtime event broadcasting. |
| Media Module | Cargo and delivery image upload. |
| Payment Module | QR/payment intent creation. |
| Admin Module | User, driver, order, and status management views. |
| Documentation Module | Setup, deploy, API, UAT, and handover docs. |

### 3.3 Provider Strategy

External integrations shall be accessed through provider interfaces:

- MapProvider:
  - VietmapProvider for real map API.
  - DemoMapProvider for stable local/demo behavior.
- StorageProvider:
  - LocalStorageProvider for local development.
  - S3StorageProvider for staging/cloud storage.
- PaymentProvider:
  - DemoPaymentProvider for QR demo.
  - PayOSProvider or VietQRProvider for real QR payment.
- OtpProvider:
  - FirebaseOtpProvider when Firebase credentials are configured.
  - DemoOtpProvider when real OTP is not enabled.

This avoids blocking implementation when credentials are delayed.

---

## 4. Functional Requirements

Requirement priorities:

- P0: Critical for MVP acceptance.
- P1: Important for demo completeness.
- P2: Useful but can be deferred if time is constrained.

### 4.1 Authentication and Authorization

| ID | Requirement | Priority | Acceptance Criteria |
| --- | --- | --- | --- |
| AUTH-001 | The system shall allow users to log in. | P0 | Valid credentials return an authenticated session/token. |
| AUTH-002 | The system shall support Customer, Driver, and Admin roles. | P0 | Each user has exactly one MVP role. |
| AUTH-003 | The system shall redirect users to role-specific pages after login. | P0 | Customer, Driver, and Admin land on correct dashboards. |
| AUTH-004 | The system shall prevent users from accessing pages outside their role. | P0 | Unauthorized role access is blocked. |
| AUTH-005 | The system shall provide logout. | P1 | Session/token is cleared and user returns to login. |
| AUTH-006 | The system shall support Firebase Phone Auth OTP if configured. | P2 | OTP can be enabled through environment configuration. |
| AUTH-007 | The system shall support demo login without OTP for MVP development and presentation. | P0 | Demo accounts can log in without SMS dependency. |

### 4.2 Customer Order Creation

| ID | Requirement | Priority | Acceptance Criteria |
| --- | --- | --- | --- |
| ORD-001 | Customer shall be able to create a shipment order. | P0 | Order is saved and visible after refresh. |
| ORD-002 | Order shall include pickup address and coordinates. | P0 | Pickup address, latitude, and longitude are stored. |
| ORD-003 | Order shall include dropoff address and coordinates. | P0 | Dropoff address, latitude, and longitude are stored. |
| ORD-004 | Order shall allow 0 to 3 intermediate stops. | P0 | More than 3 stops is rejected. |
| ORD-005 | Order shall include vehicle type. | P0 | Vehicle type is required before submission. |
| ORD-006 | Order shall include cargo notes. | P1 | Notes are saved and visible in order detail. |
| ORD-007 | Order shall include cargo image upload. | P1 | Uploaded image is associated with the order. |
| ORD-008 | Customer shall see route summary before or after order submission. | P0 | Distance and ETA are visible. |
| ORD-009 | Customer shall see estimated price. | P1 | Price estimate is calculated and stored. |
| ORD-010 | Customer shall view their own order list. | P0 | Customer only sees orders they created. |
| ORD-011 | Customer shall view order detail. | P0 | Detail includes addresses, stops, status, driver when assigned, route summary, images, and payment status. |

### 4.3 Map, Address, Routing, ETA

| ID | Requirement | Priority | Acceptance Criteria |
| --- | --- | --- | --- |
| MAP-001 | The system shall display a map in customer order flow. | P0 | Map renders in browser without blocking order creation. |
| MAP-002 | The system shall support address search/autocomplete. | P0 | User can search/select pickup and dropoff addresses. |
| MAP-003 | The system shall geocode selected addresses. | P0 | Selected address produces latitude and longitude. |
| MAP-004 | The system shall calculate route between pickup, stops, and dropoff. | P0 | Route result includes distance and ETA. |
| MAP-005 | The system shall use Vietmap API when configured. | P0 | Vietmap provider is used when API key exists. |
| MAP-006 | The system shall use demo map provider when Vietmap credentials are missing. | P0 | Demo flow works without external API key. |
| MAP-007 | The system shall limit unnecessary map API transactions. | P1 | Routing is called after confirmed address selection or explicit route preview. |

### 4.4 Driver Order Flow

| ID | Requirement | Priority | Acceptance Criteria |
| --- | --- | --- | --- |
| DRV-001 | Driver shall view available requested orders. | P0 | Only orders eligible for acceptance are listed. |
| DRV-002 | Driver shall view order detail before accepting. | P0 | Detail includes pickup, dropoff, stops, vehicle type, notes, route summary, and images. |
| DRV-003 | Driver shall accept an order. | P0 | Order status becomes ACCEPTED and driver is assigned. |
| DRV-004 | Driver shall update order status. | P0 | Driver can move through allowed statuses. |
| DRV-005 | Driver shall not accept an already accepted order. | P0 | System rejects duplicate acceptance. |
| DRV-006 | Driver shall have availability status. | P1 | Driver can be AVAILABLE, BUSY, or OFFLINE. |
| DRV-007 | Driver shall upload delivery confirmation image if needed. | P1 | Delivery image is associated with the order. |

### 4.5 Order Status Lifecycle

| ID | Requirement | Priority | Acceptance Criteria |
| --- | --- | --- | --- |
| STA-001 | New submitted order shall start as REQUESTED. | P0 | Created order is available for drivers. |
| STA-002 | Accepted order shall become ACCEPTED. | P0 | Driver assignment is recorded. |
| STA-003 | Driver shall update ACCEPTED to PICKING_UP. | P0 | Status change is saved and visible. |
| STA-004 | Driver shall update PICKING_UP to IN_TRANSIT. | P0 | Status change is saved and visible. |
| STA-005 | Driver shall update IN_TRANSIT to DELIVERED. | P0 | Final delivered state is saved and visible. |
| STA-006 | System shall reject invalid status transitions. | P1 | Example: DELIVERED cannot return to REQUESTED. |
| STA-007 | Customer and Admin shall see current order status. | P0 | Status changes appear after refresh and through realtime/event update when available. |

Recommended status values:

- REQUESTED
- ACCEPTED
- PICKING_UP
- IN_TRANSIT
- DELIVERED
- CANCELLED

### 4.6 Realtime Tracking

| ID | Requirement | Priority | Acceptance Criteria |
| --- | --- | --- | --- |
| TRK-001 | Driver shall send location updates for assigned order. | P0 | Backend accepts lat/lng from assigned driver. |
| TRK-002 | Backend shall persist tracking points. | P0 | Tracking point is saved with order, driver, and timestamp. |
| TRK-003 | Customer shall see latest driver location for their order. | P0 | Marker/location appears on order detail/tracking screen. |
| TRK-004 | Admin shall see latest driver location for an order. | P1 | Admin order detail shows latest tracking point. |
| TRK-005 | System shall broadcast tracking updates through Socket.IO/WebSocket. | P0 | Subscribed clients receive update event. |
| TRK-006 | System shall support simulated tracking for demo. | P0 | Demo can run even when browser GPS is unavailable. |
| TRK-007 | System shall not claim GPS-grade accuracy. | P0 | Tracking is clearly MVP/demo level in docs. |

### 4.7 Media Upload

| ID | Requirement | Priority | Acceptance Criteria |
| --- | --- | --- | --- |
| MED-001 | Customer shall upload cargo image. | P1 | Image appears in order detail. |
| MED-002 | Driver shall upload delivery confirmation image. | P1 | Image appears in order detail/admin view. |
| MED-003 | System shall validate file type. | P0 | Unsupported file types are rejected. |
| MED-004 | System shall validate file size. | P0 | Oversized files are rejected. |
| MED-005 | System shall store files locally in development. | P0 | Local upload works without cloud credentials. |
| MED-006 | System shall support DigitalOcean Spaces/S3-compatible storage when configured. | P1 | Cloud upload works with environment credentials. |

### 4.8 Payment and QR Creation

| ID | Requirement | Priority | Acceptance Criteria |
| --- | --- | --- | --- |
| PAY-001 | Customer/Admin shall create a QR payment request for an order. | P0 | Payment intent is created and linked to order. |
| PAY-002 | Payment intent shall include amount, status, QR content, and created time. | P0 | Payment data is stored and visible. |
| PAY-003 | System shall support VietQR/payOS provider when configured. | P1 | Real provider can be enabled through environment configuration. |
| PAY-004 | System shall support demo payment provider. | P0 | QR demo works without real credentials. |
| PAY-005 | System shall not require automatic bank reconciliation in MVP. | P0 | Payment confirmation is manual/demo unless later configured. |
| PAY-006 | System shall expose payment status in order detail. | P0 | Customer and Admin can see payment state. |

Recommended payment statuses:

- UNPAID
- QR_CREATED
- PAID_DEMO
- FAILED

### 4.9 Admin Dashboard

| ID | Requirement | Priority | Acceptance Criteria |
| --- | --- | --- | --- |
| ADM-001 | Admin shall view dashboard summary. | P1 | Summary includes counts for users, drivers, orders, and order statuses. |
| ADM-002 | Admin shall view user list. | P0 | Users are listed with role and basic information. |
| ADM-003 | Admin shall view driver list. | P0 | Drivers are listed with availability/status. |
| ADM-004 | Admin shall view order list. | P0 | Orders are listed with customer, driver, status, and created time. |
| ADM-005 | Admin shall filter orders by status. | P1 | Filter changes order list result. |
| ADM-006 | Admin shall view order detail. | P0 | Detail includes addresses, stops, route, driver, customer, images, tracking, and payment. |
| ADM-007 | Admin shall not access dashboard without Admin role. | P0 | Non-admin users are blocked. |

### 4.10 Documentation and Handover

| ID | Requirement | Priority | Acceptance Criteria |
| --- | --- | --- | --- |
| DOC-001 | System shall include `.env.example`. | P0 | Required environment variables are documented. |
| DOC-002 | System shall include local setup guide. | P0 | A developer can run the app locally from docs. |
| DOC-003 | System shall include deploy guide. | P0 | Staging setup steps are documented. |
| DOC-004 | System shall include API summary. | P1 | Main endpoints, auth, payloads, and responses are documented. |
| DOC-005 | System shall include UAT checklist. | P0 | Checklist covers critical demo flows. |
| DOC-006 | System shall include final handover notes. | P0 | Delivered features, known limits, and credentials handover process are documented. |

---

## 5. External Interface Requirements

### 5.1 User Interface Requirements

General UI:

- The UI shall be responsive for desktop and mobile.
- The UI shall provide separate navigation for Customer, Driver, and Admin.
- The UI shall display loading, empty, success, and error states for main flows.
- The UI shall not expose admin-only actions to non-admin users.
- The UI shall keep demo flows simple and reliable.

Customer UI:

- Login page.
- Order creation page.
- Address search inputs.
- Route preview/map section.
- Order list page.
- Order detail/tracking page.
- Payment QR creation/view section.

Driver UI:

- Login page.
- Available orders list.
- Order detail page.
- Accept order action.
- Status update controls.
- Tracking send/simulate action.
- Delivery confirmation upload.

Admin UI:

- Dashboard summary.
- User list.
- Driver list.
- Order list with status filter.
- Order detail page.

### 5.2 API Interface Requirements

Minimum REST endpoints:

```text
POST   /auth/login
GET    /auth/me

POST   /orders
GET    /orders/my
GET    /orders/:id
POST   /orders/:id/images
POST   /orders/:id/payment-intents

GET    /driver/orders/available
POST   /driver/orders/:id/accept
PATCH  /driver/orders/:id/status
POST   /driver/orders/:id/delivery-images

GET    /admin/users
GET    /admin/drivers
GET    /admin/orders
GET    /admin/orders/:id

GET    /maps/search
POST   /maps/route
```

Minimum Socket.IO events:

```text
tracking:join-order
tracking:leave-order
tracking:send-point
tracking:point-updated
order:status-updated
```

### 5.3 Hardware Interface Requirements

No special hardware is required for MVP.

Optional device capabilities:

- Browser geolocation for driver tracking.
- Camera/file picker for image upload.

### 5.4 Software Interface Requirements

The system shall integrate with:

- PostgreSQL/PostGIS for persistent storage.
- Vietmap API for address search, geocoding, routing, distance, and ETA.
- Firebase Phone Auth for OTP when enabled.
- DigitalOcean Spaces/S3-compatible storage for cloud media storage when enabled.
- VietQR/payOS for QR payment creation when enabled.

### 5.5 Communication Interface Requirements

- Frontend communicates with backend over HTTPS in staging.
- Backend communicates with external APIs over HTTPS.
- Realtime updates use WebSocket/Socket.IO.
- API responses use JSON.
- Uploaded files use multipart/form-data.

---

## 6. Data Requirements

### 6.1 Core Entities

#### User

| Field | Description |
| --- | --- |
| id | Unique user ID. |
| email | User email/login identifier. |
| phone | Optional phone number. |
| passwordHash | Hashed password when password auth is used. |
| name | Display name. |
| role | CUSTOMER, DRIVER, or ADMIN. |
| createdAt | Record creation time. |
| updatedAt | Record update time. |

#### DriverProfile

| Field | Description |
| --- | --- |
| id | Unique driver profile ID. |
| userId | Linked user. |
| vehicleType | Supported vehicle type. |
| availability | AVAILABLE, BUSY, or OFFLINE. |
| licensePlate | Optional license plate. |
| createdAt | Record creation time. |
| updatedAt | Record update time. |

#### Order

| Field | Description |
| --- | --- |
| id | Unique order ID. |
| customerId | Customer who created the order. |
| driverId | Assigned driver, nullable before acceptance. |
| pickupAddress | Pickup address text. |
| pickupLat | Pickup latitude. |
| pickupLng | Pickup longitude. |
| dropoffAddress | Dropoff address text. |
| dropoffLat | Dropoff latitude. |
| dropoffLng | Dropoff longitude. |
| vehicleType | Required vehicle type. |
| cargoNotes | Cargo notes. |
| status | Current order status. |
| distanceKm | Estimated route distance. |
| etaMinutes | Estimated route duration. |
| estimatedPriceVnd | MVP estimated price. |
| paymentStatus | Current payment status. |
| createdAt | Record creation time. |
| updatedAt | Record update time. |

#### OrderStop

| Field | Description |
| --- | --- |
| id | Unique stop ID. |
| orderId | Linked order. |
| sequence | Stop sequence from 1 to 3. |
| address | Stop address. |
| lat | Stop latitude. |
| lng | Stop longitude. |

#### OrderImage

| Field | Description |
| --- | --- |
| id | Unique image ID. |
| orderId | Linked order. |
| uploadedById | User who uploaded the image. |
| type | CARGO, DELIVERY_CONFIRMATION, or DOCUMENT. |
| url | File URL/path. |
| mimeType | File MIME type. |
| sizeBytes | File size. |
| createdAt | Upload time. |

#### TrackingPoint

| Field | Description |
| --- | --- |
| id | Unique tracking point ID. |
| orderId | Linked order. |
| driverId | Driver who sent the point. |
| lat | Latitude. |
| lng | Longitude. |
| recordedAt | Time of location record. |

#### PaymentIntent

| Field | Description |
| --- | --- |
| id | Unique payment intent ID. |
| orderId | Linked order. |
| amountVnd | Payment amount. |
| status | UNPAID, QR_CREATED, PAID_DEMO, or FAILED. |
| provider | DEMO, VIETQR, or PAYOS. |
| qrContent | QR payload/content. |
| providerReference | External reference if available. |
| createdAt | Payment intent creation time. |

### 6.2 Data Validation Rules

- Email must be unique.
- Role must be one of CUSTOMER, DRIVER, ADMIN.
- Order must have pickup and dropoff.
- Order may have at most 3 stops.
- Latitude must be between -90 and 90.
- Longitude must be between -180 and 180.
- Vehicle type must be selected from supported MVP vehicle types.
- File type must be restricted to approved image/document MIME types.
- File size must not exceed configured maximum.
- Driver may only update orders assigned to them.
- Customer may only view their own orders.
- Admin may view all MVP operational records.

---

## 7. Business Rules

| ID | Rule |
| --- | --- |
| BR-001 | Only Customer can create shipment orders. |
| BR-002 | Only Driver can accept available orders. |
| BR-003 | A requested order can be accepted by only one driver. |
| BR-004 | Customer can view only their own orders. |
| BR-005 | Driver can view order detail for available orders and assigned orders. |
| BR-006 | Admin can view all users, drivers, and orders. |
| BR-007 | Orders can have a maximum of 3 intermediate stops. |
| BR-008 | Realtime tracking is MVP/demo level and not GPS-grade guarantee. |
| BR-009 | Automatic bank reconciliation is out of MVP scope. |
| BR-010 | AI ETA and production-grade route optimization are out of MVP scope. |
| BR-011 | Third-party service outages are not treated as application defects if fallback/demo behavior is documented. |
| BR-012 | Change requests that add new actor, major module, major API, or production SLA must be handled outside MVP scope. |

---

## 8. Non-Functional Requirements

### 8.1 Performance

| ID | Requirement | Acceptance Criteria |
| --- | --- | --- |
| NFR-PERF-001 | Main pages shall load acceptably in demo/staging conditions. | Core pages load within reasonable demo time on normal network. |
| NFR-PERF-002 | API shall support MVP demo usage. | Demo flow works with seeded users and normal manual testing. |
| NFR-PERF-003 | Tracking updates shall be near realtime for demo. | Location update appears within a few seconds under normal staging conditions. |
| NFR-PERF-004 | System shall not claim 500 concurrent user support. | Docs state load limitation clearly. |

### 8.2 Security

| ID | Requirement | Acceptance Criteria |
| --- | --- | --- |
| NFR-SEC-001 | Passwords shall not be stored in plaintext. | Stored password uses secure hashing. |
| NFR-SEC-002 | Secrets shall not be committed to source code. | `.env.example` uses placeholders only. |
| NFR-SEC-003 | API endpoints shall enforce role authorization. | Unauthorized role receives 401/403. |
| NFR-SEC-004 | File uploads shall validate file type and size. | Invalid files are rejected. |
| NFR-SEC-005 | CORS shall allow only configured web origin in staging. | API rejects unapproved origins when configured. |
| NFR-SEC-006 | Admin pages shall be protected. | Non-admin users cannot access admin data. |

### 8.3 Reliability and Availability

| ID | Requirement | Acceptance Criteria |
| --- | --- | --- |
| NFR-REL-001 | System shall run reliably for demo/staging. | Demo script can be completed without service restart. |
| NFR-REL-002 | System shall handle third-party missing credentials through demo providers where possible. | Local demo works without Vietmap/payOS/S3 credentials. |
| NFR-REL-003 | System shall persist orders and status changes. | Data remains after page refresh and API restart. |

### 8.4 Usability

| ID | Requirement | Acceptance Criteria |
| --- | --- | --- |
| NFR-USE-001 | UI shall be responsive for desktop and mobile. | Main flows usable on desktop and mobile viewport. |
| NFR-USE-002 | UI shall show clear validation errors. | Missing required fields show readable messages. |
| NFR-USE-003 | UI shall provide clear role-based navigation. | Customer, Driver, and Admin have distinct navigation. |
| NFR-USE-004 | Demo flow shall be easy to repeat. | Seed/demo data supports repeated presentation. |

### 8.5 Maintainability

| ID | Requirement | Acceptance Criteria |
| --- | --- | --- |
| NFR-MNT-001 | Code shall use modular backend structure. | Auth, orders, drivers, admin, tracking, payment, media, and integrations are separated. |
| NFR-MNT-002 | Shared types should be reused where practical. | Frontend/backend contracts stay consistent. |
| NFR-MNT-003 | Integrations shall use provider interfaces. | Demo and real providers can be swapped by config. |
| NFR-MNT-004 | Database schema changes shall use migrations. | Schema can be recreated from migration files. |

### 8.6 Portability

| ID | Requirement | Acceptance Criteria |
| --- | --- | --- |
| NFR-PORT-001 | Local environment shall run through documented commands. | Developer can run using setup guide. |
| NFR-PORT-002 | Deployment shall support VPS/staging environment. | API, web, and database can run in staging. |

---

## 9. Use Cases

### UC-001: Customer Logs In

**Primary Actor:** Customer  
**Preconditions:** Customer account exists.  
**Trigger:** Customer opens login page.  
**Main Flow:**

1. Customer enters login credentials.
2. System validates credentials.
3. System creates authenticated session.
4. System redirects customer to customer dashboard.

**Postconditions:** Customer can access customer pages.  
**Failure Cases:** Invalid credentials show error; blocked role access returns unauthorized.

### UC-002: Customer Creates Shipment Order

**Primary Actor:** Customer  
**Preconditions:** Customer is logged in.  
**Trigger:** Customer selects create order.  
**Main Flow:**

1. Customer enters pickup address.
2. System searches/geocodes pickup address.
3. Customer enters dropoff address.
4. System searches/geocodes dropoff address.
5. Customer optionally adds up to 3 stops.
6. Customer selects vehicle type.
7. Customer adds cargo notes and optional image.
8. System calculates route, distance, ETA, and price estimate.
9. Customer submits order.
10. System stores order with REQUESTED status.

**Postconditions:** Order appears in customer order list and driver available order list.  
**Failure Cases:** Missing address, invalid coordinates, more than 3 stops, or missing vehicle type prevents submission.

### UC-003: Driver Accepts Order

**Primary Actor:** Driver  
**Preconditions:** Driver is logged in; at least one REQUESTED order exists.  
**Trigger:** Driver opens available orders.  
**Main Flow:**

1. Driver views available orders.
2. Driver opens order detail.
3. Driver accepts order.
4. System assigns driver to order.
5. System changes order status to ACCEPTED.
6. System marks driver as BUSY if availability is enabled.

**Postconditions:** Order is no longer available to other drivers.  
**Failure Cases:** Already accepted order cannot be accepted again.

### UC-004: Driver Updates Delivery Status

**Primary Actor:** Driver  
**Preconditions:** Driver is assigned to order.  
**Trigger:** Driver selects status update.  
**Main Flow:**

1. Driver opens assigned order.
2. Driver changes status to PICKING_UP.
3. System saves status and notifies customer/admin.
4. Driver changes status to IN_TRANSIT.
5. System saves status and notifies customer/admin.
6. Driver changes status to DELIVERED.
7. System saves final status.

**Postconditions:** Customer and Admin can see updated order status.  
**Failure Cases:** Invalid status transition is rejected.

### UC-005: Driver Sends Tracking Update

**Primary Actor:** Driver  
**Preconditions:** Driver is assigned to order.  
**Trigger:** Driver enables browser location or simulated tracking.  
**Main Flow:**

1. Driver sends latitude and longitude.
2. Backend validates driver assignment.
3. Backend saves tracking point.
4. Backend broadcasts tracking update to subscribed clients.
5. Customer/Admin screens display latest point.

**Postconditions:** Latest driver position is visible for the order.  
**Failure Cases:** Unassigned driver cannot send tracking for the order.

### UC-006: Customer Creates QR Payment

**Primary Actor:** Customer  
**Preconditions:** Customer owns order.  
**Trigger:** Customer selects create payment.  
**Main Flow:**

1. Customer opens order detail.
2. Customer clicks create QR payment.
3. Backend creates payment intent.
4. System returns QR content and payment status.
5. UI displays QR/payment information.

**Postconditions:** Payment intent is attached to order.  
**Failure Cases:** Payment provider error shows readable message or uses demo provider if configured.

### UC-007: Admin Reviews Order

**Primary Actor:** Admin  
**Preconditions:** Admin is logged in.  
**Trigger:** Admin opens order dashboard.  
**Main Flow:**

1. Admin views order list.
2. Admin filters by status if needed.
3. Admin opens order detail.
4. System displays customer, driver, addresses, stops, route summary, images, tracking, and payment status.

**Postconditions:** Admin can monitor operational state.  
**Failure Cases:** Non-admin access is rejected.

---

## 10. Acceptance Criteria

### 10.1 MVP Acceptance

The MVP is accepted when all critical conditions pass:

- Customer, Driver, and Admin can log in.
- Customer can create shipment order.
- Pickup/dropoff coordinates are saved.
- Order supports up to 3 stops.
- Route distance and ETA are displayed.
- Driver can view available orders.
- Driver can accept order.
- Driver can update order status.
- Customer can see order status.
- Tracking marker/location updates at least once in demo.
- QR payment request can be created.
- Admin can view users, drivers, orders, and order detail.
- Image upload works for at least cargo image.
- Staging/demo deployment runs the full demo flow.
- No P0 defect blocks the demo script.

### 10.2 P0 Defect Definition

A P0 defect is any defect that blocks:

- Login for required roles.
- Customer order creation.
- Driver order acceptance.
- Driver status update.
- Admin order view.
- Staging startup.
- Data persistence for core flow.

### 10.3 P1 Defect Definition

A P1 defect is any defect that affects an important MVP feature but has a workaround:

- Tracking works only through simulator, not browser GPS.
- Cloud storage unavailable but local storage works.
- Real payment provider unavailable but demo QR works.
- Non-critical admin filter issue.

### 10.4 P2 Defect Definition

A P2 defect is a minor issue:

- Text/copy issue.
- Minor alignment issue.
- Non-critical empty state.
- Minor mobile layout issue that does not block core flow.

---

## 11. Out-of-Scope Requirements

The following are not required for MVP acceptance:

- Native Android/iOS apps.
- Google Play/App Store release.
- AI ETA using XGBoost as a production model.
- Production-grade OR-Tools/VRP optimization.
- Fleet Owner Dashboard.
- Advanced truck routing with road restrictions.
- Automatic bank reconciliation.
- MoMo/VNPay advanced payment integrations.
- 500 concurrent user guarantee.
- 24/7 SLA.
- Deep production monitoring.
- Full Figma/prototype handoff.
- Multi-tenant enterprise administration.

---

## 12. Change Control

### 12.1 Valid Small Change

A small change may be accepted if it:

- Does not add a new actor.
- Does not add a large new screen.
- Does not require a new major database table.
- Does not require a new major API module.
- Does not change the core order lifecycle.
- Does not affect the timeline materially.

### 12.2 Major Change Request

A request is a major change if it:

- Adds a new user role.
- Adds a new dashboard module.
- Changes booking, driver acceptance, or payment flow.
- Adds a new third-party integration.
- Adds production SLA, monitoring, or high-concurrency requirements.
- Adds AI/OR-Tools production behavior.
- Requires automatic bank reconciliation.

Major changes require separate approval of scope, cost, and timeline.

---

## 13. Test Strategy

### 13.1 Unit Testing

Unit tests should cover:

- Status transition rules.
- Order validation.
- Role authorization helpers.
- Price/ETA rule calculation.
- Provider fallback selection.
- File validation.

### 13.2 Integration Testing

Integration tests should cover:

- Login flow.
- Customer creates order.
- Driver accepts order.
- Driver updates status.
- Admin reads order detail.
- Payment intent creation.
- Upload metadata creation.

### 13.3 E2E / Manual UAT

Manual UAT shall follow the demo script:

1. Customer login.
2. Customer creates shipment.
3. Map/route/ETA appears.
4. Driver login.
5. Driver accepts order.
6. Driver updates status.
7. Driver sends tracking point.
8. Customer sees tracking/status.
9. Payment QR is created.
10. Admin views order detail.
11. Driver marks delivered.

---

## 14. Requirement Traceability Matrix

| Business Goal | Requirement IDs |
| --- | --- |
| Customer can create shipment | AUTH-001, AUTH-002, ORD-001 to ORD-011, MAP-001 to MAP-006 |
| Driver can fulfill shipment | AUTH-001, AUTH-002, DRV-001 to DRV-007, STA-001 to STA-007 |
| Admin can monitor system | AUTH-001, AUTH-004, ADM-001 to ADM-007 |
| System supports demo realtime tracking | TRK-001 to TRK-007 |
| System supports media proof | MED-001 to MED-006 |
| System supports QR payment demo | PAY-001 to PAY-006 |
| System is deployable and handover-ready | DOC-001 to DOC-006, NFR-PORT-001, NFR-PORT-002 |
| System stays within MVP constraints | BR-001 to BR-012, out-of-scope list |

---

## 15. Open Questions

These questions should be resolved before implementation freeze:

1. Which exact vehicle types must appear in MVP?
2. Is email/password login acceptable for demo if Firebase OTP is delayed?
3. What is the maximum upload file size?
4. Will staging use real Vietmap credentials or demo provider first?
5. Will payment use real payOS/VietQR credentials or demo QR first?
6. What formula should be used for MVP price estimate?
7. Who will provide demo addresses and sample shipment data?
8. Should Admin be allowed to manually mark payment as paid for demo?

---

## 16. Approval

| Role | Name | Approval |
| --- | --- | --- |
| Business Representative | Hoàng Huỳnh Giang | Pending |
| Development Representative | Trần Văn Linh | Pending |
| Reviewer / Advisor | Chưa chỉ định | Pending |
