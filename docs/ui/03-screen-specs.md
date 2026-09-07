# Screen specifications

## `/login`

Phone/Firebase flow hoặc demo account selector khi được bật. Có trạng thái submitting, invalid credential, provider unavailable và session expired.

## Customer

- `/customer/orders`: status tabs/filter, order rows, pagination/infinite load có kiểm soát và create action.
- `/customer/orders/new`: pickup, stops, dropoff, vehicle, cargo, route estimate, price và ETA dự kiến. Submit chỉ bật khi estimate token còn hiệu lực.
- `/customer/orders/:id`: status timeline, route/map, Driver/tracking khi được nhận, media, payment và cancel khi hợp lệ.
- `/customer/profile`: số điện thoại, vai trò, trạng thái tài khoản, phiên bản ứng dụng, đăng xuất.

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
