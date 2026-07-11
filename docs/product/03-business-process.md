# Quy trình nghiệp vụ

## Luồng đơn hàng chính

1. Customer chọn điểm lấy, tối đa ba điểm dừng, điểm giao, loại xe và mô tả hàng.
2. Backend tính route summary, `estimatedDistanceM`, `estimatedDurationS`, `estimatedPrice` và ETA dự kiến.
3. Customer xác nhận; hệ thống tạo đơn ở `REQUESTED`.
4. Driver đang sẵn sàng xem và nhận đơn. Việc nhận đơn dùng transaction để tránh hai Driver cùng nhận.
5. Driver chuyển lần lượt qua `ACCEPTED`, `PICKING_UP`, `IN_TRANSIT`, `DELIVERED`.
6. Khi hoạt động, Driver gửi tracking point; Customer và Admin nhận cập nhật qua Socket.IO.
7. Driver tải ảnh xác nhận trước khi hoàn tất `DELIVERED`.
8. Customer tạo QR thanh toán; Admin có thể xác nhận thủ công khi đã kiểm tra chứng từ.

## Lifecycle

| Trạng thái hiện tại | Trạng thái tiếp theo | Actor |
| --- | --- | --- |
| `REQUESTED` | `ACCEPTED` | Driver |
| `REQUESTED` | `CANCELLED` | Customer, Admin |
| `ACCEPTED` | `PICKING_UP` | Assigned Driver |
| `ACCEPTED` | `CANCELLED` | Admin |
| `PICKING_UP` | `IN_TRANSIT` | Assigned Driver |
| `PICKING_UP` | `CANCELLED` | Admin |
| `IN_TRANSIT` | `DELIVERED` | Assigned Driver |

`DELIVERED` và `CANCELLED` là trạng thái kết thúc. Customer chỉ tự hủy khi đơn còn `REQUESTED`; Admin phải nhập lý do khi hủy sau khi đã có Driver.

## Luồng ngoại lệ

- Map/ETA lỗi: vẫn cho lưu draft phía UI, nhưng không cho submit tới khi có route hợp lệ; demo provider được phép thay thế theo cấu hình.
- Hai Driver cùng nhận: request đến sau nhận `ORDER_ALREADY_ASSIGNED`.
- Mất kết nối tracking: client xếp hàng giới hạn và gửi lại điểm mới nhất khi kết nối lại.
- Upload lỗi: không đổi trạng thái đơn; người dùng có thể thử lại.
- Payment provider lỗi: giữ `UNPAID` hoặc chuyển intent sang `FAILED`, không tự đánh dấu đã trả.
