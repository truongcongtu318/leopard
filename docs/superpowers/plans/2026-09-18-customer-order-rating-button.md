# Customer Order Rating & Review Flow Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Provide customers with an immediate, responsive rating/review CTA button after order completion (`status === 'DELIVERED'`) on both Realtime Tracking and Order Detail screens, following Apple HIG and Emil Kowalski design engineering principles.

**Architecture:** Extend mobile order domain models with `OrderReviewSummary`, enhance the HTTP adapter to query review status upon delivery, surface a primary CTA action or completed review card in `CustomerOrderDetailScreen`, and embed an interactive delivery completion rating banner in `RealtimeTrackingScreen`.

**Tech Stack:** React Native 0.86, Expo 57, Expo Router, `@leopard/mobile-core` (Apple HIG design tokens & Haptic feedback), Jest, React Native Testing Library.

## Global Constraints
- Apple HIG Design Tokens: Midnight Navy (`#0B2545`) for primary CTAs, Cheetah Gold (`#F59E0B`) for rating stars, Eco Green (`#10B981` / `#34C759`) for delivery success badges.
- Squircle continuous curvature (`iosContinuousCurve`, `radius.cardLg` = 16pt, `radius.card` = 14pt).
- Instant press feedback: `transform: [{ scale: 0.97 }]` on pressed state with `haptic.medium()`.
- Numeric values: `fontVariant: ['tabular-nums']` on tip amounts, ratings, and license plates.
- No hardcoded font sizes or spacing outside design tokens (`typeScale`, `spacing`).

---

### Task 1: Model & Adapter Updates

**Files:**
- Modify: `apps/mobile/src/features/customer/orders/model.ts`
- Modify: `apps/mobile/src/features/customer/orders/adapter.ts`
- Test: `apps/mobile/src/features/customer/orders/adapter.test.ts`

**Interfaces:**
- Produces: `OrderReviewSummary` type in `model.ts`.
- Consumes: `GET /orders/:id/reviews` endpoint.
- Produces: `order.review` and `rate-order` action in `CustomerDetailContentView`.

- [ ] **Step 1: Write the failing tests in `adapter.test.ts`**
Add tests asserting:
1. When order status is `DELIVERED` and `GET /orders/:id/reviews` returns 404, `view.actions` includes `rate-order` with label "Đánh giá chuyến đi" and `order.review` is null.
2. When order status is `DELIVERED` and `GET /orders/:id/reviews` returns a review object, `order.review` is populated and `rate-order` is not present in `view.actions`.

- [ ] **Step 2: Run test to verify it fails**
Run: `pnpm --filter mobile test -- src/features/customer/orders/adapter.test.ts`
Expected: FAIL due to missing `OrderReviewSummary` and `order.review` property.

- [ ] **Step 3: Implement `OrderReviewSummary` in `model.ts` and update `adapter.ts`**
In `model.ts`:
```typescript
export type OrderReviewSummary = Readonly<{
  id: string;
  orderId: string;
  rating: number;
  comment?: string | null;
  tipVnd?: number;
  createdAt: string;
}>;
```
Add `review?: OrderReviewSummary | null;` to `CustomerOrderDetailDataView`.

In `adapter.ts` (`getOrderDetailView`):
When `response.status === 'DELIVERED'`:
Safely call `activeClient.get<MappedReviewResponse>('/orders/' + validId + '/reviews')`. If found, set `order.review = mapped` and `actions = []`. If 404/not found, set `order.review = null` and add `{ id: 'rate-order', label: 'Đánh giá chuyến đi', emphasis: 'primary' }` to `actions`.

- [ ] **Step 4: Run test to verify it passes**
Run: `pnpm --filter mobile test -- src/features/customer/orders/adapter.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**
```bash
git add apps/mobile/src/features/customer/orders/model.ts apps/mobile/src/features/customer/orders/adapter.ts apps/mobile/src/features/customer/orders/adapter.test.ts
git commit -m "feat(mobile): add order review model and adapter query for delivered orders"
```

---

### Task 2: CustomerOrderDetailScreen & Runtime Integration

**Files:**
- Modify: `apps/mobile/src/features/customer/orders/CustomerOrderDetailScreen.tsx`
- Modify: `apps/mobile/src/features/customer/orders/CustomerOrderDetailRuntime.tsx`
- Test: `apps/mobile/src/features/customer/orders/CustomerOrderDetailScreen.test.tsx` (or new test file)

**Interfaces:**
- Consumes: `order.review` and `rate-order` from `CustomerDetailContentView`.
- Produces: Renders "Đánh giá của bạn" card (when reviewed) or rating prompt + CTA button (when unreviewed).

- [ ] **Step 1: Write test for CustomerOrderDetailScreen review display**
Test that:
1. When `order.status === 'DELIVERED'` and unreviewed, the primary button "Đánh giá chuyến đi" is rendered.
2. When `order.review` has rating 5, comment "Tài xế rất chu đáo", tip 20000, it renders "Đánh giá của bạn", 5 stars, the comment, and "+20.000 đ".

- [ ] **Step 2: Run test to verify it fails**
Run: `pnpm --filter mobile test -- src/features/customer/orders/CustomerOrderDetailScreen.test.tsx`
Expected: FAIL.

- [ ] **Step 3: Implement Review UI in `CustomerOrderDetailScreen.tsx` and route handler in `CustomerOrderDetailRuntime.tsx`**
In `CustomerOrderDetailScreen.tsx`:
Add `YourReviewCard` component (Inset Grouped card, squircle 16pt continuous curve, Cheetah Gold SVG stars, tabular-nums tip badge, quote styling).
In `CustomerOrderDetailRuntime.tsx`:
In `onPrimaryAction(actionId)`:
If `actionId === 'rate-order'`, push to `/customer/review/${orderId}` with driver details in params.

- [ ] **Step 4: Run test to verify it passes**
Run: `pnpm --filter mobile test -- src/features/customer/orders/CustomerOrderDetailScreen.test.tsx`
Expected: PASS.

- [ ] **Step 5: Commit**
```bash
git add apps/mobile/src/features/customer/orders/CustomerOrderDetailScreen.tsx apps/mobile/src/features/customer/orders/CustomerOrderDetailRuntime.tsx
git commit -m "feat(mobile): render review affordance and handle rate-order action in customer order detail"
```

---

### Task 3: RealtimeTrackingScreen & TrackingRuntime Rating CTA

**Files:**
- Modify: `apps/mobile/src/features/tracking/RealtimeTrackingScreen.tsx`
- Modify: `apps/mobile/src/features/tracking/CustomerTrackingRuntime.tsx`
- Test: `apps/mobile/src/features/customer/deliveries-chat-review.test.tsx`

**Interfaces:**
- Produces: `onReviewTrip?: () => void` prop in `RealtimeTrackingScreenProps`.
- Consumes: `trip.status === 'DELIVERED'`.

- [ ] **Step 1: Write test for RealtimeTrackingScreen rating CTA**
In `deliveries-chat-review.test.tsx`:
Render `RealtimeTrackingScreen` with `trip.status === 'DELIVERED'` and an `onReviewTrip` spy. Assert the "Đánh giá chuyến đi" CTA button exists and tapping it triggers `onReviewTrip`.

- [ ] **Step 2: Run test to verify it fails**
Run: `pnpm --filter mobile test -- src/features/customer/deliveries-chat-review.test.tsx`
Expected: FAIL.

- [ ] **Step 3: Implement Rating CTA in `RealtimeTrackingScreen.tsx` and wiring in `CustomerTrackingRuntime.tsx`**
In `RealtimeTrackingScreen.tsx`:
- Add `onReviewTrip?: () => void` to `RealtimeTrackingScreenProps` and pass down to `CargoBookingCard`.
- In `CargoBookingCard`: When `trip.status === 'DELIVERED'`, render a dedicated Delivery Completed card:
  - Header: "Chuyến đi đã hoàn tất"
  - Subtitle: "Vui lòng dành ít phút để đánh giá chất lượng dịch vụ của tài xế."
  - CTA Button: Height 52pt, Midnight Navy `#0B2545`, icon `IconStar` (Cheetah Gold `#F59E0B`), label "Đánh giá chuyến đi", `scale(0.97)` on press with `haptic.medium()`.
In `CustomerTrackingRuntime.tsx`:
Pass `onReviewTrip={() => router.push({ pathname: '/customer/review/[id]', params: { id: order.id, driverName, licensePlate: assignedDriver?.licensePlate, vehicleType: assignedDriver?.vehicleType } })}`.

- [ ] **Step 4: Run test to verify it passes**
Run: `pnpm --filter mobile test -- src/features/customer/deliveries-chat-review.test.tsx`
Expected: PASS.

- [ ] **Step 5: Commit**
```bash
git add apps/mobile/src/features/tracking/RealtimeTrackingScreen.tsx apps/mobile/src/features/tracking/CustomerTrackingRuntime.tsx apps/mobile/src/features/customer/deliveries-chat-review.test.tsx
git commit -m "feat(mobile): add rating CTA to realtime tracking bottom sheet for delivered orders"
```

---

### Task 4: Full Verification & Lint Check

**Files:**
- Monorepo validation across mobile app.

- [ ] **Step 1: Run typecheck**
Run: `pnpm --filter mobile typecheck`
Expected: 0 errors.

- [ ] **Step 2: Run all mobile tests**
Run: `pnpm --filter mobile test`
Expected: All tests pass.

- [ ] **Step 3: Commit final integration changes if any**
```bash
git commit --allow-empty -m "chore(mobile): complete verification of customer rating flow"
```
