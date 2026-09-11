# LEOPARD Driver App Overhaul Implementation Plan (Lalamove Map-Centric Cockpit)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Tái cấu trúc toàn diện ứng dụng Tài xế (`apps/driver`) sang chuẩn Lalamove Map-Centric Cockpit: xóa vĩnh viễn ảnh nền tĩnh `driver-hero-bg.jpg`, đưa `RealInteractiveMap` làm nền Layer 0 toàn màn hình với cơ chế bản đồ thích ứng (Adaptive Map), bổ sung thanh trượt vuốt chống chạm nhầm `SlideToAction`, khay kéo đáy `GestureBottomSheet` 3 nấc chứa Bảng hàng B2B, và tích hợp quy trình 4 bước e-POD khép kín.

**Architecture:**
1. `packages/mobile-core`: Xây dựng primitive tương tác lái xe an toàn `SlideToAction` (thanh trượt vuốt ngang ngưỡng 75% kích hoạt, tự đàn hồi khi thả tay, chiều cao 56px, bo tròn pill).
2. `apps/driver` (Field Cockpit): Viết lại layout `DriverOrdersScreen.tsx` theo 4 tầng Z-Index (Layer 0: Bản đồ tương tác thích ứng, Layer 1: Floating Top HUD với Hero Duty Switch, Layer 2: Bottom Sheet 3 nấc Bảng hàng B2B, Layer 3: Modal nhận đơn khẩn cấp).
3. `apps/driver` (Vòng đời cuốc xe & e-POD): Nâng cấp `IncomingDispatchModal.tsx` và `DriverOrderDetailScreen.tsx` sử dụng `SlideToAction` cho các hành động trọng yếu (nhận đơn, chuyển bước, hoàn tất e-POD watermark GPS + chữ ký số).

**Tech Stack:** React Native (Expo Router v57 / React 19), TypeScript, `@leopard/mobile-core`, `@leopard/shared`, `react-native-svg`, Vietmap GIS / Leaflet.

**Spec:** `docs/superpowers/specs/2026-09-11-driver-app-lalamove-overhaul-spec.md`

## Global Constraints

- **Bản đồ Layer 0**: Luôn tràn viền 100% viewport (`RealInteractiveMap`), không dùng ảnh nền tĩnh `driver-hero-bg.jpg` hay khối che opaque.
- **Thanh trượt an toàn (`SlideToAction`)**: Chiều cao 56px, `radius: 9999px`, ngưỡng kích hoạt 75% quãng đường, tự đàn hồi khi thả tay sớm.
- **Bottom Sheet Layer 2**: Bo tròn đỉnh 32px, 3 nấc dừng (Snap 1: 18%, Snap 2: 54%, Snap 3: 92%).
- **100% SVG Vector**: Nghiêm cấm emoji làm icon hệ thống; stroke 1.8px/2.0px; token `sm: 16px`, `md: 20px`, `lg: 24px`.
- **Độ tương phản ngoài trời & Touch Target**: Tối thiểu 44x44px trên mọi nút chạm (nút lái xe >= 48px - 56px).
- **Tabular Mono**: Mọi số tiền VND, khoảng cách km, thời gian ETA, tọa độ GPS, biển số xe dùng `fontVariant: ['tabular-nums']`.
- **Quality Gates**: Pass 100% `pnpm lint`, `pnpm typecheck`, `pnpm test`, và `pnpm build`.

---

### Task 1: Xây dựng Primitive `SlideToAction` trong `packages/mobile-core`

**Files:**
- Create: `packages/mobile-core/src/ui/SlideToAction.tsx`
- Create: `packages/mobile-core/src/ui/SlideToAction.test.tsx`
- Modify: `packages/mobile-core/src/ui/index.ts`
- Modify: `packages/mobile-core/src/index.ts`

**Interfaces:**
- Produces: `<SlideToAction label="Vuốt để nhận cuốc ➔" onActionComplete={fn} colorVariant="brand" disabled={boolean} testID="slide-action" />`
- Thao tác: Chiều cao 56px, `borderRadius: 9999`, PanResponder vuốt ngang, ngưỡng kích hoạt 75% chiều dài, Animated.spring đàn hồi khi chưa đạt ngưỡng.

- [ ] **Step 1: Viết test cho `SlideToAction`**

File: `packages/mobile-core/src/ui/SlideToAction.test.tsx`
Kiểm tra: Render nhãn, hành vi kéo thả qua ngưỡng 75% gọi `onActionComplete`, kéo dưới 75% thả tay đàn hồi về 0, trạng thái `disabled`.

Run: `pnpm --filter @leopard/mobile-core test -- src/ui/SlideToAction.test.tsx`
Expected: FAIL (chưa có file implementation).

- [ ] **Step 2: Viết component `SlideToAction.tsx`**

File: `packages/mobile-core/src/ui/SlideToAction.tsx`
Triển khai PanResponder + Animated.Value cho thanh trượt, icon mũi tên SVG vector `IconChevron`, haptic feedback nhẹ khi kích hoạt.

- [ ] **Step 3: Chạy test xác nhận PASS**

Run: `pnpm --filter @leopard/mobile-core test -- src/ui/SlideToAction.test.tsx`
Expected: 100% tests PASS.

- [ ] **Step 4: Xuất component ra barrel file**

Thêm export vào `packages/mobile-core/src/ui/index.ts` và `packages/mobile-core/src/index.ts`.

- [ ] **Step 5: Commit**

```bash
git add packages/mobile-core/src/ui/ packages/mobile-core/src/index.ts
git commit -m "feat(mobile-core): add SlideToAction slider component for safe driver operation"
```

---

### Task 2: Tái Cấu Trúc Field Cockpit `DriverOrdersScreen.tsx` Chuẩn Map-First Lalamove

**Files:**
- Modify: `apps/driver/src/features/orders/DriverOrdersScreen.tsx`
- Modify: `apps/driver/src/features/orders/DriverOrdersScreen.test.tsx`

**Interfaces:**
- Consumes: `RealInteractiveMap`, `GestureBottomSheet`, `SlideToAction`, `IconTruck`, `IconClock`
- Produces:
  - Layer 0: Bản đồ `RealInteractiveMap` 100% viewport nền, tự thích ứng hiển thị radar khi rảnh và polyline dẫn đường khi có chuyến active. Xóa vĩnh viễn `driverHeroBgSource` (`driver-hero-bg.jpg`).
  - Layer 1: Floating Glass HUD trên cùng cách đỉnh 12px: Nút menu drawer `≡`, Biển số xe `51C-889.24 (2.5T)`, Hero Duty Switch `TRỰC TUYẾN / NGOẠI TUYẾN` cao 48px, Mini KPI `4 chuyến · 620.000 ₫ · 5.5h` (`tabular-nums`).
  - Layer 2: `GestureBottomSheet` 3 nấc (18% - 54% - 92%):
    - Khi Rảnh: Bảng hàng Load-Board phiếu điều xe B2B Double-Bezel, bộ lọc xe tải (Van, 1.25T, 2.5T), nút "Thử nổ đơn" mô phỏng.
    - Khi Có Chuyến: Thẻ hành trình ghim cố định đáy với nút gọi điện, chat trong app và thông tin kiện hàng.

- [ ] **Step 1: Cập nhật unit tests trong `DriverOrdersScreen.test.tsx`**

Thêm test xác nhận: Map Layer 0 không bị ảnh núi che khuất, Hero Duty Switch hoạt động, Bottom sheet hiển thị bảng hàng, chuyển đổi trạng thái khi có chuyến.

Run: `pnpm --filter driver test -- src/features/orders/DriverOrdersScreen.test.tsx`

- [ ] **Step 2: Viết lại `DriverOrdersScreen.tsx` theo kiến trúc 4 lớp Z-Index**

Xóa bỏ hoàn toàn ảnh nền tĩnh và cấu trúc cuộn dạng CRUD cũ. Tích hợp `RealInteractiveMap` và `GestureBottomSheet`.

- [ ] **Step 3: Chạy test xác nhận PASS**

Run: `pnpm --filter driver test -- src/features/orders/DriverOrdersScreen.test.tsx`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add apps/driver/src/features/orders/DriverOrdersScreen.tsx apps/driver/src/features/orders/DriverOrdersScreen.test.tsx
git commit -m "feat(driver): overhaul field cockpit with pure map-first and 3-snap b2b load-board"
```

---

### Task 3: Nâng Cấp `IncomingDispatchModal.tsx` Tích Hợp `SlideToAction` 15s

**Files:**
- Modify: `apps/driver/src/features/orders/IncomingDispatchModal.tsx`
- Modify: `apps/driver/src/features/orders/IncomingDispatchModal.test.tsx`

**Interfaces:**
- Consumes: `SlideToAction` từ `@leopard/mobile-core`
- Produces: Modal nhận cuốc 15s với thanh trượt `SlideToAction` vuốt nhận đơn thay thế nút bấm 1 chạm dễ chạm nhầm; đồng hồ đếm ngược 15s `fontVariant: ['tabular-nums']`; cước phí to bản nổi bật; nút Bỏ qua có touch target 48px.

- [ ] **Step 1: Cập nhật test trong `IncomingDispatchModal.test.tsx`**

Test xác nhận: Đồng hồ đếm ngược 15s, thanh trượt vuốt `SlideToAction` nhận đơn kích hoạt `onAccept`, nút Bỏ qua kích hoạt `onDecline`.

- [ ] **Step 2: Cập nhật `IncomingDispatchModal.tsx`**

Thay thế nút nhận đơn bằng `<SlideToAction label="Vuốt để nhận cuốc ➔" onActionComplete={() => onAccept(offer.id)} colorVariant="brand" />`.

- [ ] **Step 3: Chạy test xác nhận PASS**

Run: `pnpm --filter driver test -- src/features/orders/IncomingDispatchModal.test.tsx`

- [ ] **Step 4: Commit**

```bash
git add apps/driver/src/features/orders/IncomingDispatchModal.tsx apps/driver/src/features/orders/IncomingDispatchModal.test.tsx
git commit -m "feat(driver): integrate SlideToAction slider into 15s incoming dispatch modal"
```

---

### Task 4: Nâng Cấp `DriverOrderDetailScreen.tsx` Với Quy Trình 4 Bước Slide-to-Action & e-POD

**Files:**
- Modify: `apps/driver/src/features/orders/DriverOrderDetailScreen.tsx`
- Modify: `apps/driver/src/features/orders/DriverOrderDetailRoute.test.tsx`

**Interfaces:**
- Consumes: `SlideToAction`, `EpodCapture`
- Produces: Vòng đời 4 bước chuyển trạng thái bằng thanh vuốt an toàn:
  1. `ACCEPTED` ➔ Vuốt "Đến điểm lấy hàng".
  2. `PICKING_UP` ➔ Vuốt "Bắt đầu vận chuyển".
  3. `IN_TRANSIT` ➔ Vuốt "Đã đến điểm giao".
  4. `DELIVERED` ➔ Bắt buộc chụp ảnh watermark GPS + ký số thủ kho nhận hàng, sau đó vuốt "Hoàn tất giao hàng".

- [ ] **Step 1: Cập nhật test trong `DriverOrderDetailRoute.test.tsx`**

Test xác nhận: Cập nhật từng trạng thái chuyến đi qua `SlideToAction`, chặn hoàn tất nếu chưa chụp ảnh watermark GPS hoặc thiếu chữ ký số.

- [ ] **Step 2: Cập nhật `DriverOrderDetailScreen.tsx`**

Tích hợp `SlideToAction` vào chân trang điều phối cho từng bước chuyến đi.

- [ ] **Step 3: Chạy test xác nhận PASS**

Run: `pnpm --filter driver test -- src/features/orders/DriverOrderDetailRoute.test.tsx`

- [ ] **Step 4: Commit**

```bash
git add apps/driver/src/features/orders/DriverOrderDetailScreen.tsx apps/driver/src/features/orders/DriverOrderDetailRoute.test.tsx
git commit -m "feat(driver): integrate SlideToAction transitions and strict epod verification"
```

---

### Task 5: Kiểm Thử Tích Hợp Toàn Bộ Monorepo

**Files:**
- Toàn bộ monorepo (`packages/mobile-core`, `apps/driver`, `apps/mobile`, `apps/api`, `apps/admin`)

- [ ] **Step 1: Chạy linter**

Run: `pnpm lint`
Expected: 0 lỗi.

- [ ] **Step 2: Chạy typecheck**

Run: `pnpm typecheck`
Expected: 0 lỗi trên tất cả các package.

- [ ] **Step 3: Chạy toàn bộ test suites**

Run: `pnpm test`
Expected: 100% test suites PASS.

- [ ] **Step 4: Chạy build toàn bộ monorepo**

Run: `pnpm build`
Expected: Build thành công tất cả artifacts.

- [ ] **Step 5: Commit xác nhận nghiệm thu**

```bash
git commit -am "chore(release): verify and pass 100% driver lalamove map-centric overhaul"
```
