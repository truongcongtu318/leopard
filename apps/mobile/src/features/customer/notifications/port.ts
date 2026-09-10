import type { DeviceTokenPlatform, NotificationsListPage } from './model';

export type { DeviceTokenPlatform };

export type NotificationsPort = Readonly<{
  getListPage: (page: number) => Promise<NotificationsListPage>;
  getUnreadCount: () => Promise<number>;
  markRead: (id: string) => Promise<void>;
  markAllRead: () => Promise<void>;
  registerDeviceToken: (token: string, platform: DeviceTokenPlatform) => Promise<void>;
  removeDeviceToken: (token: string) => Promise<void>;
}>;
