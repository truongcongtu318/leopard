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
import { PdfService } from '../pdf/pdf.service.js';
import { StorageProvider } from '../media/storage.provider.js';
import { MailProvider, type InvoiceMailInput } from './mail.provider.js';

interface AuthSessionBody {
  readonly accessToken: string;
}

/**
 * In-memory stand-in for `StorageProvider` — avoids real disk I/O so the
 * "orphaned upload cleaned up" assertions can check an in-process Map
 * instead of the filesystem. `createReadUrl` returns a deterministic,
 * inspectable URL (`memory://<key>`) rather than a real signed URL.
 */
class FakeStorageProvider extends StorageProvider {
  readonly objects = new Map<string, Buffer>();
  readonly deletedKeys: string[] = [];

  async put(key: string, fileBuffer: Buffer): Promise<void> {
    this.objects.set(key, fileBuffer);
  }

  async createReadUrl(key: string): Promise<string> {
    return `memory://${key}`;
  }

  async delete(key: string): Promise<void> {
    this.objects.delete(key);
    this.deletedKeys.push(key);
  }
}

/**
 * Controllable fake `MailProvider` — resolves by default; tests can force
 * the next send to reject to exercise the `MAIL_PROVIDER_FAILED` path
 * without ever touching a real SMTP server (the repo's local `.env` has
 * real Gmail credentials seeded — this suite must never risk sending a
 * real email).
 */
class FakeMailProvider extends MailProvider {
  readonly sent: InvoiceMailInput[] = [];
  private nextShouldFail = false;

  failNextSend(): void {
    this.nextShouldFail = true;
  }

  async sendInvoiceLink(input: InvoiceMailInput): Promise<void> {
    if (this.nextShouldFail) {
      this.nextShouldFail = false;
      throw new Error('Simulated SMTP failure');
    }
    this.sent.push(input);
  }
}

describe('VAT Invoice + Email (E2E)', () => {
  let app: INestApplication;
  let prismaMock: InMemoryPrismaService;
  let storage: FakeStorageProvider;
  let mail: FakeMailProvider;

  let customerWithEmailSession: AuthSessionBody;
  let customerWithEmailId: string;
  let customerNoEmailSession: AuthSessionBody;
  let customerNoEmailId: string;
  let otherCustomerSession: AuthSessionBody;
  let adminSession: AuthSessionBody;

  async function createOrderAndConfirmPayment(customerId: string, amountVnd: number): Promise<string> {
    const order = await prismaMock.order.create({
      data: { customerId, status: 'REQUESTED', priceVnd: amountVnd, distanceMeters: 1000, durationSeconds: 300 },
    });
    const payment = await prismaMock.paymentIntent.create({
      data: { orderId: order.id, status: 'UNPAID', amountVnd },
    });
    await request(app.getHttpServer())
      .post(`/admin/payments/${payment.id}/confirm`)
      .set('Authorization', `Bearer ${adminSession.accessToken}`)
      .send({ note: 'Đã nhận chuyển khoản', clientRequestId: `confirm-${payment.id}` })
      .expect(201);
    return order.id;
  }

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
    storage = new FakeStorageProvider();
    mail = new FakeMailProvider();

    const moduleFixture = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(PrismaService)
      .useValue(prismaMock)
      .overrideProvider(StorageProvider)
      .useValue(storage)
      .overrideProvider(MailProvider)
      .useValue(mail)
      .overrideProvider(PdfService)
      .useValue({
        renderContract: jest.fn(async () => Buffer.from('%PDF-FAKE-CONTRACT')),
        renderInvoice: jest.fn(async () => Buffer.from('%PDF-FAKE-INVOICE')),
      })
      .compile();

    // See driver-contract.e2e-spec.ts for why bodyParser must be false here:
    // the app-wide JSON body-limit middleware (AppModule.configure()) never
    // attaches its listeners in time otherwise, and every POST/PATCH with a
    // JSON body hangs forever. Confirmed this session: payments.e2e-spec.ts
    // (which omits this) hangs on POST /orders/:id/payments — a pre-existing,
    // already-flagged issue this suite must not reproduce.
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

    const tokenService = app.get(TokenService);
    const refreshSessions = app.get(RefreshSessionRepository);

    const customerWithEmail = await prismaMock.user.create({
      data: { phone: '+84901111111', role: 'CUSTOMER', status: 'ACTIVE' },
    });
    await prismaMock.user.update({ where: { id: customerWithEmail.id }, data: { email: 'khach@example.com' } });
    customerWithEmailId = customerWithEmail.id;
    customerWithEmailSession = tokenService.createAuthSession(
      customerWithEmail,
      await refreshSessions.create(customerWithEmail.id),
    );

    const customerNoEmail = await prismaMock.user.create({
      data: { phone: '+84902222222', role: 'CUSTOMER', status: 'ACTIVE' },
    });
    customerNoEmailId = customerNoEmail.id;
    customerNoEmailSession = tokenService.createAuthSession(
      customerNoEmail,
      await refreshSessions.create(customerNoEmail.id),
    );

    const otherCustomer = await prismaMock.user.create({
      data: { phone: '+84903333333', role: 'CUSTOMER', status: 'ACTIVE' },
    });
    otherCustomerSession = tokenService.createAuthSession(
      otherCustomer,
      await refreshSessions.create(otherCustomer.id),
    );

    const admin = await prismaMock.user.create({
      data: { phone: '+84909999999', role: 'ADMIN', status: 'ACTIVE' },
    });
    adminSession = tokenService.createAuthSession(admin, await refreshSessions.create(admin.id));
  });

  afterAll(async () => {
    if (app) await app.close();
  });

  describe('auth guards', () => {
    it('rejects GET /invoices/order/:orderId with 401 when unauthenticated', async () => {
      await request(app.getHttpServer()).get('/invoices/order/any-id').expect(401);
    });
  });

  describe('automatic issuance on payment confirmation', () => {
    let orderWithEmail: string;
    let orderNoEmail: string;

    it('issues an invoice and auto-emails it when the customer has an email on file', async () => {
      orderWithEmail = await createOrderAndConfirmPayment(customerWithEmailId, 480_000);

      const res = await request(app.getHttpServer())
        .get(`/invoices/order/${orderWithEmail}`)
        .set('Authorization', `Bearer ${customerWithEmailSession.accessToken}`)
        .expect(200);

      expect(res.body).toMatchObject({
        invoiceNumber: expect.stringMatching(/^LP\/\d{4}\/\d{6,}$/),
        amountVnd: 480_000,
        vatRateVnd: 48_000,
        totalVnd: 528_000,
      });
      expect(typeof res.body.emailSentAt).toBe('string');
      expect(typeof res.body.viewUrl).toBe('string');
      expect(mail.sent.some((m) => m.to === 'khach@example.com')).toBe(true);
    });

    it('issues an invoice with emailSentAt null when the customer has no email on file', async () => {
      orderNoEmail = await createOrderAndConfirmPayment(customerNoEmailId, 100_000);

      const res = await request(app.getHttpServer())
        .get(`/invoices/order/${orderNoEmail}`)
        .set('Authorization', `Bearer ${customerNoEmailSession.accessToken}`)
        .expect(200);

      expect(res.body.emailSentAt).toBeNull();
    });

    it('404s a customer who does not own the invoice, without disclosing it exists', async () => {
      const res = await request(app.getHttpServer())
        .get(`/invoices/order/${orderWithEmail}`)
        .set('Authorization', `Bearer ${otherCustomerSession.accessToken}`)
        .expect(404);

      expect(res.body.code).toBe('RESOURCE_NOT_FOUND');
      expect(JSON.stringify(res.body)).not.toContain('LP/');
    });

    it('allows an admin to read any customer order invoice', async () => {
      await request(app.getHttpServer())
        .get(`/invoices/order/${orderWithEmail}`)
        .set('Authorization', `Bearer ${adminSession.accessToken}`)
        .expect(200);
    });

    it('404s an order that has no PAID_MANUAL payment yet', async () => {
      const order = await prismaMock.order.create({
        data: { customerId: customerWithEmailId, status: 'REQUESTED', priceVnd: 10_000 },
      });

      const res = await request(app.getHttpServer())
        .get(`/invoices/order/${order.id}`)
        .set('Authorization', `Bearer ${customerWithEmailSession.accessToken}`)
        .expect(404);

      expect(res.body.code).toBe('RESOURCE_NOT_FOUND');
    });

    it('creates no more than one invoice when the confirmation is replayed', async () => {
      // Replays confirmPayment on the same, already-PAID_MANUAL intent
      // (different clientRequestId — the "retry-on-replay" path, not the
      // confirmationRequestId idempotency short-circuit) and asserts the
      // invoice number never changes.
      const before = await request(app.getHttpServer())
        .get(`/invoices/order/${orderWithEmail}`)
        .set('Authorization', `Bearer ${customerWithEmailSession.accessToken}`)
        .expect(200);

      const payment = Array.from(prismaMock.paymentIntents.values()).find(
        (p) => p.orderId === orderWithEmail,
      )!;

      await Promise.all(
        [1, 2, 3].map((n) =>
          request(app.getHttpServer())
            .post(`/admin/payments/${payment.id}/confirm`)
            .set('Authorization', `Bearer ${adminSession.accessToken}`)
            .send({ note: 'Replay xác nhận', clientRequestId: `replay-${n}` })
            .expect(201),
        ),
      );

      const after = await request(app.getHttpServer())
        .get(`/invoices/order/${orderWithEmail}`)
        .set('Authorization', `Bearer ${customerWithEmailSession.accessToken}`)
        .expect(200);

      expect(after.body.invoiceNumber).toBe(before.body.invoiceNumber);
      expect(after.body.id).toBe(before.body.id);
      const matchingInvoices = Array.from(prismaMock.invoices.values()).filter(
        (i) => i.orderId === orderWithEmail,
      );
      expect(matchingInvoices).toHaveLength(1);
    });
  });

  describe('GET /invoices/:id/download', () => {
    it('redirects to the storage-provided signed URL for the owner', async () => {
      const orderId = await createOrderAndConfirmPayment(customerWithEmailId, 200_000);
      const invoiceRes = await request(app.getHttpServer())
        .get(`/invoices/order/${orderId}`)
        .set('Authorization', `Bearer ${customerWithEmailSession.accessToken}`)
        .expect(200);

      const res = await request(app.getHttpServer())
        .get(`/invoices/${invoiceRes.body.id}/download`)
        .set('Authorization', `Bearer ${customerWithEmailSession.accessToken}`)
        .expect(302);

      expect(res.headers.location).toContain('memory://');
    });

    it('404s a non-owner, non-admin caller', async () => {
      const orderId = await createOrderAndConfirmPayment(customerWithEmailId, 150_000);
      const invoiceRes = await request(app.getHttpServer())
        .get(`/invoices/order/${orderId}`)
        .set('Authorization', `Bearer ${customerWithEmailSession.accessToken}`)
        .expect(200);

      await request(app.getHttpServer())
        .get(`/invoices/${invoiceRes.body.id}/download`)
        .set('Authorization', `Bearer ${otherCustomerSession.accessToken}`)
        .expect(404);
    });
  });

  describe('POST /invoices/:id/send', () => {
    let invoiceId: string;

    beforeAll(async () => {
      const orderId = await createOrderAndConfirmPayment(customerNoEmailId, 300_000);
      const invoiceRes = await request(app.getHttpServer())
        .get(`/invoices/order/${orderId}`)
        .set('Authorization', `Bearer ${customerNoEmailSession.accessToken}`)
        .expect(200);
      invoiceId = invoiceRes.body.id;
    });

    it('rejects a syntactically invalid email with 422 before reaching the service', async () => {
      // ApiExceptionFilter maps the global ValidationPipe's rejection to 422
      // (this app's VALIDATION_ERROR convention), not the framework's 400
      // default — confirmed against real HTTP wiring, not assumed.
      await request(app.getHttpServer())
        .post(`/invoices/${invoiceId}/send`)
        .set('Authorization', `Bearer ${customerNoEmailSession.accessToken}`)
        .send({ email: 'not-an-email' })
        .expect(422);
    });

    it('sends and updates emailSentAt on a valid email; a resend with a different email succeeds too', async () => {
      const first = await request(app.getHttpServer())
        .post(`/invoices/${invoiceId}/send`)
        .set('Authorization', `Bearer ${customerNoEmailSession.accessToken}`)
        .send({ email: 'first@example.com' })
        .expect(201);
      expect(typeof first.body.emailSentAt).toBe('string');
      const firstSentAt = first.body.emailSentAt;

      const second = await request(app.getHttpServer())
        .post(`/invoices/${invoiceId}/send`)
        .set('Authorization', `Bearer ${customerNoEmailSession.accessToken}`)
        .send({ email: 'second@example.com' })
        .expect(201);
      expect(second.body.emailSentAt).not.toBe(firstSentAt);
      expect(mail.sent.some((m) => m.to === 'second@example.com')).toBe(true);
    });

    it('returns 502 MAIL_PROVIDER_FAILED on SMTP failure and retains the invoice for retry', async () => {
      mail.failNextSend();

      const res = await request(app.getHttpServer())
        .post(`/invoices/${invoiceId}/send`)
        .set('Authorization', `Bearer ${customerNoEmailSession.accessToken}`)
        .send({ email: 'retry@example.com' })
        .expect(502);
      expect(res.body.code).toBe('MAIL_PROVIDER_FAILED');

      // The invoice must still be readable/valid after the failed send.
      await request(app.getHttpServer())
        .get(`/invoices/order/${(await prismaMock.invoice.findUnique({ where: { id: invoiceId } }))?.orderId}`)
        .set('Authorization', `Bearer ${customerNoEmailSession.accessToken}`)
        .expect(200);

      // Retry with the same email now succeeds (fake mail provider only
      // fails the one call armed above).
      await request(app.getHttpServer())
        .post(`/invoices/${invoiceId}/send`)
        .set('Authorization', `Bearer ${customerNoEmailSession.accessToken}`)
        .send({ email: 'retry@example.com' })
        .expect(201);
    });

    it('404s send for a non-owner, non-admin caller', async () => {
      await request(app.getHttpServer())
        .post(`/invoices/${invoiceId}/send`)
        .set('Authorization', `Bearer ${otherCustomerSession.accessToken}`)
        .send({ email: 'hacker@example.com' })
        .expect(404);
    });
  });
});
