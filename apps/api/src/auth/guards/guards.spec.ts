/// <reference types="jest" />

import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  UseGuards,
  ValidationPipe,
} from '@nestjs/common';
import { APP_FILTER } from '@nestjs/core';
import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import type { Role, UserStatus } from '@prisma/client';
import request from 'supertest';

import {
  CurrentUser,
  CurrentUserRole,
  type AuthenticatedActor,
} from '../decorators/current-user.js';
import { RequireRoles } from '../decorators/require-roles.js';
import { AccessTokenGuard } from './access-token.guard.js';
import { RoleGuard } from './role.guard.js';
import {
  RefreshSessionRepository,
  type CreatedRefreshSession,
} from '../refresh-session.repository.js';
import { TokenService } from '../token.service.js';
import { PrismaService } from '../../database/prisma.service.js';
import { ResourcePolicy } from '../policies/resource-policy.js';
import { ApiExceptionFilter } from '../../common/api-exception.filter.js';
import { DomainError } from '../../common/domain-error.js';

interface StoredUser {
  readonly id: string;
  readonly phone: string;
  readonly role: Role;
  status: UserStatus;
  readonly createdAt: Date;
  updatedAt: Date;
}

interface StoredRefreshSession {
  readonly id: string;
  readonly userId: string;
  readonly tokenHash: string;
  readonly expiresAt: Date;
  revokedAt: Date | null;
  readonly createdAt: Date;
  readonly updatedAt: Date;
}

function createPrismaDouble() {
  const users = new Map<string, StoredUser>();
  const refreshSessions = new Map<string, StoredRefreshSession>();

  return {
    users,
    refreshSessions,
    prisma: {
      user: {
        findUnique: jest.fn(({ where }: { where: { id: string } }) =>
          Promise.resolve(users.get(where.id) ?? null),
        ),
      },
      refreshSession: {
        findUnique: jest.fn(({ where }: { where: { id: string } }) =>
          Promise.resolve(refreshSessions.get(where.id) ?? null),
        ),
      },
    },
  };
}

function createTokenService(): TokenService {
  return new TokenService({} as never);
}

function createAccessToken(
  tokenService: TokenService,
  actor: Pick<AuthenticatedActor, 'userId' | 'role' | 'sessionId'>,
  expiresAt: Date,
): string {
  const refreshSession: CreatedRefreshSession = {
    refreshToken: 'refresh-token',
    record: {
      id: actor.sessionId,
      userId: actor.userId,
      tokenHash: 'hash',
      expiresAt,
      revokedAt: null,
    },
  };

  return tokenService.createAuthSession(
    { id: actor.userId, role: actor.role },
    refreshSession,
  ).accessToken;
}

@Controller('authz-test')
class GuardTestController {
  constructor(private readonly resourcePolicy: ResourcePolicy) {}

  @Get('profile')
  @UseGuards(AccessTokenGuard)
  public profile(
    @CurrentUser() actor: AuthenticatedActor,
    @CurrentUserRole() role: Role,
  ): { actor: AuthenticatedActor; role: Role } {
    return { actor, role };
  }

  @Get('admin')
  @RequireRoles('ADMIN')
  @UseGuards(AccessTokenGuard, RoleGuard)
  public admin(
    @CurrentUser() actor: AuthenticatedActor,
  ): { userId: string; role: Role } {
    return { userId: actor.userId, role: actor.role };
  }

  @Post('owner/:ownerUserId')
  @UseGuards(AccessTokenGuard)
  public async owner(
    @CurrentUser() actor: AuthenticatedActor,
    @Param('ownerUserId') ownerUserId: string,
    @Query('ownerUserId') ignoredOwnerUserId: string | undefined,
    @Body() body: { ownerUserId?: string; role?: string } | undefined,
  ): Promise<{ ok: true; userId: string; ignoredOwnerUserId?: string }> {
    await this.resourcePolicy.assert(actor, 'read', {
      ownerUserId,
      clientHints: {
        queryOwnerUserId: ignoredOwnerUserId,
        bodyOwnerUserId: body?.ownerUserId,
        bodyRole: body?.role,
      },
    });

    return { ok: true, userId: actor.userId, ignoredOwnerUserId };
  }
}

describe('PH-05-T04 guards and resource policy', () => {
  let app: INestApplication;
  let prismaState: ReturnType<typeof createPrismaDouble>;
  let tokenService: TokenService;

  beforeEach(async () => {
    process.env.NODE_ENV = 'test';
    process.env.AUTH_ACCESS_TOKEN_SECRET = 'test-access-token-secret';
    process.env.AUTH_REFRESH_TOKEN_SECRET = 'test-refresh-token-secret';

    prismaState = createPrismaDouble();
    tokenService = createTokenService();

    const moduleFixture = await Test.createTestingModule({
      controllers: [GuardTestController],
      providers: [
        AccessTokenGuard,
        RoleGuard,
        ResourcePolicy,
        TokenService,
        { provide: PrismaService, useValue: prismaState.prisma },
        { provide: RefreshSessionRepository, useValue: {} },
        { provide: APP_FILTER, useClass: ApiExceptionFilter },
      ],
    })
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
    await app?.close();
    delete process.env.AUTH_ACCESS_TOKEN_SECRET;
    delete process.env.AUTH_REFRESH_TOKEN_SECRET;
  });

  it('rejects missing bearer tokens with 401', async () => {
    await request(app.getHttpServer())
      .get('/api/v1/authz-test/profile')
      .expect(401)
      .expect(({ body }) => {
        expect(body.code).toBe('UNAUTHORIZED');
      });
  });

  it('rejects malformed bearer tokens with 401', async () => {
    await request(app.getHttpServer())
      .get('/api/v1/authz-test/profile')
      .set('Authorization', 'Bearer not-a-jwt')
      .expect(401)
      .expect(({ body }) => {
        expect(body.code).toBe('UNAUTHORIZED');
      });
  });

  it('rejects expired access tokens with 401', async () => {
    const user: StoredUser = {
      id: 'user-expired',
      phone: '+840000000001',
      role: 'CUSTOMER',
      status: 'ACTIVE',
      createdAt: new Date('2026-08-01T00:00:00.000Z'),
      updatedAt: new Date('2026-08-01T00:00:00.000Z'),
    };
    const session: StoredRefreshSession = {
      id: 'session-expired',
      userId: user.id,
      tokenHash: 'hash',
      expiresAt: new Date(Date.now() + 60_000),
      revokedAt: null,
      createdAt: new Date('2026-08-01T00:00:00.000Z'),
      updatedAt: new Date('2026-08-01T00:00:00.000Z'),
    };
    prismaState.users.set(user.id, user);
    prismaState.refreshSessions.set(session.id, session);

    const nowSpy = jest.spyOn(Date, 'now').mockReturnValue(
      Date.now() - 16 * 60 * 1_000,
    );
    const token = createAccessToken(tokenService, {
      userId: user.id,
      role: user.role,
      sessionId: session.id,
    }, session.expiresAt);
    nowSpy.mockRestore();

    await request(app.getHttpServer())
      .get('/api/v1/authz-test/profile')
      .set('Authorization', `Bearer ${token}`)
      .expect(401)
      .expect(({ body }) => {
        expect(body.code).toBe('UNAUTHORIZED');
      });
  });

  it('rejects revoked sessions with 401', async () => {
    const user: StoredUser = {
      id: 'user-revoked',
      phone: '+840000000002',
      role: 'CUSTOMER',
      status: 'ACTIVE',
      createdAt: new Date('2026-08-01T00:00:00.000Z'),
      updatedAt: new Date('2026-08-01T00:00:00.000Z'),
    };
    const session: StoredRefreshSession = {
      id: 'session-revoked',
      userId: user.id,
      tokenHash: 'hash',
      expiresAt: new Date(Date.now() + 60_000),
      revokedAt: new Date('2026-08-01T01:00:00.000Z'),
      createdAt: new Date('2026-08-01T00:00:00.000Z'),
      updatedAt: new Date('2026-08-01T00:00:00.000Z'),
    };
    prismaState.users.set(user.id, user);
    prismaState.refreshSessions.set(session.id, session);

    const token = createAccessToken(tokenService, {
      userId: user.id,
      role: user.role,
      sessionId: session.id,
    }, session.expiresAt);

    await request(app.getHttpServer())
      .get('/api/v1/authz-test/profile')
      .set('Authorization', `Bearer ${token}`)
      .expect(401)
      .expect(({ body }) => {
        expect(body.code).toBe('UNAUTHORIZED');
      });
  });

  it('rejects disabled users with 401 on private routes', async () => {
    const user: StoredUser = {
      id: 'user-disabled',
      phone: '+840000000003',
      role: 'FLEET_OWNER',
      status: 'DISABLED',
      createdAt: new Date('2026-08-01T00:00:00.000Z'),
      updatedAt: new Date('2026-08-01T00:00:00.000Z'),
    };
    const session: StoredRefreshSession = {
      id: 'session-disabled',
      userId: user.id,
      tokenHash: 'hash',
      expiresAt: new Date(Date.now() + 60_000),
      revokedAt: null,
      createdAt: new Date('2026-08-01T00:00:00.000Z'),
      updatedAt: new Date('2026-08-01T00:00:00.000Z'),
    };
    prismaState.users.set(user.id, user);
    prismaState.refreshSessions.set(session.id, session);

    const token = createAccessToken(tokenService, {
      userId: user.id,
      role: user.role,
      sessionId: session.id,
    }, session.expiresAt);

    await request(app.getHttpServer())
      .get('/api/v1/authz-test/profile')
      .set('Authorization', `Bearer ${token}`)
      .expect(401)
      .expect(({ body }) => {
        expect(body.code).toBe('UNAUTHORIZED');
      });
  });

  it('hydrates the current actor and role decorators from server-side auth state', async () => {
    const user: StoredUser = {
      id: 'user-active',
      phone: '+840000000004',
      role: 'CUSTOMER',
      status: 'ACTIVE',
      createdAt: new Date('2026-08-01T00:00:00.000Z'),
      updatedAt: new Date('2026-08-01T00:00:00.000Z'),
    };
    const session: StoredRefreshSession = {
      id: 'session-active',
      userId: user.id,
      tokenHash: 'hash',
      expiresAt: new Date(Date.now() + 60_000),
      revokedAt: null,
      createdAt: new Date('2026-08-01T00:00:00.000Z'),
      updatedAt: new Date('2026-08-01T00:00:00.000Z'),
    };
    prismaState.users.set(user.id, user);
    prismaState.refreshSessions.set(session.id, session);

    const token = createAccessToken(tokenService, {
      userId: user.id,
      role: user.role,
      sessionId: session.id,
    }, session.expiresAt);

    await request(app.getHttpServer())
      .get('/api/v1/authz-test/profile')
      .set('Authorization', `Bearer ${token}`)
      .expect(200)
      .expect(({ body }) => {
        expect(body).toEqual({
          actor: {
            userId: user.id,
            role: 'CUSTOMER',
            sessionId: session.id,
          },
          role: 'CUSTOMER',
        });
      });
  });

  it('returns 403 for role mismatches and ignores client-supplied role hints', async () => {
    const user: StoredUser = {
      id: 'user-customer',
      phone: '+840000000005',
      role: 'CUSTOMER',
      status: 'ACTIVE',
      createdAt: new Date('2026-08-01T00:00:00.000Z'),
      updatedAt: new Date('2026-08-01T00:00:00.000Z'),
    };
    const session: StoredRefreshSession = {
      id: 'session-customer',
      userId: user.id,
      tokenHash: 'hash',
      expiresAt: new Date(Date.now() + 60_000),
      revokedAt: null,
      createdAt: new Date('2026-08-01T00:00:00.000Z'),
      updatedAt: new Date('2026-08-01T00:00:00.000Z'),
    };
    prismaState.users.set(user.id, user);
    prismaState.refreshSessions.set(session.id, session);

    const token = createAccessToken(tokenService, {
      userId: user.id,
      role: user.role,
      sessionId: session.id,
    }, session.expiresAt);

    await request(app.getHttpServer())
      .get('/api/v1/authz-test/admin?role=ADMIN')
      .set('Authorization', `Bearer ${token}`)
      .expect(403)
      .expect(({ body }) => {
        expect(body.code).toBe('FORBIDDEN');
      });
  });

  it('allows the generic resource policy to authorize resource owners only', async () => {
    const user: StoredUser = {
      id: 'user-owner',
      phone: '+840000000006',
      role: 'DRIVER',
      status: 'ACTIVE',
      createdAt: new Date('2026-08-01T00:00:00.000Z'),
      updatedAt: new Date('2026-08-01T00:00:00.000Z'),
    };
    const session: StoredRefreshSession = {
      id: 'session-owner',
      userId: user.id,
      tokenHash: 'hash',
      expiresAt: new Date(Date.now() + 60_000),
      revokedAt: null,
      createdAt: new Date('2026-08-01T00:00:00.000Z'),
      updatedAt: new Date('2026-08-01T00:00:00.000Z'),
    };
    prismaState.users.set(user.id, user);
    prismaState.refreshSessions.set(session.id, session);

    const token = createAccessToken(tokenService, {
      userId: user.id,
      role: user.role,
      sessionId: session.id,
    }, session.expiresAt);

    await request(app.getHttpServer())
      .post(`/api/v1/authz-test/owner/${user.id}?ownerUserId=someone-else`)
      .set('Authorization', `Bearer ${token}`)
      .send({ ownerUserId: 'another-user', role: 'ADMIN' })
      .expect(201)
      .expect(({ body }) => {
        expect(body).toMatchObject({
          ok: true,
          userId: user.id,
          ignoredOwnerUserId: 'someone-else',
        });
      });
  });

  it('rejects non-owners through the generic resource policy with 403', async () => {
    const user: StoredUser = {
      id: 'user-non-owner',
      phone: '+840000000007',
      role: 'DRIVER',
      status: 'ACTIVE',
      createdAt: new Date('2026-08-01T00:00:00.000Z'),
      updatedAt: new Date('2026-08-01T00:00:00.000Z'),
    };
    const session: StoredRefreshSession = {
      id: 'session-non-owner',
      userId: user.id,
      tokenHash: 'hash',
      expiresAt: new Date(Date.now() + 60_000),
      revokedAt: null,
      createdAt: new Date('2026-08-01T00:00:00.000Z'),
      updatedAt: new Date('2026-08-01T00:00:00.000Z'),
    };
    prismaState.users.set(user.id, user);
    prismaState.refreshSessions.set(session.id, session);

    const token = createAccessToken(tokenService, {
      userId: user.id,
      role: user.role,
      sessionId: session.id,
    }, session.expiresAt);

    await request(app.getHttpServer())
      .post('/api/v1/authz-test/owner/actual-owner')
      .set('Authorization', `Bearer ${token}`)
      .send({ ownerUserId: user.id, role: 'ADMIN' })
      .expect(403)
      .expect(({ body }) => {
        expect(body.code).toBe('FORBIDDEN');
      });
  });

  it('supports direct policy checks for role and predicate-based resources', async () => {
    const policy = new ResourcePolicy();
    const actor: AuthenticatedActor = {
      userId: 'actor-1',
      role: 'FLEET_OWNER',
      sessionId: 'session-1',
    };

    await expect(
      policy.assert(actor, 'view', {
        allowedRoles: ['FLEET_OWNER'],
      }),
    ).resolves.toBeUndefined();

    await expect(
      policy.assert(actor, 'view', {
        isAccessibleBy: (
          candidate: AuthenticatedActor,
          action: string,
          resource: { readonly fleetId: string },
        ) => candidate.userId === 'actor-1' && action === 'view' && resource.fleetId === 'fleet-1',
        fleetId: 'fleet-1',
      }),
    ).resolves.toBeUndefined();

    await expect(
      policy.assert(actor, 'manage', {
        allowedRoles: ['ADMIN'],
      }),
    ).rejects.toEqual(
      new DomainError('FORBIDDEN', 403, 'You do not have access to this resource'),
    );
  });
});
