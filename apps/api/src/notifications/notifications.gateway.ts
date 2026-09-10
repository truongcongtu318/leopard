import {
  WebSocketGateway,
  WebSocketServer,
  type OnGatewayConnection,
} from '@nestjs/websockets';
import type { Server, Socket } from 'socket.io';
import {
  NOTIFICATIONS_NAMESPACE,
  NotificationSocketEvent,
  type NotificationCreatedEvent,
} from '@leopard/shared';

import type { AuthenticatedActor } from '../auth/decorators/current-user.js';
import { DomainError } from '../common/domain-error.js';
import { SocketAuthAdapter } from '../tracking/socket-auth.adapter.js';
import { sessionErrorEvent } from './notifications.events.js';

type NotificationSocket = Socket & { data: { actor?: AuthenticatedActor; token?: string } };

const room = (userId: string) => `user:${userId}`;

/**
 * Realtime delivery for persisted notifications. Modeled on
 * `TrackingGateway`: authenticate on connect, then join the caller's own
 * user room. Unlike tracking, there is no client-subscribable message here —
 * a connection is only ever placed in its own `user:<userId>` room, so there
 * is no client event that could target another user's room.
 */
@WebSocketGateway({ namespace: NOTIFICATIONS_NAMESPACE })
export class NotificationsGateway implements OnGatewayConnection {
  @WebSocketServer()
  private server!: Server;

  public constructor(private readonly auth: SocketAuthAdapter) {}

  public async handleConnection(client: NotificationSocket): Promise<void> {
    const token = readToken(client);
    try {
      if (!token) throw new DomainError('AUTH_REQUIRED', 401, 'Bạn cần đăng nhập để tiếp tục');
      const actor = await this.auth.authenticate(token);
      client.data.actor = actor;
      client.data.token = token;
      await client.join(room(actor.userId));
    } catch {
      client.emit(
        NotificationSocketEvent.sessionError,
        sessionErrorEvent('AUTH_REQUIRED', 'Bạn cần đăng nhập để tiếp tục'),
      );
      client.disconnect(true);
    }
  }

  public emitToUser(userId: string, event: NotificationCreatedEvent): void {
    this.server?.to(room(userId)).emit(NotificationSocketEvent.created, event);
  }
}

export function readToken(client: { handshake?: Socket['handshake'] }): string | undefined {
  const auth = client.handshake?.auth as { token?: unknown } | undefined;
  if (typeof auth?.token === 'string' && auth.token.trim()) return auth.token.trim();
  const header = client.handshake?.headers?.authorization;
  return typeof header === 'string' && header.startsWith('Bearer ') ? header.slice(7).trim() : undefined;
}
