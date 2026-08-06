/// <reference types="jest" />

import { ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import type { INestApplication } from '@nestjs/common';
import request from 'supertest';

import { AppModule } from '../src/app.module.js';
import { ApiExceptionFilter } from '../src/common/api-exception.filter.js';
import { PrismaService } from '../src/database/prisma.service.js';
import { TokenService } from '../src/auth/token.service.js';
import { RefreshSessionRepository } from '../src/auth/refresh-session.repository.js';
import { InMemoryPrismaService } from './prisma-mock.js';

interface AuthSessionBody {
  readonly accessToken: string;
}

describe('Order & Driver Domain Authorization Matrix', () => {
  let app: INestApplication;
  let customerSession: AuthSessionBody;
  let customer2Session: AuthSessionBody;
  let driverSession: AuthSessionBody;
  let fleetOwnerSession: AuthSessionBody;
  let adminSession: AuthSessionBody;
  let customerUserId: string;
  let driverUserId: string;
  let prismaMock: InMemoryPrismaService;

  beforeEach(async () => {
    process.env = {
      ...process.env,
      NODE_ENV: 'test',
      AUTH_DEMO_LOGIN_ENABLED: 'true',
      AUTH_ACCESS_TOKEN_SECRET: 'test-access-token-secret',
      AUTH_REFRESH_TOKEN_SECRET: 'test-refresh-token-secret',
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
    await app.listen(0);

    const tokenService = app.get(TokenService);
    const refreshSessions = app.get(RefreshSessionRepository);

    // CUSTOMER 1
    const c1 = await prismaMock.user.create({
      data: { phone: '+84910000001', role: 'CUSTOMER', status: 'ACTIVE' },
    });
    customerUserId = c1.id;
    const c1s = await refreshSessions.create(c1.id);
    customerSession = tokenService.createAuthSession(c1, c1s);

    // CUSTOMER 2
    const c2 = await prismaMock.user.create({
      data: { phone: '+84910000002', role: 'CUSTOMER', status: 'ACTIVE' },
    });
    const c2s = await refreshSessions.create(c2.id);
    customer2Session = tokenService.createAuthSession(c2, c2s);

    // DRIVER
    const d = await prismaMock.user.create({
      data: { phone: '+84910000003', role: 'DRIVER', status: 'ACTIVE' },
    });
    driverUserId = d.id;
    await prismaMock.driverProfile.create({
      data: { userId: d.id, availability: 'AVAILABLE', vehicleType: 'MOTORBIKE' },
    });
    const ds = await refreshSessions.create(d.id);
    driverSession = tokenService.createAuthSession(d, ds);

    // FLEET OWNER
    const fo = await prismaMock.user.create({
      data: { phone: '+84910000004', role: 'FLEET_OWNER', status: 'ACTIVE' },
    });
    const fos = await refreshSessions.create(fo.id);
    fleetOwnerSession = tokenService.createAuthSession(fo, fos);

    // ADMIN
    const adm = await prismaMock.user.create({
      data: { phone: '+84910000005', role: 'ADMIN', status: 'ACTIVE' },
    });
    const adms = await refreshSessions.create(adm.id);
    adminSession = tokenService.createAuthSession(adm, adms);
  });

  afterEach(async () => {
    if (app) {
      await app.close();
    }
  });

  describe('POST /orders', () => {
    it('restricts creation to CUSTOMER only', async () => {
      await request(app.getHttpServer())
        .post('/orders')
        .set('Authorization', `Bearer ${driverSession.accessToken}`)
        .send({})
        .expect(403);

      await request(app.getHttpServer())
        .post('/orders')
        .set('Authorization', `Bearer ${fleetOwnerSession.accessToken}`)
        .send({})
        .expect(403);

      await request(app.getHttpServer())
        .post('/orders')
        .set('Authorization', `Bearer ${adminSession.accessToken}`)
        .send({})
        .expect(403);
    });
  });

  describe('GET /orders/:id (Ownership non-disclosure)', () => {
    it('returns 404 non-disclosure for non-owner customer', async () => {
      const order = await prismaMock.order.create({
        data: { customerId: customerUserId, status: 'REQUESTED', distanceMeters: 1000, durationSeconds: 300, priceVnd: 20000 },
      });

      // Customer 1 (owner) -> 200
      await request(app.getHttpServer())
        .get(`/orders/${order.id}`)
        .set('Authorization', `Bearer ${customerSession.accessToken}`)
        .expect(200);

      // Customer 2 (non-owner) -> 404
      await request(app.getHttpServer())
        .get(`/orders/${order.id}`)
        .set('Authorization', `Bearer ${customer2Session.accessToken}`)
        .expect(404);
    });
  });

  describe('PATCH /driver/availability', () => {
    it('restricts availability toggling to DRIVER only', async () => {
      await request(app.getHttpServer())
        .patch('/driver/availability')
        .set('Authorization', `Bearer ${customerSession.accessToken}`)
        .send({ availability: 'AVAILABLE' })
        .expect(403);

      await request(app.getHttpServer())
        .patch('/driver/availability')
        .set('Authorization', `Bearer ${fleetOwnerSession.accessToken}`)
        .send({ availability: 'AVAILABLE' })
        .expect(403);

      await request(app.getHttpServer())
        .patch('/driver/availability')
        .set('Authorization', `Bearer ${adminSession.accessToken}`)
        .send({ availability: 'AVAILABLE' })
        .expect(403);
    });
  });

  describe('POST /driver/orders/:id/status', () => {
    it('restricts status updates to assigned DRIVER only', async () => {
      const order = await prismaMock.order.create({
        data: { customerId: customerUserId, driverId: 'other-driver', status: 'ACCEPTED', distanceMeters: 1000, durationSeconds: 300, priceVnd: 20000 },
      });

      // Unassigned driver -> 403
      await request(app.getHttpServer())
        .post(`/driver/orders/${order.id}/status`)
        .set('Authorization', `Bearer ${driverSession.accessToken}`)
        .send({ status: 'PICKING_UP', clientRequestId: 'req-1' })
        .expect(403);

      // Fleet Owner -> 403
      await request(app.getHttpServer())
        .post(`/driver/orders/${order.id}/status`)
        .set('Authorization', `Bearer ${fleetOwnerSession.accessToken}`)
        .send({ status: 'PICKING_UP', clientRequestId: 'req-2' })
        .expect(403);
    });
  });

  describe('POST /orders/:id/cancel', () => {
    it('allows CUSTOMER (owner) and ADMIN, blocks DRIVER and FLEET_OWNER', async () => {
      const order = await prismaMock.order.create({
        data: { customerId: customerUserId, status: 'REQUESTED', distanceMeters: 1000, durationSeconds: 300, priceVnd: 20000 },
      });

      await request(app.getHttpServer())
        .post(`/orders/${order.id}/cancel`)
        .set('Authorization', `Bearer ${driverSession.accessToken}`)
        .send({})
        .expect(403);

      await request(app.getHttpServer())
        .post(`/orders/${order.id}/cancel`)
        .set('Authorization', `Bearer ${fleetOwnerSession.accessToken}`)
        .send({})
        .expect(403);
    });
  });
});
