import { ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import type { INestApplication } from '@nestjs/common';
import request from 'supertest';

import { AppModule } from '../src/app.module.js';
import { ApiExceptionFilter } from '../src/common/api-exception.filter.js';
import { PrismaService } from '../src/database/prisma.service.js';
import { TokenService } from '../src/auth/token.service.js';
import { RefreshSessionRepository } from '../src/auth/refresh-session.repository.js';

interface AuthSessionBody {
  readonly accessToken: string;
}

describe('Real DB Race-Safe Order Acceptance (Integration)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let driverSessions: AuthSessionBody[] = [];
  let customerId: string;

  beforeAll(async () => {
    process.env = {
      ...process.env,
      NODE_ENV: 'test',
      AUTH_DEMO_LOGIN_ENABLED: 'true',
      AUTH_ACCESS_TOKEN_SECRET: 'test-access-token-secret',
      AUTH_REFRESH_TOKEN_SECRET: 'test-refresh-token-secret',
    };

    const moduleFixture = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

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

    prisma = app.get(PrismaService);
    const tokenService = app.get(TokenService);
    const refreshSessions = app.get(RefreshSessionRepository);

    // Clean DB before test
    await prisma.orderStatusHistory.deleteMany();
    await prisma.orderStop.deleteMany();
    await prisma.order.deleteMany();
    await prisma.driverProfile.deleteMany();
    await prisma.refreshSession.deleteMany();
    await prisma.user.deleteMany();

    // Create a customer
    const c = await prisma.user.create({
      data: { phone: '+84999999999', role: 'CUSTOMER', status: 'ACTIVE' },
    });
    customerId = c.id;

    // Create 20 Drivers
    for (let i = 0; i < 20; i++) {
      const phone = `+849000000${i.toString().padStart(2, '0')}`;
      const d = await prisma.user.create({
        data: { phone, role: 'DRIVER', status: 'ACTIVE' },
      });
      await prisma.driverProfile.create({
        data: { userId: d.id, availability: 'AVAILABLE', vehicleType: 'MOTORBIKE' },
      });
      const s = await refreshSessions.create(d.id);
      const session = tokenService.createAuthSession(d, s);
      driverSessions.push(session);
    }
  });

  afterAll(async () => {
    if (prisma) {
      // Clean DB after test
      await prisma.orderStatusHistory.deleteMany();
      await prisma.orderStop.deleteMany();
      await prisma.order.deleteMany();
      await prisma.driverProfile.deleteMany();
      await prisma.refreshSession.deleteMany();
      await prisma.user.deleteMany();
    }
    if (app) {
      await app.close();
    }
  });

  it('ensures atomic acceptance: exactly one driver succeeds (200) and 19 get 409', async () => {
    // Create a new REQUESTED order
    const order = await prisma.order.create({
      data: {
        customerId,
        status: 'REQUESTED',
        distanceMeters: 1500,
        durationSeconds: 400,
        priceVnd: 25000,
      },
    });

    // 20 Concurrent accept requests
    const requests = driverSessions.map((session) =>
      request(app.getHttpServer())
        .post(`/driver/orders/${order.id}/accept`)
        .set('Authorization', `Bearer ${session.accessToken}`),
    );

    const responses = await Promise.all(requests);
    const statuses = responses.map((res) => res.status);

    const successes = statuses.filter((s) => s === 200).length;
    const conflicts = statuses.filter((s) => s === 409).length;

    expect(successes).toBe(1);
    expect(conflicts).toBe(19);

    const winnerResponse = responses.find((res) => res.status === 200);
    expect(winnerResponse).toBeDefined();
    expect(winnerResponse?.body).toMatchObject({
      id: order.id,
      status: 'ACCEPTED',
      driverId: expect.any(String),
    });
  });
});
