import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { useMemo } from 'react';

import { createDriverKycHttpAdapter } from './adapter';
import { DriverKycScreen } from './DriverKycScreen';

export function DriverKycRuntime() {
  const adapter = useMemo(() => createDriverKycHttpAdapter(), []);
  const router = useRouter();
  const query = useQuery({
    queryKey: ['driver', 'kyc-documents'],
    queryFn: () => adapter.listDocuments(),
  });

  return (
    <DriverKycScreen
      documents={query.data ?? []}
      isError={query.isError}
      isLoading={query.isLoading}
      onBack={() => router.back()}
    />
  );
}
