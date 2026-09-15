import { Controller, Get, Param, UseFilters, UseGuards } from '@nestjs/common';

import { CurrentUser, type AuthenticatedActor } from '../auth/decorators/current-user.js';
import { AccessTokenGuard } from '../auth/guards/access-token.guard.js';
import { RoleGuard } from '../auth/guards/role.guard.js';
import { ApiExceptionFilter } from '../common/api-exception.filter.js';
import { DomainError } from '../common/domain-error.js';
import { PrismaService } from '../database/prisma.service.js';
import { mapRouteEtaResponse } from './route-eta-response.mapper.js';
import { assertCanViewRouteEta } from './route-eta.policy.js';

@Controller('orders/:id/route-eta')
@UseFilters(ApiExceptionFilter)
@UseGuards(AccessTokenGuard, RoleGuard)
export class RouteEtaController {
  public constructor(private readonly prisma: PrismaService) {}

  @Get()
  public async get(
    @CurrentUser() actor: AuthenticatedActor,
    @Param('id') orderId: string,
  ) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: {
        currentNextStopEstimate: true,
        currentCompletionEstimate: true,
        activeRouteSnapshot: true,
        quotedRouteSnapshot: true,
      },
    });
    if (!order) {
      throw notFound();
    }

    const { activeOwnerFleetIds, activeDriverFleetIds } = await resolveFleetAccess(
      this.prisma,
      actor.userId,
      order.driverId,
    );

    assertCanViewRouteEta(actor, {
      customerId: order.customerId,
      driverId: order.driverId,
      activeOwnerFleetIds,
      activeDriverFleetIds,
    });

    return buildRouteEtaResponse(this.prisma, orderId);
  }
}

/**
 * Builds the route-ETA response payload for an order. Shared by
 * `RouteEtaController.get` and `StopProgressController`'s record/void
 * endpoints (spec §4.7's `currentRouteEta` field) so both code paths shape
 * the response identically — no duplicated response-shaping logic.
 *
 * Callers are responsible for authorization (`assertCanViewRouteEta` /
 * whatever policy applies to their endpoint) before calling this.
 */
export async function buildRouteEtaResponse(prisma: PrismaService, orderId: string) {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: {
      currentNextStopEstimate: true,
      currentCompletionEstimate: true,
      activeRouteSnapshot: true,
      quotedRouteSnapshot: true,
      stops: {
        include: {
          stopProgressStates: true,
        },
        orderBy: { sequence: 'asc' },
      },
    },
  });
  if (!order) {
    throw notFound();
  }

  const deadLetter = await prisma.outboxEvent.findFirst({
    where: { aggregateId: orderId, type: 'ROUTE_ETA_RECOMPUTE', status: 'DEAD_LETTER' },
    orderBy: { inputRevision: 'desc' },
  });

  const stopsWithProgress = order.stops?.map((s) => {
    let progress: 'COMPLETED' | 'ACTIVE' | 'PENDING' = 'PENDING';
    const stateSteps = new Set(s.stopProgressStates?.map((st) => st.step) ?? []);
    if (stateSteps.has('SERVICE_COMPLETED')) {
      progress = 'COMPLETED';
    } else if (stateSteps.has('SERVICE_STARTED') || stateSteps.has('ARRIVED')) {
      progress = 'ACTIVE';
    }
    return { id: s.id, progress };
  });

  return mapRouteEtaResponse({
    orderId,
    now: new Date(),
    order: { routeEtaInputRevision: order.routeEtaInputRevision, status: order.status },
    currentNextStop: order.currentNextStopEstimate as never,
    currentCompletion: order.currentCompletionEstimate as never,
    activeRoute: order.activeRouteSnapshot as never,
    quotedRoute: order.quotedRouteSnapshot as never,
    pendingDeadLetterInputRevision: deadLetter?.inputRevision ?? null,
    stopsWithProgress,
  });
}

function notFound(): DomainError {
  return new DomainError('RESOURCE_NOT_FOUND', 404, 'Không tìm thấy đơn hàng');
}

interface FleetAccess {
  activeOwnerFleetIds: string[];
  activeDriverFleetIds: string[];
}

/**
 * Duplicated from tracking.repository's findOrderAccessInternal fleet-membership
 * lookup rather than shared cross-module — deliberately kept small and local to
 * this controller.
 */
export async function resolveFleetAccess(
  prisma: Pick<PrismaService, 'fleetMember'>,
  actorId: string,
  driverId: string | null,
): Promise<FleetAccess> {
  const fleetMemberships = await prisma.fleetMember.findMany({
    where: { userId: actorId, status: 'ACTIVE' },
    select: { fleetId: true, role: true },
  });

  const activeOwnerFleetIds = fleetMemberships
    .filter((membership) => membership.role === 'OWNER')
    .map((membership) => membership.fleetId);

  let activeDriverFleetIds: string[] = [];
  if (driverId) {
    const driverMemberships = await prisma.fleetMember.findMany({
      where: { userId: driverId, status: 'ACTIVE', role: 'DRIVER' },
      select: { fleetId: true },
    });
    activeDriverFleetIds = driverMemberships.map((membership) => membership.fleetId);
  }

  return { activeOwnerFleetIds, activeDriverFleetIds };
}
