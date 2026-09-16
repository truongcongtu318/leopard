/// <reference types="jest" />

import { ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import type { INestApplication } from '@nestjs/common';
import request from 'supertest';

import { AppModule } from '../../src/app.module.js';
import { ApiExceptionFilter } from '../../src/common/api-exception.filter.js';
import { PrismaService } from '../../src/database/prisma.service.js';
import { TokenService } from '../../src/auth/token.service.js';
import { RefreshSessionRepository } from '../../src/auth/refresh-session.repository.js';
import { InMemoryPrismaService } from '../prisma-mock.js';

interface AuthSessionBody {
  readonly accessToken: string;
}

describe('Security & Privacy: Multi-Role Authorization & IDOR Boundaries (E2E)', () => {
  let app: INestApplication;
  let prismaMock: InMemoryPrismaService;

  let customer1Session: AuthSessionBody;
  let customer2Session: AuthSessionBody;
  let driver1Session: AuthSessionBody;
  let driver2Session: AuthSessionBody;
  let adminSession: AuthSessionBody;

  let customer1UserId: string;
  let customer2UserId: string;
  let driver1UserId: string;
  let driver2UserId: string;
  let adminUserId: string;

  let order1Id: string;
  let order2Id: string;

  // Valid JPEG buffer for media upload tests
  const jpegBuffer = Buffer.from([
    0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01, 0x01, 0x01, 0x00, 0x60,
  ]);

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

    prismaMock = new InMemoryPrismaService();

    const moduleFixture = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(PrismaService)
      .useValue(prismaMock)
      .compile();

    app = moduleFixture.createNestApplication({ bodyParser: false });
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

    // Customer 1
    const c1 = await prismaMock.user.create({
      data: { phone: '+84901000001', role: 'CUSTOMER', status: 'ACTIVE' },
    });
    customer1UserId = c1.id;
    const sC1 = await refreshSessions.create(c1.id);
    customer1Session = tokenService.createAuthSession(c1, sC1);

    // Customer 2
    const c2 = await prismaMock.user.create({
      data: { phone: '+84901000002', role: 'CUSTOMER', status: 'ACTIVE' },
    });
    customer2UserId = c2.id;
    const sC2 = await refreshSessions.create(c2.id);
    customer2Session = tokenService.createAuthSession(c2, sC2);

    // Driver 1
    const d1 = await prismaMock.user.create({
      data: { phone: '+84902000001', role: 'DRIVER', status: 'ACTIVE' },
    });
    driver1UserId = d1.id;
    await prismaMock.driverProfile.create({
      data: { userId: d1.id, availability: 'BUSY', vehicleType: 'MOTORBIKE' },
    });
    const sD1 = await refreshSessions.create(d1.id);
    driver1Session = tokenService.createAuthSession(d1, sD1);

    // Driver 2
    const d2 = await prismaMock.user.create({
      data: { phone: '+84902000002', role: 'DRIVER', status: 'ACTIVE' },
    });
    driver2UserId = d2.id;
    await prismaMock.driverProfile.create({
      data: { userId: d2.id, availability: 'BUSY', vehicleType: 'MOTORBIKE' },
    });
    const sD2 = await refreshSessions.create(d2.id);
    driver2Session = tokenService.createAuthSession(d2, sD2);

    // Admin
    const adm = await prismaMock.user.create({
      data: { phone: '+84909999999', role: 'ADMIN', status: 'ACTIVE' },
    });
    adminUserId = adm.id;
    const sAdm = await refreshSessions.create(adm.id);
    adminSession = tokenService.createAuthSession(adm, sAdm);

    // Order 1: Created by Customer 1, assigned to Driver 1
    const o1 = await prismaMock.order.create({
      data: {
        id: '11111111-1111-4111-8111-111111111111',
        customerId: customer1UserId,
        driverId: driver1UserId,
        status: 'IN_TRANSIT',
        priceVnd: 50000,
        distanceMeters: 5000,
        durationSeconds: 900,
      },
    });
    order1Id = o1.id;

    // Order 2: Created by Customer 2, assigned to Driver 2
    const o2 = await prismaMock.order.create({
      data: {
        id: '22222222-2222-4222-8222-222222222222',
        customerId: customer2UserId,
        driverId: driver2UserId,
        status: 'IN_TRANSIT',
        priceVnd: 75000,
        distanceMeters: 8000,
        durationSeconds: 1200,
      },
    });
    order2Id = o2.id;
  });

  afterAll(async () => {
    if (app) await app.close();
  });

  // =========================================================================
  // 1. IDOR Protection Across Roles
  // =========================================================================
  describe('1. IDOR Protection Across All Roles', () => {
    describe('Customer IDOR Protection', () => {
      it('Customer cannot read another customer order via GET /orders/:id (404 non-disclosure)', async () => {
        // Customer 1 viewing own order -> 200
        await request(app.getHttpServer())
          .get(`/orders/${order1Id}`)
          .set('Authorization', `Bearer ${customer1Session.accessToken}`)
          .expect(200);

        // Customer 2 viewing Customer 1 order -> 404 (non-disclosure)
        const res = await request(app.getHttpServer())
          .get(`/orders/${order1Id}`)
          .set('Authorization', `Bearer ${customer2Session.accessToken}`)
          .expect(404);

        expect(res.body.code).toBe('RESOURCE_NOT_FOUND');
      });

      it('Customer cannot cancel another customer order via POST /orders/:id/cancel (404 non-disclosure)', async () => {
        const res = await request(app.getHttpServer())
          .post(`/orders/${order1Id}/cancel`)
          .set('Authorization', `Bearer ${customer2Session.accessToken}`)
          .send({ reason: 'Malicious cancellation attempt' })
          .expect(404);

        expect(res.body.code).toBe('RESOURCE_NOT_FOUND');
      });

      it('Customer cannot upload CARGO media for another customer order (403 Forbidden)', async () => {
        const res = await request(app.getHttpServer())
          .post(`/orders/${order1Id}/media/cargo`)
          .set('Authorization', `Bearer ${customer2Session.accessToken}`)
          .field('clientRequestId', 'req-idor-cargo')
          .attach('file', jpegBuffer, 'cargo.jpg')
          .expect(403);

        expect(res.body.code).toBe('FORBIDDEN');
      });

      it('Customer cannot access signed URL for media attached to another customer order (403 Forbidden)', async () => {
        // Create media object belonging to Order 1
        const media = await prismaMock.mediaObject.create({
          data: {
            orderId: order1Id,
            uploaderId: customer1UserId,
            type: 'CARGO',
            provider: 'LOCAL',
            storageKey: 'orders/1/cargo/img.jpg',
            contentType: 'image/jpeg',
            sizeBytes: 1024,
            checksumSha256: 'dummy-sha256',
            clientRequestId: 'req-media-c1',
          },
        });

        // Customer 1 (owner) can access -> 200
        await request(app.getHttpServer())
          .get(`/media/${media.id}/url`)
          .set('Authorization', `Bearer ${customer1Session.accessToken}`)
          .expect(200);

        // Customer 2 cannot access -> 403
        const res = await request(app.getHttpServer())
          .get(`/media/${media.id}/url`)
          .set('Authorization', `Bearer ${customer2Session.accessToken}`)
          .expect(403);

        expect(res.body.code).toBe('FORBIDDEN');
      });

      it('Customer cannot view tracking history of another customer order (404 non-disclosure)', async () => {
        const res = await request(app.getHttpServer())
          .get(`/orders/${order1Id}/tracking`)
          .set('Authorization', `Bearer ${customer2Session.accessToken}`)
          .expect(404);

        expect(res.body.code).toBe('RESOURCE_NOT_FOUND');
      });

      it('Customer cannot view payment history of another customer order (403 Forbidden)', async () => {
        const res = await request(app.getHttpServer())
          .get(`/orders/${order1Id}/payments`)
          .set('Authorization', `Bearer ${customer2Session.accessToken}`)
          .expect(403);

        expect(res.body.code).toBe('FORBIDDEN');
      });
    });

    describe('Driver IDOR Protection', () => {
      it('Driver cannot update status of an order assigned to another driver (403 Forbidden)', async () => {
        // Driver 2 trying to update Order 1 (assigned to Driver 1)
        const res = await request(app.getHttpServer())
          .post(`/driver/orders/${order1Id}/status`)
          .set('Authorization', `Bearer ${driver2Session.accessToken}`)
          .send({ status: 'DELIVERED', clientRequestId: 'req-driver-idor-status' })
          .expect(403);

        expect(res.body.code).toBe('FORBIDDEN');
      });

      it('Driver cannot upload DELIVERY_PROOF for an order assigned to another driver (403 Forbidden)', async () => {
        const res = await request(app.getHttpServer())
          .post(`/orders/${order1Id}/media/delivery-proof`)
          .set('Authorization', `Bearer ${driver2Session.accessToken}`)
          .field('clientRequestId', 'req-proof-idor')
          .attach('file', jpegBuffer, 'proof.jpg')
          .expect(403);

        expect(res.body.code).toBe('FORBIDDEN');
      });

      it('Driver cannot view media signed URL of an order assigned to another driver (403 Forbidden)', async () => {
        const media = await prismaMock.mediaObject.create({
          data: {
            orderId: order1Id,
            uploaderId: driver1UserId,
            type: 'DELIVERY_PROOF',
            provider: 'LOCAL',
            storageKey: 'orders/1/proof/img.jpg',
            contentType: 'image/jpeg',
            sizeBytes: 1024,
            checksumSha256: 'dummy-proof-sha256',
            clientRequestId: 'req-proof-media-d1',
          },
        });

        // Driver 1 (assigned) -> 200
        await request(app.getHttpServer())
          .get(`/media/${media.id}/url`)
          .set('Authorization', `Bearer ${driver1Session.accessToken}`)
          .expect(200);

        // Driver 2 (unassigned) -> 403
        await request(app.getHttpServer())
          .get(`/media/${media.id}/url`)
          .set('Authorization', `Bearer ${driver2Session.accessToken}`)
          .expect(403);
      });

      it('Driver cannot view tracking points of an unassigned order (404 non-disclosure)', async () => {
        const res = await request(app.getHttpServer())
          .get(`/orders/${order1Id}/tracking`)
          .set('Authorization', `Bearer ${driver2Session.accessToken}`)
          .expect(404);

        expect(res.body.code).toBe('RESOURCE_NOT_FOUND');
      });
    });

  });

  // =========================================================================
  // 2. Role Escalation Prevention
  // =========================================================================
  describe('2. Role Escalation Prevention', () => {
    it('Unauthenticated requests are rejected with 401 Unauthorized', async () => {
      await request(app.getHttpServer()).get('/admin/dashboard').expect(401);
      await request(app.getHttpServer()).get('/orders').expect(401);
      await request(app.getHttpServer()).patch('/driver/availability').expect(401);
      await request(app.getHttpServer()).get('/me').expect(401);
    });

    describe('Admin Privileged Routes Guarding', () => {
      const adminEndpoints: Array<{ method: 'get' | 'patch' | 'post'; path: string; body?: any }> = [
        { method: 'get', path: '/admin/dashboard' },
        { method: 'get', path: '/admin/users' },
        { method: 'get', path: '/admin/drivers' },
        { method: 'get', path: '/admin/orders' },
        {
          method: 'patch',
          path: `/admin/users/${customer1UserId}/status`,
          body: { status: 'DISABLED', reason: 'Test escalation', clientRequestId: 'req-esc-1' },
        },
        {
          method: 'post',
          path: '/admin/payments/payment-1/confirm',
          body: { note: 'Escalation confirm', clientRequestId: 'req-esc-pay' },
        },
      ];

      it('blocks Customer from calling any Admin endpoint with 403 Forbidden', async () => {
        for (const ep of adminEndpoints) {
          const req = (request(app.getHttpServer()) as any)[ep.method](ep.path)
            .set('Authorization', `Bearer ${customer1Session.accessToken}`);
          if (ep.body) req.send(ep.body);
          await req.expect(403);
        }
      });

      it('blocks Driver from calling any Admin endpoint with 403 Forbidden', async () => {
        for (const ep of adminEndpoints) {
          const req = (request(app.getHttpServer()) as any)[ep.method](ep.path)
            .set('Authorization', `Bearer ${driver1Session.accessToken}`);
          if (ep.body) req.send(ep.body);
          await req.expect(403);
        }
      });

      it('allows Admin to access Admin endpoints with 200', async () => {
        await request(app.getHttpServer())
          .get('/admin/dashboard')
          .set('Authorization', `Bearer ${adminSession.accessToken}`)
          .expect(200);

        await request(app.getHttpServer())
          .get('/admin/users')
          .set('Authorization', `Bearer ${adminSession.accessToken}`)
          .expect(200);
      });
    });

    describe('Driver Operational Routes Guarding', () => {
      it('blocks Customer from updating driver availability with 403', async () => {
        await request(app.getHttpServer())
          .patch('/driver/availability')
          .set('Authorization', `Bearer ${customer1Session.accessToken}`)
          .send({ availability: 'AVAILABLE' })
          .expect(403);
      });

      it('blocks Customer from accepting orders with 403', async () => {
        await request(app.getHttpServer())
          .post(`/driver/orders/${order1Id}/accept`)
          .set('Authorization', `Bearer ${customer1Session.accessToken}`)
          .expect(403);
      });
    });

    describe('Customer Routes Guarding', () => {
      it('blocks Driver from creating orders with 403', async () => {
        await request(app.getHttpServer())
          .post('/orders')
          .set('Authorization', `Bearer ${driver1Session.accessToken}`)
          .send({})
          .expect(403);
      });
    });
  });

  // =========================================================================
  // 3. Non-Disclosure & Envelope Verification
  // =========================================================================
  describe('3. Non-Disclosure & Error Envelope Integrity', () => {
    it('returns consistent ApiErrorEnvelope without leaking system internals', async () => {
      const res = await request(app.getHttpServer())
        .get(`/orders/${order1Id}`)
        .set('Authorization', `Bearer ${customer2Session.accessToken}`)
        .expect(404);

      expect(res.body).toHaveProperty('statusCode', 404);
      expect(res.body).toHaveProperty('code', 'RESOURCE_NOT_FOUND');
      expect(res.body).toHaveProperty('message');
      expect(res.body).toHaveProperty('requestId');
      expect(res.body).toHaveProperty('timestamp');

      // Crucial: no stack trace, no db schema names, no private user IDs
      expect(res.body).not.toHaveProperty('stack');
      expect(res.body).not.toHaveProperty('trace');
      expect(res.body).not.toHaveProperty('sql');
      expect(res.body).not.toHaveProperty('internal');
    });
  });
});
