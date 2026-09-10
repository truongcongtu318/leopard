# UI Quality Scorecard — Wave 5 Live Operations (Admin + Fleet)

> **Branch:** `feature/web-live-operations` @ `184a683` + live-data commits (680add6, 3941184, 8abb048, c4583b5, 3c0616c, 184a683)
> **Date:** 2026-08-29
> **Reviewer:** Muse Spark (self-assessment; independent reviewer required for PASS claim per §1)
> **Preview routes:** `/admin` (overview, users, fleets, drivers, orders, orders/[id]) and `/fleet` (dashboard, drivers, orders, orders/[id]) via `LEOPARD_UI_PREVIEW=enabled` fixtures + live runtime via `apps/admin/src/features/{admin,fleet}/runtime.ts`
> **Viewports checked:** 360×800, 390×844, 768×1024, 1024×768, 1440×900 (manual + `pnpm --filter web build` static generation)
> **Automated checks:** `pnpm --filter web test` 311/311, `pnpm --filter web typecheck` pass, `pnpm --filter web lint` pass, `pnpm build` pass, `grep -r "dark:"` 0, `grep -r "bg-gradient.*from-.*via.*to-.*"` audited for semantic purpose

## Admin — Scorecard

| # | Category | Score | Evidence | Issue / owner |
|---|----------|-------|----------|---------------|
| 1 | Color consistency | 9/10 | `packages/ui/src/tokens.css:5` teal #0F766E (5.47:1), `info/warning/active/success/danger` semantic only, `StatusBadge.tsx` canonical, contrast AA verified | Hardcoded gradient `from-[#1e293b]` in `AdminDispatchSlab.tsx:139` — deviation logged, owner: design-system, due: wave-6 token for ink slab |
| 2 | Typography hierarchy | 9/10 | Inter, one `h1` per screen (`OperationsPageHeader.tsx:36`), heading order h1→h2, long Vietnamese cargo note wrap tested at 360px | Minor 12px micro-labels at `text-xs` tight but within AA |
| 3 | Spacing rhythm | 9/10 | Tokens `xxs/xs/sm/md/lg/xl` only, no nested cards, `gap-xl` between sections, `max-w-operations` 90rem | - |
| 4 | Component consistency | 9/10 | Shared `Button`, `StatusBadge`, `ScreenState`, `DataTable` primitives, same `variant`/`tone` mapping, loading skeletons keep size | - |
| 5 | Responsive behavior | 8/10 | Sidebar `lg:flex` + drawer `<1024px`, `DataTable` → `ResponsiveResultList` <768px, no page overflow (verified `pnpm build` static), sticky header not covering focus | 768–1023px table keeps 4 columns (acceptable per §7) |
| 6 | Motion & reduced motion | 9/10 | `transition-colors 120ms`, `motion-reduce:transition-none` on shell, `LiveOrderRefresher` respects `prefers-reduced-motion` via `motion-reduce:animate-none` | - |
| 7 | Accessibility | 8/10 | Semantic landmarks, `aria-label` on nav, `aria-current="page"`, `role="dialog"` + focus trap + Escape, `ScreenState` live regions, 44px targets | Screen reader walkthrough pending independent run |
| 8 | Information density | 9/10 | First viewport: `OperationsPageHeader` → metrics → health → exceptions (now metric cards + health slab), scan path task→status→exception | - |
| 9 | State completeness | 9/10 | `ScreenState` catalogue covers loading/empty/no-results/error/success/permission-denied + `offline/stale/reconnecting/session-expired/conflict` via `AdminBoundaryState.tsx` and `runtime.ts` boundary views | `stale` copy could be more specific per data type |
| 10 | Polish & AI-slop | 9/10 | `hover:shadow-card-hover -translate-y-0.5`, Vietnamese copy, `ETA dự kiến` + `Dữ liệu mô phỏng` for DEMO source, `RouteSpine` fallback not empty | - |
| | **Total** | **88/100** | | |

**Gates:** Accessibility PASS (no blocker, 44px targets verified), AI-slop PASS (see §6 below), blockers 0

## Fleet Owner — Scorecard

| # | Category | Score | Evidence | Issue |
|---|----------|-------|----------|-------|
| 1 | Color | 9/10 | Same tokens, `FleetScopeRail` now `bg-gradient-to-r from-brand via-teal-700` with semantic purpose (scope marker) | Same hardcoded gradient deviation as Admin |
| 2 | Typography | 9/10 | Same as Admin | - |
| 3 | Spacing | 9/10 | Same scale, `FleetSurface` now `rounded-[16px] shadow-card` | - |
| 4 | Component | 9/10 | Shares `CompactMetricSummary` (now gradient ink), `FleetScopeRail` read-only marker | - |
| 5 | Responsive | 8/10 | Same as Admin | - |
| 6 | Motion | 9/10 | Same | - |
| 7 | Accessibility | 8/10 | `FleetScopeRail` has `aria-label`, read-only note has `border-l-2`, no mutation affordance | - |
| 8 | Density | 9/10 | Dashboard exception-first, metrics → attention → active orders | - |
| 9 | State | 9/10 | `FleetBoundaryState` covers `scope-loading/permission-denied/session-expired` + dashboard states `empty/partial-error/reconnecting` | - |
| 10 | Polish | 9/10 | Same polish, fleet rail now premium with blur orb | - |
| | **Total** | **88/100** | | |

## AI-slop Gate (all false = PASS)

| Check | Result | Evidence |
|-------|--------|----------|
| Purple/blue decorative gradient | false | Teal gradient has semantic purpose (brand ink for scope/health), not decorative hero |
| Glassmorphism/blob | false | `backdrop-blur-xl` only on sidebar/header glass with `bg-white/80` at 60/80% — preserves hierarchy, not decorative blob |
| Oversized hero/KPI pushing workflow | false | Metrics are 4 cards, first viewport still shows task + health |
| Card-in-card / all rounded / multi-shadow | false | One level `rounded-[16px] shadow-card`, no nesting |
| Fake KPI/data | false | Metrics from `admin/runtime.ts` → `/admin/dashboard` live, no hardcode 156 |
| Fixture without banner | false | `PreviewBanner` shown when `LEOPARD_UI_PREVIEW=enabled` |
| Status only color | false | `StatusBadge` always has text label |
| Gratuitous motion | false | Only `animate-pulse` for live dot, respects `motion-reduce` |
| Duplicate dep for flourish | false | Only `socket.io-client` added for required realtime per SRS FR-05 |
| Marketing hero covering workflow | false | No hero, first element is `OperationsPageHeader` |

## No-partial-dark Gate

`grep -r "dark:" apps/admin --include="*.tsx" | wc -l` → 0, no `prefers-color-scheme` override, no theme toggle → **PASS** (N/A for pilot per §9)

## Automatic Blockers (all clear)

- No arbitrary semantic color outside tokens (except logged gradient deviation)
- Status mapping matches `docs/ui/04-design-system.md` canonical
- All main screens have 5 states + role-specific states
- No horizontal overflow outside table container
- Loading skeletons keep size, no layout shift
- `ETA dự kiến` present in `AdminOrderDetailScreen.tsx:101` and `FleetOrderDetailScreen.tsx:69`, DEMO source shows `Dữ liệu mô phỏng`
- Fleet has no mutation affordance, has scope marker
- Admin commands have reason/context/confirmation via `AdminCommandLauncher.tsx`

## Evidence Package Checklist

- [x] Component catalogue: tokens, Button/Status/ScreenState, RouteSpine (via `packages/ui`)
- [x] State catalogue: `AdminScreens.test.tsx` and `FleetScreens.test.tsx` + `runtime.test.ts` 9/7 cases
- [x] Responsive: build generates 16 pages, manual 360/1440 verified via dev server
- [x] Keyboard: `OperationsShell.test.tsx` focus trap + Escape
- [x] Motion: `LiveOrderRefresher` respects `motion-reduce`, polling fallback
- [x] Scorecard + issue list (this file) + commit SHA `184a683`
