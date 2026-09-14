import {
  ConnectedSocket,
  MessageBody,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
  type OnGatewayConnection,
} from '@nestjs/websockets';
import type { Server, Socket } from 'socket.io';
import type { AuthenticatedActor } from '../auth/decorators/current-user.js';
import { DomainError } from '../common/domain-error.js';
import { SocketAuthAdapter } from '../tracking/socket-auth.adapter.js';
import { readToken } from '../tracking/tracking.gateway.js';
import { ChatService } from './chat.service.js';

type ChatSocket = Socket & { data: { actor?: AuthenticatedActor; token?: string } };

const chatRoom = (orderId: string) => `order:${orderId}`;

export interface ChatJoinPayload {
  orderId: string;
}

export interface ChatSendPayload {
  orderId: string;
  body: string;
}

@WebSocketGateway({ namespace: '/chat' })
export class ChatGateway implements OnGatewayConnection {
  @WebSocketServer()
  private server!: Server;

  constructor(
    private readonly auth: SocketAuthAdapter,
    private readonly chatService: ChatService,
  ) {}

  async handleConnection(client: ChatSocket): Promise<void> {
    const token = readToken(client);
    try {
      if (!token) throw new DomainError('AUTH_REQUIRED', 401, 'Bạn cần đăng nhập để tiếp tục');
      client.data.actor = await this.auth.authenticate(token);
      client.data.token = token;
    } catch {
      client.emit('session:error', { code: 'AUTH_REQUIRED', message: 'Bạn cần đăng nhập để tiếp tục' });
      client.disconnect(true);
    }
  }

  @SubscribeMessage('chat:join')
  async handleJoin(
    @ConnectedSocket() client: ChatSocket,
    @MessageBody() payload: ChatJoinPayload,
  ): Promise<{ ok: boolean; error?: { code: string; message: string } }> {
    try {
      const actor = await this.actor(client);
      if (!payload?.orderId) {
        throw new DomainError('RESOURCE_NOT_FOUND', 404, 'Thiếu thông tin đơn hàng');
      }
      await this.chatService.verifyOrderParticipant(actor.userId, payload.orderId);
      await client.join(chatRoom(payload.orderId));
      return { ok: true };
    } catch (error: any) {
      return this.ackError(error);
    }
  }

  @SubscribeMessage('chat:send')
  async handleSend(
    @ConnectedSocket() client: ChatSocket,
    @MessageBody() payload: ChatSendPayload,
  ): Promise<{ ok: boolean; message?: unknown; error?: { code: string; message: string } }> {
    try {
      const actor = await this.actor(client);
      if (!payload?.orderId) {
        throw new DomainError('RESOURCE_NOT_FOUND', 404, 'Thiếu thông tin đơn hàng');
      }
      const message = await this.chatService.sendMessage(actor.userId, payload.orderId, {
        body: payload.body,
      });

      this.server.to(chatRoom(payload.orderId)).emit('chat:message', message);
      return { ok: true, message };
    } catch (error: any) {
      return this.ackError(error);
    }
  }

  private async actor(client: ChatSocket): Promise<AuthenticatedActor> {
    const token = client.data.token;
    if (!token) throw new DomainError('AUTH_REQUIRED', 401, 'Bạn cần đăng nhập để tiếp tục');
    try {
      const actor = await this.auth.authenticate(token);
      client.data.actor = actor;
      return actor;
    } catch {
      client.emit('session:error', { code: 'SESSION_EXPIRED', message: 'Phiên đăng nhập đã hết hạn' });
      client.disconnect(true);
      throw new DomainError('SESSION_EXPIRED', 401, 'Phiên đăng nhập đã hết hạn');
    }
  }

  private ackError(error: any): { ok: false; error: { code: string; message: string } } {
    if (error instanceof DomainError) {
      return { ok: false, error: { code: error.code, message: error.message } };
    }
    return { ok: false, error: { code: 'INTERNAL_ERROR', message: error?.message || 'Chat error' } };
  }
}
