# Wave 2 Review Fixes Implementation Plan

> **For agentic workers:** Use the existing project test workflow and keep each task scoped to its owned files.

**Goal:** Remove the remaining Wave 2 review blockers from the merged PR #14 implementation.

**Architecture:** Mobile and admin auth clients must honor the backend `AuthSession` contract (`accessToken`, `refreshToken`) and recover sessions without exposing refresh tokens in ordinary browser storage. Order mutations must validate and commit state/history/idempotency through the same PostgreSQL transaction. Real database concurrency coverage must require an explicit test database and must not destroy shared data.

**Tech Stack:** Expo/React Native, Next.js/React, NestJS, Prisma 7, PostgreSQL/PostGIS, Jest.

## Global Constraints

- Keep `develop` untouched; work only on `codex/wave2-followup` or isolated agent workspaces.
- Backend owns lifecycle, authorization, idempotency and transaction rules.
- Mobile access tokens stay in memory; refresh tokens stay in SecureStore.
- Admin must follow the existing httpOnly refresh-cookie/BFF boundary; do not put refresh tokens in localStorage or client-visible markup.
- Write regression tests before production changes and verify the expected RED failure.
- Do not change unrelated Wave 2 behavior or generated artifacts.

### Task 1: Mobile and Admin Auth Lifecycle

**Owner:** Agent A

**Files:** Mobile auth/session/API tests and implementation; admin auth/session/browser-client tests and implementation. Do not edit `apps/api/**`.

**Required behavior:**

- Mobile refresh posts `{ refreshToken }`, parses the top-level `AuthSession`, stores the rotated refresh token, and retries once.
- Mobile startup restores the refresh credential and role, obtains a fresh access token before protected layouts render, and rejects route groups whose role does not match the persisted authenticated role.
- Admin login retains a usable session across reload and access-token expiry using the repository's httpOnly refresh-cookie/BFF boundary; logout and 401 clear both session state and the in-memory bearer header.
- Tests cover the real field names, refresh-on-hydrate, role mismatch, reload/session expiry, and header clearing.

### Task 2: Backend Order Consistency and Database Test Safety

**Owner:** Agent B

**Files:** `apps/api/prisma/migrations/**`, order services/repositories/DTO tests, and `apps/api/test/real-db-race-condition.integration-spec.ts`. Do not edit `apps/mobile/**` or `apps/admin/**`.

**Required behavior:**

- Add a forward Prisma migration for `Order.clientRequestId` and `@@unique([customerId, clientRequestId])`.
- Make status updates optimistic/atomic: conditional update on the observed status, history in the same transaction, and idempotent `clientRequestId` handling.
- Return the mutated order using the transaction client, not the root Prisma client.
- Make real-DB concurrency tests fail fast with a clear dedicated-test-database requirement and clean only their own fixtures; keep default mocked/in-memory E2E suites runnable without `DATABASE_URL`.
- Remove trailing whitespace and add regression coverage for stale transition, duplicate request, and response consistency.

## Verification

- `pnpm --filter mobile test && pnpm --filter mobile typecheck && pnpm --filter mobile lint`
- `pnpm --filter web test && pnpm --filter web typecheck && pnpm --filter web lint`
- `pnpm --filter api test && pnpm --filter api test:e2e && pnpm --filter api typecheck && pnpm --filter api lint && pnpm --filter api build`
- `git diff --check`
- Run the real PostgreSQL race test only against an explicitly provisioned disposable test database.
