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

describe('Fleet Owner Operations (E2E & 2-Fleet Isolation)', () => {
  let app: INestApplication;
  let prismaMock: InMemoryPrismaService;
  let owner1Session: { accessToken: string };
  let owner2Session: { accessToken: string };
  let fleet1Id: string;
  let fleet2Id: string;
  let driver1Id: string;
  let driver2Id: string;

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

    // Fleet 1 & Owner 1
    const owner1 = await prismaMock.user.create({
      data: { phone: '+84901111111', role: 'FLEET_OWNER', status: 'ACTIVE' },
    });
    const s1 = await refreshSessions.create(owner1.id);
    owner1Session = tokenService.createAuthSession(owner1, s1);

    const f1 = await prismaMock.fleet.create({ data: { name: 'Fleet Alpha' } });
    fleet1Id = f1.id;
    await prismaMock.fleetMember.create({
      data: { fleetId: fleet1Id, userId: owner1.id, role: 'OWNER', status: 'ACTIVE' },
    });

    // Fleet 2 & Owner 2
    const owner2 = await prismaMock.user.create({
      data: { phone: '+84902222222', role: 'FLEET_OWNER', status: 'ACTIVE' },
    });
    const s2 = await refreshSessions.create(owner2.id);
    owner2Session = tokenService.createAuthSession(owner2, s2);

    const f2 = await prismaMock.fleet.create({ data: { name: 'Fleet Beta' } });
    fleet2Id = f2.id;
    await prismaMock.fleetMember.create({
      data: { fleetId: fleet2Id, userId: owner2.id, role: 'OWNER', status: 'ACTIVE' },
    });

    // Driver 1 in Fleet 1
    const d1 = await prismaMock.user.create({
      data: { phone: '+84911111111', role: 'DRIVER', status: 'ACTIVE' },
    });
    driver1Id = d1.id;
    await prismaMock.driverProfile.create({
      data: { userId: d1.id, availability: 'AVAILABLE', vehicleType: 'MOTORBIKE' },
    });
    await prismaMock.fleetMember.create({
      data: { fleetId: fleet1Id, userId: d1.id, role: 'DRIVER', status: 'ACTIVE' },
    });

    // Driver 2 in Fleet 2
    const d2 = await prismaMock.user.create({
      data: { phone: '+84922222222', role: 'DRIVER', status: 'ACTIVE' },
    });
    driver2Id = d2.id;
    await prismaMock.driverProfile.create({
      data: { userId: d2.id, availability: 'AVAILABLE', vehicleType: 'MOTORBIKE' },
    });
    await prismaMock.fleetMember.create({
      data: { fleetId: fleet2Id, userId: d2.id, role: 'DRIVER', status: 'ACTIVE' },
    });
  });

  afterAll(async () => {
    if (app) await app.close();
  });

  it('allows Fleet Owner 1 to view own fleet profile and drivers', async () => {
    const res = await request(app.getHttpServer())
      .get('/fleet/drivers')
      .set('Authorization', `Bearer ${owner1Session.accessToken}`)
      .expect(200);

    expect(res.body).toBeDefined();
    expect(res.body.items).toBeInstanceOf(Array);
    const driverIds = res.body.items.map((d: any) => d.id);
    expect(driverIds).toContain(driver1Id);
    expect(driverIds).not.toContain(driver2Id);
  });

  it('enforces 2-fleet isolation: Fleet Owner 2 cannot see Fleet 1 drivers', async () => {
    const res = await request(app.getHttpServer())
      .get('/fleet/drivers')
      .set('Authorization', `Bearer ${owner2Session.accessToken}`)
      .expect(200);

    const driverIds = res.body.items.map((d: any) => d.id);
    expect(driverIds).toContain(driver2Id);
    expect(driverIds).not.toContain(driver1Id);
  });

  it('rejects access from non-fleet owner (e.g. driver) with 403', async () => {
    const tokenService = app.get(TokenService);
    const refreshSessions = app.get(RefreshSessionRepository);
    const driverUser = prismaMock.users.get(driver1Id)!;
    const s = await refreshSessions.create(driver1Id);
    const driverSession = tokenService.createAuthSession(driverUser, s);

    await request(app.getHttpServer())
      .get('/fleet/drivers')
      .set('Authorization', `Bearer ${driverSession.accessToken}`)
      .expect(403);
  });
});
