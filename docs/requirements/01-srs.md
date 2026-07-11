# Software Requirements Specification

## 1. Mục đích

Tài liệu này định nghĩa yêu cầu chức năng và ràng buộc của LEOPARD mini-production pilot. Đây là nguồn ưu tiên cao nhất khi tài liệu chi tiết có xung đột.

## 2. Actor và môi trường

- Actor: `CUSTOMER`, `DRIVER`, `ADMIN`.
- Web/PWA hỗ trợ hai phiên bản gần nhất của Chrome, Edge và Safari.
- Local dùng demo providers; staging có thể dùng provider thật khi đủ credential.

## 3. Yêu cầu chức năng

### FR-01 Identity và access

- Hệ thống hỗ trợ đăng nhập demo và Firebase Phone Auth qua provider.
- Access token có thời hạn 15 phút; refresh token tối đa 7 ngày và được rotate.
- Logout thu hồi refresh session.
- API kiểm tra account status, role và ownership cho mọi resource riêng tư.

### FR-02 Order management

- Customer tạo đơn gồm pickup, 0-3 stops, dropoff, vehicle type, cargo note và ảnh tùy chọn.
- Địa điểm phải có label, latitude và longitude hợp lệ.
- Backend lưu route snapshot, khoảng cách, thời lượng, ETA source và giá dự kiến.
- Danh sách hỗ trợ pagination; Admin hỗ trợ lọc theo status, Customer, Driver và khoảng ngày.
- Lifecycle chỉ cho phép transition trong business process.

### FR-03 Driver operations

- Driver chỉ thấy đơn `REQUESTED` có thể nhận.
- Driver phải `AVAILABLE` và không có đơn active để nhận đơn.
- Chỉ assigned Driver được cập nhật trạng thái và tracking.
- `DELIVERED` yêu cầu ít nhất một delivery proof image.

### FR-04 Tracking

- Client gửi latitude, longitude, capturedAt và accuracy tùy chọn.
- Backend xác thực assignment, giới hạn tần suất, lưu điểm và broadcast theo order room.
- Customer sở hữu đơn và Admin được xem tracking.

### FR-05 Map, route và ETA

- Backend cung cấp search/geocode/route qua `MapProvider`.
- Dùng `VietmapProvider` khi cấu hình hợp lệ; nếu cho phép fallback thì dùng `DemoEtaProvider`.
- Demo ETA phải xác định từ distance, không sử dụng random.
- Response nêu `source`, `calculatedAt` và `isEstimate`.

### FR-06 Media

- Chỉ nhận JPEG, PNG hoặc WebP, tối đa 10 MB/file.
- Customer tải cargo image cho đơn của mình; assigned Driver tải delivery proof.
- Storage dùng local ở development và S3-compatible ở staging.

### FR-07 Payment

- Customer hoặc Admin tạo payment intent cho đơn chưa thanh toán.
- Một order chỉ có tối đa một intent active.
- Status gồm `UNPAID`, `QR_CREATED`, `PAID_MANUAL`, `FAILED`.
- Chỉ Admin xác nhận `PAID_MANUAL`; bắt buộc ghi chú và audit log.

### FR-08 Administration và operations

- Admin xem users, drivers, orders, media, tracking và payment state.
- Hệ thống có `/health/live` và `/health/ready`.
- Hành động nhạy cảm được ghi audit với actor, action, target, thời gian và metadata.

## 4. Quy tắc dữ liệu

- Thời gian lưu UTC, API trả ISO 8601.
- Tiền lưu số nguyên VND.
- Distance dùng meter; duration dùng second.
- ID dùng UUID.
- User bị vô hiệu hóa không đăng nhập hoặc gọi API riêng tư được.

## 5. Tiêu chí phát hành pilot

- Toàn bộ P0 acceptance criteria và UAT chính đạt.
- Không còn lỗi authorization P0/P1.
- Migration chạy trên database sạch và database staging hiện có.
- Có seed demo, hướng dẫn setup và phương án rollback phiên bản ứng dụng.
