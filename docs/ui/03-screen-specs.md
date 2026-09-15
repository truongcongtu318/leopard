# Screen specifications

## `/login`

Phone/Firebase flow hoặc demo account selector khi được bật. Có trạng thái submitting, invalid credential, provider unavailable và session expired.

Header login dùng gradient cam đỏ `#E64A19` xuống vàng cam `#FFB74D`, với mép sóng chữ S bất đối xứng: mép trái đi chéo lên, đỉnh tại khoảng 33% và đáy tại khoảng 78% chiều rộng. Bóng xám dưới sóng gồm lớp mềm offset Y 10 px, opacity 28%, độ lệch chuẩn blur 6 px và lớp sát mép offset Y 4 px, opacity 18%, blur 2 px. Logo và lời chào nằm giữa vùng cam; form đặt trực tiếp trên nền trắng, cách header 12 px và không có card bao ngoài. Header giới hạn rộng 520 px trên tablet/desktop để giữ tỷ lệ đường cong. SVG trang trí được ẩn khỏi cây accessibility bằng thuộc tính phù hợp từng nền tảng.

Ảnh nền header dùng `apps/mobile/assets/brand/auth-truck-background.jpg`, opacity 18%, căn vùng xe tải ở giữa phần cam và cắt theo cùng đường sóng. Giữ tỷ lệ ảnh khi thay đổi chiều rộng, logo/chữ nằm phía trên ảnh.

## Customer

- `/customer/home`: **Trang chủ Đặt xe tại chỗ Map-First (Pure In-Place Booking)** chuẩn Lalamove/Grab, tuân thủ nguyên tắc Single Responsibility Principle (SRP):
  - **Bản đồ trực tiếp (65–70% viewport):** Hiển thị xe tải radar realtime lân cận, không bị che khuất.
  - **Topbar kính mờ nổi (Floating Glass Topbar):** Logo thương hiệu LEOPARD, Lời chào thời gian + Tên khách hàng/SME, nút Chuyển vai trò (`Tài xế`), Chuông thông báo có badge số đếm.
  - **Khay trượt điều phối 3 nấc (`GestureBottomSheet` [0.18, 0.52, 0.92]):**
    - *Tiết lộ tiệm tiến (Progressive Disclosure):* Khi chưa nhập điểm đến, khay thu gọn hiển thị hướng dẫn nhập điểm giao kèm các chip kho bãi thực tế đã lưu của khách hàng (nếu có). Ẩn hoàn toàn bảng xe và cước tạm tính ảo.
    - *Tìm kiếm vị trí thông minh (Live Places Autocomplete):* Tích hợp trực tiếp Vietmap Places API v4, hỗ trợ gõ không dấu lẫn có dấu tiếng Việt, phản hồi tức thì dưới 200ms. Ô nhập địa chỉ sạch sẽ (chỉ gồm text + nút xóa `✕`, đã gọt bỏ popup bản đồ lồng nhau và icon ghim thừa).
    - *Ma trận phương tiện (Fleet Matrix):* Khi đã chọn điểm đến (>= 3 ký tự), tự động mở rộng hiển thị 4 dòng xe tải (`VAN_500KG`, `TRUCK_125T`, `TRUCK_25T`, `BIKE_3W`) kèm kích thước thùng lọt lòng chuẩn xác (`D x R x C`), tải trọng và giá cước tính toán theo lộ trình thực. Chạm chọn xe cập nhật thông số và giá cước tại chỗ với phản hồi xúc giác `haptic.selection()`.
    - *Nút hành động chính Fitts's Law:* `TIẾP TỤC ĐẶT XE · [Giá cước] ₫ ➔` đặt sát đáy ngón cái, mở khay chi tiết đặt xe tại chỗ.
    - *Khay chi tiết chuyến hàng tại chỗ (`BookingDetailsModal`):* Tên/SĐT người nhận, chọn nhanh loại hàng (`Kiện hàng`, `May mặc`, `VLXD`, `Nội thất`, `Khác`), ghi chú tài xế, tùy chọn dịch vụ bốc xếp 2 đầu (+120.000 ₫) và hóa đơn VAT 8%, lựa chọn hình thức thanh toán (`VietQR payOS Escrow` hoặc `Tiền mặt khi nhận hàng`).
    - *Kích hoạt nổ đơn:* Xác nhận gọi xe chuyển thẳng tới màn hình Radar tìm tài xế gần nhất (`/customer/orders/searching/:id`) đối với Tiền mặt hoặc màn hình Thanh toán VietQR (`/customer/orders/checkout/:id`), loại bỏ hoàn toàn việc chuyển trang qua form wizard 4 bước trùng lặp.
    - *Theo dõi đơn đang chạy:* Thẻ tóm tắt đơn hàng đang vận chuyển kèm Route Spine và nút `Theo dõi →` chỉ hiển thị khi có đơn thực tế đang chạy trên đường.
- `/customer/orders`: status tabs/filter, order rows, pagination/infinite load có kiểm soát và create action.
- `/customer/orders/new`: route fallback cho trường hợp tạo đơn mở rộng; chuẩn đặt xe chính đã tích hợp 100% tại `/customer/home`.
- `/customer/orders/checkout/:id`: thanh toán VietQR payOS tự sinh mã QR chuẩn kèm thông tin chuyển khoản ngân hàng, tự động ẩn thanh Dock nổi để không che nút thao tác.
- `/customer/orders/searching/:id`: màn hình radar sóng quét tìm kiếm tài xế lân cận theo thời gian thực sau khi xác nhận đơn.
- `/customer/orders/:id`: status timeline, route/map, Driver/tracking khi được nhận, media, payment, hóa đơn (khi đã phát hành) và cancel khi hợp lệ. Section hóa đơn chỉ hiện khi order đã có `invoice` (fetch riêng từ `GET /invoices/order/:orderId`, không phải một phần response order): hiện số hóa đơn, tổng tiền, ngày phát hành và nút "Xem hóa đơn" mở link xem/tải qua trình duyệt hệ thống. Khi `emailSentAt` là `null`, hiện thêm ô nhập email + nút "Gửi email hóa đơn" (validate client-side bằng cùng regex email của form đăng ký, nhưng vẫn dựa vào validate phía server); gửi thất bại (SMTP lỗi) vẫn giữ nút gửi lại, không mất hóa đơn đã có.
- `/customer/profile`: số điện thoại, vai trò, trạng thái tài khoản, phiên bản ứng dụng, đăng xuất.
- `/customer/notifications`: hộp thư thông báo, filter chip (Tất cả/Chưa đọc/Đơn hàng/Thanh toán/Ưu đãi/Hệ thống) kèm số đếm, nhóm theo "Hôm nay"/"Trước đó", nút "Đọc tất cả" khi còn thông báo chưa đọc, "Tải thêm thông báo" khi còn trang kế tiếp (thất bại tải thêm chỉ hiện banner nhỏ, không mất danh sách đã hiển thị), nhấn một thông báo đánh dấu đã đọc và điều hướng tới `/customer/orders/:id` nếu thông báo gắn với một order. Nhận cập nhật realtime qua socket khi ứng dụng đang mở (mount cùng lúc với layout Customer đã đăng nhập) và đăng ký device token nhận push trên bản PWA/web khi trình duyệt hỗ trợ và người dùng cho phép.

## Driver

- `/login` trong Driver: giao diện navy đậm `#0B1E42` đồng bộ splash. Hero ngắn dùng `apps/mobile/assets/brand/driver-hero-bg.jpg`, phủ gradient navy để logo, nhãn DRIVER và tiêu đề “Chào mừng bác tài” luôn dễ đọc. Form một cột nối liền bên dưới hero, không có card lồng; input dùng surface navy sáng hơn, nút OTP cam và Google là nút phụ. Ở trạng thái đăng nhập bình thường, toàn bộ hero, form và liên kết đăng ký phải nằm trong một viewport 360x800 hoặc 390x844 mà không cần cuộn; chỉ cho phép cuộn khi bàn phím, thông báo lỗi hoặc demo controls làm giảm vùng hiển thị. Giữ nguyên luồng OTP/Google/demo, thông báo hết phiên, autofill và safe area.
- `/verify-otp` trong Driver: nền navy thuần, không dùng ảnh hero để tập trung vào tác vụ xác thực. Top bar có nút quay lại và wordmark LEOPARD DRIVER; phần nội dung dùng biểu tượng khiên, tiêu đề “Xác thực số điện thoại” và số nhận mã trong pill. Sáu ô OTP dùng surface navy với focus cam, thông báo lỗi đỏ có tương phản rõ; keypad số riêng nằm ở cuối màn hình và tự thu gọn chiều cao ở viewport thấp hơn 720px để toàn bộ luồng vẫn hiển thị trong một màn hình. Chuyển từ `/login` sang `/verify-otp` bằng native stack push ngang ngắn, hỗ trợ gesture quay lại. Giữ tự động xác thực khi đủ 6 số, autofill OTP từ SMS, đếm ngược/gửi lại mã, loading và điều hướng theo trạng thái hồ sơ tài xế.
- `/driver-register`: hồ sơ đăng ký tài xế theo wizard 4 bước: cá nhân, phương tiện/GPLX, chụp 3 giấy tờ KYC bắt buộc và hợp đồng. Bước giấy tờ dùng camera sau làm hành động chính cho `LICENSE`, `VEHICLE_REGISTRATION`, `ID_CARD`; mỗi giấy tờ hiển thị trạng thái `Bắt buộc`/`Đã chụp`, ảnh xem trước và hành động `Chụp lại`. Hướng dẫn chụp phải nêu đủ bốn góc, không lóa, rõ chữ; không tuyên bố OCR khi chưa có provider. Bước ký hợp đồng có link "Xem hợp đồng" (mở PDF bản mẫu qua request có kèm access token, không dùng link trần vì route yêu cầu xác thực), checkbox đồng ý bắt buộc, ô chữ ký gõ tên (tối đa 120 ký tự, tự điền từ họ tên tới khi driver sửa tay). Nút gửi hồ sơ chỉ bật khi đủ thông tin + 3 giấy tờ + đã tick đồng ý + có chữ ký hợp lệ. Lỗi `CONTRACT_NOT_ACCEPTED`/`SIGNATURE_INVALID` từ server hiển thị thông báo tiếng Việt cụ thể thay vì lỗi chung chung. Màn hình kết quả sau khi nộp (đang chờ duyệt hoặc bị từ chối) hiển thị thêm "Đã ký hợp đồng phiên bản {version} lúc {thời điểm}" khi `contractVersion`/`contractSignedAt` có giá trị (từ response `apply` hoặc từ `GET /driver/application` khi bấm "Kiểm tra lại"); nộp lại hồ sơ sau khi bị từ chối xóa state hợp đồng cũ (bao gồm trạng thái đồng ý) trước khi hiển thị lại form, tránh hiện thông tin hợp đồng đã ký cũ trong lúc chờ hồ sơ mới.
- `/driver/orders`: **Trang tổng quan Tài xế Thực địa V2 (Driver Home V2)** triển khai theo [Driver Home Redesign Implementation Specification](13-driver-home-redesign-implementation-spec.md):
  - **Light Operational Canvas (`#F4F7FB`):** Nền canvas xám sáng thanh lịch, chống lóa ngoài trời; các thẻ bento trắng tinh khôi (`#FFFFFF`, `radius.card` 20-22px, viền `border-slate-200`, đổ bóng êm ái).
  - **Topbar & Header (`DriverHomeHeader`):** Lời chào cá nhân hóa ("Chào anh [Tên]"), biển số xe + loại xe (`51C-889.24 · 2.5T`), chuông thông báo và nút mở Sidebar Drawer (`testID="driver-menu-button"`).
  - **Thẻ Trạng thái Nhận đơn (`DriverAvailabilityCard`):** Công tắc Hero Duty Switch 48px chuẩn tương phản cao (`TRỰC TUYẾN` / `NGOẠI TUYẾN`), huy hiệu trạng thái sẵn sàng, radar quét bán kính và hàng chỉ số mini KPI (`Chuyến xong`, `Thu nhập hôm nay`, `Giờ online`).
  - **Banner Hệ thống & Kết nối (`DriverSystemBanner`):** Cảnh báo radar vị trí khi online nhưng chưa cấp quyền GPS hoặc ping gián đoạn; banner mạng khi refetch lỗi hiển thị "Mất kết nối — dữ liệu có thể chưa được cập nhật" kèm nút "Thử lại" (>= 44px) mà không làm mất danh sách và dữ liệu chuyến đi trong cache.
  - **Thẻ Chuyến đang thực hiện (`DriverActiveTripCard`):** Đóng vai trò Visual Anchor duy nhất khi tài xế đang nhận chuyến; Route Spine A (Điểm lấy) → B (Điểm giao), nhãn "ETA dự kiến", cảnh báo ảnh chứng từ giao hàng, thanh liên hệ khách hàng bảo mật (che SĐT) với nút Gọi và Nhắn tin, cùng đúng một nút Primary CTA duy nhất "Tiếp tục chuyến" (52px, nền cam `#F97316` chữ Midnight Navy `#0B1E42` tương phản cao WCAG AA).
  - **Bộ lọc & Danh sách Đơn có thể nhận (`DriverOrderFilters` & `DriverNearbyOrderCard`):** Chip bộ lọc loại xe bo tròn (`Tất cả`, `Xe van`, `1.25T`, `2.5T`), nút Thiết lập bán kính; thẻ đơn hàng V2 làm nổi bật cước thực nhận dự kiến số to rõ nét, khoảng cách điểm lấy hàng, lộ trình A→B, nút "Bỏ qua" và "Nhận đơn / Xem chi tiết"; loại bỏ hoàn toàn trùng lặp nhãn giá cước hay ETA.
  - **Thanh Điều hướng Đáy Nổi (`DriverBottomNavigation`):** Floating dock 4 tab (`Trang chủ`, `Đơn`, `Thu nhập`, `Tôi`) với khoảng trống an toàn (safe-area clearance 104px), không che khuất thẻ đơn hàng cuối cùng.
  - **Modal Nổ đơn Tiếp nhận 15s (`IncomingDispatchModal`):** Hiển thị nổi bật trên toàn bộ màn hình khi có đơn điều phối trực tiếp (`dispatch:offer`), tích hợp thanh trượt xác nhận `SlideToAction`. Nhờ `DriverDispatchProvider` bao bọc toàn ứng dụng, modal tự động hiển thị tức thời dù tài xế đang ở bất kỳ tab nào (`/orders`, `/history`, `/earnings`, `/profile`, `/wallet`) mà không cần tải lại trang.
- `/driver/orders/:id`: route/cargo summary, accept action hoặc active workflow; status action hiển thị đúng next state duy nhất; delivery proof trước `DELIVERED`. Giao diện lắng nghe realtime socket (`/tracking` namespace `order:status-updated`), cập nhật trạng thái đơn tức thời (optimistic update & invalidate query) mà không cần tải lại trang; tự động phát hiện và cảnh báo tức thì khi đơn bị hủy bởi khách hàng hoặc admin để giải phóng tài xế khỏi chuyến đi.
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
