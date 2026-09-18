import { useEffect, useMemo, useState } from 'react';
import { Alert } from 'react-native';
import { DriverOrdersScreen } from './DriverOrdersScreen';
import { useDispatchOffer } from './useDispatchOffer';
import { useDriverOrdersList } from './hooks/useDriverOrdersList';

export type DriverOrdersListRuntimeProps = Readonly<{
  focusKey?: number;
  onNavigate?: (route: string) => void;
  onOpenOrder: (orderId: string) => void;
}>;

export function DriverOrdersListRuntime({
  focusKey,
  onNavigate,
  onOpenOrder,
}: DriverOrdersListRuntimeProps) {
  const {
    port,
    queryClient,
    ordersQueryKey,
    query,
    profileQuery,
    walletQuery,
    performanceQuery,
    todayEarnings,
  } = useDriverOrdersList(focusKey);

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
    void queryClient.invalidateQueries({ queryKey: ordersQueryKey });
  }

  async function handleAcceptOffer(orderId: string) {
    if (isAcceptingOffer) return;
    setIsAcceptingOffer(true);
    try {
      const result = await port.acceptOrder(orderId);
      void queryClient.invalidateQueries({ queryKey: ordersQueryKey });
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
