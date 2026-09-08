import type { QueryClient } from '@tanstack/react-query';

import type { CustomerNotificationSocketManager } from './notification-socket';
import type { NotificationItemView, NotificationsListPage } from './model';
import type { NotificationsPort } from './port';
import { registerPushToken, removePushToken } from './push-token-provider';
import { notificationsListQueryKey, notificationsUnreadCountQueryKey } from './query-keys';

export interface NotificationsBootstrap {
  start: () => void;
  stop: () => Promise<void>;
}

interface InfiniteListData {
  pages: NotificationsListPage[];
  pageParams: unknown[];
}

/**
 * Wires the live `/notifications` socket + push-token lifecycle into the
 * shared React Query cache. Intentionally framework-agnostic (no hooks) so
 * it can be unit tested without rendering a component tree — the thin
 * `useNotificationsBootstrap` hook is the only React-facing wrapper.
 */
export function createNotificationsBootstrap(options: {
  queryClient: QueryClient;
  socketManager: CustomerNotificationSocketManager;
  port: NotificationsPort;
}): NotificationsBootstrap {
  const { queryClient, socketManager, port } = options;
  let unsubscribe: (() => void) | null = null;

  function prependNotification(item: NotificationItemView): void {
    queryClient.setQueryData<InfiniteListData>(notificationsListQueryKey, (old) => {
      if (!old || old.pages.length === 0) return old;

      const alreadyPresent = old.pages.some((page) =>
        page.items.some((existing) => existing.id === item.id),
      );
      if (alreadyPresent) return old;

      const [firstPage, ...restPages] = old.pages;
      const updatedFirstPage: NotificationsListPage = {
        ...firstPage,
        items: [item, ...firstPage.items],
      };
      return { ...old, pages: [updatedFirstPage, ...restPages] };
    });

    void queryClient.invalidateQueries({ queryKey: notificationsUnreadCountQueryKey });
  }

  return {
    start(): void {
      unsubscribe = socketManager.subscribe({
        onNotificationCreated: prependNotification,
      });
      void socketManager.connect();
      void registerPushToken(port);
    },

    async stop(): Promise<void> {
      unsubscribe?.();
      unsubscribe = null;
      socketManager.destroy();
      await removePushToken(port);
    },
  };
}
