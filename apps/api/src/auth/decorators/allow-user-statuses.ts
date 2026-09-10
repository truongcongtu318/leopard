import { SetMetadata } from '@nestjs/common';
import type { UserStatus } from '@prisma/client';

export const ALLOW_USER_STATUSES_KEY = 'auth.allowUserStatuses';

export function AllowUserStatuses(...statuses: readonly UserStatus[]) {
  return SetMetadata(ALLOW_USER_STATUSES_KEY, statuses);
}
