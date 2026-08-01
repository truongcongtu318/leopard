/// <reference types="jest" />

import { ValidationPipe } from '@nestjs/common';
import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import type { Role, UserStatus } from '@prisma/client';
import request from 'supertest';

import { PrismaService } from '../database/prisma.service.js';
import { AuthModule } from './auth.module.js';
import { OTP_PROVIDER } from './providers/otp-provider.js';

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
  tokenHash: string;
  expiresAt: Date;
  revokedAt: Date | null;
  readonly createdAt: Date;
  updatedAt: Date;
}

interface AuthSessionBody {
  readonly accessToken: string;
  readonly accessTokenExpiresAt: string;
  readonly refreshToken: string;
  readonly refreshTokenExpiresAt: string;
}

function createPrismaDouble() {
  const users = new Map<string, StoredUser>();
  const usersByPhone = new Map<string, string>();
  const refreshSessions = new Map<string, StoredRefreshSession>();

  const prisma = {
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
      findFirst: jest.fn(
        ({ where }: { where: { tokenHash: { startsWith: string } } }) => {
          const session =
            [...refreshSessions.values()].find((candidate) =>
              candidate.tokenHash.startsWith(where.tokenHash.startsWith),
            ) ?? null;

          return Promise.resolve(session);
        },
      ),
      update: jest.fn(
        ({
          where,
          data,
        }: {
          where: { id: string };
          data: Partial<Pick<StoredRefreshSession, 'revokedAt' | 'tokenHash' | 'expiresAt'>>;
        }) => {
          const session = refreshSessions.get(where.id);
          if (!session) {
            throw new Error(`Unknown refresh session ${where.id}`);
          }

          Object.assign(session, data, { updatedAt: new Date() });
          return Promise.resolve(session);
        },
      ),
      updateMany: jest.fn(
        ({
          where,
          data,
        }: {
          where: {
            id?: string;
            userId?: string;
            tokenHash?: { contains: string };
            revokedAt?: null;
            expiresAt?: { gt: Date };
          };
          data: { revokedAt: Date };
        }) => {
          let count = 0;

          for (const session of refreshSessions.values()) {
            if (where.id && session.id !== where.id) {
              continue;
            }
            if (where.userId && session.userId !== where.userId) {
              continue;
            }
            if (
              where.tokenHash?.contains &&
              !session.tokenHash.includes(where.tokenHash.contains)
            ) {
              continue;
            }
            if (where.revokedAt === null && session.revokedAt !== null) {
              continue;
            }
            if (
              where.expiresAt?.gt &&
              session.expiresAt.getTime() <= where.expiresAt.gt.getTime()
            ) {
              continue;
            }

            session.revokedAt = data.revokedAt;
            session.updatedAt = new Date();
            count += 1;
          }

          return Promise.resolve({ count });
        },
      ),
    },
    $transaction: jest.fn(
      async <T>(action: (tx: typeof prisma) => Promise<T>): Promise<T> =>
        action(prisma),
    ),
  };

  return { prisma, refreshSessions };
}

describe('PH-05-T03 refresh rotation and logout', () => {
  let app: INestApplication;
  let prismaState: ReturnType<typeof createPrismaDouble>;

  beforeEach(async () => {
    process.env.NODE_ENV = 'test';
    process.env.AUTH_DEMO_LOGIN_ENABLED = 'true';
    process.env.AUTH_ACCESS_TOKEN_SECRET = 'test-access-token-secret';
    process.env.AUTH_REFRESH_TOKEN_SECRET = 'test-refresh-token-secret';

    prismaState = createPrismaDouble();

    const moduleFixture = await Test.createTestingModule({
      imports: [AuthModule],
    })
      .overrideProvider(PrismaService)
      .useValue(prismaState.prisma)
      .overrideProvider(OTP_PROVIDER)
      .useValue({ verify: jest.fn() })
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
  });

  async function loginDemo(): Promise<AuthSessionBody> {
    const response = await request(app.getHttpServer())
      .post('/api/v1/auth/login/demo')
      .send({ accountId: 'customer' })
      .expect(201);

    return response.body.session as AuthSessionBody;
  }

  it('rotates a valid refresh token atomically and invalidates the prior access session', async () => {
    const original = await loginDemo();

    const response = await request(app.getHttpServer())
      .post('/api/v1/auth/refresh')
      .send({ refreshToken: original.refreshToken })
      .expect(201);
    const rotated = response.body as AuthSessionBody;

    expect(rotated.refreshToken).not.toBe(original.refreshToken);
    expect(rotated.accessToken).not.toBe(original.accessToken);
    expect(prismaState.refreshSessions.get('session-1')?.revokedAt).toBeInstanceOf(
      Date,
    );
    expect(prismaState.refreshSessions.get('session-2')?.tokenHash).not.toBe(
      rotated.refreshToken,
    );
    expect(prismaState.refreshSessions.get('session-2')?.tokenHash).toContain(
      '$argon2',
    );

    await request(app.getHttpServer())
      .get('/api/v1/me')
      .set('Authorization', `Bearer ${original.accessToken}`)
      .expect(401);
    await request(app.getHttpServer())
      .get('/api/v1/me')
      .set('Authorization', `Bearer ${rotated.accessToken}`)
      .expect(200);
  });

  it('revokes the active session family when an already rotated token is reused', async () => {
    const original = await loginDemo();
    const rotated = (
      await request(app.getHttpServer())
        .post('/api/v1/auth/refresh')
        .send({ refreshToken: original.refreshToken })
        .expect(201)
    ).body as AuthSessionBody;
    const independent = await loginDemo();

    await request(app.getHttpServer())
      .post('/api/v1/auth/refresh')
      .send({ refreshToken: original.refreshToken })
      .expect(401);

    await request(app.getHttpServer())
      .post('/api/v1/auth/refresh')
      .send({ refreshToken: rotated.refreshToken })
      .expect(401);
    await request(app.getHttpServer())
      .post('/api/v1/auth/refresh')
      .send({ refreshToken: independent.refreshToken })
      .expect(201);
  });

  it('rejects expired and revoked refresh tokens without issuing a replacement', async () => {
    const expired = await loginDemo();
    prismaState.refreshSessions.get('session-1')!.expiresAt = new Date(
      '2026-07-31T00:00:00.000Z',
    );

    await request(app.getHttpServer())
      .post('/api/v1/auth/refresh')
      .send({ refreshToken: expired.refreshToken })
      .expect(401);

    const revoked = await loginDemo();
    prismaState.refreshSessions.get('session-2')!.revokedAt = new Date();

    await request(app.getHttpServer())
      .post('/api/v1/auth/refresh')
      .send({ refreshToken: revoked.refreshToken })
      .expect(401);
    expect(prismaState.refreshSessions.size).toBe(2);
  });

  it('allows only one concurrent refresh request to rotate a token', async () => {
    const original = await loginDemo();

    const attempts = await Promise.allSettled([
      request(app.getHttpServer())
        .post('/api/v1/auth/refresh')
        .send({ refreshToken: original.refreshToken }),
      request(app.getHttpServer())
        .post('/api/v1/auth/refresh')
        .send({ refreshToken: original.refreshToken }),
    ]);
    const statuses = attempts.map((attempt) =>
      attempt.status === 'fulfilled' ? attempt.value.status : 0,
    );

    expect(statuses.sort()).toEqual([201, 401]);

    const winner = attempts.find(
      (attempt) => attempt.status === 'fulfilled' && attempt.value.status === 201,
    );
    if (winner?.status !== 'fulfilled') {
      throw new Error('Expected one successful refresh response');
    }

    await request(app.getHttpServer())
      .post('/api/v1/auth/refresh')
      .send({ refreshToken: (winner.value.body as AuthSessionBody).refreshToken })
      .expect(201);
  });

  it('logs out the bearer session and prevents later refresh', async () => {
    const session = await loginDemo();

    await request(app.getHttpServer())
      .post('/api/v1/auth/logout')
      .set('Authorization', `Bearer ${session.accessToken}`)
      .expect(204)
      .expect('');

    await request(app.getHttpServer())
      .post('/api/v1/auth/refresh')
      .send({ refreshToken: session.refreshToken })
      .expect(401);
    await request(app.getHttpServer())
      .get('/api/v1/me')
      .set('Authorization', `Bearer ${session.accessToken}`)
      .expect(401);
  });
});
