import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Button, ScreenScaffold, ScreenState, SlideToAction } from '@leopard/mobile-core';
import { createDriverDetailFixture } from './fixtures';
import type {
  DriverAssignedDetailView,
  DriverCommandView,
  DriverDetailView,
  DriverPrimaryTaskView,
} from './model';
import { PublicDetailView } from './components/detail/PublicDetailView';
import { AssignedDetailView } from './components/detail/AssignedDetailView';

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
        />
        <SlideToAction
          key={task.command.id}
          resetKey={task.command.id}
          colorVariant={
            task.command.id.includes('deliver') || task.command.label.includes('DELIVERED')
              ? 'success'
              : 'brand'
          }
          disabled={disabled}
          label={`Vuốt: ${task.command.label} ➔`}
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
  const view: DriverDetailView | undefined = directView ?? (orderId ? (() => {
    const fixture = createDriverDetailFixture('D-DETAIL-PROOF-REQUIRED');
    if (fixture.kind === 'content' && fixture.accessScope === 'ASSIGNED_FULL') {
      const assigned: DriverAssignedDetailView = {
        ...fixture,
        order: {
          ...fixture.order,
          id: orderId,
        },
      };
      return assigned;
    }
    return fixture;
  })() : undefined);

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
    <AssignedDetailView
      onBack={onBack}
      onExecuteTask={props.onExecuteTask}
      onOpenIncidentModal={props.onOpenIncidentModal}
      onOpenLocationSettings={props.onOpenLocationSettings}
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
});
