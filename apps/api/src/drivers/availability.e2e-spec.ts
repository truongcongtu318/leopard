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

interface AuthSessionBody {
  readonly accessToken: string;
}

describe('Driver Availability and Order Queue API (E2E)', () => {
  let app: INestApplication;
  let driverSession: AuthSessionBody;
  let customerSession: AuthSessionBody;
  let prismaMock: InMemoryPrismaService;
  let driverUserId: string;

  beforeAll(async () => {
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

    const tokenService = app.get(TokenService);
    const refreshSessions = app.get(RefreshSessionRepository);

    const driverUser = await prismaMock.user.create({
      data: { phone: '+84988888888', role: 'DRIVER', status: 'ACTIVE' },
    });
    driverUserId = driverUser.id;
    await prismaMock.driverProfile.create({
      data: { userId: driverUser.id, availability: 'OFFLINE', vehicleType: 'MOTORBIKE' },
    });
    const driverSessionRecord = await refreshSessions.create(driverUser.id);
    driverSession = tokenService.createAuthSession(driverUser, driverSessionRecord);

    // Create customer user
    const customerUser = await prismaMock.user.create({
      data: { phone: '+84977777777', role: 'CUSTOMER', status: 'ACTIVE' },
    });
    const customerSessionRecord = await refreshSessions.create(customerUser.id);
    customerSession = tokenService.createAuthSession(customerUser, customerSessionRecord);
  });

  afterAll(async () => {
    if (app) {
      await app.close();
    }
  });

  it('allows Driver to update availability between AVAILABLE and OFFLINE', async () => {
    // Change to AVAILABLE
    const res1 = await request(app.getHttpServer())
      .patch('/driver/availability')
      .set('Authorization', `Bearer ${driverSession.accessToken}`)
      .send({ availability: 'AVAILABLE' })
      .expect(200);

    expect(res1.body).toMatchObject({
      availability: 'AVAILABLE',
    });

    // Change back to OFFLINE
    const res2 = await request(app.getHttpServer())
      .patch('/driver/availability')
      .set('Authorization', `Bearer ${driverSession.accessToken}`)
      .send({ availability: 'OFFLINE' })
      .expect(200);

    expect(res2.body).toMatchObject({
      availability: 'OFFLINE',
    });
  });

  it('rejects direct client update to BUSY with 400 Bad Request', async () => {
    await request(app.getHttpServer())
      .patch('/driver/availability')
      .set('Authorization', `Bearer ${driverSession.accessToken}`)
      .send({ availability: 'BUSY' })
      .expect(400);
  });

  it('rejects Customer access to driver availability endpoints with 403 Forbidden', async () => {
    await request(app.getHttpServer())
      .patch('/driver/availability')
      .set('Authorization', `Bearer ${customerSession.accessToken}`)
      .send({ availability: 'AVAILABLE' })
      .expect(403);
  });

  it('returns available orders in REQUESTED status and active order for driver', async () => {
    // Create a REQUESTED order
    const reqOrder = await prismaMock.order.create({
      data: {
        customerId: 'customer-1',
        status: 'REQUESTED',
        distanceMeters: 1000,
        durationSeconds: 300,
        priceVnd: 20000,
      },
    });

    const availRes = await request(app.getHttpServer())
      .get('/driver/orders/available')
      .set('Authorization', `Bearer ${driverSession.accessToken}`)
      .expect(200);

    expect(availRes.body.items).toEqual(
      expect.arrayContaining([expect.objectContaining({ id: reqOrder.id })]),
    );

    const activeRes = await request(app.getHttpServer())
      .get('/driver/orders/active')
      .set('Authorization', `Bearer ${driverSession.accessToken}`)
      .expect(200);

    expect(activeRes.body).toEqual({ order: null });
  });

  it('blocks setting availability to AVAILABLE if driver has active order (ACCEPTED/PICKING_UP/IN_TRANSIT)', async () => {
    // Setup driver with active order in ACCEPTED state
    const order = await prismaMock.order.create({
      data: {
        customerId: 'customer-1',
        driverId: driverUserId,
        status: 'ACCEPTED',
        distanceMeters: 1000,
        durationSeconds: 300,
        priceVnd: 20000,
      },
    });

    // Try to change availability to AVAILABLE
    const res = await request(app.getHttpServer())
      .patch('/driver/availability')
      .set('Authorization', `Bearer ${driverSession.accessToken}`)
      .send({ availability: 'AVAILABLE' })
      .expect(409);

    expect(res.body.code).toBe('DRIVER_HAS_ACTIVE_ORDER');
  });
});
