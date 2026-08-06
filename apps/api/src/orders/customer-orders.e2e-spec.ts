/// <reference types="jest" />

import { ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import type { INestApplication } from '@nestjs/common';
import request from 'supertest';

import { AppModule } from '../app.module.js';
import { ApiExceptionFilter } from '../common/api-exception.filter.js';
import { PrismaService } from '../database/prisma.service.js';
import { EstimateTokenService } from '../maps/domain/estimate-token.service.js';
import { TokenService } from '../auth/token.service.js';
import { RefreshSessionRepository } from '../auth/refresh-session.repository.js';
import { InMemoryPrismaService } from '../../test/prisma-mock.js';

interface AuthSessionBody {
  readonly accessToken: string;
}

describe('Customer Orders REST API (E2E)', () => {
  let app: INestApplication;
  let estimateTokenService: EstimateTokenService;
  let customerSession: AuthSessionBody;
  let otherCustomerSession: AuthSessionBody;
  let prismaMock: InMemoryPrismaService;

  beforeAll(async () => {
    process.env = {
      ...process.env,
      NODE_ENV: 'test',
      AUTH_DEMO_LOGIN_ENABLED: 'true',
      AUTH_ACCESS_TOKEN_SECRET: 'test-access-token-secret',
      AUTH_REFRESH_TOKEN_SECRET: 'test-refresh-token-secret',
      ESTIMATE_TOKEN_HMAC_SECRET: 'test-estimate-token-secret-32-bytes',
    };

    prismaMock = new InMemoryPrismaService();

    const moduleFixture = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(PrismaService)
      .useValue(prismaMock)
      .compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalFilters(new ApiExceptionFilter());
    app.useGlobalPipes(
      new ValidationPipe({
        forbidNonWhitelisted: true,
        transform: true,
        whitelist: true,
      }),
    );
    await app.init();

    estimateTokenService = app.get(EstimateTokenService);
    const tokenService = app.get(TokenService);
    const refreshSessions = app.get(RefreshSessionRepository);

    // Login customer 1 via demo login
    const res1 = await request(app.getHttpServer())
      .post('/auth/login/demo')
      .send({ accountId: 'customer' })
      .expect(201);
    customerSession = res1.body.session;

    // Create customer 2 manually in mock database
    const user2 = await prismaMock.user.create({
      data: { phone: '+84999999999', role: 'CUSTOMER', status: 'ACTIVE' },
    });
    const sessionRecord2 = await refreshSessions.create(user2.id);
    otherCustomerSession = tokenService.createAuthSession(user2, sessionRecord2);
  });

  afterAll(async () => {
    if (app) {
      await app.close();
    }
  });

  it('creates an order with valid estimate token and 0-3 stops', async () => {
    const pickup = { latitude: 10.762622, longitude: 106.660172 };
    const dropoff = { latitude: 10.772622, longitude: 106.670172 };

    const token = estimateTokenService.issue({
      routeInput: {
        pickup,
        stops: [],
        dropoff,
        vehicleType: 'MOTORBIKE',
      },
      estimate: {
        polyline: 'encoded_polyline',
        distanceM: 2500,
        durationS: 600,
        estimatedArrivalAt: new Date(Date.now() + 600_000).toISOString(),
        estimatedPriceVnd: 15_000,
        source: 'DEMO',
        calculatedAt: new Date().toISOString(),
        isEstimate: true,
      },
      quote: {
        amountVnd: 15_000,
        currency: 'VND',
      },
    });

    const createRes = await request(app.getHttpServer())
      .post('/orders')
      .set('Authorization', `Bearer ${customerSession.accessToken}`)
      .send({
        pickup: { address: 'Ben Thanh Market', lat: pickup.latitude, lng: pickup.longitude },
        dropoff: { address: 'Saigon Opera House', lat: dropoff.latitude, lng: dropoff.longitude },
        vehicleType: 'MOTORBIKE',
        cargoNote: 'Fragile package',
        cargoWeightKg: 5,
        estimateToken: token,
      })
      .expect(201);

    expect(createRes.body).toMatchObject({
      id: expect.any(String),
      status: 'REQUESTED',
      distanceMeters: 2500,
      durationSeconds: 600,
      priceVnd: 15_000,
      routeSnapshot: expect.objectContaining({ polyline: 'encoded_polyline' }),
      stops: expect.arrayContaining([
        expect.objectContaining({ type: 'PICKUP', address: 'Ben Thanh Market', sequence: 0 }),
        expect.objectContaining({ type: 'DROPOFF', address: 'Saigon Opera House', sequence: 1 }),
      ]),
    });

    const orderId = createRes.body.id;

    // Retrieve order by ID
    const getRes = await request(app.getHttpServer())
      .get(`/orders/${orderId}`)
      .set('Authorization', `Bearer ${customerSession.accessToken}`)
      .expect(200);

    expect(getRes.body.id).toBe(orderId);

    // List customer orders
    const listRes = await request(app.getHttpServer())
      .get('/orders')
      .set('Authorization', `Bearer ${customerSession.accessToken}`)
      .expect(200);

    expect(listRes.body.items).toEqual(
      expect.arrayContaining([expect.objectContaining({ id: orderId })]),
    );

    // Other customer cannot see order (404 non-disclosure)
    await request(app.getHttpServer())
      .get(`/orders/${orderId}`)
      .set('Authorization', `Bearer ${otherCustomerSession.accessToken}`)
      .expect(404);
  });

  it('rejects order creation with an invalid or expired estimate token', async () => {
    await request(app.getHttpServer())
      .post('/orders')
      .set('Authorization', `Bearer ${customerSession.accessToken}`)
      .send({
        pickup: { address: 'Ben Thanh Market', lat: 10.762622, lng: 106.660172 },
        dropoff: { address: 'Saigon Opera House', lat: 10.772622, lng: 106.670172 },
        vehicleType: 'MOTORBIKE',
        estimateToken: 'invalid.token.signature',
      })
      .expect(400);
  });

  it('creates an order idempotently with clientRequestId', async () => {
    const pickup = { latitude: 10.762622, longitude: 106.660172 };
    const dropoff = { latitude: 10.772622, longitude: 106.670172 };

    const token = estimateTokenService.issue({
      routeInput: { pickup, stops: [], dropoff, vehicleType: 'MOTORBIKE' },
      estimate: { polyline: 'encoded_polyline', distanceM: 2500, durationS: 600, estimatedArrivalAt: new Date(Date.now() + 600_000).toISOString(), estimatedPriceVnd: 15_000, source: 'DEMO', calculatedAt: new Date().toISOString(), isEstimate: true },
      quote: { amountVnd: 15_000, currency: 'VND' },
    });

    const clientRequestId = `req-idem-${Date.now()}`;

    const createRes1 = await request(app.getHttpServer())
      .post('/orders')
      .set('Authorization', `Bearer ${customerSession.accessToken}`)
      .send({
        pickup: { address: 'P1', lat: pickup.latitude, lng: pickup.longitude },
        dropoff: { address: 'D1', lat: dropoff.latitude, lng: dropoff.longitude },
        vehicleType: 'MOTORBIKE',
        estimateToken: token,
        clientRequestId,
      })
      .expect(201);

    const createRes2 = await request(app.getHttpServer())
      .post('/orders')
      .set('Authorization', `Bearer ${customerSession.accessToken}`)
      .send({
        pickup: { address: 'P1', lat: pickup.latitude, lng: pickup.longitude },
        dropoff: { address: 'D1', lat: dropoff.latitude, lng: dropoff.longitude },
        vehicleType: 'MOTORBIKE',
        estimateToken: token,
        clientRequestId,
      })
      .expect(201);

    // Both should return the same order ID
    expect(createRes1.body.id).toEqual(createRes2.body.id);
  });

  it('rejects order creation if requested locations do not match estimate token payload', async () => {
    const pickup = { latitude: 10.762622, longitude: 106.660172 };
    const dropoff = { latitude: 10.772622, longitude: 106.670172 };
    const maliciousDropoff = { latitude: 21.028511, longitude: 105.804817 }; // Hanoi

    const token = estimateTokenService.issue({
      routeInput: {
        pickup,
        stops: [],
        dropoff,
        vehicleType: 'MOTORBIKE',
      },
      estimate: {
        polyline: 'short_route_polyline',
        distanceM: 2500,
        durationS: 600,
        estimatedArrivalAt: new Date(Date.now() + 600_000).toISOString(),
        estimatedPriceVnd: 15_000,
        source: 'DEMO',
        calculatedAt: new Date().toISOString(),
        isEstimate: true,
      },
      quote: {
        amountVnd: 15_000,
        currency: 'VND',
      },
    });

    const createRes = await request(app.getHttpServer())
      .post('/orders')
      .set('Authorization', `Bearer ${customerSession.accessToken}`)
      .send({
        pickup: { address: 'Ben Thanh Market', lat: pickup.latitude, lng: pickup.longitude },
        dropoff: { address: 'Hanoi', lat: maliciousDropoff.latitude, lng: maliciousDropoff.longitude },
        vehicleType: 'MOTORBIKE',
        estimateToken: token,
      })
      .expect(400);

    expect(createRes.body.message).toMatch(/không khớp với ước tính/i);
  });
});
