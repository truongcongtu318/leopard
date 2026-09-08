import { Platform } from 'react-native';

import { getFirebaseApp, getFirebaseWebConfig, isFirebaseConfigured } from '../../../auth/firebase';
import type { NotificationsPort } from './port';

export type PushPermissionState = 'granted' | 'denied' | 'unsupported';

let cachedToken: string | null = null;

/**
 * Web Push (via Firebase Cloud Messaging) only makes sense on the web PWA
 * build, and only when the browser actually exposes the Notification +
 * Service Worker APIs (some in-app/webview browsers do not). Everywhere
 * else this is a silent no-op — push is additive, never required for
 * in-app/Socket.IO delivery to work.
 */
export function isPushMessagingSupported(): boolean {
  return (
    Platform.OS === 'web' &&
    typeof window !== 'undefined' &&
    typeof navigator !== 'undefined' &&
    'serviceWorker' in navigator &&
    typeof Notification !== 'undefined'
  );
}

/**
 * Reads the current permission state without prompting when it has already
 * been decided, so the caller never re-prompts on every screen render —
 * only a genuinely undecided ('default') permission triggers a request.
 */
export async function requestPushPermission(): Promise<PushPermissionState> {
  if (!isPushMessagingSupported()) return 'unsupported';

  try {
    if (Notification.permission === 'granted') return 'granted';
    if (Notification.permission === 'denied') return 'denied';
    const result = await Notification.requestPermission();
    return result === 'granted' ? 'granted' : 'denied';
  } catch {
    return 'denied';
  }
}

/**
 * `public/firebase-messaging-sw.js` is a static file untouched by Metro's
 * env inlining, so it cannot read `process.env.EXPO_PUBLIC_FIREBASE_*`
 * directly. Passing the (public, client-safe) config as URL query params
 * on the registration URL is the documented FCM pattern for apps without a
 * server-side templating step for the service worker file.
 */
function buildServiceWorkerUrl(): string {
  const config = getFirebaseWebConfig();
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(config)) {
    if (value) params.set(key, value);
  }
  return `/firebase-messaging-sw.js?${params.toString()}`;
}

export async function getPushToken(vapidKey: string): Promise<string | null> {
  if (!isPushMessagingSupported() || !isFirebaseConfigured() || !vapidKey) {
    return null;
  }

  try {
    // A lazy `require` (rather than a static top-level import) keeps
    // `firebase/messaging` out of the native iOS/Android bundle graph unless
    // this call site actually executes (gated to web above), matching the
    // lazy-require convention already used by `adapter.ts`'s
    // `getDefaultHttpClient` and `notification-socket.ts`'s
    // `getDefaultToken`. A dynamic `await import(...)` was tried first but
    // does not survive Jest's CommonJS module registry (it throws
    // `ERR_VM_DYNAMIC_IMPORT_CALLBACK_MISSING_FLAG` even with the module
    // mocked), so `require` is both the working and the idiomatic choice
    // here.
    const { getMessaging, getToken } = require('firebase/messaging');
    const registration = await navigator.serviceWorker.register(buildServiceWorkerUrl());
    const messaging = getMessaging(getFirebaseApp());
    const token = await getToken(messaging, {
      vapidKey,
      serviceWorkerRegistration: registration,
    });
    cachedToken = token || null;
    return cachedToken;
  } catch {
    return null;
  }
}

export function getCachedPushToken(): string | null {
  return cachedToken;
}

export function clearCachedPushToken(): void {
  cachedToken = null;
}

/**
 * Best-effort registration flow run once per authenticated session (called
 * from the customer layout after login). Every failure path — unsupported
 * browser, permission denial, missing VAPID key, a failed register-token
 * call — resolves quietly; it must never throw, since in-app/Socket.IO
 * notifications must keep working regardless of push registration outcome.
 */
export async function registerPushToken(port: NotificationsPort): Promise<void> {
  const vapidKey = process.env.EXPO_PUBLIC_FIREBASE_VAPID_KEY;
  if (!vapidKey) return;

  const permission = await requestPushPermission();
  if (permission !== 'granted') return;

  const token = await getPushToken(vapidKey);
  if (!token) return;

  try {
    await port.registerDeviceToken(token, 'WEB');
  } catch {
    // Best-effort: registration failure must not degrade in-app delivery.
  }
}

/**
 * Removes the cached device token from the server (called when the
 * authenticated customer layout unmounts, i.e. after logout / session
 * loss). No-ops when no token was ever registered this session.
 */
export async function removePushToken(port: NotificationsPort): Promise<void> {
  const token = getCachedPushToken();
  if (!token) return;

  try {
    await port.removeDeviceToken(token);
  } catch {
    // Best-effort cleanup; nothing the caller can do about a failed removal.
  } finally {
    clearCachedPushToken();
  }
}
