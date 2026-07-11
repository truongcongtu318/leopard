# Thiết kế module

| Module | Trách nhiệm | Phụ thuộc chính |
| --- | --- | --- |
| `AuthModule` | Login, token, refresh session, logout | Users, OTP |
| `UsersModule` | Profile, role, account status | Audit |
| `OrdersModule` | Create, query, lifecycle, pricing snapshot | Maps, Media, Audit |
| `DriversModule` | Availability, assignment, active order | Orders |
| `TrackingModule` | Validate, persist, query và broadcast points | Orders, Socket |
| `MapsModule` | Search, geocode, route và ETA | MapProvider |
| `MediaModule` | Upload policy và metadata | StorageProvider |
| `PaymentsModule` | Intent, QR và manual confirmation | PaymentProvider, Audit |
| `AdminModule` | Operational queries và privileged commands | Các application services |
| `HealthModule` | Liveness và readiness | Database, config |
| `AuditModule` | Append-only audit records | Database |

## Quy tắc module

- Controller chỉ parse input, gọi application service và map response.
- Service không truy cập provider SDK trực tiếp; dùng injection token của interface.
- Prisma access nằm trong repository/service thuộc module sở hữu entity.
- Cross-module command gọi public application service, không sửa bảng của module khác trực tiếp.
- Shared package chỉ chứa enum, schema và utility không phụ thuộc framework.

## Transaction boundary

- Accept order: kiểm tra Driver và update assignment trong một transaction có điều kiện.
- Status transition: update order và insert status history trong một transaction.
- Manual payment: update payment/order payment state và insert audit trong một transaction.
