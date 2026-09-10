import {
  Injectable,
  Optional,
  type CanActivate,
  type ExecutionContext,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { UserStatus } from '@prisma/client';

import { DomainError } from '../../common/domain-error.js';
import { PrismaService } from '../../database/prisma.service.js';
import {
  setAuthenticatedActor,
  type AuthenticatedActor,
} from '../decorators/current-user.js';
import { TokenService } from '../token.service.js';
import { AccountStatusCache } from './account-status-cache.js';
import { ALLOW_USER_STATUSES_KEY } from '../decorators/allow-user-statuses.js';

@Injectable()
export class AccessTokenGuard implements CanActivate {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tokenService: TokenService,
    private readonly accountStatusCache: AccountStatusCache,
    @Optional() private readonly reflector?: Reflector,
  ) {}

  public async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Record<string, unknown>>();
    const token = this.extractBearerToken(request['headers']);
    const claims = this.tokenService.verifyAccessToken(token);
    const session = await this.prisma.refreshSession.findUnique({
      where: { id: claims.sessionId },
    });

    if (
      !session ||
      session.userId !== claims.sub ||
      session.revokedAt !== null ||
      session.expiresAt.getTime() <= Date.now()
    ) {
      throw this.unauthorized();
    }

    const cachedStatus = this.accountStatusCache.get(claims.sub);
    let userId: string;
    let role: AuthenticatedActor['role'];
    let status: UserStatus;

    if (cachedStatus) {
      const currentUser = await this.prisma.user.findUnique({
        where: { id: claims.sub },
        select: { id: true, role: true },
      });
      if (!currentUser) {
        throw this.unauthorized();
      }

      userId = currentUser.id;
      role = currentUser.role;
      status = cachedStatus.status;
    } else {
      const currentUser = await this.prisma.user.findUnique({
        where: { id: claims.sub },
      });
      if (!currentUser) {
        throw this.unauthorized();
      }

      this.accountStatusCache.set({
        userId: currentUser.id,
        status: currentUser.status,
      });
      userId = currentUser.id;
      role = currentUser.role;
      status = currentUser.status;
    }

    if (status === 'DISABLED' || status === 'SUSPENDED') {
      throw this.unauthorized();
    }

    const allowedStatuses = this.reflector?.getAllAndOverride<
      readonly UserStatus[]
    >(ALLOW_USER_STATUSES_KEY, [context.getHandler(), context.getClass()]) ?? [
      'ACTIVE',
    ];

    if (!allowedStatuses.includes(status)) {
      throw this.unauthorized();
    }

    const actor: AuthenticatedActor = {
      userId,
      role,
      sessionId: session.id,
    };

    setAuthenticatedActor(request, actor);

    return true;
  }

  private extractBearerToken(headers: unknown): string {
    if (!headers || typeof headers !== 'object') {
      throw this.unauthorized();
    }

    const authorization = (headers as { readonly authorization?: unknown })
      .authorization;
    if (typeof authorization !== 'string' || !authorization.startsWith('Bearer ')) {
      throw this.unauthorized();
    }

    const token = authorization.slice('Bearer '.length).trim();
    if (!token) {
      throw this.unauthorized();
    }

    return token;
  }

  private unauthorized(): DomainError {
    return new DomainError('UNAUTHORIZED', 401, 'Bạn cần đăng nhập để tiếp tục');
  }
}
