import { useQueryClient, useInfiniteQuery, useMutation, useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { useMemo } from 'react';

import { ScreenScaffold } from '../../../ui/ScreenScaffold';
import { ScreenState } from '../../../ui/ScreenState';
import { createCustomerNotificationsHttpAdapter } from './adapter';
import type { NotificationItemView, NotificationsListPage, NotificationsView } from './model';
import { NotificationsScreen } from './NotificationsScreen';
import { notificationsListQueryKey, notificationsUnreadCountQueryKey } from './query-keys';

interface InfiniteListData {
  pages: NotificationsListPage[];
  pageParams: unknown[];
}

interface MutationRollbackContext {
  previousList?: InfiniteListData;
  previousUnread?: number;
}

export function NotificationsRuntime() {
  const port = useMemo(() => createCustomerNotificationsHttpAdapter(), []);
  const queryClient = useQueryClient();
  const router = useRouter();

  const listQuery = useInfiniteQuery({
    queryKey: notificationsListQueryKey,
    queryFn: ({ pageParam }) => port.getListPage(pageParam as number),
    initialPageParam: 1,
    getNextPageParam: (lastPage) =>
      lastPage.page < lastPage.totalPages ? lastPage.page + 1 : undefined,
  });

  const unreadQuery = useQuery({
    queryKey: notificationsUnreadCountQueryKey,
    queryFn: () => port.getUnreadCount(),
  });

  async function snapshotForRollback(): Promise<MutationRollbackContext> {
    await queryClient.cancelQueries({ queryKey: notificationsListQueryKey });
    await queryClient.cancelQueries({ queryKey: notificationsUnreadCountQueryKey });
    return {
      previousList: queryClient.getQueryData<InfiniteListData>(notificationsListQueryKey),
      previousUnread: queryClient.getQueryData<number>(notificationsUnreadCountQueryKey),
    };
  }

  function rollback(context: MutationRollbackContext | undefined): void {
    if (context?.previousList) {
      queryClient.setQueryData(notificationsListQueryKey, context.previousList);
    }
    if (context?.previousUnread !== undefined) {
      queryClient.setQueryData(notificationsUnreadCountQueryKey, context.previousUnread);
    }
  }

  function invalidateAll(): void {
    void queryClient.invalidateQueries({ queryKey: notificationsListQueryKey });
    void queryClient.invalidateQueries({ queryKey: notificationsUnreadCountQueryKey });
  }

  const markReadMutation = useMutation({
    mutationFn: (id: string) => port.markRead(id),
    onMutate: async (id: string): Promise<MutationRollbackContext> => {
      const context = await snapshotForRollback();
      const wasUnread =
        context.previousList?.pages
          .flatMap((page) => page.items)
          .find((item) => item.id === id)?.isRead === false;

      queryClient.setQueryData<InfiniteListData>(notificationsListQueryKey, (old) => {
        if (!old) return old;
        return {
          ...old,
          pages: old.pages.map((page) => ({
            ...page,
            items: page.items.map((item) => (item.id === id ? { ...item, isRead: true } : item)),
          })),
        };
      });

      if (wasUnread && typeof context.previousUnread === 'number') {
        queryClient.setQueryData(
          notificationsUnreadCountQueryKey,
          Math.max(0, context.previousUnread - 1),
        );
      }

      return context;
    },
    onError: (_error, _id, context) => rollback(context),
    onSettled: () => invalidateAll(),
  });

  const markAllReadMutation = useMutation({
    mutationFn: () => port.markAllRead(),
    onMutate: async (): Promise<MutationRollbackContext> => {
      const context = await snapshotForRollback();

      queryClient.setQueryData<InfiniteListData>(notificationsListQueryKey, (old) => {
        if (!old) return old;
        return {
          ...old,
          pages: old.pages.map((page) => ({
            ...page,
            items: page.items.map((item) => ({ ...item, isRead: true })),
          })),
        };
      });
      queryClient.setQueryData(notificationsUnreadCountQueryKey, 0);

      return context;
    },
    onError: (_error, _vars, context) => rollback(context),
    onSettled: () => invalidateAll(),
  });

  function handlePressItem(item: NotificationItemView): void {
    if (!item.isRead) {
      markReadMutation.mutate(item.id);
    }
    if (item.orderId) {
      router.push(`/customer/orders/${item.orderId}`);
    }
  }

  if (listQuery.isPending) {
    return (
      <ScreenScaffold onBack={() => router.back()} title="Thông báo">
        <ScreenState state="loading" />
      </ScreenScaffold>
    );
  }

  if (!listQuery.data) {
    return (
      <ScreenScaffold onBack={() => router.back()} title="Thông báo">
        <ScreenState actionLabel="Thử lại" onAction={() => listQuery.refetch()} state="error" />
      </ScreenScaffold>
    );
  }

  const items: readonly NotificationItemView[] = listQuery.data.pages.flatMap(
    (page) => page.items,
  );
  const unreadCount = unreadQuery.data ?? items.filter((item) => !item.isRead).length;

  const view: NotificationsView = {
    scenarioId: 'CM-NOTIFICATIONS-CONTENT',
    kind: 'content',
    items,
    unreadCount,
    canLoadMore: Boolean(listQuery.hasNextPage),
    isLoadingMore: listQuery.isFetchingNextPage,
    // `isFetchNextPageError` (added to InfiniteQueryObserverResult specifically for this
    // case) is true only when the failed fetch was a fetchNextPage() call, not the initial
    // load — so a load-more failure keeps the already-rendered list and just shows this
    // notice, instead of falling into the full-page error branch above.
    notice: listQuery.isFetchNextPageError ? 'Không thể tải thêm thông báo.' : null,
  };

  return (
    <NotificationsScreen
      onBack={() => router.back()}
      onLoadMore={() => void listQuery.fetchNextPage()}
      onMarkAllRead={() => markAllReadMutation.mutate()}
      onPressItem={handlePressItem}
      view={view}
    />
  );
}
