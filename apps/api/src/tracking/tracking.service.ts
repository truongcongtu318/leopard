import { Injectable } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import type { TrackingPointDto, TrackingPointPage, TrackingPointQuery } from '@leopard/shared';

import type { AuthenticatedActor } from '../auth/decorators/current-user.js';
import { DomainError } from '../common/domain-error.js';
import { haversineDistanceMeters } from '../maps/domain/haversine.js';
import { EtaService } from '../routing-eta/eta.service.js';
import { assertCanSendTracking, assertCanViewTracking } from './tracking.policy.js';
import { parseTrackingPoint } from './tracking-point.schema.js';
import { TrackingRateLimiter } from './tracking-rate-limiter.js';
import { TrackingRepository } from './tracking.repository.js';
import { mapTrackingPoint, type TrackingPointRawRow } from './tracking-response.mapper.js';

const MIN_RECOMPUTE_INTERVAL_S = 30;
const MIN_RECOMPUTE_DISTANCE_M = 50;

@Injectable()
export class TrackingService {
  public constructor(
    private readonly repository: TrackingRepository,
    private readonly rateLimiter: TrackingRateLimiter,
    private readonly etaService: EtaService,
  ) {}

  public async recordPoint(
    actor: AuthenticatedActor,
    orderId: string,
    rawInput: unknown,
  ): Promise<TrackingPointDto> {
    assertOrderId(orderId);
    const input = parseTrackingPoint(rawInput);
    const point = await this.repository.recordPointAtomically(
      actor.userId,
      orderId,
      input,
      (order) => assertCanSendTracking(actor, order),
      () => this.rateLimiter.consume(actor.userId, orderId),
      (tx, insertedPoint, previousPoint) => this.coalesceRouteEtaBump(tx, orderId, insertedPoint, previousPoint),
    );
    return mapTrackingPoint(point);
  }

  private async coalesceRouteEtaBump(
    tx: Prisma.TransactionClient,
    orderId: string,
    insertedPoint: TrackingPointRawRow,
    previousPoint: TrackingPointRawRow | null,
  ): Promise<void> {
    const order = await tx.order.findUniqueOrThrow({
      where: { id: orderId },
      select: {
        routeEtaLastBumpAt: true,
        currentNextStopEstimateId: true,
      },
    });

    const secondsSinceBump = order.routeEtaLastBumpAt
      ? (insertedPoint.capturedAt.getTime() - order.routeEtaLastBumpAt.getTime()) / 1000
      : Infinity;
    const intervalElapsed = secondsSinceBump >= MIN_RECOMPUTE_INTERVAL_S;

    const movedEnough = previousPoint
      ? haversineDistanceMeters(
          { latitude: previousPoint.latitude, longitude: previousPoint.longitude },
          { latitude: insertedPoint.latitude, longitude: insertedPoint.longitude },
        ) >= MIN_RECOMPUTE_DISTANCE_M
      : true;

    const estimate = order.currentNextStopEstimateId
      ? await tx.orderLiveEstimate.findUnique({ where: { id: order.currentNextStopEstimateId } })
      : null;
    const estimateExpired = !estimate || estimate.validUntil < insertedPoint.capturedAt;

    if (!intervalElapsed && !movedEnough && !estimateExpired) {
      return;
    }

    await tx.order.update({
      where: { id: orderId },
      data: { routeEtaLastBumpAt: insertedPoint.capturedAt, routeEtaLastGpsPointId: insertedPoint.id },
    });
    await this.etaService.bumpRevision(tx, orderId);
  }

  public async getHistory(
    actor: AuthenticatedActor,
    orderId: string,
    query: TrackingPointQuery,
  ): Promise<TrackingPointPage> {
    assertOrderId(orderId);
    const order = await this.repository.findOrderAccess(actor.userId, orderId);
    if (!order) {
      throw notFound();
    }
    try {
      assertCanViewTracking(actor, order);
    } catch (error) {
      throw concealForbidden(error);
    }
    return this.repository.findHistory(orderId, query);
  }

  public async joinOrder(
    actor: AuthenticatedActor,
    orderId: string,
  ): Promise<TrackingPointDto | null> {
    assertOrderId(orderId);
    const order = await this.repository.findOrderAccess(actor.userId, orderId);
    if (!order) {
      throw notFound();
    }
    assertCanViewTracking(actor, order);
    const latest = await this.repository.findLatestPoint(orderId);
    return latest ? mapTrackingPoint(latest) : null;
  }
}

function concealForbidden(error: unknown): unknown {
  if (error instanceof DomainError && error.code === 'TRACKING_FORBIDDEN') {
    return notFound();
  }
  return error;
}

function notFound(): DomainError {
  return new DomainError('RESOURCE_NOT_FOUND', 404, 'Không tìm thấy đơn hàng');
}

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/iu;

function assertOrderId(orderId: string): void {
  if (!UUID_PATTERN.test(orderId)) {
    throw notFound();
  }
}
