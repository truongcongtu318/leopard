# PH-04-T04 Report: Web API and Session Boundary

- **Task ID**: PH-04-T04
- **Date**: 2026-07-23
- **State**: IN_REVIEW
- **Agent**: B (Client Foundations)

## Summary

Implemented the API client layer, session management, and role policy enforcement for the LEOPARD admin web app (`apps/admin`).

## Files Created

| File | Purpose |
|------|---------|
| `apps/admin/src/lib/api/api-error.ts` | Structured API error class with `fromResponse` factory and `isApiError` type guard |
| `apps/admin/src/lib/api/server-client.ts` | Next.js server-side API client (RSC/route handlers), reads base URL from `API_URL` env var |
| `apps/admin/src/lib/api/browser-client.ts` | Browser fetch-based client using same-origin BFF pattern (`/api/v1`), handles 401/403/network errors |
| `apps/admin/src/lib/auth/session.ts` | In-memory session singleton with `getSession`, `setSession`, `clearSession`, `isAuthenticated` |
| `apps/admin/src/lib/auth/role-policy.ts` | Role hierarchy enforcement: ADMIN > FLEET_OWNER > DRIVER > CUSTOMER, with `canAccess` and `requireRole` |
| `apps/admin/src/lib/api/client.test.ts` | 29 tests covering ApiError factory, server client (GET/POST/PUT/DELETE, error handling, base URL), browser client (methods, 401 session clear + redirect, 403 FORBIDDEN, network errors) |
| `apps/admin/src/lib/auth/role-policy.test.ts` | 16 tests covering all role combinations, hierarchy verification, `requireRole` throws |

## RED Evidence

```
FAIL src/lib/api/client.test.ts
  Cannot find module './api-error' from 'src/lib/api/client.test.ts'

FAIL src/lib/auth/role-policy.test.ts
  Cannot find module '../api/api-error' from 'src/lib/auth/role-policy.test.ts'
```

## GREEN Evidence

```
$ pnpm --filter web --fail-if-no-match test -- client
Tests: 29 passed, 29 total

$ pnpm --filter web --fail-if-no-match test -- role-policy
Tests: 16 passed, 16 total

$ pnpm --filter web --fail-if-no-match typecheck
(exit 0, no errors)

$ pnpm --filter web --fail-if-no-match build
(exit 0)
```

## Design Notes

- **Role type** is defined locally in both `session.ts` and `role-policy.ts` (mirror of `@leopard/shared`'s `Role`) because the admin package does not list `@leopard/shared` as a dependency.
- **Server client** reads `API_URL` per-request (via `getBaseUrl()`) rather than at module load time, enabling runtime env var changes in tests.
- **Role hierarchy** uses numeric levels: ADMIN=3, FLEET_OWNER=2, DRIVER=1, CUSTOMER=0. `canAccess` checks if the user's level meets or exceeds the highest required level.
- **Browser client 401 handling**: clears session and sets `window.location.href` to `/login` -- this is the standard browser redirect pattern for same-origin BFF.
- No new dependencies were added -- all code uses built-in `fetch` (Node 22+ for server, DOM for browser).
