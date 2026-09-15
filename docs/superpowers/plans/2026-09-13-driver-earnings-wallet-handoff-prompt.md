Thực hiện implementation plan sau trong repo D:\leopard (monorepo pnpm/turbo — apps/api NestJS+Prisma, apps/driver Expo, apps/admin Next.js):

- Spec: docs/superpowers/specs/2026-09-13-driver-earnings-wallet-design.md
- Plan: docs/superpowers/plans/2026-09-13-driver-earnings-wallet-plan.md

Đọc cả 2 file trên trước khi bắt đầu. Dùng skill `superpowers:subagent-driven-development` để thực thi plan theo từng task (Task 1 → Task 11), mỗi task một subagent riêng, review hai bước giữa các task theo đúng quy trình của skill đó. Nếu không có skill này, dùng `superpowers:executing-plans` thay thế, thực thi tuần tự có checkpoint sau mỗi task.

Lưu ý bắt buộc:
- Đây là TDD: mỗi task viết test fail trước, implement, rồi mới verify pass — không bỏ qua bước verify.
- Không tự ý đổi các quyết định nghiệp vụ đã chốt trong spec (100% giá cước không chiết khấu, không tip/thưởng, không tự động chuyển khoản — admin duyệt thủ công, số dư tính động không lưu ledger).
- Task 1 có bước tạo Prisma migration (`prisma migrate dev`) cần kết nối DB thật — nếu môi trường không có DB reachable, báo rõ cho người dùng và tiếp tục các task sau (chúng chỉ cần `prisma generate` + `InMemoryPrismaService`, không cần DB thật).
- Một vài bước trong Task 8, 9, 10 yêu cầu tự tìm file bằng `grep` trước khi sửa (đường dẫn route file, cách apps/admin dùng Jest hay Vitest) — đọc file tìm được trước khi áp dụng đoạn code mẫu trong plan, không đoán bừa.
- Sau khi xong tất cả task, chạy Task 11 (cổng verify toàn repo) và báo cáo kết quả cuối cùng: test nào pass/fail, có gì cần người dùng làm thủ công (vd chạy migration khi có DB, hoặc thêm nav-menu entry cho `/admin/withdrawals`).

Commit theo từng task như plan đã ghi, dùng đúng message mẫu trong plan.
