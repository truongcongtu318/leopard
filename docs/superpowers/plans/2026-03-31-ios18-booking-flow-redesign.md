# iOS 18 Booking Flow Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Redesign the customer booking experience from an unwieldy Gesture Bottom Sheet into a seamless Apple HIG (iOS 17/18) multi-page navigation flow: Home → Search Address (`/customer/search-address`) → Full-Page Booking (`/customer/booking`), featuring dynamic pricing, live distance & stop surcharges, and comprehensive test coverage.

**Architecture:** We introduce two new Expo Router screens (`/customer/search-address` and `/customer/booking`) in `apps/mobile/app/customer/`, hide the floating TabBar during the booking flow, implement an in-memory draft store `bookingDraftStore` for state preservation and discard confirmation, and break down the full-page booking screen into modular Inset Grouped components compliant with Apple HIG design tokens from `@leopard/mobile-core`.

**Tech Stack:** React Native (Expo v57 / RN 0.86), Expo Router, TypeScript, `@leopard/mobile-core` (Tokens, SF Pro typeScale, continuous squircle curves), Jest, React Native Testing Library.

**Spec:** `docs/superpowers/specs/2026-03-31-ios18-booking-flow-redesign.md`

## Global Constraints

- **Design Standard:** Apple Human Interface Guidelines (iOS 17/18) Inset Grouped List on `systemGroupedBackground` (`#F2F2F7` / `#000000`).
- **Brand Accent:** Single brand accent Midnight Navy (`#0B2545` in Light, `#4D88DF` in Dark). No arbitrary colors; orange/red/green reserved strictly for semantic states.
- **Typography:** SF Pro Dynamic Type (`typeScale.<name>`), minimum 13pt for business-critical information. No hardcoded font sizes.
- **Touch Targets:** Minimum 44×44pt for all touchable controls (buttons, chips, delete badges, chevrons).
- **Pricing Rates:** Synchronized with `apps/api/.env`:
  - Xe Ba Gác: Base `70.000 đ`, `10.000 đ/km`, Loading `60.000 đ`
  - Xe Van 500kg: Base `130.000 đ`, `14.000 đ/km`, Loading `100.000 đ`
  - Xe Tải 1.25T (Default): Base `200.000 đ`, `18.000 đ/km`, Loading `150.000 đ`
  - Xe Tải 2.5T: Base `320.000 đ`, `22.000 đ/km`, Loading `250.000 đ`
  - Intermediate Stop Surcharge: `30.000 đ / stop`
  - VAT Invoice: `8%` on subtotal
- **Navigation:** Full page push navigation via Expo Router stack. Bottom sheet is strictly prohibited for the main booking screen. Tab bar is hidden during booking.

---

## File Structure

```
apps/mobile/
├── src/
│   └── features/
│       └── customer/
│           └── booking/
│               ├── phone-formatter.ts            # Phone number formatting (+84, strip leading 0, 90 123 4567)
│               ├── phone-formatter.test.ts
│               ├── booking-pricing.ts            # Real-time logistics pricing calculation & breakdown
│               ├── booking-pricing.test.ts
│               ├── booking-schema.ts             # Validation schema & rules
│               ├── booking-schema.test.ts
│               ├── bookingDraftStore.ts          # State store & dirty checking for discard action sheet
│               ├── bookingDraftStore.test.ts
│               ├── SearchAddressScreen.tsx       # Screen 1: Address search & recent/saved list
│               ├── SearchAddressScreen.test.tsx
│               ├── components/
│               │   ├── BookingRouteMapHeader.tsx # 180pt route header with glass back button & scroll inline title
│               │   ├── BookingRouteSection.tsx   # Section 1: Route cards with pickup, stops, dropoff
│               │   ├── BookingVehicleSection.tsx # Section 2: Vehicle list sorted by payload with checkmarks
│               │   ├── BookingReceiverSection.tsx# Section 3: Receiver name, contact picker, +84 phone input
│               │   ├── BookingCargoSection.tsx   # Section 4: Horizontal chips, multiline note, 72pt photos
│               │   ├── BookingServicesSection.tsx# Section 5: Loading toggle & VAT expansion in single card
│               │   ├── BookingPaymentSection.tsx # Section 6: VietQR & Cash payment selection
│               │   ├── BookingFixedBottomBar.tsx # Section 7: Sticky bottom bar with regularMaterial & CTA
│               │   ├── PriceDetailModal.tsx      # Sheet for transparent fare breakdown
│               │   └── DiscardBookingActionSheet.ts # iOS ActionSheet confirmation
│               ├── BookingScreen.tsx             # Screen 2: Assembled full-page booking screen
│               └── BookingScreen.test.tsx
├── app/
│   └── customer/
│       ├── _layout.tsx                           # Update to hide TabBar on search-address & booking
│       ├── search-address.tsx                    # Route for Address Search
│       └── booking.tsx                           # Route for Full-Page Booking
```

---

### Task 1: Core Logistics Pricing Engine & Phone Formatter

**Files:**
- Create: `apps/mobile/src/features/customer/booking/phone-formatter.ts`
- Create: `apps/mobile/src/features/customer/booking/phone-formatter.test.ts`
- Create: `apps/mobile/src/features/customer/booking/booking-pricing.ts`
- Create: `apps/mobile/src/features/customer/booking/booking-pricing.test.ts`

**Interfaces:**
- `formatVietnamPhoneNumber(raw: string): { display: string; rawDigits: string; isValid: boolean }`
- `calculateBookingFare(params: BookingPricingInput): BookingPricingBreakdown`

- [ ] **Step 1: Write failing tests for phone formatter**

```typescript
// apps/mobile/src/features/customer/booking/phone-formatter.test.ts
import { formatVietnamPhoneNumber } from './phone-formatter';

describe('formatVietnamPhoneNumber', () => {
  it('strips leading zero and formats 9 digits as "90 123 4567"', () => {
    const result = formatVietnamPhoneNumber('0901234567');
    expect(result.display).toBe('90 123 4567');
    expect(result.rawDigits).toBe('901234567');
    expect(result.isValid).toBe(true);
  });

  it('handles input without leading zero', () => {
    const result = formatVietnamPhoneNumber('901234567');
    expect(result.display).toBe('90 123 4567');
    expect(result.rawDigits).toBe('901234567');
    expect(result.isValid).toBe(true);
  });

  it('marks incomplete numbers as invalid', () => {
    const result = formatVietnamPhoneNumber('090123');
    expect(result.display).toBe('90 123');
    expect(result.isValid).toBe(false);
  });

  it('filters out non-digit characters', () => {
    const result = formatVietnamPhoneNumber('(090) 123-4567');
    expect(result.display).toBe('90 123 4567');
    expect(result.rawDigits).toBe('901234567');
    expect(result.isValid).toBe(true);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter mobile test -- src/features/customer/booking/phone-formatter.test.ts`  
Expected: FAIL (module not found).

- [ ] **Step 3: Implement phone formatter**

```typescript
// apps/mobile/src/features/customer/booking/phone-formatter.ts
export interface FormattedPhone {
  display: string;
  rawDigits: string;
  isValid: boolean;
}

export function formatVietnamPhoneNumber(input: string): FormattedPhone {
  let digits = input.replace(/\D/g, '');
  if (digits.startsWith('84')) {
    digits = digits.slice(2);
  }
  if (digits.startsWith('0')) {
    digits = digits.slice(1);
  }
  const cleanDigits = digits.slice(0, 9);

  let formatted = '';
  if (cleanDigits.length > 0) {
    formatted = cleanDigits.slice(0, 2);
    if (cleanDigits.length > 2) {
      formatted += ' ' + cleanDigits.slice(2, 5);
      if (cleanDigits.length > 5) {
        formatted += ' ' + cleanDigits.slice(5, 9);
      }
    }
  }

  const isValid = cleanDigits.length === 9 && ['3', '5', '7', '8', '9'].includes(cleanDigits[0] ?? '');
  return {
    display: formatted,
    rawDigits: cleanDigits,
    isValid,
  };
}
```

- [ ] **Step 4: Write failing tests for booking pricing**

```typescript
// apps/mobile/src/features/customer/booking/booking-pricing.test.ts
import { calculateBookingFare, VEHICLE_RATES } from './booking-pricing';

describe('calculateBookingFare', () => {
  it('calculates default Truck 1.25T fare for baseline 12.5km without add-ons', () => {
    const breakdown = calculateBookingFare({
      vehicleId: 'TRUCK_125T',
      distanceKm: 12.5,
      stopCount: 0,
      hasLoadingSupport: false,
      hasVatInvoice: false,
    });

    // Base fare: 200,000 VND. Distance fare: 12.5 * 18,000 = 225,000 VND
    // Transport fare: max(200,000, 225,000) = 225,000 VND
    expect(breakdown.baseFare).toBe(200_000);
    expect(breakdown.distanceFare).toBe(225_000);
    expect(breakdown.stopFare).toBe(0);
    expect(breakdown.loadingFee).toBe(0);
    expect(breakdown.vatFee).toBe(0);
    expect(breakdown.totalFare).toBe(225_000);
  });

  it('guarantees minimum base fare when distance fare is smaller than base fare', () => {
    const breakdown = calculateBookingFare({
      vehicleId: 'TRUCK_125T',
      distanceKm: 4.0, // 4 * 18,000 = 72,000 < 200,000 base
      stopCount: 0,
      hasLoadingSupport: false,
      hasVatInvoice: false,
    });

    expect(breakdown.transportFare).toBe(200_000);
    expect(breakdown.totalFare).toBe(200_000);
  });

  it('accurately calculates State 7 (Base 200k + Loading 150k + VAT 8% = 378k) when distance within base fare', () => {
    const breakdown = calculateBookingFare({
      vehicleId: 'TRUCK_125T',
      distanceKm: 5.0,
      stopCount: 0,
      hasLoadingSupport: true,
      hasVatInvoice: true,
    });

    // Transport fare = 200,000
    // Loading fee = 150,000
    // Subtotal = 350,000
    // VAT 8% = 28,000
    // Total = 378,000
    expect(breakdown.transportFare).toBe(200_000);
    expect(breakdown.loadingFee).toBe(150_000);
    expect(breakdown.subtotal).toBe(350_000);
    expect(breakdown.vatFee).toBe(28_000);
    expect(breakdown.totalFare).toBe(378_000);
  });

  it('includes intermediate stop surcharges at 30,000 VND per stop', () => {
    const breakdown = calculateBookingFare({
      vehicleId: 'TRUCK_125T',
      distanceKm: 5.0,
      stopCount: 2,
      hasLoadingSupport: false,
      hasVatInvoice: false,
    });

    expect(breakdown.stopFare).toBe(60_000);
    expect(breakdown.transportFare).toBe(260_000);
    expect(breakdown.totalFare).toBe(260_000);
  });
});
```

- [ ] **Step 5: Implement booking pricing engine**

```typescript
// apps/mobile/src/features/customer/booking/booking-pricing.ts
export type VehicleTypeId = 'BIKE_3W' | 'VAN_500KG' | 'TRUCK_125T' | 'TRUCK_25T';

export interface VehicleRateConfig {
  id: VehicleTypeId;
  name: string;
  tag: string;
  capacityKg: number;
  dimensions: string;
  etaMinutes: number;
  baseFareVnd: number;
  perKmVnd: number;
  loadingFeeVnd: number;
}

export const VEHICLE_RATES: Record<VehicleTypeId, VehicleRateConfig> = {
  BIKE_3W: {
    id: 'BIKE_3W',
    name: 'Xe Ba Gác',
    tag: 'Tiết kiệm',
    capacityKg: 500,
    dimensions: '1.4×1.0×1.2m',
    etaMinutes: 5,
    baseFareVnd: 70_000,
    perKmVnd: 10_000,
    loadingFeeVnd: 60_000,
  },
  VAN_500KG: {
    id: 'VAN_500KG',
    name: 'Xe Van 500kg',
    tag: 'Đô thị',
    capacityKg: 500,
    dimensions: '1.8×1.2×1.2m',
    etaMinutes: 8,
    baseFareVnd: 130_000,
    perKmVnd: 14_000,
    loadingFeeVnd: 100_000,
  },
  TRUCK_125T: {
    id: 'TRUCK_125T',
    name: 'Xe Tải 1.25 Tấn',
    tag: 'Phổ biến',
    capacityKg: 1_250,
    dimensions: '3.2×1.6×1.7m',
    etaMinutes: 12,
    baseFareVnd: 200_000,
    perKmVnd: 18_000,
    loadingFeeVnd: 150_000,
  },
  TRUCK_25T: {
    id: 'TRUCK_25T',
    name: 'Xe Tải 2.5 Tấn',
    tag: 'Tải lớn',
    capacityKg: 2_500,
    dimensions: '4.3×1.8×1.9m',
    etaMinutes: 15,
    baseFareVnd: 320_000,
    perKmVnd: 22_000,
    loadingFeeVnd: 250_000,
  },
};

export const STOP_SURCHARGE_VND = 30_000;
export const VAT_RATE = 0.08;

export interface BookingPricingInput {
  vehicleId: VehicleTypeId;
  distanceKm: number;
  stopCount?: number;
  hasLoadingSupport?: boolean;
  hasVatInvoice?: boolean;
}

export interface BookingPricingBreakdown {
  vehicleId: VehicleTypeId;
  vehicleName: string;
  baseFare: number;
  distanceFare: number;
  stopFare: number;
  transportFare: number;
  loadingFee: number;
  subtotal: number;
  vatFee: number;
  totalFare: number;
}

export function calculateBookingFare(input: BookingPricingInput): BookingPricingBreakdown {
  const rate = VEHICLE_RATES[input.vehicleId] ?? VEHICLE_RATES.TRUCK_125T;
  const stopCount = Math.max(0, input.stopCount ?? 0);
  const distanceFare = Math.round(input.distanceKm * rate.perKmVnd);
  const stopFare = stopCount * STOP_SURCHARGE_VND;
  const transportFare = Math.max(rate.baseFareVnd, distanceFare) + stopFare;

  const loadingFee = input.hasLoadingSupport ? rate.loadingFeeVnd : 0;
  const subtotal = transportFare + loadingFee;
  const vatFee = input.hasVatInvoice ? Math.round(subtotal * VAT_RATE) : 0;
  const totalFare = subtotal + vatFee;

  return {
    vehicleId: rate.id,
    vehicleName: rate.name,
    baseFare: rate.baseFareVnd,
    distanceFare,
    stopFare,
    transportFare,
    loadingFee,
    subtotal,
    vatFee,
    totalFare,
  };
}
```

- [ ] **Step 6: Run tests to verify they pass**

Run: `pnpm --filter mobile test -- src/features/customer/booking/phone-formatter.test.ts src/features/customer/booking/booking-pricing.test.ts`  
Expected: PASS (all tests pass).

- [ ] **Step 7: Commit**

```bash
git add apps/mobile/src/features/customer/booking/phone-formatter.ts apps/mobile/src/features/customer/booking/phone-formatter.test.ts apps/mobile/src/features/customer/booking/booking-pricing.ts apps/mobile/src/features/customer/booking/booking-pricing.test.ts
git commit -m "feat(booking): implement logistics pricing engine and phone formatter"
```

---

### Task 2: Booking Schema & Draft Store with Discard Detection

**Files:**
- Create: `apps/mobile/src/features/customer/booking/booking-schema.ts`
- Create: `apps/mobile/src/features/customer/booking/booking-schema.test.ts`
- Create: `apps/mobile/src/features/customer/booking/bookingDraftStore.ts`
- Create: `apps/mobile/src/features/customer/booking/bookingDraftStore.test.ts`

**Interfaces:**
- `validateBookingForm(draft: BookingDraftState): { isValid: boolean; errors: Record<string, string> }`
- `bookingDraftStore`: methods `getDraft()`, `setDraft()`, `reset()`, `isDirty()`, `subscribe()`

- [ ] **Step 1: Write failing tests for booking validation schema**

```typescript
// apps/mobile/src/features/customer/booking/booking-schema.test.ts
import { validateBookingForm, type BookingDraftState } from './booking-schema';

describe('validateBookingForm', () => {
  const validDraft: BookingDraftState = {
    pickupAddress: 'Kho VLXD Đại Phát, 120 Song Hành, Q.12',
    dropoffAddress: 'Công trình Jamona City, Đào Trí, Q.7',
    stops: [],
    vehicleId: 'TRUCK_125T',
    receiverName: 'Anh Tuấn',
    receiverPhone: '90 123 4567',
    cargoCategory: 'Vật liệu XD',
    cargoNote: '40 bao xi măng INSEE',
    cargoImages: ['file:///img1.jpg'],
    hasLoadingSupport: true,
    hasVatInvoice: false,
    paymentMethod: 'VIETQR',
  };

  it('returns valid when all required fields are satisfied', () => {
    const result = validateBookingForm(validDraft);
    expect(result.isValid).toBe(true);
    expect(Object.keys(result.errors).length).toBe(0);
  });

  it('detects error when pickup and dropoff addresses are identical', () => {
    const result = validateBookingForm({
      ...validDraft,
      dropoffAddress: validDraft.pickupAddress,
    });
    expect(result.isValid).toBe(false);
    expect(result.errors.route).toBe('Điểm giao hàng không được trùng với điểm lấy hàng');
  });

  it('detects missing receiver name', () => {
    const result = validateBookingForm({
      ...validDraft,
      receiverName: '   ',
    });
    expect(result.isValid).toBe(false);
    expect(result.errors.receiverName).toBe('Vui lòng nhập họ và tên người nhận');
  });

  it('detects invalid receiver phone number', () => {
    const result = validateBookingForm({
      ...validDraft,
      receiverPhone: '90 123',
    });
    expect(result.isValid).toBe(false);
    expect(result.errors.receiverPhone).toBe('Số điện thoại không hợp lệ (cần đủ 9 chữ số)');
  });

  it('enforces VAT invoice fields when hasVatInvoice is true', () => {
    const result = validateBookingForm({
      ...validDraft,
      hasVatInvoice: true,
      vatCompany: '',
      vatTaxId: '',
      vatEmail: 'invalid-email',
    });
    expect(result.isValid).toBe(false);
    expect(result.errors.vatCompany).toBe('Vui lòng nhập tên công ty');
    expect(result.errors.vatTaxId).toBe('Vui lòng nhập mã số thuế');
    expect(result.errors.vatEmail).toBe('Email nhận hóa đơn không hợp lệ');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter mobile test -- src/features/customer/booking/booking-schema.test.ts`  
Expected: FAIL.

- [ ] **Step 3: Implement booking validation schema**

```typescript
// apps/mobile/src/features/customer/booking/booking-schema.ts
import { formatVietnamPhoneNumber } from './phone-formatter';
import type { VehicleTypeId } from './booking-pricing';

export type CargoCategory = 'Kiện hàng' | 'May mặc' | 'Vật liệu XD' | 'Nội thất' | 'Khác';
export type PaymentMethod = 'VIETQR' | 'CASH';

export interface RouteStop {
  id: string;
  address: string;
  lat?: number;
  lng?: number;
}

export interface BookingDraftState {
  pickupAddress: string;
  pickupLat?: number;
  pickupLng?: number;
  dropoffAddress: string;
  dropoffLat?: number;
  dropoffLng?: number;
  stops: RouteStop[];
  vehicleId: VehicleTypeId;
  receiverName: string;
  receiverPhone: string;
  cargoCategory: CargoCategory;
  cargoNote?: string;
  cargoImages: string[];
  hasLoadingSupport: boolean;
  hasVatInvoice: boolean;
  vatCompany?: string;
  vatTaxId?: string;
  vatEmail?: string;
  paymentMethod: PaymentMethod;
}

export function validateBookingForm(draft: BookingDraftState): {
  isValid: boolean;
  errors: Record<string, string>;
} {
  const errors: Record<string, string> = {};

  if (!draft.pickupAddress.trim() || !draft.dropoffAddress.trim()) {
    errors.route = 'Vui lòng chọn đầy đủ điểm lấy và điểm giao';
  } else if (draft.pickupAddress.trim().toLowerCase() === draft.dropoffAddress.trim().toLowerCase()) {
    errors.route = 'Điểm giao hàng không được trùng với điểm lấy hàng';
  }

  if (!draft.receiverName.trim()) {
    errors.receiverName = 'Vui lòng nhập họ và tên người nhận';
  }

  const phoneCheck = formatVietnamPhoneNumber(draft.receiverPhone);
  if (!phoneCheck.isValid) {
    errors.receiverPhone = 'Số điện thoại không hợp lệ (cần đủ 9 chữ số)';
  }

  if (draft.hasVatInvoice) {
    if (!draft.vatCompany?.trim()) {
      errors.vatCompany = 'Vui lòng nhập tên công ty';
    }
    if (!draft.vatTaxId?.trim()) {
      errors.vatTaxId = 'Vui lòng nhập mã số thuế';
    }
    const email = draft.vatEmail?.trim() ?? '';
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email || !emailRegex.test(email)) {
      errors.vatEmail = 'Email nhận hóa đơn không hợp lệ';
    }
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
}
```

- [ ] **Step 4: Implement booking draft store with dirty checking and write its tests**

```typescript
// apps/mobile/src/features/customer/booking/bookingDraftStore.test.ts
import { bookingDraftStore } from './bookingDraftStore';

describe('bookingDraftStore', () => {
  beforeEach(() => {
    bookingDraftStore.reset();
  });

  it('initializes with default values and is not dirty', () => {
    expect(bookingDraftStore.isDirty()).toBe(false);
    expect(bookingDraftStore.getDraft().vehicleId).toBe('TRUCK_125T');
  });

  it('marks store as dirty when receiver name or phone is entered', () => {
    bookingDraftStore.updateDraft({ receiverName: 'Anh Tuấn' });
    expect(bookingDraftStore.isDirty()).toBe(true);
  });

  it('marks store as dirty when toggling services or cargo category', () => {
    bookingDraftStore.updateDraft({ hasLoadingSupport: true });
    expect(bookingDraftStore.isDirty()).toBe(true);
  });
});
```

```typescript
// apps/mobile/src/features/customer/booking/bookingDraftStore.ts
import type { BookingDraftState } from './booking-schema';

const DEFAULT_DRAFT: BookingDraftState = {
  pickupAddress: '',
  dropoffAddress: '',
  stops: [],
  vehicleId: 'TRUCK_125T',
  receiverName: '',
  receiverPhone: '',
  cargoCategory: 'Vật liệu XD',
  cargoNote: '',
  cargoImages: [],
  hasLoadingSupport: false,
  hasVatInvoice: false,
  vatCompany: '',
  vatTaxId: '',
  vatEmail: '',
  paymentMethod: 'VIETQR',
};

let currentDraft: BookingDraftState = { ...DEFAULT_DRAFT };
let initialSignature = JSON.stringify(DEFAULT_DRAFT);
const listeners = new Set<() => void>();

export const bookingDraftStore = {
  getDraft: (): BookingDraftState => currentDraft,
  initDraft: (initial: Partial<BookingDraftState>) => {
    currentDraft = { ...DEFAULT_DRAFT, ...initial };
    initialSignature = JSON.stringify({
      ...DEFAULT_DRAFT,
      pickupAddress: initial.pickupAddress ?? '',
      dropoffAddress: initial.dropoffAddress ?? '',
      vehicleId: initial.vehicleId ?? 'TRUCK_125T',
    });
    listeners.forEach((l) => l());
  },
  updateDraft: (updates: Partial<BookingDraftState>) => {
    currentDraft = { ...currentDraft, ...updates };
    listeners.forEach((l) => l());
  },
  reset: () => {
    currentDraft = { ...DEFAULT_DRAFT };
    initialSignature = JSON.stringify(DEFAULT_DRAFT);
    listeners.forEach((l) => l());
  },
  isDirty: (): boolean => {
    return (
      currentDraft.receiverName.trim().length > 0 ||
      currentDraft.receiverPhone.trim().length > 0 ||
      (currentDraft.cargoNote?.trim().length ?? 0) > 0 ||
      currentDraft.cargoImages.length > 0 ||
      currentDraft.hasLoadingSupport ||
      currentDraft.hasVatInvoice ||
      currentDraft.stops.length > 0 ||
      currentDraft.vehicleId !== 'TRUCK_125T'
    );
  },
  subscribe: (listener: () => void) => {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },
};
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `pnpm --filter mobile test -- src/features/customer/booking/booking-schema.test.ts src/features/customer/booking/bookingDraftStore.test.ts`  
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add apps/mobile/src/features/customer/booking/booking-schema.ts apps/mobile/src/features/customer/booking/booking-schema.test.ts apps/mobile/src/features/customer/booking/bookingDraftStore.ts apps/mobile/src/features/customer/booking/bookingDraftStore.test.ts
git commit -m "feat(booking): add booking validation schema and draft store"
```

---

### Task 3: Screen 1 — Search Address Screen (`SearchAddressScreen.tsx`)

**Files:**
- Create: `apps/mobile/src/features/customer/booking/SearchAddressScreen.tsx`
- Create: `apps/mobile/src/features/customer/booking/SearchAddressScreen.test.tsx`
- Create: `apps/mobile/app/customer/search-address.tsx`
- Modify: `apps/mobile/app/customer/_layout.tsx` (hide TabBar for search-address)

**Interfaces:**
- `SearchAddressScreen`: Props `onSelectAddress: (address: string, coords?: { lat: number; lng: number }) => void; onBack: () => void; initialQuery?: string`

- [ ] **Step 1: Write failing tests for SearchAddressScreen**

```typescript
// apps/mobile/src/features/customer/booking/SearchAddressScreen.test.tsx
import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { SearchAddressScreen } from './SearchAddressScreen';

describe('SearchAddressScreen', () => {
  it('renders search input with autoFocus and shows "Chọn trên bản đồ" card', () => {
    const onSelect = jest.fn();
    const onBack = jest.fn();
    const { getByPlaceholderText, getByText } = render(
      <SearchAddressScreen onBack={onBack} onSelectAddress={onSelect} />
    );

    expect(getByPlaceholderText('Tìm địa chỉ giao hàng')).toBeTruthy();
    expect(getByText('Chọn trên bản đồ')).toBeTruthy();
  });

  it('renders recent and saved addresses when search query is empty', () => {
    const { getByText } = render(
      <SearchAddressScreen onBack={jest.fn()} onSelectAddress={jest.fn()} />
    );

    expect(getByText('GẦN ĐÂY')).toBeTruthy();
    expect(getByText('SỔ ĐỊA CHỈ')).toBeTruthy();
  });

  it('triggers onSelectAddress when a recent or search item is tapped', () => {
    const onSelect = jest.fn();
    const { getByText } = render(
      <SearchAddressScreen onBack={jest.fn()} onSelectAddress={onSelect} />
    );

    const firstRecentItem = getByText('Công trình Jamona City');
    fireEvent.press(firstRecentItem);

    expect(onSelect).toHaveBeenCalledWith(
      expect.stringContaining('Jamona'),
      expect.anything()
    );
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter mobile test -- src/features/customer/booking/SearchAddressScreen.test.tsx`  
Expected: FAIL.

- [ ] **Step 3: Implement SearchAddressScreen**

Create `apps/mobile/src/features/customer/booking/SearchAddressScreen.tsx`:
- Clean iOS 17 Inset Grouped search view.
- 44×44pt chevron back button.
- Search input with clear `xmark` button and active query bolding.
- Pinned "Chọn trên bản đồ" row with accent Navy icon.
- Recent and Saved address sections with distance alignment.
- Empty search state with map fallback recommendation.

- [ ] **Step 4: Create Expo Router entry route and register in `CustomerLayout`**

Create `apps/mobile/app/customer/search-address.tsx`:
```typescript
import React from 'react';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { SearchAddressScreen } from '../../src/features/customer/booking/SearchAddressScreen';

export default function SearchAddressPage() {
  const router = useRouter();
  const params = useLocalSearchParams<{ query?: string }>();

  return (
    <SearchAddressScreen
      initialQuery={params.query}
      onBack={() => router.back()}
      onSelectAddress={(address, coords) => {
        router.push({
          pathname: '/customer/booking',
          params: {
            dropoff: address,
            dropoffLat: coords?.lat ? String(coords.lat) : undefined,
            dropoffLng: coords?.lng ? String(coords.lng) : undefined,
          },
        });
      }}
    />
  );
}
```

Update `apps/mobile/app/customer/_layout.tsx`:
Add `pathname.includes('/customer/search-address')` and `pathname.includes('/customer/booking')` to `isSubScreenWithoutNav`.

- [ ] **Step 5: Run tests to verify they pass**

Run: `pnpm --filter mobile test -- src/features/customer/booking/SearchAddressScreen.test.tsx`  
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add apps/mobile/src/features/customer/booking/SearchAddressScreen.tsx apps/mobile/src/features/customer/booking/SearchAddressScreen.test.tsx apps/mobile/app/customer/search-address.tsx apps/mobile/app/customer/_layout.tsx
git commit -m "feat(booking): implement SearchAddressScreen and register search-address route"
```

---

### Task 4: Modular Sections for Full-Page Booking Screen

**Files:**
- Create: `apps/mobile/src/features/customer/booking/components/BookingRouteMapHeader.tsx`
- Create: `apps/mobile/src/features/customer/booking/components/BookingRouteSection.tsx`
- Create: `apps/mobile/src/features/customer/booking/components/BookingVehicleSection.tsx`
- Create: `apps/mobile/src/features/customer/booking/components/BookingReceiverSection.tsx`
- Create: `apps/mobile/src/features/customer/booking/components/BookingCargoSection.tsx`
- Create: `apps/mobile/src/features/customer/booking/components/BookingServicesSection.tsx`
- Create: `apps/mobile/src/features/customer/booking/components/BookingPaymentSection.tsx`
- Create: `apps/mobile/src/features/customer/booking/components/BookingFixedBottomBar.tsx`
- Create: `apps/mobile/src/features/customer/booking/components/PriceDetailModal.tsx`
- Create: `apps/mobile/src/features/customer/booking/components/booking-components.test.tsx`

**Requirements per section:**
1. `BookingRouteMapHeader`: Height 180pt, glass back button (44pt circle), static schematic route view, scroll-animated inline title.
2. `BookingRouteSection`: Overlaps map by -16pt with subtle shadow. Green circle with tag "Kho", red square dropoff, dotted connector line, "+ Thêm điểm dừng" button, error state if pickup === dropoff.
3. `BookingVehicleSection`: Sorted ascending by payload (Ba Gác 70k → Van 130k → Tải 1.25T 200k → Tải 2.5T 320k). Single checkmark (NO radio button), highlight selected row, "Xem kích thước thùng xe" link.
4. `BookingReceiverSection`: Receiver name with contacts button, separate `+84` prefix with auto-formatted `90 123 4567` digits. Red error message below fields.
5. `BookingCargoSection`: Horizontal chip selector (Kiện hàng, May mặc, Vật liệu XD, Nội thất, Khác) with fade edge, multiline note, 72pt thumbnail grid with max 5 photos and ≥44pt delete touch area.
6. `BookingServicesSection`: SINGLE Inset Grouped card, toggle Loading support (+150k), toggle VAT invoice (+8%) with accordion reveal for Company, Tax ID, Email.
7. `BookingPaymentSection`: VietQR (Khuyên dùng) and Cash with checkmark.
8. `BookingFixedBottomBar`: Sticky bottom bar with regularMaterial, total fare display, "Chi tiết ⌵" button, 50pt primary CTA button (disabled when form invalid).
9. `PriceDetailModal`: Medium presentation sheet displaying full itemized breakdown (Base fare, Distance fare, Stop surcharges, Loading fee, VAT, Total).

- [ ] **Step 1: Write failing tests for booking sections**

```typescript
// apps/mobile/src/features/customer/booking/components/booking-components.test.tsx
import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { BookingVehicleSection } from './BookingVehicleSection';
import { BookingServicesSection } from './BookingServicesSection';
import { BookingFixedBottomBar } from './BookingFixedBottomBar';

describe('Booking Modular Components', () => {
  it('BookingVehicleSection renders vehicles and selects via checkmark without radio buttons', () => {
    const onSelect = jest.fn();
    const { getByText, queryByRole } = render(
      <BookingVehicleSection selectedVehicleId="TRUCK_125T" onSelectVehicle={onSelect} />
    );

    expect(getByText('Xe Tải 1.25 Tấn')).toBeTruthy();
    expect(getByText('200.000 đ')).toBeTruthy();
    expect(queryByRole('radio')).toBeNull();

    fireEvent.press(getByText('Xe Tải 2.5 Tấn'));
    expect(onSelect).toHaveBeenCalledWith('TRUCK_25T');
  });

  it('BookingServicesSection reveals VAT fields when toggle is enabled', () => {
    const onToggleVat = jest.fn();
    const { getByText, queryByPlaceholderText } = render(
      <BookingServicesSection
        hasLoadingSupport={false}
        hasVatInvoice={false}
        onToggleLoading={jest.fn()}
        onToggleVat={onToggleVat}
        vatCompany=""
        vatTaxId=""
        vatEmail=""
        onChangeVatField={jest.fn()}
      />
    );

    expect(getByText('Xuất hóa đơn VAT')).toBeTruthy();
    expect(queryByPlaceholderText('Tên công ty')).toBeNull();
  });

  it('BookingFixedBottomBar disables CTA button when isValid is false', () => {
    const onBook = jest.fn();
    const { getByText } = render(
      <BookingFixedBottomBar
        totalFare={200_000}
        isValid={false}
        onPressBook={onBook}
        onPressDetails={jest.fn()}
      />
    );

    const ctaButton = getByText('Đặt xe');
    fireEvent.press(ctaButton);
    expect(onBook).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter mobile test -- src/features/customer/booking/components/booking-components.test.tsx`  
Expected: FAIL.

- [ ] **Step 3: Implement modular components**

Implement:
1. `BookingRouteMapHeader.tsx`
2. `BookingRouteSection.tsx`
3. `BookingVehicleSection.tsx`
4. `BookingReceiverSection.tsx`
5. `BookingCargoSection.tsx`
6. `BookingServicesSection.tsx`
7. `BookingPaymentSection.tsx`
8. `BookingFixedBottomBar.tsx`
9. `PriceDetailModal.tsx`

Ensure all components use:
- `customerPalette.primary` (`#0B2545`) as single brand accent.
- `typeScale` from `@leopard/mobile-core`.
- `iosContinuousCurve` for squircles.
- Minimum 44×44pt touch areas.

- [ ] **Step 4: Run tests to verify they pass**

Run: `pnpm --filter mobile test -- src/features/customer/booking/components/booking-components.test.tsx`  
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/mobile/src/features/customer/booking/components/
git commit -m "feat(booking): implement modular Apple HIG booking components"
```

---

### Task 5: Screen 2 — Full-Page Booking Screen & Discard Action Sheet

**Files:**
- Create: `apps/mobile/src/features/customer/booking/BookingScreen.tsx`
- Create: `apps/mobile/src/features/customer/booking/BookingScreen.test.tsx`
- Create: `apps/mobile/app/customer/booking.tsx`
- Modify: `apps/mobile/app/customer/home/index.tsx` (Connect search field to `/customer/search-address`)

**Interfaces:**
- `BookingScreen`: Complete full-page booking view supporting all 10 states (Scrolled nav bar, phone keyboard accessory, validation errors, live price recalculation, detail sheet, discard action sheet, and dark mode tokens).

- [ ] **Step 1: Write failing tests for BookingScreen**

```typescript
// apps/mobile/src/features/customer/booking/BookingScreen.test.tsx
import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { BookingScreen } from './BookingScreen';

describe('BookingScreen Full Page Flow', () => {
  it('renders default route, vehicle 1.25T, and 200,000 VND total fare', () => {
    const { getByText } = render(
      <BookingScreen
        initialPickup="Kho VLXD Đại Phát"
        initialDropoff="Công trình Jamona City"
        distanceKm={5.0}
      />
    );

    expect(getByText('Kho VLXD Đại Phát')).toBeTruthy();
    expect(getByText('Công trình Jamona City')).toBeTruthy();
    expect(getByText('200.000 đ')).toBeTruthy();
  });

  it('recalculates fare live to 378,000 VND when loading (+150k) and VAT (+8%) are enabled', () => {
    const { getByText, getAllByText } = render(
      <BookingScreen
        initialPickup="Kho VLXD Đại Phát"
        initialDropoff="Công trình Jamona City"
        distanceKm={5.0}
      />
    );

    // Toggle loading
    const loadingToggle = getByText('Tài xế hỗ trợ bốc xếp');
    fireEvent.press(loadingToggle);

    // Toggle VAT
    const vatToggle = getByText('Xuất hóa đơn VAT');
    fireEvent.press(vatToggle);

    // 200k + 150k = 350k; VAT 8% = 28k => Total 378k
    expect(getAllByText('378.000 đ').length).toBeGreaterThan(0);
  });

  it('opens Price Detail Sheet when "Chi tiết ⌵" is tapped', () => {
    const { getByText } = render(
      <BookingScreen
        initialPickup="Kho VLXD Đại Phát"
        initialDropoff="Công trình Jamona City"
        distanceKm={5.0}
      />
    );

    fireEvent.press(getByText('Chi tiết ⌵'));
    expect(getByText('Chi tiết cước vận chuyển')).toBeTruthy();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter mobile test -- src/features/customer/booking/BookingScreen.test.tsx`  
Expected: FAIL.

- [ ] **Step 3: Implement BookingScreen**

Create `apps/mobile/src/features/customer/booking/BookingScreen.tsx`:
- Assemble `BookingRouteMapHeader`, `BookingRouteSection`, `BookingVehicleSection`, `BookingReceiverSection`, `BookingCargoSection`, `BookingServicesSection`, `BookingPaymentSection`, `BookingFixedBottomBar`, and `PriceDetailModal`.
- Support animated navigation bar on scroll (inline title "Đặt xe").
- Hide bottom bar and display Keyboard Accessory toolbar when entering phone or text inputs.
- Wire native ActionSheet confirmation on Back press when `bookingDraftStore.isDirty()` is true.
- Connect order confirmation submission to `createCustomerHttpAdapter().createOrder`.

- [ ] **Step 4: Create Expo Router entry route `apps/mobile/app/customer/booking.tsx`**

```typescript
import React from 'react';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { BookingScreen } from '../../src/features/customer/booking/BookingScreen';
import { addressStore } from '../../src/features/customer/addresses/address-store';

export default function CustomerBookingPage() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    pickup?: string;
    pickupLat?: string;
    pickupLng?: string;
    dropoff?: string;
    dropoffLat?: string;
    dropoffLng?: string;
  }>();

  const defaultAddr = addressStore.getDefaultAddress();
  const pickup = params.pickup || defaultAddr?.address || 'Kho VLXD Đại Phát - 120 Song Hành, Q.12';
  const dropoff = params.dropoff || 'Công trình Jamona City, Đào Trí, P. Phú Thuận, Q.7';

  return (
    <BookingScreen
      distanceKm={12.5}
      initialDropoff={dropoff}
      initialPickup={pickup}
      onBack={() => router.back()}
      onOrderCreated={(orderId) => {
        router.push(`/customer/orders/searching/${orderId}`);
      }}
    />
  );
}
```

- [ ] **Step 5: Connect Home search input to the new flow**

In `apps/mobile/app/customer/home/index.tsx` and `HomeDashboardScreen.tsx`:
- When tapping the search bar `cr-dropoff-input` ➔ push to `/customer/search-address`.
- When tapping a quick chip or saved address ➔ push directly to `/customer/booking?dropoff=...`.

- [ ] **Step 6: Run tests to verify they pass**

Run: `pnpm --filter mobile test -- src/features/customer/booking/BookingScreen.test.tsx`  
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add apps/mobile/src/features/customer/booking/BookingScreen.tsx apps/mobile/src/features/customer/booking/BookingScreen.test.tsx apps/mobile/app/customer/booking.tsx apps/mobile/app/customer/home/index.tsx
git commit -m "feat(booking): implement full-page BookingScreen and integrate navigation flow"
```

---

### Task 6: Full Suite Verification & 10 States Quality Gate

**Files:**
- Run: Entire mobile test suite
- Check: All 10 states from spec

- [ ] **Step 1: Run complete mobile test suite**

Run: `pnpm --filter mobile test`  
Expected: All tests pass without regression.

- [ ] **Step 2: Run typecheck and linter**

Run: `pnpm --filter mobile typecheck`  
Expected: No type errors.

- [ ] **Step 3: Verification of all 10 states**
1. Flow 3 frames: Home → Search Address → Booking (tested).
2. Search Address: empty, active search, no-result, location permission banner (tested).
3. Booking default: 180pt map preview, 1.25T truck, 200,000 VND (tested).
4. Scrolled state: inline nav bar "Đặt xe", sticky bottom bar (tested).
5. Phone input: keyboard accessory active, bottom bar hidden (tested).
6. Validation errors: red message below fields, CTA button disabled (tested).
7. Live pricing: Base 200k + Loading 150k + VAT 8% = 378,000 VND (tested).
8. Price detail sheet: itemized transparent breakdown (tested).
9. Action sheet: discard confirmation on back when dirty (tested).
10. Dark Mode: color contrast parity with WCAG standards (tested).

- [ ] **Step 4: Final commit**

```bash
git commit -am "chore(booking): complete iOS 18 full-page booking flow verification"
```
