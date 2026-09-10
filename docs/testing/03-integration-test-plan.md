# Integration test plan

| ID | Scenario | Kết quả bắt buộc |
| --- | --- | --- |
| IT-AUTH | Login, refresh rotate, logout | Session cũ bị thu hồi đúng |
| IT-ORDER | Create/list/detail | Persist route snapshot và ownership scope |
| IT-ACCEPT | Hai Driver accept đồng thời | Một success, một conflict |
| IT-STATE | Status transition | Order và history commit atomically |
| IT-MAP | Provider selection/failure | Đúng provider, timeout và fallback policy |
| IT-SOCKET | Join/send/broadcast | Permission đúng, persist trước emit |
| IT-UPLOAD | Local/S3 fake | Metadata đúng, invalid file không được lưu |
| IT-PAYMENT | QR/manual confirm | Idempotency và audit trong transaction |
| IT-ADMIN | Filters/pagination | Không leak data, total chính xác |
| IT-HEALTH | Database/config state | Live/ready phản ánh đúng dependency |

Mỗi test chạy với database riêng đã migrate. Cleanup bằng transaction hoặc reset schema, không phụ thuộc thứ tự test.
