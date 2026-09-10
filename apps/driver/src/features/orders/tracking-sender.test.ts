import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import type { OrderStatus, SendTrackingPointPayload } from '@leopard/shared';

import {
  DriverTrackingSender,
  createDriverTrackingSender,
  isTerminalStatus,
  isTrackingEligibleStatus,
  type DriverGpsCoordinate,
  type SocketLike,
} from './tracking-sender';

class MockSocket implements SocketLike {
  public connected = false;
  public id = 'mock-driver-socket-id';
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

  public on(event: string, fn: (...args: any[]) => void): void {
    const list = this.handlers.get(event) ?? [];
    list.push(fn);
    this.handlers.set(event, list);
  }

  public off(event: string, fn?: (...args: any[]) => void): void {
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

describe('Driver tracking helper status checks', () => {
  it('identifies tracking-eligible and terminal statuses correctly', () => {
    expect(isTrackingEligibleStatus('PICKING_UP')).toBe(true);
    expect(isTrackingEligibleStatus('IN_TRANSIT')).toBe(true);
    expect(isTrackingEligibleStatus('ACCEPTED')).toBe(false);
    expect(isTrackingEligibleStatus('REQUESTED')).toBe(false);
    expect(isTrackingEligibleStatus('DELIVERED')).toBe(false);
    expect(isTrackingEligibleStatus('CANCELLED')).toBe(false);

    expect(isTerminalStatus('DELIVERED')).toBe(true);
    expect(isTerminalStatus('CANCELLED')).toBe(true);
    expect(isTerminalStatus('IN_TRANSIT')).toBe(false);
    expect(isTerminalStatus('PICKING_UP')).toBe(false);
    expect(isTerminalStatus('ACCEPTED')).toBe(false);
  });
});

describe('DriverTrackingSender Lifecycle and Connection', () => {
  let mockSocket: MockSocket;
  const sampleOrderId = '22222222-2222-4222-8222-222222222001';

  beforeEach(() => {
    mockSocket = new MockSocket();
    jest.clearAllMocks();
  });

  it('initializes with idle connection state and not-started health', () => {
    const sender = createDriverTrackingSender({ socket: mockSocket });
    expect(sender.getConnectionState()).toBe('idle');
    expect(sender.getActiveOrderId()).toBeNull();
    const health = sender.getHealth();
    expect(health.kind).toBe('not-started');
    expect(health.label).toBe('Chưa bắt đầu gửi vị trí');
  });

  it('starts tracking on PICKING_UP order, connects socket and joins order room', async () => {
    const sender = createDriverTrackingSender({ socket: mockSocket });
    await sender.start(sampleOrderId, 'PICKING_UP');

    expect(mockSocket.connected).toBe(true);
    expect(sender.getConnectionState()).toBe('connected');
    expect(sender.getActiveOrderId()).toBe(sampleOrderId);
    expect(mockSocket.emit).toHaveBeenCalledWith('tracking:join-order', {
      orderId: sampleOrderId,
    });
    expect(sender.getHealth().kind).toBe('healthy');
  });

  it('starts tracking on IN_TRANSIT order seamlessly', async () => {
    const sender = createDriverTrackingSender({ socket: mockSocket });
    await sender.start(sampleOrderId, 'IN_TRANSIT');

    expect(mockSocket.connected).toBe(true);
    expect(mockSocket.emit).toHaveBeenCalledWith('tracking:join-order', {
      orderId: sampleOrderId,
    });
    expect(sender.getHealth().kind).toBe('healthy');
  });

  it('keeps health as not-started when started on ACCEPTED order without opening socket room', async () => {
    const sender = createDriverTrackingSender({ socket: mockSocket });
    await sender.start(sampleOrderId, 'ACCEPTED');

    expect(mockSocket.connected).toBe(false);
    expect(mockSocket.emit).not.toHaveBeenCalledWith('tracking:join-order', expect.anything());
    expect(sender.getHealth().kind).toBe('not-started');
  });

  it('throws error for invalid order UUID', async () => {
    const sender = createDriverTrackingSender({ socket: mockSocket });
    await expect(sender.start('invalid-uuid', 'PICKING_UP')).rejects.toThrow(
      'Invalid order ID format for tracking',
    );
  });

  it('leaves order room and disconnects on stop()', async () => {
    const sender = createDriverTrackingSender({ socket: mockSocket });
    await sender.start(sampleOrderId, 'PICKING_UP');

    sender.stop();
    expect(mockSocket.emit).toHaveBeenCalledWith('tracking:leave-order', {
      orderId: sampleOrderId,
    });
    expect(mockSocket.connected).toBe(false);
    expect(sender.getActiveOrderId()).toBeNull();
    expect(sender.getConnectionState()).toBe('disconnected');
  });

  it('clears offline queue on stop with LOGOUT reason', async () => {
    const sender = createDriverTrackingSender({
      socket: mockSocket,
      minIntervalMs: 0,
    });
    // Send while disconnected to populate queue
    await sender.start(sampleOrderId, 'PICKING_UP');
    mockSocket.connected = false;
    (sender as any).connectionState = 'disconnected';

    await sender.sendPoint({ latitude: 10.73, longitude: 106.71 });
    expect(sender.getQueueLength()).toBe(1);

    sender.stop('LOGOUT');
    expect(sender.getQueueLength()).toBe(0);
  });
});

describe('DriverTrackingSender Order Status Updates', () => {
  let mockSocket: MockSocket;
  const sampleOrderId = '22222222-2222-4222-8222-222222222001';

  beforeEach(() => {
    mockSocket = new MockSocket();
    jest.clearAllMocks();
  });

  it('automatically connects and joins room when order transitions from ACCEPTED to PICKING_UP', async () => {
    const sender = createDriverTrackingSender({ socket: mockSocket });
    await sender.start(sampleOrderId, 'ACCEPTED');
    expect(mockSocket.connected).toBe(false);

    sender.handleOrderStatusChange('PICKING_UP');
    expect(mockSocket.connected).toBe(true);
    expect(mockSocket.emit).toHaveBeenCalledWith('tracking:join-order', {
      orderId: sampleOrderId,
    });
    expect(sender.getHealth().kind).toBe('healthy');
  });

  it('terminates tracking and marks unavailable when order becomes DELIVERED', async () => {
    const sender = createDriverTrackingSender({ socket: mockSocket });
    await sender.start(sampleOrderId, 'IN_TRANSIT');
    expect(mockSocket.connected).toBe(true);

    sender.handleOrderStatusChange('DELIVERED');
    expect(mockSocket.emit).toHaveBeenCalledWith('tracking:leave-order', {
      orderId: sampleOrderId,
    });
    expect(mockSocket.connected).toBe(false);
    const health = sender.getHealth();
    expect(health.kind).toBe('unavailable');
    expect(health.label).toBe('Tracking của chuyến đã kết thúc');
  });

  it('terminates tracking when order becomes CANCELLED', async () => {
    const sender = createDriverTrackingSender({ socket: mockSocket });
    await sender.start(sampleOrderId, 'PICKING_UP');

    sender.handleOrderStatusChange('CANCELLED');
    expect(mockSocket.emit).toHaveBeenCalledWith('tracking:leave-order', {
      orderId: sampleOrderId,
    });
    expect(sender.getHealth().kind).toBe('unavailable');
  });

  it('handles socket order:status-updated and order:status_changed events', async () => {
    const sender = createDriverTrackingSender({ socket: mockSocket });
    await sender.start(sampleOrderId, 'PICKING_UP');

    mockSocket.trigger('order:status-updated', {
      orderId: sampleOrderId,
      currentStatus: 'DELIVERED',
    });
    expect(sender.getHealth().kind).toBe('unavailable');
  });
});

describe('DriverTrackingSender GPS Publishing, Throttling & Deduplication', () => {
  let mockSocket: MockSocket;
  const sampleOrderId = '22222222-2222-4222-8222-222222222001';

  beforeEach(() => {
    mockSocket = new MockSocket();
    jest.clearAllMocks();
  });

  it('publishes GPS point to socket when connected', async () => {
    const onPointSent = jest.fn();
    const sender = createDriverTrackingSender({
      socket: mockSocket,
      minIntervalMs: 5000,
      onPointSent,
    });
    await sender.start(sampleOrderId, 'IN_TRANSIT');

    const point: DriverGpsCoordinate = {
      latitude: 10.7326,
      longitude: 106.7168,
      accuracyM: 8,
      capturedAt: '2026-08-15T14:32:00.000Z',
      clientPointId: 'cp-uuid-1',
    };

    const result = await sender.sendPoint(point);
    expect(result.sent).toBe(true);
    expect(result.queued).toBe(false);
    expect(result.throttled).toBe(false);
    expect(mockSocket.emit).toHaveBeenCalledWith(
      'tracking:send-point',
      expect.objectContaining({
        orderId: sampleOrderId,
        clientPointId: 'cp-uuid-1',
        latitude: 10.7326,
        longitude: 106.7168,
      }),
    );
    expect(onPointSent).toHaveBeenCalledTimes(1);

    const health = sender.getHealth();
    expect(health.kind).toBe('healthy');
    expect(health.lastUpdatedLabel).toBeTruthy();
  });

  it('enforces throttling interval between sent points', async () => {
    let fakeNow = 1000000;
    const nowSpy = jest.spyOn(Date, 'now').mockImplementation(() => fakeNow);

    const sender = createDriverTrackingSender({
      socket: mockSocket,
      minIntervalMs: 5000, // 5 seconds
    });
    await sender.start(sampleOrderId, 'IN_TRANSIT');

    // First point sent at t = 1000000
    const point1 = { latitude: 10.73, longitude: 106.71, clientPointId: 'cp-1' };
    const res1 = await sender.sendPoint(point1);
    expect(res1.sent).toBe(true);

    // Second point at t = 1002000 (2s later -> throttled!)
    fakeNow += 2000;
    const point2 = { latitude: 10.731, longitude: 106.711, clientPointId: 'cp-2' };
    const res2 = await sender.sendPoint(point2);
    expect(res2.sent).toBe(false);
    expect(res2.throttled).toBe(true);
    expect(res2.dropped).toBe(true);

    // Third point at t = 1006000 (6s after first point -> allowed!)
    fakeNow += 4000; // now total is 6s after point 1
    const point3 = { latitude: 10.732, longitude: 106.712, clientPointId: 'cp-3' };
    const res3 = await sender.sendPoint(point3);
    expect(res3.sent).toBe(true);
    expect(res3.throttled).toBe(false);

    nowSpy.mockRestore();
  });

  it('deduplicates points with the same clientPointId', async () => {
    const sender = createDriverTrackingSender({
      socket: mockSocket,
      minIntervalMs: 0,
    });
    await sender.start(sampleOrderId, 'IN_TRANSIT');

    const point = {
      latitude: 10.73,
      longitude: 106.71,
      clientPointId: 'duplicate-client-point-id-123',
    };

    const res1 = await sender.sendPoint(point);
    expect(res1.sent).toBe(true);
    expect(res1.duplicate).toBe(false);

    const res2 = await sender.sendPoint(point);
    expect(res2.sent).toBe(false);
    expect(res2.duplicate).toBe(true);
    expect(res2.dropped).toBe(true);
  });

  it('drops point if no active order is set', async () => {
    const sender = createDriverTrackingSender({ socket: mockSocket });
    const res = await sender.sendPoint({ latitude: 10.73, longitude: 106.71 });
    expect(res.sent).toBe(false);
    expect(res.dropped).toBe(true);
    expect(res.reason).toBe('NO_ACTIVE_ORDER');
  });

  it('drops point if order status is ACCEPTED', async () => {
    const sender = createDriverTrackingSender({ socket: mockSocket });
    await sender.start(sampleOrderId, 'ACCEPTED');

    const res = await sender.sendPoint({ latitude: 10.73, longitude: 106.71 });
    expect(res.sent).toBe(false);
    expect(res.reason).toBe('ORDER_NOT_STARTED');
  });

  it('drops point if order status is DELIVERED', async () => {
    const sender = createDriverTrackingSender({ socket: mockSocket });
    await sender.start(sampleOrderId, 'IN_TRANSIT');
    sender.handleOrderStatusChange('DELIVERED');

    const res = await sender.sendPoint({ latitude: 10.73, longitude: 106.71 });
    expect(res.sent).toBe(false);
    expect(res.reason).toBe('ORDER_TERMINAL');
  });
});

describe('DriverTrackingSender Offline Queue & Reconnection Flushing', () => {
  let mockSocket: MockSocket;
  const sampleOrderId = '22222222-2222-4222-8222-222222222001';

  beforeEach(() => {
    mockSocket = new MockSocket();
    jest.clearAllMocks();
  });

  it('queues points when disconnected and updates health to offline with queued count', async () => {
    const sender = createDriverTrackingSender({
      socket: mockSocket,
      minIntervalMs: 0,
    });
    await sender.start(sampleOrderId, 'IN_TRANSIT');

    // Simulate disconnect
    mockSocket.disconnect();
    expect(sender.getConnectionState()).toBe('disconnected');

    const res1 = await sender.sendPoint({
      latitude: 10.73,
      longitude: 106.71,
      clientPointId: 'q-1',
    });
    expect(res1.sent).toBe(false);
    expect(res1.queued).toBe(true);
    expect(sender.getQueueLength()).toBe(1);

    const health1 = sender.getHealth();
    expect(health1.kind).toBe('offline');
    expect(health1.queuedPointCount).toBe(1);

    const res2 = await sender.sendPoint({
      latitude: 10.74,
      longitude: 106.72,
      clientPointId: 'q-2',
    });
    expect(res2.queued).toBe(true);
    expect(sender.getQueueLength()).toBe(2);
    expect(sender.getHealth().queuedPointCount).toBe(2);
  });

  it('bounds queue size to maxQueueSize dropping oldest points', async () => {
    const sender = createDriverTrackingSender({
      socket: mockSocket,
      maxQueueSize: 2,
      minIntervalMs: 0,
    });
    await sender.start(sampleOrderId, 'IN_TRANSIT');
    mockSocket.disconnect();

    await sender.sendPoint({ latitude: 10.1, longitude: 106.1, clientPointId: 'q-1' });
    await sender.sendPoint({ latitude: 10.2, longitude: 106.2, clientPointId: 'q-2' });
    await sender.sendPoint({ latitude: 10.3, longitude: 106.3, clientPointId: 'q-3' });

    expect(sender.getQueueLength()).toBe(2);
  });

  it('flushes queued points in FIFO order upon reconnect', async () => {
    const onQueueFlushed = jest.fn();
    const sender = createDriverTrackingSender({
      socket: mockSocket,
      minIntervalMs: 0,
      onQueueFlushed,
    });
    await sender.start(sampleOrderId, 'IN_TRANSIT');
    mockSocket.disconnect();

    await sender.sendPoint({ latitude: 10.1, longitude: 106.1, clientPointId: 'q-1' });
    await sender.sendPoint({ latitude: 10.2, longitude: 106.2, clientPointId: 'q-2' });
    expect(sender.getQueueLength()).toBe(2);

    mockSocket.emit.mockClear();

    // Reconnect socket
    mockSocket.connect();
    // Flush happens on connect
    expect(mockSocket.emit).toHaveBeenCalledWith(
      'tracking:send-point',
      expect.objectContaining({ clientPointId: 'q-1' }),
    );
    expect(mockSocket.emit).toHaveBeenCalledWith(
      'tracking:send-point',
      expect.objectContaining({ clientPointId: 'q-2' }),
    );
    expect(sender.getQueueLength()).toBe(0);
    expect(sender.getHealth().kind).toBe('healthy');
    expect(sender.getHealth().queuedPointCount).toBeNull();
    expect(onQueueFlushed).toHaveBeenCalledWith(2);
  });
});

describe('DriverTrackingSender Health, Permission and Port Integration', () => {
  let mockSocket: MockSocket;
  const sampleOrderId = '22222222-2222-4222-8222-222222222001';

  beforeEach(() => {
    mockSocket = new MockSocket();
    jest.clearAllMocks();
  });

  it('observes health and unsubscribes cleanly', async () => {
    const sender = createDriverTrackingSender({ socket: mockSocket });
    const healthLog: string[] = [];

    const { unsubscribe } = sender.observeHealth(sampleOrderId, (health) => {
      healthLog.push(health.kind);
    });

    expect(healthLog).toContain('not-started');

    await sender.start(sampleOrderId, 'PICKING_UP');
    expect(healthLog).toContain('healthy');

    unsubscribe();
    sender.stop();
    // After unsubscribe, healthLog should not have new entries
    const countBefore = healthLog.length;
    sender.setPermissionDenied(true);
    expect(healthLog.length).toBe(countBefore);
  });

  it('handles permission-denied state and drops GPS updates', async () => {
    const sender = createDriverTrackingSender({ socket: mockSocket });
    await sender.start(sampleOrderId, 'IN_TRANSIT');

    sender.setPermissionDenied(true);
    expect(sender.isPermissionDenied()).toBe(true);
    expect(sender.getHealth().kind).toBe('permission-denied');
    expect(sender.getHealth().label).toBe('Chưa được phép dùng vị trí');

    const res = await sender.sendPoint({ latitude: 10.73, longitude: 106.71 });
    expect(res.sent).toBe(false);
    expect(res.reason).toBe('PERMISSION_DENIED');

    sender.setPermissionDenied(false);
    expect(sender.getHealth().kind).toBe('healthy');
  });

  it('creates DriverTrackingPort and exercises retryConnection and openForegroundLocationSettings', async () => {
    const openSettingsMock = jest.fn<() => Promise<void>>().mockResolvedValue(undefined);
    const sender = createDriverTrackingSender({ socket: mockSocket });
    await sender.start(sampleOrderId, 'IN_TRANSIT');

    const port = sender.createTrackingPort({
      openForegroundLocationSettings: openSettingsMock,
    });

    await port.openForegroundLocationSettings();
    expect(openSettingsMock).toHaveBeenCalledTimes(1);

    mockSocket.disconnect();
    const health = await port.retryConnection(sampleOrderId);
    expect(health.kind).toBe('healthy');
    expect(mockSocket.connected).toBe(true);
  });

  it('handles session:error event with token refresh callback', async () => {
    const onTokenExpired = jest.fn<() => Promise<boolean>>().mockResolvedValue(true);
    const sender = createDriverTrackingSender({
      socket: mockSocket,
      onTokenExpired,
    });
    await sender.start(sampleOrderId, 'IN_TRANSIT');

    mockSocket.trigger('session:error', {
      code: 'AUTH_TOKEN_EXPIRED',
      message: 'Token expired',
    });

    // Wait for promise resolution
    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(onTokenExpired).toHaveBeenCalledTimes(1);
    expect(mockSocket.connected).toBe(true);
  });

  it('maps socket reconnecting and error states to health view', async () => {
    const sender = createDriverTrackingSender({ socket: mockSocket });
    await sender.start(sampleOrderId, 'IN_TRANSIT');

    mockSocket.trigger('connect_error');
    expect(sender.getHealth().kind).toBe('reconnecting');

    mockSocket.trigger('error', new Error('Socket fail'));
    expect(sender.getHealth().kind).toBe('stale');
  });

  it('destroys sender and cleans up all listeners and queue', async () => {
    const sender = createDriverTrackingSender({ socket: mockSocket });
    await sender.start(sampleOrderId, 'IN_TRANSIT');

    sender.destroy();
    expect(sender.getActiveOrderId()).toBeNull();
    expect(mockSocket.connected).toBe(false);
  });
});
