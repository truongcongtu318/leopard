# Screen specifications

## `/login`

Phone/Firebase flow hoặc demo account selector khi được bật. Có trạng thái submitting, invalid credential, provider unavailable và session expired.

## Customer

- `/customer/orders`: status tabs/filter, order rows, pagination/infinite load có kiểm soát và create action.
- `/customer/orders/new`: pickup, stops, dropoff, vehicle, cargo, route estimate, price và ETA dự kiến. Submit chỉ bật khi estimate token còn hiệu lực.
- `/customer/orders/:id`: status timeline, route/map, Driver/tracking khi được nhận, media, payment và cancel khi hợp lệ.

## Driver

- `/driver/orders`: availability control, active-order banner và danh sách `REQUESTED`.
- `/driver/orders/:id`: route/cargo summary, accept action hoặc active workflow; status action hiển thị đúng next state duy nhất; delivery proof trước `DELIVERED`.

## Fleet Owner

- `/fleet`: KPI fleet pilot, drivers theo availability, active orders và cảnh báo cần chú ý.
- `/fleet/drivers`: table/list drivers thuộc fleet, availability, active order và last known location nếu có quyền.
- `/fleet/orders`: server pagination, filters theo status/driver/khoảng ngày và payment summary.
- `/fleet/orders/:id`: route, status history, tracking, media và payment summary chỉ đọc.

## Admin

- `/admin`: Giao diện Bàn điều phối hiện đại (**Modern Dispatch Console**) bao gồm:
  - **Thanh Dock điều hướng bên trái:** Nút Dashboard, Quản lý khách hàng, Đội xe & tài xế, Đơn hoàn thành, Cài đặt và Đăng xuất.
  - **Topbar trên cùng:** Logo LEOPARD, Menu điều hướng (Dự án, Khách hàng, Tài xế, Đơn hàng, Hệ thống & Pilot, Cài đặt), Ô tìm kiếm bo tròn pill, Chuông thông báo và Profile quản trị.
  - **Bản đồ theo dõi Real-Time (Trung tâm):** Trực quan hóa bản đồ Đà Nẵng với mạng lưới đường sá, địa danh, các tuyến lộ trình đa sắc, vị trí xe tải/bán tải di chuyển thời gian thực, nút lọc phương tiện nổi ("Bán tải", "Tải nặng"), nút chế độ lớp ("Nhìn Thảm") và cụm điều khiển zoom.
  - **Cột tác vụ điều hành bên phải:**
    - Thẻ "Yêu cầu đơn mới": Danh sách đơn `REQUESTED` cần phân công (Khách hàng, Tải trọng, Loại hàng, Nơi đến).
    - Thẻ "Tài xế gần đây": Danh sách tài xế với avatar tròn màu, loại xe/tải trọng, đánh giá sao ⭐ và liên kết chi tiết.
    - Thẻ "Cảnh báo vận hành": Danh sách ngoại lệ cần kiểm tra (Tracking cũ, Lỗi thanh toán VietQR) kèm liên kết điều tra.
  - **Hàng 6 thẻ chỉ số đo lường trực quan (Bottom KPI Row):**
    - Đơn hàng hôm nay (215): Biểu đồ sóng mềm mại (wave sparkline) kèm phân bổ Đang giao (145), Hoàn thành (68), Hủy (2).
    - Xe đang hoạt động (389): Thống kê theo phân loại xe (Ba gác, Bán tải, Tải nhẹ, Tải nặng) và biểu đồ cột.
    - Tiến độ & ETA dự kiến: Biểu đồ tròn donut tỷ lệ đúng hạn (88%) và độ khớp ETA (94%) kèm nhãn chuẩn "ETA dự kiến (Dữ liệu mô phỏng)".
    - Sức khỏe dịch vụ: Biểu đồ cột đôi so sánh trạng thái Liveness UP và Readiness READY giữa các dịch vụ hệ thống.
    - Doanh thu & đối soát: Biểu đồ dải màu diện tích (area chart) theo dõi dòng tiền và đối soát VietQR pilot.
    - Báo cáo mới: Danh sách tài liệu ca trực kèm liên kết xuất PDF/CSV.
  - **Sổ đơn cập nhật gần đây:** Bảng dữ liệu `DataTable` có server pagination, responsive hàng cho mobile và audited commands.
- `/admin/orders`: table có server pagination, filters, sort và clear filters.
- `/admin/orders/:id`: route, status history, tracking, media, payment và audited commands.
- `/admin/users`, `/admin/fleets`, `/admin/drivers`: search/filter, status và chi tiết cần thiết.

## Map/ETA copy

Luôn dùng nhãn “ETA dự kiến”. Khi source `DEMO`, hiển thị “Dữ liệu mô phỏng” cạnh ETA, không dùng tooltip để che thông tin này.
