// apps/driver/src/features/contract/DriverContractRuntime.tsx
import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';

import { createDriverContractHttpAdapter } from './adapter';
import { DriverContractScreen } from './DriverContractScreen';

export function DriverContractRuntime() {
  const adapter = useMemo(() => createDriverContractHttpAdapter(), []);

  const query = useQuery({
    queryKey: ['driver', 'contract', 'status'],
    queryFn: () => adapter.getContractStatus(),
  });

  return (
    <DriverContractScreen
      isError={query.isError}
      isLoading={query.isLoading}
      onRetry={() => void query.refetch()}
      status={query.data ?? null}
    />
  );
}
