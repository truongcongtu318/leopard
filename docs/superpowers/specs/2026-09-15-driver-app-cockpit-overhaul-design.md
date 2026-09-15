# Thiết Kế Cải Tổ Toàn Diện App Tài Xế LEOPARD (Field Cockpit & Cargo-First Rewrite)

> **Ngày tạo:** 2026-09-15  
> **Trạng thái:** `APPROVED_BY_USER`  
> **Phạm vi:** `apps/driver`, `@leopard/mobile-core` (bổ sung primitives nếu cần)  
> **Kiến trúc:** Ground-up Rewrite (Viết lại buồng lái thực địa chuẩn Grab Driver / Lalamove Driver kết hợp nghiệp vụ chở hàng B2B Cargo-First)

---

## 1. Mục Tiêu & Nguyên Tắc Cốt Lõi

### 1.1 Mục Tiêu
Thay thế hoàn toàn cấu trúc giao diện cũ của `apps/driver` (bị phân mảnh giữa Drawer thanh bên, Bottom navigation nổi che nút, các file monolithic 1.000–2.300 dòng, thẻ nổ cuốc thiếu thông tin hàng hóa) bằng **Kiến trúc Buồng Lái Thực Địa (Field Cockpit)** chuyên biệt cho vận tải hàng hóa:
1. **Cockpit Map-First**: Bản đồ GPS là nền tảng trung tâm (100% viewport), không dùng thanh menu nổi che khuất tầm nhìn và thao tác.
2. **Cargo-First Dispatch**: Đặt đặc thù chở hàng lên hàng đầu — hiển thị rõ ràng loại hàng, kích thước, cân nặng, ảnh chụp kiện hàng, phí bốc xếp và lưu ý của chủ hàng trước khi nhận đơn.
3. **Thao tác một tay an toàn**: Sử dụng thanh trượt an toàn `Slide-to-Action` cho mọi thao tác trọng yếu (Nhận đơn, Bốc hàng, Giao hàng, Nghiệm thu e-POD) để chống chạm nhầm khi rung lắc hoặc bỏ túi.
4. **Vòng đời 4 bước tinh gọn**: Giao diện tự động thích ứng theo từng trạng thái cuốc xe (`ACCEPTED ➔ PICKING_UP ➔ IN_TRANSIT ➔ DELIVERED`).
5. **Đăng ký KYC 1 xe duy nhất**: Wizard 3 bước rõ ràng, tự lưu bản nháp, mỗi tài xế chỉ đăng ký và vận hành 1 loại xe cố định.

---

## 2. Kiến Trúc Điều Hướng & Giao Diện (Navigation & Shell)

### 2.1 Cấu trúc Không Gian Buồng Lái
Khác với ứng dụng của khách hàng (Customer app) sử dụng `FloatingNavBar` kính mờ dưới đáy, app tài xế áp dụng nguyên tắc **Operational Cockpit**:

1. **Lớp Bản Đồ Gốc (Z-index 0)**:
   - `RealInteractiveMap` chiếm 100% chiều cao màn hình.
   - Hiển thị GPS xe tải, bán kính quét đơn khi trực tuyến (`ONLINE`), hoặc lộ trình A ➔ B khi đang có chuyến (`ACTIVE TRIP`).

2. **Thanh Trạng Thái Đỉnh (Top Cockpit HUD - Z-index 20)**:
   - **Góc trái**: Avatar tài xế & Biển số xe đăng ký (VD: `51D-892.11 · 1.25T`) — Chạm mở màn hình Hồ sơ & Phương tiện.
   - **Ở giữa**: Công tắc chuyển đổi **TRỰC TUYẾN / NGHỈ (ONLINE / OFFLINE)** to rõ, viền nổi, đèn tín hiệu LED (Xanh: Trực tuyến, Xám: Ngoại tuyến).
   - **Góc phải**: Pill Thu nhập hôm nay (VD: `450.000 ₫ · 3 cuốc`) — Chạm để mở nhanh màn hình Ví & Báo cáo doanh thu.

3. **Bảng Điều Khiển Đáy Động (Bottom Operational Panel - Z-index 30)**:
   - **Trạng thái Rảnh (Chờ đơn)**:
     - Nấc 1: Radar quét đơn lân cận kèm chỉ số kết nối.
     - Nấc 2 (kéo lên): Bảng danh sách đơn hàng có thể nhận (Load-board).
     - Thanh công cụ đáy phẳng tối giản: [Bản đồ] [Lịch sử] [Ví] [Hồ sơ].
   - **Trạng thái Đang Có Chuyến (Active Trip)**:
     - **Ẩn toàn bộ thanh công cụ đáy**.
     - Chiếm toàn bộ đáy bằng **Thẻ Nhiệm Vụ (Mission Card)**: Điểm bốc/dỡ, thông tin hàng, nút Gọi/Chat và thanh trượt `Slide-to-Action`.

---

## 3. Thiết Kế Chi Tiết Các Phân Hệ Màn Hình

### 3.1 Trang Chủ & Nhận Đơn Cargo-First (`/orders`)
- **Bản đồ thích ứng**: Tự động re-center về vị trí xe, hiển thị polyline tuyến đường khi có đơn.
- **Thẻ Nổ Cuốc Khẩn Cấp (Incoming Dispatch Offer Modal)**:
  - Vòng đếm ngược thời gian nhận đơn (15–30 giây).
  - Tiền cước thực nhận (to, rõ, `tabular-nums`, VD: **`320.000 ₫`**).
  - **Khối Quy Cách Hàng Hóa**:
    - Tên hàng: Ghi rõ loại hàng (VD: *Thiết bị điện máy, Hàng nội thất gỗ*).
    - Trọng lượng & Quy cách: *550 kg · 2.1 m³ (Dài 1.8m x Rộng 1.2m)*.
    - Dịch vụ bốc xếp: *Có bốc xếp 2 đầu (+100.000₫)* hoặc *Khách tự bốc*.
    - Ghi chú: *Cần dây chằng cố định, tránh nước mưa*.
    - Thumbnail ảnh hàng thực tế (chạm để phóng to xem trước khi nhận).
  - Quãng đường: Cự ly đến điểm bốc (VD: `1.5 km`) và cự ly chuyến đi (VD: `14.2 km`).
  - Thao tác nhận: Thanh trượt `Slide-to-Action`: **"Vuốt để nhận cuốc ➔"**.
- **Bảng Đơn Hàng Lân Cận (Load-board Feed)**:
  - Danh sách cuộn thẻ đơn dành cho tài xế tự chọn khi chưa có cuốc nổ trực tiếp.
  - Lọc theo bán kính (3km, 5km, 10km) hoặc tải trọng xe.

### 3.2 Chi Tiết Chuyến & Nghiệm Thu e-POD (`/orders/[id]`)
- **Bước 1: `ACCEPTED` (Đang tới điểm lấy hàng)**:
  - Nút mở Google Maps / Vietmap ngoài.
  - Nút gọi điện / chat cho Người gửi (Điểm A).
  - Thao tác: Vuốt **`Đã tới điểm lấy hàng ➔`**.
- **Bước 2: `PICKING_UP` (Bốc hàng & Kiểm đếm)**:
  - Kiểm tra quy cách hàng hóa và phụ phí bốc xếp.
  - Chức năng: **Chụp ảnh hàng hóa trước khi bốc lên xe** (bảo vệ quyền lợi tài xế).
  - Thao tác: Vuốt **`Đã bốc hàng xong - Bắt đầu giao ➔`**.
- **Bước 3: `IN_TRANSIT` (Đang vận chuyển)**:
  - Lộ trình A ➔ B với ETA dự kiến.
  - Nút liên hệ trước với Người nhận (Điểm B).
  - Thao tác: Vuốt **`Đã tới điểm giao hàng ➔`**.
- **Bước 4: `DELIVERED` (Nghiệm thu điện tử e-POD)**:
  - Chụp ảnh bàn giao hàng hóa thực tế tại điểm dỡ (gắn watermark thời gian/tọa độ).
  - Bảng vẽ chữ ký số cảm ứng: Người nhận ký tay trực tiếp + ghi họ tên.
  - Báo rõ số tiền mặt cần thu (COD/tiền mặt) hoặc xác nhận đã trả online qua VietQR.
  - Thao tác: Vuốt **`Hoàn tất cuốc xe ➔`** (tiền lập tức chuyển vào ví).
- **Xử lý sự cố (Incident)**:
  - Nút "Báo sự cố": Cung cấp lý do (hỏng xe, khách từ chối, sai địa chỉ), hỗ trợ chuyển sang luồng Trả hàng (`RETURNING ➔ RETURNED`).

### 3.3 Quy Trình Đăng Ký & KYC Wizard (`/(public)/driver-register` & `/kyc`)
- **Nguyên tắc**: 1 tài xế chỉ đăng ký **1 loại phương tiện duy nhất**.
- **Wizard 3 bước trực quan**:
  - **Bước 1: Thông tin cá nhân**: Họ tên, Số điện thoại (OTP), Ngày sinh, Địa chỉ, Ảnh chân dung selfie.
  - **Bước 2: Phương tiện duy nhất**: Chọn 1 trong 4 loại xe (Van 500kg / Xe tải 1.25T / Xe tải 2.5T / Ba gác), nhập Biển số xe, Tải trọng đăng kiểm.
  - **Bước 3: Chụp ảnh giấy tờ**: Khung chụp ảnh 2 mặt (CCCD mặt trước/sau, GPLX mặt trước/sau, Cà-vẹt xe và Đăng kiểm). Tự động lưu nháp dữ liệu đã nhập.
- **Trạng thái Chờ duyệt & Ký hợp đồng**:
  - Màn hình theo dõi tiến độ xét duyệt (dự kiến trong 24h).
  - Ký Hợp đồng Đối tác Vận tải bằng chữ ký điện tử trên màn hình khi hồ sơ được duyệt.

### 3.4 Ví, Doanh Thu & Lịch Sử Cuốc Xe (`/wallet`, `/earnings`, `/history`)
- **Ví tài xế (`/wallet`)**:
  - Thẻ số dư khả dụng (VD: `2.450.000 ₫`), nút "Rút tiền về tài khoản ngân hàng".
  - Quản lý tài khoản ngân hàng thụ hưởng (VietQR / Napas).
  - Lịch sử biến động số dư (Cộng cước chuyến, trừ phí nền tảng, tiền rút).
- **Doanh thu (`/earnings`)**:
  - Bento card 3 chỉ số: Tổng thực nhận, Số chuyến hoàn thành, Số giờ trực tuyến.
  - Bộ lọc Hôm nay / Tuần này / Tháng này kèm biểu đồ cột thu nhập.
- **Lịch sử cuốc xe (`/history`)**:
  - Danh sách cuốc đã chạy với lọc trạng thái (Hoàn thành, Hủy, Trả hàng).
  - Nút **"Xem biên bản e-POD"** để kiểm tra lại chữ ký và ảnh chụp bàn giao hàng hóa.

---

## 4. Tích Hợp Kỹ Thuật & Backend Contracts

### 4.1 REST API Mapping
- Trực tuyến / Ngoại tuyến: `PATCH /drivers/availability` (`ONLINE` / `OFFLINE` / `BUSY`).
- Ping GPS tài xế: `POST /drivers/location` (mỗi 10 giây khi `ONLINE`).
- Danh sách đơn chờ: `GET /orders/available?lat={lat}&lng={lng}&radiusKm={radius}`.
- Nhận đơn: `POST /orders/:id/accept`.
- Cập nhật trạng thái cuốc: `PATCH /orders/:id/status` (`PICKING_UP`, `IN_TRANSIT`, `DELIVERED`).
- Bằng chứng e-POD: `POST /orders/:id/proof` (upload ảnh giao hàng + svg chữ ký).
- Báo sự cố: `POST /drivers/report-incident` hoặc `POST /orders/:id/incident`.
- Ví & Rút tiền: `GET /drivers/wallet`, `POST /drivers/withdrawals`.
- Đăng ký & KYC: `POST /drivers/register`, `POST /drivers/kyc/documents`.

### 4.2 WebSocket Realtime Events
- Nhận thông báo nổ đơn: `socket.on('dispatch:offer', (payload: IncomingOffer) => void)`.
- Cập nhật trạng thái đơn: `socket.on('order:status_updated')`.
- Hủy đơn tự động khi hết hạn 15s: `socket.emit('dispatch:decline')`.

---

## 5. Kế Hoạch Triển Khai & Kiểm Thử

1. **Phase 1: Foundation & Shared Primitives**:
   - Hoàn thiện `SlideToAction` trong `@leopard/mobile-core`.
   - Chuẩn hoá `DriverViewportShell` và Layout buồng lái.
2. **Phase 2: Home Field Cockpit & Cargo Dispatch**:
   - Bản đồ full-bleed thích ứng, Top HUD công tắc On/Off & Thu nhập.
   - Thẻ Nổ Cuốc Cargo-First với ảnh hàng, kích thước, bốc xếp và `Slide-to-Action`.
3. **Phase 3: Active Trip Cockpit & e-POD Delivery**:
   - Quy trình 4 bước cuốc xe, điều hướng, gọi điện/chat.
   - Màn hình nghiệm thu e-POD (chụp ảnh + ký tên số hóa).
4. **Phase 4: Driver Onboarding Wizard & Wallet/History**:
   - Form đăng ký 3 bước 1 loại xe duy nhất, lưu nháp.
   - Giao diện Ví, Doanh thu bento, Lịch sử xem lại e-POD.
5. **Phase 5: Kiểm thử Toàn diện**:
   - Kiểm tra hiển thị responsive (Web phone frame & Mobile native).
   - Chạy test contract, typecheck và unit tests (`pnpm --filter driver test`, `pnpm --filter driver typecheck`).
