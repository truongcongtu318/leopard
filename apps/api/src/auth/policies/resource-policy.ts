import { Injectable } from '@nestjs/common';
import type { Role } from '@prisma/client';

import { DomainError } from '../../common/domain-error.js';
import type { AuthenticatedActor } from '../decorators/current-user.js';

export interface PolicyResource<TAction extends string = string> {
  readonly ownerUserId?: string | null;
  readonly allowedRoles?: readonly Role[];
  readonly isAccessibleBy?: (
    actor: AuthenticatedActor,
    action: TAction,
    resource: PolicyResource<TAction>,
  ) => boolean | Promise<boolean>;
}

@Injectable()
export class ResourcePolicy {
  public async assert<
    TAction extends string,
    TResource extends PolicyResource<TAction>,
  >(
    actor: AuthenticatedActor,
    action: TAction,
    resource: TResource,
  ): Promise<void> {
    if (resource.allowedRoles?.includes(actor.role)) {
      return;
    }

    if (resource.ownerUserId && resource.ownerUserId === actor.userId) {
      return;
    }

    if (
      typeof resource.isAccessibleBy === 'function' &&
      (await resource.isAccessibleBy(actor, action, resource))
    ) {
      return;
    }

    throw new DomainError(
      'FORBIDDEN',
      403,
      'You do not have access to this resource',
    );
  }
}
