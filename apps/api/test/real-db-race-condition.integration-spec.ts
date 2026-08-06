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

const optInEnvName = 'LEOPARD_REAL_DB_RACE_TEST';
const requiredDatabaseName = 'leopard_real_db_race_test';

function getSkipReason(): string | null {
  if (process.env[optInEnvName] !== 'true') {
    return `set ${optInEnvName}=true and DATABASE_URL to a disposable ${requiredDatabaseName} database`;
  }

  if (!process.env.DATABASE_URL) {
    return 'DATABASE_URL is required for the opted-in real database race suite';
  }

  const databaseName = new URL(process.env.DATABASE_URL).pathname.replace(/^\//, '');

  if (databaseName !== requiredDatabaseName) {
    return `DATABASE_URL must point to disposable database ${requiredDatabaseName}; got ${databaseName}`;
  }

  return null;
}

const skipReason = getSkipReason();
const describeRealDb = skipReason ? describe.skip : describe;

describeRealDb(
  skipReason
    ? `Real DB Race-Safe Order Consistency (skipped: ${skipReason})`
    : 'Real DB Race-Safe Order Consistency',
  () => {
    let app: INestApplication;
    let prisma: PrismaService;
    let driverSessions: AuthSessionBody[] = [];
    let driverUserIds: string[] = [];
    let customerId: string;
    let fixtureUserIds: string[] = [];
    let fixtureOrderIds: string[] = [];

    async function cleanupOrders(): Promise<void> {
      if (fixtureOrderIds.length === 0) {
        return;
      }

      await prisma.orderStatusHistory.deleteMany({
        where: { orderId: { in: fixtureOrderIds } },
      });
      await prisma.orderStop.deleteMany({
        where: { orderId: { in: fixtureOrderIds } },
      });
      await prisma.order.deleteMany({
        where: { id: { in: fixtureOrderIds } },
      });
      await prisma.driverProfile.updateMany({
        where: { userId: { in: driverUserIds } },
        data: { availability: 'AVAILABLE' },
      });
      fixtureOrderIds = [];
    }

    async function cleanupFixtures(): Promise<void> {
      await cleanupOrders();

      if (fixtureUserIds.length === 0) {
        return;
      }

      await prisma.driverProfile.deleteMany({
        where: { userId: { in: fixtureUserIds } },
      });
      await prisma.refreshSession.deleteMany({
        where: { userId: { in: fixtureUserIds } },
      });
      await prisma.user.deleteMany({
        where: { id: { in: fixtureUserIds } },
      });
      fixtureUserIds = [];
      driverUserIds = [];
      driverSessions = [];
    }

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
      await cleanupFixtures();

      const runId = Date.now().toString();
      const customer = await prisma.user.create({
        data: {
          phone: `+8497${runId.slice(-8)}`,
          role: 'CUSTOMER',
          status: 'ACTIVE',
        },
      });
      customerId = customer.id;
      fixtureUserIds.push(customer.id);

      for (let i = 0; i < 20; i++) {
        const driver = await prisma.user.create({
          data: {
            phone: `+8498${runId.slice(-6)}${i.toString().padStart(2, '0')}`,
            role: 'DRIVER',
            status: 'ACTIVE',
          },
        });
        fixtureUserIds.push(driver.id);
        driverUserIds.push(driver.id);

        await prisma.driverProfile.create({
          data: {
            userId: driver.id,
            availability: 'AVAILABLE',
            vehicleType: 'MOTORBIKE',
          },
        });
        const refreshSession = await refreshSessions.create(driver.id);
        driverSessions.push(tokenService.createAuthSession(driver, refreshSession));
      }
    });

    afterEach(async () => {
      await cleanupOrders();
    });

    afterAll(async () => {
      if (prisma) {
        await cleanupFixtures();
      }
      if (app) {
        await app.close();
      }
    });

    it('accepts a concurrently requested order exactly once', async () => {
      const order = await prisma.order.create({
        data: {
          customerId,
          status: 'REQUESTED',
          distanceMeters: 1500,
          durationSeconds: 400,
          priceVnd: 25000,
        },
      });
      fixtureOrderIds.push(order.id);

      const responses = await Promise.all(
        driverSessions.map((session) =>
          request(app.getHttpServer())
            .post(`/driver/orders/${order.id}/accept`)
            .set('Authorization', `Bearer ${session.accessToken}`),
        ),
      );

      const statuses = responses.map((res) => res.status);
      expect(statuses.filter((status) => status === 200)).toHaveLength(1);
      expect(statuses.filter((status) => status === 409)).toHaveLength(19);

      const finalOrder = await prisma.order.findUnique({
        where: { id: order.id },
      });
      const histories = await prisma.orderStatusHistory.findMany({
        where: { orderId: order.id, toStatus: 'ACCEPTED' },
      });
      const winnerResponse = responses.find((res) => res.status === 200);

      expect(winnerResponse?.body).toMatchObject({
        id: order.id,
        status: 'ACCEPTED',
        driverId: expect.any(String),
      });
      expect(finalOrder?.status).toBe('ACCEPTED');
      expect(finalOrder?.driverId).toBe(winnerResponse?.body.driverId);
      expect(histories).toHaveLength(1);
      expect(histories[0]).toMatchObject({
        fromStatus: 'REQUESTED',
        toStatus: 'ACCEPTED',
        actorId: winnerResponse?.body.driverId,
      });
    });

    it('keeps concurrent status updates and history in one outcome', async () => {
      const order = await prisma.order.create({
        data: {
          customerId,
          driverId: driverUserIds[0],
          status: 'ACCEPTED',
          distanceMeters: 1500,
          durationSeconds: 400,
          priceVnd: 25000,
        },
      });
      fixtureOrderIds.push(order.id);

      const [firstResponse, secondResponse] = await Promise.all([
        request(app.getHttpServer())
          .post(`/driver/orders/${order.id}/status`)
          .set('Authorization', `Bearer ${driverSessions[0].accessToken}`)
          .send({ status: 'PICKING_UP', clientRequestId: 'real-db-status-1' }),
        request(app.getHttpServer())
          .post(`/driver/orders/${order.id}/status`)
          .set('Authorization', `Bearer ${driverSessions[0].accessToken}`)
          .send({ status: 'PICKING_UP', clientRequestId: 'real-db-status-2' }),
      ]);

      expect([firstResponse.status, secondResponse.status].sort()).toEqual([200, 409]);

      const finalOrder = await prisma.order.findUnique({
        where: { id: order.id },
      });
      const histories = await prisma.orderStatusHistory.findMany({
        where: { orderId: order.id, toStatus: 'PICKING_UP' },
      });

      expect(finalOrder?.status).toBe('PICKING_UP');
      expect(histories).toHaveLength(1);
      expect(histories[0]).toMatchObject({
        fromStatus: 'ACCEPTED',
        toStatus: 'PICKING_UP',
        actorId: driverUserIds[0],
      });
    });
  },
);
