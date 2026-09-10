/// <reference types="jest" />

import { ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { createHmac } from 'node:crypto';

import { AppModule } from '../../src/app.module.js';
import { ApiExceptionFilter } from '../../src/common/api-exception.filter.js';
import { PrismaService } from '../../src/database/prisma.service.js';
import { TokenService } from '../../src/auth/token.service.js';
import { RefreshSessionRepository } from '../../src/auth/refresh-session.repository.js';
import { OTP_PROVIDER } from '../../src/auth/providers/otp-provider.js';
import { InMemoryPrismaService } from '../prisma-mock.js';

interface AuthSessionBody {
  readonly accessToken: string;
  readonly accessTokenExpiresAt: string;
  readonly refreshToken: string;
  readonly refreshTokenExpiresAt: string;
}

function craftJwt(
  headerObj: Record<string, unknown>,
  payloadObj: Record<string, unknown>,
  secret: string = 'test-access-token-secret-32-chars-long',
): string {
  const header = Buffer.from(JSON.stringify(headerObj)).toString('base64url');
  const payload = Buffer.from(JSON.stringify(payloadObj)).toString('base64url');
  const input = `${header}.${payload}`;
  const sig = createHmac('sha256', secret).update(input).digest('base64url');
  return `${input}.${sig}`;
}

describe('Security & Privacy: Session Security, JWT Hardening & Anti-Replay (E2E)', () => {
  let app: INestApplication;
  let prismaMock: InMemoryPrismaService;
  let tokenService: TokenService;
  let refreshSessions: RefreshSessionRepository;

  beforeEach(async () => {
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
      .overrideProvider(OTP_PROVIDER)
      .useValue({ verify: jest.fn() })
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

    tokenService = app.get(TokenService);
    refreshSessions = app.get(RefreshSessionRepository);
  });

  afterEach(async () => {
    if (app) await app.close();
  });

  async function loginDemoUser(role: 'CUSTOMER' | 'DRIVER' | 'ADMIN' = 'CUSTOMER'): Promise<{
    user: any;
    session: AuthSessionBody;
  }> {
    const user = await prismaMock.user.create({
      data: { phone: `+849000000${Math.floor(Math.random() * 90 + 10)}`, role, status: 'ACTIVE' },
    });
    if (role === 'DRIVER') {
      await prismaMock.driverProfile.create({
        data: { userId: user.id, availability: 'AVAILABLE', vehicleType: 'MOTORBIKE' },
      });
    }
    const createdSession = await refreshSessions.create(user.id);
    const session = tokenService.createAuthSession(user, createdSession);
    return { user, session };
  }

  // =========================================================================
  // 1. Refresh Token Rotation and Replay Rejection
  // =========================================================================
  describe('1. Refresh Token Rotation & Anti-Replay Protection', () => {
    it('rotates refresh token and issues fresh access and refresh tokens', async () => {
      const { session: original } = await loginDemoUser();

      const res = await request(app.getHttpServer())
        .post('/auth/refresh')
        .send({ refreshToken: original.refreshToken })
        .expect(201);

      const rotated = res.body as AuthSessionBody;
      expect(rotated.refreshToken).toBeDefined();
      expect(rotated.accessToken).toBeDefined();
      expect(rotated.refreshToken).not.toBe(original.refreshToken);
      expect(rotated.accessToken).not.toBe(original.accessToken);

      // Old access token should now be rejected (session was revoked upon rotation)
      await request(app.getHttpServer())
        .get('/me')
        .set('Authorization', `Bearer ${original.accessToken}`)
        .expect(401);

      // New access token works
      await request(app.getHttpServer())
        .get('/me')
        .set('Authorization', `Bearer ${rotated.accessToken}`)
        .expect(200);
    });

    it('rejects replay of old refresh token and revokes entire active session family', async () => {
      const { session: original } = await loginDemoUser();

      // First refresh: succeeds and generates rotated session
      const res = await request(app.getHttpServer())
        .post('/auth/refresh')
        .send({ refreshToken: original.refreshToken })
        .expect(201);

      const rotated = res.body as AuthSessionBody;

      // Replay attempt with original (already rotated) token -> 401 Unauthorized
      await request(app.getHttpServer())
        .post('/auth/refresh')
        .send({ refreshToken: original.refreshToken })
        .expect(401);

      // Anti-replay cascade: the rotated active token MUST now be revoked as well
      await request(app.getHttpServer())
        .post('/auth/refresh')
        .send({ refreshToken: rotated.refreshToken })
        .expect(401);
    });

    it('allows only one concurrent refresh request to succeed among races', async () => {
      const { session: original } = await loginDemoUser();

      const attempts = await Promise.all([
        request(app.getHttpServer())
          .post('/auth/refresh')
          .send({ refreshToken: original.refreshToken }),
        request(app.getHttpServer())
          .post('/auth/refresh')
          .send({ refreshToken: original.refreshToken }),
      ]);

      const statuses = attempts.map((a) => a.status).sort();
      expect(statuses).toEqual([201, 401]);
    });
  });

  // =========================================================================
  // 2. JWT Token Tampering & Signature Forgery Rejection
  // =========================================================================
  describe('2. JWT Hardening & Signature Forgery Rejection', () => {
    it('rejects JWT when signature is tampered with (byte flipping)', async () => {
      const { session } = await loginDemoUser('CUSTOMER');
      const parts = session.accessToken.split('.');
      const tamperedSignature = parts[2].slice(0, -4) + 'AAAA';
      const forgedToken = `${parts[0]}.${parts[1]}.${tamperedSignature}`;

      await request(app.getHttpServer())
        .get('/me')
        .set('Authorization', `Bearer ${forgedToken}`)
        .expect(401);
    });

    it('rejects JWT signed with "alg": "none"', async () => {
      const { user, session } = await loginDemoUser('CUSTOMER');
      const payload = {
        sub: user.id,
        role: 'CUSTOMER',
        sessionId: 'session-1',
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + 900,
      };
      const header = Buffer.from(JSON.stringify({ alg: 'none', typ: 'JWT' })).toString('base64url');
      const encPayload = Buffer.from(JSON.stringify(payload)).toString('base64url');
      const noneToken = `${header}.${encPayload}.`;

      await request(app.getHttpServer())
        .get('/me')
        .set('Authorization', `Bearer ${noneToken}`)
        .expect(401);
    });

    it('rejects JWT signed with unsupported alg (e.g. HS512 or RS256)', async () => {
      const { user } = await loginDemoUser('CUSTOMER');
      const token = craftJwt(
        { alg: 'HS512', typ: 'JWT' },
        {
          sub: user.id,
          role: 'CUSTOMER',
          sessionId: 'session-1',
          iat: Math.floor(Date.now() / 1000),
          exp: Math.floor(Date.now() / 1000) + 900,
        },
      );

      await request(app.getHttpServer())
        .get('/me')
        .set('Authorization', `Bearer ${token}`)
        .expect(401);
    });

    it('rejects JWT signed with foreign/attacker secret (signature forgery)', async () => {
      const { user } = await loginDemoUser('CUSTOMER');
      const forgedToken = craftJwt(
        { alg: 'HS256', typ: 'JWT' },
        {
          sub: user.id,
          role: 'ADMIN',
          sessionId: 'session-1',
          iat: Math.floor(Date.now() / 1000),
          exp: Math.floor(Date.now() / 1000) + 900,
        },
        'evil-attacker-secret-that-does-not-match-server',
      );

      await request(app.getHttpServer())
        .get('/admin/dashboard')
        .set('Authorization', `Bearer ${forgedToken}`)
        .expect(401);
    });

    it('rejects JWT with privilege escalation in payload without matching signature', async () => {
      const { session } = await loginDemoUser('CUSTOMER');
      const parts = session.accessToken.split('.');
      const payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString('utf8'));

      // Tamper role to ADMIN
      payload.role = 'ADMIN';
      const modifiedPayload = Buffer.from(JSON.stringify(payload)).toString('base64url');
      const forgedToken = `${parts[0]}.${modifiedPayload}.${parts[2]}`;

      await request(app.getHttpServer())
        .get('/admin/dashboard')
        .set('Authorization', `Bearer ${forgedToken}`)
        .expect(401);
    });

    it('rejects malformed token strings and invalid parts count', async () => {
      const malformedTokens = [
        'single-string-no-dots',
        'header.payload-missing-signature',
        'header.payload.signature.extra-part',
        'invalid@@base64.invalid@@payload.invalid@@sig',
        'eyJhbGciOiJIUzI1NiJ9.not-json.valid-looking-sig',
      ];

      for (const token of malformedTokens) {
        await request(app.getHttpServer())
          .get('/me')
          .set('Authorization', `Bearer ${token}`)
          .expect(401);
      }
    });

    it('rejects JWT missing required claims (sub, sessionId, role, exp)', async () => {
      const incompleteClaims: Array<Record<string, unknown>> = [
        { role: 'CUSTOMER', sessionId: 's1', exp: Math.floor(Date.now() / 1000) + 900 }, // missing sub
        { sub: 'u1', role: 'CUSTOMER', exp: Math.floor(Date.now() / 1000) + 900 }, // missing sessionId
        { sub: 'u1', sessionId: 's1', exp: Math.floor(Date.now() / 1000) + 900 }, // missing role
        { sub: 'u1', sessionId: 's1', role: 'CUSTOMER' }, // missing exp
      ];

      for (const claims of incompleteClaims) {
        const token = craftJwt({ alg: 'HS256', typ: 'JWT' }, claims);
        await request(app.getHttpServer())
          .get('/me')
          .set('Authorization', `Bearer ${token}`)
          .expect(401);
      }
    });

    it('rejects JWT with unrecognized or injected role claim', async () => {
      const { user } = await loginDemoUser('CUSTOMER');
      const token = craftJwt(
        { alg: 'HS256', typ: 'JWT' },
        {
          sub: user.id,
          role: 'SUPERUSER_ROOT',
          sessionId: 'session-1',
          iat: Math.floor(Date.now() / 1000),
          exp: Math.floor(Date.now() / 1000) + 900,
        },
      );

      await request(app.getHttpServer())
        .get('/me')
        .set('Authorization', `Bearer ${token}`)
        .expect(401);
    });
  });

  // =========================================================================
  // 3. Token Expiry & Logout Session Lifecycle Termination
  // =========================================================================
  describe('3. Token Expiry & Logout Session Termination', () => {
    it('rejects expired access token (exp in the past)', async () => {
      const { user } = await loginDemoUser('CUSTOMER');
      const sessionRecord = await refreshSessions.create(user.id);
      const expiredToken = craftJwt(
        { alg: 'HS256', typ: 'JWT' },
        {
          sub: user.id,
          role: 'CUSTOMER',
          sessionId: sessionRecord.record.id,
          iat: Math.floor(Date.now() / 1000) - 3600,
          exp: Math.floor(Date.now() / 1000) - 1800, // Expired 30m ago
        },
      );

      await request(app.getHttpServer())
        .get('/me')
        .set('Authorization', `Bearer ${expiredToken}`)
        .expect(401);
    });

    it('rejects expired refresh token during refresh attempt', async () => {
      const { session } = await loginDemoUser('CUSTOMER');
      const sessionRecord = Array.from(prismaMock.refreshSessions.values())[0];
      sessionRecord.expiresAt = new Date(Date.now() - 60000); // expired 1m ago

      await request(app.getHttpServer())
        .post('/auth/refresh')
        .send({ refreshToken: session.refreshToken })
        .expect(401);
    });

    it('logs out session and terminates subsequent access and refresh requests', async () => {
      const { session } = await loginDemoUser('CUSTOMER');

      // 1. Successful logout
      await request(app.getHttpServer())
        .post('/auth/logout')
        .set('Authorization', `Bearer ${session.accessToken}`)
        .expect(204);

      // 2. Access token immediately rejected
      await request(app.getHttpServer())
        .get('/me')
        .set('Authorization', `Bearer ${session.accessToken}`)
        .expect(401);

      // 3. Refresh token immediately rejected
      await request(app.getHttpServer())
        .post('/auth/refresh')
        .send({ refreshToken: session.refreshToken })
        .expect(401);
    });

    it('rejects requests if user account status is DISABLED or SUSPENDED', async () => {
      const { user, session } = await loginDemoUser('CUSTOMER');

      // Set user status to DISABLED in database
      await prismaMock.user.update({
        where: { id: user.id },
        data: { status: 'DISABLED' },
      });

      // GET /me checks user status and returns 403 ACCOUNT_DISABLED
      const resMe = await request(app.getHttpServer())
        .get('/me')
        .set('Authorization', `Bearer ${session.accessToken}`)
        .expect(403);
      expect(resMe.body.code).toBe('ACCOUNT_DISABLED');

      // Protected endpoints guarded by AccessTokenGuard return 401 UNAUTHORIZED
      await request(app.getHttpServer())
        .get('/orders')
        .set('Authorization', `Bearer ${session.accessToken}`)
        .expect(401);
    });
  });
});
