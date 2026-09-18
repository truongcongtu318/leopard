import React, { memo, useCallback, useMemo, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
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
import { ProofCaptureSheet } from './components/detail/ProofCaptureSheet';
import { useProofPhotoCapture } from './use-proof-photo-capture';
import { useWatermarkLocation } from './use-watermark-location';

/**
 * Result of uploading proof. `nextCommandId` is the lifecycle command the
 * server now expects — a successful upload replaces the proof task with the
 * delivery/transit command, so it must not be assumed in advance.
 */
export type DriverProofUploadResult = Readonly<{
  ok: boolean;
  nextCommandId?: string | null;
}>;

/** The captured photo handed to the upload, so no second picker is opened. */
export type DriverProofFileInput = Readonly<{
  uri: string;
  name: string;
  mimeType: string;
  size: number;
  /** Real picker File/Blob when available, so the bytes are not re-read. */
  file?: File | Blob;
}>;

export type DriverProofSelectHandler = (
  file: DriverProofFileInput,
) => void | boolean | DriverProofUploadResult | Promise<void | boolean | DriverProofUploadResult>;

export type DriverOrderDetailScreenProps = Readonly<{
  view?: DriverDetailView;
  orderId?: string;
  onExecuteTask?: (commandId: string) => void;
  /**
   * Uploads the captured proof. Resolves true only once the server has accepted
   * it, so the caller can gate the lifecycle transition on real evidence.
   */
  onSelectProof?: DriverProofSelectHandler;
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
  onStartProofCapture,
  task,
}: Readonly<{
  task: Exclude<DriverPrimaryTaskView, null>;
  onExecuteTask?: (commandId: string) => void;
  onRetryProof?: (commandId: string) => void;
  /** Opens the camera for the leg whose proof is still missing. */
  onStartProofCapture?: () => void;
}>) {
  if (task.kind === 'upload-proof') {
    const disabled = task.command.disabled || task.command.isPending;
    // Retrying a failed upload re-uses the stored file; a fresh capture opens
    // the camera. Neither path opens the photo library as a side effect.
    const isRetry = task.command.id === 'cmd-retry-proof-demo';
    const action = isRetry
      ? onRetryProof
        ? () => onRetryProof(task.command.id)
        : undefined
      : onStartProofCapture;

    return (
      <View style={styles.advanceLegContainer}>
        <Pressable
          accessibilityLabel={task.command.label}
          accessibilityRole="button"
          disabled={disabled}
          onPress={action && !disabled ? action : undefined}
          style={styles.a11yHiddenButton}
          testID={`btn-proof-${task.command.id}`}
        >
          <Text style={styles.a11yHiddenText}>{task.command.label}</Text>
        </Pressable>
        <SlideToAction
          key={task.command.id}
          resetKey={task.command.id}
          colorVariant="brand"
          disabled={disabled}
          label={isRetry ? 'Vuốt để thử tải lại ảnh' : 'Vuốt và chụp ảnh xác nhận'}
          onActionComplete={() => {
            if (action && !disabled) action();
          }}
          testID="btn-advance-leg-slide"
        />
      </View>
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

  /**
   * The proof flow is a single pass: swipe → camera → review sheet → upload.
   * `pendingLeg` records which leg the in-flight capture belongs to so pickup
   * and delivery evidence can never be mixed up.
   */
  const [pendingLeg, setPendingLeg] = useState<'pickup' | 'delivery' | null>(null);
  const [captured, setCaptured] = useState<{
    uri: string;
    name: string;
    mimeType: string;
    size: number;
    file?: File | Blob;
    capturedAt: Date;
    coords: string | null;
  } | null>(null);
  const [isUploadingProof, setIsUploadingProof] = useState(false);

  const capture = useProofPhotoCapture();
  const { captureProofPhoto } = capture;
  const { formatWatermarkCoords, getCurrentLocation } = useWatermarkLocation();

  const handleOpenIncidentModal = useMemo(
    () => props.onOpenIncidentModal ?? (() => setLocalIncidentOpen(true)),
    [props.onOpenIncidentModal],
  );

  const handleCloseIncidentModal = useCallback(() => {
    setLocalIncidentOpen(false);
  }, []);

  /** Opens the camera straight away and records the GPS/time watermark. */
  const startProofCapture = useCallback(
    async (leg: 'pickup' | 'delivery') => {
      if (capture.isCapturing) return;
      setPendingLeg(leg);

      const outcome = await captureProofPhoto();
      if (outcome.kind !== 'captured') {
        setPendingLeg(null);
        // A silent return here left the driver staring at a button that seemed
        // dead. Every failure must say what went wrong and what to do next.
        if (outcome.kind === 'error') {
          Alert.alert('Không chụp được ảnh', outcome.message);
        } else if (outcome.kind === 'permission-denied') {
          Alert.alert(
            'Cần quyền truy cập ảnh',
            'Hãy cấp quyền máy ảnh hoặc thư viện ảnh để chụp ảnh xác nhận.',
          );
        }
        return;
      }

      const location = await getCurrentLocation();
      setCaptured({
        uri: outcome.photo.uri,
        name: outcome.photo.name,
        mimeType: outcome.photo.mimeType,
        size: outcome.photo.size,
        file: outcome.photo.file,
        capturedAt: outcome.photo.capturedAt,
        coords:
          location.kind === 'ready' ? formatWatermarkCoords(location.coords) : null,
      });
    },
    [capture, captureProofPhoto, formatWatermarkCoords, getCurrentLocation],
  );

  const handleCancelCapture = useCallback(() => {
    setCaptured(null);
    setPendingLeg(null);
  }, []);

  const handleRetakeCapture = useCallback(() => {
    if (!pendingLeg) return;
    setCaptured(null);
    void startProofCapture(pendingLeg);
  }, [pendingLeg, startProofCapture]);

  /**
   * Uploads the reviewed photo, and only advances the order once the server has
   * accepted it. A failed upload keeps the sheet open with the photo intact so
   * the driver can retry rather than losing the evidence.
   *
   * The command to run afterwards comes from the upload itself: a successful
   * proof rewrites the primary task to the delivery command, and reusing the
   * pre-upload task id would send the order backwards instead of forward.
   */
  const handleConfirmCapture = useCallback(async () => {
    if (!props.onSelectProof || !props.onExecuteTask) return;
    if (!directView || directView.kind !== 'content' || !directView.primaryTask) return;
    if (!captured) return;

    const uploadFile: DriverProofFileInput = {
      uri: captured.uri,
      name: captured.name || captured.uri.split('/').pop() || 'bien-nhan-giao-hang.jpg',
      mimeType: captured.mimeType || 'image/jpeg',
      size: captured.size ?? 0,
      file: captured.file,
    };

    setIsUploadingProof(true);
    let uploaded: boolean | void = true;
    let nextCommandId: string | null = null;
    try {
      const result = await props.onSelectProof(uploadFile);
      if (typeof result === 'object' && result !== null) {
        uploaded = result.ok;
        nextCommandId = result.nextCommandId ?? null;
      } else {
        uploaded = result;
      }
    } catch {
      uploaded = false;
    } finally {
      setIsUploadingProof(false);
    }

    // `undefined` means a legacy handler that does not report status.
    if (uploaded === false) {
      // Keeping the sheet open is right, but returning silently is not: the
      // driver tapped a button and saw nothing happen, so the failure was
      // indistinguishable from a dead control.
      Alert.alert(
        'Chưa tải được ảnh',
        'Ảnh vẫn được giữ. Hãy kiểm tra kết nối rồi thử lại, hoặc chụp lại ảnh khác.',
      );
      return;
    }

    // Fall back to the current task only when the caller reports no follow-up.
    const commandId = nextCommandId ?? directView.primaryTask.command.id;

    setCaptured(null);
    setPendingLeg(null);
    props.onExecuteTask(commandId);
  }, [captured, props, directView]);

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
  const isPickupLeg =
    view.order.status === 'ACCEPTED' || view.order.status === 'PICKING_UP';

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
        taskButtonComponent={
          view.primaryTask ? (
            <TaskButton
              onExecuteTask={props.onExecuteTask}
              onRetryProof={props.onRetryProof}
              onStartProofCapture={() =>
                void startProofCapture(isPickupLeg ? 'pickup' : 'delivery')
              }
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

      {/* Review step right after the camera closes: confirm or retake, then
          upload. Deliberately a sheet, so the map stays visible underneath. */}
      {captured && pendingLeg ? (
        <ProofCaptureSheet
          capturedAt={captured.capturedAt}
          isUploading={isUploadingProof}
          onCancel={handleCancelCapture}
          onConfirm={() => void handleConfirmCapture()}
          onRetake={handleRetakeCapture}
          photoUri={captured.uri}
          title={
            pendingLeg === 'pickup'
              ? 'Ảnh kiểm hàng tại điểm lấy'
              : 'Ảnh xác nhận đã giao hàng'
          }
          watermarkCoords={captured.coords}
        />
      ) : null}
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
