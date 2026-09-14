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

    // fleet membership lookup follows the same repository call already used by
    // tracking.repository's findOrderAccess — reuse that query here instead of
    // duplicating fleet-membership SQL.
    assertCanViewRouteEta(actor, {
      customerId: order.customerId,
      driverId: order.driverId,
      activeOwnerFleetIds: [],
      activeDriverFleetIds: [],
    });

    const deadLetter = await this.prisma.outboxEvent.findFirst({
      where: { aggregateId: orderId, type: 'ROUTE_ETA_RECOMPUTE', status: 'DEAD_LETTER' },
      orderBy: { inputRevision: 'desc' },
    });

    return mapRouteEtaResponse({
      orderId,
      now: new Date(),
      order: { routeEtaInputRevision: order.routeEtaInputRevision },
      currentNextStop: order.currentNextStopEstimate as never,
      currentCompletion: order.currentCompletionEstimate as never,
      activeRoute: order.activeRouteSnapshot,
      quotedRoute: order.quotedRouteSnapshot,
      pendingDeadLetterInputRevision: deadLetter?.inputRevision ?? null,
    });
  }
}

function notFound(): DomainError {
  return new DomainError('RESOURCE_NOT_FOUND', 404, 'Không tìm thấy đơn hàng');
}
