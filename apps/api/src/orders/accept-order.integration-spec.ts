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

describe('AcceptOrder Integration Tests', () => {
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

    // Driver 1
    const d1 = await prismaMock.user.create({
      data: { phone: '+84911111111', role: 'DRIVER', status: 'ACTIVE' },
    });
    driver1UserId = d1.id;
    await prismaMock.driverProfile.create({
      data: { userId: d1.id, availability: 'AVAILABLE', vehicleType: 'MOTORBIKE' },
    });
    const s1 = await refreshSessions.create(d1.id);
    driver1Session = tokenService.createAuthSession(d1, s1);

    // Driver 2
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

  it('tests 20 concurrent order acceptance attempts by 2 drivers (exactly 1 driver wins)', async () => {
    for (let iteration = 0; iteration < 20; iteration++) {
      prismaMock.orders.clear();
      prismaMock.orderStops.clear();
      prismaMock.orderStatusHistories.clear();

      const order = await prismaMock.order.create({
        data: {
          customerId: 'customer-1',
          status: 'REQUESTED',
          distanceMeters: 1500,
          durationSeconds: 400,
          priceVnd: 25000,
        },
      });

      await prismaMock.driverProfile.update({
        where: { userId: driver1UserId },
        data: { availability: 'AVAILABLE' },
      });
      await prismaMock.driverProfile.update({
        where: { userId: driver2UserId },
        data: { availability: 'AVAILABLE' },
      });

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

      expect(['ORDER_ALREADY_ASSIGNED', 'DRIVER_BUSY']).toContain(loser.body.code);
    }
  });

  it('tests 1 driver attempting to accept 2 orders concurrently (exactly 1 order succeeds)', async () => {
    const orderA = await prismaMock.order.create({
      data: {
        customerId: 'customer-1',
        status: 'REQUESTED',
        distanceMeters: 1000,
        durationSeconds: 300,
        priceVnd: 20000,
      },
    });

    const orderB = await prismaMock.order.create({
      data: {
        customerId: 'customer-1',
        status: 'REQUESTED',
        distanceMeters: 2000,
        durationSeconds: 600,
        priceVnd: 40000,
      },
    });

    await prismaMock.driverProfile.update({
      where: { userId: driver1UserId },
      data: { availability: 'AVAILABLE' },
    });

    const [resA, resB] = await Promise.all([
      request(app.getHttpServer())
        .post(`/driver/orders/${orderA.id}/accept`)
        .set('Authorization', `Bearer ${driver1Session.accessToken}`),
      request(app.getHttpServer())
        .post(`/driver/orders/${orderB.id}/accept`)
        .set('Authorization', `Bearer ${driver1Session.accessToken}`),
    ]);

    const statuses = [resA.status, resB.status].sort();
    expect(statuses).toEqual([200, 409]);

    const winnerRes = resA.status === 200 ? resA : resB;
    const loserRes = resA.status === 409 ? resA : resB;

    expect(winnerRes.body.status).toBe('ACCEPTED');
    expect(winnerRes.body.driverId).toBe(driver1UserId);

    expect(loserRes.body).toMatchObject({
      code: 'DRIVER_BUSY',
      message: 'Lái xe không ở trạng thái sẵn sàng để nhận đơn',
    });

    const driver1Profile = await prismaMock.driverProfile.findUnique({
      where: { userId: driver1UserId },
    });
    expect(driver1Profile?.availability).toBe('BUSY');
  });
});

describe('Concurrency tests for Order Acceptance and Cancellation', () => {
  let app: import('@nestjs/common').INestApplication;
  let prismaMock: import('../../test/prisma-mock.js').InMemoryPrismaService;
  let tokenService: import('../auth/token.service.js').TokenService;
  let refreshSessions: import('../auth/refresh-session.repository.js').RefreshSessionRepository;

  beforeAll(async () => {
    // we use beforeAll because we just want to set this up once
    const { Test } = require('@nestjs/testing');
    const { ValidationPipe } = require('@nestjs/common');
    const { AppModule } = require('../app.module.js');
    const { ApiExceptionFilter } = require('../common/api-exception.filter.js');
    const { PrismaService } = require('../database/prisma.service.js');
    const { TokenService } = require('../auth/token.service.js');
    const { RefreshSessionRepository } = require('../auth/refresh-session.repository.js');
    const { InMemoryPrismaService } = require('../../test/prisma-mock.js');
    const request = require('supertest');

    process.env.NODE_ENV = 'test';
    process.env.AUTH_DEMO_LOGIN_ENABLED = 'true';

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

    tokenService = app.get(TokenService);
    refreshSessions = app.get(RefreshSessionRepository);
  });

  afterAll(async () => {
    if (app) {
      await app.close();
    }
  });

  it('tests 20 concurrent requests from 20 drivers for the same order, exactly 1 wins', async () => {
    const request = require('supertest');
    const order = await prismaMock.order.create({
      data: {
        customerId: 'customer-1',
        status: 'REQUESTED',
        distanceMeters: 1500,
        durationSeconds: 400,
        priceVnd: 25000,
      },
    });

    const driverSessions = [];
    for (let i = 0; i < 20; i++) {
      const d = await prismaMock.user.create({
        data: { phone: `+848000000${i.toString().padStart(2, '0')}`, role: 'DRIVER', status: 'ACTIVE' },
      });
      await prismaMock.driverProfile.create({
        data: { userId: d.id, availability: 'AVAILABLE', vehicleType: 'MOTORBIKE' },
      });
      const s = await refreshSessions.create(d.id);
      const session = tokenService.createAuthSession(d, s);
      driverSessions.push(session.accessToken);
    }

    const requests = driverSessions.map(token => 
      request(app.getHttpServer())
        .post(`/driver/orders/${order.id}/accept`)
        .set('Authorization', `Bearer ${token}`)
    );

    const responses = await Promise.all(requests);
    
    const statuses = responses.map(r => r.status);
    const successCount = statuses.filter(s => s === 200).length;
    const conflictCount = statuses.filter(s => s === 409).length;

    expect(successCount).toBe(1);
    expect(conflictCount).toBe(19);
  });

  it('tests race condition between driver accepting and customer cancelling', async () => {
    const request = require('supertest');
    
    const c = await prismaMock.user.create({
      data: { phone: '+84999999999', role: 'CUSTOMER', status: 'ACTIVE' },
    });
    const customerId = c.id;
    const sCustomer = await refreshSessions.create(c.id);
    const customerSession = tokenService.createAuthSession(c, sCustomer);

    // To properly catch race conditions, run it a few times
    for (let i = 0; i < 20; i++) {
      prismaMock.orders.clear();
      prismaMock.orderStops.clear();
      prismaMock.orderStatusHistories.clear();
      
      const order = await prismaMock.order.create({
        data: {
          customerId: customerId,
          status: 'REQUESTED',
          distanceMeters: 1500,
          durationSeconds: 400,
          priceVnd: 25000,
        },
      });
  
      const d = await prismaMock.user.create({
        data: { phone: `+84988888${i.toString().padStart(2, '0')}`, role: 'DRIVER', status: 'ACTIVE' },
      });
      await prismaMock.driverProfile.create({
        data: { userId: d.id, availability: 'AVAILABLE', vehicleType: 'MOTORBIKE' },
      });
      const s = await refreshSessions.create(d.id);
      const driverSession = tokenService.createAuthSession(d, s);
  
      const [acceptRes, cancelRes] = await Promise.all([
        request(app.getHttpServer())
          .post(`/driver/orders/${order.id}/accept`)
          .set('Authorization', `Bearer ${driverSession.accessToken}`),
        request(app.getHttpServer())
          .post(`/orders/${order.id}/cancel`)
          .set('Authorization', `Bearer ${customerSession.accessToken}`)
          .send({ reason: 'Changed my mind' })
      ]);
  
      const finalOrder = await prismaMock.order.findUnique({ where: { id: order.id } });
      const histories = Array.from(prismaMock.orderStatusHistories.values()).filter(h => h.orderId === order.id);
      
      const hasAccepted = histories.some(h => h.toStatus === 'ACCEPTED');
      const hasCancelled = histories.some(h => h.toStatus === 'CANCELLED');
      
       if (acceptRes.status === 200 && cancelRes.status === 200) {
          const cancelHistory = histories.find(h => h.toStatus === 'CANCELLED');
          if (cancelHistory && cancelHistory.fromStatus === 'REQUESTED' && hasAccepted) {
              throw new Error(`Race condition caught: Order was accepted but cancel recorded from REQUESTED`);
          }
      }
    }
  }, 15_000);
});
