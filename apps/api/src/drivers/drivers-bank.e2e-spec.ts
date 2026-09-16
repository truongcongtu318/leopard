// apps/api/src/drivers/drivers-bank.e2e-spec.ts
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

describe('Driver Bank Account API (E2E)', () => {
  let app: INestApplication;
  let accessToken: string;

  beforeEach(async () => {
    process.env = {
      ...process.env,
      NODE_ENV: 'test',
      AUTH_DEMO_LOGIN_ENABLED: 'true',
      AUTH_ACCESS_TOKEN_SECRET: 'test-access-token-secret',
      AUTH_REFRESH_TOKEN_SECRET: 'test-refresh-token-secret',
    };
    const prismaMock = new InMemoryPrismaService();
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
    const driver = await prismaMock.user.create({ data: { phone: '+84911113333', role: 'DRIVER', status: 'ACTIVE' } });
    await prismaMock.driverProfile.create({ data: { userId: driver.id, availability: 'OFFLINE', vehicleType: 'MOTORBIKE' } });
    const session = await refreshSessions.create(driver.id);
    accessToken = tokenService.createAuthSession(driver, session).accessToken;
  });

  afterEach(async () => {
    if (app) await app.close();
  });

  it('updates the linked bank account and reflects it in the wallet summary', async () => {
    await request(app.getHttpServer())
      .patch('/driver/wallet/bank')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        bankName: 'MB Bank',
        bankAccountNumber: '0987654321',
        bankAccountName: 'NGUYEN VAN A',
      })
      .expect(200);

    const summary = await request(app.getHttpServer())
      .get('/driver/wallet')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);

    expect(summary.body.bankName).toBe('MB Bank');
    expect(summary.body.bankAccountNumber).toBe('0987654321');
    expect(summary.body.bankAccountName).toBe('NGUYEN VAN A');
  });

  it('rejects a bank update with a missing account number via 400', async () => {
    await request(app.getHttpServer())
      .patch('/driver/wallet/bank')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ bankName: 'MB Bank', bankAccountName: 'NGUYEN VAN A' })
      // NOTE: ApiExceptionFilter maps ValidationPipe 400 → 422 VALIDATION_ERROR
      // (repo convention, cf. update-location / driver-contract / invoices specs).
      .expect(422);
  });
});
