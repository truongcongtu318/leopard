import { describe, expect, it, jest } from '@jest/globals';
import { EventEmitter } from 'node:events';

import { DomainError } from './domain-error.js';
import { createJsonBodyLimitMiddleware } from './json-body-limit.middleware.js';

/** Minimal fake `IncomingMessage`: an EventEmitter with `headers`/`destroy`. */
function createFakeRequest(headers: Record<string, string | undefined>) {
  const req = new EventEmitter() as EventEmitter & {
    headers: Record<string, string | undefined>;
    destroy: () => void;
    body?: unknown;
  };
  req.headers = headers;
  req.destroy = jest.fn();
  return req;
}

function emitBody(req: EventEmitter, chunks: (string | Buffer)[]): void {
  for (const chunk of chunks) {
    req.emit('data', Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  req.emit('end');
}

describe('createJsonBodyLimitMiddleware', () => {
  it('skips parsing entirely for a non-JSON content type (e.g. multipart uploads)', () => {
    const middleware = createJsonBodyLimitMiddleware({ limitBytes: 100 });
    const req = createFakeRequest({ 'content-type': 'multipart/form-data; boundary=x' });
    const next = jest.fn();

    middleware(req as never, {} as never, next);

    expect(next).toHaveBeenCalledWith();
    expect(req.body).toBeUndefined();
  });

  it('skips parsing when there is no content-type header at all', () => {
    const middleware = createJsonBodyLimitMiddleware({ limitBytes: 100 });
    const req = createFakeRequest({});
    const next = jest.fn();

    middleware(req as never, {} as never, next);

    expect(next).toHaveBeenCalledWith();
  });

  it('parses a valid JSON body within the limit and assigns req.body', () => {
    const middleware = createJsonBodyLimitMiddleware({ limitBytes: 1024 });
    const req = createFakeRequest({ 'content-type': 'application/json' });
    const next = jest.fn();

    middleware(req as never, {} as never, next);
    emitBody(req, [JSON.stringify({ hello: 'world' })]);

    expect(req.body).toEqual({ hello: 'world' });
    expect(next).toHaveBeenCalledWith();
  });

  it('accepts a JSON content type with a charset parameter', () => {
    const middleware = createJsonBodyLimitMiddleware({ limitBytes: 1024 });
    const req = createFakeRequest({ 'content-type': 'application/json; charset=utf-8' });
    const next = jest.fn();

    middleware(req as never, {} as never, next);
    emitBody(req, [JSON.stringify({ ok: true })]);

    expect(req.body).toEqual({ ok: true });
    expect(next).toHaveBeenCalledWith();
  });

  it('defaults to an empty object for an empty JSON body', () => {
    const middleware = createJsonBodyLimitMiddleware({ limitBytes: 1024 });
    const req = createFakeRequest({ 'content-type': 'application/json' });
    const next = jest.fn();

    middleware(req as never, {} as never, next);
    emitBody(req, []);

    expect(req.body).toEqual({});
    expect(next).toHaveBeenCalledWith();
  });

  it('rejects up-front via Content-Length when it already exceeds the limit', () => {
    const middleware = createJsonBodyLimitMiddleware({ limitBytes: 10 });
    const req = createFakeRequest({ 'content-type': 'application/json', 'content-length': '999' });
    const next = jest.fn();

    middleware(req as never, {} as never, next);

    expect(next).toHaveBeenCalledTimes(1);
    const error = next.mock.calls[0]?.[0] as DomainError;
    expect(error).toBeInstanceOf(DomainError);
    expect(error.code).toBe('REQUEST_BODY_TOO_LARGE');
    expect(error.status).toBe(413);
  });

  it('rejects mid-stream when a client omits/lies about Content-Length', () => {
    const middleware = createJsonBodyLimitMiddleware({ limitBytes: 5 });
    const req = createFakeRequest({ 'content-type': 'application/json' });
    const next = jest.fn();

    middleware(req as never, {} as never, next);
    req.emit('data', Buffer.from('{"a":'));
    req.emit('data', Buffer.from('"' + 'x'.repeat(50) + '"}'));

    // The underlying request/socket must not be torn down (destroying it
    // would reset the connection before the 413 response can be sent) —
    // the excess is discarded in the background instead.
    expect(req.destroy).not.toHaveBeenCalled();
    expect(next).toHaveBeenCalledTimes(1);
    const error = next.mock.calls[0]?.[0] as DomainError;
    expect(error).toBeInstanceOf(DomainError);
    expect(error.code).toBe('REQUEST_BODY_TOO_LARGE');
    expect(error.status).toBe(413);
  });

  it('rejects malformed JSON with a 422 VALIDATION_ERROR', () => {
    const middleware = createJsonBodyLimitMiddleware({ limitBytes: 1024 });
    const req = createFakeRequest({ 'content-type': 'application/json' });
    const next = jest.fn();

    middleware(req as never, {} as never, next);
    emitBody(req, ['{not valid json']);

    expect(next).toHaveBeenCalledTimes(1);
    const error = next.mock.calls[0]?.[0] as DomainError;
    expect(error).toBeInstanceOf(DomainError);
    expect(error.code).toBe('VALIDATION_ERROR');
    expect(error.status).toBe(422);
  });

  it('accepts a payload right up to the configured limit for the larger driver/apply-style cap', () => {
    const limitBytes = 1024;
    const middleware = createJsonBodyLimitMiddleware({ limitBytes });
    const req = createFakeRequest({ 'content-type': 'application/json' });
    const next = jest.fn();

    const padding = 'a'.repeat(limitBytes - 20);
    const body = JSON.stringify({ signature: padding });

    middleware(req as never, {} as never, next);
    emitBody(req, [body]);

    expect(next).toHaveBeenCalledWith();
    expect(req.body).toEqual({ signature: padding });
  });
});
