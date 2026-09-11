# LEOPARD Driver App Overhaul Specification (Lalamove Map-Centric Cockpit)

> **Ngày tạo:** 2026-09-11  
> **Trạng thái:** `APPROVED_DESIGN`  
> **Mục tiêu:** Tái cấu trúc toàn diện ứng dụng Tài xế (`apps/driver`), loại bỏ hoàn toàn các lỗi layout cũ (ảnh nền núi rừng tĩnh, danh sách cuộn CRUD văn phòng, nút bấm dễ chạm nhầm), chuyển sang kiến trúc **Field Cockpit Map-First chuẩn Lalamove Driver** với công nghệ bản đồ thích ứng (Adaptive Map), thanh trượt chống chạm nhầm (`SlideToAction`), thẻ điều phối hàng hóa B2B Double-Bezel và quy trình nghiệm thu e-POD khép kín.

---

## 1. Nguyên Tắc Cốt Lõi & Ngăn Chặn Lỗi Giao Diện (Anti-Slop Guidelines)

1. **Bản đồ Layer 0 (Full-Bleed 100% Viewport)**:
   - Thay thế toàn bộ ảnh nền tĩnh (loại bỏ vĩnh viễn `driver-hero-bg.jpg`).
   - Sử dụng `RealInteractiveMap` làm lớp nền gốc (Z-index 0) cho màn hình điều phối `/orders`.
2. **Cơ chế Bản đồ Thích Ứng (Adaptive Map)**:
   - **Chế độ Rảnh (Idle)**: Định vị GPS tài xế, hiển thị các Hub/Depot logistics lân cận, vòng sóng radar quét đơn `5km / 10km`.
   - **Chế độ Có Chuyến (Active)**: Bản đồ tự động chuyển sang chế độ dẫn đường, vẽ lộ trình thực tế Điểm bốc A ➔ Điểm dỡ B.
3. **Thanh Trượt Vuốt An Toàn (Slide-to-Action)**:
   - Loại bỏ các nút bấm 1-chạm thông thường cho các thao tác trọng yếu để chống tài xế chạm nhầm khi xe rung lắc hoặc bỏ túi.
   - Thao tác kéo vuốt qua 75% chiều dài thanh mới kích hoạt hành động; thả tay trước 75% tự đàn hồi (Spring-back).
4. **Chuẩn Hóa 100% SVG Vector**:
   - Nghiêm cấm emoji (`🚚`, `📍`, `⏱️`, `⚠️`, `✅`).
   - 100% icon hệ thống dùng `@leopard/mobile-core` với stroke 1.8px/2.0px, kích thước token chuẩn `sm: 16`, `md: 20`, `lg: 24`.
5. **Độ Tương Phản Ngoài Trời & Tabular Mono**:
   - Màu sắc và độ tương phản đạt chuẩn WCAG AA ngoài trời nắng gắt.
   - Mọi số tiền VND, khoảng cách km, thời gian ETA đếm ngược, tọa độ GPS, biển số xe phải áp dụng `fontVariant: ['tabular-nums']`.
   - Chiều cao vùng chạm tối thiểu 44x44px (các nút chính lái xe >= 48px - 56px).

---

## 2. Kiến Trúc 4 Lớp Z-Index (Field Cockpit Engine)

### Layer 0 (Z-Index 0) — Full-Bleed Map Canvas
- `RealInteractiveMap` chiếm trọn 100% viewport từ đỉnh tai thỏ đến đáy.
- Chế độ hiển thị:
  - *Idle*: Marker xe tải tại vị trí GPS hiện tại + vòng quét radar bán kính + trạm depot.
  - *Active*: Polyline lộ trình di chuyển A ➔ B + marker Điểm bốc / Điểm giao.

### Layer 1 (Z-Index 20) — Floating HUD Kính Mờ (Đỉnh màn hình)
- Nổi cách đỉnh 12px, nền kính mờ phản quang `rgba(255, 255, 255, 0.88)` (hoặc dark HUD `rgba(11, 30, 66, 0.88)`).
- Gồm 3 khối chức năng:
  - **Khối bên trái**: Nút menu `≡` (mở Sidebar Drawer) + Biển số xe & Tải trọng (`51C-889.24 · 2.5T`).
  - **Khối trung tâm**: Công tắc Hero Duty `TRỰC TUYẾN / NGOẠI TUYẾN` (cao 48px, hiệu ứng đèn LED báo trạng thái).
  - **Khối bên phải / dải phụ**: Mini KPI thu nhập hôm nay `4 chuyến · 620.000 ₫ · 5.5h` (`tabular-nums`).

### Layer 2 (Z-Index 40) — Gesture Bottom Sheet 3 Nấc
Sử dụng `GestureBottomSheet` của `@leopard/mobile-core`:
- **Khi Chưa Có Chuyến**:
  - *Snap 1 (18%)*: Thu gọn xem trọn bản đồ, hiển thị dải radar tìm đơn + nút "Thử nổ đơn" mô phỏng.
  - *Snap 2 (54% - Mặc định)*: Danh sách Bảng hàng (Load-board) đơn có thể nhận với bộ lọc thùng xe (Van, 1.25T, 2.5T).
  - *Snap 3 (92%)*: Kéo kịch đỉnh xem danh sách mở rộng và bộ lọc chi tiết.
- **Khi Đang Có Chuyến**:
  - Sheet thu gọn cố định đáy: Thông tin kiện hàng, nút gọi điện thoại che số, nút chat trong app, và thanh trượt `SlideToAction` chuyển trạng thái chuyến đi.

### Layer 3 (Z-Index 60) — Modal Khẩn Cấp & Bằng Chứng e-POD
- Popup đếm ngược 15s (`IncomingDispatchModal`) có thanh trượt `SlideToAction` nhận cuốc.
- Modal chụp ảnh GPS watermark và bảng vẽ chữ ký số điện tử.

---

## 3. Danh Sách Component Chi Tiết Cần Xây Dựng & Nâng Cấp

### 3.1 Primitive Dùng Chung: `SlideToAction.tsx` (`packages/mobile-core`)
- Đường dẫn: `packages/mobile-core/src/ui/SlideToAction.tsx`
- Props:
  - `label: string`: Tiêu đề hướng dẫn (VD: `"Vuốt để nhận cuốc ➔"`).
  - `onActionComplete: () => void`: Hàm gọi khi vuốt hoàn tất.
  - `colorVariant?: 'success' | 'brand' | 'warning'`.
  - `testID?: string`.
- Đặc tính: Chiều cao 56px, `radius: 9999px`, âm thanh/haptic phản hồi khi kích hoạt, tự đàn hồi khi chưa đủ 75% quãng đường.

### 3.2 Tái Cấu Trúc `DriverOrdersScreen.tsx` (Field Cockpit)
- Đường dẫn: `apps/driver/src/features/orders/DriverOrdersScreen.tsx`
- Thay thế hoàn toàn layout cũ (xóa bỏ header ảnh núi `driver-hero-bg.jpg`).
- Triển khai phân tầng 4 lớp Z-Index:
  - Bản đồ thích ứng `RealInteractiveMap`.
  - Floating Top HUD với Hero Duty Switch.
  - `GestureBottomSheet` tích hợp Bảng hàng B2B dạng phiếu xuất kho Double-Bezel.
  - Hỗ trợ xem chi tiết đơn hoặc trượt nhận đơn trực tiếp.

### 3.3 Nâng Cấp `IncomingDispatchModal.tsx`
- Đường dẫn: `apps/driver/src/features/orders/IncomingDispatchModal.tsx`
- Thay thế nút bấm thông thường bằng `SlideToAction` ("Vuốt để nhận cuốc").
- Đồng hồ đếm ngược khẩn cấp 15s (`tabular-nums`), cước phí to bản, lộ trình A ➔ B rõ ràng.

### 3.4 Nâng Cấp `DriverOrderDetailScreen.tsx` (Quy Trình 4 Bước e-POD)
- Đường dẫn: `apps/driver/src/features/orders/DriverOrderDetailScreen.tsx`
- Tích hợp thanh trượt `SlideToAction` cho 4 nấc tiến độ:
  1. `ACCEPTED` ➔ Trượt "Đến điểm bốc hàng".
  2. `PICKING_UP` ➔ Chụp ảnh bốc hàng + Trượt "Bắt đầu vận chuyển".
  3. `IN_TRANSIT` ➔ Dẫn đường bản đồ + Trượt "Đã đến điểm dỡ hàng".
  4. `DELIVERED` ➔ Chụp ảnh nghiệm thu GPS watermark + Ký số thủ kho + Trượt "Hoàn tất giao hàng".

### 3.5 Đồng Bộ Các Màn Hình Phụ Trợ
- `contract.tsx`: Ký hợp đồng đối tác, xuất PDF.
- `wallet.tsx` & `bank-accounts.tsx`: Thẻ ví Double-Bezel, rút tiền tức thì 24/7.
- `performance.tsx`: Bảng chỉ số OTD 99.4%, rating 4.98★.

---

## 4. Kế Hoạch Kiểm Thử & Tiêu Chí Nghiệm Thu (Quality Gates)

1. **Unit Tests**:
   - Test component `SlideToAction.test.tsx` (thao tác vuốt, ngưỡng 75%, đàn hồi, kích hoạt callback).
   - Test `DriverOrdersScreen.test.tsx` (bản đồ Layer 0, Hero Duty switch, Bottom sheet snap, chuyển đổi Adaptive Map khi có chuyến).
   - Test `IncomingDispatchModal.test.tsx` (đếm ngược 15s, vuốt nhận cuốc).
   - Test `DriverOrderDetailRoute.test.tsx` (4 bước stepper, khóa xác nhận nếu thiếu e-POD).
2. **Quality Gates**:
   - `pnpm lint`: 0 lỗi trên toàn monorepo.
   - `pnpm typecheck`: 0 lỗi TypeScript.
   - `pnpm test`: 100% test suites pass.
   - `pnpm build`: Build thành công tất cả artifacts.
