# REST API specification

Base path: `/api/v1`. Content type mặc định: `application/json`. Upload dùng `multipart/form-data`.

## Envelope

Pagination response:

```json
{"items":[],"page":1,"pageSize":20,"total":0,"totalPages":0}
```

Query pagination mặc định `page=1`, `pageSize=20`, tối đa 100. Sort chỉ nhận field allow-list.

## Auth và users

| Method | Path | Role | Mô tả |
| --- | --- | --- | --- |
| POST | `/auth/login/demo` | Public/local | Demo login |
| POST | `/auth/firebase` | Public | Đổi Firebase ID token lấy session |
| POST | `/auth/refresh` | Session | Rotate refresh token |
| POST | `/auth/logout` | Authenticated | Thu hồi session |
| GET | `/me` | Authenticated | Profile hiện tại |

## Orders

| Method | Path | Role | Mô tả |
| --- | --- | --- | --- |
| POST | `/orders/estimate` | Customer | Tính route, price và ETA |
| POST | `/orders` | Customer | Tạo order |
| GET | `/orders` | Customer | Danh sách order sở hữu |
| GET | `/orders/:id` | Owner/assigned/Fleet Owner/Admin | Chi tiết order |
| POST | `/orders/:id/cancel` | Owner/Admin | Hủy theo rule |
| GET | `/orders/:id/tracking` | Owner/assigned/Fleet Owner/Admin | Tracking points phân trang |

Create order input gồm `pickup`, `stops` tối đa 3, `dropoff`, `vehicleType` (`MOTORBIKE`, `VAN` hoặc `TRUCK`), `cargoNote`, `cargoWeightKg` tùy chọn trong khoảng `0-10000` kg và `estimateToken`. Address, estimate token và `clientRequestId` nếu có không được là chuỗi rỗng; latitude nằm trong `[-90, 90]`, longitude trong `[-180, 180]`. Backend không tin giá/ETA do client gửi. Input validation trả `422 VALIDATION_ERROR` kèm field details.

Estimate response gồm `estimateToken`, `polyline`, `distanceM`, `durationS`, `estimatedArrivalAt`, `estimatedPriceVnd`, `source`, `isEstimate`, `calculatedAt`, hết hạn sau 10 phút.

Tracking query nhận `from`, `to` dưới dạng ISO 8601 UTC và `page`, `pageSize` (tối đa 100). Response dùng page envelope chuẩn với `items` là `TrackingPoint`: `id`, `orderId`, `driverId`, `clientPointId`, `latitude`, `longitude`, `accuracyM` tùy chọn, `capturedAt`, `createdAt`. Thứ tự ổn định là `capturedAt DESC, id DESC`; endpoint này không trả status-history events.

## Map lookup

| Method | Path | Role | Mô tả |
| --- | --- | --- | --- |
| GET | `/maps/search?q=` | Authenticated | Tìm địa điểm qua MapProvider |
| GET | `/maps/geocode/:placeId` | Authenticated | Đổi place ID thành label và tọa độ |

Hai endpoint trả `source`; provider error dùng error envelope chuẩn. Client không gọi Vietmap trực tiếp và không nhận provider credential.

## Driver

| Method | Path | Role | Mô tả |
| --- | --- | --- | --- |
| PATCH | `/driver/availability` | Driver | Đổi availability |
| GET | `/driver/orders/available` | Driver | Danh sách `REQUESTED` |
| GET | `/driver/orders/active` | Driver | Order active hiện tại |
| POST | `/driver/orders/:id/accept` | Driver | Nhận order |
| POST | `/driver/orders/:id/status` | Assigned Driver | Transition status |

Status input: `{"status":"IN_TRANSIT","clientRequestId":"uuid"}`. Request lặp với cùng ID trả kết quả cũ.

## Đăng ký tài xế (driver onboarding)

| Method | Path | Role | Mô tả |
| --- | --- | --- | --- |
| POST | `/driver/apply` | Customer hoặc Driver `REJECTED` | Nộp hồ sơ đăng ký + ký hợp đồng, chuyển tài khoản sang `DRIVER`/`PENDING_APPROVAL` |
| GET | `/driver/application` | Customer/Driver đang đăng ký | Trạng thái hồ sơ hiện tại |
| POST | `/driver/documents` | Customer/Driver đang đăng ký | Upload giấy tờ KYC (multipart) |
| GET | `/driver/documents` | Customer/Driver đang đăng ký | Danh sách giấy tờ đã upload |
| GET | `/driver/contract` | Customer/Driver đang đăng ký | Xem trước hợp đồng: version hiện hành + link PDF |
| GET | `/driver/contract/pdf` | Customer/Driver đang đăng ký | PDF hợp đồng bản mẫu (chưa ký, party-B là placeholder) |

Cả 6 route dùng chung guard `AllowUserStatuses('ACTIVE', 'PENDING_APPROVAL', 'REJECTED')` — tài khoản `DISABLED`/`SUSPENDED` bị chặn ở tầng `AccessTokenGuard` (401). Role thực tế được phép nộp hồ sơ (chỉ `CUSTOMER` hoặc `DRIVER` đã từng bị từ chối) là domain rule trong `DriverApplicationService`, không phải route guard — role khác (vd `FLEET_OWNER`, `ADMIN`) nhận `403 DRIVER_APPLICATION_FORBIDDEN`; `DRIVER`/`ACTIVE` nhận `409 DRIVER_ALREADY_ACTIVE`; `DRIVER`/`PENDING_APPROVAL` nhận `409 DRIVER_APPLICATION_PENDING`.

`POST /driver/apply` body: `name`, `vehicleType` (`MOTORBIKE`, `VAN` hoặc `TRUCK`), `licensePlate`, `licenseNumber`, `contractAccepted` (boolean; phải là `true`) và `signature` tùy chọn (chữ ký gõ tên, tối đa 120 ký tự, hoặc ảnh chữ ký dạng `data:` base64 tối đa 10 MB, JPEG/PNG/WebP xác định qua magic bytes — MIME khai báo trong header không được tin; bỏ trống `signature` thì `name` được dùng làm chữ ký gõ). Lỗi hợp đồng trả `422`:

- `CONTRACT_NOT_ACCEPTED` khi `contractAccepted` không phải `true` (kiểm tra trước mọi ghi dữ liệu).
- `SIGNATURE_INVALID` khi `signature` sai định dạng, rỗng, quá 120 ký tự (chữ ký gõ), quá 10 MB, không decode được base64, hoặc magic bytes không khớp JPEG/PNG/WebP.

`GET /driver/application` trả thêm `contractVersion` (string hoặc `null`) và `contractSignedAt` (ISO 8601 hoặc `null`) — set khi `apply` thành công, giữ nguyên qua approve/reject, và cập nhật lại khi driver nộp lại hồ sơ sau khi bị từ chối (ký lại cùng version, bằng chứng cũ bị xoá sau khi commit thành công).

`GET /driver/contract` không tạo DB row — trả `{"version":"v1","pdfUrl":"/driver/contract/pdf?version=v1"}`. `GET /driver/contract/pdf` stream PDF bản mẫu generic (không cá nhân hoá theo dữ liệu form đang nhập, vì applicant có thể chưa có `DriverProfile`); chỉ `POST /driver/apply` mới tạo và lưu PDF đã ký, cá nhân hoá theo dữ liệu đã nộp. Version không hợp lệ trả `404 RESOURCE_NOT_FOUND`.

## Fleet Owner

| Method | Path | Role | Mô tả |
| --- | --- | --- | --- |
| GET | `/fleet/profile` | Fleet Owner | Fleet profile hiện tại |
| GET | `/fleet/drivers` | Fleet Owner | Drivers thuộc fleet có filter |
| GET | `/fleet/orders` | Fleet Owner | Orders assigned cho Driver thuộc fleet |
| GET | `/fleet/orders/:id` | Fleet Owner | Order detail nếu thuộc fleet |
| GET | `/fleet/orders/:id/tracking` | Fleet Owner | Tracking points nếu thuộc fleet |

Fleet filters: `driverId`, `status`, `from`, `to`, `q`, pagination và sort allow-list. Fleet tracking dùng đúng query `from`, `to`, `page`, `pageSize`, projection `TrackingPoint` và page envelope như customer/driver endpoint. Fleet Owner không có endpoint xác nhận payment, cập nhật lifecycle hoặc disable user.

## Media và payment

| Method | Path | Role | Mô tả |
| --- | --- | --- | --- |
| POST | `/orders/:id/media/cargo` | Owner | Upload cargo image |
| POST | `/orders/:id/media/delivery-proof` | Assigned Driver | Upload proof |
| GET | `/media/:id/url` | Authorized | Signed read URL |
| POST | `/orders/:id/payments` | Owner/Admin | Tạo QR intent |
| GET | `/orders/:id/payments` | Owner/Fleet Owner/Admin | Payment history |
| POST | `/admin/payments/:id/confirm` | Admin | Manual confirmation |

Manual confirmation input gồm `note` từ 5-500 ký tự và `clientRequestId`.

Hai upload endpoint nhận multipart gồm `file` và `clientRequestId` UUID bắt buộc. `clientRequestId` là idempotency key; file chỉ nhận JPEG, PNG hoặc WebP và tối đa 10 MB.

Tạo QR intent nhận duy nhất `{"clientRequestId":"uuid"}`; amount luôn lấy từ order đã persist. QR response gồm `amountVnd`, payment `provider` (`DEMO`, `PAYOS` hoặc `VIETQR`), `providerReference`, `expiresAt` và `qrPayload`. API không expose raw provider response hay `providerSnapshot`.

Trừ năm endpoint public `/auth/login/demo`, `/auth/firebase`, `/auth/refresh`, `/health/live`, `/health/ready`, mọi endpoint kế thừa `bearerAuth` từ OpenAPI global security. `/auth/refresh` xác thực bằng refresh token trong request body, không yêu cầu access token còn hiệu lực.

## Admin và operations

| Method | Path | Role | Mô tả |
| --- | --- | --- | --- |
| GET | `/admin/dashboard` | Admin | Chỉ số vận hành |
| GET | `/admin/users` | Admin | Users có filter |
| PATCH | `/admin/users/:id/status` | Admin | Enable/disable |
| GET | `/admin/fleets` | Admin | Fleets và membership có filter |
| GET | `/admin/drivers` | Admin | Drivers có filter |
| GET | `/admin/drivers/:id/contract` | Admin | Bằng chứng hợp đồng đã ký của tài xế |
| GET | `/admin/orders` | Admin | Orders có filter |
| GET | `/health/live` | Public | Liveness |
| GET | `/health/ready` | Internal/public pilot | Readiness |

Admin order filters: `status`, `customerId`, `driverId`, `from`, `to`, `q`, pagination và sort allow-list.

`GET /admin/drivers/:id/contract` (`:id` là `User.id` của tài xế) trả `version`, `signedByName`, `signedAt`, `pdfUrl` và `signatureUrl` (`null` nếu chữ ký là chữ ký gõ, không phải ảnh) — không bao giờ trả storage key thô. `pdfUrl`/`signatureUrl` là read URL từ `StorageProvider` hiện tại: presigned và hết hạn sau 3600 giây trên S3; là đường dẫn tĩnh, không hết hạn trên local dev storage (`STORAGE_PROVIDER=local`). `404 RESOURCE_NOT_FOUND` khi tài xế chưa có hồ sơ hoặc chưa ký hợp đồng ở version hiện tại của `DriverProfile.contractVersion`. Authorization dùng chung guard lớp `AdminController` (`RequireRoles('ADMIN')`), không có scoping theo fleet.
