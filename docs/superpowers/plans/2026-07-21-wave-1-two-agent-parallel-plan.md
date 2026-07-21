# Wave 1 Two-Agent Parallel Execution Plan

## Purpose

This file is the shared handoff for running Wave 1 with two coding agents after Wave 0 / PH-01 Foundation has merged to `develop`.

Agents should read this file before starting their own phase plan. It explains who owns which surface, what can run in parallel, what must remain sequential, and when work may be integrated.

## Current Baseline

- Wave 0 PR: `#7`
- Wave 0 merge commit on `develop`: `21933323e5172768594e467efdc8363ade85cc4e`
- Starting baseline for Wave 1 branches: latest `develop` at or after the merge commit above.
- Do not start from `main`.
- Do not commit directly to `develop`.

Before creating any worktree:

```bash
git fetch origin
git rev-parse origin/develop
```

Expected: the SHA is `21933323e5172768594e467efdc8363ade85cc4e` or a later approved `develop` commit that includes Wave 0.

## High-Level Split

With exactly two implementers, run these lanes first:

| Person | Primary lane | Phase branch | Worktree | Why |
| --- | --- | --- | --- | --- |
| Person 1 | Backend Core | `codex/phase-ph-02` | `.worktrees/phase-ph-02-backend-core` | Unlocks DB, OpenAPI, API shell, health and later Auth/Order work. |
| Person 2 | Mobile Foundation | `codex/phase-ph-03` | `.worktrees/phase-ph-03-mobile-foundation` | Unlocks Customer/Driver shell and client session boundary without touching backend files. |

After Person 2 finishes PH-03, they move to:

| Person | Secondary lane | Phase branch | Worktree | Why |
| --- | --- | --- | --- | --- |
| Person 2 | Operations Web Foundation | `codex/phase-ph-04` | `.worktrees/phase-ph-04-operations-web` | Unlocks Fleet/Admin web shell while Person 1 continues backend gate or starts platform. |

After either person is free and PH-02/PH-03 are stable, assign platform tasks:

| Lane | Phase/task branch | Worktree | Notes |
| --- | --- | --- | --- |
| PH-13-T01 Local Infrastructure | `codex/phase-ph-13-platform-wave-1` | `.worktrees/phase-ph-13-platform-wave-1` | Compose/Docker/env only. Avoid changing app behavior. |
| PH-13-T03 CI Matrix | Same phase branch after T01 or separate task branch under it | Same worktree or task worktree | Touches CI/root; coordinate before editing `.github/workflows/**` or root scripts. |

## Non-Negotiable Rules

- One writer per worktree.
- Fresh implementer and fresh reviewer per task.
- Do not dispatch a task until its dependencies are `VERIFIED`.
- Do not open Wave 2 before Wave 1 integration gate passes.
- Do not edit `main` or `develop` directly.
- Task branches merge into their phase branch.
- Phase branches merge into `codex/integration-wave-1` only after phase gate passes.
- If a task needs to change a controlled surface owned by another phase, stop and write a blocker report.

## Controlled Surface Ownership

| Surface | Owner in Wave 1 | Consumer rule |
| --- | --- | --- |
| `apps/api/**` | PH-02 / Person 1 | Person 2 must not edit. |
| `apps/api/prisma/**` | PH-02 / Person 1 | One migration owner only. |
| `apps/api/openapi/**` | PH-02-T04 / Person 1 | Other phases consume after it is merged; do not edit casually. |
| `apps/mobile/**` | PH-03 / Person 2 | Person 1 must not edit. |
| `apps/admin/**` | PH-04 / Person 2 after PH-03 | Person 1 must not edit. |
| `packages/ui/**` | PH-04 | Feature phases consume later. |
| `.github/workflows/**` | PH-13-T03 | Coordinate before changes. |
| `compose.yaml`, `infra/docker/**`, `.env.example` | PH-13-T01 | Coordinate with backend only for env names. |
| `packages/shared/**` | Contract owner only | If needed, create a contract remediation task first. |
| Root package scripts / lockfile | Only assigned phase/task | Any dependency addition must be justified and verified. |

## Person 1 Plan: PH-02 Backend Core

Start:

```bash
git fetch origin
git worktree add .worktrees/phase-ph-02-backend-core -b codex/phase-ph-02 origin/develop
```

Read first:

1. `AGENTS.md`
2. `docs/superpowers/README.md`
3. `docs/superpowers/specs/2026-07-12-multi-agent-delivery-design.md`
4. `docs/superpowers/plans/00-master-orchestration.md`
5. `docs/superpowers/plans/02-backend-core.md`
6. `CONTRIBUTING.md`
7. This file

Task order:

1. `PH-02-T01 NestJS Application Shell`
   - Scope: `apps/api/package.json`, Nest config, app module, main bootstrap, env schema, E2E shell test.
   - Verification: `pnpm --filter api test:e2e`, `pnpm --filter api typecheck`, `pnpm --filter api build`.
   - Expected nuance: health endpoint may still be 404 until PH-02-T05; follow the phase plan exactly.

2. `PH-02-T02 Prisma and PostGIS Baseline`
   - Scope: `apps/api/prisma/**`, database module/service, schema tests.
   - Verification: `pnpm --filter api prisma:migrate:test`.
   - Stop if local Postgres/PostGIS support is missing and cannot be provided by existing scripts.

3. `PH-02-T03 Request Context, Errors and Logging`
   - Scope: `apps/api/src/common/**`.
   - Verification: scoped tests for request ID, error envelope, redaction and logging.
   - Never log request bodies, tokens, phone numbers or media content.

4. `PH-02-T04 OpenAPI Contract Foundation`
   - Scope: `apps/api/openapi/**`, docs module, app module wiring.
   - Verification: `pnpm --filter api test:contract`.
   - This locks endpoint signatures for PH-05 through PH-11. Treat any uncertainty as a blocker.

5. `PH-02-T05 Health and Backend Gate`
   - Scope: health module/controller/service and app module wiring.
   - Verification: `pnpm --filter api lint`, `typecheck`, `test`, `test:e2e`, `build`, `prisma:migrate:test`.

PH-02 phase gate:

```bash
pnpm --filter api lint
pnpm --filter api typecheck
pnpm --filter api test
pnpm --filter api test:e2e
pnpm --filter api build
pnpm --filter api prisma:migrate:test
git diff --check
```

Exit criteria:

- PH-02 task registry is `VERIFIED`.
- Backend core has no feature endpoints beyond health and contract smoke.
- OpenAPI and DB baseline are ready for later auth/order/map phases.

## Person 2 Plan: PH-03 Mobile Foundation

Start:

```bash
git fetch origin
git worktree add .worktrees/phase-ph-03-mobile-foundation -b codex/phase-ph-03 origin/develop
```

Read first:

1. `AGENTS.md`
2. `docs/superpowers/README.md`
3. `docs/superpowers/specs/2026-07-12-multi-agent-delivery-design.md`
4. `docs/superpowers/plans/00-master-orchestration.md`
5. `docs/superpowers/plans/03-expo-mobile-foundation.md`
6. `docs/ui/04-design-system.md`
7. `CONTRIBUTING.md`
8. This file

Task order:

1. `PH-03-T01 Expo Runtime Shell`
   - Scope: `apps/mobile/package.json`, Expo config, root layout, root smoke test.
   - Verification: `pnpm --filter mobile test`, `pnpm --filter mobile typecheck`, `pnpm --filter mobile export`.

2. `PH-03-T02 Navigation and Role Boundary`
   - Scope: public/customer/driver route groups and `role-router`.
   - Verification: navigation tests for Customer/Driver/Fleet/Admin mappings.
   - Never render protected data before session hydration.

3. `PH-03-T03 Mobile Theme and State Primitives`
   - Scope: `apps/mobile/src/theme/**`, `apps/mobile/src/ui/**`.
   - Verification: component tests and viewport checks at 360x800 and 390x844.
   - ETA demo copy must show `Dữ liệu mô phỏng`.

4. `PH-03-T04 API and Session Client Boundary`
   - Scope: mobile HTTP/query/auth/session storage boundary.
   - Verification: request tests, session-store tests, mobile typecheck/export.
   - Refresh token must use secure storage; access token stays in memory.

PH-03 phase gate:

```bash
pnpm --filter mobile lint
pnpm --filter mobile typecheck
pnpm --filter mobile test
pnpm --filter mobile export
git diff --check
```

Exit criteria:

- PH-03 task registry is `VERIFIED`.
- Mobile has shell/navigation/theme/session boundary only.
- No real login/order/tracking feature screens.

## Person 2 Follow-Up: PH-04 Operations Web Foundation

Start only after PH-03 is `VERIFIED`, or if a separate third person is assigned.

```bash
git fetch origin
git worktree add .worktrees/phase-ph-04-operations-web -b codex/phase-ph-04 origin/develop
```

Read:

- `docs/superpowers/plans/04-operations-web-foundation.md`
- `docs/ui/02-navigation-map.md`
- `docs/ui/04-design-system.md`
- This file

Task order:

1. `PH-04-T01 Next.js Runtime Shell`
2. `PH-04-T02 Role Layout and Navigation`
3. `PH-04-T03 Web Design System`
4. `PH-04-T04 Web API and Session Boundary`

PH-04 phase gate:

```bash
pnpm --filter web lint
pnpm --filter web typecheck
pnpm --filter web test
pnpm --filter web build
git diff --check
```

Exit criteria:

- Operations shell is ready for Fleet/Admin feature pages.
- Backend remains authorization source of truth.
- No Fleet/Admin data pages beyond placeholders.

## Platform Slot: PH-13-T01 and PH-13-T03

Run after one person is free, or assign to a third person.

Read:

- `docs/superpowers/plans/13-quality-security-pilot-release.md`
- This file

Task order:

1. `PH-13-T01 Local Infrastructure Foundation`
   - Scope: `compose.yaml`, `infra/docker/**`, `.env.example`, wait/test scripts.
   - Verification: `docker compose config`, `infra/scripts/test-compose.sh`.

2. `PH-13-T03 CI Matrix and Supply Chain Gate`
   - Scope: `.github/workflows/**`, `.github/dependabot.yml`, `scripts/verify-ci.mjs`.
   - Verification: `node scripts/verify-ci.mjs` and local equivalent root gates.

Rules:

- Do not make CI require real provider credentials.
- Do not add deployment scripts in Wave 1.
- Coordinate with PH-02 for environment names.

## Review Protocol

For every task:

1. Implementer writes or updates a task brief.
2. Implementer follows TDD red/green where possible.
3. Implementer commits one logical task.
4. Orchestrator creates a review package from task baseline to task HEAD.
5. Fresh reviewer checks spec compliance and quality.
6. Fix all Critical/Important findings.
7. Merge task branch into the phase branch.
8. Update phase ledger.
9. Remove task worktree after integration.

Do not let implementer and reviewer be the same person or same agent.

## Integration Plan

Create integration branch after PH-02 or PH-03 first reaches `VERIFIED`:

```bash
git fetch origin
git switch -c codex/integration-wave-1 origin/develop
```

Merge order:

1. Merge `codex/phase-ph-02`.
2. Merge `codex/phase-ph-03`.
3. Merge `codex/phase-ph-04`.
4. Merge `codex/phase-ph-13-platform-wave-1`.

After each merge:

```bash
pnpm install --frozen-lockfile
pnpm lint
pnpm typecheck
pnpm test
pnpm build
git diff --check
```

If PH-02 added DB migration support, also run:

```bash
pnpm --filter api prisma:migrate:test
```

Wave 1 is complete only when:

- PH-02, PH-03, PH-04 and Wave-1 PH-13 tasks are `VERIFIED`, or any intentionally deferred PH-13 task is explicitly documented as deferred.
- `codex/integration-wave-1` passes install, lint, typecheck, test, build and applicable DB/contract gates.
- No Critical/Important review findings remain open.

## Daily Sync Format

Each person posts this short update:

```text
Lane:
Current task:
Branch/worktree:
Status: NOT_STARTED | IN_PROGRESS | IN_REVIEW | VERIFIED | BLOCKED
Last commit:
Verification run:
Files owned today:
Blockers / contract requests:
```

## Blocker Report Template

```text
Task:
Baseline:
Blocked surface:
Requirement:
Minimal change proposed:
Consumers affected:
Migration/backward compatibility:
Tests required:
```

Use this whenever a task needs to edit a controlled surface outside its assigned ownership.

## Recommended First Move

Start with exactly two active implementers:

1. Person 1 starts `PH-02-T01`.
2. Person 2 starts `PH-03-T01`.

Do not start PH-04 until Person 2 has PH-03 stable, unless a third implementer is available.
Do not start Wave 2 until Wave 1 integration gate passes.
