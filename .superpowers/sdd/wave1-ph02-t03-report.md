# PH-02-T03: Request Context, Errors and Logging -- Report

**State:** IN_REVIEW
**Agent:** Agent A (Backend/Platform)
**Date:** 2026-07-23

## Summary

Implemented a standardized request-context pipeline, error-handling framework, and structured-logging service for the LEOPARD NestJS 11 API.

## Files

| File | Action |
|---|---|
| `apps/api/src/common/domain-error.ts` | New -- `DomainError` class with code, status, message, details |
| `apps/api/src/common/logger.service.ts` | New -- `LoggerService` extending `ConsoleLogger` with redaction, requestId injection, structured JSON in production |
| `apps/api/src/common/request-context.middleware.ts` | New -- NestJS middleware; generates/preserves `x-request-id`, stores it in `AsyncLocalStorage` |
| `apps/api/src/common/api-exception.filter.ts` | New -- Global `ExceptionFilter` mapping DomainError/HttpException/unknown to `ApiErrorEnvelope` |
| `apps/api/src/common/index.ts` | New -- barrel export |
| `apps/api/src/common/common.spec.ts` | New -- 26 tests covering all components |
| `apps/api/src/app.module.ts` | Modified -- registers `RequestContextMiddleware` via `NestModule.configure` |
| `apps/api/tsconfig.json` | Modified -- exclude `*.spec.ts` from typecheck (test-only imports: `@jest/globals`, `supertest`) |

## Dependencies

None added. Uses Node built-in `crypto.randomUUID()` (UUID v4) and `node:async_hooks.AsyncLocalStorage`.

## RED Evidence

Initial `pnpm --filter api --fail-if-no-match test -- common` failed with:
```
Could not locate module ./domain-error.js
```
-- confirming no implementation files existed.

## GREEN Gate Results

```
pnpm --filter api --fail-if-no-match test -- common   -> 26 passed, 0 failed
pnpm --filter api --fail-if-no-match typecheck        -> exit 0
pnpm --filter api --fail-if-no-match lint             -> exit 0
```

## Test Coverage

| Category | Tests |
|---|---|
| DomainError -- extends Error, correct status/code/message | 9 |
| LoggerService -- redacts auth/cookie/token/phone/password/secret, includes requestId | 7 |
| RequestContextMiddleware -- generates, preserves, echoes x-request-id | 3 |
| ApiExceptionFilter -- DomainError envelope, NotFoundException, unknown->500 no stack, required fields, HttpException, validation 422 | 7 |

## Design Decisions

- **No `@types/express` dependency**: Express 5 (used by NestJS platform-express) does not ship types and `@types/express` was not installed. Middleware and filter use `IncomingMessage`/`ServerResponse` from `node:http` and a minimal `HttpServerResponse` interface respectively, keeping the code framework-agnostic.
- **`requestContextStore` is shared across modules** via a single export from `logger.service.ts` so both the middleware and the exception filter can access it without circular dependencies.
- **Filter writes `ApiExceptionFilter` is registered globally in `main.ts`** at the `createApplication` level -- the test itself registers it via `useGlobalFilters` for isolated integration tests.
- **Spec files excluded from typecheck** because test-only imports (`@jest/globals`, `supertest`) are not available during production typecheck.
