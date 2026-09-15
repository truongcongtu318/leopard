# KẾ HOẠCH TRIỂN KHAI & CẢI TIẾN HỆ THỐNG CHI TIẾT
## (LEOPARD System Refactor & Remediation Plan)

> **Mã tài liệu:** `DOCS-DEV-08-IMPLEMENTATION-PLAN`  
> **Phiên bản:** `1.0.0`  
> **Ngày ban hành:** 11/09/2026  
> **Dự án:** LEOPARD Logistics Platform  
> **Dựa trên:** Báo cáo kiểm toán `09-system-audit-loopholes-and-business-logic-flaws-report.md`, Đặc tả nghiệp vụ `06-logistics-business-logic-specification.md`, và Đặc tả kỹ thuật `07-system-refactor-technical-spec.md`.  
> **Mục tiêu:** Cung cấp lộ trình hành động chi tiết theo từng Vertical Slice độc lập, có mã nguồn mẫu, tiêu chí nghiệm thu (DoD) và lệnh kiểm thử cụ thể để đội ngũ kỹ sư bắt tay vào thực hiện ngay.  

---

## 1. LỘ TRÌNH TỔNG QUAN (EXECUTION PHASES)

Toàn bộ quá trình cải tiến hệ thống được chia làm **4 Pha tuần tự** nhằm đảm bảo:
- Không gây hồi quy (regression) mã nguồn đang chạy.
- Mỗi tác vụ là một lát cắt hoàn chỉnh (vertical slice: UI -> API -> DB).
- Khóa toàn bộ các lỗ hổng P0/P1 trước khi bước vào kiểm thử thực địa.

```
┌────────────────────────────────────────────────────────────────────────┐
│ PHA 1: Khóa 6 Lỗ hổng P0 Khẩn cấp (Security, Auth Session & Payment)   │
│ Thời gian ước tính: 2 ngày | Trọng tâm: Bảo mật, Bảo toàn phiên        │
├────────────────────────────────────────────────────────────────────────┤
│ PHA 2: Chuẩn hóa Dữ liệu, Contract & Quy trình Nghiệp vụ (P1)          │
│ Thời gian ước tính: 3 ngày | Trọng tâm: DB Migration, Dispatch, Cứu xe │
├────────────────────────────────────────────────────────────────────────┤
│ PHA 3: Nâng cấp Trải nghiệm Người dùng Mobile & Đồng bộ Realtime (P2)  │
│ Thời gian ước tính: 2 ngày | Trọng tâm: UX mượt mà, GPS, Xóa Mock Data │
├────────────────────────────────────────────────────────────────────────┤
│ PHA 4: Kiểm thử Tích hợp Concurrency, Real DB & UAT Thực địa           │
│ Thời gian ước tính: 2 ngày | Trọng tâm: Stress test, Release Gate      │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 2. CHI TIẾT CÁC TÁC VỤ TRIỂN KHAI (DETAILED TASKS)

---

### GIAI ĐOẠN 1: KHÓA TOÀN BỘ LỖ HỔNG P0 & SỬA LỖI KHẨN CẤP (PHASE 1)

#### Task 1.1: Sửa lỗi Mất phiên đăng nhập của Tài xế (SEC-05)
- **Mục tiêu:** Đảm bảo tài xế khi mở lại app, hoặc khi hệ điều hành thu hồi RAM, không bị văng ra màn hình Login.
- **Tập tin sửa đổi:**
  - [`apps/driver/app/index.tsx`](file:///d:/leopard/apps/driver/app/index.tsx)
- **Hành động kỹ thuật:**
  1. Gọi `sessionStore.hydrate()`.
  2. Kiểm tra nếu có `refreshToken` mà chưa có `accessToken` trong RAM -> tự động gọi `refreshSession()`.
  3. Chỉ điều hướng về `/(public)/login` nếu refresh thất bại (token hết hạn/bị thu hồi).
- **Tiêu chí nghiệm thu (Acceptance Criteria):**
  - Tài xế đăng nhập thành công -> tắt hẳn app Driver -> mở lại app -> tự động vào thẳng màn hình `/orders` mà không hiện form đăng nhập.
  - Test regression bổ sung trong `DriverSplashScreen.test.tsx`.

#### Task 1.2: Vá lỗ hổng IDOR Media Service đối với Fleet Owner (SEC-01)
- **Mục tiêu:** Ngăn chặn tuyệt đối việc Chủ đội xe (Fleet Owner) xem ảnh hàng hóa và chữ ký giao hàng của đội xe khác hoặc tài xế tự do.
- **Tập tin sửa đổi:**
  - [`apps/api/src/media/media.service.ts`](file:///d:/leopard/apps/api/src/media/media.service.ts)
  - [`apps/api/src/media/media.controller.ts`](file:///d:/leopard/apps/api/src/media/media.controller.ts)
  - [`apps/api/src/media/media.e2e-spec.ts`](file:///d:/leopard/apps/api/src/media/media.e2e-spec.ts)
- **Hành động kỹ thuật:**
  1. Trong `media.service.ts` hàm `getSignedUrl`: Khi `actor.role === 'FLEET_OWNER'`, kiểm tra bắt buộc `isDriverInFleetOwnerFleets(actor.userId, order.driverId)`.
  2. Ném lỗi `403 FORBIDDEN` nếu tài xế của đơn hàng không thuộc đội xe do Fleet Owner quản lý.
- **Lệnh kiểm chứng:**
  ```powershell
  pnpm.cmd --filter api test -- src/media/media.e2e-spec.ts
  ```

#### Task 1.3: Cài đặt Cổng kiểm soát Phê duyệt Tài xế Bắt buộc KYC (SEC-02)
- **Mục tiêu:** Ngăn chặn Admin duyệt tài xế ảo không có giấy tờ (GPLX, Đăng ký xe, CCCD).
- **Tập tin sửa đổi:**
  - [`apps/api/src/admin/admin-driver-review.service.ts`](file:///d:/leopard/apps/api/src/admin/admin-driver-review.service.ts)
  - [`apps/api/src/admin/admin-driver-review.service.spec.ts`](file:///d:/leopard/apps/api/src/admin/admin-driver-review.service.spec.ts)
- **Hành động kỹ thuật:**
  1. Trong `approve(actor, userId)`: Đọc danh sách `DriverDocument` của tài xế.
  2. Kiểm tra có đủ 3 loại `LICENSE`, `VEHICLE_REGISTRATION`, `ID_CARD`.
  3. Nếu thiếu, ném `422 DRIVER_DOCUMENTS_INCOMPLETE` kèm danh sách giấy tờ còn thiếu.
- **Lệnh kiểm chứng:**
  ```powershell
  pnpm.cmd --filter api test -- src/admin/admin-driver-review.service.spec.ts
  ```

#### Task 1.4: Chặn Thanh toán và Xuất Hóa đơn trên Đơn hàng Đã Hủy (SEC-03)
- **Mục tiêu:** Tuyệt đối không cho phép tạo QR VietQR hoặc xuất hóa đơn VAT điện tử trên các đơn hàng đã bị `CANCELLED`.
- **Tập tin sửa đổi:**
  - [`apps/api/src/payments/payments.service.ts`](file:///d:/leopard/apps/api/src/payments/payments.service.ts)
  - [`apps/api/src/payments/payments.service.spec.ts`](file:///d:/leopard/apps/api/src/payments/payments.service.spec.ts)
- **Hành động kỹ thuật:**
  1. Trong `createPaymentIntent`: Kiểm tra `if (order.status === 'CANCELLED') throw new DomainError('ORDER_ALREADY_CANCELLED', 409)`.
  2. Trong `confirmPayment`: Kiểm tra trạng thái đơn hàng trước khi commit; nếu đơn đã hủy, ném lỗi và từ chối xuất hóa đơn.
- **Lệnh kiểm chứng:**
  ```powershell
  pnpm.cmd --filter api test -- src/payments/payments.service.spec.ts
  ```

#### Task 1.5: Chuẩn hóa URL Kết nối Socket.IO Namespace (BIZ-09)
- **Mục tiêu:** Cắt bỏ `/api/v1` khỏi base URL để socket client kết nối chính xác vào origin server.
- **Tập tin sửa đổi:**
  - [`packages/mobile-core/src/api/socket-client.ts`](file:///d:/leopard/packages/mobile-core/src/api/socket-client.ts)
  - [`apps/driver/src/features/orders/tracking-sender.ts`](file:///d:/leopard/apps/driver/src/features/orders/tracking-sender.ts)
  - [`apps/driver/src/features/orders/dispatch-offer-listener.ts`](file:///d:/leopard/apps/driver/src/features/orders/dispatch-offer-listener.ts)
  - [`apps/driver/src/features/orders/socket-contract.audit.test.ts`](file:///d:/leopard/apps/driver/src/features/orders/socket-contract.audit.test.ts)
- **Tiêu chí nghiệm thu:**
  - Khi `EXPO_PUBLIC_API_URL=http://127.0.0.1:3000/api/v1`, Socket.IO client kết nối vào `http://127.0.0.1:3000/tracking` và `http://127.0.0.1:3000/dispatch`.
  - Test audit `socket-contract.audit.test.ts` chuyển sang trạng thái **PASS (Xanh)**.
- **Lệnh kiểm chứng:**
  ```powershell
  .\apps\driver\node_modules\.bin\jest.cmd --runInBand --runTestsByPath apps/driver/src/features/orders/socket-contract.audit.test.ts
  ```

---

### GIAI ĐOẠN 2: CHUẨN HÓA DỮ LIỆU, CONTRACT & NGHIỆP VỤ CỐT LÕI (PHASE 2)

#### Task 2.1: Prisma Schema Migration — Bổ sung Loại xe và Liên hệ Đa bên
- **Mục tiêu:** Lưu trữ chính thức `vehicleType`, `senderPhone`, `receiverPhone` vào database PostgreSQL.
- **Tập tin sửa đổi:**
  - [`apps/api/prisma/schema.prisma`](file:///d:/leopard/apps/api/prisma/schema.prisma)
- **Hành động kỹ thuật:**
  1. Thêm các cột vào model `Order` và `OrderStop` như đặc tả trong `07-system-refactor-technical-spec.md`.
  2. Tạo migration an toàn:
     ```powershell
     pnpm.cmd --filter api prisma migrate dev --name add_order_vehicle_and_contacts
     ```
  3. Cập nhật `OrdersRepository` và mapper tương ứng.

#### Task 2.2: Đồng bộ Hóa Contract Order Status Toàn Hệ thống (BIZ-05)
- **Mục tiêu:** Loại bỏ hoàn toàn sự bất nhất về `PICKED_UP` giữa `@leopard/shared` và Backend.
- **Tập tin sửa đổi:**
  - [`packages/shared/src/domain/order/order-status.ts`](file:///d:/leopard/packages/shared/src/domain/order/order-status.ts)
  - [`packages/shared/src/domain/order/order-state-machine.ts`](file:///d:/leopard/packages/shared/src/domain/order/order-state-machine.ts)
- **Hành động kỹ thuật:**
  1. Xóa `PICKED_UP` khỏi mảng `OrderStatus` và `ALLOWED_TRANSITIONS` trong `@leopard/shared`.
  2. Đảm bảo toàn bộ 4 repo (API, Web, Driver, Mobile) đồng thuận với 6 trạng thái chuẩn: `REQUESTED`, `ACCEPTED`, `PICKING_UP`, `IN_TRANSIT`, `DELIVERED`, `CANCELLED`.
  3. Case test cuối cùng trong `socket-contract.audit.test.ts` chuyển sang **PASS**.

#### Task 2.3: Sửa Thuật toán Điều phối Khớp Loại xe (BIZ-03)
- **Mục tiêu:** Không để xe máy nhận đơn xe tải và ngược lại.
- **Tập tin sửa đổi:**
  - [`apps/api/src/drivers/drivers.repository.ts`](file:///d:/leopard/apps/api/src/drivers/drivers.repository.ts)
  - [`apps/api/src/dispatch/dispatch.service.ts`](file:///d:/leopard/apps/api/src/dispatch/dispatch.service.ts)
  - [`apps/api/src/orders/accept-order.service.ts`](file:///d:/leopard/apps/api/src/orders/accept-order.service.ts)
- **Hành động kỹ thuật:**
  1. Bổ sung tham số `vehicleType: VehicleType` vào hàm `findNearbyAvailableDrivers`.
  2. Câu lệnh SQL query bổ sung: `AND "vehicleType" = ${vehicleType}`.
  3. Trong `AcceptOrderService.acceptOrder`: Kiểm tra điều kiện tiên quyết:
     ```typescript
     if (driverProfile.vehicleType !== order.vehicleType) {
       throw new DomainError('VEHICLE_TYPE_MISMATCH', 409, 'Loại phương tiện của tài xế không khớp với yêu cầu của đơn hàng');
     }
     ```

#### Task 2.4: Radar Ping Nhịp tim cho Tài xế Đứng yên (BIZ-02)
- **Mục tiêu:** Đảm bảo tài xế đỗ xe đứng chờ đơn không bị biến mất khỏi radar sau 90 giây.
- **Tập tin sửa đổi:**
  - [`apps/driver/src/features/orders/idle-location-ping.ts`](file:///d:/leopard/apps/driver/src/features/orders/idle-location-ping.ts)
  - [`apps/driver/src/features/orders/idle-location-ping.test.ts`](file:///d:/leopard/apps/driver/src/features/orders/idle-location-ping.test.ts)
- **Hành động kỹ thuật:**
  1. Lưu biến `lastSentTimestamp: number`.
  2. Sửa điều kiện gửi ping:
     ```typescript
     const isMovedFarEnough = this.lastSent && distanceMeters(this.lastSent, next) >= MIN_MOVE_METERS;
     const isHeartbeatExpired = Date.now() - this.lastSentTimestamp >= 45_000; // 45 giây
     
     if (!this.lastSent || isMovedFarEnough || isHeartbeatExpired) {
       await this.client.patch('/driver/location', next);
       this.lastSent = next;
       this.lastSentTimestamp = Date.now();
     }
     ```
- **Lệnh kiểm chứng:**
  ```powershell
  .\apps\driver\node_modules\.bin\jest.cmd --runInBand --runTestsByPath apps/driver/src/features/orders/idle-location-ping.test.ts
  ```

#### Task 2.5: Bổ sung Lối thoát Sự cố cho Tài xế & Phát Socket khi Hủy (BIZ-01, BIZ-10)
- **Mục tiêu:** Cho phép tài xế báo cáo sự cố (hỏng xe, tai nạn) để tự giải phóng đơn, và phát socket event khi đơn bị hủy.
- **Tập tin sửa đổi:**
  - [`apps/api/src/orders/orders.controller.ts`](file:///d:/leopard/apps/api/src/orders/orders.controller.ts)
  - [`apps/api/src/orders/cancel-order.service.ts`](file:///d:/leopard/apps/api/src/orders/cancel-order.service.ts)
  - [`apps/api/src/orders/domain/order-state-machine.ts`](file:///d:/leopard/apps/api/src/orders/domain/order-state-machine.ts)
- **Hành động kỹ thuật:**
  1. Cho phép tài xế gửi lý do hủy đơn trước khi lấy hàng. Tự động chuyển `driverProfile.availability = 'AVAILABLE'`.
  2. Inject `OrderEventsPublisher` vào `CancelOrderService` và gọi `publishStatusChanged` khi hủy đơn.

#### Task 2.6: Sửa Bẫy Lỗi 409 Phục hồi Đăng ký KYC (BIZ-06)
- **Mục tiêu:** Khi tài xế upload ảnh giấy tờ bị rớt mạng, cho phép bấm gửi lại để tải tiếp các ảnh còn thiếu.
- **Tập tin sửa đổi:**
  - [`apps/driver/app/(public)/driver-register.tsx`](file:///d:/leopard/apps/driver/app/(public)/driver-register.tsx)
  - [`apps/driver/src/auth/driver-register-recovery.audit.test.tsx`](file:///d:/leopard/apps/driver/src/auth/driver-register-recovery.audit.test.tsx)
- **Hành động kỹ thuật:**
  1. Lưu cờ `hasAppliedSuccessfully = true` sau khi `POST /driver/apply` thành công.
  2. Nếu upload ảnh sau đó bị lỗi: Khi bấm "Gửi lại", bỏ qua bước gọi apply, chỉ tải tiếp các ảnh chưa upload.
- **Lệnh kiểm chứng:**
  ```powershell
  .\apps\driver\node_modules\.bin\jest.cmd --runInBand --runTestsByPath apps/driver/src/auth/driver-register-recovery.audit.test.tsx
  ```
  *(Audit test chuyển từ FAIL sang PASS)*.

#### Task 2.7: Tích hợp Số điện thoại Thật & Xóa Bỏ Hotline Giả mạo (BIZ-04)
- **Mục tiêu:** Bấm nút gọi trên cả 2 app phải quay số điện thoại thật của người liên quan.
- **Tập tin sửa đổi:**
  - [`apps/api/src/orders/order-response.mapper.ts`](file:///d:/leopard/apps/api/src/orders/order-response.mapper.ts)
  - [`apps/driver/src/features/orders/adapter.ts`](file:///d:/leopard/apps/driver/src/features/orders/adapter.ts)
  - [`apps/driver/src/features/orders/DriverOrderDetailScreen.tsx`](file:///d:/leopard/apps/driver/src/features/orders/DriverOrderDetailScreen.tsx)
  - [`apps/mobile/src/features/customer/orders/CustomerOrderDetailScreen.tsx`](file:///d:/leopard/apps/mobile/src/features/customer/orders/CustomerOrderDetailScreen.tsx)
- **Hành động kỹ thuật:**
  1. Trả `senderPhone`, `receiverPhone` thật trong `mapOrderResponse`.
  2. Xóa bỏ hoàn toàn số `19001234` và `0901234567`.
  3. Giao diện tự động mở `tel:${realPhoneNumber}`. Nếu thiếu số, disable nút gọi kèm thông báo rõ ràng.

---

### GIAI ĐOẠN 3: NÂNG CẤP TRẢI NGHIỆM NGƯỜI DÙNG & REALTIME SYNC (PHASE 3)

#### Task 3.1: Sửa Lỗi Tải Proof Xong Bị Kẹt Nút DELIVERED (UX-03)
- **Mục tiêu:** Sau khi tài xế upload ảnh POD thành công, giao diện tự động đổi sang nút "Xác nhận đã giao hàng".
- **Tập tin sửa đổi:**
  - [`apps/driver/src/features/orders/DriverOrderDetailRuntime.tsx`](file:///d:/leopard/apps/driver/src/features/orders/DriverOrderDetailRuntime.tsx)
  - [`apps/driver/src/features/orders/DriverOrderDetailRuntime.audit.test.tsx`](file:///d:/leopard/apps/driver/src/features/orders/DriverOrderDetailRuntime.audit.test.tsx)
- **Hành động kỹ thuật:**
  1. Cập nhật React Query cache với `primaryTask: { kind: 'advance-lifecycle', command: { targetStatus: 'DELIVERED' } }` ngay khi upload proof thành công.
- **Lệnh kiểm chứng:**
  ```powershell
  .\apps\driver\node_modules\.bin\jest.cmd --runInBand --runTestsByPath apps/driver/src/features/orders/DriverOrderDetailRuntime.audit.test.tsx
  ```
  *(Audit test chuyển từ FAIL sang PASS)*.

#### Task 3.2: Đồng bộ Realtime cho Khách hàng từ Trạng thái REQUESTED (UX-01)
- **Mục tiêu:** Khách hàng thấy ngay thông tin tài xế khi có người nhận đơn mà không cần vuốt màn hình làm mới.
- **Tập tin sửa đổi:**
  - [`apps/mobile/src/features/customer/orders/CustomerOrderDetailRuntime.tsx`](file:///d:/leopard/apps/mobile/src/features/customer/orders/CustomerOrderDetailRuntime.tsx)
- **Hành động kỹ thuật:**
  1. Mở kết nối Socket và join order room ngay từ `REQUESTED` và `ACCEPTED`.
  2. Khi nhận event `order:status-updated`, tự động gọi `query.refetch()`.

#### Task 3.3: Chỉ đường Google Maps Thông minh theo Tọa độ GPS (UX-02)
- **Mục tiêu:** Dẫn đường chính xác tới điểm Lấy hàng khi chưa lấy, và điểm Giao hàng khi đang đi giao.
- **Tập tin sửa đổi:**
  - [`apps/driver/src/features/orders/DriverOrderDetailScreen.tsx`](file:///d:/leopard/apps/driver/src/features/orders/DriverOrderDetailScreen.tsx)
- **Hành động kỹ thuật:**
  1. Kiểm tra trạng thái: nếu `ACCEPTED`/`PICKING_UP` -> truyền tọa độ `origin.latitude,origin.longitude`; nếu `IN_TRANSIT` -> truyền tọa độ `destination.latitude,destination.longitude`.
  2. Sử dụng URL: `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`.

#### Task 3.4: Xóa bỏ Triệt để Dữ liệu Giả định / Mock Strings (UX-04, UX-05)
- **Mục tiêu:** Loại bỏ toàn bộ các chuỗi text gây hiểu lầm trên giao diện sản xuất.
- **Tập tin sửa đổi:**
  - [`apps/driver/src/features/orders/DriverOrdersScreen.tsx`](file:///d:/leopard/apps/driver/src/features/orders/DriverOrdersScreen.tsx)
  - [`apps/mobile/src/features/customer/orders/CustomerOrderDetailScreen.tsx`](file:///d:/leopard/apps/mobile/src/features/customer/orders/CustomerOrderDetailScreen.tsx)
- **Hành động kỹ thuật:**
  1. Xóa "Xi măng (VLXD)", "250 kg", "Có bốc xếp 2 đầu", "★ 4.9", "Xe tải 1.25T", "Depot Tân Bình", "Cách bạn 1.2 km".
  2. Chỉ hiển thị các mục khi dữ liệu thực tế tồn tại.
  3. Đổi nút "NHẬN ĐƠN" ở danh sách thành "XEM CHI TIẾT"; gán sự kiện ẩn đơn cho nút "BỎ QUA".

#### Task 3.5: Trạng thái Loading, Idempotency Token & Chống Double-Tap (SEC-06, UX-06)
- **Tập tin sửa đổi:**
  - [`apps/mobile/src/features/customer/orders/CustomerOrderDetailRuntime.tsx`](file:///d:/leopard/apps/mobile/src/features/customer/orders/CustomerOrderDetailRuntime.tsx)
  - [`apps/driver/src/features/orders/DriverOrderDetailRuntime.tsx`](file:///d:/leopard/apps/driver/src/features/orders/DriverOrderDetailRuntime.tsx)
  - [`packages/mobile-core/src/api/http-client.ts`](file:///d:/leopard/packages/mobile-core/src/api/http-client.ts)
- **Hành động kỹ thuật:**
  1. Thêm cờ `isPending` disable nút bấm khi đang thực hiện mutation hoặc upload ảnh.
  2. Luôn sinh UUIDv4 `clientRequestId` cho mọi request tạo đơn, cập nhật trạng thái, nộp giấy tờ.

---

### GIAI ĐOẠN 4: KIỂM THỬ TÍCH HỢP, CONCURRENCY & FIELD PILOT GATE (PHASE 4)

#### Task 4.1: Sửa Lỗi Test Harness Cũ (TECH-01, TECH-02)
- **Tập tin sửa đổi:**
  - [`apps/api/src/orders/order-lifecycle.e2e-spec.ts`](file:///d:/leopard/apps/api/src/orders/order-lifecycle.e2e-spec.ts)
  - [`apps/api/test/security/body-size-limit.e2e-spec.ts`](file:///d:/leopard/apps/api/test/security/body-size-limit.e2e-spec.ts)
- **Hành động kỹ thuật:**
  1. Trong `order-lifecycle.e2e-spec.ts`: Sửa assertion audit log để đọc `requestId` đúng contract.
  2. Trong `body-size-limit.e2e-spec.ts`: Đảm bảo stream parser trả về HTTP 413 chuẩn.

#### Task 4.2: Chạy Toàn bộ Kiểm thử Tranh chấp (Concurrency & Race Condition)
Chạy bộ test race condition trên database PostgreSQL thật với transaction barrier:
```powershell
$env:LEOPARD_REAL_DB_RACE_TEST="true"
$env:DATABASE_URL="postgresql://postgres:postgres@127.0.0.1:5432/leopard_real_db_race_test?schema=public"
pnpm.cmd --filter api test -- src/orders/real-db-race-condition.integration-spec.ts
```
*Yêu cầu: 20 tài xế cùng tranh nhận 1 đơn hàng -> duy nhất 1 tài xế nhận thành công, 19 tài xế nhận thông báo đơn đã được tiếp nhận, không lỗi deadlock DB.*

#### Task 4.3: Chạy Bộ Kiểm tra Toàn diện (Full System Regression)
Chạy toàn bộ bộ test trên tất cả các package:
```powershell
# 1. Driver App Tests
pnpm.cmd --filter driver test
pnpm.cmd --filter driver typecheck
pnpm.cmd --filter driver lint

# 2. Mobile Core Tests
pnpm.cmd --filter @leopard/mobile-core test
pnpm.cmd --filter @leopard/mobile-core typecheck

# 3. Backend API Tests
pnpm.cmd --filter api test
pnpm.cmd --filter api test:e2e
pnpm.cmd --filter api typecheck
pnpm.cmd --filter api lint
```

#### Task 4.4: UAT Thực địa Quy mô nhỏ (Field Trial Sign-off)
- **Thiết bị:** 2 điện thoại thật (1 máy Khách hàng, 1 máy Tài xế) chạy mạng 4G ngoài đường.
- **Kịch bản kiểm tra:**
  1. Khách đặt đơn xe máy -> Bác tài xe máy nhận được thông báo cuốc xe trong 25 giây.
  2. Bác tài bấm nhận -> Khách hàng thấy ngay thông tin bác tài và số điện thoại thật.
  3. Bác tài bấm nút bản đồ -> Google Maps dẫn đúng tới nhà người gửi hàng.
  4. Bác tài tắt màn hình điện thoại 5 phút -> Mở lại app vẫn ở màn hình đơn hàng, không bị logout.
  5. Bác tài giao hàng xong -> Chụp ảnh gói hàng -> Nút "Xác nhận đã giao hàng" sáng lên -> Bấm hoàn tất thành công.

---

## 3. MA TRẬN PHÂN CÔNG & QUẢN TRỊ RỦI RO (RACI & RISK MANAGEMENT)

| Nhóm công việc | Phụ trách chính (Accountable) | Thực hiện (Responsible) | Tham vấn (Consulted) | Nghiệm thu |
| :--- | :--- | :--- | :--- | :--- |
| **Pha 1: Hotfix P0** | Lead Security / Lead Backend | Backend Engineer / Mobile Engineer | System Architect | Toàn bộ P0 test PASS |
| **Pha 2: Data & Core** | System Architect | Backend Engineer / Mobile Lead | Product Owner | Migration hoàn tất, Zero drift |
| **Pha 3: Mobile UX** | Mobile Lead | React Native Engineers | UI/UX Designer | Mượt mà, không mock data |
| **Pha 4: Testing & UAT**| QA Lead | Full QA & Engineering Team | Stakeholders / Operations | Biên bản UAT thực địa ký duyệt |

---

## 4. KẾT LUẬN

Kế hoạch này cung cấp từng bước đi chắc chắn, chuẩn hóa toàn diện từ tầng lõi dữ liệu đến trải nghiệm người dùng thực tế. Việc tuân thủ nghiêm ngặt 4 giai đoạn trên sẽ giúp LEOPARD giải quyết triệt để 24 lỗ hổng kiểm toán, sẵn sàng cho một đợt phát hành thử nghiệm pilot an toàn, tin cậy và chuyên nghiệp.
