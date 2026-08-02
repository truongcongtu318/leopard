Status: COMPLETE WITH SCOPED AUTH LIMITATION

Commit SHA: `bdb1b1b5598b6c29c798778ce107665f30f18d2b`
Branch: `codex/ph-07-t04-map-rest-api`
Worktree: `/home/tutruong/project/leopard/.worktrees/ph-07-t04-map-rest-api`

## Changed files

- `apps/api/src/app.module.ts`
- `apps/api/src/maps/maps.controller.ts`
- `apps/api/src/maps/maps.e2e-spec.ts`
- `apps/api/src/maps/maps.module.ts`
- `apps/api/src/maps/maps.service.ts`
- `apps/api/src/maps/providers/demo-map.provider.ts`
- `apps/api/src/maps/providers/map-provider.ts`
- `apps/api/src/maps/providers/resilient-map.provider.ts`
- `apps/api/src/maps/providers/vietmap.provider.spec.ts`
- `apps/api/src/maps/providers/vietmap.provider.ts`

## Delivered scope

- Registered `MapsModule` in `AppModule`.
- Added authenticated REST endpoints:
  - `GET /maps/search?q=`
  - `GET /maps/geocode/:placeId`
  - `POST /orders/estimate`
- Aligned `POST /orders/estimate` to documented `200 OK` via controller decorator.
- Returned provider `source` for geocode and preserved demo labels/source in search/estimate flows.
- Redacted provider failures behind generic `MAP_PROVIDER_UNAVAILABLE`.
- Kept estimate response fields required by the phase brief, including `estimateToken`.
- Preserved exported `EstimateTokenService.verify(token: string)` surface via `MapsModule` export only; no PH-06 files changed.
- Added smallest-scoped local rate limiting in `maps/**`:
  - `GET /maps/search`: 30 requests/minute per bearer+IP
  - `GET /maps/geocode/:placeId`: 30 requests/minute per bearer+IP
  - `POST /orders/estimate`: 10 requests/minute per bearer+IP
  - Handles real runtime `/api/v1` prefix without changing shared infrastructure.

## RED/GREEN evidence

### RED

Added E2E coverage first in `apps/api/src/maps/maps.e2e-spec.ts` for:

- `POST /orders/estimate` should return `200`, not Nest default `201`
- repeated estimate requests should return `429 RATE_LIMITED`

Observed failing run:

```bash
pnpm exec jest --config jest-e2e.config.cjs --runInBand --testPathIgnorePatterns=database-schema\\.spec\\.ts --testPathPatterns=src/maps/maps.e2e-spec.ts
```

Result:

- `issues a bounded route estimate token...` failed with `expected 200 "OK", got 201 "Created"`
- `rate limits repeated order estimate requests...` failed before rate-limit assertion because responses were still `201`

### GREEN

Implemented:

- `@HttpCode(HttpStatus.OK)` on `POST /orders/estimate`
- local `MapsRateLimitGuard`
- `GeocodeResult` with `{ point, source }` propagated through demo/vietmap/resilient providers and REST response

Observed passing run:

```bash
pnpm exec jest --config jest-e2e.config.cjs --runInBand --testPathIgnorePatterns=database-schema\\.spec\\.ts --testPathPatterns=src/maps/maps.e2e-spec.ts
```

Result: `9 passed, 0 failed`

## Verification commands and results

### Focused E2E

```bash
pnpm exec jest --config jest-e2e.config.cjs --runInBand --testPathIgnorePatterns=database-schema\\.spec\\.ts --testPathPatterns=src/maps/maps.e2e-spec.ts
```

- PASS: `src/maps/maps.e2e-spec.ts` (`9/9`)

### API unit/integration test suite

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

## Exact blockers / concerns

1. Auth guard controlled-surface limitation:
   - This worktree does not expose an approved shared session/JWT validation guard inside the allowed ownership boundary.
   - The shipped guard enforces a non-empty Bearer header only.
   - If PH-07-T04 requires real session validation instead of a request gate, that needs controlled-surface expansion into auth/common infrastructure outside `maps/**`.

2. Repo E2E tooling issue outside task scope:
   - `pnpm --filter api test:e2e` currently reports `No tests found` because `jest-e2e.config.cjs` inherits an ignore pattern that excludes `*.e2e-spec.ts`.
   - Nearest supported override command was used for task verification instead of editing root tooling.

3. Full API E2E suite still has an unrelated existing failure:
   - Command:
     ```bash
     pnpm exec jest --config jest-e2e.config.cjs --runInBand --testPathIgnorePatterns=database-schema\\.spec\\.ts
     ```
   - Result:
     - PASS: `src/maps/maps.e2e-spec.ts`
     - PASS: `src/health/health.e2e-spec.ts`
     - FAIL: `src/app.e2e-spec.ts`
   - Failure cause: `DATABASE_URL is required to initialize PrismaService`
   - No change was made outside owned task files to address that broader app-shell fixture.
