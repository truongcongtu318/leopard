# Code review checklist

## Correctness

- Behavior khớp acceptance criteria và lifecycle.
- Concurrency, idempotency và failure path được xử lý ở command quan trọng.
- API/data enum nhất quán, không có business rule chỉ ở frontend.

## Security

- Endpoint kiểm tra authentication, role và ownership.
- Input, upload và query filter có allow-list/limit.
- Log và response không lộ secret hoặc dữ liệu riêng tư.

## Maintainability

- Thay đổi nằm đúng module và không tạo abstraction chưa cần thiết.
- Provider ngoài đi qua interface.
- Migration, config và docs đi cùng code khi cần.

## UI

- Responsive ở viewport chuẩn, không overlap/tràn chữ.
- Keyboard, focus, label, contrast và UI states đầy đủ.
- ETA demo và trạng thái provider được ghi rõ.

## Verification

- Reviewer xem kết quả test/build và manual evidence phù hợp.
- Diff không chứa file sinh ra, secret hoặc thay đổi không liên quan.
