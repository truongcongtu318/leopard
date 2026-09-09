/// <reference types="jest" />

import { ValidationPipe } from '@nestjs/common';
import type { INestApplication } from '@nestjs/common';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { Test } from '@nestjs/testing';
import request from 'supertest';

import { AppModule } from '../../src/app.module.js';
import { ApiExceptionFilter } from '../../src/common/api-exception.filter.js';
import { PrismaService } from '../../src/database/prisma.service.js';
import { InMemoryPrismaService } from '../prisma-mock.js';

/**
 * Verifies the fix for the "global 15mb body-size limit" review finding:
 * every route keeps a small, Express-default-sized JSON body cap EXCEPT
 * `POST /driver/apply`, which is scoped a larger one for its base64
 * signature image (see `AppModule.configure()` / `DriversModule.configure()`
 * and `common/json-body-limit.middleware.ts`).
 *
 * Boots the app the same way `main.ts#createApplication` does
 * (`bodyParser: false`, relying entirely on the per-route middleware) so
 * this actually exercises the wiring under test rather than Nest's own
 * automatic default parser.
 */
describe('Security: per-route JSON body-size limit (E2E)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    process.env = {
      ...process.env,
      NODE_ENV: 'test',
      AUTH_DEMO_LOGIN_ENABLED: 'true',
      AUTH_ACCESS_TOKEN_SECRET: 'test-access-token-secret-32-chars-long',
      AUTH_REFRESH_TOKEN_SECRET: 'test-refresh-token-secret-32-chars-long',
      STORAGE_PROVIDER: 'local',
      ALLOW_LOCAL_STORAGE_PROVIDER: 'true',
    };

    const moduleFixture = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(PrismaService)
      .useValue(new InMemoryPrismaService())
      .compile();

    app = moduleFixture.createNestApplication<NestExpressApplication>({
      // Matches main.ts's createApplication(): Nest's own automatic default
      // body parser is disabled so only the per-route middleware from
      // AppModule/DriversModule.configure() ever touches the body.
      bodyParser: false,
    });
    app.useGlobalFilters(new ApiExceptionFilter());
    app.useGlobalPipes(
      new ValidationPipe({ forbidNonWhitelisted: true, transform: true, whitelist: true }),
    );
    app.setGlobalPrefix('api/v1');
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('rejects a >100KB JSON body on an ordinary route with 413 REQUEST_BODY_TOO_LARGE', async () => {
    const oversizedPayload = { accountId: 'x'.repeat(150 * 1024) };

    const res = await request(app.getHttpServer())
      .post('/api/v1/auth/login/demo')
      .send(oversizedPayload);

    expect(res.status).toBe(413);
    expect(res.body.code).toBe('REQUEST_BODY_TOO_LARGE');
  });

  it('accepts a small JSON body on an ordinary route (proves the small cap is not overly strict)', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/auth/login/demo')
      .send({ accountId: 'demo-customer' });

    // Whatever the demo-login business outcome is, it must not be rejected
    // for body size — a 413 here would mean the default cap is broken.
    expect(res.status).not.toBe(413);
  });

  it('accepts a >100KB JSON body on POST /driver/apply past the body-parser stage', async () => {
    // 500KB — well past the app-wide 100KB default, well under the 15MB cap
    // scoped to this route. No Authorization header is sent: the request
    // must fail authentication (401), never body size (413) — proving the
    // body was fully parsed before the guard ever ran.
    const largePayload = {
      name: 'Nguyễn Văn A',
      vehicleType: 'MOTORBIKE',
      licensePlate: '59D-123.45',
      licenseNumber: 'GPLX-0001',
      contractAccepted: true,
      signature: 'a'.repeat(500 * 1024),
    };

    const res = await request(app.getHttpServer())
      .post('/api/v1/driver/apply')
      .send(largePayload);

    expect(res.status).not.toBe(413);
    expect(res.status).toBe(401);
  });

  it('still rejects a payload over the larger 15MB cap on POST /driver/apply', async () => {
    const tooLargePayload = {
      name: 'Nguyễn Văn A',
      signature: 'a'.repeat(15 * 1024 * 1024 + 1024),
    };

    const res = await request(app.getHttpServer())
      .post('/api/v1/driver/apply')
      .send(tooLargePayload);

    expect(res.status).toBe(413);
    expect(res.body.code).toBe('REQUEST_BODY_TOO_LARGE');
  }, 20000);
});
