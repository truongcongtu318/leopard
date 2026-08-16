/// <reference types="jest" />

import { ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import type { INestApplication } from '@nestjs/common';
import request from 'supertest';

import { AppModule } from '../app.module.js';
import { ApiExceptionFilter } from '../common/api-exception.filter.js';
import { PrismaService } from '../database/prisma.service.js';
import { TokenService } from '../auth/token.service.js';
import { RefreshSessionRepository } from '../auth/refresh-session.repository.js';
import { InMemoryPrismaService } from '../../test/prisma-mock.js';

describe('Media Upload & Signed URL Operations (E2E)', () => {
  let app: INestApplication;
  let prismaMock: InMemoryPrismaService;
  let customer1Session: { accessToken: string };
  let customer2Session: { accessToken: string };
  let driver1Session: { accessToken: string };
  let driver2Session: { accessToken: string };
  let customer1Id: string;
  let driver1Id: string;
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

    // Customer 1 (Owner)
    const c1 = await prismaMock.user.create({
      data: { phone: '+84901111111', role: 'CUSTOMER', status: 'ACTIVE' },
    });
    customer1Id = c1.id;
    const s1 = await refreshSessions.create(c1.id);
    customer1Session = tokenService.createAuthSession(c1, s1);

    // Customer 2 (Unrelated)
    const c2 = await prismaMock.user.create({
      data: { phone: '+84902222222', role: 'CUSTOMER', status: 'ACTIVE' },
    });
    const s2 = await refreshSessions.create(c2.id);
    customer2Session = tokenService.createAuthSession(c2, s2);

    // Driver 1 (Assigned)
    const d1 = await prismaMock.user.create({
      data: { phone: '+84911111111', role: 'DRIVER', status: 'ACTIVE' },
    });
    driver1Id = d1.id;
    await prismaMock.driverProfile.create({
      data: { userId: d1.id, availability: 'BUSY', vehicleType: 'MOTORBIKE' },
    });
    const s3 = await refreshSessions.create(d1.id);
    driver1Session = tokenService.createAuthSession(d1, s3);

    // Driver 2 (Unrelated)
    const d2 = await prismaMock.user.create({
      data: { phone: '+84922222222', role: 'DRIVER', status: 'ACTIVE' },
    });
    const s4 = await refreshSessions.create(d2.id);
    driver2Session = tokenService.createAuthSession(d2, s4);

    // Order created by Customer 1 and assigned to Driver 1
    const order = await prismaMock.order.create({
      data: {
        customerId: customer1Id,
        driverId: driver1Id,
        status: 'IN_TRANSIT',
        priceVnd: 45000,
        distanceMeters: 3000,
        durationSeconds: 600,
      },
    });
    orderId = order.id;
  });

  afterAll(async () => {
    if (app) await app.close();
  });

  // Valid JPEG header
  const jpegBuffer = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01, 0x01, 0x01, 0x00, 0x60]);

  let cargoMediaId: string;

  it('allows Customer Owner to upload CARGO media photo', async () => {
    const res = await request(app.getHttpServer())
      .post(`/orders/${orderId}/media/cargo`)
      .set('Authorization', `Bearer ${customer1Session.accessToken}`)
      .field('clientRequestId', 'req-cargo-1')
      .attach('file', jpegBuffer, 'cargo.jpg')
      .expect(201);

    expect(res.body).toMatchObject({
      orderId,
      type: 'CARGO',
      uploaderId: customer1Id,
      contentType: 'image/jpeg',
    });
    cargoMediaId = res.body.id;
  });

  it('rejects unrelated customer from uploading CARGO photo with 403', async () => {
    await request(app.getHttpServer())
      .post(`/orders/${orderId}/media/cargo`)
      .set('Authorization', `Bearer ${customer2Session.accessToken}`)
      .field('clientRequestId', 'req-cargo-hack')
      .attach('file', jpegBuffer, 'cargo.jpg')
      .expect(403);
  });

  it('allows Assigned Driver to upload DELIVERY_PROOF photo', async () => {
    const res = await request(app.getHttpServer())
      .post(`/orders/${orderId}/media/delivery-proof`)
      .set('Authorization', `Bearer ${driver1Session.accessToken}`)
      .field('clientRequestId', 'req-proof-1')
      .attach('file', jpegBuffer, 'proof.jpg')
      .expect(201);

    expect(res.body).toMatchObject({
      orderId,
      type: 'DELIVERY_PROOF',
      uploaderId: driver1Id,
      contentType: 'image/jpeg',
    });
  });

  it('rejects unassigned driver from uploading DELIVERY_PROOF with 403', async () => {
    await request(app.getHttpServer())
      .post(`/orders/${orderId}/media/delivery-proof`)
      .set('Authorization', `Bearer ${driver2Session.accessToken}`)
      .field('clientRequestId', 'req-proof-hack')
      .attach('file', jpegBuffer, 'proof.jpg')
      .expect(403);
  });

  it('allows Customer owner to obtain signed URL for media', async () => {
    const res = await request(app.getHttpServer())
      .get(`/media/${cargoMediaId}/url`)
      .set('Authorization', `Bearer ${customer1Session.accessToken}`)
      .expect(200);

    expect(res.body).toHaveProperty('url');
    expect(res.body).toHaveProperty('expiresAt');
  });
});
