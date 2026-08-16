import type { ListRenderItemInfo } from 'react-native';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, control, spacing, typography } from '../../../theme/tokens';
import { Button } from '../../../ui/Button';
import { RouteSummary } from '../../../ui/RouteSpine';
import { ScreenScaffold, SectionHeading } from '../../../ui/ScreenScaffold';
import { ScreenState } from '../../../ui/ScreenState';
import { StatusBadge } from '../../../ui/StatusBadge';
import type {
  DriverActiveTripView,
  DriverListContentView,
  DriverListView,
  DriverPublicOrderView,
} from './model';

export type DriverOrdersScreenProps = Readonly<{
  view: DriverListView;
  onSetAvailability?: (commandId: string) => void;
  onOpenOrder?: (orderId: string) => void;
  onRetry?: () => void;
  onNoticeAction?: () => void;
}>;

function AvailabilityControl({
  view,
  onSetAvailability,
}: Readonly<{
  view: DriverListContentView['availability'];
  onSetAvailability?: (commandId: string) => void;
}>) {
  const action = view.action;
  const pending = action?.isPending ?? false;
  const disabled = pending || (action?.disabled ?? false) || !action;
  return (
    <View style={styles.availabilityRail}>
      <Text style={styles.railEyebrow}>SHIFT STATUS</Text>
      <View style={styles.rowBetween}>
        <Text style={styles.sectionLabel}>Trạng thái nhận đơn</Text>
        <StatusBadge domain="driver-availability" status={view.status} />
      </View>
      {action ? (
        <Button
          disabled={disabled}
          disabledLabel={
            action.disabledReason ? `${action.label} — ${action.disabledReason}` : undefined
          }
          isLoading={pending}
          label={action.label}
          loadingLabel="Đang cập nhật trạng thái nhận đơn"
          onPress={onSetAvailability && !disabled ? () => onSetAvailability(action.id) : undefined}
          variant="secondary"
        />
      ) : null}
      {view.error ? (
        <Text accessibilityRole="alert" style={styles.dangerText}>
          {view.error}
        </Text>
      ) : null}
    </View>
  );
}

function ActiveTripRail({
  trip,
  onOpenOrder,
}: Readonly<{ trip: DriverActiveTripView; onOpenOrder?: (orderId: string) => void }>) {
  return (
    <Pressable
      accessibilityLabel={`Mở chuyến ${trip.reference}, ${trip.trackingLabel}`}
      accessibilityRole="button"
      onPress={onOpenOrder ? () => onOpenOrder(trip.id) : undefined}
      style={({ pressed }) => [styles.activeRail, pressed ? styles.pressed : null]}
      testID="driver-active-trip-slab"
    >
      <Text style={styles.activeEyebrow}>ACTIVE MISSION</Text>
      <Text accessibilityRole="header" style={styles.sectionTitle}>
        Chuyến đang thực hiện
      </Text>
      <View style={styles.rowBetween}>
        <Text style={styles.activeReference}>{trip.reference}</Text>
        <StatusBadge domain="order" status={trip.status} />
      </View>
      <RouteSummary
        destination={trip.route.destination}
        origin={trip.route.origin}
        stops={trip.route.stops}
        tone="inverse"
      />
      <View style={styles.tripSignalRow}>
        <View style={styles.tripSignalCell}>
          <Text style={styles.tripSignalLabel}>TRACKING</Text>
          <Text style={styles.trackingText}>{trip.trackingLabel}</Text>
        </View>
        <View style={styles.tripSignalCell}>
          <Text style={styles.tripSignalLabel}>BẰNG CHỨNG</Text>
          <Text style={trip.proofLabel ? styles.proofWarning : styles.proofReady}>
            {trip.proofLabel ?? 'Không yêu cầu ở bước này'}
          </Text>
        </View>
      </View>
      <Text style={styles.activeAffordance}>Mở field cockpit →</Text>
    </Pressable>
  );
}

function PublicOrderRow({
  item,
  onOpenOrder,
}: Readonly<{ item: DriverPublicOrderView; onOpenOrder?: (orderId: string) => void }>) {
  return (
    <Pressable
      accessibilityLabel={`Xem chi tiết đơn ${item.reference}, ${item.publicRouteLabel}`}
      accessibilityRole="button"
      onPress={onOpenOrder ? () => onOpenOrder(item.id) : undefined}
      style={({ pressed }) => [styles.publicRow, pressed ? styles.pressed : null]}
    >
      <Text style={styles.publicEyebrow}>OPEN ORDER</Text>
      <View style={styles.rowBetween}>
        <Text style={styles.reference}>{item.reference}</Text>
        <StatusBadge domain="order" status={item.status} />
      </View>
      <Text style={styles.routeLabel}>{item.publicRouteLabel}</Text>
      <Text style={styles.body}>
        {item.vehicleLabel} · {item.cargoSummary}
      </Text>
      <Text style={styles.helper}>{item.etaLabel}</Text>
      <Text style={styles.helper}>Cập nhật {item.updatedAtLabel}</Text>
      <Text style={styles.publicAffordance}>Xem public summary →</Text>
    </Pressable>
  );
}

function DriverNotice({
  view,
  onNoticeAction,
}: Readonly<{ view: DriverListContentView; onNoticeAction?: () => void }>) {
  if (!view.notice) return null;
  const toneStyle =
    view.notice.tone === 'danger'
      ? styles.noticeDanger
      : view.notice.tone === 'warning'
        ? styles.noticeWarning
        : styles.noticeInfo;
  return (
    <View accessibilityLiveRegion="polite" style={[styles.notice, toneStyle]}>
      <Text
        accessibilityRole={view.notice.tone === 'danger' ? 'alert' : undefined}
        style={styles.body}
      >
        {view.notice.message}
      </Text>
      {view.notice.actionLabel ? (
        <Button label={view.notice.actionLabel} onPress={onNoticeAction} variant="secondary" />
      ) : null}
    </View>
  );
}

export function DriverOrdersScreen({
  view,
  onSetAvailability,
  onOpenOrder,
  onRetry,
  onNoticeAction,
}: DriverOrdersScreenProps) {
  if (view.kind !== 'content') {
    return (
      <ScreenScaffold eyebrow="DRIVER · FIELD COCKPIT" headerTone="ink" title="Đơn của tài xế">
        <ScreenState
          actionLabel={view.kind === 'error' ? 'Thử tải lại danh sách' : undefined}
          message={view.message}
          onAction={onRetry}
          state={view.kind}
          title={view.title}
        />
      </ScreenScaffold>
    );
  }

  const renderOrder = ({ item }: ListRenderItemInfo<DriverPublicOrderView>) => (
    <PublicOrderRow item={item} onOpenOrder={onOpenOrder} />
  );
  return (
    <ScreenScaffold
      eyebrow="DRIVER · FIELD COCKPIT"
      headerTone="ink"
      title="Đơn của tài xế"
      subtitle={`Làm mới ${view.refreshedAtLabel}`}
    >
      <FlatList
        contentContainerStyle={styles.listContent}
        data={view.requestedOrders}
        keyExtractor={(item) => item.id}
        ListEmptyComponent={
          <ScreenState
            message="Trạng thái nhận đơn của bạn vẫn được giữ."
            state="empty"
            title="Hiện chưa có đơn có thể nhận"
          />
        }
        ListHeaderComponent={
          <View style={styles.headerContent}>
            <AvailabilityControl onSetAvailability={onSetAvailability} view={view.availability} />
            <DriverNotice onNoticeAction={onNoticeAction} view={view} />
            {view.activeTrip ? (
              <ActiveTripRail onOpenOrder={onOpenOrder} trip={view.activeTrip} />
            ) : null}
            <SectionHeading
              description="Chỉ hiển thị public summary cho đến khi bạn được phân công."
              title="Đơn có thể nhận"
            />
          </View>
        }
        renderItem={renderOrder}
      />
    </ScreenScaffold>
  );
}

const styles = StyleSheet.create({
  listContent: { gap: spacing.sm, paddingBottom: spacing.xl },
  headerContent: { gap: spacing.md },
  section: { gap: spacing.sm },
  availabilityRail: {
    backgroundColor: colors.neutral.background,
    borderColor: colors.neutral.subtleBorder,
    borderLeftColor: colors.brand.background,
    borderLeftWidth: 4,
    borderWidth: 1,
    gap: spacing.sm,
    padding: spacing.md,
  },
  railEyebrow: {
    ...typography.caption,
    color: colors.brand.background,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.8,
  },
  rowBetween: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
    justifyContent: 'space-between',
  },
  sectionLabel: { ...typography.label, color: colors.neutral.text, flexShrink: 1 },
  sectionTitle: { ...typography.sectionTitle, color: colors.brand.text, flexShrink: 1 },
  reference: { ...typography.label, color: colors.neutral.text, flexShrink: 1 },
  activeReference: {
    ...typography.sectionTitle,
    color: colors.brand.text,
    flexShrink: 1,
  },
  routeLabel: { ...typography.body, color: colors.neutral.text, flexShrink: 1, fontWeight: '600' },
  body: { ...typography.body, color: colors.neutral.text, flexShrink: 1 },
  helper: { ...typography.caption, color: colors.neutral.mutedText, flexShrink: 1 },
  dangerText: { ...typography.body, color: colors.danger.text, flexShrink: 1 },
  warningText: { ...typography.body, color: colors.warning.text, flexShrink: 1 },
  trackingText: { ...typography.label, color: colors.success.background, flexShrink: 1 },
  activeRail: {
    backgroundColor: colors.operational.ink,
    borderColor: colors.operational.ink,
    borderLeftWidth: 4,
    borderLeftColor: colors.brand.background,
    gap: spacing.sm,
    minHeight: control.minimumTouchHeight,
    padding: spacing.md,
  },
  activeEyebrow: {
    ...typography.caption,
    color: colors.brand.softBackground,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.8,
  },
  tripSignalRow: {
    borderTopColor: colors.neutral.mutedText,
    borderTopWidth: 1,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    paddingTop: spacing.sm,
  },
  tripSignalCell: { flexBasis: 128, flexGrow: 1, gap: spacing.xxs },
  tripSignalLabel: {
    ...typography.caption,
    color: colors.operational.inkMuted,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.6,
  },
  proofWarning: { ...typography.caption, color: colors.warning.background, flexShrink: 1 },
  proofReady: { ...typography.caption, color: colors.operational.inkMuted, flexShrink: 1 },
  activeAffordance: {
    ...typography.caption,
    alignSelf: 'flex-end',
    color: colors.brand.softBackground,
    fontWeight: '700',
  },
  publicRow: {
    backgroundColor: colors.neutral.background,
    borderColor: colors.neutral.subtleBorder,
    borderLeftColor: colors.neutral.border,
    borderLeftWidth: 3,
    borderWidth: 1,
    gap: spacing.xs,
    minHeight: control.minimumTouchHeight,
    padding: spacing.md,
  },
  publicEyebrow: {
    ...typography.caption,
    color: colors.brand.background,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.8,
  },
  publicAffordance: {
    ...typography.caption,
    alignSelf: 'flex-end',
    color: colors.brand.background,
    fontWeight: '700',
  },
  notice: { borderLeftWidth: 4, gap: spacing.sm, padding: spacing.sm },
  noticeInfo: { backgroundColor: colors.info.background, borderLeftColor: colors.info.border },
  noticeWarning: {
    backgroundColor: colors.warning.background,
    borderLeftColor: colors.warning.border,
  },
  noticeDanger: {
    backgroundColor: colors.danger.background,
    borderLeftColor: colors.danger.border,
  },
  pressed: { opacity: 0.8 },
});
