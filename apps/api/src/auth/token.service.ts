import { Injectable } from '@nestjs/common';
import type { Role } from '@prisma/client';
import { createHmac, timingSafeEqual } from 'node:crypto';

import { DomainError } from '../common/domain-error.js';
import {
  RefreshSessionRepository,
  type CreatedRefreshSession,
} from './refresh-session.repository.js';

const ACCESS_TOKEN_TTL_SECONDS = 15 * 60;
const JWT_ALGORITHM = 'HS256';
const JWT_TYPE = 'JWT';
const TOKEN_ROLES = new Set<Role>(['CUSTOMER', 'DRIVER', 'FLEET_OWNER', 'ADMIN']);

export interface AccessTokenClaims {
  readonly sub: string;
  readonly role: Role;
  readonly sessionId: string;
}

export interface AuthSession {
  readonly accessToken: string;
  readonly accessTokenExpiresAt: string;
  readonly refreshToken: string;
  readonly refreshTokenExpiresAt: string;
}

interface JwtPayload extends AccessTokenClaims {
  readonly iat: number;
  readonly exp: number;
}

interface SessionUser {
  readonly id: string;
  readonly role: Role;
}

@Injectable()
export class TokenService {
  constructor(private readonly refreshSessions: RefreshSessionRepository) {}

  public async createSession(user: SessionUser): Promise<AuthSession> {
    const refreshSession = await this.refreshSessions.create(user.id);

    return this.createAuthSession(user, refreshSession);
  }

  public createAuthSession(
    user: SessionUser,
    refreshSession: CreatedRefreshSession,
  ): AuthSession {
    const issuedAt = this.nowSeconds();
    const accessTokenExpiresAt = new Date(
      (issuedAt + ACCESS_TOKEN_TTL_SECONDS) * 1_000,
    );

    return {
      accessToken: this.signAccessToken({
        sub: user.id,
        role: user.role,
        sessionId: refreshSession.record.id,
        iat: issuedAt,
        exp: issuedAt + ACCESS_TOKEN_TTL_SECONDS,
      }),
      accessTokenExpiresAt: accessTokenExpiresAt.toISOString(),
      refreshToken: refreshSession.refreshToken,
      refreshTokenExpiresAt: refreshSession.record.expiresAt.toISOString(),
    };
  }

  public verifyAccessToken(token: string): AccessTokenClaims {
    const parts = token.split('.');
    if (parts.length !== 3) {
      throw new DomainError('UNAUTHORIZED', 401, 'Authentication required');
    }

    const [encodedHeader, encodedPayload, encodedSignature] = parts as [
      string,
      string,
      string,
    ];
    const expectedSignature = this.sign(`${encodedHeader}.${encodedPayload}`);

    if (!this.signatureMatches(encodedSignature, expectedSignature)) {
      throw new DomainError('UNAUTHORIZED', 401, 'Authentication required');
    }

    const header = this.decodeJson(encodedHeader);
    if (header['alg'] !== JWT_ALGORITHM || header['typ'] !== JWT_TYPE) {
      throw new DomainError('UNAUTHORIZED', 401, 'Authentication required');
    }

    const payload = this.decodeJson(encodedPayload);
    if (
      typeof payload['sub'] !== 'string' ||
      typeof payload['role'] !== 'string' ||
      typeof payload['sessionId'] !== 'string' ||
      typeof payload['exp'] !== 'number'
    ) {
      throw new DomainError('UNAUTHORIZED', 401, 'Authentication required');
    }

    if (!TOKEN_ROLES.has(payload['role'] as Role)) {
      throw new DomainError('UNAUTHORIZED', 401, 'Authentication required');
    }

    if (payload['exp'] <= this.nowSeconds()) {
      throw new DomainError('UNAUTHORIZED', 401, 'Authentication required');
    }

    return {
      sub: payload['sub'],
      role: payload['role'] as Role,
      sessionId: payload['sessionId'],
    };
  }

  private signAccessToken(payload: JwtPayload): string {
    const encodedHeader = this.encodeJson({
      alg: JWT_ALGORITHM,
      typ: JWT_TYPE,
      kid: process.env.AUTH_ACCESS_TOKEN_KID ?? 'local',
    });
    const encodedPayload = this.encodeJson(payload);
    const signingInput = `${encodedHeader}.${encodedPayload}`;

    return `${signingInput}.${this.sign(signingInput)}`;
  }

  private sign(input: string): string {
    return createHmac('sha256', this.accessSecret())
      .update(input)
      .digest('base64url');
  }

  private signatureMatches(actual: string, expected: string): boolean {
    const actualBuffer = Buffer.from(actual);
    const expectedBuffer = Buffer.from(expected);

    return (
      actualBuffer.length === expectedBuffer.length &&
      timingSafeEqual(actualBuffer, expectedBuffer)
    );
  }

  private encodeJson(value: unknown): string {
    return Buffer.from(JSON.stringify(value)).toString('base64url');
  }

  private decodeJson(encoded: string): Record<string, unknown> {
    try {
      return JSON.parse(Buffer.from(encoded, 'base64url').toString('utf8')) as Record<
        string,
        unknown
      >;
    } catch {
      throw new DomainError('UNAUTHORIZED', 401, 'Authentication required');
    }
  }

  private nowSeconds(): number {
    return Math.floor(Date.now() / 1_000);
  }

  private accessSecret(): string {
    return this.secret('AUTH_ACCESS_TOKEN_SECRET', 'local-access-token-secret');
  }

  private secret(name: string, localFallback: string): string {
    const value = process.env[name];
    if (value) {
      return value;
    }

    if (process.env.NODE_ENV === 'production') {
      throw new Error(`${name} is required`);
    }

    return localFallback;
  }
}
