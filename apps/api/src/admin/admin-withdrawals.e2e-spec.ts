// apps/api/src/admin/admin-withdrawals.e2e-spec.ts
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

describe('Admin Withdrawal Review API (E2E)', () => {
  let app: INestApplication;
  let adminSession: AuthSessionBody;
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

    const admin = await prismaMock.user.create({ data: { phone: '+84900001111', role: 'ADMIN', status: 'ACTIVE' } });
    const adminSessionRecord = await refreshSessions.create(admin.id);
    adminSession = tokenService.createAuthSession(admin, adminSessionRecord);

    const driver = await prismaMock.user.create({ data: { phone: '+84900002222', role: 'DRIVER', status: 'ACTIVE' } });
    driverUserId = driver.id;
    await prismaMock.withdrawalRequest.create({
      data: { driverId: driverUserId, amountVnd: 100000, bankName: 'MB Bank', bankAccountNumber: '0987654321', bankAccountName: 'NGUYEN VAN A' },
    });
  });

  afterEach(async () => {
    if (app) await app.close();
  });

  it('lists pending withdrawal requests', async () => {
    const res = await request(app.getHttpServer())
      .get('/admin/withdrawals')
      .set('Authorization', `Bearer ${adminSession.accessToken}`)
      .expect(200);

    expect(res.body).toHaveLength(1);
    expect(res.body[0]).toMatchObject({ driverId: driverUserId, amountVnd: 100000, status: 'PENDING' });
  });

  it('approves a withdrawal request with a note', async () => {
    const listRes = await request(app.getHttpServer())
      .get('/admin/withdrawals')
      .set('Authorization', `Bearer ${adminSession.accessToken}`)
      .expect(200);
    const id = listRes.body[0].id;

    await request(app.getHttpServer())
      .post(`/admin/withdrawals/${id}/approve`)
      .set('Authorization', `Bearer ${adminSession.accessToken}`)
      .send({ note: 'Đã chuyển khoản thủ công', clientRequestId: 'req-approve-1' })
      .expect(201);

    const afterRes = await request(app.getHttpServer())
      .get('/admin/withdrawals')
      .set('Authorization', `Bearer ${adminSession.accessToken}`)
      .expect(200);
    expect(afterRes.body).toHaveLength(0); // no longer PENDING
  });

  it('rejects Driver access to admin withdrawal routes with 403', async () => {
    const tokenService = app.get(TokenService);
    const refreshSessions = app.get(RefreshSessionRepository);
    const driver = await prismaMock.user.findUnique({ where: { id: driverUserId } });
    const session = await refreshSessions.create(driver!.id);
    const driverSession = tokenService.createAuthSession(driver!, session);

    await request(app.getHttpServer())
      .get('/admin/withdrawals')
      .set('Authorization', `Bearer ${driverSession.accessToken}`)
      .expect(403);
  });
});
