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

describe('Payment Flow Safety & Audited Confirmation (E2E)', () => {
  let app: INestApplication;
  let prismaMock: InMemoryPrismaService;
  let customerSession: { accessToken: string };
  let adminSession: { accessToken: string };
  let customerId: string;
  let adminId: string;
  let orderId: string;

  beforeAll(async () => {
    process.env = {
      ...process.env,
      NODE_ENV: 'test',
      AUTH_DEMO_LOGIN_ENABLED: 'true',
      AUTH_ACCESS_TOKEN_SECRET: 'test-access-token-secret-32-chars-long',
      AUTH_REFRESH_TOKEN_SECRET: 'test-refresh-token-secret-32-chars-long',
      PAYMENT_PROVIDER: 'demo',
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

    // Customer
    const customer = await prismaMock.user.create({
      data: { phone: '+84903333333', role: 'CUSTOMER', status: 'ACTIVE' },
    });
    customerId = customer.id;
    const s1 = await refreshSessions.create(customer.id);
    customerSession = tokenService.createAuthSession(customer, s1);

    // Admin
    const admin = await prismaMock.user.create({
      data: { phone: '+84999999999', role: 'ADMIN', status: 'ACTIVE' },
    });
    adminId = admin.id;
    const s2 = await refreshSessions.create(admin.id);
    adminSession = tokenService.createAuthSession(admin, s2);

    // Order
    const order = await prismaMock.order.create({
      data: {
        customerId,
        status: 'REQUESTED',
        priceVnd: 50000,
        distanceMeters: 5000,
        durationSeconds: 900,
      },
    });
    orderId = order.id;
  });

  afterAll(async () => {
    if (app) await app.close();
  });

  let createdPaymentId: string;

  it('creates payment QR intent for order owner', async () => {
    const res = await request(app.getHttpServer())
      .post(`/orders/${orderId}/payments`)
      .set('Authorization', `Bearer ${customerSession.accessToken}`)
      .send({ clientRequestId: 'req-pay-1' })
      .expect(201);

    expect(res.body).toMatchObject({
      orderId,
      status: 'QR_CREATED',
      amountVnd: 50000,
      clientRequestId: 'req-pay-1',
    });
    createdPaymentId = res.body.id;
  });

  it('returns identical intent on duplicate clientRequestId (idempotent)', async () => {
    const res = await request(app.getHttpServer())
      .post(`/orders/${orderId}/payments`)
      .set('Authorization', `Bearer ${customerSession.accessToken}`)
      .send({ clientRequestId: 'req-pay-1' })
      .expect(201);

    expect(res.body.id).toBe(createdPaymentId);
  });

  it('rejects new intent with 409 conflict when an active intent already exists', async () => {
    await request(app.getHttpServer())
      .post(`/orders/${orderId}/payments`)
      .set('Authorization', `Bearer ${customerSession.accessToken}`)
      .send({ clientRequestId: 'req-pay-different-key' })
      .expect(409);
  });

  it('allows Admin to manually confirm payment with note and writes audit log', async () => {
    const confirmRequestId = 'confirm-req-1';
    const res = await request(app.getHttpServer())
      .post(`/admin/payments/${createdPaymentId}/confirm`)
      .set('Authorization', `Bearer ${adminSession.accessToken}`)
      .send({
        note: 'Đã nhận chuyển khoản ngân hàng qua VietQR',
        clientRequestId: confirmRequestId,
      })
      .expect(201);

    expect(res.body).toMatchObject({
      id: createdPaymentId,
      status: 'PAID_MANUAL',
      confirmedById: adminId,
      confirmationNote: 'Đã nhận chuyển khoản ngân hàng qua VietQR',
      confirmationRequestId: confirmRequestId,
    });

    // Check audit log
    const audits = Array.from(prismaMock.auditLogs.values()).filter(
      (a) => a.action === 'CONFIRM_PAYMENT' && a.resourceId === createdPaymentId,
    );
    expect(audits.length).toBe(1);
    expect(audits[0]?.actorId).toBe(adminId);
  });

  it('rejects non-admin attempt to confirm payment with 403 Forbidden', async () => {
    await request(app.getHttpServer())
      .post(`/admin/payments/${createdPaymentId}/confirm`)
      .set('Authorization', `Bearer ${customerSession.accessToken}`)
      .send({
        note: 'Customer cố tình xác nhận thanh toán',
        clientRequestId: 'confirm-hack',
      })
      .expect(403);
  });
});
