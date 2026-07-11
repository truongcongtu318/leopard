# Operations Web Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Tạo Next.js operations web foundation cho Fleet Owner/Admin với role shell, typed API boundary, dense design system và responsive operational layout.

**Architecture:** App Router route groups tách auth/fleet/admin; server components dùng cho shell/read bootstrap, client components dùng cho filters/actions. Backend quyết định authorization; middleware chỉ tối ưu navigation.

**Tech Stack:** Next.js 16.2.10, React 19.2.7, Tailwind CSS 4.3.2, TanStack Query/Table, React Hook Form, Vitest 4.1.10, Playwright 1.61.1.

## Global Constraints

- Branch `codex/ph-04-operations-web` từ Wave 0 baseline.
- PH-04 sở hữu route layouts, navigation shell, `packages/ui` và web design tokens.
- Desktop target 1024x768/1440x900; tablet fallback 768x1024.
- Không landing page, gradient tím, glassmorphism, hero hoặc card lồng card.

---

### Task PH-04-T01: Next.js Runtime Shell

**Files:**
- Create: `apps/admin/package.json`, `apps/admin/next.config.ts`, `apps/admin/tsconfig.json`
- Create: `apps/admin/src/app/layout.tsx`, `apps/admin/src/app/page.tsx`, `apps/admin/src/app/globals.css`
- Test: `apps/admin/src/app/page.test.tsx`

**Interfaces:** Produces scripts `dev`, `test`, `lint`, `typecheck`, `build`, `test:e2e` and provider slot.

- [ ] Write a root redirect test expecting unauthenticated `/` to resolve to `/login`; observe missing app failure.
- [ ] Create App Router shell, metadata `LEOPARD Operations`, CSP-ready config and font fallback without external runtime dependency.
- [ ] Run test/typecheck/build; expected all exit 0.
- [ ] Commit with `git commit -m "build(admin): scaffold operations web"`.

### Task PH-04-T02: Role Layout and Navigation

**Files:**
- Create: `apps/admin/src/app/(auth)/login/page.tsx`
- Create: `apps/admin/src/app/(fleet)/fleet/layout.tsx`, `apps/admin/src/app/(admin)/admin/layout.tsx`
- Create: `apps/admin/src/components/shell/OperationsShell.tsx`, `RoleNavigation.tsx`
- Test: `apps/admin/src/components/shell/RoleNavigation.test.tsx`

**Interfaces:** Consumes `Role`; produces exact navigation sets from `docs/ui/02-navigation-map.md`.

- [ ] Test Fleet Owner gets Overview/Drivers/Fleet Orders; Admin gets Overview/Orders/Users/Fleets/Drivers; Customer/Driver get permission denied.
- [ ] Implement fixed desktop sidebar and tablet drawer with focus trap, Escape close and visible current route.
- [ ] Run component tests and Playwright shell checks at 768/1024/1440 widths.
- [ ] Commit with `git commit -m "feat(admin): add role-scoped operations shell"`.

### Task PH-04-T03: Web Design System

**Files:**
- Create: `packages/ui/package.json`, `packages/ui/src/tokens.css`
- Create: `packages/ui/src/Button.tsx`, `StatusBadge.tsx`, `DataTable.tsx`, `Pagination.tsx`, `FilterBar.tsx`, `ScreenState.tsx`, `MapPanel.tsx`
- Test: `packages/ui/src/components.test.tsx`

**Interfaces:** Produces framework-compatible UI primitives; DataTable receives rows/columns/loading and never fetches data itself.

- [ ] Test keyboard focus, accessible names, badge text, stable loading dimensions, empty/error/permission states and controlled pagination callbacks.
- [ ] Implement exact spacing/radius/semantic token rules from `docs/ui/04-design-system.md`; use Lucide icons for icon actions with tooltips.
- [ ] Run package tests/typecheck and visual snapshots at required desktop/tablet viewports.
- [ ] Commit with `git commit -m "feat(ui): add operations design system"`.

### Task PH-04-T04: Web API and Session Boundary

**Files:**
- Create: `apps/admin/src/lib/api/server-client.ts`, `browser-client.ts`, `api-error.ts`
- Create: `apps/admin/src/lib/auth/session.ts`, `role-policy.ts`
- Test: `apps/admin/src/lib/api/client.test.ts`, `apps/admin/src/lib/auth/role-policy.test.ts`

**Interfaces:** Produces server/browser `request<T>`, httpOnly refresh-cookie flow, `canAccessOperationsRoute(role,path): boolean`.

- [ ] Test bearer/session propagation, no token exposure to client bundles, error-envelope parsing, 401 redirect and 403 permission state.
- [ ] Implement same-origin BFF/session boundary only; no business authorization in middleware.
- [ ] Run admin lint/typecheck/test/build; expected all exit 0.
- [ ] Commit with `git commit -m "feat(admin): add secure API session boundary"`.

## Phase Boundary Rules

- Do not implement Fleet/Admin data pages beyond route placeholders.
- Do not hide authorization failures by returning empty data.
- Do not add raw color values or per-feature spacing outside tokens.
- Feature agents cannot modify root layouts, navigation definitions or package UI tokens.
