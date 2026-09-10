# Regression checklist

- Login, refresh và logout cho cả bốn role.
- Role/ownership không bị bypass qua URL hoặc API trực tiếp.
- Fleet Owner không xem được dữ liệu ngoài fleet và không có action của Admin/Driver.
- Create order, estimate token, 0-3 stops và persistence.
- Concurrent accept và Driver active-order constraint.
- Toàn bộ lifecycle, cancel rules và status history.
- Tracking permission, reconnect và REST fallback.
- Cargo/delivery upload type, size và signed URL.
- QR creation, duplicate intent và manual confirmation audit.
- Admin filters, pagination và detail views.
- Demo/real provider selection và copy “Dữ liệu mô phỏng”.
- Health checks, structured errors và requestId.
- Viewport 360, 390, 768, 1024 và 1440 không overlap/tràn nội dung.
- Build, migration từ database sạch và seed idempotent.

Checklist được chạy trước pilot release và sau thay đổi auth, order state, schema, provider hoặc shared UI component.
