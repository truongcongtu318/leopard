# Auth and Access Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement FR-01/AC-01 authentication, refresh rotation, logout, role/ownership guard foundation and demo/Firebase OTP providers.

**Architecture:** `AuthModule` issues short-lived JWT access tokens and opaque hashed refresh sessions. Provider adapter verifies identity; policy guard composes role with resource-specific ownership checks.

**Tech Stack:** NestJS 11.1.28, Prisma 7.8.0, jose 6.2.3, Argon2 0.44.0, Firebase Admin 14.1.0, Jest 30.4.2, Supertest 7.2.2.

## Global Constraints

- Access token 15 minutes; refresh session max 7 days and rotates on every refresh.
- Refresh token stored hashed; reuse revokes the token family.
- Demo auth only in local/test and explicitly configured.
- 401 for unauthenticated/invalid session; 403 for valid identity without permission.

---

### Task PH-05-T01: OTP Provider Boundary

**Files:**
- Create: `apps/api/src/auth/providers/otp-provider.ts`, `demo-otp.provider.ts`, `firebase-otp.provider.ts`, `otp-provider.module.ts`
- Test: `apps/api/src/auth/providers/otp-provider.spec.ts`

**Interfaces:** Produces `OtpProvider.verify(idToken: string): Promise<{providerUserId:string; phoneNumber:string}>`.

- [ ] Test deterministic demo identities, Firebase adapter mapping, timeout/provider errors and rejection of demo provider outside local/test.
- [ ] Observe failing tests, implement injection token `OTP_PROVIDER`, redact token values from errors/logs, then run scoped tests.
- [ ] Expected: provider contract suite passes with Firebase SDK mocked and no network call.
- [ ] Commit `feat(auth): add OTP provider adapters`.

### Task PH-05-T02: Login and Access Token

**Files:**
- Create: `apps/api/src/auth/auth.module.ts`, `auth.controller.ts`, `auth.service.ts`, `token.service.ts`, `dto/login.dto.ts`
- Test: `apps/api/src/auth/login.e2e-spec.ts`
- Modify: `apps/api/src/app.module.ts`

**Interfaces:** `POST /api/v1/auth/login/demo {accountId}` (local/test only), `POST /api/v1/auth/firebase {idToken}` -> `{user, session: AuthSession}`, and authenticated `GET /api/v1/me`; JWT claims `{sub,role,sessionId}`.

- [ ] Test valid login, disabled user 403 `ACCOUNT_DISABLED`, invalid provider token 401 and 15-minute expiry.
- [ ] Implement user lookup/upsert policy defined by environment, access token signing with key ID and refresh session creation.
- [ ] Run E2E plus OpenAPI contract tests; expected response/schema alignment.
- [ ] Commit `feat(auth): implement secure login sessions`.

### Task PH-05-T03: Refresh Rotation and Logout

**Files:**
- Create: `apps/api/src/auth/refresh-session.repository.ts`, `dto/refresh.dto.ts`
- Test: `apps/api/src/auth/refresh.e2e-spec.ts`
- Modify: `apps/api/src/auth/auth.controller.ts`, `apps/api/src/auth/auth.service.ts`

**Interfaces:** `POST /auth/refresh {refreshToken}` -> new `AuthSession`; `POST /auth/logout` -> 204.

- [ ] Test atomic rotation, old-token reuse family revocation, expired/revoked token 401, concurrent refresh only one success and logout invalidation.
- [ ] Implement opaque 256-bit token, Argon2 hash, transaction update and session-family identifier.
- [ ] Run refresh E2E against test DB; expected all race/reuse cases pass.
- [ ] Commit `feat(auth): rotate and revoke refresh sessions`.

### Task PH-05-T04: Authentication and Policy Guards

**Files:**
- Create: `apps/api/src/auth/guards/access-token.guard.ts`, `role.guard.ts`
- Create: `apps/api/src/auth/decorators/current-user.ts`, `require-roles.ts`
- Create: `apps/api/src/auth/policies/resource-policy.ts`
- Test: `apps/api/src/auth/guards/guards.spec.ts`

**Interfaces:** Produces `AuthenticatedActor {userId; role; sessionId}` and `ResourcePolicy.assert(actor, action, resource): Promise<void>`.

- [ ] Test missing/expired/disabled identities, role mismatch and distinction between 401/403.
- [ ] Implement guards without trusting role from request body/query; load account status for private calls with bounded cache.
- [ ] Run guard tests and API typecheck.
- [ ] Commit `feat(auth): enforce authentication and role policies`.

### Task PH-05-T05: Client Login Integration

**Files:**
- Create: `apps/mobile/src/auth/LoginScreen.tsx`, `apps/admin/src/features/auth/LoginForm.tsx`
- Test: `apps/mobile/src/auth/LoginScreen.test.tsx`, `apps/admin/src/features/auth/LoginForm.test.tsx`
- Modify: `apps/mobile/app/(public)/login.tsx`, `apps/admin/src/app/(auth)/login/page.tsx`

**Interfaces:** Consumes login/refresh/logout endpoints; produces role-directed session hydration.

- [ ] Test submitting, invalid credentials, provider unavailable, session expired, demo selector only when configured and role redirect.
- [ ] Implement Firebase token handoff and demo account selector; never display/store refresh token in UI state.
- [ ] Run mobile/admin scoped tests and accessibility assertions.
- [ ] Commit `feat(auth): connect client login flows`.

## Phase Boundary Rules

- Do not implement order-specific ownership inside generic role guard.
- Do not persist plaintext refresh tokens or log auth headers.
- Do not expose demo login in staging/production without explicit config.
