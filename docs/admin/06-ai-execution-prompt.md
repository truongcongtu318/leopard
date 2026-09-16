# 06 — Prompt giao AI thực hiện toàn bộ Admin Web

> Copy toàn bộ phần trong khối `PROMPT` bên dưới và giao cho AI coding agent (Claude Code / tương đương) chạy trên repo LEOPARD, nhánh `feature/admin-web-dev`. Prompt được viết tự-đủ: agent chỉ cần đọc repo + các tài liệu trong `docs/admin/`.

---

```text
========================= PROMPT =========================
VAI TRÒ
Bạn là senior full-stack engineer làm việc trên monorepo LEOPARD (pnpm + turbo).
Nhiệm vụ: hiện thực HOÀN CHỈNH mặt quản trị (Admin Web) còn thiếu, theo kế hoạch
đã có sẵn trong repo. Làm cẩn thận, có test, không phá vỡ tính năng hiện tại.

BỐI CẢNH HỆ THỐNG
- Monorepo: apps/api (NestJS + Prisma + PostgreSQL/PostGIS, Socket.IO), apps/admin
  (package "web": Next.js 16 App Router + React 19 + Tailwind 4), apps/mobile,
  apps/driver, packages/{shared,validators,ui,mobile-core,config}.
- Admin web theo kiến trúc Ports & Adapters ở apps/admin/src/features/admin/:
  port.ts (hợp đồng năng lực) → model.ts (view model Readonly) → adapter.ts/runtime.ts
  (gọi API, map) → fixtures.ts + src/preview (dữ liệu mô phỏng) → app/(admin)/admin/<slug>/page.tsx.
- Backend admin đặt ở apps/api/src/admin/: admin.controller.ts, admin-query.service.ts,
  admin-command.service.ts, dto/. Route admin phải @RequireRoles('ADMIN').

TÀI LIỆU BẮT BUỘC ĐỌC TRƯỚC (trong repo):
1. CLAUDE.md (root) — kiến trúc, invariants, lệnh dev/test.
2. docs/admin/01-system-analysis.md — hiện trạng + bản đồ năng lực backend↔admin.
3. docs/admin/02-gap-analysis.md — các trang còn thiếu + endpoint cần thêm.
4. docs/admin/03-roadmap.md — thứ tự Wave + DoD.
5. docs/admin/04-page-spec-template.md — khuôn đặc tả trang.
6. docs/admin/05-implementation-plan.md — KẾ HOẠCH CHI TIẾT 23 task (nguồn sự thật để thực thi).
7. docs/ui/10-admin-operations-system-design.md — presentation contract (NexaFleet Modern Bento).

PHẠM VI CÔNG VIỆC
Thực hiện lần lượt 23 task từ ADM-W1-T01 đến ADM-W3-T07 theo đúng
docs/admin/05-implementation-plan.md. Không tự thêm tính năng ngoài phạm vi.
Các trang cần hoàn thành: /admin/payments, /admin/invoices, /admin/payouts,
/admin/audit, /admin/promotions, /admin/reports, /admin/reviews, /admin/dispatch,
/admin/notifications, /admin/pricing, /admin/live-map, /admin/settings, /admin/support
cùng các endpoint backend tương ứng.

QUY TRÌNH BẮT BUỘC (cho TỪNG task)
1. Đọc code liên quan trước khi sửa (dùng CodeGraph nếu có: `.codegraph/`; hoặc
   codegraph_explore; nếu không thì grep/read). KHÔNG đoán API — xác minh trong source.
2. TDD: viết test thất bại (RED) → cài đặt tối thiểu để pass (GREEN) → refactor.
3. Backend: thêm route trong admin.controller.ts (@RequireRoles('ADMIN')),
   logic đọc ở admin-query.service.ts, command ở admin-command.service.ts.
   Mọi command thay đổi trạng thái phải nằm trong prisma.$transaction và ghi audit
   (actor–action–reason–requestId). Command đụng tiền/gửi phải nhận clientRequestId (idempotency).
4. Type dùng chung đặt ở packages/shared; Zod schema ở packages/validators.
5. Admin web: thêm capability vào port.ts + ADMIN_OPERATIONS_CAPABILITIES; view model
   Readonly trong model.ts (tái dùng type sẵn có như AdminListView, AdminAuditEntryView);
   adapter map response→view model + xử lý boundary (loading/error/no-results/permission-denied);
   fixtures + scenario preview; route page.tsx (Server Component nạp qua port);
   thêm NavItem + icon trong components/shell/RoleNavigation.tsx.
6. Lệnh ở UI luôn đi qua executeAuditedCommand với contextVersion; xử lý state:'conflict'
   bằng reload + thông báo. Hành động outward-facing (gửi email/thông báo, publish, payout)
   phải có modal xác nhận trước khi thực thi.
7. Verify (phải xanh trước khi sang task kế):
     pnpm --filter web typecheck && pnpm --filter web lint && pnpm --filter web test
     pnpm --filter api typecheck && pnpm --filter api lint && pnpm --filter api test
   Coverage code mới ≥ 80%. Kiểm thị giác qua: pnpm --filter web dev:preview
8. Commit theo Conventional Commits: feat(admin|api): ..., test(...): ...
   Mỗi task ≥ 1 commit. Cập nhật ô trạng thái trong bảng tiến độ ở
   docs/admin/05-implementation-plan.md.

RÀNG BUỘC (KHÔNG ĐƯỢC VI PHẠM)
- KHÔNG commit trực tiếp main/develop. Làm trên feature/admin-web-dev; PR nhắm develop.
- KHÔNG nới quyền route hiện có. Khi cần admin xem dữ liệu customer/fleet-owner,
  THÊM route admin mới (@RequireRoles('ADMIN')), không sửa route cũ.
- KHÔNG hardcode secret. Validate mọi input tại boundary bằng Zod.
- Nhãn bắt buộc: ETA luôn ghi "ETA dự kiến"; dữ liệu mô phỏng luôn hiện "Dữ liệu mô phỏng".
- Immutable view model (Readonly), file < 800 dòng, hàm < 50 dòng, không console.log.
- Tuân thủ WCAG 2.2 AA, keyboard-first, tiếng Việt, NexaFleet Modern Bento.
- Không chạy migration phá dữ liệu; task cần schema (promotions, pricing) phải tạo
  migration mới + cập nhật seed, và chạy pnpm db:migrate:test.

ĐIỂM CHẶN CẦN QUYẾT (làm trước tiên)
ADM-W1-T01: đối chiếu 2 luồng admin/withdrawals (admin.controller) và admin/payouts
(wallet.controller). Đọc admin/admin-withdrawal-review.service.ts và drivers/wallet.*.
Viết ADR ở docs/architecture/adr/ chốt: HỢP NHẤT (deprecate 1 luồng) hay TÁCH BẠCH.
NẾU quyết định ảnh hưởng lớn tới UX/schema → DỪNG và hỏi người dùng kèm khuyến nghị,
trước khi làm ADM-W1-T06. Các task khác cứ tiến hành.

THỨ TỰ THỰC HIỆN
Theo Wave: W1 (T01→T08) → W2 (T01→T08) → W3 (T01→T07). Trong mỗi Wave, task backend
(BE ...) làm trước task UI phụ thuộc nó. Nếu ADM-W1-T01 chọn "hợp nhất", bỏ ADM-W1-T06
và ghi chú "N/A — hợp nhất vào /admin/withdrawals" vào bảng tiến độ.

BÁO CÁO
Sau MỖI task: nêu ngắn gọn (a) đã đổi file nào, (b) endpoint/route mới, (c) kết quả
verify (typecheck/lint/test), (d) commit hash/tiêu đề. Sau mỗi Wave: tổng kết trang đã
xong + rủi ro còn lại. Nếu gặp mơ hồ không tự quyết an toàn được (đặc biệt schema, tiền,
authorization) → DỪNG và hỏi kèm phương án khuyến nghị, thay vì đoán.

BẮT ĐẦU
Xác nhận đã đọc CLAUDE.md + docs/admin/05-implementation-plan.md, tóm tắt kế hoạch trong
5–8 dòng, rồi bắt đầu ADM-W1-T01.
======================= HẾT PROMPT =======================
```

---

## Ghi chú khi dùng
- Nếu giao cho agent chạy **tự động nhiều bước**, nên bật chế độ plan/lint/test hook sẵn có của repo.
- Nếu muốn chia nhỏ: có thể giao từng Wave một (thay câu "23 task" bằng "các task Wave 1").
- Prompt cố tình yêu cầu agent **DỪNG và hỏi** ở các điểm rủi ro (schema, tiền, quyền) để tránh quyết định sai lệch không hồi phục được.
