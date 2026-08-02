# PH-05-T04 Report

- Date: Sunday, August 2, 2026
- Status: COMPLETE (scoped reviewer fix round)
- Initial implementation commit SHA: `5f79f221df7e874c82a77522013b6f11a94fed1a`
- Fix-round implementation commit SHA: `a8416c85c47fdb5c71937e2cbedf3e342c4dc0f7`

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
- Added explicit bounded `AccountStatusCache` for current account role/status only. Session validity remains live-checked against `refreshSession` on every request and is not cached.
- Exported the new guards/policy from `AuthModule` for later maps/orders consumers.

## Cache Semantics

- Cache scope: `userId -> { userId, role, status }`
- Default TTL: `5_000 ms`
- Default max size: `100` entries
- Eviction policy: oldest cached entry is removed when inserting beyond max size after expired entries are cleared
- Session safety: `refreshSession.findUnique(...)` still runs on every request, so revocation and expiry are always live
- Authorization safety: `actor.role` always comes from the current database user record, not the signed JWT role claim

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

## GREEN Evidence

1. Focused guard/decorator/policy suite after fix round:
   - Command: `./apps/api/node_modules/.bin/jest --config apps/api/jest.config.cjs --runInBand apps/api/src/auth/guards/guards.spec.ts`
   - Result: PASS (`13/13`)
   - New coverage in this round:
     - cache TTL expiry
     - cache max-size eviction
     - cached account lookup while session validity remains live
     - forged signed `ADMIN` token against a `CUSTOMER` DB user returning `403`

2. API typecheck after fix round:
   - Command: `./node_modules/.bin/tsc --noEmit --project apps/api/tsconfig.json`
   - Result: PASS

3. API lint after fix round:
   - Command: `../../node_modules/.bin/eslint .`
   - Working directory: `apps/api`
   - Result: PASS

## Verification Summary

- Reviewer-requested scope is implemented and covered by focused tests.
- Account role/status is now cached with a bounded TTL/size policy, while refresh-session revocation and expiry checks remain live on every request.
- A signed token claiming `ADMIN` no longer has any chance to elevate a `CUSTOMER` database user through `@RequireRoles('ADMIN')`; the focused regression now proves the guard returns `403`.

## Concerns / Blockers

1. The account-status cache intentionally introduces a short role/status staleness window of up to `5 seconds` for repeated private requests by the same `userId`. That boundary is now explicit, tested, and limited to account role/status only; session revocation and expiry are still checked live and are unaffected by the cache.
