import { Injectable } from '@nestjs/common';
import type { Role, UserStatus } from '@prisma/client';

import { DomainError } from '../common/domain-error.js';
import { PrismaService } from '../database/prisma.service.js';
import type { AuthenticatedActor } from '../auth/decorators/current-user.js';
import { TokenService } from '../auth/token.service.js';

@Injectable()
export class SocketAuthAdapter {
  public constructor(
    private readonly prisma: PrismaService,
    private readonly tokenService: TokenService,
  ) {}

  public async authenticate(token: string): Promise<AuthenticatedActor> {
    let claims;
    try {
      claims = this.tokenService.verifyAccessToken(token);
    } catch {
      throw unauthorized();
    }
    return this.validateClaims(claims);
  }

  public async validate(actor: AuthenticatedActor): Promise<AuthenticatedActor> {
    return this.validateClaims({
      sub: actor.userId,
      role: actor.role,
      sessionId: actor.sessionId,
    });
  }

  private async validateClaims(claims: {
    readonly sub: string;
    readonly role: Role;
    readonly sessionId: string;
  }): Promise<AuthenticatedActor> {
    const session = await this.prisma.refreshSession.findUnique({
      where: { id: claims.sessionId },
    });
    const user = await this.prisma.user.findUnique({
      where: { id: claims.sub },
      select: { id: true, role: true, status: true },
    });
    if (
      !session ||
      session.userId !== claims.sub ||
      session.revokedAt !== null ||
      session.expiresAt.getTime() <= Date.now() ||
      !user ||
      user.status !== 'ACTIVE'
    ) {
      throw unauthorized();
    }
    return { userId: user.id, role: user.role, sessionId: session.id };
  }
}

function unauthorized(): DomainError {
  return new DomainError('UNAUTHORIZED', 401, 'Authentication required');
}
