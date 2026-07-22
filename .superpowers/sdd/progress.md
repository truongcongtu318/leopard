# LEOPARD PH-01 Foundation Progress

Orchestrator branch: `codex/phase-ph-01`
Develop baseline: `8997107fc48840eb02f9a7367ad4fa96ce77ac2c`
Wave: `0`
Phase: `PH-01 Foundation`
Verified PH-01 baseline: `7963e2c9b1460eb5778ea2ce376469269592583c`
Wave 0 integration branch: `codex/integration-wave-0`
Wave 0 integration merge baseline: `37a38cf44c138c875c167bfe1743614de02a256e`

## Preflight

- develop baseline verified: `8997107fc48840eb02f9a7367ad4fa96ce77ac2c`
- required `docs/superpowers/**` plans present on develop
- `.worktrees/` ignored on phase branch before task worktree creation

## Phase Gate

- PH-01 gate: PASSED on `codex/phase-ph-01`
  - baseline before gate record: `846711346c49879a8b3c200189efb69b59990bc6`
  - Node: `v24.14.0`; Corepack pnpm: `11.11.0`
  - clean install from empty `node_modules`: `pnpm install --frozen-lockfile` exit 0
  - `node scripts/verify-foundation.mjs` exit 0
  - forced `turbo run lint --force`: 3 successful / 3 total, cache bypass
  - forced `turbo run typecheck --force`: 2 successful / 2 total, cache bypass
  - forced `turbo run test --force`: 2 successful / 2 total, 11 tests pass, cache bypass
  - forced `turbo run build --force`: 2 successful / 2 total, cache bypass
  - `git diff --check` exit 0

## Wave Gate

- Wave 0 integration gate: PASSED on `codex/integration-wave-0`
  - integration merge baseline: `37a38cf44c138c875c167bfe1743614de02a256e`
  - Node: `v24.14.0`; Corepack pnpm: `11.11.0`
  - `pnpm install --frozen-lockfile` exit 0
  - `node scripts/verify-foundation.mjs` exit 0
  - forced `turbo run lint --force`: 3 successful / 3 total, cache bypass
  - forced `turbo run typecheck --force`: 2 successful / 2 total, cache bypass
  - forced `turbo run test --force`: 2 successful / 2 total, 11 tests pass, cache bypass
  - forced `turbo run build --force`: 2 successful / 2 total, cache bypass
  - `git diff --check` exit 0

## Tasks

- PH-01-T01 Root Workspace: VERIFIED
  - branch: `codex/ph-01-t01-root-workspace`
  - worktree: `.worktrees/ph-01-t01-root-workspace`
  - baseline: `359ad6af0e015dea123290ac4f0270d97089ef7b`
  - owner: Foundation implementer
  - files: `package.json`, `pnpm-workspace.yaml`, `turbo.json`, `.npmrc`, `.nvmrc`, `.gitignore`, `scripts/check-workspace.mjs`, `pnpm-lock.yaml`
- PH-01-T02 Shared TypeScript Configuration: VERIFIED
  - branch: `codex/ph-01-t02-typescript-config`
  - worktree: `.worktrees/ph-01-t02-typescript-config`
  - baseline: `91ed4f09930ccd8462df21d2bb113064fb53557d`
  - owner: Foundation config implementer
  - files: `packages/config/**`, `prettier.config.mjs`, `package.json`, `pnpm-lock.yaml`
- PH-01-T03 Shared Domain Contracts: VERIFIED
  - branch: `codex/ph-01-t03-shared-contracts`
  - worktree: `.worktrees/ph-01-t03-shared-contracts`
  - baseline: `e66d3c3cf5688f21d482ddcaa3cb6f55ea96369a`
  - owner: Shared contract implementer
  - files: `packages/shared/**`
- PH-01-T04 Shared Validators: VERIFIED
  - branch: `codex/ph-01-t04-shared-validators`
  - worktree: `.worktrees/ph-01-t04-shared-validators`
  - baseline: `1d2d5799e1bd4e8d82205d74d357be49936dbf87`
  - owner: Shared validator implementer
  - files: `packages/validators/**`, `pnpm-lock.yaml`
  - blocker resolved by PH-01 VehicleType Contract Remediation; branch refreshed onto phase baseline with canonical shared `VehicleType`.
- PH-01 VehicleType Contract Remediation: VERIFIED
  - branch: `codex/ph-01-contract-vehicle-type`
  - worktree: `.worktrees/ph-01-contract-vehicle-type`
  - baseline: `0217275a9415699f4ae40ff054fc3e81d6eb4675`
  - owner: Contract remediation implementer
  - files: `packages/shared/src/enums.ts`, `packages/shared/src/contracts.test.ts`, `docs/data/01-database-design.md`, `docs/api/01-rest-api-spec.md`, `docs/superpowers/plans/00-master-orchestration.md`
  - purpose: define canonical pilot `VehicleType` values before PH-01-T04 consumes them.
- PH-01-T05 Foundation CI Gate: VERIFIED
  - branch: `codex/ph-01-t05-foundation-ci`
  - worktree: `.worktrees/ph-01-t05-foundation-ci`
  - baseline: `a41c956be039225bc76e08a0c9887c8c28edacc4`
  - owner: Foundation CI implementer
  - files: `.github/workflows/ci.yml`, `scripts/verify-foundation.mjs`, `README.md`, `docs/development/01-local-setup.md`

## Integrated Task Commits

- PH-01-T01: `359ad6a..709a45c`, review approved, integrated via merge commit on `codex/phase-ph-01`
  - controller verification: Node 24.18.0 portable + Corepack pnpm `install --frozen-lockfile`, `node scripts/check-workspace.mjs`, `pnpm exec turbo --version` => `2.10.4`, `git diff --check`
- PH-01-T02: `91ed4f0..4381383`, review approved, integrated via merge commit on `codex/phase-ph-01`
  - controller verification: Node 24.18.0 portable `node --test packages/config/test/config.test.mjs` => 4/4 pass, Corepack pnpm `format:check`, `git diff --check`
- PH-01-T03: `e66d3c3..a42aa50`, review approved after Important test-coverage fix, integrated via merge commit on `codex/phase-ph-01`
  - controller verification: Node 24 portable Corepack pnpm `--filter @leopard/shared test`, `typecheck`, `build`, `git diff --check`
- PH-01 VehicleType Contract Remediation: `0217275..fe1600d`, review approved, integrated via merge commit on `codex/phase-ph-01`
  - controller verification: Node 24 portable Corepack pnpm `--filter @leopard/shared test` => 1 file / 3 tests pass, `typecheck`, `build`, `git diff --check`
- PH-01-T04: `0ab6632..c6b45bd`, review approved after Critical vehicle contract remediation/fix, integrated via merge commit on `codex/phase-ph-01`
  - controller verification: Node 24 portable Corepack pnpm `--filter @leopard/validators test` => 1 file / 8 tests pass, `typecheck`, `build`, `git diff --check`
- PH-01-T05: `a41c956..59e2394`, review approved, integrated via merge commit on `codex/phase-ph-01`
  - controller verification: Node 24 portable `node scripts/verify-foundation.mjs`, Corepack pnpm `lint`, `typecheck`, `test` => 2 files / 11 tests pass, `build`, `git diff --check`

## Minor Review Findings To Revisit

- PH-01-T04 optional: add explicit regression tests for unknown keys and `mediaIds` length to guard `.strict()` and max-5 constraints.
- Final whole-branch review optional: pnpm `.npmrc` settings may be ineffective in pnpm 11; consider moving settings to `pnpm-workspace.yaml` in a future tooling pass.

## Final Review Fixes

- PH-01 Final Lint Gate Fix: VERIFIED
  - branch: `codex/ph-01-final-lint-gate-fix`
  - worktree: `.worktrees/ph-01-final-lint-gate-fix`
  - baseline: `37ab94620ff57e37be66ff96c486fcbd0cdc68bf`
  - owner: Foundation tooling fix implementer
  - blocker: final reviewer found root `pnpm lint` ran zero Turbo tasks, so CI lint quality gate was a no-op.
  - controller verification: Node 24 portable Corepack pnpm `exec turbo run lint --force` => 3 successful / 3 total, `lint`, `typecheck`, `test`, `build`, `git diff --check`

## Resolved Blockers

Task: PH-01-T04
Baseline: `1d2d5799e1bd4e8d82205d74d357be49936dbf87`
Blocked contract: canonical `VehicleType` values for `createOrderSchema.vehicleType`
Requirement: `docs/requirements/03-acceptance-criteria.md` says unsupported vehicle type receives HTTP 422; `docs/superpowers/plans/01-foundation.md` requires `createOrderSchema` to accept supported vehicle type; T04 consumes shared enums from `@leopard/shared`.
Minimal change: define canonical vehicle type values in source contract and `@leopard/shared`, then update `@leopard/validators` to consume that enum instead of local `MOTORBIKE | VAN | TRUCK`.
Consumers affected: `PH-01-T04`, later `PH-06`, `PH-07`, `PH-12` order/pricing/client flows.
Migration compatibility: none.
Tests required: shared contract enum regression; validators unsupported-vehicle regression; validators test/typecheck/build.

---

# LEOPARD Wave 1 Single-Branch Progress

Branch: `codex/wave-1-runtime-foundations`
Approved execution baseline: `ae64d68`
Coordinator owns: Git mutations, `pnpm-lock.yaml`, task ledger and dependency barriers.
Implementation agents: Agent A Backend/Platform; Agent B Client Foundations.

## Wave 1 Tasks

- PH-02-T01: VERIFIED — RED/GREEN complete, cross-review APPROVED
- PH-02-T02: READY — PH-13-T01A database slice GREEN and cross-review APPROVED
- PH-02-T03: READY after PH-02-T01
- PH-02-T04: READY after PH-02-T01
- PH-02-T05: READY after PH-02-T01..T04
- PH-03-T01: VERIFIED — RED/GREEN complete, cross-review APPROVED
- PH-03-T02: VERIFIED — 15 role/hydration tests and cross-review APPROVED
- PH-03-T03: READY after PH-03-T01
- PH-03-T04: READY after PH-03-T01/T02
- PH-04-T01..T04: NOT_STARTED — wait for PH-03 VERIFIED and D3
- PH-13-T01: IN_PROGRESS — T01A database slice GREEN/APPROVED; retain files until T01B
- PH-13-T03: NOT_STARTED — waits for runtime scripts and PH-13-T01

## Coordinator Checkpoints

- C-00: complete — approved spec/plan/master override committed as `ae64d68`
- D1: VERIFIED — checkpoint `289e6a9`
  - Node `24.14.0`, pnpm `11.11.0`
  - frozen install: PASS
  - peer dependency check: PASS
  - API RED: PASS as evidence — exit 1 on missing `./app.module.js`
  - Mobile RED: PASS as evidence — exit 1 on missing `../app/_layout`
  - API GREEN: PASS — E2E 1/1, typecheck, build and lint; dev startup/steady-state lifecycle clean
  - Mobile GREEN: PASS — tests 2/2, typecheck, lint and Expo web export (774 modules)
  - cross-review: APPROVED after PH-02 I-01/I-02 and PH-03 I-01 remediation
- D2: pending
- D3: pending
- Final Wave 1 gate: pending

## Wave 1 Remediation Decisions

- Mobile test tooling: `jest-expo@57.0.4` does not exist; use SDK-57 dist-tag `57.0.2` and direct `babel-preset-expo@57.0.3`.
- Mobile peers: pin Jest `29.7.0` for `jest-watch-typeahead`, and `react-native-worklets@0.10.0` for Expo 57 peer compatibility.
- API transform: replace `ts-jest` because its TypeScript peer excludes repo TypeScript 7; use `@swc/jest@0.2.39` + `@swc/core@1.15.46`.
- API Jest: registry package `30.4.2` and `30.4.1` fail internally before test module loading; pin tested `30.0.5`. Phase plans PH-02/05/08 updated consistently.
- Native build allowlist: Coordinator approved only `@prisma/engines`, `@swc/core`, `prisma`, `unrs-resolver` in `pnpm-workspace.yaml`; install and peer audit pass.
- Mobile direct runtime/test dependencies: add `@jest/globals@29.7.0`, `react-native-safe-area-context@5.8.0`, `react-native-web@0.21.2` and `react-dom@19.2.7` after typecheck/export and deprecation evidence.
- API validation runtime: add `class-validator@0.15.1` and `class-transformer@0.5.1`, both inside Nest 11.1.28 peer ranges.
- Nest CLI 11.0.14 cannot parse TypeScript 7 configuration even with the SWC builder. API build uses direct `tsc`; development uses the reviewed Node runner with initial compile, TypeScript/Node watchers and process-tree cleanup.
- PH-13 local database binds loopback only. On this host the default 5432 bind was unavailable, so runtime verification used supported `POSTGRES_PORT=55432` with matching `DATABASE_URL`; health, PostGIS 3.5 and deterministic cleanup passed.

## Wave 1 Minor Review Findings To Revisit

- PH-02-T01 M-01: shell E2E boots `AppModule` directly and does not exercise `createApplication` bootstrap configuration.
- PH-02-T01 M-02: CORS allowlist schema accepts general URLs rather than canonical HTTP(S) origins only.
- PH-02-T01 M-03: POSIX watcher cleanup has no bounded SIGKILL escalation if a process group ignores shutdown.
