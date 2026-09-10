# PH-05-T02 Login and Access Token Report

## Scope

- Branch: `codex/ph-05-t02-login-access-token`
- Base: `630fb2e8606c7063db734ea9404754db3efcbed3`
- Task: implement login/demo, Firebase login, authenticated `/me`, JWT claims `{sub, role, sessionId}`, 15-minute access-token expiry, and hashed refresh-session creation.

## Changed Files

- `apps/api/src/app.module.ts`
- `apps/api/src/auth/auth.module.ts`
- `apps/api/src/auth/auth.controller.ts`
- `apps/api/src/auth/auth.service.ts`
- `apps/api/src/auth/token.service.ts`
- `apps/api/src/auth/dto/login.dto.ts`
- `apps/api/src/auth/login.e2e-spec.ts`

## RED Evidence

Command:

```bash
PATH=/home/tutruong/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin:$PATH corepack pnpm --filter api exec jest --config jest-e2e.config.cjs --runTestsByPath src/auth/login.e2e-spec.ts --testPathIgnorePatterns 'database-schema\\.spec\\.ts' --runInBand
```

Result: failed before implementation because `./auth.module.js` could not be located from `src/auth/login.e2e-spec.ts`, confirming the new auth module/routes did not exist yet.

Note: the package `test:e2e` script currently inherits an ignore pattern for `*.e2e-spec.ts`; the scoped RED/GREEN command overrides `testPathIgnorePatterns` as the nearest supported Jest E2E path command.

## GREEN Evidence

Command:

```bash
PATH=/home/tutruong/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin:$PATH corepack pnpm --filter api exec jest --config jest-e2e.config.cjs --runTestsByPath src/auth/login.e2e-spec.ts --testPathIgnorePatterns 'database-schema\\.spec\\.ts' --runInBand
```

Result: PASS, 4 tests passed.

Covered:

- Valid demo login creates an active user session and returns an access token plus refresh token.
- Access-token JWT payload contains `{sub, role, sessionId}` and `exp - iat === 900`.
- Refresh session persists only a token hash, not the plaintext refresh token.
- Disabled users receive `403 ACCOUNT_DISABLED`.
- Valid Firebase token returns `{user, session}`.
- Invalid provider token receives `401 INVALID_PROVIDER_TOKEN` without echoing the raw token.
- Authenticated `GET /api/v1/me` returns the current user.

## Verification

```bash
PATH=/home/tutruong/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin:$PATH corepack pnpm --filter api test:contract
```

Result: PASS, 34 tests passed.

```bash
PATH=/home/tutruong/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin:$PATH corepack pnpm --filter api typecheck
```

Result: PASS.

```bash
PATH=/home/tutruong/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin:$PATH corepack pnpm --filter api lint
```

Result: PASS.

Setup note:

```bash
PATH=/home/tutruong/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin:$PATH corepack pnpm install --frozen-lockfile --ignore-scripts
PATH=/home/tutruong/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin:$PATH DATABASE_URL=postgresql://user:pass@localhost:5432/leopard corepack pnpm --filter api exec prisma generate --schema prisma/schema.prisma
```

The install was needed because dependencies were absent in the worktree. `prisma generate` was needed after scriptless install so tests could import `PrismaService`; it used a dummy `DATABASE_URL` only to load Prisma config.

## Concerns / Blockers

- No blocker.
- Existing `jest-e2e.config.cjs` inherits `testPathIgnorePatterns` from the base config, so direct `test:e2e --runTestsByPath ...` does not discover E2E files unless the ignore pattern is overridden.
- This task intentionally does not implement refresh rotation or logout; PH-05-T03 owns that behavior.

## Fix Round 1

Reviewer finding: `AuthModule` wired `OTP_PROVIDER` to a bare `FirebaseOtpProvider`, so the real app-wired Firebase route always used the unavailable default verifier while the E2E success path bypassed the module wiring.

Fix:

- Added an app-wired local/test Firebase verifier factory in `apps/api/src/auth/auth.module.ts`.
- The factory reads `AUTH_FIREBASE_TEST_TOKENS` only in `development`, `local` or `test`, then passes the configured verifier into `FirebaseOtpProvider`.
- Invalid configured tokens still return provider rejection without echoing the raw token.
- Production does not receive a fake verifier; real Firebase Admin wiring would require a dependency/config decision outside this fix if staging/provider-real verification is required.
- Added an E2E case that starts `AuthModule` without overriding `OTP_PROVIDER` and verifies `POST /api/v1/auth/firebase` succeeds through the real module provider wiring.

RED command:

```bash
PATH=/home/tutruong/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin:$PATH corepack pnpm --filter api exec jest --config jest-e2e.config.cjs --runTestsByPath src/auth/login.e2e-spec.ts --testPathIgnorePatterns 'database-schema\\.spec\\.ts' --runInBand
```

RED result: failed as expected, 1 failed / 4 passed. The app-wired Firebase login expected `201` but received `503 Service Unavailable`.

GREEN / verification commands:

```bash
PATH=/home/tutruong/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin:$PATH corepack pnpm --filter api exec jest --config jest-e2e.config.cjs --runTestsByPath src/auth/login.e2e-spec.ts --testPathIgnorePatterns 'database-schema\\.spec\\.ts' --runInBand
```

Result: PASS, 5 tests passed.

```bash
PATH=/home/tutruong/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin:$PATH corepack pnpm --filter api test:contract
```

Result: PASS, 34 tests passed.

```bash
PATH=/home/tutruong/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin:$PATH corepack pnpm --filter api typecheck
```

Result: PASS.

```bash
PATH=/home/tutruong/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin:$PATH corepack pnpm --filter api lint
```

Result: PASS.
