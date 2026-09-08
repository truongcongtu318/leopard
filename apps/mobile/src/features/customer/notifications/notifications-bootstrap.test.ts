import { QueryClient } from '@tanstack/react-query';
import { describe, expect, it, jest } from '@jest/globals';

jest.mock('./push-token-provider', () => ({
  registerPushToken: jest.fn(async () => undefined),
  removePushToken: jest.fn(async () => undefined),
}));

import { registerPushToken, removePushToken } from './push-token-provider';
import { createNotificationsBootstrap } from './notifications-bootstrap';
import { notificationsListQueryKey, notificationsUnreadCountQueryKey } from './query-keys';
import type { CustomerNotificationSocketManager } from './notification-socket';
import type { NotificationItemView } from './model';
import type { NotificationsPort } from './port';

function makeSocketManager(): {
  manager: CustomerNotificationSocketManager;
  emitNotification: (item: NotificationItemView) => void;
  connect: jest.Mock;
  destroy: jest.Mock;
} {
  let onNotificationCreated: ((item: NotificationItemView) => void) | undefined;
  const connect = jest.fn();
  const destroy = jest.fn();

  const manager = {
    subscribe: (callbacks: { onNotificationCreated?: (item: NotificationItemView) => void }) => {
      onNotificationCreated = callbacks.onNotificationCreated;
      return jest.fn();
    },
    connect,
    destroy,
  } as unknown as CustomerNotificationSocketManager;

  return {
    manager,
    connect,
    destroy,
    emitNotification: (item: NotificationItemView) => onNotificationCreated?.(item),
  };
}

function makePort(): NotificationsPort {
  return {
    getListPage: jest.fn() as never,
    getUnreadCount: jest.fn() as never,
    markRead: jest.fn() as never,
    markAllRead: jest.fn() as never,
    registerDeviceToken: jest.fn() as never,
    removeDeviceToken: jest.fn() as never,
  };
}

const sampleItem: NotificationItemView = {
  id: 'n-live-1',
  type: 'order',
  title: 'Tài xế đang giao hàng',
  body: 'Đơn hàng đang trên đường.',
  createdAt: '2026-08-15T14:32:00.000Z',
  createdAtLabel: '14:32 · 15/08/2026',
  isRead: false,
};

describe('createNotificationsBootstrap', () => {
  it('start() connects the socket and registers the push token', () => {
    const queryClient = new QueryClient();
    const { manager, connect } = makeSocketManager();
    const port = makePort();

    createNotificationsBootstrap({ queryClient, socketManager: manager, port }).start();

    expect(connect).toHaveBeenCalledTimes(1);
    expect(registerPushToken).toHaveBeenCalledWith(port);
  });

  it('prepends a live notification into the first cached page and invalidates unread count', async () => {
    const queryClient = new QueryClient();
    queryClient.setQueryData(notificationsListQueryKey, {
      pages: [{ items: [], page: 1, totalPages: 1 }],
      pageParams: [1],
    });
    const invalidateSpy = jest.spyOn(queryClient, 'invalidateQueries');

    const { manager, emitNotification } = makeSocketManager();
    const port = makePort();

    createNotificationsBootstrap({ queryClient, socketManager: manager, port }).start();
    emitNotification(sampleItem);

    const cached = queryClient.getQueryData<{ pages: Array<{ items: NotificationItemView[] }> }>(
      notificationsListQueryKey,
    );
    expect(cached?.pages[0].items).toEqual([sampleItem]);
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: notificationsUnreadCountQueryKey });
  });

  it('does not duplicate a notification already present in the cache', () => {
    const queryClient = new QueryClient();
    queryClient.setQueryData(notificationsListQueryKey, {
      pages: [{ items: [sampleItem], page: 1, totalPages: 1 }],
      pageParams: [1],
    });

    const { manager, emitNotification } = makeSocketManager();
    createNotificationsBootstrap({
      queryClient,
      socketManager: manager,
      port: makePort(),
    }).start();

    emitNotification(sampleItem);

    const cached = queryClient.getQueryData<{ pages: Array<{ items: NotificationItemView[] }> }>(
      notificationsListQueryKey,
    );
    expect(cached?.pages[0].items).toHaveLength(1);
  });

  it('is a no-op when the list cache has not been populated yet', () => {
    const queryClient = new QueryClient();
    const { manager, emitNotification } = makeSocketManager();

    createNotificationsBootstrap({
      queryClient,
      socketManager: manager,
      port: makePort(),
    }).start();

    expect(() => emitNotification(sampleItem)).not.toThrow();
    expect(queryClient.getQueryData(notificationsListQueryKey)).toBeUndefined();
  });

  it('stop() unsubscribes, destroys the socket, and removes the push token', async () => {
    const queryClient = new QueryClient();
    const { manager, destroy } = makeSocketManager();
    const port = makePort();

    const bootstrap = createNotificationsBootstrap({ queryClient, socketManager: manager, port });
    bootstrap.start();
    await bootstrap.stop();

    expect(destroy).toHaveBeenCalledTimes(1);
    expect(removePushToken).toHaveBeenCalledWith(port);
  });
});
