# Nguyên tắc UI

LEOPARD là sản phẩm vận hành logistics, không phải landing page. UI ưu tiên tốc độ thao tác, khả năng quét thông tin, trạng thái rõ và giảm lỗi nhập liệu.

## Nguyên tắc

- Customer và Driver theo mobile-first; primary action nằm trong vùng dễ chạm.
- Admin / Fleet Owner áp dụng phong cách **Modern Dispatch Console**:
  - Tông nền pastel dịu mắt, thẻ nổi bo cong mềm mại (16–26px) với đổ bóng êm nhẹ, tạo không gian làm việc trực quan và giảm căng thẳng thị giác cho ca trực dài.
  - Tích hợp thanh Dock icon bên trái, Topbar điều hướng thông minh và Bản đồ theo dõi real-time trung tâm.
  - Trực quan hóa số liệu vận hành bằng biểu đồ đồ thị (wave chart, bar chart, donut chart, area chart).
- Chỉ backend quyết định giá, lifecycle và permission; UI phản ánh trung thực response từ hệ thống.
- Dùng icon quen thuộc cho thao tác công cụ, kèm tooltip khi nghĩa chưa rõ.
- Không dùng các hiệu ứng landing page rườm rà (gradient neon tối, decorative hero); ưu tiên tính rõ ràng, thẩm mỹ hiện đại và trải nghiệm vận hành cao cấp.
- Không dùng màu là tín hiệu duy nhất; status luôn có text/icon phù hợp.
- Thông báo lỗi nói rõ vấn đề và hành động tiếp theo, không lộ chi tiết kỹ thuật.

## Thứ tự ưu tiên màn hình

1. Current task/action.
2. Order status và route summary.
3. Thông tin đối tác cần thiết cho chuyến.
4. Tracking/map.
5. Metadata và lịch sử.

Mọi màn hình chính phải triển khai state trong `docs/ui/06-empty-loading-error-states.md` trước khi được xem là hoàn tất.
