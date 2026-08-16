/// <reference types="jest" />

import { ValidationPipe } from '@nestjs/common';
import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import type { Role, UserStatus } from '@prisma/client';
import request from 'supertest';

import { AuthModule } from './auth.module.js';
import { OTP_PROVIDER, OtpProviderError } from './providers/otp-provider.js';
import { PrismaService } from '../database/prisma.service.js';

interface StoredUser {
  readonly id: string;
  readonly phone: string;
  readonly role: Role;
  status: UserStatus;
  readonly createdAt: Date;
  readonly updatedAt: Date;
}

interface StoredRefreshSession {
  readonly id: string;
  readonly userId: string;
  readonly tokenHash: string;
  readonly expiresAt: Date;
  readonly revokedAt: Date | null;
  readonly createdAt: Date;
  readonly updatedAt: Date;
}

function decodeJwtPayload(token: string): Record<string, unknown> {
  const [, payload] = token.split('.');
  if (!payload) {
    throw new Error('JWT payload segment missing');
  }

  return JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')) as Record<
    string,
    unknown
  >;
}

function createPrismaDouble() {
  const users = new Map<string, StoredUser>();
  const usersByPhone = new Map<string, string>();
  const refreshSessions = new Map<string, StoredRefreshSession>();

  return {
    users,
    refreshSessions,
    prisma: {
      user: {
        findUnique: jest.fn(({ where }: { where: { id?: string; phone?: string } }) => {
          if (where.id) {
            return Promise.resolve(users.get(where.id) ?? null);
          }

          if (where.phone) {
            const id = usersByPhone.get(where.phone);
            return Promise.resolve(id ? users.get(id) ?? null : null);
          }

          return Promise.resolve(null);
        }),
        create: jest.fn(
          ({
            data,
          }: {
            data: { phone: string; role: Role; status?: UserStatus };
          }) => {
            const user: StoredUser = {
              id: `user-${users.size + 1}`,
              phone: data.phone,
              role: data.role,
              status: data.status ?? 'ACTIVE',
              createdAt: new Date('2026-08-01T00:00:00.000Z'),
              updatedAt: new Date('2026-08-01T00:00:00.000Z'),
            };
            users.set(user.id, user);
            usersByPhone.set(user.phone, user.id);
            return Promise.resolve(user);
          },
        ),
      },
      refreshSession: {
        create: jest.fn(
          ({
            data,
          }: {
            data: { userId: string; tokenHash: string; expiresAt: Date };
          }) => {
            const session: StoredRefreshSession = {
              id: `session-${refreshSessions.size + 1}`,
              userId: data.userId,
              tokenHash: data.tokenHash,
              expiresAt: data.expiresAt,
              revokedAt: null,
              createdAt: new Date('2026-08-01T00:00:00.000Z'),
              updatedAt: new Date('2026-08-01T00:00:00.000Z'),
            };
            refreshSessions.set(session.id, session);
            return Promise.resolve(session);
          },
        ),
        findUnique: jest.fn(({ where }: { where: { id: string } }) =>
          Promise.resolve(refreshSessions.get(where.id) ?? null),
        ),
      },
    },
  };
}

describe('PH-05-T02 login and access tokens', () => {
  let app: INestApplication;
  let prismaState: ReturnType<typeof createPrismaDouble>;
  let verifyOtp: jest.Mock;

  beforeEach(async () => {
    process.env.NODE_ENV = 'test';
    process.env.AUTH_DEMO_LOGIN_ENABLED = 'true';
    process.env.AUTH_ACCESS_TOKEN_SECRET = 'test-access-token-secret';
    process.env.AUTH_REFRESH_TOKEN_SECRET = 'test-refresh-token-secret';
    delete process.env.AUTH_FIREBASE_TEST_TOKENS;

    verifyOtp = jest.fn();
    prismaState = createPrismaDouble();

    const moduleFixture = await Test.createTestingModule({
      imports: [AuthModule],
    })
      .overrideProvider(PrismaService)
      .useValue(prismaState.prisma)
      .overrideProvider(OTP_PROVIDER)
      .useValue({ verify: verifyOtp })
      .compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api/v1');
    app.useGlobalPipes(
      new ValidationPipe({
        forbidNonWhitelisted: true,
        transform: true,
        whitelist: true,
      }),
    );
    await app.init();
  });

  afterEach(async () => {
    await app.close();
    delete process.env.AUTH_DEMO_LOGIN_ENABLED;
    delete process.env.AUTH_ACCESS_TOKEN_SECRET;
    delete process.env.AUTH_REFRESH_TOKEN_SECRET;
    delete process.env.AUTH_FIREBASE_TEST_TOKENS;
  });

  it('issues a 15-minute access token and hashed refresh session for a demo account', async () => {
    const response = await request(app.getHttpServer())
      .post('/api/v1/auth/login/demo')
      .send({ accountId: 'customer' })
      .expect(201);

    expect(response.body.user).toMatchObject({
      id: 'user-1',
      phone: '+840000000001',
      role: 'CUSTOMER',
      status: 'ACTIVE',
    });
    expect(response.body.session).toMatchObject({
      accessToken: expect.any(String) as string,
      accessTokenExpiresAt: expect.any(String) as string,
      refreshToken: expect.any(String) as string,
      refreshTokenExpiresAt: expect.any(String) as string,
    });

    const accessToken = response.body.session.accessToken as string;
    const payload = decodeJwtPayload(accessToken);
    expect(payload).toMatchObject({
      sub: 'user-1',
      role: 'CUSTOMER',
      sessionId: 'session-1',
    });
    expect((payload.exp as number) - (payload.iat as number)).toBe(15 * 60);

    const persistedSession = prismaState.refreshSessions.get('session-1');
    expect(persistedSession).toBeDefined();
    expect(persistedSession?.tokenHash).not.toBe(
      response.body.session.refreshToken,
    );
    expect(persistedSession?.expiresAt.toISOString()).toBe(
      response.body.session.refreshTokenExpiresAt,
    );

    await request(app.getHttpServer())
      .get('/api/v1/me')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200)
      .expect(({ body }) => {
        expect(body).toMatchObject({
          id: 'user-1',
          phone: '+840000000001',
          role: 'CUSTOMER',
          status: 'ACTIVE',
        });
      });
  });

  it('rejects disabled users during login', async () => {
    await prismaState.prisma.user.create({
      data: {
        phone: '+840000000004',
        role: 'ADMIN',
        status: 'DISABLED',
      },
    });

    await request(app.getHttpServer())
      .post('/api/v1/auth/login/demo')
      .send({ accountId: 'admin' })
      .expect(403)
      .expect(({ body }) => {
        expect(body).toMatchObject({
          code: 'ACCOUNT_DISABLED',
          message: 'Account is disabled',
        });
      });
  });

  it('exchanges a valid Firebase token for a customer session', async () => {
    verifyOtp.mockResolvedValue({
      providerUserId: 'firebase-user-1',
      phoneNumber: '+84901234567',
    });

    const response = await request(app.getHttpServer())
      .post('/api/v1/auth/firebase')
      .send({ idToken: 'valid-id-token' })
      .expect(201);

    expect(response.body.user).toMatchObject({
      id: 'user-1',
      phone: '+84901234567',
      role: 'CUSTOMER',
      status: 'ACTIVE',
    });
    expect(response.body.session).toMatchObject({
      accessToken: expect.any(String) as string,
      accessTokenExpiresAt: expect.any(String) as string,
      refreshToken: expect.any(String) as string,
      refreshTokenExpiresAt: expect.any(String) as string,
    });

    const payload = decodeJwtPayload(response.body.session.accessToken as string);
    expect(payload).toMatchObject({
      sub: 'user-1',
      role: 'CUSTOMER',
      sessionId: 'session-1',
    });
  });

  it('maps invalid provider tokens to 401 without echoing the token', async () => {
    verifyOtp.mockRejectedValue(
      new OtpProviderError(
        'OTP_PROVIDER_REJECTED',
        'Firebase rejected secret-id-token',
      ),
    );

    await request(app.getHttpServer())
      .post('/api/v1/auth/firebase')
      .send({ idToken: 'secret-id-token' })
      .expect(401)
      .expect(({ body }) => {
        expect(body).toMatchObject({
          code: 'INVALID_PROVIDER_TOKEN',
          message: 'Provider token is invalid',
        });
        expect(JSON.stringify(body)).not.toContain('secret-id-token');
      });
  });

  it.each(['OTP_PROVIDER_TIMEOUT', 'OTP_PROVIDER_UNAVAILABLE'] as const)(
    'maps %s to a stable redacted 503 response',
    async (providerCode) => {
      verifyOtp.mockRejectedValue(
        new OtpProviderError(providerCode, 'provider leaked secret-id-token'),
      );

      await request(app.getHttpServer())
        .post('/api/v1/auth/firebase')
        .send({ idToken: 'secret-id-token' })
        .expect(503)
        .expect(({ body }) => {
          expect(body).toMatchObject({
            code: 'OTP_PROVIDER_UNAVAILABLE',
            message: 'OTP provider is unavailable',
          });
          expect(JSON.stringify(body)).not.toContain('secret-id-token');
        });
    },
  );
});

describe('PH-05-T02 app-wired Firebase login', () => {
  let app: INestApplication;
  let prismaState: ReturnType<typeof createPrismaDouble>;

  beforeEach(async () => {
    process.env.NODE_ENV = 'test';
    process.env.AUTH_ACCESS_TOKEN_SECRET = 'test-access-token-secret';
    process.env.AUTH_REFRESH_TOKEN_SECRET = 'test-refresh-token-secret';
    process.env.AUTH_FIREBASE_TEST_TOKENS = JSON.stringify({
      'valid-id-token': {
        uid: 'firebase-user-1',
        phone_number: '+84901234567',
      },
    });

    prismaState = createPrismaDouble();

    const moduleFixture = await Test.createTestingModule({
      imports: [AuthModule],
    })
      .overrideProvider(PrismaService)
      .useValue(prismaState.prisma)
      .compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api/v1');
    app.useGlobalPipes(
      new ValidationPipe({
        forbidNonWhitelisted: true,
        transform: true,
        whitelist: true,
      }),
    );
    await app.init();
  });

  afterEach(async () => {
    await app.close();
    delete process.env.AUTH_ACCESS_TOKEN_SECRET;
    delete process.env.AUTH_REFRESH_TOKEN_SECRET;
    delete process.env.AUTH_FIREBASE_TEST_TOKENS;
  });

  it('exchanges a configured local Firebase token through AuthModule provider wiring', async () => {
    const response = await request(app.getHttpServer())
      .post('/api/v1/auth/firebase')
      .send({ idToken: 'valid-id-token' })
      .expect(201);

    expect(response.body.user).toMatchObject({
      id: 'user-1',
      phone: '+84901234567',
      role: 'CUSTOMER',
      status: 'ACTIVE',
    });
    expect(response.body.session).toMatchObject({
      accessToken: expect.any(String) as string,
      accessTokenExpiresAt: expect.any(String) as string,
      refreshToken: expect.any(String) as string,
      refreshTokenExpiresAt: expect.any(String) as string,
    });

    const payload = decodeJwtPayload(response.body.session.accessToken as string);
    expect(payload).toMatchObject({
      sub: 'user-1',
      role: 'CUSTOMER',
      sessionId: 'session-1',
    });
  });
});
