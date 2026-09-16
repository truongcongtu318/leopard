# ADR 0001: Hợp nhất luồng Rút tiền (Withdrawals) và Chi trả (Payouts) cho Tài xế

- **Mã:** ADR-0001
- **Trạng thái:** Accepted
- **Ngày:** 2026-09-15
- **Tác giả:** LEOPARD Core Team / Senior Operations Console Architect
- **Tham chiếu:** `docs/admin/05-implementation-plan.md` (Task `ADM-W1-T01`), `apps/api/src/admin/admin-withdrawal-review.service.ts`, `apps/api/src/drivers/wallet.service.ts`

---

## 1. Bối cảnh (Context)

Trong quá trình khảo sát codebase của hệ thống LEOPARD tại mốc phát triển Wave 1, phát hiện tồn tại song song 2 cơ chế rút tiền/chi trả cho tài xế:

### 1.1 Cơ chế A: `WithdrawalRequest` (Di sản từ pilot ban đầu)
- **Database Model:** `WithdrawalRequest` trong Prisma schema:
  - Liên kết với `User` (`driverId`).
  - Trạng thái `WithdrawalStatus` (`PENDING`, `APPROVED`, `REJECTED`).
  - Hỗ trợ `clientRequestId`, `reviewedById`, `reviewedAt`, `reviewNote`.
- **Backend Service:**
  - `AdminWithdrawalReviewService` (`apps/api/src/admin/admin-withdrawal-review.service.ts`).
  - Ghi vết kiểm toán đầy đủ qua `AuditService` (`WITHDRAWAL_APPROVED`, `WITHDRAWAL_REJECTED`).
  - Kiểm tra độ dài ghi chú 5–500 ký tự.
- **Tính toán số dư:**
  - `WithdrawalsRepository.getWalletSummary` tính số dư khả dụng động (on-the-fly) bằng tổng doanh thu các đơn hàng `DELIVERED` trừ đi các yêu cầu rút tiền `PENDING`/`APPROVED`.
- **Frontend Admin:** Đã có trang `/admin/withdrawals` trong `apps/admin`.

### 1.2 Cơ chế B: `PayoutRequest` & `DriverProfile.balanceVnd` (Driver Wallet mới)
- **Database Model:** `PayoutRequest` (migration `20260915000000_add_driver_wallet`):
  - Liên kết trực tiếp với `DriverProfile` (`driverProfileId`).
  - Trạng thái `PayoutStatus` (`PENDING`, `APPROVED`, `REJECTED`).
- **Cơ chế số dư sổ cái (Ledger):**
  - Cột số dư tường minh `DriverProfile.balanceVnd`.
  - Khi tài xế tạo yêu cầu (`POST driver/payout`): Giảm số dư ngay trong transaction (`balanceVnd: { decrement: amountVnd }`).
  - Khi Admin duyệt (`POST admin/payouts/:id/approve`): Đánh dấu `APPROVED`.
  - Khi Admin từ chối (`POST admin/payouts/:id/reject`): Hoàn tiền lại số dư ví (`balanceVnd: { increment: amountVnd }`).
- **Tình trạng:**
  - Chưa có endpoint danh sách cho Admin (`GET admin/payouts`).
  - Chưa tích hợp `AuditService`.
  - Chưa lưu lý do từ chối vào cơ sở dữ liệu (`// ponytail: reason stored only in-memory`).

### 1.3 Vấn đề nảy sinh nếu duy trì 2 luồng
1. **Trải nghiệm vận hành (UX Confusion):** Quản trị viên không biết phải vào `/admin/withdrawals` hay `/admin/payouts` để duyệt tiền cho tài xế.
2. **Rủi ro tài chính & Rút tiền kép (Double Spending):** Nếu tài xế rút qua `WithdrawalRequest` (dựa trên tổng cước đơn giao) và đồng thời rút qua `PayoutRequest` (dựa trên `balanceVnd`), hệ thống có nguy cơ thâm hụt ngân quỹ.
3. **Lãng phí mã nguồn:** Xây dựng hai màn hình Admin gần như giống hệt nhau về nghiệp vụ.

---

## 2. Quyết định (Decision)

Chúng tôi quyết định **HỢP NHẤT (CONVERGE)** hai cơ chế thành **MỘT LUỒNG NGHIỆP VỤ DUY NHẤT**: **Quản lý Rút tiền / Chi trả tài xế (Driver Payouts & Withdrawals)**.

### 2.1 Lộ trình kỹ thuật cụ thể:
1. **Chọn mô hình số dư ví (`DriverProfile.balanceVnd`) làm Source of Truth:**
   - Việc duy trì số dư tường minh (persisted ledger balance) với thao tác decrement khi yêu cầu và increment hoàn trả khi từ chối là chuẩn mực tài chính an toàn hơn nhiều so với việc tính tổng on-the-fly từ bảng `Order`.
2. **Hợp nhất Domain Model & API:**
   - Chuẩn hóa thực thể quản lý theo hướng `PayoutRequest` kết hợp các thuộc tính bảo chứng của `WithdrawalRequest`:
     - Bổ sung `reviewNote` (lý do phê duyệt/từ chối, bắt buộc khi từ chối).
     - Bổ sung `clientRequestId` (idempotency key chống submit đúp).
     - Bổ sung ghi log kiểm toán bắt buộc qua `AuditService` (`PAYOUT_APPROVED`, `PAYOUT_REJECTED`).
   - Cung cấp API truy vấn danh sách phân trang `GET admin/payouts` (hỗ trợ lọc theo trạng thái, ngày, tài xế) hoặc đồng bộ dữ liệu vào `admin/withdrawals`.
3. **Hợp nhất Giao diện Admin Console:**
   - Giữ duy nhất **1 trang quản trị** trên thanh điều hướng:
     - Route chuẩn: `/admin/withdrawals` (hoặc alias `/admin/payouts`), hiển thị nhãn: **"Rút tiền" / "Chi trả tài xế"** thuộc nhóm **TÀI CHÍNH**.
   - Hủy bỏ yêu cầu tạo trang `/admin/payouts` độc lập (Task `ADM-W1-T06` được đánh dấu là **HỢP NHẤT VÀO `/admin/withdrawals`**).
   - Tái sử dụng và nâng cấp trang `/admin/withdrawals` hiện có để kết nối với nguồn dữ liệu ví chuẩn, hỗ trợ modal duyệt/từ chối có nhập ghi chú, kiểm tra số dư và hiển thị thông tin ngân hàng.

---

## 3. Hệ quả (Consequences)

### 3.1 Tác động tích cực
- **Trải nghiệm liền mạch:** Admin chỉ có một nơi duy nhất để kiểm soát toàn bộ dòng tiền chi trả cho tài xế.
- **An toàn tài chính:** Đảm bảo 100% các yêu cầu rút tiền đều được khóa/trừ số dư tức thì trong ví tài xế, tránh tuyệt đối rủi ro chi trả vượt số dư.
- **Tuân thủ kiểm toán (Compliance & Audit):** Mọi thao tác duyệt/từ chối đều có người thực hiện (`actorId`), lý do (`reviewNote`), mã yêu cầu idempotent (`clientRequestId`) và bản ghi bất biến trong `AuditLog`.
- **Tối ưu công sức phát triển:** Tiết kiệm thời gian dựng trang trùng lặp (T06), tập trung nâng cấp trang hiện có đạt chuẩn Production Bento Console.

### 3.2 Tác động đến kế hoạch Wave 1
- **Task `ADM-W1-T01`:** Hoàn thành với việc ban hành ADR này.
- **Task `ADM-W1-T02` (`GET admin/payments`):** Tiếp tục thực hiện bình thường (đối soát thanh toán từ khách hàng).
- **Task `ADM-W1-T03` (`/admin/payments`):** Tiếp tục thực hiện bình thường.
- **Task `ADM-W1-T06` (`/admin/payouts`):** Được gộp vào việc chuẩn hóa `/admin/withdrawals` và hoàn thiện backend `WalletService` (thêm `AuditService`, `reviewNote`, endpoint list).
