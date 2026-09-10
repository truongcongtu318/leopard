# PH-03-T01 pre-D1 report

## Status

DONE — preparation is complete; RED/GREEN verification remains intentionally pending Barrier D1.

## Files changed

- `apps/mobile/package.json`
- `apps/mobile/app.json`
- `apps/mobile/tsconfig.json`
- `apps/mobile/babel.config.js`
- `apps/mobile/eslint.config.mjs`
- `apps/mobile/src/smoke.test.tsx`

## Preparation completed

- Declared the `mobile` Expo workspace package with the PH-03 runtime dependencies pinned to the plan's exact versions, plus pinned Jest/test-renderer tooling required to execute its future render test.
- Added the required `start`, `android`, `ios`, `test`, `test:e2e`, `lint`, `typecheck`, and `export` scripts.
- Configured the Expo application identity as `com.leopard.pilot` for both Android and iOS, with Expo Router, Metro web export, portrait orientation, and New Architecture enabled.
- Added minimal Expo TypeScript, Babel, and Jest configuration; Jest uses `jest-expo` and discovers `src/smoke.test.tsx` by its standard test suffix.
- Added a root-layout render test that imports `apps/mobile/app/_layout.tsx`; that file is deliberately absent until D1 opens.

## D1 manifest remediation

- Changed `jest-expo` from the unavailable `57.0.4` to the registry-validated SDK 57 version `57.0.2`.
- Added direct development dependency `babel-preset-expo` pinned to `57.0.3`, because `babel.config.js` imports that preset directly.
- Pinned `jest` to `29.7.0` to satisfy `jest-watch-typeahead`'s Jest `<=29` peer requirement.
- Added direct runtime dependency `react-native-worklets` pinned to `0.10.0` to satisfy `expo-modules-core` without accepting the peer-incompatible `0.11.1` auto-resolution.
- Added `@leopard/config` as a direct workspace development dependency and an ESLint flat-config bridge that exports the shared base configuration, allowing the required `eslint .` script to resolve under ESLint 9.

## Expected RED evidence after D1 install

Run:

```powershell
pnpm --filter mobile --fail-if-no-match test
```

Expected result: Jest fails while resolving `../app/_layout` from `src/smoke.test.tsx`, because the required root layout has not been created. This is the intended missing-implementation failure, not a test discovery or package-filter failure.

## Pre-D1 lint review remediation

- Reproduced the review failure under Node `24.14.0`: the shared ESLint 9 flat config treated `babel.config.js` as ESM and reported `module is not defined`.
- Static reproduction also exposed that the shared TypeScript preset is not resolvable from the isolated mobile workspace. Extended only `apps/mobile/eslint.config.mjs` so TS/TSX linting uses the package's direct `babel-preset-expo` dependency.
- Added a file-scoped CommonJS override for `babel.config.js`, declaring `module` read-only and setting `sourceType: 'commonjs'`.
- Verified with Node `24.14.0` and pnpm `11.11.0`:

```powershell
$env:pnpm_config_verify_deps_before_run = 'false'
pnpm --filter mobile --fail-if-no-match lint
```

Result: exit `0`; output ended with `$ eslint .` and no lint errors or warnings. The environment override prevents pnpm 11.11's dependency-status hook from attempting the forbidden automatic install; it does not change project files.

## Verification and boundaries

- Parsed `package.json`, `app.json`, and `tsconfig.json` successfully as JSON.
- Confirmed `apps/mobile/app/_layout.tsx` and `apps/mobile/app/index.tsx` are both absent.
- Ran `git diff --check` scoped to the owned files and report; it produced no whitespace errors.
- Did not run `pnpm install`.
- Did not run the RED test, typecheck, or export.
- The earlier pre-D1 restriction was retained for RED/typecheck/export; only the explicitly requested lint verification was run after review remediation.
- Did not create `apps/mobile/app/_layout.tsx`, `apps/mobile/app/index.tsx`, or other production app code.
- Did not change `pnpm-lock.yaml`, root configuration, or another team's owned paths.
- Did not run any Git mutation command or create a commit.

## Concerns / follow-up

- The PH-03 plan supplies exact versions for Expo, Expo Router, React Native, React, TanStack Query, React Hook Form, React Native Testing Library, and Maestro. Jest-specific support packages are also pinned here to make the declared test command executable; peer remediation pins `jest` to `29.7.0` and `react-native-worklets` to `0.10.0`.
- `maestro test e2e` relies on the pinned Maestro CLI specified by PH-03 being provisioned in the execution environment; it is intentionally not run in this pre-D1 subtask.
