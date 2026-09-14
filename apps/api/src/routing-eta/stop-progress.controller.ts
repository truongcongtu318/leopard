import { Body, Controller, Param, Post, UseFilters, UseGuards } from '@nestjs/common';

import { CurrentUser, type AuthenticatedActor } from '../auth/decorators/current-user.js';
import { RequireRoles } from '../auth/decorators/require-roles.js';
import { AccessTokenGuard } from '../auth/guards/access-token.guard.js';
import { RoleGuard } from '../auth/guards/role.guard.js';
import { ApiExceptionFilter } from '../common/api-exception.filter.js';
import { PrismaService } from '../database/prisma.service.js';
import { validateStopProgressBody, validateStopProgressVoidBody } from './dto/stop-progress.dto.js';
import { buildRouteEtaResponse } from './route-eta.controller.js';
import { StopProgressService } from './stop-progress.service.js';

@Controller('orders/:id/stops/:stopId/progress')
@UseFilters(ApiExceptionFilter)
@UseGuards(AccessTokenGuard, RoleGuard)
export class StopProgressController {
  public constructor(
    private readonly stopProgress: StopProgressService,
    private readonly prisma: PrismaService,
  ) {}

  @Post()
  @RequireRoles('DRIVER')
  public async record(
    @CurrentUser() actor: AuthenticatedActor,
    @Param('id') orderId: string,
    @Param('stopId') stopId: string,
    @Body() rawBody: unknown,
  ) {
    const body = validateStopProgressBody(rawBody);
    const { eventId, replayed } = await this.stopProgress.record(
      actor,
      orderId,
      stopId,
      body.step,
      body.clientRequestId,
      body.occurredAt,
    );
    const currentRouteEta = await buildRouteEtaResponse(this.prisma, orderId);
    return {
      progressEvent: {
        id: eventId,
        orderId,
        stopId,
        step: body.step,
        action: 'RECORDED' as const,
        occurredAt: body.occurredAt.toISOString(),
      },
      recompute: { inputRevision: currentRouteEta.desiredInputRevision, state: 'QUEUED' as const },
      currentRouteEta,
      replayed,
    };
  }

  @Post('void')
  @RequireRoles('ADMIN')
  public async void(
    @CurrentUser() actor: AuthenticatedActor,
    @Param('id') orderId: string,
    @Param('stopId') stopId: string,
    @Body() rawBody: unknown,
  ) {
    const body = validateStopProgressVoidBody(rawBody);
    const { eventId, replayed } = await this.stopProgress.void(
      actor,
      orderId,
      stopId,
      body.supersedesEventId,
      body.clientRequestId,
      body.reason,
      body.occurredAt,
    );
    const currentRouteEta = await buildRouteEtaResponse(this.prisma, orderId);
    return {
      progressEvent: {
        id: eventId,
        orderId,
        stopId,
        action: 'VOIDED' as const,
        occurredAt: body.occurredAt.toISOString(),
      },
      recompute: { inputRevision: currentRouteEta.desiredInputRevision, state: 'QUEUED' as const },
      currentRouteEta,
      replayed,
    };
  }
}
