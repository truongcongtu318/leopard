export type NotificationTypeView = 'order' | 'payment' | 'promo' | 'system';

export type NotificationItemView = Readonly<{
  id: string;
  type: NotificationTypeView;
  title: string;
  body: string;
  createdAt: string;
  createdAtLabel: string;
  isRead: boolean;
  orderId?: string;
}>;

type NotificationsBoundaryView = Readonly<{
  scenarioId: string;
  kind: 'loading' | 'error';
  title: string;
  message: string;
}>;

export type NotificationsContentView = Readonly<{
  scenarioId: string;
  kind: 'content';
  items: readonly NotificationItemView[];
  unreadCount: number;
  canLoadMore: boolean;
  isLoadingMore: boolean;
  notice: string | null;
}>;

export type NotificationsView = NotificationsBoundaryView | NotificationsContentView;

export type NotificationsListPage = Readonly<{
  items: readonly NotificationItemView[];
  page: number;
  totalPages: number;
}>;

export type NotificationFilter = 'all' | 'unread' | NotificationTypeView;

export type DeviceTokenPlatform = 'IOS' | 'ANDROID' | 'WEB';
