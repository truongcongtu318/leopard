import type { Notification } from '@prisma/client';
import type { NotificationCreatedEvent } from '@leopard/shared';

import { extractOrderId } from './notification-data.util.js';

export function sessionErrorEvent(code: string, message: string): { code: string; message: string } {
  return { code, message };
}

/**
 * Maps a persisted `Notification` row to the realtime wire payload. Never
 * forwards `userId` (the room already scopes delivery) or the raw `data`
 * JSON — only the `orderId` field is lifted out of it, when present.
 */
export function notificationCreatedEvent(notification: Notification): NotificationCreatedEvent {
  const orderId = extractOrderId(notification.data);

  return {
    id: notification.id,
    type: notification.type,
    title: notification.title,
    body: notification.body,
    createdAt: notification.createdAt.toISOString(),
    ...(orderId ? { orderId } : {}),
  };
}
