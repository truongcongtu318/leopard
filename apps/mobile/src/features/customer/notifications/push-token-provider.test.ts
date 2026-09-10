import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';
import { Platform } from 'react-native';

jest.mock('@leopard/mobile-core/src/auth/firebase', () => ({
  isFirebaseConfigured: jest.fn(() => true),
  getFirebaseApp: jest.fn(() => ({ name: 'fake-app' })),
  getFirebaseWebConfig: jest.fn(() => ({
    apiKey: 'api-key',
    authDomain: 'auth-domain',
    projectId: 'project-id',
    storageBucket: 'storage-bucket',
    messagingSenderId: 'sender-id',
    appId: 'app-id',
  })),
}));

const mockGetMessaging = jest.fn<(...args: unknown[]) => { __messaging: boolean }>(() => ({
  __messaging: true,
}));
const mockGetToken = jest
  .fn<(...args: unknown[]) => Promise<string>>()
  .mockResolvedValue('fcm-token-abc');

jest.mock('firebase/messaging', () => ({
  getMessaging: (...args: unknown[]) => mockGetMessaging(...args),
  getToken: (...args: unknown[]) => mockGetToken(...args),
}));

import * as firebaseAuth from '@leopard/mobile-core/src/auth/firebase';
import {
  clearCachedPushToken,
  getCachedPushToken,
  getPushToken,
  isPushMessagingSupported,
  registerPushToken,
  removePushToken,
  requestPushPermission,
} from './push-token-provider';
import type { NotificationsPort } from './port';

function makePort(overrides: Partial<NotificationsPort> = {}): NotificationsPort {
  return {
    getListPage: jest.fn() as never,
    getUnreadCount: jest.fn() as never,
    markRead: jest.fn() as never,
    markAllRead: jest.fn() as never,
    registerDeviceToken: jest.fn(async () => undefined),
    removeDeviceToken: jest.fn(async () => undefined),
    ...overrides,
  };
}

describe('push-token-provider on a non-web platform', () => {
  it('reports push messaging as unsupported', () => {
    expect(Platform.OS).not.toBe('web');
    expect(isPushMessagingSupported()).toBe(false);
  });

  it('resolves permission requests as unsupported without throwing', async () => {
    await expect(requestPushPermission()).resolves.toBe('unsupported');
  });

  it('registerPushToken no-ops without calling the port', async () => {
    const port = makePort();
    process.env.EXPO_PUBLIC_FIREBASE_VAPID_KEY = 'vapid-key';

    await registerPushToken(port);

    expect(port.registerDeviceToken).not.toHaveBeenCalled();
  });

  it('removePushToken no-ops when no token was ever cached', async () => {
    const port = makePort();
    clearCachedPushToken();

    await removePushToken(port);

    expect(port.removeDeviceToken).not.toHaveBeenCalled();
  });
});

describe('push-token-provider on a web platform with Notification/serviceWorker support', () => {
  const registerServiceWorker = jest.fn<(url: string) => Promise<unknown>>().mockResolvedValue({
    __registration: true,
  });
  let requestPermissionMock: jest.Mock<() => Promise<string>>;

  beforeEach(() => {
    (Platform as { OS: string }).OS = 'web';
    (global as Record<string, unknown>).window = {};
    (global as Record<string, unknown>).navigator = {
      serviceWorker: { register: registerServiceWorker },
    };
    requestPermissionMock = jest.fn<() => Promise<string>>().mockResolvedValue('granted');
    (global as Record<string, unknown>).Notification = {
      permission: 'default',
      requestPermission: requestPermissionMock,
    };
    clearCachedPushToken();
    registerServiceWorker.mockClear();
    mockGetMessaging.mockClear();
    mockGetToken.mockClear();
  });

  afterEach(() => {
    (Platform as { OS: string }).OS = 'ios';
    delete (global as Record<string, unknown>).window;
    delete (global as Record<string, unknown>).navigator;
    delete (global as Record<string, unknown>).Notification;
  });

  it('reports push messaging as supported', () => {
    expect(isPushMessagingSupported()).toBe(true);
  });

  it('returns the existing permission without re-prompting when already granted', async () => {
    (global as { Notification: { permission: string } }).Notification.permission = 'granted';

    await expect(requestPushPermission()).resolves.toBe('granted');
    expect(requestPermissionMock).not.toHaveBeenCalled();
  });

  it('returns denied without re-prompting when already denied', async () => {
    (global as { Notification: { permission: string } }).Notification.permission = 'denied';

    await expect(requestPushPermission()).resolves.toBe('denied');
    expect(requestPermissionMock).not.toHaveBeenCalled();
  });

  it('prompts exactly once when permission is undecided, then reflects the user choice', async () => {
    await expect(requestPushPermission()).resolves.toBe('granted');
    expect(requestPermissionMock).toHaveBeenCalledTimes(1);
  });

  it('fetches a token, registering the service worker with the public Firebase config as query params', async () => {
    const token = await getPushToken('vapid-key-1');

    expect(token).toBe('fcm-token-abc');
    expect(registerServiceWorker).toHaveBeenCalledWith(
      expect.stringContaining('/firebase-messaging-sw.js?'),
    );
    const calledUrl = registerServiceWorker.mock.calls[0][0] as string;
    expect(calledUrl).toContain('apiKey=api-key');
    expect(calledUrl).toContain('projectId=project-id');
    expect(mockGetToken).toHaveBeenCalledWith(
      { __messaging: true },
      expect.objectContaining({ vapidKey: 'vapid-key-1' }),
    );
    expect(getCachedPushToken()).toBe('fcm-token-abc');
  });

  it('returns null and caches nothing when Firebase is not configured', async () => {
    (firebaseAuth.isFirebaseConfigured as jest.Mock<() => boolean>).mockReturnValueOnce(false);

    const token = await getPushToken('vapid-key-1');

    expect(token).toBeNull();
    expect(getCachedPushToken()).toBeNull();
  });

  it('returns null when getToken throws, without letting the error escape', async () => {
    mockGetToken.mockRejectedValueOnce(new Error('boom'));

    await expect(getPushToken('vapid-key-1')).resolves.toBeNull();
  });

  it('registerPushToken skips silently when no VAPID key is configured', async () => {
    const port = makePort();
    delete process.env.EXPO_PUBLIC_FIREBASE_VAPID_KEY;

    await registerPushToken(port);

    expect(port.registerDeviceToken).not.toHaveBeenCalled();
  });

  it('registerPushToken skips silently when permission is denied', async () => {
    const port = makePort();
    process.env.EXPO_PUBLIC_FIREBASE_VAPID_KEY = 'vapid-key-1';
    (global as { Notification: { permission: string } }).Notification.permission = 'denied';

    await registerPushToken(port);

    expect(port.registerDeviceToken).not.toHaveBeenCalled();
  });

  it('registerPushToken registers the fetched token as a WEB device token', async () => {
    const port = makePort();
    process.env.EXPO_PUBLIC_FIREBASE_VAPID_KEY = 'vapid-key-1';
    (global as { Notification: { permission: string } }).Notification.permission = 'granted';

    await registerPushToken(port);

    expect(port.registerDeviceToken).toHaveBeenCalledWith('fcm-token-abc', 'WEB');
  });

  it('registerPushToken never throws even when the register-token call fails', async () => {
    const port = makePort({
      registerDeviceToken: jest.fn(async () => {
        throw new Error('network down');
      }),
    });
    process.env.EXPO_PUBLIC_FIREBASE_VAPID_KEY = 'vapid-key-1';
    (global as { Notification: { permission: string } }).Notification.permission = 'granted';

    await expect(registerPushToken(port)).resolves.toBeUndefined();
  });

  it('removePushToken removes the cached token and clears the cache even on failure', async () => {
    process.env.EXPO_PUBLIC_FIREBASE_VAPID_KEY = 'vapid-key-1';
    (global as { Notification: { permission: string } }).Notification.permission = 'granted';
    await getPushToken('vapid-key-1');
    expect(getCachedPushToken()).toBe('fcm-token-abc');

    const port = makePort({
      removeDeviceToken: jest.fn(async () => {
        throw new Error('network down');
      }),
    });

    await removePushToken(port);

    expect(port.removeDeviceToken).toHaveBeenCalledWith('fcm-token-abc');
    expect(getCachedPushToken()).toBeNull();
  });
});
