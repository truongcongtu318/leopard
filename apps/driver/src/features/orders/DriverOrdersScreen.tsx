import React, { useEffect, useState } from 'react';
import {
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import {
  colors,
  radius,
  spacing,
  typography,
  Button,
  GestureBottomSheet,
  IconClose,
  IconLocationPin,
  IconMenu,
  IconOrders,
  IconSpeedTruck,
  IconSupport247,
  IconWallet,
  RealInteractiveMap,
  resolveLocationCoords,
  ScreenState,
  SkeletonCard,
} from '@leopard/mobile-core';
import { useDriverDrawer } from '../navigation/DriverDrawerContext';
import { useDriverIdlePingHealth } from './useDriverIdlePing';
import { IncomingDispatchModal } from './IncomingDispatchModal';
import type { IncomingDispatchOffer } from './IncomingDispatchModal';
import type {
  DriverActiveTripView,
  DriverListContentView,
  DriverListView,
  DriverPublicOrderView,
} from './model';

import { DriverTopHud } from './components/DriverTopHud';
import { DriverSystemBanner } from './components/DriverSystemBanner';
import { DriverActiveTripCard } from './components/DriverActiveTripCard';
import { DriverOrderFilters } from './components/DriverOrderFilters';
import { DriverNearbyOrderCard } from './components/DriverNearbyOrderCard';
import { DriverBottomNavigation } from './components/DriverBottomNavigation';
import {
  getDriverCurrentLocation,
  type DriverLocationState,
} from './driver-current-location';

const EMPTY_SNAP_POINTS: number[] = [0.26, 0.38, 0.86];
const ORDER_SNAP_POINTS: number[] = [0.26, 0.50, 0.92];
const ACTIVE_TRIP_SNAP_POINTS: number[] = [0.32, 0.58, 0.92];

export type DriverOrdersScreenProps = Readonly<{
  view: DriverListView;
  onSetAvailability?: (commandId: string) => void;
  onOpenOrder?: (orderId: string) => void;
  onRetry?: () => void;
  onNoticeAction?: () => void;
  incomingOffer?: IncomingDispatchOffer | null;
  onAcceptIncomingOffer?: (orderId: string) => void;
  onDeclineIncomingOffer?: (orderId: string) => void;
  isAcceptingIncomingOffer?: boolean;
  onNavigate?: (route: string) => void;
  networkError?: string | null;
  driverIdentity?: {
    name?: string | null;
    vehicleLabel?: string | null;
    vehiclePlate?: string | null;
    vehicleType?: string | null;
  };
  showDebugActions?: boolean;
}>;

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

function ReceivingSettingsModal({
  onClose,
  onSave,
  radiusKm,
  visible,
}: Readonly<{
  visible: boolean;
  radiusKm: string;
  onClose: () => void;
  onSave: (radius: string) => void;
}>) {
  const [selectedRadius, setSelectedRadius] = useState(radiusKm);

  const radiusOptions = ['3', '5', '10', '15'];

  return (
    <Modal
      animationType="slide"
      hardwareAccelerated
      statusBarTranslucent
      transparent
      visible={visible}
    >
      <View style={styles.modalBackdrop}>
        <View style={styles.settingsSheet}>
          <View style={styles.settingsHeader}>
            <Text style={styles.settingsTitle}>THIẾT LẬP NHẬN ĐƠN</Text>
            <Pressable
              accessibilityLabel="Đóng thiết lập"
              accessibilityRole="button"
              hitSlop={8}
              onPress={onClose}
              style={({ pressed }) => [styles.closeBtn, pressed ? styles.pressed : null]}
            >
              <IconClose color="#64748B" size={18} />
            </Pressable>
          </View>

          <View style={styles.settingsBody}>
            <Text style={styles.filterSectionLabel}>BÁN KÍNH QUÉT ĐƠN (KM)</Text>
            <View style={styles.optionsRow}>
              {radiusOptions.map((r) => (
                <Pressable
                  key={r}
                  onPress={() => setSelectedRadius(r)}
                  style={[styles.optionPill, selectedRadius === r ? styles.optionPillActive : null]}
                >
                  <Text
                    style={[
                      styles.optionPillText,
                      selectedRadius === r ? styles.optionPillTextActive : null,
                    ]}
                  >
                    {r} km
                  </Text>
                </Pressable>
              ))}
            </View>

            <Pressable
              accessibilityLabel="Lưu cấu hình"
              accessibilityRole="button"
              onPress={() => {
                onSave(selectedRadius);
                onClose();
              }}
              style={({ pressed }) => [styles.saveSettingsBtn, pressed ? styles.pressed : null]}
            >
              <Text style={styles.saveSettingsBtnText}>ÁP DỤNG CẤU HÌNH</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

function DriverLocationStatus({
  location,
  onRetry,
}: Readonly<{
  location: DriverLocationState;
  onRetry: () => void;
}>) {
  if (location.kind === 'ready') {
    return (
      <View
        accessibilityLabel="Đang hiển thị vị trí GPS hiện tại"
        style={styles.locationStatus}
        testID="driver-current-location-status"
      >
        <View style={[styles.locationStatusDot, styles.locationStatusDotReady]} />
        <Text style={styles.locationStatusText}>Vị trí hiện tại</Text>
      </View>
    );
  }

  if (location.kind === 'loading') {
    return (
      <View
        accessibilityLabel="Đang xác định vị trí GPS hiện tại"
        style={styles.locationStatus}
        testID="driver-current-location-status"
      >
        <View style={[styles.locationStatusDot, styles.locationStatusDotLoading]} />
        <Text style={styles.locationStatusText}>Đang xác định vị trí...</Text>
      </View>
    );
  }

  const label =
    location.kind === 'permission-denied'
      ? 'Chưa cấp quyền vị trí · Thử lại'
      : 'Không lấy được vị trí · Thử lại';

  return (
    <Pressable
      accessibilityLabel={label}
      accessibilityRole="button"
      onPress={onRetry}
      style={({ pressed }) => [
        styles.locationStatus,
        styles.locationStatusWarning,
        pressed ? styles.pressed : null,
      ]}
      testID="driver-current-location-status"
    >
      <View style={[styles.locationStatusDot, styles.locationStatusDotWarning]} />
      <Text style={[styles.locationStatusText, styles.locationStatusTextWarning]}>{label}</Text>
    </Pressable>
  );
}

export function DriverOrdersScreen({
  driverIdentity,
  incomingOffer = null,
  isAcceptingIncomingOffer = false,
  networkError = null,
  onAcceptIncomingOffer,
  onDeclineIncomingOffer,
  onNavigate,
  onNoticeAction,
  onOpenOrder,
  onRetry,
  onSetAvailability,
  showDebugActions = false,
  view,
}: DriverOrdersScreenProps) {
  const [dismissedOfferId, setDismissedOfferId] = useState<string | null>(null);
  const [simulatedOffer, setSimulatedOffer] = useState<IncomingDispatchOffer | null>(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [radiusKm, setRadiusKm] = useState('5');
  const [dismissedOrderIds, setDismissedOrderIds] = useState<readonly string[]>([]);
  const [locationRequestKey, setLocationRequestKey] = useState(0);
  const [driverLocation, setDriverLocation] = useState<DriverLocationState>({ kind: 'loading' });
  const { openDrawer } = useDriverDrawer();
  const idlePingHealth = useDriverIdlePingHealth();

  useEffect(() => {
    let isMounted = true;
    setDriverLocation({ kind: 'loading' });
    void getDriverCurrentLocation().then((nextLocation) => {
      if (isMounted) setDriverLocation(nextLocation);
    });
    return () => {
      isMounted = false;
    };
  }, [locationRequestKey]);

  const truckCoords = driverLocation.kind === 'ready' ? driverLocation.coords : undefined;
  const retryCurrentLocation = () => setLocationRequestKey((current) => current + 1);

  const handleOpenMenu = () => {
    openDrawer();
  };

  const handleSimulateIncomingOffer = () => {
    const first = view.kind === 'content' && view.requestedOrders.length > 0 ? view.requestedOrders[0] : null;
    setDismissedOfferId(null);
    if (first) {
      setSimulatedOffer({
        id: first.id,
        reference: first.reference,
        pickupDistanceLabel: first.pickupDistanceLabel ?? 'Cách bạn 1.2 km · 4 phút',
        pickupAddress: first.pickupLocationLabel ?? 'Kho Tân Bình, Q. Tân Bình, TP.HCM',
        dropoffAddress: first.dropoffLocationLabel ?? 'KCN Sóng Thần 1, Dĩ An, Bình Dương',
        tripDistanceLabel: first.distanceLabel ?? '24.5 km',
        etaLabel: first.etaLabel ?? '45 phút (ước tính)',
        priceLabel: first.priceLabel ?? '485.000 ₫',
        vehicleLabel: first.vehicleLabel ?? 'Xe tải 2.5T mui bạt',
        cargoSummary: first.cargoSummary ?? 'Thiết bị phụ tùng công nghiệp (1.800 kg)',
        notes: 'Bốc dỡ nhanh tại cổng số 2 kho tổng',
        timeoutSeconds: 30,
      });
    } else {
      setSimulatedOffer({
        id: 'sim-offer-999',
        reference: 'ORD-DEMO-999',
        pickupDistanceLabel: 'Cách bạn 0.8 km · 3 phút',
        pickupAddress: 'Kho Tân Bình, Q. Tân Bình, TP.HCM',
        dropoffAddress: 'KCN Sóng Thần 1, Dĩ An, Bình Dương',
        tripDistanceLabel: '24.5 km',
        etaLabel: '45 phút (ước tính)',
        priceLabel: '485.000 ₫',
        vehicleLabel: 'Xe tải 2.5T mui bạt',
        cargoSummary: 'Kiện pallet linh kiện điện tử (1.8 tấn)',
        notes: 'Giao trong giờ hành chính, có xe nâng hạ hàng',
        timeoutSeconds: 30,
      });
    }
  };

  const activeIncomingOffer =
    incomingOffer && incomingOffer.id !== dismissedOfferId
      ? incomingOffer
      : simulatedOffer && simulatedOffer.id !== dismissedOfferId
        ? simulatedOffer
        : null;

  // ── Loading State ──────────────────────────────────────────────────────────
  if (view.kind === 'loading') {
    return (
      <View style={styles.screenRoot}>
        {/* Layer 0: Map Canvas */}
        <View style={styles.mapLayerContainer} testID="driver-map-canvas">
          <RealInteractiveMap
            height="100%"
            initialPinCoords={truckCoords}
            interactive={false}
            mode="location"
            style={StyleSheet.absoluteFill}
            truckLocation={truckCoords}
          />
        </View>

        {/* Layer 1: Top HUD */}
        <View style={styles.topHudContainer}>
          <Text style={styles.srOnly}>Trạng thái nhận đơn</Text>
          <DriverTopHud
            disabled={true}
            driverName={driverIdentity?.name ?? 'Tài xế LEOPARD'}
            isOnline={false}
            onOpenEarnings={() => onNavigate?.('/earnings')}
            onOpenProfile={() => onNavigate?.('/profile')}
            onToggleAvailability={() => {}}
            vehiclePlate={driverIdentity?.vehiclePlate ?? undefined}
            vehicleType={driverIdentity?.vehicleType ?? undefined}
          />
          <DriverLocationStatus location={driverLocation} onRetry={retryCurrentLocation} />
        </View>

        {/* Layer 2: GestureBottomSheet with Skeletons */}
        <GestureBottomSheet
          initialSnapIndex={1}
          snapPoints={ORDER_SNAP_POINTS}
          testID="driver-load-board-sheet"
        >
          <View style={styles.sheetScrollContent}>
            <View style={styles.ordersSectionHeader}>
              <Text accessibilityRole="header" style={styles.loadBoardTitle}>
                Đơn có thể nhận
              </Text>
              <Text style={styles.loadBoardSubtitle}>Đang tải dữ liệu đơn hàng...</Text>
            </View>
            <View style={styles.skeletonList}>
              <SkeletonCard />
              <SkeletonCard />
            </View>
          </View>
        </GestureBottomSheet>

        <DriverBottomNavigation activeTab="home" onNavigate={onNavigate} />
      </View>
    );
  }

  // ── Error / Permission Denied State ───────────────────────────────────────
  if (view.kind !== 'content') {
    return (
      <View style={styles.screenRoot}>
        {/* Layer 0: Map Canvas */}
        <View style={styles.mapLayerContainer} testID="driver-map-canvas">
          <RealInteractiveMap
            height="100%"
            initialPinCoords={truckCoords}
            interactive={false}
            mode="location"
            style={StyleSheet.absoluteFill}
            truckLocation={truckCoords}
          />
        </View>

        {/* Layer 1: Top HUD */}
        <View style={styles.topHudContainer}>
          <Text style={styles.srOnly}>Trạng thái nhận đơn</Text>
          <DriverTopHud
            disabled={true}
            driverName={driverIdentity?.name ?? 'Tài xế LEOPARD'}
            isOnline={false}
            onOpenEarnings={() => onNavigate?.('/earnings')}
            onOpenProfile={() => onNavigate?.('/profile')}
            onToggleAvailability={() => {}}
            vehiclePlate={driverIdentity?.vehiclePlate ?? undefined}
            vehicleType={driverIdentity?.vehicleType ?? undefined}
          />
          <DriverLocationStatus location={driverLocation} onRetry={retryCurrentLocation} />
        </View>

        {/* Layer 2: Boundary Card */}
        <View style={styles.boundaryContainer}>
          <ScreenState
            actionLabel={view.kind === 'error' ? 'Thử tải lại danh sách' : undefined}
            message={view.message}
            onAction={onRetry}
            state={view.kind}
            title={view.title}
          />
        </View>

        <DriverBottomNavigation activeTab="home" onNavigate={onNavigate} />
      </View>
    );
  }

  // ── Content State ──────────────────────────────────────────────────────────
  const activeTrip = view.activeTrip;
  const waitingCount = view.requestedOrders.length;
  const isOnline =
    view.availability.status === 'AVAILABLE' ||
    (view.availability.status as string) === 'ONLINE';

  const handleToggleAvailability = () => {
    if (view.availability.action?.isPending) return;
    if (onSetAvailability) {
      onSetAvailability(view.availability.action?.id ?? (isOnline ? 'OFFLINE' : 'ONLINE'));
    }
  };

  const filteredOrders = view.requestedOrders.filter(
    (item) => !dismissedOrderIds.includes(item.id),
  );

  const snapPoints = activeTrip
    ? ACTIVE_TRIP_SNAP_POINTS
    : filteredOrders.length === 0
      ? EMPTY_SNAP_POINTS
      : ORDER_SNAP_POINTS;

  const initialSnapIndex = filteredOrders.length === 0 && !activeTrip ? 0 : 1;

  return (
    <View style={styles.screenRoot}>
      {/* ── Layer 0: RealInteractiveMap running behind ── */}
      <View style={styles.mapLayerContainer} testID="driver-map-canvas">
        <RealInteractiveMap
          destination={
            activeTrip
              ? {
                  coords:
                    activeTrip.route.destination.coords ||
                    resolveLocationCoords(activeTrip.route.destination.label),
                  label: activeTrip.route.destination.label,
                }
              : undefined
          }
          height="100%"
          initialPinCoords={truckCoords}
          interactive={true}
          mode={activeTrip ? 'tracking' : 'location'}
          origin={
            activeTrip
              ? {
                  coords:
                    activeTrip.route.origin.coords ||
                    resolveLocationCoords(activeTrip.route.origin.label),
                  label: activeTrip.route.origin.label,
                }
              : undefined
          }
          stops={
            activeTrip
              ? activeTrip.route.stops.map((stop) => ({
                  id: stop.id,
                  label: stop.label,
                  coords: resolveLocationCoords(stop.label),
                }))
              : undefined
          }
          style={StyleSheet.absoluteFill}
          truckEtaLabel={activeTrip ? activeTrip.route.distanceLabel : undefined}
          truckLocation={truckCoords}
        />
      </View>

      {/* ── Layer 1: Clean Top Header HUD ── */}
      <View style={styles.topHudContainer}>
        <Text style={styles.srOnly}>Trạng thái nhận đơn</Text>
        <DriverTopHud
          disabled={Boolean(view.availability.action?.disabled)}
          driverName={driverIdentity?.name ?? 'Tài xế LEOPARD'}
          isOnline={isOnline}
          isPending={Boolean(view.availability.action?.isPending)}
          onOpenEarnings={() => onNavigate?.('/earnings')}
          onOpenProfile={() => onNavigate?.('/profile')}
          onToggleAvailability={handleToggleAvailability}
          todayEarningsLabel="0 ₫"
          toggleAccessibilityLabel={
            view.availability.action?.isPending
              ? 'Đang cập nhật trạng thái nhận đơn'
              : undefined
          }
          vehiclePlate={driverIdentity?.vehiclePlate ?? undefined}
          vehicleType={driverIdentity?.vehicleType ?? undefined}
        />
        <DriverLocationStatus location={driverLocation} onRetry={retryCurrentLocation} />
      </View>

      {/* ── Layer 1.5: Floating Map Connection Capsule (Grab Driver Style) ── */}
      {!activeTrip ? (
        <View pointerEvents="box-none" style={styles.mapHeroConnectionWrap}>
          <Pressable
            accessibilityLabel={
              isOnline
                ? 'Đang trực tuyến. Chạm để tạm nghỉ'
                : 'Đang ngoại tuyến. Chạm để bật trực tuyến nhận đơn'
            }
            accessibilityRole="button"
            disabled={Boolean(view.availability.action?.disabled) || Boolean(view.availability.action?.isPending)}
            onPress={handleToggleAvailability}
            style={({ pressed }) => [
              styles.heroConnectionCapsule,
              isOnline ? styles.heroCapsuleOnline : styles.heroCapsuleOffline,
              pressed ? styles.pressed : null,
            ]}
            testID="driver-hero-connection-capsule"
          >
            <View
              style={[
                styles.heroPowerDot,
                { backgroundColor: isOnline ? '#16A34A' : '#94A3B8' },
              ]}
            >
              <Text style={styles.heroPowerSymbol}>⏻</Text>
            </View>
            <Text style={styles.heroCapsuleText}>
              {isOnline ? 'ĐANG KẾT NỐI' : 'BẬT KẾT NỐI'}
            </Text>
          </Pressable>
          <View style={styles.heroStatusSubtextRow}>
            <View
              style={[
                styles.heroStatusDot,
                { backgroundColor: isOnline ? '#16A34A' : '#DC2626' },
              ]}
            />
            <Text style={styles.heroStatusSubtext}>
              {isOnline ? 'Bạn đang online (Sẵn sàng nhận đơn)' : 'Bạn đang offline'}
            </Text>
          </View>
        </View>
      ) : null}

      {/* ── Layer 2: GestureBottomSheet for Dispatch Load-Board & Active Trip ── */}
      <GestureBottomSheet
        initialSnapIndex={initialSnapIndex}
        snapPoints={snapPoints}
        testID="driver-load-board-sheet"
      >
        <ScrollView
          contentContainerStyle={styles.sheetScrollContent}
          nestedScrollEnabled={true}
          showsVerticalScrollIndicator={false}
        >
          {/* Active Trip Rail (visual anchor when on a trip) */}
          {activeTrip ? (
            <DriverActiveTripCard
              onNavigate={onNavigate}
              onOpenOrder={onOpenOrder}
              trip={activeTrip}
            />
          ) : null}

          {/* Quick Action Grid (Grab Driver 4-Button Grid) */}
          {!activeTrip ? (
            <View style={styles.quickActionGrid} testID="driver-quick-action-grid">
              <Pressable
                accessibilityLabel="Thông tin xe vận chuyển"
                accessibilityRole="button"
                onPress={() => onNavigate?.('/profile')}
                style={({ pressed }) => [styles.quickActionBtn, pressed && styles.pressed]}
                testID="quick-action-vehicle"
              >
                <View style={styles.quickActionCircle}>
                  <IconSpeedTruck color="#0B1E42" size={20} />
                </View>
                <Text style={styles.quickActionLabel}>Loại xe</Text>
              </Pressable>

              <Pressable
                accessibilityLabel="Lịch sử cuốc xe"
                accessibilityRole="button"
                onPress={() => onNavigate?.('/history')}
                style={({ pressed }) => [styles.quickActionBtn, pressed && styles.pressed]}
                testID="quick-action-trips"
              >
                <View style={styles.quickActionCircle}>
                  <IconOrders color="#0B1E42" size={20} />
                </View>
                <Text style={styles.quickActionLabel}>Chuyến xe</Text>
              </Pressable>

              <Pressable
                accessibilityLabel="Ví tài xế"
                accessibilityRole="button"
                onPress={() => onNavigate?.('/wallet')}
                style={({ pressed }) => [styles.quickActionBtn, pressed && styles.pressed]}
                testID="quick-action-wallet"
              >
                <View style={styles.quickActionCircle}>
                  <IconWallet color="#0B1E42" size={20} />
                </View>
                <Text style={styles.quickActionLabel}>Ví tài xế</Text>
              </Pressable>

              <Pressable
                accessibilityLabel="Cài đặt và hỗ trợ"
                accessibilityRole="button"
                onPress={() => setIsSettingsOpen(true)}
                style={({ pressed }) => [styles.quickActionBtn, pressed && styles.pressed]}
                testID="quick-action-settings"
              >
                <View style={styles.quickActionCircle}>
                  <IconSupport247 color="#0B1E42" size={20} />
                </View>
                <Text style={styles.quickActionLabel}>Cài đặt</Text>
              </Pressable>
            </View>
          ) : null}

          {/* Demand Opportunity Card (Khu vực nhu cầu cao) */}
          {!activeTrip ? (
            <View style={styles.demandCard} testID="driver-demand-card">
              <View style={styles.demandHeader}>
                <View style={styles.demandIconCircle}>
                  <IconLocationPin color="#F97316" size={16} />
                </View>
                <View style={styles.demandMeta}>
                  <Text style={styles.demandTitle}>Điểm nóng hàng hóa lân cận</Text>
                  <Text style={styles.demandDesc}>
                    KCN Tân Bình · Depot Cát Lái · KCN Sóng Thần đang tập trung nhiều đơn chở hàng.
                  </Text>
                </View>
              </View>
            </View>
          ) : null}

          {/* Prominent Offline Banner when not active and offline */}
          {!activeTrip && !isOnline ? (
            <View style={styles.offlineBanner} testID="driver-offline-banner">
              <View style={styles.offlineBannerHeader}>
                <View style={styles.offlineDot} />
                <Text style={styles.offlineBannerTitle}>Ngoại tuyến</Text>
              </View>
              <Text style={styles.offlineBannerMessage}>
                Bật trực tuyến để kích hoạt radar và nhận các đơn hàng gần bạn.
              </Text>
              <Pressable
                accessibilityLabel="Bật trực tuyến"
                accessibilityRole="button"
                onPress={handleToggleAvailability}
                style={({ pressed }) => [styles.goOnlineBtn, pressed ? styles.pressed : null]}
                testID="driver-go-online-btn"
              >
                <Text style={styles.goOnlineBtnText}>BẬT TRỰC TUYẾN</Text>
              </Pressable>
            </View>
          ) : null}

          {/* System & Connection Banner (radar health or network retry) */}
          <DriverSystemBanner
            hasActiveTrip={Boolean(activeTrip)}
            idlePingHealth={idlePingHealth}
            isOnline={isOnline}
            networkError={networkError}
            onRetry={onRetry}
          />

          {/* Order Filters & Live Radar Strip */}
          <DriverOrderFilters
            hasActiveTrip={Boolean(activeTrip)}
            onOpenSettings={() => setIsSettingsOpen(true)}
            onSimulateOffer={showDebugActions ? handleSimulateIncomingOffer : undefined}
            radiusKm={radiusKm}
            showDebugActions={showDebugActions}
            totalCount={filteredOrders.length}
            waitingCount={waitingCount}
          />

          {/* System Notice Alert if present */}
          <DriverNotice onNoticeAction={onNoticeAction} view={view} />

          {/* Feed of Orders or Empty State */}
          {filteredOrders.length === 0 ? (
            <View style={styles.emptyBox}>
              <View style={styles.emptyIconCircle}>
                <IconLocationPin color="#0B1E42" size={28} />
              </View>
              <Text style={styles.emptyTitle}>Chưa có đơn phù hợp</Text>
              <Text style={styles.emptyMessage}>
                LEOPARD sẽ thông báo khi có đơn phù hợp với phạm vi nhận của bạn.
              </Text>
              <Pressable
                accessibilityLabel="Mở rộng phạm vi nhận đơn"
                accessibilityRole="button"
                onPress={() => setIsSettingsOpen(true)}
                style={({ pressed }) => [styles.expandRadiusBtn, pressed ? styles.pressed : null]}
              >
                <Text style={styles.expandRadiusText}>Mở rộng phạm vi nhận đơn</Text>
              </Pressable>
            </View>
          ) : (
            <View style={styles.ordersFeed}>
              {filteredOrders.map((item) => (
                <DriverNearbyOrderCard
                  item={item}
                  key={item.id}
                  onDecline={(orderId) => {
                    setDismissedOrderIds((prev) =>
                      prev.includes(orderId) ? prev : [...prev, orderId],
                    );
                  }}
                  onOpenOrder={onOpenOrder}
                />
              ))}
            </View>
          )}
        </ScrollView>
      </GestureBottomSheet>

      {/* ── Layer 3: Floating Dock Navigation ── */}
      {!activeTrip ? (
        <DriverBottomNavigation
          activeTab="home"
          onNavigate={onNavigate}
        />
      ) : null}

      {/* ── Layer 4: Modals ── */}
      <IncomingDispatchModal
        isAccepting={isAcceptingIncomingOffer}
        offer={activeIncomingOffer}
        onAccept={(orderId) => {
          if (onAcceptIncomingOffer) {
            onAcceptIncomingOffer(orderId);
          } else if (onOpenOrder) {
            setSimulatedOffer(null);
            onOpenOrder(orderId);
          }
        }}
        onDecline={(orderId) => {
          setDismissedOfferId(orderId);
          setSimulatedOffer(null);
          if (onDeclineIncomingOffer) {
            onDeclineIncomingOffer(orderId);
          }
        }}
        visible={activeIncomingOffer !== null}
      />

      <ReceivingSettingsModal
        onClose={() => setIsSettingsOpen(false)}
        onSave={(r) => {
          setRadiusKm(r);
        }}
        radiusKm={radiusKm}
        visible={isSettingsOpen}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screenRoot: {
    backgroundColor: '#F4F7FB',
    flex: 1,
    position: 'relative',
  },
  mapLayerContainer: {
    ...StyleSheet.absoluteFill,
    zIndex: 0,
  },

  // Top HUD
  topHudContainer: {
    left: 12,
    position: 'absolute',
    right: 12,
    top: Platform.OS === 'ios' ? 48 : 28,
    zIndex: 20,
  },
  topHudGlass: {
    backgroundColor: 'rgba(244, 247, 251, 0.96)',
    borderColor: 'rgba(11, 30, 66, 0.08)',
    borderRadius: 22,
    borderWidth: 1,
    elevation: 6,
    paddingHorizontal: 12,
    paddingVertical: 10,
    shadowColor: '#0B1E42',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
  },
  locationStatus: {
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(255, 255, 255, 0.96)',
    borderColor: 'rgba(11, 30, 66, 0.10)',
    borderRadius: 999,
    borderWidth: 1,
    elevation: 3,
    flexDirection: 'row',
    minHeight: 36,
    marginTop: 8,
    paddingHorizontal: 12,
    shadowColor: '#0B1E42',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
  },
  locationStatusWarning: {
    backgroundColor: 'rgba(255, 251, 235, 0.97)',
    borderColor: '#FCD34D',
  },
  locationStatusDot: {
    borderRadius: 4,
    height: 8,
    marginRight: 7,
    width: 8,
  },
  locationStatusDotReady: {
    backgroundColor: '#16A34A',
  },
  locationStatusDotLoading: {
    backgroundColor: '#0284C7',
  },
  locationStatusDotWarning: {
    backgroundColor: '#D97706',
  },
  locationStatusText: {
    color: '#0B1E42',
    fontSize: 12,
    fontWeight: '700',
  },
  locationStatusTextWarning: {
    color: '#92400E',
  },
  hudMainRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  hudDriverGroup: {
    alignItems: 'center',
    flex: 1,
    flexDirection: 'row',
    marginRight: 10,
  },
  hudMenuBtn: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderColor: '#E2E8F0',
    borderRadius: 14,
    borderWidth: 1,
    height: 44,
    justifyContent: 'center',
    marginRight: 10,
    width: 44,
  },
  hudDriverMeta: {
    flex: 1,
  },
  hudDriverName: {
    color: '#0B1E42',
    fontSize: 15,
    fontWeight: '700',
  },
  hudDutyWrap: {
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  hudDutyLabel: {
    color: '#64748B',
    fontSize: 9.5,
    fontWeight: '700',
    letterSpacing: 0.3,
    marginBottom: 3,
    textTransform: 'uppercase',
  },
  capsuleBtn: {
    alignItems: 'center',
    borderRadius: 20,
    borderWidth: 1.5,
    flexDirection: 'row',
    height: 38,
    paddingHorizontal: 12,
  },
  capsuleOffline: {
    backgroundColor: '#F8FAFC',
    borderColor: '#CBD5E1',
  },
  statusDot: {
    borderRadius: 4,
    height: 8,
    marginRight: 6,
    width: 8,
  },
  statusDotOffline: {
    backgroundColor: '#94A3B8',
  },
  statusText: {
    fontSize: 12.5,
    fontWeight: '700',
    letterSpacing: 0.1,
  },
  statusTextOffline: {
    color: '#475569',
  },

  // Hero Map Connection Capsule
  mapHeroConnectionWrap: {
    alignItems: 'center',
    left: 0,
    position: 'absolute',
    right: 0,
    top: 92,
    zIndex: 25,
  },
  heroConnectionCapsule: {
    alignItems: 'center',
    borderRadius: 24,
    elevation: 6,
    flexDirection: 'row',
    height: 44,
    paddingHorizontal: 16,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.18,
    shadowRadius: 10,
  },
  heroCapsuleOffline: {
    backgroundColor: '#0B1E42',
    borderColor: '#334155',
    borderWidth: 1,
  },
  heroCapsuleOnline: {
    backgroundColor: '#16A34A',
    borderColor: '#15803D',
    borderWidth: 1,
  },
  heroPowerDot: {
    alignItems: 'center',
    borderRadius: 12,
    height: 24,
    justifyContent: 'center',
    marginRight: 8,
    width: 24,
  },
  heroPowerSymbol: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '900',
  },
  heroCapsuleText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 0.4,
  },
  heroStatusSubtextRow: {
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderRadius: 12,
    flexDirection: 'row',
    marginTop: 6,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  heroStatusDot: {
    borderRadius: 4,
    height: 8,
    marginRight: 6,
    width: 8,
  },
  heroStatusSubtext: {
    color: '#1E293B',
    fontSize: 11,
    fontWeight: '600',
  },

  // Quick Action Grid (Grab Style 4-Button Grid)
  quickActionGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 14,
    marginTop: 4,
  },
  quickActionBtn: {
    alignItems: 'center',
    flex: 1,
  },
  quickActionCircle: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderColor: '#E2E8F0',
    borderRadius: 25,
    borderWidth: 1,
    elevation: 2,
    height: 50,
    justifyContent: 'center',
    marginBottom: 6,
    shadowColor: '#0B1E42',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    width: 50,
  },
  quickActionLabel: {
    color: '#334155',
    fontSize: 11,
    fontWeight: '700',
  },

  // Demand Bento Card
  demandCard: {
    backgroundColor: '#FFFFFF',
    borderColor: '#E2E8F0',
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 14,
    padding: 12,
  },
  demandHeader: {
    alignItems: 'center',
    flexDirection: 'row',
  },
  demandIconCircle: {
    alignItems: 'center',
    backgroundColor: 'rgba(249, 115, 22, 0.12)',
    borderRadius: 18,
    height: 36,
    justifyContent: 'center',
    marginRight: 10,
    width: 36,
  },
  demandMeta: {
    flex: 1,
  },
  demandTitle: {
    color: '#0B1E42',
    fontSize: 13,
    fontWeight: '800',
    marginBottom: 2,
  },
  demandDesc: {
    color: '#64748B',
    fontSize: 11,
    lineHeight: 16,
  },

  // Sheet Content
  sheetScrollContent: {
    backgroundColor: '#F4F7FB',
    paddingBottom: 104,
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  ordersSectionHeader: {
    marginBottom: 12,
  },
  loadBoardTitle: {
    color: '#0B1E42',
    fontSize: 17,
    fontWeight: '800',
  },
  loadBoardSubtitle: {
    color: '#64748B',
    fontSize: 12,
    marginTop: 1,
  },
  skeletonList: {
    gap: 12,
    marginTop: 8,
  },
  skeletonTextLineLg: {
    backgroundColor: '#E2E8F0',
    borderRadius: 4,
    height: 14,
    marginBottom: 6,
    width: 100,
  },
  skeletonTextLineSm: {
    backgroundColor: '#E2E8F0',
    borderRadius: 4,
    height: 10,
    width: 70,
  },

  // Boundary
  boundaryContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    elevation: 8,
    left: 20,
    padding: 24,
    position: 'absolute',
    right: 20,
    top: '35%',
    zIndex: 30,
  },

  // Orders Feed
  ordersFeed: {
    gap: 2,
  },

  // Empty Box
  emptyBox: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderColor: '#E2E8F0',
    borderRadius: 22,
    borderWidth: 1,
    marginTop: 10,
    paddingHorizontal: 20,
    paddingVertical: 32,
    shadowColor: '#0B1E42',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 1,
  },
  emptyIconCircle: {
    alignItems: 'center',
    backgroundColor: '#F0F4F9',
    borderRadius: 28,
    height: 56,
    justifyContent: 'center',
    marginBottom: 12,
    width: 56,
  },
  emptyTitle: {
    color: '#0B1E42',
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 4,
  },
  emptyMessage: {
    color: '#64748B',
    fontSize: 13,
    lineHeight: 18,
    textAlign: 'center',
  },
  expandRadiusBtn: {
    alignItems: 'center',
    backgroundColor: '#0B1E42',
    borderRadius: 14,
    marginTop: 16,
    minHeight: 44,
    justifyContent: 'center',
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  expandRadiusText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },

  // Notice
  notice: {
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 12,
    padding: 12,
  },
  noticeInfo: {
    backgroundColor: '#F0F4F9',
    borderColor: '#CBD5E1',
  },
  noticeWarning: {
    backgroundColor: '#FFFBEB',
    borderColor: '#FDE68A',
  },
  noticeDanger: {
    backgroundColor: '#FEF2F2',
    borderColor: '#FECACA',
  },
  noticeBody: {
    color: '#0B1E42',
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 6,
  },

  // Settings Modal
  modalBackdrop: {
    backgroundColor: 'rgba(11, 30, 66, 0.45)',
    flex: 1,
    justifyContent: 'flex-end',
  },
  settingsSheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingBottom: 36,
    paddingHorizontal: 20,
    paddingTop: 18,
  },
  settingsHeader: {
    alignItems: 'center',
    borderBottomColor: '#F1F5F9',
    borderBottomWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingBottom: 14,
  },
  settingsTitle: {
    color: '#0B1E42',
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  closeBtn: {
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
    borderRadius: 12,
    height: 36,
    justifyContent: 'center',
    width: 36,
  },
  settingsBody: {
    paddingTop: 16,
  },
  filterSectionLabel: {
    color: '#64748B',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.4,
    marginBottom: 10,
    textTransform: 'uppercase',
  },
  optionsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  optionPill: {
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderColor: '#E2E8F0',
    borderRadius: 14,
    borderWidth: 1,
    flex: 1,
    minHeight: 44,
    justifyContent: 'center',
    paddingVertical: 10,
  },
  optionPillActive: {
    backgroundColor: '#0B1E42',
    borderColor: '#0B1E42',
  },
  optionPillText: {
    color: '#334155',
    fontSize: 13,
    fontWeight: '600',
  },
  optionPillTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },

  saveSettingsBtn: {
    alignItems: 'center',
    backgroundColor: '#F97316',
    borderRadius: 16,
    marginTop: 20,
    minHeight: 48,
    justifyContent: 'center',
    paddingVertical: 14,
    shadowColor: '#F97316',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 2,
  },
  saveSettingsBtnText: {
    color: '#0B1E42',
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: 0.4,
  },
  pressed: {
    opacity: 0.85,
  },

  // Offline banner
  offlineBanner: {
    backgroundColor: '#FFFFFF',
    borderColor: '#E2E8F0',
    borderRadius: 18,
    borderWidth: 1,
    marginBottom: 14,
    padding: 14,
    shadowColor: '#0B1E42',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  offlineBannerHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
    marginBottom: 6,
  },
  offlineDot: {
    backgroundColor: '#64748B',
    borderRadius: 5,
    height: 10,
    width: 10,
  },
  offlineBannerTitle: {
    color: '#0F172A',
    fontSize: 16,
    fontWeight: '800',
  },
  offlineBannerMessage: {
    color: '#64748B',
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 12,
  },
  goOnlineBtn: {
    alignItems: 'center',
    backgroundColor: '#16A34A',
    borderRadius: 12,
    justifyContent: 'center',
    minHeight: 44,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  goOnlineBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  srOnly: {
    height: 0,
    opacity: 0,
    position: 'absolute',
    width: 0,
  },
});
