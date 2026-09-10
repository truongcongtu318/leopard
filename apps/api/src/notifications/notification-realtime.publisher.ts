import { Injectable, Logger } from '@nestjs/common';
import type { Notification } from '@prisma/client';

import type { NotificationFanOutPort } from './notification-fan-out.port.js';
import { extractOrderId } from './notification-data.util.js';
import { FirebaseMessagingService } from './firebase-messaging.service.js';
import { NotificationsGateway } from './notifications.gateway.js';
import { notificationCreatedEvent } from './notifications.events.js';
import { NotificationsRepository } from './notifications.repository.js';

/**
 * Concrete `NotificationFanOutPort` bound to `NOTIFICATION_FAN_OUT_PORT` in
 * `NotificationsModule`. Runs after `NotificationsService.create` has
 * already persisted the row: emits the realtime socket event to the
 * recipient's user room, then sends FCM push to their device tokens,
 * pruning any token Firebase reports as permanently invalid.
 *
 * Both steps are best-effort — a socket emit failure is logged and does not
 * prevent the push attempt; `NotificationsService.dispatchFanOut` also
 * swallows anything this whole method rejects with, so persistence always
 * succeeds independent of delivery.
 */
@Injectable()
export class NotificationRealtimePublisher implements NotificationFanOutPort {
  private readonly logger = new Logger(NotificationRealtimePublisher.name);

  public constructor(
    private readonly gateway: NotificationsGateway,
    private readonly repo: NotificationsRepository,
    private readonly fcm: FirebaseMessagingService,
  ) {}

  public async publish(notification: Notification): Promise<void> {
    this.emitSocket(notification);
    await this.sendPush(notification);
  }

  private emitSocket(notification: Notification): void {
    try {
      this.gateway.emitToUser(notification.userId, notificationCreatedEvent(notification));
    } catch (error) {
      this.logger.warn(
        `Socket emit failed for notification ${notification.id}: ${describeError(error)}`,
      );
    }
  }

  private async sendPush(notification: Notification): Promise<void> {
    const tokens = await this.repo.findTokensForUser(notification.userId);
    if (tokens.length === 0) {
      return;
    }

    const orderId = extractOrderId(notification.data);
    const { invalidTokens } = await this.fcm.send(
      tokens.map((deviceToken) => deviceToken.token),
      {
        notificationId: notification.id,
        type: notification.type,
        title: notification.title,
        body: notification.body,
        ...(orderId ? { orderId } : {}),
      },
    );

    await Promise.all(
      invalidTokens.map((token) => this.repo.removeToken(notification.userId, token)),
    );
  }
}

function describeError(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
