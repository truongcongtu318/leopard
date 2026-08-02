# PH-05-T04 Report

- Date: Sunday, August 2, 2026
- Status: PARTIAL
- Implementation commit SHA: `5f79f221df7e874c82a77522013b6f11a94fed1a`

## Changed Files

- `apps/api/src/auth/auth.module.ts`
- `apps/api/src/auth/decorators/current-user.ts`
- `apps/api/src/auth/decorators/require-roles.ts`
- `apps/api/src/auth/guards/access-token.guard.ts`
- `apps/api/src/auth/guards/guards.spec.ts`
- `apps/api/src/auth/guards/role.guard.ts`
- `apps/api/src/auth/policies/resource-policy.ts`

## Scope Delivered

- Added reusable `AccessTokenGuard` that validates bearer shape, JWT signature/expiry, refresh-session state, and current user activity before attaching `AuthenticatedActor { userId, role, sessionId }`.
- Added reusable `RoleGuard` and `RequireRoles(...)` metadata decorator with `401` for missing actor and `403` for role denial.
- Added `CurrentUser` and `CurrentUserRole` decorators with stable public names for later consumers.
- Added generic `ResourcePolicy.assert(actor, action, resource)` with owner, role, and predicate-based authorization paths.
- Exported the new guards/policy from `AuthModule` for later maps/orders consumers.

## RED Evidence

1. Missing guard surface:
   - Command: `./apps/api/node_modules/.bin/jest --config apps/api/jest.config.cjs --runInBand apps/api/src/auth/guards/guards.spec.ts`
   - Result: FAIL
   - Key error: `Could not locate module ../decorators/current-user.js`

2. Test harness dependency issue after first implementation pass:
   - Command: `./apps/api/node_modules/.bin/jest --config apps/api/jest.config.cjs --runInBand apps/api/src/auth/guards/guards.spec.ts`
   - Result: FAIL
   - Key error: `Nest can't resolve dependencies of the AccessTokenGuard (?, TokenService)`

3. Expired-token scenario initially exercised the wrong failure path:
   - Command: `./apps/api/node_modules/.bin/jest --config apps/api/jest.config.cjs --runInBand apps/api/src/auth/guards/guards.spec.ts`
   - Result: FAIL
   - Key error: expected `401`, received `200`

## GREEN Evidence

1. Guard/decorator/policy suite:
   - Command: `./apps/api/node_modules/.bin/jest --config apps/api/jest.config.cjs --runInBand apps/api/src/auth/guards/guards.spec.ts`
   - Result: PASS (`10/10`)

2. API typecheck:
   - Command: `./node_modules/.bin/tsc --noEmit --project apps/api/tsconfig.json`
   - Result: PASS

3. API lint:
   - Command: `../../node_modules/.bin/eslint .`
   - Working directory: `apps/api`
   - Result: PASS

4. Existing login e2e regression:
   - Command: `./node_modules/.bin/jest --config jest-e2e.config.cjs --testPathIgnorePatterns=database-schema\\.spec\\.ts$ --runInBand src/auth/login.e2e-spec.ts`
   - Working directory: `apps/api`
   - Result: PASS (`5/5`)

5. Existing refresh e2e in mocked path:
   - Command: `bash infra/scripts/with-compose-cleanup.sh bash -lc 'docker compose up -d --wait postgres && export DATABASE_URL="postgresql://leopard:leopard_local@localhost:5432/leopard?schema=public" && ./apps/api/node_modules/.bin/jest --config apps/api/jest-e2e.config.cjs --testPathIgnorePatterns=database-schema\\.spec\\.ts$ --runInBand apps/api/src/auth/refresh.e2e-spec.ts'`
   - Result: mixed
   - Passing coverage inside the file:
     - `PH-05-T03 refresh rotation and logout` passed `5/5`
     - `PH-05-T03 refresh rotation and logout with Prisma transactions` passed `selects the persisted refresh session for each access token deterministically`

## Verification Summary

- Implemented behaviors requested for JWT/session/disabled/role/policy handling are covered by the new focused guard suite and pass.
- Existing `login.e2e` still passes unchanged.
- `refresh.e2e` real-Postgres half does not fully pass in this workspace because it assumes an empty `refreshSession` table and asserts global counts (`2`, `1`, `0`) while the Compose database already contains seeded rows unrelated to this task.

## Concerns / Blockers

1. `apps/api/src/auth/refresh.e2e-spec.ts` real-Postgres section is environment-sensitive and currently fails on Sunday, August 2, 2026 because the local Compose database includes pre-seeded `refreshSession` rows. This is outside PH-05-T04 ownership; I did not edit that spec or shared test tooling.
2. The Compose cleanup script successfully attempted teardown, but Docker returned `permission denied` while stopping `leopard-postgres-1` after the failing `refresh.e2e` run. I did not change container/tooling files in this task.
3. I did not add a cross-request identity cache. Given the security-sensitive requirement to reflect revoked sessions and disabled users immediately, the implementation keeps live session and user lookups instead of introducing a TTL window without an invalidation hook in scope.
