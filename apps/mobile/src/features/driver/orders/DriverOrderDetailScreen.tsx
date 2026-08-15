import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { colors, radius, spacing, typography } from '../../../theme/tokens';
import { Button } from '../../../ui/Button';
import { EtaIndicator } from '../../../ui/EtaIndicator';
import { MapPanel } from '../../../ui/MapPanel';
import { RouteSpine } from '../../../ui/RouteSpine';
import { ScreenScaffold, SectionHeading } from '../../../ui/ScreenScaffold';
import { ScreenState } from '../../../ui/ScreenState';
import { StatusBadge } from '../../../ui/StatusBadge';
import { StatusTimeline } from '../../../ui/StatusTimeline';
import type {
  DriverAssignedDetailView,
  DriverCommandView,
  DriverDetailContentView,
  DriverDetailView,
  DriverPrimaryTaskView,
  DriverProofView,
  DriverTrackingView,
} from './model';

export type DriverOrderDetailScreenProps = Readonly<{
  view: DriverDetailView;
  onExecuteTask?: (commandId: string) => void;
  onSelectProof?: () => void;
  onRetryProof?: (commandId: string) => void;
  onRetry?: () => void;
  onResolveConflict?: () => void;
  onOpenLocationSettings?: () => void;
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
  return <CommandButton command={task.command} onPress={onExecuteTask} />;
}

function ProofPanel({ proof }: Readonly<{ proof: DriverProofView }>) {
  const isError =
    proof.kind === 'invalid-type' || proof.kind === 'too-large' || proof.kind === 'upload-retry';
  return (
    <View style={styles.section}>
      <SectionHeading
        description="JPEG, PNG hoặc WebP; tối đa 10 MB. File picker được cung cấp qua port."
        title="Ảnh xác nhận giao hàng"
      />
      <View style={[styles.proofPanel, isError ? styles.proofError : null]}>
        <Text accessibilityRole={isError ? 'alert' : undefined} style={styles.proofTitle}>
          {proof.label}
        </Text>
        <Text style={styles.body}>{proof.message}</Text>
        {proof.fileLabel ? (
          <Text style={styles.helper}>Tệp mô phỏng: {proof.fileLabel}</Text>
        ) : null}
      </View>
    </View>
  );
}

function TrackingPanel({
  tracking,
  onRetry,
  onOpenLocationSettings,
}: Readonly<{
  tracking: DriverTrackingView;
  onRetry?: () => void;
  onOpenLocationSettings?: () => void;
}>) {
  const isStale =
    tracking.kind === 'stale' ||
    tracking.kind === 'offline' ||
    tracking.kind === 'reconnecting' ||
    tracking.kind === 'permission-denied';
  const summary = `Bản đồ lộ trình tài xế; ${tracking.label}${tracking.lastUpdatedLabel ? `, lần cuối ${tracking.lastUpdatedLabel}` : ''}`;
  return (
    <View style={styles.section}>
      <View style={isStale ? styles.trackingWarning : styles.trackingHealthy}>
        <Text
          accessibilityLiveRegion="polite"
          accessibilityRole={tracking.kind === 'permission-denied' ? 'alert' : undefined}
          style={styles.trackingTitle}
        >
          {tracking.label}
        </Text>
        {tracking.lastUpdatedLabel ? (
          <Text style={styles.helper}>Cập nhật lần cuối: {tracking.lastUpdatedLabel}</Text>
        ) : null}
        {tracking.queuedPointCount ? (
          <Text style={styles.helper}>
            {tracking.queuedPointCount} điểm đang chờ gửi theo port.
          </Text>
        ) : null}
        {tracking.kind === 'permission-denied' ? (
          <Button label="Mở cài đặt vị trí" onPress={onOpenLocationSettings} variant="secondary" />
        ) : null}
      </View>
      {isStale && tracking.lastUpdatedLabel ? (
        <MapPanel
          lastUpdatedLabel={tracking.lastUpdatedLabel}
          onRetry={tracking.kind === 'permission-denied' ? undefined : onRetry}
          state="stale"
          summary={summary}
        >
          <View style={styles.mapPlaceholder}>
            <Text style={styles.body}>Marker gần nhất · không gọi là vị trí trực tiếp.</Text>
          </View>
        </MapPanel>
      ) : (
        <MapPanel state="ready" summary={summary}>
          <View style={styles.mapPlaceholder}>
            <Text style={styles.body}>Marker và route mô phỏng cho bản xem trước.</Text>
          </View>
        </MapPanel>
      )}
    </View>
  );
}

function PublicDetail({
  view,
  onExecuteTask,
  onSelectProof,
  onRetryProof,
}: Readonly<
  Pick<DriverOrderDetailScreenProps, 'onExecuteTask' | 'onSelectProof' | 'onRetryProof'> & {
    view: Extract<DriverDetailContentView, { accessScope: 'PUBLIC_SUMMARY' }>;
  }
>) {
  return (
    <ScreenScaffold
      stickyFooter={
        view.primaryTask ? (
          <TaskButton
            onExecuteTask={onExecuteTask}
            onRetryProof={onRetryProof}
            onSelectProof={onSelectProof}
            task={view.primaryTask}
          />
        ) : null
      }
      subtitle="Public summary · chưa được phân công"
      title={`Đơn ${view.order.reference}`}
    >
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <StatusBadge domain="order" status={view.order.status} />
        <View style={styles.currentTask}>
          <SectionHeading title="Thông tin để quyết định nhận đơn" />
          <Text style={styles.routeLabel}>{view.order.publicRouteLabel}</Text>
          <Text style={styles.body}>
            {view.order.vehicleLabel} · {view.order.cargoSummary}
          </Text>
          <Text style={styles.helper}>{view.order.etaLabel}</Text>
          <Text style={styles.helper}>Cập nhật {view.order.updatedAtLabel}</Text>
        </View>
        <Text style={styles.privacyCopy}>
          Địa chỉ đầy đủ, liên hệ, media và tracking chỉ xuất hiện sau khi hệ thống xác nhận phân
          công.
        </Text>
      </ScrollView>
    </ScreenScaffold>
  );
}

function AssignedDetail({
  view,
  onExecuteTask,
  onSelectProof,
  onRetryProof,
  onRetry,
  onOpenLocationSettings,
}: Readonly<
  Omit<DriverOrderDetailScreenProps, 'view' | 'onResolveConflict'> & {
    view: DriverAssignedDetailView;
  }
>) {
  return (
    <ScreenScaffold
      stickyFooter={
        view.primaryTask ? (
          <TaskButton
            onExecuteTask={onExecuteTask}
            onRetryProof={onRetryProof}
            onSelectProof={onSelectProof}
            task={view.primaryTask}
          />
        ) : null
      }
      subtitle={`Cập nhật ${view.order.updatedAtLabel}`}
      title={`Đơn ${view.order.reference}`}
    >
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.rowBetween}>
          <StatusBadge domain="order" status={view.order.status} />
          <Text style={styles.trackingCompact}>{view.tracking.label}</Text>
        </View>
        {view.notice ? (
          <View style={styles.notice}>
            <Text accessibilityLiveRegion="polite" style={styles.warningText}>
              {view.notice}
            </Text>
          </View>
        ) : null}
        <View style={styles.section}>
          <SectionHeading title="Lộ trình được phân công" />
          <RouteSpine
            destination={view.order.route.destination}
            origin={view.order.route.origin}
            stops={view.order.route.stops}
          />
          <Text style={styles.helper}>Khoảng cách {view.order.route.distanceLabel}</Text>
          <EtaIndicator
            durationSeconds={view.order.route.etaDurationSeconds}
            source={view.order.route.etaSource}
          />
        </View>
        <View style={styles.section}>
          <SectionHeading title="Hàng hóa và liên hệ" />
          <Text style={styles.body}>{view.order.vehicleLabel}</Text>
          <Text style={styles.body}>{view.order.cargoSummary}</Text>
          <Text style={styles.body}>{view.order.customerContact}</Text>
        </View>
        <ProofPanel proof={view.proof} />
        <View style={styles.section}>
          <SectionHeading title="Tracking" />
          <TrackingPanel
            onOpenLocationSettings={onOpenLocationSettings}
            onRetry={onRetry}
            tracking={view.tracking}
          />
        </View>
        <StatusTimeline entries={view.order.history} />
      </ScrollView>
    </ScreenScaffold>
  );
}

export function DriverOrderDetailScreen(props: DriverOrderDetailScreenProps) {
  const { view } = props;
  if (view.kind === 'conflict') {
    return (
      <ScreenScaffold title="Chi tiết đơn">
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
      <ScreenScaffold title="Chi tiết đơn">
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
  if (view.accessScope === 'PUBLIC_SUMMARY') return <PublicDetail {...props} view={view} />;
  return <AssignedDetail {...props} view={view} />;
}

const styles = StyleSheet.create({
  scrollContent: { gap: spacing.lg, paddingBottom: spacing.xl },
  section: { gap: spacing.sm },
  rowBetween: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
    justifyContent: 'space-between',
  },
  currentTask: {
    borderLeftColor: colors.active.border,
    borderLeftWidth: 4,
    gap: spacing.sm,
    padding: spacing.md,
  },
  routeLabel: { ...typography.sectionTitle, color: colors.neutral.text, flexShrink: 1 },
  body: { ...typography.body, color: colors.neutral.text, flexShrink: 1 },
  helper: { ...typography.caption, color: colors.neutral.mutedText, flexShrink: 1 },
  privacyCopy: {
    ...typography.body,
    backgroundColor: colors.info.background,
    color: colors.info.text,
    flexShrink: 1,
    padding: spacing.md,
  },
  proofPanel: {
    backgroundColor: colors.neutral.surface,
    borderColor: colors.neutral.border,
    borderRadius: radius.card,
    borderWidth: 1,
    gap: spacing.xs,
    padding: spacing.md,
  },
  proofError: { backgroundColor: colors.danger.background, borderColor: colors.danger.border },
  proofTitle: { ...typography.label, color: colors.neutral.text, flexShrink: 1 },
  trackingHealthy: {
    backgroundColor: colors.success.background,
    borderLeftColor: colors.success.border,
    borderLeftWidth: 4,
    gap: spacing.xs,
    padding: spacing.sm,
  },
  trackingWarning: {
    backgroundColor: colors.warning.background,
    borderLeftColor: colors.warning.border,
    borderLeftWidth: 4,
    gap: spacing.xs,
    padding: spacing.sm,
  },
  trackingTitle: { ...typography.label, color: colors.neutral.text, flexShrink: 1 },
  trackingCompact: { ...typography.label, color: colors.active.text, flexShrink: 1 },
  mapPlaceholder: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
    padding: spacing.md,
  },
  notice: {
    backgroundColor: colors.warning.background,
    borderLeftColor: colors.warning.border,
    borderLeftWidth: 4,
    padding: spacing.sm,
  },
  warningText: { ...typography.body, color: colors.warning.text, flexShrink: 1 },
});
