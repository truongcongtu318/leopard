# Wave 2 PH-07-T03 Report

## Task

- Task: PH-07-T03 Pricing and Estimate Token
- Branch: `codex/ph-07-t03-pricing-estimate-token`
- Base: `c11b4499c4c5bbfbd8b4aff06f483c99096673c0`
- Worktree: `/home/tutruong/project/leopard/.worktrees/ph-07-t03-pricing-estimate-token`

## Changed Files

- `apps/api/src/maps/domain/pricing.service.ts`
- `apps/api/src/maps/domain/pricing.service.spec.ts`
- `apps/api/src/maps/domain/estimate-token.service.ts`
- `apps/api/src/maps/domain/estimate-token.service.spec.ts`

## Implementation Summary

- Added `PricingService.quote({ vehicleType, distanceMeters, stopCount })` returning integer `{ amountVnd, currency: 'VND' }`.
- Pricing config validates vehicle rates, base fare, per-km fare, stop surcharge and minimum fare before quotes are issued.
- Added `EstimateTokenService.issue(...)` and `verify(token)` using HMAC-SHA256 over a signed payload.
- Estimate tokens bind normalized route input, route estimate, quote amount/currency and a 10-minute expiry.
- `verify(token)` returns `VerifiedOrderEstimate` with `normalizedInput`, `expiresAt` and the signed quoted `estimatedPriceVnd`.
- Token errors do not include the HMAC secret.

## TDD Evidence

### RED

Command:

```bash
PATH=/home/tutruong/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin:$PATH corepack pnpm --filter api test -- --runTestsByPath apps/api/src/maps/domain/pricing.service.spec.ts apps/api/src/maps/domain/estimate-token.service.spec.ts --runInBand
```

Result: failed before implementation because Jest could not locate `./pricing.service.js` and `./estimate-token.service.js`.

### GREEN

Command:

```bash
PATH=/home/tutruong/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin:$PATH corepack pnpm --filter api test -- --runTestsByPath apps/api/src/maps/domain/pricing.service.spec.ts apps/api/src/maps/domain/estimate-token.service.spec.ts --runInBand
```

Result: passed, 2 suites / 9 tests.

## Verification

Dependency setup:

```bash
PATH=/home/tutruong/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin:$PATH corepack pnpm install --frozen-lockfile --ignore-scripts
DATABASE_URL=postgresql://user:pass@localhost:5432/leopard PATH=/home/tutruong/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin:$PATH corepack pnpm --filter api exec prisma generate --schema prisma/schema.prisma
```

Commands:

```bash
PATH=/home/tutruong/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin:$PATH corepack pnpm --filter api typecheck
PATH=/home/tutruong/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin:$PATH corepack pnpm --filter api lint
git diff --check
```

Results:

- Scoped Jest: passed, 2 suites / 9 tests.
- API typecheck: passed after local Prisma client generation.
- API lint: passed.
- `git diff --check`: passed.

## Concerns / Blockers

- No blocker.
- Environment note: after `install --ignore-scripts`, `corepack pnpm --filter api typecheck` initially failed because Prisma Client was not generated. Running `prisma generate` with a dummy local `DATABASE_URL` generated the local client and typecheck passed.
