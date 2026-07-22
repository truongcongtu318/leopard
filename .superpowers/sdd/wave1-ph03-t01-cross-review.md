# PH-03-T01 Independent Cross-Review

## Verdict

APPROVED

Re-review confirms I-01 is closed: the root boundary now protects the provider slot, the fallback is provider-independent, and focused RED/GREEN evidence covers provider initialization failure. No open Critical or Important finding remains.

## Critical findings

None.

## Important findings (resolved)

### I-01 — Root error boundary does not protect the provider slot — RESOLVED

- File: `apps/mobile/app/_layout.tsx:40`
- Original finding: `RootProviders` rendered outside `RootErrorBoundary`. An exception thrown while `SafeAreaProvider` rendered—or by any later Query/session provider added to this explicit provider slot—therefore bypassed the fallback.
- This is material to the brief's requirement for both a root error boundary and a provider slot suitable for later providers: the most likely bootstrap additions are precisely the subtree that remains unprotected.
- Resolution: `RootErrorBoundary` now wraps `RootProviders`, and its fallback uses provider-independent React Native primitives while preserving the neutral copy and scope.

## Minor findings (resolved)

### M-01 — The smoke test covers only the successful render path — RESOLVED

- File: `apps/mobile/src/smoke.test.tsx:11`
- Original finding: the test validly proved warning/error-free mounting and restored console spies, but did not exercise the error fallback. Resolution: the focused provider-initialization failure test now covers that path and restores its mutable flag and console spy in `finally`.

## Spec compliance

- Expo identity is `com.leopard.pilot` for Android and iOS; New Architecture is enabled.
- The root includes safe-area handling, Expo Router `Slot`, and an explicit provider component.
- The index route is a neutral operational placeholder with no login, order, tracking, role navigation, protected data, business rule, marketing card, gradient, or glassmorphism.
- No feature route or private data exposure exists.
- I-01 was the only material gap against the root-shell behavior contract and is now closed.

## Code quality

- Components are small and responsibilities are named clearly.
- UTF-8 Vietnamese copy is valid; terminal mojibake from default PowerShell decoding is not present in the files.
- Error fallback copy uses `accessibilityRole="alert"`; the placeholder heading uses `accessibilityRole="header"`.
- The corrected error-boundary/provider composition now protects provider initialization.

## Test validity and TDD

- Coordinator-confirmed RED was valid: Jest discovered the smoke test and failed only on the missing `../app/_layout` implementation.
- The final smoke suite mocks Expo Router's context-dependent `Slot`; its focused provider wrapper uses the real safe-area provider on the success path and can throw on the regression path. Both tests restore mutable diagnostic state in `finally`.
- Coordinator evidence records final `test`, `typecheck`, `lint`, and web `export` exit `0` under Node `24.14.0` and pnpm `11.11.0`.
- The intermediate warning RED and subsequent safe-area-context GREEN are documented consistently.

## Dependency correctness

- Approved PH-03 runtime pins remain exact.
- `@jest/globals@29.7.0` matches `jest@29.7.0`; React DOM/test renderer align with React `19.2.7`.
- `react-native-safe-area-context@5.8.0` closes the deprecated built-in SafeAreaView warning.
- `react-native-web@0.21.2` and `react-dom@19.2.7` are appropriate direct web-export runtime dependencies; the final export bundled successfully.
- Expo's newer-patch recommendations do not override the approved exact PH-03 pins in this task.
- Maestro remains an externally provisioned CLI as already disclosed; it is outside the four-command T01 GREEN gate.

## Warning, security, and scope review

- Final test evidence reports no console warning or error.
- No token, credential, private data, provider call, storage, authorization, or business behavior exists in this shell.
- No dependency or code addition expands beyond the runtime foundation.

## 360x800 and 390x844 reasoning

- Both root layers use `flex: 1`; the placeholder has no fixed width or horizontal layout.
- Horizontal padding is `24`, leaving 312 px at 360 width and 342 px at 390 width for normal-flow text.
- Both text nodes can wrap naturally; no absolute positioning, fixed content width, horizontal scroll, nested card, or sticky action can cause overlap or horizontal overflow.
- Vertical centering with `flex: 1` and `16` px vertical padding fits both 800 and 844 px heights, while the four-edge safe-area view accounts for device insets.
- Structural reasoning is sufficient for this minimal two-text placeholder; no viewport-specific issue was found.

## Review boundaries

- Review was read-only except for this required review artifact.
- No implementation, report, lockfile, mobile source, or Git state was modified.

## I-01 re-review

### Current verdict

APPROVED

### Resolution verification

- `apps/mobile/app/_layout.tsx:40`: `RootErrorBoundary` is now the outer component around `RootProviders`, so a failure thrown during `SafeAreaProvider` initialization occurs in its descendant tree and is caught.
- `apps/mobile/app/_layout.tsx:24`: the fallback uses React Native `View` and `Text` only. It does not depend on `SafeAreaProvider`, `SafeAreaView`, Expo Router, or another application provider that may have failed.
- `apps/mobile/src/smoke.test.tsx:47`: the regression test replaces `SafeAreaProvider` with a controllable wrapper, forces initialization to throw, and asserts the boundary's alert copy. The flag and console spy are restored in `finally`, preventing cross-test leakage.
- The focused TDD record is valid: before reordering, the new provider-failure test exited `1` with the provider exception bypassing the descendant boundary; after the minimal production change, the suite passed both success and provider-failure cases.
- Fresh remediation evidence in the GREEN report records test `0` (2 tests), typecheck `0`, and lint `0`. The previously accepted Coordinator export `0` evidence remains applicable because this fix changes component composition only and adds no dependency/config/export behavior.

### Open findings after re-review

- Critical: none.
- Important: none.
- Minor: none within the focused I-01 remediation scope.

### Scope confirmation

- The fix adds no feature screen, protected data, business rule, dependency, or warning-producing API.
- Existing 360x800 and 390x844 reasoning remains unchanged: the outer boundary and provider reorder introduce no layout dimension, while the fallback retains `flex: 1` and normal-flow text.
- This re-review changed only this review artifact; implementation, GREEN report, lockfile, mobile package/source, and Git state were not modified.
