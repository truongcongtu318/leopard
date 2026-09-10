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
- `Notification`: thông báo in-app đã persist cho một `User`, gồm `type`, `title`, `body`, `data` (JSONB tùy chọn) và trạng thái đọc.
- `DeviceToken`: push token (FCM/APNs/web-push) của một `User` theo platform, dùng để gửi push khi có thông báo mới.
- `Invoice`: hóa đơn giá trị gia tăng **tự phát hành** (self-generated, không phải e-invoice có mã cơ quan thuế) cho một `Order`/`PaymentIntent`, snapshot tên/email/số tiền tại thời điểm phát hành, storage key PDF và trạng thái gửi email.
- `InvoiceSequence`: bộ đếm số hóa đơn theo năm (`year` là khóa chính, `lastValue` tăng nguyên tử qua một câu UPSERT duy nhất) — không bao giờ dùng `max(invoiceNumber)`.

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
NotificationType: ORDER | PAYMENT | PROMO | SYSTEM
PaymentStatus: UNPAID | QR_CREATED | PAID_MANUAL | FAILED
ProviderSource: VIETMAP | DEMO | PAYOS | VIETQR | LOCAL | S3
InvoiceStatus: ISSUED | VOIDED
```

## Kiểu dữ liệu

- UUID cho primary key.
- `timestamptz` cho mọi timestamp.
- Integer cho VND, meter và second.
- PostGIS `geography(Point,4326)` cho stop/tracking; đồng thời API dùng latitude/longitude số thực.
- JSONB chỉ cho provider snapshot/audit metadata có schema ở application layer (bao gồm `Notification.data`, ví dụ `{"orderId": "...", "status": "..."}`).

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
- `Notification(userId, isRead, createdAt desc)` và `Notification(userId, createdAt desc)`
  cho danh sách/đếm chưa đọc theo user, mới nhất trước.
- `DeviceToken(userId, lastUsedAt desc)`; unique `DeviceToken(token)` — token là khóa
  toàn hệ thống nên đăng ký lại cùng token dưới user khác sẽ upsert-reassign, không
  tạo dòng trùng.
- Unique `Invoice(orderId)`, `Invoice(paymentIntentId)`, `Invoice(invoiceNumber)` và
  `Invoice(pdfStorageKey)` — mỗi order/payment intent chỉ có tối đa một hóa đơn, số
  hóa đơn và storage key không bao giờ trùng; index `Invoice(orderId)` cho lookup
  theo order.

## Notifications

`Notification` và `DeviceToken` phục vụ hệ thống thông báo in-app (xem
`docs/api/01-rest-api-spec.md#notifications`). `Notification` không có cascade
xoá đặc biệt ngoài `onDelete: Cascade` theo `User` (xoá user thì xoá luôn thông
báo của họ). `Notification.data` không có schema cố định giữa các `type` —
application layer tự diễn giải theo `type`, ví dụ trigger từ order lifecycle
ghi `{"orderId", "status"}`.

`DeviceToken.token` unique toàn hệ thống (không unique theo user) vì một push
token vật lý luôn thuộc về đúng một phiên đăng nhập hiện tại trên thiết bị đó —
`upsert` theo `token` khi đăng ký lại dưới user khác sẽ chuyển quyền sở hữu
token sang user mới thay vì tạo bản ghi trùng.

## Invoices (hóa đơn tự phát hành)

`Invoice` gồm `id`, `orderId`/`paymentIntentId` (cả hai đều unique — một order chỉ
có một hóa đơn, gắn với đúng payment intent đã `PAID_MANUAL` đã sinh ra nó),
`invoiceNumber` (unique, định dạng `LP/YYYY/NNNNNN`, 6 chữ số zero-pad, cấp phát
nguyên tử qua `InvoiceSequence`), snapshot `customerName`/`customerEmail`/
`customerTaxCode`/`customerAddress` tại thời điểm phát hành (không tham chiếu
ngược lại `User` — đổi email sau này không làm thay đổi hóa đơn cũ),
`amountVnd`/`vatRateVnd`/`totalVnd` (Integer VND, không có số thực), `pdfStorageKey`
(unique), `status` (`ISSUED`/`VOIDED` — `VOIDED` hiện chỉ là cờ lưu trữ, chưa có
luồng nghiệp vụ nào set nó), `emailSentAt` (nullable — `null` nghĩa là chưa gửi
được hoặc khách chưa có email) và `issuedAt`.

**Nguồn tiền duy nhất là `PaymentIntent.amountVnd`** (Int không null, snapshot từ
`order.priceVnd ?? 0` lúc tạo payment intent) — không bao giờ đọc lại
`Order.priceVnd` (nullable, có thể đã bị sửa) để tính hóa đơn.

`InvoiceSequence` có khóa chính là `year`; số hóa đơn kế tiếp được cấp qua một
câu `UPSERT ... lastValue = lastValue + 1` duy nhất trong transaction — atomic ở
mức câu lệnh SQL bất kể isolation level, nên không có race giữa hai lần xác nhận
thanh toán đồng thời. Không bao giờ suy ra số hóa đơn từ `max(invoiceNumber)`.

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
