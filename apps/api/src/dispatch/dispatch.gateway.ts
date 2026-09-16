import { WebSocketGateway, WebSocketServer, type OnGatewayConnection } from '@nestjs/websockets';
import type { Server, Socket } from 'socket.io';
import { DISPATCH_NAMESPACE, DispatchSocketEvent, type DispatchOfferEvent } from '@leopard/shared';

import type { AuthenticatedActor } from '../auth/decorators/current-user.js';
import { DomainError } from '../common/domain-error.js';
import { OrderDispatchOffersRepository } from '../orders/order-dispatch-offers.repository.js';
import { OrderEventsPublisher } from '../orders/order-events.publisher.js';
import type { OrderRequestedEvent } from '../orders/order-events.publisher.js';
import { readToken } from '../tracking/tracking.gateway.js';
import { SocketAuthAdapter } from '../tracking/socket-auth.adapter.js';
import { OFFER_TIMEOUT_SECONDS } from './dispatch.constants.js';
import { DispatchService } from './dispatch.service.js';

type DispatchSocket = Socket & { data: { actor?: AuthenticatedActor } };
const driverRoom = (userId: string) => `driver:${userId}`;

@WebSocketGateway({ namespace: DISPATCH_NAMESPACE })
export class DispatchGateway implements OnGatewayConnection {
  @WebSocketServer()
  private server!: Server;

  public constructor(
    private readonly auth: SocketAuthAdapter,
    private readonly dispatch: DispatchService,
    private readonly orderEvents: OrderEventsPublisher,
    private readonly offers: OrderDispatchOffersRepository,
  ) {
    this.orderEvents.subscribeRequested((event) => {
      void this.dispatchOrder(event);
    });
  }

  public async handleConnection(client: DispatchSocket): Promise<void> {
    const token = readToken(client);
    try {
      if (!token) throw new DomainError('AUTH_REQUIRED', 401, 'Bạn cần đăng nhập để tiếp tục');
      const actor = await this.auth.authenticate(token);
      client.data.actor = actor;
      if (actor.role === 'DRIVER') {
        await client.join(driverRoom(actor.userId));
      }
    } catch {
      client.disconnect(true);
    }
  }

  private async dispatchOrder(event: OrderRequestedEvent): Promise<void> {
    const candidates = await this.dispatch.findCandidates(
      event.pickup,
      undefined,
      undefined,
      event.vehicleType,
    );

    if (candidates.length === 0) return;

    await this.offers.createPending(
      event.orderId,
      candidates.map((candidate) => candidate.userId),
    );
    this.emitOffersToCandidates(event, candidates);
  }

  /**
   * Shared by the initial synchronous dispatch above and DispatchSweepService's
   * redispatch rounds — both already have a candidate list and an
   * OrderRequestedEvent-shaped payload, they only differ in radius/exclusions.
   */
  public emitOffersToCandidates(
    event: Omit<OrderRequestedEvent, 'occurredAt'>,
    candidates: Array<{ userId: string; distanceM: number }>,
  ): void {
    const payload: DispatchOfferEvent = {
      orderId: event.orderId,
      pickup: event.pickup,
      pickupAddress: event.pickupAddress,
      dropoffAddress: event.dropoffAddress,
      vehicleType: event.vehicleType,
      priceVnd: event.priceVnd,
      distanceMeters: event.distanceMeters,
      durationSeconds: event.durationSeconds,
      cargoNote: event.cargoNote,
      driverDistanceM: 0,
      timeoutSeconds: OFFER_TIMEOUT_SECONDS,
    };

    for (const candidate of candidates) {
      this.server
        ?.to(driverRoom(candidate.userId))
        .emit(DispatchSocketEvent.offer, { ...payload, driverDistanceM: candidate.distanceM });
    }
  }
}
