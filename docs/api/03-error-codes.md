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
| 409 | `PAYMENT_INTENT_EXISTS` | Đã có intent active |
| 413 | `FILE_TOO_LARGE` | File trên 10 MB |
| 415 | `FILE_TYPE_UNSUPPORTED` | Sai MIME/type |
| 422 | `VALIDATION_FAILED` | Dữ liệu nghiệp vụ không hợp lệ |
| 429 | `RATE_LIMITED` | Vượt giới hạn |
| 502 | `PROVIDER_UNAVAILABLE` | Provider ngoài lỗi và không fallback |
| 503 | `SERVICE_NOT_READY` | Readiness thất bại |
