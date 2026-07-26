# PH-02-T01 GREEN Brief — Agent A

## Task contract

- Task ID: `PH-02-T01`
- Goal: implement the minimal NestJS runtime shell now that D1 dependencies and RED evidence are confirmed.
- Baseline HEAD: `ae64d68`
- Dependencies verified: D1 frozen install PASS, peer check PASS, API RED exits 1 only because `./app.module.js` is missing.

## Required context

Read `AGENTS.md`, the PH-02-T01 section of `docs/superpowers/plans/2026-07-21-wave-1-two-agent-parallel-plan.md`, `docs/superpowers/plans/02-backend-core.md`, and the already completed pre-D1 brief/report.

## Owned paths

- `apps/api/src/main.ts`
- `apps/api/src/app.module.ts`
- `apps/api/src/config/env.schema.ts`
- Existing PH-02-T01 files under `apps/api/**` only when required to make this task correct
- Report: `.superpowers/sdd/wave1-ph02-t01-green-report.md`

## Behavior and constraints

1. Bootstrap Nest with `rawBody: false`, shutdown hooks, global prefix `/api/v1`, global validation, and a CORS allowlist.
2. Strictly parse `NODE_ENV`, `PORT`, `DATABASE_URL`, and the selected CORS allowlist env name using the already pinned Zod dependency. Reject unknown/invalid values where appropriate and expose a typed parsed config to bootstrap.
3. Keep `AppModule` empty/minimal: no health controller and no Auth, Order, Map/ETA, Tracking, Media, Payment, Fleet or Admin feature behavior.
4. Preserve the existing E2E test's intent: the Nest application boots and accepts a request; a 404 is expected because health is PH-02-T05.
5. Do not add dependencies, run install, edit `pnpm-lock.yaml`, root/shared/mobile/admin/UI/docs/infra/CI files, or mutate Git.

## Required GREEN verification

Run with Node 24 and pnpm 11.11:

```text
pnpm --filter api --fail-if-no-match test:e2e
pnpm --filter api --fail-if-no-match typecheck
pnpm --filter api --fail-if-no-match build
pnpm --filter api --fail-if-no-match lint
```

If a command fails, debug only inside owned paths. Append exact commands, exit results, files changed, env contract, risks, and ownership confirmation to the report.

## Done when

- All four scoped commands exit 0.
- No feature endpoint exists; health remains unimplemented.
- Report state is `IN_REVIEW` with RED and GREEN evidence.
- No Git mutation or lockfile modification occurred.
