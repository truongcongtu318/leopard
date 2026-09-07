/// <reference types="jest" />

import * as fs from 'fs/promises';
import * as path from 'path';

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

interface AuthSessionBody {
  readonly accessToken: string;
}

/**
 * E2E coverage for the three driver-contract routes wired in Task 2
 * (`GET /driver/contract`, `GET /driver/contract/pdf`, `GET
 * /admin/drivers/:id/contract`) plus the contract-signing extension of
 * `POST /driver/apply`. This closes the gap Task 2's report flagged: the
 * driver-onboarding surface (including the pre-existing `apply`/
 * `application` routes) isn't part of the maintained OpenAPI contract
 * (`pnpm --filter api test:contract`), and had no HTTP-level (guards + real
 * `ValidationPipe` + route wiring) coverage before this — only
 * unit/service-level tests.
 *
 * Uses the real `LocalStorageProvider` (writing under `apps/api/uploads/`,
 * cleaned up in `afterAll`) so the "reapplication does not expose stale
 * evidence" behaviour can be asserted against real files on disk, but
 * overrides `PdfService` with a fake, near-instant renderer — these tests
 * exercise routing/guards/validation/state transitions, not PDF rendering
 * itself (already covered by `pdf.service.spec.ts`).
 */
describe('Driver Contract Signing (E2E)', () => {
  let app: INestApplication;
  let prismaMock: InMemoryPrismaService;
  let uploadDir: string;

  let customerSession: AuthSessionBody;
  let customerUserId: string;
  let fleetOwnerSession: AuthSessionBody;
  let adminSession: AuthSessionBody;
  let noApplicationCustomerSession: AuthSessionBody;
  let noApplicationCustomerUserId: string;

  const fakePdfBuffer = (tag: string) => Buffer.from(`%PDF-FAKE-${tag}`);

  beforeAll(async () => {
    process.env = {
      ...process.env,
      NODE_ENV: 'test',
      AUTH_DEMO_LOGIN_ENABLED: 'true',
      AUTH_ACCESS_TOKEN_SECRET: 'test-access-token-secret-32-chars-long',
      AUTH_REFRESH_TOKEN_SECRET: 'test-refresh-token-secret-32-chars-long',
      STORAGE_PROVIDER: 'local',
      ALLOW_LOCAL_STORAGE_PROVIDER: 'true',
    };

    uploadDir = path.join(process.cwd(), 'uploads');

    prismaMock = new InMemoryPrismaService();

    const moduleFixture = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(PrismaService)
      .useValue(prismaMock)
      .overrideProvider(PdfService)
      .useValue({
        renderContract: jest.fn(async (input: { signature?: unknown }) =>
          fakePdfBuffer(input.signature ? 'signed' : 'unsigned'),
        ),
      })
      .compile();

    // `bodyParser: false` mirrors `createApplication()` in `src/main.ts`
    // exactly. Without it, Nest's default Express body parser fully drains
    // the request stream before `DriversModule`'s route-scoped
    // `JsonBodyLimitMiddleware` ever attaches its own `data`/`end`
    // listeners — those events have already fired and won't fire again, so
    // every POST/PATCH with a JSON body hangs forever (discovered while
    // writing this suite: every test hitting `POST /driver/apply` timed out
    // at the 30s hook/test limit with zero response, even the plain
    // "no token" 401 case, since the hang happens in middleware, before any
    // guard runs). See this task's report for why this looks like a latent
    // problem in every other pre-existing `*.e2e-spec.ts` file too (none of
    // them pass `bodyParser: false` either) — not fixed here, out of scope.
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

    const customerUser = await prismaMock.user.create({
      data: { phone: '+84931111111', role: 'CUSTOMER', status: 'ACTIVE' },
    });
    customerUserId = customerUser.id;
    const customerSessionRecord = await refreshSessions.create(customerUser.id);
    customerSession = tokenService.createAuthSession(customerUser, customerSessionRecord);

    const fleetOwnerUser = await prismaMock.user.create({
      data: { phone: '+84932222222', role: 'FLEET_OWNER', status: 'ACTIVE' },
    });
    const fleetOwnerSessionRecord = await refreshSessions.create(fleetOwnerUser.id);
    fleetOwnerSession = tokenService.createAuthSession(fleetOwnerUser, fleetOwnerSessionRecord);

    const adminUser = await prismaMock.user.create({
      data: { phone: '+84933333333', role: 'ADMIN', status: 'ACTIVE' },
    });
    const adminSessionRecord = await refreshSessions.create(adminUser.id);
    adminSession = tokenService.createAuthSession(adminUser, adminSessionRecord);

    const noApplicationCustomer = await prismaMock.user.create({
      data: { phone: '+84934444444', role: 'CUSTOMER', status: 'ACTIVE' },
    });
    noApplicationCustomerUserId = noApplicationCustomer.id;
    const noApplicationSessionRecord = await refreshSessions.create(noApplicationCustomer.id);
    noApplicationCustomerSession = tokenService.createAuthSession(
      noApplicationCustomer,
      noApplicationSessionRecord,
    );
  });

  afterAll(async () => {
    if (app) {
      await app.close();
    }
    // Best-effort: remove whatever this suite wrote under `uploads/contracts`
    // so repeated local runs start clean. Never fails the suite.
    await fs.rm(path.join(uploadDir, 'contracts'), { recursive: true, force: true }).catch(() => {});
  });

  const validApplyPayload = {
    name: 'Nguyễn Văn A',
    vehicleType: 'VAN',
    licensePlate: '59D-123.45',
    licenseNumber: 'GPLX-0001',
    contractAccepted: true,
    signature: 'Nguyễn Văn A',
  };

  describe('auth guards', () => {
    it('rejects GET /driver/contract with 401 when unauthenticated', async () => {
      await request(app.getHttpServer()).get('/driver/contract').expect(401);
    });

    it('rejects GET /driver/contract/pdf with 401 when unauthenticated', async () => {
      await request(app.getHttpServer()).get('/driver/contract/pdf').expect(401);
    });

    it('rejects POST /driver/apply with 401 when unauthenticated', async () => {
      await request(app.getHttpServer())
        .post('/driver/apply')
        .send(validApplyPayload)
        .expect(401);
    });

    it('rejects GET /admin/drivers/:id/contract with 401 when unauthenticated', async () => {
      await request(app.getHttpServer())
        .get(`/admin/drivers/${customerUserId}/contract`)
        .expect(401);
    });

    it('rejects GET /admin/drivers/:id/contract with 403 for a non-admin role', async () => {
      await request(app.getHttpServer())
        .get(`/admin/drivers/${customerUserId}/contract`)
        .set('Authorization', `Bearer ${fleetOwnerSession.accessToken}`)
        .expect(403);
    });
  });

  describe('GET /driver/contract and /driver/contract/pdf (unsigned preview)', () => {
    it('returns the current version + a relative pdf url, with no DB row created', async () => {
      const res = await request(app.getHttpServer())
        .get('/driver/contract')
        .set('Authorization', `Bearer ${customerSession.accessToken}`)
        .expect(200);

      expect(res.body).toEqual({ version: 'v1', pdfUrl: '/driver/contract/pdf?version=v1' });
      expect(prismaMock.driverContracts.size).toBe(0);
    });

    it('streams the unsigned template as an inline application/pdf response', async () => {
      const res = await request(app.getHttpServer())
        .get('/driver/contract/pdf')
        .set('Authorization', `Bearer ${customerSession.accessToken}`)
        .expect(200);

      expect(res.headers['content-type']).toBe('application/pdf');
      expect(res.headers['content-disposition']).toBe(
        'inline; filename="hop-dong-tai-xe-v1.pdf"',
      );
      expect(Buffer.from(res.body).toString()).toBe('%PDF-FAKE-unsigned');
    });

    it('404s for an unsupported version query', async () => {
      const res = await request(app.getHttpServer())
        .get('/driver/contract/pdf?version=v99')
        .set('Authorization', `Bearer ${customerSession.accessToken}`)
        .expect(404);

      expect(res.body.code).toBe('RESOURCE_NOT_FOUND');
    });
  });

  describe('POST /driver/apply — contract validation', () => {
    it('rejects a missing/false contractAccepted with 422 CONTRACT_NOT_ACCEPTED, before any write', async () => {
      const res = await request(app.getHttpServer())
        .post('/driver/apply')
        .set('Authorization', `Bearer ${noApplicationCustomerSession.accessToken}`)
        .send({ ...validApplyPayload, contractAccepted: false })
        .expect(422);

      expect(res.body.code).toBe('CONTRACT_NOT_ACCEPTED');
      const profile = await prismaMock.driverProfile.findUnique({
        where: { userId: noApplicationCustomerUserId },
      });
      expect(profile).toBeNull();
    });

    it('rejects a malformed signature data-URI with 422 SIGNATURE_INVALID', async () => {
      const res = await request(app.getHttpServer())
        .post('/driver/apply')
        .set('Authorization', `Bearer ${noApplicationCustomerSession.accessToken}`)
        .send({
          ...validApplyPayload,
          signature: 'data:image/png;base64,not-valid-base64!!!',
        })
        .expect(422);

      expect(res.body.code).toBe('SIGNATURE_INVALID');
    });
  });

  describe('POST /driver/apply — state transition + admin evidence', () => {
    it('signs the contract, moves the user to PENDING_APPROVAL, and the admin can read the signed evidence', async () => {
      const applyRes = await request(app.getHttpServer())
        .post('/driver/apply')
        .set('Authorization', `Bearer ${customerSession.accessToken}`)
        .send(validApplyPayload)
        .expect(201);

      expect(applyRes.body).toMatchObject({
        status: 'PENDING_APPROVAL',
        contractVersion: 'v1',
      });
      expect(typeof applyRes.body.contractSignedAt).toBe('string');

      // GET /driver/application reflects the same signed-contract metadata.
      const appRes = await request(app.getHttpServer())
        .get('/driver/application')
        .set('Authorization', `Bearer ${customerSession.accessToken}`)
        .expect(200);
      expect(appRes.body).toMatchObject({
        status: 'PENDING_APPROVAL',
        contractVersion: 'v1',
        contractSignedAt: applyRes.body.contractSignedAt,
      });

      // The admin can open the signed evidence via its own authorized route.
      const adminRes = await request(app.getHttpServer())
        .get(`/admin/drivers/${customerUserId}/contract`)
        .set('Authorization', `Bearer ${adminSession.accessToken}`)
        .expect(200);

      expect(adminRes.body).toMatchObject({
        version: 'v1',
        signedByName: 'Nguyễn Văn A',
      });
      expect(typeof adminRes.body.pdfUrl).toBe('string');
      expect(adminRes.body.pdfUrl).toContain('/files/contracts/');
      // Never exposes raw storage keys — only projected URLs/metadata.
      expect(JSON.stringify(adminRes.body)).not.toContain('StorageKey');

      // The signed PDF is really on disk at the projected path (local dev
      // storage — `createReadUrl` returns a plain, non-expiring path, not a
      // signed/short-lived URL; see this suite's report for the distinction
      // from the S3 provider used in non-local environments).
      const relativePath = adminRes.body.pdfUrl.replace(/^.*\/files\//, '');
      const onDisk = await fs.readFile(path.join(uploadDir, relativePath), 'utf8');
      expect(onDisk).toBe('%PDF-FAKE-signed');
    });

    it('returns 404 from the admin route when a driver has no signed contract yet', async () => {
      const res = await request(app.getHttpServer())
        .get(`/admin/drivers/${noApplicationCustomerUserId}/contract`)
        .set('Authorization', `Bearer ${adminSession.accessToken}`)
        .expect(404);

      expect(res.body.code).toBe('RESOURCE_NOT_FOUND');
    });

    it('re-applying after a rejection re-signs the same version and deletes the superseded evidence file', async () => {
      // `customerSession` already applied once above and is now
      // DRIVER/PENDING_APPROVAL. Simulate an admin rejection (out of this
      // suite's scope to drive through the full admin-review flow) so the
      // domain guard allows a second `apply()`.
      const rejected = await prismaMock.user.update({
        where: { id: customerUserId },
        data: { status: 'REJECTED' },
      });
      expect(rejected.status).toBe('REJECTED');

      const beforeAdminRes = await request(app.getHttpServer())
        .get(`/admin/drivers/${customerUserId}/contract`)
        .set('Authorization', `Bearer ${adminSession.accessToken}`)
        .expect(200);
      const staleRelativePath = beforeAdminRes.body.pdfUrl.replace(/^.*\/files\//, '');
      const staleAbsolutePath = path.join(uploadDir, staleRelativePath);
      await expect(fs.access(staleAbsolutePath)).resolves.toBeUndefined();

      await request(app.getHttpServer())
        .post('/driver/apply')
        .set('Authorization', `Bearer ${customerSession.accessToken}`)
        .send({ ...validApplyPayload, signature: 'Nguyễn Văn A (đã ký lại)' })
        .expect(201);

      const afterAdminRes = await request(app.getHttpServer())
        .get(`/admin/drivers/${customerUserId}/contract`)
        .set('Authorization', `Bearer ${adminSession.accessToken}`)
        .expect(200);

      expect(afterAdminRes.body.signedByName).toBe('Nguyễn Văn A (đã ký lại)');
      const freshRelativePath = afterAdminRes.body.pdfUrl.replace(/^.*\/files\//, '');
      expect(freshRelativePath).not.toBe(staleRelativePath);

      // The stale evidence file is gone — a re-applied driver's admin view
      // (and anyone who cached the old URL) can no longer read the
      // superseded PDF, only the current one.
      await expect(fs.access(staleAbsolutePath)).rejects.toThrow();
    });
  });
});
