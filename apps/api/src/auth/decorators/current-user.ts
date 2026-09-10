import {
  createParamDecorator,
  type ExecutionContext,
} from '@nestjs/common';
import type { Role } from '@prisma/client';

export interface AuthenticatedActor {
  readonly userId: string;
  readonly role: Role;
  readonly sessionId: string;
}

export const AUTHENTICATED_ACTOR_REQUEST_KEY = 'authenticatedActor';

type AuthenticatedRequest = {
  readonly [AUTHENTICATED_ACTOR_REQUEST_KEY]?: AuthenticatedActor;
};

export function getAuthenticatedActor(
  request: AuthenticatedRequest,
): AuthenticatedActor | undefined {
  return request[AUTHENTICATED_ACTOR_REQUEST_KEY];
}

export function setAuthenticatedActor(
  request: Record<string, unknown>,
  actor: AuthenticatedActor,
): void {
  request[AUTHENTICATED_ACTOR_REQUEST_KEY] = actor;
}

export const CurrentUser = createParamDecorator(
  (_data: unknown, context: ExecutionContext): AuthenticatedActor | undefined => {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();

    return getAuthenticatedActor(request);
  },
);

export const CurrentUserRole = createParamDecorator(
  (_data: unknown, context: ExecutionContext): Role | undefined => {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();

    return getAuthenticatedActor(request)?.role;
  },
);
