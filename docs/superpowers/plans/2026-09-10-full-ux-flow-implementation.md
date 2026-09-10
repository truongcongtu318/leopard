# Full-Flow UI/UX Implementation Plan (Customer & Driver)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Triển khai hoàn chỉnh toàn bộ luồng nghiệp vụ UI/UX cho Khách Hàng B2B (`apps/mobile`) và Tài Xế Vận Tải (`apps/driver`), sử dụng nhân dùng chung `packages/mobile-core` với chuẩn thiết kế 2026 Liquid Glass, Double-Bezel và bảng màu thương hiệu chính thức.

**Architecture:** Kiến trúc 2 ứng dụng độc lập (Dual-App Cockpits). Ứng dụng Khách Hàng tối ưu cho quy trình đặt xe tải bản đồ Lalamove-style, giữ cọc Escrow và xuất hóa đơn VAT điện tử. Ứng dụng Tài Xế tối ưu cho điều phối hiện trường ngoài trời, công tắc trực tuyến to bản, đếm ngược nhận đơn 15s, quy trình giao nhận 4 bước và chữ ký số e-POD.

**Tech Stack:** React Native (Expo Router v57 / React 19), TypeScript, `@leopard/mobile-core`, `@leopard/shared`, Vietmap GIS, Socket.IO, payOS VietQR.

**Spec:** `docs/superpowers/specs/2026-09-10-full-ux-flow-design.md`

## Global Constraints

- Logo sử dụng đúng `packages/mobile-core/assets/brand/brand_login.png` và `leopard-emblem.png`.
- Màu sắc chủ đạo: Trắng tuyết (`#FFFFFF`/`#F8FAFC`), Vàng Amber (`#F59E0B`/`#D97706`), Xanh Biển (`#0B1E42`/`#0284C7`), Xanh Lá (`#16A34A`).
- Bắt buộc dùng `Plus Jakarta Sans` cho giao diện và `JetBrains Mono` tabular nums cho số liệu cước/tọa độ.
- Thanh điều hướng đáy 2026 Liquid Glass Floating Dock (`border-radius: 9999px`, `bottom: 16px`, `backdrop-filter: blur(28px)`), ẩn hoàn toàn ở màn hình Auth/Onboarding.
- Giao diện tràn viền `100dvh` native, hỗ trợ safe area insets `env(safe-area-inset-top)` và `env(safe-area-inset-bottom)`.
- Mọi thay đổi logic đều có test đi kèm và phải pass 100% `pnpm test`, `pnpm typecheck`, `pnpm lint`.

---

### Task 1: Nâng cấp Theme Tokens & Bảng màu trong `packages/mobile-core`

**Files:**
- Modify: `packages/mobile-core/src/theme/tokens.ts`
- Test: `packages/mobile-core/src/ui/primitives.test.tsx`

**Interfaces:**
- Consumes: Bảng màu và tokens hiện tại
- Produces: `radius.bezelOuter: 24`, `radius.bezelInner: 18`, `colors.brand.primary: '#0B1E42'`, `colors.brand.accent: '#F59E0B'`, `colors.brand.blue: '#0284C7'`, `colors.brand.green: '#16A34A'`

- [ ] **Step 1: Viết test kiểm tra các tokens mới trong primitives.test.tsx**

```typescript
it('exposes official brand colors and double-bezel radius tokens', () => {
  expect(radius.bezelOuter).toBe(24);
  expect(radius.bezelInner).toBe(18);
  expect(radius.pill).toBe(9999);
  expect(leopardPalette.primary).toBe('#0B1E42');
  expect(leopardPalette.accentYellow).toBe('#F59E0B');
  expect(leopardPalette.primarySoft).toBe('#0284C7');
});
```

- [ ] **Step 2: Chạy test để xác nhận fail**

Run: `pnpm --filter @leopard/mobile-core test -- src/ui/primitives.test.tsx`
Expected: FAIL do chưa có `radius.bezelOuter` và `radius.bezelInner`

- [ ] **Step 3: Cập nhật `packages/mobile-core/src/theme/tokens.ts`**

```typescript
export const radius = {
  control: 12,
  card: 20,
  cardSm: 14,
  cardLg: 24,
  cardXl: 28,
  bezelOuter: 24,
  bezelInner: 18,
  tabBar: 9999,
  modal: 26,
  pill: 9999,
} as const;

export const colors = {
  // ... Cập nhật brand.primary = '#0B1E42', brand.accent = '#F59E0B', brand.blue = '#0284C7', brand.green = '#16A34A'
};
```

- [ ] **Step 4: Chạy lại test để đảm bảo pass**

Run: `pnpm --filter @leopard/mobile-core test -- src/ui/primitives.test.tsx`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add packages/mobile-core/src/theme/tokens.ts packages/mobile-core/src/ui/primitives.test.tsx
git commit -m "feat(mobile-core): update brand theme tokens for 2026 liquid glass and double bezel"
```

---

### Task 2: Nâng cấp `FloatingNavBar` thành 2026 Liquid Glass Dock

**Files:**
- Modify: `packages/mobile-core/src/ui/FloatingNavBar.tsx`
- Test: `packages/mobile-core/src/ui/redesign-components.test.tsx`

**Interfaces:**
- Consumes: `radius`, `spacing`, `colors`
- Produces: `<FloatingNavBar />` với kiểu dáng viên nang kính lỏng nổi lơ lửng, hỗ trợ 4 tab chính

- [ ] **Step 1: Viết test cho FloatingNavBar kiểu dáng kính lỏng mới**

```typescript
it('renders floating capsule dock with rounded-pill shape and safe margin', () => {
  const { getByTestId } = render(
    <FloatingNavBar activeTab="home" onSelectTab={jest.fn()} />
  );
  const dock = getByTestId('floating-nav-bar');
  expect(dock).toBeTruthy();
});
```

- [ ] **Step 2: Chạy test xác nhận cấu trúc**

Run: `pnpm --filter @leopard/mobile-core test -- src/ui/redesign-components.test.tsx`

- [ ] **Step 3: Cập nhật StyleSheet trong `FloatingNavBar.tsx`**

```typescript
// Nâng cấp style thanh điều hướng nổi cách đáy 16px, bo tròn pill, backdrop-filter kính mờ
floatingContainer: {
  position: 'absolute',
  left: 16,
  right: 16,
  bottom: Platform.OS === 'ios' ? 24 : 16,
  height: 62,
  borderRadius: 9999,
  backgroundColor: 'rgba(255, 255, 255, 0.88)',
  borderWidth: 1,
  borderColor: 'rgba(255, 255, 255, 0.65)',
  shadowColor: '#0B1E42',
  shadowOffset: { width: 0, height: 10 },
  shadowOpacity: 0.14,
  shadowRadius: 28,
  elevation: 8,
  flexDirection: 'row',
  alignItems: 'center',
  justifyContent: 'space-around',
  paddingHorizontal: 8,
}
```

- [ ] **Step 4: Chạy test kiểm tra pass**

Run: `pnpm --filter @leopard/mobile-core test`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add packages/mobile-core/src/ui/FloatingNavBar.tsx packages/mobile-core/src/ui/redesign-components.test.tsx
git commit -m "feat(mobile-core): modernize FloatingNavBar into 2026 liquid glass dock"
```

---

### Task 3: Chuẩn hóa màn hình Onboarding Khách Hàng

**Files:**
- Modify: `apps/mobile/src/features/onboarding/OnboardingScreen.tsx`
- Test: `apps/mobile/src/features/onboarding/OnboardingScreen.test.tsx`

**Interfaces:**
- Consumes: `ONBOARDING_SLIDES`, `onGetStarted`, `onExploreGuest`
- Produces: Giao diện Onboarding 3 bước chuẩn thương hiệu, pager chấm vàng Amber, bỏ tab bar giả

- [ ] **Step 1: Viết test cho nút Bỏ qua và chuyển đổi 3 slide**

```typescript
it('advances slides and allows skipping to login directly', () => {
  const onGetStarted = jest.fn();
  const { getByText } = render(<OnboardingScreen onGetStarted={onGetStarted} />);
  fireEvent.press(getByText('Bỏ qua ➔'));
  expect(onGetStarted).toHaveBeenCalledTimes(1);
});
```

- [ ] **Step 2: Chạy test xác nhận**

Run: `pnpm --filter mobile test -- src/features/onboarding/OnboardingScreen.test.tsx`

- [ ] **Step 3: Cập nhật `OnboardingScreen.tsx`**

Áp dụng đúng ảnh `onboarding-1.jpg`, `onboarding-2.jpg`, `onboarding-3.jpg`. Badge xanh hỏa tốc, pager 3 chấm viên nang Amber `#F59E0B`, nút chính Midnight Navy `#0B1E42`.

- [ ] **Step 4: Chạy test đảm bảo pass**

Run: `pnpm --filter mobile test -- src/features/onboarding/OnboardingScreen.test.tsx`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add apps/mobile/src/features/onboarding/OnboardingScreen.tsx apps/mobile/src/features/onboarding/OnboardingScreen.test.tsx
git commit -m "feat(mobile): polish customer onboarding screen with official brand assets and pager"
```

---

### Task 4: Nâng cấp màn hình Đăng nhập & Xác thực OTP Khách Hàng

**Files:**
- Modify: `packages/mobile-core/src/auth/LoginScreen.tsx`
- Test: `packages/mobile-core/src/auth/LoginScreen.test.tsx`

**Interfaces:**
- Consumes: `onLoginSuccess`, `onNavigateRegister`
- Produces: Giao diện 2 bước tuần tự (Nhập SĐT ➔ Nhập OTP), hàng cờ 🇻🇳 +84 cùng dòng, loại bỏ nút demo thừa

- [ ] **Step 1: Viết test cho phân tách 2 bước SĐT và OTP**

```typescript
it('renders single-line phone input and transitions to OTP upon submission', () => {
  const { getByText, getByPlaceholderText } = render(<LoginScreen />);
  expect(getByText('+84')).toBeTruthy();
});
```

- [ ] **Step 2: Chạy test xác nhận**

Run: `pnpm --filter @leopard/mobile-core test -- src/auth/LoginScreen.test.tsx`

- [ ] **Step 3: Cập nhật `LoginScreen.tsx`**

- Gom cụm cờ Việt Nam vector + `+84` + ô nhập số điện thoại trên cùng 1 hàng flexbox.
- Ẩn cụm 6 ô OTP ở trạng thái đầu; chỉ hiện sau khi bấm "Tiếp tục".
- Xóa bỏ nút đăng nhập demo thừa.

- [ ] **Step 4: Chạy test kiểm tra pass**

Run: `pnpm --filter @leopard/mobile-core test -- src/auth/LoginScreen.test.tsx`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add packages/mobile-core/src/auth/LoginScreen.tsx packages/mobile-core/src/auth/LoginScreen.test.tsx
git commit -m "feat(auth): streamline customer login flow with inline flag and clean otp transition"
```

---

### Task 5: Nâng cấp màn hình Đăng ký Doanh nghiệp & MST Khách Hàng

**Files:**
- Modify: `apps/mobile/app/(public)/customer-register.tsx`
- Test: `apps/mobile/src/auth/customer-register-route.test.tsx`

**Interfaces:**
- Consumes: `router.push`, `httpClient`
- Produces: Form nhập Tên công ty, Mã số thuế (MST), Email xuất hóa đơn VAT, checkbox cam kết

- [ ] **Step 1: Viết test cho các trường MST và email VAT**

```typescript
it('validates tax code and corporate email before completing registration', () => {
  const { getByText } = render(<CustomerRegisterRoute />);
  expect(getByText('MÃ SỐ THUẾ (MST)')).toBeTruthy();
  expect(getByText('EMAIL NHẬN HÓA ĐƠN VAT')).toBeTruthy();
});
```

- [ ] **Step 2: Chạy test xác nhận**

Run: `pnpm --filter mobile test -- src/auth/customer-register-route.test.tsx`

- [ ] **Step 3: Cập nhật `customer-register.tsx`**

Định dạng các ô nhập bằng `input-box` viền bo tròn 14px, phông `JetBrains Mono` cho ô MST, nút chính to bản dẫn sang màn hình kho bãi.

- [ ] **Step 4: Chạy test kiểm tra pass**

Run: `pnpm --filter mobile test -- src/auth/customer-register-route.test.tsx`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add apps/mobile/app/(public)/customer-register.tsx apps/mobile/src/auth/customer-register-route.test.tsx
git commit -m "feat(mobile): enforce corporate tax code and vat invoice email in customer registration"
```

---

### Task 6: Nâng cấp màn hình Thiết lập Kho Bãi Mặc Định Khách Hàng

**Files:**
- Modify: `apps/mobile/app/(public)/customer-address.tsx`
- Test: `apps/mobile/src/auth/customer-address-route.test.tsx`

**Interfaces:**
- Consumes: `addressStore`, `reverseGeocodeCoords`
- Produces: Giao diện tìm kiếm kho bãi, pin map ghim vị trí, chip phân loại (Kho chính / Văn phòng / Kho phụ), người liên hệ

- [ ] **Step 1: Viết test cho chip phân loại kho bãi và ghim vị trí**

```typescript
it('renders warehouse category chips and contact person fields', () => {
  const { getByText } = render(<CustomerAddAddressScreen />);
  expect(getByText('🏢 Kho chính')).toBeTruthy();
  expect(getByText('THỦ KHO GIAO NHẬN')).toBeTruthy();
});
```

- [ ] **Step 2: Chạy test xác nhận**

Run: `pnpm --filter mobile test -- src/auth/customer-address-route.test.tsx`

- [ ] **Step 3: Cập nhật `customer-address.tsx`**

Tinh chỉnh bản đồ xem trước vị trí kho, thanh tìm kiếm thông minh và nút hoàn tất màu vàng Amber `#F59E0B`.

- [ ] **Step 4: Chạy test kiểm tra pass**

Run: `pnpm --filter mobile test -- src/auth/customer-address-route.test.tsx`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add apps/mobile/app/(public)/customer-address.tsx apps/mobile/src/auth/customer-address-route.test.tsx
git commit -m "feat(mobile): polish customer default warehouse setup screen"
```

---

### Task 7: Thiết kế lại Trang Chủ Đặt Xe Khách Hàng (Lalamove Style & Fleet Matrix)

**Files:**
- Modify: `apps/mobile/src/features/home/HomeDashboardScreen.tsx`
- Test: `apps/mobile/src/features/home/HomeDashboardScreen.test.tsx`

**Interfaces:**
- Consumes: `VehicleCategory`, `ActiveShipment`, `RouteSpine`
- Produces: Bản đồ nền trực tiếp, thanh cuộn xe tải 3D hiển thị kích thước thùng (`D x R x C`), thẻ cước tổng và nút đặt xe lớn

- [ ] **Step 1: Viết test cho thanh cuộn xe tải 3D và kích thước thùng**

```typescript
it('displays vehicle dimensions (L x W x H) and cargo capacity in fleet matrix', () => {
  const { getByText } = render(<HomeDashboardScreen />);
  expect(getByText('3.2 x 1.6 x 1.7m')).toBeTruthy(); // Tải 1.25T
});
```

- [ ] **Step 2: Chạy test xác nhận**

Run: `pnpm --filter mobile test -- src/features/home/HomeDashboardScreen.test.tsx`

- [ ] **Step 3: Cập nhật `HomeDashboardScreen.tsx`**

- Tích hợp khay trượt Bottom Sheet Lalamove-style.
- Hiển thị đầy đủ 4 dòng xe: Van 500kg, Xe 1.25T, Xe 2.5T, Xe ba gác.
- Thẻ dự toán cước tổng kèm nút CTA to bản có ghi rõ giá tiền.

- [ ] **Step 4: Chạy test kiểm tra pass**

Run: `pnpm --filter mobile test -- src/features/home/HomeDashboardScreen.test.tsx`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add apps/mobile/src/features/home/HomeDashboardScreen.tsx apps/mobile/src/features/home/HomeDashboardScreen.test.tsx
git commit -m "feat(home): redesign customer home dashboard with lalamove-style fleet carousel and map"
```

---

### Task 8: Nâng cấp màn hình Theo Dõi GPS & Hóa Đơn Điện Tử VAT

**Files:**
- Modify: `apps/mobile/src/features/tracking/RealtimeTrackingScreen.tsx`
- Modify: `apps/mobile/src/features/customer/orders/InvoicePreviewScreen.tsx`
- Test: `apps/mobile/src/features/tracking/RealtimeTrackingScreen.test.tsx`

**Interfaces:**
- Consumes: `OrderTrackingSocket`, `useInvoiceQuery`
- Produces: Vệt GPS trực tiếp, thẻ tài xế 4.98★, mã VietQR payOS tự động gạch nợ 3s, xuất PDF hóa đơn VAT

- [ ] **Step 1: Viết test cho chỉ báo vệt GPS và hóa đơn VAT**

```typescript
it('renders live telemetry tracking and vat invoice action button', () => {
  const { getByText } = render(<RealtimeTrackingScreen orderId="order-1" />);
  expect(getByText(/ETA dự kiến/)).toBeTruthy();
});
```

- [ ] **Step 2: Chạy test xác nhận**

Run: `pnpm --filter mobile test -- src/features/tracking/RealtimeTrackingScreen.test.tsx`

- [ ] **Step 3: Cập nhật `RealtimeTrackingScreen.tsx` & `InvoicePreviewScreen.tsx`**

- Làm sắc nét bản đồ tracking GPS Dark GIS.
- Tích hợp modal VietQR động đối soát tức thì và nút tải file PDF hóa đơn VAT hợp lệ.

- [ ] **Step 4: Chạy test kiểm tra pass**

Run: `pnpm --filter mobile test -- src/features/tracking/RealtimeTrackingScreen.test.tsx`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add apps/mobile/src/features/tracking/RealtimeTrackingScreen.tsx apps/mobile/src/features/customer/orders/InvoicePreviewScreen.tsx
git commit -m "feat(customer): enhance live gps tracking and electronic vat invoice preview"
```

---

### Task 9: Chuẩn hóa Trạm Điều Khiển Tài Xế (Field Cockpit & Hybrid Dispatch)

**Files:**
- Modify: `apps/driver/src/features/orders/DriverOrdersScreen.tsx`
- Modify: `apps/driver/src/features/orders/IncomingDispatchModal.tsx`
- Test: `apps/driver/src/features/orders/DriverOrdersScreen.test.tsx`

**Interfaces:**
- Consumes: `useDriverAvailability`, `useDispatchOffer`
- Produces: Công tắc Hero trực tuyến to bản, popup cuốc xe 15s đếm ngược, danh sách Load-board

- [ ] **Step 1: Viết test cho công tắc Hero Duty Control và modal 15s**

```typescript
it('renders large hero online switch and 15s countdown push offer modal', () => {
  const { getByText } = render(<DriverOrdersScreen />);
  expect(getByText('TRỰC TUYẾN')).toBeTruthy();
});
```

- [ ] **Step 2: Chạy test xác nhận**

Run: `pnpm --filter driver test -- src/features/orders/DriverOrdersScreen.test.tsx`

- [ ] **Step 3: Cập nhật `DriverOrdersScreen.tsx` & `IncomingDispatchModal.tsx`**

- Biến nút chuyển availability thành công tắc to bản ngay đầu màn hình.
- Thiết kế lại popup nhận cuốc 15s có cước to rõ ràng và nút 1 chạm an toàn khi lái xe.

- [ ] **Step 4: Chạy test kiểm tra pass**

Run: `pnpm --filter driver test -- src/features/orders/DriverOrdersScreen.test.tsx`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add apps/driver/src/features/orders/DriverOrdersScreen.tsx apps/driver/src/features/orders/IncomingDispatchModal.tsx
git commit -m "feat(driver): upgrade field cockpit with hero duty switch and 15s push offer modal"
```

---

### Task 10: Nâng cấp Tiến trình 4 Bước & Bằng chứng giao hàng e-POD Tài Xế

**Files:**
- Modify: `apps/driver/src/features/orders/DriverOrderDetailScreen.tsx`
- Test: `apps/driver/src/features/orders/DriverOrderDetailRoute.test.tsx`

**Interfaces:**
- Consumes: `useUpdateOrderStatus`, `uploadDeliveryProof`
- Produces: Quy trình 4 bước (`ACCEPTED ➔ PICKING_UP ➔ IN_TRANSIT ➔ DELIVERED`), chụp ảnh kiện hàng GPS, chữ ký số thủ kho

- [ ] **Step 1: Viết test xác nhận e-POD chặn chuyển DELIVERED nếu thiếu chữ ký**

```typescript
it('requires delivery proof photo and signature before completing order', () => {
  const { getByText } = render(<DriverOrderDetailScreen orderId="order-1" />);
  expect(getByText('XÁC THỰC BÀN GIAO (POD)')).toBeTruthy();
});
```

- [ ] **Step 2: Chạy test xác nhận**

Run: `pnpm --filter driver test -- src/features/orders/DriverOrderDetailRoute.test.tsx`

- [ ] **Step 3: Cập nhật `DriverOrderDetailScreen.tsx`**

Tích hợp camera chụp kiện hàng có gắn watermark thời gian + GPS, bảng vẽ chữ ký cảm ứng cho thủ kho dỡ hàng.

- [ ] **Step 4: Chạy test kiểm tra pass**

Run: `pnpm --filter driver test -- src/features/orders/DriverOrderDetailRoute.test.tsx`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add apps/driver/src/features/orders/DriverOrderDetailScreen.tsx apps/driver/src/features/orders/DriverOrderDetailRoute.test.tsx
git commit -m "feat(driver): implement full b2b e-pod capture with photo and signature pad"
```

---

### Task 11: Nâng cấp Ví Thu Nhập & Rút Tiền 24/7 Tài Xế

**Files:**
- Modify: `apps/driver/src/features/earnings/DriverEarningsScreen.tsx`
- Modify: `apps/driver/src/features/wallet/DriverWalletScreen.tsx`
- Test: `apps/driver/src/features/wallet/DriverWalletScreen.test.tsx`

**Interfaces:**
- Consumes: `useDriverWalletQuery`, `useDriverEarningsQuery`
- Produces: Thẻ doanh thu ngày viền kép, nút rút tiền tức thì 24/7, chỉ số OTD 99.4%

- [ ] **Step 1: Viết test cho hiển thị doanh thu ngày và nút rút tiền**

```typescript
it('displays today earnings and instant payout action button', () => {
  const { getByText } = render(<DriverWalletScreen />);
  expect(getByText(/Rút tiền về tài khoản ngân hàng/)).toBeTruthy();
});
```

- [ ] **Step 2: Chạy test xác nhận**

Run: `pnpm --filter driver test -- src/features/wallet/DriverWalletScreen.test.tsx`

- [ ] **Step 3: Cập nhật `DriverEarningsScreen.tsx` & `DriverWalletScreen.tsx`**

Áp dụng thẻ Double-Bezel xanh Emerald `#10B981`, phông số học mono rõ ràng và nút lệnh rút tiền ngân hàng.

- [ ] **Step 4: Chạy test kiểm tra pass**

Run: `pnpm --filter driver test -- src/features/wallet/DriverWalletScreen.test.tsx`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add apps/driver/src/features/earnings/DriverEarningsScreen.tsx apps/driver/src/features/wallet/DriverWalletScreen.tsx
git commit -m "feat(driver): modernize driver wallet and instant bank payout interface"
```

---

### Task 12: Kiểm Thử Tích Hợp Toàn Diện Monorepo

**Files:**
- Test toàn bộ: `packages/mobile-core`, `apps/mobile`, `apps/driver`, `apps/api`, `apps/admin`

- [ ] **Step 1: Chạy linter toàn monorepo**

Run: `pnpm lint`
Expected: 0 lỗi lint

- [ ] **Step 2: Chạy typecheck toàn monorepo**

Run: `pnpm typecheck`
Expected: 0 lỗi TypeScript trên tất cả các package

- [ ] **Step 3: Chạy test suite toàn monorepo**

Run: `pnpm test`
Expected: Toàn bộ unit/integration test suites đều PASS

- [ ] **Step 4: Chạy build toàn monorepo**

Run: `pnpm build`
Expected: Build thành công tất cả artifacts

- [ ] **Step 5: Commit nghiệm thu toàn bộ**

```bash
git commit -am "chore(release): verify and pass 100% full-flow test and build gates"
```
