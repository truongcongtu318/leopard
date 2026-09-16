# Driver Auth Flow Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Bring the 6 driver auth screens to the Grab driver design system and both mobile skill rule sets without changing auth behavior.

**Architecture:** Route files stay thin (params + runtime mount). Each screen follows Route – Runtime – View. All color, type, radius, shadow values come from `@leopard/mobile-core` public exports (`driverPrimitives`, `driverSemantics`, `iosContinuousCurve`). No new dependencies.

**Tech Stack:** React Native 0.86, Expo 57, Expo Router, TypeScript, `@leopard/mobile-core`, react-native-svg, Pressable.

**Spec:** `docs/ui/17-grab-driver-design-system.md` (Grab green `#00B14F`, dark pill `#1E242B`, canvas `#F8FAFC`, card radius 12px, bento 14px).

## Global Constraints

- All styling via `StyleSheet.create` static outside render (never inline objects in render loop).
- Interactive elements use `Pressable` (never TouchableOpacity), min touch target 44x44pt or `hitSlop >= 12`.
- No emoji as functional icons; vector SVG only.
- Monetary/counter text uses `fontVariant: ['tabular-nums']`.
- No falsy `&&` conditionals for rendering (`{x && <Y/>}` forbidden; use ternary or explicit `> 0` / `!= null` checks).
- Squircle corners: spread `iosContinuousCurve` alongside every `borderRadius`.
- Safe areas via `useSafeAreaInsets()` / `SafeAreaInsetsContext` (never deprecated `SafeAreaView` import from `react-native-safe-area-context` root for new code; existing usages migrate to insets).
- Import from `@leopard/mobile-core` public barrel only. Deep `src/...` imports allowed ONLY for `./auth/firebase`, `./auth/firebase-auth`, `./auth/LoginScreen` (firebase ESM breaks jest-expo barrel — see `packages/mobile-core/src/index.ts` NOTE comment).
- Verification per task: `pnpm --filter driver test -- <testfile>` PASS + `pnpm --filter driver typecheck` clean.

---

### Task 1: Public import hygiene (kyc-pending, verify-otp, tests)

**Files:**
- Modify: `apps/driver/app/(public)/kyc-pending.tsx:15-18`
- Modify: `apps/driver/app/(public)/verify-otp.tsx:17-19`
- Modify: `apps/driver/src/auth/verify-otp.test.tsx:6-7`, `driver-register-recovery.audit.test.tsx:6-8`, `driver-register-route.test.tsx:6-8`, `login-route.test.tsx:6-8`, `kyc-pending.test.tsx:7-8`
- Test: existing suites above (no new tests; behavior unchanged)

**Interfaces:**
- Consumes: public barrel `packages/mobile-core/src/index.ts` (already exports `httpClient`, `sessionStore`, `toE164Vn`, `leopardPalette`, `radius`, `IconShield`, `IconTruck`)
- Produces: zero `mobile-core/src/` imports outside the firebase exception list

- [ ] **Step 1: Rewrite deep imports to barrel imports**

In `apps/driver/app/(public)/kyc-pending.tsx`, replace:
```tsx
import { httpClient } from '@leopard/mobile-core/src/api/http-client';
import { sessionStore } from '@leopard/mobile-core/src/auth/session-store';
import { leopardPalette, radius } from '@leopard/mobile-core/src/theme/tokens';
import { IconShield, IconTruck } from '@leopard/mobile-core/src/icons/svg-icons';
```
with:
```tsx
import {
  httpClient,
  sessionStore,
  leopardPalette,
  radius,
  IconShield,
  IconTruck,
} from '@leopard/mobile-core';
```
Apply the same barrel rewrite in `apps/driver/app/(public)/verify-otp.tsx` (for `httpClient`, `sessionStore`, `toE164Vn`) and in the 5 test files listed above (for `httpClient`, `sessionStore`).

- [ ] **Step 2: Run tests to verify nothing broke**

Run: `pnpm --filter driver test -- src/auth/verify-otp.test.tsx src/auth/kyc-pending.test.tsx src/auth/login-route.test.tsx src/auth/driver-register-route.test.tsx`
Expected: PASS (import-only change)

- [ ] **Step 3: Run typecheck**

Run: `pnpm --filter driver typecheck`
Expected: zero errors

- [ ] **Step 4: Commit**

```bash
git add apps/driver/app/\(public\)/kyc-pending.tsx apps/driver/app/\(public\)/verify-otp.tsx apps/driver/src/auth/
git commit -m "refactor(driver-auth): use public mobile-core barrel imports"
```

---

### Task 2: kyc-pending token + hitSlop alignment

**Files:**
- Modify: `apps/driver/app/(public)/kyc-pending.tsx` (const block lines 28-29, `hitSlop={8}` lines 97/111, StyleSheet lines 212-442)
- Test: `apps/driver/src/auth/kyc-pending.test.tsx`

**Interfaces:**
- Consumes: `driverPrimitives`, `driverSemantics`, `iosContinuousCurve`, `typeScale` from `@leopard/mobile-core`
- Produces: kyc-pending renders identical copy/layout with token colors, 12px squircles, hitSlop 12

- [ ] **Step 1: Write failing test for back-button hitSlop**

Append to `apps/driver/src/auth/kyc-pending.test.tsx`:
```tsx
it('gives the back button a 12pt touch slop', async () => {
  const screen = await render(<KycPendingRoute />);
  const backBtn = screen.getByTestId('btn-back');
  expect(backBtn.props.hitSlop).toMatchObject({ top: 12, bottom: 12, left: 12, right: 12 });
  await screen.unmount();
});
```
Run: `pnpm --filter driver test -- src/auth/kyc-pending.test.tsx`
Expected: FAIL (hitSlop is currently `8`)

- [ ] **Step 2: Replace hardcoded colors with tokens**

Delete `const DRIVER_BLUE = '#1E5BB8'` (line 28). Replace every `DRIVER_BLUE` usage with `driverPrimitives.colors.blue600` (verify exact key in `packages/mobile-core/src/theme/driver-tokens.ts`; if missing use `#0284C7` via `driverSemantics.info.text`). Replace `'#0B1E42'` text color with `driverSemantics.text.primary`. Replace `'#CAD9EB'` border with `driverPrimitives.colors.gray200`. Replace `borderRadius: 14` on `secondaryActionBtn` with `borderRadius: 12` + `...iosContinuousCurve`. Import all three (`driverPrimitives`, `driverSemantics`, `iosContinuousCurve`) from `@leopard/mobile-core`.

- [ ] **Step 3: Bump hitSlop to 12**

Replace both `hitSlop={8}` (back button line 97, logout line 111) with `hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}`.

- [ ] **Step 4: Run tests + typecheck**

Run: `pnpm --filter driver test -- src/auth/kyc-pending.test.tsx`
Expected: PASS including new hitSlop test
Run: `pnpm --filter driver typecheck`
Expected: zero errors

- [ ] **Step 5: Commit**

```bash
git add apps/driver/app/\(public\)/kyc-pending.tsx apps/driver/src/auth/kyc-pending.test.tsx
git commit -m "refactor(driver-auth): align kyc-pending with design tokens"
```

---

### Task 3: Splash safe-area + tokens (keep slide gesture)

**Files:**
- Modify: `apps/driver/src/auth/DriverSplashScreen.tsx`
- Test: `apps/driver/src/auth/DriverSplashScreen.test.tsx`

**Interfaces:**
- Consumes: `useSafeAreaInsets` from `react-native-safe-area-context`, `driverPrimitives`, `iosContinuousCurve`
- Produces: identical slide-to-start behavior, no deprecated SafeAreaView, token colors

- [ ] **Step 1: Replace SafeAreaView with insets**

Remove `import { SafeAreaView } from 'react-native-safe-area-context'` (line 16). Add `useSafeAreaInsets` to that import. Inside `DriverSplashScreen`, call `const insets = useSafeAreaInsets();` and replace the `<SafeAreaView>` wrapper with `<View style={[styles.root, { paddingTop: insets.top, paddingBottom: Math.max(insets.bottom, 16) }]}>`. (The slide thumb animates only `transform: translateX` + opacity — already GPU-safe per `animation-gpu-properties`; do not touch the PanResponder logic.)

- [ ] **Step 2: Replace hardcoded colors**

Replace `'#0B1E42'` background with `driverSemantics.surface.splash` (verify key; fallback `driverPrimitives.colors.dark900`). Replace `'#F97316'` thumb/accent with `driverPrimitives.colors.orange500` (verify key; fallback keep hex but move into a `splashScene` const next to styles, not inline). Add `...iosContinuousCurve` to the slide track style (borderRadius pill stays 999).

- [ ] **Step 3: Run tests + typecheck**

Run: `pnpm --filter driver test -- src/auth/DriverSplashScreen.test.tsx`
Expected: PASS
Run: `pnpm --filter driver typecheck`
Expected: zero errors

- [ ] **Step 4: Commit**

```bash
git add apps/driver/src/auth/DriverSplashScreen.tsx
git commit -m "refactor(driver-auth): splash safe-area insets and tokens"
```

---

### Task 4: Login — extract OTP modal, fix falsy renders, SVG Google mark

**Files:**
- Create: `apps/driver/src/auth/DriverOtpModal.tsx` (phone/OTP phase UI moved verbatim from `DriverLoginScreen.tsx:380-584`)
- Modify: `apps/driver/src/auth/DriverLoginScreen.tsx` (render `<DriverOtpModal>` instead; keep all firebase/auth state + handlers)
- Test: `apps/driver/src/auth/login-route.test.tsx` + new modal render test in same file

**Interfaces:**
- Consumes: existing login state (`otpCode`, `setOtpCode`, `isSubmitting`, `errorMsg`, `resendSeconds`, `isVerified`, handlers `handleResendOtp`, `handleVerifyOtp`) passed as props
- Produces: `DriverOtpModalProps` with exact prop names listed in Step 3; login screen pixel-identical

- [ ] **Step 1: Write failing test for the extracted modal**

Append to `apps/driver/src/auth/login-route.test.tsx`:
```tsx
import { DriverOtpModal } from './DriverOtpModal';

it('renders otp modal with countdown text', async () => {
  const screen = await render(
    <DriverOtpModal
      errorMsg={null}
      isSubmitting={false}
      isVerified={false}
      onChangeCode={() => {}}
      onClose={() => {}}
      onResend={() => {}}
      onVerify={() => {}}
      otpCode=""
      resendSeconds={45}
    />,
  );
  expect(screen.getByText(/Gửi lại mã sau \(45s\)/)).toBeTruthy();
  await screen.unmount();
});
```
Run: `pnpm --filter driver test -- src/auth/login-route.test.tsx`
Expected: FAIL with "DriverOtpModal not defined"

- [ ] **Step 2: Create DriverOtpModal with verbatim moved JSX**

Create `apps/driver/src/auth/DriverOtpModal.tsx` exporting `DriverOtpModalProps`:
```tsx
export type DriverOtpModalProps = Readonly<{
  otpCode: string;
  isSubmitting: boolean;
  errorMsg: string | null;
  resendSeconds: number;
  isVerified: boolean;
  resendSuccessMsg: string | null;
  onChangeCode: (code: string) => void;
  onVerify: () => void;
  onResend: () => void;
  onClose: () => void;
}>;
```
Move the OTP-phase JSX block from `DriverLoginScreen.tsx` lines ~380-584 into the modal body unchanged except: replace every `{foo && <Bar/>}` with `{foo ? <Bar/> : null}` and `{resendSeconds > 0 && styles.x}` style conditionals stay (style arrays tolerate `false`, only JSX children are forbidden). Add `...iosContinuousCurve` to modal card style. Replace `hitSlop={8}` on modal back/close with 12.

- [ ] **Step 3: Replace Google "G" Text with SVG**

In `DriverLoginScreen.tsx`, find the Google button rendering `<Text>G</Text>` (or similar single-letter mark). Replace with an inline `Svg` circle + path multicolor mark (4-path standard Google "G": blue/red/yellow/green paths, 18x18 viewBox `0 0 24 24`). No new dependency.

- [ ] **Step 4: Wire modal into login screen and fix remaining falsy renders**

In `DriverLoginScreen.tsx`, replace the inline OTP JSX with `<DriverOtpModal ... />` passing the 10 props. Grep the file for remaining `&&` JSX patterns (`} && <` / `} && (`) and convert each to ternary. `hitSlop` import already exists (`hitSlop` from mobile-core, line 28) — reuse it.

- [ ] **Step 5: Run tests + typecheck**

Run: `pnpm --filter driver test -- src/auth/login-route.test.tsx src/auth/verify-otp.test.tsx`
Expected: PASS
Run: `pnpm --filter driver typecheck`
Expected: zero errors

- [ ] **Step 6: Commit**

```bash
git add apps/driver/src/auth/DriverLoginScreen.tsx apps/driver/src/auth/DriverOtpModal.tsx apps/driver/src/auth/login-route.test.tsx
git commit -m "refactor(driver-auth): extract otp modal, fix falsy renders"
```

---

### Task 5: Register — split Route/Runtime/View + tokenize scene

**Files:**
- Create: `apps/driver/src/features/registration/driver-register-model.ts` (VEHICLE_OPTIONS, CITIES, DOC_SLOTS, Draft types, `isValidPlate`, error mapper — moved verbatim)
- Create: `apps/driver/src/features/registration/useDriverRegister.ts` (~30 useStates + handlers + submit logic moved verbatim)
- Create: `apps/driver/src/features/registration/DriverRegisterView.tsx` (wizard steps 1-4 JSX moved verbatim)
- Modify: `apps/driver/app/(public)/driver-register.tsx` (reduce to ~60 lines: `useRouter` + `useDriverRegister()` + `<DriverRegisterView/>`)
- Test: `apps/driver/src/auth/driver-register-route.test.tsx`, `driver-register-recovery.audit.test.tsx`

**Interfaces:**
- Consumes: `useDriverRegister()` returns `{ draft, setters..., currentStep, goToStep, submitState, contract, otp, handlers... }` (exact shape fixed in Step 3)
- Produces: register route pixel-identical, file under 100 lines

- [ ] **Step 1: Extract model constants (no behavior change)**

Create `apps/driver/src/features/registration/driver-register-model.ts`. Move verbatim: `VehicleOption`, `VehicleDefinition`, `VEHICLE_OPTIONS`, `CITIES`, `DocType`, `DOC_SLOTS`, `DRAFT_STORAGE_KEY`, `DriverRegisterDraft`, `isValidPlate` (line 209), `newRequestId` (215), `formatSignedAt` (223), `mapApplyError` (238). Update `driver-register.tsx` to import them from the new path. Run: `pnpm --filter driver test -- src/auth/driver-register-route.test.tsx` Expected: PASS.

- [ ] **Step 2: Extract register hook (no behavior change)**

Create `apps/driver/src/features/registration/useDriverRegister.ts`. Move all ~30 `useState` calls (lines 262-300) + validation/submit/OTP/contract handlers into the hook, returning one object. Route file calls it and spreads props into the view. No logic edits — pure move. Run tests, Expected: PASS.

- [ ] **Step 3: Extract register view (no behavior change)**

Create `apps/driver/src/features/registration/DriverRegisterView.tsx` receiving the hook return as props. Move wizard JSX (steps 1-4, stepper, OTP modal, contract section) verbatim. Route file becomes:
```tsx
import { useRouter } from 'expo-router';
import { useDriverRegister } from '../src/features/registration/useDriverRegister';
import { DriverRegisterView } from '../src/features/registration/DriverRegisterView';

export default function DriverRegisterRoute() {
  const router = useRouter();
  const registration = useDriverRegister();
  return <DriverRegisterView onDone={() => router.replace('/(public)/kyc-pending')} registration={registration} />;
}
```
(Keep existing success navigation target — verify against current line ~481 behavior before finalizing.) Run tests, Expected: PASS.

- [ ] **Step 4: Tokenize scene table**

In `DriverRegisterView.tsx` (or a `driver-register-scene.ts` beside it), replace the 20-entry `scene` const (lines 42-63) with `driverPrimitives`/`driverSemantics` references: canvas→`driverSemantics.surface.canvas`, surface→`driverSemantics.surface.card`, ink→`driverSemantics.text.inverse`, muted/subtle→`driverSemantics.text.muted`, borders→`driverPrimitives.colors.*`, CTA `#0284C7`→`driverSemantics.action.primary`, success→`driverPrimitives.colors.green500`. Add `...iosContinuousCurve` to card/input/CTA styles. Convert all falsy `&&` JSX to ternary.

- [ ] **Step 5: Run full auth tests + typecheck + lint**

Run: `pnpm --filter driver test -- src/auth/`
Expected: all PASS
Run: `pnpm --filter driver typecheck && pnpm --filter driver lint`
Expected: zero errors

- [ ] **Step 6: Commit**

```bash
git add apps/driver/app/\(public\)/driver-register.tsx apps/driver/src/features/registration/ apps/driver/src/auth/
git commit -m "refactor(driver-auth): split register route-runtime-view and tokenize"
```

---

### Task 6: Final verification gate

- [ ] **Step 1: Full driver suite**

Run: `pnpm --filter driver test`
Expected: 64 suites PASS (count may grow with new modal/hitSlop tests)

- [ ] **Step 2: Typecheck + lint**

Run: `pnpm --filter driver typecheck && pnpm --filter driver lint`
Expected: zero errors

- [ ] **Step 3: Manual web check**

Run: `pnpm --filter driver web`, open `http://localhost:8082`, walk Splash → Login → OTP → Register → KYC-pending. Confirm: back buttons work, 44pt targets, no clipped text, no visual change except squircles/tokens.

## Self-Review

- Spec coverage: design-system tokens (Tasks 2-5), `ui-pressable`/`ui-styling` (already compliant, preserved), `rendering-no-falsy-and` (Tasks 4-5), `imports-design-system-folder` (Task 1 + firebase exception documented), `ui-safe-area-scroll` (Task 3), `borderCurve` (Tasks 2-5), touch targets (Tasks 2/4). Auth behavior unchanged in every task (pure moves + style tokens).
- No placeholders: every step names exact files/lines, exact commands, exact expected output.
- Type consistency: `DriverOtpModalProps` (Task 4) and `useDriverRegister` return shape (Task 5) are defined once at creation and consumed verbatim by callers.
