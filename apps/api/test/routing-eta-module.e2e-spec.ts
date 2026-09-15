/// <reference types="jest" />

import { Test } from '@nestjs/testing';
import { AppModule } from '../src/app.module.js';
import { PrismaService } from '../src/database/prisma.service.js';
import { RouteEtaController } from '../src/routing-eta/route-eta.controller.js';
import { StopProgressController } from '../src/routing-eta/stop-progress.controller.js';
import { TrackingGateway } from '../src/tracking/tracking.gateway.js';
import { InMemoryPrismaService } from './prisma-mock.js';

describe('RoutingEtaModule — DI boot smoke test', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = {
      ...originalEnv,
      NODE_ENV: 'test',
      AUTH_DEMO_LOGIN_ENABLED: 'true',
      AUTH_ACCESS_TOKEN_SECRET: 'test-access-token-secret',
      AUTH_REFRESH_TOKEN_SECRET: 'test-refresh-token-secret',
      MAP_PROVIDER: 'demo',
      ALLOW_DEMO_PROVIDER: 'true',
    };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it('resolves the full module graph without missing providers', async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(PrismaService)
      .useValue(new InMemoryPrismaService())
      .compile();

    expect(moduleRef.get(RouteEtaController)).toBeDefined();
    expect(moduleRef.get(StopProgressController)).toBeDefined();
    expect(moduleRef.get(TrackingGateway)).toBeDefined();

    await moduleRef.close();
  });
});
