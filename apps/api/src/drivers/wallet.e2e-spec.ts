// apps/api/src/drivers/wallet.e2e-spec.ts
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

describe('Driver Wallet API (E2E)', () => {
  let app: INestApplication;
  let driverSession: AuthSessionBody;
  let driverUserId: string;
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

    const moduleFixture = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(PrismaService)
      .useValue(prismaMock)
      .compile();

    app = moduleFixture.createNestApplication({ bodyParser: false });
    app.useGlobalFilters(new ApiExceptionFilter());
    app.useGlobalPipes(new ValidationPipe({ forbidNonWhitelisted: true, transform: true, whitelist: true }));
    await app.init();

    const tokenService = app.get(TokenService);
    const refreshSessions = app.get(RefreshSessionRepository);
    const driver = await prismaMock.user.create({ data: { phone: '+84911112222', role: 'DRIVER', status: 'ACTIVE' } });
    driverUserId = driver.id;
    await prismaMock.driverProfile.create({ data: { userId: driver.id, availability: 'OFFLINE', vehicleType: 'MOTORBIKE' } });
    const session = await refreshSessions.create(driver.id);
    driverSession = tokenService.createAuthSession(driver, session);
  });

  afterEach(async () => {
    if (app) await app.close();
  });

  it('returns a zeroed wallet summary for a driver with no delivered orders', async () => {
    const res = await request(app.getHttpServer())
      .get('/driver/wallet')
      .set('Authorization', `Bearer ${driverSession.accessToken}`)
      .expect(200);

    expect(res.body).toEqual({
      availableBalanceVnd: 0,
      lifetimeDeliveredVnd: 0,
      pendingWithdrawalVnd: 0,
      deliveredOrderCount: 0,
      bankName: null,
      bankAccountNumber: null,
      bankAccountName: null,
    });
  });

  it('reflects delivered-order revenue in the wallet summary', async () => {
    await prismaMock.order.create({
      data: { customerId: 'c1', driverId: driverUserId, status: 'DELIVERED', priceVnd: 250000 },
    });

    const res = await request(app.getHttpServer())
      .get('/driver/wallet')
      .set('Authorization', `Bearer ${driverSession.accessToken}`)
      .expect(200);

    expect(res.body.availableBalanceVnd).toBe(250000);
    expect(res.body.deliveredOrderCount).toBe(1);
  });

  it('creates a withdrawal request and reflects it as pending in the wallet summary', async () => {
    await prismaMock.order.create({
      data: { customerId: 'c1', driverId: driverUserId, status: 'DELIVERED', priceVnd: 300000 },
    });

    const createRes = await request(app.getHttpServer())
      .post('/driver/wallet/withdrawals')
      .set('Authorization', `Bearer ${driverSession.accessToken}`)
      .send({
        amountVnd: 100000,
        bankName: 'MB Bank',
        bankAccountNumber: '0987654321',
        bankAccountName: 'NGUYEN VAN A',
        clientRequestId: 'req-wd-1',
      })
      .expect(201);

    expect(createRes.body.status).toBe('PENDING');

    const summaryRes = await request(app.getHttpServer())
      .get('/driver/wallet')
      .set('Authorization', `Bearer ${driverSession.accessToken}`)
      .expect(200);

    expect(summaryRes.body.availableBalanceVnd).toBe(200000);
    expect(summaryRes.body.pendingWithdrawalVnd).toBe(100000);
  });

  it('rejects a withdrawal request exceeding the available balance with 409', async () => {
    await prismaMock.order.create({
      data: { customerId: 'c1', driverId: driverUserId, status: 'DELIVERED', priceVnd: 50000 },
    });

    const res = await request(app.getHttpServer())
      .post('/driver/wallet/withdrawals')
      .set('Authorization', `Bearer ${driverSession.accessToken}`)
      .send({
        amountVnd: 999999,
        bankName: 'MB Bank',
        bankAccountNumber: '0987654321',
        bankAccountName: 'NGUYEN VAN A',
        clientRequestId: 'req-wd-2',
      })
      .expect(409);

    expect(res.body.code).toBe('INSUFFICIENT_BALANCE');
  });

  it('replays the same withdrawal request idempotently via clientRequestId', async () => {
    await prismaMock.order.create({
      data: { customerId: 'c1', driverId: driverUserId, status: 'DELIVERED', priceVnd: 500000 },
    });
    const body = {
      amountVnd: 100000,
      bankName: 'MB Bank',
      bankAccountNumber: '0987654321',
      bankAccountName: 'NGUYEN VAN A',
      clientRequestId: 'req-wd-idempotent',
    };

    const first = await request(app.getHttpServer())
      .post('/driver/wallet/withdrawals')
      .set('Authorization', `Bearer ${driverSession.accessToken}`)
      .send(body)
      .expect(201);

    const second = await request(app.getHttpServer())
      .post('/driver/wallet/withdrawals')
      .set('Authorization', `Bearer ${driverSession.accessToken}`)
      .send(body)
      .expect(201);

    expect(second.body.id).toBe(first.body.id);

    const listRes = await request(app.getHttpServer())
      .get('/driver/wallet/withdrawals')
      .set('Authorization', `Bearer ${driverSession.accessToken}`)
      .expect(200);
    expect(listRes.body.items).toHaveLength(1); // no duplicate created
  });

  it('returns the canonical summary shape, not the legacy balanceVnd shape', async () => {
    const res = await request(app.getHttpServer())
      .get('/driver/wallet')
      .set('Authorization', `Bearer ${driverSession.accessToken}`)
      .expect(200);

    expect(res.body).toEqual({
      availableBalanceVnd: 0,
      lifetimeDeliveredVnd: 0,
      pendingWithdrawalVnd: 0,
      deliveredOrderCount: 0,
      bankName: null,
      bankAccountNumber: null,
      bankAccountName: null,
    });
  });

  it('returns 404 for the removed legacy POST /driver/payout', async () => {
    await request(app.getHttpServer())
      .post('/driver/payout')
      .set('Authorization', `Bearer ${driverSession.accessToken}`)
      .send({ amountVnd: 100000, clientRequestId: 'legacy-1' })
      .expect(404);
  });

  it('rejects Customer access to driver wallet routes with 403', async () => {
    const customer = await prismaMock.user.create({ data: { phone: '+84933334444', role: 'CUSTOMER', status: 'ACTIVE' } });
    const tokenService = app.get(TokenService);
    const refreshSessions = app.get(RefreshSessionRepository);
    const session = await refreshSessions.create(customer.id);
    const customerSession = tokenService.createAuthSession(customer, session);

    await request(app.getHttpServer())
      .get('/driver/wallet')
      .set('Authorization', `Bearer ${customerSession.accessToken}`)
      .expect(403);
  });
});
