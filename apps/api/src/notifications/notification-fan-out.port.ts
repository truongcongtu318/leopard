import type { Notification } from '@prisma/client';

/**
 * Extension point for realtime (Socket.IO) and push (FCM) delivery.
 *
 * `NotificationsService.create` calls this after the notification row is
 * persisted. No implementation is bound yet — Task 2 wires a concrete
 * adapter (socket emit + FCM send) into `NOTIFICATION_FAN_OUT_PORT`. Until
 * then, delivery is simply skipped: the notification still exists and is
 * visible through the REST API in this task.
 */
export interface NotificationFanOutPort {
  publish(notification: Notification): void | Promise<void>;
}

export const NOTIFICATION_FAN_OUT_PORT = Symbol('NOTIFICATION_FAN_OUT_PORT');
