import { describe, expect, test, jest, beforeEach } from '@jest/globals';

import type { AuthenticatedActor } from '../auth/decorators/current-user.js';
import { NotificationsController } from './notifications.controller.js';

describe('NotificationsController', () => {
  let service: any;
  let controller: NotificationsController;
  const actor: AuthenticatedActor = { userId: 'user-1', role: 'CUSTOMER', sessionId: 'sess-1' };

  beforeEach(() => {
    service = {
      list: jest.fn(),
      unreadCount: jest.fn(),
      markAllRead: jest.fn(),
      registerToken: jest.fn(),
      removeToken: jest.fn(),
      markRead: jest.fn(),
    };
    controller = new NotificationsController(service);
  });

  test('list() forwards the caller and page query to the service', async () => {
    const page = { items: [], page: 2, pageSize: 10, total: 0, totalPages: 0 };
    service.list.mockResolvedValue(page);

    const result = await controller.list(actor, { page: 2, pageSize: 10 });

    expect(result).toBe(page);
    expect(service.list).toHaveBeenCalledWith('user-1', 2, 10);
  });

  test('unreadCount() scopes to the caller', async () => {
    service.unreadCount.mockResolvedValue({ count: 5 });

    const result = await controller.unreadCount(actor);

    expect(result).toEqual({ count: 5 });
    expect(service.unreadCount).toHaveBeenCalledWith('user-1');
  });

  test('markAllRead() scopes to the caller', async () => {
    service.markAllRead.mockResolvedValue({ count: 2 });

    const result = await controller.markAllRead(actor);

    expect(result).toEqual({ count: 2 });
    expect(service.markAllRead).toHaveBeenCalledWith('user-1');
  });

  test('registerToken() forwards token + platform for the caller', async () => {
    const token = { id: 'dt-1', userId: 'user-1', token: 'tok-abc123', platform: 'IOS', lastUsedAt: new Date(), createdAt: new Date() };
    service.registerToken.mockResolvedValue(token);

    const result = await controller.registerToken(actor, { token: 'tok-abc123', platform: 'IOS' });

    expect(result).toBe(token);
    expect(service.registerToken).toHaveBeenCalledWith('user-1', 'tok-abc123', 'IOS');
  });

  test('removeToken() forwards the supplied token for the caller and returns success', async () => {
    service.removeToken.mockResolvedValue(undefined);

    const result = await controller.removeToken(actor, { token: 'tok-abc123' });

    expect(result).toEqual({ success: true });
    expect(service.removeToken).toHaveBeenCalledWith('user-1', 'tok-abc123');
  });

  test('markRead() forwards the caller and the :id param', async () => {
    const notification = { id: 'notif-1', isRead: true };
    service.markRead.mockResolvedValue(notification);

    const result = await controller.markRead(actor, 'notif-1');

    expect(result).toBe(notification);
    expect(service.markRead).toHaveBeenCalledWith('user-1', 'notif-1');
  });
});
