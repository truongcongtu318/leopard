# NexaFleet Modern Bento Dispatch Console Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Transform the Operations Web interface (`apps/admin`) for Admin and Fleet Owner roles to match the NexaFleet Modern Bento Dispatch Console reference design.

**Architecture:** Update foundational tokens in `packages/ui/src/tokens.css` for canvas background `#F4F5F7`, card radius 26px, and semantic status colors. Refactor `OperationsShell` into a floating capsule topbar with centered black pill navigation tabs and user capsule. Build 5 reusable bento components (`BentoMapCard`, `BentoOrdersCard`, `StatusOverviewCard`, `FulfillmentPerformanceCard`, `RevenueOverTimeCard`) and integrate them into both `AdminOverviewScreen` and `FleetDashboardScreen`.

**Tech Stack:** Next.js 15, React 19, Tailwind CSS v4, TypeScript, Vitest, `@testing-library/react`.

## Global Constraints

- Modern canvas background: `#F4F5F7` / `#F8FAFC` across all operations web views.
- Thẻ Bento: `bg-white`, bo góc mềm mại `--radius-card-large: 26px` (`rounded-3xl`), viền kín đáo `border-slate-100`, shadow nhẹ `shadow-xs` / `shadow-sm`.
- Centered Topbar: active tab is solid black pill `bg-slate-900 text-white rounded-full`, circular notification bell, user profile capsule.
- Status palette: Emerald `#10B981` (In Transit / Performance), Pink/Magenta `#EC4899` (Delivered), Amber `#F59E0B` (Loading), Coral `#F87171` (Unloading), Sunset Gradient for Revenue.
- Fleet Owner strictly retains `FleetScopeRail` and fleet-scoped data boundaries.
- No regression on existing tests; all unit tests and typechecks must pass.

---

### Task 1: Update Core Design Tokens and Global Canvas

**Files:**
- Modify: `packages/ui/src/tokens.css:30-85`
- Modify: `apps/admin/src/app/globals.css:1-20`

**Interfaces:**
- Consumes: Tailwind v4 theme configuration
- Produces: Updated CSS custom properties (`--color-neutral-surface: #F4F5F7`, `--radius-card-large: 26px`, `--radius-pill: 999px`)

- [ ] **Step 1: Update `packages/ui/src/tokens.css` with NexaFleet tokens**

Update canvas background color from `#f3f4f6` to `#f4f5f7`, add `--radius-card-large: 26px`, `--radius-card-inner: 18px`, and ensure status tokens for emerald, pink, amber, coral are defined.

- [ ] **Step 2: Verify tokens load correctly and run build check**

Run: `pnpm --filter @leopard/ui build || pnpm --filter admin typecheck`
Expected: PASS with 0 errors

- [ ] **Step 3: Commit token updates**

```bash
git add packages/ui/src/tokens.css apps/admin/src/app/globals.css
git commit -m "style(ui): update tokens for nexafleet bento console"
```

---

### Task 2: Refactor OperationsShell & RoleNavigation to NexaFleet Floating Topbar

**Files:**
- Modify: `apps/admin/src/components/shell/OperationsShell.tsx`
- Modify: `apps/admin/src/components/shell/RoleNavigation.tsx`
- Modify: `apps/admin/src/components/shell/OperationsShell.test.tsx`
- Modify: `apps/admin/src/components/shell/RoleNavigation.test.tsx`

**Interfaces:**
- Consumes: `OperationsShellProps`, `RoleNavigationProps`, `NavItem`
- Produces: Floating white topbar with centered pill navigation, user capsule, circular notification bell, and background `bg-[#F4F5F7]`

- [ ] **Step 1: Write test expectations in `RoleNavigation.test.tsx` for centered pill styling**

Verify that active item renders with `bg-slate-900 text-white rounded-full` pill styling when horizontal.

- [ ] **Step 2: Update `RoleNavigation.tsx`**

Style horizontal navigation as centered pill tabs:
- Active item: `bg-slate-900 text-white rounded-full px-4 py-1.5 text-xs font-semibold shadow-xs`
- Inactive items: `text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-full px-3.5 py-1.5 text-xs font-medium transition-colors`

- [ ] **Step 3: Update `OperationsShell.tsx`**

- Change page wrapper from `bg-gradient-to-br from-[#d6e8fb]...` to `bg-[#F4F5F7] min-h-screen p-3 sm:p-5 flex flex-col antialiased`
- Change header to floating white container `bg-white rounded-2xl sm:rounded-3xl px-5 sm:px-6 py-3 mb-4 flex items-center justify-between shadow-xs border border-slate-100/90`
- Center: `<RoleNavigation orientation="horizontal" ... />`
- Right: User capsule with circular avatar, user name ("Admin Nam" or "Chủ đội xe") and role subtitle ("Điều phối viên" or "Chủ đội xe"), circular notification bell.

- [ ] **Step 4: Run shell tests and verify passes**

Run: `pnpm --filter admin test apps/admin/src/components/shell`
Expected: PASS

- [ ] **Step 5: Commit shell updates**

```bash
git add apps/admin/src/components/shell/
git commit -m "feat(web): implement nexafleet floating pill topbar in operations shell"
```

---

### Task 3: Build Reusable Bento Widget Suite

**Files:**
- Create: `apps/admin/src/features/admin/components/bento/BentoMapCard.tsx`
- Create: `apps/admin/src/features/admin/components/bento/BentoOrdersCard.tsx`
- Create: `apps/admin/src/features/admin/components/bento/StatusOverviewCard.tsx`
- Create: `apps/admin/src/features/admin/components/bento/FulfillmentPerformanceCard.tsx`
- Create: `apps/admin/src/features/admin/components/bento/RevenueOverTimeCard.tsx`
- Create: `apps/admin/src/features/admin/components/bento/BentoWidgets.test.tsx`

**Interfaces:**
- `BentoMapCard`: renders Dark Mode Da Nang map with floating search, zoom controls, and 3D cube markers + selected emerald marker.
- `BentoOrdersCard`: renders Orders table with `orders` array, pill filter tabs (`All`, `Pending`, `Responded`, `Assigned`, `Completed`), and emerald/pink status badges.
- `StatusOverviewCard`: renders 4 status percentages (`loading`, `inTransit`, `unloading`, `delivered`) with continuous segmented progress bar.
- `FulfillmentPerformanceCard`: renders percentage KPI (e.g. 89%) and vertical emerald bar chart.
- `RevenueOverTimeCard`: renders sunset gradient card, formatted currency, white SVG wave curve, and period selector.

- [ ] **Step 1: Write test `BentoWidgets.test.tsx` verifying render of all 5 bento widgets**

- [ ] **Step 2: Implement `BentoMapCard.tsx`**

Dark Mode vector map container with:
- `rounded-3xl relative overflow-hidden bg-slate-950 min-h-[380px]`
- Floating translucent search input: `bg-slate-900/70 backdrop-blur-md border border-white/10 text-white rounded-xl px-3 py-2 text-xs`
- Zoom controls `+ / -` bottom-right
- White cube glyphs and selected pill marker `bg-emerald-500 text-white` with `OR-1000 GreenMart`.

- [ ] **Step 3: Implement `BentoOrdersCard.tsx`**

- Container `bg-white rounded-3xl p-5 sm:p-6 border border-slate-100 shadow-sm`
- Pill filters with `All`, `Pending`, `Responded`, `Assigned` (active black pill `bg-slate-900 text-white`), `Completed`
- Table rows: Order ID (bold), Customer, Route (`from Berlin -> to Hamburg` with arrow), Weight (`1.8 t`), ETA, Status pill (Emerald `In Transit`, Pink `Delivered`).

- [ ] **Step 4: Implement `StatusOverviewCard.tsx`**

- Container `bg-white rounded-3xl p-5 sm:p-6 border border-slate-100 shadow-sm`
- 4 metrics: 17% Loading (amber), 32% In Transit (emerald), 13% Unloading (coral), 38% Delivered (magenta)
- Segmented continuous progress bar matching proportional widths.

- [ ] **Step 5: Implement `FulfillmentPerformanceCard.tsx`**

- Container `bg-white rounded-3xl p-5 sm:p-6 border border-slate-100 shadow-sm`
- Big KPI: `89% on average`
- Vertical emerald green bars (`bg-[#10b981] rounded-full`) with varied heights.

- [ ] **Step 6: Implement `RevenueOverTimeCard.tsx`**

- Container `bg-gradient-to-tr from-amber-300 via-orange-400 to-rose-400 text-slate-900 rounded-3xl p-5 sm:p-6 shadow-sm relative overflow-hidden`
- Large amount `$239,187.00` / `239.187.000 ₫` + `+15% this month`
- Smooth white wave SVG line & area fill
- Bottom pills: `Week`, `Month` (active black pill), `6 months`, `Year`.

- [ ] **Step 7: Run test to verify widget suite**

Run: `pnpm --filter admin test BentoWidgets`
Expected: PASS

- [ ] **Step 8: Commit bento widgets**

```bash
git add apps/admin/src/features/admin/components/bento/
git commit -m "feat(ui): create nexafleet reusable bento widget suite"
```

---

### Task 4: Integrate NexaFleet Bento Layout into AdminOverviewScreen (`/admin`)

**Files:**
- Modify: `apps/admin/src/features/admin/AdminOverviewScreen.tsx`
- Modify: `apps/admin/src/features/admin/AdminScreens.test.tsx`

**Interfaces:**
- Consumes: `AdminOverviewRouteView`, `BentoMapCard`, `BentoOrdersCard`, `StatusOverviewCard`, `FulfillmentPerformanceCard`, `RevenueOverTimeCard`
- Produces: Complete 2-column Bento Dispatch Console for `/admin`

- [ ] **Step 1: Update `AdminOverviewScreen.tsx` layout structure**

Replace current layout with:
- Top metadata banner (h1 "Tổng quan vận hành", "Ca trực Pilot Đang Chạy", liveness/readiness indicators)
- Active exception alert if any exceptions exist
- Main 2-column Bento Grid (`grid grid-cols-1 xl:grid-cols-12 gap-4`):
  - Left column (`xl:col-span-7` or `8`): `BentoMapCard` + `BentoOrdersCard`
  - Right column (`xl:col-span-5` or `4`): `StatusOverviewCard` + `FulfillmentPerformanceCard` + `RevenueOverTimeCard`

- [ ] **Step 2: Run tests in `AdminScreens.test.tsx` and fix any discrepancies**

Run: `pnpm --filter admin test AdminScreens`
Expected: PASS

- [ ] **Step 3: Commit AdminOverviewScreen changes**

```bash
git add apps/admin/src/features/admin/AdminOverviewScreen.tsx apps/admin/src/features/admin/AdminScreens.test.tsx
git commit -m "feat(admin): apply nexafleet bento console layout to admin overview"
```

---

### Task 5: Integrate NexaFleet Bento Layout into FleetDashboardScreen (`/fleet`)

**Files:**
- Modify: `apps/admin/src/features/fleet/FleetDashboardScreen.tsx`
- Modify: `apps/admin/src/features/fleet/FleetShared.tsx` (if card styling needs adjustment)
- Modify: `apps/admin/src/features/fleet/FleetScreens.test.tsx` (or relevant test)

**Interfaces:**
- Consumes: `FleetDashboardRouteView`, `FleetScopeRail`, Bento widget components
- Produces: Complete 2-column Bento Console for `/fleet`, strictly bounded to fleet scope

- [ ] **Step 1: Update `FleetDashboardScreen.tsx`**

- Keep `FleetScopeRail` and snapshot timestamp prominently at the top
- Render active attention items/exceptions if present
- Render the 2-column Bento Grid:
  - Left column: Fleet-scoped map + Fleet orders table (`BentoOrdersCard` populated with fleet orders)
  - Right column: Fleet status overview (segmented bar), Fleet fulfillment performance, Fleet revenue/volume card.

- [ ] **Step 2: Run Fleet tests**

Run: `pnpm --filter admin test fleet`
Expected: PASS

- [ ] **Step 3: Commit FleetDashboardScreen changes**

```bash
git add apps/admin/src/features/fleet/
git commit -m "feat(fleet): apply nexafleet bento console layout to fleet dashboard"
```

---

### Task 6: Full Verification & Responsive Validation

**Files:**
- Verification only

- [ ] **Step 1: Run comprehensive tests across admin and packages/ui**

Run: `pnpm --filter admin test`
Expected: PASS (all tests pass)

- [ ] **Step 2: Run TypeScript typecheck**

Run: `pnpm --filter admin typecheck`
Expected: PASS (0 errors)

- [ ] **Step 3: Run linter**

Run: `pnpm --filter admin lint`
Expected: PASS (0 errors, 0 warnings)

- [ ] **Step 4: Build check**

Run: `pnpm --filter admin build`
Expected: PASS (Next.js build succeeded)
