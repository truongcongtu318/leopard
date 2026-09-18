# Customer Order Rating & Review Flow Design Spec

**Date:** 2026-09-18  
**Topic:** Customer Order Rating Button & Review Integration (`apps/mobile`)  
**Design Philosophies:** Apple Human Interface Guidelines (`apple-design`) & Emil Kowalski Design Engineering (`emil-design-eng`)  
**Brand Standards:** LEOPARD Monorepo Architecture (`AGENTS.md`)

---

## 1. Executive Summary & Problem Statement

### Current State
1. Customers can rate orders via `OrderReviewScreen` (`apps/mobile/src/features/customer/review/OrderReviewScreen.tsx`) routed at `/customer/review/[id]`.
2. The backend API (`POST /orders/:id/reviews`, `GET /orders/:id/reviews`) is fully implemented with validation (`order.status === 'DELIVERED'`, one review per order).
3. **Problem**: When an order reaches the terminal `DELIVERED` state:
   - `RealtimeTrackingScreen`: Shows timeline step "Hoàn thành giao" and delivery proof (POD), but lacks a direct Call-To-Action (CTA) to review the trip and rate the driver.
   - `CustomerOrderDetailScreen`: Shows POD confirmation, but `view.actions` is empty (`actions: []`). There is no button to rate the completed trip or view a previously submitted review.
   - Customers have no clear affordance to rate their driver once delivery completes.

### Goal
Implement an elegant, Apple HIG & Emil Kowalski-inspired rating experience:
- In **`RealtimeTrackingScreen`**: An interactive, physical press-feedback Rating Banner & Button when `trip.status === 'DELIVERED'`, launching `/customer/review/[id]`.
- In **`CustomerOrderDetailScreen`**: A dual-state review section:
  - If **unreviewed**: Primary CTA button "Đánh giá chuyến đi" in `view.actions` and an Inset Grouped Rating prompt card.
  - If **already reviewed**: A polished "Đánh giá của bạn" (Your Review) card displaying the submitted stars, comment, and tip badge.

---

## 2. Design Principles & Review Matrix (Apple HIG + Emil Design Engineering)

| Area | Before (Current) | After (Designed) | Why (Apple HIG / Emil Kowalski) |
| --- | --- | --- | --- |
| **Tracking Bottom Sheet CTA** | No rating button on `DELIVERED` | Prominent Midnight Navy (`#0B2545`) CTA card with Cheetah Gold (`#F59E0B`) `IconStar` | Spatial consistency & wayfinding: Guide customer to immediate post-trip closure. |
| **Press Interaction** | Static opacity change or no feedback | `transform: scale(0.97)` on `:active` with instant `haptic.medium()` | Direct manipulation & zero-latency feedback (WWDC *Designing Fluid Interfaces* & Emil *Buttons must feel responsive*). |
| **Entry Transition** | Abrupt DOM mount or slide | Spring fade-in (`scale(0.95)` → `1`, `opacity: 0` → `1`, duration < 250ms) | Never animate from `scale(0)`; real-world physical arrival. |
| **Double-Review Handling** | 409 Conflict error on re-submission | Pre-fetches `GET /orders/:id/reviews`; renders read-only "Đánh giá của bạn" card | Unseen details compound; handle edge cases invisibly without dead ends. |
| **Typography & Numbers** | Hardcoded font sizes / non-tabular nums | `typeScale.headline`, `typeScale.subheadline`, `fontVariant: ['tabular-nums']` for rating & tip | Optical sizing & aligned numerals for financial/rating clarity. |
| **Touch Targets** | Standard buttons | Minimum 52pt CTA height, 44x44pt touch boundary for chips and stars | Touch ergonomics & Apple HIG Human Touch Target rules. |
| **Card Styling** | Flat or generic borders | Inset Grouped Double-Bezel (`radius.cardLg: 16pt` squircle `iosContinuousCurve`, 1px subtle hairline border `rgba(11, 30, 66, 0.08)`) | Visual hierarchy and depth without excessive clutter. |

---

## 3. Architecture & Data Flow

### 3.1. Model Extension (`apps/mobile/src/features/customer/orders/model.ts`)
Add `OrderReviewSummary` and optional `review` field to `CustomerOrderDetailDataView`:

```typescript
export type OrderReviewSummary = Readonly<{
  id: string;
  orderId: string;
  rating: number; // 1 - 5
  comment?: string | null;
  tipVnd?: number;
  createdAt: string;
}>;

export type CustomerOrderDetailDataView = Readonly<{
  // ... existing fields
  review?: OrderReviewSummary | null;
}>;
```

### 3.2. HTTP Adapter Layer (`apps/mobile/src/features/customer/orders/adapter.ts`)
In `getOrderDetailView(orderId)`:
1. When `response.status === 'DELIVERED'`:
   - Fetch `GET /orders/${validId}/reviews` safely using try/catch.
   - If a review exists:
     - Assign `order.review = mappedReview`.
     - `actions: []` (no redundant rating button).
   - If no review (404 DomainError `RESOURCE_NOT_FOUND`):
     - Assign `order.review = null`.
     - Add to `actions`:
       ```typescript
       actions: [
         {
           id: 'rate-order',
           label: 'Đánh giá chuyến đi',
           emphasis: 'primary',
         },
       ]
       ```

### 3.3. Runtime & Navigation (`apps/mobile/src/features/customer/orders/CustomerOrderDetailRuntime.tsx`)
1. Handle intent `actionId === 'rate-order'`:
   - Trigger `router.push({ pathname: '/customer/review/[id]', params: { id: orderId, driverName, licensePlate, vehicleType } })`.
2. When customer returns from `/customer/review/[id]`, refetch order details so the card flips to "Đánh giá của bạn".

---

## 4. Component & UI Specifications

### 4.1. `RealtimeTrackingScreen` Delivery Completion CTA
When `trip.status === 'DELIVERED'`:
- Located inside `CargoBookingCard` (above or below delivery proof) in `RealtimeTrackingScreen.tsx`.
- **Card**:
  - Background: `customerPalette.surfaceWhite`
  - Border: 1px hairline `rgba(11, 30, 66, 0.08)`
  - Radius: `radius.cardLg` (16pt squircle `iosContinuousCurve`)
  - Padding: `spacing.md` (16pt)
- **Header**:
  - Title: "Chuyến đi đã hoàn thành" (`typeScale.headline`, `customerPalette.textSlateDark`)
  - Subtitle: "Cảm ơn bạn đã sử dụng dịch vụ LEOPARD. Hãy đánh giá chuyến đi để giúp chúng tôi nâng cao chất lượng." (`typeScale.footnote`, `customerPalette.textSubtle`)
- **Action Button**:
  - Height: 52pt
  - Background: `customerPalette.primary` (Midnight Navy `#0B2545`)
  - Radius: 14pt squircle
  - Left Icon: `IconStar` (Cheetah Gold `#F59E0B`, filled, 18pt)
  - Label: "Đánh giá tài xế & chuyến đi" (White, `typeScale.subheadline`, weight 600)
  - Press Effect: Physical spring press (`scale: 0.97`) + `haptic.medium()`
  - Callback: `onReviewTrip?.()` which delegates to `router.push('/customer/review/[id]')`.

### 4.2. `CustomerOrderDetailScreen` Review Affordances
1. **Unreviewed State**:
   - Primary sticky/footer Action Button:
     - `label: 'Đánh giá chuyến đi'`
     - On press: triggers `onPrimaryAction('rate-order')` -> navigates to `/customer/review/${order.id}`.
   - Inline Banner above Price Breakdown:
     - Friendly prompt with 5 hollow stars in Cheetah Gold asking customer to share feedback.
2. **Reviewed State ("Đánh giá của bạn")**:
   - Card placed cleanly in order detail body:
     - Title: "Đánh giá của bạn" (`typeScale.headline`)
     - Star Row: 5 SVG stars, filled with `#F59E0B` up to `order.review.rating`.
     - Rating Label: "Tuyệt vời!" (5★), "Rất tốt" (4★), etc.
     - Tip Pill (if `tipVnd > 0`): Badge "+20.000 đ Tip" with tabular numerals.
     - Comment Quote Box: subtle rounded container (`radius.cardSm`) with customer's feedback.

---

## 5. Error Handling & Edge Cases

1. **Network Disconnection**: If `GET /orders/:id/reviews` fails with network error, gracefully fallback to `order.review = null` without blocking order detail loading.
2. **Race Condition (Already Reviewed in another tab/device)**: If user taps "Đánh giá", navigates to review screen, and submits, `OrderReviewScreen` catches 409 and redirects cleanly with friendly message.
3. **No Driver Assigned (Cancelled before dispatch)**: Rating button is strictly conditional on `order.status === 'DELIVERED'` and `assignedDriver != null`.

---

## 6. Automated Testing Plan

1. **Adapter Tests (`adapter.test.ts`)**:
   - Verify `getOrderDetailView` includes `rate-order` action when status is `DELIVERED` and no review exists.
   - Verify `getOrderDetailView` attaches `order.review` and omits `rate-order` action when review already exists.
2. **Screen Component Tests (`CustomerOrderDetailScreen.test.tsx`)**:
   - Renders "Đánh giá chuyến đi" button when order is delivered and unreviewed.
   - Renders "Đánh giá của bạn" card with correct star count and comment when review is present.
3. **RealtimeTrackingScreen Tests (`RealtimeTrackingScreen.test.tsx` / `deliveries-chat-review.test.tsx`)**:
   - Renders rating CTA when `trip.status === 'DELIVERED'`.
   - Calls `onReviewTrip` with haptic feedback on button press.
