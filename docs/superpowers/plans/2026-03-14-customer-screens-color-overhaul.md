# Plan: Comprehensive UI/UX Color Overhaul for All Mobile Customer Screens

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Eliminate "Fruit-Salad" color inconsistencies across all Customer screens in `apps/mobile` and `packages/mobile-core`, unifying them under Apple Human Interface Guidelines (HIG) with Midnight Navy (`#0B1E42`) as primary action/active color, neutral backgrounds (`#FFFFFF` / `#F8FAFC`), and Leopard Amber (`#F59E0B`) strictly as an intentional brand accent (VIP badges, ratings, reward vouchers).

**Architecture:** Update foundation design tokens in `tokens.ts` (`customerPalette`), then propagate clean semantic colors across all customer modules: Home/Booking, Profile/Account, Orders/Tracking, Wallet/Payments, Addresses, and auxiliary screens. Ensure WCAG 2.1 AA contrast compliance (>=4.5:1 for normal text, >=3:1 for large text) on every updated screen.

**Tech Stack:** React Native (0.86), Expo (57), TypeScript, Jest, `@testing-library/react-native`.

**Spec:** `docs/ui/03-screen-specs.md` and Apple Human Interface Guidelines (Clarity, Deference, Depth).

## Global Constraints

- Primary action color is Midnight Navy (`#0B1E42`); text on primary buttons must be White (`#FFFFFF`).
- Secondary brand highlight is Leopard Amber (`#F59E0B`); used only for VIP tiers, star ratings, and promo tags; never for full-bleed buttons with white text (to avoid WCAG 2.16:1 failure).
- Secondary/muted text must use `#64748B` (WCAG 4.6:1 contrast ratio on white).
- All tappable controls must maintain minimum touch targets of >=44pt.
- No new third-party dependencies.
- Zero regressions in existing 596+ unit tests across `packages/mobile-core` and `apps/mobile`.

---

### Task 1: Foundation Tokens Alignment (`customerPalette`)

**Files:**
- Modify: `packages/mobile-core/src/theme/tokens.ts`
- Test: `packages/mobile-core/src/ui/foundation.test.tsx`

**Interfaces:**
- Consumes: `colors`, `radius`, `spacing` in `tokens.ts`.
- Produces: Updated `customerPalette` with `primary: '#0B1E42'`, `tabActive: '#0B1E42'`, `tabActiveBg: '#F0F4F9'`.

- [ ] **Step 1: Write test verifying customerPalette token values**

In `packages/mobile-core/src/ui/foundation.test.tsx`:
```tsx
it('aligns customerPalette with Midnight Navy primary and tabActive', () => {
  expect(customerPalette.primary).toBe('#0B1E42');
  expect(customerPalette.tabActive).toBe('#0B1E42');
  expect(customerPalette.tabActiveBg).toBe('#F0F4F9');
  expect(customerPalette.accent).toBe('#F59E0B');
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter @leopard/mobile-core test -- src/ui/foundation.test.tsx`
Expected: FAIL with `received '#F59E0B'` for `customerPalette.primary` and `tabActive`.

- [ ] **Step 3: Update customerPalette in tokens.ts**

In `packages/mobile-core/src/theme/tokens.ts`:
```tsx
export const customerPalette = {
  // Primary — Midnight Navy (Chủ đạo thương hiệu & Hành động)
  primary: '#0B1E42',
  primaryDark: '#061226',
  primaryBg: '#F0F4F9',
  primaryBorder: '#CBD5E1',
  primaryText: '#0B1E42',

  // Brand Accent — Leopard Amber (Huy hiệu, điểm thưởng, voucher)
  accent: '#F59E0B',
  accentDark: '#D97706',
  accentBg: '#FFFBEB',
  accentBorder: '#FDE68A',
  accentText: '#92400E',

  // Tab / nav (Active state)
  tabActive: '#0B1E42',
  tabActiveBg: '#F0F4F9',
  tabInactive: '#64748B',

  // Input focus
  inputFocusBorder: '#0B1E42',
  inputFocusRing: 'rgba(11, 30, 66, 0.08)',

  // Shared neutrals
  textSlateDark: '#0F172A',
  textMutedSlate: '#475569',
  textSubtle: '#64748B',
  cardBorder: '#E2E8F0',
  subtleDivider: '#E2E8F0',
  surfaceWhite: '#FFFFFF',
  bgMuted: '#F8FAFC',
  canvas: '#F8FAFC',
  onlineGreen: '#16A34A',
  offlineGray: '#94A3B8',
} as const;
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm --filter @leopard/mobile-core test -- src/ui/foundation.test.tsx`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add packages/mobile-core/src/theme/tokens.ts packages/mobile-core/src/ui/foundation.test.tsx
git commit -m "refactor(tokens): align customerPalette primary and active tabs to Midnight Navy"
```

---

### Task 2: Profile & Account Screens Color Cleanup (`ProfileScreen.tsx`)

**Files:**
- Modify: `apps/mobile/src/features/customer/profile/ProfileScreen.tsx`
- Test: `apps/mobile/src/features/customer/profile/ProfileScreen.test.tsx`

**Interfaces:**
- Consumes: `customerPalette`, `colors`, `spacing`, `radius` from `@leopard/mobile-core`.
- Produces: Clean unified Profile screen without 5 rainbow-colored icon backgrounds, with cohesive Hero stats and white Bento cards.

- [ ] **Step 1: Write test for cohesive menu rows and hero stats**

In `apps/mobile/src/features/customer/profile/ProfileScreen.test.tsx`:
Add assertions ensuring menu row icons use neutral background `#F1F5F9` and stats numbers render without discordant neon green.

- [ ] **Step 2: Update ProfileScreen Hero Card & Bento Cards**

In `apps/mobile/src/features/customer/profile/ProfileScreen.tsx`:
1. `leopardIdBadge`: change background to `#1E293B`, text to `#94A3B8` (sophisticated dark navy pill).
2. Stats row in Hero Card:
   - "Tổng chuyến": `color: '#FFFFFF'`
   - "Điểm tích lũy": `color: '#FFFFFF'` (was `#F59E0B`)
   - "Tiết kiệm": `color: '#FFFFFF'` (was `#10B981`)
3. 2 Bento mini-cards:
   - Left card (Ví VietQR): icon background `#F1F5F9`, icon color `#0B1E42`.
   - Right card (Mã ưu đãi): icon background `#F1F5F9`, icon color `#0B1E42`. Tag "3 khả dụng" in amber `#D97706`.

- [ ] **Step 3: Unify MenuRow Icon Backgrounds**

In `apps/mobile/src/features/customer/profile/ProfileScreen.tsx`:
Replace rainbow backgrounds with unified `#F1F5F9` and `#0B1E42` / `#475569` icon color:
```tsx
<MenuRow
  icon={<IconOrders color="#0B1E42" size={19} />}
  iconBg="#F1F5F9"
  label="Đơn hàng của tôi"
  ...
/>
<MenuRow
  icon={<IconLocationPin color="#0B1E42" size={19} />}
  iconBg="#F1F5F9"
  label="Sổ địa chỉ"
  ...
/>
<MenuRow
  icon={<IconFileText color="#0B1E42" size={19} />}
  iconBg="#F1F5F9"
  label="Thông tin xuất hóa đơn VAT"
  ...
/>
<MenuRow
  icon={<IconCreditCard color="#0B1E42" size={19} />}
  iconBg="#F1F5F9"
  label="Liên kết ngân hàng & Thẻ"
  ...
/>
<MenuRow
  icon={<IconSupport247 color="#DC2626" size={19} />}
  iconBg="#FEE2E2"
  label="Trợ giúp & SOS"
  ...
/>
<MenuRow
  icon={<IconSettings color="#0B1E42" size={19} />}
  iconBg="#F1F5F9"
  label="Cài đặt"
  ...
/>
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm --filter mobile test -- src/features/customer/profile/ProfileScreen.test.tsx`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add apps/mobile/src/features/customer/profile/ProfileScreen.tsx apps/mobile/src/features/customer/profile/ProfileScreen.test.tsx
git commit -m "fix(customer): unify profile screen color palette to calm Apple HIG aesthetic"
```

---

### Task 3: Home & In-Place Booking Flow (`HomeDashboardScreen.tsx`)

**Files:**
- Modify: `apps/mobile/src/features/home/HomeDashboardScreen.tsx`
- Test: `apps/mobile/src/features/home/HomeDashboardScreen.test.tsx`

**Interfaces:**
- Consumes: `customerPalette`, `leopardPalette`, `RealInteractiveMap`.
- Produces: Clean Home screen where all stray `#0284C7` (cyan) and `#E0F2FE` colors are replaced with Midnight Navy `#0B1E42` and neutral `#F1F5F9`.

- [ ] **Step 1: Write test for Home screen chip and pin colors**

In `apps/mobile/src/features/home/HomeDashboardScreen.test.tsx`:
Verify saved address chips and pickup label badge render with neutral/navy tokens instead of raw cyan.

- [ ] **Step 2: Update HomeDashboardScreen colors**

In `apps/mobile/src/features/home/HomeDashboardScreen.tsx`:
1. `pickupPinInner`: change from `#0284C7` to `#16A34A` (Pickup Green).
2. `pickupPinCircle`: change from `rgba(2, 132, 199, 0.2)` to `rgba(22, 163, 74, 0.15)`.
3. `pickupLabelBadge`: change from `#E0F2FE` to `#F0FDF4`.
4. `pickupLabelBadgeText`: change from `#0284C7` to `#166534`.
5. `hubChip`:
   - `IconWarehouse color="#0B1E42"` (was `#0284C7`).
   - `styles.hubChip`: background `#F8FAFC`, border `#E2E8F0`, text `#0B1E42`.
6. `suggestionIconBox`: change background from `#E0F2FE` to `#F1F5F9`.
7. `suggestionRowItem` pin icon: change from `#0284C7` to `#0B1E42`.
8. `etaPill`: change from `#E0F2FE` with `#0284C7` text to `#F0F4F9` with `#0B1E42` text.

- [ ] **Step 3: Run test to verify it passes**

Run: `pnpm --filter mobile test -- src/features/home/HomeDashboardScreen.test.tsx`
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add apps/mobile/src/features/home/HomeDashboardScreen.tsx apps/mobile/src/features/home/HomeDashboardScreen.test.tsx
git commit -m "fix(customer): replace cyan color clashes with unified navy/logistics tones in Home"
```

---

### Task 4: Orders & Tracking Screens (`CustomerOrdersScreen.tsx` & `MyDeliveriesScreen.tsx`)

**Files:**
- Modify: `apps/mobile/src/features/customer/orders/CustomerOrdersScreen.tsx`
- Modify: `apps/mobile/src/features/deliveries/MyDeliveriesScreen.tsx`
- Test: `apps/mobile/src/features/customer/orders/CustomerScreens.test.tsx`
- Test: `apps/mobile/src/features/deliveries/MyDeliveriesScreen.test.tsx`

**Interfaces:**
- Consumes: `customerPalette`, `StatusBadge`, `RouteSpine`.
- Produces: Orders and Deliveries list screens using Midnight Navy active tabs and cohesive badge states.

- [ ] **Step 1: Write test for orders tab active color**

In `apps/mobile/src/features/customer/orders/CustomerScreens.test.tsx`:
Verify active filter tab uses Midnight Navy `#0B1E42` background/border.

- [ ] **Step 2: Update CustomerOrdersScreen & MyDeliveriesScreen**

In `CustomerOrdersScreen.tsx`:
1. Status dot colors: replace hardcoded `#0284C7` with `#0B1E42` or `#16A34A`.
2. Filter pill active: background `#0B1E42`, text `#FFFFFF`.
In `MyDeliveriesScreen.tsx`:
1. Primary actions & search focus: use `#0B1E42` instead of raw amber.
2. Status badges: align `ACCEPTED` and `IN_TRANSIT` to clean navy/blue accents without contrast issues.

- [ ] **Step 3: Run tests to verify they pass**

Run: `pnpm --filter mobile test -- src/features/customer/orders/CustomerScreens.test.tsx src/features/deliveries/MyDeliveriesScreen.test.tsx`
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add apps/mobile/src/features/customer/orders/CustomerOrdersScreen.tsx apps/mobile/src/features/deliveries/MyDeliveriesScreen.tsx
git commit -m "fix(customer): standardize orders and deliveries status indicators and active tabs"
```

---

### Task 5: Wallet & Address Book Screens (`CustomerWalletScreen.tsx` & `AddressBookScreen.tsx`)

**Files:**
- Modify: `apps/mobile/src/features/customer/wallet/CustomerWalletScreen.tsx`
- Modify: `apps/mobile/src/features/customer/addresses/AddressBookScreen.tsx`
- Test: `apps/mobile/src/features/customer/wallet/CustomerWalletScreen.test.tsx`
- Test: `apps/mobile/src/features/customer/addresses/AddressBookScreen.test.tsx`

**Interfaces:**
- Consumes: `customerPalette`, `Button`, `FormField`.
- Produces: Wallet top-up CTA with 16:1 contrast (Midnight Navy) and Address Book default action buttons aligned to `#0B1E42`.

- [ ] **Step 1: Write test verifying wallet CTA contrast**

In `CustomerWalletScreen.test.tsx`:
Verify primary "Nạp tiền" CTA uses `#0B1E42` background with white text.

- [ ] **Step 2: Update CustomerWalletScreen**

In `CustomerWalletScreen.tsx`:
1. Change `topUpBtn`: background from `#F59E0B` to `#0B1E42` (eliminates WCAG 2.16:1 fail).
2. Filter chips active state: background `#0B1E42`, text `#FFFFFF`.
3. QR bank detail border highlight: use `#CBD5E1` / `#0B1E42`.

- [ ] **Step 3: Update AddressBookScreen**

In `AddressBookScreen.tsx`:
1. Primary "Thêm địa chỉ mới" button: use Midnight Navy `#0B1E42`.
2. Category chips active state: use Midnight Navy `#0B1E42`.

- [ ] **Step 4: Run tests to verify they pass**

Run: `pnpm --filter mobile test -- src/features/customer/wallet/CustomerWalletScreen.test.tsx src/features/customer/addresses/AddressBookScreen.test.tsx`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add apps/mobile/src/features/customer/wallet/CustomerWalletScreen.tsx apps/mobile/src/features/customer/addresses/AddressBookScreen.tsx
git commit -m "fix(customer): fix wallet CTA contrast and unify address book action buttons"
```

---

### Task 6: Auxiliary Screens Verification & Chat Alignment

**Files:**
- Modify: `apps/mobile/src/features/customer/notifications/NotificationsScreen.tsx`
- Modify: `apps/mobile/src/features/customer/promotions/PromotionsScreen.tsx`
- Modify: `apps/mobile/src/features/customer/chat/OrderChatScreen.tsx`
- Test: `apps/mobile/src/features/customer/notifications/NotificationsScreen.test.tsx`
- Test: `apps/mobile/src/features/customer/promotions/PromotionsScreen.test.tsx`

**Interfaces:**
- Consumes: `customerPalette`.
- Produces: Consistent notification filter pills, chat send buttons, and promotion claim buttons in Midnight Navy `#0B1E42`.

- [ ] **Step 1: Update NotificationsScreen, PromotionsScreen, and OrderChatScreen**

1. `NotificationsScreen.tsx`: Category filter pills active state uses `#0B1E42` background.
2. `PromotionsScreen.tsx`: Claim/Use voucher buttons use `#0B1E42`. Voucher discount % badge retains brand amber `#F59E0B`.
3. `OrderChatScreen.tsx`: Customer chat bubble uses `#0B1E42` background, send button uses `#0B1E42`.

- [ ] **Step 2: Run tests to verify they pass**

Run: `pnpm --filter mobile test -- src/features/customer/notifications/NotificationsScreen.test.tsx src/features/customer/promotions/PromotionsScreen.test.tsx`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add apps/mobile/src/features/customer/notifications/NotificationsScreen.tsx apps/mobile/src/features/customer/promotions/PromotionsScreen.tsx apps/mobile/src/features/customer/chat/OrderChatScreen.tsx
git commit -m "fix(customer): align auxiliary customer screens to Midnight Navy theme"
```

---

### Task 7: Full Monorepo Regression Verification

**Files:**
- Test: All test suites across `packages/mobile-core`, `apps/mobile`, and `apps/driver`.

- [ ] **Step 1: Run mobile-core tests & typecheck**

Run: `pnpm --filter @leopard/mobile-core test && pnpm --filter @leopard/mobile-core typecheck`
Expected: 16 test suites pass, 0 errors.

- [ ] **Step 2: Run mobile app tests & typecheck**

Run: `pnpm --filter mobile test && pnpm --filter mobile typecheck`
Expected: 47 test suites pass, 0 errors.

- [ ] **Step 3: Run driver app tests & typecheck**

Run: `pnpm --filter driver test && pnpm --filter driver typecheck`
Expected: 30 test suites pass, 0 errors.

- [ ] **Step 4: Run monorepo lint**

Run: `pnpm --filter @leopard/mobile-core lint && pnpm --filter mobile lint`
Expected: 0 errors, 0 warnings.
