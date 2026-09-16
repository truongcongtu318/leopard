# 05 — Implementation Plan (toàn bộ Admin Web)

> **Mục đích:** Kế hoạch thực thi chi tiết, chạy được cho **tất cả** trang còn thiếu ở [02-gap-analysis.md](./02-gap-analysis.md), theo thứ tự Wave ở [03-roadmap.md](./03-roadmap.md).
>
> **Cách dùng:** Làm tuần tự theo task ID. Mỗi task có: (a) thay đổi backend, (b) thay đổi package dùng chung, (c) thay đổi admin web, (d) test, (e) acceptance. Đánh dấu ô ở [Bảng tiến độ](#bảng-tiến-độ) khi xong.
>
> **Quy trình mỗi task:** Research → viết test (RED) → cài đặt (GREEN) → refactor → code review → `typecheck+lint+test` xanh → commit theo Conventional Commits.

---

## 0. Chuẩn bị & quy ước dùng chung

### 0.1 Nhánh & commit
- Làm trên `feature/admin-web-dev` (đã tách từ `origin/develop`).
- Mỗi task = 1 commit (hoặc nhỏ hơn): `feat(admin): ...`, `feat(api): ...`, `test(admin): ...`.
- PR nhắm `develop`. Không commit trực tiếp `main`/`develop`.

### 0.2 Bản đồ file cần đụng tới

**Backend (`apps/api/src`):**
- `admin/admin.controller.ts` — thêm route `@RequireRoles('ADMIN')`.
- `admin/admin-query.service.ts` — thêm query đọc.
- `admin/admin-command.service.ts` — thêm command có transaction + audit.
- `admin/dto/*.ts` — DTO request.
- `<domain>/*.service.ts` — tái dùng service domain (invoices, promotions, reports, reviews, notifications, dispatch, payments).
- `*.spec.ts` — unit/spec test cạnh file.

**Package dùng chung:**
- `packages/shared/src` — type query/command (`AdminXxxQuery`, `AdminXxxCommand`) + enum.
- `packages/validators/src` — Zod schema cho request.

**Admin web (`apps/admin/src`):**
- `features/admin/port.ts` — thêm capability / `AdminCommandKind`.
- `features/admin/model.ts` — view model `Readonly`.
- `features/admin/adapter.ts` + `runtime.ts` — gọi API + map.
- `features/admin/fixtures.ts` + `preview/scenario.ts` — preview data.
- `features/admin/<Screen>.tsx` — màn hình.
- `app/(admin)/admin/<slug>/page.tsx` — route (Server Component).
- `components/shell/RoleNavigation.tsx` — nav item + icon.
- `lib/auth/role-policy.ts` — guard nếu cần.

### 0.3 Khuôn "thêm 1 trang đọc" (dùng lại cho A1, A2, B1, B3, D*)
1. `shared`: thêm `AdminXxxQuery` (+ type item response).
2. `validators`: Zod schema cho query.
3. `api`: `GET admin/xxx` trong `admin.controller.ts` → `admin-query.service.ts` (gọi service domain), spec test.
4. `admin`: capability `readXxx` trong `port.ts`; view model trong `model.ts`; `adapter.ts` map; `fixtures.ts`; `page.tsx`; nav; test.
5. Verify + commit.

### 0.4 Khuôn "thêm 1 command có audit" (dùng cho A3, B1-ẩn, B2, C1, C2, C3, C4)
1. `admin-command.service.ts`: hàm mới trong **transaction** (`prisma.$transaction`), ghi `audit` (actor–action–reason–requestId), hỗ trợ `clientRequestId` (idempotency) khi là hành động tiền/ gửi.
2. `port.ts`: thêm `AdminCommandKind` mới; UI gọi `executeAuditedCommand` với `contextVersion`.
3. Xử lý `state: 'conflict'` khi `contextVersion` lệch.
4. Hành động outward-facing (gửi email/thông báo, publish, payout) → **modal xác nhận trước khi thực thi**.
5. Spec test cho command (success + conflict + audit ghi đúng).

### 0.5 Cổng verify (bắt buộc trước khi đánh dấu Done)
```bash
pnpm --filter web typecheck && pnpm --filter web lint && pnpm --filter web test
pnpm --filter api typecheck && pnpm --filter api lint && pnpm --filter api test
```
- Coverage ≥ 80% cho code mới.
- Kiểm thị giác qua `pnpm --filter web dev:preview`.

---

## Wave 1 — Tài chính, Payouts, Audit

### `ADM-W1-T01` — ADR đối chiếu Withdrawals vs Payouts
- **Backend:** đọc kỹ `admin/admin-withdrawal-review.service.ts` (bảng `withdrawalRequest`) và `drivers/wallet.controller.ts` (`admin/payouts/:id/approve|reject`) + service của nó. Xác định 2 luồng có trùng entity không.
- **Sản phẩm:** `docs/architecture/adr/ADR-00xx-withdrawals-vs-payouts.md` — quyết định: **hợp nhất** (một luồng, deprecate cái còn lại) hoặc **tách bạch** (định nghĩa rõ mỗi cái phục vụ ai). Ghi hệ quả cho `/admin/withdrawals` và `/admin/payouts`.
- **Acceptance:** ADR có "Decision" rõ ràng; các task T03/T06 tham chiếu được.

### `ADM-W1-T02` — Backend `GET admin/payments`
- **shared:** `AdminPaymentQuery { page, pageSize, status?, source?, from?, to?, q? }`; type item.
- **validators:** Zod cho query.
- **api:** route trong `admin.controller.ts`; `admin-query.service.ts.getPayments()` gộp từ `payments` (join order). Spec test list + lọc + phân trang.
- **Acceptance:** trả list phân trang, lọc theo `PaymentStatus`; guard `ADMIN`; test xanh.

### `ADM-W1-T03` — Trang `/admin/payments`
- **admin:** capability `readPayments` (port); view model danh sách + item (tái dùng `PaymentStatus`); adapter map; fixtures; `app/(admin)/admin/payments/page.tsx`; nav item + icon; xác nhận thủ công tái dùng lệnh `CONFIRM_MANUAL_PAYMENT` (đã có).
- **Test:** model/adapter/screen + trạng thái empty/lỗi.
- **Acceptance:** danh sách giao dịch, lọc, link tới đơn, xác nhận thủ công có audit; preview chạy.

### `ADM-W1-T04` — Backend `GET admin/invoices`
- **shared/validators:** `AdminInvoiceQuery { page, pageSize, status?, from?, to?, q? }`.
- **api:** route + `getInvoices()` (tái dùng `invoices` service; gắn cờ "thiếu email nhận hóa đơn"). Spec test.
- **Acceptance:** list + lọc; guard `ADMIN`.

### `ADM-W1-T05` — Trang `/admin/invoices`
- **admin:** capability `readInvoices`; view model; adapter; fixtures; route `admin/invoices/page.tsx`; nav.
- **Hành động:** tải PDF (link `invoices/:id/download`), **gửi lại email** (`POST invoices/:id/send`) → xác nhận trước khi gửi.
- **Test + Acceptance:** danh sách, cảnh báo thiếu email, gửi lại có xác nhận; preview.

### `ADM-W1-T06` — Trang `/admin/payouts`
- **Điều kiện:** theo quyết định `ADM-W1-T01`. Nếu tách bạch → trang riêng; nếu hợp nhất → gộp tab vào `/admin/withdrawals` (bỏ task này, ghi chú vào bảng tiến độ).
- **admin:** capability `readPayouts`; command approve/reject qua `admin/payouts/:id/...` với `note` + `clientRequestId`.
- **Acceptance:** approve/reject idempotent + audit; test conflict/idempotency.

### `ADM-W1-T07` — Backend `GET admin/audit`
- **shared/validators:** `AdminAuditQuery { page, pageSize, actorId?, action?, targetId?, from?, to? }`.
- **api:** route + `getAuditEntries()` (đọc `audit` module). Spec test lọc.
- **Acceptance:** list + lọc; guard `ADMIN`.

### `ADM-W1-T08` — Trang `/admin/audit`
- **admin:** capability `readAudit`; **tái dùng** `AdminAuditEntryView` đã có trong `model.ts`; adapter; fixtures; route; nav.
- **Test + Acceptance:** tra cứu actor/action/thời gian; preview.

---

## Wave 2 — Promotions, Reports, Reviews, Dispatch

### `ADM-W2-T01` — Backend CRUD `admin/promotions`
- **DB:** kiểm tra model `PromotionVoucher` trong Prisma; thêm migration nếu cần trường quản trị (trạng thái active, hiệu lực, giới hạn dùng).
- **shared/validators:** `AdminPromotionCreate/Update` + Zod.
- **api:** `GET/POST/PATCH admin/promotions` (bật/tắt = command audit). Tái dùng `promotions.service` cho đọc; thêm ghi. Spec test CRUD + validate trùng mã.
- **Acceptance:** tạo/sửa/bật-tắt có audit; guard `ADMIN`.

### `ADM-W2-T02` — Trang `/admin/promotions`
- **admin:** capability `readPromotions` + `AdminCommandKind` cho tạo/sửa/bật-tắt; view model; adapter; fixtures; route; nav; form tạo/sửa (React Hook Form + Zod).
- **Test + Acceptance:** list + form validate hiệu lực/giới hạn; bật-tắt có xác nhận; preview.

### `ADM-W2-T03` — Backend `GET admin/reports` + command xử lý
- **shared/validators:** `AdminReportQuery` + `AdminResolveReportCommand`.
- **api:** `GET admin/reports` (mở khỏi giới hạn `CUSTOMER` hiện tại — thêm route admin, **không** đổi route customer); command đóng/xử lý report trong `admin-command.service.ts` (transaction + audit). Spec test.
- **Acceptance:** admin xem được toàn bộ report; xử lý có audit.

### `ADM-W2-T04` — Trang `/admin/reports`
- **admin:** capability `readReports` + command; hàng đợi khiếu nại; liên kết đơn/khách/tài xế.
- **Test + Acceptance:** gán trạng thái, đóng report; preview.

### `ADM-W2-T05` — Backend `GET admin/reviews` (+ command ẩn)
- **shared/validators:** `AdminReviewQuery` (lọc điểm/tài xế/đơn); command `HIDE_REVIEW` nếu cần kiểm duyệt.
- **api:** route + service; spec test.
- **Acceptance:** list + lọc điểm thấp; guard `ADMIN`.

### `ADM-W2-T06` — Trang `/admin/reviews`
- **admin:** capability `readReviews`; view model; adapter; fixtures; route; nav.
- **Test + Acceptance:** lọc điểm thấp, xem theo tài xế; (nếu có) ẩn review có audit; preview.

### `ADM-W2-T07` — Backend phơi trạng thái dispatch + gán thủ công
- **api:** thêm `dispatch.controller.ts` (`@RequireRoles('ADMIN')`): `GET admin/dispatch` (đơn chờ ghép + trạng thái offer từ `dispatch.service`), `POST admin/dispatch/:orderId/assign` (gán tài xế thủ công, transaction + audit). Spec test.
- **Acceptance:** phơi hàng đợi; gán thủ công cập nhật đúng order; audit ghi.

### `ADM-W2-T08` — Trang `/admin/dispatch`
- **admin:** capability `readDispatch` + command gán; realtime qua socket (tái dùng `useOrderTrackingSocket` pattern); view model; adapter; fixtures; route; nav.
- **Test + Acceptance:** hàng đợi + trạng thái offer + gán thủ công; preview.

---

## Wave 3 — Broadcast, Pricing, Live-map, Settings, Support

### `ADM-W3-T01` — Backend `POST admin/notifications/broadcast`
- **shared/validators:** `AdminBroadcastCommand { audience: 'ALL'|'CUSTOMER'|'DRIVER'|'FLEET_OWNER', title, body, clientRequestId }`.
- **api:** route admin (tách khỏi `notifications.controller` end-user hoặc thêm controller admin); dùng `notifications.service.create()` + FCM sender; transaction + audit. Spec test.
- **Acceptance:** gửi theo nhóm; idempotent; audit.

### `ADM-W3-T02` — Trang `/admin/notifications`
- **admin:** capability + command broadcast; soạn thông báo; chọn đối tượng; lịch sử gửi.
- **Bắt buộc:** **modal xác nhận trước khi gửi** (outward-facing).
- **Test + Acceptance:** soạn + xác nhận + lịch sử; preview.

### `ADM-W3-T03` — Backend cấu hình giá `admin/pricing`
- **DB:** model cấu hình giá (loại xe, đơn giá/khoảng cách, phụ phí bốc xếp) + migration.
- **api:** `GET/PUT admin/pricing` (transaction + audit); spec test. Đảm bảo pricing logic đọc từ cấu hình thay vì hardcode.
- **Acceptance:** đọc/ghi cấu hình có audit; giá đơn phản ánh cấu hình.

### `ADM-W3-T04` — Trang `/admin/pricing`
- **admin:** capability + command cập nhật; bảng giá theo loại xe; form.
- **Test + Acceptance:** sửa giá có xác nhận + audit; preview.

### `ADM-W3-T05` — Trang `/admin/live-map` (full-page)
- **admin:** tái dùng `BentoMapCard`/tracking socket ở bố cục full-page; nhãn "ETA dự kiến"; nav.
- **Acceptance:** realtime vị trí tài xế/đơn; preview.

### `ADM-W3-T06` — Trang `/admin/settings`
- **api (nếu cần):** `GET admin/settings/providers` phơi trạng thái provider + cờ `ALLOW_DEMO_PROVIDER`.
- **admin:** hiển thị trạng thái maps/OTP/payment; nhãn "Dữ liệu mô phỏng" khi demo.
- **Acceptance:** hiển thị đúng trạng thái; preview.

### `ADM-W3-T07` — Trang `/admin/support`
- **admin:** mặt admin cho `chat` module; view model; adapter; route; nav.
- **Test + Acceptance:** xem hội thoại hỗ trợ; preview.

---

## Rủi ro & lưu ý

- **Idempotency:** mọi command đụng tiền/gửi (payments, payouts, broadcast) phải nhận `clientRequestId`.
- **Xung đột:** UI luôn gửi `contextVersion`; xử lý `state: 'conflict'` bằng cách reload + báo người dùng.
- **Authorization:** không nới quyền customer/fleet-owner khi thêm route admin — thêm route mới, không sửa route cũ.
- **Migration:** T-C1/T-C4 có thể cần migration Prisma → chạy `pnpm db:migrate:test` và cập nhật seed.
- **Nhãn bắt buộc:** "ETA dự kiến" và "Dữ liệu mô phỏng" xuất hiện đúng chỗ.

## Bảng tiến độ

| Task | Trang/BE | Trạng thái |
|------|----------|-----------|
| ADM-W1-T01 | ADR withdrawals/payouts | ☑️ (Hoàn thành ADR-0001) |
| ADM-W1-T02 | BE admin/payments | ☑️ (Hoàn thành) |
| ADM-W1-T03 | /admin/payments | ☑️ (Hoàn thành) |
| ADM-W1-T04 | BE admin/invoices | ☑️ (Hoàn thành) |
| ADM-W1-T05 | /admin/invoices | ☑️ (Hoàn thành) |
| ADM-W1-T06 | /admin/payouts | ⮑ Hợp nhất vào /admin/withdrawals (ADR-0001) |
| ADM-W1-T07 | BE admin/audit | ☑️ (Hoàn thành) |
| ADM-W1-T08 | /admin/audit | ☑️ (Hoàn thành) |
| ADM-W2-T01 | BE admin/promotions | ☑️ (Hoàn thành) |
| ADM-W2-T02 | /admin/promotions | ☑️ (Hoàn thành) |
| ADM-W2-T03 | BE admin/reports | ☑️ (Hoàn thành) |
| ADM-W2-T04 | /admin/reports | ☑️ (Hoàn thành) |
| ADM-W2-T05 | BE admin/reviews | ☑️ (Hoàn thành) |
| ADM-W2-T06 | /admin/reviews | ☑️ (Hoàn thành) |
| ADM-W2-T07 | BE admin/dispatch | ☑️ (Hoàn thành) |
| ADM-W2-T08 | /admin/dispatch | ☑️ (Hoàn thành) |
| ADM-W3-T01 | BE admin/notifications broadcast | ☑️ (Hoàn thành) |
| ADM-W3-T02 | /admin/notifications | ☑️ (Hoàn thành) |
| ADM-W3-T03 | BE admin/pricing | ☑️ (Hoàn thành) |
| ADM-W3-T04 | /admin/pricing | ☑️ (Hoàn thành) |
| ADM-W3-T05 | /admin/live-map | ☑️ (Hoàn thành) |
| ADM-W3-T06 | /admin/settings | ☑️ (Hoàn thành) |
| ADM-W3-T07 | /admin/support | ☑️ (Hoàn thành) |
