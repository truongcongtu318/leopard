import { OrderStatus, Role } from '@prisma/client';

import type { AuthenticatedActor } from '../auth/decorators/current-user.js';
import { DomainError } from '../common/domain-error.js';

const ACTIVE_TRACKING_STATUSES = new Set<OrderStatus>([
  OrderStatus.ACCEPTED,
  OrderStatus.PICKING_UP,
  OrderStatus.IN_TRANSIT,
]);

export interface TrackingOrderAccess {
  readonly id: string;
  readonly status: OrderStatus;
  readonly customerId: string;
  readonly driverId: string | null;
}

export function assertCanSendTracking(
  actor: AuthenticatedActor,
  order: TrackingOrderAccess,
): void {
  if (actor.role !== Role.DRIVER || order.driverId !== actor.userId) {
    throw forbidden();
  }

  if (!ACTIVE_TRACKING_STATUSES.has(order.status)) {
    throw new DomainError(
      'TRACKING_ORDER_INACTIVE',
      409,
      'Đơn hàng này chưa bật theo dõi hành trình',
    );
  }
}

export function assertCanViewTracking(
  actor: AuthenticatedActor,
  order: TrackingOrderAccess,
): void {
  if (actor.role === Role.ADMIN) {
    return;
  }

  if (actor.role === Role.CUSTOMER && order.customerId === actor.userId) {
    return;
  }

  if (actor.role === Role.DRIVER && order.driverId === actor.userId) {
    return;
  }

  throw forbidden();
}

function forbidden(): DomainError {
  return new DomainError(
    'TRACKING_FORBIDDEN',
    403,
    'Bạn không có quyền theo dõi đơn hàng này',
  );
}
