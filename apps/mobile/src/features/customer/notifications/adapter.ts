import type {
  DeviceTokenPlatform,
  NotificationItemView,
  NotificationsListPage,
  NotificationTypeView,
} from './model';
import type { NotificationsPort } from './port';

export function getDefaultHttpClient(): NotificationsHttpClient {
  const { httpClient } = require('../../../api/http-client');
  return httpClient as NotificationsHttpClient;
}

export interface NotificationsHttpClient {
  get<T = unknown>(path: string): Promise<T>;
  post<T = unknown>(path: string, body?: unknown): Promise<T>;
  delete<T = unknown>(path: string, body?: unknown): Promise<T>;
}

export function deepFreeze<T>(value: T): T {
  if (value !== null && typeof value === 'object' && !Object.isFrozen(value)) {
    for (const child of Object.values(value)) {
      deepFreeze(child);
    }
    Object.freeze(value);
  }
  return value;
}

export function formatDateTime(dateInput: string | Date | null | undefined): string {
  if (!dateInput) return '';
  const date = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
  if (isNaN(date.getTime())) return '';
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  return `${hours}:${minutes} · ${day}/${month}/${year}`;
}

/**
 * True for a timestamp older than 24h (matches the "Trước đó" vs "Hôm nay"
 * grouping the screen renders). Falls back to "old" for an unparsable date
 * so a malformed timestamp never crashes the section split.
 */
export function isOlderThanOneDay(dateInput: string | null | undefined): boolean {
  if (!dateInput) return true;
  const date = new Date(dateInput);
  if (isNaN(date.getTime())) return true;
  return Date.now() - date.getTime() > 24 * 60 * 60 * 1000;
}

export function mapNotificationType(type: string): NotificationTypeView {
  switch (type) {
    case 'ORDER':
      return 'order';
    case 'PAYMENT':
      return 'payment';
    case 'PROMO':
      return 'promo';
    case 'SYSTEM':
    default:
      return 'system';
  }
}

export interface NotificationApiResponse {
  id: string;
  type: string;
  title: string;
  body: string;
  data?: { orderId?: string } | Record<string, unknown> | null;
  isRead: boolean;
  readAt?: string | null;
  createdAt: string;
}

export interface NotificationsListApiResponse {
  items: NotificationApiResponse[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

export function extractOrderId(data: NotificationApiResponse['data']): string | undefined {
  if (data && typeof data === 'object' && typeof (data as { orderId?: unknown }).orderId === 'string') {
    return (data as { orderId: string }).orderId;
  }
  return undefined;
}

export function mapNotificationToView(item: NotificationApiResponse): NotificationItemView {
  const orderId = extractOrderId(item.data);
  return {
    id: item.id,
    type: mapNotificationType(item.type),
    title: item.title,
    body: item.body,
    createdAt: item.createdAt,
    createdAtLabel: formatDateTime(item.createdAt),
    isRead: item.isRead,
    ...(orderId ? { orderId } : {}),
  };
}

const DEFAULT_PAGE_SIZE = 20;

export function createCustomerNotificationsHttpAdapter(
  client?: NotificationsHttpClient,
): NotificationsPort {
  const getClient = (): NotificationsHttpClient => client ?? getDefaultHttpClient();

  return {
    async getListPage(page: number): Promise<NotificationsListPage> {
      const activeClient = getClient();
      const response = await activeClient.get<NotificationsListApiResponse>(
        `/notifications?page=${page}&pageSize=${DEFAULT_PAGE_SIZE}`,
      );

      return deepFreeze<NotificationsListPage>({
        items: response.items.map(mapNotificationToView),
        page: response.page,
        totalPages: response.totalPages,
      });
    },

    async getUnreadCount(): Promise<number> {
      const activeClient = getClient();
      const response = await activeClient.get<{ count: number }>('/notifications/unread-count');
      return response.count;
    },

    async markRead(id: string): Promise<void> {
      const activeClient = getClient();
      await activeClient.post(`/notifications/${id}/read`);
    },

    async markAllRead(): Promise<void> {
      const activeClient = getClient();
      await activeClient.post('/notifications/read-all');
    },

    async registerDeviceToken(token: string, platform: DeviceTokenPlatform): Promise<void> {
      const activeClient = getClient();
      await activeClient.post('/notifications/register-token', { token, platform });
    },

    async removeDeviceToken(token: string): Promise<void> {
      const activeClient = getClient();
      await activeClient.delete('/notifications/register-token', { token });
    },
  };
}
