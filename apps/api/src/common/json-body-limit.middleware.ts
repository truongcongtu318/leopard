import type { IncomingMessage, ServerResponse } from 'node:http';

import { DomainError } from './domain-error.js';

const JSON_MIME_TYPE = 'application/json';

export interface JsonBodyLimitOptions {
  readonly limitBytes: number;
}

export type JsonBodyLimitedRequest = IncomingMessage & { body?: unknown };

export type JsonBodyLimitMiddlewareFn = (
  req: JsonBodyLimitedRequest,
  res: ServerResponse,
  next: (error?: unknown) => void,
) => void;

/**
 * Minimal, dependency-free JSON body parser with a hard byte-size cap.
 *
 * `express`/`body-parser` are only transitive dependencies of
 * `@nestjs/platform-express` under this repo's pnpm layout — they are not
 * resolvable from application code (`require.resolve('express')` from
 * `apps/api` fails; pnpm's isolated `node_modules` does not hoist
 * undeclared transitive packages) without declaring one of them as a
 * direct dependency of `apps/api`, which would touch the shared
 * `pnpm-lock.yaml` alongside an unrelated in-flight change already sitting
 * uncommitted there. So a per-route body-size override reimplements only
 * the narrow subset of `express.json()`'s behaviour this app actually
 * relies on:
 *   - parses `application/json` bodies (any charset) into `req.body`;
 *   - leaves every other content type (multipart/form-data uploads
 *     handled by multer, urlencoded, etc.) completely untouched, so a
 *     downstream parser/interceptor can still read the original stream;
 *   - rejects with a `DomainError` (413) once `limitBytes` is exceeded —
 *     checked both via the declared `Content-Length` (fast path, before
 *     touching the stream) and while streaming (so a client that lies
 *     about or omits `Content-Length` can't bypass the cap);
 *   - rejects with a `DomainError` (422) on malformed JSON, matching the
 *     `VALIDATION_ERROR` shape the rest of the app already uses.
 *
 * Registered per-route via `NestModule`/`MiddlewareConsumer` (mirroring
 * `RequestContextMiddleware` in `AppModule`) rather than
 * `NestExpressApplication.useBodyParser()`, which has no route-scoping —
 * see `AppModule.configure()` and `DriversModule.configure()`.
 */
export function createJsonBodyLimitMiddleware(
  options: JsonBodyLimitOptions,
): JsonBodyLimitMiddlewareFn {
  const { limitBytes } = options;

  return function jsonBodyLimitMiddleware(req, res, next): void {
    const mimeType = req.headers['content-type']?.split(';')[0]?.trim().toLowerCase();
    if (mimeType !== JSON_MIME_TYPE) {
      next();
      return;
    }

    const declaredLength = Number(req.headers['content-length']);
    if (Number.isFinite(declaredLength) && declaredLength > limitBytes) {
      next(tooLargeError());
      return;
    }

    readJsonBody(req, limitBytes, next);
  };
}

function readJsonBody(
  req: JsonBodyLimitedRequest,
  limitBytes: number,
  next: (error?: unknown) => void,
): void {
  const chunks: Buffer[] = [];
  let receivedBytes = 0;
  let settled = false;

  const finish = (error?: unknown): void => {
    if (settled) return;
    settled = true;
    req.removeListener('data', onData);
    req.removeListener('end', onEnd);
    req.removeListener('error', onError);
    if (error !== undefined) {
      next(error);
    } else {
      next();
    }
  };

  const onData = (chunk: Buffer): void => {
    receivedBytes += chunk.length;
    if (receivedBytes > limitBytes) {
      // Do NOT destroy the request/socket here: on Express 5, destroying
      // the request tears down the underlying connection too, so the 413
      // response below would never reach the client (a bare connection
      // reset instead of an actual 413). `finish()` detaches this
      // listener; discard the remainder of the body in the background
      // afterwards (mirrors body-parser's own `dump()` helper) instead of
      // leaving it unconsumed, then report the error right away.
      chunks.length = 0;
      finish(tooLargeError());
      req.on('data', () => {
        // discard — the limit was already exceeded, nothing more to keep
      });
      return;
    }
    chunks.push(chunk);
  };

  const onEnd = (): void => {
    const raw = Buffer.concat(chunks).toString('utf8');
    if (raw.length === 0) {
      req.body = {};
      finish();
      return;
    }

    try {
      req.body = JSON.parse(raw);
      finish();
    } catch {
      finish(new DomainError('VALIDATION_ERROR', 422, 'Dữ liệu không hợp lệ'));
    }
  };

  const onError = (error: unknown): void => finish(error);

  req.on('data', onData);
  req.on('end', onEnd);
  req.on('error', onError);
}

function tooLargeError(): DomainError {
  return new DomainError(
    'REQUEST_BODY_TOO_LARGE',
    413,
    'Dữ liệu gửi lên vượt quá giới hạn cho phép',
  );
}
