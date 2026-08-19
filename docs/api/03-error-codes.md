# Error codes

## Error envelope

```json
{
  "error": {
    "code": "ORDER_INVALID_TRANSITION",
    "message": "Không thể chuyển trạng thái đơn hàng.",
    "details": {"current":"REQUESTED","requested":"DELIVERED"},
    "requestId": "uuid"
  }
}
```

`message` có thể hiển thị cho người dùng; `details` không chứa secret hoặc stack trace.

| HTTP | Code | Trường hợp |
| --- | --- | --- |
| 400 | `REQUEST_INVALID` | JSON/query không hợp lệ |
| 401 | `AUTH_REQUIRED` | Thiếu hoặc sai token |
| 401 | `SESSION_EXPIRED` | Refresh session hết hạn/thu hồi |
| 403 | `FORBIDDEN` | Sai role hoặc ownership |
| 404 | `RESOURCE_NOT_FOUND` | Resource không tồn tại hoặc cần che quyền |
| 409 | `ORDER_ALREADY_ASSIGNED` | Driver khác đã nhận |
| 409 | `ORDER_INVALID_TRANSITION` | Lifecycle không hợp lệ |
| 409 | `DRIVER_HAS_ACTIVE_ORDER` | Driver đã có đơn active |
| 403 | `TRACKING_FORBIDDEN` | Actor không được gửi hoặc xem tracking của order |
| 400 | `TRACKING_INVALID_POINT` | Point, UUID, tọa độ hoặc `capturedAt` không hợp lệ |
| 429 | `TRACKING_RATE_LIMITED` | Driver gửi tracking point vượt giới hạn |
| 409 | `TRACKING_ORDER_INACTIVE` | Order không ở trạng thái cho phép tracking |
| 409 | `TRACKING_POINT_CONFLICT` | Cùng `clientPointId` nhưng payload khác persisted point |
| 415 | `MEDIA_INVALID_FILE` | MIME, extension hoặc magic bytes của file không hợp lệ |
| 413 | `MEDIA_TOO_LARGE` | Media upload vượt giới hạn 10 MB |
| 409 | `MEDIA_REQUEST_CONFLICT` | Upload request ID đã dùng cho request không tương đương |
| 409 | `PAYMENT_INTENT_EXISTS` | Đã có intent active |
| 409 | `PAYMENT_REQUEST_CONFLICT` | Payment request ID đã dùng cho request không tương đương |
| 409 | `PAYMENT_CONFIRMATION_CONFLICT` | Confirmation request ID đã dùng cho confirmation không tương đương |
| 422 | `VALIDATION_FAILED` | Dữ liệu nghiệp vụ không hợp lệ |
| 429 | `RATE_LIMITED` | Vượt giới hạn |
| 502 | `PROVIDER_UNAVAILABLE` | Provider ngoài lỗi và không fallback |
| 503 | `SERVICE_NOT_READY` | Readiness thất bại |

Các code Wave 3 ổn định cho transport consumer là: `TRACKING_FORBIDDEN`, `TRACKING_INVALID_POINT`, `TRACKING_RATE_LIMITED`, `TRACKING_ORDER_INACTIVE`, `TRACKING_POINT_CONFLICT`, `MEDIA_INVALID_FILE`, `MEDIA_TOO_LARGE`, `MEDIA_REQUEST_CONFLICT`, `PAYMENT_INTENT_EXISTS`, `PAYMENT_REQUEST_CONFLICT`, `PAYMENT_CONFIRMATION_CONFLICT`, `PROVIDER_UNAVAILABLE`.
