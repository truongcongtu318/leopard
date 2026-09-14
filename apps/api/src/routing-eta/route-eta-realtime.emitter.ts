import { Injectable } from '@nestjs/common';
import type { Server } from 'socket.io';
import { TrackingSocketEvent, type RouteEtaUpdatedEventV1, type RouteUpdatedEventV1 } from '@leopard/shared';

const room = (orderId: string) => `order:${orderId}`;

export interface RouteEtaRealtimeEmitter {
  emitRouteEtaUpdated(event: RouteEtaUpdatedEventV1): void;
  emitRouteUpdated(event: RouteUpdatedEventV1): void;
}

@Injectable()
export class RouteEtaRealtimeEmitterImpl implements RouteEtaRealtimeEmitter {
  private server: Server | undefined;

  attach(server: Server): void {
    this.server = server;
  }

  emitRouteEtaUpdated(event: RouteEtaUpdatedEventV1): void {
    this.server?.to(room(event.orderId)).emit(TrackingSocketEvent.routeEtaUpdated, event);
  }

  emitRouteUpdated(event: RouteUpdatedEventV1): void {
    this.server?.to(room(event.orderId)).emit(TrackingSocketEvent.routeUpdated, event);
  }
}
