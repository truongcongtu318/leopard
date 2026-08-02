# PH-07-T04 Report: Map REST API Auth Integration Fix

Status: VERIFIED

Date: Sunday, August 2, 2026
Branch: `codex/ph-07-t04-map-rest-api`
Worktree: `/home/tutruong/project/leopard/.worktrees/ph-07-t04-map-rest-api`
Dependency base: `e2637c8` (verified PH-05 auth phase merge)
Implementation commit: `1de286721475524a648b7bbb951d2447fe6f891e`

## Scope

This fix round replaced the map-local presence-only `BearerAuthGuard` with the
shared `AccessTokenGuard` from PH-05 while preserving the frozen map response
shapes, map-local validation, provider behavior and estimate-token behavior from
`7bb4ca1`.

Changed in the implementation commit:

- `apps/api/src/maps/maps.controller.ts`
- `apps/api/src/maps/maps.module.ts`
- `apps/api/src/maps/maps.e2e-spec.ts`

The map controller now runs `AccessTokenGuard` before `MapsRateLimitGuard`.
The shared guard validates the signed access token, backing refresh session and
active user, then attaches `AuthenticatedActor`. The rate-limit key is now
`actor:<userId>:<ip>`; it has no bearer-token fallback and never stores the raw
authorization value. `MapsModule` imports `AuthModule` and `DatabaseModule` and
provides the shared guard's `AccountStatusCache` dependency so Nest can resolve
the exported `AccessTokenGuard` after the PH-05 merge.

No auth source, OpenAPI, shared filter, provider, `pnpm-workspace.yaml` or
unrelated file was changed.

## TDD Evidence

### RED

Before the production wiring change, the focused maps E2E suite ran against the
presence-only guard and failed on the new behavior:

- Invalid signed access token: expected `401`, received `200`.
- Expired signed access token: expected `401`, received `200`.
- Revoked refresh session: expected `401`, received `200`.
- Same actor across two valid sessions: expected rate limit `429`, received `200`.

Result: `4` failed, `9` passed.

### GREEN

After the controller/module wiring change, the same focused suite passed:

- Real signed access token from `/auth/login/demo` succeeds on all private map
  endpoints.
- Invalid signature, expired JWT and revoked refresh session are rejected with
  `401 UNAUTHORIZED`.
- Two sessions for the same customer share the `userId + IP` rate-limit bucket.
- Existing response, validation, provider failure and estimate-token assertions
  remain green.

Result: `src/maps/maps.e2e-spec.ts`, `13/13` tests passed.

## Verification

All commands below used the repository's existing Node 24.14.0 runtime and
installed binaries directly. This avoided a pnpm install side effect: the first
`pnpm exec` attempt stopped at `ERR_PNPM_IGNORED_BUILDS` for `argon2@0.44.0`.
The side-effect change to `pnpm-workspace.yaml` was discarded; its final diff is
empty.

Focused maps E2E:

```text
PASS src/maps/maps.e2e-spec.ts
13/13 tests passed
```

API contract:

```text
PASS test/openapi-contract.spec.ts
34/34 tests passed
```

API unit suite:

```text
9 suites passed
104 tests passed
```

API typecheck: PASS (`tsc --noEmit --project apps/api/tsconfig.json`)

API build: PASS (`tsc --project apps/api/tsconfig.json`)

API lint: PASS (`eslint .`, with `NODE_PATH` set only to the existing cached
`@babel/preset-typescript` package; no repository dependency files changed)

Whitespace: PASS (`git diff --check`)

Final tracked worktree scope before the report commit:

```text
apps/api/src/maps/maps.controller.ts
apps/api/src/maps/maps.e2e-spec.ts
apps/api/src/maps/maps.module.ts
```

`pnpm-workspace.yaml` is clean.

## Remaining Note

The existing report note that the frozen OpenAPI advertises a `404` geocode
not-found semantic remains outside this auth fix's ownership boundary. Demo
geocode IDs remain deterministic and provider failures remain
`503 MAP_PROVIDER_UNAVAILABLE`; no new heuristic was introduced.
