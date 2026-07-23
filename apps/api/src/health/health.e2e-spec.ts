/// <reference types="jest" />

import { Test } from '@nestjs/testing';
import type { INestApplication } from '@nestjs/common';
import request from 'supertest';

import { HealthModule } from './health.module.js';
import { PrismaService } from '../database/prisma.service.js';

/** Returns true when a DATABASE_URL environment variable is configured. */
function hasDatabaseUrl(): boolean {
  return typeof process.env.DATABASE_URL === 'string' && process.env.DATABASE_URL.length > 0;
}

// ── Liveness (no DB required) ────────────────────────────────────────────
describe('GET /health/live', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture = await Test.createTestingModule({
      imports: [HealthModule],
    })
      .overrideProvider(PrismaService)
      .useValue({})
      .compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('returns 200 with status "ok" and uptime', async () => {
    const response = await request(app.getHttpServer())
      .get('/health/live')
      .expect(200);

    expect(response.body).toEqual({
      status: 'ok',
      uptime: expect.any(Number) as number,
    });
  });

  it('does not contact the database', async () => {
    // The PrismaService is replaced with an empty object; any call
    // to it would throw.  A successful 200 confirms no DB access.
    const response = await request(app.getHttpServer())
      .get('/health/live')
      .expect(200);

    expect(response.body.status).toBe('ok');
  });
});

// ── Readiness (requires DB) ──────────────────────────────────────────────

/** Test mode for the readiness happy-path: only runs when a real DB URL is configured. */
const readinessDescribe = hasDatabaseUrl() ? describe : describe.skip;

readinessDescribe('GET /health/ready (database available)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture = await Test.createTestingModule({
      imports: [HealthModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('returns 200 with status "ready" and database "connected"', async () => {
    const response = await request(app.getHttpServer())
      .get('/health/ready')
      .expect(200);

    expect(response.body).toEqual({
      status: 'ready',
      database: 'connected',
    });
  });
});

describe('GET /health/ready (database unavailable)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const mockPrisma = {
      $queryRawUnsafe: () => {
        throw new Error('connection refused');
      },
    };

    const moduleFixture = await Test.createTestingModule({
      imports: [HealthModule],
    })
      .overrideProvider(PrismaService)
      .useValue(mockPrisma)
      .compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('returns 503 with SERVICE_NOT_READY and the correct envelope', async () => {
    const response = await request(app.getHttpServer())
      .get('/health/ready')
      .expect(503);

    expect(response.body).toMatchObject({
      status: 'not_ready',
      code: 'SERVICE_NOT_READY',
      message: 'Database not available',
    });
  });
});
