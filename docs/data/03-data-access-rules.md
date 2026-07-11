# Quy tắc truy cập dữ liệu

## Ownership

- `Order.customerId` xác định Customer owner bất biến.
- `Order.driverId` chỉ được đặt qua accept-order command và không sửa trực tiếp.
- Tracking point phải trùng `order.driverId` tại thời điểm ghi.
- Media access kế thừa quyền từ order.

## Query rules

- Customer query luôn có `customerId = actor.id`.
- Driver query public chỉ lấy summary của `REQUESTED`; dữ liệu nhạy cảm đầy đủ chỉ mở sau assignment.
- Admin endpoint bắt buộc pagination; không trả toàn bảng.
- Signed media URL được tạo sau authorization, không lưu vĩnh viễn trong database.

## Delete và retention

- User và order dùng status/soft-delete semantics; không hard-delete qua API pilot.
- Refresh session hết hạn và tracking quá retention có thể hard-delete bằng maintenance job.
- Audit log và status history append-only.
- Payment record không hard-delete.

## Concurrency

Accept order dùng conditional update `status=REQUESTED AND driverId IS NULL`. Status transition kiểm tra current status trong transaction. API trả conflict thay vì ghi đè khi optimistic condition không còn đúng.
