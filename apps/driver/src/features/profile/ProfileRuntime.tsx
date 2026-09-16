import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';

import { sessionStore } from '@leopard/mobile-core';
import { createDriverProfileHttpAdapter } from './adapter';
import { createDriverPerformanceHttpAdapter } from '../performance/adapter';
import type { DriverProfileView } from './model';
import { DriverProfileScreen } from './ProfileScreen';

export function DriverProfileRuntime({
  onNavigate,
}: Readonly<{ onNavigate?: (route: string) => void }> = {}) {
  const port = useMemo(() => createDriverProfileHttpAdapter(), []);
  const performancePort = useMemo(() => createDriverPerformanceHttpAdapter(), []);
  const router = useRouter();
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const query = useQuery({
    queryKey: ['driver', 'profile'],
    queryFn: () => port.getProfileView(),
  });
  const performanceQuery = useQuery({
    queryKey: ['driver', 'performance'],
    queryFn: () => performancePort.getPerformanceSummary(),
  });

  async function handleLogout() {
    setIsLoggingOut(true);
    await port.logout();
    await sessionStore.clearSession();
    setIsLoggingOut(false);
    router.replace('/(public)/login');
  }

  const view = query.data;
  let displayView: DriverProfileView;
  if (!view) {
    displayView = {
      scenarioId: 'DP-PROFILE-LOADING',
      kind: 'loading',
      title: 'Đang tải hồ sơ',
      message: 'Vui lòng chờ trong giây lát.',
    };
  } else if (view.kind === 'content') {
    displayView = { ...view, isLoggingOut };
  } else {
    displayView = view;
  }

  return (
    <DriverProfileScreen
      acceptancePct={performanceQuery.data?.acceptancePct}
      cancellationPct={performanceQuery.data?.cancellationPct}
      onLogout={() => void handleLogout()}
      onNavigate={onNavigate}
      onRetry={() => query.refetch()}
      ratingAvg={performanceQuery.data?.ratingAvg}
      view={displayView}
    />
  );
}
