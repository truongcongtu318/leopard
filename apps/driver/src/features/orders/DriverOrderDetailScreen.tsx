import React, { memo, useCallback, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import {
  Button,
  ScreenScaffold,
  ScreenState,
  SlideToAction,
  spacing,
  typeScale,
} from '@leopard/mobile-core';
import type {
  DriverCommandView,
  DriverDetailView,
  DriverPrimaryTaskView,
} from './model';
import { PublicDetailView } from './components/detail/PublicDetailView';
import { AssignedDetailView } from './components/detail/AssignedDetailView';
import { CompletedOrderDetailView } from './components/detail/CompletedOrderDetailView';
import { DriverIncidentModal } from './DriverIncidentModal';
import { DriverModalSurface } from '../../navigation/DriverModalSurface';
import { PickupVerificationView } from './components/detail/PickupVerificationView';
import { DeliveryVerificationView } from './components/detail/DeliveryVerificationView';

export type DriverOrderDetailScreenProps = Readonly<{
  view?: DriverDetailView;
  orderId?: string;
  onExecuteTask?: (commandId: string) => void;
  onSelectProof?: () => void;
  onRetryProof?: (commandId: string) => void;
  onRetry?: () => void;
  onResolveConflict?: () => void;
  onOpenLocationSettings?: () => void;
  onOpenIncidentModal?: () => void;
  onConfirmCashPayment?: () => void;
  isConfirmingCash?: boolean;
  onRecordStopProgress?: (
    stopId: string,
    step: 'ARRIVED' | 'SERVICE_STARTED' | 'SERVICE_COMPLETED',
  ) => void | Promise<void>;
  inFlightStopCommand?: { stopId: string; step: string } | null;
  onBack?: () => void;
}>;

const CommandButton = memo(function CommandButton({
  command,
  onPress,
}: Readonly<{ command: DriverCommandView; onPress?: (commandId: string) => void }>) {
  const disabled = command.disabled || command.isPending;
  return (
    <Button
      disabled={disabled}
      disabledLabel={
        command.disabledReason ? `${command.label} — ${command.disabledReason}` : undefined
      }
      isLoading={command.isPending}
      label={command.label}
      loadingLabel={command.pendingLabel}
      onPress={onPress && !disabled ? () => onPress(command.id) : undefined}
      size="driver-primary"
    />
  );
});

function getLifecycleSlideConfig(command: DriverCommandView) {
  if (command.targetStatus === 'PICKING_UP' || command.id.includes('pickup')) {
    return {
      label: 'Đã tới điểm lấy hàng',
      colorVariant: 'brand' as const,
    };
  }
  if (command.targetStatus === 'IN_TRANSIT' || command.id.includes('transit')) {
    return {
      label: 'Bắt đầu giao hàng',
      colorVariant: 'brand' as const,
    };
  }
  if (command.targetStatus === 'DELIVERED' || command.id.includes('deliver')) {
    return {
      label: 'Đã tới điểm giao hàng',
      colorVariant: 'brand' as const,
    };
  }
  if (command.targetStatus === 'RETURNED' || command.id.includes('return')) {
    return {
      label: 'Đã hoàn hàng về điểm gửi',
      colorVariant: 'brand' as const,
    };
  }
  return {
    label: command.label,
    colorVariant: 'brand' as const,
  };
}

const TaskButton = memo(function TaskButton({
  onExecuteTask,
  onRetryProof,
  onSelectProof,
  task,
}: Readonly<{
  task: Exclude<DriverPrimaryTaskView, null>;
  onExecuteTask?: (commandId: string) => void;
  onSelectProof?: () => void;
  onRetryProof?: (commandId: string) => void;
}>) {
  if (task.kind === 'upload-proof') {
    const handler = task.command.id === 'cmd-retry-proof-demo' ? onRetryProof : onSelectProof;
    return (
      <CommandButton
        command={task.command}
        onPress={handler ? () => handler(task.command.id) : undefined}
      />
    );
  }

  if (task.kind === 'advance-lifecycle') {
    const disabled = task.command.disabled || task.command.isPending;
    const slideConfig = getLifecycleSlideConfig(task.command);
    return (
      <View style={styles.advanceLegContainer}>
        <Pressable
          accessibilityLabel={task.command.label}
          accessibilityRole="button"
          disabled={disabled}
          onPress={() => {
            if (onExecuteTask && !disabled) {
              onExecuteTask(task.command.id);
            }
          }}
          style={styles.a11yHiddenButton}
          testID={`btn-lifecycle-${task.command.id}`}
        >
          <Text style={styles.a11yHiddenText}>{task.command.label}</Text>
        </Pressable>
        <SlideToAction
          key={task.command.id}
          resetKey={task.command.id}
          colorVariant={slideConfig.colorVariant}
          disabled={disabled}
          label={slideConfig.label}
          onActionComplete={() => {
            if (onExecuteTask && !disabled) {
              onExecuteTask(task.command.id);
            }
          }}
          testID="btn-advance-leg-slide"
        />
      </View>
    );
  }

  return <CommandButton command={task.command} onPress={onExecuteTask} />;
});

export function DriverOrderDetailScreen(props: DriverOrderDetailScreenProps) {
  const { view: directView, onBack } = props;
  const [localIncidentOpen, setLocalIncidentOpen] = useState(false);
  const [isPickupProofModalOpen, setIsPickupProofModalOpen] = useState(false);
  const [isDeliveryProofModalOpen, setIsDeliveryProofModalOpen] = useState(false);
  const [capturedPhotos, setCapturedPhotos] = useState<string[]>([]);

  const handleOpenIncidentModal = useMemo(
    () => props.onOpenIncidentModal ?? (() => setLocalIncidentOpen(true)),
    [props.onOpenIncidentModal],
  );

  const handleCloseIncidentModal = useCallback(() => {
    setLocalIncidentOpen(false);
  }, []);

  const handleOpenPickupProof = useCallback(() => {
    setIsPickupProofModalOpen(true);
  }, []);

  const handleOpenDeliveryProof = useCallback(() => {
    setIsDeliveryProofModalOpen(true);
  }, []);

  const handleConfirmPickupProof = useCallback((data: { photos: string[]; packageCount: number; notes: string }) => {
    setIsPickupProofModalOpen(false);
    if (props.onSelectProof) props.onSelectProof();
    if (props.onExecuteTask && directView && directView.kind === 'content' && directView.primaryTask) {
      props.onExecuteTask(directView.primaryTask.command.id);
    }
  }, [props, directView]);

  const handleConfirmDeliveryProof = useCallback((data: { collectedAmount?: number; photos: string[]; notes?: string }) => {
    setIsDeliveryProofModalOpen(false);
    if (props.onSelectProof) props.onSelectProof();
    if (props.onExecuteTask && directView && directView.kind === 'content' && directView.primaryTask) {
      props.onExecuteTask(directView.primaryTask.command.id);
    }
  }, [props, directView]);

  // Runtime always supplies `view`. An orderId-only deep link renders nothing here —
  // the route resolves it through DriverOrderDetailRuntime, never a fixture.
  const view: DriverDetailView | undefined = directView;

  if (!view) return null;

  if (view.kind === 'conflict') {
    return (
      <ScreenScaffold
        headerTone="ink"
        onBack={onBack}
        title="Chi tiết đơn"
      >
        <ScreenState
          actionLabel={view.recoveryLabel}
          message={`${view.message}${view.activeOrderReference ? ` Chuyến hiện tại: ${view.activeOrderReference}.` : ''}`}
          onAction={props.onResolveConflict}
          state="conflict"
          title={view.title}
        />
      </ScreenScaffold>
    );
  }

  if (view.kind !== 'content') {
    return (
      <ScreenScaffold
        headerTone="ink"
        onBack={onBack}
        title="Chi tiết đơn"
      >
        <ScreenState
          actionLabel={view.kind === 'error' ? 'Thử tải lại chi tiết' : undefined}
          message={view.message}
          onAction={props.onRetry}
          state={view.kind}
          title={view.title}
        />
      </ScreenScaffold>
    );
  }

  if (view.accessScope === 'PUBLIC_SUMMARY') {
    return (
      <PublicDetailView
        onBack={onBack}
        stickyFooter={
          view.primaryTask ? (
            <TaskButton
              onExecuteTask={props.onExecuteTask}
              onRetryProof={props.onRetryProof}
              onSelectProof={props.onSelectProof}
              task={view.primaryTask}
            />
          ) : undefined
        }
        view={view}
      />
    );
  }

  // Terminal statuses without pending primary task (completed, returned, cancelled) show read-only receipt.
  // If there is still a pending action (e.g. advance to RETURNED), keep active view so driver can finish.
  const isTerminal =
    (view.order.status === 'DELIVERED' ||
      view.order.status === 'RETURNED' ||
      view.order.status === 'CANCELLED' ||
      view.order.status === 'INCIDENT_CANCELLED') &&
    !view.primaryTask;

  if (isTerminal) {
    return <CompletedOrderDetailView onBack={onBack} view={view} />;
  }

  // ponytail: Modal presentation handles local fallback incident form; upgrade to modal route if incident flows require deep linking.
  return (
    <>
      <AssignedDetailView
        inFlightStopCommand={props.inFlightStopCommand}
        isConfirmingCash={props.isConfirmingCash}
        onBack={onBack}
        onConfirmCashPayment={props.onConfirmCashPayment}
        onExecuteTask={props.onExecuteTask}
        onOpenIncidentModal={handleOpenIncidentModal}
        onOpenLocationSettings={props.onOpenLocationSettings}
        onRecordStopProgress={props.onRecordStopProgress}
        onRetryProof={props.onRetryProof}
        onSelectProof={props.onSelectProof}
        taskButtonComponent={
          view.primaryTask ? (
            <TaskButton
              onExecuteTask={props.onExecuteTask}
              onRetryProof={props.onRetryProof}
              onSelectProof={props.onSelectProof}
              task={view.primaryTask}
            />
          ) : undefined
        }
        view={view}
      />
      <DriverIncidentModal
        isSubmitting={false}
        onClose={handleCloseIncidentModal}
        onSubmit={handleCloseIncidentModal}
        orderReference={view.order.reference}
        visible={localIncidentOpen}
      />

      {/* Màn hình chụp ảnh kiểm hàng trước khi bốc (Full-screen Focused Modal - Apple HIG) */}
      <DriverModalSurface
        animationType="slide"
        onRequestClose={() => setIsPickupProofModalOpen(false)}
        testID="modal-pickup-verification"
        transparent={false}
        visible={isPickupProofModalOpen}
      >
        <PickupVerificationView
          initialPackageCount={24}
          onCancel={() => setIsPickupProofModalOpen(false)}
          onCapturePhoto={() => {
            setCapturedPhotos(['file://captured-cargo-photo.jpg']);
            if (props.onSelectProof) props.onSelectProof();
          }}
          onConfirmPickup={handleConfirmPickupProof}
          orderCode={view.order.reference}
          photos={capturedPhotos}
        />
      </DriverModalSurface>

      {/* Màn hình xác nhận giao hàng POD / COD (Full-screen Focused Modal - Apple HIG) */}
      <DriverModalSurface
        animationType="slide"
        onRequestClose={() => setIsDeliveryProofModalOpen(false)}
        testID="modal-delivery-verification"
        transparent={false}
        visible={isDeliveryProofModalOpen}
      >
        <DeliveryVerificationView
          expectedAmount={view.order.priceVnd ?? 308106}
          onCancel={() => setIsDeliveryProofModalOpen(false)}
          onCapturePhoto={() => {
            setCapturedPhotos(['file://captured-delivered-photo.jpg']);
            if (props.onSelectProof) props.onSelectProof();
          }}
          onCompleteDelivery={handleConfirmDeliveryProof}
          onReportFailure={() => {
            setIsDeliveryProofModalOpen(false);
            handleOpenIncidentModal();
          }}
          orderCode={view.order.reference}
          photos={capturedPhotos}
          type={view.order.paymentMethod === 'CASH' ? 'COD' : 'PREPAID'}
        />
      </DriverModalSurface>
    </>
  );
}

const styles = StyleSheet.create({
  advanceLegContainer: {
    position: 'relative',
    width: '100%',
  },
  a11yHiddenButton: {
    height: 1,
    opacity: 0.01,
    position: 'absolute',
    width: 1,
  },
  a11yHiddenText: {
    ...typeScale.caption2,
    opacity: 0.01,
  },
});
