import type { OrderStatus, SendTrackingPointPayload } from '@leopard/shared';

import {
  deepFreeze,
  formatDateTime,
  parseDriverOrderId,
} from './adapter';
import type { DriverTrackingView } from './model';
import type { DriverTrackingPort } from './port';

function getDefaultToken(): string | null {
  try {
    const { sessionStore } = require('../../../auth/session-store');
    return sessionStore.getAccessToken();
  } catch {
    return null;
  }
}

async function getDefaultRefreshToken(): Promise<boolean> {
  try {
    const { refreshSession } = require('../../../api/http-client');
    return refreshSession();
  } catch {
    return false;
  }
}

function generateClientPointId(): string {
  try {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
      return crypto.randomUUID();
    }
  } catch {
    // ignore
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export type DriverTrackingConnectionState =
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

export type SocketFactory = (
  uri: string,
  opts?: Record<string, unknown>,
) => SocketLike;

export interface DriverGpsCoordinate {
  latitude: number;
  longitude: number;
  accuracyM?: number;
  heading?: number | null;
  speed?: number | null;
  capturedAt?: string;
  clientPointId?: string;
}

export interface SendPointResult {
  sent: boolean;
  queued: boolean;
  throttled: boolean;
  duplicate: boolean;
  dropped: boolean;
  reason?: string;
  clientPointId?: string;
}

export interface DriverTrackingSenderOptions {
  socket?: SocketLike;
  socketFactory?: SocketFactory;
  serverUrl?: string;
  namespace?: string;
  minIntervalMs?: number;
  maxQueueSize?: number;
  tokenProvider?: () => string | null | Promise<string | null>;
  onTokenExpired?: () => Promise<boolean>;
  onHealthChanged?: (health: DriverTrackingView) => void;
  onPointSent?: (payload: SendTrackingPointPayload) => void;
  onQueueFlushed?: (count: number) => void;
  onError?: (error: Error | { code: string; message: string }) => void;
}

export function isTrackingEligibleStatus(status?: OrderStatus | null): boolean {
  return status === 'PICKING_UP' || status === 'IN_TRANSIT';
}

export function isTerminalStatus(status?: OrderStatus | null): boolean {
  return status === 'DELIVERED' || status === 'CANCELLED';
}

export class DriverTrackingSender {
  private socket: SocketLike | null = null;
  private connectionState: DriverTrackingConnectionState = 'idle';
  private activeOrderId: string | null = null;
  private activeStatus: OrderStatus | null = null;
  private isStarted = false;
  private permissionDenied = false;

  private lastSentTimestamp = 0;
  private lastSentPoint: SendTrackingPointPayload | null = null;
  private offlineQueue: SendTrackingPointPayload[] = [];
  private seenClientPointIds = new Set<string>();
  private healthListeners = new Set<(health: DriverTrackingView) => void>();
  private isFlushing = false;

  private readonly socketFactory?: SocketFactory;
  private readonly serverUrl: string;
  private readonly namespace: string;
  private readonly minIntervalMs: number;
  private readonly maxQueueSize: number;
  private readonly tokenProvider?: () => string | null | Promise<string | null>;
  private readonly onTokenExpiredHandler?: () => Promise<boolean>;
  private readonly onHealthChangedHandler?: (health: DriverTrackingView) => void;
  private readonly onPointSentHandler?: (payload: SendTrackingPointPayload) => void;
  private readonly onQueueFlushedHandler?: (count: number) => void;
  private readonly onErrorHandler?: (error: Error | { code: string; message: string }) => void;

  constructor(options: DriverTrackingSenderOptions = {}) {
    this.socket = options.socket ?? null;
    this.socketFactory = options.socketFactory;
    this.serverUrl =
      options.serverUrl ?? process.env.EXPO_PUBLIC_API_URL ?? '';
    this.namespace = options.namespace ?? '/tracking';
    this.minIntervalMs = options.minIntervalMs ?? 5000;
    this.maxQueueSize = options.maxQueueSize ?? 50;
    this.tokenProvider = options.tokenProvider;
    this.onTokenExpiredHandler = options.onTokenExpired;
    this.onHealthChangedHandler = options.onHealthChanged;
    this.onPointSentHandler = options.onPointSent;
    this.onQueueFlushedHandler = options.onQueueFlushed;
    this.onErrorHandler = options.onError;

    if (this.socket) {
      this.attachSocketListeners(this.socket);
    }
  }

  public getConnectionState(): DriverTrackingConnectionState {
    return this.connectionState;
  }

  public getActiveOrderId(): string | null {
    return this.activeOrderId;
  }

  public getActiveStatus(): OrderStatus | null {
    return this.activeStatus;
  }

  public getQueueLength(): number {
    return this.offlineQueue.length;
  }

  public getLastSentPoint(): SendTrackingPointPayload | null {
    return this.lastSentPoint;
  }

  public async connect(): Promise<void> {
    if (this.socket?.connected) {
      this.setConnectionState('connected');
      return;
    }

    if (!this.socket && this.socketFactory) {
      const token = this.tokenProvider
        ? await this.tokenProvider()
        : getDefaultToken();
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
    if (this.activeOrderId && this.socket?.connected) {
      this.socket.emit('tracking:leave-order', { orderId: this.activeOrderId });
    }
    if (this.socket) {
      this.socket.disconnect();
    }
    this.setConnectionState('disconnected');
  }

  public async start(orderId: string, initialStatus: OrderStatus = 'PICKING_UP'): Promise<void> {
    const validId = parseDriverOrderId(orderId);
    if (!validId) {
      throw new Error(`Invalid order ID format for tracking: ${orderId}`);
    }

    if (this.activeOrderId && this.activeOrderId !== validId) {
      this.stop('SWITCH_ORDER');
    }

    this.activeOrderId = validId;
    this.activeStatus = initialStatus;
    this.isStarted = true;

    if (isTerminalStatus(initialStatus)) {
      this.notifyHealthChanged();
      return;
    }

    if (initialStatus === 'ACCEPTED') {
      this.notifyHealthChanged();
      return;
    }

    if (isTrackingEligibleStatus(initialStatus)) {
      await this.connect();
      if (this.socket?.connected) {
        this.socket.emit('tracking:join-order', { orderId: validId });
        await this.flushQueue();
      }
    }

    this.notifyHealthChanged();
  }

  public stop(reason = 'USER_STOPPED'): void {
    this.isStarted = false;

    if (this.activeOrderId && this.socket?.connected) {
      this.socket.emit('tracking:leave-order', { orderId: this.activeOrderId });
    }

    this.activeOrderId = null;
    this.activeStatus = null;

    if (this.socket) {
      this.socket.disconnect();
    }

    if (reason === 'LOGOUT') {
      this.offlineQueue = [];
      this.seenClientPointIds.clear();
      this.lastSentPoint = null;
      this.lastSentTimestamp = 0;
    }

    this.setConnectionState('disconnected');
  }

  public handleOrderStatusChange(status: OrderStatus): void {
    this.activeStatus = status;

    if (isTerminalStatus(status)) {
      if (this.activeOrderId && this.socket?.connected) {
        this.socket.emit('tracking:leave-order', { orderId: this.activeOrderId });
      }
      if (this.socket) {
        this.socket.disconnect();
      }
      this.isStarted = false;
      this.notifyHealthChanged();
      return;
    }

    if (isTrackingEligibleStatus(status)) {
      if (!this.socket?.connected && this.activeOrderId) {
        void this.connect().then(() => {
          if (this.socket?.connected && this.activeOrderId) {
            this.socket.emit('tracking:join-order', { orderId: this.activeOrderId });
            void this.flushQueue();
          }
        });
      } else if (this.socket?.connected && this.activeOrderId) {
        this.socket.emit('tracking:join-order', { orderId: this.activeOrderId });
        void this.flushQueue();
      }
    }

    this.notifyHealthChanged();
  }

  public setPermissionDenied(denied: boolean): void {
    if (this.permissionDenied !== denied) {
      this.permissionDenied = denied;
      this.notifyHealthChanged();
    }
  }

  public isPermissionDenied(): boolean {
    return this.permissionDenied;
  }

  public async sendPoint(point: DriverGpsCoordinate): Promise<SendPointResult> {
    if (!this.activeOrderId) {
      return {
        sent: false,
        queued: false,
        throttled: false,
        duplicate: false,
        dropped: true,
        reason: 'NO_ACTIVE_ORDER',
      };
    }

    if (this.permissionDenied) {
      return {
        sent: false,
        queued: false,
        throttled: false,
        duplicate: false,
        dropped: true,
        reason: 'PERMISSION_DENIED',
      };
    }

    if (this.activeStatus === 'ACCEPTED') {
      return {
        sent: false,
        queued: false,
        throttled: false,
        duplicate: false,
        dropped: true,
        reason: 'ORDER_NOT_STARTED',
      };
    }

    if (isTerminalStatus(this.activeStatus)) {
      return {
        sent: false,
        queued: false,
        throttled: false,
        duplicate: false,
        dropped: true,
        reason: 'ORDER_TERMINAL',
      };
    }

    const clientPointId = point.clientPointId || generateClientPointId();

    if (this.seenClientPointIds.has(clientPointId)) {
      return {
        sent: false,
        queued: false,
        throttled: false,
        duplicate: true,
        dropped: true,
        reason: 'DUPLICATE_CLIENT_POINT_ID',
        clientPointId,
      };
    }

    const now = Date.now();
    const isSocketOnline = Boolean(this.socket?.connected && this.connectionState === 'connected');

    if (isSocketOnline && this.lastSentTimestamp > 0 && now - this.lastSentTimestamp < this.minIntervalMs) {
      return {
        sent: false,
        queued: false,
        throttled: true,
        duplicate: false,
        dropped: true,
        reason: 'THROTTLED',
        clientPointId,
      };
    }

    const payload: SendTrackingPointPayload = {
      orderId: this.activeOrderId,
      clientPointId,
      latitude: point.latitude,
      longitude: point.longitude,
      accuracyM: point.accuracyM,
      capturedAt: point.capturedAt ?? new Date().toISOString(),
    };

    if (!isSocketOnline) {
      if (this.offlineQueue.length >= this.maxQueueSize) {
        this.offlineQueue.shift();
      }
      this.offlineQueue.push(payload);
      this.recordClientPointId(clientPointId);
      this.notifyHealthChanged();
      return {
        sent: false,
        queued: true,
        throttled: false,
        duplicate: false,
        dropped: false,
        clientPointId,
      };
    }

    this.socket?.emit('tracking:send-point', payload);
    this.socket?.emit('tracking:point', payload);

    this.lastSentTimestamp = now;
    this.lastSentPoint = payload;
    this.recordClientPointId(clientPointId);

    this.onPointSentHandler?.(payload);
    this.notifyHealthChanged();

    return {
      sent: true,
      queued: false,
      throttled: false,
      duplicate: false,
      dropped: false,
      clientPointId,
    };
  }

  public async flushQueue(): Promise<number> {
    if (this.isFlushing || this.offlineQueue.length === 0 || !this.socket?.connected) {
      return 0;
    }

    this.isFlushing = true;
    let flushedCount = 0;

    while (this.offlineQueue.length > 0 && this.socket?.connected) {
      const item = this.offlineQueue.shift()!;
      this.socket.emit('tracking:send-point', item);
      this.socket.emit('tracking:point', item);

      this.lastSentTimestamp = Date.now();
      this.lastSentPoint = item;
      flushedCount++;
    }

    this.isFlushing = false;

    if (flushedCount > 0) {
      this.onQueueFlushedHandler?.(flushedCount);
      this.notifyHealthChanged();
    }

    return flushedCount;
  }

  public getHealth(): DriverTrackingView {
    const lastUpdatedLabel = this.lastSentPoint
      ? formatDateTime(this.lastSentPoint.capturedAt)
      : null;
    const queuedPointCount =
      this.offlineQueue.length > 0 ? this.offlineQueue.length : null;

    if (this.permissionDenied) {
      return deepFreeze<DriverTrackingView>({
        kind: 'permission-denied',
        label: 'Chưa được phép dùng vị trí',
        lastUpdatedLabel,
        queuedPointCount,
      });
    }

    if (isTerminalStatus(this.activeStatus)) {
      return deepFreeze<DriverTrackingView>({
        kind: 'unavailable',
        label: 'Tracking của chuyến đã kết thúc',
        lastUpdatedLabel,
        queuedPointCount: null,
      });
    }

    if (!this.isStarted || this.activeStatus === 'ACCEPTED' || !this.activeOrderId) {
      return deepFreeze<DriverTrackingView>({
        kind: 'not-started',
        label: 'Chưa bắt đầu gửi vị trí',
        lastUpdatedLabel: null,
        queuedPointCount: null,
      });
    }

    if (this.connectionState === 'error') {
      return deepFreeze<DriverTrackingView>({
        kind: 'stale',
        label: 'Vị trí chưa cập nhật',
        lastUpdatedLabel,
        queuedPointCount,
      });
    }

    if (this.connectionState === 'reconnecting') {
      return deepFreeze<DriverTrackingView>({
        kind: 'reconnecting',
        label: 'Đang kết nối lại',
        lastUpdatedLabel,
        queuedPointCount,
      });
    }

    if (this.connectionState === 'disconnected') {
      return deepFreeze<DriverTrackingView>({
        kind: 'offline',
        label: 'Mất kết nối · vị trí mới chưa gửi',
        lastUpdatedLabel,
        queuedPointCount,
      });
    }

    return deepFreeze<DriverTrackingView>({
      kind: 'healthy',
      label: 'Đang gửi vị trí',
      lastUpdatedLabel,
      queuedPointCount,
    });
  }

  public observeHealth(
    orderId: string,
    onChange: (health: DriverTrackingView) => void,
  ): Readonly<{ unsubscribe: () => void }> {
    const validId = parseDriverOrderId(orderId);
    this.healthListeners.add(onChange);
    onChange(this.getHealth());

    return {
      unsubscribe: () => {
        this.healthListeners.delete(onChange);
      },
    };
  }

  public async retryConnection(orderId?: string): Promise<DriverTrackingView> {
    const targetId = orderId ?? this.activeOrderId;
    if (targetId) {
      this.activeOrderId = targetId;
    }

    if (this.socket) {
      this.socket.disconnect();
    }
    await this.connect();

    if (this.socket?.connected && this.activeOrderId) {
      this.socket.emit('tracking:join-order', { orderId: this.activeOrderId });
      await this.flushQueue();
    }

    return this.getHealth();
  }

  public createTrackingPort(options?: {
    openForegroundLocationSettings?: () => Promise<void>;
  }): DriverTrackingPort {
    return {
      observeHealth: (orderId, onChange) => this.observeHealth(orderId, onChange),
      retryConnection: (orderId) => this.retryConnection(orderId),
      openForegroundLocationSettings: async () => {
        if (options?.openForegroundLocationSettings) {
          await options.openForegroundLocationSettings();
        }
      },
    };
  }

  public async handleSessionError(payload: { code: string; message: string }): Promise<void> {
    this.onErrorHandler?.(payload);

    const refreshed = this.onTokenExpiredHandler
      ? await this.onTokenExpiredHandler()
      : await getDefaultRefreshToken();

    if (refreshed && this.socket) {
      this.socket.disconnect();
      await this.connect();
      if (this.activeOrderId) {
        this.socket.emit('tracking:join-order', { orderId: this.activeOrderId });
        await this.flushQueue();
      }
    }
  }

  public destroy(): void {
    this.stop('DESTROY');
    this.healthListeners.clear();
    this.offlineQueue = [];
    this.seenClientPointIds.clear();
    if (this.socket?.removeAllListeners) {
      this.socket.removeAllListeners();
    }
    this.socket = null;
  }

  private setConnectionState(newState: DriverTrackingConnectionState): void {
    if (this.connectionState === newState) return;
    this.connectionState = newState;
    this.notifyHealthChanged();
  }

  private notifyHealthChanged(): void {
    const health = this.getHealth();
    this.onHealthChangedHandler?.(health);
    for (const listener of this.healthListeners) {
      listener(health);
    }
  }

  private attachSocketListeners(socket: SocketLike): void {
    socket.on('connect', () => {
      this.setConnectionState('connected');
      if (this.activeOrderId && isTrackingEligibleStatus(this.activeStatus)) {
        socket.emit('tracking:join-order', { orderId: this.activeOrderId });
        void this.flushQueue();
      }
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
      if (this.activeOrderId && isTrackingEligibleStatus(this.activeStatus)) {
        socket.emit('tracking:join-order', { orderId: this.activeOrderId });
        void this.flushQueue();
      }
    });

    socket.on('error', (err?: unknown) => {
      this.setConnectionState('error');
      if (err instanceof Error) {
        this.onErrorHandler?.(err);
      }
    });

    socket.on('session:error', (payload: { code: string; message: string }) => {
      void this.handleSessionError(payload);
    });

    socket.on('order:status_changed', (payload: { orderId?: string; currentStatus?: OrderStatus; status?: OrderStatus }) => {
      if (payload && payload.orderId === this.activeOrderId) {
        const nextStatus = payload.currentStatus ?? payload.status;
        if (nextStatus) {
          this.handleOrderStatusChange(nextStatus);
        }
      }
    });

    socket.on('order:status-updated', (payload: { orderId?: string; currentStatus?: OrderStatus; status?: OrderStatus }) => {
      if (payload && payload.orderId === this.activeOrderId) {
        const nextStatus = payload.currentStatus ?? payload.status;
        if (nextStatus) {
          this.handleOrderStatusChange(nextStatus);
        }
      }
    });
  }

  private recordClientPointId(clientPointId: string): void {
    if (this.seenClientPointIds.size > 500) {
      const first = this.seenClientPointIds.values().next().value;
      if (first !== undefined) this.seenClientPointIds.delete(first);
    }
    this.seenClientPointIds.add(clientPointId);
  }
}

export function createDriverTrackingSender(
  options?: DriverTrackingSenderOptions,
): DriverTrackingSender {
  return new DriverTrackingSender(options);
}
