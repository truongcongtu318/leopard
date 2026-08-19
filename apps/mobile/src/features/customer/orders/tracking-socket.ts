import type { OrderStatus, ProviderSource, TrackingPoint } from '@leopard/shared';

import {
  deepFreeze,
  formatDateTime,
  formatTimeOnly,
  parseCustomerOrderId,
} from './adapter';
import type { CustomerTrackingView } from './model';

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

export type TrackingConnectionState =
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

export interface SocketPointPayload {
  orderId: string;
  point?: TrackingPoint;
  id?: string;
  driverId?: string;
  clientPointId?: string;
  latitude?: number;
  longitude?: number;
  heading?: number | null;
  speed?: number | null;
  accuracyM?: number | null;
  capturedAt?: string;
  eventId?: string;
  occurredAt?: string;
}

export interface SocketStatusPayload {
  orderId: string;
  currentStatus?: OrderStatus;
  status?: OrderStatus;
  previousStatus?: OrderStatus | null;
  changedAt?: string;
  reason?: string | null;
  eventId?: string;
  occurredAt?: string;
}

export interface SocketEtaPayload {
  orderId: string;
  durationSeconds: number;
  source?: ProviderSource;
  calculatedAt?: string;
  eventId?: string;
  occurredAt?: string;
}

export interface SocketSessionErrorPayload {
  code: string;
  message: string;
}

export interface CustomerTrackingPointUpdate {
  orderId: string;
  point: TrackingPoint;
  trackingView: CustomerTrackingView;
}

export interface CustomerStatusUpdate {
  orderId: string;
  currentStatus: OrderStatus;
  previousStatus: OrderStatus | null;
  changedAt: string;
  reason?: string | null;
}

export interface CustomerEtaUpdate {
  orderId: string;
  durationSeconds: number;
  source: ProviderSource;
  calculatedAt: string;
}

export interface TrackingSocketCallbacks {
  onPointUpdated?: (update: CustomerTrackingPointUpdate) => void;
  onStatusUpdated?: (update: CustomerStatusUpdate) => void;
  onEtaUpdated?: (update: CustomerEtaUpdate) => void;
  onConnectionStateChanged?: (state: TrackingConnectionState) => void;
  onReconnected?: (orderId: string) => void;
  onSessionError?: (error: SocketSessionErrorPayload) => void;
}

export interface CustomerTrackingSocketOptions {
  socket?: SocketLike;
  socketFactory?: SocketFactory;
  serverUrl?: string;
  namespace?: string;
  driverLabel?: string;
  tokenProvider?: () => string | null | Promise<string | null>;
  onTokenExpired?: () => Promise<boolean>;
}

export function mapPointToTrackingView(
  point: TrackingPoint,
  driverLabel = 'Tài xế Nguyễn Minh An',
): CustomerTrackingView {
  const lastUpdatedLabel = formatDateTime(point.capturedAt);
  const updatedTime = formatTimeOnly(point.capturedAt);

  return deepFreeze<CustomerTrackingView>({
    kind: 'fresh',
    driverLabel,
    lastUpdatedLabel,
    summary: `Bản đồ lộ trình; vị trí tài xế cập nhật lúc ${updatedTime}.`,
  });
}

export function mapTrackingStateToView(options: {
  connectionState: TrackingConnectionState;
  hasDriver: boolean;
  driverLabel?: string;
  latestPoint?: TrackingPoint | null;
  errorMessage?: string;
}): CustomerTrackingView {
  const {
    connectionState,
    hasDriver,
    driverLabel = 'Tài xế Nguyễn Minh An',
    latestPoint,
    errorMessage,
  } = options;

  if (!hasDriver) {
    return deepFreeze<CustomerTrackingView>({
      kind: 'no-driver',
      message: 'Chưa có tài xế nhận đơn.',
    });
  }

  if (connectionState === 'error') {
    return deepFreeze<CustomerTrackingView>({
      kind: 'map-error',
      driverLabel,
      message:
        errorMessage ||
        'Bản đồ chưa khả dụng; lộ trình dạng danh sách vẫn dùng được.',
    });
  }

  if (connectionState === 'reconnecting') {
    const lastUpdatedLabel = latestPoint
      ? formatDateTime(latestPoint.capturedAt)
      : '';
    return deepFreeze<CustomerTrackingView>({
      kind: 'reconnecting',
      driverLabel,
      lastUpdatedLabel,
      message:
        'Đang kết nối lại; vị trí hiện tại chưa được gọi là trực tiếp.',
      summary: 'Bản đồ lộ trình đang kết nối lại.',
    });
  }

  if (connectionState === 'disconnected') {
    const lastUpdatedLabel = latestPoint
      ? formatDateTime(latestPoint.capturedAt)
      : '';
    const updatedTime = latestPoint
      ? formatTimeOnly(latestPoint.capturedAt)
      : '';
    return deepFreeze<CustomerTrackingView>({
      kind: 'disconnected',
      driverLabel,
      lastUpdatedLabel,
      message: 'Mất kết nối; vị trí mới chưa được nhận.',
      summary: updatedTime
        ? `Bản đồ lộ trình dùng vị trí gần nhất lúc ${updatedTime}.`
        : 'Bản đồ lộ trình; mất kết nối.',
    });
  }

  if (!latestPoint) {
    if (connectionState === 'connecting') {
      return deepFreeze<CustomerTrackingView>({
        kind: 'loading',
        message: 'Đang tải bản đồ và vị trí tài xế.',
      });
    }
    return deepFreeze<CustomerTrackingView>({
      kind: 'no-location',
      driverLabel,
      message: 'Chưa có vị trí tài xế.',
    });
  }

  return mapPointToTrackingView(latestPoint, driverLabel);
}

export class CustomerTrackingSocketManager {
  private socket: SocketLike | null = null;
  private connectionState: TrackingConnectionState = 'idle';
  private activeOrderId: string | null = null;
  private driverLabel = 'Tài xế Nguyễn Minh An';
  private latestPoints = new Map<string, TrackingPoint>();
  private latestCapturedAtMap = new Map<string, number>();
  private seenEventIds = new Set<string>();
  private seenClientPointIds = new Set<string>();
  private listeners = new Set<TrackingSocketCallbacks>();

  private readonly socketFactory?: SocketFactory;
  private readonly serverUrl: string;
  private readonly namespace: string;
  private readonly tokenProvider?: () => string | null | Promise<string | null>;
  private readonly onTokenExpiredHandler?: () => Promise<boolean>;

  constructor(options: CustomerTrackingSocketOptions = {}) {
    this.socket = options.socket ?? null;
    this.socketFactory = options.socketFactory;
    this.serverUrl =
      options.serverUrl ?? process.env.EXPO_PUBLIC_API_URL ?? '';
    this.namespace = options.namespace ?? '/tracking';
    this.driverLabel = options.driverLabel ?? 'Tài xế Nguyễn Minh An';
    this.tokenProvider = options.tokenProvider;
    this.onTokenExpiredHandler = options.onTokenExpired;

    if (this.socket) {
      this.attachSocketListeners(this.socket);
    }
  }

  public getConnectionState(): TrackingConnectionState {
    return this.connectionState;
  }

  public getActiveOrderId(): string | null {
    return this.activeOrderId;
  }

  public getLatestPoint(orderId?: string): TrackingPoint | null {
    const targetId = orderId ?? this.activeOrderId;
    if (!targetId) return null;
    return this.latestPoints.get(targetId) ?? null;
  }

  public setDriverLabel(label: string): void {
    this.driverLabel = label;
  }

  public subscribe(callbacks: TrackingSocketCallbacks): () => void {
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

  public joinOrder(orderId: string): void {
    const validId = parseCustomerOrderId(orderId);
    if (!validId) return;

    if (this.activeOrderId && this.activeOrderId !== validId) {
      this.leaveOrder(this.activeOrderId);
    }

    this.activeOrderId = validId;

    if (this.socket?.connected) {
      this.socket.emit('tracking:join-order', { orderId: validId });
    }
  }

  public leaveOrder(orderId?: string): void {
    const targetId = orderId ?? this.activeOrderId;
    if (!targetId) return;

    if (this.socket?.connected) {
      this.socket.emit('tracking:leave-order', { orderId: targetId });
    }

    if (this.activeOrderId === targetId) {
      this.activeOrderId = null;
    }
  }

  public reconcileWithTrackingHistory(
    historyPoints: readonly TrackingPoint[],
    orderId?: string,
  ): void {
    const targetId = orderId ?? this.activeOrderId;
    if (!targetId || historyPoints.length === 0) return;

    let newestPoint: TrackingPoint | null = null;
    let newestTimestamp = this.latestCapturedAtMap.get(targetId) ?? 0;

    for (const point of historyPoints) {
      const time = new Date(point.capturedAt).getTime();
      if (!isNaN(time) && time >= newestTimestamp) {
        newestTimestamp = time;
        newestPoint = point;
      }
    }

    if (newestPoint) {
      this.latestCapturedAtMap.set(targetId, newestTimestamp);
      this.latestPoints.set(targetId, newestPoint);

      const trackingView = mapPointToTrackingView(
        newestPoint,
        this.driverLabel,
      );
      this.notifyPointListeners({
        orderId: targetId,
        point: newestPoint,
        trackingView,
      });
    }
  }

  public handleIncomingPoint(payload: SocketPointPayload): void {
    if (!payload || !payload.orderId) return;

    if (payload.eventId) {
      if (this.seenEventIds.has(payload.eventId)) return;
      this.recordEventId(payload.eventId);
    }

    const clientPointId = payload.clientPointId ?? payload.point?.clientPointId;
    if (clientPointId) {
      if (this.seenClientPointIds.has(clientPointId)) return;
      this.recordClientPointId(clientPointId);
    }

    const rawPoint = payload.point ?? {
      id: payload.id ?? `point-${Date.now()}`,
      orderId: payload.orderId,
      driverId: payload.driverId ?? 'driver-default',
      clientPointId: clientPointId ?? `cp-${Date.now()}`,
      latitude: payload.latitude ?? 0,
      longitude: payload.longitude ?? 0,
      heading: payload.heading ?? null,
      speed: payload.speed ?? null,
      accuracyM: payload.accuracyM ?? null,
      capturedAt: payload.capturedAt ?? new Date().toISOString(),
    };

    const capturedTime = new Date(rawPoint.capturedAt).getTime();
    if (!isNaN(capturedTime)) {
      const currentLatestTime =
        this.latestCapturedAtMap.get(payload.orderId) ?? 0;
      if (capturedTime < currentLatestTime) {
        return;
      }
      this.latestCapturedAtMap.set(payload.orderId, capturedTime);
    }

    const point: TrackingPoint = {
      id: rawPoint.id,
      orderId: payload.orderId,
      driverId: rawPoint.driverId,
      clientPointId: rawPoint.clientPointId,
      latitude: rawPoint.latitude,
      longitude: rawPoint.longitude,
      heading: rawPoint.heading ?? null,
      speed: rawPoint.speed ?? null,
      accuracyM: rawPoint.accuracyM ?? null,
      capturedAt: rawPoint.capturedAt,
      createdAt: rawPoint.createdAt,
    };

    this.latestPoints.set(payload.orderId, point);

    const trackingView = mapPointToTrackingView(point, this.driverLabel);
    this.notifyPointListeners({
      orderId: payload.orderId,
      point,
      trackingView,
    });
  }

  public handleIncomingStatus(payload: SocketStatusPayload): void {
    if (!payload || !payload.orderId) return;

    if (payload.eventId) {
      if (this.seenEventIds.has(payload.eventId)) return;
      this.recordEventId(payload.eventId);
    }

    const currentStatus = (payload.currentStatus ??
      payload.status ??
      'REQUESTED') as OrderStatus;
    const previousStatus = (payload.previousStatus ?? null) as OrderStatus | null;
    const changedAt = payload.changedAt ?? new Date().toISOString();

    const update: CustomerStatusUpdate = {
      orderId: payload.orderId,
      currentStatus,
      previousStatus,
      changedAt,
      reason: payload.reason ?? null,
    };

    for (const listener of this.listeners) {
      listener.onStatusUpdated?.(update);
    }
  }

  public handleIncomingEta(payload: SocketEtaPayload): void {
    if (!payload || !payload.orderId) return;

    if (payload.eventId) {
      if (this.seenEventIds.has(payload.eventId)) return;
      this.recordEventId(payload.eventId);
    }

    const update: CustomerEtaUpdate = {
      orderId: payload.orderId,
      durationSeconds: payload.durationSeconds,
      source: (payload.source ?? 'VIETMAP') as ProviderSource,
      calculatedAt: payload.calculatedAt ?? new Date().toISOString(),
    };

    for (const listener of this.listeners) {
      listener.onEtaUpdated?.(update);
    }
  }

  public async handleSessionError(
    payload: SocketSessionErrorPayload,
  ): Promise<void> {
    for (const listener of this.listeners) {
      listener.onSessionError?.(payload);
    }

    const refreshed = this.onTokenExpiredHandler
      ? await this.onTokenExpiredHandler()
      : await getDefaultRefreshToken();

    if (refreshed && this.socket) {
      this.socket.disconnect();
      await this.connect();
      if (this.activeOrderId) {
        this.joinOrder(this.activeOrderId);
      }
    }
  }

  public destroy(): void {
    this.disconnect();
    this.activeOrderId = null;
    this.listeners.clear();
    this.latestPoints.clear();
    this.latestCapturedAtMap.clear();
    this.seenEventIds.clear();
    this.seenClientPointIds.clear();
    if (this.socket?.removeAllListeners) {
      this.socket.removeAllListeners();
    }
    this.socket = null;
  }

  private setConnectionState(newState: TrackingConnectionState): void {
    if (this.connectionState === newState) return;
    this.connectionState = newState;
    for (const listener of this.listeners) {
      listener.onConnectionStateChanged?.(newState);
    }
  }

  private attachSocketListeners(socket: SocketLike): void {
    socket.on('connect', () => {
      this.setConnectionState('connected');
      if (this.activeOrderId) {
        socket.emit('tracking:join-order', { orderId: this.activeOrderId });
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
      if (this.activeOrderId) {
        socket.emit('tracking:join-order', { orderId: this.activeOrderId });
        for (const listener of this.listeners) {
          listener.onReconnected?.(this.activeOrderId);
        }
      }
    });

    socket.on('error', () => {
      this.setConnectionState('error');
    });

    socket.on('tracking:point', (payload: SocketPointPayload) => {
      this.handleIncomingPoint(payload);
    });

    socket.on('tracking:point-updated', (payload: SocketPointPayload) => {
      this.handleIncomingPoint(payload);
    });

    socket.on('order:status_changed', (payload: SocketStatusPayload) => {
      this.handleIncomingStatus(payload);
    });

    socket.on('order:status-updated', (payload: SocketStatusPayload) => {
      this.handleIncomingStatus(payload);
    });

    socket.on('eta:updated', (payload: SocketEtaPayload) => {
      this.handleIncomingEta(payload);
    });

    socket.on('session:error', (payload: SocketSessionErrorPayload) => {
      void this.handleSessionError(payload);
    });
  }

  private notifyPointListeners(update: CustomerTrackingPointUpdate): void {
    for (const listener of this.listeners) {
      listener.onPointUpdated?.(update);
    }
  }

  private recordEventId(eventId: string): void {
    if (this.seenEventIds.size > 500) {
      const first = this.seenEventIds.values().next().value;
      if (first !== undefined) this.seenEventIds.delete(first);
    }
    this.seenEventIds.add(eventId);
  }

  private recordClientPointId(clientPointId: string): void {
    if (this.seenClientPointIds.size > 500) {
      const first = this.seenClientPointIds.values().next().value;
      if (first !== undefined) this.seenClientPointIds.delete(first);
    }
    this.seenClientPointIds.add(clientPointId);
  }
}

export function createCustomerTrackingSocket(
  options?: CustomerTrackingSocketOptions,
): CustomerTrackingSocketManager {
  return new CustomerTrackingSocketManager(options);
}
