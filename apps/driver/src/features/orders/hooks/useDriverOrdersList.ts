import { useEffect, useMemo, useRef } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { driverQueryKeys } from '@leopard/mobile-core';
import { createDriverHttpAdapter } from '../adapter';
import { createDriverProfileHttpAdapter } from '../../profile/adapter';
import { createDriverWalletHttpAdapter } from '../../wallet/adapter';
import { createDriverHistoryHttpAdapter, sumTodayEarnings } from '../../history/adapter';
import { createDriverPerformanceHttpAdapter } from '../../performance/adapter';

export function useDriverOrdersList(focusKey?: number) {
  const port = useMemo(() => createDriverHttpAdapter(), []);
  const profilePort = useMemo(() => createDriverProfileHttpAdapter(), []);
  const walletPort = useMemo(() => createDriverWalletHttpAdapter(), []);
  const historyPort = useMemo(() => createDriverHistoryHttpAdapter(), []);
  const performancePort = useMemo(() => createDriverPerformanceHttpAdapter(), []);
  const queryClient = useQueryClient();

  const ordersQueryKey = driverQueryKeys.orders();

  const query = useQuery({
    queryKey: ordersQueryKey,
    queryFn: () => port.getOrdersView(),
  });

  const profileQuery = useQuery({
    queryKey: driverQueryKeys.profile(),
    queryFn: () => profilePort.getProfileView(),
    staleTime: 5 * 60 * 1000,
  });

  const walletQuery = useQuery({
    queryKey: driverQueryKeys.walletSummary(),
    queryFn: () => walletPort.getWalletSummary(),
    staleTime: 60 * 1000,
  });

  const historyQuery = useQuery({
    queryKey: driverQueryKeys.history(),
    queryFn: () => historyPort.getHistory(),
    staleTime: 60 * 1000,
  });

  const performanceQuery = useQuery({
    queryKey: driverQueryKeys.performance(),
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

  return {
    port,
    queryClient,
    ordersQueryKey,
    query,
    profileQuery,
    walletQuery,
    historyQuery,
    performanceQuery,
    todayEarnings,
  };
}
