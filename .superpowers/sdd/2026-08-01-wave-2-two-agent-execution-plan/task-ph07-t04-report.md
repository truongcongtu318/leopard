# PH-07-T04 Report: Map REST API Auth and Final 404 Fixes

Status: VERIFIED

Date: Sunday, August 2, 2026
Branch: `codex/ph-07-t04-map-rest-api`
Worktree: `/home/tutruong/project/leopard/.worktrees/ph-07-t04-map-rest-api`
Dependency base: `e2637c8` (verified PH-05 auth phase merge)
Implementation commit: `1de286721475524a648b7bbb951d2447fe6f891e`

Final 404 implementation commit: `de7438032a8508a2d8cf81843be14d9502b230cc`

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

## Final 404 Fix Round

The remaining Important finding is resolved: `GET /maps/geocode/:placeId` now
maps a provider not-found result to the frozen contract's HTTP 404 response.

Changed in final implementation commit `de7438032a8508a2d8cf81843be14d9502b230cc`:

- `apps/api/src/maps/providers/map-provider.ts` defines the typed
  `MapProviderNotFoundError` boundary.
- `VietmapProvider` maps geocode HTTP 404 responses to that error, and
  `ResilientMapProvider` does not replace not-found with demo data.
- `DemoMapProvider` rejects non-demo place IDs with the same explicit error so
  local E2E behavior is deterministic.
- `MapsService` maps provider not-found to `MapPlaceNotFoundError` while
  retaining generic `503 MAP_PROVIDER_UNAVAILABLE` conversion.
- `MapsController` maps only `MapPlaceNotFoundError` to Nest 404, producing the
  existing `NOT_FOUND` API envelope through the unchanged shared filter.
- `apps/api/src/maps/maps.e2e-spec.ts` covers an authenticated unknown place ID
  returning `404 NOT_FOUND`.
- `apps/api/src/maps/providers/vietmap.provider.spec.ts` covers upstream 404
  mapping and no fallback masking.

### TDD RED

Before the implementation change:

- Focused maps E2E: `1` failed, `13` passed; unknown place ID expected `404`,
  received `200`.
- Provider unit suite: `2` failed, `10` passed; no typed provider not-found
  error existed and resilient fallback returned demo data.

### TDD GREEN

After the implementation change:

- Focused maps E2E: `14/14` passed.
- Provider unit suite: `12/12` passed.

### Final verification

- API OpenAPI contract: `34/34` passed.
- API unit suite: `9` suites, `106` tests passed.
- API typecheck: PASS (`tsc --noEmit --project apps/api/tsconfig.json`).
- API lint: PASS (`eslint .`).
- API build: PASS (`tsc --project apps/api/tsconfig.json`).
- Whitespace: PASS (`git diff --check`).
- Existing provider-unavailable E2E remains `503 MAP_PROVIDER_UNAVAILABLE`.

Only map implementation/test files and this task report were changed in this
fix round. Auth source, OpenAPI, shared filters, `pnpm-workspace.yaml`, and
unrelated providers remain untouched. PH-05-T05 was not run.
