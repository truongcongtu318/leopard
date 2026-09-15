import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';

import { createDriverHistoryHttpAdapter } from './adapter';
import { DriverHistoryScreen } from './DriverHistoryScreen';

export function DriverHistoryRuntime({
  onNavigate,
}: Readonly<{ onNavigate?: (route: string) => void }> = {}) {
  const adapter = useMemo(() => createDriverHistoryHttpAdapter(), []);
  const query = useQuery({
    queryKey: ['driver', 'order-history'],
    queryFn: () => adapter.getHistory(),
  });

  return (
    <DriverHistoryScreen
      isError={query.isError}
      isLoading={query.isLoading}
      items={query.data?.items ?? []}
      onNavigate={onNavigate}
      onRetry={() => void query.refetch()}
      total={query.data?.total ?? 0}
    />
  );
}
