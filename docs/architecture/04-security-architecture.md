# Kiến trúc bảo mật

## Authentication

- Access token JWT hết hạn sau 15 phút.
- Refresh token ngẫu nhiên, lưu hash trong `RefreshSession`, hết hạn tối đa 7 ngày và rotate mỗi lần dùng.
- Cookie refresh dùng `HttpOnly`, `Secure` ở staging và `SameSite=Lax`.
- Firebase ID token chỉ được xác minh ở backend.

## Authorization

Mỗi endpoint khai báo role được phép và service kiểm tra ownership/assignment. Admin không tự động được bỏ qua mọi business rule; privileged command phải được định nghĩa rõ và audit.

| Resource | Customer | Driver | Admin |
| --- | --- | --- | --- |
| Order detail | Owner | Assigned hoặc public `REQUESTED` summary | Read |
| Tracking | Owner read | Assigned write/read | Read |
| Cargo media | Owner write/read | Assigned read | Read |
| Delivery proof | Owner read | Assigned write/read | Read |
| Payment | Owner create/read | Không | Create/read/confirm |

## Input và dữ liệu nhạy cảm

- DTO validation dùng allow-list và loại bỏ field không khai báo.
- Rate limit áp dụng cho login, refresh, map search, upload và tracking.
- Signed URL hết hạn tối đa 15 phút.
- Phone, address, token và provider payload nhạy cảm không ghi vào application log.
- Secret chỉ đến từ environment/secret manager và không commit.

## Audit

Ghi append-only cho account disable, Admin cancel, payment confirmation, role/status thay đổi và truy cập đặc quyền khi cần. Audit record không cho sửa qua API.
