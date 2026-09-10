import { extractOrderId, formatDateTime, mapNotificationType } from './adapter';
import type { NotificationItemView } from './model';

function getDefaultToken(): string | null {
  try {
    const { sessionStore } = require('@leopard/mobile-core');
    return sessionStore.getAccessToken();
  } catch {
    return null;
  }
}

async function getDefaultRefreshToken(): Promise<boolean> {
  try {
    const { refreshSession } = require('@leopard/mobile-core');
    return refreshSession();
  } catch {
    return false;
  }
}

export type NotificationConnectionState =
  | 'idle'
  | 'connecting'
  | 'connected'
  | 'reconnecting'
  | 'disconnected'
  | 'error';

export interface SocketLike {
  connected: boolean;
  id?: string;
  connect(): this | void;
  disconnect(): this | void;
  emit(event: string, ...args: unknown[]): this | void;
  on(event: string, fn: (...args: any[]) => void): this | void;
  off(event: string, fn?: (...args: any[]) => void): this | void;
  removeAllListeners?(event?: string): this | void;
}

export type SocketFactory = (uri: string, opts?: Record<string, unknown>) => SocketLike;

export interface SocketNotificationCreatedPayload {
  id: string;
  type: string;
  title: string;
  body: string;
  createdAt: string;
  orderId?: string;
  data?: { orderId?: string } | Record<string, unknown> | null;
}

export interface SocketSessionErrorPayload {
  code: string;
  message: string;
}

export interface NotificationSocketCallbacks {
  onNotificationCreated?: (item: NotificationItemView) => void;
  onConnectionStateChanged?: (state: NotificationConnectionState) => void;
  onSessionError?: (error: SocketSessionErrorPayload) => void;
}

export interface CustomerNotificationSocketOptions {
  socket?: SocketLike;
  socketFactory?: SocketFactory;
  serverUrl?: string;
  namespace?: string;
  tokenProvider?: () => string | null | Promise<string | null>;
  onTokenExpired?: () => Promise<boolean>;
}

export function mapSocketPayloadToView(
  payload: SocketNotificationCreatedPayload,
): NotificationItemView {
  const orderId = payload.orderId ?? extractOrderId(payload.data ?? null);
  return {
    id: payload.id,
    type: mapNotificationType(payload.type),
    title: payload.title,
    body: payload.body,
    createdAt: payload.createdAt,
    createdAtLabel: formatDateTime(payload.createdAt),
    isRead: false,
    ...(orderId ? { orderId } : {}),
  };
}

export class CustomerNotificationSocketManager {
  private socket: SocketLike | null = null;
  private connectionState: NotificationConnectionState = 'idle';
  private seenIds = new Set<string>();
  private listeners = new Set<NotificationSocketCallbacks>();

  private readonly socketFactory?: SocketFactory;
  private readonly serverUrl: string;
  private readonly namespace: string;
  private readonly tokenProvider?: () => string | null | Promise<string | null>;
  private readonly onTokenExpiredHandler?: () => Promise<boolean>;

  constructor(options: CustomerNotificationSocketOptions = {}) {
    this.socket = options.socket ?? null;
    this.socketFactory = options.socketFactory;
    this.serverUrl = options.serverUrl ?? process.env.EXPO_PUBLIC_API_URL ?? '';
    this.namespace = options.namespace ?? '/notifications';
    this.tokenProvider = options.tokenProvider;
    this.onTokenExpiredHandler = options.onTokenExpired;

    if (this.socket) {
      this.attachSocketListeners(this.socket);
    }
  }

  public getConnectionState(): NotificationConnectionState {
    return this.connectionState;
  }

  public subscribe(callbacks: NotificationSocketCallbacks): () => void {
    this.listeners.add(callbacks);
    return () => {
      this.listeners.delete(callbacks);
    };
  }

  public async connect(): Promise<void> {
    if (this.socket?.connected) {
      this.setConnectionState('connected');
      return;
    }

    if (!this.socket && this.socketFactory) {
      const token = this.tokenProvider ? await this.tokenProvider() : getDefaultToken();
      const uri = `${this.serverUrl}${this.namespace}`;
      this.socket = this.socketFactory(uri, {
        auth: { token },
        transports: ['websocket'],
      });
      this.attachSocketListeners(this.socket);
    }

    if (this.socket) {
      this.setConnectionState('connecting');
      this.socket.connect();
    }
  }

  public disconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
    }
    this.setConnectionState('disconnected');
  }

  public handleIncomingNotification(payload: SocketNotificationCreatedPayload): void {
    if (!payload || !payload.id) return;
    if (this.seenIds.has(payload.id)) return;
    this.recordSeenId(payload.id);

    const item = mapSocketPayloadToView(payload);
    for (const listener of this.listeners) {
      listener.onNotificationCreated?.(item);
    }
  }

  public async handleSessionError(payload: SocketSessionErrorPayload): Promise<void> {
    for (const listener of this.listeners) {
      listener.onSessionError?.(payload);
    }

    const refreshed = this.onTokenExpiredHandler
      ? await this.onTokenExpiredHandler()
      : await getDefaultRefreshToken();

    if (refreshed && this.socket) {
      this.socket.disconnect();
      await this.connect();
    }
  }

  public destroy(): void {
    this.disconnect();
    this.listeners.clear();
    this.seenIds.clear();
    if (this.socket?.removeAllListeners) {
      this.socket.removeAllListeners();
    }
    this.socket = null;
  }

  private setConnectionState(newState: NotificationConnectionState): void {
    if (this.connectionState === newState) return;
    this.connectionState = newState;
    for (const listener of this.listeners) {
      listener.onConnectionStateChanged?.(newState);
    }
  }

  private attachSocketListeners(socket: SocketLike): void {
    socket.on('connect', () => {
      this.setConnectionState('connected');
    });

    socket.on('disconnect', () => {
      this.setConnectionState('disconnected');
    });

    socket.on('connect_error', () => {
      this.setConnectionState('reconnecting');
    });

    socket.on('reconnecting', () => {
      this.setConnectionState('reconnecting');
    });

    socket.on('reconnect', () => {
      this.setConnectionState('connected');
    });

    socket.on('error', () => {
      this.setConnectionState('error');
    });

    socket.on('notification:new', (payload: SocketNotificationCreatedPayload) => {
      this.handleIncomingNotification(payload);
    });

    socket.on('session:error', (payload: SocketSessionErrorPayload) => {
      void this.handleSessionError(payload);
    });
  }

  private recordSeenId(id: string): void {
    if (this.seenIds.size > 500) {
      const first = this.seenIds.values().next().value;
      if (first !== undefined) this.seenIds.delete(first);
    }
    this.seenIds.add(id);
  }
}

export function createCustomerNotificationSocket(
  options?: CustomerNotificationSocketOptions,
): CustomerNotificationSocketManager {
  return new CustomerNotificationSocketManager(options);
}
