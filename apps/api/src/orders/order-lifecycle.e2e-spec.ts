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
import { DeliveryProofReader } from './domain/delivery-proof-reader.js';

interface AuthSessionBody {
  readonly accessToken: string;
}

class TestDeliveryProofReader implements DeliveryProofReader {
  public mockHasProof = false;

  async hasDeliveryProof(_orderId: string): Promise<boolean> {
    return this.mockHasProof;
  }
}

describe('Order Lifecycle & Audited Cancellation REST API (E2E)', () => {
  let app: INestApplication;
  let customerSession: AuthSessionBody;
  let driverSession: AuthSessionBody;
  let adminSession: AuthSessionBody;
  let customerUserId: string;
  let driverUserId: string;
  let proofReader: TestDeliveryProofReader;
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
    proofReader = new TestDeliveryProofReader();

    const moduleFixture = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(PrismaService)
      .useValue(prismaMock)
      .overrideProvider(DeliveryProofReader)
      .useValue(proofReader)
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

    // Customer
    const cUser = await prismaMock.user.create({
      data: { phone: '+84910000001', role: 'CUSTOMER', status: 'ACTIVE' },
    });
    customerUserId = cUser.id;
    const cSess = await refreshSessions.create(cUser.id);
    customerSession = tokenService.createAuthSession(cUser, cSess);

    // Driver
    const dUser = await prismaMock.user.create({
      data: { phone: '+84910000002', role: 'DRIVER', status: 'ACTIVE' },
    });
    driverUserId = dUser.id;
    await prismaMock.driverProfile.create({
      data: { userId: dUser.id, availability: 'AVAILABLE', vehicleType: 'MOTORBIKE' },
    });
    const dSess = await refreshSessions.create(dUser.id);
    driverSession = tokenService.createAuthSession(dUser, dSess);

    // Admin
    const aUser = await prismaMock.user.create({
      data: { phone: '+84910000003', role: 'ADMIN', status: 'ACTIVE' },
    });
    const aSess = await refreshSessions.create(aUser.id);
    adminSession = tokenService.createAuthSession(aUser, aSess);
  });

  afterEach(async () => {
    if (app) {
      await app.close();
    }
  });

  it('runs full lifecycle: ACCEPTED -> PICKING_UP -> IN_TRANSIT -> DELIVERED with proof', async () => {
    const order = await prismaMock.order.create({
      data: { customerId: customerUserId, status: 'REQUESTED', distanceMeters: 1000, durationSeconds: 300, priceVnd: 20000 },
    });

    // Driver accepts order
    await request(app.getHttpServer())
      .post(`/driver/orders/${order.id}/accept`)
      .set('Authorization', `Bearer ${driverSession.accessToken}`)
      .expect(200);

    // Update to PICKING_UP
    const pickRes = await request(app.getHttpServer())
      .post(`/driver/orders/${order.id}/status`)
      .set('Authorization', `Bearer ${driverSession.accessToken}`)
      .send({ status: 'PICKING_UP', clientRequestId: 'req-1' })
      .expect(200);

    expect(pickRes.body.status).toBe('PICKING_UP');

    // Update to IN_TRANSIT
    const transitRes = await request(app.getHttpServer())
      .post(`/driver/orders/${order.id}/status`)
      .set('Authorization', `Bearer ${driverSession.accessToken}`)
      .send({ status: 'IN_TRANSIT', clientRequestId: 'req-2' })
      .expect(200);

    expect(transitRes.body.status).toBe('IN_TRANSIT');

    // Attempt DELIVERED without proof -> 409
    proofReader.mockHasProof = false;
    await request(app.getHttpServer())
      .post(`/driver/orders/${order.id}/status`)
      .set('Authorization', `Bearer ${driverSession.accessToken}`)
      .send({ status: 'DELIVERED', clientRequestId: 'req-3' })
      .expect(409);

    // Provide proof & update to DELIVERED -> 200
    proofReader.mockHasProof = true;
    const delivRes = await request(app.getHttpServer())
      .post(`/driver/orders/${order.id}/status`)
      .set('Authorization', `Bearer ${driverSession.accessToken}`)
      .send({ status: 'DELIVERED', clientRequestId: 'req-4' })
      .expect(200);

    expect(delivRes.body.status).toBe('DELIVERED');

    // Driver profile should be back to AVAILABLE
    const profile = await prismaMock.driverProfile.findUnique({ where: { userId: driverUserId } });
    expect(profile?.availability).toBe('AVAILABLE');
  });

  it('allows Customer to cancel order in REQUESTED state', async () => {
    const order = await prismaMock.order.create({
      data: { customerId: customerUserId, status: 'REQUESTED', distanceMeters: 1000, durationSeconds: 300, priceVnd: 20000 },
    });

    const cancelRes = await request(app.getHttpServer())
      .post(`/orders/${order.id}/cancel`)
      .set('Authorization', `Bearer ${customerSession.accessToken}`)
      .send({})
      .expect(200);

    expect(cancelRes.body.status).toBe('CANCELLED');
  });

  it('allows Admin to cancel order in ACCEPTED state with reason and resets driver availability', async () => {
    const order = await prismaMock.order.create({
      data: { customerId: customerUserId, status: 'REQUESTED', distanceMeters: 1000, durationSeconds: 300, priceVnd: 20000 },
    });

    // Accept order
    await request(app.getHttpServer())
      .post(`/driver/orders/${order.id}/accept`)
      .set('Authorization', `Bearer ${driverSession.accessToken}`)
      .expect(200);

    // Admin cancels with reason
    const cancelRes = await request(app.getHttpServer())
      .post(`/orders/${order.id}/cancel`)
      .set('Authorization', `Bearer ${adminSession.accessToken}`)
      .send({ reason: 'Customer requested cancellation via phone' })
      .expect(200);

    expect(cancelRes.body.status).toBe('CANCELLED');

    const profile = await prismaMock.driverProfile.findUnique({ where: { userId: driverUserId } });
    expect(profile?.availability).toBe('AVAILABLE');
  });
});
