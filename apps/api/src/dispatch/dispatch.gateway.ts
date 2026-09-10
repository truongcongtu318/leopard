import { WebSocketGateway, WebSocketServer, type OnGatewayConnection } from '@nestjs/websockets';
import type { Server, Socket } from 'socket.io';
import { DISPATCH_NAMESPACE, DispatchSocketEvent, type DispatchOfferEvent } from '@leopard/shared';

import type { AuthenticatedActor } from '../auth/decorators/current-user.js';
import { DomainError } from '../common/domain-error.js';
import { OrderEventsPublisher } from '../orders/order-events.publisher.js';
import type { OrderRequestedEvent } from '../orders/order-events.publisher.js';
import { readToken } from '../tracking/tracking.gateway.js';
import { SocketAuthAdapter } from '../tracking/socket-auth.adapter.js';
import { DispatchService } from './dispatch.service.js';

type DispatchSocket = Socket & { data: { actor?: AuthenticatedActor } };
const DEFAULT_OFFER_TIMEOUT_SECONDS = 25;
const driverRoom = (userId: string) => `driver:${userId}`;

@WebSocketGateway({ namespace: DISPATCH_NAMESPACE })
export class DispatchGateway implements OnGatewayConnection {
  @WebSocketServer()
  private server!: Server;

  public constructor(
    private readonly auth: SocketAuthAdapter,
    private readonly dispatch: DispatchService,
    private readonly orderEvents: OrderEventsPublisher,
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
    const candidates = await this.dispatch.findCandidates(event.pickup);

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
      timeoutSeconds: DEFAULT_OFFER_TIMEOUT_SECONDS,
    };

    for (const candidate of candidates) {
      this.server
        ?.to(driverRoom(candidate.userId))
        .emit(DispatchSocketEvent.offer, { ...payload, driverDistanceM: candidate.distanceM });
    }
  }
}
