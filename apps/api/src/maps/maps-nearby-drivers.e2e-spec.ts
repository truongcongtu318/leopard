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

describe('Maps Nearby Drivers API (E2E)', () => {
  let app: INestApplication;
  let customerSession: AuthSessionBody;
  let prismaMock: InMemoryPrismaService;

  beforeAll(async () => {
    process.env = {
      ...process.env,
      NODE_ENV: 'test',
      AUTH_DEMO_LOGIN_ENABLED: 'true',
      AUTH_ACCESS_TOKEN_SECRET: 'test-access-token-secret',
      AUTH_REFRESH_TOKEN_SECRET: 'test-refresh-token-secret',
      MAP_PROVIDER: 'demo',
      ALLOW_DEMO_PROVIDER: 'true',
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

    const tokenService = app.get(TokenService);
    const refreshSessions = app.get(RefreshSessionRepository);

    const customerUser = await prismaMock.user.create({
      data: { phone: '+84988888888', role: 'CUSTOMER', status: 'ACTIVE' },
    });
    const session = await refreshSessions.create(customerUser.id);
    customerSession = tokenService.createAuthSession(customerUser, session);

    // Setup an available driver with a known location
    const driverUser = await prismaMock.user.create({
      data: { phone: '+84977777777', role: 'DRIVER', status: 'ACTIVE' },
    });
    await prismaMock.driverProfile.create({
      data: {
        userId: driverUser.id,
        vehicleType: 'TRUCK',
        availability: 'AVAILABLE',
        licensePlate: '59C-999.88',
        lastKnownAt: new Date(),
      } as any,
    });
    // Set location in memory
    prismaMock.driverLocations.set(driverUser.id, { lat: 10.7769, lng: 106.7009 });
  });

  afterAll(async () => {
    await app.close();
  });

  it('rejects unauthenticated requests with 401 Unauthorized', async () => {
    const response = await request(app.getHttpServer())
      .get('/maps/nearby-drivers')
      .query({ lat: 10.7769, lng: 106.7009 })
      .expect(401);

    expect(response.body).toMatchObject({
      statusCode: 401,
      code: 'UNAUTHORIZED',
    });
  });

  it('rejects missing or invalid lat/lng coordinates with 400 Bad Request', async () => {
    const response = await request(app.getHttpServer())
      .get('/maps/nearby-drivers')
      .set('Authorization', `Bearer ${customerSession.accessToken}`)
      .query({ lat: 'invalid', lng: 106.7009 })
      .expect(400);

    expect(response.body).toMatchObject({
      statusCode: 400,
      code: 'BAD_REQUEST',
    });
  });

  it('returns nearby available drivers for a valid customer query', async () => {
    const response = await request(app.getHttpServer())
      .get('/maps/nearby-drivers')
      .set('Authorization', `Bearer ${customerSession.accessToken}`)
      .query({ lat: 10.7769, lng: 106.7009, radiusM: 5000, vehicleType: 'TRUCK' })
      .expect(200);

    expect(response.body).toMatchObject({
      source: 'LIVE',
      drivers: expect.arrayContaining([
        expect.objectContaining({
          vehicleType: 'TRUCK',
          licensePlate: '59C-999.88',
        }),
      ]),
    });
  });
});
