# UAT checklist

## Chuẩn bị

- Staging dùng build candidate, migration mới nhất và seed/UAT accounts.
- Provider mode hiển thị rõ; không nhầm demo data với dữ liệu thật.
- Người test có tài khoản Customer, Driver và Admin riêng.

## Kịch bản

- Customer đăng nhập, tạo đơn 0 stop và 3 stops, xem giá/ETA, kiểm tra validation.
- Driver nhận đơn, kiểm tra xung đột, cập nhật lifecycle và tracking.
- Customer xem tracking, hủy đơn `REQUESTED` và không hủy được đơn đã nhận.
- Driver upload delivery proof và hoàn tất giao hàng.
- Customer tạo QR; Admin xác nhận manual có note.
- Admin lọc dữ liệu, vô hiệu hóa user test và xem audit.
- Kiểm tra loading/empty/error/offline và mobile layout.

## Kết quả

Mỗi case ghi Pass/Fail, tester, thời gian, environment, evidence và issue ID. Pilot chỉ phát hành khi toàn bộ P0 pass và P1 có quyết định chấp nhận rủi ro bằng văn bản.
