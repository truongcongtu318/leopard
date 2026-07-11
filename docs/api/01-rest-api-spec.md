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
| GET | `/orders/:id` | Owner/assigned/Admin | Chi tiết order |
| POST | `/orders/:id/cancel` | Owner/Admin | Hủy theo rule |
| GET | `/orders/:id/tracking` | Owner/assigned/Admin | Tracking history |

Create order input gồm `pickup`, `stops` tối đa 3, `dropoff`, `vehicleType`, `cargoNote`, `cargoWeightKg` tùy chọn và `estimateToken`. Backend không tin giá/ETA do client gửi.

Estimate response gồm `estimateToken`, `polyline`, `distanceM`, `durationS`, `estimatedArrivalAt`, `estimatedPriceVnd`, `source`, `isEstimate`, `calculatedAt`, hết hạn sau 10 phút.

## Driver

| Method | Path | Role | Mô tả |
| --- | --- | --- | --- |
| PATCH | `/driver/availability` | Driver | Đổi availability |
| GET | `/driver/orders/available` | Driver | Danh sách `REQUESTED` |
| GET | `/driver/orders/active` | Driver | Order active hiện tại |
| POST | `/driver/orders/:id/accept` | Driver | Nhận order |
| POST | `/driver/orders/:id/status` | Assigned Driver | Transition status |

Status input: `{"status":"IN_TRANSIT","clientRequestId":"uuid"}`. Request lặp với cùng ID trả kết quả cũ.

## Media và payment

| Method | Path | Role | Mô tả |
| --- | --- | --- | --- |
| POST | `/orders/:id/media/cargo` | Owner | Upload cargo image |
| POST | `/orders/:id/media/delivery-proof` | Assigned Driver | Upload proof |
| GET | `/media/:id/url` | Authorized | Signed read URL |
| POST | `/orders/:id/payments` | Owner/Admin | Tạo QR intent |
| GET | `/orders/:id/payments` | Owner/Admin | Payment history |
| POST | `/admin/payments/:id/confirm` | Admin | Manual confirmation |

Manual confirmation input gồm `note` từ 5-500 ký tự và `clientRequestId`.

## Admin và operations

| Method | Path | Role | Mô tả |
| --- | --- | --- | --- |
| GET | `/admin/dashboard` | Admin | Chỉ số vận hành |
| GET | `/admin/users` | Admin | Users có filter |
| PATCH | `/admin/users/:id/status` | Admin | Enable/disable |
| GET | `/admin/drivers` | Admin | Drivers có filter |
| GET | `/admin/orders` | Admin | Orders có filter |
| GET | `/health/live` | Public | Liveness |
| GET | `/health/ready` | Internal/public pilot | Readiness |

Admin order filters: `status`, `customerId`, `driverId`, `from`, `to`, `q`, pagination và sort allow-list.
