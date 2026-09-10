# LEOPARD Design Strategy & Coding Rules

> **Mục đích:** Quy định bộ nguyên tắc thiết kế và lập trình giao diện (UI) chuẩn mực cho toàn bộ hệ thống LEOPARD (Mobile App, Web Operations Console).
> **Nguyên tắc cốt lõi:** Tối giản (Minimalist), Nhẹ nhàng (Calm/Lightweight), Biểu tượng Tượng trưng (Symbolic Vectors), Chuẩn mực vận hành (Road Ledger / Dispatch Control).

---

## 1. Triết lý Thiết kế

LEOPARD là nền tảng điều phối vận tải logistics pilot chuyên nghiệp, phục vụ 4 vai trò (Customer, Driver, Fleet Owner, Admin).
Giao diện phải hỗ trợ người dùng **quét nhanh thông tin, nắm bắt trạng thái chuyến đi và xử lý ngoại lệ trong tích tắc**.

### Những điều TUYỆT ĐỐI KHÔNG làm (AI-Slop & Cartoon Anti-Patterns)
1. **Không dùng emoji** (🚚, 🏢, ⚡, 🔔, 🤖, 👨‍✈️, 🛺, 📸...) làm biểu tượng giao diện chính hoặc nút bấm.
2. **Không dùng hình vẽ hoạt hình**, nhân vật hoạt họa, stroke nét vẽ quá dày hoặc icon đồ chơi tròn phồng.
3. **Không dùng bo góc quá đà** (16px, 20px, 24px cho mọi container/card) biến giao diện thành hình bong bóng.
4. **Không phủ nền thẻ bằng các màu pastel sặc sỡ** (vàng chanh, xanh nõn chuối, hồng phấn, xanh ngọc) gây rối mắt.
5. **Không dùng gradient tím/hồng**, glassmorphism mờ đục hoặc shadow nhiều lớp không phục vụ mục đích vận hành.
6. **Không dùng font weight quá khổ (800, 900)** trên toàn bộ văn bản.

---

## 2. Hệ Thống Biểu Tượng Tượng Trưng (Symbolic Vector Icons)

Mọi icon trong hệ thống phải tuân thủ chuẩn **Vector nét thanh (1.5px – 2px stroke)** phong cách Lucide / SF Symbols / Feather:

| Nhóm Icon | Thành phần | Đặc điểm thiết kế |
| :--- | :--- | :--- |
| **Điều hướng & Chung** | Home, Route, Wallet, User, Bell, Search, Close, Arrow, Clock | Nét thanh mảnh 1.75px, hình học chuẩn xác, màu sắc slate (`#475569`) hoặc brand (`#0284C7`). |
| **Phương tiện vận tải** | Xe Ba Gác (`IconVehicle3Wheel`), Xe Tải Nhẹ (`IconVehicleLightTruck`), Xe Tải Nặng (`IconVehicleHeavyTruck`) | Vẽ nét kỹ thuật tối giản, rõ hình dáng xe nhưng không hoạt hình hóa, hiển thị sắc nét trên cả Web và Mobile. |
| **Nghiệp vụ vận tải** | Location Pin, Fast Delivery, Security Shield, Support Headset, Payment Card, VietQR, Camera POD | Tượng trưng, chuẩn xác, thể hiện giá trị nghiệp vụ: "Đúng nơi", "Đúng hẹn", "An toàn", "Tiện lợi". |
| **Vai trò (Roles)** | Customer, Driver, Fleet Owner, Admin | Badge tối giản, phân biệt rõ ràng phạm vi trách nhiệm. |

---

## 3. Quy Chuẩn Bo Góc & Viền (Radius & Borders)

- `radius.control`: **6px** — Sử dụng cho nút bấm (`Button`), ô nhập liệu (`TextInput`), dropdown.
- `radius.card`: **8px** — Sử dụng cho thẻ xe, thẻ đơn hàng, khối thông tin.
- `radius.modal`: **12px** — Sử dụng cho hộp thoại xác nhận, modal điều phối, bottom sheet.
- `radius.pill`: **999px** — **Chỉ dùng DUY NHẤT** cho status badge nhỏ, filter chip thu gọn, chấm tín hiệu online/live.
- **Phân tách thị giác:** Ưu tiên dùng viền trung tính mảnh `1px #E2E8F0` và khoảng trắng tự nhiên (`spacing.sm: 12px`, `spacing.md: 16px`) thay vì đổ bóng đậm hoặc viền dày.

---

## 4. Typography & Phông Chữ

Sử dụng phông chữ **`Inter`** (hoặc system font không chân hiện đại):

- `pageTitle`: **24px** / Line-height: **32px** / Weight: **700 (Bold)** — Tiêu đề màn hình duy nhất.
- `sectionTitle`: **18–20px** / Line-height: **26–28px** / Weight: **600 (SemiBold)** — Tiêu đề nhóm / phân mục.
- `body`: **15–16px** / Line-height: **22–24px** / Weight: **400 (Regular)** — Nội dung và form nhập liệu.
- `bodyCompact`: **13–14px** / Line-height: **18–20px** / Weight: **400 (Regular)** — Danh sách, bảng biểu, metadata.
- `label`: **13–14px** / Line-height: **18–20px** / Weight: **600 (SemiBold)** — Nhãn trường nhập, nhãn nút bấm.
- `caption`: **11–12px** / Line-height: **16px** / Weight: **500 (Medium)** — Chú thích, thời gian, nguồn ETA.
- **Quy tắc số liệu:** Tiền tệ (`250.000 ₫`), mã đơn (`LP-240815`), biển số xe (`59C-882.14`) luôn dùng `font-variant-numeric: tabular-nums`.

---

## 5. Bảng Màu Chuẩn Ngữ Nghĩa (Semantic Palette)

- **Canvas nền chính:** `#F8FAFC` (Slate Canvas dịu nhẹ)
- **Bề mặt nội dung (Surface):** `#FFFFFF` (Thẻ trắng sạch sẽ) / `#F1F5F9` (Bề mặt phụ)
- **Văn bản:** `#0F172A` (Nội dung chính), `#475569` (Phụ trợ / Muted), `#94A3B8` (Ghi chú / Placeholder)
- **Đường viền (Border):** `#E2E8F0` (Viền thẻ chuẩn), `#CBD5E1` (Viền input khi chưa focus)
- **Nhận diện Brand:** `#0284C7` (Chính / Primary), `#075985` (Deep Brand), `#E0F2FE` (Soft Background)
- **Trạng thái (Status Roles):**
  - `info`: Background `#E0F2FE`, Text `#0369A1`, Border `#38BDF8` (`REQUESTED`, `QR_CREATED`)
  - `active`: Background `#E0F2FE`, Text `#0369A1`, Border `#0284C7` (`ACCEPTED`, `IN_TRANSIT`)
  - `warning`: Background `#FEF3C7`, Text `#78350F`, Border `#F59E0B` (`PICKING_UP`, `UNPAID`)
  - `success`: Background `#DCFCE7`, Text `#166534`, Border `#22C55E` (`DELIVERED`, `PAID_MANUAL`)
  - `danger`: Background `#FEE2E2`, Text `#B91C1C`, Border `#EF4444` (`CANCELLED`, `FAILED`)

---

## 6. Áp Dụng Cho Toàn Bộ 8 Phân Hệ

Mọi màn hình được xây dựng hoặc cập nhật thuộc các phân hệ sau bắt buộc phải tuân thủ nghiêm ngặt tài liệu này:
1. **Xác thực & Demo Switcher** (Login, Switcher, Logout confirmation)
2. **Khách hàng: Tạo & Đặt đơn hàng** (Wizard 3 bước, chọn xe, lộ trình)
3. **Khách hàng: Danh sách đơn hàng & Thanh toán** (List, filter, QR payment)
4. **Khách hàng: Chi tiết đơn hàng & Theo dõi hành trình** (Detail, Realtime tracking, POD)
5. **Tài xế: Danh sách đơn hàng & Nhận chuyến** (Field cockpit, toggle online)
6. **Tài xế: Chi tiết đơn hàng & Giao nhận** (Detail, sticky CTA, upload POD)
7. **Hồ sơ cá nhân & Thông báo** (Profile, notifications)
8. **Lỗi hệ thống & UI Kits** (403, 404, 500, status timeline, button library, toast)
