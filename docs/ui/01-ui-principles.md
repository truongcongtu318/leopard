# Nguyên tắc UI

LEOPARD là sản phẩm vận hành logistics, không phải landing page. UI ưu tiên tốc độ thao tác, khả năng quét thông tin, trạng thái rõ và giảm lỗi nhập liệu.

## Nguyên tắc

- Customer và Driver theo mobile-first; primary action nằm trong vùng dễ chạm.
- Admin dùng mật độ thông tin cao vừa phải, table/filter ổn định và không lồng card.
- Chỉ backend quyết định giá, lifecycle và permission; UI phản ánh response.
- Dùng icon quen thuộc cho thao tác công cụ, kèm tooltip khi nghĩa chưa rõ.
- Không dùng gradient tím, glassmorphism, decorative hero hoặc marketing cards.
- Không dùng màu là tín hiệu duy nhất; status luôn có text/icon phù hợp.
- Thông báo lỗi nói rõ vấn đề và hành động tiếp theo, không lộ chi tiết kỹ thuật.

## Thứ tự ưu tiên màn hình

1. Current task/action.
2. Order status và route summary.
3. Thông tin đối tác cần thiết cho chuyến.
4. Tracking/map.
5. Metadata và lịch sử.

Mọi màn hình chính phải triển khai state trong `docs/ui/06-empty-loading-error-states.md` trước khi được xem là hoàn tất.
