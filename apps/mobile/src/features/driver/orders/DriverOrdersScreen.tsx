import type { ListRenderItemInfo } from 'react-native';
import {
  FlatList,
  ImageBackground,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useState } from 'react';

import { colors, layout, leopardPalette, radius, spacing, typography } from '../../../theme/tokens';
import { Button } from '../../../ui/Button';
import {
  IconBell,
  IconClock,
  IconEarnings,
  IconLocationPin,
  IconOrders,
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
import { IncomingDispatchModal } from './IncomingDispatchModal';
import type { IncomingDispatchOffer } from './IncomingDispatchModal';

const driverHeroBgSource = require('../../../../assets/brand/driver-hero-bg.jpg');

export type DriverOrdersScreenProps = Readonly<{
  view: DriverListView;
  onSetAvailability?: (commandId: string) => void;
  onOpenOrder?: (orderId: string) => void;
  onRetry?: () => void;
  onNoticeAction?: () => void;
  incomingOffer?: IncomingDispatchOffer | null;
  onAcceptIncomingOffer?: (orderId: string) => void;
  onDeclineIncomingOffer?: (orderId: string) => void;
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
    <View style={styles.availabilityCockpit}>
      <View style={styles.availabilityHeaderRow}>
        <View style={styles.availabilityTitleBlock}>
          <View
            style={[
              styles.pulseDotOuter,
              isOnline ? styles.pulseDotOnlineOuter : styles.pulseDotOfflineOuter,
            ]}
          >
            <View
              style={[
                styles.pulseDotInner,
                isOnline ? styles.dotOnline : styles.dotOffline,
              ]}
            />
          </View>
          <View style={styles.availabilityTextGroup}>
            <Text style={styles.availabilitySectionTitle}>Trạng thái nhận đơn</Text>
            <Text style={styles.availabilitySectionSub}>
              {isOnline ? 'Đang sẵn sàng kết nối đơn mới' : 'Đang tạm dừng nhận chuyến mới'}
            </Text>
          </View>
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
        <View style={styles.errorBanner}>
          <Text accessibilityRole="alert" style={styles.dangerText}>
            {view.error}
          </Text>
        </View>
      ) : null}
    </View>
  );
}

function DriverKpiStrip() {
  return (
    <View style={styles.kpiContainer}>
      <View style={styles.kpiCard}>
        <View style={styles.kpiHeaderRow}>
          <IconSpeedTruck color={leopardPalette.primary} size={15} />
          <Text style={styles.kpiLabel}>HÔM NAY</Text>
        </View>
        <Text style={styles.kpiValue}>4 chuyến</Text>
        <Text style={styles.kpiSubSuccess}>100% đúng giờ</Text>
      </View>

      <View style={styles.kpiCard}>
        <View style={styles.kpiHeaderRow}>
          <IconEarnings color="#16A34A" size={15} />
          <Text style={styles.kpiLabel}>THỰC NHẬN</Text>
        </View>
        <Text style={styles.kpiValue}>620.000 ₫</Text>
        <Text style={styles.kpiSubBrand}>+50k thưởng</Text>
      </View>

      <View style={styles.kpiCard}>
        <View style={styles.kpiHeaderRow}>
          <IconStar color="#F59E0B" fill="#F59E0B" size={14} />
          <Text style={styles.kpiLabel}>ĐÁNH GIÁ</Text>
        </View>
        <Text style={styles.kpiValue}>4.95</Text>
        <Text style={styles.kpiSubRating}>Hạng Vàng</Text>
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
            <IconSpeedTruck color={colors.brand.background} size={16} />
          </View>
          <Text accessibilityRole="header" style={styles.activeReference}>
            {trip.reference}
          </Text>
        </View>
        <StatusBadge domain="order" status={trip.status} />
      </View>

      <View style={styles.activeRouteSpineBox}>
        <View style={styles.routeSpineColumn}>
          <View style={styles.spineOriginDot} />
          <View style={styles.spineConnectorLine} />
          <View style={styles.spineDestSquare} />
        </View>
        <View style={styles.routeSpineLabels}>
          <Text numberOfLines={1} style={styles.activeOriginText}>
            {trip.route.origin.label}
          </Text>
          <View style={styles.spineEtaRow}>
            <IconClock color={colors.brand.background} size={12} />
            <Text style={styles.spineEtaText}>ETA {trip.route.distanceLabel}</Text>
          </View>
          <Text numberOfLines={1} style={styles.activeDestText}>
            {trip.route.destination.label}
          </Text>
        </View>
      </View>

      <View style={styles.activeSignalRow}>
        <View style={styles.liveTrackingIndicator}>
          <View style={styles.livePulseDot} />
          <Text style={styles.trackingText}>{trip.trackingLabel}</Text>
        </View>
        {trip.proofLabel ? (
          <Text style={styles.proofNoticeText}>{trip.proofLabel}</Text>
        ) : null}
      </View>

      <View style={styles.activeCardFooter}>
        <Text style={styles.activeActionHint}>Mở buồng lái điều phối chuyến →</Text>
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

      <View style={styles.tagsContainer}>
        <View style={styles.vehicleTag}>
          <IconSpeedTruck color="#475569" size={12} />
          <Text style={styles.vehicleTagText}>{item.vehicleLabel}</Text>
        </View>
        <View style={styles.cargoTag}>
          <Text numberOfLines={1} style={styles.cargoTagText}>
            {item.cargoSummary}
          </Text>
        </View>
      </View>

      <View style={styles.cardFooter}>
        <View style={styles.priceEtaRow}>
          <IconClock color={colors.brand.background} size={13} />
          <Text style={styles.priceText}>{item.etaLabel}</Text>
        </View>
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
  incomingOffer = null,
  onAcceptIncomingOffer,
  onDeclineIncomingOffer,
  onNoticeAction,
  onOpenOrder,
  onRetry,
  onSetAvailability,
  view,
}: DriverOrdersScreenProps) {
  const [activeTab, setActiveTab] = useState<'WAITING' | 'ACTIVE'>('WAITING');
  const [dismissedOfferId, setDismissedOfferId] = useState<string | null>(null);

  const activeIncomingOffer =
    incomingOffer && incomingOffer.id !== dismissedOfferId ? incomingOffer : null;

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
    <ScrollView
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={false}
      style={styles.screenContainer}
      testID="driver-orders-screen-scroll"
    >
      {/* 1. Cinematic Hero Cockpit Header */}
      <View style={styles.heroSection}>
        <ImageBackground
          accessibilityLabel="Hình ảnh xe tải vận tải LEOPARD trên cung đường đèo núi"
          imageStyle={styles.heroBackgroundImage}
          resizeMode="cover"
          source={driverHeroBgSource}
          style={styles.heroBackground}
        >
          <View style={styles.heroOverlay}>
            {/* Top Bar: Location pin chip & notification */}
            <View style={styles.heroTopRow}>
              <View style={styles.locationChip}>
                <IconLocationPin color="#38BDF8" size={14} />
                <Text style={styles.locationChipText}>Depot Tân Bình · TP.HCM</Text>
              </View>
              <View style={styles.heroNotificationBtn}>
                <IconBell color="#FFFFFF" size={17} />
              </View>
            </View>

            {/* Cockpit Masthead */}
            <View style={styles.mastheadBlock}>
              <View style={styles.eyebrowBadge}>
                <Text style={styles.eyebrowText}>DRIVER · FIELD COCKPIT</Text>
              </View>
              <Text accessibilityRole="header" style={styles.heroTitle}>
                Đơn của tài xế
              </Text>
              <View style={styles.vehicleInfoRow}>
                <IconSpeedTruck color="#94A3B8" size={14} />
                <Text style={styles.vehicleInfoText}>
                  51C-889.24 · Xe tải thùng kín 2.5T
                </Text>
              </View>
            </View>

            {/* Cockpit Availability Switch Bar */}
            <AvailabilityControl
              onSetAvailability={onSetAvailability}
              view={view.availability}
            />
          </View>
        </ImageBackground>
      </View>

      {/* 2. Curved Bottom Sheet (Overlaps Hero with bo góc tròn) */}
      <View style={styles.bottomSheetContainer}>
        {/* Native Mobile Drag Handle Indicator */}
        <View style={styles.dragHandleBar} />

        {/* 3. Driver KPI Performance Strip */}
        <DriverKpiStrip />

        {/* Notice alert if any */}
        <DriverNotice onNoticeAction={onNoticeAction} view={view} />

        {/* 4. Segmented Tab Selector */}
        <View style={styles.tabContainer}>
          <Pressable
            onPress={() => setActiveTab('WAITING')}
            style={[styles.tab, activeTab === 'WAITING' ? styles.tabActive : null]}
          >
            <Text
              style={[
                styles.tabText,
                activeTab === 'WAITING' ? styles.tabTextActive : null,
              ]}
            >
              Chờ nhận
            </Text>
            {waitingCount > 0 ? (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{waitingCount}</Text>
              </View>
            ) : null}
          </Pressable>

          <Pressable
            onPress={() => setActiveTab('ACTIVE')}
            style={[styles.tab, activeTab === 'ACTIVE' ? styles.tabActive : null]}
          >
            <Text
              style={[
                styles.tabText,
                activeTab === 'ACTIVE' ? styles.tabTextActive : null,
              ]}
            >
              Đang thực hiện
            </Text>
            {activeCount > 0 ? (
              <View style={styles.badgeSuccess}>
                <Text style={styles.badgeText}>{activeCount}</Text>
              </View>
            ) : null}
          </Pressable>
        </View>

        {/* 5. Chuyến đang thực hiện (Active Trip Slab) */}
        {view.activeTrip ? (
          <View style={styles.section}>
            <SectionHeading title="Chuyến đang thực hiện" />
            <ActiveTripRail onOpenOrder={onOpenOrder} trip={view.activeTrip} />
          </View>
        ) : null}

        {/* 6. Đơn có thể nhận (Available Orders Feed) */}
        <View style={styles.section}>
          <SectionHeading title="Đơn có thể nhận" />
          <FlatList
            contentContainerStyle={styles.listContent}
            data={view.requestedOrders}
            keyExtractor={(item) => item.id}
            ListEmptyComponent={
              <View style={styles.emptyBox}>
                <IconOrders color="#94A3B8" size={32} />
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
      </View>

      <IncomingDispatchModal
        offer={activeIncomingOffer}
        onAccept={(orderId) => {
          if (onAcceptIncomingOffer) {
            onAcceptIncomingOffer(orderId);
          } else if (onOpenOrder) {
            onOpenOrder(orderId);
          }
        }}
        onDecline={(orderId) => {
          setDismissedOfferId(orderId);
          if (onDeclineIncomingOffer) {
            onDeclineIncomingOffer(orderId);
          }
        }}
        visible={activeIncomingOffer !== null}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screenContainer: {
    backgroundColor: '#0F172A',
    flex: 1,
  },
  scrollContent: {
    paddingBottom: layout.bottomNavClearance + 24,
  },
  skeletonList: {
    gap: spacing.sm,
  },

  /* Hero Section */
  heroSection: {
    width: '100%',
    backgroundColor: '#0F172A',
  },
  heroBackground: {
    width: '100%',
  },
  heroBackgroundImage: {
    opacity: 0.9,
  },
  heroOverlay: {
    backgroundColor: 'rgba(15, 23, 42, 0.82)',
    paddingHorizontal: spacing.md,
    paddingTop: spacing.lg,
    paddingBottom: spacing.xl + 8,
    gap: spacing.md,
  },
  heroTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  locationChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    borderColor: 'rgba(56, 189, 248, 0.25)',
    borderWidth: 1,
    borderRadius: radius.pill,
    paddingHorizontal: 10,
    paddingVertical: 4,
    gap: 6,
  },
  locationChipText: {
    color: '#BAE6FD',
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.2,
  },
  heroNotificationBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
  },
  mastheadBlock: {
    gap: 4,
  },
  eyebrowBadge: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(2, 132, 199, 0.3)',
    borderColor: '#0284C7',
    borderWidth: 1,
    borderRadius: radius.pill,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  eyebrowText: {
    color: '#7DD3FC',
    fontSize: 10.5,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  heroTitle: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: '800',
    letterSpacing: -0.4,
  },
  vehicleInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 2,
  },
  vehicleInfoText: {
    color: '#CBD5E1',
    fontSize: 12.5,
    fontWeight: '500',
  },

  /* Cockpit Availability Switch */
  availabilityCockpit: {
    backgroundColor: 'rgba(30, 41, 59, 0.95)',
    borderColor: 'rgba(255, 255, 255, 0.12)',
    borderRadius: 16,
    borderWidth: 1,
    gap: spacing.sm,
    padding: spacing.md,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  availabilityHeaderRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  availabilityTitleBlock: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 10,
    flex: 1,
  },
  pulseDotOuter: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pulseDotOnlineOuter: {
    backgroundColor: 'rgba(22, 163, 74, 0.18)',
  },
  pulseDotOfflineOuter: {
    backgroundColor: 'rgba(148, 163, 184, 0.15)',
  },
  pulseDotInner: {
    borderRadius: radius.pill,
    height: 10,
    width: 10,
  },
  dotOnline: {
    backgroundColor: '#16A34A',
  },
  dotOffline: {
    backgroundColor: colors.neutral.subtleText,
  },
  availabilityTextGroup: {
    flex: 1,
  },
  availabilitySectionTitle: {
    color: '#FFFFFF',
    fontSize: 13.5,
    fontWeight: '700',
  },
  availabilitySectionSub: {
    color: '#94A3B8',
    fontSize: 11,
    marginTop: 1,
  },
  errorBanner: {
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    borderRadius: radius.control,
    padding: spacing.xs,
  },
  dangerText: {
    ...typography.caption,
    color: '#FCA5A5',
    fontWeight: '600',
  },

  /* Curved Bottom Sheet */
  bottomSheetContainer: {
    backgroundColor: leopardPalette.canvas,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    marginTop: -22,
    paddingHorizontal: spacing.md,
    paddingTop: 10,
    gap: spacing.sm,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: -6 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 8,
  },
  dragHandleBar: {
    width: 38,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#CBD5E1',
    alignSelf: 'center',
    marginBottom: spacing.xs,
  },

  /* KPI Performance Strip */
  kpiContainer: {
    flexDirection: 'row',
    gap: spacing.xs,
  },
  kpiCard: {
    backgroundColor: leopardPalette.surfaceWhite,
    borderColor: leopardPalette.cardBorder,
    borderRadius: 14,
    borderWidth: 1,
    flex: 1,
    gap: 3,
    padding: spacing.sm,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
  },
  kpiHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  kpiLabel: {
    color: leopardPalette.textMutedSlate,
    fontSize: 9.5,
    fontWeight: '800',
    letterSpacing: 0.4,
  },
  kpiValue: {
    color: leopardPalette.textSlateDark,
    fontSize: 14.5,
    fontWeight: '800',
    fontVariant: ['tabular-nums'],
  },
  kpiSubSuccess: {
    color: '#16A34A',
    fontSize: 10.5,
    fontWeight: '600',
  },
  kpiSubBrand: {
    color: leopardPalette.primary,
    fontSize: 10.5,
    fontWeight: '600',
  },
  kpiSubRating: {
    color: '#D97706',
    fontSize: 10.5,
    fontWeight: '600',
  },

  /* Segmented Tab Bar */
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#E2E8F0',
    borderRadius: 12,
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
    borderRadius: 9,
  },
  tabActive: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
    elevation: 2,
  },
  tabText: {
    fontSize: 13,
    fontWeight: '600',
    color: leopardPalette.textMutedSlate,
  },
  tabTextActive: {
    color: leopardPalette.primary,
    fontWeight: '700',
  },
  badge: {
    backgroundColor: leopardPalette.primary,
    borderRadius: radius.pill,
    paddingHorizontal: 6,
    paddingVertical: 1,
    minWidth: 18,
    alignItems: 'center',
  },
  badgeSuccess: {
    backgroundColor: '#16A34A',
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

  /* Sections */
  section: {
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  listContent: {
    gap: spacing.sm,
  },

  /* Active Trip Rail (Cockpit Slab) */
  activeRail: {
    backgroundColor: leopardPalette.surfaceWhite,
    borderColor: '#BAE6FD',
    borderLeftWidth: 4,
    borderLeftColor: colors.brand.background,
    borderRadius: 16,
    borderWidth: 1,
    gap: spacing.sm,
    padding: spacing.md,
    minHeight: 48,
    shadowColor: '#0284C7',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
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
    borderRadius: 10,
    height: 32,
    justifyContent: 'center',
    width: 32,
  },
  activeReference: {
    color: leopardPalette.textSlateDark,
    fontSize: 15,
    fontWeight: '700',
  },
  activeRouteSpineBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    padding: 10,
  },
  routeSpineColumn: {
    alignItems: 'center',
    width: 12,
    paddingTop: 4,
  },
  spineOriginDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#16A34A',
  },
  spineConnectorLine: {
    width: 1.5,
    height: 24,
    backgroundColor: '#CBD5E1',
    marginVertical: 2,
  },
  spineDestSquare: {
    width: 8,
    height: 8,
    borderRadius: 2,
    backgroundColor: '#EF4444',
  },
  routeSpineLabels: {
    flex: 1,
    gap: 2,
  },
  activeOriginText: {
    color: leopardPalette.textSlateDark,
    fontSize: 13,
    fontWeight: '600',
  },
  spineEtaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  spineEtaText: {
    color: colors.brand.background,
    fontSize: 11.5,
    fontWeight: '600',
  },
  activeDestText: {
    color: leopardPalette.textSlateDark,
    fontSize: 13,
    fontWeight: '600',
  },
  activeSignalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  liveTrackingIndicator: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 6,
  },
  livePulseDot: {
    backgroundColor: colors.brand.background,
    borderRadius: radius.pill,
    height: 7,
    width: 7,
  },
  trackingText: {
    color: colors.brand.background,
    fontSize: 12,
    fontWeight: '600',
  },
  proofNoticeText: {
    color: colors.warning.text,
    fontSize: 12,
    fontWeight: '600',
  },
  activeCardFooter: {
    borderTopColor: leopardPalette.subtleDivider,
    borderTopWidth: 1,
    paddingTop: spacing.xs,
  },
  activeActionHint: {
    color: leopardPalette.primary,
    fontSize: 12.5,
    fontWeight: '700',
  },

  /* Public Order Card */
  orderCard: {
    backgroundColor: leopardPalette.surfaceWhite,
    borderColor: leopardPalette.cardBorder,
    borderRadius: 16,
    borderWidth: 1,
    gap: spacing.xs,
    padding: spacing.md,
    minHeight: 48,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
  },
  cardHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  referenceText: {
    color: leopardPalette.textSlateDark,
    fontSize: 15,
    fontWeight: '700',
  },
  routeRow: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: 6,
    marginTop: 2,
  },
  routeText: {
    color: leopardPalette.textSlateDark,
    fontSize: 13.5,
    lineHeight: 19,
    flex: 1,
    fontWeight: '500',
  },
  tagsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 2,
  },
  vehicleTag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
    borderRadius: 6,
    paddingHorizontal: 7,
    paddingVertical: 3,
    gap: 4,
  },
  vehicleTagText: {
    color: '#475569',
    fontSize: 11.5,
    fontWeight: '600',
  },
  cargoTag: {
    backgroundColor: '#F1F5F9',
    borderRadius: 6,
    paddingHorizontal: 7,
    paddingVertical: 3,
    flex: 1,
  },
  cargoTagText: {
    color: '#64748B',
    fontSize: 11.5,
  },
  cardFooter: {
    alignItems: 'center',
    borderTopColor: leopardPalette.subtleDivider,
    borderTopWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: spacing.xs,
    marginTop: 4,
  },
  priceEtaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  priceText: {
    color: leopardPalette.primary,
    fontSize: 13,
    fontWeight: '700',
  },
  updatedText: {
    color: leopardPalette.textSubtle,
    fontSize: 11.5,
  },

  /* Empty Box */
  emptyBox: {
    backgroundColor: leopardPalette.surfaceWhite,
    borderColor: leopardPalette.cardBorder,
    borderRadius: 16,
    borderWidth: 1,
    gap: 6,
    padding: spacing.xl,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 140,
  },
  emptyTitle: {
    ...typography.label,
    color: leopardPalette.textSlateDark,
    fontSize: 15,
    fontWeight: '700',
  },
  emptyMessage: {
    ...typography.caption,
    color: leopardPalette.textMutedSlate,
    textAlign: 'center',
    maxWidth: 240,
  },

  /* Notices */
  notice: {
    borderRadius: 12,
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
  pressed: {
    opacity: 0.85,
  },
});
