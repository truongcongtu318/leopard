# 02 — Phân tích khoảng trống & các trang cần bổ sung

> Dựa trên bản đồ năng lực ở [01-system-analysis.md](./01-system-analysis.md). Mỗi trang đề xuất ghi rõ: giá trị, phụ thuộc backend, và mức công sức.

**Thang công sức:**
- **S** — UI dựng trên endpoint đã có; ít/không cần sửa backend.
- **M** — cần thêm 1 endpoint query (list/tổng hợp) + UI.
- **L** — cần thêm cả command + query backend + UI (có thể kèm migration schema).

## Nhóm A — Tài chính & minh bạch

### A1. Hóa đơn VAT — `/admin/invoices` · **M**
- **Vì sao:** PRD bắt buộc hóa đơn VAT tự động; hiện không có nơi giám sát/gửi lại.
- **Backend có:** `GET invoices/order/:orderId`, `:id/download`, `:id/send`.
- **Cần thêm:** `GET admin/invoices` (list + lọc trạng thái/kỳ) — hoặc mở rộng dashboard query.
- **UI:** bảng hóa đơn, tải PDF, gửi lại email, cảnh báo "thiếu email nhận hóa đơn" (đã có trigger `notifyInvoiceEmailMissing`).

### A2. Sổ thanh toán & giao dịch — `/admin/payments` · **M**
- **Vì sao:** Gom VietQR/COD, đối soát thủ công tập trung thay vì rải trong từng order.
- **Backend có:** `POST admin/payments/:id/confirm`, `GET orders/:id/payments`.
- **Cần thêm:** `GET admin/payments` (list + lọc `PaymentStatus`, nguồn, thời gian).
- **UI:** danh sách giao dịch, xác nhận thủ công (tái dùng lệnh `CONFIRM_MANUAL_PAYMENT`), liên kết tới đơn.

### A3. Payouts tài xế — `/admin/payouts` · **S–M**
- **Vì sao:** `wallet.controller` có `admin/payouts/:id/approve|reject` **tách khỏi** `admin/withdrawals`. Cần làm rõ và có mặt quản trị.
- **Việc cần làm trước:** **đối chiếu** withdrawals vs payouts — hợp nhất luồng hoặc tách bạch rõ (một trang hoặc hai tab). Ghi quyết định vào ADR (`docs/architecture/adr`).
- **UI:** danh sách payout chờ duyệt, approve/reject có `note` + `clientRequestId` (idempotency).

## Nhóm B — Chăm sóc khách hàng & tuân thủ

### B1. Kiểm duyệt đánh giá — `/admin/reviews` · **M**
- **Backend có:** `GET orders/:id/reviews`.
- **Cần thêm:** `GET admin/reviews` (list + lọc theo điểm/tài xế/đơn), khả năng ẩn review vi phạm (command mới → **L** nếu cần ẩn).
- **UI:** danh sách review, lọc điểm thấp, xem theo tài xế.

### B2. Khiếu nại / Sự cố — `/admin/reports` · **L**
- **Vì sao:** Khách gửi report đơn (`POST orders/:id/reports`) nhưng **admin không có đường xem/xử lý** → rủi ro vận hành.
- **Cần thêm backend:** `GET admin/reports` (list + trạng thái) và command xử lý/đóng report (audit).
- **UI:** hàng đợi khiếu nại, gán trạng thái, liên kết đơn/khách/tài xế.

### B3. Audit log toàn cục — `/admin/audit` · **M**
- **Vì sao:** Audit hiện chỉ hiện trong `Audit Rail` theo từng đơn; hệ có lệnh irreversible cần **tra cứu tập trung**.
- **Cần thêm:** `GET admin/audit` (list + lọc actor/action/thời gian/target).
- **UI:** bảng audit tra cứu, tái dùng `AdminAuditEntryView` đã có trong `model.ts`.

## Nhóm C — Tăng trưởng & vận hành nâng cao

### C1. Khuyến mãi / Voucher — `/admin/promotions` · **L**
- **Vì sao:** `promotions.controller` chỉ `GET active` + `validate`; **không có CRUD**. PRD/mobile có dùng voucher.
- **Cần thêm backend:** `GET/POST/PATCH admin/promotions` (tạo/sửa/bật-tắt/hết hạn) + có thể migration cho quản trị mã.
- **UI:** danh sách + form tạo/sửa mã, giới hạn, hiệu lực; bật/tắt có audit.

### C2. Giám sát điều phối — `/admin/dispatch` · **L**
- **Vì sao:** Auto dispatch (nearest driver, offer 15s) chạy ngầm; khi offer fail/không có tài xế, admin **không có UI can thiệp**.
- **Cần thêm backend:** controller phơi trạng thái dispatch (`dispatch.gateway/service` hiện chỉ nội bộ) + command gán thủ công.
- **UI:** hàng đợi đơn chờ ghép, trạng thái offer, nút gán tài xế thủ công.

### C3. Thông báo / Broadcast — `/admin/notifications` · **L**
- **Vì sao:** `notifications.service.create()` tồn tại nhưng **không có route admin** để phát thông báo hệ thống (FCM).
- **Cần thêm backend:** `POST admin/notifications/broadcast` (chọn nhóm vai trò/tài xế/khách).
- **UI:** soạn thông báo, chọn đối tượng, lịch sử gửi. **Xác nhận trước khi gửi** (hành động outward-facing).

### C4. Cấu hình giá & Fleet Matrix — `/admin/pricing` · **L**
- **Vì sao:** Rate Van/Truck/Ba gác đang cố định trong code; nên có nơi cấu hình để không phải deploy.
- **Cần thêm backend:** lưu cấu hình giá + endpoint đọc/ghi (audit).
- **UI:** bảng giá theo loại xe/khoảng cách, phụ phí bốc xếp.

## Nhóm D — Bổ trợ (ưu tiên thấp)

| Trang | Ghi chú | Công sức |
|-------|---------|----------|
| `/admin/live-map` | Bản đồ live full-page (hiện chỉ `BentoMapCard`) | S–M |
| `/admin/settings` | Trạng thái provider (maps/OTP/payment), cờ `ALLOW_DEMO_PROVIDER`, nhãn mô phỏng | M |
| `/admin/support` | Mặt admin cho `chat` module | M |

## Tổng hợp phụ thuộc backend cần bổ sung

| Endpoint mới (đề xuất) | Phục vụ trang |
|------------------------|---------------|
| `GET admin/invoices` | A1 |
| `GET admin/payments` | A2 |
| `GET admin/reviews` (+ command ẩn) | B1 |
| `GET admin/reports` + command xử lý | B2 |
| `GET admin/audit` | B3 |
| `GET/POST/PATCH admin/promotions` | C1 |
| `GET admin/dispatch` + command gán | C2 |
| `POST admin/notifications/broadcast` | C3 |
| `GET/PUT admin/pricing` | C4 |

> Các endpoint này cần tuân thủ authorization (`@RequireRoles('ADMIN')`), transaction cho command, và ghi audit — theo invariant ở `CLAUDE.md`.
