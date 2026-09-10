# Authentication và permissions

## Session flow

1. Client đăng nhập qua demo hoặc Firebase endpoint.
2. API tạo access token và refresh session. Mobile giữ access token trong memory và refresh token trong SecureStore; admin web giữ cả hai trong cookie `HttpOnly` do BFF quản lý.
3. Mobile client gửi `Authorization: Bearer <token>` cho REST và token trong Socket handshake. Admin web chỉ gọi same-origin BFF; BFF forward access token tới backend.
4. Khi access token hết hạn, client gọi `/auth/refresh` một lần; request song song chờ cùng kết quả refresh.
5. Refresh thất bại đưa người dùng về login và xóa state nhạy cảm.

## Claims

Access token tối thiểu có `sub`, `role`, `sessionId`, `iat`, `exp`. Backend luôn tải account status cần thiết; không tin role do client gửi.

## Permission matrix

| Action | Customer | Driver | Fleet Owner | Admin |
| --- | --- | --- | --- | --- |
| Create order | Có | Không | Không | Không |
| View order | Own | Assigned/public summary | Fleet assigned | Tất cả |
| Cancel order | Own `REQUESTED` | Không | Không | Có reason |
| Accept order | Không | Available | Không | Không |
| Update delivery status | Không | Assigned | Không | Không |
| Send tracking | Không | Assigned | Không | Không |
| View fleet drivers | Không | Không | Own fleet | Tất cả |
| View tracking | Own | Assigned | Fleet assigned | Tất cả |
| Create payment | Own | Không | Không | Có |
| Confirm payment | Không | Không | Không | Có + audit |
| Disable user | Không | Không | Không | Có + audit |

Endpoint không được chỉ dựa vào việc ẩn nút ở UI. Resource không tồn tại và resource không có quyền có thể cùng trả 404 để hạn chế dò ID, trừ khi nghiệp vụ cần báo 403 rõ ràng.
