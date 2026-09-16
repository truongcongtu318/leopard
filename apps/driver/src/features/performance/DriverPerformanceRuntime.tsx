// apps/driver/src/features/performance/DriverPerformanceRuntime.tsx
import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';

import { createDriverPerformanceHttpAdapter } from './adapter';
import { DriverPerformanceScreen } from './DriverPerformanceScreen';

export function DriverPerformanceRuntime() {
  const adapter = useMemo(() => createDriverPerformanceHttpAdapter(), []);

  const query = useQuery({
    queryKey: ['driver', 'performance'],
    queryFn: () => adapter.getPerformanceSummary(),
  });

  return (
    <DriverPerformanceScreen
      acceptancePct={query.data?.acceptancePct ?? null}
      cancellationPct={query.data?.cancellationPct ?? null}
      isError={query.isError}
      isLoading={query.isLoading}
      onRetry={() => void query.refetch()}
      ratingAvg={query.data?.ratingAvg ?? 0}
      ratingCount={query.data?.ratingCount ?? 0}
      recentReviews={query.data?.recentReviews ?? []}
    />
  );
}
