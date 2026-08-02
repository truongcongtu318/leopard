import {
  Injectable,
  type CanActivate,
  type ExecutionContext,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';

import { DomainError } from '../../common/domain-error.js';
import { getAuthenticatedActor } from '../decorators/current-user.js';
import { REQUIRED_ROLES_METADATA_KEY } from '../decorators/require-roles.js';

@Injectable()
export class RoleGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  public canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<
      readonly ('CUSTOMER' | 'DRIVER' | 'FLEET_OWNER' | 'ADMIN')[]
    >(REQUIRED_ROLES_METADATA_KEY, [context.getHandler(), context.getClass()]);

    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest<Record<string, unknown>>();
    const actor = getAuthenticatedActor(request);
    if (!actor) {
      throw new DomainError('UNAUTHORIZED', 401, 'Authentication required');
    }

    if (requiredRoles.includes(actor.role)) {
      return true;
    }

    throw new DomainError('FORBIDDEN', 403, 'Forbidden');
  }
}
