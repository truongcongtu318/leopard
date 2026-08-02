/// <reference types="jest" />

import { ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import type { INestApplication } from '@nestjs/common';
import request from 'supertest';

import { AppModule } from '../app.module.js';
import { ApiExceptionFilter } from '../common/api-exception.filter.js';

const AUTHORIZATION = 'Bearer test-customer-token';

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

    try {
      const response = await request(app.getHttpServer())
        .get('/maps/search')
        .set('Authorization', AUTHORIZATION)
        .query({ q: 'a' })
        .expect(422);

      expect(response.body).toMatchObject({
        statusCode: 422,
        code: 'VALIDATION_ERROR',
      });
    } finally {
      await app.close();
    }
  });

  it('returns demo map search candidates with provider source and demo label', async () => {
    const app = await createApp();

    try {
      const response = await request(app.getHttpServer())
        .get('/maps/search')
        .set('Authorization', AUTHORIZATION)
        .query({ q: 'Ben Thanh' })
        .expect(200);

      expect(response.body).toEqual([
        {
          placeId: 'demo:ben thanh',
          label: 'Ben Thanh (Demo data)',
          source: 'DEMO',
        },
      ]);
    } finally {
      await app.close();
    }
  });

  it('returns geocoded coordinates with provider source', async () => {
    const app = await createApp();

    try {
      const response = await request(app.getHttpServer())
        .get(`/maps/geocode/${encodeURIComponent('demo:ben thanh')}`)
        .set('Authorization', AUTHORIZATION)
        .expect(200);

      expect(response.body).toEqual({
        placeId: 'demo:ben thanh',
        point: {
          latitude: expect.any(Number) as number,
          longitude: expect.any(Number) as number,
        },
        source: 'DEMO',
      });
    } finally {
      await app.close();
    }
  });

  it('issues a bounded route estimate token with route, price, ETA and source fields', async () => {
    const app = await createApp();
    const samePoint = { latitude: 10.762622, longitude: 106.660172 };

    try {
      const response = await request(app.getHttpServer())
        .post('/orders/estimate')
        .set('Authorization', AUTHORIZATION)
        .send({
          pickup: samePoint,
          stops: [],
          dropoff: samePoint,
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
    const point = { latitude: 10.762622, longitude: 106.660172 };

    try {
      const response = await request(app.getHttpServer())
        .post('/orders/estimate')
        .set('Authorization', AUTHORIZATION)
        .send({
          pickup: point,
          stops: [point, point, point, point],
          dropoff: point,
          vehicleType: 'MOTORBIKE',
        })
        .expect(422);

      expect(response.body).toMatchObject({
        statusCode: 422,
        code: 'VALIDATION_ERROR',
      });
    } finally {
      await app.close();
    }
  });

  it('rejects route estimates when required route fields are missing', async () => {
    const app = await createApp();
    const point = { latitude: 10.762622, longitude: 106.660172 };

    try {
      const response = await request(app.getHttpServer())
        .post('/orders/estimate')
        .set('Authorization', AUTHORIZATION)
        .send({
          pickup: point,
          dropoff: point,
          vehicleType: 'MOTORBIKE',
        })
        .expect(422);

      expect(response.body).toMatchObject({
        statusCode: 422,
        code: 'VALIDATION_ERROR',
      });
    } finally {
      await app.close();
    }
  });

  it('rate limits repeated order estimate requests for the same caller', async () => {
    const app = await createApp();
    const point = { latitude: 10.762622, longitude: 106.660172 };

    try {
      for (let attempt = 0; attempt < 10; attempt += 1) {
        await request(app.getHttpServer())
          .post('/orders/estimate')
          .set('Authorization', AUTHORIZATION)
          .send({
            pickup: point,
            stops: [],
            dropoff: point,
            vehicleType: 'MOTORBIKE',
          })
          .expect(200);
      }

      const response = await request(app.getHttpServer())
        .post('/orders/estimate')
        .set('Authorization', AUTHORIZATION)
        .send({
          pickup: point,
          stops: [],
          dropoff: point,
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

    try {
      const response = await request(app.getHttpServer())
        .get('/maps/search')
        .set('Authorization', AUTHORIZATION)
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

async function createApp(
  overrides: Record<string, string | undefined> = {},
): Promise<INestApplication> {
  process.env = {
    ...process.env,
    NODE_ENV: 'test',
    DATABASE_URL: 'postgresql://leopard:leopard_local@localhost:5432/leopard?schema=public',
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
