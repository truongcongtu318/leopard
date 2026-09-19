import { useCallback, useMemo, useState } from 'react';
import { Alert, Linking } from 'react-native';
import { useRouter } from 'expo-router';
import { useQueryClient } from '@tanstack/react-query';
import {
  createSocketFactory,
  driverQueryKeys,
  ScreenScaffold,
  ScreenState,
} from '@leopard/mobile-core';
import { DriverIncidentModal, type DriverIncidentSubmitPayload } from './DriverIncidentModal';
import { createDriverHttpAdapter, createDriverProofAdapter } from './adapter';
import { DriverOrderDetailScreen } from './DriverOrderDetailScreen';
import { createDriverTrackingSender } from './tracking-sender';
import { useDriverOrderDetail } from './hooks/useDriverOrderDetail';
import { useDriverOrderMutations } from './hooks/useDriverOrderMutations';
import { useDriverOrderTracking } from './hooks/useDriverOrderTracking';

export type DriverOrderDetailRuntimeProps = Readonly<{
  orderId: string;
  fromHistory?: boolean;
}>;

export function DriverOrderDetailRuntime({ fromHistory, orderId }: DriverOrderDetailRuntimeProps) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const queryKey = driverQueryKeys.orderDetail(orderId);

  const port = useMemo(() => createDriverHttpAdapter(), []);
  const proofPort = useMemo(() => createDriverProofAdapter(undefined, {}), []);
  const sender = useMemo(
    () => createDriverTrackingSender({ socketFactory: createSocketFactory }),
    [],
  );

  const [incidentModalVisible, setIncidentModalVisible] = useState(false);
  const [isReportingIncident, setIsReportingIncident] = useState(false);
  const [isConfirmingCash, setIsConfirmingCash] = useState(false);

  const { query, view, status } = useDriverOrderDetail({ orderId, port, sender });
  useDriverOrderTracking({ orderId, status, sender });

  const {
    executeTask,
    recordStopProgress,
    inFlightStopCommand,
    selectProof,
  } = useDriverOrderMutations({ orderId, port, proofPort });

  const handleBack = useCallback(() => {
    if (typeof router.canGoBack === 'function' && router.canGoBack()) {
      router.back();
    } else {
      router.replace('/orders');
    }
  }, [router]);

  if (query.isPending) {
    return (
      <ScreenScaffold
        eyebrow="DRIVER · FIELD COCKPIT"
        headerTone="ink"
        onBack={handleBack}
        title="Chi tiết đơn"
      >
        <ScreenState state="loading" />
      </ScreenScaffold>
    );
  }

  if (query.isError || !query.data) {
    return (
      <ScreenScaffold
        eyebrow="DRIVER · FIELD COCKPIT"
        headerTone="ink"
        onBack={handleBack}
        title="Chi tiết đơn"
      >
        <ScreenState actionLabel="Thử lại" onAction={() => query.refetch()} state="error" />
      </ScreenScaffold>
    );
  }

  async function handleReportIncident(payload: DriverIncidentSubmitPayload) {
    setIsReportingIncident(true);
    try {
      if (port.reportIncident) {
        await port.reportIncident(orderId, payload);
      }
      await queryClient.invalidateQueries({ queryKey });
      setIncidentModalVisible(false);
      Alert.alert('Đã gửi báo cáo sự cố', 'Bộ phận vận hành sẽ liên hệ hỗ trợ bạn sớm nhất.');
    } catch (error) {
      Alert.alert(
        'Không thể gửi báo cáo',
        error instanceof Error ? error.message : 'Vui lòng thử lại sau ít phút.',
      );
    } finally {
      setIsReportingIncident(false);
    }
  }

  async function handleConfirmCashPayment() {
    setIsConfirmingCash(true);
    try {
      if (port.confirmCashPayment) {
        const response = await port.confirmCashPayment(orderId);
        if (!response.success) {
          throw new Error(response.message || 'Không thể xác nhận thu tiền mặt.');
        }
      }
      await queryClient.invalidateQueries({ queryKey });
      Alert.alert('Thành công', 'Đã xác nhận thu đủ tiền mặt từ khách hàng.');
    } catch (error) {
      Alert.alert(
        'Xác nhận thất bại',
        error instanceof Error
          ? error.message
          : 'Không thể xác nhận thu tiền mặt. Vui lòng thử lại.',
      );
    } finally {
      setIsConfirmingCash(false);
    }
  }

  return (
    <>
      <DriverOrderDetailScreen
        fromHistory={fromHistory}
        inFlightStopCommand={inFlightStopCommand}
        isConfirmingCash={isConfirmingCash}
        onBack={handleBack}
        onConfirmCashPayment={() => void handleConfirmCashPayment()}
        onExecuteTask={(commandId) => void executeTask(commandId)}
        onOpenIncidentModal={() => setIncidentModalVisible(true)}
        onOpenLocationSettings={() => void Linking.openSettings()}
        onRecordStopProgress={recordStopProgress}
        onResolveConflict={handleBack}
        onRetry={() => {
          void query.refetch();
          void sender.retryConnection(orderId);
        }}
        onRetryProof={(commandId) => void executeTask(commandId)}
        onSelectProof={(file) => selectProof(file)}
        view={view}
      />
      <DriverIncidentModal
        isSubmitting={isReportingIncident}
        onClose={() => setIncidentModalVisible(false)}
        onSubmit={(payload) => void handleReportIncident(payload)}
        orderReference={query.data?.kind === 'content' ? query.data.order.reference : undefined}
        visible={incidentModalVisible}
      />
    </>
  );
}
