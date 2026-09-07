import type { Notification, DeviceToken } from '@prisma/client';

// Extracted from prisma-mock.ts (Task 3 notifications plan) to keep that file
// under the project's 800-line limit. Mirrors the same in-memory-Map-backed
// per-model mock pattern as every other model there; the Maps themselves stay
// on `InMemoryPrismaService` since callers (e.g.
// notification-triggers.integration-spec.ts) reach into
// `prismaMock.notifications` directly.

export function createNotificationMock(notifications: Map<string, Notification>) {
  return {
    create: jest.fn(async ({ data }: { data: any }) => {
      const id = data.id ?? `notif-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
      const notification: Notification = {
        id,
        userId: data.userId,
        type: data.type,
        title: data.title,
        body: data.body,
        data: data.data ?? null,
        isRead: false,
        readAt: null,
        createdAt: new Date(),
      };
      notifications.set(id, notification);
      return notification;
    }),
    findMany: jest.fn(
      async ({
        where,
        skip = 0,
        take = 20,
      }: { where?: { userId?: string; isRead?: boolean }; skip?: number; take?: number } = {}) => {
        let list = Array.from(notifications.values());
        if (where?.userId) list = list.filter((n) => n.userId === where.userId);
        if (where?.isRead !== undefined) list = list.filter((n) => n.isRead === where.isRead);
        list.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
        return list.slice(skip, skip + take);
      },
    ),
    count: jest.fn(async ({ where }: { where?: { userId?: string; isRead?: boolean } } = {}) => {
      let list = Array.from(notifications.values());
      if (where?.userId) list = list.filter((n) => n.userId === where.userId);
      if (where?.isRead !== undefined) list = list.filter((n) => n.isRead === where.isRead);
      return list.length;
    }),
    findFirst: jest.fn(async ({ where }: { where?: { id?: string; userId?: string } } = {}) => {
      let list = Array.from(notifications.values());
      if (where?.id) list = list.filter((n) => n.id === where.id);
      if (where?.userId) list = list.filter((n) => n.userId === where.userId);
      return list[0] ?? null;
    }),
    findUnique: jest.fn(async ({ where }: { where: { id: string } }) => {
      return notifications.get(where.id) ?? null;
    }),
    updateMany: jest.fn(
      async ({
        where,
        data,
      }: {
        where?: { id?: string; userId?: string; isRead?: boolean };
        data: Partial<Notification>;
      }) => {
        let count = 0;
        for (const notification of notifications.values()) {
          const matchesId = !where?.id || notification.id === where.id;
          const matchesUserId = !where?.userId || notification.userId === where.userId;
          const matchesIsRead = where?.isRead === undefined || notification.isRead === where.isRead;
          if (matchesId && matchesUserId && matchesIsRead) {
            Object.assign(notification, data);
            count++;
          }
        }
        return { count };
      },
    ),
  };
}

export function createDeviceTokenMock(deviceTokens: Map<string, DeviceToken>) {
  return {
    upsert: jest.fn(
      async ({
        where,
        create,
        update,
      }: {
        where: { token: string };
        create: { userId: string; token: string; platform: string };
        update: Partial<DeviceToken>;
      }) => {
        const existing = Array.from(deviceTokens.values()).find((t) => t.token === where.token);
        if (existing) {
          const updated = { ...existing, ...update } as DeviceToken;
          deviceTokens.set(existing.id, updated);
          return updated;
        }
        const id = `token-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
        const token: DeviceToken = {
          id,
          userId: create.userId,
          token: create.token,
          platform: create.platform,
          lastUsedAt: new Date(),
          createdAt: new Date(),
        };
        deviceTokens.set(id, token);
        return token;
      },
    ),
    findMany: jest.fn(async ({ where }: { where?: { userId?: string } } = {}) => {
      let list = Array.from(deviceTokens.values());
      if (where?.userId) list = list.filter((t) => t.userId === where.userId);
      return list;
    }),
    deleteMany: jest.fn(async ({ where }: { where?: { userId?: string; token?: string } } = {}) => {
      let count = 0;
      for (const [id, token] of deviceTokens.entries()) {
        const matchesUserId = !where?.userId || token.userId === where.userId;
        const matchesToken = !where?.token || token.token === where.token;
        if (matchesUserId && matchesToken) {
          deviceTokens.delete(id);
          count++;
        }
      }
      return { count };
    }),
  };
}
