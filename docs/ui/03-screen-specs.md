# Screen specifications

## `/login`

Phone/Firebase flow hoặc demo account selector khi được bật. Có trạng thái submitting, invalid credential, provider unavailable và session expired.

Header login dùng gradient cam đỏ `#E64A19` xuống vàng cam `#FFB74D`, với mép sóng chữ S bất đối xứng: mép trái đi chéo lên, đỉnh tại khoảng 33% và đáy tại khoảng 78% chiều rộng. Bóng xám dưới sóng gồm lớp mềm offset Y 10 px, opacity 28%, độ lệch chuẩn blur 6 px và lớp sát mép offset Y 4 px, opacity 18%, blur 2 px. Logo và lời chào nằm giữa vùng cam; form đặt trực tiếp trên nền trắng, cách header 12 px và không có card bao ngoài. Header giới hạn rộng 520 px trên tablet/desktop để giữ tỷ lệ đường cong. SVG trang trí được ẩn khỏi cây accessibility bằng thuộc tính phù hợp từng nền tảng.

Ảnh nền header dùng `apps/mobile/assets/brand/auth-truck-background.jpg`, opacity 18%, căn vùng xe tải ở giữa phần cam và cắt theo cùng đường sóng. Giữ tỷ lệ ảnh khi thay đổi chiều rộng, logo/chữ nằm phía trên ảnh.

## Customer

- `/customer/home`: header gọn bằng logo + actions, không dùng ảnh AI/hero minh họa lớn. Khung đặt xe nhanh giữ vị trí chính ngay đầu nội dung; section "Đang vận chuyển" nằm trực tiếp bên dưới khung đặt xe ở cả trạng thái có chuyến và empty lookup. Lưới dịch vụ vận tải hiển thị 6 lựa chọn theo 2 cột x 3 hàng với icon/vector đồng bộ thương hiệu. Carousel ưu đãi dùng artwork native/text rõ nghĩa thay cho ảnh quảng cáo raster, mỗi slide vẫn dẫn về luồng tạo đơn.
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

- `/fleet`: Giao diện **NexaFleet Bento Dispatch Console** dành cho Chủ đội xe, giới hạn nghiêm ngặt theo phạm vi đội xe:
  - **Thanh phạm vi đội xe (`FleetScopeRail`):** Xác nhận tên và ID đội xe đang quản trị.
  - **Cột trái (~62%):**
    - **Bản đồ Realtime Dark Mode:** Hiển thị vị trí xe tải/bán tải thuộc đội xe và các tuyến đường chuyến đi đang chạy trong khu vực Đà Nẵng, thanh tìm kiếm kính mờ, zoom controls và marker bưu kiện.
    - **Bảng danh sách đơn hàng đội xe:** Hiển thị danh sách đơn của đội xe với bộ lọc pill (`Tất cả`, `Chờ nhận`, `Đã phản hồi`, `Đã gán`, `Hoàn thành`), cột lộ trình có mũi tên (`từ A -> đến B`), trọng tải, ETA và badge trạng thái xanh lục / hồng sen.
  - **Cột phải (~38%):**
    - **Tổng quan trạng thái (Status Overview):** Tỷ lệ % và thanh phân đoạn 4 màu (Đang xếp hàng, Đang vận chuyển, Đang dỡ hàng, Đã giao) trong đội xe.
    - **Hiệu suất thực hiện (Fulfillment Performance):** Chỉ số KPI % trung bình kèm biểu đồ cột đứng màu xanh ngọc lục bảo.
    - **Doanh thu vận hành (Revenue Over Time):** Thẻ gradient hoàng hôn rực rỡ, số liệu doanh thu đội xe kèm biểu đồ sóng trắng mềm mại và bộ lọc mốc thời gian (Tuần / Tháng / 6 tháng / Năm).
  - **Khu vực ngoại lệ & chú ý:** Hiển thị các cảnh báo vận hành cần xử lý thuộc đội xe.
- `/fleet/drivers`: table/list drivers thuộc fleet, availability, active order và last known location nếu có quyền.
- `/fleet/orders`: server pagination, filters theo status/driver/khoảng ngày và payment summary.
- `/fleet/orders/:id`: route, status history, tracking, media và payment summary chỉ đọc.

## Admin

- `/admin`: Giao diện Bàn điều phối hiện đại (**NexaFleet Modern Bento Dispatch Console**) bao quát toàn bộ mạng lưới logistics:
  - **Topbar trên cùng nổi bo góc:** Logo thương hiệu LEOPARD, Menu điều hướng trung tâm với tab active dạng pill đen tuyền (`bg-slate-900 text-white rounded-full`), ô tìm kiếm bo tròn pill, Chuông thông báo và Profile quản trị (avatar + tên + chức danh).
  - **Cột bên trái (~62%):**
    - **Bản đồ Realtime Dark Mode:** Trực quan hóa toàn bộ mạng lưới logistics Đà Nẵng, thanh tìm kiếm đơn kính mờ nổi góc trên-trái, nút phóng to màn hình, cụm nút zoom `+ / -` kính mờ góc dưới-phải, marker bưu kiện dạng hộp 3D trắng và marker đơn đang chọn xanh ngọc lục bảo.
    - **Bảng danh sách đơn hàng toàn hệ thống:** Thẻ trắng bo góc `rounded-3xl` với tiêu đề số lượng đơn và cụm nút lọc pill (`Tất cả`, `Chờ nhận`, `Đã phản hồi`, `Đã gán`, `Hoàn thành`). Bảng hiển thị rõ Mã đơn, Khách hàng, Lộ trình (`từ A -> đến B`), Trọng tải, ETA và Badge trạng thái NexaFleet (Xanh ngọc lục bảo cho In Transit, Hồng sen cho Delivered).
  - **Cột bên phải (~38%):**
    - **Thẻ Status Overview:** Tỷ lệ % phân bổ 4 trạng thái vận hành chính (Đang xếp hàng, Đang vận chuyển, Đang dỡ hàng, Đã giao) kèm thanh tiến trình phân đoạn nhiều màu liền mạch.
    - **Thẻ Fulfillment Performance:** Chỉ số tỷ lệ hoàn thành trung bình (89%) kết hợp biểu đồ cột đứng bo tròn màu xanh ngọc lục bảo.
    - **Thẻ Doanh thu vận hành (Revenue Over Time):** Thẻ nền gradient hoàng hôn ấm áp, số tiền doanh thu lớn, biểu đồ sóng trắng mềm mại và bộ lọc mốc thời gian (Tuần / Tháng / 6 tháng / Năm).
  - **Ngoại lệ ca trực & Cảnh báo an toàn:** Khối thông báo ngoại lệ vận hành tự động hiển thị khi có sự cố phát sinh.
- `/admin/orders`: table có server pagination, filters, sort và clear filters.
- `/admin/orders/:id`: route, status history, tracking, media, payment và audited commands.
- `/admin/users`, `/admin/fleets`, `/admin/drivers`: search/filter, status và chi tiết cần thiết.

## Map/ETA copy

Luôn dùng nhãn “ETA dự kiến”. Khi source `DEMO`, hiển thị “Dữ liệu mô phỏng” cạnh ETA, không dùng tooltip để che thông tin này.
