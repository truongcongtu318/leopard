# Acceptance criteria

## AC-01 Identity

- Đăng nhập thành công trả access token và refresh session hợp lệ.
- Refresh token cũ không dùng lại được sau rotation.
- User sai role nhận HTTP 403; chưa đăng nhập nhận HTTP 401.
- Logout làm refresh session hiện tại mất hiệu lực.

## AC-02 Order và route

- Đơn hợp lệ lưu đầy đủ các điểm theo đúng thứ tự.
- Quá ba stops, tọa độ sai hoặc vehicle type không hỗ trợ nhận HTTP 422.
- Order response chứa distance, duration, price, ETA source và `calculatedAt`.
- Customer không xem được order của Customer khác.

## AC-03 Lifecycle và Driver

- Hai Driver nhận đồng thời chỉ có một request thành công.
- Transition sai nhận `ORDER_INVALID_TRANSITION` và không đổi dữ liệu.
- Customer chỉ hủy được `REQUESTED`; Admin hủy đơn đã nhận phải có reason.
- Không thể chuyển `DELIVERED` khi chưa có delivery proof.

## AC-04 Tracking

- Chỉ assigned Driver gửi được point cho active order.
- Customer sở hữu order và Admin nhận được event sau khi join room.
- Point không hợp lệ hoặc quá giới hạn tần suất bị từ chối mà gateway không ngắt toàn bộ phiên.

## AC-05 Media và payment

- File sai loại hoặc lớn hơn 10 MB bị từ chối.
- QR response có amount, reference, expiry và provider source.
- Chỉ Admin xác nhận `PAID_MANUAL`; thao tác tạo audit record.

## AC-06 UI và operations

- Mỗi màn hình chính có loading, empty, error, success và permission-denied state phù hợp.
- Customer/Driver dùng được ở viewport 360 px mà không tràn ngang.
- Readiness check thất bại khi database không truy cập được; liveness vẫn phản ánh process.
