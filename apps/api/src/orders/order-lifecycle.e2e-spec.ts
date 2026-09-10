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
import { DeliveryProofReader } from './domain/delivery-proof-reader.js';

interface AuthSessionBody {
  readonly accessToken: string;
}

class TestDeliveryProofReader implements DeliveryProofReader {
  public mockHasProof = false;

  async hasDeliveryProof(_orderId: string): Promise<boolean> {
    return this.mockHasProof;
  }
}

class TransactionVisibilityPrismaService extends InMemoryPrismaService {
  public failAuditWrites = false;

  async $transaction<T>(fn: (tx: InMemoryPrismaService) => Promise<T>): Promise<T> {
    const tx = new InMemoryPrismaService();
    tx.users = new Map(this.users);
    tx.refreshSessions = new Map(this.refreshSessions);
    tx.driverProfiles = new Map(this.driverProfiles);
    tx.fleetMembers = new Map(this.fleetMembers);
    tx.orders = new Map(this.orders);
    tx.orderStops = new Map(this.orderStops);
    tx.orderStatusHistories = new Map(this.orderStatusHistories);
    tx.paymentIntents = new Map(this.paymentIntents);
    tx.auditLogs = new Map(this.auditLogs);
    if (this.failAuditWrites) {
      tx.auditLog.create.mockRejectedValueOnce(new Error('audit unavailable'));
    }

    const result = await fn(tx);

    this.users = tx.users;
    this.refreshSessions = tx.refreshSessions;
    this.driverProfiles = tx.driverProfiles;
    this.fleetMembers = tx.fleetMembers;
    this.orders = tx.orders;
    this.orderStops = tx.orderStops;
    this.orderStatusHistories = tx.orderStatusHistories;
    this.paymentIntents = tx.paymentIntents;
    this.auditLogs = tx.auditLogs;

    return result;
  }
}

describe('Order Lifecycle & Audited Cancellation REST API (E2E)', () => {
  let app: INestApplication;
  let customerSession: AuthSessionBody;
  let driverSession: AuthSessionBody;
  let adminSession: AuthSessionBody;
  let customerUserId: string;
  let driverUserId: string;
  let adminUserId: string;
  let proofReader: TestDeliveryProofReader;
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
    proofReader = new TestDeliveryProofReader();

    const moduleFixture = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(PrismaService)
      .useValue(prismaMock)
      .overrideProvider(DeliveryProofReader)
      .useValue(proofReader)
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
    const cUser = await prismaMock.user.create({
      data: { phone: '+84910000001', role: 'CUSTOMER', status: 'ACTIVE' },
    });
    customerUserId = cUser.id;
    const cSess = await refreshSessions.create(cUser.id);
    customerSession = tokenService.createAuthSession(cUser, cSess);

    // Driver
    const dUser = await prismaMock.user.create({
      data: { phone: '+84910000002', role: 'DRIVER', status: 'ACTIVE' },
    });
    driverUserId = dUser.id;
    await prismaMock.driverProfile.create({
      data: { userId: dUser.id, availability: 'AVAILABLE', vehicleType: 'MOTORBIKE' },
    });
    const dSess = await refreshSessions.create(dUser.id);
    driverSession = tokenService.createAuthSession(dUser, dSess);

    // Admin
    const aUser = await prismaMock.user.create({
      data: { phone: '+84910000003', role: 'ADMIN', status: 'ACTIVE' },
    });
    adminUserId = aUser.id;
    const aSess = await refreshSessions.create(aUser.id);
    adminSession = tokenService.createAuthSession(aUser, aSess);
  });

  afterEach(async () => {
    if (app) {
      await app.close();
    }
  });

  it('runs full lifecycle: ACCEPTED -> PICKING_UP -> IN_TRANSIT -> DELIVERED with proof', async () => {
    const order = await prismaMock.order.create({
      data: { customerId: customerUserId, status: 'REQUESTED', distanceMeters: 1000, durationSeconds: 300, priceVnd: 20000 },
    });

    // Driver accepts order
    await request(app.getHttpServer())
      .post(`/driver/orders/${order.id}/accept`)
      .set('Authorization', `Bearer ${driverSession.accessToken}`)
      .expect(200);

    // Update to PICKING_UP
    const pickRes = await request(app.getHttpServer())
      .post(`/driver/orders/${order.id}/status`)
      .set('Authorization', `Bearer ${driverSession.accessToken}`)
      .send({ status: 'PICKING_UP', clientRequestId: 'req-1' })
      .expect(200);

    expect(pickRes.body.status).toBe('PICKING_UP');

    // Update to IN_TRANSIT
    const transitRes = await request(app.getHttpServer())
      .post(`/driver/orders/${order.id}/status`)
      .set('Authorization', `Bearer ${driverSession.accessToken}`)
      .send({ status: 'IN_TRANSIT', clientRequestId: 'req-2' })
      .expect(200);

    expect(transitRes.body.status).toBe('IN_TRANSIT');

    // Attempt DELIVERED without proof -> 409
    proofReader.mockHasProof = false;
    await request(app.getHttpServer())
      .post(`/driver/orders/${order.id}/status`)
      .set('Authorization', `Bearer ${driverSession.accessToken}`)
      .send({ status: 'DELIVERED', clientRequestId: 'req-3' })
      .expect(409);

    // Provide proof & update to DELIVERED -> 200
    proofReader.mockHasProof = true;
    const delivRes = await request(app.getHttpServer())
      .post(`/driver/orders/${order.id}/status`)
      .set('Authorization', `Bearer ${driverSession.accessToken}`)
      .send({ status: 'DELIVERED', clientRequestId: 'req-4' })
      .expect(200);

    expect(delivRes.body.status).toBe('DELIVERED');

    // Driver profile should be back to AVAILABLE
    const profile = await prismaMock.driverProfile.findUnique({ where: { userId: driverUserId } });
    expect(profile?.availability).toBe('AVAILABLE');
  });

  it('returns the first status result when replaying a clientRequestId with a different status', async () => {
    const order = await prismaMock.order.create({
      data: {
        customerId: customerUserId,
        driverId: driverUserId,
        status: 'ACCEPTED',
        distanceMeters: 1000,
        durationSeconds: 300,
        priceVnd: 20000,
      },
    });

    const firstRes = await request(app.getHttpServer())
      .post(`/driver/orders/${order.id}/status`)
      .set('Authorization', `Bearer ${driverSession.accessToken}`)
      .send({ status: 'PICKING_UP', clientRequestId: 'status-replay-1' })
      .expect(200);

    const replayRes = await request(app.getHttpServer())
      .post(`/driver/orders/${order.id}/status`)
      .set('Authorization', `Bearer ${driverSession.accessToken}`)
      .send({ status: 'IN_TRANSIT', clientRequestId: 'status-replay-1' })
      .expect(200);

    expect(replayRes.body.status).toBe(firstRes.body.status);
    expect(replayRes.body.status).toBe('PICKING_UP');

    const histories = Array.from(prismaMock.orderStatusHistories.values()).filter(
      (history) => history.orderId === order.id && history.toStatus === 'PICKING_UP',
    );
    expect(histories).toHaveLength(1);
  });

  it('allows only one concurrent status transition from the same observed state', async () => {
    const order = await prismaMock.order.create({
      data: {
        customerId: customerUserId,
        driverId: driverUserId,
        status: 'ACCEPTED',
        distanceMeters: 1000,
        durationSeconds: 300,
        priceVnd: 20000,
      },
    });

    const [firstRes, secondRes] = await Promise.all([
      request(app.getHttpServer())
        .post(`/driver/orders/${order.id}/status`)
        .set('Authorization', `Bearer ${driverSession.accessToken}`)
        .send({ status: 'PICKING_UP', clientRequestId: 'status-race-1' }),
      request(app.getHttpServer())
        .post(`/driver/orders/${order.id}/status`)
        .set('Authorization', `Bearer ${driverSession.accessToken}`)
        .send({ status: 'PICKING_UP', clientRequestId: 'status-race-2' }),
    ]);

    expect([firstRes.status, secondRes.status].sort()).toEqual([200, 409]);

    const histories = Array.from(prismaMock.orderStatusHistories.values()).filter(
      (history) => history.orderId === order.id && history.toStatus === 'PICKING_UP',
    );
    expect(histories).toHaveLength(1);
    expect(histories[0]).toMatchObject({
      fromStatus: 'ACCEPTED',
      toStatus: 'PICKING_UP',
      actorId: driverUserId,
    });
  });

  it('allows Customer to cancel order in REQUESTED state', async () => {
    const order = await prismaMock.order.create({
      data: { customerId: customerUserId, status: 'REQUESTED', distanceMeters: 1000, durationSeconds: 300, priceVnd: 20000 },
    });

    const cancelRes = await request(app.getHttpServer())
      .post(`/orders/${order.id}/cancel`)
      .set('Authorization', `Bearer ${customerSession.accessToken}`)
      .send({})
      .expect(200);

    expect(cancelRes.body.status).toBe('CANCELLED');
  });

  it('allows Admin to cancel order in ACCEPTED state with reason and resets driver availability', async () => {
    const order = await prismaMock.order.create({
      data: { customerId: customerUserId, status: 'REQUESTED', distanceMeters: 1000, durationSeconds: 300, priceVnd: 20000 },
    });

    // Accept order
    await request(app.getHttpServer())
      .post(`/driver/orders/${order.id}/accept`)
      .set('Authorization', `Bearer ${driverSession.accessToken}`)
      .expect(200);

    // Admin cancels with reason
    const cancelRes = await request(app.getHttpServer())
      .post(`/orders/${order.id}/cancel`)
      .set('Authorization', `Bearer ${adminSession.accessToken}`)
      .set('x-request-id', 'admin-cancel-request-1')
      .send({ reason: 'Customer requested cancellation via phone' })
      .expect(200);

    expect(cancelRes.body.status).toBe('CANCELLED');

    const profile = await prismaMock.driverProfile.findUnique({ where: { userId: driverUserId } });
    expect(profile?.availability).toBe('AVAILABLE');
    expect(Array.from(prismaMock.auditLogs.values())).toEqual([
      expect.objectContaining({
        actorId: adminUserId,
        action: 'ORDER_CANCELLED_BY_ADMIN',
        resourceType: 'Order',
        resourceId: order.id,
        metadata: {
          reason: 'Customer requested cancellation via phone',
          requestId: 'admin-cancel-request-1',
        },
      }),
    ]);
  });

  it('rejects an empty Admin cancellation reason with validation details', async () => {
    const order = await prismaMock.order.create({
      data: {
        customerId: customerUserId,
        status: 'REQUESTED',
        distanceMeters: 1000,
        durationSeconds: 300,
        priceVnd: 20000,
      },
    });

    const response = await request(app.getHttpServer())
      .post(`/orders/${order.id}/cancel`)
      .set('Authorization', `Bearer ${adminSession.accessToken}`)
      .send({ reason: '   ' })
      .expect(422);

    expect(response.body).toMatchObject({ code: 'VALIDATION_ERROR' });
    expect(prismaMock.orders.get(order.id)?.status).toBe('REQUESTED');
    expect(prismaMock.auditLogs.size).toBe(0);
  });
});

describe('Order transaction response consistency', () => {
  let app: INestApplication;
  let customerSession: AuthSessionBody;
  let driverSession: AuthSessionBody;
  let adminSession: AuthSessionBody;
  let customerUserId: string;
  let driverUserId: string;
  let prismaMock: TransactionVisibilityPrismaService;

  beforeEach(async () => {
    process.env = {
      ...process.env,
      NODE_ENV: 'test',
      AUTH_DEMO_LOGIN_ENABLED: 'true',
      AUTH_ACCESS_TOKEN_SECRET: 'test-access-token-secret',
      AUTH_REFRESH_TOKEN_SECRET: 'test-refresh-token-secret',
    };

    prismaMock = new TransactionVisibilityPrismaService();

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

    const customer = await prismaMock.user.create({
      data: { phone: '+84910000101', role: 'CUSTOMER', status: 'ACTIVE' },
    });
    customerUserId = customer.id;
    const customerRefreshSession = await refreshSessions.create(customer.id);
    customerSession = tokenService.createAuthSession(customer, customerRefreshSession);

    const driver = await prismaMock.user.create({
      data: { phone: '+84910000102', role: 'DRIVER', status: 'ACTIVE' },
    });
    driverUserId = driver.id;
    await prismaMock.driverProfile.create({
      data: { userId: driver.id, availability: 'AVAILABLE', vehicleType: 'MOTORBIKE' },
    });
    const driverRefreshSession = await refreshSessions.create(driver.id);
    driverSession = tokenService.createAuthSession(driver, driverRefreshSession);

    const admin = await prismaMock.user.create({
      data: { phone: '+84910000103', role: 'ADMIN', status: 'ACTIVE' },
    });
    const adminRefreshSession = await refreshSessions.create(admin.id);
    adminSession = tokenService.createAuthSession(admin, adminRefreshSession);
  });

  afterEach(async () => {
    if (app) {
      await app.close();
    }
  });

  it('returns accepted order state and history written in the same transaction', async () => {
    const order = await prismaMock.order.create({
      data: {
        customerId: customerUserId,
        status: 'REQUESTED',
        distanceMeters: 1000,
        durationSeconds: 300,
        priceVnd: 20000,
      },
    });

    const response = await request(app.getHttpServer())
      .post(`/driver/orders/${order.id}/accept`)
      .set('Authorization', `Bearer ${driverSession.accessToken}`)
      .expect(200);

    expect(response.body).toMatchObject({
      id: order.id,
      status: 'ACCEPTED',
      driverId: driverUserId,
    });
    expect(response.body.statusHistory).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          fromStatus: 'REQUESTED',
          toStatus: 'ACCEPTED',
          actorId: driverUserId,
        }),
      ]),
    );
  });

  it('returns cancelled order state and history written in the same transaction', async () => {
    const order = await prismaMock.order.create({
      data: {
        customerId: customerUserId,
        driverId: driverUserId,
        status: 'ACCEPTED',
        distanceMeters: 1000,
        durationSeconds: 300,
        priceVnd: 20000,
      },
    });

    const response = await request(app.getHttpServer())
      .post(`/orders/${order.id}/cancel`)
      .set('Authorization', `Bearer ${adminSession.accessToken}`)
      .send({ reason: 'Customer requested cancellation via phone' })
      .expect(200);

    expect(response.body.status).toBe('CANCELLED');
    expect(response.body.statusHistory).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          fromStatus: 'ACCEPTED',
          toStatus: 'CANCELLED',
          actorId: expect.any(String),
          reason: 'Customer requested cancellation via phone',
        }),
      ]),
    );
  });

  it('rolls back order, Driver availability and history when the Admin audit write fails', async () => {
    const order = await prismaMock.order.create({
      data: {
        customerId: customerUserId,
        driverId: driverUserId,
        status: 'ACCEPTED',
        distanceMeters: 1000,
        durationSeconds: 300,
        priceVnd: 20000,
      },
    });
    await prismaMock.driverProfile.update({
      where: { userId: driverUserId },
      data: { availability: 'BUSY' },
    });
    prismaMock.failAuditWrites = true;

    await request(app.getHttpServer())
      .post(`/orders/${order.id}/cancel`)
      .set('Authorization', `Bearer ${adminSession.accessToken}`)
      .send({ reason: 'Operations cancellation with mandatory audit' })
      .expect(500);

    expect(prismaMock.orders.get(order.id)?.status).toBe('ACCEPTED');
    expect(
      (await prismaMock.driverProfile.findUnique({ where: { userId: driverUserId } }))
        ?.availability,
    ).toBe('BUSY');
    expect(
      Array.from(prismaMock.orderStatusHistories.values()).filter(
        (history) => history.orderId === order.id && history.toStatus === 'CANCELLED',
      ),
    ).toHaveLength(0);
    expect(prismaMock.auditLogs.size).toBe(0);
  });

  it('returns status transition state and history written in the same transaction', async () => {
    const order = await prismaMock.order.create({
      data: {
        customerId: customerUserId,
        driverId: driverUserId,
        status: 'ACCEPTED',
        distanceMeters: 1000,
        durationSeconds: 300,
        priceVnd: 20000,
      },
    });

    const response = await request(app.getHttpServer())
      .post(`/driver/orders/${order.id}/status`)
      .set('Authorization', `Bearer ${driverSession.accessToken}`)
      .send({ status: 'PICKING_UP', clientRequestId: 'status-transaction-read' })
      .expect(200);

    expect(response.body.status).toBe('PICKING_UP');
    expect(response.body.statusHistory).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          fromStatus: 'ACCEPTED',
          toStatus: 'PICKING_UP',
          actorId: driverUserId,
        }),
      ]),
    );
  });
});
