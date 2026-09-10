/// <reference types="jest" />

import { ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { PayOS } from '@payos/node';

import { AppModule } from '../app.module.js';
import { ApiExceptionFilter } from '../common/api-exception.filter.js';
import { PrismaService } from '../database/prisma.service.js';
import { InMemoryPrismaService } from '../../test/prisma-mock.js';

describe('PayOS Webhook Flow (E2E)', () => {
  let app: INestApplication;
  let prismaMock: InMemoryPrismaService;
  const testChecksumKey = 'test-payos-checksum-key-32chars';
  let payosClient: PayOS;

  beforeAll(async () => {
    process.env = {
      ...process.env,
      NODE_ENV: 'test',
      AUTH_DEMO_LOGIN_ENABLED: 'true',
      AUTH_ACCESS_TOKEN_SECRET: 'test-access-token-secret-32-chars-long',
      AUTH_REFRESH_TOKEN_SECRET: 'test-refresh-token-secret-32-chars-long',
      PAYMENT_PROVIDER: 'payos',
      PAYOS_CLIENT_ID: 'test-client-id',
      PAYOS_API_KEY: 'test-api-key',
      PAYOS_CHECKSUM_KEY: testChecksumKey,
    };

    payosClient = new PayOS({
      clientId: 'test-client-id',
      apiKey: 'test-api-key',
      checksumKey: testChecksumKey,
    });

    prismaMock = new InMemoryPrismaService();

    const moduleFixture = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(PrismaService)
      .useValue(prismaMock)
      .compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api/v1');
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
  });

  afterAll(async () => {
    if (app) await app.close();
  });

  async function createSignedWebhookBody(data: Record<string, unknown>) {
    const signature = await payosClient.crypto.createSignatureFromObj(data, testChecksumKey);
    return {
      code: '00',
      desc: 'success',
      success: true,
      data,
      signature,
    };
  }

  it('verifies valid payOS webhook, updates PaymentIntent to PAID_MANUAL, and writes audit log', async () => {
    const orderCode = 987654321;
    const amount = 150000;

    const order = await prismaMock.order.create({
      data: {
        customerId: 'cust-1',
        status: 'REQUESTED',
        priceVnd: amount,
        distanceMeters: 3000,
        durationSeconds: 600,
      },
    });

    const payment = await prismaMock.paymentIntent.create({
      data: {
        orderId: order.id,
        status: 'QR_CREATED',
        amountVnd: amount,
        payosOrderCode: BigInt(orderCode),
        provider: 'PAYOS',
      },
    });

    const webhookData = {
      orderCode,
      amount,
      description: 'LP12345678',
      accountNumber: '998877665544',
      reference: 'TXN-PAYOS-999',
      transactionDateTime: '2026-09-05 19:30:00',
      currency: 'VND',
      paymentLinkId: 'link-abc-123',
      code: '00',
      desc: 'Thành công',
    };

    const payload = await createSignedWebhookBody(webhookData);

    const res = await request(app.getHttpServer())
      .post('/api/v1/payments/webhook/payos')
      .send(payload)
      .expect(200);

    expect(res.body).toEqual({ received: true });

    const updatedPayment = prismaMock.paymentIntents.get(payment.id);
    expect(updatedPayment?.status).toBe('PAID_MANUAL');
    expect(updatedPayment?.providerReference).toBe('TXN-PAYOS-999');
    expect(updatedPayment?.confirmationNote).toBe('Xác nhận tự động qua webhook payOS');
    expect(updatedPayment?.confirmedById).toBeNull();

    const auditLog = Array.from(prismaMock.auditLogs.values()).find(
      (a) => a.action === 'CONFIRM_PAYMENT_WEBHOOK' && a.resourceId === payment.id,
    );
    expect(auditLog).toBeDefined();
    expect(auditLog?.idempotencyRequestId).toBe(`payos-webhook-${orderCode}`);
    expect(auditLog?.actorId).toBeNull();
  });

  it('rejects webhook with invalid signature with 400 Bad Request', async () => {
    const payload = {
      code: '00',
      desc: 'success',
      data: { orderCode: 111111, amount: 50000 },
      signature: 'invalid-tampered-signature',
    };

    await request(app.getHttpServer())
      .post('/api/v1/payments/webhook/payos')
      .send(payload)
      .expect(400);
  });

  it('is idempotent: ignores re-delivered webhook for already PAID_MANUAL intent', async () => {
    const orderCode = 888888;
    const amount = 200000;

    const payment = await prismaMock.paymentIntent.create({
      data: {
        orderId: 'order-already-paid',
        status: 'PAID_MANUAL',
        amountVnd: amount,
        payosOrderCode: BigInt(orderCode),
        provider: 'PAYOS',
        confirmationNote: 'Xác nhận trước đó',
      },
    });

    const webhookData = {
      orderCode,
      amount,
      description: 'LP-RETRY',
      accountNumber: '1122334455',
      reference: 'TXN-RETRY-001',
      transactionDateTime: '2026-09-05 19:35:00',
      currency: 'VND',
      paymentLinkId: 'link-retry',
      code: '00',
      desc: 'Thành công',
    };

    const payload = await createSignedWebhookBody(webhookData);

    const res = await request(app.getHttpServer())
      .post('/api/v1/payments/webhook/payos')
      .send(payload)
      .expect(200);

    expect(res.body).toEqual({ received: true });
    const samePayment = prismaMock.paymentIntents.get(payment.id);
    expect(samePayment?.confirmationNote).toBe('Xác nhận trước đó');
  });

  it('does not set PAID_MANUAL when amount does not match', async () => {
    const orderCode = 777777;
    const expectedAmount = 300000;
    const webhookAmount = 100000; // mismatch

    const payment = await prismaMock.paymentIntent.create({
      data: {
        orderId: 'order-amount-mismatch',
        status: 'QR_CREATED',
        amountVnd: expectedAmount,
        payosOrderCode: BigInt(orderCode),
        provider: 'PAYOS',
      },
    });

    const webhookData = {
      orderCode,
      amount: webhookAmount,
      description: 'LP-MISMATCH',
      accountNumber: '1122334455',
      reference: 'TXN-MISMATCH',
      transactionDateTime: '2026-09-05 19:40:00',
      currency: 'VND',
      paymentLinkId: 'link-mismatch',
      code: '00',
      desc: 'Thành công',
    };

    const payload = await createSignedWebhookBody(webhookData);

    const res = await request(app.getHttpServer())
      .post('/api/v1/payments/webhook/payos')
      .send(payload)
      .expect(200);

    expect(res.body).toEqual({ received: true });
    const untouched = prismaMock.paymentIntents.get(payment.id);
    expect(untouched?.status).toBe('QR_CREATED');
  });
});
