import { Inject, Injectable, Logger, Optional } from '@nestjs/common';
import type { DeviceToken, Notification, NotificationType } from '@prisma/client';

import { DomainError } from '../common/domain-error.js';
import {
  NOTIFICATION_FAN_OUT_PORT,
  type NotificationFanOutPort,
} from './notification-fan-out.port.js';
import type { NotificationPage } from './notifications.repository.js';
import { NotificationsRepository } from './notifications.repository.js';

export interface CreateNotificationInput {
  readonly userId: string;
  readonly type: NotificationType;
  readonly title: string;
  readonly body: string;
  readonly data?: Record<string, unknown> | null;
}

const DEFAULT_PAGE = 1;
const DEFAULT_PAGE_SIZE = 20;

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(
    private readonly repo: NotificationsRepository,
    @Optional()
    @Inject(NOTIFICATION_FAN_OUT_PORT)
    private readonly fanOut?: NotificationFanOutPort,
  ) {}

  /**
   * Persists the notification, then fans it out over realtime/push
   * channels. Task 2 binds `NOTIFICATION_FAN_OUT_PORT`; until then
   * `fanOut` is undefined and delivery is skipped — the row still exists
   * and is visible through `list`/`unreadCount`. Fan-out failures are
   * logged and swallowed: a delivery problem must never fail a write that
   * already succeeded.
   */
  async create(input: CreateNotificationInput): Promise<Notification> {
    const notification = await this.repo.create({
      userId: input.userId,
      type: input.type,
      title: input.title,
      body: input.body,
      ...(input.data !== undefined ? { data: input.data } : {}),
    });

    this.dispatchFanOut(notification);

    return notification;
  }

  async list(userId: string, page?: number, pageSize?: number): Promise<NotificationPage> {
    return this.repo.list(userId, page ?? DEFAULT_PAGE, pageSize ?? DEFAULT_PAGE_SIZE);
  }

  async unreadCount(userId: string): Promise<{ count: number }> {
    const count = await this.repo.countUnread(userId);
    return { count };
  }

  /** Idempotent: marking an already-read notification read again just returns it, no error. */
  async markRead(userId: string, id: string): Promise<Notification> {
    const updated = await this.repo.markRead(userId, id);
    if (!updated) {
      throw new DomainError('NOTIFICATION_NOT_FOUND', 404, 'Không tìm thấy thông báo');
    }
    return updated;
  }

  async markAllRead(userId: string): Promise<{ count: number }> {
    const count = await this.repo.markAllRead(userId);
    return { count };
  }

  async registerToken(userId: string, token: string, platform: string): Promise<DeviceToken> {
    return this.repo.upsertToken(userId, token, platform);
  }

  /** Idempotent: removing a token that is already gone (or never belonged to this user) is a no-op success. */
  async removeToken(userId: string, token: string): Promise<void> {
    await this.repo.removeToken(userId, token);
  }

  private dispatchFanOut(notification: Notification): void {
    if (!this.fanOut) {
      return;
    }

    Promise.resolve(this.fanOut.publish(notification)).catch((error: unknown) => {
      this.logger.warn(
        `Notification fan-out failed for ${notification.id}: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    });
  }
}
