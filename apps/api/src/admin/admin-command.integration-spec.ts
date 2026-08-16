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

describe('Admin Command Operations (Integration)', () => {
  let app: INestApplication;
  let prismaMock: InMemoryPrismaService;
  let adminSession: { accessToken: string };
  let adminUserId: string;
  let targetUserId: string;

  beforeAll(async () => {
    process.env = {
      ...process.env,
      NODE_ENV: 'test',
      AUTH_DEMO_LOGIN_ENABLED: 'true',
      AUTH_ACCESS_TOKEN_SECRET: 'test-access-token-secret-32-chars-long',
      AUTH_REFRESH_TOKEN_SECRET: 'test-refresh-token-secret-32-chars-long',
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

    // Create Admin User
    const admin = await prismaMock.user.create({
      data: { phone: '+84999999999', role: 'ADMIN', status: 'ACTIVE' },
    });
    adminUserId = admin.id;
    const s1 = await refreshSessions.create(admin.id);
    adminSession = tokenService.createAuthSession(admin, s1);

    // Create Target User (Customer)
    const target = await prismaMock.user.create({
      data: { phone: '+84988888888', role: 'CUSTOMER', status: 'ACTIVE' },
    });
    targetUserId = target.id;
  });

  afterAll(async () => {
    if (app) await app.close();
  });

  it('updates user status and writes exactly-once audit log atomically', async () => {
    const clientRequestId = 'req-update-status-1';
    const res = await request(app.getHttpServer())
      .patch(`/admin/users/${targetUserId}/status`)
      .set('Authorization', `Bearer ${adminSession.accessToken}`)
      .send({
        status: 'DISABLED',
        reason: 'Vi phạm chính sách sử dụng dịch vụ',
        clientRequestId,
      })
      .expect(200);

    expect(res.body).toMatchObject({ success: true });

    const updatedUser = prismaMock.users.get(targetUserId);
    expect(updatedUser?.status).toBe('DISABLED');

    // Verify exactly-once audit log was created
    const audits = Array.from(prismaMock.auditLogs.values()).filter(
      (a) => a.action === 'UPDATE_USER_STATUS' && a.resourceId === targetUserId,
    );
    expect(audits.length).toBe(1);
    expect(audits[0]?.actorId).toBe(adminUserId);
  });

  it('prevents self-disable: Admin cannot disable own account', async () => {
    await request(app.getHttpServer())
      .patch(`/admin/users/${adminUserId}/status`)
      .set('Authorization', `Bearer ${adminSession.accessToken}`)
      .send({
        status: 'DISABLED',
        reason: 'Tự khóa tài khoản của chính mình',
        clientRequestId: 'req-self-disable',
      })
      .expect(403);

    const adminUser = prismaMock.users.get(adminUserId);
    expect(adminUser?.status).toBe('ACTIVE');
  });

  it('rejects status update with reason too short (< 5 characters)', async () => {
    await request(app.getHttpServer())
      .patch(`/admin/users/${targetUserId}/status`)
      .set('Authorization', `Bearer ${adminSession.accessToken}`)
      .send({
        status: 'ACTIVE',
        reason: 'ngắn',
        clientRequestId: 'req-short-reason',
      })
      .expect(422);
  });

  it('handles idempotency gracefully with the same clientRequestId', async () => {
    const clientRequestId = 'req-idempotent-status-change';

    // First request
    await request(app.getHttpServer())
      .patch(`/admin/users/${targetUserId}/status`)
      .set('Authorization', `Bearer ${adminSession.accessToken}`)
      .send({
        status: 'ACTIVE',
        reason: 'Mở lại tài khoản sau khi xem xét khiếu nại',
        clientRequestId,
      })
      .expect(200);

    // Second duplicate request
    await request(app.getHttpServer())
      .patch(`/admin/users/${targetUserId}/status`)
      .set('Authorization', `Bearer ${adminSession.accessToken}`)
      .send({
        status: 'ACTIVE',
        reason: 'Mở lại tài khoản sau khi xem xét khiếu nại',
        clientRequestId,
      })
      .expect(200);
  });
});
