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
import * as Location from 'expo-location';

import {
  colors,
  leopardPalette,
  radius,
  spacing,
  typography,
  Button,
  GestureBottomSheet,
  IconBell,
  IconClock,
  IconClose,
  IconLocationPin,
  IconMenu,
  IconMessage,
  IconPhone,
  IconRadarPulse,
  IconRoute,
  IconSettings,
  IconShieldAlert,
  IconSpeedTruck,
  RealInteractiveMap,
  resolveLocationCoords,
  ScreenState,
  SkeletonCard,
  StatusBadge,
} from '@leopard/mobile-core';
import { useDriverDrawer } from '../navigation/DriverDrawerContext';
import { DriverSidebarDrawer } from '../navigation/DriverSidebarDrawer';
import { IncomingDispatchModal } from './IncomingDispatchModal';
import type { IncomingDispatchOffer } from './IncomingDispatchModal';
import type {
  DriverActiveTripView,
  DriverListContentView,
  DriverListView,
  DriverPublicOrderView,
} from './model';

const DEPOT_TAN_BINH_COORDS = { lat: 10.7981, lng: 106.6625 };

export type DriverOrdersScreenProps = Readonly<{
  view: DriverListView;
  onSetAvailability?: (commandId: string) => void;
  onOpenOrder?: (orderId: string) => void;
  onRetry?: () => void;
  onNoticeAction?: () => void;
  incomingOffer?: IncomingDispatchOffer | null;
  onAcceptIncomingOffer?: (orderId: string) => void;
  onDeclineIncomingOffer?: (orderId: string) => void;
  onNavigate?: (route: string) => void;
}>;

function ActiveTripRail({
  onOpenOrder,
  trip,
}: Readonly<{
  trip: DriverActiveTripView;
  onOpenOrder?: (orderId: string) => void;
}>) {
  return (
    <View style={styles.activeTripBezelOuter} testID="driver-active-trip-slab">
      <View style={styles.activeTripBezelInner}>
        {/* 1. Header: Mã chuyến + Trạng thái */}
        <View style={styles.activeTopRow}>
          <View style={styles.activeTopRowLeft}>
            <View style={styles.tripIconChip}>
              <IconSpeedTruck color="#0B1E42" size={16} />
            </View>
            <Text accessibilityRole="header" style={styles.activeReference}>
              {trip.reference}
            </Text>
          </View>
          <StatusBadge domain="order" status={trip.status} />
        </View>

        {/* 2. Route Spine: A (Điểm lấy) -> Trục nối ETA -> B (Điểm giao) */}
        <View style={styles.activeRouteSpineBox}>
          <View style={styles.routeSpineColumn}>
            <View style={styles.spinePointA}>
              <Text style={styles.spinePointTextA}>A</Text>
            </View>
            <View style={styles.spineDashedLine} />
            <View style={styles.spinePointB}>
              <Text style={styles.spinePointTextB}>B</Text>
            </View>
          </View>

          <View style={styles.routeSpineLabels}>
            <View style={styles.routeLocationGroup}>
              <Text style={styles.routePointTypeA}>ĐIỂM LẤY HÀNG (A)</Text>
              <Text style={styles.activeOriginText}>{trip.route.origin.label}</Text>
            </View>

            <View style={styles.spineEtaRow}>
              <IconClock color="#0B1E42" size={12} />
              <Text style={styles.spineEtaText}>Lộ trình · ETA {trip.route.distanceLabel}</Text>
            </View>

            <View style={styles.routeLocationGroup}>
              <Text style={styles.routePointTypeB}>ĐIỂM GIAO HÀNG (B)</Text>
              <Text style={styles.activeDestText}>{trip.route.destination.label}</Text>
            </View>
          </View>
        </View>

        {/* 3. Proof Warning Banner */}
        {trip.proofLabel ? (
          <View style={styles.proofWarningBanner}>
            <IconShieldAlert color="#D97706" size={14} />
            <Text style={styles.proofWarningText}>{trip.proofLabel}</Text>
          </View>
        ) : null}

        {/* 4. Live Tracking Status */}
        <View style={styles.activeSignalRow}>
          <View style={styles.liveTrackingIndicator}>
            <View style={styles.livePulseDot} />
            <Text numberOfLines={1} style={styles.trackingText}>
              {trip.trackingLabel}
            </Text>
          </View>
        </View>

        {/* 5. Customer Contact Bar (Call & Chat buttons) */}
        <View style={styles.activeContactBar}>
          <View style={styles.activeContactInfo}>
            <Text style={styles.activeContactTitle}>Khách hàng người nhận</Text>
            <Text style={styles.activeContactPhone}>0988 ••• 128 (Bảo mật)</Text>
          </View>
          <View style={styles.activeContactButtons}>
            <Pressable
              accessibilityLabel="Gọi cho khách hàng"
              accessibilityRole="button"
              hitSlop={8}
              style={({ pressed }) => [styles.contactIconBtn, pressed ? styles.pressed : null]}
              testID="driver-call-btn"
            >
              <IconPhone color="#16A34A" size={18} />
            </Pressable>
            <Pressable
              accessibilityLabel="Nhắn tin trong ứng dụng"
              accessibilityRole="button"
              hitSlop={8}
              style={({ pressed }) => [styles.contactIconBtn, pressed ? styles.pressed : null]}
              testID="driver-chat-btn"
            >
              <IconMessage color="#1D4ED8" size={18} />
            </Pressable>
          </View>
        </View>

        {/* 6. In-Card Big Action Button */}
        <Pressable
          accessibilityHint="Mở chi tiết chuyến đang thực hiện"
          accessibilityLabel={`Mở chuyến ${trip.reference}, trạng thái ${trip.status}`}
          accessibilityRole="button"
          onPress={onOpenOrder ? () => onOpenOrder(trip.id) : undefined}
          style={({ pressed }) => [styles.activeActionBtn, pressed ? styles.pressed : null]}
        >
          <Text style={styles.activeActionHint}>MỞ BUỒNG LÁI ĐIỀU PHỐI CHUYẾN →</Text>
        </Pressable>
      </View>
    </View>
  );
}

function PublicOrderCard({
  item,
  onOpenOrder,
}: Readonly<{ item: DriverPublicOrderView; onOpenOrder?: (orderId: string) => void }>) {
  return (
    <View style={styles.orderCardOuter}>
      <View style={styles.orderCardInner}>
        <Pressable
          accessibilityLabel={`Xem chi tiết đơn ${item.reference}, ${item.publicRouteLabel}`}
          accessibilityRole="button"
          onPress={onOpenOrder ? () => onOpenOrder(item.id) : undefined}
          style={({ pressed }) => [styles.cardBody, pressed ? styles.pressed : null]}
        >
          {/* Top Meta: Ref, Proximity, and Status */}
          <View style={styles.cardHeader}>
            <View style={styles.cardHeaderLeft}>
              <Text style={styles.cardOrderRef}>{item.reference}</Text>
              <View style={styles.proximityDot} />
              <Text style={styles.proximityText}>{item.pickupDistanceLabel || 'Cách bạn 1.2 km'}</Text>
            </View>
            <StatusBadge domain="order" status={item.status} />
          </View>

          {/* Fare & Route Distance Strip */}
          <View style={styles.cardFareBanner}>
            <View style={styles.cardFareLeft}>
              <Text style={styles.cardFareCaption}>CƯỚC THỰC NHẬN DỰ KIẾN</Text>
              <Text style={styles.cardFareAmount}>{item.priceLabel || '285.000 ₫'}</Text>
            </View>
            <View style={styles.cardDistanceBadge}>
              <IconRoute color="#0B1E42" size={13} />
              <Text style={styles.cardDistanceText}>
                {item.distanceLabel ? `${item.distanceLabel} · ` : ''}{item.etaLabel}
              </Text>
            </View>
          </View>

          {/* Route Spine: Point A -> Point B */}
          <View style={styles.cardRouteBlock}>
            <View style={styles.cardRouteSpineMini}>
              <View style={styles.spinePointDotA} />
              <View style={styles.spineDottedTrackMini} />
              <View style={styles.spinePointDotB} />
            </View>
            <View style={styles.cardRouteAddresses}>
              <Text numberOfLines={1} style={styles.cardPickupAddr}>
                {item.pickupLocationLabel || item.publicRouteLabel.split('→')[0]?.trim() || 'Điểm lấy hàng'}
              </Text>
              <Text numberOfLines={1} style={styles.cardDropoffAddr}>
                {item.dropoffLocationLabel || item.publicRouteLabel.split('→')[1]?.trim() || 'Điểm giao hàng'}
              </Text>
            </View>
          </View>

          {/* Public route full label */}
          <Text numberOfLines={1} style={styles.cardPublicRouteSub}>
            {item.publicRouteLabel}
          </Text>

          {/* Vehicle & Cargo Tags */}
          <View style={styles.tagsContainer}>
            <View style={styles.vehicleTag}>
              <IconSpeedTruck color="#475569" size={13} />
              <Text style={styles.vehicleTagText}>{item.vehicleLabel}</Text>
            </View>
            <View style={styles.cargoTag}>
              <Text numberOfLines={1} style={styles.cargoTagText}>
                {item.cargoSummary}
              </Text>
            </View>
          </View>

          {/* Price & ETA */}
          <View style={styles.cardFooter}>
            <View style={styles.priceEtaRow}>
              <IconClock color={colors.brand.background} size={13} />
              <Text style={styles.priceText}>{item.etaLabel}</Text>
            </View>
            <Text style={styles.updatedText}>{item.updatedAtLabel}</Text>
          </View>
        </Pressable>

        {/* Action Buttons Row: [ Bỏ qua ] & [ NHẬN ĐƠN ] */}
        <View style={styles.cardActionRow}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Bỏ qua đơn này"
            style={({ pressed }) => [styles.cardDeclineBtn, pressed ? styles.pressed : null]}
          >
            <Text style={styles.cardDeclineText}>Bỏ qua</Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Nhận đơn ${item.reference}`}
            onPress={onOpenOrder ? () => onOpenOrder(item.id) : undefined}
            style={({ pressed }) => [styles.cardAcceptBtn, pressed ? styles.pressed : null]}
          >
            <Text style={styles.cardAcceptText}>
              NHẬN ĐƠN · {item.priceLabel || '285.000 ₫'}
            </Text>
          </Pressable>
        </View>
      </View>
    </View>
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

function ReceivingSettingsModal({
  onClose,
  onSave,
  radiusKm,
  vehicle,
  visible,
}: Readonly<{
  visible: boolean;
  radiusKm: string;
  vehicle: string;
  onClose: () => void;
  onSave: (radius: string, vehicle: string) => void;
}>) {
  const [selectedRadius, setSelectedRadius] = useState(radiusKm);
  const [selectedVehicle, setSelectedVehicle] = useState(vehicle);

  const radiusOptions = ['3', '5', '10', '15'];
  const vehicleOptions = ['Xe tải 500kg', 'Xe tải 2.5T', 'Xe 5T+'];

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

            <Text style={[styles.filterSectionLabel, { marginTop: spacing.md }]}>
              LOẠI PHƯƠNG TIỆN ƯU TIÊN
            </Text>
            <View style={styles.vehicleOptionsCol}>
              {vehicleOptions.map((v) => (
                <Pressable
                  key={v}
                  onPress={() => setSelectedVehicle(v)}
                  style={[styles.vehicleOptionItem, selectedVehicle === v ? styles.vehicleOptionActive : null]}
                >
                  <IconSpeedTruck color={selectedVehicle === v ? '#0B1E42' : '#64748B'} size={18} />
                  <Text
                    style={[
                      styles.vehicleOptionText,
                      selectedVehicle === v ? styles.vehicleOptionTextActive : null,
                    ]}
                  >
                    {v}
                  </Text>
                </Pressable>
              ))}
            </View>

            <Pressable
              accessibilityLabel="Lưu cấu hình"
              accessibilityRole="button"
              onPress={() => {
                onSave(selectedRadius, selectedVehicle);
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

export function DriverOrdersScreen({
  incomingOffer = null,
  onAcceptIncomingOffer,
  onDeclineIncomingOffer,
  onNavigate,
  onNoticeAction,
  onOpenOrder,
  onRetry,
  onSetAvailability,
  view,
}: DriverOrdersScreenProps) {
  const [dismissedOfferId, setDismissedOfferId] = useState<string | null>(null);
  const [simulatedOffer, setSimulatedOffer] = useState<IncomingDispatchOffer | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [radiusKm, setRadiusKm] = useState('5');
  const [vehiclePref, setVehiclePref] = useState('Xe tải 2.5T');
  const [selectedVehicleFilter, setSelectedVehicleFilter] = useState('Tất cả');
  const [currentAddress, setCurrentAddress] = useState<string>('Depot Tân Bình, TP.HCM');
  const { openDrawer } = useDriverDrawer();

  useEffect(() => {
    let isMounted = true;
    async function resolveCurrentLocation() {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') return;

        const position = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });

        const geocoded = await Location.reverseGeocodeAsync({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        });

        if (isMounted && geocoded && geocoded.length > 0) {
          const place = geocoded[0];
          const district = place.district || place.subregion || '';
          const city = place.city || place.region || '';
          const streetOrName = place.street || place.name || '';

          const parts = [district, city].filter(Boolean);
          const display = parts.length > 0 ? parts.join(', ') : (streetOrName || 'TP. Hồ Chí Minh');
          if (display) {
            setCurrentAddress(display);
          }
        }
      } catch {
        // Fallback gracefully in testing / simulator
      }
    }

    void resolveCurrentLocation();
    return () => {
      isMounted = false;
    };
  }, []);

  const handleOpenMenu = () => {
    setIsSidebarOpen(true);
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
            initialPinCoords={DEPOT_TAN_BINH_COORDS}
            interactive={false}
            mode="preview"
            style={StyleSheet.absoluteFill}
            truckLocation={DEPOT_TAN_BINH_COORDS}
          />
        </View>

        {/* Layer 1: Top HUD */}
        <View style={styles.topHudContainer}>
          <View style={styles.topHudGlass}>
            <View style={styles.hudMainRow}>
              <View style={styles.hudDriverGroup}>
                <View style={styles.hudMenuBtn}>
                  <IconMenu color="#0B1E42" size={20} />
                </View>
                <View style={styles.hudDriverMeta}>
                  <View style={styles.skeletonTextLineLg} />
                  <View style={styles.skeletonTextLineSm} />
                </View>
              </View>
              <View style={styles.hudDutyWrap}>
                <Text style={styles.hudDutyLabel}>Trạng thái nhận đơn</Text>
                <View style={[styles.heroDutySwitch, styles.heroDutySwitchOffline]}>
                  <View style={styles.heroDutyTab}>
                    <View style={styles.heroDutyDot} />
                    <Text style={[styles.heroDutyTabText, styles.heroDutyTabTextInactive]}>
                      TRỰC TUYẾN
                    </Text>
                  </View>
                  <View style={[styles.heroDutyTab, styles.heroDutyTabActiveOffline]}>
                    <View style={[styles.heroDutyDot, styles.heroDutyDotActiveOffline]} />
                    <Text style={[styles.heroDutyTabText, styles.heroDutyTabTextActive]}>
                      NGOẠI TUYẾN
                    </Text>
                  </View>
                </View>
              </View>
            </View>
          </View>
        </View>

        {/* Layer 2: GestureBottomSheet with Skeletons */}
        <GestureBottomSheet
          initialSnapIndex={1}
          snapPoints={[0.18, 0.54, 0.92]}
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
            initialPinCoords={DEPOT_TAN_BINH_COORDS}
            interactive={false}
            mode="preview"
            style={StyleSheet.absoluteFill}
            truckLocation={DEPOT_TAN_BINH_COORDS}
          />
        </View>

        {/* Layer 1: Top HUD */}
        <View style={styles.topHudContainer}>
          <View style={styles.topHudGlass}>
            <View style={styles.hudMainRow}>
              <View style={styles.hudDriverGroup}>
                <Pressable
                  accessibilityLabel="Mở menu điều hướng tài xế"
                  accessibilityRole="button"
                  hitSlop={8}
                  onPress={handleOpenMenu}
                  style={({ pressed }) => [styles.hudMenuBtn, pressed ? styles.pressed : null]}
                  testID="driver-menu-button"
                >
                  <IconMenu color="#0B1E42" size={20} />
                </Pressable>
                <View style={styles.hudDriverMeta}>
                  <Text style={styles.hudDriverName}>Tài xế LEOPARD</Text>
                </View>
              </View>
            </View>
          </View>
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
      </View>
    );
  }

  // ── Content State ──────────────────────────────────────────────────────────
  const activeTrip = view.activeTrip;
  const waitingCount = view.requestedOrders.length;
  const isOnline = view.availability.status === 'AVAILABLE';
  const availabilityAction = view.availability.action;
  const isPending = availabilityAction?.isPending === true;
  const isAvailabilityDisabled = availabilityAction?.disabled === true || isPending;

  const filteredOrders = view.requestedOrders.filter((item) => {
    if (selectedVehicleFilter === 'Tất cả') return true;
    if (selectedVehicleFilter === 'Xe van') {
      return item.vehicleLabel.toLowerCase().includes('van');
    }
    if (selectedVehicleFilter === '1.25T') {
      return item.vehicleLabel.includes('1.25') || item.vehicleLabel.includes('1.5');
    }
    if (selectedVehicleFilter === '2.5T') {
      return item.vehicleLabel.includes('2.5');
    }
    return true;
  });

  return (
    <View style={styles.screenRoot}>
      {/* ── Layer 0: RealInteractiveMap running 100% full-bleed viewport ── */}
      <View style={styles.mapLayerContainer} testID="driver-map-canvas">
        <RealInteractiveMap
          destination={
            activeTrip
              ? {
                  coords: resolveLocationCoords(activeTrip.route.destination.label),
                  label: activeTrip.route.destination.label,
                }
              : undefined
          }
          height="100%"
          initialPinCoords={DEPOT_TAN_BINH_COORDS}
          interactive={true}
          mode={activeTrip ? 'route' : 'tracking'}
          origin={
            activeTrip
              ? {
                  coords: resolveLocationCoords(activeTrip.route.origin.label),
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
          truckLocation={DEPOT_TAN_BINH_COORDS}
        />
      </View>

      {/* ── Layer 1: Floating Glass Top HUD ── */}
      <View style={styles.topHudContainer}>
        <View style={styles.topHudGlass}>
          {/* Main Cockpit Row: Menu Drawer + Driver Plate + Hero Duty Switch */}
          <View style={styles.hudMainRow}>
            <View style={styles.hudDriverGroup}>
              <Pressable
                accessibilityHint="Mở menu thanh bên trái để xem hồ sơ và các tiện ích"
                accessibilityLabel="Mở menu điều hướng tài xế"
                accessibilityRole="button"
                hitSlop={8}
                onPress={handleOpenMenu}
                style={({ pressed }) => [styles.hudMenuBtn, pressed ? styles.pressed : null]}
                testID="driver-menu-button"
              >
                <IconMenu color="#0B1E42" size={20} />
              </Pressable>

              <View style={styles.hudDriverMeta}>
                <Text numberOfLines={1} style={styles.hudDriverName}>
                  Nguyễn Văn Tuấn
                </Text>
                <Text style={styles.hudDriverPlate}>51C-889.24 (2.5T)</Text>
              </View>
            </View>

            {/* Hero Duty Switch (48px, high contrast, active green indicator) */}
            <View style={styles.hudDutyWrap}>
              <Text style={styles.hudDutyLabel}>Trạng thái nhận đơn</Text>
              <Pressable
                accessibilityLabel={
                  isPending
                    ? 'Đang cập nhật trạng thái nhận đơn'
                    : isOnline
                      ? 'Tắt sẵn sàng'
                      : 'Bật sẵn sàng'
                }
                accessibilityRole="button"
                accessibilityState={{ busy: isPending, disabled: isAvailabilityDisabled }}
                disabled={isAvailabilityDisabled}
                onPress={
                  availabilityAction && !isAvailabilityDisabled && onSetAvailability
                    ? () => onSetAvailability(availabilityAction.id)
                    : undefined
                }
                style={({ pressed }) => [
                  styles.heroDutySwitch,
                  isOnline ? styles.heroDutySwitchOnline : styles.heroDutySwitchOffline,
                  pressed ? styles.pressed : null,
                ]}
                testID="driver-availability-toggle"
              >
                <View
                  style={[
                    styles.heroDutyTab,
                    isOnline ? styles.heroDutyTabActiveOnline : null,
                  ]}
                >
                  <View style={[styles.heroDutyDot, isOnline ? styles.heroDutyDotActive : null]} />
                  <Text
                    style={[
                      styles.heroDutyTabText,
                      isOnline ? styles.heroDutyTabTextActive : styles.heroDutyTabTextInactive,
                    ]}
                  >
                    TRỰC TUYẾN
                  </Text>
                </View>
                <View
                  style={[
                    styles.heroDutyTab,
                    !isOnline ? styles.heroDutyTabActiveOffline : null,
                  ]}
                >
                  <View
                    style={[
                      styles.heroDutyDot,
                      !isOnline ? styles.heroDutyDotActiveOffline : null,
                    ]}
                  />
                  <Text
                    style={[
                      styles.heroDutyTabText,
                      !isOnline ? styles.heroDutyTabTextActive : styles.heroDutyTabTextInactive,
                    ]}
                  >
                    NGOẠI TUYẾN
                  </Text>
                </View>
              </Pressable>
            </View>
          </View>

          {/* Sub-bar: Mini KPI stats row */}
          <View style={styles.hudKpiRow}>
            <Text style={styles.hudKpiSummary}>4 chuyến · 620.000 ₫ · 5.5h</Text>
            <View style={styles.hudKpiChips}>
              <View style={styles.hudKpiChip}>
                <Text style={styles.hudKpiChipLabel}>Chuyến xong</Text>
              </View>
              <View style={styles.hudKpiChip}>
                <Text style={styles.hudKpiChipLabel}>Thu nhập hôm nay</Text>
              </View>
              <View style={styles.hudKpiChip}>
                <Text style={styles.hudKpiChipLabel}>Giờ online</Text>
              </View>
            </View>
          </View>
        </View>
      </View>

      {/* ── Layer 2: GestureBottomSheet 3 Snap Points ── */}
      <GestureBottomSheet
        initialSnapIndex={1}
        snapPoints={[0.18, 0.54, 0.92]}
        testID="driver-load-board-sheet"
      >
        <ScrollView
          contentContainerStyle={styles.sheetScrollContent}
          nestedScrollEnabled={true}
          showsVerticalScrollIndicator={false}
        >
          {/* Active Trip Rail when driver is on a trip */}
          {activeTrip ? (
            <View style={styles.activeSectionBlock}>
              <View style={styles.activeSectionHeader}>
                <Text accessibilityRole="header" style={styles.activeSectionTitle}>
                  Chuyến đang thực hiện
                </Text>
                <View style={styles.activeLivePill}>
                  <View style={styles.activeLivePillDot} />
                  <Text style={styles.activeLivePillText}>ĐANG CHẠY</Text>
                </View>
              </View>
              <ActiveTripRail onOpenOrder={onOpenOrder} trip={activeTrip} />
            </View>
          ) : null}

          {/* Snap 1 Radar Scan Strip */}
          <View style={styles.radarLiveStrip}>
            <View style={styles.radarLeftGroup}>
              <View style={styles.radarIconOuter}>
                <IconRadarPulse color="#0B1E42" size={15} />
              </View>
              <Text style={styles.radarLiveText}>
                Radar đang quét bán kính{' '}
                <Text style={styles.radarLiveHighlight}>{radiusKm} km</Text> ·{' '}
                <Text style={styles.radarLiveHighlight}>{waitingCount} đơn phù hợp</Text>
              </Text>
            </View>
            <Pressable
              accessibilityHint="Mở modal đơn nổ để thử nghiệm giao diện tiếp nhận"
              accessibilityLabel="Mô phỏng nổ đơn"
              accessibilityRole="button"
              onPress={handleSimulateIncomingOffer}
              style={({ pressed }) => [styles.radarSimulateBtn, pressed ? styles.pressed : null]}
            >
              <IconRadarPulse color="#0B1E42" size={13} />
              <Text style={styles.radarSimulateBtnText}>Thử nổ đơn</Text>
            </Pressable>
          </View>

          {/* Snap 2: Load-Board Section Header */}
          <View style={styles.loadBoardHeaderRow}>
            <View>
              <Text accessibilityRole="header" style={styles.loadBoardTitle}>
                Đơn có thể nhận
              </Text>
              <Text style={styles.loadBoardSubtitle}>
                {waitingCount > 0
                  ? `${waitingCount} đơn phù hợp gần bạn`
                  : 'Chưa có đơn phù hợp'}
              </Text>
            </View>
            <Pressable
              accessibilityLabel="Mở bộ lọc nhận đơn"
              accessibilityRole="button"
              onPress={() => setIsSettingsOpen(true)}
              style={({ pressed }) => [styles.filterSettingBtn, pressed ? styles.pressed : null]}
            >
              <IconSettings color="#0B1E42" size={14} />
              <Text style={styles.filterSettingBtnText}>Thiết lập</Text>
            </Pressable>
          </View>

          {/* B2B Vehicle Filter Chips */}
          <View style={styles.filterChipsRow}>
            {['Tất cả', 'Xe van', '1.25T', '2.5T'].map((chip) => {
              const isSelected = selectedVehicleFilter === chip;
              return (
                <Pressable
                  key={chip}
                  onPress={() => setSelectedVehicleFilter(chip)}
                  style={[styles.filterChip, isSelected ? styles.filterChipActive : null]}
                >
                  <Text
                    style={[
                      styles.filterChipText,
                      isSelected ? styles.filterChipTextActive : null,
                    ]}
                  >
                    {chip}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          {/* Notice Alert if any */}
          <DriverNotice onNoticeAction={onNoticeAction} view={view} />

          {/* Orders Feed or Empty State */}
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
                accessibilityRole="button"
                accessibilityLabel="Mở rộng phạm vi nhận đơn"
                onPress={() => setIsSettingsOpen(true)}
                style={({ pressed }) => [styles.expandRadiusBtn, pressed ? styles.pressed : null]}
              >
                <Text style={styles.expandRadiusText}>Mở rộng phạm vi nhận đơn</Text>
              </Pressable>
            </View>
          ) : (
            <View style={styles.ordersFeed}>
              {filteredOrders.map((item) => (
                <PublicOrderCard item={item} key={item.id} onOpenOrder={onOpenOrder} />
              ))}
            </View>
          )}
        </ScrollView>
      </GestureBottomSheet>

      {/* ── Layer 3: Modals & Drawer ── */}
      <IncomingDispatchModal
        offer={activeIncomingOffer}
        onAccept={(orderId) => {
          setSimulatedOffer(null);
          if (onAcceptIncomingOffer) {
            onAcceptIncomingOffer(orderId);
          } else if (onOpenOrder) {
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

      <DriverSidebarDrawer
        activeRoute="/driver/orders"
        availability={view.availability}
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
        onNavigate={onNavigate}
        onSetAvailability={onSetAvailability}
      />

      <ReceivingSettingsModal
        onClose={() => setIsSettingsOpen(false)}
        onSave={(r, v) => {
          setRadiusKm(r);
          setVehiclePref(v);
        }}
        radiusKm={radiusKm}
        vehicle={vehiclePref}
        visible={isSettingsOpen}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screenRoot: {
    backgroundColor: '#0B1E42',
    flex: 1,
    position: 'relative',
  },
  mapLayerContainer: {
    ...StyleSheet.absoluteFill,
    zIndex: 0,
  },

  // ── Layer 1: Floating Glass Top HUD ──────────────────────────────────────
  topHudContainer: {
    left: 12,
    position: 'absolute',
    right: 12,
    top: Platform.OS === 'ios' ? 52 : 36,
    zIndex: 20,
  },
  topHudGlass: {
    backgroundColor: 'rgba(255, 255, 255, 0.92)',
    borderColor: 'rgba(11, 30, 66, 0.08)',
    borderRadius: 20,
    borderWidth: 1,
    elevation: 8,
    paddingHorizontal: 14,
    paddingVertical: 12,
    shadowColor: '#0B1E42',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
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
    backgroundColor: '#F1F5F9',
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
  hudDriverPlate: {
    color: '#475569',
    fontSize: 12,
    fontWeight: '600',
    marginTop: 1,
    fontVariant: ['tabular-nums'],
  },

  // Hero Duty Switch (height 48px, high contrast)
  hudDutyWrap: {
    alignItems: 'flex-end',
  },
  hudDutyLabel: {
    color: '#64748B',
    fontSize: 10,
    fontWeight: '700',
    marginBottom: 4,
    textTransform: 'uppercase',
  },
  heroDutySwitch: {
    alignItems: 'center',
    borderRadius: 24,
    borderWidth: 2,
    flexDirection: 'row',
    height: 48,
    padding: 3,
    width: 176,
  },
  heroDutySwitchOnline: {
    backgroundColor: '#F0FDF4',
    borderColor: '#22C55E',
  },
  heroDutySwitchOffline: {
    backgroundColor: '#F8FAFC',
    borderColor: '#CBD5E1',
  },
  heroDutyTab: {
    alignItems: 'center',
    borderRadius: 20,
    flex: 1,
    flexDirection: 'row',
    height: 38,
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
  heroDutyTabActiveOnline: {
    backgroundColor: '#16A34A',
  },
  heroDutyTabActiveOffline: {
    backgroundColor: '#64748B',
  },
  heroDutyDot: {
    backgroundColor: '#CBD5E1',
    borderRadius: 4,
    height: 8,
    marginRight: 5,
    width: 8,
  },
  heroDutyDotActive: {
    backgroundColor: '#86EFAC',
  },
  heroDutyDotActiveOffline: {
    backgroundColor: '#FFFFFF',
  },
  heroDutyTabText: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.2,
  },
  heroDutyTabTextActive: {
    color: '#FFFFFF',
  },
  heroDutyTabTextInactive: {
    color: '#94A3B8',
  },

  // Mini KPI stats row
  hudKpiRow: {
    borderTopColor: 'rgba(226, 232, 240, 0.8)',
    borderTopWidth: 1,
    marginTop: 10,
    paddingTop: 8,
  },
  hudKpiSummary: {
    color: '#0B1E42',
    fontSize: 13,
    fontWeight: '800',
    fontVariant: ['tabular-nums'],
    letterSpacing: 0.3,
  },
  hudKpiChips: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 4,
  },
  hudKpiChip: {
    backgroundColor: '#F1F5F9',
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  hudKpiChipLabel: {
    color: '#64748B',
    fontSize: 10,
    fontWeight: '600',
  },

  // ── Layer 2: GestureBottomSheet & Content ────────────────────────────────
  sheetScrollContent: {
    paddingBottom: 48,
    paddingHorizontal: 16,
    paddingTop: 4,
  },

  // Radar Live Strip
  radarLiveStrip: {
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderColor: '#E2E8F0',
    borderRadius: 14,
    borderWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  radarLeftGroup: {
    alignItems: 'center',
    flex: 1,
    flexDirection: 'row',
    marginRight: 8,
  },
  radarIconOuter: {
    alignItems: 'center',
    backgroundColor: '#E2E8F0',
    borderRadius: 12,
    height: 24,
    justifyContent: 'center',
    marginRight: 8,
    width: 24,
  },
  radarLiveText: {
    color: '#334155',
    flex: 1,
    fontSize: 12,
    fontWeight: '500',
  },
  radarLiveHighlight: {
    color: '#0B1E42',
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
  radarSimulateBtn: {
    alignItems: 'center',
    backgroundColor: '#E0E7FF',
    borderColor: '#C7D2FE',
    borderRadius: 10,
    borderWidth: 1,
    flexDirection: 'row',
    minHeight: 44,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  radarSimulateBtnText: {
    color: '#1E40AF',
    fontSize: 11,
    fontWeight: '700',
    marginLeft: 4,
  },

  // Load Board Header & Filters
  loadBoardHeaderRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
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
  filterSettingBtn: {
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
    borderColor: '#E2E8F0',
    borderRadius: 10,
    borderWidth: 1,
    flexDirection: 'row',
    minHeight: 44,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  filterSettingBtnText: {
    color: '#0B1E42',
    fontSize: 12,
    fontWeight: '700',
    marginLeft: 5,
  },

  // Vehicle filter chips
  filterChipsRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 14,
  },
  filterChip: {
    backgroundColor: '#FFFFFF',
    borderColor: '#E2E8F0',
    borderRadius: 16,
    borderWidth: 1,
    minHeight: 44,
    justifyContent: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  filterChipActive: {
    backgroundColor: '#0B1E42',
    borderColor: '#0B1E42',
  },
  filterChipText: {
    color: '#475569',
    fontSize: 12,
    fontWeight: '600',
  },
  filterChipTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },

  // ── Double-Bezel Order Card ──────────────────────────────────────────────
  orderCardOuter: {
    backgroundColor: '#FFFFFF',
    borderColor: '#E2E8F0',
    borderRadius: 24,
    borderWidth: 1,
    elevation: 3,
    marginBottom: 14,
    padding: 6,
    shadowColor: '#0B1E42',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
  },
  orderCardInner: {
    backgroundColor: '#F8FAFC',
    borderColor: '#F1F5F9',
    borderRadius: 18,
    borderWidth: 1,
    padding: 12,
  },
  cardBody: {
    marginBottom: 10,
  },
  cardHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  cardHeaderLeft: {
    alignItems: 'center',
    flexDirection: 'row',
  },
  cardOrderRef: {
    color: '#0B1E42',
    fontSize: 13,
    fontWeight: '800',
    fontVariant: ['tabular-nums'],
  },
  proximityDot: {
    backgroundColor: '#CBD5E1',
    borderRadius: 2,
    height: 4,
    marginHorizontal: 6,
    width: 4,
  },
  proximityText: {
    color: '#64748B',
    fontSize: 12,
    fontWeight: '500',
    fontVariant: ['tabular-nums'],
  },

  // Fare Banner
  cardFareBanner: {
    alignItems: 'center',
    backgroundColor: '#EFF6FF',
    borderColor: '#DBEAFE',
    borderRadius: 12,
    borderWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  cardFareLeft: {
    flex: 1,
  },
  cardFareCaption: {
    color: '#3B82F6',
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  cardFareAmount: {
    color: '#1D4ED8',
    fontSize: 18,
    fontWeight: '900',
    fontVariant: ['tabular-nums'],
    marginTop: 1,
  },
  cardDistanceBadge: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderColor: '#BFDBFE',
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: 'row',
    paddingHorizontal: 8,
    paddingVertical: 5,
  },
  cardDistanceText: {
    color: '#0B1E42',
    fontSize: 11,
    fontWeight: '700',
    marginLeft: 4,
    fontVariant: ['tabular-nums'],
  },

  // Route Spine Mini
  cardRouteBlock: {
    flexDirection: 'row',
    marginBottom: 10,
  },
  cardRouteSpineMini: {
    alignItems: 'center',
    marginRight: 10,
    paddingTop: 3,
    width: 14,
  },
  spinePointDotA: {
    backgroundColor: '#16A34A',
    borderRadius: 4,
    height: 8,
    width: 8,
  },
  spineDottedTrackMini: {
    backgroundColor: '#CBD5E1',
    height: 20,
    marginVertical: 2,
    width: 2,
  },
  spinePointDotB: {
    backgroundColor: '#DC2626',
    borderRadius: 4,
    height: 8,
    width: 8,
  },
  cardRouteAddresses: {
    flex: 1,
    justifyContent: 'space-between',
  },
  cardPickupAddr: {
    color: '#0B1E42',
    fontSize: 13,
    fontWeight: '700',
  },
  cardDropoffAddr: {
    color: '#0B1E42',
    fontSize: 13,
    fontWeight: '700',
  },
  cardPublicRouteSub: {
    color: '#64748B',
    fontSize: 11,
    marginBottom: 10,
  },

  // Vehicle and Cargo Tags
  tagsContainer: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 10,
  },
  vehicleTag: {
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
    borderColor: '#E2E8F0',
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: 'row',
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  vehicleTagText: {
    color: '#475569',
    fontSize: 11,
    fontWeight: '600',
    marginLeft: 4,
  },
  cargoTag: {
    backgroundColor: '#F8FAFC',
    borderColor: '#E2E8F0',
    borderRadius: 8,
    borderWidth: 1,
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  cargoTagText: {
    color: '#475569',
    fontSize: 11,
  },

  // Card Footer
  cardFooter: {
    alignItems: 'center',
    borderTopColor: '#E2E8F0',
    borderTopWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: 8,
  },
  priceEtaRow: {
    alignItems: 'center',
    flexDirection: 'row',
  },
  priceText: {
    color: '#475569',
    fontSize: 11,
    marginLeft: 4,
  },
  updatedText: {
    color: '#94A3B8',
    fontSize: 11,
    fontVariant: ['tabular-nums'],
  },

  // Card Actions
  cardActionRow: {
    flexDirection: 'row',
    gap: 10,
  },
  cardDeclineBtn: {
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
    borderColor: '#CBD5E1',
    borderRadius: 12,
    borderWidth: 1,
    justifyContent: 'center',
    minHeight: 44,
    paddingHorizontal: 14,
  },
  cardDeclineText: {
    color: '#64748B',
    fontSize: 13,
    fontWeight: '700',
  },
  cardAcceptBtn: {
    alignItems: 'center',
    backgroundColor: '#16A34A',
    borderRadius: 12,
    flex: 1,
    justifyContent: 'center',
    minHeight: 44,
    paddingHorizontal: 16,
  },
  cardAcceptText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
    fontVariant: ['tabular-nums'],
    letterSpacing: 0.3,
  },

  // ── Active Trip Rail Card ────────────────────────────────────────────────
  activeSectionBlock: {
    marginBottom: 16,
  },
  activeSectionHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  activeSectionTitle: {
    color: '#0B1E42',
    fontSize: 15,
    fontWeight: '800',
  },
  activeLivePill: {
    alignItems: 'center',
    backgroundColor: '#DCFCE7',
    borderColor: '#86EFAC',
    borderRadius: 12,
    borderWidth: 1,
    flexDirection: 'row',
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  activeLivePillDot: {
    backgroundColor: '#16A34A',
    borderRadius: 3,
    height: 6,
    marginRight: 5,
    width: 6,
  },
  activeLivePillText: {
    color: '#15803D',
    fontSize: 10,
    fontWeight: '800',
  },
  activeTripBezelOuter: {
    backgroundColor: '#FFFFFF',
    borderColor: '#93C5FD',
    borderRadius: 24,
    borderWidth: 1.5,
    elevation: 4,
    padding: 6,
    shadowColor: '#1D4ED8',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.12,
    shadowRadius: 10,
  },
  activeTripBezelInner: {
    backgroundColor: '#F8FAFC',
    borderColor: '#EFF6FF',
    borderRadius: 18,
    borderWidth: 1,
    padding: 14,
  },
  activeTopRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  activeTopRowLeft: {
    alignItems: 'center',
    flexDirection: 'row',
  },
  tripIconChip: {
    alignItems: 'center',
    backgroundColor: '#DBEAFE',
    borderRadius: 10,
    height: 28,
    justifyContent: 'center',
    marginRight: 8,
    width: 28,
  },
  activeReference: {
    color: '#0B1E42',
    fontSize: 14,
    fontWeight: '800',
    fontVariant: ['tabular-nums'],
  },

  // Route Spine
  activeRouteSpineBox: {
    backgroundColor: '#FFFFFF',
    borderColor: '#E2E8F0',
    borderRadius: 14,
    borderWidth: 1,
    flexDirection: 'row',
    marginBottom: 12,
    padding: 12,
  },
  routeSpineColumn: {
    alignItems: 'center',
    marginRight: 10,
    paddingTop: 2,
    width: 20,
  },
  spinePointA: {
    alignItems: 'center',
    backgroundColor: '#16A34A',
    borderRadius: 10,
    height: 20,
    justifyContent: 'center',
    width: 20,
  },
  spinePointTextA: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '800',
  },
  spineDashedLine: {
    backgroundColor: '#94A3B8',
    height: 28,
    marginVertical: 3,
    width: 2,
  },
  spinePointB: {
    alignItems: 'center',
    backgroundColor: '#DC2626',
    borderRadius: 10,
    height: 20,
    justifyContent: 'center',
    width: 20,
  },
  spinePointTextB: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '800',
  },
  routeSpineLabels: {
    flex: 1,
    justifyContent: 'space-between',
  },
  routeLocationGroup: {
    marginBottom: 4,
  },
  routePointTypeA: {
    color: '#16A34A',
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  routePointTypeB: {
    color: '#DC2626',
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  activeOriginText: {
    color: '#0B1E42',
    fontSize: 13,
    fontWeight: '700',
  },
  activeDestText: {
    color: '#0B1E42',
    fontSize: 13,
    fontWeight: '700',
  },
  spineEtaRow: {
    alignItems: 'center',
    flexDirection: 'row',
    marginVertical: 2,
  },
  spineEtaText: {
    color: '#64748B',
    fontSize: 11,
    fontWeight: '600',
    marginLeft: 4,
    fontVariant: ['tabular-nums'],
  },

  // Proof warning
  proofWarningBanner: {
    alignItems: 'center',
    backgroundColor: '#FEF3C7',
    borderColor: '#FDE68A',
    borderRadius: 10,
    borderWidth: 1,
    flexDirection: 'row',
    marginBottom: 10,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  proofWarningText: {
    color: '#B45309',
    fontSize: 11,
    fontWeight: '700',
    marginLeft: 6,
  },

  // Active Signal
  activeSignalRow: {
    marginBottom: 12,
  },
  liveTrackingIndicator: {
    alignItems: 'center',
    flexDirection: 'row',
  },
  livePulseDot: {
    backgroundColor: '#22C55E',
    borderRadius: 4,
    height: 8,
    marginRight: 6,
    width: 8,
  },
  trackingText: {
    color: '#475569',
    fontSize: 11,
    fontWeight: '600',
    fontVariant: ['tabular-nums'],
  },

  // Customer Contact Bar
  activeContactBar: {
    alignItems: 'center',
    backgroundColor: '#EFF6FF',
    borderColor: '#DBEAFE',
    borderRadius: 12,
    borderWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  activeContactInfo: {
    flex: 1,
  },
  activeContactTitle: {
    color: '#1E40AF',
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  activeContactPhone: {
    color: '#0B1E42',
    fontSize: 13,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
    marginTop: 1,
  },
  activeContactButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  contactIconBtn: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderColor: '#BFDBFE',
    borderRadius: 12,
    borderWidth: 1,
    height: 44,
    justifyContent: 'center',
    width: 44,
  },

  // In-Card Big Action
  activeActionBtn: {
    alignItems: 'center',
    backgroundColor: '#0B1E42',
    borderRadius: 14,
    height: 48,
    justifyContent: 'center',
  },
  activeActionHint: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 0.3,
  },

  // Notice Alert
  notice: {
    borderRadius: 12,
    marginBottom: 12,
    padding: 12,
  },
  noticeInfo: {
    backgroundColor: '#EFF6FF',
    borderColor: '#BFDBFE',
    borderWidth: 1,
  },
  noticeWarning: {
    backgroundColor: '#FFFBEB',
    borderColor: '#FDE68A',
    borderWidth: 1,
  },
  noticeDanger: {
    backgroundColor: '#FEF2F2',
    borderColor: '#FECACA',
    borderWidth: 1,
  },
  noticeBody: {
    color: '#0B1E42',
    fontSize: 13,
    marginBottom: 6,
  },

  ordersFeed: {
    gap: 12,
    marginTop: 4,
  },

  // Empty Box
  emptyBox: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderColor: '#E2E8F0',
    borderRadius: 20,
    borderWidth: 1,
    padding: 24,
  },
  emptyIconCircle: {
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
    borderRadius: 28,
    height: 56,
    justifyContent: 'center',
    marginBottom: 12,
    width: 56,
  },
  emptyTitle: {
    color: '#0B1E42',
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 4,
  },
  emptyMessage: {
    color: '#64748B',
    fontSize: 12,
    marginBottom: 16,
    textAlign: 'center',
  },
  expandRadiusBtn: {
    alignItems: 'center',
    backgroundColor: '#0B1E42',
    borderRadius: 12,
    justifyContent: 'center',
    minHeight: 44,
    paddingHorizontal: 16,
  },
  expandRadiusText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },

  // Boundary
  boundaryContainer: {
    bottom: 24,
    left: 16,
    position: 'absolute',
    right: 16,
    zIndex: 30,
  },

  // Skeletons
  skeletonTextLineLg: {
    backgroundColor: '#E2E8F0',
    borderRadius: 4,
    height: 14,
    marginBottom: 4,
    width: 110,
  },
  skeletonTextLineSm: {
    backgroundColor: '#E2E8F0',
    borderRadius: 4,
    height: 10,
    width: 70,
  },
  skeletonList: {
    gap: 12,
    marginTop: 12,
  },
  ordersSectionHeader: {
    marginBottom: 10,
  },

  // Modal Settings
  modalBackdrop: {
    backgroundColor: 'rgba(11, 30, 66, 0.5)',
    flex: 1,
    justifyContent: 'flex-end',
  },
  settingsSheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
  },
  settingsHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  settingsTitle: {
    color: '#0B1E42',
    fontSize: 15,
    fontWeight: '800',
  },
  closeBtn: {
    padding: 4,
  },
  settingsBody: {
    paddingBottom: 24,
  },
  filterSectionLabel: {
    color: '#64748B',
    fontSize: 11,
    fontWeight: '700',
    marginBottom: 10,
    letterSpacing: 0.3,
  },
  optionsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  optionPill: {
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
    borderColor: '#CBD5E1',
    borderRadius: 12,
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
    color: '#475569',
    fontSize: 12,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
  optionPillTextActive: {
    color: '#FFFFFF',
  },
  vehicleOptionsCol: {
    gap: 8,
    marginBottom: 20,
  },
  vehicleOptionItem: {
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderColor: '#E2E8F0',
    borderRadius: 14,
    borderWidth: 1,
    flexDirection: 'row',
    minHeight: 48,
    paddingHorizontal: 14,
  },
  vehicleOptionActive: {
    backgroundColor: '#EFF6FF',
    borderColor: '#3B82F6',
  },
  vehicleOptionText: {
    color: '#64748B',
    fontSize: 13,
    fontWeight: '600',
    marginLeft: 10,
  },
  vehicleOptionTextActive: {
    color: '#1D4ED8',
    fontWeight: '700',
  },
  saveSettingsBtn: {
    alignItems: 'center',
    backgroundColor: '#0B1E42',
    borderRadius: 14,
    height: 48,
    justifyContent: 'center',
  },
  saveSettingsBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 0.3,
  },

  pressed: {
    opacity: 0.85,
  },
});
