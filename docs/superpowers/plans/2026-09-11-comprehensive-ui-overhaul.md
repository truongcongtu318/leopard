# Comprehensive UI/UX Overhaul Implementation Plan (Production Tier — 44 Screens)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Đập bỏ toàn bộ layout cũ chắp vá và các lỗi AI generic, triển khai đầy đủ hệ sinh thái **44 màn hình đạt chuẩn Production** (26 Customer + 18 Driver) theo kiến trúc Map-First chuẩn Lalamove, khay trượt Gesture Bottom Sheet 3 nấc, 100% SVG Vector (không dùng emoji làm icon), thẻ viền kép Double-Bezel và thanh đáy 2026 Liquid Glass Dock.

**Architecture:** 
1. `packages/mobile-core`: Xây dựng component dùng chung `GestureBottomSheet` (3 nấc dừng 18% - 52% - 92%), bộ icon vector SVG chuẩn hóa (`icon-sm: 16px`, `icon-md: 20px`, `icon-lg: 24px`, stroke 1.8px/2.0px), và thanh điều hướng `FloatingNavBar` kính lỏng 2026.
2. `apps/mobile` (Customer — 26 màn): Viết lại hoàn toàn `HomeDashboardScreen.tsx` (loại bỏ 2.800 dòng code cũ), bổ sung các màn hình thiếu (`verify-otp`, `location-picker`, `searching`, `checkout`, `security`), chuẩn hóa toàn bộ nhóm Auth, Booking, Deliveries, Tracking, Hóa đơn VAT và Profile/Settings.
3. `apps/driver` (Driver — 18 màn): Bổ sung các màn hình thiếu (`verify-otp`, `kyc-pending`, `bank-accounts`), chuẩn hóa Field Cockpit (Hero duty switch), modal 15s đếm ngược, quy trình 4 bước B2B e-POD, Ví thu nhập 24/7 và Profile/Performance/Settings.

**Tech Stack:** React Native (Expo Router v57 / React 19), TypeScript, `@leopard/mobile-core`, `@leopard/shared`, `react-native-svg`, Vietmap GIS.

**Spec:** `docs/superpowers/specs/2026-09-11-comprehensive-ui-overhaul-spec.md`

## Global Constraints

- **100% SVG Vector**: Không dùng emoji làm icon hệ thống; stroke 1.8px/2.0px; token `icon-sm: 16px`, `icon-md: 20px`, `icon-lg: 24px`.
- **Bản đồ Layer 0**: Luôn tràn viền 100% viewport (`RealInteractiveMap`), không để khối header opaque nào che cắt đứt đoạn.
- **TopBar kính mờ Layer 1**: Nổi lơ lửng cách đỉnh, `backdropFilter: 'blur(20px)'`, `rgba(255,255,255,0.85)`.
- **Bottom Sheet Layer 2**: Bo tròn đỉnh 32px (`rounded-t-[32px]`), hỗ trợ 3 nấc dừng (Snap 1: 18%, Snap 2: 52%, Snap 3: 92%).
- **Liquid Glass Dock Layer 3**: Nổi cách đáy 16px, `borderRadius: 9999`, ẩn nhẹ khi Sheet kéo lên Snap 3.
- **Double-Bezel**: Vỏ ngoài bo 24px viền hairline, lõi trong bo 18px.
- **Tabular Mono**: Mọi giá cước, thời gian đếm ngược, tọa độ GPS dùng `fontVariant: ['tabular-nums']`.
- **Touch Target**: Tối thiểu 44x44px trên tất cả các nút tương tác.
- **Quality Gates**: Pass 100% `pnpm lint`, `pnpm typecheck`, `pnpm test` và `pnpm build`.

---

### Task 1: Xây dựng Primitive `GestureBottomSheet` & Bộ SVG Icons chuẩn trong `packages/mobile-core`

**Files:**
- Create: `packages/mobile-core/src/ui/GestureBottomSheet.tsx`
- Create: `packages/mobile-core/src/ui/GestureBottomSheet.test.tsx`
- Create: `packages/mobile-core/src/icons/svg-icons.tsx`
- Create: `packages/mobile-core/src/icons/svg-icons.test.tsx`
- Modify: `packages/mobile-core/src/ui/index.ts`
- Modify: `packages/mobile-core/src/index.ts`

**Interfaces:**
- Produces: `<GestureBottomSheet snapPoints={[0.18, 0.52, 0.92]} initialSnapIndex={1} onSnapChange={fn}>{children}</GestureBottomSheet>`
- Produces: Hệ thống icon SVG vector chuẩn hóa (`IconTruck`, `IconVan`, `IconBike`, `IconWarehouse`, `IconOffice`, `IconPin`, `IconReceipt`, `IconShield`, `IconClose`, `IconChevron`, `IconSearch`, `IconClock`) có stroke 1.8px/2.0px.

- [ ] **Step 1: Viết test cho GestureBottomSheet và bộ icon SVG**

Run: `pnpm --filter @leopard/mobile-core test -- src/ui/GestureBottomSheet.test.tsx src/icons/svg-icons.test.tsx`

- [ ] **Step 2: Viết component `GestureBottomSheet.tsx` và `svg-icons.tsx`**

Hỗ trợ 3 nấc dừng, thanh handle kéo, bo góc đỉnh 32px, bóng đổ nổi êm ái, bộ icon vector có prop `size` và `color`.

- [ ] **Step 3: Chạy test xác nhận PASS**

Run: `pnpm --filter @leopard/mobile-core test`

- [ ] **Step 4: Commit**

```bash
git add packages/mobile-core/src/ui/ packages/mobile-core/src/icons/ packages/mobile-core/src/index.ts
git commit -m "feat(mobile-core): add 3-snap GestureBottomSheet and standardized svg icon system"
```

---

### Task 2: Viết lại hoàn toàn `HomeDashboardScreen.tsx` chuẩn Map-First Lalamove (Customer)

**Files:**
- Rewrite: `apps/mobile/src/features/home/HomeDashboardScreen.tsx`
- Test: `apps/mobile/src/features/home/HomeDashboardScreen.test.tsx`

**Interfaces:**
- Consumes: `RealInteractiveMap`, `GestureBottomSheet`, `FloatingNavBar`, `FLEET_VEHICLES`, `svg-icons`
- Produces: Bản đồ 100% viewport nền, TopBar kính mờ nổi lơ lửng, Bottom Sheet 3 nấc chứa Route Box A ➔ B + Fleet Matrix carousel (Van 500kg, Xe 1.25T hiển thị `3.2 x 1.6 x 1.7m`, 2.5T, Ba gác) + Nút đặt xe to bản dính đáy `ĐẶT XE NGAY · 280.000 đ`. Xóa hoàn toàn 2.800 dòng code chắp vá cũ.

- [ ] **Step 1: Cập nhật test trong `HomeDashboardScreen.test.tsx`**

Xác nhận Map Layer 0 không bị header che khuất, bottom sheet snap positions, kích thước xe tải và nút CTA lớn.

- [ ] **Step 2: Viết lại sạch sẽ `HomeDashboardScreen.tsx`**

Xóa bỏ khối `#0B2347` cũ. Triển khai phân tầng 4 lớp Z-Index rõ ràng.

- [ ] **Step 3: Chạy test kiểm tra PASS**

Run: `pnpm --filter mobile test -- src/features/home/HomeDashboardScreen.test.tsx`

- [ ] **Step 4: Commit**

```bash
git add apps/mobile/src/features/home/HomeDashboardScreen.tsx apps/mobile/src/features/home/HomeDashboardScreen.test.tsx
git commit -m "feat(mobile): rebuild HomeDashboardScreen with pure map-first and 3-snap bottom sheet"
```

---

### Task 3: Triển khai màn hình OTP độc lập & Chuẩn hóa toàn bộ Nhóm Auth B2B (Customer & Driver)

**Files:**
- Create: `apps/mobile/app/(public)/verify-otp.tsx`
- Create: `apps/driver/app/(public)/verify-otp.tsx`
- Modify: `apps/mobile/app/(public)/login.tsx`
- Modify: `apps/driver/app/(public)/login.tsx`
- Modify: `apps/mobile/app/(public)/customer-register.tsx`
- Modify: `apps/mobile/app/(public)/customer-address.tsx`
- Create: `apps/driver/app/(public)/kyc-pending.tsx`
- Test: `apps/mobile/src/auth/verify-otp.test.tsx`
- Test: `apps/driver/src/auth/verify-otp.test.tsx`

**Interfaces:**
- Produces: Luồng xác thực 2 bước tách rời: `login` (nhập SĐT) ➔ `verify-otp` (6 ô OTP to bản + đếm ngược 60s + bàn phím số iOS Numpad). Màn hình `kyc-pending` cho tài xế. Đăng ký B2B 1 cột MST mono và kho bãi 45% bản đồ ghim vị trí.

- [ ] **Step 1: Viết test cho verify-otp route ở cả 2 app**

Run: `pnpm --filter mobile test -- src/auth/verify-otp.test.tsx`

- [ ] **Step 2: Tạo màn hình `verify-otp.tsx` và `kyc-pending.tsx`**

Triển khai giao diện OTP riêng biệt, tự động chuyển focus số kế tiếp, bàn phím số Numpad cố định nửa dưới màn hình.

- [ ] **Step 3: Cập nhật `login.tsx`, `customer-register.tsx`, `customer-address.tsx`**

Bỏ emoji 🏢, thay bằng icon SVG vector chuẩn hóa.

- [ ] **Step 4: Chạy test kiểm tra PASS**

Run: `pnpm --filter mobile test` & `pnpm --filter driver test`

- [ ] **Step 5: Commit**

```bash
git add apps/mobile/app/\(public\)/ apps/driver/app/\(public\)/ apps/mobile/src/auth/ apps/driver/src/auth/
git commit -m "feat(auth): implement dedicated verify-otp screens and complete b2b auth flow"
```

---

### Task 4: Bổ sung Màn hình Radar Quét Xe, Ghim Vị Trí & Thanh Toán VietQR Toàn Màn (Customer)

**Files:**
- Create: `apps/mobile/app/customer/location-picker.tsx`
- Create: `apps/mobile/app/customer/orders/searching/[id].tsx`
- Create: `apps/mobile/app/customer/orders/checkout/[id].tsx`
- Modify: `apps/mobile/app/customer/orders/new.tsx`
- Test: `apps/mobile/src/features/customer/orders/new-screens.test.tsx`

**Interfaces:**
- Produces: `location-picker` ghim tâm bản đồ toàn màn hình; `searching` sóng radar 5km đếm ngược 30s ghép xe + nút hủy hoàn cọc tức thì; `checkout` khung VietQR động payOS / NAPAS247 gạch nợ 3s toàn màn hình.

- [ ] **Step 1: Viết test cho 3 màn hình mới**

Run: `pnpm --filter mobile test -- src/features/customer/orders/new-screens.test.tsx`

- [ ] **Step 2: Xây dựng 3 màn hình `location-picker`, `searching`, `checkout`**

Thay thế hoàn toàn các modal popup tạm bợ bằng route màn hình chuyên nghiệp.

- [ ] **Step 3: Chạy test kiểm tra PASS**

Run: `pnpm --filter mobile test -- src/features/customer/orders/new-screens.test.tsx`

- [ ] **Step 4: Commit**

```bash
git add apps/mobile/app/customer/location-picker.tsx apps/mobile/app/customer/orders/ apps/mobile/src/features/customer/orders/
git commit -m "feat(mobile): add dedicated location picker, radar searching, and vietqr checkout screens"
```

---

### Task 5: Chuẩn hóa Realtime Tracking, e-Invoicing & Bảng Điều Phối Kiện Hàng (Customer)

**Files:**
- Modify: `apps/mobile/src/features/tracking/RealtimeTrackingScreen.tsx`
- Modify: `apps/mobile/src/features/customer/orders/InvoicePreviewScreen.tsx`
- Modify: `apps/mobile/app/customer/deliveries.tsx`
- Modify: `apps/mobile/app/customer/chat/[id].tsx`
- Modify: `apps/mobile/app/customer/review/[id].tsx`
- Modify: `apps/mobile/app/customer/report/[id].tsx`
- Test: `apps/mobile/src/features/tracking/RealtimeTrackingScreen.test.tsx`

**Interfaces:**
- Produces: Bản đồ Dark GIS 100% viewport, thanh trạng thái cố định `ETA dự kiến: 14 phút · Còn 3.8 km`, thẻ VIP driver lơ lửng, hóa đơn VAT 8% chuẩn Bộ Tài Chính có QR thuế và nút tải PDF, khung chat tin nhắn thời gian thực và đánh giá/khiếu nại.

- [ ] **Step 1: Cập nhật test cho Tracking, Invoice và Chat**
- [ ] **Step 2: Nâng cấp layout các màn hình tương tác chuyến đi**
- [ ] **Step 3: Chạy test kiểm tra PASS**

Run: `pnpm --filter mobile test -- src/features/tracking/RealtimeTrackingScreen.test.tsx`

- [ ] **Step 4: Commit**

```bash
git add apps/mobile/src/features/tracking/ apps/mobile/src/features/customer/orders/ apps/mobile/app/customer/
git commit -m "feat(mobile): polish realtime tracking, vat invoice, deliveries board and chat"
```

---

### Task 6: Hoàn Thiện Nhóm Quản Trị B2B, Bảo Mật Apple & Tiện Ích (Customer)

**Files:**
- Create: `apps/mobile/app/customer/settings/security.tsx`
- Modify: `apps/mobile/app/customer/profile.tsx`
- Modify: `apps/mobile/app/customer/profile-edit.tsx`
- Modify: `apps/mobile/app/customer/settings.tsx`
- Modify: `apps/mobile/app/customer/addresses.tsx`
- Modify: `apps/mobile/app/customer/wallet.tsx`
- Modify: `apps/mobile/app/customer/notifications.tsx`
- Modify: `apps/mobile/app/customer/promotions.tsx`
- Modify: `apps/mobile/app/customer/support.tsx`
- Test: `apps/mobile/src/features/customer/settings/security.test.tsx`

**Interfaces:**
- Produces: Màn hình bảo mật có **Nút Xóa tài khoản vĩnh viễn** (chuẩn Apple Guideline 5.1.1); Quản lý hạn mức ví công nợ B2B; Sổ danh bạ kho bãi thẻ danh thiếp; Trung tâm trợ giúp FAQ và Điều khoản dịch vụ pháp lý.

- [ ] **Step 1: Viết test cho màn hình bảo mật và xóa tài khoản**
- [ ] **Step 2: Triển khai màn hình `security.tsx` và nâng cấp các màn hình quản trị**
- [ ] **Step 3: Chạy test kiểm tra PASS**

Run: `pnpm --filter mobile test`

- [ ] **Step 4: Commit**

```bash
git add apps/mobile/app/customer/settings/ apps/mobile/app/customer/
git commit -m "feat(mobile): complete b2b management, wallet credit, and apple security screens"
```

---

### Task 7: Tái Cấu Trúc Field Cockpit, 15s Offer Modal & B2B e-POD (Driver)

**Files:**
- Modify: `apps/driver/src/features/orders/DriverOrdersScreen.tsx`
- Modify: `apps/driver/src/features/orders/IncomingDispatchModal.tsx`
- Modify: `apps/driver/src/features/orders/DriverOrderDetailScreen.tsx`
- Modify: `apps/driver/app/contract.tsx`
- Test: `apps/driver/src/features/orders/DriverOrdersScreen.test.tsx`
- Test: `apps/driver/src/features/orders/DriverOrderDetailRoute.test.tsx`

**Interfaces:**
- Produces: Hero Duty Control `TRỰC TUYẾN / NGOẠI TUYẾN` to bản đỉnh màn hình; Bảng hàng Load-board danh thiếp bưu kiện; Modal 15s đếm ngược khẩn cấp với nút 1 chạm siêu lớn `size: driver-primary`; Vòng đời 4 bước B2B e-POD (ảnh watermark GPS + ký số); Ký hợp đồng điện tử xuất PDF.

- [ ] **Step 1: Dọn sạch dead code `ProofPanel` trong `DriverOrderDetailScreen.tsx`**
- [ ] **Step 2: Nâng cấp layout Cockpit, Modal 15s và Hợp đồng số hóa**
- [ ] **Step 3: Chạy test kiểm tra PASS**

Run: `pnpm --filter driver test`

- [ ] **Step 4: Commit**

```bash
git add apps/driver/src/features/orders/ apps/driver/app/
git commit -m "feat(driver): overhaul field cockpit, 15s offer modal, and 4-step epod lifecycle"
```

---

### Task 8: Hoàn Thiện Ví Thu Nhập 24/7, Tài Khoản Ngân Hàng, Lịch Sử & Hiệu Suất (Driver)

**Files:**
- Create: `apps/driver/app/wallet/bank-accounts.tsx`
- Modify: `apps/driver/src/features/earnings/DriverEarningsScreen.tsx`
- Modify: `apps/driver/src/features/wallet/DriverWalletScreen.tsx`
- Modify: `apps/driver/app/performance.tsx`
- Modify: `apps/driver/app/history.tsx`
- Modify: `apps/driver/app/profile.tsx`
- Modify: `apps/driver/app/profile-edit.tsx`
- Modify: `apps/driver/app/settings.tsx`
- Test: `apps/driver/src/features/wallet/bank-accounts.test.tsx`

**Interfaces:**
- Produces: Màn hình quản lý tài khoản ngân hàng thụ hưởng (MB Bank, Vietcombank); Thẻ ví thu nhập Double-Bezel và nút rút tiền tức thì 24/7 (về tài khoản trong 60s); Bảng chỉ số vận hành tài xế (OTD 99.4%, rating 4.98★); Nhật ký lịch sử cuốc xe và xem lại ảnh e-POD.

- [ ] **Step 1: Viết test cho màn hình liên kết ngân hàng**
- [ ] **Step 2: Triển khai `bank-accounts.tsx` và nâng cấp các màn hình thu nhập, hiệu suất**
- [ ] **Step 3: Chạy test kiểm tra PASS**

Run: `pnpm --filter driver test`

- [ ] **Step 4: Commit**

```bash
git add apps/driver/app/wallet/ apps/driver/src/features/ apps/driver/app/
git commit -m "feat(driver): complete instant bank payout, earnings, performance and history screens"
```

---

### Task 9: Kiểm Thử Tích Hợp Toàn Bộ Hệ Thống Monorepo

**Files:**
- Toàn bộ monorepo (`packages/mobile-core`, `apps/mobile`, `apps/driver`, `apps/api`, `apps/admin`)

- [ ] **Step 1: Chạy linter**

Run: `pnpm lint`
Expected: 0 lỗi

- [ ] **Step 2: Chạy typecheck**

Run: `pnpm typecheck`
Expected: 0 lỗi trên tất cả các package

- [ ] **Step 3: Chạy toàn bộ test suites**

Run: `pnpm test`
Expected: 100% test suites PASS

- [ ] **Step 4: Chạy build toàn monorepo**

Run: `pnpm build`
Expected: Build thành công tất cả artifacts

- [ ] **Step 5: Commit hoàn tất toàn bộ**

```bash
git commit -am "chore(release): verify and pass 100% full 44-screen production overhaul gates"
```
