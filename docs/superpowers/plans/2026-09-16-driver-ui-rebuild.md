# Driver App Rebuild (Grab Driver Design System) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild the 5 core screens of LEOPARD Driver Mobile (`apps/driver`) to faithfully match the Grab Driver production design language (6 reference screenshots) using the 3-layer Design System tokens in `@leopard/mobile-core`.

**Architecture:** Route – Runtime – View separation across all features. Presentation components consume `driverPrimitives`, `driverSemantics`, and `driverComponents` tokens from `@leopard/mobile-core`. Navigation uses Expo Router with conditional tab-bar/floating-dock rendering based on screen context.

**Tech Stack:** React Native 0.86, Expo 57, Expo Router, TypeScript, `@leopard/mobile-core`, React Native SVG, TanStack Query.

**Spec:** `docs/ui/17-grab-driver-design-system.md`

## Global Constraints

- **Design System:** All colors, typography, border radius, and shadows must come from `@leopard/mobile-core` (`driverPrimitives`, `driverSemantics`, `driverComponents`).
- **Touch Target:** Every interactive element must be >= 44x44pt (or padded via `hitSlop`).
- **No Emojis as Icons:** All structural icons must use vector SVG (no emoji icons).
- **Tabular Numbers:** Monetary values and percentages must specify `fontVariant: ['tabular-nums']`.
- **Navigation Navbar Rules:**
  - Home / Cockpit: Full-bleed map, Top HUD capsules, 4-tab Floating Dock (hidden during active trip).
  - Finance Hub (Thu nhập, Ví): Top Header (Back, Title, Help/Sparkle), 3-tab Bottom Bar (Thu nhập, Tiền thưởng, Ví).
  - Profile & Settings: Top Header (Back, Title, Gear), no bottom tab bar.
- **Verification:** Every task must pass its specific unit tests and TypeScript typecheck.

---

### Task 1: Cockpit Home Screen Completion (`DriverOrdersScreen.tsx` & Dock)

**Files:**
- Modify: `apps/driver/src/features/orders/DriverOrdersScreen.tsx`
- Modify: `apps/driver/src/features/orders/components/DriverBottomNavigation.tsx`
- Test: `apps/driver/src/features/orders/DriverOrdersScreen.test.tsx`

**Interfaces:**
- Consumes: `driverPrimitives`, `driverSemantics`, `driverComponents`, `DriverConnectionCapsule`, `DriverQuickNavOverlay`, `DriverNotice`
- Produces: Polished Cockpit screen with Layer 0 Map, Layer 1 Control stack, Layer 2 "Bật kết nối" power pill, Layer 3 Notice card, Layer 4 Top HUD (Thu nhập + Avatar/Rating), Layer 5 Floating 4-tab dock (when not in active trip).

- [ ] **Step 1: Verify current tests pass**
Run: `pnpm --filter driver test -- src/features/orders/DriverOrdersScreen.test.tsx`
Expected: PASS

- [ ] **Step 2: Update `DriverBottomNavigation.tsx` icons and styling to match Image 1 4-tab dock**
Update dock to 4 items:
1. `home`: Xe / Cuốc (Icon with active green circle)
2. `location`: Ghim vị trí (Ghim map)
3. `hotspot`: Tia sét cuốc nóng (Icon Lightning)
4. `more`: Menu khác (Icon More dots)
Style with floating capsule shape, height 64px, `driverPrimitives.shadows.floating`.

- [ ] **Step 3: Update `DriverOrdersScreen.tsx` to integrate floating dock when `!activeTrip`**
Ensure dock displays at bottom of idle screen, passing tab state and route transitions.

- [ ] **Step 4: Run tests to verify compatibility**
Run: `pnpm --filter driver test -- src/features/orders/DriverOrdersScreen.test.tsx`
Expected: PASS

---

### Task 2: Rebuild Earnings Dashboard (`DriverEarningsScreen.tsx` & 3-Tab Finance Bar)

**Files:**
- Modify: `apps/driver/src/features/earnings/DriverEarningsScreen.tsx`
- Create / Modify: `apps/driver/src/features/finance/FinanceBottomBar.tsx`
- Test: `apps/driver/src/features/earnings/DriverEarningsScreen.test.tsx`

**Interfaces:**
- Consumes: `driverPrimitives`, `driverComponents`
- Produces: Header (Back, "Thu nhập", Help `?`, Sparkle `✦`), Carousel metric card ("Thu nhập hôm nay", "0 Jobs" badge, `0 đ` bold 32px), Completed rides summary row, Floating blue tooltip ("Xem tiền thưởng của bạn."), 3-tab bottom bar (`Thu nhập`, `Tiền thưởng`, `Ví`).

- [ ] **Step 1: Check existing `DriverEarningsScreen.test.tsx`**
Run: `pnpm --filter driver test -- src/features/earnings/DriverEarningsScreen.test.tsx`
Expected: Inspect test expectations

- [ ] **Step 2: Implement `FinanceBottomBar.tsx` component**
3-tab bar:
- `Thu nhập` (Bar chart icon)
- `Tiền thưởng` (Diamond icon 💎)
- `Ví` (Wallet icon)
Active tab highlights with Grab green `#00B14F`.

- [ ] **Step 3: Rebuild `DriverEarningsScreen.tsx` to match Image 4**
Implement Top Header, Today's Earnings metric card with "0 Jobs" badge, "Xem chi tiết" link, "Cuốc xe đã hoàn tất" row, and blue education tooltip pointing to the "Tiền thưởng" tab.

- [ ] **Step 4: Run tests**
Run: `pnpm --filter driver test -- src/features/earnings/DriverEarningsScreen.test.tsx`
Expected: PASS

---

### Task 3: Rebuild Wallet Screen (`DriverWalletScreen.tsx`)

**Files:**
- Modify: `apps/driver/src/features/wallet/DriverWalletScreen.tsx`
- Test: `apps/driver/src/features/wallet/DriverWalletScreen.test.tsx`

**Interfaces:**
- Consumes: `FinanceBottomBar`, `driverPrimitives`
- Produces: Header (Back, "Ví", Help `?`), Asset balance cards (Ví tiền mặt with green cash circle, Ví tín dụng with green `G` circle), "Nhiều tiện ích khác cùng Ví" section (Top-up, Insurance, Financial support cards), 3-tab finance bottom bar.

- [ ] **Step 1: Check existing tests for wallet**
Run: `pnpm --filter driver test -- src/features/wallet/DriverWalletScreen.test.tsx`
Expected: Inspect test cases

- [ ] **Step 2: Rebuild `DriverWalletScreen.tsx` matching Image 3**
Structure:
1. Top bar: Back arrow, "Ví" title, Help circle `?`.
2. Balance items: Ví tiền mặt (`đ 1.789` or dynamic balance), Ví tín dụng (`đ 0`).
3. Services section: "Nhiều tiện ích khác cùng Ví" with 3 visual cards (Nạp tiền, Bảo hiểm, Hỗ trợ tài chính).
4. Fixed FinanceBottomBar with active tab `wallet`.

- [ ] **Step 3: Run tests**
Run: `pnpm --filter driver test -- src/features/wallet/DriverWalletScreen.test.tsx`
Expected: PASS

---

### Task 4: Rebuild Driver Profile Screen (`ProfileScreen.tsx`)

**Files:**
- Modify: `apps/driver/src/features/profile/ProfileScreen.tsx`
- Test: `apps/driver/src/features/profile/ProfileScreen.test.tsx`

**Interfaces:**
- Consumes: `driverPrimitives`, `driverComponents`
- Produces: Top bar (Back, "Hồ sơ", Settings Gear `⚙`, Help `?`, Sparkle `✦`), Blue tooltip "Cài đặt" pointing to gear, Driver avatar + Name + Rating `★ 5.0`, Daily KPI card ("Hàng ngày" with 0.0% Chấp nhận / 0.0% Huỷ bỏ), 5-icon quick action circle grid (Hộp thư, Lịch, Khám phá, Thưởng, Xem thêm), Promo cards ("Chỉ có tại Grab", Map guide).

- [ ] **Step 1: Check existing profile tests**
Run: `pnpm --filter driver test -- src/features/profile/ProfileScreen.test.tsx`
Expected: Inspect existing tests

- [ ] **Step 2: Rebuild `ProfileScreen.tsx` matching Image 5**
Structure:
1. Top header with Settings Tooltip.
2. Driver card: Avatar (56px), Name, `★ 5.0` rating.
3. Daily KPI card: `0.0% Chấp nhận` | `0.0% Huỷ bỏ`.
4. 5 circular action buttons with red notification badges.
5. Promotion banner card and Map guide card.

- [ ] **Step 3: Run tests**
Run: `pnpm --filter driver test -- src/features/profile/ProfileScreen.test.tsx`
Expected: PASS

---

### Task 5: Rebuild Settings Screen (`DriverSettingsScreen.tsx`)

**Files:**
- Modify: `apps/driver/src/features/settings/DriverSettingsScreen.tsx`
- Test: `apps/driver/src/features/settings/DriverSettingsScreen.test.tsx`

**Interfaces:**
- Consumes: `driverPrimitives`, `driverSemantics`, `driverComponents`
- Produces: Top bar (Back, "Tất cả cài đặt"), Inset Grouped Section "Tài khoản" (Name + Plate + Phone, Media, Linked accounts), Inset Grouped Section "Cài đặt yêu cầu" with light green highlight banner "Tăng cơ hội nhận cuốc của bạn", iOS switches for "Tự động nhận cuốc" (green active) and "Đề xuất giá cước" + Red badge `MỚI` (inactive), navigation rows with status dots and chevrons.

- [ ] **Step 1: Check existing settings tests**
Run: `pnpm --filter driver test -- src/features/settings/DriverSettingsScreen.test.tsx`
Expected: Inspect existing tests

- [ ] **Step 2: Rebuild `DriverSettingsScreen.tsx` matching Image 6**
Implement standard Inset Grouped list with highlight banner, iOS Green switches, red "MỚI" badge, and clean rows.

- [ ] **Step 3: Run tests**
Run: `pnpm --filter driver test -- src/features/settings/DriverSettingsScreen.test.tsx`
Expected: PASS

---

### Task 6: Final Verification & Integration Gate

- [ ] **Step 1: Run full driver test suite**
Run: `pnpm --filter driver test`
Expected: All test suites PASS

- [ ] **Step 2: Run TypeScript typecheck**
Run: `pnpm --filter driver typecheck`
Expected: Zero type errors

- [ ] **Step 3: Run linter**
Run: `pnpm --filter driver lint`
Expected: Zero lint errors
