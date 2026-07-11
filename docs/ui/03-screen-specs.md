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

## Admin

- `/admin`: KPI vận hành, số đơn theo status, lỗi cần chú ý và recent orders.
- `/admin/orders`: table có server pagination, filters, sort và clear filters.
- `/admin/orders/:id`: route, status history, tracking, media, payment và audited commands.
- `/admin/users`, `/admin/drivers`: search/filter, status và chi tiết cần thiết.

## Map/ETA copy

Luôn dùng nhãn “ETA dự kiến”. Khi source `DEMO`, hiển thị “Dữ liệu mô phỏng” cạnh ETA, không dùng tooltip để che thông tin này.
