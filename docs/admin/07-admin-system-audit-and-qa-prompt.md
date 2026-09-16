# LEOPARD Admin Operations Console — Toàn Diện Audit, Pentest & QA Execution Prompt

> **Mục tiêu**: Hướng dẫn chi tiết dành cho Agent ở session mới để tiến hành rà soát, kiểm thử xâm nhập (pentest), kiểm tra toàn vẹn logic nghiệp vụ, phát hiện thành phần còn thiếu, và đánh giá tính chuẩn xác UI/UX của toàn bộ hệ thống **LEOPARD Admin Operations Console**.

---

## 1. Bối Cảnh & Mục Tiêu Nhiệm Vụ (Context & Objective)

Hệ thống **LEOPARD Admin Operations Console** vừa hoàn thành toàn bộ 23 task trải rộng qua 3 Wave (`ADM-W1-T01` đến `ADM-W3-T07`).
Hệ thống bao gồm:
- **Backend API (`apps/api`)**: NestJS, Prisma, PostgreSQL + PostGIS, WebSocket, 12 cụm Controller/Service admin, bảo vệ bằng `@RequireRoles('ADMIN')`, transaction và audit logging.
- **Frontend Admin Web (`apps/admin`)**: Next.js 16 (App Router), Tailwind CSS, Lucide icons, 18 màn hình nghiệp vụ, kiến trúc Port/Adapter/Runtime/Fixtures với **44 preview scenarios**.
- **Packages Dùng Chung**: `@leopard/shared` (DTOs & Enums), `@leopard/validators` (Zod schemas).

**Nhiệm vụ của bạn trong session này là trở thành một Lead QA & Security / Senior Frontend Auditor khắt khe nhất**, kiểm tra toàn diện mã nguồn hiện tại để tìm ra:
1. **Lỗ hổng bảo mật & phân quyền (Security & Authorization Flaws)**.
2. **Thành phần còn thiếu hoặc đứt gãy (Missing Components, Dead Links, Incomplete Flows)**.
3. **Lỗi logic hiển thị & trải nghiệm UI/UX (Display Flaws, Boundary States, Responsiveness)**.
4. **Vi phạm tiêu chuẩn thiết kế NexaFleet Bento & Nguyên tắc không Emoji**.

---

## 2. Checklist Rà Soát Chi Tiết (4 Trục Đánh Giá)

### TRỤC 1: Lỗ Hổng Bảo Mật & Toàn Vẹn Dữ Liệu (Security & Data Integrity)

- [ ] **RBAC & Authorization Gate**:
  - Kiểm tra toàn bộ endpoint tại `apps/api/src/admin/admin.controller.ts` và các file controller liên quan: Tất cả đã có `@UseGuards(RolesGuard)` và `@RequireRoles('ADMIN')` chưa?
  - Liệu có endpoint nào quên guard dẫn đến việc `CUSTOMER`, `DRIVER`, hoặc `FLEET_OWNER` có thể gọi trộm được không?
  - Dữ liệu trả về cho Admin có vô tình làm lộ các trường nhạy cảm như hash mật khẩu, OTP, access token của tài xế/khách hàng không?
- [ ] **Audit Logging & Transaction**:
  - Kiểm tra mọi hàm thay đổi dữ liệu trong `apps/api/src/admin/admin-command.service.ts`:
    1. Xác nhận thanh toán thủ công (`CONFIRM_MANUAL_PAYMENT`)
    2. Duyệt/từ chối rút tiền (`APPROVE_WITHDRAWAL`, `REJECT_WITHDRAWAL`)
    3. Tạo/Cập nhật voucher khuyến mãi (`CREATE_PROMOTION`, `UPDATE_PROMOTION_STATUS`)
    4. Xử lý giải quyết khiếu nại (`RESOLVE_REPORT`, `CLOSE_REPORT`)
    5. Ẩn đánh giá vi phạm (`HIDE_REVIEW`)
    6. Điều phối gán tài xế thủ công (`DISPATCH_MANUAL_REASSIGN`)
    7. Phát thông báo hệ thống đa kênh (`BROADCAST_NOTIFICATION`)
    8. Cập nhật bảng giá cước động (`UPDATE_PRICING`)
    9. Gửi phản hồi hỗ trợ trực tuyến (`SEND_SUPPORT_MESSAGE`)
  - **Tiêu chuẩn bắt buộc**: Tất cả các thao tác trên CÓ nằm trong `prisma.$transaction` không? CÓ ghi nhận bản ghi vào `AuditLog` (`actorId`, `action`, `targetId`, `reason`, `metadata`) không?
- [ ] **Tính Lũy Đẳng (Idempotency) & Chống Double-action**:
  - Các thao tác liên quan tới tài chính và gửi tin (`withdrawals`, `payments`, `broadcast`) có nhận và kiểm tra `clientRequestId` để ngăn chặn double-click / double-request không?
  - Xử lý xung đột phiên (`contextVersion` / Optimistic Locking): Khi dữ liệu bị thay đổi bởi người khác, hệ thống có trả về trạng thái `conflict` và yêu cầu reload không?

---

### TRỤC 2: Rà Soát Thành Phần Thiếu & Đứt Gãy Nghiệp Vụ (Completeness & Broken Links)

Kiểm tra đối chiếu 18 màn hình và luồng thao tác:

- [ ] **Tổng quan điều hành (`/admin`)**:
  - KPI cards (Doanh thu, Đơn hàng, Tài xế hoạt động, Tỷ lệ hủy) hiển thị đúng định dạng tiền tệ VND (`₫`) và phần trăm.
  - Các liên kết nhanh tới đơn hàng kẹt, tài xế chờ duyệt có điều hướng đúng route không?
- [ ] **Bản đồ trực tiếp (`/admin/live-map`)**:
  - Bố cục Dark Mode toàn màn hình, thanh tìm kiếm kính mờ, các bộ lọc trạng thái xe.
  - Có đầy đủ nhãn bắt buộc **"ETA dự kiến"** và **"Dữ liệu mô phỏng"** (khi ở mock mode) không?
- [ ] **Trung tâm điều phối (`/admin/dispatch`)**:
  - Kiểm tra tỷ lệ layout: Hàng đợi (Queue) bên trái chiếm **35–40%**, Bản đồ & Ngữ cảnh tài xế bên phải chiếm **60–65%** đúng nhận xét `comment.md`.
  - Nút "Gán tài xế thủ công" có mở modal xác nhận (hiển thị thông tin đơn, tài xế nhận, yêu cầu nhập lý do) trước khi bắn API không?
- [ ] **Quản lý đơn hàng (`/admin/orders` & `/admin/orders/[id]`)**:
  - Bộ lọc trạng thái đơn, tìm kiếm theo mã đơn, khách hàng, tài xế.
  - Trang chi tiết có hiển thị đầy đủ timeline, lộ trình lấy/giao, thông tin hàng hóa, chứng từ giao nhận (POD), thanh toán?
- [ ] **Thanh toán & Đối soát (`/admin/payments`)**:
  - Lọc theo cổng thanh toán (VietQR, Tiền mặt, Ví).
  - Nút "Xác nhận thủ công" cho đơn chuyển khoản treo có yêu cầu nhập mã tham chiếu giao dịch và lý do không?
- [ ] **Hóa đơn điện tử VAT (`/admin/invoices`)**:
  - Cảnh báo trực quan cho hóa đơn "Thiếu email nhận".
  - Nút "Gửi lại email" có modal xác nhận trước khi thực hiện không? Link tải PDF có hoạt động chuẩn không?
- [ ] **Yêu cầu rút tiền (`/admin/withdrawals`)**:
  - Tuân thủ ADR-0001: Hợp nhất luồng duyệt rút tiền của tài xế.
  - Nút Phê duyệt / Từ chối có modal nhập lý do và ghi nhận audit log không?
- [ ] **Tài xế & Hồ sơ đăng ký (`/admin/driver-applications` & `/admin/drivers`)**:
  - Quy trình duyệt hồ sơ tài xế: Kiểm tra bằng lái, căn cước, cà vẹt xe.
  - Khóa / Mở khóa tài khoản tài xế có ghi lý do rõ ràng không?
- [ ] **Đội xe đối tác (`/admin/fleets`) & Người dùng (`/admin/users`)**:
  - Bảng danh sách, phân quyền, trạng thái kích hoạt tài khoản.
- [ ] **Hàng đợi khiếu nại & Case Workspace (`/admin/reports` & `/admin/reports/[id]`)**:
  - Tại `/admin/reports`: 4 thẻ KPI strip, bảng khiếu nại, click vào dòng có mở **Quick Drawer** trượt từ phải sang không?
  - Nút "Xem không gian xử lý đầy đủ" trong drawer có chuyển sang `/admin/reports/[id]` chuẩn xác không?
  - Tại `/admin/reports/[id]`: Bố cục 2 cột Bento (Cột trái: Nội dung, bằng chứng, internal note; Cột phải: Ngữ cảnh đơn hàng + Form giải quyết) hoạt động trơn tru không?
- [ ] **Đánh giá & Phản hồi (`/admin/reviews`)**:
  - Lọc review sao thấp (1–2 sao), xem theo tài xế.
  - Nút "Ẩn đánh giá vi phạm" có modal xác nhận và ghi lý do vào audit log không?
- [ ] **Chiến dịch khuyến mãi (`/admin/promotions`)**:
  - Form tạo mới voucher: validation ngày bắt đầu/kết thúc, mức giảm tối đa, số lượt dùng.
  - Công tắc Bật/Tắt khuyến mãi có modal xác nhận trạng thái không?
- [ ] **Trung tâm phát thông báo (`/admin/notifications`)**:
  - Phân loại đối tượng gửi: `ALL`, `CUSTOMER`, `DRIVER`, `FLEET_OWNER`.
  - Preview thời gian thực nội dung thông báo.
  - Bắt buộc có **Modal xác nhận rủi ro** trước khi phát thông báo diện rộng.
- [ ] **Cấu hình bảng cước phí (`/admin/pricing`)**:
  - Bảng ma trận giá cước theo từng phương tiện (Xe máy, Xe bán tải, Xe tải 1 tấn, 2 tấn).
  - Cước mở cửa, cước km tiếp theo, phụ phí bốc xếp.
  - Nút "Lưu cấu hình" có cảnh báo ảnh hưởng tới toàn bộ đơn hàng mới không?
- [ ] **Giám sát hạ tầng & tích hợp (`/admin/settings`)**:
  - Health check các dịch vụ: Maps (Vietmap/Demo), OTP (Firebase/Demo), Storage (S3/Local), Payment (VietQR/PayOS/Demo).
  - Nút "Kiểm tra kết nối tất cả" (Ping all) có cập nhật trạng thái realtime không?
- [ ] **Tổng đài hỗ trợ trực tuyến (`/admin/support`)**:
  - 4 KPI cards (Hội thoại mở, Cần phản hồi, Thời gian phản hồi TB, CSAT).
  - Luồng chat phân vai rõ ràng: Khách hàng, Tài xế, Admin Điều hành.
  - Gợi ý câu trả lời nhanh (quick reply chips), ô soạn thảo gửi tin cập nhật ngay lập tức.
- [ ] **Nhật ký kiểm toán (`/admin/audit`)**:
  - Tìm kiếm và lọc theo Hành động (`action`), Người thực hiện (`actorId`), Đối tượng (`targetId`), Khoảng thời gian.
  - Xem chi tiết payload JSON diff trước/sau khi thay đổi.

---

### TRỤC 3: Rà Soát Thẩm Mỹ UI/UX & Chuẩn NexaFleet Bento (Aesthetics & Design Consistency)

- [ ] **QUY TẮC BẤT DI BẤT DỊCH — ZERO ANIMATED/CARTOON EMOJIS**:
  - Chạy lệnh quét toàn bộ mã nguồn frontend: Có sót bất kỳ ký tự emoji hoạt hình nào (ví dụ: `📦, 🚀, 🛵, ⚠️, 💰, 🔔, ❌, ✅`) trong JSX, nhãn nút, tiêu đề, placeholder không?
  - Tất cả các biểu tượng phải là **Lucide React vector icons** (`strokeWidth={1.75}`).
- [ ] **NexaFleet Modern Bento Console Specs**:
  - Nền canvas xám sáng thanh lịch (`#F4F5F7` / `#F8FAFC`).
  - Thẻ bento trắng tinh khôi (`bg-white`), bo góc mềm mại `rounded-3xl` (24px–28px).
  - Viền mỏng tinh tế `border-black/[0.06]` hoặc `border-slate-100`, bóng êm dịu `shadow-xs` / `shadow-sm`.
  - Navigation bar: Tab active dạng viên thuốc đen tuyền bo tròn (`bg-slate-900 text-white rounded-full`), các tab inactive xám nhạt hover êm ái.
- [ ] **5 Trạng Thái Bắt Buộc (5 States of Every Screen)**:
  - **Loading State**: Skeleton shimmer mượt mà, không giật lag layout.
  - **Empty State**: Khi danh sách rỗng, hiển thị icon Lucide monochrome tinh tế + thông điệp tiếng Việt lịch sự + nút hành động (CTA) tương ứng.
  - **Error State**: Bắt lỗi qua Error Boundary, hiển thị nút "Thử lại" (Retry).
  - **Success State**: Toast thông báo xanh lục nhạt tinh tế, tự đóng sau 3-5 giây.
  - **Permission-denied State**: Hiển thị màn hình từ chối quyền truy cập trang trọng khi không phải Admin.
- [ ] **Khả năng tương thích & Responsive (WCAG AA)**:
  - Kiểm tra độ tương phản văn bản trên nền trắng/xám (contrast ratio ≥ 4.5:1).
  - Kiểm tra text overflow, văn bản dài không làm vỡ khung bento, hỗ trợ `truncate` và `title tooltip`.
  - Kiểm tra bàn phím (Tab navigation, Focus outline rõ ràng).

---

### TRỤC 4: Kiểm Thử Tự Động & Preview Scenarios (Automation & Build Gates)

Chạy và xác minh toàn bộ các cổng kỹ thuật sau, đảm bảo không có bất kỳ warning/error nào:

```bash
# 1. Kiểm tra type và linting Frontend Web
pnpm --filter web typecheck
pnpm --filter web lint

# 2. Chạy toàn bộ 35 suites kiểm thử Frontend Web
pnpm --filter web test

# 3. Kiểm tra type và linting Backend API
pnpm --filter api typecheck
pnpm --filter api lint

# 4. Chạy toàn bộ bộ kiểm thử Admin Backend API
pnpm --filter api test src/admin

# 5. Kiểm tra khả năng đóng gói Production
pnpm --filter web build
pnpm --filter api build

# 6. Kiểm tra toàn bộ 44 Preview Scenarios trong fixtures.ts
pnpm --filter web test src/features/admin/fixtures.test.ts
```

---

## 3. Quy Trình Báo Cáo Kết Quả Khi Phát Hiện Lỗi

Nếu phát hiện bất kỳ vấn đề nào, hãy phân loại và báo cáo theo bảng phân loại mức độ nghiêm trọng:

| Mức độ | Định nghĩa | Ví dụ | Hành động yêu cầu |
|:---|:---|:---|:---|
| **P0 (Blocker)** | Lỗ hổng bảo mật, bypass quyền, mất dữ liệu, sập build | Thiếu `@RequireRoles('ADMIN')`, thao tác tiền không có transaction | Fix ngay lập tức trước tiên |
| **P1 (Critical)** | Lỗi logic nghiệp vụ, thiếu audit log, thiếu modal xác nhận thao tác trọng yếu | Gửi broadcast không có modal cảnh báo, thiếu audit log khi ẩn review | Sửa và bổ sung test case |
| **P2 (Major)** | Lỗi hiển thị UI, xuất hiện emoji hoạt hình, vỡ layout bento | Sót icon emoji `📦`, responsive bị tràn ngang, thiếu empty state | Tinh chỉnh giao diện chuẩn specs |
| **P3 (Minor)** | Sai chính tả tiếng Việt, căn lề chưa chuẩn pixel | Nhãn nút chưa đồng nhất, tooltip chưa hiển thị | Cải thiện độ hoàn thiện |

Sau khi quét xong, hãy lập kế hoạch sửa đổi (Implementation Plan) và tiến hành xử lý dứt điểm từng lỗi trước khi bàn giao!
