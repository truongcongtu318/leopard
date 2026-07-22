# PH-02-T01 Pre-D1 Brief — Agent A

## Goal

Prepare the NestJS API package manifest, configuration needed to load tests, and a genuinely failing shell E2E test. Stop before application implementation and before running pnpm install or RED.

## Context

- Story/requirements: FR-09 health foundation and AC-07 operations readiness; this task only creates the runtime shell boundary.
- Approved branch model: one shared branch/working tree; Coordinator owns Git and lockfile.
- Baseline: `ae64d68`.
- Read first: `AGENTS.md`, `docs/superpowers/specs/2026-07-22-wave-1-two-agent-execution-design.md`, `docs/superpowers/plans/02-backend-core.md`, `docs/architecture/01-system-architecture.md`, `docs/api/01-rest-api-spec.md`, `docs/development/05-definition-of-done.md`, `CONTRIBUTING.md`.

## Owned paths

- `apps/api/package.json`
- `apps/api/tsconfig.json`
- `apps/api/nest-cli.json`
- API test-runner config only if required under `apps/api/**`
- `apps/api/src/app.e2e-spec.ts`
- Report: `.superpowers/sdd/wave1-ph02-t01-pre-d1-report.md`

## Read-only/forbidden

- Do not create `apps/api/src/main.ts`, `apps/api/src/app.module.ts`, env schema or production application code yet.
- Do not edit `pnpm-lock.yaml`, root config, shared packages, mobile/admin/UI, docs, infra or CI.
- Do not run install.
- Do not run `git add`, commit, push, pull, switch, merge, rebase, reset, checkout or clean.
- Do not run the RED test before Coordinator opens D1.

## Required work

1. Create package name `api` with exact pinned dependencies from PH-02 and scripts `dev`, `build`, `lint`, `typecheck`, `test`, `test:e2e`, `test:contract`, `prisma:migrate:test`.
2. Add minimal TypeScript/Nest/Jest configuration needed for the future E2E command to discover the test.
3. Write an E2E test that imports the not-yet-created application bootstrap/module and will fail for that expected missing implementation after dependencies are installed. Do not assert T05 health success.
4. Self-review manifest versions, file ownership and failure intent.
5. Write the full report file with files changed, expected RED failure, and concerns. Return `DONE` without commits.

## Done when

- Manifest/config/failing test exist.
- No production application implementation exists.
- Lockfile and Git state were not mutated.
- Report is complete; actual RED/GREEN remain pending D1.
