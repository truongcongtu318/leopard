# Driver Active Mission & Completed Order Detail Separation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Tách bạch 2 luồng nghiệp vụ tài xế: (1) Trang Home nhận diện chuyến đang chạy và trực tiếp điều hướng/thao tác vòng đời (Active Mission Cockpit với Live Map + SlideToAction tuần tự); (2) Trang Chi tiết đơn hàng `/orders/[id]` dành cho đơn từ lịch sử trở thành màn hình biên nhận xem lại thuần túy (Read-only Completed Summary / Receipt), ẩn toàn bộ nút bấm/thao tác lái xe.

**Architecture:** 
- Tuyến `/orders/[id]` phân tách dựa trên trạng thái `order.status`: Nếu `DELIVERED`, `RETURNED`, `CANCELLED` hoặc `INCIDENT_CANCELLED` (terminal), render component thuần xem lại `CompletedOrderDetailView` (biên lai, cước thực nhận, lộ trình đã đi, chữ ký & ảnh e-POD đã lưu, nhật ký thời gian) không có thanh thao tác lái xe hay nút gọi/SOS giả lập.
- Trang Home (`DriverOrdersScreen` + `DriverOrdersListRuntime`): Khi tài xế có `activeTrip`, thẻ điều phối cho phép chuyển nhanh hoặc thao tác ngay các bước chặng; đồng thời nếu tài xế mở từ thông báo/deep link đơn đang chạy, route `/orders/[id]` vẫn hỗ trợ thao tác hoặc chuyển tiếp thông minh về Cockpit Home.
- e-POD View trên đơn hoàn thành: Hiển thị ảnh chụp hàng giao và chữ ký thủ kho đã lưu dưới dạng biên bản bàn giao, không mở khung chụp ảnh lại hay khung ký đè.

**Tech Stack:** React Native, Expo Router, TypeScript, TanStack React Query, `@leopard/mobile-core`.

---

## Global Constraints

- Tuân thủ Apple HIG Standard và Nexa Bento layout theo `AGENTS.md` và `CLAUDE.md`.
- Số liệu tiền cước và mã đơn dùng `fontVariant: ['tabular-nums']`.
- Không pastel đa màu, không icon xanh neon. Sử dụng `driverPrimitives`.
- Mọi test Jest hiện tại (64 suites, 415 tests) trong `apps/driver` phải tiếp tục PASS.

---

## File Structure

- Create: `apps/driver/src/features/orders/components/detail/CompletedOrderDetailView.tsx` — View biên nhận thuần đọc cho đơn đã hoàn thành/hủy.
- Modify: `apps/driver/src/features/orders/components/detail/AssignedDetailView.tsx` — Dọn dẹp code rẽ nhánh terminal, chuyển giao diện terminal sang `CompletedOrderDetailView`.
- Modify: `apps/driver/src/features/orders/DriverOrderDetailScreen.tsx` — Tích hợp điều hướng/render sạch sẽ giữa active mission và completed receipt.
- Modify: `apps/driver/src/features/orders/components/DriverActiveTripCard.tsx` — Bổ sung thanh tiến trình 4 bước và nút chuyển trạng thái nhanh/mở Cockpit trực tiếp trên Home.
- Test: `apps/driver/src/features/orders/DriverOrderDetailScreen.test.tsx` — Bổ sung test kiểm chứng đơn hoàn thành là read-only (không render sticky actions lái xe, không cho vẽ lại chữ ký).
- Test: `apps/driver/src/features/orders/CompletedOrderDetailView.test.tsx` — Test riêng cho màn hình biên bản hoàn thành đơn.

---

### Task 1: Tạo `CompletedOrderDetailView` dành riêng cho đơn lịch sử / hoàn tất

**Files:**
- Create: `apps/driver/src/features/orders/components/detail/CompletedOrderDetailView.tsx`
- Test: `apps/driver/src/features/orders/components/detail/CompletedOrderDetailView.test.tsx`

**Interfaces:**
- Consumes: `DriverAssignedDetailView` từ `../../model`, `CompletionSummaryCard`, `VerticalRouteStepper`, `CargoAndContactCard`, `StatusTimeline`.
- Produces: `<CompletedOrderDetailView view={view} onBack={onBack} />`.

- [ ] **Step 1: Viết test cho `CompletedOrderDetailView`**

```tsx
// apps/driver/src/features/orders/components/detail/CompletedOrderDetailView.test.tsx
import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { CompletedOrderDetailView } from './CompletedOrderDetailView';
import { createDriverDetailFixture } from '../../fixtures';
import type { DriverAssignedDetailView } from '../../model';

describe('CompletedOrderDetailView', () => {
  it('renders completed order receipt without driver action controls', () => {
    const base = createDriverDetailFixture('D-DETAIL-ACCEPTED') as DriverAssignedDetailView;
    const view: DriverAssignedDetailView = {
      ...base,
      order: {
        ...base.order,
        status: 'DELIVERED',
        reference: 'ORD-COMPLETED-999',
        priceLabel: '350.000 ₫',
      },
    };

    const screen = render(<CompletedOrderDetailView view={view} />);

    // Shows receipt info
    expect(screen.getByText('ORD-COMPLETED-999')).toBeTruthy();
    expect(screen.getByText('350.000 ₫')).toBeTruthy();

    // Does NOT render active driving controls
    expect(screen.queryByTestId('btn-advance-leg-slide')).toBeNull();
    expect(screen.queryByTestId('btn-open-incident-modal')).toBeNull();
    expect(screen.queryByTestId('btn-capture-cargo-photo')).toBeNull();
  });
});
```

- [ ] **Step 2: Chạy test để xác nhận FAIL**

Run: `pnpm --filter driver test -- src/features/orders/components/detail/CompletedOrderDetailView.test.tsx`
Expected: FAIL do file chưa tồn tại.

- [ ] **Step 3: Tạo component `CompletedOrderDetailView.tsx`**

```tsx
// apps/driver/src/features/orders/components/detail/CompletedOrderDetailView.tsx
import React, { useState } from 'react';
import { ScrollView, StyleSheet, Text, View, Pressable, Image } from 'react-native';
import {
  ScreenScaffold,
  driverPrimitives,
  iosContinuousCurve,
  IconClock,
  IconFileText,
  StatusTimeline,
} from '@leopard/mobile-core';
import type { DriverAssignedDetailView } from '../../model';
import { CompletionSummaryCard } from './CompletionSummaryCard';
import { VerticalRouteStepper } from './VerticalRouteStepper';
import { CargoAndContactCard } from './CargoAndContactCard';

export type CompletedOrderDetailViewProps = Readonly<{
  view: DriverAssignedDetailView;
  onBack?: () => void;
}>;

export function CompletedOrderDetailView({ onBack, view }: CompletedOrderDetailViewProps) {
  const [isTimelineOpen, setIsTimelineOpen] = useState(false);
  const { order, proof } = view;

  return (
    <ScreenScaffold headerTone="plain" onBack={onBack} title={`Biên bản đơn ${order.reference}`}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* 1. Thẻ tóm tắt cước và trạng thái hoàn thành */}
        <CompletionSummaryCard
          deliveredAtLabel={order.updatedAtLabel}
          priceLabel={order.priceLabel}
          reference={order.reference}
          status={order.status}
        />

        {/* 2. Lộ trình giao hàng thực tế */}
        <VerticalRouteStepper
          destination={order.route.destination}
          destinationLabel={order.route.destination.label}
          distanceLabel={order.route.distanceLabel}
          origin={order.route.origin}
          originLabel={order.route.origin.label}
          status={order.status}
          stops={order.route.stops}
        />

        {/* 3. Chi tiết hàng hoá & Khách hàng */}
        <CargoAndContactCard
          cargoSummary={order.cargoSummary}
          cargoWeightKg={order.cargoWeightKg}
          contactRoleLabel={order.contactRoleLabel}
          customerContact={order.customerContact}
          vehicleLabel={order.vehicleLabel}
        />

        {/* 4. Biên bản e-POD bàn giao hàng (chỉ đọc) */}
        {proof && (proof.photoUri || proof.signatureUri) ? (
          <View style={styles.epodReceiptCard} testID="epod-saved-receipt">
            <View style={styles.epodHeaderRow}>
              <IconFileText color="#0F172A" size={16} />
              <Text style={styles.epodTitle}>BIÊN BẢN GIAO NHẬN (e-POD)</Text>
            </View>

            {proof.photoUri ? (
              <View style={styles.proofItemCol}>
                <Text style={styles.proofLabel}>Ảnh chụp bàn giao kiện hàng:</Text>
                <Image
                  accessibilityLabel="Ảnh chụp bàn giao kiện hàng"
                  source={{ uri: proof.photoUri }}
                  style={styles.proofImage}
                />
              </View>
            ) : null}

            {proof.signatureUri ? (
              <View style={styles.proofItemCol}>
                <Text style={styles.proofLabel}>Chữ ký người nhận hàng:</Text>
                <View style={styles.signatureBox}>
                  <Image
                    accessibilityLabel="Chữ ký người nhận hàng"
                    resizeMode="contain"
                    source={{ uri: proof.signatureUri }}
                    style={styles.signatureImage}
                  />
                </View>
              </View>
            ) : null}
          </View>
        ) : null}

        {/* 5. Nhật ký thời gian & sự kiện */}
        <View style={styles.timelineSection}>
          <Pressable
            accessibilityLabel={`Xem nhật ký sự kiện, ${order.history.length} mốc`}
            accessibilityRole="button"
            onPress={() => setIsTimelineOpen(!isTimelineOpen)}
            style={({ pressed }) => [styles.timelineToggleBtn, pressed ? styles.pressed : null]}
          >
            <View style={styles.timelineToggleLeft}>
              <IconClock color="#0B1E42" size={15} />
              <Text style={styles.timelineToggleText}>
                Lịch sử hành trình ({order.history.length} sự kiện)
              </Text>
            </View>
            <Text style={styles.timelineToggleArrow}>{isTimelineOpen ? '▲' : '▼'}</Text>
          </Pressable>
          {isTimelineOpen ? (
            <View style={styles.timelineContentWrap}>
              <StatusTimeline entries={order.history} />
            </View>
          ) : null}
        </View>
      </ScrollView>
    </ScreenScaffold>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    gap: 14,
    padding: 16,
    paddingBottom: 40,
  },
  epodReceiptCard: {
    backgroundColor: driverPrimitives.colors.white,
    borderColor: '#E2E8F0',
    borderRadius: 20,
    ...iosContinuousCurve,
    borderWidth: 1,
    gap: 12,
    padding: 16,
    ...driverPrimitives.shadows.sm,
  },
  epodHeaderRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  epodTitle: {
    color: driverPrimitives.colors.gray900,
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  proofItemCol: {
    gap: 6,
  },
  proofLabel: {
    color: driverPrimitives.colors.gray600,
    fontSize: 12,
    fontWeight: '600',
  },
  proofImage: {
    backgroundColor: '#F1F5F9',
    borderRadius: 12,
    height: 160,
    width: '100%',
  },
  signatureBox: {
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderColor: '#E2E8F0',
    borderRadius: 12,
    borderWidth: 1,
    height: 100,
    justifyContent: 'center',
    padding: 8,
    width: '100%',
  },
  signatureImage: {
    height: '100%',
    width: '100%',
  },
  timelineSection: {
    backgroundColor: driverPrimitives.colors.white,
    borderColor: '#E2E8F0',
    borderRadius: 18,
    ...iosContinuousCurve,
    borderWidth: 1,
    overflow: 'hidden',
  },
  timelineToggleBtn: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 16,
  },
  timelineToggleLeft: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  timelineToggleText: {
    color: '#0F172A',
    fontSize: 13,
    fontWeight: '600',
  },
  timelineToggleArrow: {
    color: '#64748B',
    fontSize: 11,
  },
  timelineContentWrap: {
    borderTopColor: '#F1F5F9',
    borderTopWidth: 1,
    padding: 16,
  },
  pressed: {
    opacity: 0.8,
  },
});
```

- [ ] **Step 4: Chạy test kiểm tra lại**

Run: `pnpm --filter driver test -- src/features/orders/components/detail/CompletedOrderDetailView.test.tsx`
Expected: PASS.

- [ ] **Step 5: Commit task 1**

```bash
git add apps/driver/src/features/orders/components/detail/CompletedOrderDetailView.tsx apps/driver/src/features/orders/components/detail/CompletedOrderDetailView.test.tsx
git commit -m "feat(driver): add CompletedOrderDetailView for terminal order receipts"
```

---

### Task 2: Tích hợp `CompletedOrderDetailView` vào `DriverOrderDetailScreen` và phân lập hoàn toàn với `AssignedDetailView`

**Files:**
- Modify: `apps/driver/src/features/orders/DriverOrderDetailScreen.tsx:209-260`
- Modify: `apps/driver/src/features/orders/components/detail/AssignedDetailView.tsx` (loại bỏ code thừa nhánh terminal)
- Test: `apps/driver/src/features/orders/DriverOrderDetailScreen.test.tsx`

- [ ] **Step 1: Thêm test case vào `DriverOrderDetailScreen.test.tsx`**

```tsx
it('renders CompletedOrderDetailView when order is DELIVERED or RETURNED', async () => {
  const base = createDriverDetailFixture('D-DETAIL-ACCEPTED') as DriverAssignedDetailView;
  const view: DriverAssignedDetailView = {
    ...base,
    order: {
      ...base.order,
      status: 'DELIVERED',
      reference: 'ORD-TERM-123',
    },
  };

  const screen = await render(<DriverOrderDetailScreen view={view} />);

  // Should show the title for receipt
  expect(screen.getByText('Biên bản đơn ORD-TERM-123')).toBeTruthy();
  // Should NOT render driver bottom controls
  expect(screen.queryByTestId('btn-navigate-active-leg')).toBeNull();
  expect(screen.queryByTestId('btn-open-incident-modal')).toBeNull();

  await screen.unmount();
});
```

- [ ] **Step 2: Cập nhật `DriverOrderDetailScreen.tsx`**
Nhận diện `isTerminal` (`DELIVERED`, `RETURNED`, `CANCELLED`, `INCIDENT_CANCELLED`). Nếu đúng, render `CompletedOrderDetailView` trực tiếp, không render `AssignedDetailView`.

- [ ] **Step 3: Chạy test xác minh**

Run: `pnpm --filter driver test -- src/features/orders/DriverOrderDetailScreen.test.tsx`
Expected: PASS.

- [ ] **Step 4: Commit task 2**

```bash
git add apps/driver/src/features/orders/DriverOrderDetailScreen.tsx apps/driver/src/features/orders/components/detail/AssignedDetailView.tsx apps/driver/src/features/orders/DriverOrderDetailScreen.test.tsx
git commit -m "refactor(driver): render CompletedOrderDetailView for terminal orders on detail route"
```

---

### Task 3: Nâng cấp `DriverActiveTripCard` trên Home thành Active Mission Cockpit

**Files:**
- Modify: `apps/driver/src/features/orders/components/DriverActiveTripCard.tsx`
- Modify: `apps/driver/src/features/orders/DriverOrdersScreen.tsx`
- Test: `apps/driver/src/features/orders/DriverOrdersScreen.test.tsx`

**Mục tiêu:**
Khi tài xế đang chạy đơn (`ACCEPTED`, `PICKING_UP`, `IN_TRANSIT`, `RETURNING`), thẻ tại Home không chỉ là một card xem thông tin sơ sài mà hiển thị rõ ràng:
1. Chặng hiện tại (Đang đến lấy hàng ➔ Đang bốc hàng ➔ Đang giao ➔ Hoàn tất).
2. Nút Gọi người nhận & Chỉ đường Google Maps ngay tại Home card.
3. Nút hành động chính (Tiếp tục điều phối / Mở Cockpit) chuyển hướng mượt mà tới view thực thi.

- [ ] **Step 1: Viết test cho `DriverActiveTripCard` với các nút điều hướng nhanh**
- [ ] **Step 2: Cập nhật layout `DriverActiveTripCard.tsx` chuẩn Apple HIG**
- [ ] **Step 3: Chạy bộ test của OrdersScreen**

Run: `pnpm --filter driver test -- src/features/orders/DriverOrdersScreen.test.tsx`
Expected: PASS.

- [ ] **Step 4: Commit task 3**

```bash
git add apps/driver/src/features/orders/components/DriverActiveTripCard.tsx apps/driver/src/features/orders/DriverOrdersScreen.tsx apps/driver/src/features/orders/DriverOrdersScreen.test.tsx
git commit -m "feat(driver): enhance DriverActiveTripCard with quick leg actions and status tracker"
```

---

### Task 4: Chạy toàn bộ test suites và kiểm chứng không có hồi quy (Regression Check)

- [ ] **Step 1: Chạy toàn bộ 64 test suites của app Driver**

Run: `pnpm --filter driver test`
Expected: PASS toàn bộ 64 suites.

- [ ] **Step 2: Typecheck và Lint**

Run: `pnpm --filter driver typecheck`
Expected: 0 errors.

---
