# LEOPARD Design Strategy & Coding Rules

> **Mục đích:** Quy định bộ nguyên tắc thiết kế và lập trình giao diện (UI/UX) chuẩn mực cho toàn bộ hệ thống LEOPARD (Mobile App Khách Hàng, Mobile Cockpit Tài Xế, Operations Console Web).  
> **Nguyên tắc cốt lõi:** B2B Vận Hành Hiện Đại (Modern Operational Cockpit), Chuẩn mực Apple HIG & 2026 Liquid Glass, Thẻ Viền Kép (Double-Bezel), Tương phản Cao & Chống Cliché AI-Slop.

---

## 1. Triết lý Thiết kế

LEOPARD là nền tảng điều phối vận tải logistics B2B / SME chuyên nghiệp, phục vụ 4 vai trò (`CUSTOMER`, `DRIVER`, `FLEET_OWNER`, `ADMIN`).
Giao diện phải hỗ trợ người dùng **quét nhanh thông tin, nắm bắt trạng thái chuyến đi trong tích tắc và thao tác an toàn ngoài hiện trường**.

### Những điều TUYỆT ĐỐI KHÔNG làm (AI-Slop & Cartoon Anti-Patterns)
1. **Không dùng emoji** (🚚, 🏢, ⚡, 🔔, 🤖, 👨‍✈️, 🛺, 📸...) làm biểu tượng giao diện chính, icon tabbar hoặc nút bấm. Bắt buộc dùng biểu tượng vector nét thanh hoặc hình ảnh render 3D thực tế của xe tải.
2. **Không dùng hình vẽ hoạt hình**, nhân vật hoạt họa, stroke nét vẽ quá dày hoặc icon đồ chơi tròn phồng.
3. **Không bo góc vô tội vạ thiếu quy tắc**: Bo góc phải tuân thủ nghiêm ngặt hệ số đồng tâm `Double-Bezel` (`calc(R - p)`), cấm bo tròn bong bóng lộn xộn làm biến dạng layout.
4. **Không phủ nền thẻ bằng các màu pastel sặc sỡ** (hồng phấn, tím mộng mơ, vàng chanh) gây rối mắt.
5. **Không dùng gradient tím/hồng AI-slop**: Nghiêm cấm gradient tím mờ ảo kiểu chatbot AI. Chỉ sử dụng độ mờ kính lỏng tinh khiết (2026 Liquid Glass) hoặc nền trung tính tương phản cao.
6. **Không dùng font weight quá khổ (800, 900) trên toàn bộ đoạn văn bản dài**: Chỉ dùng Bold/ExtraBold cho các chỉ số cước phí và tiêu đề quan trọng.

---

## 2. Hệ Thống Biểu Tượng Tượng Trưng (Symbolic Vector Icons)

Mọi icon trong hệ thống tuân thủ chuẩn **Vector nét thanh (1.5px – 2px stroke)** phong cách Lucide / SF Symbols / Feather hoặc hình ảnh 3D chính thức từ codebase:

| Nhóm Icon | Thành phần | Đặc điểm thiết kế |
| :--- | :--- | :--- |
| **Điều hướng & Chung** | Home, Route, Wallet, User, Bell, Search, Close, Arrow, Clock | Nét thanh mảnh 1.75px, hình học chuẩn xác, màu sắc slate (`#475569`), navy (`#0B1E42`) hoặc brand (`#0284C7`). |
| **Phương tiện vận tải** | Xe Ba Gác (`IconVehicle3Wheel`), Xe Van 500kg (`IconVehicleLightTruck`), Xe Tải 1.25T–2.5T (`IconVehicleHeavyTruck`) | Sử dụng ảnh render 3D chân thực (`service-*.png`) hoặc vector kỹ thuật tối giản, hiển thị sắc nét trên cả Web và Mobile. |
| **Nghiệp vụ vận tải** | Location Pin, Fast Delivery, Security Shield, VietQR payOS, Camera e-POD | Tượng trưng, chuẩn xác, thể hiện rõ giá trị nghiệp vụ: "Đúng nơi", "Đúng hẹn", "An toàn", "Đối soát minh bạch". |
| **Vai trò (Roles)** | Customer B2B, Driver Cockpit, Fleet Owner, Admin | Badge tối giản, phân biệt rõ ràng phạm vi trách nhiệm. |

---

## 3. Quy Chuẩn Bo Góc, Thẻ Viền Kép & Kính Mờ (Radius & Materials)

- `radius.control`: **12px–14px** — Sử dụng cho nút bấm (`Button`), ô nhập liệu (`TextInput`), dropdown (chuẩn touch target ≥ 48px).
- `radius.card`: **16px–20px** — Thẻ nội dung tiêu chuẩn, thẻ thông tin chuyến đi, thẻ tài xế.
- `radius.bezelOuter` (**24px**) & `radius.bezelInner` (**18px**) — Áp dụng kiến trúc **Double-Bezel** (thẻ lồng thẻ có viền hairline sáng nhẹ) tạo chiều sâu xúc giác cao cấp.
- `radius.modal`: **26px–28px** — Khay kéo trượt từ dưới lên (Lalamove-Style Floating Bottom Sheet) và modal nhận cuốc khẩn cấp.
- `radius.pill`: **9999px** — Sử dụng cho **2026 Liquid Glass Floating Dock**, status badge, filter chip thu gọn, chấm tín hiệu trực tuyến.
- **Vật liệu 2026 Liquid Glass:**
  - Áp dụng cho thanh điều hướng nổi đáy (Floating Capsule Dock) và các thẻ nổi trên bản đồ:
  - `backdrop-filter: blur(28px) saturate(190%) contrast(1.05)`.
  - Phản quang nội viền: `inset 0 1px 1.5px rgba(255, 255, 255, 0.7)`.
  - Đổ bóng nổi mềm mại: `0 12px 32px rgba(11, 30, 66, 0.14)`.

---

## 4. Typography & Phông Chữ

Sử dụng kết hợp phông chữ **`Plus Jakarta Sans`** và **`JetBrains Mono`**:

- `pageTitle`: **20–22px** / Line-height: **28–30px** / Weight: **800 (ExtraBold)** — Tiêu đề màn hình.
- `sectionTitle`: **16–18px** / Line-height: **24–26px** / Weight: **700 (Bold)** — Tiêu đề phân mục.
- `body`: **14–15px** / Line-height: **20–22px** / Weight: **500–600 (Medium)** — Nội dung và form nhập liệu.
- `bodyCompact`: **12–13px** / Line-height: **16–18px** / Weight: **400–500** — Danh sách, bảng biểu, metadata.
- `caption`: **10–11px** / Line-height: **14–16px** / Weight: **700** — Chú thích, thời gian, nguồn ETA.
- **Bắt buộc số học Tabular (`JetBrains Mono`):** Mọi số liệu tiền cước (`320.000 đ`), mã đơn (`LP-8842`), biển số xe (`51D-892.41`), tọa độ GPS và bộ đếm ngược thời gian (`15s`) bắt buộc dùng font mono tabular để không làm xô lệch layout khi số cập nhật real-time.

---

## 5. Bảng Màu Nhận Diện Thương Hiệu (Official Semantic Palette)

Khớp chuẩn 100% với yêu cầu nhận diện thương hiệu LEOPARD và mã nguồn `packages/mobile-core`:

- **Trắng tuyết (#FFFFFF / #F8FAFC):** Nền canvas chính, bề mặt thẻ nội dung, độ sáng sạch sẽ.
- **Vàng Amber Gold (#F59E0B / #D97706 / #FEF3C7):** Màu nhận diện đốm hoa mai LEOPARD; dùng cho số liệu cước phí, xếp hạng sao (4.98★), trạng thái cảnh báo và các nút điểm nhấn hành động.
- **Xanh biển Midnight Navy (#0B1E42 / #061226) & Ocean Blue (#0284C7):** Màu nhận diện vận tải chính; dùng cho thanh tiêu đề, nút hành động chính (Primary CTA), lộ trình giao thông.
- **Xanh lá Pastel (#16A34A / #DCFCE7):** Trạng thái trực tuyến (Online), cuốc xe hoàn tất bàn giao và xác thực an toàn.
- **Trạng thái ngữ nghĩa (Status Semantic):**
  - `info`: Nền `#E0F2FE`, Chữ `#0284C7`, Viền `#38BDF8` (`REQUESTED`, `QR_CREATED`).
  - `active`: Nền `#E0F2FE`, Chữ `#0B1E42`, Viền `#0284C7` (`ACCEPTED`, `IN_TRANSIT`).
  - `warning`: Nền `#FEF3C7`, Chữ `#B45309`, Viền `#F59E0B` (`PICKING_UP`, `UNPAID`).
  - `success`: Nền `#DCFCE7`, Chữ `#166534`, Viền `#22C55E` (`DELIVERED`, `PAID_MANUAL`).
  - `danger`: Nền `#FEE2E2`, Chữ `#B91C1C`, Viền `#EF4444` (`CANCELLED`, `FAILED`).

---

## 6. Quy Tắc Áp Dụng Cho Toàn Bộ Các Phân Hệ

Mọi màn hình thuộc 4 nhóm phân hệ Khách Hàng và Tài Xế bắt buộc phải tuân thủ nghiêm ngặt quy chuẩn này:
1. **Khởi động & Xác thực B2B**: Onboarding, SĐT + OTP, Đăng ký MST, Kho bãi mặc định.
2. **Khách hàng Đặt xe & Vận hành**: Bản đồ tràn viền, Bottom sheet chọn xe tải 3D (`D x R x C`), Route Spine đa điểm, Giữ cọc Escrow.
3. **Giám sát & Thanh toán**: Live GPS Telemetry, VietQR payOS đối soát 3s, Xuất hóa đơn VAT điện tử PDF.
4. **Tài xế Điều phối & Nghiệm thu e-POD**: Field Cockpit trực tuyến, đếm ngược 15s, quy trình 4 bước, Chữ ký số thủ kho & Ảnh chụp hạ tải.
