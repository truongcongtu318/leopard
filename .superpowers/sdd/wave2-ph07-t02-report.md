# PH-07-T02 Vietmap Adapter and Failure Policy Report

## Status

Implemented in assigned worktree:

- `/home/tutruong/project/leopard/.worktrees/ph-07-t02-vietmap-adapter`
- Branch: `codex/ph-07-t02-vietmap-adapter`

## Commit

- Original implementation commit SHA: `47c08e6e95aa404d40b64df2c458547ede834705`
- Original implementation commit message: `feat(map): integrate Vietmap provider boundary`
- Fix round 1 commit SHA: `ac8dbd1c8f0e2f60b44cef24f508222bed2b03bc`
- Fix round 1 commit message: `fix(map): redact Vietmap application errors`
- Fix-round report update commit SHA: `da3eb30759aa71c75488f3e7f67456c968418d0c`
- Fix-round report update commit message: `docs(map): record PH-07-T02 fix round`

## Changed Files

- `apps/api/src/maps/providers/vietmap.provider.ts`
- `apps/api/src/maps/providers/resilient-map.provider.ts`
- `apps/api/src/maps/providers/vietmap.provider.spec.ts`
- `.superpowers/sdd/wave2-ph07-t02-report.md`

## Implementation Summary

- Added `VietmapProvider` implementing the existing `MapProvider` interface without SDK types.
- Maps Vietmap autocomplete, Place v4 and Route v4 payloads into shared `PlaceCandidate`, `GeoPoint` and `RouteEstimate`.
- Uses native fetch with a 5-second AbortController timeout.
- Retries idempotent GET requests at most once for transient HTTP 5xx and network failures.
- Does not retry HTTP 4xx failures.
- Redacts the configured API key from provider error messages.
- Added `ResilientMapProvider` that falls back to the demo provider only when `ALLOW_DEMO_PROVIDER=true` or when explicitly configured.

## TDD Evidence

RED:

```text
corepack pnpm --filter api test --runTestsByPath src/maps/providers/vietmap.provider.spec.ts --runInBand
FAIL src/maps/providers/vietmap.provider.spec.ts
Could not locate module ./resilient-map.provider.js
```

GREEN:

```text
corepack pnpm --filter api test -- --runTestsByPath apps/api/src/maps/providers/vietmap.provider.spec.ts --runInBand
PASS src/maps/providers/vietmap.provider.spec.ts
Tests: 9 passed, 9 total
```

## Verification

```text
PATH=/home/tutruong/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin:$PATH corepack pnpm --filter api test -- --runTestsByPath apps/api/src/maps/providers/vietmap.provider.spec.ts --runInBand
PASS src/maps/providers/vietmap.provider.spec.ts
Tests: 9 passed, 9 total
```

```text
PATH=/home/tutruong/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin:$PATH corepack pnpm --filter api typecheck
tsc --noEmit --project tsconfig.json
exit 0
```

```text
PATH=/home/tutruong/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin:$PATH corepack pnpm --filter api lint
eslint .
exit 0
```

Note: typecheck initially failed because Prisma Client had not been generated in the fresh worktree install. Ran:

```text
PATH=/home/tutruong/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin:$PATH DATABASE_URL=postgresql://leopard:leopard@localhost:5432/leopard corepack pnpm --filter api exec prisma generate --schema prisma/schema.prisma
```

Then `corepack pnpm --filter api typecheck` passed.

## Concerns / Blockers

- No blockers.
- No real network calls are made in tests; provider HTTP is injected and mocked.
- No wiring was added to `app.module.ts`, OpenAPI, orders, auth, Prisma, mobile/admin or workspace configuration.

## Fix Round 1

Reviewer: Parfit

Verdict addressed: `CHANGES_REQUESTED`

Important findings fixed:

- Redacted API keys from Route v4 application-level failures where Vietmap returns HTTP 200 with `code !== 'OK'`.
- Updated this report to include the original implementation commit SHA and fix round commit SHA.

TDD RED:

```text
PATH=/home/tutruong/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin:$PATH corepack pnpm --filter api test -- --runTestsByPath apps/api/src/maps/providers/vietmap.provider.spec.ts --runInBand
FAIL src/maps/providers/vietmap.provider.spec.ts
Tests: 1 failed, 9 passed, 10 total
Expected: "Vietmap route failed: invalid route for [REDACTED]"
Received: "Vietmap route failed: invalid route for secret-vietmap-key"
```

GREEN and verification:

```text
PATH=/home/tutruong/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin:$PATH corepack pnpm --filter api test -- --runTestsByPath apps/api/src/maps/providers/vietmap.provider.spec.ts --runInBand
PASS src/maps/providers/vietmap.provider.spec.ts
Tests: 10 passed, 10 total
```

```text
PATH=/home/tutruong/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin:$PATH corepack pnpm --filter api typecheck
tsc --noEmit --project tsconfig.json
exit 0
```

```text
PATH=/home/tutruong/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin:$PATH corepack pnpm --filter api lint
eslint .
exit 0
```
