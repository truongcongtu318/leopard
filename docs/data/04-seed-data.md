# Seed và demo data

## Tài khoản cố định

| Role | Phone demo | Mục đích |
| --- | --- | --- |
| Customer | `0900000001` | Tạo và theo dõi đơn |
| Driver | `0900000002` | Nhận và giao đơn |
| Fleet Owner | `0900000003` | Theo dõi fleet pilot |
| Admin | `0900000004` | Vận hành |

Demo login chỉ bật khi `AUTH_PROVIDER=demo` và không được bật ở production-like environment ngoài staging pilot được phê duyệt.

## Dataset

Seed tạo tối thiểu:

- Một Driver `AVAILABLE` và một Driver `OFFLINE`.
- Một fleet demo có Fleet Owner và hai Driver membership.
- Một order cho mỗi status.
- Route cố định tại TP.HCM với 0, 1 và 3 stops.
- Tracking history cho một order `IN_TRANSIT`.
- Payment intent ở `QR_CREATED` và `PAID_MANUAL`.
- Cargo image và delivery proof metadata dùng fixture không nhạy cảm.

## Tính lặp lại

Seed dùng stable keys/IDs hoặc upsert để chạy lại không nhân bản dữ liệu. Demo ETA và price phải cho cùng kết quả với cùng route/config.
