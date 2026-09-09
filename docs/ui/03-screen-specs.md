# Screen specifications

## `/login`

Phone/Firebase flow hoặc demo account selector khi được bật. Có trạng thái submitting, invalid credential, provider unavailable và session expired.

Header login dùng gradient cam đỏ `#E64A19` xuống vàng cam `#FFB74D`, với mép sóng chữ S bất đối xứng: mép trái đi chéo lên, đỉnh tại khoảng 33% và đáy tại khoảng 78% chiều rộng. Bóng xám dưới sóng gồm lớp mềm offset Y 10 px, opacity 28%, độ lệch chuẩn blur 6 px và lớp sát mép offset Y 4 px, opacity 18%, blur 2 px. Logo và lời chào nằm giữa vùng cam; form đặt trực tiếp trên nền trắng, cách header 12 px và không có card bao ngoài. Header giới hạn rộng 520 px trên tablet/desktop để giữ tỷ lệ đường cong. SVG trang trí được ẩn khỏi cây accessibility bằng thuộc tính phù hợp từng nền tảng.

## Customer

- `/customer/orders`: status tabs/filter, order rows, pagination/infinite load có kiểm soát và create action.
- `/customer/orders/new`: pickup, stops, dropoff, vehicle, cargo, route estimate, price và ETA dự kiến. Submit chỉ bật khi estimate token còn hiệu lực.
- `/customer/orders/:id`: status timeline, route/map, Driver/tracking khi được nhận, media, payment, hóa đơn (khi đã phát hành) và cancel khi hợp lệ. Section hóa đơn chỉ hiện khi order đã có `invoice` (fetch riêng từ `GET /invoices/order/:orderId`, không phải một phần response order): hiện số hóa đơn, tổng tiền, ngày phát hành và nút "Xem hóa đơn" mở link xem/tải qua trình duyệt hệ thống. Khi `emailSentAt` là `null`, hiện thêm ô nhập email + nút "Gửi email hóa đơn" (validate client-side bằng cùng regex email của form đăng ký, nhưng vẫn dựa vào validate phía server); gửi thất bại (SMTP lỗi) vẫn giữ nút gửi lại, không mất hóa đơn đã có.
- `/customer/profile`: số điện thoại, vai trò, trạng thái tài khoản, phiên bản ứng dụng, đăng xuất.
- `/customer/notifications`: hộp thư thông báo, filter chip (Tất cả/Chưa đọc/Đơn hàng/Thanh toán/Ưu đãi/Hệ thống) kèm số đếm, nhóm theo "Hôm nay"/"Trước đó", nút "Đọc tất cả" khi còn thông báo chưa đọc, "Tải thêm thông báo" khi còn trang kế tiếp (thất bại tải thêm chỉ hiện banner nhỏ, không mất danh sách đã hiển thị), nhấn một thông báo đánh dấu đã đọc và điều hướng tới `/customer/orders/:id` nếu thông báo gắn với một order. Nhận cập nhật realtime qua socket khi ứng dụng đang mở (mount cùng lúc với layout Customer đã đăng nhập) và đăng ký device token nhận push trên bản PWA/web khi trình duyệt hỗ trợ và người dùng cho phép.

## Driver

- `/driver-register`: hồ sơ đăng ký tài xế (họ tên, loại xe, biển số, GPLX), upload 3 giấy tờ KYC. Bước ký hợp đồng hiện ra khi họ tên/biển số/GPLX đã điền: link "Xem hợp đồng" (mở PDF bản mẫu qua request có kèm access token, không dùng link trần vì route yêu cầu xác thực), checkbox đồng ý bắt buộc, ô chữ ký gõ tên (tối đa 120 ký tự, tự điền từ họ tên tới khi driver sửa tay). Nút gửi hồ sơ chỉ bật khi đủ thông tin + 3 giấy tờ + đã tick đồng ý + có chữ ký hợp lệ. Lỗi `CONTRACT_NOT_ACCEPTED`/`SIGNATURE_INVALID` từ server hiển thị thông báo tiếng Việt cụ thể thay vì lỗi chung chung. Màn hình kết quả sau khi nộp (đang chờ duyệt hoặc bị từ chối) hiển thị thêm "Đã ký hợp đồng phiên bản {version} lúc {thời điểm}" khi `contractVersion`/`contractSignedAt` có giá trị (từ response `apply` hoặc từ `GET /driver/application` khi bấm "Kiểm tra lại"); nộp lại hồ sơ sau khi bị từ chối xóa state hợp đồng cũ (bao gồm trạng thái đồng ý) trước khi hiển thị lại form, tránh hiện thông tin hợp đồng đã ký cũ trong lúc chờ hồ sơ mới.
- `/driver/orders`: availability control, active-order banner và danh sách `REQUESTED`.
- `/driver/orders/:id`: route/cargo summary, accept action hoặc active workflow; status action hiển thị đúng next state duy nhất; delivery proof trước `DELIVERED`.
- `/driver/profile`: số điện thoại, vai trò, trạng thái tài khoản, phiên bản ứng dụng, đăng xuất.

## Fleet Owner

- `/fleet`: KPI fleet pilot, drivers theo availability, active orders và cảnh báo cần chú ý.
- `/fleet/drivers`: table/list drivers thuộc fleet, availability, active order và last known location nếu có quyền.
- `/fleet/orders`: server pagination, filters theo status/driver/khoảng ngày và payment summary.
- `/fleet/orders/:id`: route, status history, tracking, media và payment summary chỉ đọc.

## Admin

- `/admin`: KPI vận hành, số đơn theo status, lỗi cần chú ý và recent orders.
- `/admin/orders`: table có server pagination, filters, sort và clear filters.
- `/admin/orders/:id`: route, status history, tracking, media, payment và audited commands.
- `/admin/users`, `/admin/fleets`, `/admin/drivers`: search/filter, status và chi tiết cần thiết.

## Map/ETA copy

Luôn dùng nhãn “ETA dự kiến”. Khi source `DEMO`, hiển thị “Dữ liệu mô phỏng” cạnh ETA, không dùng tooltip để che thông tin này.
