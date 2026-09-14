# Kế hoạch chuyển đổi toàn bộ màn hình Customer sang API thật (Customer Real API Migration)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Chuyển đổi toàn bộ 22 màn hình Customer trong `apps/mobile` sang sử dụng API backend thật, loại bỏ dữ liệu hardcode/giả lập, tuân thủ đúng phạm vi mini-production pilot (SRS + Out-of-Scope constraints).

**Architecture:** 
- **Phía Mobile (`apps/mobile`)**: 
  - Triển khai Adapter pattern (`createCustomerHttpAdapter`, `CustomerOrdersPort`) cho các màn hình chưa có; kết nối trực tiếp các endpoint NestJS hiện hữu (`/orders`, `/payments`, `/maps`, `/users/me`, `/notifications`).
  - Màn hình Ví (`/customer/wallet`): Chuyển thành **Lịch sử Ký quỹ & Thanh toán theo đơn** (Escrow & Payment History). Bỏ thẻ ngân hàng giả •••• 8839, bỏ nút Nạp/Rút tiền giả lập (vi phạm mục 11 `05-out-of-scope.md`). Hiển thị danh sách các khoản ký quỹ và thanh toán thật theo từng đơn của khách hàng (`PaymentIntent`).
  - Màn hình Khuyến mãi (`/customer/promotions`): Nối với backend API thật (`GET /promotions`, `POST /promotions/validate`).
- **Phía Backend (`apps/api`)**:
  - Bổ sung các module tối thiểu còn thiếu trong phạm vi hợp lệ:
    1. `CustomerAddress` CRUD (`/users/me/addresses`)
    2. `OrderReview` tối giản (`/orders/:id/reviews`)
    3. `SupportTicket` khiếu nại (`/orders/:id/reports`)
    4. `In-Trip Chat Gateway` qua Socket.IO namespace `/chat` (`OrderMessage`)
    5. `Promotion` / `Voucher` tối giản (`GET /promotions`, `POST /promotions/validate`, tích hợp giảm trừ vào tính giá đơn)
  - Cập nhật tài liệu SRS/API spec trong cùng task theo quy tắc `CONTRIBUTING.md`.

**Tech Stack:** NestJS, Prisma, PostgreSQL, React Native, Expo Router, TanStack React Query, Socket.IO.

---

## Global Constraints

- **KHÔNG** tạo tính năng ví điện tử tài chính trung gian: không có số dư ảo, không nạp/rút tiền (tuân thủ `05-out-of-scope.md` điều 11).
- Thanh toán & Ký quỹ gắn chặt với từng đơn hàng thông qua `PaymentIntent` (SRS FR-08).
- Mọi dữ liệu tiền tệ lưu số nguyên VND (SRS Section 4).
- Mọi API mới phải có guard xác thực `AccessTokenGuard`, kiểm tra role `CUSTOMER` và ownership (SRS FR-01).
- Toàn bộ thời gian hiển thị format ISO 8601 UTC.
- Mobile giữ vững zero-regression các unit test hiện có (`pnpm --filter mobile test`).

---

### Task 1: Nối API thật cho Checkout / Thanh toán VietQR payOS
**Files:**
- Modify: `apps/mobile/app/customer/orders/checkout/[id].tsx`
- Test: `apps/mobile/src/features/customer/orders/checkout.test.tsx`

**Interfaces:**
- Consumes: `POST /orders/:id/payments` (tạo `PaymentIntent`), `GET /orders/:id/payments` (tra cứu trạng thái)
- Produces: Màn hình Checkout hiển thị mã QR thật từ `paymentIntent.qrPayload` và polling đối soát tự động từ backend thay vì fake `setTimeout(3000)`.

- [ ] **Step 1: Viết test cho OrderCheckoutScreen với API thật**
Kiểm tra `OrderCheckoutScreen` gọi `createCustomerHttpAdapter().requestOrderPayment(orderId)` khi mount, nhận `qrPayload` từ backend và hiển thị đúng mã QR. Polling trạng thái thanh toán và redirect khi `status === 'PAID_MANUAL'` hoặc `status === 'SUCCEEDED'`.

- [ ] **Step 2: Chạy test xác nhận thất bại**
`pnpm --filter mobile test -- OrderCheckoutScreen`

- [ ] **Step 3: Cập nhật OrderCheckoutScreen**
Loại bỏ chuỗi QR ghép tay (`0002010102123854...`), gọi API tạo payment intent từ backend, load dynamic payload và ngân hàng thụ hưởng trả về từ API. Thay timer đối soát giả bằng polling gọi `GET /orders/:id/payments`.

- [ ] **Step 4: Chạy test xác nhận thành công**
`pnpm --filter mobile test`

- [ ] **Step 5: Commit**
`git commit -m "feat(mobile): connect real VietQR payment intent and polling in customer checkout"`

---

### Task 2: Loại bỏ hardcode tài xế trong Tracking & Orders Detail
**Files:**
- Modify: `apps/mobile/src/features/tracking/CustomerTrackingRuntime.tsx`
- Modify: `apps/mobile/src/features/customer/orders/adapter.ts:576`
- Test: `apps/mobile/src/features/tracking/RealtimeTrackingScreen.test.tsx`

**Interfaces:**
- Consumes: `MappedOrderResponse.assignedDriver` từ `GET /orders/:id`
- Produces: Dữ liệu tài xế thật (`name`, `phone`, `licensePlate`, `vehicleType`) được truyền xuyên suốt vào `RealtimeTrackingScreen` và Detail view.

- [ ] **Step 1: Cập nhật test RealtimeTrackingScreen**
Thêm assertion kiểm tra thông tin tài xế hiển thị từ API thay vì giá trị mặc định "Nguyễn Minh An" / "59C-882.14".

- [ ] **Step 2: Chạy test xác nhận fail**

- [ ] **Step 3: Sửa CustomerTrackingRuntime và adapter.ts**
Trích xuất `order.assignedDriver` từ `getOrderDetailView`: map `driver.name`, `driver.phone`, `driver.licensePlate` trực tiếp từ backend response. Chỉ fallback sang "Đang điều phối tài xế" nếu đơn chưa có người nhận.

- [ ] **Step 4: Chạy test xác nhận pass**
`pnpm --filter mobile test -- RealtimeTrackingScreen`

- [ ] **Step 5: Commit**
`git commit -m "fix(mobile): use real assigned driver info in customer tracking and detail"`

---

### Task 3: Chuyển đổi màn hình Ví (Wallet) thành Lịch sử ký quỹ & Thanh toán thật
*Loại bỏ liên kết ngân hàng giả và số dư ảo; chuyển thành quản lý ký quỹ theo từng đơn hàng.*

**Files:**
- Modify: `apps/mobile/src/features/customer/wallet/CustomerWalletScreen.tsx`
- Modify: `apps/mobile/src/features/customer/profile/ProfileScreen.tsx`
- Test: `apps/mobile/src/features/customer/wallet/CustomerWalletScreen.test.tsx`

**Interfaces:**
- Consumes: `GET /orders` và `GET /orders/:id/payments`
- Produces: 
  - Bỏ thẻ NAPAS giả `•••• 8839`, bỏ nút nạp/rút tiền giả lập.
  - Hiển thị danh sách các khoản Ký quỹ (Escrow) theo từng đơn hàng: Mã đơn, ngày giờ, số tiền cọc/ký quỹ, trạng thái (`CHỜ THANH TOÁN`, `ĐÃ KÝ QUÝ`, `HOÀN CỌC`, `ĐÃ HOÀN TẤT`).
  - Nút "Thanh toán ngay" dẫn sang đúng mã QR thanh toán của đơn đó nếu đang chờ ký quỹ.

- [ ] **Step 1: Viết test cho Wallet biến thể Escrow History**
Đảm bảo màn hình hiển thị danh sách giao dịch từ danh sách đơn hàng của khách hàng, bỏ các nút Nạp tiền / Rút tiền / Số thẻ giả.

- [ ] **Step 2: Cập nhật CustomerWalletScreen**
Xóa mảng `mockTransactions`, xóa `balance` RAM 1.250.000₫. Gọi `port.getOrdersView('ALL')` để tổng hợp các khoản ký quỹ và thanh toán của khách hàng. Cập nhật `ProfileScreen` hiển thị tổng số chuyến/giao dịch thay vì số dư ví ảo.

- [ ] **Step 3: Chạy test và typecheck**
`pnpm --filter mobile test -- CustomerWalletScreen`

- [ ] **Step 4: Commit**
`git commit -m "refactor(mobile): transform fake wallet into real escrow and payment history"`

---

### Task 4: Backend API & Mobile Cloud Address Book (Sổ địa chỉ)
**Files:**
- Create: `apps/api/src/addresses/addresses.controller.ts`
- Create: `apps/api/src/addresses/addresses.service.ts`
- Create: `apps/api/src/addresses/dto/create-address.dto.ts`
- Modify: `apps/api/prisma/schema.prisma` (thêm model `CustomerAddress`)
- Modify: `apps/mobile/src/features/customer/addresses/address-store.ts`
- Modify: `apps/mobile/src/features/customer/addresses/AddressBookScreen.tsx`
- Docs: `docs/api/01-rest-api-spec.md`

**Interfaces:**
- Produces API: `GET /users/me/addresses`, `POST /users/me/addresses`, `DELETE /users/me/addresses/:id`, `PATCH /users/me/addresses/:id/default`
- Consumes: `AddressBookScreen` gọi HTTP adapter thay vì chỉ lưu `localStorage`.

- [ ] **Step 1: Thêm model Prisma `CustomerAddress` và migration**
Model gồm `id`, `userId`, `label`, `address`, `latitude`, `longitude`, `isDefault`, `createdAt`, `updatedAt`.

- [ ] **Step 2: Viết Address Module trong NestJS Backend**
Controller, Service, DTO với validation và xác thực `CUSTOMER`.

- [ ] **Step 3: Chạy test backend**
`pnpm --filter api test`

- [ ] **Step 4: Cập nhật Mobile `address-store.ts` và `AddressBookScreen.tsx`**
Thay thế `mockAddresses` và `localStorage` thuần bằng HTTP calls đồng bộ với backend.

- [ ] **Step 5: Chạy test mobile**
`pnpm --filter mobile test -- AddressBookScreen`

- [ ] **Step 6: Commit**
`git commit -m "feat: implement real cloud address book in backend and mobile"`

---

### Task 5: Triển khai In-Trip Chat Socket Gateway cho đơn hàng
*Tuân thủ Out-of-Scope: Dùng kênh chat socket nội bộ trong chuyến đi thay vì viễn thông chuyên biệt.*

**Files:**
- Create: `apps/api/src/chat/chat.gateway.ts`
- Create: `apps/api/src/chat/chat.service.ts`
- Modify: `apps/api/prisma/schema.prisma` (thêm model `OrderMessage`)
- Modify: `apps/mobile/src/features/customer/chat/OrderChatScreen.tsx`
- Modify: `apps/mobile/src/features/customer/orders/port.ts` & `adapter.ts`

**Interfaces:**
- Produces: Socket namespace `/chat`, events `chat:join`, `chat:send`, `chat:message`, REST `GET /orders/:id/messages`
- Consumes: `OrderChatScreen` kết nối socket thật, trao đổi tin nhắn giữa Customer và Assigned Driver.

- [ ] **Step 1: Prisma schema `OrderMessage` và migration**
- [ ] **Step 2: Xây dựng ChatGateway và ChatService trong `apps/api`**
- [ ] **Step 3: Cập nhật `OrderChatScreen.tsx` trên mobile**
Loại bỏ `initialMessages` cứng, tải lịch sử tin nhắn thật và gửi tin nhắn qua WebSocket.

- [ ] **Step 4: Chạy test backend và mobile**
- [ ] **Step 5: Commit**
`git commit -m "feat: implement real in-trip order chat via socket for customer and driver"`

---

### Task 6: API Đánh giá chuyến đi (Order Review) & Khiếu nại (Report Ticket)
**Files:**
- Create: `apps/api/src/reviews/reviews.controller.ts`
- Create: `apps/api/src/reports/reports.controller.ts`
- Modify: `apps/api/prisma/schema.prisma` (`OrderReview`, `SupportTicket`)
- Modify: `apps/mobile/src/features/customer/review/OrderReviewScreen.tsx`
- Modify: `apps/mobile/src/features/customer/report/ReportIssueScreen.tsx`

**Interfaces:**
- Produces: `POST /orders/:id/reviews`, `POST /orders/:id/reports`
- Consumes: Màn hình review và report gửi payload thật lên backend, tạo ticket khiếu nại thật.

- [ ] **Step 1: Định nghĩa Prisma models và tạo migration**
- [ ] **Step 2: Viết Controllers và Services cho Review & Report**
- [ ] **Step 3: Nối API tại `OrderReviewScreen` và `ReportIssueScreen`**
Bỏ fake `setTimeout`, gửi mutation qua HTTP adapter.

- [ ] **Step 4: Chạy verification test**
- [ ] **Step 5: Commit**
`git commit -m "feat: implement real order reviews and support ticket reporting"`

---

### Task 7: Backend API & Mobile cho Khuyến mãi / Voucher (Promotions)
*Xây dựng hệ thống Voucher thật theo yêu cầu giữ lại tính năng khuyến mãi.*

**Files:**
- Create: `apps/api/src/promotions/promotions.controller.ts`
- Create: `apps/api/src/promotions/promotions.service.ts`
- Modify: `apps/api/prisma/schema.prisma` (thêm model `PromotionVoucher`)
- Modify: `apps/mobile/src/features/customer/promotions/PromotionsScreen.tsx`
- Modify: `apps/mobile/src/features/home/components/BookingDetailsModal.tsx`
- Docs: `docs/api/01-rest-api-spec.md`

**Interfaces:**
- Produces: 
  - `GET /promotions` (danh sách voucher khả dụng)
  - `POST /promotions/validate` (kiểm tra mã hợp lệ, hạn mức, tính số tiền giảm)
- Consumes: 
  - `PromotionsScreen` gọi `GET /promotions` và `POST /promotions/validate`.
  - Áp dụng mã vào `POST /orders/estimate` và `POST /orders` để backend trừ giá cước chính xác.

- [ ] **Step 1: Định nghĩa Prisma model `PromotionVoucher` và migration**
Gồm: `code`, `title`, `description`, `discountType` (PERCENT / FIXED), `discountValue`, `maxDiscountVnd`, `minOrderAmountVnd`, `expiresAt`, `isActive`. Seed 3 mã chuẩn (`LEOPARD20`, `VAN50K`, `TRUCK100`).

- [ ] **Step 2: Viết Promotions Module trong NestJS**
Validate hạn dùng, giá trị đơn tối thiểu, số lượt sử dụng.

- [ ] **Step 3: Cập nhật `PromotionsScreen.tsx` trên mobile**
Thay mảng tĩnh `mockPromotions` bằng `useQuery` gọi `GET /promotions`. Nhập mã gọi `POST /promotions/validate`.

- [ ] **Step 4: Chạy test backend và mobile**
- [ ] **Step 5: Commit**
`git commit -m "feat: implement real promotions and voucher validation in backend and mobile"`

---

### Task 8: Dọn dẹp Hardcode tại Home, Searching, Settings, Security
**Files:**
- Modify: `apps/mobile/src/features/home/HomeDashboardScreen.tsx`
- Modify: `apps/mobile/src/features/home/components/BookingDetailsModal.tsx`
- Modify: `apps/mobile/app/customer/orders/searching/[id].tsx`
- Modify: `apps/mobile/src/features/customer/settings/CustomerSecurityScreen.tsx`
- Modify: `apps/mobile/src/features/customer/deliveries.tsx`

- [ ] **Step 1: Xóa bảng giá cứng tại Home Dashboard & Booking Details**
Dùng kết quả tính toán động từ `POST /orders/estimate`. Xóa 5 địa chỉ mẫu `REAL_VIETNAM_PLACES`.

- [ ] **Step 2: Deliveries screen**
Thay mảng `INITIAL_DELIVERIES` bằng `port.getOrdersView('ACTIVE')` lấy danh sách đơn thật từ backend.

- [ ] **Step 3: Searching Screen**
Bỏ fallback order ID cứng, lấy trạng thái đơn thực tế từ polling hoặc socket `/orders`.

- [ ] **Step 4: Security & Settings Screen**
Nối hành động xóa tài khoản vào API `DELETE /users/me`. Lưu cài đặt thông báo rõ ràng (ghi chú local device settings).

- [ ] **Step 5: Run full verification suite**
`pnpm --filter api test && pnpm --filter mobile test && pnpm typecheck`

- [ ] **Step 6: Commit**
`git commit -m "refactor: clean up remaining mock fallbacks across home, deliveries, searching, and settings screens"`
