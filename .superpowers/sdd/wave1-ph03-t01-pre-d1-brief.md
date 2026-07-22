# PH-03-T01 Pre-D1 Brief — Agent B

## Goal

Prepare the Expo mobile package manifest, configuration needed to load tests, and a genuinely failing root render test. Stop before root application implementation and before running pnpm install or RED.

## Context

- Story/requirements: US-16 and AC-07 mobile foundation; this task only creates the runtime shell boundary.
- Approved branch model: one shared branch/working tree; Coordinator owns Git and lockfile.
- Baseline: `ae64d68`.
- Read first: `AGENTS.md`, `docs/superpowers/specs/2026-07-22-wave-1-two-agent-execution-design.md`, `docs/superpowers/plans/03-expo-mobile-foundation.md`, `docs/ui/03-screen-specs.md`, `docs/ui/04-design-system.md`, `docs/ui/05-responsive-rules.md`, `docs/development/05-definition-of-done.md`, `CONTRIBUTING.md`.

## Owned paths

- `apps/mobile/package.json`
- `apps/mobile/app.json`
- `apps/mobile/tsconfig.json`
- `apps/mobile/babel.config.js`
- Mobile test-runner config only if required under `apps/mobile/**`
- `apps/mobile/src/smoke.test.tsx`
- Report: `.superpowers/sdd/wave1-ph03-t01-pre-d1-report.md`

## Read-only/forbidden

- Do not create `apps/mobile/app/_layout.tsx`, `apps/mobile/app/index.tsx` or production app code yet.
- Do not edit `pnpm-lock.yaml`, root config, shared packages, API/admin/UI, docs, infra or CI.
- Do not run install.
- Do not run `git add`, commit, push, pull, switch, merge, rebase, reset, checkout or clean.
- Do not run the RED test before Coordinator opens D1.

## Required work

1. Create package name `mobile` with exact pinned dependencies from PH-03 and scripts `start`, `android`, `ios`, `test`, `test:e2e`, `lint`, `typecheck`, `export`.
2. Add Expo identity `com.leopard.pilot` and minimal TypeScript/Babel/Jest configuration needed for the future test command to discover the test.
3. Write a render test that imports the not-yet-created root route/layout and will fail for that expected missing implementation after dependencies are installed. Do not add login/order/tracking behavior.
4. Self-review manifest versions, file ownership and failure intent.
5. Write the full report file with files changed, expected RED failure, and concerns. Return `DONE` without commits.

## Done when

- Manifest/config/failing test exist.
- No production root implementation exists.
- Lockfile and Git state were not mutated.
- Report is complete; actual RED/GREEN remain pending D1.
