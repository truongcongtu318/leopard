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
