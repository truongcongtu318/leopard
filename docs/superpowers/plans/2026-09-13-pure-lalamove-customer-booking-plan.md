# Pure Lalamove/Grab In-Place Customer Booking Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Transform the Customer booking experience into a 100% in-place, map-first booking flow (Lalamove / Grab Freight style) directly on the Home Screen, eliminating the redundant 4-step wizard.

**Architecture:** The Home screen becomes the single operational canvas for booking. In Phase 1, the user selects or types a dropoff destination. In Phase 2, the bottom sheet smoothly reveals the Fleet Matrix with dynamically calculated fares for that route. In Phase 3, tapping "TIẾP TỤC ĐẶT XE" opens an in-place details sheet for receiver contact, cargo category, add-on services (bốc xếp, VAT), and payment method (VietQR / Tiền mặt), directly triggering order creation and radar searching without multi-page wizard jumps.

**Tech Stack:** React Native, Expo Router, TypeScript, `@leopard/mobile-core`, Vitest / Jest, React Testing Library.

**Spec:** `docs/ui/07-customer-mobile-system-design.md`, `docs/ui/12-design-strategy-rules.md`, `docs/ui/03-screen-specs.md`.

## Global Constraints

- Touch target minimum `44 × 44px` on all interactable elements.
- Number formatting must use `tabular-nums` (`JetBrains Mono`).
- All cards and inputs must use Apple continuous squircle curves (`iosContinuousCurve`).
- Smooth Apple Fluid Spring physics (`appleSpring.sheet`, `appleSpring.snappy`) for transitions.
- Tactile feedback (`haptic.selection()`, `haptic.light()`, `haptic.success()`) on primary actions.
- Progressive disclosure: Do not show vehicle fares or fake prices before a destination is chosen.
- Zero multi-page wizard jumps for standard booking; everything completes from the Home Screen.

---

### Task 1: Progressive Disclosure on Home Dashboard Screen

**Files:**
- Modify: `apps/mobile/src/features/home/HomeDashboardScreen.tsx`
- Test: `apps/mobile/src/features/home/HomeDashboardScreen.test.tsx`

**Interfaces:**
- Consumes: `FLEET_VEHICLES`, `GestureBottomSheet`, `RealInteractiveMap`, `RouteSpine`, `addressStore`.
- Produces: `hasSelectedDropoff` state in `HomeDashboardScreen`, quick destination suggestions chips, conditional Fleet Matrix display, and removed fast-forward button clutter.

- [ ] **Step 1: Write the failing test**

```tsx
it('reveals fleet matrix and accurate pricing only after destination is provided (Progressive Disclosure)', async () => {
  const screen = await render(<HomeDashboardScreen />);

  // Before destination: prompt to choose destination and quick warehouse chips are visible
  expect(screen.getByText('Chọn điểm giao để xem giá và gọi xe')).toBeTruthy();
  expect(screen.getByText('Kho Tân Tạo')).toBeTruthy();

  // Fleet matrix cards are tucked away or in standby
  await fireEvent.changeText(
    screen.getByPlaceholderText('Bạn muốn giao hàng đến đâu?...'),
    'KCN Tân Tạo, Lô B5, Bình Tân',
  );

  // After destination: fleet matrix and continue CTA become active
  expect(screen.getByText('CHỌN LOẠI XE PHÙ HỢP')).toBeTruthy();
  expect(screen.getByText(/TIẾP TỤC ĐẶT XE/)).toBeTruthy();
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter mobile test -- src/features/home/HomeDashboardScreen.test.tsx`
Expected: FAIL with "Unable to find an element with text: Chọn điểm giao để xem giá và gọi xe"

- [ ] **Step 3: Implement progressive disclosure in HomeDashboardScreen**

- Remove redundant `fastForwardBtn` (`>`) icon from the dropoff input row.
- Introduce `hasSelectedDropoff = dropoffText.trim().length >= 3`.
- When `!hasSelectedDropoff`:
  - Show quick warehouse destination chips (`Kho Tân Tạo`, `Cảng Cát Lái`, `KCN Sóng Thần`) with 1-tap selection to auto-fill dropoff.
  - Show calm guiding prompt: "Chọn điểm giao để xem giá và gọi xe".
  - Keep bottom sheet compact so 70% of screen displays the interactive map.
- When `hasSelectedDropoff`:
  - Display Fleet Matrix cards with updated capacity and pricing.
  - CTA button displays: `TIẾP TỤC ĐẶT XE · [Giá xe] ₫ ➔`.

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm --filter mobile test -- src/features/home/HomeDashboardScreen.test.tsx`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add apps/mobile/src/features/home/HomeDashboardScreen.tsx apps/mobile/src/features/home/HomeDashboardScreen.test.tsx
git commit -m "feat(mobile): implement progressive disclosure for route and fleet selection on home screen"
```

---

### Task 2: Build In-Place Booking Details Modal Component

**Files:**
- Create: `apps/mobile/src/features/home/components/BookingDetailsModal.tsx`
- Test: `apps/mobile/src/features/home/components/BookingDetailsModal.test.tsx`

**Interfaces:**
- Consumes: `@leopard/mobile-core` (`Button`, `FormField`, `haptic`, `iosContinuousCurve`, `radius`, `spacing`).
- Produces: `BookingDetailsModal` component with receiver contact info, cargo category, add-on services, payment method toggle, and confirm booking CTA.

- [ ] **Step 1: Write the failing test**

```tsx
import { fireEvent, render } from '@testing-library/react-native';
import { BookingDetailsModal } from './BookingDetailsModal';

describe('BookingDetailsModal', () => {
  it('allows filling receiver info, toggling bốc xếp/VAT, and selecting payment method', async () => {
    const onConfirm = jest.fn();
    const onClose = jest.fn();

    const screen = render(
      <BookingDetailsModal
        visible={true}
        basePrice={280000}
        vehicleName="Xe Tải 1.25T"
        pickupAddress="Kho Tân Bình"
        dropoffAddress="KCN Tân Tạo"
        onClose={onClose}
        onConfirm={onConfirm}
      />
    );

    expect(screen.getByText('Chi tiết chuyến hàng')).toBeTruthy();
    expect(screen.getByText('Xe Tải 1.25T')).toBeTruthy();

    // Toggle loading support (+120k)
    const loadingToggle = screen.getByLabelText('Hỗ trợ bốc xếp 2 đầu');
    fireEvent.press(loadingToggle);

    // Select Cash payment
    const cashOption = screen.getByLabelText('Tiền mặt khi nhận hàng');
    fireEvent.press(cashOption);

    // Confirm booking
    const submitBtn = screen.getByText(/XÁC NHẬN GỌI XE/);
    fireEvent.press(submitBtn);

    expect(onConfirm).toHaveBeenCalledWith(expect.objectContaining({
      hasLoadingSupport: true,
      paymentMethod: 'CASH',
    }));
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter mobile test -- src/features/home/components/BookingDetailsModal.test.tsx`
Expected: FAIL with "Cannot find module './BookingDetailsModal'"

- [ ] **Step 3: Implement BookingDetailsModal component**

- Build clean bottom sheet / modal with continuous squircle corners and safe area insets.
- Fields:
  - **Thông tin người nhận:** Tên người nhận + Số điện thoại (prefilled from customer profile or editable).
  - **Hàng hóa:** Loại hàng (Kiện hàng, VLXD, May mặc, Khác) + Ghi chú cho tài xế.
  - **Dịch vụ cộng thêm:**
    - [ ] Tài xế hỗ trợ bốc xếp (+120.000 ₫)
    - [ ] Xuất hóa đơn VAT điện tử 8% (+cước VAT)
  - **Hình thức thanh toán:**
    - (x) Chuyển khoản VietQR payOS (Ký quỹ Escrow an toàn)
    - ( ) Tiền mặt (Người gửi hoặc Người nhận thanh toán)
  - **Sticky Primary Button:**
    - `XÁC NHẬN GỌI XE · [Tổng tiền tính kèm phụ phí] ₫ ➔` with haptic feedback.

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm --filter mobile test -- src/features/home/components/BookingDetailsModal.test.tsx`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add apps/mobile/src/features/home/components/BookingDetailsModal.tsx apps/mobile/src/features/home/components/BookingDetailsModal.test.tsx
git commit -m "feat(mobile): add in-place booking details modal with receiver, cargo, and payment options"
```

---

### Task 3: Integrate In-Place Booking Flow with Order Creation & Radar Search

**Files:**
- Modify: `apps/mobile/src/features/home/HomeDashboardScreen.tsx`
- Modify: `apps/mobile/app/customer/home/index.tsx`
- Modify: `apps/mobile/app/customer/_layout.tsx`
- Test: `apps/mobile/src/features/home/HomeDashboardScreen.test.tsx`

**Interfaces:**
- Consumes: `BookingDetailsModal`, API order creation / port adapter, `router.replace('/customer/orders/searching/[id]')`.
- Produces: Direct booking flow that transitions smoothly from Home -> Booking Details Modal -> (VietQR if payOS / Searching Radar if Cash) -> Live Tracking.

- [ ] **Step 1: Write the failing test**

```tsx
it('opens BookingDetailsModal when tapping continue booking and confirms order creation', async () => {
  const onConfirmBooking = jest.fn();
  const screen = await render(
    <HomeDashboardScreen onConfirmBooking={onConfirmBooking} />
  );

  // Set dropoff
  await fireEvent.changeText(
    screen.getByPlaceholderText('Bạn muốn giao hàng đến đâu?...'),
    'KCN Tân Tạo, Bình Tân',
  );

  // Tap "TIẾP TỤC ĐẶT XE"
  await fireEvent.press(screen.getByText(/TIẾP TỤC ĐẶT XE/));

  // Modal opens in-place
  expect(screen.getByText('Chi tiết chuyến hàng')).toBeTruthy();
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter mobile test -- src/features/home/HomeDashboardScreen.test.tsx`
Expected: FAIL with "Unable to find element: Chi tiết chuyến hàng"

- [ ] **Step 3: Wire BookingDetailsModal into HomeDashboardScreen and home/index.tsx**

- In `HomeDashboardScreen.tsx`:
  - When user taps `TIẾP TỤC ĐẶT XE · [Price] ₫`:
    - If `!hasSelectedDropoff`: Focus dropoff field.
    - If `hasSelectedDropoff`: Set `showBookingDetailsModal = true`.
  - Pass receiver name, phone, cargo notes, loading support, and payment method into `onConfirmBooking`.
- In `app/customer/home/index.tsx`:
  - On confirm booking:
    - If payment is `CASH`: Generate/create order and navigate directly to `/customer/orders/searching/${orderId}` (Radar quét tài xế).
    - If payment is `VIETQR`: Navigate directly to `/customer/orders/checkout/${orderId}` with total amount.
  - Hide FloatingNavBar during checkout or searching (`isSubScreenWithoutNav`).

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm --filter mobile test -- src/features/home/HomeDashboardScreen.test.tsx`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add apps/mobile/src/features/home/HomeDashboardScreen.tsx apps/mobile/app/customer/home/index.tsx apps/mobile/app/customer/_layout.tsx
git commit -m "feat(mobile): connect in-place booking modal directly to cash radar searching and vietqr checkout"
```

---

### Task 4: Full Test Suite Verification

**Files:**
- Verify: `apps/mobile/`
- Verify: `apps/driver/`
- Verify: `packages/mobile-core/`

- [ ] **Step 1: Run mobile-core tests**

Run: `pnpm --filter @leopard/mobile-core test`
Expected: 15/15 passed

- [ ] **Step 2: Run mobile app tests**

Run: `pnpm --filter mobile test`
Expected: 46/46 passed

- [ ] **Step 3: Run driver app tests**

Run: `pnpm --filter driver test`
Expected: 30/30 passed

- [ ] **Step 4: Run typecheck across all mobile packages**

Run: `pnpm --filter mobile typecheck && pnpm --filter driver typecheck && pnpm --filter @leopard/mobile-core typecheck`
Expected: 0 errors

- [ ] **Step 5: Commit any documentation or test updates**

```bash
git add -A
git commit -m "chore: verify 100% green test pass for pure in-place customer booking flow"
```
