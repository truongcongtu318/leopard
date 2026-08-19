import { ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import type { INestApplication } from '@nestjs/common';
import request from 'supertest';

import { AppModule } from '../src/app.module.js';
import { ApiExceptionFilter } from '../src/common/api-exception.filter.js';
import { PrismaService } from '../src/database/prisma.service.js';
import { TokenService } from '../src/auth/token.service.js';
import { RefreshSessionRepository } from '../src/auth/refresh-session.repository.js';
import { EstimateTokenService } from '../src/maps/domain/estimate-token.service.js';
import { resolveRealDbRaceGate } from './real-db-race-gate.js';

interface AuthSessionBody {
  readonly accessToken: string;
}

const { skipReason } = resolveRealDbRaceGate(process.env);
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
    let customerSession: AuthSessionBody;
    let adminSession: AuthSessionBody;
    let estimateTokenService: EstimateTokenService;
    let fixtureUserIds: string[] = [];
    let fixtureOrderIds: string[] = [];

    async function cleanupOrders(): Promise<void> {
      if (fixtureOrderIds.length === 0) {
        return;
      }

      await prisma.orderStatusHistory.deleteMany({
        where: { orderId: { in: fixtureOrderIds } },
      });
      await prisma.paymentIntent.deleteMany({
        where: { orderId: { in: fixtureOrderIds } },
      });
      await prisma.orderStop.deleteMany({
        where: { orderId: { in: fixtureOrderIds } },
      });
      await prisma.auditLog.deleteMany({
        where: { resourceType: 'Order', resourceId: { in: fixtureOrderIds } },
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
        ESTIMATE_TOKEN_HMAC_SECRET: 'test-estimate-token-secret-32-bytes',
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
      estimateTokenService = app.get(EstimateTokenService);
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
      const customerRefreshSession = await refreshSessions.create(customer.id);
      customerSession = tokenService.createAuthSession(customer, customerRefreshSession);

      const admin = await prisma.user.create({
        data: {
          phone: `+8496${runId.slice(-8)}`,
          role: 'ADMIN',
          status: 'ACTIVE',
        },
      });
      fixtureUserIds.push(admin.id);
      const adminRefreshSession = await refreshSessions.create(admin.id);
      adminSession = tokenService.createAuthSession(admin, adminRefreshSession);

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

    it('accepts a concurrently requested order exactly once in 20 iterations', async () => {
      for (let iteration = 0; iteration < 20; iteration += 1) {
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
          driverSessions.slice(0, 2).map((session) =>
            request(app.getHttpServer())
              .post(`/driver/orders/${order.id}/accept`)
              .set('Authorization', `Bearer ${session.accessToken}`),
          ),
        );

        const statuses = responses.map((res) => res.status);
        expect(statuses.filter((status) => status === 200)).toHaveLength(1);
        expect(statuses.filter((status) => status === 409)).toHaveLength(1);
        expect(responses.find((response) => response.status === 409)?.body).toMatchObject({
          code: 'ORDER_ALREADY_ASSIGNED',
        });

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

        await cleanupOrders();
      }
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

    it('commits one audited Admin cancellation under concurrent retries', async () => {
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
      await prisma.driverProfile.update({
        where: { userId: driverUserIds[0] },
        data: { availability: 'BUSY' },
      });

      const responses = await Promise.all(
        ['real-db-admin-cancel-1', 'real-db-admin-cancel-2'].map((requestId) =>
          request(app.getHttpServer())
            .post(`/orders/${order.id}/cancel`)
            .set('Authorization', `Bearer ${adminSession.accessToken}`)
            .set('x-request-id', requestId)
            .send({ reason: 'Operations cancellation with mandatory audit' }),
        ),
      );

      expect(responses.map((response) => response.status).sort()).toEqual([200, 409]);
      await expect(prisma.order.findUnique({ where: { id: order.id } })).resolves.toMatchObject({
        status: 'CANCELLED',
      });
      await expect(
        prisma.orderStatusHistory.count({ where: { orderId: order.id, toStatus: 'CANCELLED' } }),
      ).resolves.toBe(1);
      const audits = await prisma.auditLog.findMany({
        where: { resourceType: 'Order', resourceId: order.id },
      });
      expect(audits).toHaveLength(1);
      expect(audits[0]).toMatchObject({
        action: 'ORDER_CANCELLED_BY_ADMIN',
        metadata: {
          reason: 'Operations cancellation with mandatory audit',
          requestId: expect.stringMatching(/^real-db-admin-cancel-[12]$/),
        },
      });
      await expect(
        prisma.driverProfile.findUnique({ where: { userId: driverUserIds[0] } }),
      ).resolves.toMatchObject({ availability: 'AVAILABLE' });
    });

    it('creates one order, initial history and payment intent for concurrent idempotent retries', async () => {
      const pickup = { latitude: 10.762622, longitude: 106.660172 };
      const dropoff = { latitude: 10.772622, longitude: 106.670172 };
      const estimateToken = estimateTokenService.issue({
        routeInput: { pickup, stops: [], dropoff, vehicleType: 'MOTORBIKE' },
        estimate: {
          polyline: 'real-db-idempotency',
          distanceM: 2500,
          durationS: 600,
          estimatedArrivalAt: new Date(Date.now() + 600_000).toISOString(),
          estimatedPriceVnd: 15_000,
          source: 'DEMO',
          calculatedAt: new Date().toISOString(),
          isEstimate: true,
        },
        quote: { amountVnd: 15_000, currency: 'VND' },
      });
      const clientRequestId = `real-db-create-${Date.now()}`;
      const body = {
        pickup: { address: 'Pickup', lat: pickup.latitude, lng: pickup.longitude },
        dropoff: { address: 'Dropoff', lat: dropoff.latitude, lng: dropoff.longitude },
        vehicleType: 'MOTORBIKE',
        estimateToken,
        clientRequestId,
      };

      const responses = await Promise.all([
        request(app.getHttpServer())
          .post('/orders')
          .set('Authorization', `Bearer ${customerSession.accessToken}`)
          .send(body),
        request(app.getHttpServer())
          .post('/orders')
          .set('Authorization', `Bearer ${customerSession.accessToken}`)
          .send(body),
      ]);

      expect(responses.map((response) => response.status)).toEqual([201, 201]);
      expect(responses[0]?.body.id).toBe(responses[1]?.body.id);
      const orderId = responses[0]?.body.id as string;
      fixtureOrderIds.push(orderId);

      await expect(
        prisma.order.count({ where: { customerId, clientRequestId } }),
      ).resolves.toBe(1);
      await expect(
        prisma.orderStatusHistory.count({ where: { orderId, toStatus: 'REQUESTED' } }),
      ).resolves.toBe(1);
      await expect(prisma.paymentIntent.count({ where: { orderId } })).resolves.toBe(1);
    });
  },
);
