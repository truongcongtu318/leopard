# Thiết kế database

## Entity chính

- `User`: identity, phone, role, status và timestamps.
- `Fleet`: hồ sơ đội xe ở mức pilot.
- `FleetMember`: quan hệ Fleet Owner/Driver với fleet và trạng thái membership.
- `DriverProfile`: availability, vehicle type, last known location tùy chọn, và `contractVersion`/`contractSignedAt` (nullable) ghi lại version hợp đồng và thời điểm ký gần nhất.
- `DriverContract`: một bản ghi PDF hợp đồng đã ký cho mỗi cặp `(driverProfileId, version)` — storage key của PDF và (nếu có) ảnh chữ ký, tên người ký, thời điểm ký.
- `Order`: owner, assigned Driver, route snapshot, price, ETA và lifecycle.
- `OrderStop`: pickup/stop/dropoff theo thứ tự.
- `OrderStatusHistory`: transition append-only.
- `TrackingPoint`: vị trí Driver theo order, gồm độ chính xác `accuracyM` tùy chọn.
- `MediaObject`: metadata cargo/delivery image, SHA-256 bắt buộc và request ID tùy chọn để idempotency.
- `PaymentIntent`: QR, amount, payment provider tùy chọn ở trạng thái `UNPAID`, provider reference và các trường xác nhận thủ công.
- `RefreshSession`: refresh token hash và revocation.
- `AuditLog`: privileged action append-only với request/idempotency correlation IDs tùy chọn.

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
- Partial unique `MediaObject(orderId, uploaderId, type, clientRequestId)` khi
  `clientRequestId` khác `NULL`; PostgreSQL cho phép nhiều upload legacy không có key.
- `PaymentIntent(orderId, createdAt desc)` và partial unique cho intent active
  (`UNPAID`, `QR_CREATED`). Index active hiện có được giữ nguyên qua Wave 3.
- Partial unique `PaymentIntent(orderId, clientRequestId)` khi request ID tồn tại.
- Partial unique `PaymentIntent(provider, providerReference)` khi provider reference
  tồn tại; reference chỉ unique trong phạm vi payment provider.
- Partial unique `PaymentIntent(confirmationRequestId)` khi confirmation request ID
  tồn tại.
- Unique `DriverContract(driverProfileId, version)` — một bản ghi hợp đồng cho mỗi
  version trên mỗi hồ sơ tài xế; index `DriverContract(driverProfileId)`.
  `pdfStorageKey` và `signatureStorageKey` (khi có) đều unique riêng để tránh
  trùng object storage key.

## Driver contract (hợp đồng tài xế)

`DriverContract` gồm `id`, `driverProfileId` (FK `DriverProfile`, `onDelete: Cascade`),
`version` (`VarChar(32)`), `pdfStorageKey` (unique), `signatureStorageKey` (nullable,
unique — `null` khi chữ ký là chữ ký gõ chứ không phải ảnh), `signedByName`
(`VarChar(120)`), `signedAt`, `ipAddress` (nullable `VarChar(64)`) và `createdAt`.
Nộp lại hồ sơ ở cùng version sẽ upsert theo khóa unique
`(driverProfileId, version)` — không tạo dòng mới, PDF/chữ ký cũ bị xóa khỏi
storage sau khi transaction commit thành công. Cột `ipAddress` đã có trong
schema nhưng luồng `POST /driver/apply` hiện tại chưa ghi giá trị (luôn `null`).

## Payment provider integrity

`ProviderSource` vẫn là enum dùng chung để giữ tương thích database, nhưng
`PaymentIntent.provider` chỉ chấp nhận `DEMO`, `PAYOS`, `VIETQR` hoặc `NULL`.
Provider bắt buộc từ `QR_CREATED`, `PAID_MANUAL` và `FAILED`; chỉ intent
`UNPAID` có thể chưa chọn provider. `confirmedById` tham chiếu `User` với
`ON DELETE RESTRICT` để giữ lịch sử xác nhận.

Migration Wave 3 normalize các placeholder provider của intent `UNPAID` legacy
(`VIETMAP`, `DEMO`, `LOCAL`, `S3`) thành `NULL`. Migration fail-fast nếu phát hiện
intent khác `UNPAID` dùng map/storage provider, vì không thể suy diễn an toàn
payment provider đã thực sự được gọi. Media legacy được gắn checksum sentinel 64
ký tự `0`; runtime Wave 3 phải lưu SHA-256 lowercase thực tế cho mọi upload mới.
