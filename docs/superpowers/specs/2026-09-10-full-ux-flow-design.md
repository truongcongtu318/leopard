# LEOPARD Full-Flow UI/UX Design Specification (Customer & Driver)

> **Ngày tạo:** 2026-09-10  
> **Trạng thái:** `APPROVED_DESIGN_SPEC`  
> **Phạm vi:** Toàn diện luồng người dùng (Full-Flow UI/UX) cho cả 2 vai trò Khách Hàng B2B (`CUSTOMER`) và Tài Xế Vận Tải (`DRIVER`)  
> **Kiến trúc áp dụng:** Dual-App Autonomous Cockpits (`apps/mobile` & `apps/driver`) kết nối thư viện lõi `packages/mobile-core`

---

## 1. Mục tiêu & Định hướng Nghiệp vụ

Hệ thống vận tải hàng hóa trọng tải lớn **LEOPARD** phục vụ mô hình **B2B / SME Logistics** (Chủ hàng, nhà kho, doanh nghiệp sản xuất và các đơn vị logistics). 

### 4 Quyết định cốt lõi đã chốt:
1. **Phân khúc khách hàng**: B2B / Doanh nghiệp & Chủ kho bãi. Mọi tài khoản cần gắn với Tên công ty, Mã số thuế (MST), Email kế toán để tự động hóa Hóa đơn điện tử VAT 8% và lưu điểm kho bãi bốc dỡ cố định.
2. **Cơ chế nhận cuốc của tài xế**: **Hybrid Dispatch**. Hệ thống phát sóng đơn đẩy 1-1 cho tài xế gần nhất với bộ đếm ngược 15 giây; nếu tài xế từ chối hoặc hết giờ sẽ tự động giải phóng đơn vào Bảng hàng chung (**Load-board**) cho các tài xế khác trong bán kính 5–10km tự chọn cuốc.
3. **Mô hình thanh toán**: **Thanh toán trước / Giữ cọc Escrow**. Khách hàng khóa cọc trước bằng Hạn mức Ví doanh nghiệp hoặc quét mã động VietQR (payOS/NAPAS247); tiền cọc được giữ an toàn và chỉ giải ngân cho tài xế khi đơn hàng hoàn tất bàn giao.
4. **Bằng chứng giao nhận (POD)**: **Full e-POD chuẩn B2B**. Chụp ảnh kiện hàng hạ tải tại kho bãi (có đóng dấu GPS/thời gian) kèm chữ ký số điện tử của thủ kho/người nhận hàng trực tiếp trên màn hình điện thoại.

---

## 2. Hệ Thống Thiết Kế (Foundation & Design System)

### 2.1 Bảng màu nhận diện thương hiệu (Official Brand Palette)
- **Trắng tuyết (`#FFFFFF` / `#F8FAFC`)**: Canvas nền sáng, sạch sẽ, chuẩn công sở B2B và hiển thị tương phản cao dưới ánh sáng ngoài trời.
- **Vàng Amber Gold (`#F59E0B` / `#D97706` / `#FEF3C7`)**: Màu nhận diện đốm hoa mai LEOPARD; dùng cho số liệu giá cước, xếp hạng sao (4.98★), cảnh báo trạng thái và các nút điểm nhấn hành động.
- **Xanh biển Midnight Navy (`#0B1E42` / `#061226`) & Ocean Blue (`#0284C7`)**: Tông màu chủ đạo công ty logistics, thanh điều hướng, nút hành động chính và vệt tuyến đường giao thông.
- **Xanh lá Pastel (`#16A34A` / `#DCFCE7`)**: Báo hiệu trạng thái trực tuyến (Online), cuốc xe hoàn tất và xác thực an toàn.

### 2.2 Kiến trúc thẻ viền kép (Double-Bezel Architecture)
- Mỗi khối thông tin, thẻ phương tiện hoặc biên lai thanh toán được cấu tạo 2 lớp viền đồng tâm:
  - Vỏ ngoài: `border-radius: 24px`, viền mỏng `1px solid rgba(11, 30, 66, 0.08)`, đổ bóng êm `rgba(11, 30, 66, 0.05)`.
  - Lõi trong: `border-radius: 18px`, màu nền `#FFFFFF` hoặc `#F8FAFC`, có shadow nội viền sáng nhẹ.
- Loại bỏ hoàn toàn các khối hộp chữ nhật thô cứng và các dải gradient tím rác AI.

### 2.3 Thanh điều hướng 2026 Liquid Glass Floating Dock
- Nằm lơ lửng cách đáy màn hình `16px`, hai bên lề `16px`, bo tròn dạng viên nang `border-radius: 9999px`.
- Áp dụng kỹ thuật kính mờ chất lỏng: `backdrop-filter: blur(28px) saturate(190%)`, phản quang nội viền `inset 0 1px 1px rgba(255,255,255,0.8)`.
- Chỉ xuất hiện ở các màn hình chính trong ứng dụng; ẩn hoàn toàn trong các màn hình onboarding, đăng nhập và xác thực.

### 2.4 Typography & Số học
- Phông chữ giao diện: `Plus Jakarta Sans` (rõ ràng, hiện đại, hỗ trợ dấu tiếng Việt chuẩn).
- Phông chữ số liệu: `JetBrains Mono` tabular nums (cố định độ rộng từng chữ số, chống nhảy giao diện khi cập nhật tiền cước hoặc đồng hồ đếm ngược).

---

## 3. Luồng Nghiệp Vụ Khách Hàng (Customer Journey — 6 Chặng)

```
[Chặng 1: Onboard & B2B Auth] 
  ➔ [Chặng 2: Map-First Booking & Fleet Matrix] 
  ➔ [Chặng 3: Escrow Pre-paid & VAT] 
  ➔ [Chặng 4: Radar Phát Sóng Ghép Xe] 
  ➔ [Chặng 5: Live GPS Telemetry & Chat] 
  ➔ [Chặng 6: Bàn Giao e-POD & Hóa Đơn]
```

### Chặng 1: Onboarding & Khởi tạo tài khoản B2B
- **Màn 1 (`onboarding`)**: 3 slide chuyển động giới thiệu năng lực cốt lõi (Đa dạng tải trọng ➔ Bốc xếp 2 đầu ➔ Bảo hiểm toàn quốc). Chấm chỉ số trang vàng Amber. Nút *"Tiếp tục"* và nút *"Bỏ qua"*.
- **Màn 2 (`login`)**: Nhập SĐT quốc tế 🇻🇳 `+84` ➔ Lưới 6 ô OTP Firebase phân tách độc lập (`8 8 4 2 0 1`), đếm ngược gửi lại 45s. Có nút *"Tiếp tục với Google Workspace"*.
- **Màn 3 (`customer-register`)**: Nhập Tên doanh nghiệp/người gửi, Mã số thuế (MST), Email kế toán nhận hóa đơn VAT, checkbox đồng ý bảo hiểm hàng hóa.
- **Màn 4 (`customer-address`)**: Tìm kiếm địa chỉ Vietmap ➔ Ghim vị trí kho bãi trên bản đồ ➔ Gắn chip (🏢 Kho chính, 🏬 Văn phòng, 🏠 Kho phụ) ➔ Nhập tên/SĐT thủ kho giao nhận.

### Chặng 2: Đặt xe trên bản đồ & Lộ trình đa điểm (Lalamove Style)
- **Màn 5 (`customer/home`)**: Bản đồ giao thông toàn màn hình. Khay trượt Bottom Sheet từ dưới lên.
- **Thanh cuộn xe tải 3D (Fleet Carousel)**: Thể hiện hình ảnh 3D xe, tải trọng và kích thước lọt lòng thùng xe (`D x R x C`):
  - *Xe Van 500kg* (`2.1 x 1.3 x 1.2m` — nội thành giờ cao điểm).
  - *Xe Tải 1.25T* (`3.2 x 1.6 x 1.7m` — hàng pallet, vật tư).
  - *Xe Tải 2.5T* (`4.3 x 1.8 x 1.9m` — liên tỉnh, khối lượng lớn).
  - *Xe Ba Gác* (`1.8 x 1.1m` — ngõ ngách nhỏ).
- **Trục tuyến đường Customer Route Spine**: Điểm bốc hàng (A) ➔ Cho phép thêm 1–3 điểm dừng trung gian ➔ Điểm dỡ hàng (B).
- **Dịch vụ gia tăng**: Bốc xếp 2 đầu (+50k), giao lên tầng lầu có thang máy (+30k), thu hộ tiền hàng COD.

### Chặng 3: Giữ cọc Escrow & Thanh toán trước
- Khách hàng chọn nguồn thanh toán:
  - *Hạn mức ví doanh nghiệp* (B2B Credit Line).
  - *Mã VietQR động (payOS/NAPAS247)*: Tự động đối soát trong 3 giây.
- Tiền cước được khóa an toàn (Escrow lock). Nếu không ghép được xe hoặc khách hủy khi đơn còn `REQUESTED` ➔ Tự động hoàn tiền 100% ngay lập tức.

### Chặng 4: Radar phát sóng tìm xe
- Giao diện sóng Radar quét tài xế xe tải phù hợp trong bán kính 5km.
- Tự động đẩy đơn 1-1 cho tài xế gần nhất với timer 15 giây. Nếu quá hạn ➔ Chuyển vào Load-board chung.

### Chặng 5: Giám sát GPS thời gian thực (Live Telemetry)
- **Màn 6 (`customer/tracking`)**: Vệt xe tải di chuyển theo tọa độ thực trên bản đồ (truyền qua Socket.IO).
- Dynamic Island / Thanh trạng thái hiển thị ETA dự kiến và khoảng cách tới điểm giao.
- Thẻ thông tin tài xế: Họ tên, biển số xe tải, xếp hạng 4.98★, nút gọi điện thoại thoại bảo mật (Masked call) và khung chat trong app (`customer/chat/[id]`).

### Chặng 6: Nghiệm thu e-POD & Hóa đơn tài chính
- Khách hàng xem ảnh chụp hạ tải kiện hàng có gắn GPS và chữ ký số thủ kho ngay trên màn hình.
- Tiền cọc Escrow được giải ngân cho tài xế.
- Tự động phát hành Hóa đơn điện tử VAT 8% định dạng PDF hợp lệ của Tổng cục Thuế (`customer/invoice-preview`).
- Đánh giá chất lượng phục vụ 1–5 sao và gửi tiền tip tài xế (`customer/review/[id]`).

---

## 4. Luồng Nghiệp Vụ Tài Xế (Driver Journey — 4 Giai Đoạn)

```
[Giai đoạn 1: KYC & Ký Hợp Đồng Số] 
  ➔ [Giai đoạn 2: Field Cockpit & Nhận Cuốc Hybrid] 
  ➔ [Giai đoạn 3: 4 Bước Giao Hàng & e-POD] 
  ➔ [Giai đoạn 4: Ví Thu Nhập & Rút Tiền 24/7]
```

### Giai đoạn 1: Xác thực đối tác (KYC) & Ký hợp đồng điện tử
- **`driver-register` / `kyc`**:
  - Khai báo loại phương tiện: `TRUCK` (Xe tải), `VAN` (Xe van), `MOTORBIKE` (Ba gác).
  - Khai báo: Biển số xe, Số Giấy phép lái xe (GPLX).
  - Tải 3 tài liệu bắt buộc: **Mặt trước GPLX**, **Cà-vẹt đăng ký xe**, **CCCD**.
  - **Ký hợp đồng dịch vụ**: Xem trước bản PDF mẫu ➔ Ký tên cảm ứng trực tiếp trên màn hình ➔ Hệ thống đóng gói chữ ký số vào file PDF hợp đồng lưu trữ.
  - Hồ sơ chuyển trạng thái `PENDING_APPROVAL` để Admin xét duyệt.

### Giai đoạn 2: Trạm điều khiển hiện trường (Field Cockpit)
- **`driver/orders`**:
  - **Công tắc Hero Duty Control**: Nút bật/tắt `TRỰC TUYẾN / NGOẠI TUYẾN` to bản ở đầu màn hình.
  - Thống kê trong-ngày: Số cuốc hoàn tất, tổng thu nhập ngày, giờ trực tuyến.
  - **Cơ chế nhận cuốc Hybrid**:
    - *Đơn đẩy 1-1*: Popup khẩn cấp toàn màn hình, chuông rung, đồng hồ đếm ngược 15 giây, thông tin cước nhận, khoảng cách tới điểm bốc hàng. Nút *"NHẬN CUỐC NGAY"* cực to bản 1 chạm.
    - *Bảng hàng Load-board*: Danh sách các cuốc xe phát sóng trong bán kính 5–10km, tài xế chủ động bấm nhận.

### Giai đoạn 3: Tiến trình giao nhận 4 bước tuần tự & e-POD
- **`driver/orders/[id]`**:
  - **Bước 1 — `ACCEPTED` (Đã nhận đơn)**: Mở điều hướng Google Maps / Vietmap Navigation chỉ đường tới kho lấy hàng.
  - **Bước 2 — `PICKING_UP` (Đến kho lấy hàng)**: Kiểm tra hàng hóa, đối chiếu số kiện pallet ➔ Bấm *"Đã lên hàng xong"*.
  - **Bước 3 — `IN_TRANSIT` (Vận chuyển hàng hóa)**: Xe di chuyển trên đường. Ứng dụng tự động phát tọa độ GPS ngầm về máy chủ định kỳ 5–10s.
  - **Bước 4 — `DELIVERED` & Nghiệm thu e-POD**:
    - Đến điểm giao ➔ Bắt buộc mở camera chụp ảnh hàng hóa đã hạ tải tại kho (đóng dấu GPS + thời gian).
    - Khung vẽ chữ ký cảm ứng để thủ kho/người nhận ký tên điện tử.
    - Gửi e-POD lên hệ thống ➔ Chuyến đi hoàn tất.

### Giai đoạn 4: Ví thu nhập, Rút tiền 24/7 & Quản trị hiệu suất
- **`driver/earnings` & `driver/wallet`**:
  - Tiền cước được cộng ngay vào ví tài xế (đã trừ 10% phí hoa hồng nền tảng).
  - Nút *"Rút tiền 24/7"*: Rút tiền về tài khoản ngân hàng liên kết trong 60 giây.
- **`driver/performance`**:
  - Chỉ số OTD (Giao đúng giờ) > 98%, Tỷ lệ nhận cuốc > 95%.
  - Phân cấp thứ hạng tài xế: Chuẩn ➔ Bạc ➔ Vàng ➔ Kim cương (ưu tiên đơn giá trị cao).

---

## 5. Kiến Trúc Kỹ Thuật, Kênh Truyền & Xử Lý Ngoại Lệ

### 5.1 Bất biến vòng đời đơn hàng (State Machine Invariants)
- Chuyển trạng thái bắt buộc tuần tự: `REQUESTED ➔ ACCEPTED ➔ PICKING_UP ➔ IN_TRANSIT ➔ DELIVERED`.
- Nghiêm cấm nhảy cóc trạng thái; nghiêm cấm chuyển `DELIVERED` nếu thiếu ảnh chụp hàng hóa hoặc thiếu chữ ký số e-POD.
- Khách chỉ được hủy khi đơn ở `REQUESTED`. Sau khi tài xế đã nhận (`ACCEPTED`), hủy đơn phải qua hỗ trợ SOS/Admin có lý do cụ thể.

### 5.2 Kênh truyền Socket.IO thời gian thực
- **`room:driver:{driverId}`**: Nhận sự kiện đơn đẩy độc quyền `dispatch:offer` kèm thời hạn 15 giây.
- **`room:order:{orderId}`**: Truyền nhận tọa độ GPS `tracking:point` thời gian thực và cập nhật trạng thái cuốc xe.
- **`room:chat:{orderId}`**: Kênh chat trực tiếp giữa khách hàng và tài xế trong suốt chuyến đi.

### 5.3 Xử lý ngoại lệ & Tình huống biên (Edge Cases)
- **Xung đột nhận đơn (Race condition)**: Hai tài xế cùng bấm nhận 1 đơn trên Load-board ➔ Database xử lý bằng transaction `SELECT FOR UPDATE`. Người đến sau nhận thông báo êm dịu: *"Đơn hàng vừa được tài xế khác tiếp nhận"*, tự động làm mới danh sách.
- **Mất sóng GPS / Rớt mạng ngoài đường**: Thiết bị tự động lưu đệm tọa độ GPS vào bộ nhớ cục bộ (SQLite / AsyncStorage queue) và tự động đồng bộ (flush) ngay khi có mạng trở lại.
- **Lỗi tải ảnh e-POD do mạng yếu**: Tự động nén ảnh chuẩn WebP (< 2MB) và lưu cache; tài xế bấm nút *"Gửi lại bằng chứng"* mà không bắt thủ kho phải ký lại.
- **Hoàn tiền cọc Escrow**: Tự động hoàn cọc 100% về tài khoản doanh nghiệp trong 3 giây nếu đơn bị hủy ở trạng thái `REQUESTED`.

---

## 6. Kế Hoạch Triển Khai Tiếp Theo

Sau khi đặc tả thiết kế này được duyệt, các bước thực hiện tiếp theo:
1. Tạo Implementation Plan chi tiết bằng kỹ năng `writing-plans`.
2. Chuẩn hóa Theme Tokens & UI Primitives tại `packages/mobile-core`.
3. Triển khai hoàn thiện các màn hình Customer tại `apps/mobile`.
4. Triển khai hoàn thiện các màn hình Driver tại `apps/driver`.
5. Chạy bộ kiểm thử tự động toàn diện (`test`, `typecheck`, `lint`) trên toàn bộ monorepo trước khi tích hợp.
