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

describe('ReportOrderIncident Integration Tests', () => {
  let app: INestApplication;
  let driverSession: AuthSessionBody;
  let otherDriverSession: AuthSessionBody;
  let driverUserId: string;
  let otherDriverUserId: string;
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

    app = moduleFixture.createNestApplication({ bodyParser: false });
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

    // Assigned driver
    const d1 = await prismaMock.user.create({
      data: { phone: '+84911111111', role: 'DRIVER', status: 'ACTIVE' },
    });
    driverUserId = d1.id;
    await prismaMock.driverProfile.create({
      data: { userId: d1.id, availability: 'BUSY', vehicleType: 'MOTORBIKE' },
    });
    const s1 = await refreshSessions.create(d1.id);
    driverSession = tokenService.createAuthSession(d1, s1);

    // Another driver
    const d2 = await prismaMock.user.create({
      data: { phone: '+84922222222', role: 'DRIVER', status: 'ACTIVE' },
    });
    otherDriverUserId = d2.id;
    await prismaMock.driverProfile.create({
      data: { userId: d2.id, availability: 'AVAILABLE', vehicleType: 'MOTORBIKE' },
    });
    const s2 = await refreshSessions.create(d2.id);
    otherDriverSession = tokenService.createAuthSession(d2, s2);
  });

  afterEach(async () => {
    if (app) {
      await app.close();
    }
  });

  it('routes an IN_TRANSIT incident to RETURNING (cargo already picked up) and releases driver to AVAILABLE', async () => {
    const order = await prismaMock.order.create({
      data: {
        customerId: 'customer-1',
        driverId: driverUserId,
        status: 'IN_TRANSIT',
        vehicleType: 'MOTORBIKE',
        distanceMeters: 2500,
        durationSeconds: 600,
        priceVnd: 35000,
      },
    });

    const response = await request(app.getHttpServer())
      .post(`/driver/orders/${order.id}/incident`)
      .set('Authorization', `Bearer ${driverSession.accessToken}`)
      .send({
        reason: 'RECIPIENT_REJECTED',
        note: 'Người nhận từ chối nhận hàng và tắt máy',
        clientRequestId: 'req-inc-1',
      })
      .expect(200);

    expect(response.body).toMatchObject({
      id: order.id,
      status: 'RETURNING',
      incidentReason: 'RECIPIENT_REJECTED',
      incidentNote: 'Người nhận từ chối nhận hàng và tắt máy',
    });

    // Verify order in mock DB
    const updatedOrder = prismaMock.orders.get(order.id);
    expect(updatedOrder?.status).toBe('RETURNING');
    expect(updatedOrder?.incidentReason).toBe('RECIPIENT_REJECTED');

    // Verify driver is freed back to AVAILABLE
    const profile = Array.from(prismaMock.driverProfiles.values()).find((p) => p.userId === driverUserId);
    expect(profile?.availability).toBe('AVAILABLE');

    // Verify a compliance audit trail was written (spec §3.6 step 6)
    const audits = Array.from(prismaMock.auditLogs.values()).filter(
      (a) => a.resourceId === order.id && a.action === 'ORDER_INCIDENT_REPORTED',
    );
    expect(audits).toHaveLength(1);
    expect(audits[0]?.metadata).toMatchObject({
      reason: 'RECIPIENT_REJECTED',
      fromStatus: 'IN_TRANSIT',
      toStatus: 'RETURNING',
    });
  });

  it('routes an ACCEPTED/PICKING_UP incident (cargo not yet picked up) straight to INCIDENT_CANCELLED', async () => {
    const order = await prismaMock.order.create({
      data: {
        customerId: 'customer-1',
        driverId: driverUserId,
        status: 'PICKING_UP',
        vehicleType: 'MOTORBIKE',
      },
    });

    const response = await request(app.getHttpServer())
      .post(`/driver/orders/${order.id}/incident`)
      .set('Authorization', `Bearer ${driverSession.accessToken}`)
      .send({
        reason: 'SENDER_NO_SHOW',
        clientRequestId: 'req-inc-precheck',
      })
      .expect(200);

    expect(response.body.status).toBe('INCIDENT_CANCELLED');
  });

  it('handles idempotency gracefully with the same clientRequestId', async () => {
    const order = await prismaMock.order.create({
      data: {
        customerId: 'customer-1',
        driverId: driverUserId,
        status: 'ACCEPTED',
        vehicleType: 'MOTORBIKE',
      },
    });

    // First call
    await request(app.getHttpServer())
      .post(`/driver/orders/${order.id}/incident`)
      .set('Authorization', `Bearer ${driverSession.accessToken}`)
      .send({
        reason: 'VEHICLE_BREAKDOWN',
        note: 'Thủng lốp xe',
        clientRequestId: 'idempotent-inc-req-1',
      })
      .expect(200);

    // Duplicate call with same clientRequestId
    const dupRes = await request(app.getHttpServer())
      .post(`/driver/orders/${order.id}/incident`)
      .set('Authorization', `Bearer ${driverSession.accessToken}`)
      .send({
        reason: 'VEHICLE_BREAKDOWN',
        note: 'Thủng lốp xe',
        clientRequestId: 'idempotent-inc-req-1',
      })
      .expect(200);

    expect(dupRes.body.status).toBe('INCIDENT_CANCELLED');
  });

  it('sets driver to OFFLINE if autoOfflineOnComplete was true', async () => {
    const order = await prismaMock.order.create({
      data: {
        customerId: 'customer-1',
        driverId: driverUserId,
        status: 'PICKING_UP',
        vehicleType: 'MOTORBIKE',
      },
    });

    await prismaMock.driverProfile.update({
      where: { userId: driverUserId },
      data: { autoOfflineOnComplete: true },
    });

    await request(app.getHttpServer())
      .post(`/driver/orders/${order.id}/incident`)
      .set('Authorization', `Bearer ${driverSession.accessToken}`)
      .send({
        reason: 'SENDER_NO_SHOW',
        note: 'Người gửi không có nhà',
      })
      .expect(200);

    const profile = Array.from(prismaMock.driverProfiles.values()).find((p) => p.userId === driverUserId);
    expect(profile?.availability).toBe('OFFLINE');
    expect(profile?.autoOfflineOnComplete).toBe(false);
  });

  it('rejects incident report from non-assigned driver with 403 Forbidden', async () => {
    const order = await prismaMock.order.create({
      data: {
        customerId: 'customer-1',
        driverId: driverUserId,
        status: 'IN_TRANSIT',
        vehicleType: 'MOTORBIKE',
      },
    });

    const res = await request(app.getHttpServer())
      .post(`/driver/orders/${order.id}/incident`)
      .set('Authorization', `Bearer ${otherDriverSession.accessToken}`)
      .send({
        reason: 'FORCE_MAJEURE',
        note: 'Đường ngập nặng',
      })
      .expect(403);

    expect(res.body.code).toBe('FORBIDDEN');
  });

  it('rejects incident report when order is already DELIVERED with 409 Conflict', async () => {
    const order = await prismaMock.order.create({
      data: {
        customerId: 'customer-1',
        driverId: driverUserId,
        status: 'DELIVERED',
        vehicleType: 'MOTORBIKE',
      },
    });

    const res = await request(app.getHttpServer())
      .post(`/driver/orders/${order.id}/incident`)
      .set('Authorization', `Bearer ${driverSession.accessToken}`)
      .send({
        reason: 'RECIPIENT_REJECTED',
      })
      .expect(409);

    expect(res.body.code).toBe('ORDER_INVALID_TRANSITION');
  });
});
