import { beforeEach, describe, expect, it, jest } from '@jest/globals';

import {
  CustomerNotificationSocketManager,
  createCustomerNotificationSocket,
  mapSocketPayloadToView,
  type NotificationConnectionState,
  type SocketLike,
  type SocketNotificationCreatedPayload,
} from './notification-socket';

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

describe('mapSocketPayloadToView', () => {
  it('maps a notification:new payload into the view shape', () => {
    const view = mapSocketPayloadToView({
      id: 'n-1',
      type: 'ORDER',
      title: 'Tài xế đang giao hàng',
      body: 'Đơn hàng đang trên đường.',
      createdAt: '2026-08-15T14:32:00.000Z',
      orderId: 'ord-1',
    });

    expect(view).toMatchObject({
      id: 'n-1',
      type: 'order',
      isRead: false,
      orderId: 'ord-1',
    });
  });

  it('falls back to reading orderId out of the data payload', () => {
    const view = mapSocketPayloadToView({
      id: 'n-2',
      type: 'PAYMENT',
      title: 'T',
      body: 'B',
      createdAt: '2026-08-15T14:32:00.000Z',
      data: { orderId: 'ord-2' },
    });

    expect(view.orderId).toBe('ord-2');
  });

  it('omits orderId when neither the field nor data carries one', () => {
    const view = mapSocketPayloadToView({
      id: 'n-3',
      type: 'SYSTEM',
      title: 'T',
      body: 'B',
      createdAt: '2026-08-15T14:32:00.000Z',
    });

    expect(view.orderId).toBeUndefined();
  });
});

describe('CustomerNotificationSocketManager', () => {
  let mockSocket: MockSocket;
  let manager: CustomerNotificationSocketManager;

  beforeEach(() => {
    mockSocket = new MockSocket();
    manager = createCustomerNotificationSocket({ socket: mockSocket });
  });

  describe('connection lifecycle', () => {
    it('starts idle and transitions to connecting/connected on connect()', async () => {
      expect(manager.getConnectionState()).toBe('idle');
      const stateListener = jest.fn<(state: NotificationConnectionState) => void>();
      manager.subscribe({ onConnectionStateChanged: stateListener });

      await manager.connect();

      expect(manager.getConnectionState()).toBe('connected');
      expect(stateListener).toHaveBeenCalledWith('connecting');
      expect(stateListener).toHaveBeenCalledWith('connected');
    });

    it('tracks disconnect/reconnecting/error transitions', () => {
      const stateListener = jest.fn<(state: NotificationConnectionState) => void>();
      manager.subscribe({ onConnectionStateChanged: stateListener });

      mockSocket.trigger('connect');
      expect(manager.getConnectionState()).toBe('connected');

      mockSocket.trigger('disconnect');
      expect(manager.getConnectionState()).toBe('disconnected');

      mockSocket.trigger('connect_error');
      expect(manager.getConnectionState()).toBe('reconnecting');

      mockSocket.trigger('error');
      expect(manager.getConnectionState()).toBe('error');
    });

    it('uses a socketFactory with the notifications namespace when no socket is provided', async () => {
      const factorySocket = new MockSocket();
      const factory = jest.fn<() => SocketLike>().mockReturnValue(factorySocket);

      const factoryManager = createCustomerNotificationSocket({
        socketFactory: factory,
        tokenProvider: () => 'test-token',
        serverUrl: 'https://api.leopard.vn',
      });

      await factoryManager.connect();

      expect(factory).toHaveBeenCalledWith(
        'https://api.leopard.vn/notifications',
        expect.objectContaining({ auth: { token: 'test-token' }, transports: ['websocket'] }),
      );
    });
  });

  describe('notification:new handling', () => {
    it('notifies listeners with the mapped view on notification:new', () => {
      const onNotificationCreated = jest.fn();
      manager.subscribe({ onNotificationCreated });

      const payload: SocketNotificationCreatedPayload = {
        id: 'n-1',
        type: 'ORDER',
        title: 'Tài xế đang giao hàng',
        body: 'Đơn hàng đang trên đường.',
        createdAt: '2026-08-15T14:32:00.000Z',
        orderId: 'ord-1',
      };

      mockSocket.trigger('notification:new', payload);

      expect(onNotificationCreated).toHaveBeenCalledTimes(1);
      expect(onNotificationCreated).toHaveBeenCalledWith(
        expect.objectContaining({ id: 'n-1', type: 'order', orderId: 'ord-1' }),
      );
    });

    it('deduplicates repeat notification:new events by id', () => {
      const onNotificationCreated = jest.fn();
      manager.subscribe({ onNotificationCreated });

      const payload: SocketNotificationCreatedPayload = {
        id: 'n-dup',
        type: 'SYSTEM',
        title: 'T',
        body: 'B',
        createdAt: '2026-08-15T14:32:00.000Z',
      };

      mockSocket.trigger('notification:new', payload);
      mockSocket.trigger('notification:new', payload);

      expect(onNotificationCreated).toHaveBeenCalledTimes(1);
    });

    it('ignores a malformed payload without an id', () => {
      const onNotificationCreated = jest.fn();
      manager.subscribe({ onNotificationCreated });

      mockSocket.trigger('notification:new', {});

      expect(onNotificationCreated).not.toHaveBeenCalled();
    });
  });

  describe('session error handling', () => {
    it('refreshes the token and reconnects on session:error', async () => {
      const onTokenExpired = jest.fn<() => Promise<boolean>>().mockResolvedValue(true);
      const onSessionError = jest.fn();

      const authedManager = createCustomerNotificationSocket({
        socket: mockSocket,
        onTokenExpired,
      });
      authedManager.subscribe({ onSessionError });
      mockSocket.connected = true;

      await authedManager.handleSessionError({ code: 'TOKEN_EXPIRED', message: 'expired' });

      expect(onSessionError).toHaveBeenCalledWith({ code: 'TOKEN_EXPIRED', message: 'expired' });
      expect(onTokenExpired).toHaveBeenCalledTimes(1);
    });
  });

  describe('teardown', () => {
    it('destroy() disconnects, clears listeners, and forgets seen ids', () => {
      const onNotificationCreated = jest.fn();
      manager.subscribe({ onNotificationCreated });
      mockSocket.connected = true;

      manager.destroy();

      expect(manager.getConnectionState()).toBe('disconnected');

      // A listener subscribed before destroy() must not fire afterward.
      mockSocket.trigger('notification:new', {
        id: 'n-after-destroy',
        type: 'SYSTEM',
        title: 'T',
        body: 'B',
        createdAt: '2026-08-15T14:32:00.000Z',
      });
      expect(onNotificationCreated).not.toHaveBeenCalled();
    });
  });
});
