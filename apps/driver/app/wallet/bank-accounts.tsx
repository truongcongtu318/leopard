import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useMemo } from 'react';

import { ScreenState } from '@leopard/mobile-core';
import { createDriverWalletHttpAdapter } from '../../src/features/wallet/adapter';
import { DriverBankAccountsScreen } from '../../src/features/wallet/DriverBankAccountsScreen';

export default function DriverBankAccountsRoute() {
  const queryClient = useQueryClient();
  const adapter = useMemo(() => createDriverWalletHttpAdapter(), []);

  const query = useQuery({
    queryKey: ['driver', 'wallet', 'summary'],
    queryFn: () => adapter.getWalletSummary(),
  });

  const mutation = useMutation({
    mutationFn: (input: { bankName: string; bankAccountNumber: string; bankAccountName: string }) =>
      adapter.updateBankAccount(input),
    onSuccess: (data) => {
      queryClient.setQueryData(['driver', 'wallet', 'summary'], (old: any) => {
        if (!old) return data;
        return {
          ...old,
          bankName: data.bankName,
          bankAccountNumber: data.bankAccountNumber,
          bankAccountName: data.bankAccountName,
        };
      });
      void queryClient.invalidateQueries({ queryKey: ['driver', 'wallet'] });
    },
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
      isUpdating={mutation.isPending}
      onUpdateBankAccount={(input) => mutation.mutateAsync(input)}
    />
  );
}
