import { SetMetadata } from '@nestjs/common';
import type { Role } from '@prisma/client';

export const REQUIRED_ROLES_METADATA_KEY = 'auth.requiredRoles';

export function RequireRoles(...roles: readonly Role[]) {
  return SetMetadata(REQUIRED_ROLES_METADATA_KEY, roles);
}
