import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';

import { createDriverKycHttpAdapter } from './adapter';
import { DriverKycScreen } from './DriverKycScreen';

export function DriverKycRuntime() {
  const adapter = useMemo(() => createDriverKycHttpAdapter(), []);
  const query = useQuery({
    queryKey: ['driver', 'kyc-documents'],
    queryFn: () => adapter.listDocuments(),
  });

  return <DriverKycScreen documents={query.data ?? []} isLoading={query.isLoading} />;
}
