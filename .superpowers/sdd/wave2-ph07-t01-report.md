# PH-07-T01 Provider Contract and Demo ETA Report

## Status

DONE

## Scope

- Task: PH-07-T01 Provider Contract and Demo ETA
- Branch: `codex/ph-07-t01-demo-eta`
- Base SHA: `37f67bfacef76d73b44a9ae34d3fd9da5e36061d`
- Commit SHA: final task commit created after this report is staged; see `git rev-parse HEAD` / controller response.

## Changed Files

- `apps/api/src/maps/providers/map-provider.ts`
- `apps/api/src/maps/providers/demo-map.provider.ts`
- `apps/api/src/maps/domain/haversine.ts`
- `apps/api/src/maps/domain/demo-route-estimator.ts`
- `apps/api/src/maps/domain/haversine.spec.ts`
- `apps/api/src/maps/domain/demo-route-estimator.spec.ts`
- `.superpowers/sdd/wave2-ph07-t01-report.md`

## RED Evidence

Command:

```bash
PATH=/home/tutruong/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin:$PATH corepack pnpm --filter api test -- --runTestsByPath apps/api/src/maps/domain/haversine.spec.ts apps/api/src/maps/domain/demo-route-estimator.spec.ts --runInBand
```

Result:

- Exit code: 1
- `demo-route-estimator.spec.ts` failed because `./demo-route-estimator.js` did not exist.
- `haversine.spec.ts` failed because `./haversine.js` did not exist.

## GREEN Evidence

Command:

```bash
PATH=/home/tutruong/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin:$PATH corepack pnpm --filter api test -- --runTestsByPath apps/api/src/maps/domain/haversine.spec.ts apps/api/src/maps/domain/demo-route-estimator.spec.ts --runInBand
```

Result:

- Exit code: 0
- Test Suites: 2 passed, 2 total
- Tests: 4 passed, 4 total

Command:

```bash
PATH=/home/tutruong/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin:$PATH corepack pnpm --filter api typecheck
```

Result:

- Exit code: 0

Command:

```bash
PATH=/home/tutruong/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin:$PATH corepack pnpm --filter api lint
```

Result:

- Exit code: 0

## Implementation Notes

- Added local map provider contract types for `GeoPoint`, `PlaceCandidate`, `RouteInput`, `RouteEstimate`, `VerifiedOrderEstimate`, `RouteEstimator`, and `MapProvider`.
- Added Haversine distance and route-leg summing helpers.
- Added deterministic demo ETA logic: Haversine legs multiplied by `1.25`, speed `30 km/h`, `+5 minutes` per stop, duration rounded to the nearest minute, `source: DEMO`, `isEstimate: true`, injectable clock, and ISO `calculatedAt`.
- Added deterministic encoded polyline output and left pricing as `estimatedPriceVnd: 0` because PH-07-T03 owns pricing.
- Added a demo map provider facade with deterministic no-network search/geocode/route behavior.

## Setup Notes

- Dependency setup was completed by the controller with `corepack pnpm install --frozen-lockfile --ignore-scripts`.
- Because scripts were ignored, Prisma client generation was required for API typecheck:

```bash
PATH=/home/tutruong/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin:$PATH DATABASE_URL=postgresql://leopard:leopard@localhost:5432/leopard corepack pnpm --filter api exec prisma generate --schema prisma/schema.prisma
```

## Concerns

- The report cannot contain the final commit SHA inside the same commit without changing that commit hash. The exact final SHA is returned by the worker after commit.
