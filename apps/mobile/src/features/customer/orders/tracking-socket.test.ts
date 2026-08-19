import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import type { TrackingPoint } from '@leopard/shared';

import {
  CustomerTrackingSocketManager,
  createCustomerTrackingSocket,
  mapPointToTrackingView,
  mapTrackingStateToView,
  type SocketLike,
  type SocketPointPayload,
  type TrackingConnectionState,
} from './tracking-socket';

class MockSocket implements SocketLike {
  public connected = false;
  public id = 'mock-socket-id';
  public emit = jest.fn<(event: string, ...args: unknown[]) => void>();
  private handlers: Map<string, Array<(...args: unknown[]) => void>> = new Map();

  public connect(): void {
    this.connected = true;
    this.trigger('connect');
  }

  public disconnect(): void {
    this.connected = false;
    this.trigger('disconnect');
  }

  public on(event: string, fn: (...args: unknown[]) => void): void {
    const list = this.handlers.get(event) ?? [];
    list.push(fn);
    this.handlers.set(event, list);
  }

  public off(event: string, fn?: (...args: unknown[]) => void): void {
    if (!fn) {
      this.handlers.delete(event);
      return;
    }
    const list = this.handlers.get(event) ?? [];
    this.handlers.set(
      event,
      list.filter((h) => h !== fn),
    );
  }

  public removeAllListeners(event?: string): void {
    if (event) {
      this.handlers.delete(event);
    } else {
      this.handlers.clear();
    }
  }

  public trigger(event: string, ...args: unknown[]): void {
    const list = this.handlers.get(event) ?? [];
    for (const handler of list) {
      handler(...args);
    }
  }
}

describe('CustomerTrackingSocket mapping helpers', () => {
  const samplePoint: TrackingPoint = {
    id: 'point-1',
    orderId: '11111111-1111-4111-8111-111111111001',
    driverId: 'driver-1',
    clientPointId: 'cp-1',
    latitude: 10.7326,
    longitude: 106.7168,
    capturedAt: '2026-08-15T14:32:00.000Z',
  };

  it('maps point to fresh tracking view with formatted timestamps', () => {
    const view = mapPointToTrackingView(samplePoint, 'Tài xế Nguyễn Minh An');
    expect(view.kind).toBe('fresh');
    if (view.kind === 'fresh') {
      expect(view.driverLabel).toBe('Tài xế Nguyễn Minh An');
      expect(view.lastUpdatedLabel).toBeTruthy();
      expect(view.summary).toContain('Bản đồ lộ trình; vị trí tài xế cập nhật lúc');
    }
  });

  it('maps various connection and tracking states correctly', () => {
    // No driver
    expect(
      mapTrackingStateToView({
        connectionState: 'connected',
        hasDriver: false,
      }).kind,
    ).toBe('no-driver');

    // Error state
    const errView = mapTrackingStateToView({
      connectionState: 'error',
      hasDriver: true,
      errorMessage: 'Mất kết nối bản đồ',
    });
    expect(errView.kind).toBe('map-error');
    if (errView.kind === 'map-error') {
      expect(errView.message).toBe('Mất kết nối bản đồ');
    }

    // Reconnecting state
    const reconnView = mapTrackingStateToView({
      connectionState: 'reconnecting',
      hasDriver: true,
      latestPoint: samplePoint,
    });
    expect(reconnView.kind).toBe('reconnecting');

    // Disconnected state
    const disconnView = mapTrackingStateToView({
      connectionState: 'disconnected',
      hasDriver: true,
      latestPoint: samplePoint,
    });
    expect(disconnView.kind).toBe('disconnected');

    // Connecting with no point -> loading
    expect(
      mapTrackingStateToView({
        connectionState: 'connecting',
        hasDriver: true,
        latestPoint: null,
      }).kind,
    ).toBe('loading');

    // Connected with no point -> no-location
    expect(
      mapTrackingStateToView({
        connectionState: 'connected',
        hasDriver: true,
        latestPoint: null,
      }).kind,
    ).toBe('no-location');

    // Connected with point -> fresh
    expect(
      mapTrackingStateToView({
        connectionState: 'connected',
        hasDriver: true,
        latestPoint: samplePoint,
      }).kind,
    ).toBe('fresh');
  });
});

describe('CustomerTrackingSocketManager', () => {
  let mockSocket: MockSocket;
  let manager: CustomerTrackingSocketManager;
  const validOrderId = '11111111-1111-4111-8111-111111111001';
  const secondOrderId = '22222222-2222-4222-8222-222222222002';

  beforeEach(() => {
    mockSocket = new MockSocket();
    manager = createCustomerTrackingSocket({
      socket: mockSocket,
      driverLabel: 'Tài xế Nguyễn Minh An',
    });
  });

  describe('Connection lifecycle', () => {
    it('initial state is idle and connect transitions to connecting/connected', async () => {
      expect(manager.getConnectionState()).toBe('idle');

      const stateListener = jest.fn<(state: TrackingConnectionState) => void>();
      manager.subscribe({ onConnectionStateChanged: stateListener });

      await manager.connect();
      expect(manager.getConnectionState()).toBe('connected');
      expect(stateListener).toHaveBeenCalledWith('connecting');
      expect(stateListener).toHaveBeenCalledWith('connected');
    });

    it('handles disconnect, reconnecting, and error events', () => {
      const stateListener = jest.fn<(state: TrackingConnectionState) => void>();
      manager.subscribe({ onConnectionStateChanged: stateListener });

      mockSocket.trigger('connect');
      expect(manager.getConnectionState()).toBe('connected');

      mockSocket.trigger('disconnect');
      expect(manager.getConnectionState()).toBe('disconnected');

      mockSocket.trigger('connect_error');
      expect(manager.getConnectionState()).toBe('reconnecting');

      mockSocket.trigger('reconnecting');
      expect(manager.getConnectionState()).toBe('reconnecting');

      mockSocket.trigger('error');
      expect(manager.getConnectionState()).toBe('error');
    });

    it('emits tracking:join-order on reconnect and triggers onReconnected callback', () => {
      const onReconnected = jest.fn<(orderId: string) => void>();
      manager.subscribe({ onReconnected });

      mockSocket.connected = true;
      manager.joinOrder(validOrderId);
      expect(mockSocket.emit).toHaveBeenCalledWith('tracking:join-order', {
        orderId: validOrderId,
      });

      mockSocket.emit.mockClear();
      mockSocket.trigger('reconnect');

      expect(manager.getConnectionState()).toBe('connected');
      expect(mockSocket.emit).toHaveBeenCalledWith('tracking:join-order', {
        orderId: validOrderId,
      });
      expect(onReconnected).toHaveBeenCalledWith(validOrderId);
    });

    it('disconnect leaves active order room and closes socket', () => {
      mockSocket.connected = true;
      manager.joinOrder(validOrderId);

      mockSocket.emit.mockClear();
      manager.disconnect();

      expect(mockSocket.emit).toHaveBeenCalledWith('tracking:leave-order', {
        orderId: validOrderId,
      });
      expect(manager.getConnectionState()).toBe('disconnected');
    });
  });

  describe('Room join and leave', () => {
    it('joins order room with validated UUID and ignores malformed ID', () => {
      mockSocket.connected = true;

      manager.joinOrder('invalid-id');
      expect(mockSocket.emit).not.toHaveBeenCalled();
      expect(manager.getActiveOrderId()).toBeNull();

      manager.joinOrder(validOrderId);
      expect(mockSocket.emit).toHaveBeenCalledWith('tracking:join-order', {
        orderId: validOrderId,
      });
      expect(manager.getActiveOrderId()).toBe(validOrderId);
    });

    it('leaves previous order room when joining a new one', () => {
      mockSocket.connected = true;
      manager.joinOrder(validOrderId);
      expect(manager.getActiveOrderId()).toBe(validOrderId);

      mockSocket.emit.mockClear();
      manager.joinOrder(secondOrderId);

      expect(mockSocket.emit).toHaveBeenCalledWith('tracking:leave-order', {
        orderId: validOrderId,
      });
      expect(mockSocket.emit).toHaveBeenCalledWith('tracking:join-order', {
        orderId: secondOrderId,
      });
      expect(manager.getActiveOrderId()).toBe(secondOrderId);
    });

    it('leaves order room explicitly', () => {
      mockSocket.connected = true;
      manager.joinOrder(validOrderId);

      mockSocket.emit.mockClear();
      manager.leaveOrder();

      expect(mockSocket.emit).toHaveBeenCalledWith('tracking:leave-order', {
        orderId: validOrderId,
      });
      expect(manager.getActiveOrderId()).toBeNull();
    });
  });

  describe('Location point updates and deduplication', () => {
    it('receives tracking:point and notifies listeners with fresh view', () => {
      const onPointUpdated = jest.fn();
      manager.subscribe({ onPointUpdated });

      const payload: SocketPointPayload = {
        orderId: validOrderId,
        id: 'point-101',
        clientPointId: 'cp-101',
        latitude: 10.75,
        longitude: 106.68,
        capturedAt: '2026-08-15T14:35:00.000Z',
        driverId: 'driver-1',
      };

      mockSocket.trigger('tracking:point', payload);

      expect(onPointUpdated).toHaveBeenCalledTimes(1);
      expect(onPointUpdated).toHaveBeenCalledWith(
        expect.objectContaining({
          orderId: validOrderId,
          point: expect.objectContaining({
            id: 'point-101',
            latitude: 10.75,
            longitude: 106.68,
          }),
          trackingView: expect.objectContaining({
            kind: 'fresh',
            driverLabel: 'Tài xế Nguyễn Minh An',
          }),
        }),
      );
      expect(manager.getLatestPoint(validOrderId)?.latitude).toBe(10.75);
    });

    it('receives tracking:point-updated variant event seamlessly', () => {
      const onPointUpdated = jest.fn();
      manager.subscribe({ onPointUpdated });

      mockSocket.trigger('tracking:point-updated', {
        orderId: validOrderId,
        point: {
          id: 'point-102',
          orderId: validOrderId,
          driverId: 'driver-1',
          clientPointId: 'cp-102',
          latitude: 10.76,
          longitude: 106.69,
          capturedAt: '2026-08-15T14:36:00.000Z',
        },
      });

      expect(onPointUpdated).toHaveBeenCalledTimes(1);
      expect(manager.getLatestPoint(validOrderId)?.latitude).toBe(10.76);
    });

    it('deduplicates events by eventId', () => {
      const onPointUpdated = jest.fn();
      manager.subscribe({ onPointUpdated });

      const payload: SocketPointPayload = {
        orderId: validOrderId,
        eventId: 'evt-dup-1',
        latitude: 10.75,
        longitude: 106.68,
        capturedAt: '2026-08-15T14:35:00.000Z',
      };

      mockSocket.trigger('tracking:point', payload);
      mockSocket.trigger('tracking:point', payload);

      expect(onPointUpdated).toHaveBeenCalledTimes(1);
    });

    it('deduplicates points by clientPointId', () => {
      const onPointUpdated = jest.fn();
      manager.subscribe({ onPointUpdated });

      const payload1: SocketPointPayload = {
        orderId: validOrderId,
        clientPointId: 'cp-unique-1',
        latitude: 10.75,
        longitude: 106.68,
        capturedAt: '2026-08-15T14:35:00.000Z',
      };
      const payload2: SocketPointPayload = {
        orderId: validOrderId,
        clientPointId: 'cp-unique-1',
        latitude: 10.75,
        longitude: 106.68,
        capturedAt: '2026-08-15T14:35:05.000Z',
      };

      mockSocket.trigger('tracking:point', payload1);
      mockSocket.trigger('tracking:point', payload2);

      expect(onPointUpdated).toHaveBeenCalledTimes(1);
    });

    it('discards points older than currently recorded latest timestamp', () => {
      const onPointUpdated = jest.fn();
      manager.subscribe({ onPointUpdated });

      const newerPayload: SocketPointPayload = {
        orderId: validOrderId,
        clientPointId: 'cp-new',
        latitude: 10.75,
        longitude: 106.68,
        capturedAt: '2026-08-15T14:35:00.000Z',
      };
      const olderPayload: SocketPointPayload = {
        orderId: validOrderId,
        clientPointId: 'cp-old',
        latitude: 10.70,
        longitude: 106.60,
        capturedAt: '2026-08-15T14:30:00.000Z',
      };

      mockSocket.trigger('tracking:point', newerPayload);
      mockSocket.trigger('tracking:point', olderPayload);

      expect(onPointUpdated).toHaveBeenCalledTimes(1);
      expect(manager.getLatestPoint(validOrderId)?.latitude).toBe(10.75);
    });
  });

  describe('Order status and ETA events', () => {
    it('handles order:status_changed and order:status-updated with deduplication', () => {
      const onStatusUpdated = jest.fn();
      manager.subscribe({ onStatusUpdated });

      mockSocket.trigger('order:status_changed', {
        orderId: validOrderId,
        currentStatus: 'IN_TRANSIT',
        previousStatus: 'PICKING_UP',
        changedAt: '2026-08-15T14:30:00.000Z',
        reason: 'Tài xế đã nhận hàng',
        eventId: 'status-evt-1',
      });

      mockSocket.trigger('order:status-updated', {
        orderId: validOrderId,
        currentStatus: 'IN_TRANSIT',
        eventId: 'status-evt-1', // duplicate eventId
      });

      expect(onStatusUpdated).toHaveBeenCalledTimes(1);
      expect(onStatusUpdated).toHaveBeenCalledWith({
        orderId: validOrderId,
        currentStatus: 'IN_TRANSIT',
        previousStatus: 'PICKING_UP',
        changedAt: '2026-08-15T14:30:00.000Z',
        reason: 'Tài xế đã nhận hàng',
      });
    });

    it('handles eta:updated event with deduplication', () => {
      const onEtaUpdated = jest.fn();
      manager.subscribe({ onEtaUpdated });

      mockSocket.trigger('eta:updated', {
        orderId: validOrderId,
        durationSeconds: 900,
        source: 'DEMO',
        calculatedAt: '2026-08-15T14:31:00.000Z',
        eventId: 'eta-evt-1',
      });

      mockSocket.trigger('eta:updated', {
        orderId: validOrderId,
        durationSeconds: 900,
        eventId: 'eta-evt-1', // duplicate
      });

      expect(onEtaUpdated).toHaveBeenCalledTimes(1);
      expect(onEtaUpdated).toHaveBeenCalledWith({
        orderId: validOrderId,
        durationSeconds: 900,
        source: 'DEMO',
        calculatedAt: '2026-08-15T14:31:00.000Z',
      });
    });
  });

  describe('Session error and reconnection', () => {
    it('handles session:error by refreshing token and reconnecting', async () => {
      const onTokenExpired = jest.fn<() => Promise<boolean>>().mockResolvedValue(true);
      const onSessionError = jest.fn();

      const authedManager = createCustomerTrackingSocket({
        socket: mockSocket,
        onTokenExpired,
      });
      authedManager.subscribe({ onSessionError });

      mockSocket.connected = true;
      authedManager.joinOrder(validOrderId);

      await authedManager.handleSessionError({
        code: 'TOKEN_EXPIRED',
        message: 'JWT token is expired',
      });

      expect(onSessionError).toHaveBeenCalledWith({
        code: 'TOKEN_EXPIRED',
        message: 'JWT token is expired',
      });
      expect(onTokenExpired).toHaveBeenCalledTimes(1);
      expect(mockSocket.emit).toHaveBeenCalledWith('tracking:join-order', {
        orderId: validOrderId,
      });
    });
  });

  describe('Tracking history reconciliation', () => {
    it('reconciles historical points and finds newest point', () => {
      const onPointUpdated = jest.fn();
      manager.subscribe({ onPointUpdated });

      const history: TrackingPoint[] = [
        {
          id: 'p1',
          orderId: validOrderId,
          driverId: 'drv-1',
          clientPointId: 'cp1',
          latitude: 10.71,
          longitude: 106.65,
          capturedAt: '2026-08-15T14:10:00.000Z',
        },
        {
          id: 'p2',
          orderId: validOrderId,
          driverId: 'drv-1',
          clientPointId: 'cp2',
          latitude: 10.74,
          longitude: 106.68,
          capturedAt: '2026-08-15T14:20:00.000Z',
        },
      ];

      manager.reconcileWithTrackingHistory(history, validOrderId);

      expect(onPointUpdated).toHaveBeenCalledTimes(1);
      expect(manager.getLatestPoint(validOrderId)?.latitude).toBe(10.74);
    });
  });

  describe('Socket Factory and teardown', () => {
    it('uses socketFactory when no initial socket provided', async () => {
      const factorySocket = new MockSocket();
      const factory = jest.fn<() => SocketLike>().mockReturnValue(factorySocket);

      const factoryManager = createCustomerTrackingSocket({
        socketFactory: factory,
        tokenProvider: () => 'test-token',
        serverUrl: 'https://api.leopard.vn',
      });

      await factoryManager.connect();

      expect(factory).toHaveBeenCalledWith(
        'https://api.leopard.vn/tracking',
        expect.objectContaining({
          auth: { token: 'test-token' },
          transports: ['websocket'],
        }),
      );
    });

    it('destroy cleans up listeners and internal maps', () => {
      manager.joinOrder(validOrderId);
      manager.destroy();

      expect(manager.getConnectionState()).toBe('disconnected');
      expect(manager.getActiveOrderId()).toBeNull();
      expect(manager.getLatestPoint(validOrderId)).toBeNull();
    });
  });
});
