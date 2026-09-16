import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Button, ScreenScaffold, ScreenState, SlideToAction } from '@leopard/mobile-core';
import type {
  DriverCommandView,
  DriverDetailView,
  DriverPrimaryTaskView,
} from './model';
import { PublicDetailView } from './components/detail/PublicDetailView';
import { AssignedDetailView } from './components/detail/AssignedDetailView';
import { DriverIncidentModal } from './DriverIncidentModal';

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

function CommandButton({
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
}

function getLifecycleSlideConfig(command: DriverCommandView) {
  if (command.targetStatus === 'PICKING_UP' || command.id.includes('pickup')) {
    return {
      label: 'Vuốt đã tới điểm lấy hàng ➔',
      colorVariant: 'brand' as const,
    };
  }
  if (command.targetStatus === 'IN_TRANSIT' || command.id.includes('transit')) {
    return {
      label: 'Vuốt đã bốc xong - Bắt đầu giao ➔',
      colorVariant: 'brand' as const,
    };
  }
  if (command.targetStatus === 'DELIVERED' || command.id.includes('deliver')) {
    return {
      label: 'Vuốt đã tới điểm giao hàng ➔',
      colorVariant: 'brand' as const,
    };
  }
  if (command.targetStatus === 'RETURNED' || command.id.includes('return')) {
    return {
      label: 'Vuốt đã hoàn hàng về điểm gửi ➔',
      colorVariant: 'brand' as const,
    };
  }
  return {
    label: `Vuốt: ${command.label} ➔`,
    colorVariant: 'brand' as const,
  };
}

function TaskButton({
  task,
  onExecuteTask,
  onSelectProof,
  onRetryProof,
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
          <Text style={styles.a11yHiddenText}>{`Vuốt: ${task.command.label} ➔`}</Text>
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
}

export function DriverOrderDetailScreen(props: DriverOrderDetailScreenProps) {
  const { view: directView, orderId, onBack } = props;
  const [localIncidentOpen, setLocalIncidentOpen] = useState(false);
  const handleOpenIncidentModal = props.onOpenIncidentModal ?? (() => setLocalIncidentOpen(true));
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
        onClose={() => setLocalIncidentOpen(false)}
        onSubmit={() => {
          setLocalIncidentOpen(false);
        }}
        orderReference={view.order.reference}
        visible={localIncidentOpen}
      />
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
    fontSize: 1,
    opacity: 0.01,
  },
});
