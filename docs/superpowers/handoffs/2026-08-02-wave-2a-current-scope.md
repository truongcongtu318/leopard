# LEOPARD Wave 2A Handoff

Updated: 2026-08-02

## Scope

This handoff covers the current Wave 2A backend/data delivery only. The integration branch is `codex/integration-wave-2`, based on the verified develop baseline `37f67bfacef76d73b44a9ae34d3fd9da5e36061d` and merged at `a6a7a38` before this document update.

PH-05-T05 Client Login Integration was intentionally deferred in this run. Wave 2A is therefore not product-complete; the next implementer must start PH-05-T05 from the integration baseline after this PR is merged.

## Verified Tasks

| Task | Final implementation/report | Review and result |
| --- | --- | --- |
| PH-05-T04 Authentication and Policy Guards | `b9652c2`, `69eec8a` | Fresh review approved; bounded status-only cache, live role/session checks, 15/15 guard tests |
| PH-07-T04 Map REST API and Gate | `1de2867`, `91bd2b3`, `de74380`, `6f7d942` | Fresh review approved; shared auth, actor+IP rate limit, 404/503 mapping, 14/14 map E2E |
| PH-13-T02 Seed and Migration Operations | `332566d`, `33f905e`, `563b50a`, `3184e6f` | Fresh review approved; manifest-ID cleanup, loopback-only destructive scripts, transaction rollback, deterministic seed |

The merged phase branches are `codex/phase-ph-05`, `codex/phase-ph-07`, and `codex/phase-ph-13-data-ops`.

## Verification Evidence

- API unit gate with local `DATABASE_URL`: 10 suites, 109 tests passed.
- Map E2E: 14/14 passed, including valid/invalid/expired/revoked auth and unknown-place 404.
- Health/app/maps E2E group: 19/19 passed.
- Login E2E: 5/5 passed.
- Refresh E2E: 10/10 passed after clearing pre-seeded `RefreshSession` rows from the local test database. Running it against the seeded database first failed only because the test asserts global session counts while the seed intentionally creates eight sessions.
- OpenAPI contract: 34/34 passed.
- API typecheck, direct API build, ESLint, and `git diff --check`: passed.
- Seed/migration gate: reset, two seed runs, idempotent deploy, checksum invariant, database/seed tests 10/10 and health/app E2E 5/5 passed.
- Migration safety gate: remote and lookalike hosts rejected before Docker/reset.

The normal `pnpm --filter api test/typecheck/lint` preflight is currently blocked by pnpm 11's `ERR_PNPM_IGNORED_BUILDS` for `@scarf/scarf`, `argon2`, and `sharp`. Verification used `pnpm install --frozen-lockfile --ignore-scripts` followed by the installed Jest, TypeScript and ESLint binaries. The data E2E pair still prints the existing Jest open-handle warning but exits 0.

## Security Boundaries

- `AccessTokenGuard` validates the signed token, refresh-session state and current account status; role is loaded live on warm cache hits.
- Map rate limiting uses `actor:<userId>:<ip>` and never the raw bearer token.
- Seed cleanup is restricted to explicit manifest-owned IDs. Destructive reset scripts accept loopback PostgreSQL hosts only and reject remote opt-in bypasses.
- Demo fixtures contain reserved-looking example values only; no provider credentials, refresh tokens or real personal data are committed.

## Continue From Here

1. Merge this PR into `develop` after CI reviews the current-scope evidence.
2. Create a new isolated worktree and branch `codex/ph-05-t05-client-login` from the merged integration/develop baseline.
3. Read `docs/superpowers/plans/05-auth-and-access.md` and the PH-05-T05 task brief before writing tests.
4. Keep mobile and admin login ownership separate from the backend auth guards and OpenAPI files.
5. Do not start PH-06 order/driver work until its dependency gate and the next orchestration decision are recorded.

