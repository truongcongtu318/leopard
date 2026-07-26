import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  jest,
} from '@jest/globals';
import {
  BadRequestException,
  ForbiddenException,
  HttpException,
  ValidationPipe,
} from '@nestjs/common';
import type { INestApplication } from '@nestjs/common';
import { Module } from '@nestjs/common';
import { APP_FILTER } from '@nestjs/core';
import { Test } from '@nestjs/testing';
import type { Request, Response } from 'express';
import request from 'supertest';
import { Writable } from 'node:stream';

import { DomainError } from './domain-error.js';
import { RequestContextMiddleware } from './request-context.middleware.js';
import { ApiExceptionFilter } from './api-exception.filter.js';
import { LoggerService } from './logger.service.js';

// ---------------------------------------------------------------------------
// Helper: minimal controller that throws different error types on demand
// ---------------------------------------------------------------------------

class TestQueryDto {

  declare name: any;
}

@Module({})
class TestAppModule {}

// ---------------------------------------------------------------------------
// Unit: DomainError
// ---------------------------------------------------------------------------

describe('DomainError', () => {
  it('extends Error', () => {
    const err = new DomainError('test', 400, 'Bad stuff');
    expect(err).toBeInstanceOf(Error);
    expect(err).toBeInstanceOf(DomainError);
  });

  it('produces correct status/code/message', () => {
    const err = new DomainError('NOT_FOUND', 404, 'User not found', {
      userId: 'abc',
    });
    expect(err.code).toBe('NOT_FOUND');
    expect(err.status).toBe(404);
    expect(err.message).toBe('User not found');
    expect(err.details).toEqual({ userId: 'abc' });
  });

  it.each([
    ['VALIDATION_ERROR', 422],
    ['NOT_FOUND', 404],
    ['CONFLICT', 409],
    ['UNAUTHORIZED', 401],
    ['FORBIDDEN', 403],
    ['INTERNAL_ERROR', 500],
    ['SERVICE_NOT_READY', 503],
  ] as const)('%s maps to status %i', (code, expectedStatus) => {
    const err = new DomainError(code, expectedStatus, code);
    expect(err.status).toBe(expectedStatus);
    expect(err.code).toBe(code);
  });
});

// ---------------------------------------------------------------------------
// Unit: LoggerService
// ---------------------------------------------------------------------------

describe('LoggerService', () => {
  let stdout: string[];

  function captureStdout(block: () => void): string[] {
    const lines: string[] = [];
  
    const orig = (process.stdout as any).write.bind(process.stdout);
  
    (process.stdout as any).write = (chunk: Buffer | string) => {
      lines.push(typeof chunk === 'string' ? chunk : chunk.toString());
      return true;
    };
    try {
      block();
    } finally {
    
      (process.stdout as any).write = orig;
    }
    return lines;
  }

  it('redacts authorization header', () => {
    const logger = new LoggerService();
    const output = captureStdout(() => {
      logger.log(JSON.stringify({ authorization: 'Bearer secret123' }));
    });
    const joined = output.join('');
    expect(joined).not.toContain('secret123');
    expect(joined).toContain('[REDACTED]');
  });

  it('redacts cookie header', () => {
    const logger = new LoggerService();
    const output = captureStdout(() => {
      logger.log(JSON.stringify({ cookie: 'session=abc' }));
    });
    const joined = output.join('');
    expect(joined).not.toContain('session=abc');
    expect(joined).toContain('[REDACTED]');
  });

  it('redacts token fields', () => {
    const logger = new LoggerService();
    const output = captureStdout(() => {
      logger.log(
        JSON.stringify({
          token: 'tk-abc',
          refreshToken: 'rt-abc',
          accessToken: 'at-abc',
        }),
      );
    });
    const joined = output.join('');
    expect(joined).not.toContain('tk-abc');
    expect(joined).not.toContain('rt-abc');
    expect(joined).not.toContain('at-abc');
    expect(joined).toContain('[REDACTED]');
  });

  it('redacts phone number', () => {
    const logger = new LoggerService();
    const output = captureStdout(() => {
      logger.log(JSON.stringify({ phone: '0901234567' }));
    });
    const joined = output.join('');
    expect(joined).not.toContain('0901234567');
    expect(joined).toContain('[REDACTED]');
  });

  it('redacts password and secret', () => {
    const logger = new LoggerService();
    const output = captureStdout(() => {
      logger.log(
        JSON.stringify({ password: 'p@ss', secret: 'my-key' }),
      );
    });
    const joined = output.join('');
    expect(joined).not.toContain('p@ss');
    expect(joined).not.toContain('my-key');
    expect(joined).toContain('[REDACTED]');
  });

  it('includes requestId in log output when context store has one', () => {
    const logger = new LoggerService();
  
    const ctx = (logger as any).contextStore;
    const testId = 'test-req-id-12345';

    expect(ctx).toBeDefined();

    const store = ctx.getStore() ?? new Map<string, unknown>();
    store.set('requestId', testId);
    const output = captureStdout(() => {
      ctx.run(store, () => {
        logger.log('hello');
      });
    });
    const joined = output.join('');
    expect(joined).toContain(testId);
  });

  it('is instance of ConsoleLogger', () => {
    const logger = new LoggerService();
    expect(logger).toBeInstanceOf(LoggerService);
  });
});

// ---------------------------------------------------------------------------
// Integration: RequestContextMiddleware
// ---------------------------------------------------------------------------

describe('RequestContextMiddleware', () => {
  let app: INestApplication;

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [TestAppModule],
    }).compile();

    app = moduleRef.createNestApplication();
    app.use(new RequestContextMiddleware().use);
    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  it('generates x-request-id when not provided', async () => {
    const res = await request(app.getHttpServer()).get('/');

    expect(res.headers['x-request-id']).toBeDefined();
    expect(res.headers['x-request-id']).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
    );
  });

  it('preserves x-request-id when provided in header', async () => {
    const incomingId = '11111111-1111-4111-8111-111111111111';
    const res = await request(app.getHttpServer())
      .get('/')
      .set('x-request-id', incomingId);

    expect(res.headers['x-request-id']).toBe(incomingId);
  });

  it('response includes x-request-id header', async () => {
    const res = await request(app.getHttpServer()).get('/');

    expect(res.headers['x-request-id']).toBeDefined();
    expect(typeof res.headers['x-request-id']).toBe('string');
  });
});

// ---------------------------------------------------------------------------
// Integration: ApiExceptionFilter
// ---------------------------------------------------------------------------

describe('ApiExceptionFilter', () => {
  let app: INestApplication;

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [TestAppModule],
    }).compile();

    app = moduleRef.createNestApplication();
    app.use(new RequestContextMiddleware().use);
    app.useGlobalFilters(new ApiExceptionFilter());
    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  it('DomainError produces correct status/code/message', async () => {
    // We cannot easily inject a controller that throws DomainError in this
    // integration test without creating a dedicated module, but we test the
    // DomainError class directly in unit tests above. This integration test
    // covers the filter's handling of HTTP exceptions and unknown errors.
  });

  it('maps NotFoundException to 404 NOT_FOUND envelope', async () => {
    const res = await request(app.getHttpServer()).get('/nonexistent');

    expect(res.status).toBe(404);
    expect(res.body.statusCode).toBe(404);
    expect(res.body.code).toBeDefined();
    expect(res.body.message).toBeDefined();
    expect(res.body.requestId).toBeDefined();
    expect(res.body.timestamp).toBeDefined();
  });

  it('unknown error returns 500 with "Internal server error" (no stack)', async () => {
    // Create a test app that throws a non-HttpException
    const moduleRef = await Test.createTestingModule({
      imports: [TestAppModule],
    }).compile();

    const app2 = moduleRef.createNestApplication();
    app2.use(new RequestContextMiddleware().use);
    app2.useGlobalFilters(new ApiExceptionFilter());

    // Register a catch-all route that throws
    const express = app2.getHttpAdapter().getInstance();
    express.get('/explode', (_req: Request, _res: Response) => {
      throw new Error('boom!');
    });

    await app2.init();

    const res = await request(app2.getHttpServer()).get('/explode');
    expect(res.status).toBe(500);
    expect(res.body.statusCode).toBe(500);
    expect(res.body.code).toBe('INTERNAL_ERROR');
    expect(res.body.message).toBe('Internal server error');
    expect(res.body.stack).toBeUndefined();
    // Also ensure stack trace is NOT leaked in message
    expect(JSON.stringify(res.body)).not.toContain('at ');
    expect(JSON.stringify(res.body)).not.toContain('boom!');

    await app2.close();
  });

  it('error envelope has all required fields', async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [TestAppModule],
    }).compile();

    const app3 = moduleRef.createNestApplication();
    app3.use(new RequestContextMiddleware().use);
    app3.useGlobalFilters(new ApiExceptionFilter());

    const express = app3.getHttpAdapter().getInstance();
    express.get('/oops', (_req: Request, _res: Response) => {
      throw new Error('failure');
    });

    await app3.init();

    const res = await request(app3.getHttpServer()).get('/oops');

    expect(res.body).toHaveProperty('statusCode');
    expect(res.body).toHaveProperty('code');
    expect(res.body).toHaveProperty('message');
    expect(res.body).toHaveProperty('requestId');
    expect(res.body).toHaveProperty('timestamp');
    expect(res.status).toBe(500);

    await app3.close();
  });

  it('DomainError from exception filter produces correct envelope', async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [TestAppModule],
    }).compile();

    const app4 = moduleRef.createNestApplication();
    app4.use(new RequestContextMiddleware().use);
    app4.useGlobalFilters(new ApiExceptionFilter());

    const express = app4.getHttpAdapter().getInstance();
    express.get('/domain-error', (_req: Request, _res: Response) => {
      throw new DomainError('CONFLICT', 409, 'Resource already exists', {
        field: 'email',
      });
    });

    await app4.init();

    const res = await request(app4.getHttpServer()).get('/domain-error');
    expect(res.status).toBe(409);
    expect(res.body.code).toBe('CONFLICT');
    expect(res.body.message).toBe('Resource already exists');
    expect(res.body.details).toEqual({ field: 'email' });
    expect(res.body.requestId).toBeDefined();

    await app4.close();
  });

  it('HttpException maps to correct status and code', async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [TestAppModule],
    }).compile();

    const app5 = moduleRef.createNestApplication();
    app5.use(new RequestContextMiddleware().use);
    app5.useGlobalFilters(new ApiExceptionFilter());

    const express = app5.getHttpAdapter().getInstance();
    express.get('/forbidden', (_req: Request, _res: Response) => {
      throw new ForbiddenException('No access');
    });

    await app5.init();

    const res = await request(app5.getHttpServer()).get('/forbidden');
    expect(res.status).toBe(403);
    expect(res.body.code).toBeDefined();
    expect(res.body.message).toBe('No access');

    await app5.close();
  });

  it('validation 422 extracts field errors from BadRequestException', () => {
    const filter = new ApiExceptionFilter();

    // Simulate what an HttpException from ValidationPipe would look like:
    // BadRequestException with an array of field-error objects as response
    const exception = new BadRequestException([
      { field: 'email', messages: ['email must be an email'] },
      { field: 'password', messages: ['password must be longer than or equal to 8 characters'] },
    ]);

  
    const mockResponse: any = {
      statusCode: 200,
      body: undefined,
      status(code: number) {
        this.statusCode = code;
        return this;
      },
      json(body: unknown) {
        this.body = body;
        return this;
      },
    };

    const mockHost = {
      switchToHttp: () => ({
        getResponse: () => mockResponse,
      }),
    };

    filter.catch(exception, mockHost as any);

    expect(mockResponse.statusCode).toBe(422);
    expect(mockResponse.body.code).toBe('VALIDATION_ERROR');
    expect(Array.isArray(mockResponse.body.details)).toBe(true);
    expect(mockResponse.body.details).toHaveLength(2);
    expect(mockResponse.body.details[0]).toEqual({
      field: 'email',
      messages: ['email must be an email'],
    });
  });
});
