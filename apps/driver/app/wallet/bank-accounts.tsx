import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';

import { ScreenState } from '@leopard/mobile-core';
import { createDriverWalletHttpAdapter } from '../../src/features/wallet/adapter';
import { DriverBankAccountsScreen } from '../../src/features/wallet/DriverBankAccountsScreen';

export default function DriverBankAccountsRoute() {
  const adapter = useMemo(() => createDriverWalletHttpAdapter(), []);
  const query = useQuery({
    queryKey: ['driver', 'wallet', 'summary'],
    queryFn: () => adapter.getWalletSummary(),
  });

  if (query.isLoading) {
    return <ScreenState state="loading" />;
  }

  if (query.isError || !query.data) {
    return <ScreenState actionLabel="Thử lại" onAction={() => void query.refetch()} state="error" />;
  }

  return (
    <DriverBankAccountsScreen
      bankAccountName={query.data.bankAccountName ?? null}
      bankAccountNumber={query.data.bankAccountNumber ?? null}
      bankName={query.data.bankName ?? null}
    />
  );
}
