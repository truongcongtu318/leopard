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

describe('Race-Safe Order Acceptance (Integration)', () => {
  let app: INestApplication;
  let driver1Session: AuthSessionBody;
  let driver2Session: AuthSessionBody;
  let driver1UserId: string;
  let driver2UserId: string;
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

    // Create Driver 1
    const d1 = await prismaMock.user.create({
      data: { phone: '+84911111111', role: 'DRIVER', status: 'ACTIVE' },
    });
    driver1UserId = d1.id;
    await prismaMock.driverProfile.create({
      data: { userId: d1.id, availability: 'AVAILABLE', vehicleType: 'MOTORBIKE' },
    });
    const s1 = await refreshSessions.create(d1.id);
    driver1Session = tokenService.createAuthSession(d1, s1);

    // Create Driver 2
    const d2 = await prismaMock.user.create({
      data: { phone: '+84922222222', role: 'DRIVER', status: 'ACTIVE' },
    });
    driver2UserId = d2.id;
    await prismaMock.driverProfile.create({
      data: { userId: d2.id, availability: 'AVAILABLE', vehicleType: 'MOTORBIKE' },
    });
    const s2 = await refreshSessions.create(d2.id);
    driver2Session = tokenService.createAuthSession(d2, s2);
  });

  afterEach(async () => {
    if (app) {
      await app.close();
    }
  });

  it('ensures atomic acceptance: exactly one driver succeeds (200) and the other gets 409', async () => {
    for (let iteration = 0; iteration < 20; iteration++) {
      // Clear previous orders for clean iteration
      prismaMock.orders.clear();
      prismaMock.orderStops.clear();
      prismaMock.orderStatusHistories.clear();

      // Create a new REQUESTED order
      const order = await prismaMock.order.create({
        data: {
          customerId: 'customer-1',
          status: 'REQUESTED',
          distanceMeters: 1500,
          durationSeconds: 400,
          priceVnd: 25000,
        },
      });

      // Reset driver profiles to AVAILABLE and clear active assignments for clean iteration
      await prismaMock.driverProfile.update({
        where: { userId: driver1UserId },
        data: { availability: 'AVAILABLE' },
      });
      await prismaMock.driverProfile.update({
        where: { userId: driver2UserId },
        data: { availability: 'AVAILABLE' },
      });

      // Concurrent accept requests
      const [res1, res2] = await Promise.all([
        request(app.getHttpServer())
          .post(`/driver/orders/${order.id}/accept`)
          .set('Authorization', `Bearer ${driver1Session.accessToken}`),
        request(app.getHttpServer())
          .post(`/driver/orders/${order.id}/accept`)
          .set('Authorization', `Bearer ${driver2Session.accessToken}`),
      ]);

      const statuses = [res1.status, res2.status].sort();
      expect(statuses).toEqual([200, 409]);

      const winner = res1.status === 200 ? res1 : res2;
      const loser = res1.status === 409 ? res1 : res2;

      expect(winner.body).toMatchObject({
        id: order.id,
        status: 'ACCEPTED',
        driverId: expect.any(String),
      });

      expect(loser.body).toMatchObject({
        code: 'ORDER_ALREADY_ASSIGNED',
      });
    }
  });

  it('rejects driver who is OFFLINE or already has an active order with 409', async () => {
    const order = await prismaMock.order.create({
      data: {
        customerId: 'customer-1',
        status: 'REQUESTED',
        distanceMeters: 1000,
        durationSeconds: 300,
        priceVnd: 20000,
      },
    });

    // Set Driver 1 to OFFLINE
    await prismaMock.driverProfile.update({
      where: { userId: driver1UserId },
      data: { availability: 'OFFLINE' },
    });

    await request(app.getHttpServer())
      .post(`/driver/orders/${order.id}/accept`)
      .set('Authorization', `Bearer ${driver1Session.accessToken}`)
      .expect(409)
      .expect(({ body }) => {
        expect(body.code).toBe('DRIVER_HAS_ACTIVE_ORDER');
      });
  });
});
