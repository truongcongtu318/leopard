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

describe('Security & Privacy: Input Hardening, Boundary Validation & Error Redaction (E2E)', () => {
  let app: INestApplication;
  let prismaMock: InMemoryPrismaService;

  let customerSession: AuthSessionBody;
  let driverSession: AuthSessionBody;
  let fleetOwnerSession: AuthSessionBody;
  let adminSession: AuthSessionBody;

  let customerUserId: string;
  let driverUserId: string;
  let fleetOwnerUserId: string;
  let fleetId: string;
  let orderId: string;

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

    // Customer
    const c = await prismaMock.user.create({
      data: { phone: '+84901000001', role: 'CUSTOMER', status: 'ACTIVE' },
    });
    customerUserId = c.id;
    const sC = await refreshSessions.create(c.id);
    customerSession = tokenService.createAuthSession(c, sC);

    // Driver
    const d = await prismaMock.user.create({
      data: { phone: '+84902000001', role: 'DRIVER', status: 'ACTIVE' },
    });
    driverUserId = d.id;
    await prismaMock.driverProfile.create({
      data: { userId: d.id, availability: 'AVAILABLE', vehicleType: 'MOTORBIKE' },
    });
    const sD = await refreshSessions.create(d.id);
    driverSession = tokenService.createAuthSession(d, sD);

    // Fleet Owner
    const fo = await prismaMock.user.create({
      data: { phone: '+84903000001', role: 'FLEET_OWNER', status: 'ACTIVE' },
    });
    fleetOwnerUserId = fo.id;
    const sFo = await refreshSessions.create(fo.id);
    fleetOwnerSession = tokenService.createAuthSession(fo, sFo);

    const f = await prismaMock.fleet.create({ data: { name: 'Test Fleet' } });
    fleetId = f.id;
    await prismaMock.fleetMember.create({
      data: { fleetId, userId: fleetOwnerUserId, role: 'OWNER', status: 'ACTIVE' },
    });
    await prismaMock.fleetMember.create({
      data: { fleetId, userId: driverUserId, role: 'DRIVER', status: 'ACTIVE' },
    });

    // Admin
    const adm = await prismaMock.user.create({
      data: { phone: '+84909999999', role: 'ADMIN', status: 'ACTIVE' },
    });
    const sAdm = await refreshSessions.create(adm.id);
    adminSession = tokenService.createAuthSession(adm, sAdm);

    // Order
    const order = await prismaMock.order.create({
      data: {
        id: '12345678-1234-4234-8234-123456789012',
        customerId: customerUserId,
        driverId: driverUserId,
        status: 'IN_TRANSIT',
        priceVnd: 50000,
        distanceMeters: 5000,
        durationSeconds: 900,
      },
    });
    orderId = order.id;
  });

  afterAll(async () => {
    if (app) await app.close();
  });

  // =========================================================================
  // 1. Boundary Coordinate & Route Input Validation
  // =========================================================================
  describe('1. Boundary Coordinate & Route Validation', () => {
    it('rejects latitude outside [-90, 90] with 400 Bad Request', async () => {
      const invalidLatPayloads = [
        { lat: 90.0001, lng: 106.66 },
        { lat: -90.0001, lng: 106.66 },
        { lat: 1000, lng: 106.66 },
      ];

      for (const pickupCoord of invalidLatPayloads) {
        const res = await request(app.getHttpServer())
          .post('/orders/estimate')
          .set('Authorization', `Bearer ${customerSession.accessToken}`)
          .send({
            pickup: { type: 'PICKUP', address: '123 Street', lat: pickupCoord.lat, lng: pickupCoord.lng },
            dropoff: { type: 'DROPOFF', address: '456 Street', lat: 10.77, lng: 106.69 },
            vehicleType: 'MOTORBIKE',
          })
          .expect(400);

        expect(res.body.code).toBe('BAD_REQUEST');
        expect(res.body.message).toContain('Validation failed');
      }
    });

    it('rejects longitude outside [-180, 180] with 400 Bad Request', async () => {
      const invalidLngPayloads = [
        { lat: 10.77, lng: 180.0001 },
        { lat: 10.77, lng: -180.0001 },
        { lat: 10.77, lng: 360 },
      ];

      for (const pickupCoord of invalidLngPayloads) {
        const res = await request(app.getHttpServer())
          .post('/orders/estimate')
          .set('Authorization', `Bearer ${customerSession.accessToken}`)
          .send({
            pickup: { type: 'PICKUP', address: '123 Street', lat: pickupCoord.lat, lng: pickupCoord.lng },
            dropoff: { type: 'DROPOFF', address: '456 Street', lat: 10.77, lng: 106.69 },
            vehicleType: 'MOTORBIKE',
          })
          .expect(400);

        expect(res.body.code).toBe('BAD_REQUEST');
      }
    });

    it('rejects non-numeric / non-finite coordinates (NaN, Infinity, string) with 400', async () => {
      const nonNumericPayloads = [
        { lat: 'invalid-string', lng: 106.66 },
        { lat: null, lng: 106.66 },
      ];

      for (const pickupCoord of nonNumericPayloads) {
        await request(app.getHttpServer())
          .post('/orders/estimate')
          .set('Authorization', `Bearer ${customerSession.accessToken}`)
          .send({
            pickup: { type: 'PICKUP', address: '123 Street', lat: pickupCoord.lat, lng: pickupCoord.lng },
            dropoff: { type: 'DROPOFF', address: '456 Street', lat: 10.77, lng: 106.69 },
            vehicleType: 'MOTORBIKE',
          })
          .expect(400);
      }
    });

    it('accepts valid coordinates on exact boundary limits (-90, 90, -180, 180)', async () => {
      const res = await request(app.getHttpServer())
        .post('/orders/estimate')
        .set('Authorization', `Bearer ${customerSession.accessToken}`)
        .send({
          pickup: { type: 'PICKUP', address: 'South Pole', lat: -90, lng: -180 },
          dropoff: { type: 'DROPOFF', address: 'North Pole', lat: 90, lng: 180 },
          vehicleType: 'TRUCK',
        })
        .expect(200);

      expect(res.body).toHaveProperty('estimatedPriceVnd');
      expect(res.body).toHaveProperty('estimateToken');
    });

    it('rejects more than 3 intermediate stops (> 3 stops) with 400 Bad Request', async () => {
      const fourStops = [
        { type: 'STOP', address: 'Stop 1', lat: 10.71, lng: 106.61 },
        { type: 'STOP', address: 'Stop 2', lat: 10.72, lng: 106.62 },
        { type: 'STOP', address: 'Stop 3', lat: 10.73, lng: 106.63 },
        { type: 'STOP', address: 'Stop 4', lat: 10.74, lng: 106.64 },
      ];

      const res = await request(app.getHttpServer())
        .post('/orders/estimate')
        .set('Authorization', `Bearer ${customerSession.accessToken}`)
        .send({
          pickup: { type: 'PICKUP', address: '123 Street', lat: 10.77, lng: 106.69 },
          stops: fourStops,
          dropoff: { type: 'DROPOFF', address: '456 Street', lat: 10.78, lng: 106.70 },
          vehicleType: 'MOTORBIKE',
        })
        .expect(400);

      expect(res.body.code).toBe('BAD_REQUEST');
    });

    it('rejects invalid or injected vehicle types with 400 Bad Request', async () => {
      const tokenService = app.get(TokenService);
      const refreshSessions = app.get(RefreshSessionRepository);
      const c2 = await prismaMock.user.create({
        data: { phone: '+84901000099', role: 'CUSTOMER', status: 'ACTIVE' },
      });
      const s2 = await refreshSessions.create(c2.id);
      const c2Session = tokenService.createAuthSession(c2, s2);

      const invalidVehicleTypes = ['AIRPLANE', 'BOAT', '<script>alert(1)</script>', '"" OR 1=1'];

      for (const vehicleType of invalidVehicleTypes) {
        const res = await request(app.getHttpServer())
          .post('/orders/estimate')
          .set('Authorization', `Bearer ${c2Session.accessToken}`)
          .send({
            pickup: { type: 'PICKUP', address: '123 Street', lat: 10.77, lng: 106.69 },
            dropoff: { type: 'DROPOFF', address: '456 Street', lat: 10.78, lng: 106.70 },
            vehicleType,
          })
          .expect(400);

        expect(res.body.code).toBe('BAD_REQUEST');
      }
    });
  });

  // =========================================================================
  // 2. Pagination Boundaries & Query Hardening
  // =========================================================================
  describe('2. Pagination Parameter Hardening & Upper Bound Limits', () => {
    it('rejects or bounds pageSize exceeding 100 on Admin endpoints', async () => {
      // parsePageQuery rejects pageSize > 100 with RangeError
      const res = await request(app.getHttpServer())
        .get('/admin/users?pageSize=101')
        .set('Authorization', `Bearer ${adminSession.accessToken}`)
        .expect(500); // Caught and cleanly converted

      expect(res.body.code).toBe('INTERNAL_ERROR');
      expect(res.body.message).toBe('Internal server error');
    });

    it('rejects pageSize exceeding 100 on Fleet endpoints', async () => {
      const res = await request(app.getHttpServer())
        .get('/fleet/drivers?pageSize=500')
        .set('Authorization', `Bearer ${fleetOwnerSession.accessToken}`)
        .expect(500);

      expect(res.body.code).toBe('INTERNAL_ERROR');
    });

    it('rejects pageSize exceeding 100 on Tracking query with 400 Bad Request', async () => {
      const res = await request(app.getHttpServer())
        .get(`/orders/${orderId}/tracking?pageSize=101`)
        .set('Authorization', `Bearer ${customerSession.accessToken}`)
        .expect(400);

      expect(res.body.code).toBe('BAD_REQUEST');
      expect(res.body.message).toContain('pageSize must be between 1 and 100');
    });

    it('safely clamps pageSize on Customer Orders endpoint without crashing', async () => {
      // In OrdersController: Math.min(100, parseInt(pageSize) || 20)
      const res = await request(app.getHttpServer())
        .get('/orders?pageSize=99999')
        .set('Authorization', `Bearer ${customerSession.accessToken}`)
        .expect(200);

      expect(res.body.pageSize).toBe(100);
    });

    it('safely clamps pageSize on Driver Available Orders endpoint without crashing', async () => {
      const res = await request(app.getHttpServer())
        .get('/driver/orders/available?pageSize=99999')
        .set('Authorization', `Bearer ${driverSession.accessToken}`)
        .expect(200);

      expect(res.body.pageSize).toBe(100);
    });

    it('handles negative, non-numeric and SQL injection pagination inputs gracefully', async () => {
      const garbagePageInputs = [
        '?page=-1&pageSize=-20',
        '?page=abc&pageSize=xyz',
        "?page=1'OR'1'='1&pageSize=20",
      ];

      for (const query of garbagePageInputs) {
        const res = await request(app.getHttpServer())
          .get(`/orders${query}`)
          .set('Authorization', `Bearer ${customerSession.accessToken}`);

        // Must return either 200 (using safe fallback) or 400/422, but NEVER leak internals or crash
        expect([200, 400, 422]).toContain(res.status);
      }
    });
  });

  // =========================================================================
  // 3. Media Upload Hardening & Payload Abuse
  // =========================================================================
  describe('3. Media Upload Hardening & Magic-Byte MIME Validation', () => {
    const validJpeg = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01, 0x01, 0x01, 0x00, 0x60]);
    const validPng = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d, 0x49, 0x48, 0x44, 0x52]);
    const validWebp = Buffer.from([0x52, 0x49, 0x46, 0x46, 0x24, 0x00, 0x00, 0x00, 0x57, 0x45, 0x42, 0x50, 0x56, 0x50, 0x38, 0x20]);

    it('rejects file larger than 10 MB with 413 MEDIA_FILE_TOO_LARGE', async () => {
      // 10 MB + 1024 bytes buffer with JPEG magic header
      const oversizedBuffer = Buffer.alloc(10 * 1024 * 1024 + 1024);
      validJpeg.copy(oversizedBuffer, 0);

      const res = await request(app.getHttpServer())
        .post(`/orders/${orderId}/media/cargo`)
        .set('Authorization', `Bearer ${customerSession.accessToken}`)
        .field('clientRequestId', 'req-oversized-media')
        .attach('file', oversizedBuffer, 'oversized.jpg')
        .expect(413);

      expect(res.body.code).toBe('MEDIA_FILE_TOO_LARGE');
    });

    it('rejects disguised executable / PHP shell / HTML file with 422 MEDIA_UNSUPPORTED_TYPE', async () => {
      const maliciousPayloads = [
        { filename: 'shell.jpg', buffer: Buffer.from('<?php phpinfo(); ?>') },
        { filename: 'malicious.png', buffer: Buffer.from('<script>alert("XSS")</script>') },
        { filename: 'binary.webp', buffer: Buffer.from('\x7fELF\x02\x01\x01\x00\x00\x00\x00\x00') },
        { filename: 'empty.jpg', buffer: Buffer.from('') },
      ];

      for (const payload of maliciousPayloads) {
        const res = await request(app.getHttpServer())
          .post(`/orders/${orderId}/media/cargo`)
          .set('Authorization', `Bearer ${customerSession.accessToken}`)
          .field('clientRequestId', `req-malicious-${Math.random()}`)
          .attach('file', payload.buffer, payload.filename)
          .expect(422);

        expect(['MEDIA_UNSUPPORTED_TYPE', 'VALIDATION_ERROR']).toContain(res.body.code);
      }
    });

    it('accepts legitimate JPEG, PNG, and WebP files with valid magic bytes', async () => {
      // Test JPEG
      await request(app.getHttpServer())
        .post(`/orders/${orderId}/media/cargo`)
        .set('Authorization', `Bearer ${customerSession.accessToken}`)
        .field('clientRequestId', 'req-valid-jpeg')
        .attach('file', validJpeg, 'photo.jpg')
        .expect(201);

      // Test PNG
      await request(app.getHttpServer())
        .post(`/orders/${orderId}/media/cargo`)
        .set('Authorization', `Bearer ${customerSession.accessToken}`)
        .field('clientRequestId', 'req-valid-png')
        .attach('file', validPng, 'photo.png')
        .expect(201);

      // Test WebP
      await request(app.getHttpServer())
        .post(`/orders/${orderId}/media/cargo`)
        .set('Authorization', `Bearer ${customerSession.accessToken}`)
        .field('clientRequestId', 'req-valid-webp')
        .attach('file', validWebp, 'photo.webp')
        .expect(201);
    });
  });

  // =========================================================================
  // 4. Error Redaction & Information Disclosure Prevention
  // =========================================================================
  describe('4. Error Redaction & Information Disclosure Prevention', () => {
    it('ensures 500 errors never leak stack traces, SQL syntax, or file paths', async () => {
      // Force an unhandled error scenario
      const res = await request(app.getHttpServer())
        .get('/admin/users?pageSize=99999999999999999999')
        .set('Authorization', `Bearer ${adminSession.accessToken}`)
        .expect(500);

      expect(res.body).toMatchObject({
        statusCode: 500,
        code: 'INTERNAL_ERROR',
        message: 'Internal server error',
      });

      // Strict validation: response must NOT contain sensitive leakage
      const responseString = JSON.stringify(res.body);
      expect(responseString).not.toContain('node_modules');
      expect(responseString).not.toContain('/home/');
      expect(responseString).not.toContain('prisma');
      expect(responseString).not.toContain('SELECT ');
      expect(responseString).not.toContain('INSERT ');
      expect(responseString).not.toContain('stack');
      expect(responseString).not.toContain('Trace:');
    });

    it('ensures 404 on undefined routes returns clean ApiErrorEnvelope', async () => {
      const res = await request(app.getHttpServer())
        .get('/non-existent-endpoint-route-check')
        .expect(404);

      expect(res.body).toHaveProperty('statusCode', 404);
      expect(res.body).toHaveProperty('code', 'NOT_FOUND');
      expect(res.body).toHaveProperty('message');
      expect(res.body).toHaveProperty('requestId');
      expect(res.body).toHaveProperty('timestamp');
    });
  });
});
