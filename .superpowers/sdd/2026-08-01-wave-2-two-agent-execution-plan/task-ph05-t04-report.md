# PH-05-T04 Report

- Date: Sunday, August 2, 2026
- Status: COMPLETE (scoped second reviewer fix round)
- Initial implementation commit SHA: `5f79f221df7e874c82a77522013b6f11a94fed1a`
- Fix-round implementation commit SHA: `a8416c85c47fdb5c71937e2cbedf3e342c4dc0f7`
- Second fix-round implementation commit SHA: `b9652c2a7f420debd678c2928e487163f2a54f56`

## Changed Files

- `apps/api/src/auth/auth.module.ts`
- `apps/api/src/auth/decorators/current-user.ts`
- `apps/api/src/auth/decorators/require-roles.ts`
- `apps/api/src/auth/guards/access-token.guard.ts`
- `apps/api/src/auth/guards/account-status-cache.ts`
- `apps/api/src/auth/guards/guards.spec.ts`
- `apps/api/src/auth/guards/role.guard.ts`
- `apps/api/src/auth/policies/resource-policy.ts`

## Scope Delivered

- Added reusable `AccessTokenGuard` that validates bearer shape, JWT signature/expiry, refresh-session state, and current user activity before attaching `AuthenticatedActor { userId, role, sessionId }`.
- Added reusable `RoleGuard` and `RequireRoles(...)` metadata decorator with `401` for missing actor and `403` for role denial.
- Added `CurrentUser` and `CurrentUserRole` decorators with stable public names for later consumers.
- Added generic `ResourcePolicy.assert(actor, action, resource)` with owner, role, and predicate-based authorization paths.
- Added explicit bounded `AccountStatusCache` for current account status only. The current database role is loaded on every request, so role demotions cannot remain authorized for the cache TTL. Session validity remains live-checked against `refreshSession` on every request and is not cached.
- Exported the new guards/policy from `AuthModule` for later maps/orders consumers.

## Cache Semantics

- Cache scope: `userId -> { userId, status }`; role is deliberately excluded
- Default TTL: `5_000 ms`
- Default max size: `100` entries
- Eviction policy: oldest cached entry is removed when inserting beyond max size after expired entries are cleared
- Role safety: `prisma.user.findUnique(...)` loads the current role on every request, including warm status-cache hits; `actor.role` never comes from the signed JWT role claim
- Session safety: `refreshSession.findUnique(...)` still runs on every request, so revocation and expiry are always live

## RED Evidence

1. Initial task red, missing guard surface:
   - Command: `./apps/api/node_modules/.bin/jest --config apps/api/jest.config.cjs --runInBand apps/api/src/auth/guards/guards.spec.ts`
   - Result: FAIL
   - Key error: `Could not locate module ../decorators/current-user.js`

2. Initial task red, test harness dependency issue after first implementation pass:
   - Command: `./apps/api/node_modules/.bin/jest --config apps/api/jest.config.cjs --runInBand apps/api/src/auth/guards/guards.spec.ts`
   - Result: FAIL
   - Key error: `Nest can't resolve dependencies of the AccessTokenGuard (?, TokenService)`

3. Initial task red, expired-token scenario initially exercised the wrong failure path:
   - Command: `./apps/api/node_modules/.bin/jest --config apps/api/jest.config.cjs --runInBand apps/api/src/auth/guards/guards.spec.ts`
   - Result: FAIL
   - Key error: expected `401`, received `200`

4. Fix round red, missing cache boundary:
   - Command: `./apps/api/node_modules/.bin/jest --config apps/api/jest.config.cjs --runInBand apps/api/src/auth/guards/guards.spec.ts`
   - Result: FAIL
   - Key error: `Could not locate module ./account-status-cache.js`

5. Fix round red, cache DI boundary was not explicit yet:
   - Command: `./apps/api/node_modules/.bin/jest --config apps/api/jest.config.cjs --runInBand apps/api/src/auth/guards/guards.spec.ts`
   - Result: FAIL
   - Key error: `Nest can't resolve dependencies of the AccountStatusCache (?)`

6. Second fix round red, warm role cache could authorize a demoted user:
   - Command: `./apps/api/node_modules/.bin/jest --config apps/api/jest.config.cjs --runInBand apps/api/src/auth/guards/guards.spec.ts`
   - Result: FAIL (`12 passed, 2 failed`)
   - Key error: expected `403` after `ADMIN -> CUSTOMER` demotion, received `200`; the companion lookup assertion also observed one user lookup instead of two
   - The same red run confirmed the mutated revoked session returned `401` and `refreshSession.findUnique(...)` was called twice; the existing live-session path was preserved while the test was strengthened

## GREEN Evidence

1. Focused guard/decorator/policy suite after second fix round:
   - Command: `./apps/api/node_modules/.bin/jest --config apps/api/jest.config.cjs --runInBand apps/api/src/auth/guards/guards.spec.ts`
   - Result: PASS (`14/14`)
   - New coverage across the fix rounds:
     - cache TTL expiry
     - cache max-size eviction
     - status-only cache with live role lookup after a warm hit
     - two authenticated requests with an intervening session revocation, returning `401` on the second request
     - forged signed `ADMIN` token against a `CUSTOMER` DB user returning `403`
     - warm-cache `ADMIN -> CUSTOMER` database demotion returning `403`

2. API typecheck after second fix round:
   - Command: `./node_modules/.bin/tsc --noEmit --project apps/api/tsconfig.json`
   - Result: PASS

3. API lint after second fix round:
   - Command: `../../node_modules/.bin/eslint .`
   - Working directory: `apps/api`
   - Result: PASS

4. Whitespace check after second fix round:
   - Command: `git diff --check`
   - Result: PASS

## Verification Summary

- Reviewer-requested scope is implemented and covered by focused tests.
- Account status remains bounded by the explicit TTL/size policy, while the current role is loaded live on every request and refresh-session revocation/expiry checks remain live on every request.
- A signed token claiming `ADMIN` no longer has any chance to elevate a `CUSTOMER` database user through `@RequireRoles('ADMIN')`; the focused regression now proves the guard returns `403`.

## Concerns / Blockers

1. The account-status cache intentionally introduces a short status staleness window of up to `5 seconds` for repeated private requests by the same `userId`. That boundary is explicit and tested; role changes are not cached, and session revocation/expiry are checked live and unaffected by the cache.
