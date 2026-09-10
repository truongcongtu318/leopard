# LEOPARD Comprehensive UI/UX Overhaul Specification (Production Tier — 44 Screens)

> **Ngày cập nhật:** 2026-09-11  
> **Trạng thái:** `APPROVED_SPEC`  
> **Phạm vi:** Toàn diện hệ sinh thái ứng dụng di động gồm **44 màn hình đạt chuẩn Production** (26 Customer + 18 Driver).  
> **Mục tiêu:** Đập bỏ triệt để các layout cũ chắp vá và các lỗi AI generic (anti-slop), áp dụng 100% vector SVG (loại bỏ emoji làm icon), kiến trúc Map-First chuẩn Lalamove, khay trượt Gesture Bottom Sheet 3 nấc, thẻ viền kép Double-Bezel và thanh điều hướng 2026 Liquid Glass Dock.

---

## 1. Hệ Thống Nguyên Tắc Thiết Kế (Design System & Anti-Slop Rules)

### 1.1 Chuẩn Hóa Vector SVG (Loại bỏ triệt để Emoji làm icon)
- **100% SVG Vector**: Toàn bộ icon trong hệ thống sử dụng vector (`react-native-svg`), không dùng emoji (🏢, 📦, 🚚, 🔔) làm icon giao diện để tránh vỡ nét, lệch baseline và khác biệt giao diện giữa các hệ điều hành.
- **Độ dày nét đồng nhất (Stroke-Width)**: Khóa cứng `1.8px` cho icon thông thường và `2.0px` cho icon tương tác chính.
- **Kích thước theo Token chuẩn**:
  - `icon-sm` (16px): Icon trong ô input, icon phụ trợ.
  - `icon-md` (20px): Icon điều hướng, menu, shortcut.
  - `icon-lg` (24px): Icon thanh điều hướng TopBar, TabBar.
  - `icon-xl` (36px–40px): Hình minh họa xe tải 3D, icon trạng thái đơn hàng.

### 1.2 Kiến Trúc 4 Lớp Z-Index (Core Layering Engine)
- **Layer 0 (Z-Index 0) — Full-Bleed 100dvh Canvas**: Bản đồ `RealInteractiveMap` hoặc canvas nền chạy tràn viền 100% từ đỉnh tai thỏ đến đáy. Không dùng khối header opaque nào cắt đứt bản đồ.
- **Layer 1 (Z-Index 20) — Floating Glass Topbar**: Nổi lơ lửng cách đỉnh, nền kính mờ `rgba(255,255,255,0.85)`, `blur(20px)`, viền mỏng hairline phản quang.
- **Layer 2 (Z-Index 40) — Gesture Bottom Sheet 3 nấc**: Khay trượt trắng bo tròn đỉnh `rounded-t-[32px]`, bóng đổ nổi êm ái.
  - *Snap 1 (18%)*: Thu gọn xem bản đồ.
  - *Snap 2 (52% - Mặc định)*: Lộ trình A ➔ B + Ma trận xe tải 3D hiển thị kích thước thùng lọt lòng `D x R x C` + Nút đặt xe lớn.
  - *Snap 3 (92%)*: Kéo toàn màn hình xem chi tiết địa chỉ, dịch vụ phụ trợ hoặc lịch sử đơn.
- **Layer 3 (Z-Index 60) — 2026 Liquid Glass Floating Dock**: Viên nang kính lỏng nổi cách đáy 16px (`radius: 9999px`), tự động trượt ẩn khi Bottom Sheet kéo lên Snap 3.

### 1.3 Thẻ Viền Kép (Double-Bezel Architecture)
- Vỏ ngoài: `border-radius: 24px`, viền mỏng hairline `1px solid rgba(11, 30, 66, 0.08)`, đổ bóng êm `rgba(0,0,0,0.06)`.
- Lõi trong: `border-radius: 18px`, màu nền sáng sạch sẽ `#FFFFFF` hoặc `#F8FAFC`.
- Nhịp khoảng cách: Tuân thủ nhịp **8dp rhythm** (`8px`, `16px`, `24px`).

### 1.4 Số Liệu Kỹ Thuật & Cảm Ứng Ngoài Trời
- **Tabular Nums**: Mọi số tiền VND, thời gian đếm ngược, tọa độ GPS, biển số xe dùng `fontVariant: ['tabular-nums']` chống nhảy co giật giao diện.
- **Touch Target tối thiểu 44 x 44px**: Đảm bảo tài xế và khách hàng thao tác 1 chạm chính xác khi lái xe hoặc di chuyển.

---

## 2. Toàn Bộ 26 Màn Hình Khách Hàng (Customer — `apps/mobile`)

### Nhóm 1: Khởi động & Xác thực B2B (5 màn)
1. `/(public)/onboarding`: 3 slide ảnh lớn tràn viền 60% viewport; pager 3 viên nang vàng Amber `#F59E0B`, nút `Tiếp tục` Midnight Navy `#0B1E42` và nút `Bỏ qua ➔`.
2. `/(public)/login`: Hàng nhập SĐT quốc tế (`🇻🇳 +84 | [Nhập SĐT]`) cùng 1 hàng flexbox, nút `Tiếp tục nhận mã OTP ➔`.
3. `/(public)/verify-otp`: **Màn hình OTP độc lập**: Nút back `←`, hiển thị SĐT người nhận, 6 ô OTP vuông bo góc 14px, đếm ngược 60s và bàn phím số iOS Numpad ảo cố định nửa dưới màn hình.
4. `/(public)/customer-register`: Khai báo hồ sơ B2B: Tên công ty, **Mã số thuế MST** (font mono), **Email nhận hóa đơn VAT**, checkbox cam kết bảo hiểm hàng hóa viền xanh lá.
5. `/(public)/customer-address`: Thiết lập kho bãi mặc định: 45% bản đồ ghim vị trí + 55% khay chọn 3 chip SVG vector (`🏢 Kho chính`, `🏬 Văn phòng`, `🏠 Kho phụ`) và thông tin thủ kho giao nhận.

### Nhóm 2: Bản đồ, Đặt xe & Vận hành chuyến đi (7 màn)
6. `/customer/home`: **Trang chủ Map-First chuẩn Lalamove**: Đập bỏ 2.800 dòng code cũ, bản đồ 100% viewport, Bottom Sheet 3 nấc, ma trận xe tải 3D hiển thị kích thước thùng lọt lòng `D x R x C` (Van 500kg, Xe 1.25T, 2.5T, Ba gác), nút `ĐẶT XE NGAY · 280.000 đ`.
7. `/customer/location-picker`: **Bản đồ chọn điểm ghim toàn màn hình**: Pin marker cố định tâm bản đồ, thanh tìm kiếm Vietmap trên cùng, nút "Xác nhận điểm này" dính đáy.
8. `/customer/orders/new`: Tạo đơn chi tiết: Trục lộ trình `Route Spine` A ➔ B, thêm 1–3 điểm dừng trung gian, toggle chọn bốc xếp 2 đầu, giao lên lầu, thu hộ COD.
9. `/customer/orders/searching/[id]`: **Radar phát sóng tìm tài xế**: Hiệu ứng sóng radar 5km, đếm ngược ghép xe 30s, nút "Hủy tìm xe" hoàn cọc Escrow tức thì 100%.
10. `/customer/orders/checkout/[id]`: **Thanh toán VietQR & Ký quỹ Escrow**: Khung mã VietQR động payOS / NAPAS247, tự động đối soát sau 3s, chọn Hạn mức ví hoặc Ngân hàng.
11. `/customer/orders/[id]`: Chi tiết đơn hàng: Trạng thái chuyến đi, thẻ tài xế được ghép, thông tin kiện hàng, nhật ký hành trình.
12. `/customer/tracking`: **Giám sát GPS thời gian thực**: Bản đồ Dark GIS Map, vệt xe chạy Socket.IO, nhãn cố định `ETA dự kiến`, thẻ tài xế VIP 4.98★ kèm nút gọi điện bảo mật số và chat trong app.

### Nhóm 3: Nghiệm thu, Tương tác & Sự cố (5 màn)
13. `/customer/chat/[id]`: Khung chat trực tiếp trong chuyến với tài xế (tin nhắn văn bản, chia sẻ vị trí, ảnh chụp hàng).
14. `/customer/deliveries`: Bảng điều phối các chuyến xe đang lăn bánh trên đường.
15. `/customer/invoice-preview`: **Xem trước & Tải PDF Hóa đơn điện tử VAT 8%** theo Nghị định 123 / Thông tư 78 (có mã QR cơ quan thuế).
16. `/customer/review/[id]`: Đánh giá chất lượng phục vụ tài xế (1–5 sao, gắn nhãn dịch vụ, gửi tiền Tip).
17. `/customer/report/[id]`: Khiếu nại / Báo cáo sự cố hàng hóa (chụp ảnh hiện trường vỡ hỏng, chọn lý do bồi thường).

### Nhóm 4: Quản trị B2B, Tài khoản & Tiện ích nhỏ lẻ (9 màn)
18. `/customer/profile`: Trung tâm hồ sơ doanh nghiệp (hạng mức khách hàng VIP, mã khách hàng, shortcut tiện ích).
19. `/customer/profile-edit`: Chỉnh sửa thông tin liên hệ, tên người gửi, đổi ảnh đại diện (Avatar upload).
20. `/customer/settings`: Cài đặt ứng dụng (Ngôn ngữ Tiếng Việt/English, chế độ giao diện Sáng/Tối, nhận thông báo đẩy).
21. `/customer/settings/security`: **Bảo mật & Xóa tài khoản** (Đổi mã PIN thanh toán ví, FaceID/Vân tay, **Nút "Xóa tài khoản vĩnh viễn"** chuẩn Apple Guideline 5.1.1).
22. `/customer/addresses`: Sổ lưu địa chỉ kho bãi thường xuyên bốc/dỡ (quản lý thêm/sửa/xóa, gắn tag kho).
23. `/customer/wallet`: Ví doanh nghiệp, quản lý hạn mức tín dụng công nợ (B2B Credit Line), nạp tiền ví, lịch sử trừ cước.
24. `/customer/notifications`: Trung tâm thông báo đẩy (tab Chuyến xe / tab Giao dịch & Khuyến mãi).
25. `/customer/promotions`: Danh mục voucher / mã giảm giá cước vận chuyển (nhập mã, xem hạn dùng).
26. `/customer/support`: **Trung tâm trợ giúp & Pháp lý** (Các câu hỏi thường gặp FAQ, hotline tổng đài SOS, **Điều khoản dịch vụ & Chính sách bảo mật**).

---

## 3. Toàn Bộ 18 Màn Hình Tài Xế (Driver — `apps/driver`)

### Nhóm 1: Xác thực đối tác & Ký hợp đồng số (5 màn)
1. `/(public)/login`: Đăng nhập số điện thoại tài xế.
2. `/(public)/verify-otp`: **Nhập mã OTP SMS** + đếm ngược 60s + bàn phím số Numpad ảo.
3. `/(public)/driver-register` / `/kyc`: Khai báo loại xe (`TRUCK`, `VAN`, `MOTORBIKE`), biển số, số GPLX và tải 3 ảnh giấy tờ (GPLX, Cà-vẹt, CCCD) có khung xem trước và tick xanh xác thực.
4. `/contract`: **Ký hợp đồng đối tác số hóa**: Xem điều khoản pháp lý, vẽ chữ ký cảm ứng `SignaturePad` trực tiếp trên màn hình, xuất tệp PDF lưu trữ.
5. `/(public)/kyc-pending`: **Màn hình chờ duyệt hồ sơ KYC**: Thông báo hồ sơ đang được Admin thẩm định (dự kiến 2–4h), hiển thị tóm tắt thông tin xe, hotline đội xe hỗ trợ.

### Nhóm 2: Trạm điều khiển hiện trường & Nhận cuốc (4 màn)
6. `/orders`: **Field Cockpit ngoài hiện trường**: Công tắc Hero Duty Control `TRỰC TUYẾN / NGOẠI TUYẾN` to bản ở đỉnh, thẻ KPI ca chạy (chuyến, tiền, giờ online), danh sách Bảng hàng chung Load-board bán kính 5–10km.
7. `IncomingDispatchModal`: **Popup nhận cuốc khẩn cấp**: Rung/chuông báo, **đồng hồ đếm ngược 15 giây**, thông tin tiền cước, nút 1 chạm siêu lớn `NHẬN CUỐC NGAY` (`size: driver-primary`).
8. `/orders/[id]`: Vòng đời 4 bước giao hàng (`ACCEPTED ➔ PICKING_UP ➔ IN_TRANSIT ➔ DELIVERED`), dẫn đường bản đồ đến kho bãi.
9. `/chat/[id]`: Khung chat trực tiếp với khách hàng trong cuốc xe.

### Nhóm 3: Nghiệm thu e-POD, Ví thu nhập & Rút tiền (4 màn)
10. `EpodCapture` (Tích hợp trong `/orders/[id]`): **Bằng chứng giao hàng B2B e-POD**: Chụp ảnh hàng hóa hạ tải có watermark GPS/thời gian + Bảng vẽ chữ ký số của thủ kho nhận hàng — chặn chuyển `DELIVERED` nếu thiếu.
11. `/earnings`: Thống kê doanh thu ngày/tuần/tháng, biểu đồ cột thu nhập, chi tiết khấu trừ minh bạch 10% hoa hồng nền tảng, chỉ số đúng giờ OTD 99.4%.
12. `/wallet`: Số dư ví tài xế, lịch sử cộng tiền cuốc xe, nút **Rút tiền tức thì 24/7**.
13. `/wallet/bank-accounts`: **Quản lý tài khoản ngân hàng thụ hưởng**: Thêm/sửa tài khoản MB Bank, Vietcombank, đối soát tên chính chủ.

### Nhóm 4: Hiệu suất, Lịch sử & Quản trị tài xế (5 màn)
14. `/performance`: Bảng chỉ số vận hành tài xế (OTD 99.4%, tỷ lệ nhận cuốc > 95%, tỷ lệ hủy cuốc, xếp hạng sao trung bình, cấp bậc tài xế Chuẩn ➔ Bạc ➔ Vàng ➔ Kim Cương).
15. `/history`: Nhật ký lịch sử các cuốc xe đã hoàn thành (lọc theo ngày, xem lại ảnh và chữ ký e-POD).
16. `/profile`: Trang thông tin cá nhân tài xế, thông tin xe đang đăng ký, số điện thoại đội xe quản lý (`FleetOwner`).
17. `/profile-edit`: Cập nhật ảnh đại diện tài xế, số điện thoại liên hệ khẩn cấp.
18. `/settings`: Cài đặt ứng dụng tài xế (âm lượng chuông báo cuốc xe, điều hướng mặc định bằng Google Maps / Vietmap, **Hỗ trợ & Nút gọi khẩn cấp SOS**).
