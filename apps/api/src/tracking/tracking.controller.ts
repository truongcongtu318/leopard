import {
  Controller,
  Get,
  Param,
  Query,
  UseFilters,
  UseGuards,
} from '@nestjs/common';
import { parseTrackingPointQuery, type TrackingPointPage } from '@leopard/shared';

import { CurrentUser, type AuthenticatedActor } from '../auth/decorators/current-user.js';
import { RequireRoles } from '../auth/decorators/require-roles.js';
import { AccessTokenGuard } from '../auth/guards/access-token.guard.js';
import { RoleGuard } from '../auth/guards/role.guard.js';
import { ApiExceptionFilter } from '../common/api-exception.filter.js';
import { DomainError } from '../common/domain-error.js';
import { TrackingService } from './tracking.service.js';

type TrackingQueryStrings = Readonly<Record<string, string | undefined>>;

@Controller()
@UseFilters(ApiExceptionFilter)
@UseGuards(AccessTokenGuard, RoleGuard)
export class TrackingController {
  public constructor(private readonly trackingService: TrackingService) {}

  @Get('orders/:id/tracking')
  public getOrderHistory(
    @CurrentUser() actor: AuthenticatedActor,
    @Param('id') orderId: string,
    @Query() query: TrackingQueryStrings,
  ): Promise<TrackingPointPage> {
    return this.trackingService.getHistory(actor, orderId, parseQuery(query));
  }

  @Get('fleet/orders/:id/tracking')
  @RequireRoles('FLEET_OWNER')
  public getFleetOrderHistory(
    @CurrentUser() actor: AuthenticatedActor,
    @Param('id') orderId: string,
    @Query() query: TrackingQueryStrings,
  ): Promise<TrackingPointPage> {
    return this.trackingService.getHistory(actor, orderId, parseQuery(query));
  }
}

function parseQuery(query: TrackingQueryStrings) {
  try {
    return parseTrackingPointQuery(query);
  } catch (error) {
    if (error instanceof TypeError || error instanceof RangeError) {
      throw new DomainError('BAD_REQUEST', 400, error.message);
    }
    throw error;
  }
}
