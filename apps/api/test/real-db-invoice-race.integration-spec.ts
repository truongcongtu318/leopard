import { ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import type { INestApplication } from '@nestjs/common';
import request from 'supertest';

import { AppModule } from '../src/app.module.js';
import { ApiExceptionFilter } from '../src/common/api-exception.filter.js';
import { PrismaService } from '../src/database/prisma.service.js';
import { TokenService } from '../src/auth/token.service.js';
import { RefreshSessionRepository } from '../src/auth/refresh-session.repository.js';
import { PdfService } from '../src/pdf/pdf.service.js';
import { StorageProvider } from '../src/media/storage.provider.js';
import { resolveRealDbRaceGate } from './real-db-race-gate.js';

interface AuthSessionBody {
  readonly accessToken: string;
}

const CONCURRENCY = 20;

/** In-memory stand-in — no real disk I/O needed for this suite's concurrency assertions. */
class FakeStorageProvider extends StorageProvider {
  readonly objects = new Map<string, Buffer>();

  async put(key: string, fileBuffer: Buffer): Promise<void> {
    this.objects.set(key, fileBuffer);
  }

  async createReadUrl(key: string): Promise<string> {
    return `memory://${key}`;
  }

  async delete(key: string): Promise<void> {
    this.objects.delete(key);
  }
}

const { skipReason } = resolveRealDbRaceGate(process.env);
const describeRealDb = skipReason ? describe.skip : describe;

/**
 * Proves the invoice-number sequence guarantee end-to-end against a real
 * Postgres database — a mocked unit test (see invoices.repository.spec.ts)
 * can assert the SQL shape is a single atomic UPSERT, but only a real
 * database under real concurrent transactions can prove no two of them
 * ever observe/increment the same `InvoiceSequence.lastValue` (the exact
 * race `max(invoiceNumber)` would be vulnerable to, and the reason the plan
 * explicitly forbids that approach).
 *
 * Explicitly forces MAIL_PROVIDER=console (never smtp) regardless of what
 * the ambient shell/`.env` might otherwise set — this repo's local `.env`
 * is seeded with real Gmail SMTP credentials, and this suite must never
 * risk sending a real email while proving a database race guarantee.
 */
describeRealDb(
  skipReason ? `Real DB Invoice Number Race (skipped: ${skipReason})` : 'Real DB Invoice Number Race',
  () => {
    let app: INestApplication;
    let prisma: PrismaService;
    let storage: FakeStorageProvider;
    let customerId: string;
    let customerSession: AuthSessionBody;
    let adminSession: AuthSessionBody;
    let fixtureUserIds: string[] = [];
    let fixtureOrderIds: string[] = [];

    async function cleanupFixtures(): Promise<void> {
      if (fixtureOrderIds.length > 0) {
        await prisma.invoice.deleteMany({ where: { orderId: { in: fixtureOrderIds } } });
        await prisma.paymentIntent.deleteMany({ where: { orderId: { in: fixtureOrderIds } } });
        await prisma.order.deleteMany({ where: { id: { in: fixtureOrderIds } } });
        fixtureOrderIds = [];
      }
      if (fixtureUserIds.length > 0) {
        await prisma.auditLog.deleteMany({ where: { actorId: { in: fixtureUserIds } } });
        await prisma.refreshSession.deleteMany({ where: { userId: { in: fixtureUserIds } } });
        await prisma.user.deleteMany({ where: { id: { in: fixtureUserIds } } });
        fixtureUserIds = [];
      }
    }

    beforeAll(async () => {
      process.env = {
        ...process.env,
        NODE_ENV: 'test',
        AUTH_DEMO_LOGIN_ENABLED: 'true',
        AUTH_ACCESS_TOKEN_SECRET: 'test-access-token-secret',
        AUTH_REFRESH_TOKEN_SECRET: 'test-refresh-token-secret',
        PAYMENT_PROVIDER: 'demo',
        MAIL_PROVIDER: 'console',
        ALLOW_CONSOLE_MAIL_PROVIDER: 'true',
      };

      storage = new FakeStorageProvider();

      const moduleFixture = await Test.createTestingModule({
        imports: [AppModule],
      })
        .overrideProvider(StorageProvider)
        .useValue(storage)
        .overrideProvider(PdfService)
        .useValue({
          renderContract: jest.fn(async () => Buffer.from('%PDF-FAKE-CONTRACT')),
          renderInvoice: jest.fn(async () => Buffer.from('%PDF-FAKE-INVOICE')),
        })
        .compile();

      // bodyParser: false — see invoices.e2e-spec.ts / driver-contract.e2e-spec.ts
      // for why: the app-wide JSON body-limit middleware never attaches its
      // listeners in time otherwise and every POST/PATCH with a JSON body
      // hangs forever.
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

      prisma = app.get(PrismaService);
      const tokenService = app.get(TokenService);
      const refreshSessions = app.get(RefreshSessionRepository);
      await cleanupFixtures();

      const runId = Date.now().toString();
      const customer = await prisma.user.create({
        data: { phone: `+8495${runId.slice(-8)}`, role: 'CUSTOMER', status: 'ACTIVE' },
      });
      customerId = customer.id;
      fixtureUserIds.push(customer.id);
      customerSession = tokenService.createAuthSession(customer, await refreshSessions.create(customer.id));

      const admin = await prisma.user.create({
        data: { phone: `+8494${runId.slice(-8)}`, role: 'ADMIN', status: 'ACTIVE' },
      });
      fixtureUserIds.push(admin.id);
      adminSession = tokenService.createAuthSession(admin, await refreshSessions.create(admin.id));
    });

    afterAll(async () => {
      if (prisma) await cleanupFixtures();
      if (app) await app.close();
    });

    it(`issues exactly ${CONCURRENCY} unique, sequential invoice numbers under real concurrent confirmations`, async () => {
      const year = new Date().getFullYear();
      const before = await prisma.invoiceSequence.findUnique({ where: { year } });
      const startingValue = before?.lastValue ?? 0;

      const payments = await Promise.all(
        Array.from({ length: CONCURRENCY }, async (_, i) => {
          const order = await prisma.order.create({
            data: {
              customerId,
              status: 'REQUESTED',
              priceVnd: 10_000 + i,
              distanceMeters: 1000,
              durationSeconds: 300,
            },
          });
          fixtureOrderIds.push(order.id);
          // `provider` must be non-null once status leaves UNPAID (real DB
          // check constraint), so seed it as DEMO — matching what
          // `PaymentsService.createPaymentIntent` would have set via the
          // real QR-creation flow.
          const payment = await prisma.paymentIntent.create({
            data: { orderId: order.id, status: 'UNPAID', amountVnd: 10_000 + i, provider: 'DEMO' },
          });
          return { orderId: order.id, paymentId: payment.id };
        }),
      );

      // The real concurrency point: N confirmations racing to reserve N
      // invoice numbers from the same year's InvoiceSequence row at once.
      const responses = await Promise.all(
        payments.map(({ paymentId }, i) =>
          request(app.getHttpServer())
            .post(`/admin/payments/${paymentId}/confirm`)
            .set('Authorization', `Bearer ${adminSession.accessToken}`)
            .send({ note: `Xác nhận đồng thời #${i}`, clientRequestId: `race-confirm-${paymentId}` }),
        ),
      );

      expect(responses.every((res) => res.status === 201)).toBe(true);
      expect(responses.every((res) => res.body.status === 'PAID_MANUAL')).toBe(true);

      const orderIds = payments.map((p) => p.orderId);
      const invoices = await prisma.invoice.findMany({ where: { orderId: { in: orderIds } } });
      expect(invoices).toHaveLength(CONCURRENCY);

      const invoiceNumbers = invoices.map((i) => i.invoiceNumber);
      expect(new Set(invoiceNumbers).size).toBe(CONCURRENCY);
      for (const number of invoiceNumbers) {
        expect(number).toMatch(new RegExp(`^LP/${year}/\\d{6,}$`));
      }

      const after = await prisma.invoiceSequence.findUnique({ where: { year } });
      expect(after?.lastValue).toBe(startingValue + CONCURRENCY);

      // No two orders ended up pointing at the same PDF object, and every
      // invoice's storage key was actually written (no lost/orphaned upload
      // that a losing race should have cleaned up but a winning one should
      // never touch).
      const storageKeys = invoices.map((i) => i.pdfStorageKey);
      expect(new Set(storageKeys).size).toBe(CONCURRENCY);
      for (const key of storageKeys) {
        expect(storage.objects.has(key)).toBe(true);
      }
    }, 60_000);
  },
);
