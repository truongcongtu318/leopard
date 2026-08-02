/// <reference types="jest" />

import { createHmac } from 'node:crypto';

import { ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import type { INestApplication } from '@nestjs/common';
import request from 'supertest';

import { AppModule } from '../app.module.js';
import { ApiExceptionFilter } from '../common/api-exception.filter.js';
import { PrismaService } from '../database/prisma.service.js';

interface AuthSessionBody {
  readonly accessToken: string;
  readonly accessTokenExpiresAt: string;
  readonly refreshToken: string;
  readonly refreshTokenExpiresAt: string;
}

describe('Maps REST API', () => {
  const originalEnv = { ...process.env };

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  it('requires bearer authentication for map search', async () => {
    const app = await createApp();

    try {
      const response = await request(app.getHttpServer())
        .get('/maps/search')
        .query({ q: 'Ben Thanh' })
        .expect(401);

      expect(response.body).toMatchObject({
        statusCode: 401,
        code: 'UNAUTHORIZED',
      });
    } finally {
      await app.close();
    }
  });

  it('rejects search queries outside supported bounds', async () => {
    const app = await createApp();
    const session = await loginDemo(app);

    try {
      const response = await request(app.getHttpServer())
        .get('/maps/search')
        .set('Authorization', bearer(session))
        .query({ q: ' ' })
        .expect(400);

      expect(response.body).toMatchObject({
        statusCode: 400,
        code: 'BAD_REQUEST',
      });
    } finally {
      await app.close();
    }
  });

  it('returns demo map search candidates with provider source and demo label', async () => {
    const app = await createApp();
    const session = await loginDemo(app);

    try {
      const response = await request(app.getHttpServer())
        .get('/maps/search')
        .set('Authorization', bearer(session))
        .query({ q: 'Ben Thanh' })
        .expect(200);

      expect(response.body).toEqual({
        source: 'DEMO',
        results: [
          {
            placeId: 'demo:ben thanh',
            label: 'Ben Thanh (Demo data)',
            lat: expect.any(Number) as number,
            lng: expect.any(Number) as number,
          },
        ],
      });
    } finally {
      await app.close();
    }
  });

  it('returns geocoded coordinates with provider source', async () => {
    const app = await createApp();
    const session = await loginDemo(app);

    try {
      const response = await request(app.getHttpServer())
        .get(`/maps/geocode/${encodeURIComponent('demo:ben thanh')}`)
        .set('Authorization', bearer(session))
        .expect(200);

      expect(response.body).toEqual({
        placeId: 'demo:ben thanh',
        label: 'Ben Thanh (Demo data)',
        lat: expect.any(Number) as number,
        lng: expect.any(Number) as number,
        source: 'DEMO',
      });
    } finally {
      await app.close();
    }
  });

  it('issues a bounded route estimate token with route, price, ETA and source fields', async () => {
    const app = await createApp();
    const session = await loginDemo(app);
    const samePoint = { latitude: 10.762622, longitude: 106.660172 };

    try {
      const response = await request(app.getHttpServer())
        .post('/orders/estimate')
        .set('Authorization', bearer(session))
        .send({
          pickup: {
            type: 'PICKUP',
            address: 'Ben Thanh Market',
            lat: samePoint.latitude,
            lng: samePoint.longitude,
          },
          dropoff: {
            type: 'DROPOFF',
            address: 'Ben Thanh Market',
            lat: samePoint.latitude,
            lng: samePoint.longitude,
          },
          vehicleType: 'MOTORBIKE',
        })
        .expect(200);

      expect(response.body).toEqual({
        estimateToken: expect.any(String) as string,
        polyline: expect.any(String) as string,
        distanceM: 0,
        durationS: 0,
        estimatedArrivalAt: expect.any(String) as string,
        estimatedPriceVnd: 10_000,
        source: 'DEMO',
        isEstimate: true,
        calculatedAt: expect.any(String) as string,
      });
      expect(response.body.estimateToken).toContain('.');
    } finally {
      await app.close();
    }
  });

  it('rejects route estimates with more than three intermediate stops', async () => {
    const app = await createApp();
    const session = await loginDemo(app);
    const point = { latitude: 10.762622, longitude: 106.660172 };

    try {
      const response = await request(app.getHttpServer())
        .post('/orders/estimate')
        .set('Authorization', bearer(session))
        .send({
          pickup: {
            type: 'PICKUP',
            address: 'A',
            lat: point.latitude,
            lng: point.longitude,
          },
          stops: [
            { type: 'STOP', address: 'B', lat: point.latitude, lng: point.longitude },
            { type: 'STOP', address: 'C', lat: point.latitude, lng: point.longitude },
            { type: 'STOP', address: 'D', lat: point.latitude, lng: point.longitude },
            { type: 'STOP', address: 'E', lat: point.latitude, lng: point.longitude },
          ],
          dropoff: {
            type: 'DROPOFF',
            address: 'Z',
            lat: point.latitude,
            lng: point.longitude,
          },
          vehicleType: 'MOTORBIKE',
        })
        .expect(400);

      expect(response.body).toMatchObject({
        statusCode: 400,
        code: 'BAD_REQUEST',
      });
    } finally {
      await app.close();
    }
  });

  it('rejects route estimates when pickup is missing', async () => {
    const app = await createApp();
    const session = await loginDemo(app);
    const point = { latitude: 10.762622, longitude: 106.660172 };

    try {
      const response = await request(app.getHttpServer())
        .post('/orders/estimate')
        .set('Authorization', bearer(session))
        .send({
          dropoff: {
            type: 'DROPOFF',
            address: 'Ben Thanh Market',
            lat: point.latitude,
            lng: point.longitude,
          },
          vehicleType: 'MOTORBIKE',
        })
        .expect(400);

      expect(response.body).toMatchObject({
        statusCode: 400,
        code: 'BAD_REQUEST',
      });
    } finally {
      await app.close();
    }
  });

  it('rejects route estimates when a required nested stop coordinate is missing', async () => {
    const app = await createApp();
    const session = await loginDemo(app);
    const point = { latitude: 10.762622, longitude: 106.660172 };

    try {
      const response = await request(app.getHttpServer())
        .post('/orders/estimate')
        .set('Authorization', bearer(session))
        .send({
          pickup: {
            type: 'PICKUP',
            address: 'Ben Thanh Market',
            lat: point.latitude,
            lng: point.longitude,
          },
          dropoff: {
            type: 'DROPOFF',
            address: 'District 1',
            lat: point.latitude,
          },
          vehicleType: 'MOTORBIKE',
        })
        .expect(400);

      expect(response.body).toMatchObject({
        statusCode: 400,
        code: 'BAD_REQUEST',
      });
    } finally {
      await app.close();
    }
  });

  it('rejects an invalid signed access token', async () => {
    const app = await createApp();
    const session = await loginDemo(app);

    try {
      const response = await request(app.getHttpServer())
        .get('/maps/search')
        .set('Authorization', `Bearer ${tamperSignature(session.accessToken)}`)
        .query({ q: 'Ben Thanh' })
        .expect(401);

      expect(response.body).toMatchObject({
        statusCode: 401,
        code: 'UNAUTHORIZED',
      });
    } finally {
      await app.close();
    }
  });

  it('rejects an expired signed access token', async () => {
    const app = await createApp();
    const session = await loginDemo(app);

    try {
      const response = await request(app.getHttpServer())
        .get('/maps/search')
        .set('Authorization', `Bearer ${createExpiredAccessToken(session.accessToken)}`)
        .query({ q: 'Ben Thanh' })
        .expect(401);

      expect(response.body).toMatchObject({
        statusCode: 401,
        code: 'UNAUTHORIZED',
      });
    } finally {
      await app.close();
    }
  });

  it('rejects a valid access token after its refresh session is revoked', async () => {
    const app = await createApp();
    const session = await loginDemo(app);
    const prisma = app.get(PrismaService);
    const claims = decodeAccessToken(session.accessToken);

    try {
      await prisma.refreshSession.update({
        where: { id: claims.sessionId },
        data: { revokedAt: new Date() },
      });

      const response = await request(app.getHttpServer())
        .get('/maps/search')
        .set('Authorization', bearer(session))
        .query({ q: 'Ben Thanh' })
        .expect(401);

      expect(response.body).toMatchObject({
        statusCode: 401,
        code: 'UNAUTHORIZED',
      });
    } finally {
      await app.close();
    }
  });

  it('rate limits repeated order estimate requests for the same actor across sessions', async () => {
    const app = await createApp();
    const firstSession = await loginDemo(app);
    const secondSession = await loginDemo(app);
    const point = { latitude: 10.762622, longitude: 106.660172 };

    try {
      for (let attempt = 0; attempt < 5; attempt += 1) {
        await request(app.getHttpServer())
          .post('/orders/estimate')
          .set('Authorization', bearer(firstSession))
          .send({
            pickup: {
              type: 'PICKUP',
              address: 'A',
              lat: point.latitude,
              lng: point.longitude,
            },
            dropoff: {
              type: 'DROPOFF',
              address: 'B',
              lat: point.latitude,
              lng: point.longitude,
            },
            vehicleType: 'MOTORBIKE',
          })
          .expect(200);
      }

      for (let attempt = 0; attempt < 5; attempt += 1) {
        await request(app.getHttpServer())
          .post('/orders/estimate')
          .set('Authorization', bearer(secondSession))
          .send({
            pickup: {
              type: 'PICKUP',
              address: 'A',
              lat: point.latitude,
              lng: point.longitude,
            },
            dropoff: {
              type: 'DROPOFF',
              address: 'B',
              lat: point.latitude,
              lng: point.longitude,
            },
            vehicleType: 'MOTORBIKE',
          })
          .expect(200);
      }

      const response = await request(app.getHttpServer())
        .post('/orders/estimate')
        .set('Authorization', bearer(firstSession))
        .send({
          pickup: {
            type: 'PICKUP',
            address: 'A',
            lat: point.latitude,
            lng: point.longitude,
          },
          dropoff: {
            type: 'DROPOFF',
            address: 'B',
            lat: point.latitude,
            lng: point.longitude,
          },
          vehicleType: 'MOTORBIKE',
        })
        .expect(429);

      expect(response.body).toMatchObject({
        statusCode: 429,
        code: 'RATE_LIMITED',
        message: 'Rate limit exceeded',
      });
    } finally {
      await app.close();
    }
  });

  it('maps provider failures to the standard provider-unavailable error', async () => {
    const app = await createApp({
      ALLOW_DEMO_PROVIDER: 'false',
      MAP_PROVIDER: 'vietmap',
      VIETMAP_API_KEY: 'test-vietmap-key',
      VIETMAP_BASE_URL: 'http://127.0.0.1:9',
      VIETMAP_TIMEOUT_MS: '100',
    });
    const session = await loginDemo(app);

    try {
      const response = await request(app.getHttpServer())
        .get('/maps/search')
        .set('Authorization', bearer(session))
        .query({ q: 'Ben Thanh' })
        .expect(503);

      expect(response.body).toMatchObject({
        statusCode: 503,
        code: 'MAP_PROVIDER_UNAVAILABLE',
        message: 'Map provider unavailable',
      });
      expect(JSON.stringify(response.body)).not.toContain('test-vietmap-key');
    } finally {
      await app.close();
    }
  });
});

async function loginDemo(app: INestApplication): Promise<AuthSessionBody> {
  const response = await request(app.getHttpServer())
    .post('/auth/login/demo')
    .send({ accountId: 'customer' })
    .expect(201);

  return response.body.session as AuthSessionBody;
}

function bearer(session: AuthSessionBody): string {
  return `Bearer ${session.accessToken}`;
}

function decodeAccessToken(accessToken: string): { readonly sessionId: string } {
  const [, encodedPayload] = accessToken.split('.');
  if (!encodedPayload) {
    throw new Error('Expected an access-token payload');
  }

  const payload = JSON.parse(
    Buffer.from(encodedPayload, 'base64url').toString('utf8'),
  ) as { readonly sessionId?: unknown };
  if (typeof payload.sessionId !== 'string') {
    throw new Error('Expected access token to include sessionId');
  }

  return { sessionId: payload.sessionId };
}

function tamperSignature(accessToken: string): string {
  const lastCharacter = accessToken.at(-1);
  if (!lastCharacter) {
    throw new Error('Expected a signed access token');
  }

  return `${accessToken.slice(0, -1)}${lastCharacter === 'a' ? 'b' : 'a'}`;
}

function createExpiredAccessToken(accessToken: string): string {
  const [encodedHeader, encodedPayload] = accessToken.split('.');
  if (!encodedHeader || !encodedPayload) {
    throw new Error('Expected a JWT access token');
  }

  const payload = JSON.parse(
    Buffer.from(encodedPayload, 'base64url').toString('utf8'),
  ) as Record<string, unknown>;
  const expiredPayload = Buffer.from(
    JSON.stringify({
      ...payload,
      exp: Math.floor(Date.now() / 1_000) - 60,
    }),
  ).toString('base64url');
  const signingInput = `${encodedHeader}.${expiredPayload}`;
  const secret = process.env.AUTH_ACCESS_TOKEN_SECRET;
  if (!secret) {
    throw new Error('Expected the test access-token secret');
  }

  const signature = createHmac('sha256', secret)
    .update(signingInput)
    .digest('base64url');

  return `${signingInput}.${signature}`;
}

async function createApp(
  overrides: Record<string, string | undefined> = {},
): Promise<INestApplication> {
  process.env = {
    ...process.env,
    NODE_ENV: 'test',
    DATABASE_URL: 'postgresql://leopard:leopard_local@localhost:5432/leopard?schema=public',
    AUTH_DEMO_LOGIN_ENABLED: 'true',
    AUTH_ACCESS_TOKEN_SECRET: 'test-access-token-secret',
    AUTH_REFRESH_TOKEN_SECRET: 'test-refresh-token-secret',
    MAP_PROVIDER: 'demo',
    ALLOW_DEMO_PROVIDER: 'true',
    PRICING_MINIMUM_FARE_VND: '10000',
    PRICING_STOP_SURCHARGE_VND: '2500',
    PRICING_VEHICLE_RATES_JSON: JSON.stringify({
      MOTORBIKE: { baseFareVnd: 10_000, perKmVnd: 3_500 },
      VAN: { baseFareVnd: 20_000, perKmVnd: 8_000 },
      TRUCK: { baseFareVnd: 35_000, perKmVnd: 12_000 },
    }),
    ESTIMATE_TOKEN_HMAC_SECRET: 'test-estimate-token-secret-32-bytes',
    ...overrides,
  };

  const moduleFixture = await Test.createTestingModule({
    imports: [AppModule],
  }).compile();

  const app = moduleFixture.createNestApplication();
  app.useGlobalFilters(new ApiExceptionFilter());
  app.useGlobalPipes(
    new ValidationPipe({
      forbidNonWhitelisted: true,
      transform: true,
      whitelist: true,
    }),
  );
  await app.init();

  return app;
}
