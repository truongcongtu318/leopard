# Non-functional requirements

| ID | Nhóm | Yêu cầu pilot |
| --- | --- | --- |
| NFR-01 | Performance | P95 API đọc/ghi thông thường dưới 800 ms, không tính provider ngoài |
| NFR-02 | Realtime | Tracking event đến subscriber trong 3 giây ở điều kiện mạng bình thường |
| NFR-03 | Availability | Có health checks và restart policy; không cam kết SLA thương mại |
| NFR-04 | Security | TLS ngoài local, password/secret không vào log, authorization phía API |
| NFR-05 | Privacy | Chỉ actor có quyền mới xem địa chỉ, số điện thoại và tracking |
| NFR-06 | Reliability | Accept order và status transition dùng transaction/idempotency phù hợp |
| NFR-07 | Auditability | Hành động Admin nhạy cảm và mọi status transition có dấu vết |
| NFR-08 | Maintainability | TypeScript strict, module boundary rõ, provider ngoài qua interface |
| NFR-09 | Accessibility | Keyboard usable, focus visible, label rõ, contrast tối thiểu WCAG AA |
| NFR-10 | Responsive | Customer/Driver từ 360 px; Admin hỗ trợ từ 1024 px, có fallback tablet |
| NFR-11 | Observability | Structured log có requestId, actorId khi có và error code ổn định |
| NFR-12 | Recovery | Backup database hằng ngày ở staging pilot; kiểm tra restore trước UAT |

Các chỉ tiêu được đo ở staging với seed data chuẩn. Provider latency được ghi riêng để tránh che khuất hiệu năng nội bộ.
