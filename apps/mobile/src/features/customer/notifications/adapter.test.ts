import { describe, expect, it, jest } from '@jest/globals';

import {
  createCustomerNotificationsHttpAdapter,
  extractOrderId,
  formatDateTime,
  isOlderThanOneDay,
  mapNotificationToView,
  mapNotificationType,
  type NotificationsHttpClient,
} from './adapter';

function makeClient(overrides: Partial<NotificationsHttpClient> = {}): NotificationsHttpClient {
  return {
    get: jest.fn(async () => ({})) as never,
    post: jest.fn(async () => ({})) as never,
    delete: jest.fn(async () => ({})) as never,
    ...overrides,
  };
}

describe('notifications adapter helpers', () => {
  it('maps server enum values to the lowercase mobile union', () => {
    expect(mapNotificationType('ORDER')).toBe('order');
    expect(mapNotificationType('PAYMENT')).toBe('payment');
    expect(mapNotificationType('PROMO')).toBe('promo');
    expect(mapNotificationType('SYSTEM')).toBe('system');
    expect(mapNotificationType('SOMETHING_UNKNOWN')).toBe('system');
  });

  it('extracts orderId from the notification data payload only when present and a string', () => {
    expect(extractOrderId({ orderId: 'ord-1' })).toBe('ord-1');
    expect(extractOrderId({ orderId: 42 } as never)).toBeUndefined();
    expect(extractOrderId(null)).toBeUndefined();
    expect(extractOrderId(undefined)).toBeUndefined();
    expect(extractOrderId({})).toBeUndefined();
  });

  it('formats a UTC timestamp using the local timezone rather than treating it as a display label', () => {
    const label = formatDateTime('2026-08-15T14:32:00.000Z');
    expect(label).toContain('·');
    expect(formatDateTime(null)).toBe('');
    expect(formatDateTime(undefined)).toBe('');
    expect(formatDateTime('not-a-date')).toBe('');
  });

  it('groups by age relative to now, treating unparsable dates as old', () => {
    expect(isOlderThanOneDay(new Date().toISOString())).toBe(false);
    expect(isOlderThanOneDay('2000-01-01T00:00:00.000Z')).toBe(true);
    expect(isOlderThanOneDay(null)).toBe(true);
    expect(isOlderThanOneDay('garbage')).toBe(true);
  });

  it('maps a full API notification row into the view shape, carrying orderId through', () => {
    const view = mapNotificationToView({
      id: 'n-1',
      type: 'ORDER',
      title: 'Tài xế đang giao hàng',
      body: 'Đơn hàng đang trên đường.',
      data: { orderId: 'ord-9' },
      isRead: false,
      createdAt: '2026-08-15T14:32:00.000Z',
    });

    expect(view).toMatchObject({
      id: 'n-1',
      type: 'order',
      title: 'Tài xế đang giao hàng',
      isRead: false,
      orderId: 'ord-9',
    });
    expect(view.createdAtLabel).toBeTruthy();
  });

  it('maps a notification without order data and omits orderId entirely', () => {
    const view = mapNotificationToView({
      id: 'n-2',
      type: 'SYSTEM',
      title: 'Bảo trì hệ thống',
      body: 'Hệ thống bảo trì.',
      isRead: true,
      createdAt: '2026-08-15T14:32:00.000Z',
    });

    expect(view.orderId).toBeUndefined();
    expect(view.type).toBe('system');
  });
});

describe('createCustomerNotificationsHttpAdapter', () => {
  it('fetches a paginated list page and maps every item', async () => {
    const get = jest.fn(async () => ({
      items: [
        {
          id: 'n-1',
          type: 'ORDER',
          title: 'T1',
          body: 'B1',
          isRead: false,
          createdAt: '2026-08-15T10:00:00.000Z',
        },
      ],
      page: 1,
      pageSize: 20,
      total: 1,
      totalPages: 1,
    }));
    const client = makeClient({ get: get as never });
    const port = createCustomerNotificationsHttpAdapter(client);

    const result = await port.getListPage(1);

    expect(get).toHaveBeenCalledWith('/notifications?page=1&pageSize=20');
    expect(result.items).toHaveLength(1);
    expect(result.items[0].id).toBe('n-1');
    expect(result.page).toBe(1);
    expect(result.totalPages).toBe(1);
  });

  it('fetches unread count', async () => {
    const get = jest.fn(async () => ({ count: 3 }));
    const client = makeClient({ get: get as never });
    const port = createCustomerNotificationsHttpAdapter(client);

    await expect(port.getUnreadCount()).resolves.toBe(3);
    expect(get).toHaveBeenCalledWith('/notifications/unread-count');
  });

  it('marks one notification read via POST /notifications/:id/read', async () => {
    const post = jest.fn(async () => ({}));
    const client = makeClient({ post: post as never });
    const port = createCustomerNotificationsHttpAdapter(client);

    await port.markRead('n-1');

    expect(post).toHaveBeenCalledWith('/notifications/n-1/read');
  });

  it('marks all read via POST /notifications/read-all', async () => {
    const post = jest.fn(async () => ({}));
    const client = makeClient({ post: post as never });
    const port = createCustomerNotificationsHttpAdapter(client);

    await port.markAllRead();

    expect(post).toHaveBeenCalledWith('/notifications/read-all');
  });

  it('registers a WEB device token', async () => {
    const post = jest.fn(async () => ({}));
    const client = makeClient({ post: post as never });
    const port = createCustomerNotificationsHttpAdapter(client);

    await port.registerDeviceToken('fcm-token-123', 'WEB');

    expect(post).toHaveBeenCalledWith('/notifications/register-token', {
      token: 'fcm-token-123',
      platform: 'WEB',
    });
  });

  it('removes a device token via DELETE with a body', async () => {
    const del = jest.fn(async () => ({}));
    const client = makeClient({ delete: del as never });
    const port = createCustomerNotificationsHttpAdapter(client);

    await port.removeDeviceToken('fcm-token-123');

    expect(del).toHaveBeenCalledWith('/notifications/register-token', {
      token: 'fcm-token-123',
    });
  });
});
