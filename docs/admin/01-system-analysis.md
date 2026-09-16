# 01 — Phân tích hiện trạng Admin Web

> **Nguồn khảo sát:** `apps/admin/src` và `apps/api/src` trên nhánh `feature/admin-web-dev` (`origin/develop`), 2026-09-15.

## 1. Kiến trúc `apps/admin`

- **Stack:** Next.js 16 (App Router, RSC) + React 19, Tailwind 4, `@leopard/ui`, Leaflet (bản đồ), Recharts (biểu đồ), `socket.io-client` (realtime). Dev port `3002`.
- **Auth:** BFF session cookie (`src/lib/auth/*`), proxy API qua `src/app/api/v1/[...path]/route.ts`, role policy ở `src/lib/auth/role-policy.ts`.
- **Feature core:** `src/features/admin/` theo Ports & Adapters:
  - `port.ts` — hợp đồng năng lực (`AdminPort`).
  - `model.ts` — view model thuần (không phụ thuộc framework).
  - `adapter.ts` / `runtime.ts` — gọi API, ánh xạ về view model.
  - `execute-command.ts` — thực thi lệnh có audit.
  - `fixtures.ts` + `src/preview/` — dữ liệu mô phỏng cho chế độ preview (`dev:preview`).
- **Shell/UI:** `components/shell/OperationsShell.tsx`, `RoleNavigation.tsx`; bento cards trong `components/bento/`; tracking realtime `features/tracking/useOrderTrackingSocket.ts`.

**Đánh giá:** kiến trúc sạch, tách bạch presentation/logic, có preview + test → **rất thuận lợi để nhân bản trang mới** theo cùng khuôn.

## 2. Các trang Admin hiện có (7 trang)

Đường dẫn: `src/app/(admin)/admin/`

| Route | Màn hình | Năng lực (port) |
|-------|----------|-----------------|
| `/admin` | Overview bento: health/readiness, metrics, phân bố trạng thái đơn, đơn gần đây, bản đồ live | `readOverview` |
| `/admin/orders` | Danh sách đơn (lọc trạng thái/tài xế/thời gian) | `readOrders` |
| `/admin/orders/[id]` | Chi tiết đơn: route, ETA, tracking, media/POD, lịch sử, payment, **Audit Rail** | `readOrderDetail` |
| `/admin/users` | Danh sách user; bật/tắt tài khoản | `readUsers` |
| `/admin/fleets` | Danh sách đội xe + thống kê thành viên | `readFleets` |
| `/admin/drivers` | Danh sách tài xế + vị trí/độ mới | `readDrivers` |
| `/admin/driver-applications` | Duyệt hồ sơ tài xế (documents, contract, approve/reject/request-changes) | (qua adapter riêng) |
| `/admin/withdrawals` | Duyệt yêu cầu rút tiền (approve/reject) | (qua adapter riêng) |

**Lệnh có audit hiện hỗ trợ (`AdminCommandKind`):** `CANCEL_ORDER`, `DISABLE_USER`, `ENABLE_USER`, `CONFIRM_MANUAL_PAYMENT`.

## 3. Bản đồ năng lực Backend ↔ Admin

Ký hiệu: ✅ đã có trang admin khai thác · 🟡 backend có nhưng admin **chưa** khai thác · ⛔ chưa có endpoint dành cho admin.

| Domain | Endpoint / Module backend | Admin web |
|--------|---------------------------|-----------|
| Dashboard | `GET admin/dashboard` | ✅ overview |
| Orders | `GET admin/orders`, lệnh `CANCEL_ORDER` | ✅ orders (+detail) |
| Users | `GET admin/users`, `PATCH admin/users/:id/status` | ✅ users |
| Fleets | `GET admin/fleets` | ✅ fleets |
| Drivers | `GET admin/drivers` | ✅ drivers |
| Duyệt tài xế | `admin/drivers/applications`, `.../documents`, `.../contract`, `.../approve\|reject\|request-changes` | ✅ driver-applications |
| Rút tiền | `GET admin/withdrawals`, `.../approve\|reject` | ✅ withdrawals |
| Xác nhận thanh toán | `POST admin/payments/:id/confirm` | ✅ (qua lệnh `CONFIRM_MANUAL_PAYMENT` trong order detail) |
| Payouts tài xế | `POST admin/payouts/:id/approve\|reject` (`wallet.controller`) | 🟡 **trùng lặp tiềm tàng với withdrawals — cần đối chiếu** |
| Hóa đơn VAT | `GET invoices/order/:orderId`, `:id/download`, `:id/send` | 🟡 chưa có trang; ⛔ **thiếu endpoint list toàn hệ** |
| Thanh toán (sổ giao dịch) | `GET orders/:id/payments` (theo đơn) | 🟡 chưa có trang; ⛔ **thiếu endpoint list/tổng hợp** |
| Đánh giá/Review | `GET orders/:id/reviews` (theo đơn) | 🟡 chưa có trang; ⛔ **thiếu endpoint moderation list** |
| Khuyến mãi/Voucher | `GET promotions`, `POST promotions/validate` | ⛔ **chỉ đọc active + validate; không có CRUD admin** |
| Khiếu nại/Sự cố | `POST orders/:id/reports` + `GET users/me/reports` (chỉ `CUSTOMER`) | ⛔ **không có endpoint cho admin xem/xử lý** |
| Thông báo/Broadcast | `notifications.controller` (chỉ end-user đọc); service có `create()` | ⛔ **không có route admin để gửi broadcast** |
| Điều phối (dispatch) | `dispatch.gateway.ts` + `dispatch.service.ts` (nội bộ, tự động) | ⛔ **không có controller/UI theo dõi hay gán thủ công** |
| Audit toàn cục | `audit` module (đang gắn vào Audit Rail theo đơn) | 🟡 ⛔ **chưa có endpoint/trang tra cứu audit tập trung** |
| Tracking realtime | `tracking.controller` + socket | ✅ (nhúng trong overview/order detail); 🟡 chưa có trang bản đồ full |
| Định giá / Fleet Matrix | (rate nằm trong pricing logic) | ⛔ **không có trang cấu hình** |
| Hỗ trợ/Chat | `chat.controller` | 🟡 chưa có mặt admin |

## 4. Nhận định

- Admin đang phủ tốt **vòng đời đơn hàng + quản lý con người** (đơn, user, fleet, driver, duyệt hồ sơ, rút tiền).
- Thiếu mảng **tài chính minh bạch** (invoices/payments/payouts), **chăm sóc & tuân thủ** (reviews, khiếu nại, audit tập trung), **tăng trưởng** (promotions), và **vận hành nâng cao** (dispatch monitor, notifications broadcast, pricing config).
- Phần lớn khoảng trống cần **thêm endpoint query/command phía backend** trước, rồi mới dựng UI — xem [02-gap-analysis.md](./02-gap-analysis.md).
