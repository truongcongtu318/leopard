Thực hiện implementation plan sau trong repo D:\leopard (monorepo pnpm/turbo — apps/api NestJS+Prisma, apps/driver Expo/React Native):

- Spec: docs/superpowers/specs/2026-09-13-driver-order-loop-fix-design.md
- Plan: docs/superpowers/plans/2026-09-13-driver-order-loop-fix-plan.md

Đọc cả 2 file trên trước khi bắt đầu. Dùng skill `superpowers:subagent-driven-development` để thực thi plan theo từng task (Task 1 → Task 6), mỗi task một subagent riêng, review hai bước giữa các task theo đúng quy trình của skill đó. Nếu không có skill này, dùng `superpowers:executing-plans` thay thế, thực thi tuần tự có checkpoint sau mỗi task.

Bối cảnh ngắn gọn: đây là 5 lỗi có thật được phát hiện qua audit trực tiếp code (không phải tính năng mới) trong luồng nhận đơn → giao hàng → nhận đơn tiếp theo của driver — tài xế giao xong đơn bị kẹt ở màn chi tiết, danh sách đơn không tự làm mới, idle-ping không tự chạy lại; cộng thêm dispatch bỏ qua loại xe khi mời đơn, accept-order không idempotent, và nút "xem đơn khác" ở màn xung đột không có tác dụng. Mỗi task chỉ sửa đúng 1 điểm gọi hàm đang thiếu, dùng lại cơ chế đã có sẵn trong code (React Query invalidateQueries, prop `onResolveConflict` đã render sẵn, cột `clientRequestId` đã có sẵn trong schema Prisma).

Lưu ý bắt buộc:
- Đây là TDD: mỗi task viết test fail trước, implement, rồi mới verify pass — không bỏ qua bước verify.
- Task 2 (accept-order idempotent) không cần migration Prisma mới — cột `clientRequestId` và unique constraint `@@unique([orderId, actorId, clientRequestId])` đã tồn tại sẵn trên model `OrderStatusHistory` (đã xác nhận trong schema.prisma), và `InMemoryPrismaService` (apps/api/test/prisma-mock.ts) đã hỗ trợ đầy đủ `orderStatusHistory.findFirst`/`create` lọc theo `clientRequestId` — không cần sửa file mock này.
- Task 2, Task 4 trong plan có đưa sẵn code test cụ thể dựa trên cấu trúc thật của `accept-order.service.spec.ts` và `DriverOrdersListRuntime.test.tsx` (đã đọc trực tiếp 2 file này khi viết plan) — dùng đúng các fixture/mock đã có (`CONTENT_VIEW`, `SAMPLE_OFFER`, `renderWithClient`, `driverActor`, các mock `prisma.*`), không tự bịa tên mock mới.
- Ràng buộc toàn cục ghi trong plan (mục "Global Constraints") phải giữ nguyên: request accept-order không kèm `clientRequestId` phải chạy y hệt hành vi hiện tại; Task 3 chỉ được điều hướng/invalidate khi trạng thái là `DELIVERED` hoặc `RETURNED`, tuyệt đối không được kích hoạt ở các bước chuyển trạng thái khác (vd ACCEPTED → PICKING_UP); không đụng vào logic của `useDriverIdlePing.ts`.
- Toàn bộ test suite hiện có (backend + driver mobile) phải xanh sau mỗi task — đây là plan sửa lỗi trên code đang chạy thật, không được gây regression.
- Task 6 (cổng verify cuối) có loại trừ tạm 2 bộ e2e suite không liên quan (`customer-orders`, `admin-command`) vì từng bị timeout do cần kết nối Postgres thật trong môi trường sandbox trước đây — nếu môi trường thực thi lần này có DB reachable, hãy chạy luôn cả 2 bộ đó để chắc chắn không có regression, thay vì loại trừ theo mặc định.

Sau khi xong tất cả task, chạy Task 6 (cổng verify) và báo cáo kết quả cuối cùng: test nào pass/fail, phần smoke-test thủ công (bước 3 của Task 6) cần người dùng tự làm trên thiết bị thật vì cần backend dev + app driver chạy song song.

Commit theo từng task như plan đã ghi, dùng đúng message mẫu trong plan.
