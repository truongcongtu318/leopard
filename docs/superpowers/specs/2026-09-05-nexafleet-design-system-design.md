# LEOPARD Operations Web: NexaFleet Modern Bento Dispatch Console Design Spec

> **Date:** 2026-09-05  
> **Status:** Approved Spec  
> **Target:** Operations Web (`apps/admin`) — Admin & Fleet Owner Roles  
> **Visual Reference:** NexaFleet Modern Bento Dispatch Console (`media_1788578367597.png`)

---

## 1. Context & Motivation

LEOPARD is a smart logistics connection system currently in pilot operation. The Operations Web platform serves two key operational roles:
- **Admin**: Oversees the entire logistics network (users, fleets, drivers, orders, tracking, telemetry).
- **Fleet Owner**: Manages fleet drivers and monitors fleet-scoped orders in a secure, largely read-only cockpit.

This specification upgrades the visual identity, tokens, shell, and dashboard screens to match the high-end **NexaFleet Modern Bento Dispatch Console**. This design language provides maximum operational clarity, crisp hierarchy, and visual elegance through floating white bento cards, a centered pill navigation bar, dark-mode real-time map visualization, and vibrant telemetry visualizations.

---

## 2. Visual Reference Analysis (NexaFleet)

The reference design establishes four foundational elements:

```
+--------------------------------------------------------------------------------------------------+
|  (O) LEOPARD               [ Overview ]  Orders   Drivers   Fleets   Users             (i) [AD Flynn] |  <- Floating Topbar
+--------------------------------------------------------------------------------------------------+
|                                                                 |                                |
|  +-----------------------------------------------------------+  |  +--------------------------+  |
|  | [O Search order...]                     [Fullscreen]     |  |  | Status Overview   [Month v] |  |
|  |                                                           |  |  | 17%     32%    13%   38%  |  |
|  |            [Box]                    [Box]                 |  |  | [===][======][==][=====] |  |
|  |                                                           |  |  +--------------------------+  |
|  |                         [ [Box] OR-1000 GreenMart ]       |  |                                |
|  |                                                           |  |  +--------------------------+  |
|  |            [Box]                                   [ + ]  |  |  | Fulfillment Perf [Month v] |  |
|  |                                                    [ - ]  |  |  | 89% on average           |  |
|  +-----------------------------------------------------------+  |  | || ||||||||||||||||||||| |  |
|                                                                 |  +--------------------------+  |
|  +-----------------------------------------------------------+  |                                |
|  | Orders (301)       All  Pending  Responded [Assigned] Comp |  |  +--------------------------+  |
|  | --------------------------------------------------------- |  |  | Revenue Over Time (Sunset)| |
|  | OR-1001  Nova Retail   Berlin -> Hamburg  1.8t [In Transit]|  |  | $239,187.00             |  |
|  | OR-1000  GreenMart     Munich -> Vienna   0.9t [In Transit]|  |  | ~~~ white wave area ~~~ |  |
|  | OR-0999  Alpha Trading Warsaw -> Prague   2.4t [Delivered ]|  |  | [Week] [Month] [6M] [Yr]|  |
|  +-----------------------------------------------------------+  |  +--------------------------+  |
|                                                                 |                                |
+--------------------------------------------------------------------------------------------------+
```

---

## 3. Design Tokens & Palette Specifications

### 3.1 Surface & Elevation
- **Canvas Background**: Modern light neutral `#F4F5F7` (replacing the previous ambient pastel gradient).
- **Cards**: Pure white `#FFFFFF`, border `border-slate-100`, border-radius `--radius-card-large: 26px` (`rounded-3xl`), soft elevation `shadow-xs` / `shadow-sm`.
- **Inner Containers**: Border radius `16px - 18px` (`rounded-2xl`).

### 3.2 Color System
| Semantic Role | Hex Value | Tailwind Class | Usage |
| :--- | :--- | :--- | :--- |
| **Pill Active** | `#0F172A` | `bg-slate-900 text-white` | Active navigation tabs, active filter pills, active period buttons |
| **Pill Inactive** | `#F1F5F9` | `bg-slate-100 text-slate-700` | Inactive filters, secondary action pills |
| **In Transit / Performance**| `#10B981` | `bg-emerald-500 text-white` | In-transit badge, performance bar chart, active map marker |
| **Delivered** | `#EC4899` / `#E879F9` | `bg-pink-500 text-white` | Delivered status badge, completion segment |
| **Loading** | `#F59E0B` / `#FBBF24` | `bg-amber-400 text-slate-900` | Loading status badge and segment |
| **Unloading** | `#F87171` | `bg-red-400 text-white` | Unloading status badge and segment |
| **Revenue Gradient** | `#FCD34D` -> `#FB923C` -> `#F472B6` | `bg-gradient-to-tr from-amber-300 via-orange-400 to-rose-400` | Sunset background for Revenue Over Time card |

### 3.3 Typography
- Body font: Clean geometric sans-serif (`Inter`, `system-ui`).
- Card titles: `text-lg font-bold text-slate-900`.
- Metric numbers (KPIs): `text-2xl` to `text-3xl font-extrabold text-slate-900 tracking-tight`.
- Field labels / headers: `text-xs font-medium text-slate-400`.

---

## 4. Component Architecture & Detailed Layout

### 4.1 Floating Header (`OperationsShell.tsx`)
- Container: Floating white capsule card `bg-white rounded-3xl px-6 py-3 border border-slate-100 shadow-xs`.
- **Left**: Black circle icon with white stylized monogram + bold `LEOPARD` logotype.
- **Center**: Centered horizontal pill navigation with active tab as solid black pill (`bg-slate-900 text-white rounded-full px-4 py-1.5`).
- **Right**:
  - Translucent search input pill with search icon.
  - Notification button: Circular button with red dot.
  - User Capsule: Circular avatar + 2-line name & role (`Admin Nam` / `Điều phối viên` or `Chủ đội xe`).
  - Quick action / logout button & mobile drawer trigger.

### 4.2 Bento Column 1: Map & Orders (Left, ~62% width)
1. **`BentoMapCard`**:
   - Container height: ~380px–420px with `rounded-3xl overflow-hidden relative shadow-sm`.
   - Dark theme vector map rendering logistics routes across Da Nang pilot area.
   - Floating translucent search input: `Search order...` / `Tìm kiếm đơn...` with glassmorphic backdrop (`bg-slate-900/60 backdrop-blur-md text-white`).
   - Top-right fullscreen toggle and bottom-right `+ / -` zoom controls.
   - Map markers: White rounded square boxes with 3D package/cube glyphs, and one active selected emerald pill marker (`OR-1000 GreenMart`).
2. **`BentoOrdersCard`**:
   - Container: `bg-white rounded-3xl p-6 border border-slate-100 shadow-sm`.
   - Header with title `Orders (301)` / `Đơn hàng (301)` and filter pill row: `All`, `Pending`, `Responded`, `Assigned` (active black pill), `Completed`, plus filter icon.
   - Table columns: `Mã đơn` (Order ID), `Khách hàng` (Customer), `Tuyến đường` (Route with arrow: `from Berlin -> to Hamburg`), `Trọng tải` (Weight: `1.8 t`), `ETA`, `Trạng thái` (Status pills in emerald `In Transit` and pink `Delivered`).

### 4.3 Bento Column 2: Telemetry & Revenue (Right, ~38% width)
1. **`StatusOverviewCard`**:
   - Container: `bg-white rounded-3xl p-6 border border-slate-100 shadow-sm`.
   - Header: `Status Overview` / `Tổng quan trạng thái` + `Month v` dropdown pill.
   - Metrics: 4 columns (`17% Loading` [amber], `32% In Transit` [emerald], `13% Unloading` [coral], `38% Delivered` [magenta]).
   - Visual: Segmented continuous progress bar split into 4 proportional colored segments.
2. **`FulfillmentPerformanceCard`**:
   - Container: `bg-white rounded-3xl p-6 border border-slate-100 shadow-sm`.
   - Header: `Fulfillment Performance` / `Hiệu suất thực hiện` + `Month v` dropdown pill.
   - KPI: `89%` bold + `on average` / `trung bình`.
   - Visual: Array of rounded emerald green vertical bars (`bg-[#10b981]`) with varying heights reflecting fulfillment distribution.
3. **`RevenueOverTimeCard`**:
   - Container: Sunset gradient card (`bg-gradient-to-tr from-amber-300 via-orange-400 to-rose-400 text-slate-900 rounded-3xl p-6 shadow-sm relative overflow-hidden`).
   - Header: `Revenue Over Time` / `Doanh thu vận hành`.
   - KPI: Large formatted currency `$239,187.00` / `239.187.000 ₫` + subtext `+15% this month` / `+15% so với tháng trước`.
   - Visual: Smooth white area wave curve line (`stroke-white stroke-[2.5] fill-white/20`).
   - Footer: Period selector pills (`Week`, `Month` [active black pill], `6 months`, `Year`).

---

## 5. Role Scoping & Authorization Rules

- **Admin (`/admin`)**:
  - Full system scope: displays all pilot orders, all active vehicles, full network telemetry, and system exceptions.
- **Fleet Owner (`/fleet`)**:
  - Fleet-scoped access only via valid `FleetMember` session.
  - Retains `FleetScopeRail` confirming the authorized fleet name and scope.
  - Map displays only fleet vehicles and fleet-assigned shipments.
  - Orders table, status overview, fulfillment rate, and revenue are strictly bounded to the authorized fleet.

---

## 6. Documentation Files to Update (Before Implementation)

1. `AGENTS.md`: Update UI Rules to replace the old ambient pastel gradient with the NexaFleet Modern Bento Dispatch Console.
2. `docs/ui/04-design-system.md`: Update design tokens, visual language section 1.1, and bento component contracts.
3. `docs/ui/03-screen-specs.md`: Update Admin Overview and Fleet Dashboard screen specifications.
4. `docs/ui/10-admin-operations-system-design.md`: Align Admin operations layout with Bento Console.
5. `docs/ui/09-fleet-owner-system-design.md`: Align Fleet Owner dashboard layout with Bento Console.

---

## 7. Verification & Acceptance Criteria

- [ ] Canvas background is clean modern off-white `#F4F5F7`.
- [ ] Topbar features centered pill navigation with solid black active pill.
- [ ] Bento Grid displays 2 columns matching the reference screenshot.
- [ ] Real-time Dark Mode map renders with translucent search, zoom controls, and box markers.
- [ ] Orders table displays route with arrows, weight, ETA, and NexaFleet emerald/magenta status pills.
- [ ] Status Overview renders 4 status % and segmented progress bar.
- [ ] Fulfillment Performance renders 89% KPI and vertical emerald bar chart.
- [ ] Revenue Over Time renders sunset gradient with smooth white wave sparkline.
- [ ] Fleet Owner retains `FleetScopeRail` and strict fleet isolation.
- [ ] All automated tests, typechecks, and linters pass (`pnpm --filter admin test`, `pnpm --filter admin typecheck`, `pnpm --filter admin lint`).
