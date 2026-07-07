import {
  CanActivate,
  ExecutionContext,
  Inject,
  Injectable,
  SetMetadata,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import type { Role } from "@leopard/shared";

import { forbiddenRoleException, tokenRequiredException } from "./auth.errors";

export const ROLES_KEY = "roles";

export const Roles = (...roles: Role[]) => SetMetadata(ROLES_KEY, roles);

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(
    @Inject(Reflector)
    private readonly reflector: Reflector
  ) {}

  canActivate(context: ExecutionContext) {
    const roles =
      this.reflector.getAllAndOverride<Role[]>(ROLES_KEY, [
        context.getHandler(),
        context.getClass()
      ]) ?? [];

    if (roles.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest<{
      user?: { role?: Role };
    }>();

    if (!request.user?.role) {
      throw tokenRequiredException();
    }

    if (!roles.includes(request.user.role)) {
      throw forbiddenRoleException();
    }

    return true;
  }
}
