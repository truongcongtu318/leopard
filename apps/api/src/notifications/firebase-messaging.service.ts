import { Injectable, Logger } from '@nestjs/common';

import {
  firebaseErrorCode,
  getOrCreateFirebaseAdminApp,
} from '../auth/providers/firebase-admin.verifier.js';

export interface PushNotificationInput {
  readonly notificationId: string;
  readonly type: string;
  readonly title: string;
  readonly body: string;
  readonly orderId?: string;
}

export interface FcmMessage {
  readonly token: string;
  readonly notification: { readonly title: string; readonly body: string };
  readonly data: Readonly<Record<string, string>>;
}

export type FcmSender = (message: FcmMessage) => Promise<void>;

export interface FirebaseMessagingOptions {
  /** Injected in tests to bypass the real firebase-admin SDK entirely. */
  readonly sender?: FcmSender;
  readonly source?: NodeJS.ProcessEnv;
}

export interface PushSendResult {
  /** Tokens Firebase reported as permanently invalid — safe to delete. */
  readonly invalidTokens: readonly string[];
}

// Firebase Admin Messaging error codes that mean the token itself is dead
// (unregistered, malformed, or the app it belonged to was uninstalled). Any
// other error (network, quota, transient outage) leaves the token alone.
const PERMANENT_INVALID_TOKEN_CODES = new Set([
  'messaging/registration-token-not-registered',
  'messaging/invalid-registration-token',
  'messaging/invalid-argument',
]);

function isFcmEnabled(source: NodeJS.ProcessEnv): boolean {
  // FCM_ENABLED has no env.schema.ts entry yet (see Task 2 report) — read
  // directly with a safe default-off fallback until that lands.
  return (source.FCM_ENABLED ?? '').trim().toLowerCase() === 'true';
}

async function createDefaultSender(source: NodeJS.ProcessEnv): Promise<FcmSender | undefined> {
  const projectId = source.FIREBASE_PROJECT_ID?.trim();
  if (!projectId) {
    return undefined;
  }

  const [{ getMessaging }, app] = await Promise.all([
    import('firebase-admin/messaging'),
    getOrCreateFirebaseAdminApp(projectId, source),
  ]);
  const messaging = getMessaging(app);

  return async (message) => {
    await messaging.send(message);
  };
}

/**
 * Sends push notifications via Firebase Cloud Messaging, reusing the shared
 * `leopard-auth` Firebase Admin app (see `getOrCreateFirebaseAdminApp`)
 * rather than initializing a second one. Safe no-op — with structured
 * logging, never throwing — when `FCM_ENABLED` isn't `"true"` or Firebase
 * credentials aren't configured in this environment.
 */
@Injectable()
export class FirebaseMessagingService {
  private readonly logger = new Logger(FirebaseMessagingService.name);
  private readonly customSender: FcmSender | undefined;
  private readonly source: NodeJS.ProcessEnv;

  public constructor(options: FirebaseMessagingOptions = {}) {
    this.customSender = options.sender;
    this.source = options.source ?? process.env;
  }

  public async send(
    tokens: readonly string[],
    input: PushNotificationInput,
  ): Promise<PushSendResult> {
    if (tokens.length === 0) {
      return { invalidTokens: [] };
    }

    if (!isFcmEnabled(this.source)) {
      this.logger.debug(
        `FCM disabled (FCM_ENABLED!=true); skipping push for notification ${input.notificationId}`,
      );
      return { invalidTokens: [] };
    }

    const sender = await this.resolveSender(input.notificationId);
    if (!sender) {
      return { invalidTokens: [] };
    }

    return this.sendToEachToken(sender, tokens, input);
  }

  private async resolveSender(notificationId: string): Promise<FcmSender | undefined> {
    if (this.customSender) {
      return this.customSender;
    }

    try {
      const sender = await createDefaultSender(this.source);
      if (!sender) {
        this.logger.warn(
          `FCM credentials unavailable (no FIREBASE_PROJECT_ID); skipping push for notification ${notificationId}`,
        );
      }
      return sender;
    } catch (error) {
      this.logger.warn(
        `FCM initialization failed; skipping push for notification ${notificationId}: ${describeError(error)}`,
      );
      return undefined;
    }
  }

  private async sendToEachToken(
    sender: FcmSender,
    tokens: readonly string[],
    input: PushNotificationInput,
  ): Promise<PushSendResult> {
    const invalidTokens: string[] = [];
    const payload = buildPayload(input);

    for (const token of tokens) {
      try {
        await sender({ token, notification: payload.notification, data: payload.data });
      } catch (error) {
        if (PERMANENT_INVALID_TOKEN_CODES.has(firebaseErrorCode(error))) {
          invalidTokens.push(token);
        } else {
          this.logger.warn(
            `FCM send failed (transient) for notification ${input.notificationId}: ${describeError(error)}`,
          );
        }
      }
    }

    return { invalidTokens };
  }
}

function buildPayload(input: PushNotificationInput): {
  readonly notification: { readonly title: string; readonly body: string };
  readonly data: Readonly<Record<string, string>>;
} {
  return {
    notification: { title: input.title, body: input.body },
    data: {
      notificationId: input.notificationId,
      type: input.type,
      ...(input.orderId ? { orderId: input.orderId } : {}),
    },
  };
}

function describeError(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
