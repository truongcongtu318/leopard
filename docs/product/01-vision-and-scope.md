# Tầm nhìn và phạm vi

## Tầm nhìn

LEOPARD là nền tảng kết nối vận chuyển hàng hóa quy mô pilot, giúp Customer tạo đơn, Driver nhận và thực hiện chuyến, Fleet Owner giám sát đội tài xế của mình, còn Admin giám sát toàn bộ hoạt động. Sản phẩm hướng tới mức mini-production: đủ ổn định để vận hành với người dùng thật trong phạm vi nhỏ, nhưng chưa cam kết SLA thương mại quy mô lớn.

## Mục tiêu

- Hoàn tất luồng từ tạo đơn đến giao hàng và ghi nhận thanh toán.
- Cung cấp tracking gần thời gian thực và lịch sử vị trí theo đơn.
- Bảo vệ dữ liệu theo role và quyền sở hữu.
- Cho phép chạy demo khi thiếu credential của dịch vụ ngoài.
- Tạo nền UI nhất quán để hạn chế chỉnh sửa vụn về sau.

## Phạm vi sản phẩm

- Customer mobile app/PWA theo mobile-first.
- Driver mobile app/PWA theo mobile-first.
- Fleet Owner Web Dashboard tối giản để quản lý fleet profile, drivers thuộc fleet và orders của fleet.
- Admin Web Dashboard cô đọng, tối ưu cho thao tác vận hành.
- NestJS API, PostgreSQL/PostGIS và Socket.IO gateway.
- Tích hợp Vietmap, Firebase Phone Auth, S3-compatible storage và VietQR/payOS qua provider interface.
- Demo provider có dữ liệu xác định cho môi trường local và demo.

## Tiêu chí thành công pilot

- Người dùng hoàn tất các luồng chính mà không cần can thiệp vào database.
- Không role nào đọc hoặc sửa dữ liệu ngoài quyền được cấp.
- Dữ liệu nghiệp vụ tồn tại sau refresh và restart dịch vụ.
- Các lỗi provider ngoài không làm mất dữ liệu đơn hàng.
- Có log, health check và audit trail đủ để điều tra sự cố pilot.
