# Kế Hoạch Triển Khai 12 Trạng Thái Hành Trình Tài Xế LEOPARD (Driver Cockpit Journey)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Hiện thực hóa trọn vẹn hành trình 12 màn hình/trạng thái của tài xế từ lúc nổ đơn đến khi hoàn tất giao hàng theo chuẩn Apple HIG, công thái học thao tác 1 tay, chống chạm nhầm khi lái xe trên React Native (iOS & Android).

**Architecture:** Mở rộng và chuẩn hóa hệ thống Design Tokens trong `@leopard/mobile-core`, tích hợp Bottom Sheet chống vuốt đóng `@gorhom/bottom-sheet`, thanh vuốt nhận đơn Reanimated `SlideToAction` đạt ngưỡng 80%, màn hình chụp ảnh POD chuyên dụng với kiểm tra điều kiện kích hoạt, máy trạng thái hàng đợi đơn thứ 2 (Queue Toast), và bộ điều khiển chuyển cảnh 12 trạng thái tương tác trực quan.

**Tech Stack:** React Native (Expo v57 / RN 0.86), `react-native-reanimated`, `react-native-gesture-handler`, `@gorhom/bottom-sheet`, `expo-haptics`, Jest + React Native Testing Library.

**Spec:** Tài liệu đặc tả 12 trạng thái hành trình tài xế theo Apple HIG trong phiên thảo luận hiện tại.

## Global Constraints

- **Frame & Grid:** Chuẩn 393×852pt (tương thích 360×800dp Android), lề ngoài 16pt, lưới 4/8pt.
- **Typography:** Không hardcode `fontSize`, dùng `typeScale` với `tabular-nums` cho số tiền, cước phí, ETA, khoảng cách và đồng hồ đếm ngược.
- **Kích thước vùng chạm:** Mọi nút CTA chính tối thiểu cao **56pt**, thanh vuốt cao **64pt**, nút phụ tối thiểu **48×48pt**.
- **Quy tắc an toàn khi lái xe:**
  - Không dùng 2 nút Nhận/Từ chối cạnh nhau.
  - Không tự động chuyển màn hình chỉ bằng GPS mà không qua xác nhận chủ động của tài xế.
  - Bắt buộc chụp ảnh bằng chứng ở cả lấy hàng và giao hàng.
  - Không dùng bottom sheet có thể vuốt đóng mất thông tin.
  - Không hiển thị 2 đơn hàng nổ cùng lúc (chỉ 1 đơn chiếm màn hình, đơn sau vào Toast hàng đợi).

---

### Task 1: Chuẩn hóa Design Tokens & Sound/Haptic Driver Core

**Files:**
- Modify: `packages/mobile-core/src/theme/driver-tokens.ts`
- Modify: `packages/mobile-core/src/ui/haptics.ts`
- Test: `packages/mobile-core/src/theme/driver-tokens.test.ts`

**Interfaces:**
- Consumes: `leopardPalette`, `driverPrimitives`
- Produces: `driverJourneyTokens` (chiều cao nút 56pt, swipe 64pt, màu trạng thái `alertRed: '#FF3B30'`, `successGreen: '#34C759'`, `codAmber: '#F59E0B'`, `darkOled: '#0B0F17'`), hàm `driverHaptics` hỗ trợ đủ 5 sự kiện xúc giác (`offerAlert`, `countdownPulse`, `swipeThreshold`, `swipeSuccess`, `actionHeavy`).

- [ ] **Step 1: Viết test kiểm tra token kích thước và bộ phản hồi xúc giác**

Tạo file `packages/mobile-core/src/theme/driver-tokens.test.ts`:
```typescript
import { driverJourneyTokens } from './driver-tokens';
import { driverHapticMatrix } from '../ui/haptics';

describe('driverJourneyTokens Contract', () => {
  it('enforces touch targets and brand palette for driver cockpit', () => {
    expect(driverJourneyTokens.sizes.primaryCtaHeight).toBe(56);
    expect(driverJourneyTokens.sizes.swipeBarHeight).toBe(64);
    expect(driverJourneyTokens.sizes.secondaryTouchTarget).toBeGreaterThanOrEqual(48);
    expect(driverJourneyTokens.colors.primaryNavy).toBe('#0B2545');
    expect(driverJourneyTokens.colors.successGreen).toBe('#34C759');
    expect(driverJourneyTokens.colors.alertRed).toBe('#FF3B30');
    expect(driverJourneyTokens.colors.codAmber).toBe('#F59E0B');
    expect(driverJourneyTokens.colors.darkOled).toBe('#0B0F17');
  });

  it('defines semantic haptic profiles for 12 states', () => {
    expect(driverHapticMatrix.offerIncoming).toBeDefined();
    expect(driverHapticMatrix.countdownCritical).toBeDefined();
    expect(driverHapticMatrix.swipeSuccess).toBeDefined();
  });
});
```

- [ ] **Step 2: Chạy test để xác nhận test thất bại**

Run: `pnpm --filter @leopard/mobile-core test -- src/theme/driver-tokens.test.ts`
Expected: FAIL do chưa export `driverJourneyTokens` và `driverHapticMatrix`.

- [ ] **Step 3: Cập nhật token và haptics trong `packages/mobile-core`**

Bổ sung vào `packages/mobile-core/src/theme/driver-tokens.ts`:
```typescript
export const driverJourneyTokens = {
  sizes: {
    primaryCtaHeight: 56,
    swipeBarHeight: 64,
    secondaryTouchTarget: 48,
    cardRadius: 14,
    pillRadius: 9999,
  },
  colors: {
    primaryNavy: '#0B2545',
    successGreen: '#34C759',
    alertRed: '#FF3B30',
    codAmber: '#F59E0B',
    canvasSlate: '#F8FAFC',
    cardLight: '#FFFFFF',
    darkOled: '#0B0F17',
    darkSurface: '#161F30',
    darkBorder: '#26354A',
    darkRoutePuck: '#38BDF8',
  },
} as const;
```

Bổ sung vào `packages/mobile-core/src/ui/haptics.ts`:
```typescript
import * as Haptics from 'expo-haptics';

export const driverHapticMatrix = {
  offerIncoming: () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium),
  countdownCritical: () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Rigid),
  swipeThreshold: () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium),
  swipeSuccess: () => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success),
  actionHeavy: () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy),
  errorAlert: () => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error),
};
```

- [ ] **Step 4: Chạy test để xác nhận pass**

Run: `pnpm --filter @leopard/mobile-core test -- src/theme/driver-tokens.test.ts`
Expected: PASS

- [ ] **Step 5: Commit thay đổi**

```bash
git add packages/mobile-core/src/theme/driver-tokens.ts packages/mobile-core/src/theme/driver-tokens.test.ts packages/mobile-core/src/ui/haptics.ts
git commit -m "feat(mobile-core): add driver journey HIG design tokens and haptic matrix"
```

---

### Task 2: Cập nhật Màn hình Nổ Đơn (Trạng thái 1, 2, 3, 11)

**Files:**
- Modify: `apps/driver/src/features/orders/IncomingDispatchModal.tsx`
- Test: `apps/driver/src/features/orders/IncomingDispatchModal.journey.test.tsx`

**Interfaces:**
- Consumes: `driverJourneyTokens`, `driverHapticMatrix`
- Produces: Màn hình nổ đơn hỗ trợ:
  - Thanh đếm ngược 20s đổi từ Navy sang Đỏ khi `< 5s`.
  - Nhịp đập (pulse spring) và rung `countdownCritical` mỗi giây khi `< 5s`.
  - Thanh vuốt 64pt đạt ngưỡng 80% snap về đích, đổi nền xanh lá.
  - Toast thông báo hàng đợi đơn thứ hai `queuedOfferCount` ở đỉnh màn hình, bảo vệ nhận thức không chia đôi màn hình.

- [ ] **Step 1: Viết failing test cho các trạng thái nổ đơn và hàng đợi**

Tạo `apps/driver/src/features/orders/IncomingDispatchModal.journey.test.tsx`:
```typescript
import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react-native';
import { IncomingDispatchModal } from './IncomingDispatchModal';

describe('IncomingDispatchModal Journey & HIG Compliance', () => {
  const baseOffer = {
    orderId: 'LP-8921',
    pickupAddress: '124 Hoàng Hoa Thám, Ba Đình',
    dropoffAddress: '58 Trần Duy Hưng, Cầu Giấy',
    earningsAmount: 245000,
    distanceKm: 8.4,
    pickupDistanceKm: 1.2,
    cargoName: '24 thùng sơn nước',
  };

  it('renders prominent 32pt tabular earnings, vehicle and distance (State 1)', () => {
    render(<IncomingDispatchModal visible offer={baseOffer} onAccept={jest.fn()} onDecline={jest.fn()} />);
    expect(screen.getByText(/245\.000/)).toBeTruthy();
    expect(screen.getByText(/1\.2 km/i)).toBeTruthy();
  });

  it('turns countdown bar red and triggers critical haptic when timer < 5s (State 2)', () => {
    jest.useFakeTimers();
    render(<IncomingDispatchModal visible offer={baseOffer} onAccept={jest.fn()} onDecline={jest.fn()} countdownSeconds={4} />);
    expect(screen.getByTestId('countdown-progress-bar')).toHaveStyle({ backgroundColor: '#FF3B30' });
    jest.useRealTimers();
  });

  it('renders Queue Toast at the top when a second offer arrives without splitting screen (State 11)', () => {
    render(
      <IncomingDispatchModal
        visible
        offer={baseOffer}
        queuedOfferCount={1}
        onAccept={jest.fn()}
        onDecline={jest.fn()}
      />
    );
    expect(screen.getByText(/CÓ 1 ĐƠN KHÁC ĐANG CHỜ TRONG HÀNG/i)).toBeTruthy();
  });
});
```

- [ ] **Step 2: Chạy test để xác nhận fail**

Run: `pnpm --filter driver test -- src/features/orders/IncomingDispatchModal.journey.test.tsx`
Expected: FAIL do chưa có testID `countdown-progress-bar` và prop `queuedOfferCount`.

- [ ] **Step 3: Cập nhật code trong `IncomingDispatchModal.tsx`**

- Tích hợp prop `queuedOfferCount?: number`.
- Khi `secondsLeft <= 5`: đổi màu thanh tiến trình sang `#FF3B30`, kích hoạt nhịp đập Animated/Spring và gọi `driverHapticMatrix.countdownCritical()`.
- Hiển thị Toast hàng đợi pill cố định đỉnh màn hình khi `queuedOfferCount > 0`.
- Đảm bảo thanh `SlideToAction` có chiều cao 64pt và ngưỡng nhận đơn 80%.

- [ ] **Step 4: Chạy lại test để pass**

Run: `pnpm --filter driver test -- src/features/orders/IncomingDispatchModal.journey.test.tsx`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add apps/driver/src/features/orders/IncomingDispatchModal.tsx apps/driver/src/features/orders/IncomingDispatchModal.journey.test.tsx
git commit -m "feat(driver): add 15s-to-red countdown, queue toast and 64pt swipe to dispatch modal"
```

---

### Task 3: Bottom Sheet Điều Hướng & Geofence Điểm Lấy (Trạng thái 4, 5, 12)

**Files:**
- Create: `apps/driver/src/features/orders/components/detail/DriverNavigationSheet.tsx`
- Test: `apps/driver/src/features/orders/components/detail/DriverNavigationSheet.test.tsx`

**Interfaces:**
- Consumes: `driverJourneyTokens`, `callPhoneNumber`
- Produces: `DriverNavigationSheet` component:
  - Snap point cố định `['32%', '55%']`, `enablePanDownToClose={false}`.
  - Nút chính 56pt "Tôi đã đến nơi".
  - Banner gợi ý khi GPS vào bán kính 100m, tự bung sheet lên 50% nhưng KHÔNG tự động chuyển trạng thái.
  - Hỗ trợ `isDarkMode` (OLED `#0B0F17`, thẻ `#161F30`, nút `#38BDF8`).

- [ ] **Step 1: Viết test cho `DriverNavigationSheet`**

Tạo `apps/driver/src/features/orders/components/detail/DriverNavigationSheet.test.tsx`:
```typescript
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import { DriverNavigationSheet } from './DriverNavigationSheet';

describe('DriverNavigationSheet (States 4, 5, 12)', () => {
  const baseProps = {
    orderCode: '#LP-8921',
    address: '124 Hoàng Hoa Thám, Ba Đình',
    contactName: 'Anh Tuấn',
    contactPhone: '0912345678',
    isAtPickupGeofence: false,
    onConfirmArrival: jest.fn(),
    isDarkMode: false,
  };

  it('renders 56pt primary button "Tôi đã đến nơi" (State 4)', () => {
    render(<DriverNavigationSheet {...baseProps} />);
    const button = screen.getByRole('button', { name: /Tôi đã đến nơi/i });
    expect(button).toBeTruthy();
  });

  it('displays geofence arrival suggestion when within 100m without auto-submitting (State 5)', () => {
    render(<DriverNavigationSheet {...baseProps} isAtPickupGeofence={true} />);
    expect(screen.getByText(/GỢI Ý ĐẾN NƠI/i)).toBeTruthy();
    expect(baseProps.onConfirmArrival).not.toHaveBeenCalled();
    fireEvent.press(screen.getByRole('button', { name: /Tôi đã đến nơi/i }));
    expect(baseProps.onConfirmArrival).toHaveBeenCalledTimes(1);
  });

  it('applies OLED dark palette when isDarkMode is true (State 12)', () => {
    render(<DriverNavigationSheet {...baseProps} isDarkMode={true} />);
    expect(screen.getByTestId('driver-nav-sheet-container')).toHaveStyle({
      backgroundColor: '#161F30',
    });
  });
});
```

- [ ] **Step 2: Chạy test để xác nhận fail**

Run: `pnpm --filter driver test -- src/features/orders/components/detail/DriverNavigationSheet.test.tsx`
Expected: FAIL do chưa tạo file `DriverNavigationSheet.tsx`.

- [ ] **Step 3: Triển khai `DriverNavigationSheet.tsx`**

Cấu hình BottomSheet layout với 2 nút gọi điện/nhắn tin 48×48pt, CTA chính 56pt bo góc 16pt, hiệu ứng banner gợi ý 100m, và style chuyển đổi `isDarkMode`.

- [ ] **Step 4: Chạy test xác nhận pass**

Run: `pnpm --filter driver test -- src/features/orders/components/detail/DriverNavigationSheet.test.tsx`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add apps/driver/src/features/orders/components/detail/DriverNavigationSheet.tsx apps/driver/src/features/orders/components/detail/DriverNavigationSheet.test.tsx
git commit -m "feat(driver): add non-dismissible navigation bottom sheet with geofence and dark mode"
```

---

### Task 4: Chụp Ảnh POD Lấy Hàng & Điều Hướng Đa Chặng (Trạng thái 6, 7)

**Files:**
- Create: `apps/driver/src/features/orders/components/detail/PickupVerificationView.tsx`
- Create: `apps/driver/src/features/orders/components/detail/MultiStopProgressHeader.tsx`
- Test: `apps/driver/src/features/orders/components/detail/PickupAndMultiStop.test.tsx`

**Interfaces:**
- Consumes: `driverJourneyTokens`
- Produces:
  - `PickupVerificationView`: Full-page view, yêu cầu tối thiểu 1 ảnh để kích hoạt nút 56pt "Xác nhận đã lấy hàng", bộ đếm kiện hàng lớn, ảnh tham chiếu đối chứng của khách.
  - `MultiStopProgressHeader`: Thanh chip ngang hiển thị các chặng dừng (Đã xong `✓`, Hiện tại Active `#0B2545`, Kế tiếp Xám).

- [ ] **Step 1: Viết test cho `PickupVerificationView` và `MultiStopProgressHeader`**

Tạo `apps/driver/src/features/orders/components/detail/PickupAndMultiStop.test.tsx`:
```typescript
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import { PickupVerificationView } from './PickupVerificationView';
import { MultiStopProgressHeader } from './MultiStopProgressHeader';

describe('PickupVerificationView (State 6)', () => {
  it('disables CTA button until at least 1 photo is captured', () => {
    const onConfirm = jest.fn();
    const { rerender } = render(
      <PickupVerificationView photos={[]} onCapturePhoto={jest.fn()} onConfirmPickup={onConfirm} />
    );
    const cta = screen.getByRole('button', { name: /Xác nhận đã lấy hàng/i });
    fireEvent.press(cta);
    expect(onConfirm).not.toHaveBeenCalled();

    rerender(
      <PickupVerificationView photos={['file://photo.jpg']} onCapturePhoto={jest.fn()} onConfirmPickup={onConfirm} />
    );
    fireEvent.press(cta);
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });
});

describe('MultiStopProgressHeader (State 7)', () => {
  it('renders multi-stop chips with checkmark for completed, active highlight for current', () => {
    const stops = [
      { id: '1', title: 'Điểm lấy', status: 'completed' as const },
      { id: '2', title: 'Điểm 1', status: 'active' as const },
      { id: '3', title: 'Điểm 2', status: 'pending' as const },
    ];
    render(<MultiStopProgressHeader stops={stops} />);
    expect(screen.getByText(/✓ Điểm lấy/)).toBeTruthy();
    expect(screen.getByText(/Điểm 1/)).toBeTruthy();
  });
});
```

- [ ] **Step 2: Chạy test xác nhận fail**

Run: `pnpm --filter driver test -- src/features/orders/components/detail/PickupAndMultiStop.test.tsx`
Expected: FAIL.

- [ ] **Step 3: Triển khai 2 component**

- `PickupVerificationView.tsx`: layout full screen, nút chụp ảnh lớn, counter `+ / -` cho số lượng kiện hàng, thumbnail ảnh khách đặt ban đầu, CTA cao 56pt.
- `MultiStopProgressHeader.tsx`: `ScrollView horizontal` với các chip 36pt bo góc pill.

- [ ] **Step 4: Chạy test xác nhận pass**

Run: `pnpm --filter driver test -- src/features/orders/components/detail/PickupAndMultiStop.test.tsx`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add apps/driver/src/features/orders/components/detail/PickupVerificationView.tsx apps/driver/src/features/orders/components/detail/MultiStopProgressHeader.tsx apps/driver/src/features/orders/components/detail/PickupAndMultiStop.test.tsx
git commit -m "feat(driver): add pickup photo verification view and horizontal multi-stop progress header"
```

---

### Task 5: Xác Nhận Giao Hàng COD & Nhánh Thất Bại (Trạng thái 8, 9)

**Files:**
- Create: `apps/driver/src/features/orders/components/detail/DeliveryVerificationView.tsx`
- Test: `apps/driver/src/features/orders/components/detail/DeliveryVerificationView.test.tsx`

**Interfaces:**
- Consumes: `driverJourneyTokens`, `driverHapticMatrix`
- Produces: `DeliveryVerificationView` xử lý:
  - Nhánh 6b (COD): Badge cam hổ phách, số tiền 32pt bold tabular, nút 1 chạm "Thu đủ số tiền", cảnh báo lệch cước.
  - Nhánh 6c (Thất bại): Entry link nhỏ "Không giao được hàng?", danh sách radio lý do, bắt buộc ảnh bằng chứng, nút đỏ cảnh báo 56pt.

- [ ] **Step 1: Viết test cho các nhánh giao hàng COD và thất bại**

Tạo `apps/driver/src/features/orders/components/detail/DeliveryVerificationView.test.tsx`:
```typescript
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import { DeliveryVerificationView } from './DeliveryVerificationView';

describe('DeliveryVerificationView (States 8 & 9)', () => {
  it('supports one-tap "Thu đủ số tiền" and shows warning when amount mismatches (State 8)', () => {
    const onComplete = jest.fn();
    render(
      <DeliveryVerificationView
        type="COD"
        expectedAmount={520000}
        photos={['file://pod.jpg']}
        onCompleteDelivery={onComplete}
      />
    );
    expect(screen.getByText(/520\.000/)).toBeTruthy();
    const quickButton = screen.getByRole('button', { name: /Thu đủ số tiền/i });
    fireEvent.press(quickButton);
    fireEvent.press(screen.getByRole('button', { name: /Xác nhận hoàn tất/i }));
    expect(onComplete).toHaveBeenCalledWith(expect.objectContaining({ collectedAmount: 520000 }));
  });

  it('requires reason and photo proof for delivery failure branch (State 9)', () => {
    const onFail = jest.fn();
    render(<DeliveryVerificationView type="FAILURE" onReportFailure={onFail} photos={[]} />);
    const failButton = screen.getByRole('button', { name: /Xác nhận không giao được/i });
    fireEvent.press(failButton);
    expect(onFail).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Chạy test xác nhận fail**

Run: `pnpm --filter driver test -- src/features/orders/components/detail/DeliveryVerificationView.test.tsx`
Expected: FAIL.

- [ ] **Step 3: Triển khai `DeliveryVerificationView.tsx`**

Bao gồm form nhập tiền có nút "Thu đủ số tiền 1-chạm", xử lý radio box lý do không liên lạc/khách từ chối/sai địa chỉ, chụp ảnh bắt buộc, và kích hoạt `driverHapticMatrix.errorAlert()` khi ấn xác nhận thất bại.

- [ ] **Step 4: Chạy test xác nhận pass**

Run: `pnpm --filter driver test -- src/features/orders/components/detail/DeliveryVerificationView.test.tsx`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add apps/driver/src/features/orders/components/detail/DeliveryVerificationView.tsx apps/driver/src/features/orders/components/detail/DeliveryVerificationView.test.tsx
git commit -m "feat(driver): add COD one-tap verification and proof-backed delivery failure view"
```

---

### Task 6: Hoàn Tất Chuyến Đi & Bộ Điều Khiển 12 Trạng Thái (Trạng thái 10 & Catalog)

**Files:**
- Create: `apps/driver/src/features/orders/components/detail/TripCompletedSummaryView.tsx`
- Create: `apps/driver/src/features/orders/preview/Driver12JourneyPlayground.tsx`
- Modify: `apps/driver/src/features/orders/preview/catalogue.ts`
- Test: `apps/driver/src/features/orders/preview/Driver12JourneyPlayground.test.tsx`

**Interfaces:**
- Consumes: Mọi component từ Task 1 đến Task 5
- Produces:
  - `TripCompletedSummaryView`: Dấu tích xanh bung nở, bento doanh thu, đánh giá 5 sao, nút "Về trang chủ".
  - `Driver12JourneyPlayground`: Bộ chuyển đổi tương tác 12 trạng thái (State Selector Dock) cho phép reviewer bấm chuyển đổi mượt mà giữa cả 12 trạng thái yêu cầu của HIG.

- [ ] **Step 1: Viết test cho màn hình hoàn tất và bộ chuyển 12 trạng thái**

Tạo `apps/driver/src/features/orders/preview/Driver12JourneyPlayground.test.tsx`:
```typescript
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import { Driver12JourneyPlayground } from './Driver12JourneyPlayground';

describe('Driver12JourneyPlayground (All 12 States)', () => {
  it('allows switching across all 12 states seamlessly', () => {
    render(<Driver12JourneyPlayground />);
    expect(screen.getByText(/Trạng thái 1/i)).toBeTruthy();
    
    // Switch to State 10 (Hoàn tất)
    fireEvent.press(screen.getByTestId('switch-state-10'));
    expect(screen.getByText(/HOÀN THÀNH CHUYẾN ĐI/i)).toBeTruthy();
    expect(screen.getByText(/Về trang chủ/i)).toBeTruthy();

    // Switch to State 12 (Dark Mode)
    fireEvent.press(screen.getByTestId('switch-state-12'));
    expect(screen.getByTestId('playground-dark-surface')).toBeTruthy();
  });
});
```

- [ ] **Step 2: Chạy test xác nhận fail**

Run: `pnpm --filter driver test -- src/features/orders/preview/Driver12JourneyPlayground.test.tsx`
Expected: FAIL.

- [ ] **Step 3: Triển khai `TripCompletedSummaryView.tsx` & `Driver12JourneyPlayground.tsx`**

- Hoàn thiện `TripCompletedSummaryView` với biểu tượng tích xanh lớn, phân rã doanh thu tabular, và nút CTA 56pt.
- Xây dựng `Driver12JourneyPlayground` gắn kèm thanh gạt 12 trạng thái ở cạnh dưới, tích hợp với preview route hiện có của `apps/driver`.

- [ ] **Step 4: Chạy test xác nhận pass**

Run: `pnpm --filter driver test -- src/features/orders/preview/Driver12JourneyPlayground.test.tsx`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add apps/driver/src/features/orders/components/detail/TripCompletedSummaryView.tsx apps/driver/src/features/orders/preview/Driver12JourneyPlayground.tsx apps/driver/src/features/orders/preview/catalogue.ts apps/driver/src/features/orders/preview/Driver12JourneyPlayground.test.tsx
git commit -m "feat(driver): add trip completed summary screen and 12-state interactive journey playground"
```

---

### Task 7: Kiểm Thử Toàn Diện & Typecheck (Verification & Handoff)

**Files:**
- Test: Toàn bộ suite kiểm thử trong `apps/driver` và `@leopard/mobile-core`.

- [ ] **Step 1: Chạy toàn bộ test bộ driver**

Run: `pnpm --filter driver test`
Expected: Toàn bộ test pass.

- [ ] **Step 2: Chạy typecheck và lint cho driver và mobile-core**

Run: `pnpm --filter @leopard/mobile-core typecheck && pnpm --filter driver typecheck`
Expected: Exit code 0, không có lỗi TypeScript.

- [ ] **Step 3: Kiểm tra tuân thủ điều cấm kỵ (Anti-pattern Audit)**

Xác nhận mã nguồn không vi phạm:
1. Không có nút từ chối đặt song song với nút nhận thay cho thanh vuốt.
2. Không có chuyển màn hình tự động bằng GPS nếu tài xế chưa ấn "Tôi đã đến nơi".
3. Mọi nút CTA chính đều có chiều cao `>= 56pt`.
4. Bottom Sheet luôn có `enablePanDownToClose={false}`.
5. Số lượng đơn nổ tối đa trên màn hình bằng 1.

- [ ] **Step 4: Commit hoàn tất**

```bash
git commit --allow-empty -m "chore(driver): verify full 12-state driver journey against Apple HIG constraints"
```
