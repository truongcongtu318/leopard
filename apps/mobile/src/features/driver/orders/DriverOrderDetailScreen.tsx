import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { colors, leopardPalette, radius, spacing, typography } from '../../../theme/tokens';
import { Button } from '../../../ui/Button';
import { EtaIndicator } from '../../../ui/EtaIndicator';
import {
  IconCameraProof,
  IconClock,
  IconLocationPin,
  IconOrders,
  IconPhone,
  IconRoute,
  IconSpeedTruck,
} from '../../../ui/icons/CoreIcons';
import { LedgerSection } from '../../../ui/LedgerSection';
import { MapPanel } from '../../../ui/MapPanel';
import { RouteMapSchematic } from '../../../ui/RouteMapSchematic';
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
    <LedgerSection
      description="JPEG, PNG hoặc WebP; tối đa 10 MB. File picker được cung cấp qua port."
      icon={<IconCameraProof color={colors.brand.background} size={16} />}
      title="Ảnh xác nhận giao hàng"
    >
      <View style={[styles.proofPanel, isError ? styles.proofError : null]}>
        <View style={styles.proofHeaderRow}>
          <View style={styles.proofIconChip}>
            <IconCameraProof
              color={isError ? colors.danger.text : colors.brand.background}
              size={18}
            />
          </View>
          <View style={styles.proofHeaderText}>
            <Text accessibilityRole={isError ? 'alert' : undefined} style={styles.proofTitle}>
              {proof.label}
            </Text>
            <Text style={styles.body}>{proof.message}</Text>
          </View>
        </View>
        {proof.fileLabel ? (
          <Text style={styles.helper}>Tệp mô phỏng: {proof.fileLabel}</Text>
        ) : null}
      </View>
    </LedgerSection>
  );
}

function TrackingPanel({
  tracking,
  onRetry,
  onOpenLocationSettings,
  originLabel,
  destinationLabel,
}: Readonly<{
  tracking: DriverTrackingView;
  onRetry?: () => void;
  onOpenLocationSettings?: () => void;
  originLabel: string;
  destinationLabel: string;
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
          <RouteMapSchematic
            destinationLabel={destinationLabel}
            markerLabel="Marker gần nhất · dữ liệu mô phỏng"
            originLabel={originLabel}
          />
        </MapPanel>
      ) : (
        <MapPanel state="ready" summary={summary}>
          <RouteMapSchematic
            destinationLabel={destinationLabel}
            markerLabel="Tài xế trên chặng hiện tại · dữ liệu mô phỏng"
            originLabel={originLabel}
          />
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
      eyebrow="DRIVER · OPEN ORDER"
      headerTone="ink"
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
          <Text style={styles.taskEyebrow}>ACCEPTANCE BRIEF</Text>
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

function MissionStepper({ status }: Readonly<{ status: string }>) {
  let activeIndex = 0;
  if (status === 'ARRIVED_PICKUP') activeIndex = 1;
  else if (status === 'IN_TRANSIT') activeIndex = 2;
  else if (
    status === 'DELIVERED' ||
    status === 'COMPLETED' ||
    status === 'PROOF_REQUIRED' ||
    status === 'READY_DELIVER'
  ) {
    activeIndex = 3;
  }

  const steps = [
    { label: 'Đến kho', index: 0 },
    { label: 'Bốc hàng', index: 1 },
    { label: 'Vận chuyển', index: 2 },
    { label: 'Giao hàng', index: 3 },
  ];

  return (
    <View style={styles.stepperContainer}>
      {steps.map((step, idx) => {
        const isCurrent = idx === activeIndex;
        const isPast = idx < activeIndex;
        return (
          <React.Fragment key={step.index}>
            <View style={styles.stepItem}>
              <View
                style={[
                  styles.stepDot,
                  isCurrent
                    ? styles.stepDotCurrent
                    : isPast
                      ? styles.stepDotPast
                      : styles.stepDotFuture,
                ]}
              >
                <Text
                  style={[
                    styles.stepDotNumber,
                    isCurrent || isPast
                      ? styles.stepDotNumberActive
                      : styles.stepDotNumberFuture,
                  ]}
                >
                  {idx + 1}
                </Text>
              </View>
              <Text
                style={[
                  styles.stepLabel,
                  isCurrent
                    ? styles.stepLabelCurrent
                    : isPast
                      ? styles.stepLabelPast
                      : styles.stepLabelFuture,
                ]}
              >
                {step.label}
              </Text>
            </View>
            {idx < steps.length - 1 ? (
              <View
                style={[
                  styles.stepLine,
                  idx < activeIndex ? styles.stepLineActive : styles.stepLineFuture,
                ]}
              />
            ) : null}
          </React.Fragment>
        );
      })}
    </View>
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
      eyebrow="DRIVER · ACTIVE MISSION"
      headerRight={<StatusBadge domain="order" status={view.order.status} />}
      headerTone="ink"
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
        {/* Mission Stepper Header */}
        <MissionStepper status={view.order.status} />

        <View style={styles.missionStatusSlab}>
          <Text style={styles.missionEyebrow}>CURRENT LEG</Text>
          <View style={styles.rowBetween}>
            <StatusBadge domain="order" status={view.order.status} />
            <Text style={styles.missionTracking}>{view.tracking.label}</Text>
          </View>
          <Text style={styles.missionHelper}>
            Một nhiệm vụ chính tại mỗi thời điểm · proof gate được hiển thị độc lập
          </Text>
        </View>
        {view.notice ? (
          <View style={styles.notice}>
            <Text accessibilityLiveRegion="polite" style={styles.warningText}>
              {view.notice}
            </Text>
          </View>
        ) : null}
        <LedgerSection
          description={`Khoảng cách ${view.order.route.distanceLabel}`}
          icon={<IconRoute color={colors.brand.background} size={16} />}
          title="Lộ trình được phân công"
          tone="signal"
        >
          <RouteSpine
            destination={view.order.route.destination}
            origin={view.order.route.origin}
            stops={view.order.route.stops}
          />
          <EtaIndicator
            durationSeconds={view.order.route.etaDurationSeconds}
            source={view.order.route.etaSource}
          />
        </LedgerSection>
        <LedgerSection
          icon={<IconOrders color={colors.brand.background} size={16} />}
          title="Hàng hóa và liên hệ"
        >
          <View style={styles.specItemRow}>
            <IconSpeedTruck color="#475569" size={15} />
            <Text style={styles.body}>{view.order.vehicleLabel}</Text>
          </View>
          <View style={styles.specItemRow}>
            <IconOrders color="#475569" size={15} />
            <Text style={styles.body}>{view.order.cargoSummary}</Text>
          </View>
          <View style={styles.contactCardRow}>
            <View style={styles.contactIconChip}>
              <IconPhone color="#0284C7" size={15} />
            </View>
            <View style={styles.contactTextColumn}>
              <Text style={styles.contactCaption}>LIÊN HỆ KHÁCH HÀNG / THỦ KHO</Text>
              <Text style={styles.contactValue}>{view.order.customerContact}</Text>
            </View>
          </View>
        </LedgerSection>
        <ProofPanel proof={view.proof} />
        <LedgerSection
          icon={<IconLocationPin color={colors.brand.background} size={16} />}
          title="Tracking và bản đồ tuyến"
        >
          <TrackingPanel
            destinationLabel={view.order.route.destination.label}
            onOpenLocationSettings={onOpenLocationSettings}
            onRetry={onRetry}
            originLabel={view.order.route.origin.label}
            tracking={view.tracking}
          />
        </LedgerSection>
        <StatusTimeline entries={view.order.history} />
      </ScrollView>
    </ScreenScaffold>
  );
}

export function DriverOrderDetailScreen(props: DriverOrderDetailScreenProps) {
  const { view } = props;
  if (view.kind === 'conflict') {
    return (
      <ScreenScaffold eyebrow="DRIVER · FIELD COCKPIT" headerTone="ink" title="Chi tiết đơn">
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
      <ScreenScaffold eyebrow="DRIVER · FIELD COCKPIT" headerTone="ink" title="Chi tiết đơn">
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
  /* Stepper */
  stepperContainer: {
    backgroundColor: '#FFFFFF',
    borderColor: '#E2E8F0',
    borderRadius: 14,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
    marginBottom: spacing.xs,
  },
  stepItem: {
    alignItems: 'center',
    gap: 4,
  },
  stepDot: {
    alignItems: 'center',
    borderRadius: 10,
    height: 20,
    justifyContent: 'center',
    width: 20,
  },
  stepDotCurrent: {
    backgroundColor: leopardPalette.primary,
  },
  stepDotPast: {
    backgroundColor: '#16A34A',
  },
  stepDotFuture: {
    backgroundColor: '#E2E8F0',
  },
  stepDotNumber: {
    fontSize: 10.5,
    fontWeight: '800',
  },
  stepDotNumberActive: {
    color: '#FFFFFF',
  },
  stepDotNumberFuture: {
    color: '#94A3B8',
  },
  stepLabel: {
    fontSize: 10.5,
    fontWeight: '600',
  },
  stepLabelCurrent: {
    color: leopardPalette.primary,
    fontWeight: '800',
  },
  stepLabelPast: {
    color: '#16A34A',
  },
  stepLabelFuture: {
    color: '#94A3B8',
  },
  stepLine: {
    flex: 1,
    height: 2,
    marginBottom: 14,
    marginHorizontal: 4,
  },
  stepLineActive: {
    backgroundColor: '#16A34A',
  },
  stepLineFuture: {
    backgroundColor: '#E2E8F0',
  },

  /* Cargo & Contact Rows */
  specItemRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
    paddingVertical: 2,
  },
  contactCardRow: {
    alignItems: 'center',
    backgroundColor: '#F0F9FF',
    borderColor: '#BAE6FD',
    borderRadius: 10,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 10,
    marginTop: spacing.xs,
    padding: spacing.sm,
  },
  contactIconChip: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    height: 32,
    justifyContent: 'center',
    width: 32,
  },
  contactTextColumn: {
    flex: 1,
    gap: 1,
  },
  contactCaption: {
    color: '#0369A1',
    fontSize: 9.5,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  contactValue: {
    color: leopardPalette.textSlateDark,
    fontSize: 13.5,
    fontWeight: '700',
  },

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
    backgroundColor: colors.neutral.background,
    borderLeftColor: colors.active.border,
    borderLeftWidth: 4,
    gap: spacing.sm,
    padding: spacing.md,
  },
  taskEyebrow: {
    ...typography.caption,
    color: colors.brand.background,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.8,
  },
  missionStatusSlab: {
    backgroundColor: colors.neutral.background,
    borderColor: colors.neutral.subtleBorder,
    borderLeftColor: colors.brand.background,
    borderLeftWidth: 4,
    borderRadius: radius.card,
    borderWidth: 1,
    gap: spacing.xs,
    padding: spacing.md,
  },
  missionEyebrow: {
    ...typography.caption,
    color: colors.neutral.subtleText,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  missionTracking: {
    ...typography.label,
    color: colors.brand.background,
    flexShrink: 1,
  },
  missionHelper: {
    ...typography.caption,
    color: colors.neutral.mutedText,
    flexShrink: 1,
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
    backgroundColor: colors.neutral.background,
    borderColor: colors.neutral.subtleBorder,
    borderRadius: radius.card,
    borderWidth: 1,
    gap: spacing.xs,
    padding: spacing.md,
  },
  proofHeaderRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.sm,
  },
  proofIconChip: {
    alignItems: 'center',
    backgroundColor: colors.brand.softBackground,
    borderRadius: radius.card,
    height: 36,
    justifyContent: 'center',
    width: 36,
  },
  proofHeaderText: {
    flex: 1,
    gap: 2,
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
  notice: {
    backgroundColor: colors.warning.background,
    borderLeftColor: colors.warning.border,
    borderLeftWidth: 4,
    padding: spacing.sm,
  },
  warningText: { ...typography.body, color: colors.warning.text, flexShrink: 1 },
});
