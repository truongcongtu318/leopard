# Continuation Prompt — VAT Invoice: chuẩn hóa PDF + xem trước in-app

> **Chuẩn bị:** 2026-09-08, cho phiên làm việc tiếp theo tiếp nhận nguội (cold
> start). Đọc hết file này trước khi động vào code — đây là toàn bộ ngữ cảnh
> cần thiết để tiếp tục mà không phải suy luận lại từ đầu. Đây là công việc
> tiếp nối tính năng VAT Invoice + Email đã triển khai xong và có test đầy đủ
> trên branch `feature/mobile-profile-media-payment` (không phải feature mới).

## Đây là gì

3 việc, theo đúng scope người dùng đã xác nhận trong phiên trước (không mở
rộng, không tự ý đổi phạm vi):

1. **Thiết kế lại PDF hóa đơn theo bố cục hóa đơn VAT chuẩn Việt Nam** — file
   PDF hiện tại (`apps/api/src/pdf/render-invoice-pdf.ts`) chỉ là danh sách
   text đơn giản, chưa đúng bố cục một hóa đơn thật (header công ty/MST, bảng
   thông tin người mua, bảng hàng hóa/dịch vụ có thuế suất, tổng tiền bằng
   chữ, khu vực chữ ký).
2. **Giữ nguyên cơ chế gửi email** — luồng gửi (`MailProvider`,
   `InvoicesService.sendEmail`/`trySendInvoiceEmail`) đã hoạt động đúng và có
   test đầy đủ (unit + e2e), **không cần sửa lại**, trừ khi nội dung email
   cần cập nhật cho khớp PDF mới (xem Task 2 bên dưới — tùy chọn).
3. **Thêm xem trước PDF ngay trong app mobile, gọi đúng API `GET
   /invoices/:id/download`** — hiện tại `onOpenInvoice` trong
   `apps/mobile/src/features/customer/orders/CustomerOrderDetailRuntime.tsx:115-117`
   chỉ gọi `Linking.openURL(viewUrl)` với URL cũ lấy từ lần fetch order-detail
   trước đó, **chưa từng gọi** endpoint `download` — xem mục "Khoảng trống
   mobile" bên dưới để hiểu rõ vì sao đây là lỗi thiết kế cần sửa tận gốc,
   không chỉ đổi giao diện. Cần thay bằng màn hình/modal xem PDF **trong
   app**, nạp URL PDF mới nhất tại đúng thời điểm mở.

## Quyết định đã chốt trong phiên trước (binding — không hỏi lại)

Người dùng đã được hỏi và trả lời rõ qua `AskUserQuestion` trong phiên
2026-09-08:

1. **"Format chuẩn" = thiết kế lại PDF**, không phải tạo thêm một trang
   web/HTML riêng để xem hóa đơn. Chỉ một artifact: file PDF.
2. **"Xem trước" = xem PDF trong app mobile** (in-app), không phải xem trước
   nội dung email trước khi gửi. Không cần preview nội dung email.

## Tài liệu tham chiếu (đọc theo thứ tự này nếu cần dựng lại ngữ cảnh)

1. `docs/superpowers/plans/2026-09-05-vat-invoice-plan.md` — kế hoạch gốc của
   toàn bộ tính năng VAT Invoice (5 phase, đã hoàn tất hết).
2. `docs/superpowers/specs/2026-09-05-vat-invoice-design.md` — design spec gốc.
3. `docs/superpowers/plans/2026-09-08-vat-invoice-test-plan.md` — kế hoạch
   test đã thực hiện (unit/e2e/race), để biết pattern test khi cần thêm test
   cho phần PDF/preview mới.
4. `docs/api/01-rest-api-spec.md` (mục "Invoices"), `docs/data/01-database-design.md`
   (mục "Invoices (hóa đơn tự phát hành)"), `docs/architecture/01-system-architecture.md`
   (mục "Phát hành hóa đơn") — tài liệu đã viết đầy đủ, khớp với code thật.
5. `docs/ui/03-screen-specs.md` (dòng về `/customer/orders/:id` — phần hóa
   đơn) — mô tả UI hiện tại, cần cập nhật lại sau khi thêm preview.

## Khoảng trống mobile — 3 API backend, mobile hiện chỉ gọi đúng 1.5/3

Backend có đúng 3 route (`apps/api/src/invoices/invoices.controller.ts`), nhưng
mobile hiện **chưa map đủ cả 3**:

| API | Method | Mobile đang gọi ở đâu | Trạng thái |
| --- | --- | --- | --- |
| `/invoices/order/:orderId` | GET | `adapter.ts:1196`, lồng bên trong `getOrderDetailView` | ✅ Có gọi, nhưng chỉ gọi gián tiếp cùng lúc fetch order — không có hàm độc lập nào để refetch riêng chỉ invoice |
| `/invoices/:id/download` | GET (302 redirect tới URL PDF ký tươi) | **Không gọi ở đâu cả** | ❌ Thiếu hẳn — mobile đang tự ý dùng `invoice.viewUrl` lấy từ response của API #1 (không bao giờ gọi API #2), nghĩa là link xem hóa đơn có thể đã hết hạn (TTL 3600s, xem `SIGNED_URL_TTL_SECONDS` trong `invoices.service.ts`) nếu người dùng mở màn hình chi tiết đơn từ lâu rồi mới bấm "Xem hóa đơn" |
| `/invoices/:id/send` | POST | `adapter.ts:1233-1251`, hàm `sendInvoiceEmail` | ✅ Có gọi đúng |

**Đây là lý do chính user yêu cầu điều chỉnh prompt này** — Task 3 (preview)
bản trước chỉ mô tả "mở `invoice.viewUrl` trong WebView", tức là **tiếp tục bỏ
qua API `/invoices/:id/download`** thay vì sửa đúng gốc rễ. Task 3 dưới đây đã
viết lại để bắt buộc dùng đúng API #2 khi preview/tải, không phải tái dùng URL
cũ.

## Trạng thái code hiện tại (đã xong, đã test, không phải viết lại)

### Backend

- `apps/api/src/pdf/pdf.types.ts` — `InvoicePdfInput` (invoiceNumber,
  issuedAt, customerName/Email/TaxCode/Address tùy chọn, orderReference,
  `lineItems: readonly InvoicePdfLineItem[]`, amountVnd, vatRateVnd, totalVnd).
- `apps/api/src/pdf/render-invoice-pdf.ts` — hàm render hiện tại, dùng
  `pdfkit`, font Roboto nhúng sẵn (`apps/api/src/pdf/fonts.ts`, hỗ trợ tiếng
  Việt có dấu — **bắt buộc tái sử dụng font này, không thêm font/thư viện PDF
  mới**). Mirror của `render-contract-pdf.ts` (cùng pipeline pdfkit, cùng kỷ
  luật deterministic: margin cố định, formatter ngày giờ cố định
  `vi-VN`/`Asia/Ho_Chi_Minh`).
- `apps/api/src/pdf/pdf.service.ts` — `renderInvoice(input)` gọi thẳng
  `renderInvoicePdf`. Có test giả (fake) `PdfService` trong
  `invoices.e2e-spec.ts` và `real-db-invoice-race.integration-spec.ts` —
  **thay đổi shape của `InvoicePdfInput` sẽ không phá các test này** vì
  chúng override toàn bộ `PdfService` bằng buffer giả, nhưng vẫn cần soát lại.
- `apps/api/src/invoices/invoice.provider.ts` — `SelfGeneratedInvoiceProvider.generate()`
  build `InvoicePdfInput` từ `InvoiceInput` (amountVnd từ
  `PaymentIntent.amountVnd`, **không phải** `Order.priceVnd`), tính
  `vatRateVnd`/`totalVnd` (10%, `Math.round`, đã có test biên trong
  `invoice.provider.spec.ts`). Có test kỹ cho việc tính toán này — **không
  thay đổi công thức tính thuế**, chỉ thay đổi cách trình bày PDF.
- `apps/api/src/invoices/invoices.service.ts` — `ensureInvoice` (idempotent,
  transactional invoice-number sequence, cleanup file mồ côi khi race/lỗi),
  `sendEmail`, `getForOrder`, `getDownloadUrl`. Toàn bộ luồng nghiệp vụ đã
  chạy đúng, có 26 unit test + 13 e2e test + 1 test race thật trên Postgres —
  **không đụng vào các hàm này trừ khi PDF input cần thêm field mới** (ví dụ
  nếu quyết định thêm logo/thông tin công ty cố định thì không cần sửa
  service, chỉ sửa `invoice.provider.ts`'s `generate()` — có thể hardcode
  hằng số công ty ngay trong đó hoặc file config riêng, xem "Khoảng trống"
  bên dưới).
- `apps/api/openapi/openapi.yaml` + `test/openapi-contract.spec.ts` — đã có
  `InvoiceView` schema, không expose `pdfStorageKey`. Nếu preview cần thêm
  field response mới thì cập nhật cả hai chỗ này.

### Mobile

- `apps/mobile/src/features/customer/orders/CustomerOrderDetailScreen.tsx` —
  `InvoiceSection` (dòng ~53-135): hiện thị số hóa đơn/tổng tiền/ngày, nút
  "Xem hóa đơn" (`onOpenInvoice`), form nhập email khi `emailSentAt === null`.
- `apps/mobile/src/features/customer/orders/CustomerOrderDetailRuntime.tsx:115-123` —
  `handleOpenInvoice` gọi `Linking.openURL`; `handleSendInvoiceEmail` gọi
  `port.sendInvoiceEmail`.
- `apps/mobile/src/features/customer/orders/adapter.ts` — `mapInvoiceToView`,
  `sendInvoiceEmail` trong `createCustomerHttpAdapter`.
- **Chưa cài thư viện xem PDF/WebView nào** — `apps/mobile/package.json`
  không có `react-native-webview`, `react-native-pdf`, hay tương đương. Phải
  thêm mới cho Task 3.

## Khoảng trống cần quyết định trước khi làm Task 1 (chưa có sẵn trong repo)

**Không có thông tin công ty/người bán ("Bên bán") ở bất kỳ đâu trong repo** —
không có tên công ty đầy đủ, mã số thuế, địa chỉ trụ sở nào được cấu hình.
`driver-contract-template.ts` chỉ có nhãn ngắn `"Công ty Leopard"` cho hợp
đồng tài xế (không phải hóa đơn). Vì đây là **hóa đơn tự phát hành nội bộ,
không phải hóa đơn điện tử pháp lý** (đã ghi rõ trong design spec và
`docs/api/01-rest-api-spec.md`), người thực hiện task cần:

1. Thêm một bộ hằng số thông tin "Bên bán" (tên công ty, mã số thuế giả định
   hoặc để trống, địa chỉ) — đặt trong `apps/api/src/pdf/` (ví dụ
   `invoice-template.ts` cạnh `render-invoice-pdf.ts`, theo đúng pattern
   `driver-contract-template.ts` đang làm cho hợp đồng), **không** đưa vào
   biến môi trường (không phải secret, không cần đổi theo deployment ở giai
   đoạn pilot này) trừ khi được yêu cầu khác đi.
2. Giữ nguyên dòng chú thích bắt buộc: đây là hóa đơn GTGT tự phát hành, không
   phải hóa đơn điện tử được cơ quan thuế cấp mã (đã có trong bản hiện tại ở
   `render-invoice-pdf.ts:33-37`, phải giữ lại trong bản thiết kế mới, đặt ở
   vị trí dễ thấy theo chuẩn hóa đơn thật — thường là góc trên hoặc chân
   trang).

## Task 1 — Thiết kế lại PDF hóa đơn theo bố cục chuẩn

Tham khảo bố cục hóa đơn GTGT phổ biến tại Việt Nam (mẫu hóa đơn bán
hàng/dịch vụ theo Nghị định 123/2020/NĐ-CP, dùng làm tham chiếu hình thức —
**không** cần tuân thủ đầy đủ nghiệp vụ pháp lý vì đây là hóa đơn tự phát
hành, chỉ mượn bố cục cho chuyên nghiệp). Các phần cần có, theo đúng thứ tự
thường thấy:

1. **Header**: tên "HÓA ĐƠN GIÁ TRỊ GIA TĂNG" + dòng phụ "(Tự phát hành —
   không phải hóa đơn điện tử có mã cơ quan thuế)", ký hiệu/số hóa đơn
   (`invoiceNumber`), ngày lập (`issuedAt`, format `vi-VN`).
2. **Thông tin bên bán** (hằng số cố định, xem mục "Khoảng trống" ở trên):
   tên công ty, mã số thuế, địa chỉ, có thể thêm số điện thoại/email liên hệ.
3. **Thông tin bên mua**: tên khách hàng (`customerName`), mã số thuế nếu có
   (`customerTaxCode`, hiện luôn `null` — xem ghi chú dưới), địa chỉ nếu có
   (`customerAddress`, hiện luôn `null`), tham chiếu đơn hàng
   (`orderReference`).
   - **Lưu ý:** `InvoicesService.ensureInvoice` hiện luôn set
     `customerTaxCode: null, customerAddress: null` khi tạo hóa đơn (không có
     nguồn dữ liệu nào cho hai field này — khách hàng cá nhân dùng app không
     nhập MST/địa chỉ công ty ở đâu cả). Task 1 **không bắt buộc** phải thêm
     luồng thu thập hai field này — PDF chỉ cần render có điều kiện (ẩn dòng
     nếu null), giống cách `render-invoice-pdf.ts` hiện tại đã làm.
3. **Bảng hàng hóa/dịch vụ**: cột STT, Tên hàng hóa/dịch vụ, Đơn vị tính,
   Số lượng, Đơn giá, Thành tiền — dùng `input.lineItems` (hiện chỉ có 1 dòng
   "Cước phí vận chuyển" = `amountVnd`, xem `invoice.provider.ts:52-58`).
   pdfkit không có bảng dựng sẵn — phải tự vẽ (dùng `doc.rect`/`doc.moveTo`/
   `doc.lineTo` cho đường viền, căn cột bằng tọa độ x cố định) hoặc tìm một
   pattern vẽ bảng đơn giản, nhất quán với `render-contract-pdf.ts`'s cách vẽ
   hiện có (không có bảng trong đó — đây sẽ là phần mới, thiết kế cẩn thận).
4. **Tổng cộng**: Cộng tiền hàng, Thuế suất GTGT (10%) + tiền thuế, Tổng cộng
   tiền thanh toán — **tổng tiền bằng chữ** (viết bằng chữ số tiếng Việt, ví
   dụ "Năm trăm hai mươi tám nghìn đồng") là một yêu cầu chuẩn hóa đơn thật —
   cần viết hàm chuyển số sang chữ tiếng Việt (chưa có sẵn trong repo, viết
   mới, đặt trong `apps/api/src/pdf/` hoặc `apps/api/src/common/` nếu thấy
   dùng lại được chỗ khác).
5. **Chữ ký/xác nhận**: dòng "Người mua hàng" / "Người bán hàng" (không cần
   chữ ký thật vì đây không phải hợp đồng — có thể chỉ để trống dòng kẻ theo
   đúng hình thức hóa đơn giấy truyền thống, không cần logic ký như
   `driver-contract`).

**Ràng buộc bắt buộc** (đã áp dụng xuyên suốt tính năng này, không được phá):

- Không thêm thư viện PDF thứ hai — chỉ `pdfkit` đã có.
- Không thêm font mới — chỉ `PDF_FONT_REGULAR_PATH`/`PDF_FONT_BOLD_PATH` từ
  `fonts.ts` (Roboto, hỗ trợ tiếng Việt).
- Giữ format ngày giờ deterministic hiện có (`Intl.DateTimeFormat('vi-VN', {timeZone: 'Asia/Ho_Chi_Minh', ...})`).
- Giữ nguyên toàn bộ logic tính `vatRateVnd`/`totalVnd` ở `invoice.provider.ts`
  — Task 1 chỉ đổi cách **trình bày**, không đổi số liệu.
- Cập nhật `invoice.provider.spec.ts` nếu shape `InvoicePdfInput` đổi (ví dụ
  thêm field công ty bán) — test hiện tại assert
  `mocks.pdf.renderInvoice` được gọi với object cụ thể (dòng ~80-90 file đó),
  sẽ cần sửa theo field mới.

## Task 2 — Nội dung email (tùy chọn, chỉ làm nếu PDF mới đổi đáng kể)

`apps/api/src/invoices/mail.provider.ts`'s `SmtpMailProvider.sendInvoiceLink`
hiện gửi plain text. Không bắt buộc đổi, nhưng nếu muốn nội dung email khớp
hình ảnh chuyên nghiệp hơn với PDF mới, có thể nâng cấp thành HTML email đơn
giản (subject/text hiện có vẫn phải giữ làm fallback `text` field — nodemailer
hỗ trợ gửi cả `text` và `html` cùng lúc). **Không đổi cơ chế gửi** (`ConsoleMailProvider`
vẫn chỉ log, không gửi thật — giữ nguyên để tránh rủi ro gửi email thật khi
test, xem cảnh báo về `.env` bên dưới).

## Task 3 — Xem trước PDF trong app mobile, gọi đúng `GET /invoices/:id/download`

**Nguyên tắc bắt buộc:** màn hình preview phải nạp URL bằng cách gọi
`GET /invoices/:id/download` **tại đúng thời điểm mở màn hình** (lấy URL ký
mới, TTL 3600s tính từ lúc gọi), **không** được tái sử dụng `invoice.viewUrl`
đã lấy từ lần fetch order-detail trước đó (URL đó có thể đã hết hạn nếu người
dùng ở màn hình chi tiết đơn lâu rồi mới bấm xem). Route trả về `302 Location`
tới URL PDF thật — có 2 cách hợp lệ để dùng đúng route này, chọn 1 và ghi rõ
lý do trong report:

**Cách A (khuyến nghị) — để WebView tự follow redirect, không qua JSON client:**
`react-native-webview`'s `source` nhận thẳng URL + header, tự xử lý 302 ở tầng
network native (không phải fetch JS), nên không cần cấu hình `redirect: 'manual'`
ở đâu cả:

```tsx
import { sessionStore } from '../../../auth/session-store'; // đường dẫn tương đối theo vị trí file thật

const API_BASE = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000/api/v1';
const token = sessionStore.getAccessToken();

<WebView
  source={{
    uri: `${API_BASE}/invoices/${invoiceId}/download`,
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  }}
/>
```

(`sessionStore`/`getAccessToken` và `EXPO_PUBLIC_API_URL` đã dùng đúng y hệt
trong `apps/mobile/src/api/http-client.ts:6,199-201` — copy đúng pattern đó,
không tự chế cách lấy token khác.)

**Cách B — gọi qua adapter trước, resolve URL rồi mới mở WebView:** thêm hàm
mới trong `port.ts`/`adapter.ts`, ví dụ `getInvoiceDownloadUrl(invoiceId): Promise<string>`,
gọi `activeClient.get('/invoices/:id/download')` — nhưng `CustomerHttpClient`
hiện tại (`adapter.ts`'s `get<T>`) được viết cho response JSON, **không** cho
response 302/binary; cần kiểm tra `http-client.ts` có tự động follow redirect
và trả lại thất bại khi parse JSON hay không trước khi chọn cách này. Nếu chọn
Cách B, phải test thủ công kỹ hơn Cách A vì đụng vào tầng HTTP client dùng
chung cho toàn app khách hàng — rủi ro cao hơn. **Ưu tiên Cách A.**

Các bước cụ thể:

1. Thêm thư viện WebView: `npx expo install react-native-webview` (không cài
   trực tiếp qua npm/pnpm add — Expo cần pin version tương thích native
   module với SDK 57 đang dùng).
2. Tạo màn hình/modal mới, ví dụ `InvoicePreviewModal` hoặc route riêng
   `app/customer/invoice-preview.tsx` (theo đúng convention Expo Router hiện
   có — xem cách `app/customer/tracking.tsx` được dùng làm route riêng cho
   tracking để lấy pattern tương tự). Nhận **`invoiceId`** làm tham số (không
   phải `viewUrl`) — đúng theo nguyên tắc "gọi API #2 tại thời điểm mở" ở
   trên. Dùng `WebView` theo Cách A.
3. **iOS**: WKWebView render PDF natively, ổn định. **Android**: WebView
   Android không đảm bảo render PDF trực tiếp ở mọi thiết bị/phiên bản Chrome
   System WebView — **phải test thật trên máy/emulator Android**. Nếu không
   ổn định, phương án dự phòng là bọc qua Google Docs Viewer
   (`https://docs.google.com/gview?embedded=true&url=<url-đã-ký-công-khai>`)
   — nhưng cách này **chỉ hoạt động nếu URL PDF truy cập được từ internet
   công khai** (chỉ đúng khi `STORAGE_PROVIDER=s3`, không hoạt động với
   `STORAGE_PROVIDER=local` ở máy dev vì URL dạng `http://localhost:.../files/...`).
   Ghi rõ giới hạn này trong PR/report thay vì âm thầm bỏ qua.
4. Sửa `CustomerOrderDetailRuntime.tsx:115-117`'s `handleOpenInvoice` —
   **đổi tham số từ `viewUrl: string` sang `invoiceId: string`** (đây là thay
   đổi interface thật, không chỉ đổi hành vi bên trong), thay `Linking.openURL`
   bằng mở modal/điều hướng tới màn hình preview mới. **Không xóa hoàn toàn
   khả năng mở bằng trình duyệt ngoài** — giữ một nút "Mở trong trình duyệt"
   bên trong màn hình preview làm phương án dự phòng khi WebView render lỗi
   (đặc biệt hữu ích cho case Android nêu ở trên); nút này gọi
   `Linking.openURL` tới đúng `${API_BASE}/invoices/${invoiceId}/download`
   (backend tự redirect, không cần resolve URL thật trước — nhưng
   `Linking.openURL` mở qua trình duyệt hệ thống nên **không** tự đính kèm
   Authorization header như WebView làm được; endpoint `download` dùng
   `AccessTokenGuard` nên request không có Bearer token sẽ nhận 401 — cần xử
   lý: resolve URL đã ký thật trước (Cách B, chỉ để lấy URL cho nút fallback
   này) rồi `Linking.openURL` vào URL storage trực tiếp, không phải URL API).
5. `CustomerOrderDetailScreen.tsx`'s `InvoiceSection` nút "Xem hóa đơn": đổi
   prop `onOpenInvoice?: (viewUrl: string) => void` thành
   `onOpenInvoice?: (invoiceId: string) => void` (đây là thay đổi interface
   thật — cascade xuống cả `CustomerOrderDetailScreenProps` và lời gọi
   `onOpenInvoice?.(invoice.viewUrl)` ở dòng ~103, đổi thành
   `onOpenInvoice?.(invoice.id)`). Rà lại mọi nơi dùng `onOpenInvoice` (kể cả
   test `CustomerScreens.test.tsx` đã viết ở phiên trước — assertion
   `expect(onOpenInvoice).toHaveBeenCalledWith(invoice.viewUrl)` cần sửa
   thành `invoice.id`).

### Việc liên quan đã bàn ở phiên trước, có thể làm cùng lúc nếu còn thời gian (không bắt buộc)

Phiên trước (2026-09-08, trước prompt này) đã thảo luận một kế hoạch thiết kế
lại `InvoiceSection` (không lưu thành file, chỉ có trong lịch sử hội thoại đã
qua — tóm tắt lại đây để không mất):

- **Bug thật cần sửa**: `InvoiceSection`'s state `sent` (dòng ~64,73 trong
  `CustomerOrderDetailScreen.tsx`) là optimistic — set `true` ngay khi bấm
  gửi, không phản ánh kết quả thật từ server. Khi `onSendInvoiceEmail` thất
  bại (ví dụ backend trả `502 MAIL_PROVIDER_FAILED`), UI vẫn hiển thị "Đã gửi
  yêu cầu gửi hóa đơn qua email" — sai sự thật. Cần đổi `handleSendInvoiceEmail`
  trong Runtime để trả kết quả thật (thành công/thất bại) xuống Screen, và
  `InvoiceSection` dùng state `sendStatus: 'idle' | 'sending' | 'error'` thay
  vì boolean optimistic.
- Đề xuất thiết kế lại visual: icon `IconFileText` (đã có trong
  `apps/mobile/src/ui/icons/CoreIcons.tsx`) làm huy hiệu nhận diện thay vì tái
  dùng style của payment card; hiện tổng tiền lớn như `heroPrice`; badge
  "Đã phát hành"; khi `emailSentAt` đã có thì cho phép "Gửi email khác" thay
  vì ẩn hẳn form.
- Nếu làm phần này, ưu tiên sửa bug trạng thái lỗi trước (đúng logic), phần
  visual polish là thứ yếu.

## Ràng buộc chung (áp dụng toàn bộ 3 task, đã là kỷ luật xuyên suốt tính năng)

- File ≤800 dòng, hàm ≤50 dòng, nesting ≤4 cấp, TDD, không để lộ PII/storage
  key/link ký trong log (đã có sẵn kỷ luật này ở `mail.provider.ts` — giữ
  nguyên khi sửa).
- `apps/api/.env` (không commit) đã có sẵn credential Gmail SMTP thật
  (`MAIL_PROVIDER=smtp`) — **không bao giờ để test nào chạm SMTP thật**; mọi
  test PDF/email phải mock `PdfService`/`MailProvider` như các file test hiện
  có đang làm (`invoices.e2e-spec.ts`, `invoices.service.spec.ts`).
- Trước khi sửa bất kỳ file nào, chạy `git status`/`git diff` — branch này có
  thể vẫn còn các file dirty không liên quan từ công việc khác của người
  dùng; không được gộp nhầm thay đổi không liên quan vào commit của task này
  (đã xảy ra nhiều lần ở các phase trước, xem
  `docs/superpowers/handoffs/2026-09-08-vat-invoice-execution-continuation-prompt.md`'s
  mục "Ruling: commit-hygiene contamination" để biết chi tiết rủi ro).
- Sau khi xong: chạy lại `invoice.provider.spec.ts`, `invoices.e2e-spec.ts`,
  và `openapi-contract.spec.ts` (nếu response shape đổi) — tất cả đang pass,
  không được để regression.

## Việc đầu tiên nên làm khi bắt đầu phiên mới

1. `git status`/`git log --oneline -5` để xác nhận trạng thái branch chưa đổi
   so với mô tả trong file này.
2. Đọc lại bảng "3 API backend, mobile hiện chỉ gọi đúng 1.5/3" — xác nhận
   bằng cách tự grep `invoices/:id/download`/`invoices/${` trong
   `apps/mobile/src/features/customer/orders/adapter.ts` để chắc chắn tình
   trạng chưa đổi so với mô tả (mã có thể đã trôi nếu có phiên khác chạm vào).
3. Đọc `apps/api/src/pdf/render-invoice-pdf.ts` và
   `apps/api/src/pdf/render-contract-pdf.ts` (đối chiếu 2 file để nắm đúng
   pattern hiện có trước khi viết bảng/layout mới).
4. Quyết định thông tin "Bên bán" (mục "Khoảng trống cần quyết định" ở trên)
   — hỏi người dùng nếu cần tên công ty/MST thật, hoặc dùng placeholder hợp
   lý ("Công ty TNHH Leopard Logistics", để trống MST) nếu không có chỉ đạo
   khác.
5. Bắt đầu Task 1 (PDF), sau đó Task 3 (mobile preview — nhớ đổi
   `onOpenInvoice` sang nhận `invoiceId` thay vì `viewUrl`, và gọi đúng
   `GET /invoices/:id/download`) — Task 2 (email HTML) chỉ làm nếu còn thời
   gian, không phải deliverable bắt buộc.
