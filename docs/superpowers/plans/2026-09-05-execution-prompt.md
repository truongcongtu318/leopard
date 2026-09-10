# Prompt thực thi — Driver Contract + Notifications + VAT Invoice

> **Mục đích:** Prompt này giao cho một AI (agent/subagent) thực hiện tuần tự 3 tính năng theo đúng các spec và plan đã duyệt. AI thực thi phải đọc đầy đủ tài liệu dưới đây và tuân thủ các ràng buộc kỹ thuật đã được xác minh trên codebase thực tế.

---

## 1. Nhiệm vụ

Thực hiện 3 subsystem theo đúng thứ tự ưu tiên, mỗi subsystem là một vertical slice độc lập có thể test được:

1. **Driver Contract Signing** — thêm bước ký hợp đồng vào onboarding tài xế (`POST /driver/apply`).
2. **Notifications** — thay màn hình thông báo mock bằng inbox thật (persist + Socket.IO + FCM tùy chọn).
3. **VAT Invoice + Email** — tự sinh invoice PDF sau khi thanh toán `PAID_MANUAL`, gửi link qua email.

**Tuyệt đối không thay đổi code ứng dụng nào khác ngoài phạm vi 3 tính năng này.** Workspace hiện có các thay đổi chưa commit không liên quan — phải giữ nguyên, rebase bước làm việc lên diff thực tế, không revert chúng.

---

## 2. Tài liệu bắt buộc đọc (theo thứ tự)

| Thứ tự | File | Vai trò |
|---|---|---|
| 1 | `docs/superpowers/specs/2026-09-05-driver-contract-signing-design.md` | Spec thiết kế contract |
| 2 | `docs/superpowers/specs/2026-09-05-notifications-design.md` | Spec thiết kế notifications |
| 3 | `docs/superpowers/specs/2026-09-05-vat-invoice-design.md` | Spec thiết kế invoice |
| 4 | `docs/superpowers/plans/2026-09-05-driver-contract-signing-plan.md` | Plan thực thi contract |
| 5 | `docs/superpowers/plans/2026-09-05-notifications-plan.md` | Plan thực thi notifications |
| 6 | `docs/superpowers/plans/2026-09-05-vat-invoice-plan.md` | Plan thực thi invoice |
| 7 | `docs/superpowers/plans/2026-09-05-contract-notifications-invoice-execution-handoff.md` | Thứ tự thực thi + phân quyền ownership + quyết định còn treo |

**Nguyên tắc:** Plan argume từ spec, không được chế thêm yêu cầu ngoài spec. Nếu spec và plan mâu thuẫn → ưu tiên spec, báo lại để người duyệt quyết.

---

## 3. Thứ tự thực thi bắt buộc

```
Bước 1  →  Shared PDF foundation + Driver Contract
Bước 2  →  Notifications (persist + REST + socket trước, FCM sau)
Bước 3  →  VAT Invoice (import PdfModule dùng chung, KHÔNG tạo renderer thứ 2)
Bước 4  →  Kích hoạt FCM + UAT tích hợp (payment → invoice → email → notification)
```

**Ràng buộc cross-feature:** `PdfModule` chỉ được tạo MỘT lần ở bước 1, invoice `import` nó — không import driver service/template, không thêm thư viện PDF thứ hai.

---

## 4. Hệ thống / môi trường (đã xác minh, dùng chính xác)

- **Package manager:** `pnpm@11.11.0`; Node `>=24 <25`.
- **Tên package (quan trọng — dùng cho `pnpm --filter`):**
  - API: `api` (KHÔNG phải `@leopard/api`)
  - Mobile: `mobile`
  - Shared: `@leopard/shared`
- **Scripts API** (`pnpm --filter api <script>`):
  - `test` = `jest --config jest.config.cjs --passWithNoTests`
  - `test:e2e` = `jest --config jest-e2e.config.cjs --runInBand`
  - `test:contract` = `jest --config jest.config.cjs --passWithNoTests --testPathPatterns=openapi-contract`
  - `typecheck` = `tsc --noEmit --project tsconfig.json`
  - `lint` = `eslint .`
  - `prisma:generate` = `prisma generate --schema prisma/schema.prisma`
  - `prisma:migrate:deploy` = `prisma migrate deploy --schema prisma/schema.prisma`
  - `prisma:migrate:test` = generate + migrate deploy + `jest --config jest-database.config.cjs --runInBand`
- **Scripts Mobile** (`pnpm --filter mobile <script>`):
  - `test` = `jest --runInBand`; `typecheck` = `tsc --noEmit`; `lint` = `eslint .`
- **Prisma:** `@prisma/client`/`prisma` phiên bản `7.8.0`. Luôn chạy `prisma:generate` sau khi sửa `schema.prisma`. Migration mới phải được tạo bằng timestamp thật, **không sửa migration cũ**, **không gộp chung migration giữa các feature**.

---

## 5. Các lưu ý kỹ thuật khi code (đã xác minh — bắt buộc tuân thủ)

### Chung
1. **Immutability:** luôn tạo object mới, không mutate object đang dùng. DTO/event dùng `readonly`.
2. **File nhỏ gọn:** ≤ 800 dòng/file, hàm ≤ 50 dòng. Không lồng sâu > 4 cấp. Tách theo trách nhiệm.
3. **TDD:** viết test trước, chạy xác nhận fail (RED) → implement (GREEN) → refactor. Coverage ≥ 80%.
4. **Không placeholder:** không `TODO`/`TBD`, không "add appropriate error handling" mơ hồ.
5. **Lỗi hiển thị tiếng Việt** cho user-facing (mẫu `DomainError('CODE', httpStatus, 'tin nhắn tiếng Việt')`), log chi tiết phía server, không rò rỉ secret/PII/storage key.

### Env & config (lỗi dễ vấp nhất)
6. **Không có `apps/api/.env.example`.** File env example duy nhất là **`.env.example` ở repo root**. Mọi key mới phải thêm vào đó.
7. **`apps/api/src/config/env.schema.ts` dùng `parseEnv()` build object literal tường minh rồi `envSchema.parse(...)`.** Key mới phải thêm vào **CẢ hai** nơi: định nghĩa zod schema **VÀ** danh sách trong `parseEnv(...)`. Chỉ thêm vào schema là key đó không được validate/không được expose.
8. Các key cần thêm: `INVOICE_PROVIDER`, `MAIL_PROVIDER`, `ALLOW_CONSOLE_MAIL_PROVIDER`, `SMTP_HOST/PORT/USER/PASS/SECURE`, `MAIL_FROM`, `FCM_ENABLED`. (`apps/api/.env` hiện đã seed sẵn các key mail/invoice nhưng schema chưa parse — phải đồng bộ.)
9. Provider selection theo pattern factory có sẵn (xem `payments.module`/`media.module`): đọc env, gating bằng `ALLOW_*` ở production, fail rõ ràng với giá trị không hỗ trợ (`einvoice` phải fail cho tới khi có provider thật).

### Contract
10. **Không giữ DB transaction khi upload file/PDF.** Upload signature + render PDF trước, rồi mới chạy transaction DB. Transaction fail → best-effort xoá object mới; update → chỉ xoá file cũ SAU khi transaction thành công.
11. `DriverApplicationService.apply` hiện **chỉ inject `PrismaService`** — phải thêm `DriverContractService` vào constructor.
12. Signature validation tái sử dụng `detectImageMime`/`isAllowedImageMime`/`MAX_IMAGE_SIZE_BYTES`/`IMAGE_MIME_TO_EXT` từ `apps/api/src/media/image-validation.ts` (10 MB đã export sẵn).

### Notifications
13. **`OrderStatusChangedEvent` hiện KHÔNG có `customerId`/`driverId`** (chỉ `orderId` + statuses + `eventId` + `occurredAt`). Dùng phương án (b): `NotificationTriggers` tự lookup order để lấy recipient, KHÔNG mở rộng event thêm dữ liệu cá nhân lên event bus.
14. **`AcceptOrderService` hiện KHÔNG inject/không publish** `OrderEventsPublisher`. Phải thêm injection + publish post-commit, và deduplicate để không gửi 2 notification khi accepted event trùng với generic status event.
15. `UpdateOrderStatusService` là nơi duy nhất hiện publish post-commit (dòng `update-order-status.service.ts:134`) — theo pattern đó.
16. **Case mismatch `NotificationType`:** backend enum là UPPERCASE (`ORDER|PAYMENT|PROMO|SYSTEM`), mobile model đang lowercase (`'order'|'payment'|...`). Adapter phải map server → mobile, có test.
17. `OrderEventsPublisher` đã được export từ `OrdersModule`; `TrackingGateway` subscribe trong constructor — mirror pattern này, tránh circular import bằng cách depend vào interface/narrow service.
18. **FCM:** `firebase-admin@14.2.0` (api) và `firebase@^12.18.0` (mobile) đều đã có. Expo push token ≠ FCM token — KHÔNG gửi Expo token vào `firebase-admin.messaging()`. Theo Phase 0: dùng Firebase Web Messaging (VAPID + service worker) hoặc defer `FCM_ENABLED=false`.

### Invoice
19. **Nguồn tiền chính thức là `PaymentIntent.amountVnd`** (non-null `Int`, đã snapshot khi tạo thanh toán từ `order.priceVnd ?? 0`). `Order.priceVnd` là **nullable** — không dùng làm input chính, chỉ đối chiếu. Mọi tính toán tiền là integer VND, không float.
20. **Invoice number:** dùng sequence transactional (model `InvoiceSequence` theo year/series), KHÔNG derive từ `max(invoiceNumber)` (race khi confirm đồng thời).
21. **`pdfkit` và `nodemailer` chưa được cài** — bước install là cần thiết. `pdfkit` phải dùng chung qua `PdfService`, không cài renderer thứ hai.
22. `confirmPayment` có 3 điểm early-return idempotency — đây là lý do phải chốt Phase 0 (outbox/retry durable HOẶC replay-retry đồng bộ). Chọn xong trước khi implement provider.

### Mobile / test
23. Test driver-register nằm ở **`apps/mobile/src/auth/driver-register-route.test.tsx`** (không nằm cạnh route).
24. `NotificationsScreen.tsx` hiện dùng `mockNotifications` hardcoded — phải tách thành `model.ts`/`port.ts`/`adapter.ts` theo pattern customer orders, và thay mock test bằng HTTP/socket fake.
25. Luôn giữ layout 360 px, không tràn ngang, không che bàn phím; đảm bảo accessibility label + focus order.

---

## 6. Quy trình cho mỗi task

1. Đọc task tương ứng trong plan → xác định file tạo/sửa/test chính xác.
2. Viết test thất bại trước (RED), chạy để xác nhận fail.
3. Implement tối thiểu để pass (GREEN), chạy lại xác nhận pass.
4. Refactor, chạy test đầy đủ của feature.
5. **Commit riêng từng task** theo conventional commits (`feat:`, `fix:`, `test:`, `refactor:`...), thông điệp chi tiết.
6. Không đụng code ngoài phạm vi task; không hấp thụ thay đổi dirty-worktree của người khác.

---

## 7. Định nghĩa hoàn thành (chấp nhận chung)

- `pnpm --filter api test`, `--filter api typecheck`, `--filter api lint` pass.
- `pnpm --filter mobile test`, `--filter mobile typecheck`, `--filter mobile lint` pass.
- Migration committed + `prisma migrate deploy` verified trên DB thật.
- 3 journey chấp nhận:
  1. Customer điền đủ thông tin → mở hợp đồng v1 → tick đồng ý → gõ tên → submit. User thành pending CHỈ SAU KHI contract evidence persisted; admin xem được signed PDF, user khác không.
  2. Driver đổi trạng thái đơn → customer nhận ĐÚNG 1 notification `ORDER` (connect hoặc refresh); user khác không đọc được.
  3. Admin confirm payment → ĐÚNG 1 invoice cho payment/order đó, customer xem được, trạng thái email gửi là trung thực & retry được, customer nhận tối đa 1 notification `PAYMENT`.
- Không có secret/SMTP/VAPID/signed-URL/email PII xuất hiện trong code, fixture, hay log.

---

## 8. Báo cáo kết quả

Khi hoàn thành mỗi bước, báo cáo:
- Migration name + output `prisma migrate deploy`.
- Lệnh test đã chạy + kết quả (unit/contract/e2e/mobile).
- Tên commit và phạm vi file thay đổi.
- Hai quyết định còn treo (FCM token, invoice retry) — trạng thái đã chọn/chưa chọn.
- Bất kỳ chỗ nào spec và plan mâu thuẫn hoặc phát hiện ngoài dự kiến.
