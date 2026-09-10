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
  firebaseUid: string | null;
  phone: string | null;
  email: string | null;
  phoneVerifiedAt: Date | null;
  emailVerifiedAt: Date | null;
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

interface UserWhere {
  readonly id?: string;
  readonly phone?: string;
  readonly email?: string;
  readonly firebaseUid?: string;
}

interface UserWriteData {
  readonly firebaseUid?: string | null;
  readonly phone?: string | null;
  readonly email?: string | null;
  readonly phoneVerifiedAt?: Date | null;
  readonly emailVerifiedAt?: Date | null;
  readonly role?: Role;
  readonly status?: UserStatus;
}

function createPrismaDouble() {
  const users = new Map<string, StoredUser>();
  const refreshSessions = new Map<string, StoredRefreshSession>();

  const findByWhere = (where: UserWhere): StoredUser | null => {
    if (where.id) {
      return users.get(where.id) ?? null;
    }
    for (const user of users.values()) {
      if (where.phone && user.phone === where.phone) return user;
      if (where.email && user.email === where.email) return user;
      if (where.firebaseUid && user.firebaseUid === where.firebaseUid)
        return user;
    }
    return null;
  };

  return {
    users,
    refreshSessions,
    prisma: {
      user: {
        findUnique: jest.fn(({ where }: { where: UserWhere }) =>
          Promise.resolve(findByWhere(where)),
        ),
        update: jest.fn(
          ({ where, data }: { where: UserWhere; data: UserWriteData }) => {
            const existing = findByWhere(where);
            if (!existing) {
              return Promise.reject(new Error('User not found'));
            }
            if (data.firebaseUid !== undefined)
              existing.firebaseUid = data.firebaseUid;
            if (data.phone !== undefined) existing.phone = data.phone;
            if (data.email !== undefined) existing.email = data.email;
            if (data.phoneVerifiedAt !== undefined)
              existing.phoneVerifiedAt = data.phoneVerifiedAt;
            if (data.emailVerifiedAt !== undefined)
              existing.emailVerifiedAt = data.emailVerifiedAt;
            if (data.status !== undefined) existing.status = data.status;
            return Promise.resolve(existing);
          },
        ),
        create: jest.fn(({ data }: { data: UserWriteData }) => {
          const user: StoredUser = {
            id: `user-${users.size + 1}`,
            firebaseUid: data.firebaseUid ?? null,
            phone: data.phone ?? null,
            email: data.email ?? null,
            phoneVerifiedAt: data.phoneVerifiedAt ?? null,
            emailVerifiedAt: data.emailVerifiedAt ?? null,
            role: data.role ?? 'CUSTOMER',
            status: data.status ?? 'ACTIVE',
            createdAt: new Date('2026-08-01T00:00:00.000Z'),
            updatedAt: new Date('2026-08-01T00:00:00.000Z'),
          };
          users.set(user.id, user);
          return Promise.resolve(user);
        }),
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
          message: 'Tài khoản đã bị vô hiệu hóa',
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

  it('creates a CUSTOMER account from a Google identity without a phone', async () => {
    verifyOtp.mockResolvedValue({
      providerUserId: 'google-user-1',
      email: 'sme@leopard.vn',
    });

    const response = await request(app.getHttpServer())
      .post('/api/v1/auth/firebase')
      .send({ idToken: 'google-id-token' })
      .expect(201);

    expect(response.body.user).toMatchObject({
      id: 'user-1',
      phone: null,
      role: 'CUSTOMER',
      status: 'ACTIVE',
    });

    const stored = prismaState.users.get('user-1');
    expect(stored).toMatchObject({
      firebaseUid: 'google-user-1',
      email: 'sme@leopard.vn',
      phone: null,
    });
    expect(stored?.emailVerifiedAt).toBeInstanceOf(Date);
    expect(stored?.phoneVerifiedAt).toBeNull();
  });

  it('links a Firebase phone identity to an existing account by phone number', async () => {
    verifyOtp.mockResolvedValueOnce({
      providerUserId: 'firebase-user-A',
      phoneNumber: '+84909111222',
    });
    const first = await request(app.getHttpServer())
      .post('/api/v1/auth/firebase')
      .send({ idToken: 'token-A' })
      .expect(201);
    expect(first.body.user.id).toBe('user-1');

    // A different Firebase uid but the same verified phone resolves to the same account.
    verifyOtp.mockResolvedValueOnce({
      providerUserId: 'firebase-user-B',
      phoneNumber: '+84909111222',
    });
    const second = await request(app.getHttpServer())
      .post('/api/v1/auth/firebase')
      .send({ idToken: 'token-B' })
      .expect(201);

    expect(second.body.user.id).toBe('user-1');
    expect(prismaState.users.size).toBe(1);
  });

  it('links a verified phone to a Google-only account via /auth/phone/link', async () => {
    verifyOtp.mockResolvedValueOnce({
      providerUserId: 'google-user-2',
      email: 'owner@leopard.vn',
    });
    const login = await request(app.getHttpServer())
      .post('/api/v1/auth/firebase')
      .send({ idToken: 'google-token' })
      .expect(201);
    const accessToken = login.body.session.accessToken as string;
    expect(login.body.user.phone).toBeNull();

    verifyOtp.mockResolvedValueOnce({
      providerUserId: 'google-user-2',
      phoneNumber: '+84909333444',
    });
    await request(app.getHttpServer())
      .post('/api/v1/auth/phone/link')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ idToken: 'phone-token' })
      .expect(201)
      .expect(({ body }) => {
        expect(body).toMatchObject({
          id: 'user-1',
          phone: '+84909333444',
          role: 'CUSTOMER',
          status: 'ACTIVE',
        });
      });

    expect(prismaState.users.get('user-1')?.phoneVerifiedAt).toBeInstanceOf(Date);
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
          message: 'Thông tin xác thực không hợp lệ',
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
            message: 'Hệ thống xác thực tạm thời không khả dụng',
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
