import { Role } from '@prisma/client';

import type { AuthenticatedActor } from '../auth/decorators/current-user.js';
import { DomainError } from '../common/domain-error.js';

export interface RouteEtaOrderAccess {
  readonly customerId: string;
  readonly driverId: string | null;
  /** Fleet IDs for which the actor has an active OWNER membership. */
  readonly activeOwnerFleetIds: readonly string[];
  /** Fleet IDs for which the assigned Driver has an active DRIVER membership. */
  readonly activeDriverFleetIds: readonly string[];
}

/**
 * Stricter than `assertCanViewTracking`: every unauthorized branch throws the
 * same 404 `RESOURCE_NOT_FOUND` DomainError. Route/pricing-adjacent data must
 * never leak existence via a 403 — a 403 would confirm the order exists.
 */
export function assertCanViewRouteEta(
  actor: AuthenticatedActor,
  order: RouteEtaOrderAccess,
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

  throw notFound();
}

function hasSharedActiveFleet(
  ownerFleetIds: readonly string[],
  driverFleetIds: readonly string[],
): boolean {
  const driverFleets = new Set(driverFleetIds);

  return ownerFleetIds.some((fleetId) => driverFleets.has(fleetId));
}

function notFound(): DomainError {
  return new DomainError('RESOURCE_NOT_FOUND', 404, 'Không tìm thấy đơn hàng');
}
