import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import { Alert } from 'react-native';

import { createDriverWalletHttpAdapter } from './adapter';
import { DriverWalletScreen } from './DriverWalletScreen';

export function DriverWalletRuntime() {
  const adapter = useMemo(() => createDriverWalletHttpAdapter(), []);
  const queryClient = useQueryClient();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [withdrawalError, setWithdrawalError] = useState<string | null>(null);

  const summaryQuery = useQuery({
    queryKey: ['driver', 'wallet', 'summary'],
    queryFn: () => adapter.getWalletSummary(),
  });
  const historyQuery = useQuery({
    queryKey: ['driver', 'wallet', 'history'],
    queryFn: () => adapter.getWithdrawalHistory(),
  });

  const rows = historyQuery.data?.items ?? [];

  async function handleRequestWithdrawal(input: Parameters<typeof adapter.requestWithdrawal>[0]) {
    setIsSubmitting(true);
    setWithdrawalError(null);
    try {
      await adapter.requestWithdrawal(input);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['driver', 'wallet', 'summary'] }),
        queryClient.invalidateQueries({ queryKey: ['driver', 'wallet', 'history'] }),
      ]);
      Alert.alert(
        'Thành công',
        'Đã gửi yêu cầu rút tiền. Admin sẽ xác nhận và chuyển khoản trong giờ hành chính.',
      );
    } catch (error) {
      setWithdrawalError(
        error instanceof Error ? error.message : 'Không thể gửi yêu cầu rút tiền. Vui lòng thử lại.',
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <DriverWalletScreen
      history={rows}
      isError={summaryQuery.isError || historyQuery.isError}
      isLoading={summaryQuery.isLoading || historyQuery.isLoading}
      isSubmittingWithdrawal={isSubmitting}
      onRequestWithdrawal={(input) => void handleRequestWithdrawal(input)}
      onRetry={() => {
        void summaryQuery.refetch();
        void historyQuery.refetch();
      }}
      summary={
        summaryQuery.data ?? {
          availableBalanceVnd: 0,
          lifetimeDeliveredVnd: 0,
          pendingWithdrawalVnd: 0,
          deliveredOrderCount: 0,
        }
      }
      withdrawalError={withdrawalError}
    />
  );
}
