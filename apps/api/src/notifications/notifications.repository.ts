import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import type { DeviceToken, Notification, NotificationType } from '@prisma/client';

import { PrismaService } from '../database/prisma.service.js';

export interface CreateNotificationData {
  readonly userId: string;
  readonly type: NotificationType;
  readonly title: string;
  readonly body: string;
  readonly data?: Record<string, unknown> | null;
}

export interface NotificationPage {
  readonly items: readonly Notification[];
  readonly page: number;
  readonly pageSize: number;
  readonly total: number;
  readonly totalPages: number;
}

@Injectable()
export class NotificationsRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: CreateNotificationData): Promise<Notification> {
    return this.prisma.notification.create({
      data: {
        userId: data.userId,
        type: data.type,
        title: data.title,
        body: data.body,
        ...(data.data === undefined
          ? {}
          : { data: data.data === null ? Prisma.JsonNull : (data.data as Prisma.InputJsonValue) }),
      },
    });
  }

  async list(userId: string, page: number, pageSize: number): Promise<NotificationPage> {
    const skip = (page - 1) * pageSize;

    const [items, total] = await Promise.all([
      this.prisma.notification.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        skip,
        take: pageSize,
      }),
      this.prisma.notification.count({ where: { userId } }),
    ]);

    return {
      items,
      page,
      pageSize,
      total,
      totalPages: Math.ceil(total / pageSize) || 0,
    };
  }

  async countUnread(userId: string): Promise<number> {
    return this.prisma.notification.count({ where: { userId, isRead: false } });
  }

  async findByIdForUser(userId: string, id: string): Promise<Notification | null> {
    return this.prisma.notification.findFirst({ where: { id, userId } });
  }

  /**
   * The write itself is scoped by `{ id, userId }` in the WHERE clause (not
   * just an application-level ownership check beforehand), so a caller can
   * never mutate another user's notification even under a race. Returns
   * null when no row matched — the service maps that to a non-disclosing
   * 404 rather than revealing whether the id exists for someone else.
   */
  async markRead(userId: string, id: string): Promise<Notification | null> {
    const result = await this.prisma.notification.updateMany({
      where: { id, userId },
      data: { isRead: true, readAt: new Date() },
    });

    if (result.count === 0) {
      return null;
    }

    return this.prisma.notification.findUnique({ where: { id } });
  }

  async markAllRead(userId: string): Promise<number> {
    const result = await this.prisma.notification.updateMany({
      where: { userId, isRead: false },
      data: { isRead: true, readAt: new Date() },
    });

    return result.count;
  }

  /**
   * `token` is globally unique, so re-registering a token that previously
   * belonged to a different user (device reused after logout/login as
   * someone else) reassigns it to the current user — that is the desired
   * behavior for a device-scoped push token.
   */
  async upsertToken(userId: string, token: string, platform: string): Promise<DeviceToken> {
    return this.prisma.deviceToken.upsert({
      where: { token },
      create: { userId, token, platform },
      update: { userId, platform, lastUsedAt: new Date() },
    });
  }

  /** Used by push fan-out to look up which device tokens to send FCM to. */
  async findTokensForUser(userId: string): Promise<DeviceToken[]> {
    return this.prisma.deviceToken.findMany({ where: { userId } });
  }

  /** Scoped by `{ userId, token }` so a caller can only ever remove their own token. */
  async removeToken(userId: string, token: string): Promise<number> {
    const result = await this.prisma.deviceToken.deleteMany({
      where: { userId, token },
    });

    return result.count;
  }
}
