import { ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import type { INestApplication } from '@nestjs/common';
import type { AddressInfo } from 'node:net';
import request from 'supertest';
import { io, type Socket } from 'socket.io-client';
import { DispatchSocketEvent, type DispatchOfferEvent } from '@leopard/shared';

import { AppModule } from '../src/app.module.js';
import { ApiExceptionFilter } from '../src/common/api-exception.filter.js';
import { PrismaService } from '../src/database/prisma.service.js';
import { TokenService } from '../src/auth/token.service.js';
import { RefreshSessionRepository } from '../src/auth/refresh-session.repository.js';
import { EstimateTokenService } from '../src/maps/domain/estimate-token.service.js';
import { DriversRepository } from '../src/drivers/drivers.repository.js';
import { resolveRealDbGeoGate } from './real-db-geo-gate.js';

interface AuthSessionBody {
  readonly accessToken: string;
}

const PICKUP = { latitude: 10.7326, longitude: 106.7168 };
const DROPOFF = { latitude: 10.8498, longitude: 106.7725 };

const { skipReason } = resolveRealDbGeoGate(process.env);
const describeRealDb = skipReason ? describe.skip : describe;

describeRealDb(
  skipReason
    ? `Dispatch broadcast — real-time offer over socket (skipped: ${skipReason})`
    : 'Dispatch broadcast — real-time offer over socket',
  () => {
    let app: INestApplication;
    let prisma: PrismaService;
    let driversRepository: DriversRepository;
    let estimateTokenService: EstimateTokenService;
    let customerSession: AuthSessionBody;
    let driverSession: AuthSessionBody;
    let fixtureUserIds: string[] = [];
    let socket: Socket | null = null;

    beforeAll(async () => {
      process.env = {
        ...process.env,
        NODE_ENV: 'test',
        AUTH_DEMO_LOGIN_ENABLED: 'true',
        AUTH_ACCESS_TOKEN_SECRET: 'test-access-token-secret',
        AUTH_REFRESH_TOKEN_SECRET: 'test-refresh-token-secret',
        ESTIMATE_TOKEN_HMAC_SECRET: 'test-estimate-token-secret-32-bytes',
      };

      const moduleFixture = await Test.createTestingModule({ imports: [AppModule] }).compile();

      app = moduleFixture.createNestApplication();
      app.useGlobalFilters(new ApiExceptionFilter());
      app.useGlobalPipes(
        new ValidationPipe({ forbidNonWhitelisted: true, transform: true, whitelist: true }),
      );
      await app.init();
      await app.listen(0);

      prisma = app.get(PrismaService);
      driversRepository = app.get(DriversRepository);
      estimateTokenService = app.get(EstimateTokenService);
      const tokenService = app.get(TokenService);
      const refreshSessions = app.get(RefreshSessionRepository);

      const runId = Date.now().toString().slice(-8);

      const customer = await prisma.user.create({
        data: { phone: `+8493${runId}`, role: 'CUSTOMER', status: 'ACTIVE' },
      });
      fixtureUserIds.push(customer.id);
      const customerRefreshSession = await refreshSessions.create(customer.id);
      customerSession = tokenService.createAuthSession(customer, customerRefreshSession);

      const driver = await prisma.user.create({
        data: { phone: `+8494${runId}`, role: 'DRIVER', status: 'ACTIVE' },
      });
      fixtureUserIds.push(driver.id);
      await prisma.driverProfile.create({
        data: { userId: driver.id, availability: 'AVAILABLE', vehicleType: 'MOTORBIKE' },
      });
      await driversRepository.updateLocation(driver.id, PICKUP.latitude, PICKUP.longitude);
      const driverRefreshSession = await refreshSessions.create(driver.id);
      driverSession = tokenService.createAuthSession(driver, driverRefreshSession);
    });

    afterEach(() => {
      if (socket) {
        socket.close();
        socket = null;
      }
    });

    afterAll(async () => {
      if (prisma && fixtureUserIds.length > 0) {
        await prisma.driverProfile.deleteMany({ where: { userId: { in: fixtureUserIds } } });
        await prisma.refreshSession.deleteMany({ where: { userId: { in: fixtureUserIds } } });
        await prisma.user.deleteMany({ where: { id: { in: fixtureUserIds } } });
      }
      if (app) await app.close();
    });

    it('pushes a dispatch:offer to a nearby AVAILABLE driver when a customer creates an order', async () => {
      const port = (app.getHttpServer().address() as AddressInfo).port;

      socket = io(`http://127.0.0.1:${port}/dispatch`, {
        auth: { token: driverSession.accessToken },
        transports: ['websocket'],
        forceNew: true,
      });

      await new Promise<void>((resolve, reject) => {
        socket!.on('connect', () => resolve());
        socket!.on('connect_error', (error) => reject(error));
      });

      const offerReceived = new Promise<DispatchOfferEvent>((resolve) => {
        socket!.on(DispatchSocketEvent.offer, resolve);
      });

      const token = estimateTokenService.issue({
        routeId: 'route-0',
        routeInput: {
          pickup: PICKUP,
          stops: [],
          dropoff: DROPOFF,
          vehicleType: 'MOTORBIKE',
        },
        estimate: {
          polyline: 'encoded_polyline',
          distanceM: 12_000,
          durationS: 1_500,
          estimatedArrivalAt: new Date(Date.now() + 1_500_000).toISOString(),
          estimatedPriceVnd: 68_000,
          source: 'DEMO',
          calculatedAt: new Date().toISOString(),
          isEstimate: true,
          congestionLevel: 'unknown',
        },
        quote: { amountVnd: 68_000, currency: 'VND' },
      });

      const createRes = await request(app.getHttpServer())
        .post('/orders')
        .set('Authorization', `Bearer ${customerSession.accessToken}`)
        .send({
          pickup: { address: 'Kho Sao Mai', lat: PICKUP.latitude, lng: PICKUP.longitude },
          dropoff: { address: 'Thủ Đức', lat: DROPOFF.latitude, lng: DROPOFF.longitude },
          vehicleType: 'MOTORBIKE',
          estimateToken: token,
        })
        .expect(201);

      const offer = await offerReceived;

      expect(offer.orderId).toBe(createRes.body.id);
      expect(offer.priceVnd).toBe(68_000);
      expect(offer.driverDistanceM).toBeLessThan(50);
    }, 15_000);
  },
);
