# Spec: Customer App 3-Stage Gesture Bottom Sheet & One-Thumb Ergonomics Redesign

**Author:** LEOPARD Engineering & Design  
**Date:** 2026-09-17  
**Status:** Approved  
**Scope:** `apps/mobile` (Customer App booking flow)

---

## 1. Executive Summary & Goals

The Customer Mobile application currently presents a booking experience divided across disparate modals (`MapAddressPickerModal`, `SavedAddressPickerModal`, `BookingDetailsModal`) and top/center inputs that require two-handed manipulation and obscure the core route map.

This specification modernizes the booking interface using a **3-Stage Gesture Bottom Sheet** matching Apple Human Interface Guidelines (2026 HIG) and industry best practices for on-demand freight/ride-hailing:
1. **Stage 1 (Collapsed ~25% / 215pt):** Clean exploration mode with fast search prompt, quick-hub address chips, and high map visibility (75% screen).
2. **Stage 2 (Routing & Fleet Matrix ~58% / 490pt):** Activated immediately upon destination selection. Displays unified route card (pickup & dropoff), horizontal quick hubs, and a scrollable fleet matrix with live pricing (`BIKE_3W`, `VAN_500KG`, `TRUCK_125T`, `TRUCK_25T`), vehicle dimensions, and estimated ETA.
3. **Stage 3 (Expanded Details & Services ~88% / 750pt):** In-sheet progressive disclosure containing recipient details, loading support toggle, VAT invoice toggle, and segmented payment method selector (`VIETQR` / `CASH`).
4. **Permanent One-Thumb Sticky CTA:** A 54pt Midnight Navy (`#0B2545`) button permanently anchored at the bottom thumb zone with live price tag (`#F59E0B`), responsive to the selected vehicle and add-ons.

All existing `testID`s (`vehicle-row-${id}`, `home-main-cta-btn`, `hub-chip-*`, `btn-confirm-booking-details`) and underlying contracts (`estimateOrder`, `createOrder`, and `onConfirmBooking`) are preserved to maintain 100% pass rates across E2E test suites `01` through `06`.

---

## 2. Architectural Design & Component Hierarchy

### 2.1 File Structure Changes
- **Modify:** `apps/mobile/src/features/home/HomeDashboardScreen.tsx`
  - Replace full-screen modal overlays with the integrated 3-stage sheet.
  - Retain full-bleed Leaflet interactive map at Layer 0.
  - Implement spring-animated snap points using React Native `Animated` / gesture handling with `appleSpring.snappy` curve.
  - Maintain compatibility with `onConfirmBooking`, `onSelectVehicleAndBook`, `onCreateOrder`.
- **Modify:** `apps/mobile/src/features/home/components/BookingDetailsModal.tsx`
  - Re-export or integrate inner sections (`CARGO_CATEGORIES`, fee calculators, voucher rows) so they can be smoothly hosted inside Stage 3 of the bottom sheet or accessible as inline drawers without full-screen obstruction.
- **Verification / Regression Tests:**
  - `apps/mobile/src/features/home/HomeDashboardScreen.test.tsx`
  - `e2e/specs/01-happy-path.spec.ts` through `e2e/specs/06-order-conflicts.spec.ts`

### 2.2 Snap Points & State Machine
```
[Stage 1: Collapsed (25%)]  --- (Select dropoff / hub) ---> [Stage 2: Fleet Matrix (58%)]
           ^                                                                |
           |                                                       (Tap Next / Swipe Up)
           |                                                                v
(Tap Back / Reset) <---------------------------------------- [Stage 3: Details & Confirm (88%)]
```

- **Stage 1 (Initial / No dropoff):**
  - Prompt: "Bạn muốn chuyển hàng đi đâu?"
  - Quick Hub chips: Giao Lê Duẩn, KCN Tân Bình, Cảng Cát Lái...
  - CTA Label: "CHỌN ĐIỂM ĐẾN ĐỂ TÍNH GIÁ" (disabled or focuses search field)
- **Stage 2 (Dropoff Selected):**
  - Route Card: Pickup (123 Nguyễn Huệ) & Dropoff with edit actions.
  - Fleet Matrix: 4 vehicles with selected highlight, pricing, badge, and ETA.
  - CTA Label: "TIẾP TỤC ĐẶT XE · {price} ➔"
- **Stage 3 (Review & Customize):**
  - Add-on toggles (Bốc xếp, VAT).
  - Payment selector (VIETQR / CASH).
  - Recipient & cargo notes.
  - CTA Label: "XÁC NHẬN GỌI XE · {price} ➔"

---

## 3. UI/UX Specifications (Apple HIG Compliance)

1. **Color Tokens:**
   - Primary: `#0B2545` (Midnight Navy)
   - Accent: `#F59E0B` (Cheetah Amber)
   - Surface / Card: `#FFFFFF`
   - Background canvas: `#F8FAFC`
   - Border: `#E2E8F0`
2. **Typography (`typeScale`):**
   - Vehicle titles: `subheadline` (15pt, 700)
   - Section headers: `caption2` (11pt, 700, uppercase, letterSpacing 0.6)
   - Dimensions & notes: `caption1` (12pt, 400)
   - Pricing: JetBrains Mono / tabular figures (15pt, 800)
3. **Ergonomics:**
   - Sticky footer padding: 12pt top, 20pt bottom (safe area aware).
   - Touch targets >= 44x44pt.
   - 16pt continuous squircle border radius (`iosContinuousCurve`).

---

## 4. Test & Regression Guarantees
- `HomeDashboardScreen.test.tsx`: All unit tests for vehicle selection, price calculation, and booking confirmation must pass.
- E2E tests: Playwright specs 01-06 must locate existing testIDs without modification.
