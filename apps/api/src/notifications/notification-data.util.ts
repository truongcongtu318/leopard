import type { Prisma } from '@prisma/client';

/**
 * Safely reads an `orderId` string out of a notification's free-form `data`
 * JSON, if present. Returns `undefined` for anything else (null, non-object,
 * missing field, non-string value) — callers must never forward `data`
 * itself downstream (socket payloads, FCM data) since it may carry fields
 * not meant for the client.
 */
export function extractOrderId(data: Prisma.JsonValue | null | undefined): string | undefined {
  if (!data || typeof data !== 'object' || Array.isArray(data)) {
    return undefined;
  }

  const value = (data as Record<string, unknown>).orderId;
  return typeof value === 'string' ? value : undefined;
}
