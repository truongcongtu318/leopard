# Expo Mobile Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Tạo Expo application foundation production-quality cho Customer/Driver với navigation, API/session boundary và mobile design primitives.

**Architecture:** Expo Router groups tách public/customer/driver; TanStack Query quản lý server state; secure storage giữ refresh credential; presentation không chứa business rule.

**Tech Stack:** Expo 57.0.4, React Native 0.86.0, React 19.2.7, Expo Router, TanStack Query, React Hook Form, Vitest/Jest Native Testing Library.

## Global Constraints

- Branch `codex/ph-03-expo-foundation` từ Wave 0 baseline.
- PH-03 sở hữu `apps/mobile/app/**` route shell và `apps/mobile/src/theme/**`.
- Hỗ trợ 360x800 và 390x844; touch target tối thiểu 44x44.
- Không yêu cầu background location hoặc app-store build trong pilot.

---

### Task PH-03-T01: Expo Runtime Shell

**Files:**
- Create: `apps/mobile/package.json`, `apps/mobile/app.json`, `apps/mobile/tsconfig.json`, `apps/mobile/babel.config.js`
- Create: `apps/mobile/app/_layout.tsx`, `apps/mobile/app/index.tsx`
- Test: `apps/mobile/src/smoke.test.tsx`

**Interfaces:** Produces scripts `start`, `android`, `ios`, `test`, `lint`, `typecheck`, `export` and root provider slot.

- [ ] Write a render test expecting root route to mount without console error; observe missing app failure.
- [ ] Create Expo SDK 57 app with package identity `com.leopard.pilot`, New Architecture default, safe-area and error boundary.
- [ ] Run `pnpm --filter mobile test`, `typecheck`, `expo export --platform web`; expected all exit 0.
- [ ] Commit with `git commit -m "build(mobile): scaffold Expo application"`.

### Task PH-03-T02: Navigation and Role Boundary

**Files:**
- Create: `apps/mobile/app/(public)/login.tsx`
- Create: `apps/mobile/app/(customer)/_layout.tsx`, `apps/mobile/app/(customer)/orders/index.tsx`
- Create: `apps/mobile/app/(driver)/_layout.tsx`, `apps/mobile/app/(driver)/orders/index.tsx`
- Create: `apps/mobile/src/navigation/role-router.ts`
- Test: `apps/mobile/src/navigation/role-router.test.ts`

**Interfaces:** Consumes `Role`; produces `getMobileHome(role): '/(customer)/orders' | '/(driver)/orders' | '/(public)/login'`.

- [ ] Test Customer/Driver home mapping and Fleet Owner/Admin rejection to login/unsupported-role state.
- [ ] Implement route guards that wait for session hydration and never render protected data before authorization.
- [ ] Run navigation tests; expected exact role mappings and no unauthorized screen flash.
- [ ] Commit with `git commit -m "feat(mobile): add role-aware navigation shell"`.

### Task PH-03-T03: Mobile Theme and State Primitives

**Files:**
- Create: `apps/mobile/src/theme/tokens.ts`
- Create: `apps/mobile/src/ui/Button.tsx`, `FormField.tsx`, `StatusBadge.tsx`, `ScreenState.tsx`, `EtaIndicator.tsx`
- Test: `apps/mobile/src/ui/primitives.test.tsx`

**Interfaces:** Produces semantic tokens and primitives with accessibility labels; `EtaIndicator({durationSeconds, source, isLoading, error})`.

- [ ] Test button minimum height 44, visible disabled/loading label, status text, ETA copy and mandatory “Dữ liệu mô phỏng” for DEMO.
- [ ] Implement spacing 4/8/12/16/24/32, radius 6, WCAG AA semantic colors; no gradients/glassmorphism.
- [ ] Run component tests and screenshot at 360/390 widths; expected no horizontal overflow or layout shift while loading.
- [ ] Commit with `git commit -m "feat(mobile): add accessible design primitives"`.

### Task PH-03-T04: API and Session Client Boundary

**Files:**
- Create: `apps/mobile/src/api/http-client.ts`, `query-client.ts`, `api-error.ts`
- Create: `apps/mobile/src/auth/session-store.ts`, `secure-session-storage.ts`
- Test: `apps/mobile/src/api/http-client.test.ts`, `apps/mobile/src/auth/session-store.test.ts`

**Interfaces:** Produces `request<T>(input: RequestInput): Promise<T>`, one refresh retry on 401, `SessionStore` hydration/logout; consumes PH-05 auth endpoints later.

- [ ] Test bearer injection, request ID propagation, one refresh retry, concurrent 401 refresh deduplication, error-envelope parsing and logout on refresh failure.
- [ ] Implement transport against `EXPO_PUBLIC_API_URL`; store refresh token only in Expo SecureStore and access token in memory.
- [ ] Run all mobile tests/typecheck/export; expected exit 0.
- [ ] Commit with `git commit -m "feat(mobile): add typed API session boundary"`.

## Phase Boundary Rules

- Do not implement real login/order/tracking screens.
- Do not persist access tokens in AsyncStorage.
- Do not invent API response fields outside shared/OpenAPI contracts.
- Feature screens may consume but not modify navigation root and theme tokens.
