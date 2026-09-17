import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Alert } from 'react-native';

import { createDriverProfileHttpAdapter } from '../profile/adapter';
import { createDriverWalletHttpAdapter } from '../wallet/adapter';
import { createDriverHistoryHttpAdapter, sumTodayEarnings } from '../history/adapter';
import { createDriverPerformanceHttpAdapter } from '../performance/adapter';
import { createDriverHttpAdapter } from './adapter';
import { DriverOrdersScreen } from './DriverOrdersScreen';
import { useDispatchOffer } from './useDispatchOffer';

export type DriverOrdersListRuntimeProps = Readonly<{
  onOpenOrder: (orderId: string) => void;
  onNavigate?: (route: string) => void;
  focusKey?: number;
}>;

export function DriverOrdersListRuntime({
  focusKey,
  onNavigate,
  onOpenOrder,
}: DriverOrdersListRuntimeProps) {
  const port = useMemo(() => createDriverHttpAdapter(), []);
  const profilePort = useMemo(() => createDriverProfileHttpAdapter(), []);
  const walletPort = useMemo(() => createDriverWalletHttpAdapter(), []);
  const historyPort = useMemo(() => createDriverHistoryHttpAdapter(), []);
  const performancePort = useMemo(() => createDriverPerformanceHttpAdapter(), []);
  const queryClient = useQueryClient();
  const queryKey = ['driver', 'orders'];

  const query = useQuery({
    queryKey,
    queryFn: () => port.getOrdersView(),
  });

  const profileQuery = useQuery({
    queryKey: ['driver', 'profile'],
    queryFn: () => profilePort.getProfileView(),
    staleTime: 5 * 60 * 1000,
  });

  const walletQuery = useQuery({
    queryKey: ['driver', 'wallet', 'summary'],
    queryFn: () => walletPort.getWalletSummary(),
    staleTime: 60 * 1000,
  });
  const historyQuery = useQuery({
    queryKey: ['driver', 'order-history'],
    queryFn: () => historyPort.getHistory(),
    staleTime: 60 * 1000,
  });
  const performanceQuery = useQuery({
    queryKey: ['driver', 'performance'],
    queryFn: () => performancePort.getPerformanceSummary(),
    staleTime: 5 * 60 * 1000,
  });
  const todayEarnings = sumTodayEarnings(historyQuery.data?.items ?? []);

  const prevFocusKeyRef = useRef(focusKey);
  useEffect(() => {
    if (
      prevFocusKeyRef.current !== undefined &&
      focusKey !== undefined &&
      focusKey > prevFocusKeyRef.current
    ) {
      void query.refetch();
      void profileQuery.refetch();
      void walletQuery.refetch();
      void historyQuery.refetch();
      void performanceQuery.refetch();
    }
    prevFocusKeyRef.current = focusKey;
  }, [focusKey, query, profileQuery, walletQuery, historyQuery, performanceQuery]);

  // If driver has an active trip, automatically route to the active order detail screen
  useEffect(() => {
    if (query.data && query.data.kind === 'content' && query.data.activeTrip?.id) {
      onOpenOrder(query.data.activeTrip.id);
    }
  }, [query.data, onOpenOrder]);

  const driverIdentity = useMemo(() => {
    if (profileQuery.data && profileQuery.data.kind === 'content') {
      return {
        name: profileQuery.data.name ?? null,
        avatarUrl: profileQuery.data.avatarUrl ?? null,
        vehicleLabel: profileQuery.data.vehicleLabel ?? null,
      };
    }
    return undefined;
  }, [profileQuery.data]);

  const { offer, declineOffer } = useDispatchOffer();
  const [isAcceptingOffer, setIsAcceptingOffer] = useState(false);

  if (query.isPending) {
    return (
      <DriverOrdersScreen
        driverIdentity={driverIdentity}
        earningsTodayVnd={todayEarnings.amountVnd}
        ratingAvg={performanceQuery.data?.ratingAvg}
        walletBalanceVnd={walletQuery.data?.availableBalanceVnd}
        onNavigate={onNavigate}
        onOpenOrder={onOpenOrder}
        onRetry={() => {
          void query.refetch();
          void profileQuery.refetch();
        }}
        view={{
          kind: 'loading',
          message: '',
          scenarioId: 'D-LIST-LOADING',
          title: '',
        }}
      />
    );
  }

  // If query errored out and there is NO cached data, show error state
  if (query.isError && !query.data) {
    return (
      <DriverOrdersScreen
        driverIdentity={driverIdentity}
        earningsTodayVnd={todayEarnings.amountVnd}
        ratingAvg={performanceQuery.data?.ratingAvg}
        walletBalanceVnd={walletQuery.data?.availableBalanceVnd}
        onNavigate={onNavigate}
        onOpenOrder={onOpenOrder}
        onRetry={() => {
          void query.refetch();
          void profileQuery.refetch();
        }}
        view={{
          kind: 'error',
          message: query.error?.message || 'Đã có lỗi xảy ra trong quá trình tải dữ liệu.',
          scenarioId: 'D-LIST-ERROR',
          title: 'Không thể tải danh sách đơn',
        }}
      />
    );
  }

  if (!query.data) {
    return null;
  }

  async function handleSetAvailability(commandId: string) {
    await port.setAvailability(commandId);
    void queryClient.invalidateQueries({ queryKey });
  }

  async function handleAcceptOffer(orderId: string) {
    if (isAcceptingOffer) return;
    setIsAcceptingOffer(true);
    try {
      const result = await port.acceptOrder(orderId);
      void queryClient.invalidateQueries({ queryKey });
      declineOffer();
      if (result.kind === 'content') {
        onOpenOrder(orderId);
      } else if (result.kind === 'conflict') {
        Alert.alert(result.title, result.message);
      }
    } catch (err: any) {
      Alert.alert(
        'Không thể nhận đơn',
        err instanceof Error ? err.message : 'Đã có lỗi xảy ra khi tiếp nhận đơn hàng.',
      );
    } finally {
      setIsAcceptingOffer(false);
    }
  }

  return (
    <DriverOrdersScreen
      driverIdentity={driverIdentity}
      earningsTodayVnd={todayEarnings.amountVnd}
      ratingAvg={performanceQuery.data?.ratingAvg}
      walletBalanceVnd={walletQuery.data?.availableBalanceVnd}
      incomingOffer={offer}
      isAcceptingIncomingOffer={isAcceptingOffer}
      networkError={query.isError ? (query.error?.message ?? 'Lỗi kết nối máy chủ') : null}
      onAcceptIncomingOffer={(orderId) => void handleAcceptOffer(orderId)}
      onDeclineIncomingOffer={() => declineOffer()}
      onNavigate={onNavigate}
      onOpenOrder={onOpenOrder}
      onRetry={() => {
        void query.refetch();
        void profileQuery.refetch();
      }}
      onSetAvailability={(commandId) => void handleSetAvailability(commandId)}
      view={query.data}
    />
  );
}
