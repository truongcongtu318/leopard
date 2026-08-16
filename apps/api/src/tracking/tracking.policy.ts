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
  /** Fleet IDs for which the actor has an active OWNER membership. */
  readonly activeOwnerFleetIds: readonly string[];
  /** Fleet IDs for which the assigned Driver has an active DRIVER membership. */
  readonly activeDriverFleetIds: readonly string[];
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
      'Tracking is not active for this order',
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

  if (
    actor.role === Role.FLEET_OWNER &&
    hasSharedActiveFleet(order.activeOwnerFleetIds, order.activeDriverFleetIds)
  ) {
    return;
  }

  throw forbidden();
}

function hasSharedActiveFleet(
  ownerFleetIds: readonly string[],
  driverFleetIds: readonly string[],
): boolean {
  const driverFleets = new Set(driverFleetIds);

  return ownerFleetIds.some((fleetId) => driverFleets.has(fleetId));
}

function forbidden(): DomainError {
  return new DomainError(
    'TRACKING_FORBIDDEN',
    403,
    'You do not have access to this order tracking',
  );
}
