# Thiết kế realtime tracking

## Kết nối

Socket.IO namespace mặc định `/tracking`. Client gửi access token trong handshake auth. Gateway từ chối token hết hạn hoặc account bị vô hiệu hóa.

## Room và quyền

Room có dạng `order:{orderId}`. Customer owner, assigned Driver và Admin được join. Quyền được kiểm tra lại ở mỗi join và mỗi point; leave không cần quyền.

## Data flow

1. Driver gửi `tracking:send-point` với `clientPointId`.
2. Gateway validate assignment, order active, tọa độ và rate limit.
3. Service insert point; unique `(orderId, clientPointId)` bảo đảm idempotency.
4. Gateway emit `tracking:point-updated` tới room.
5. Client cập nhật marker nhưng không thay đổi dữ liệu lịch sử cục bộ nếu event cũ hơn point hiện tại.

## Reliability

- Tần suất mục tiêu 5-15 giây; server tối đa 1 point/2 giây/Driver.
- Client giữ tối đa 20 point khi offline và ưu tiên gửi point mới nhất.
- REST `GET /orders/:id/tracking` là fallback và hỗ trợ `after` timestamp.
- Point ngoài khoảng latitude/longitude hoặc `capturedAt` lệch quá 10 phút bị từ chối.

## Privacy và retention

Chỉ lưu tracking trong thời gian đơn active và lịch sử pilot theo chính sách 90 ngày. Không cung cấp endpoint theo dõi Driver ngoài phạm vi order.
