import { describe, expect, test, jest, beforeEach } from '@jest/globals';

import { DomainError } from '../common/domain-error.js';
import { NotificationsService } from './notifications.service.js';

describe('NotificationsService', () => {
  let repo: any;
  let fanOut: any;
  let service: NotificationsService;

  const baseNotification = {
    id: 'notif-1',
    userId: 'user-1',
    type: 'ORDER' as const,
    title: 'Đơn hàng đã được nhận',
    body: 'Tài xế đang trên đường tới điểm lấy hàng',
    data: null,
    isRead: false,
    readAt: null,
    createdAt: new Date('2026-09-01T00:00:00.000Z'),
  };

  beforeEach(() => {
    repo = {
      create: jest.fn(),
      list: jest.fn(),
      countUnread: jest.fn(),
      findByIdForUser: jest.fn(),
      markRead: jest.fn(),
      markAllRead: jest.fn(),
      upsertToken: jest.fn(),
      removeToken: jest.fn(),
    };
  });

  describe('create', () => {
    test('persists the notification and returns the row without a bound fan-out port', async () => {
      service = new NotificationsService(repo);
      repo.create.mockResolvedValue(baseNotification);

      const result = await service.create({
        userId: 'user-1',
        type: 'ORDER',
        title: baseNotification.title,
        body: baseNotification.body,
      });

      expect(result).toEqual(baseNotification);
      expect(repo.create).toHaveBeenCalledWith({
        userId: 'user-1',
        type: 'ORDER',
        title: baseNotification.title,
        body: baseNotification.body,
        data: undefined,
      });
    });

    test('invokes the fan-out port after persistence when one is bound', async () => {
      fanOut = { publish: jest.fn().mockResolvedValue(undefined) };
      service = new NotificationsService(repo, fanOut);
      repo.create.mockResolvedValue(baseNotification);

      await service.create({
        userId: 'user-1',
        type: 'ORDER',
        title: baseNotification.title,
        body: baseNotification.body,
      });

      // Fan-out happens after the write, and the write's result already
      // resolved to the caller by the time we assert here.
      await Promise.resolve();
      expect(fanOut.publish).toHaveBeenCalledWith(baseNotification);
    });

    test('a fan-out failure does not reject create()', async () => {
      fanOut = { publish: jest.fn().mockRejectedValue(new Error('socket down')) };
      service = new NotificationsService(repo, fanOut);
      repo.create.mockResolvedValue(baseNotification);

      await expect(
        service.create({
          userId: 'user-1',
          type: 'ORDER',
          title: baseNotification.title,
          body: baseNotification.body,
        }),
      ).resolves.toEqual(baseNotification);
    });
  });

  describe('list', () => {
    test('delegates to the repository with default pagination, newest first', async () => {
      service = new NotificationsService(repo);
      const page = {
        items: [baseNotification],
        page: 1,
        pageSize: 20,
        total: 1,
        totalPages: 1,
      };
      repo.list.mockResolvedValue(page);

      const result = await service.list('user-1');

      expect(result).toEqual(page);
      expect(repo.list).toHaveBeenCalledWith('user-1', 1, 20);
    });

    test('passes explicit page/pageSize through', async () => {
      service = new NotificationsService(repo);
      repo.list.mockResolvedValue({ items: [], page: 2, pageSize: 5, total: 0, totalPages: 0 });

      await service.list('user-1', 2, 5);

      expect(repo.list).toHaveBeenCalledWith('user-1', 2, 5);
    });
  });

  describe('unreadCount', () => {
    test('returns the unread count envelope', async () => {
      service = new NotificationsService(repo);
      repo.countUnread.mockResolvedValue(3);

      const result = await service.unreadCount('user-1');

      expect(result).toEqual({ count: 3 });
      expect(repo.countUnread).toHaveBeenCalledWith('user-1');
    });
  });

  describe('markRead', () => {
    test('marks the notification read', async () => {
      service = new NotificationsService(repo);
      repo.markRead.mockResolvedValue({ ...baseNotification, isRead: true, readAt: new Date() });

      const result = await service.markRead('user-1', 'notif-1');

      expect(result.isRead).toBe(true);
      expect(repo.markRead).toHaveBeenCalledWith('user-1', 'notif-1');
    });

    test('is idempotent: calling it again on an already-read notification still succeeds', async () => {
      service = new NotificationsService(repo);
      const readNotification = { ...baseNotification, isRead: true, readAt: new Date() };
      repo.markRead.mockResolvedValue(readNotification);

      const first = await service.markRead('user-1', 'notif-1');
      const second = await service.markRead('user-1', 'notif-1');

      expect(first.isRead).toBe(true);
      expect(second.isRead).toBe(true);
      expect(repo.markRead).toHaveBeenCalledTimes(2);
    });

    test('throws a non-disclosing 404 when the notification does not belong to the caller (or does not exist)', async () => {
      service = new NotificationsService(repo);
      repo.markRead.mockResolvedValue(null);

      await expect(service.markRead('user-1', 'someone-elses-notif')).rejects.toThrow(DomainError);

      try {
        await service.markRead('user-1', 'someone-elses-notif');
        throw new Error('expected markRead to throw');
      } catch (error) {
        expect(error).toBeInstanceOf(DomainError);
        expect((error as DomainError).status).toBe(404);
        expect((error as DomainError).code).toBe('NOTIFICATION_NOT_FOUND');
        // Message must not disclose whether the id exists for another user.
        expect((error as DomainError).message).not.toMatch(/user|owner/i);
      }
    });
  });

  describe('markAllRead', () => {
    test('returns the number of notifications marked read', async () => {
      service = new NotificationsService(repo);
      repo.markAllRead.mockResolvedValue(4);

      const result = await service.markAllRead('user-1');

      expect(result).toEqual({ count: 4 });
      expect(repo.markAllRead).toHaveBeenCalledWith('user-1');
    });

    test('is idempotent: a second call with nothing left unread returns count 0, not an error', async () => {
      service = new NotificationsService(repo);
      repo.markAllRead.mockResolvedValueOnce(4).mockResolvedValueOnce(0);

      const first = await service.markAllRead('user-1');
      const second = await service.markAllRead('user-1');

      expect(first).toEqual({ count: 4 });
      expect(second).toEqual({ count: 0 });
    });
  });

  describe('registerToken', () => {
    test('upserts the token scoped to the calling user', async () => {
      service = new NotificationsService(repo);
      const token = { id: 'dt-1', userId: 'user-1', token: 'tok-abc123', platform: 'ANDROID', lastUsedAt: new Date(), createdAt: new Date() };
      repo.upsertToken.mockResolvedValue(token);

      const result = await service.registerToken('user-1', 'tok-abc123', 'ANDROID');

      expect(result).toEqual(token);
      expect(repo.upsertToken).toHaveBeenCalledWith('user-1', 'tok-abc123', 'ANDROID');
    });
  });

  describe('removeToken', () => {
    test('removes the token scoped to the calling user only', async () => {
      service = new NotificationsService(repo);
      repo.removeToken.mockResolvedValue(1);

      await service.removeToken('user-1', 'tok-abc123');

      expect(repo.removeToken).toHaveBeenCalledWith('user-1', 'tok-abc123');
    });

    test('a different user removing the same token value only ever scopes by their own userId', async () => {
      service = new NotificationsService(repo);
      repo.removeToken.mockResolvedValue(0);

      await service.removeToken('user-2', 'tok-abc123');

      expect(repo.removeToken).toHaveBeenCalledWith('user-2', 'tok-abc123');
      // Never called on behalf of user-1 as a side effect of user-2's request.
      expect(repo.removeToken).not.toHaveBeenCalledWith('user-1', 'tok-abc123');
    });
  });
});
