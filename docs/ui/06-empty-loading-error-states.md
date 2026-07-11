# UI states

| State | Yêu cầu |
| --- | --- |
| Loading | Skeleton đúng hình dạng, giữ layout, chặn submit lặp |
| Empty | Nói rõ chưa có dữ liệu; có action khi người dùng có thể tạo dữ liệu |
| Error | Message dễ hiểu, requestId khi cần hỗ trợ, retry nếu an toàn |
| Success | Cập nhật dữ liệu nguồn và feedback ngắn, không chỉ dựa vào toast |
| Permission denied | Không hiển thị dữ liệu; dẫn về khu vực hợp lệ |
| Offline | Giữ nội dung đã có, báo trạng thái kết nối và retry |

## Trạng thái đặc thù

- ETA loading: skeleton trong RouteSummary, không hiển thị `0 phút`.
- ETA unavailable: giữ route input, giải thích chưa thể tính và cho retry.
- Demo ETA: hiển thị “Dữ liệu mô phỏng”.
- Tracking disconnected: giữ marker cuối, hiển thị thời điểm cập nhật cuối và trạng thái reconnect.
- Upload retry: giữ file selection khi có thể, hiển thị lỗi type/size trước request.
- Empty Admin filters: phân biệt “chưa có dữ liệu” và “không khớp bộ lọc”.
- Session expired: lưu draft form không nhạy cảm trong session storage rồi đưa về login.

Success state của command phải dựa trên response đã persist; optimistic update chỉ dùng khi có rollback rõ ràng.
