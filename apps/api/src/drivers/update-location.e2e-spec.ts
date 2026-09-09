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

describe('Driver Location Ping API (E2E)', () => {
  let app: INestApplication;
  let driverSession: AuthSessionBody;
  let customerSession: AuthSessionBody;
  let prismaMock: InMemoryPrismaService;

  beforeAll(async () => {
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

    const tokenService = app.get(TokenService);
    const refreshSessions = app.get(RefreshSessionRepository);

    const driverUser = await prismaMock.user.create({
      data: { phone: '+84966666666', role: 'DRIVER', status: 'ACTIVE' },
    });
    await prismaMock.driverProfile.create({
      data: { userId: driverUser.id, availability: 'AVAILABLE', vehicleType: 'MOTORBIKE' },
    });
    const driverSessionRecord = await refreshSessions.create(driverUser.id);
    driverSession = tokenService.createAuthSession(driverUser, driverSessionRecord);

    const customerUser = await prismaMock.user.create({
      data: { phone: '+84955555555', role: 'CUSTOMER', status: 'ACTIVE' },
    });
    const customerSessionRecord = await refreshSessions.create(customerUser.id);
    customerSession = tokenService.createAuthSession(customerUser, customerSessionRecord);
  });

  afterAll(async () => {
    if (app) {
      await app.close();
    }
  });

  it('allows Driver to report their current location', async () => {
    await request(app.getHttpServer())
      .patch('/driver/location')
      .set('Authorization', `Bearer ${driverSession.accessToken}`)
      .send({ lat: 10.7326, lng: 106.7168 })
      .expect(200);
  });

  it('rejects out-of-range coordinates with 422', async () => {
    await request(app.getHttpServer())
      .patch('/driver/location')
      .set('Authorization', `Bearer ${driverSession.accessToken}`)
      .send({ lat: 999, lng: 106.7168 })
      .expect(422);
  });

  it('rejects Customer access with 403 Forbidden', async () => {
    await request(app.getHttpServer())
      .patch('/driver/location')
      .set('Authorization', `Bearer ${customerSession.accessToken}`)
      .send({ lat: 10.7326, lng: 106.7168 })
      .expect(403);
  });
});
