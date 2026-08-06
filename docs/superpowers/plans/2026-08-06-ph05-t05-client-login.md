# PH-05-T05 Client Login Integration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement production-ready client login flows and screens for Mobile Expo (`apps/mobile`) and Operations Web (`apps/admin`), supporting Firebase Phone Auth token handoff and Demo Account selection when enabled by configuration.

**Architecture:** Mobile app (`apps/mobile`) uses `LoginScreen` consuming `httpClient` and `session-store` to handle login via `/auth/login/demo` or `/auth/firebase`, maintaining access tokens in memory and refresh tokens in `expo-secure-store`. Admin web app (`apps/admin`) uses `LoginForm` consuming `browserClient` and `session.ts` for `/auth/login/demo` and `/auth/firebase`. Both clients handle submitting, invalid credentials, provider unavailable, session expired, demo selector toggle, and role-directed redirection after login (`CUSTOMER` -> `/customer/orders`, `DRIVER` -> `/driver/orders`, `FLEET_OWNER` -> `/fleet`, `ADMIN` -> `/admin`).

**Tech Stack:** React 19, React Native (Expo SDK 57), Next.js 16 App Router, TypeScript 7.0, Jest, React Testing Library.

## Global Constraints

- **UI Rules:** Operational logistics UI style — clear visual hierarchy, accessible inputs, no purple gradients or decorative glassmorphism.
- **States:** All screens must explicitly support loading/submitting, invalid credentials error, provider unavailable error, and session expired banner/notice.
- **Security:** Never display or store refresh token in UI state, log messages, or unsecure storage.
- **Role Routing:** Redirect users upon login according to role: `CUSTOMER` -> `/customer/orders`, `DRIVER` -> `/driver/orders`, `FLEET_OWNER` -> `/fleet`, `ADMIN` -> `/admin`.
- **TDD:** Write failing tests first, verify RED state, implement minimal code, verify GREEN state, then commit.

---

### Task 1: Mobile Login Screen Component

**Files:**
- Create: `apps/mobile/src/auth/LoginScreen.tsx`
- Create: `apps/mobile/src/auth/LoginScreen.test.tsx`
- Modify: `apps/mobile/src/auth/session-store.ts` (if helper for demo login is needed)

**Interfaces:**
- Consumes: `httpClient.post('/auth/login/demo', { accountId })`, `httpClient.post('/auth/firebase', { idToken })`, `sessionStore.setSession(accessToken, refreshToken)`
- Produces: `LoginScreenProps { onLoginSuccess?: (role: string) => void; allowDemo?: boolean }`

- [ ] **Step 1: Write failing tests for Mobile LoginScreen**

Write unit & interaction tests for `LoginScreen`:
- Demo login option rendering when `allowDemo=true`.
- Phone / Firebase idToken submission.
- Submitting state disables inputs and shows loading indicator.
- Invalid credentials error message (401 / 403).
- Provider unavailable error message (503 / network error).
- Session expired notification banner if passed `sessionExpired=true`.

- [ ] **Step 2: Run test to verify failure**

Run: `pnpm --filter mobile test -- LoginScreen.test.tsx`
Expected: FAIL (Module `LoginScreen` not found)

- [ ] **Step 3: Implement Mobile LoginScreen**

Create `apps/mobile/src/auth/LoginScreen.tsx`:
- Render header title "Đăng nhập".
- Show session expired banner if `sessionExpired` flag is active.
- Phone / ID Token input field with validation.
- Demo account selector dropdown/buttons (`CUSTOMER`, `DRIVER`, `FLEET_OWNER`, `ADMIN`) when `allowDemo` is enabled (via prop or `process.env.EXPO_PUBLIC_ALLOW_DEMO_AUTH === 'true'`).
- Trigger `httpClient.post` and update `sessionStore.setSession`.
- Call `onLoginSuccess(role)` on success.

- [ ] **Step 4: Run test to verify pass**

Run: `pnpm --filter mobile test -- LoginScreen.test.tsx`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add apps/mobile/src/auth/LoginScreen.tsx apps/mobile/src/auth/LoginScreen.test.tsx
git commit -m "feat(mobile): add LoginScreen component with demo and firebase flows"
```

---

### Task 2: Mobile App Public Route Integration

**Files:**
- Modify: `apps/mobile/app/(public)/login.tsx`
- Test: `apps/mobile/src/auth/login-route.test.tsx`

**Interfaces:**
- Consumes: `LoginScreen` component, `router` from `expo-router`.
- Produces: Public login route at `/login`.

- [ ] **Step 1: Write failing test for login route integration**

Test that `/login` route renders `LoginScreen` and redirects to the appropriate role route on login success (`/customer/orders` for `CUSTOMER`, `/driver/orders` for `DRIVER`, etc.).

- [ ] **Step 2: Run test to verify failure**

Run: `pnpm --filter mobile test -- login-route.test.tsx`
Expected: FAIL (Placeholder text found instead of LoginScreen)

- [ ] **Step 3: Update `apps/mobile/app/(public)/login.tsx`**

Integrate `LoginScreen` into the Expo router public login page, handling navigation redirect based on returned user role.

- [ ] **Step 4: Run test to verify pass**

Run: `pnpm --filter mobile test -- login-route.test.tsx`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add apps/mobile/app/\(public\)/login.tsx apps/mobile/src/auth/login-route.test.tsx
git commit -m "feat(mobile): connect public login route with role redirection"
```

---

### Task 3: Admin Web LoginForm Component

**Files:**
- Create: `apps/admin/src/features/auth/LoginForm.tsx`
- Create: `apps/admin/src/features/auth/LoginForm.test.tsx`
- Modify: `apps/admin/src/lib/auth/session.ts` (export session updater if needed)

**Interfaces:**
- Consumes: `browserClient.post('/auth/login/demo', { accountId })`, `browserClient.post('/auth/firebase', { idToken })`, `setSession({ userId, role, expiresAt })`
- Produces: `<LoginForm allowDemo={boolean} onSuccess={(role: string) => void} />`

- [ ] **Step 1: Write failing tests for Admin LoginForm**

Write unit tests for `LoginForm`:
- Renders login form fields and demo account selector when `allowDemo=true`.
- Submitting state disables form inputs and shows spinner.
- Error alerts on 401/403 (invalid/disabled) and network/provider errors.
- Session expired alert when `sessionExpired` query param/prop is set.
- Invokes `onSuccess` with user role after successful authentication.

- [ ] **Step 2: Run test to verify failure**

Run: `pnpm --filter admin test -- LoginForm.test.tsx`
Expected: FAIL (Module `LoginForm` not found)

- [ ] **Step 3: Implement Admin LoginForm**

Create `apps/admin/src/features/auth/LoginForm.tsx`:
- Operational clean design with proper HTML form semantics (`<form>`, `<label>`, `<input>`, `<button>`).
- Demo selector for fast test/admin login when `allowDemo` / `process.env.NEXT_PUBLIC_ALLOW_DEMO_AUTH === 'true'`.
- Call `browserClient.post` and update session state.
- Accessible error/status message containers.

- [ ] **Step 4: Run test to verify pass**

Run: `pnpm --filter admin test -- LoginForm.test.tsx`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add apps/admin/src/features/auth/LoginForm.tsx apps/admin/src/features/auth/LoginForm.test.tsx
git commit -m "feat(admin): add LoginForm component with authentication and demo support"
```

---

### Task 4: Admin Web Login Page Integration

**Files:**
- Modify: `apps/admin/src/app/(auth)/login/page.tsx`
- Test: `apps/admin/src/app/(auth)/login/login-page.test.tsx`

**Interfaces:**
- Consumes: `LoginForm`, Next.js `useRouter`.
- Produces: `/login` page in Admin Operations Web app.

- [ ] **Step 1: Write failing test for Admin login page**

Test that `/login` page renders `LoginForm` and redirects to `/admin` or `/fleet` upon successful authentication.

- [ ] **Step 2: Run test to verify failure**

Run: `pnpm --filter admin test -- login-page.test.tsx`
Expected: FAIL (Static placeholder button found)

- [ ] **Step 3: Update `apps/admin/src/app/(auth)/login/page.tsx`**

Replace static button placeholder with `LoginForm` and router redirect logic.

- [ ] **Step 4: Run test to verify pass**

Run: `pnpm --filter admin test -- login-page.test.tsx`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add apps/admin/src/app/\(auth\)/login/page.tsx apps/admin/src/app/\(auth\)/login/login-page.test.tsx
git commit -m "feat(admin): connect login page with LoginForm and role routing"
```

---

### Task 5: Scoped Verification and Accessibility Gate

**Files:**
- Test: All mobile and admin test suites

- [ ] **Step 1: Run Mobile tests, lint, and typecheck**

Run:
```bash
pnpm --filter mobile test
pnpm --filter mobile typecheck
pnpm --filter mobile lint
```
Expected: PASS with 0 errors.

- [ ] **Step 2: Run Admin tests, lint, and typecheck**

Run:
```bash
pnpm --filter admin test
pnpm --filter admin typecheck
pnpm --filter admin lint
```
Expected: PASS with 0 errors.

- [ ] **Step 3: Verify git diff clean check**

Run: `git diff --check`
Expected: Exit code 0.

- [ ] **Step 4: Final commit / Gate Record**

```bash
git commit -m "chore(auth): verify PH-05-T05 client login integration gate"
```
