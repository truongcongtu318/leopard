import { describe, expect, test, jest, beforeEach } from '@jest/globals';

import { NotificationsRepository } from './notifications.repository.js';

describe('NotificationsRepository', () => {
  let prisma: any;
  let repo: NotificationsRepository;

  beforeEach(() => {
    prisma = {
      notification: {
        create: jest.fn(),
        findMany: jest.fn(),
        count: jest.fn(),
        findFirst: jest.fn(),
        findUnique: jest.fn(),
        updateMany: jest.fn(),
      },
      deviceToken: {
        upsert: jest.fn(),
        deleteMany: jest.fn(),
        findMany: jest.fn(),
      },
    };
    repo = new NotificationsRepository(prisma);
  });

  describe('list', () => {
    test('orders newest first and returns a page envelope', async () => {
      const items = [{ id: 'n2' }, { id: 'n1' }];
      prisma.notification.findMany.mockResolvedValue(items);
      prisma.notification.count.mockResolvedValue(2);

      const result = await repo.list('user-1', 1, 20);

      expect(prisma.notification.findMany).toHaveBeenCalledWith({
        where: { userId: 'user-1' },
        orderBy: { createdAt: 'desc' },
        skip: 0,
        take: 20,
      });
      expect(result).toEqual({ items, page: 1, pageSize: 20, total: 2, totalPages: 1 });
    });

    test('computes skip from the requested page', async () => {
      prisma.notification.findMany.mockResolvedValue([]);
      prisma.notification.count.mockResolvedValue(0);

      await repo.list('user-1', 3, 10);

      expect(prisma.notification.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ skip: 20, take: 10 }),
      );
    });
  });

  describe('markRead', () => {
    test('scopes the write itself by { id, userId }', async () => {
      prisma.notification.updateMany.mockResolvedValue({ count: 1 });
      prisma.notification.findUnique.mockResolvedValue({ id: 'notif-1', isRead: true });

      const result = await repo.markRead('user-1', 'notif-1');

      expect(prisma.notification.updateMany).toHaveBeenCalledWith({
        where: { id: 'notif-1', userId: 'user-1' },
        data: expect.objectContaining({ isRead: true }),
      });
      expect(result).toEqual({ id: 'notif-1', isRead: true });
    });

    test('returns null (never throws or fetches) when the row does not belong to this user', async () => {
      prisma.notification.updateMany.mockResolvedValue({ count: 0 });

      const result = await repo.markRead('user-2', 'someone-elses-notif');

      expect(result).toBeNull();
      expect(prisma.notification.findUnique).not.toHaveBeenCalled();
    });
  });

  describe('markAllRead', () => {
    test('only touches unread rows for this user', async () => {
      prisma.notification.updateMany.mockResolvedValue({ count: 3 });

      const count = await repo.markAllRead('user-1');

      expect(prisma.notification.updateMany).toHaveBeenCalledWith({
        where: { userId: 'user-1', isRead: false },
        data: expect.objectContaining({ isRead: true }),
      });
      expect(count).toBe(3);
    });
  });

  describe('upsertToken', () => {
    test('upserts by the globally-unique token and stamps lastUsedAt on conflict', async () => {
      const token = { id: 'dt-1', userId: 'user-1', token: 'tok-abc123', platform: 'ANDROID' };
      prisma.deviceToken.upsert.mockResolvedValue(token);

      const result = await repo.upsertToken('user-1', 'tok-abc123', 'ANDROID');

      expect(prisma.deviceToken.upsert).toHaveBeenCalledWith({
        where: { token: 'tok-abc123' },
        create: { userId: 'user-1', token: 'tok-abc123', platform: 'ANDROID' },
        update: expect.objectContaining({
          userId: 'user-1',
          platform: 'ANDROID',
          lastUsedAt: expect.any(Date),
        }),
      });
      expect(result).toBe(token);
    });
  });

  describe('findTokensForUser', () => {
    test('scopes the lookup to the given user only', async () => {
      const tokens = [{ id: 'dt-1', userId: 'user-1', token: 'tok-abc123', platform: 'ANDROID' }];
      prisma.deviceToken.findMany.mockResolvedValue(tokens);

      const result = await repo.findTokensForUser('user-1');

      expect(prisma.deviceToken.findMany).toHaveBeenCalledWith({ where: { userId: 'user-1' } });
      expect(result).toBe(tokens);
    });
  });

  describe('removeToken', () => {
    test('scopes the delete by { userId, token } so another user\'s token is never touched', async () => {
      prisma.deviceToken.deleteMany.mockResolvedValue({ count: 1 });

      const count = await repo.removeToken('user-1', 'tok-abc123');

      expect(prisma.deviceToken.deleteMany).toHaveBeenCalledWith({
        where: { userId: 'user-1', token: 'tok-abc123' },
      });
      expect(count).toBe(1);
    });

    test('a mismatched userId/token pair removes nothing', async () => {
      prisma.deviceToken.deleteMany.mockResolvedValue({ count: 0 });

      const count = await repo.removeToken('user-2', 'tok-belongs-to-user-1');

      expect(count).toBe(0);
    });
  });
});
