# Playwright E2E Test Suite: Customer & Driver Order Lifecycle

## 1. Overview & Architecture
Bộ kiểm thử Playwright E2E tự động hóa toàn bộ vòng đời tương tác giữa Khách hàng (Customer - `apps/mobile`) và Tài xế (Driver - `apps/driver`) trên nền Web, kết nối trực tiếp với backend NestJS API và cơ sở dữ liệu PostgreSQL.

### Test Runner & Context Model
- Sử dụng `@playwright/test` tại thư mục root `e2e/`.
- Mô hình **Dual Browser Context**:
  - `customerContext`: Mở `http://localhost:8081` với session của Customer.
  - `driverContext`: Mở `http://localhost:8082` với session của Driver.
  - Cả 2 context chạy song song trong cùng 1 test case để xác thực tương tác Realtime qua Socket.IO.

---

## 2. Test Cases Specification

### Test Case 1: Happy Path - Đặt đơn và giao hàng thành công
- **Preconditions**:
  - Customer đăng nhập và ở màn hình Home (`/`).
  - Driver đăng nhập, bật trạng thái Online trên radar (`testID="driver-connection-toggle"`).
- **Steps**:
  1. Customer nhập điểm lấy (`testID="cr-pickup-input"`) và điểm giao (`testID="cr-dropoff-input"`).
  2. Chọn phương tiện phù hợp (`testID="vehicle-row-VAN_500KG"`).
  3. Bấm xác nhận tạo đơn (`testID="home-main-cta-btn"`).
  4. Driver nhận được popup điều phối (`testID="incoming-dispatch-modal"`).
  5. Driver vuốt/nhấn nhận đơn (`testID="dispatch-slide-action"`).
  6. Customer chuyển sang màn hình Theo dõi trực tiếp (`RealtimeTrackingScreen`).
  7. Driver thực hiện các chặng:
     - Di chuyển đến điểm lấy -> Báo đã đến lấy hàng.
     - Xác nhận đã bốc hàng lên xe (`testID="btn-advance-leg-slide"`).
     - Di chuyển đến điểm giao -> Mở panel ePOD (`testID="epod-verification-container"`).
     - Nhập tên người nhận (`testID="epod-recipient-name-input"`), ký nhận (`testID="epod-signature-pad"`), chụp ảnh biên nhận.
     - Bấm hoàn tất giao hàng (`testID="btn-epod-complete-delivery"`).
- **Assertions**:
  - Trạng thái đơn hàng chuyển sang `COMPLETED`.
  - Customer thấy thông báo giao hàng thành công và màn hình đánh giá.
  - Driver chuyển về màn hình Order Board sẵn sàng nhận đơn mới.

### Test Case 2: Driver Decline & Dispatch Offer Expired
- **Steps**:
  1. Customer đặt đơn mới.
  2. Driver 1 nhận offer điều phối (`testID="incoming-dispatch-modal"`).
  3. Driver 1 bấm từ chối (`testID="dispatch-modal-decline-top"`).
- **Assertions**:
  - Offer bị hủy trên thiết bị của Driver 1.
  - Backend ghi nhận sự kiện từ chối và giải phóng / điều phối lại đơn hàng.

### Test Case 3: Hủy đơn & Báo cáo sự cố (Customer Cancel & Driver Incident)
- **Sub-case 3.1 (Customer Cancel)**:
  - Customer tạo đơn và hủy trước khi có Driver nhận đơn -> Xác nhận trạng thái `CANCELLED`.
- **Sub-case 3.2 (Driver Incident Report)**:
  - Sau khi Driver nhận đơn, phát sinh sự cố (hỏng xe / thời tiết xấu).
  - Driver mở modal sự cố (`testID="btn-open-incident-modal"`), chọn lý do (`testID="incident-reason-..."`), nhập ghi chú và xác nhận (`testID="btn-confirm-incident-report"`).
- **Assertions**:
  - Đơn hàng được cập nhật trạng thái sự cố/hủy và hoàn tiền/thông báo tương ứng.

### Test Case 4: Multi-stop Delivery (Đơn hàng nhiều điểm dừng)
- **Steps**:
  1. Customer thêm điểm dừng trung gian (`testID="cr-add-stop"`), nhập địa chỉ cho từng stop.
  2. Customer submit đơn.
  3. Driver nhận đơn, giao diện hiển thị Stepper lộ trình dọc (`testID="vertical-route-stepper"`).
  4. Driver lần lượt xác nhận hoàn thành từng chặng (`testID="btn-stop-progress-1"`, `testID="btn-stop-progress-2"`).
- **Assertions**:
  - Tất cả các điểm dừng được đánh dấu hoàn tất theo đúng thứ tự.

---

## 3. Implementation Components
1. **Config & Fixtures**:
   - `e2e/playwright.config.ts`: Quản lý webServer và viewport chuẩn mobile screen.
   - `e2e/fixtures/test-env.ts`: Setup auth token, seed database via Prisma, dual page fixtures.
2. **Page Object Models (POM)**:
   - `e2e/pages/CustomerApp.ts`: Đóng gói selector và action của Customer App.
   - `e2e/pages/DriverApp.ts`: Đóng gói selector và action của Driver App.
3. **Scripts & Turbo Integration**:
   - Script chạy test: `pnpm test:e2e:playwright` tích hợp vào `package.json` root.
