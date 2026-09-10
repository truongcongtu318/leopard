import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { FleetOwnerService } from './fleet-owner.service.js';
import { OrdersService } from '../orders/orders.service.js';
import { TrackingService } from '../tracking/tracking.service.js';
import type { AuthenticatedActor } from '../auth/decorators/current-user.js';
import { CurrentUser } from '../auth/decorators/current-user.js';
import { AccessTokenGuard } from '../auth/guards/access-token.guard.js';
import { RoleGuard } from '../auth/guards/role.guard.js';
import { RequireRoles } from '../auth/decorators/require-roles.js';
import { FleetMembershipPolicy } from './fleet-membership.policy.js';
import { parsePageQuery } from '@leopard/shared';
import type { FleetDriverQuery, FleetOrderQuery, TrackingPointQuery } from '@leopard/shared';

@UseGuards(AccessTokenGuard, RoleGuard)
@RequireRoles('FLEET_OWNER')
@Controller('fleet')
export class FleetOwnerController {
  constructor(
    private readonly fleetOwnerService: FleetOwnerService,
    private readonly policy: FleetMembershipPolicy,
    private readonly ordersService: OrdersService,
    private readonly trackingService: TrackingService,
  ) {}

  @Get('profile')
  async getProfile(@CurrentUser() actor: AuthenticatedActor) {
    const fleetId = await this.policy.resolveFleetScope(actor);
    return this.fleetOwnerService.getProfile(fleetId);
  }

  @Get('drivers')
  async getDrivers(@CurrentUser() actor: AuthenticatedActor, @Query() query: any) {
    const fleetId = await this.policy.resolveFleetScope(actor);
    const parsedQuery: FleetDriverQuery = {
      ...parsePageQuery({ page: query.page, pageSize: query.pageSize }),
      status: query.status,
      q: query.q,
    };
    return this.fleetOwnerService.getDrivers(fleetId, parsedQuery);
  }

  @Get('orders')
  async getOrders(@CurrentUser() actor: AuthenticatedActor, @Query() query: any) {
    const fleetId = await this.policy.resolveFleetScope(actor);
    const parsedQuery: FleetOrderQuery = {
      ...parsePageQuery({ page: query.page, pageSize: query.pageSize }),
      status: query.status,
      driverId: query.driverId,
      from: query.from,
      to: query.to,
      q: query.q,
    };
    return this.fleetOwnerService.getOrders(fleetId, parsedQuery);
  }

  @Get('orders/:id')
  async getOrder(@CurrentUser() actor: AuthenticatedActor, @Param('id') id: string) {
    const fleetId = await this.policy.resolveFleetScope(actor);
    await this.policy.assertOrderInFleet(fleetId, id);
    return this.ordersService.getOrderById(actor, id);
  }

  @Get('orders/:id/tracking')
  async getOrderTracking(
    @CurrentUser() actor: AuthenticatedActor,
    @Param('id') id: string,
    @Query() query: any
  ) {
    await this.policy.resolveFleetScope(actor);
    const parsedQuery: TrackingPointQuery = {
      ...parsePageQuery({ page: query.page, pageSize: query.pageSize }),
      from: query.from,
      to: query.to,
    };
    return this.trackingService.getHistory(actor, id, parsedQuery);
  }
}
