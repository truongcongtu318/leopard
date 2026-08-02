import { Injectable } from '@nestjs/common';
import * as argon2 from 'argon2';
import { createHmac, randomBytes, randomUUID } from 'node:crypto';

import { DomainError } from '../common/domain-error.js';
import { PrismaService } from '../database/prisma.service.js';

const REFRESH_TOKEN_TTL_SECONDS = 7 * 24 * 60 * 60;
const TOKEN_HASH_VERSION = 'v1';

export interface RefreshSessionRecord {
  readonly id: string;
  readonly userId: string;
  readonly tokenHash: string;
  readonly expiresAt: Date;
  readonly revokedAt: Date | null;
}

export interface CreatedRefreshSession {
  readonly record: RefreshSessionRecord;
  readonly refreshToken: string;
}

interface RefreshSessionStore {
  readonly refreshSession: {
    create(args: {
      data: { userId: string; tokenHash: string; expiresAt: Date };
    }): Promise<RefreshSessionRecord>;
    findFirst(args: {
      where: { tokenHash: { startsWith: string } };
    }): Promise<RefreshSessionRecord | null>;
    updateMany(args: {
      where: {
        id?: string;
        userId?: string;
        tokenHash?: { contains: string };
        revokedAt?: null;
        expiresAt?: { gt: Date };
      };
      data: { revokedAt: Date };
    }): Promise<{ count: number }>;
  };
}

@Injectable()
export class RefreshSessionRepository {
  constructor(private readonly prisma: PrismaService) {}

  public async create(userId: string): Promise<CreatedRefreshSession> {
    return this.createInStore(this.prisma, userId);
  }

  public async rotate(refreshToken: string): Promise<CreatedRefreshSession> {
    const now = new Date();
    const current = await this.findByToken(refreshToken);

    if (!current || !(await this.tokenMatches(current, refreshToken))) {
      throw this.unauthorized();
    }

    if (current.revokedAt || current.expiresAt.getTime() <= now.getTime()) {
      await this.revokeFamily(current.userId, this.familyId(current));
      throw this.unauthorized();
    }

    const next = await this.prepare(this.familyId(current));

    return this.prisma.$transaction(async (tx) => {
      const revoked = await tx.refreshSession.updateMany({
        where: {
          id: current.id,
          revokedAt: null,
          expiresAt: { gt: now },
        },
        data: { revokedAt: now },
      });

      if (revoked.count !== 1) {
        throw this.unauthorized();
      }

      const record = await tx.refreshSession.create({
        data: {
          userId: current.userId,
          tokenHash: next.tokenHash,
          expiresAt: next.expiresAt,
        },
      });

      return { record, refreshToken: next.refreshToken };
    });
  }

  public async revoke(sessionId: string): Promise<void> {
    await this.prisma.refreshSession.updateMany({
      where: {
        id: sessionId,
        revokedAt: null,
        expiresAt: { gt: new Date() },
      },
      data: { revokedAt: new Date() },
    });
  }

  private async createInStore(
    store: RefreshSessionStore,
    userId: string,
  ): Promise<CreatedRefreshSession> {
    const prepared = await this.prepare(randomUUID());
    const record = await store.refreshSession.create({
      data: {
        userId,
        tokenHash: prepared.tokenHash,
        expiresAt: prepared.expiresAt,
      },
    });

    return { record, refreshToken: prepared.refreshToken };
  }

  private async prepare(familyId: string): Promise<{
    readonly refreshToken: string;
    readonly tokenHash: string;
    readonly expiresAt: Date;
  }> {
    const refreshToken = this.randomToken();

    return {
      refreshToken,
      tokenHash: await this.hashToken(refreshToken, familyId),
      expiresAt: this.secondsFromNow(REFRESH_TOKEN_TTL_SECONDS),
    };
  }

  private async findByToken(
    refreshToken: string,
  ): Promise<RefreshSessionRecord | null> {
    const lookup = this.lookupHash(refreshToken);

    return this.prisma.refreshSession.findFirst({
      where: { tokenHash: { startsWith: `${TOKEN_HASH_VERSION}:${lookup}:` } },
    });
  }

  private async revokeFamily(userId: string, familyId: string): Promise<void> {
    await this.prisma.refreshSession.updateMany({
      where: {
        userId,
        tokenHash: { contains: `:${familyId}:` },
        revokedAt: null,
        expiresAt: { gt: new Date() },
      },
      data: { revokedAt: new Date() },
    });
  }

  private async hashToken(
    refreshToken: string,
    familyId: string,
  ): Promise<string> {
    const lookup = this.lookupHash(refreshToken);
    const verifier = await argon2.hash(refreshToken, { type: argon2.argon2id });

    return `${TOKEN_HASH_VERSION}:${lookup}:${familyId}:${verifier}`;
  }

  private async tokenMatches(
    session: RefreshSessionRecord,
    refreshToken: string,
  ): Promise<boolean> {
    const [, , , verifier] = session.tokenHash.split(':', 4);
    if (!verifier) {
      return false;
    }

    return argon2.verify(verifier, refreshToken);
  }

  private familyId(session: RefreshSessionRecord): string {
    const [, , familyId] = session.tokenHash.split(':', 4);
    if (!familyId) {
      throw this.unauthorized();
    }

    return familyId;
  }

  private lookupHash(refreshToken: string): string {
    return createHmac('sha256', this.refreshSecret())
      .update(refreshToken)
      .digest('base64url');
  }

  private randomToken(): string {
    return randomBytes(32).toString('base64url');
  }

  private secondsFromNow(seconds: number): Date {
    return new Date((Math.floor(Date.now() / 1_000) + seconds) * 1_000);
  }

  private refreshSecret(): string {
    const value = process.env.AUTH_REFRESH_TOKEN_SECRET;
    if (value) {
      return value;
    }

    if (process.env.NODE_ENV === 'production') {
      throw new Error('AUTH_REFRESH_TOKEN_SECRET is required');
    }

    return 'local-refresh-token-secret';
  }

  private unauthorized(): DomainError {
    return new DomainError('UNAUTHORIZED', 401, 'Authentication required');
  }
}
