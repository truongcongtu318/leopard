Status: DONE_WITH_CONCERNS

Commit SHA: `a58f9c3`
Branch: `codex/ph-07-t04-map-rest-api`
Worktree: `/home/tutruong/project/leopard/.worktrees/ph-07-t04-map-rest-api`
Updated: `2026-08-02`

## This remediation round changed

- `apps/api/src/maps/maps.controller.ts`
- `apps/api/src/maps/maps.e2e-spec.ts`
- `apps/api/src/maps/maps.service.ts`
- `apps/api/src/maps/providers/demo-map.provider.ts`
- `apps/api/src/maps/providers/map-provider.ts`
- `apps/api/src/maps/providers/vietmap.provider.ts`
- `apps/api/src/maps/providers/vietmap.provider.spec.ts`
- `.superpowers/sdd/2026-08-01-wave-2-two-agent-execution-plan/task-ph07-t04-report.md`

`apps/api/src/app.module.ts` stayed as-is in this round; `MapsModule` registration from the earlier branch commit remains intact.

## Scope delivered

- Aligned `GET /maps/search` runtime shape to frozen `MapSearchResponse`:
  - top-level `{ source, results }`
  - result items expose `placeId`, `label`, `lat`, `lng`, optional `address`
- Aligned `GET /maps/geocode/:placeId` runtime shape to frozen `GeocodeResult`:
  - flat `{ source, placeId, label, lat, lng }`
  - optional `address`
- Aligned `POST /orders/estimate` input shape to frozen `EstimateRequest`:
  - accepts `pickup`, optional `stops`, `dropoff` as stop objects with `type`, `address`, `lat`, `lng`
  - maps stop coordinates into the existing route-estimate domain input without changing pricing or token logic
- Replaced maps-local validation drift with explicit `400 BAD_REQUEST` validation inside `maps.controller.ts`, so contract-facing input errors no longer rely on the app-wide `422` validation envelope.
- Closed the missing nested-required validation hole:
  - missing `pickup` now fails
  - missing nested `dropoff.lng` now fails
  - omitted `stops` now succeeds as the frozen contract allows
- Tightened the temporary maps rate-limit caller key so it no longer stores raw bearer strings:
  - prefers authenticated actor/session identity when a future real auth guard populates it
  - currently falls back to `sha256(bearer-token) + ip`
- Preserved generic provider redaction and estimate-token behavior; no pricing, orders, auth, OpenAPI, or shared infrastructure files were edited.

## RED -> GREEN evidence

### RED

After rewriting the focused E2E spec to match the frozen contract, the maps lane failed exactly where the review said it would:

Command:

```bash
pnpm exec jest --config jest-e2e.config.cjs --runInBand --testPathIgnorePatterns=database-schema\\.spec\\.ts --testPathPatterns=src/maps/maps.e2e-spec.ts
```

Observed failures:

- `rejects search queries outside supported bounds`:
  - expected `400`, got `422`
- `returns demo map search candidates with provider source and demo label`:
  - runtime returned an array of candidates instead of `{ source, results }`
- `returns geocoded coordinates with provider source`:
  - runtime returned `{ point: { latitude, longitude } }` instead of flat `label/lat/lng`
- `issues a bounded route estimate token...`:
  - frozen `EstimateRequest` payload failed validation because runtime still expected raw `latitude/longitude` points
- `rejects route estimates with more than three intermediate stops`:
  - expected `400`, got `422`
- `rejects route estimates when pickup is missing`:
  - expected `400`, got `422`
- `rejects route estimates when a required nested stop coordinate is missing`:
  - expected `400`, got `422`
- `rate limits repeated order estimate requests for the same caller`:
  - failed early because the new contract-shaped estimate request was still rejected

### GREEN

After replacing maps-local input handling with explicit contract-shaped validation and response mapping, the same focused suite passed:

Command:

```bash
pnpm exec jest --config jest-e2e.config.cjs --runInBand --testPathIgnorePatterns=database-schema\\.spec\\.ts --testPathPatterns=src/maps/maps.e2e-spec.ts
```

Result:

- PASS: `src/maps/maps.e2e-spec.ts` (`10/10`)

## Verification commands and results

### Focused maps E2E (actual verification command)

```bash
pnpm exec jest --config jest-e2e.config.cjs --runInBand --testPathIgnorePatterns=database-schema\\.spec\\.ts --testPathPatterns=src/maps/maps.e2e-spec.ts
```

- PASS: `10/10`

### Plan-requested E2E script

```bash
pnpm --filter api test:e2e -- maps.e2e-spec.ts
```

- FAIL outside task scope: `jest-e2e.config.cjs` still ignores `*.e2e-spec.ts`, so the script reported `No tests found`
- No root/shared tooling files were edited to change that behavior

### API test suite

```bash
pnpm --filter api test
```

- PASS: `7` suites, `83` tests

### API contract

```bash
pnpm --filter api test:contract
```

- PASS: `test/openapi-contract.spec.ts` (`34/34`)

### API typecheck

```bash
pnpm --filter api typecheck
```

- PASS

### API lint

```bash
pnpm --filter api lint
```

- PASS

### API build

```bash
pnpm --filter api build
```

- PASS

## Unresolved concerns / dependency status

1. Real map authentication is still blocked on PH-05-T04.
   - The review required replacing `BearerAuthGuard` with the shared public `AccessTokenGuard`.
   - As of `2026-08-02`, `git grep -n "AccessTokenGuard\\|BearerAuthGuard\\|JwtAuthGuard\\|AuthGuard" codex/phase-ph-05 -- apps/api/src` returned no shared public guard surface to import.
   - I did not invent a second auth implementation.
   - Current status is therefore `DONE_WITH_CONCERNS`, not final DONE.

2. Frozen OpenAPI advertises `404` for `GET /maps/geocode/{placeId}`, but that not-found semantic is not available inside the current maps-only ownership boundary.
   - Demo geocode is intentionally deterministic for demo IDs.
   - Provider failures are still correctly mapped to `503 MAP_PROVIDER_UNAVAILABLE`.
   - Faking a new `404` heuristic without provider/auth/shared contract work would create a second drift surface, so this remains a documented controlled-surface gap.

3. Rate limiting is ready for the future real auth swap, but it cannot use stable actor/session identity until PH-05-T04 publishes the shared auth guard and request identity shape.
   - Current fallback is hashed bearer token + IP, not raw bearer text.

## Reviewer-facing summary

- Review issue 1: **not fully resolved**; precise dependency documented, no second auth implementation added
- Review issue 2: **resolved** for search/geocode/estimate runtime shapes
- Review issue 3: **resolved for 400/200/401 behavior inside maps scope**, with the geocode `404` contract gap explicitly documented
- Review issue 4: **resolved** with regression tests for missing `pickup` and missing nested `dropoff.lng`
