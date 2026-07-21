# Thiết kế database

## Entity chính

- `User`: identity, phone, role, status và timestamps.
- `Fleet`: hồ sơ đội xe ở mức pilot.
- `FleetMember`: quan hệ Fleet Owner/Driver với fleet và trạng thái membership.
- `DriverProfile`: availability, vehicle type và last known location tùy chọn.
- `Order`: owner, assigned Driver, route snapshot, price, ETA và lifecycle.
- `OrderStop`: pickup/stop/dropoff theo thứ tự.
- `OrderStatusHistory`: transition append-only.
- `TrackingPoint`: vị trí Driver theo order.
- `MediaObject`: metadata cargo/delivery image.
- `PaymentIntent`: QR, amount, provider và payment status.
- `RefreshSession`: refresh token hash và revocation.
- `AuditLog`: privileged action append-only.

## Enum chuẩn

```text
Role: CUSTOMER | DRIVER | FLEET_OWNER | ADMIN
UserStatus: ACTIVE | DISABLED
FleetMemberRole: OWNER | DRIVER
FleetMemberStatus: INVITED | ACTIVE | REMOVED
DriverAvailability: OFFLINE | AVAILABLE | BUSY
VehicleType: MOTORBIKE | VAN | TRUCK
OrderStatus: REQUESTED | ACCEPTED | PICKING_UP | IN_TRANSIT | DELIVERED | CANCELLED
StopType: PICKUP | STOP | DROPOFF
MediaType: CARGO | DELIVERY_PROOF
PaymentStatus: UNPAID | QR_CREATED | PAID_MANUAL | FAILED
ProviderSource: VIETMAP | DEMO | PAYOS | VIETQR | LOCAL | S3
```

## Kiểu dữ liệu

- UUID cho primary key.
- `timestamptz` cho mọi timestamp.
- Integer cho VND, meter và second.
- PostGIS `geography(Point,4326)` cho stop/tracking; đồng thời API dùng latitude/longitude số thực.
- JSONB chỉ cho provider snapshot/audit metadata có schema ở application layer.

## Index quan trọng

- `Order(customerId, createdAt desc)`, `Order(status, createdAt desc)`.
- Partial index cho order active theo `driverId`.
- `FleetMember(fleetId, role, status)` và unique active membership cho mỗi Driver trong một fleet pilot.
- `TrackingPoint(orderId, capturedAt desc)`.
- Unique `TrackingPoint(orderId, clientPointId)`.
- `PaymentIntent(orderId, createdAt desc)` và partial unique cho intent active.
