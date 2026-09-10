# LEOPARD — Luồng thanh toán payOS thật: phân tích, tiến độ, việc còn lại

> File này là bản tóm tắt để dùng làm prompt tiếp tục công việc trong một phiên làm việc mới (Claude Code hoặc bất kỳ agent nào khác). Đọc kỹ trước khi code tiếp — có nhiều quyết định kiến trúc đã được cân nhắc kỹ, đừng làm lại từ đầu.

## 1. Bối cảnh

- Dự án: LEOPARD — hệ thống kết nối vận tải hàng hóa, MVP theo hợp đồng [`docs/Hop_Dong_LEOPARD_MVP.md`](Hop_Dong_LEOPARD_MVP.md), 12 tuần, backend NestJS + Prisma + PostgreSQL/PostGIS, mobile Expo/React Native.
- Người dùng đã đăng ký tài khoản **payOS cá nhân thật** và đưa `PAYOS_CLIENT_ID`, `PAYOS_API_KEY`, `PAYOS_CHECKSUM_KEY` vào `apps/api/.env` (giá trị thật đã có trong file, **không in lại giá trị trong bất kỳ tài liệu/commit/log nào**).
- Có một tài liệu thiết kế riêng do người dùng cung cấp: `LEOPARD_Payment_Flow_Design.docx` (payOS + webhook, đọc bằng cách unzip + tự parse `word/document.xml` vì máy không có `pandoc`/`python`/`soffice` — xem cách làm ở dưới nếu cần đọc lại).

## 2. Phân tích: thiết kế trong docx vs. code hiện tại (trước khi sửa)

Tài liệu đề xuất mô hình **payOS + webhook tự động xác nhận**: `Order(WAITING_PAYMENT)` → `Payment(PENDING)` → gọi payOS lấy QR thật → khách quét → **payOS gửi webhook** → Backend verify chữ ký/orderCode/amount → set `PAID` → `Order` chuyển `WAITING_DRIVER`. Nguyên tắc cốt lõi: *"Mobile không được tự set PAID; bằng chứng chỉ đến từ Backend sau khi xác thực webhook."*

Đối chiếu với code (trước khi làm trong phiên này):

| Hạng mục | Tài liệu đề xuất | Code cũ |
|---|---|---|
| Order/Payment gating | `WAITING_PAYMENT` chặn trước khi ghép tài xế | Không có — tài xế nhận đơn độc lập với thanh toán |
| Payment status | `PENDING/PAID/CANCELLED/EXPIRED/FAILED/REFUNDED` | `UNPAID/QR_CREATED/PAID_MANUAL/FAILED` (hẹp hơn) |
| Webhook | Bắt buộc, verify signature + idempotency | Không tồn tại |
| QR thật | payOS trả `qrCode`+`checkoutUrl` | `PayOsPaymentProvider.createQr()` chỉ `throw` |
| Hiển thị QR ở mobile | — | **Không hiển thị QR ảnh nào cả**, kể cả khi có payload — `PaymentSummary.tsx` chỉ show text |
| COD | Flow riêng | Không có gì |

**Quyết định kiến trúc đã chốt** (quan trọng — đừng đổi lại nếu không có lý do mới):
- **Không** đổi Order state machine (không thêm `WAITING_PAYMENT`/`WAITING_DRIVER`). Lý do: đây là thay đổi lớn ảnh hưởng toàn bộ luồng driver/dispatch/tracking đã chạy ổn, và theo Điều 5.4 hợp đồng, "Đổi luồng đặt đơn, nhận đơn... đã duyệt" là **Change Request lớn** cần thỏa thuận lại — không tự ý làm.
- **Không** thêm giá trị enum `PaymentStatus` mới (không thêm `PAID` riêng). Thay vào đó: webhook xác nhận thành công cũng set `status = 'PAID_MANUAL'` giống luồng Admin xác nhận tay, chỉ khác `confirmedById = null` (hệ thống tự động) thay vì id của admin, và `confirmationNote` ghi rõ "Xác nhận tự động qua webhook payOS". Lý do: tránh phải sửa `openapi.yaml`, `database-schema.spec.ts`, `payments.e2e-spec.ts` và các chỗ khác đang assert cứng 4 giá trị enum hiện tại — giảm rủi ro, giữ đúng tinh thần "Mobile không tự set PAID, Backend xác nhận" mà không cần đổi schema lớn.
- **Không** làm COD, không làm VietQR-only-provider (đã có nhánh riêng `VietQrPaymentProvider`, vẫn để stub, ngoài phạm vi lần này).
- Chỉ làm **payOS thật** vì người dùng đã có tài khoản thật, và làm **hiển thị QR ảnh thật ở mobile** vì phát hiện ra đây là lỗ hổng còn thiếu (không chỉ QR giả, mà UI còn chưa từng vẽ QR ảnh nào).

## 3. Việc đã làm (đã test, đã xác minh)

### Backend (`apps/api`)

1. **Prisma schema**: thêm `PaymentIntent.payosOrderCode BigInt? @unique` trong [`prisma/schema.prisma`](../apps/api/prisma/schema.prisma). Migration: [`prisma/migrations/20260905120000_add_payos_order_code/migration.sql`](../apps/api/prisma/migrations/20260905120000_add_payos_order_code/migration.sql).
   - Lý do cần cột này: payOS bắt buộc `orderCode` là số nguyên do hệ thống mình tự sinh, không liên quan gì đến UUID `orderId` nội bộ — phải lưu lại để khi webhook trả về chỉ có `orderCode` số, mình tra ngược lại đúng `PaymentIntent`.
2. Cài `@payos/node@^2.0.5` (SDK Node chính thức của payOS) vào `apps/api/package.json`.
3. Viết lại hoàn toàn [`apps/api/src/payments/payment.provider.ts`](../apps/api/src/payments/payment.provider.ts):
   - `PayOsPaymentProvider.createQr()`: gọi thật `client.paymentRequests.create(...)`, trả về `qrCode` thật (chuỗi EMV VietQR quét được), `paymentLinkId` làm `providerReference`, tự sinh `payosOrderCode` unique.
   - `generatePayosOrderCode()`: **đã có 1 bug được phát hiện qua test flaky và đã sửa** — ban đầu dùng `Date.now()*1000 + random(0,999)`, có thể trùng khi gọi nhiều lần trong cùng 1ms (test unit đã bắt được: 19/20 unique). Đã sửa thành counter tăng dần trong process (`Date.now()*1000 + sequence % 1000`) — không còn ngẫu nhiên, không còn trùng.
   - `PayOsClientLike`: interface hẹp (chỉ có `paymentRequests.create`/`webhooks.verify`) để có thể **inject client giả khi test**, không cần mock cả module `@payos/node`.
     - **Lưu ý quan trọng đã phát hiện**: `jest.mock('@payos/node', ...)` **không hoạt động đúng** trong setup Jest+SWC của repo này — mock không chặn được, và unit test đầu tiên tôi viết đã vô tình gọi thật ra server payOS (nhận về lỗi thật từ payOS: "Cổng thanh toán không tồn tại..."). Đã refactor sang dependency injection (`constructor(config, client?)`) để né hoàn toàn vấn đề này. **Nếu viết thêm test cho code liên quan đến `@payos/node`, dùng cách inject client giả này, đừng dùng `jest.mock('@payos/node', ...)`.**
   - `verifyWebhook()`: gọi `client.webhooks.verify(payload)` (SDK tự verify HMAC-SHA256 theo checksum key).
   - `formatShortOrderReference()`: sinh mã `LPXXXXXXXX` từ `orderId`, khớp định dạng `LP-XXXXXXXX` mà mobile đã hiển thị (`formatOrderReference` trong `apps/mobile/src/features/customer/orders/adapter.ts`).
4. [`payments.repository.ts`](../apps/api/src/payments/payments.repository.ts): thêm `findByPayosOrderCode(payosOrderCode: bigint)`.
5. [`payments.service.ts`](../apps/api/src/payments/payments.service.ts): `createPaymentIntent()` lưu thêm `payosOrderCode` vào DB khi provider trả về.
6. [`payments.module.ts`](../apps/api/src/payments/payments.module.ts): factory dựng `PayOsPaymentProvider` thật từ env khi `PAYMENT_PROVIDER=payos`; đăng ký `PayOsPaymentProvider` như một DI token riêng (có thể `null`) để `PaymentWebhookService` lấy được instance cụ thể (không chỉ token trừu tượng `PaymentProvider`).
7. **Mới**: [`payment-webhook.service.ts`](../apps/api/src/payments/payment-webhook.service.ts) — `handlePayosWebhook()`:
   - Verify chữ ký (sai → `BadRequestException` 400, matching yêu cầu "Reject + security log" của tài liệu thiết kế).
   - Tra `PaymentIntent` theo `payosOrderCode`.
   - Idempotent: nếu đã `PAID_MANUAL` → no-op (không xử lý lại).
   - Amount không khớp → log lỗi, không set PAID.
   - Thành công → update `status: PAID_MANUAL`, `providerReference` = mã giao dịch ngân hàng thật từ webhook, `confirmedById: null`, `confirmationNote: 'Xác nhận tự động qua webhook payOS'`, ghi `AuditLog` (action `CONFIRM_PAYMENT_WEBHOOK`).
   - Phải nới kiểu `AuditInput.actorId` từ `string` sang `string | null` trong [`audit.service.ts`](../apps/api/src/audit/audit.service.ts) để cho phép actor hệ thống (webhook) — cột DB `actorId` vốn đã nullable, chỉ TypeScript type hẹp hơn thôi, sửa an toàn, không phá gì.
8. **Mới**: [`payments-webhook.controller.ts`](../apps/api/src/payments/payments-webhook.controller.ts) — route `POST /payments/webhook/payos` (full path do có global prefix `api/v1`: **`/api/v1/payments/webhook/payos`**). Route này **cố ý không có** `AccessTokenGuard`/`RoleGuard` vì payOS gọi trực tiếp, không có JWT của mình — bảo mật dựa hoàn toàn vào verify chữ ký HMAC.
9. Test mới:
   - [`payment.provider.spec.ts`](../apps/api/src/payments/payment.provider.spec.ts) — 7 test (generatePayosOrderCode uniqueness, formatShortOrderReference, DemoPaymentProvider, PayOsPaymentProvider.createQr với client giả, verifyWebhook thành công/thất bại).
   - [`payment-webhook.service.spec.ts`](../apps/api/src/payments/payment-webhook.service.spec.ts) — 6 test (provider chưa cấu hình, sai chữ ký, orderCode không khớp, idempotent, amount mismatch, thành công + audit log).

**Đã verify** (tất cả PASS):
- `tsc --noEmit` sạch trên toàn bộ `apps/api`.
- `eslint` sạch trên toàn bộ thư mục `payments/`.
- `payments.service.spec.ts` (9 test cũ) vẫn pass — không phá gì.
- `payment.provider.spec.ts` + `payment-webhook.service.spec.ts` (13 test mới) pass.
- **`payments.e2e-spec.ts` (5 test) chạy thật với Postgres+PostGIS thật** (xem mục 4 — đã dựng container tạm) — pass.
- Chạy thêm `database-schema.spec.ts` để kiểm tra migration không phá schema contract test: có 3 lỗi, **đã điều tra kỹ và xác nhận cả 3 đều KHÔNG liên quan đến thay đổi của tôi** (đã có từ trước, thuộc việc khác đang dở trên nhánh này):
  1. PostGIS version test kỳ vọng `3.5.x`, container tạm tôi dùng là `postgis/postgis:16-3.4` (3.4.3) — chỉ do tôi chọn image test, không phải bug thật.
  2. Enum `OrderStatus`/`UserStatus` trong test bị cũ hơn schema thật hiện tại (test thiếu `PICKED_UP`, thiếu `PENDING_APPROVAL/REJECTED/SUSPENDED`) — do việc khác (driver KYC, dispatch...) đã tiến hóa schema mà chưa update test này.
  3. Đếm cột "integer operational values" lệch 7→8 vì có thêm `DriverDocument.sizeBytes` (từ tính năng KYC tài xế, không liên quan payment).
  - → Việc **update `database-schema.spec.ts` cho khớp schema hiện tại** là task tồn đọng riêng, không phải của phiên payment này, nhưng đáng làm sau.

### Mobile (`apps/mobile`)

1. Cài `react-native-qrcode-svg` + `react-native-svg@15.15.4` qua `npx expo install` (khớp Expo SDK 57) — **trước đó app hoàn toàn không có thư viện vẽ QR ảnh nào**, kể cả để hiển thị demo QR.
2. [`model.ts`](../apps/mobile/src/features/customer/orders/model.ts): thêm `qrPayload?: string` vào `CustomerPaymentView`.
3. [`adapter.ts`](../apps/mobile/src/features/customer/orders/adapter.ts): `mapPaymentToView()` set `qrPayload` **chỉ khi không phải Demo provider** (tránh vẽ QR từ JSON giả của Demo, gây hiểu nhầm là QR thật).
4. [`PaymentSummary.tsx`](../apps/mobile/src/ui/PaymentSummary.tsx): thêm prop `qrPayload`, render `<QRCode size={200} value={qrPayload} />` khi có, style khung trắng bo góc.
5. [`CustomerOrderDetailScreen.tsx`](../apps/mobile/src/features/customer/orders/CustomerOrderDetailScreen.tsx): truyền `qrPayload={order.payment.qrPayload}` xuống `PaymentSummary`.

**Đã verify**: `tsc --noEmit` sạch (chỉ còn 2 lỗi cũ không liên quan, đã xác nhận từ trước phiên này), `eslint` sạch, smoke test render QRCode qua Jest/RTL pass (đã xóa file test tạm sau khi xác nhận), 106/107 test trong `customer/orders` pass (1 fail là timeout flaky khi chạy song song, đã re-run riêng lẻ và pass — không phải regression thật).

## 4. Hạ tầng test đã dựng (cần biết để không bối rối)

- Không có Postgres nào chạy sẵn trên máy trước phiên này, và **repo không có `docker-compose.yml`** (đã tìm, không có).
- Đã tự dựng container Docker tạm để test migration thật:
  ```bash
  docker run -d --name leopard-pg-tmp -e POSTGRES_USER=leopard -e POSTGRES_PASSWORD=leopard_local -e POSTGRES_DB=leopard -p 5433:5432 postgis/postgis:16-3.4
  ```
  Container này khớp đúng `DATABASE_URL` trong `.env` (`postgresql://leopard:leopard_local@127.0.0.1:5433/leopard`), đã áp dụng toàn bộ migration (kể cả migration mới `add_payos_order_code`) — **container `leopard-pg-tmp` hiện vẫn đang chạy**, có thể dùng luôn để tiếp tục test/chạy app local, hoặc dừng nếu không cần: `docker rm -f leopard-pg-tmp`.
  - Chỉ dùng PostGIS 3.4 (không phải 3.5 như test kỳ vọng) — nếu cần khớp chính xác, đổi image sang `postgis/postgis:16-3.5` (kiểm tra tag tồn tại trước).

## 5. Việc còn lại (theo thứ tự nên làm)

1. **Đổi `PAYMENT_PROVIDER=demo` → `PAYMENT_PROVIDER=payos` trong `apps/api/.env`** — hiện code đã sẵn sàng dùng payOS thật nhưng `.env` vẫn đang trỏ về Demo, nên chưa có gì thay đổi khi chạy app cho tới khi đổi dòng này. (`ALLOW_DEMO_PAYMENT_PROVIDER=true` có thể xóa hoặc giữ, không ảnh hưởng khi provider là payos.)
2. **(Tùy chọn) Set `PAYOS_RETURN_URL` / `PAYOS_CANCEL_URL` thật trong `.env`** — code hiện fallback về `https://leopard.vn/payment/return` và `/cancel` nếu không set. Vì luồng chính là quét QR trực tiếp (không redirect qua trang checkout payOS), 2 URL này không ảnh hưởng trải nghiệm chính, có thể để mặc định cho demo.
3. **Đăng ký Webhook URL với payOS** — đây là bước bắt buộc để webhook thật sự chạy được:
   - Local dev cần một public HTTPS URL trỏ vào máy (dùng `ngrok http 3000` hoặc tương đương, vì payOS không gọi được `localhost`).
   - Đăng ký URL đó (dạng `https://<ngrok-id>.ngrok-free.app/api/v1/payments/webhook/payos`) trong dashboard payOS, hoặc gọi `payOS.webhooks.confirm(webhookUrl)` (SDK có sẵn method này, chưa dùng trong code — có thể thêm 1 script/CLI nhỏ để gọi 1 lần lúc setup).
4. **Test end-to-end thật với tiền thật (số tiền nhỏ)**: tạo đơn → tạo Payment Intent → xem QR thật hiển thị trên mobile (`PaymentSummary`) → quét bằng app ngân hàng thật → xác nhận webhook bắn về, `PaymentIntent` tự chuyển `PAID_MANUAL` mà **không cần** Admin bấm xác nhận tay.
5. Chạy lại `payments.e2e-spec.ts` một lần cuối để chốt (**đang chạy dở thì bị ngắt** ở cuối phiên trước — chưa biết kết quả lần cuối, nên chạy lại):
   ```bash
   cd apps/api && npx jest --config jest-e2e.config.cjs --testPathPatterns=payments --runInBand
   ```
6. Cân nhắc viết thêm 1 test **e2e cho chính route webhook** (`POST /api/v1/payments/webhook/payos`) — hiện chỉ có unit test cho `PaymentWebhookService`, chưa có test đi qua toàn bộ pipeline NestJS thật (controller → guard-bypass → service → DB) với chữ ký được ký bằng `checksumKey` thật trong test.
7. (Không khẩn cấp, việc tồn đọng riêng) Update `database-schema.spec.ts` cho khớp schema hiện tại (xem mục 3, 3 lỗi đã liệt kê) — không liên quan payment nhưng nên dọn khi có dịp.
8. (Không khẩn cấp) Quyết định giữ container `leopard-pg-tmp` làm DB dev chính thức hay thay bằng `docker-compose.yml` chuẩn commit vào repo (repo hiện chưa có file này).
9. (Ngoài phạm vi, chỉ để nhớ) Tài liệu thiết kế payOS+webhook còn đề xuất: đổi Order state machine (`WAITING_PAYMENT`/`WAITING_DRIVER`), COD flow riêng, `PaymentStatus` 6 giá trị đầy đủ — **cố tình chưa làm** trong phiên này (xem lý do ở mục 2). Nếu sau này muốn làm, cần thống nhất lại với Bên A theo Điều 5.4 hợp đồng vì đổi luồng đặt/nhận đơn đã duyệt.

## 6. Cách đọc lại file .docx thiết kế nếu cần (máy không có pandoc/python/soffice)

```bash
unzip -q -o "<path-to-file>.docx" -d /tmp/unpacked
node extract_docx.js /tmp/unpacked/word/document.xml   # script tự viết, xem lịch sử phiên trước để lấy lại nếu cần
```
(Script `extract_docx.js` là 1 parser XML thủ công nhỏ ~100 dòng, tokenize `<w:p>`/`<w:tbl>`/`<w:t>` thành text/markdown table — có thể viết lại nhanh nếu không còn giữ.)
