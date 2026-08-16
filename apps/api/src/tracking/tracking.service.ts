import { Injectable } from '@nestjs/common';
import type { TrackingPointDto, TrackingPointPage, TrackingPointQuery } from '@leopard/shared';

import type { AuthenticatedActor } from '../auth/decorators/current-user.js';
import { DomainError } from '../common/domain-error.js';
import { assertCanSendTracking, assertCanViewTracking } from './tracking.policy.js';
import { parseTrackingPoint } from './tracking-point.schema.js';
import { TrackingRateLimiter } from './tracking-rate-limiter.js';
import { TrackingRepository } from './tracking.repository.js';
import { mapTrackingPoint } from './tracking-response.mapper.js';

@Injectable()
export class TrackingService {
  public constructor(
    private readonly repository: TrackingRepository,
    private readonly rateLimiter: TrackingRateLimiter,
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
    );
    return mapTrackingPoint(point);
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
  return new DomainError('RESOURCE_NOT_FOUND', 404, 'Order was not found');
}

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/iu;

function assertOrderId(orderId: string): void {
  if (!UUID_PATTERN.test(orderId)) {
    throw notFound();
  }
}
