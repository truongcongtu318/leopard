import type { ListRenderItemInfo } from 'react-native';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { useState } from 'react';

import { colors, leopardPalette, radius, spacing, typography } from '../../../theme/tokens';
import { Button } from '../../../ui/Button';
import {
  IconClock,
  IconLocationPin,
  IconRoute,
  IconSpeedTruck,
  IconStar,
} from '../../../ui/icons/CoreIcons';
import { ScreenScaffold, SectionHeading } from '../../../ui/ScreenScaffold';
import { ScreenState } from '../../../ui/ScreenState';
import { SkeletonCard } from '../../../ui/Skeleton';
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
  onSetAvailability,
  view,
}: Readonly<{
  view: DriverListContentView['availability'];
  onSetAvailability?: (commandId: string) => void;
}>) {
  const action = view.action;
  const pending = action?.isPending ?? false;
  const disabled = pending || (action?.disabled ?? false) || !action;
  const isOnline = view.status === 'AVAILABLE';

  return (
    <View style={styles.availabilityRail}>
      <View style={styles.availabilityHeaderRow}>
        <View style={styles.availabilityTitleBlock}>
          <View
            style={[
              styles.availabilityStatusDot,
              isOnline ? styles.dotOnline : styles.dotOffline,
            ]}
          />
          <Text style={styles.sectionLabel}>Trạng thái nhận đơn</Text>
        </View>
        <StatusBadge domain="driver-availability" status={view.status} />
      </View>
      {action ? (
        <Button
          disabled={disabled}
          isLoading={pending}
          label={action.label}
          loadingLabel="Đang cập nhật trạng thái nhận đơn"
          onPress={
            onSetAvailability && !disabled ? () => onSetAvailability(action.id) : undefined
          }
          variant={isOnline ? 'secondary' : 'primary'}
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

function DriverKpiStrip() {
  return (
    <View style={styles.kpiContainer}>
      <View style={styles.kpiCard}>
        <Text style={styles.kpiLabel}>HÔM NAY</Text>
        <Text style={styles.kpiValue}>4 chuyến</Text>
        <Text style={styles.kpiSub}>100% đúng giờ</Text>
      </View>
      <View style={styles.kpiCard}>
        <Text style={styles.kpiLabel}>THỰC NHẬN</Text>
        <Text style={styles.kpiValue}>620.000 ₫</Text>
        <Text style={styles.kpiSub}>+50k thưởng</Text>
      </View>
      <View style={styles.kpiCard}>
        <Text style={styles.kpiLabel}>ĐÁNH GIÁ</Text>
        <View style={styles.kpiRatingRow}>
          <IconStar color="#F59E0B" size={13} />
          <Text style={styles.kpiValue}>4.95</Text>
        </View>
        <Text style={styles.kpiSub}>Hạng Vàng</Text>
      </View>
    </View>
  );
}

function ActiveTripRail({
  onOpenOrder,
  trip,
}: Readonly<{
  trip: DriverActiveTripView;
  onOpenOrder?: (orderId: string) => void;
}>) {
  return (
    <Pressable
      accessibilityHint="Mở chi tiết chuyến đang thực hiện"
      accessibilityLabel={`Mở chuyến ${trip.reference}, trạng thái ${trip.status}`}
      accessibilityRole="button"
      onPress={onOpenOrder ? () => onOpenOrder(trip.id) : undefined}
      style={({ pressed }) => [styles.activeRail, pressed ? styles.pressed : null]}
      testID="driver-active-trip-slab"
    >
      <View style={styles.activeTopRow}>
        <View style={styles.activeTopRowLeft}>
          <View style={styles.tripIconChip}>
            <IconSpeedTruck color={colors.brand.background} size={18} />
          </View>
          <Text accessibilityRole="header" style={styles.activeReference}>
            {trip.reference}
          </Text>
        </View>
        <StatusBadge domain="order" status={trip.status} />
      </View>
      <View style={styles.activeRouteRow}>
        <IconRoute color={colors.brand.softText} size={14} />
        <Text numberOfLines={2} style={styles.activeRoute}>
          {trip.route.origin.label} → {trip.route.destination.label}
        </Text>
      </View>
      <View style={styles.activeSignalRow}>
        <View style={styles.liveTrackingIndicator}>
          <View style={styles.liveDot} />
          <Text style={styles.trackingText}>{trip.trackingLabel}</Text>
        </View>
        {trip.proofLabel ? (
          <Text style={styles.proofNoticeText}>{trip.proofLabel}</Text>
        ) : null}
      </View>
      <View style={styles.cardFooter}>
        <View style={styles.etaRow}>
          <IconClock color={colors.neutral.subtleText} size={13} />
          <Text style={styles.etaText}>ETA {trip.route.distanceLabel}</Text>
        </View>
      </View>
    </Pressable>
  );
}

function PublicOrderCard({
  item,
  onOpenOrder,
}: Readonly<{ item: DriverPublicOrderView; onOpenOrder?: (orderId: string) => void }>) {
  return (
    <Pressable
      accessibilityLabel={`Xem chi tiết đơn ${item.reference}, ${item.publicRouteLabel}`}
      accessibilityRole="button"
      onPress={onOpenOrder ? () => onOpenOrder(item.id) : undefined}
      style={({ pressed }) => [styles.orderCard, pressed ? styles.pressed : null]}
    >
      <View style={styles.cardHeader}>
        <Text style={styles.referenceText}>{item.reference}</Text>
        <StatusBadge domain="order" status={item.status} />
      </View>
      <View style={styles.routeRow}>
        <IconLocationPin color={leopardPalette.primary} size={16} />
        <Text numberOfLines={2} style={styles.routeText}>
          {item.publicRouteLabel}
        </Text>
      </View>
      <Text style={styles.cargoSummaryText}>
        {item.vehicleLabel} · {item.cargoSummary}
      </Text>
      <View style={styles.cardFooter}>
        <Text style={styles.priceText}>{item.etaLabel}</Text>
        <Text style={styles.updatedText}>{item.updatedAtLabel}</Text>
      </View>
    </Pressable>
  );
}

function DriverNotice({
  onNoticeAction,
  view,
}: Readonly<{ view: DriverListContentView; onNoticeAction?: () => void }>) {
  if (!view.notice) return null;
  const toneStyle =
    view.notice.tone === 'danger'
      ? styles.noticeDanger
      : view.notice.tone === 'warning'
        ? styles.noticeWarning
        : styles.noticeInfo;

  return (
    <View accessibilityRole="alert" style={[styles.notice, toneStyle]}>
      <Text style={styles.noticeBody}>{view.notice.message}</Text>
      {view.notice.actionLabel ? (
        <Button label={view.notice.actionLabel} onPress={onNoticeAction} variant="secondary" />
      ) : null}
    </View>
  );
}

export function DriverOrdersScreen({
  onNoticeAction,
  onOpenOrder,
  onRetry,
  onSetAvailability,
  view,
}: DriverOrdersScreenProps) {
  const [activeTab, setActiveTab] = useState<'WAITING' | 'ACTIVE'>('WAITING');

  if (view.kind === 'loading') {
    return (
      <ScreenScaffold
        eyebrow="DRIVER · FIELD COCKPIT"
        headerTone="ink"
        subtitle="Bố cục được giữ ổn định trong khi tải dữ liệu."
        title="Đơn của tài xế"
      >
        <View style={styles.skeletonList}>
          <SkeletonCard />
          <SkeletonCard />
        </View>
      </ScreenScaffold>
    );
  }

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

  const waitingCount = view.requestedOrders.length;
  const activeCount = view.activeTrip ? 1 : 0;

  const renderOrder = ({ item }: ListRenderItemInfo<DriverPublicOrderView>) => (
    <PublicOrderCard item={item} onOpenOrder={onOpenOrder} />
  );

  return (
    <ScreenScaffold
      eyebrow="DRIVER · FIELD COCKPIT"
      headerTone="ink"
      title="Đơn của tài xế"
    >
      <View style={styles.headerContent}>
        <AvailabilityControl
          onSetAvailability={onSetAvailability}
          view={view.availability}
        />
        <DriverKpiStrip />
        <DriverNotice onNoticeAction={onNoticeAction} view={view} />
        
        <View style={styles.tabContainer}>
          <Pressable
            style={[styles.tab, activeTab === 'WAITING' ? styles.tabActive : null]}
            onPress={() => setActiveTab('WAITING')}
          >
            <Text style={[styles.tabText, activeTab === 'WAITING' ? styles.tabTextActive : null]}>Chờ nhận</Text>
            {waitingCount > 0 && (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{waitingCount}</Text>
              </View>
            )}
          </Pressable>
          <Pressable
            style={[styles.tab, activeTab === 'ACTIVE' ? styles.tabActive : null]}
            onPress={() => setActiveTab('ACTIVE')}
          >
            <Text style={[styles.tabText, activeTab === 'ACTIVE' ? styles.tabTextActive : null]}>Đang thực hiện</Text>
            {activeCount > 0 && (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{activeCount}</Text>
              </View>
            )}
          </Pressable>
        </View>
      </View>

      {view.activeTrip ? (
        <View style={styles.section}>
          <SectionHeading title="Chuyến đang thực hiện" />
          <ActiveTripRail onOpenOrder={onOpenOrder} trip={view.activeTrip} />
        </View>
      ) : null}

      <View style={styles.section}>
        <SectionHeading title="Đơn có thể nhận" />
        <FlatList
          contentContainerStyle={styles.listContent}
          data={view.requestedOrders}
          keyExtractor={(item) => item.id}
          ListEmptyComponent={
            <View style={styles.emptyBox}>
              <Text style={styles.emptyTitle}>Chưa có đơn mới</Text>
              <Text style={styles.emptyMessage}>
                Hệ thống sẽ thông báo ngay khi có đơn hàng mới phù hợp với bạn.
              </Text>
            </View>
          }
          renderItem={renderOrder}
          scrollEnabled={false}
        />
      </View>
    </ScreenScaffold>
  );
}

const styles = StyleSheet.create({
  headerContent: {
    gap: spacing.sm,
  },
  skeletonList: {
    gap: spacing.sm,
  },
  section: {
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  listContent: {
    gap: spacing.sm,
  },
  availabilityRail: {
    backgroundColor: leopardPalette.surfaceWhite,
    borderColor: leopardPalette.cardBorder,
    borderRadius: radius.card,
    borderWidth: 1,
    gap: spacing.sm,
    padding: spacing.md,
  },
  availabilityHeaderRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  availabilityTitleBlock: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  availabilityStatusDot: {
    borderRadius: radius.pill,
    height: 8,
    width: 8,
  },
  dotOnline: {
    backgroundColor: '#16A34A',
  },
  dotOffline: {
    backgroundColor: colors.neutral.subtleText,
  },
  kpiContainer: {
    flexDirection: 'row',
    gap: spacing.xs,
  },
  kpiCard: {
    backgroundColor: leopardPalette.surfaceWhite,
    borderColor: leopardPalette.cardBorder,
    borderRadius: radius.card,
    borderWidth: 1,
    flex: 1,
    gap: 2,
    padding: spacing.sm,
  },
  kpiLabel: {
    color: leopardPalette.textMutedSlate,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  kpiValue: {
    color: leopardPalette.textSlateDark,
    fontSize: 14,
    fontWeight: '800',
    fontVariant: ['tabular-nums'],
  },
  kpiSub: {
    color: leopardPalette.textMutedSlate,
    fontSize: 10.5,
  },
  kpiRatingRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 3,
  },
  sectionLabel: {
    ...typography.caption,
    color: leopardPalette.textMutedSlate,
    fontWeight: '600',
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: leopardPalette.surfaceWhite,
    borderRadius: radius.control,
    borderWidth: 1,
    borderColor: leopardPalette.cardBorder,
    padding: 3,
    marginTop: spacing.xs,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    gap: 6,
    borderRadius: radius.control - 2,
  },
  tabActive: {
    backgroundColor: leopardPalette.primaryBg,
  },
  tabText: {
    fontSize: 13.5,
    fontWeight: '500',
    color: leopardPalette.textMutedSlate,
  },
  tabTextActive: {
    color: leopardPalette.primary,
    fontWeight: '600',
  },
  badge: {
    backgroundColor: leopardPalette.primary,
    borderRadius: radius.pill,
    paddingHorizontal: 6,
    paddingVertical: 1,
    minWidth: 18,
    alignItems: 'center',
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 10.5,
    fontWeight: '700',
  },
  activeRail: {
    backgroundColor: leopardPalette.surfaceWhite,
    borderColor: leopardPalette.cardBorder,
    borderLeftWidth: 4,
    borderLeftColor: colors.brand.background,
    borderRadius: radius.card,
    borderWidth: 1,
    gap: spacing.xs,
    padding: spacing.md,
    minHeight: 48,
  },
  activeTopRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  activeTopRowLeft: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  tripIconChip: {
    alignItems: 'center',
    backgroundColor: colors.brand.softBackground,
    borderRadius: radius.card,
    height: 32,
    justifyContent: 'center',
    width: 32,
  },
  activeReference: {
    color: leopardPalette.textSlateDark,
    fontSize: 15,
    fontWeight: '600',
  },
  activeRouteRow: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: 6,
    marginTop: 2,
  },
  activeRoute: {
    color: leopardPalette.textSlateDark,
    fontSize: 13.5,
    lineHeight: 19,
    flex: 1,
  },
  etaRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 4,
  },
  activeSignalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  liveTrackingIndicator: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 6,
  },
  liveDot: {
    backgroundColor: colors.brand.background,
    borderRadius: radius.pill,
    height: 7,
    width: 7,
  },
  trackingText: {
    color: colors.brand.background,
    fontSize: 12.5,
    fontWeight: '600',
  },
  proofNoticeText: {
    color: colors.warning.text,
    fontSize: 12,
    fontWeight: '600',
  },
  orderCard: {
    backgroundColor: leopardPalette.surfaceWhite,
    borderColor: leopardPalette.cardBorder,
    borderRadius: radius.card,
    borderWidth: 1,
    gap: spacing.xs,
    padding: spacing.md,
    minHeight: 48,
  },
  cardHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  referenceText: {
    color: leopardPalette.textSlateDark,
    fontSize: 15,
    fontWeight: '600',
  },
  routeRow: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: 6,
    marginTop: 4,
  },
  routeText: {
    color: leopardPalette.textSlateDark,
    fontSize: 13.5,
    lineHeight: 19,
    flex: 1,
  },
  cargoSummaryText: {
    color: leopardPalette.textMutedSlate,
    fontSize: 12.5,
    marginTop: 2,
  },
  cardFooter: {
    alignItems: 'center',
    borderTopColor: leopardPalette.subtleDivider,
    borderTopWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: spacing.xs,
    marginTop: spacing.xs,
  },
  priceText: {
    color: leopardPalette.primary,
    fontSize: 14.5,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
  etaText: {
    color: colors.info.text,
    fontSize: 13,
    fontWeight: '600',
  },
  updatedText: {
    color: leopardPalette.textSubtle,
    fontSize: 11.5,
  },
  emptyBox: {
    backgroundColor: leopardPalette.surfaceWhite,
    borderColor: leopardPalette.cardBorder,
    borderRadius: radius.card,
    borderWidth: 1,
    gap: 4,
    padding: spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 100,
  },
  emptyTitle: {
    ...typography.label,
    color: leopardPalette.textSlateDark,
  },
  emptyMessage: {
    ...typography.caption,
    color: leopardPalette.textMutedSlate,
    textAlign: 'center',
  },
  notice: {
    borderRadius: radius.control,
    gap: spacing.xs,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  noticeInfo: {
    backgroundColor: colors.info.background,
  },
  noticeWarning: {
    backgroundColor: colors.warning.background,
  },
  noticeDanger: {
    backgroundColor: colors.danger.background,
  },
  noticeBody: {
    ...typography.caption,
    color: colors.neutral.text,
    fontWeight: '600',
    lineHeight: 18,
  },
  dangerText: {
    ...typography.caption,
    color: colors.danger.text,
    fontWeight: '600',
  },
  pressed: {
    opacity: 0.85,
  },
});
