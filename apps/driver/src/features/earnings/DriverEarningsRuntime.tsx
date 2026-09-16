// apps/driver/src/features/earnings/DriverEarningsRuntime.tsx
import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';

import { createDriverWalletHttpAdapter } from '../wallet/adapter';
import { createDriverHistoryHttpAdapter, sumTodayEarnings } from '../history/adapter';
import { DriverEarningsScreen } from './DriverEarningsScreen';

export function DriverEarningsRuntime({
  onNavigate,
}: Readonly<{ onNavigate?: (route: string) => void }> = {}) {
  const walletAdapter = useMemo(() => createDriverWalletHttpAdapter(), []);
  const historyAdapter = useMemo(() => createDriverHistoryHttpAdapter(), []);

  const walletQuery = useQuery({
    queryKey: ['driver', 'wallet', 'summary'],
    queryFn: () => walletAdapter.getWalletSummary(),
  });
  const historyQuery = useQuery({
    queryKey: ['driver', 'order-history'],
    queryFn: () => historyAdapter.getHistory(),
  });

  const deliveredCount = (historyQuery.data?.items ?? []).filter((i) => i.status === 'DELIVERED').length;
  const todayEarnings = sumTodayEarnings(historyQuery.data?.items ?? []);

  return (
    <DriverEarningsScreen
      availableBalanceVnd={walletQuery.data?.availableBalanceVnd ?? 0}
      deliveredOrderCount={walletQuery.data?.deliveredOrderCount ?? deliveredCount}
      isError={walletQuery.isError || historyQuery.isError}
      isLoading={walletQuery.isLoading || historyQuery.isLoading}
      lifetimeDeliveredVnd={walletQuery.data?.lifetimeDeliveredVnd ?? 0}
      onNavigate={onNavigate}
      onRetry={() => {
        void walletQuery.refetch();
        void historyQuery.refetch();
      }}
      todayEarningsVnd={todayEarnings.amountVnd}
      todayJobCount={todayEarnings.jobCount}
      totalOrderCount={historyQuery.data?.total ?? deliveredCount}
    />
  );
}
