import {
  ConnectedSocket,
  MessageBody,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
  type OnGatewayConnection,
} from '@nestjs/websockets';
import type { Server, Socket } from 'socket.io';
import { TrackingSocketEvent, type SocketAck, type SocketErrorCode, type JoinOrderPayload, type LeaveOrderPayload, type SendTrackingPointPayload } from '@leopard/shared';

import type { AuthenticatedActor } from '../auth/decorators/current-user.js';
import { DomainError } from '../common/domain-error.js';
import { SocketAuthAdapter } from './socket-auth.adapter.js';
import { sessionErrorEvent, trackingPointEvent } from './tracking.events.js';
import { TrackingService } from './tracking.service.js';
import { OrderEventsPublisher } from '../orders/order-events.publisher.js';
import type { OrderStatusChangedEvent } from '../orders/order-events.publisher.js';

type TrackingSocket = Socket & { data: { actor?: AuthenticatedActor; token?: string } };
const room = (orderId: string) => `order:${orderId}`;

@WebSocketGateway({ namespace: '/tracking' })
export class TrackingGateway implements OnGatewayConnection {
  @WebSocketServer()
  private server!: Server;

  public constructor(
    private readonly auth: SocketAuthAdapter,
    private readonly tracking: TrackingService,
    private readonly orderEvents: OrderEventsPublisher,
  ) {
    this.orderEvents.subscribe((event) => this.broadcastOrderStatus(event));
  }

  public async handleConnection(client: TrackingSocket): Promise<void> {
    const token = readToken(client);
    try {
      if (!token) throw new DomainError('AUTH_REQUIRED', 401, 'Authentication required');
      client.data.actor = await this.auth.authenticate(token);
      client.data.token = token;
    } catch {
      client.emit(TrackingSocketEvent.sessionError, sessionErrorEvent('AUTH_REQUIRED', 'Authentication required'));
      client.disconnect(true);
    }
  }

  @SubscribeMessage(TrackingSocketEvent.joinOrder)
  public async joinOrder(
    @ConnectedSocket() client: TrackingSocket,
    @MessageBody() payload: JoinOrderPayload,
  ): Promise<SocketAck<{ latestPoint: Awaited<ReturnType<TrackingService['joinOrder']>> }>> {
    try {
      const actor = await this.actor(client);
      if (!isUuid(payload?.orderId)) throw new DomainError('RESOURCE_NOT_FOUND', 404, 'Order was not found');
      const latestPoint = await this.tracking.joinOrder(actor, payload.orderId);
      await client.join(room(payload.orderId));
      return { ok: true, latestPoint };
    } catch (error) {
      return ackError(error);
    }
  }

  @SubscribeMessage(TrackingSocketEvent.leaveOrder)
  public async leaveOrder(
    @ConnectedSocket() client: TrackingSocket,
    @MessageBody() payload: LeaveOrderPayload,
  ): Promise<SocketAck> {
    try {
      await this.actor(client);
      if (!isUuid(payload?.orderId)) throw new DomainError('RESOURCE_NOT_FOUND', 404, 'Order was not found');
      await client.leave(room(payload.orderId));
      return { ok: true };
    } catch (error) {
      return ackError(error);
    }
  }

  @SubscribeMessage(TrackingSocketEvent.sendPoint)
  public async sendPoint(
    @ConnectedSocket() client: TrackingSocket,
    @MessageBody() payload: SendTrackingPointPayload,
  ): Promise<SocketAck<{ point: Awaited<ReturnType<TrackingService['recordPoint']>> }>> {
    try {
      const actor = await this.actor(client);
      if (!isUuid(payload?.orderId)) throw new DomainError('RESOURCE_NOT_FOUND', 404, 'Order was not found');
      const point = await this.tracking.recordPoint(actor, payload.orderId, payload);
      this.server.to(room(payload.orderId)).emit(TrackingSocketEvent.pointUpdated, trackingPointEvent({ orderId: payload.orderId, point }));
      return { ok: true, point };
    } catch (error) {
      return ackError(error);
    }
  }

  private async actor(client: TrackingSocket): Promise<AuthenticatedActor> {
    const token = client.data.token;
    if (!token) throw new DomainError('AUTH_REQUIRED', 401, 'Authentication required');
    try {
      const actor = await this.auth.authenticate(token);
      client.data.actor = actor;
      return actor;
    } catch {
      client.emit(TrackingSocketEvent.sessionError, sessionErrorEvent('SESSION_EXPIRED', 'Session expired'));
      client.disconnect(true);
      throw new DomainError('SESSION_EXPIRED', 401, 'Session expired');
    }
  }

  private broadcastOrderStatus(event: OrderStatusChangedEvent): void {
    this.server?.to(room(event.orderId)).emit(TrackingSocketEvent.orderStatusUpdated, event);
  }
}

function readToken(client: TrackingSocket): string | undefined {
  const auth = client.handshake?.auth as { token?: unknown } | undefined;
  if (typeof auth?.token === 'string' && auth.token.trim()) return auth.token.trim();
  const header = client.handshake?.headers?.authorization;
  if (typeof header === 'string' && header.startsWith('Bearer ')) {
    const bearer = header.slice(7).trim();
    if (bearer) return bearer;
  }
  const cookieHeader = client.handshake?.headers?.cookie;
  if (typeof cookieHeader === 'string' && cookieHeader) {
    for (const part of cookieHeader.split(';')) {
      const [rawName, ...rawValue] = part.trim().split('=');
      if (rawName === 'leopard.admin.access') {
        const value = rawValue.join('=').trim();
        try {
          const decoded = decodeURIComponent(value);
          if (decoded) return decoded;
        } catch {
          if (value) return value;
        }
      }
    }
  }
  return undefined;
}

function isUuid(value: unknown): value is string {
  return typeof value === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/iu.test(value);
}

function ackError(error: unknown): SocketAckError {
  if (error instanceof DomainError) return { ok: false, error: { code: error.code as SocketErrorCode, message: error.message } };
  return { ok: false, error: { code: 'PROVIDER_UNAVAILABLE', message: 'Tracking service unavailable' } };
}

type SocketAckError = Extract<SocketAck, { ok: false }>;
