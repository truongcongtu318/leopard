# E2E test plan

## E2E-LOGIN

Đăng nhập từng role, redirect đúng khu vực, refresh phiên và logout. Truy cập route sai role không hiển thị dữ liệu.

## E2E-CUSTOMER

Customer tạo order có một stop, xem ETA dự kiến/source, submit, refresh trang và thấy order persisted. Customer khác không mở được detail.

## E2E-DRIVER và E2E-DELIVERY

Driver bật available, nhận order, cập nhật lần lượt tới `IN_TRANSIT`, upload delivery proof và hoàn tất `DELIVERED`. Nút/action chỉ hiện theo state hiện tại.

## E2E-TRACKING

Driver gửi point; Customer đang xem detail nhận marker mới. Ngắt kết nối hiển thị last updated và reconnect không nhân bản point.

## E2E-PAYMENT

Customer tạo QR; Admin xác nhận manual có note; Customer thấy `PAID_MANUAL` sau reload và audit tồn tại.

## E2E-ADMIN

Admin lọc orders theo status/date/Driver, mở detail và xem timeline, media, tracking, payment. Pagination giữ filter khi chuyển trang.

Chạy tối thiểu ở desktop Chrome và mobile viewport 390x844; UI quan trọng có screenshot regression khi bộ test được scaffold.
