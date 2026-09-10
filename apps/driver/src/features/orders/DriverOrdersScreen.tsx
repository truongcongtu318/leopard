import React, { useEffect, useState } from 'react';
import {
  ImageBackground,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import * as Location from 'expo-location';

import { colors, leopardPalette, radius, spacing, typography, Button, IconBell, IconClock, IconClose, IconLocationPin, IconMenu, IconOrders, IconRadarPulse, IconRoute, IconSettings, IconShieldAlert, IconSpeedTruck, SectionHeading, ScreenState, SkeletonCard, StatusBadge } from '@leopard/mobile-core';
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

const driverHeroBgSource = require('../../../assets/brand/driver-hero-bg.jpg');

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
    <Pressable
      accessibilityHint="Mở chi tiết chuyến đang thực hiện"
      accessibilityLabel={`Mở chuyến ${trip.reference}, trạng thái ${trip.status}`}
      accessibilityRole="button"
      onPress={onOpenOrder ? () => onOpenOrder(trip.id) : undefined}
      style={({ pressed }) => [styles.activeRail, pressed ? styles.pressed : null]}
      testID="driver-active-trip-slab"
    >
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
            <Text style={styles.activeOriginText}>
              {trip.route.origin.label}
            </Text>
          </View>

          <View style={styles.spineEtaRow}>
            <IconClock color="#0B1E42" size={12} />
            <Text style={styles.spineEtaText}>Lộ trình · ETA {trip.route.distanceLabel}</Text>
          </View>

          <View style={styles.routeLocationGroup}>
            <Text style={styles.routePointTypeB}>ĐIỂM GIAO HÀNG (B)</Text>
            <Text style={styles.activeDestText}>
              {trip.route.destination.label}
            </Text>
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

      {/* 5. In-Card Big Action Button */}
      <View style={styles.activeCardFooter}>
        <View style={styles.activeActionBtn}>
          <Text style={styles.activeActionHint}>Mở buồng lái điều phối chuyến →</Text>
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

          {/* Fare & Route Distance Strip: High prominence earnings */}
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

          {/* Public route full label for screen readers & tests */}
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

          <Text style={styles.filterSectionLabel}>Khoảng cách điểm lấy hàng</Text>
          <View style={styles.optionsRow}>
            {radiusOptions.map((r) => (
              <Pressable
                key={r}
                onPress={() => setSelectedRadius(r)}
                style={[
                  styles.optionPill,
                  selectedRadius === r ? styles.optionPillActive : null,
                ]}
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

          <Text style={styles.filterSectionLabel}>Loại xe tiếp nhận</Text>
          <View style={styles.optionsRow}>
            {vehicleOptions.map((v) => (
              <Pressable
                key={v}
                onPress={() => setSelectedVehicle(v)}
                style={[
                  styles.optionPill,
                  selectedVehicle === v ? styles.optionPillActive : null,
                ]}
              >
                <Text
                  style={[
                    styles.optionPillText,
                    selectedVehicle === v ? styles.optionPillTextActive : null,
                  ]}
                >
                  {v}
                </Text>
              </Pressable>
            ))}
          </View>

          <View style={styles.saveSettingsWrap}>
            <Button
              label="Lưu thiết lập"
              onPress={() => {
                onSave(selectedRadius, selectedVehicle);
                onClose();
              }}
              variant="primary"
            />
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
        priceLabel: first.priceLabel ?? '485.000 đ',
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
        priceLabel: '485.000 đ',
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

  // ── Loading State: Modern Skeleton on Hero Background (matching reference mockup) ──
  if (view.kind === 'loading') {
    return (
      <View style={styles.screenRoot}>
        <View style={styles.heroSection}>
          <ImageBackground
            accessibilityLabel="Hình ảnh xe tải vận tải LEOPARD trên cung đường đèo núi"
            imageStyle={styles.heroBackgroundImage}
            resizeMode="cover"
            source={driverHeroBgSource}
            style={styles.heroBackground}
          >
            <View style={styles.heroOverlay}>
              {/* Row 1: Left (Menu + Skeleton Name + Stacked Badges) | Right (Location Pin) */}
              <View style={styles.cockpitTopRow}>
                <View style={styles.cockpitDriverLeft}>
                  <View style={styles.heroMenuButton}>
                    <IconMenu color="#FFFFFF" size={18} />
                  </View>
                  <View style={styles.cockpitNameCol}>
                    <View style={styles.skeletonTextLineLg} />
                    <View style={styles.heroBadgesStack}>
                      <View style={styles.skeletonBadge} />
                      <View style={styles.skeletonBadge} />
                    </View>
                  </View>
                </View>

                <View style={styles.heroLocationBlock}>
                  <View style={styles.heroLocationTextGroup}>
                    <View style={styles.skeletonTextLineSm} />
                    <View style={[styles.skeletonTextLineSm, styles.skeletonLocationSub]} />
                  </View>
                  <View style={styles.heroLocationPinCircle}>
                    <IconLocationPin color="#FFFFFF" size={14} strokeWidth={2} />
                  </View>
                </View>
              </View>

              {/* Row 2: Left (Bell Skeleton) | Right (Switch Skeleton) */}
              <View style={styles.cockpitBottomRow}>
                <View style={styles.heroBellBtn}>
                  <IconBell color="#F59E0B" size={18} />
                  <View style={styles.bellDot} />
                </View>

                <View style={styles.heroDutyContainer}>
                  <Text style={styles.heroDutyLabel}>Trạng thái nhận đơn</Text>
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
          </ImageBackground>
        </View>

        <View style={styles.contentContainer}>
          <View style={styles.ordersSectionHeader}>
            <Text accessibilityRole="header" style={styles.ordersHeadingTitle}>
              Đơn có thể nhận
            </Text>
            <Text style={styles.ordersHeadingSub}>Đang tải dữ liệu đơn hàng...</Text>
          </View>
          <View style={styles.skeletonList}>
            <SkeletonCard />
            <SkeletonCard />
          </View>
        </View>
      </View>
    );
  }

  // ── Error / Permission Denied State ──
  if (view.kind !== 'content') {
    return (
      <View style={styles.screenRoot}>
        <View style={styles.heroSection}>
          <ImageBackground
            accessibilityLabel="Hình ảnh xe tải vận tải LEOPARD trên cung đường đèo núi"
            imageStyle={styles.heroBackgroundImage}
            resizeMode="cover"
            source={driverHeroBgSource}
            style={styles.heroBackground}
          >
            <View style={styles.heroOverlay}>
              <View style={styles.cockpitTopRow}>
                <View style={styles.cockpitDriverLeft}>
                  <Pressable
                    accessibilityLabel="Mở menu điều hướng tài xế"
                    accessibilityRole="button"
                    hitSlop={8}
                    onPress={handleOpenMenu}
                    style={({ pressed }) => [styles.heroMenuButton, pressed ? styles.pressed : null]}
                    testID="driver-menu-button"
                  >
                    <IconMenu color="#FFFFFF" size={18} />
                  </Pressable>

                  <View style={styles.cockpitNameCol}>
                    <Text style={styles.heroDriverName}>Tài xế LEOPARD</Text>
                  </View>
                </View>

                <View style={styles.heroLocationBlock}>
                  <View style={styles.heroLocationPinCircle}>
                    <IconLocationPin color="#FFFFFF" size={14} strokeWidth={2} />
                  </View>
                </View>
              </View>
            </View>
          </ImageBackground>
        </View>

        <View style={styles.contentContainer}>
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

  const activeTrip = view.activeTrip;
  const waitingCount = view.requestedOrders.length;
  const isOnline = view.availability.status === 'AVAILABLE';
  const availabilityAction = view.availability.action;
  const isPending = availabilityAction?.isPending === true;
  const isAvailabilityDisabled = availabilityAction?.disabled === true || isPending;

  return (
    <View style={styles.screenRoot}>
      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          activeTrip ? styles.scrollContentWithSticky : null,
        ]}
        showsVerticalScrollIndicator={false}
        style={styles.screenContainer}
        testID="driver-orders-screen-scroll"
      >
        {/* 1. Cockpit Header (~185px) retaining brand image */}
        <View style={styles.heroSection}>
          <ImageBackground
            accessibilityLabel="Hình ảnh xe tải vận tải LEOPARD trên cung đường đèo núi"
            imageStyle={styles.heroBackgroundImage}
            resizeMode="cover"
            source={driverHeroBgSource}
            style={styles.heroBackground}
          >
            <View style={styles.heroOverlay}>
              {/* Row 1: Left (Menu + Name + Stacked Badges) | Right (Location) */}
              <View style={styles.cockpitTopRow}>
                <View style={styles.cockpitDriverLeft}>
                  <Pressable
                    accessibilityHint="Mở menu thanh bên trái để xem hồ sơ và các tiện ích"
                    accessibilityLabel="Mở menu điều hướng tài xế"
                    accessibilityRole="button"
                    hitSlop={8}
                    onPress={handleOpenMenu}
                    style={({ pressed }) => [styles.heroMenuButton, pressed ? styles.pressed : null]}
                    testID="driver-menu-button"
                  >
                    <IconMenu color="#FFFFFF" size={18} />
                  </Pressable>

                  <View style={styles.cockpitNameCol}>
                    <Text style={styles.heroDriverName}>Nguyễn Văn Tuấn</Text>
                    <View style={styles.heroBadgesStack}>
                      <View style={styles.heroBadge}>
                        <Text style={styles.heroBadgeText}>
                          <Text style={styles.heroMetaDim}>ID: </Text>
                          <Text style={styles.heroMetaBold}>DRV-88924</Text>
                        </Text>
                      </View>
                      <View style={styles.heroBadge}>
                        <Text style={styles.heroBadgeText}>
                          <Text style={styles.heroMetaDim}>Xe: </Text>
                          <Text style={styles.heroMetaBold}>51C-889.24 (2.5T)</Text>
                        </Text>
                      </View>
                    </View>
                  </View>
                </View>

                <View style={styles.heroLocationBlock}>
                  <View style={styles.heroLocationTextGroup}>
                    <Text style={styles.heroLocationHeader}>VỊ TRÍ HIỆN TẠI</Text>
                    <Text numberOfLines={2} style={styles.heroLocationValue}>
                      {currentAddress}
                    </Text>
                  </View>
                  <View style={styles.heroLocationPinCircle}>
                    <IconLocationPin color="#FFFFFF" size={14} strokeWidth={2} />
                  </View>
                </View>
              </View>

              {/* Row 2: Left (Bell icon) | Right (Hero Online/Offline Duty Control) */}
              <View style={styles.cockpitBottomRow}>
                <Pressable
                  accessibilityLabel="Thông báo mới"
                  accessibilityRole="button"
                  hitSlop={8}
                  style={({ pressed }) => [styles.heroBellBtn, pressed ? styles.pressed : null]}
                >
                  <IconBell color="#F59E0B" size={18} />
                  <View style={styles.bellDot} />
                </Pressable>

                <View style={styles.heroDutyContainer}>
                  <Text style={styles.heroDutyLabel}>Trạng thái nhận đơn</Text>
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
                      <View style={[styles.heroDutyDot, !isOnline ? styles.heroDutyDotActiveOffline : null]} />
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
            </View>
          </ImageBackground>
        </View>

        {/* 2. Main Dashboard Content Area */}
        <View style={styles.contentContainer}>
          {/* Notice Alert if any */}
          <DriverNotice onNoticeAction={onNoticeAction} view={view} />

          {/* In-day operational stats: Completed trips, today's income, online hours */}
          <View style={styles.statsDoubleBezelOuter}>
            <View style={styles.statsDoubleBezelInner}>
              <View style={styles.statBox}>
                <Text style={styles.statLabel}>Chuyến xong</Text>
                <Text style={styles.statValue}>4</Text>
                <Text style={styles.statSub}>Hôm nay</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statBox}>
                <Text style={styles.statLabel}>Thu nhập hôm nay</Text>
                <Text style={styles.statValueHighlight}>620.000 ₫</Text>
                <Text style={styles.statSub}>Đã khấu trừ phí</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statBox}>
                <Text style={styles.statLabel}>Giờ online</Text>
                <Text style={styles.statValue}>5.5h</Text>
                <Text style={styles.statSub}>98% chấp nhận</Text>
              </View>
            </View>
          </View>

          {/* Active Trip (if in progress) */}
          {view.activeTrip ? (
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
              <ActiveTripRail onOpenOrder={onOpenOrder} trip={view.activeTrip} />
            </View>
          ) : null}

          {/* 3. Live Radar Scan Bar (Tín hiệu quét đơn theo thời gian thực) */}
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

          {/* 4. HERO SECTION: "Đơn có thể nhận" (Available Orders) */}
          <View style={styles.sectionBlock}>
            <View style={styles.ordersSectionHeader}>
              <View>
                <Text accessibilityRole="header" style={styles.ordersHeadingTitle}>
                  Đơn có thể nhận
                </Text>
                <Text style={styles.ordersHeadingSub}>
                  {waitingCount > 0
                    ? `${waitingCount} đơn phù hợp gần bạn`
                    : 'Chưa có đơn phù hợp'}
                </Text>
              </View>

              <Pressable
                accessibilityLabel="Mở bộ lọc nhận đơn"
                accessibilityRole="button"
                onPress={() => setIsSettingsOpen(true)}
                style={({ pressed }) => [styles.filterBtn, pressed ? styles.pressed : null]}
              >
                <IconSettings color="#0B1E42" size={14} />
                <Text style={styles.filterBtnText}>Thiết lập</Text>
              </Pressable>
            </View>

            {/* Compact Filter Control Row (prompt.md Section 2) */}
            <View style={styles.compactFilterRow}>
              <Pressable
                accessibilityLabel="Đổi bán kính nhận đơn"
                onPress={() => setIsSettingsOpen(true)}
                style={styles.quickFilterChip}
              >
                <IconLocationPin color="#0B1E42" size={12} />
                <Text style={styles.quickFilterChipText}>Bán kính: {radiusKm} km ⌵</Text>
              </Pressable>

              <Pressable
                accessibilityLabel="Đổi loại xe tiếp nhận"
                onPress={() => setIsSettingsOpen(true)}
                style={styles.quickFilterChip}
              >
                <IconSpeedTruck color="#0B1E42" size={12} />
                <Text style={styles.quickFilterChipText}>{vehiclePref} ⌵</Text>
              </Pressable>
            </View>

            {/* Orders Feed or Empty State */}
            {view.requestedOrders.length === 0 ? (
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
                {view.requestedOrders.map((item) => (
                  <PublicOrderCard item={item} key={item.id} onOpenOrder={onOpenOrder} />
                ))}
              </View>
            )}
          </View>
        </View>

        {/* 5. Redesigned Incoming Dispatch Modal (Đơn nổ) */}
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
      </ScrollView>

      {/* 6. Sticky Bottom Action Bar when on an active trip (Thumb Zone for one-handed operation) */}
      {activeTrip ? (
        <View style={styles.stickyActionContainer}>
          <Pressable
            accessibilityHint="Mở buồng lái điều phối chuyến"
            accessibilityLabel="Vào buồng lái điều phối"
            accessibilityRole="button"
            onPress={onOpenOrder ? () => onOpenOrder(activeTrip.id) : undefined}
            style={({ pressed }) => [styles.stickyActionBtn, pressed ? styles.pressed : null]}
          >
            <Text style={styles.stickyActionBtnText}>
              MỞ BUỒNG LÁI ĐIỀU PHỐI CHUYẾN →
            </Text>
          </Pressable>
        </View>
      ) : null}

      {/* 7. Collapsible Left Sidebar Drawer */}
      <DriverSidebarDrawer
        activeRoute="/driver/orders"
        availability={view.availability}
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
        onNavigate={onNavigate}
        onSetAvailability={onSetAvailability}
      />

      {/* 7. Receiving Settings Bottom Sheet Modal */}
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
    backgroundColor: leopardPalette.canvas,
    flex: 1,
  },
  screenContainer: {
    backgroundColor: leopardPalette.canvas,
    flex: 1,
  },
  scrollContent: {
    backgroundColor: leopardPalette.canvas,
    flexGrow: 1,
    paddingBottom: spacing.xl + 20,
  },
  scrollContentWithSticky: {
    paddingBottom: 95,
  },

  /* ── Cockpit Header (~185px) ── */
  heroSection: {
    backgroundColor: '#0F172A',
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
    height: 185,
    overflow: 'hidden',
    width: '100%',
  },
  heroBackground: {
    height: '100%',
    width: '100%',
  },
  heroBackgroundImage: {
    opacity: 0.88,
    transform: [{ translateY: 0 }, { scale: 1.05 }],
  },
  heroOverlay: {
    backgroundColor: 'rgba(15, 23, 42, 0.52)',
    flex: 1,
    justifyContent: 'space-between',
    paddingBottom: spacing.md,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
  },
  cockpitTopRow: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  cockpitDriverLeft: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: 10,
    flex: 1,
  },
  cockpitNameCol: {
    flexShrink: 1,
    gap: 4,
  },
  heroDriverName: {
    color: '#FFFFFF',
    fontSize: 16.5,
    fontWeight: '800',
    letterSpacing: -0.2,
    textShadowColor: 'rgba(0, 0, 0, 0.9)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  heroBadgesStack: {
    alignItems: 'flex-start',
    flexDirection: 'column',
    gap: 4,
  },
  heroBadge: {
    backgroundColor: 'rgba(15, 23, 42, 0.7)',
    borderColor: 'rgba(255, 255, 255, 0.25)',
    borderRadius: 5,
    borderWidth: 1,
    paddingHorizontal: 7,
    paddingVertical: 2.5,
  },
  heroBadgeText: {
    fontSize: 10.5,
    textShadowColor: 'rgba(0, 0, 0, 0.85)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  heroMetaDim: {
    color: 'rgba(255, 255, 255, 0.75)',
    fontWeight: '500',
  },
  heroMetaBold: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  heroMenuButton: {
    alignItems: 'center',
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    borderColor: 'rgba(255, 255, 255, 0.25)',
    borderRadius: 18,
    borderWidth: 1,
    height: 36,
    justifyContent: 'center',
    width: 36,
  },
  heroLocationBlock: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 6,
    maxWidth: 155,
  },
  heroLocationTextGroup: {
    alignItems: 'flex-end',
    flexShrink: 1,
  },
  heroLocationHeader: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  heroLocationValue: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
    textAlign: 'right',
  },
  heroLocationPinCircle: {
    alignItems: 'center',
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    borderColor: 'rgba(255, 255, 255, 0.25)',
    borderRadius: 14,
    borderWidth: 1,
    height: 28,
    justifyContent: 'center',
    width: 28,
  },
  cockpitBottomRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: 2,
  },
  heroBellBtn: {
    alignItems: 'center',
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    borderColor: 'rgba(255, 255, 255, 0.25)',
    borderRadius: 16,
    borderWidth: 1,
    height: 32,
    justifyContent: 'center',
    position: 'relative',
    width: 32,
  },
  bellDot: {
    backgroundColor: '#F59E0B',
    borderRadius: 3,
    height: 6,
    position: 'absolute',
    right: 6,
    top: 6,
    width: 6,
  },
  heroDutyContainer: {
    alignItems: 'flex-end',
    gap: 4,
  },
  heroDutyLabel: {
    color: '#CBD5E1',
    fontSize: 10.5,
    fontWeight: '700',
    textShadowColor: 'rgba(0, 0, 0, 0.85)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  heroDutySwitch: {
    backgroundColor: '#0B1E42',
    borderColor: 'rgba(255, 255, 255, 0.35)',
    borderRadius: radius.bezelOuter,
    borderWidth: 1.5,
    flexDirection: 'row',
    height: 48,
    minHeight: 48,
    padding: 4,
  },
  heroDutySwitchOnline: {
    borderColor: '#10B981',
  },
  heroDutySwitchOffline: {
    borderColor: '#64748B',
  },
  heroDutyTab: {
    alignItems: 'center',
    borderRadius: radius.bezelInner,
    flexDirection: 'row',
    gap: 6,
    justifyContent: 'center',
    minHeight: 38,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  heroDutyTabActiveOnline: {
    backgroundColor: '#10B981',
  },
  heroDutyTabActiveOffline: {
    backgroundColor: '#1E293B',
  },
  heroDutyDot: {
    backgroundColor: '#64748B',
    borderRadius: 4,
    height: 8,
    width: 8,
  },
  heroDutyDotActive: {
    backgroundColor: '#FFFFFF',
  },
  heroDutyDotActiveOffline: {
    backgroundColor: '#F59E0B',
  },
  heroDutyTabText: {
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 0.4,
  },
  heroDutyTabTextActive: {
    color: '#FFFFFF',
  },
  heroDutyTabTextInactive: {
    color: '#94A3B8',
  },

  /* ── Double-bezel Operational Stats ── */
  statsDoubleBezelOuter: {
    backgroundColor: '#FFFFFF',
    borderColor: '#CBD5E1',
    borderRadius: radius.bezelOuter,
    borderWidth: 1.5,
    padding: 4,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  statsDoubleBezelInner: {
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderColor: '#E2E8F0',
    borderRadius: radius.bezelInner,
    borderWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  statBox: {
    alignItems: 'center',
    flex: 1,
    gap: 2,
  },
  statLabel: {
    color: '#64748B',
    fontSize: 10.5,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  statValue: {
    color: '#0B1E42',
    fontSize: 16,
    fontWeight: '900',
    fontVariant: ['tabular-nums'],
  },
  statValueHighlight: {
    color: '#10B981',
    fontSize: 16,
    fontWeight: '900',
    fontVariant: ['tabular-nums'],
  },
  statSub: {
    color: '#94A3B8',
    fontSize: 9.5,
    fontWeight: '600',
  },
  statDivider: {
    backgroundColor: '#E2E8F0',
    height: 28,
    width: 1,
  },
  skeletonTextLineLg: {
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    borderRadius: 4,
    height: 16,
    width: 120,
  },
  skeletonTextLineSm: {
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    borderRadius: 4,
    height: 10,
    width: 60,
  },
  skeletonLocationSub: {
    marginTop: 4,
    width: 80,
  },
  skeletonBadge: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 5,
    height: 18,
    width: 68,
  },

  /* ── Content Container ── */
  contentContainer: {
    gap: spacing.md,
    marginTop: spacing.md,
    paddingHorizontal: spacing.md,
    paddingTop: 0,
  },
  activeSectionBlock: {
    gap: spacing.xs + 2,
  },
  activeSectionHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 2,
  },
  activeSectionTitle: {
    color: leopardPalette.textSlateDark,
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: -0.2,
  },
  activeLivePill: {
    alignItems: 'center',
    backgroundColor: '#DCFCE7',
    borderColor: '#86EFAC',
    borderRadius: radius.pill,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  activeLivePillDot: {
    backgroundColor: '#16A34A',
    borderRadius: 3,
    height: 6,
    width: 6,
  },
  activeLivePillText: {
    color: '#15803D',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  sectionBlock: {
    gap: spacing.sm,
  },

  /* ── Radar Live Strip ── */
  radarLiveStrip: {
    alignItems: 'center',
    backgroundColor: '#F0F4F9',
    borderColor: '#CBD5E1',
    borderRadius: 12,
    borderWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  radarLeftGroup: {
    alignItems: 'center',
    flex: 1,
    flexDirection: 'row',
    gap: 8,
  },
  radarIconOuter: {
    alignItems: 'center',
    backgroundColor: 'rgba(2, 132, 199, 0.15)',
    borderRadius: 10,
    height: 20,
    justifyContent: 'center',
    width: 20,
  },
  radarLiveText: {
    color: '#061226',
    flex: 1,
    fontSize: 12,
    fontWeight: '600',
  },
  radarLiveHighlight: {
    color: '#075985',
    fontWeight: '800',
  },
  radarSimulateBtn: {
    alignItems: 'center',
    backgroundColor: '#0B1E42',
    borderRadius: radius.pill,
    flexDirection: 'row',
    gap: 5,
    justifyContent: 'center',
    minHeight: 44,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  radarSimulateBtnText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.2,
  },

  /* ── Orders Section Header ── */
  ordersSectionHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  ordersHeadingTitle: {
    color: leopardPalette.textSlateDark,
    fontSize: 18,
    fontWeight: '900',
    letterSpacing: -0.3,
  },
  ordersHeadingSub: {
    color: leopardPalette.textMutedSlate,
    fontSize: 12,
    fontWeight: '500',
    marginTop: 2,
  },
  filterBtn: {
    alignItems: 'center',
    backgroundColor: '#F0F4F9',
    borderColor: '#CBD5E1',
    borderRadius: radius.pill,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  filterBtnText: {
    color: '#0B1E42',
    fontSize: 12,
    fontWeight: '700',
  },

  /* ── Compact Filter Control Row ── */
  compactFilterRow: {
    flexDirection: 'row',
    gap: 8,
  },
  quickFilterChip: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderColor: '#CBD5E1',
    borderRadius: radius.pill,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  quickFilterChipText: {
    color: '#334155',
    fontSize: 12,
    fontWeight: '700',
  },
  quickFilterChipIcon: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderColor: '#CBD5E1',
    borderRadius: radius.pill,
    borderWidth: 1,
    height: 32,
    justifyContent: 'center',
    width: 32,
  },

  /* ── Orders Feed & Cards (Double-Bezel 24px/18px) ── */
  ordersFeed: {
    gap: spacing.sm,
  },
  orderCardOuter: {
    backgroundColor: '#FFFFFF',
    borderColor: 'rgba(11, 30, 66, 0.08)',
    borderRadius: radius.bezelOuter,
    borderWidth: 1.5,
    padding: 4,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  orderCardInner: {
    backgroundColor: '#FAFCFF',
    borderColor: '#E2E8F0',
    borderRadius: radius.bezelInner,
    borderWidth: 1,
    gap: spacing.xs + 2,
    padding: spacing.md,
  },
  cardBody: {
    gap: spacing.xs + 2,
  },
  cardHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  cardHeaderLeft: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 5,
  },
  cardOrderRef: {
    color: '#0F172A',
    fontSize: 13,
    fontWeight: '800',
    marginRight: 4,
  },
  proximityDot: {
    backgroundColor: '#16A34A',
    borderRadius: 4,
    height: 8,
    width: 8,
  },
  proximityText: {
    color: '#15803D',
    fontSize: 12,
    fontWeight: '800',
  },
  matchDivider: {
    color: '#94A3B8',
    fontSize: 12,
  },
  matchText: {
    color: '#061226',
    fontSize: 12,
    fontWeight: '700',
  },
  cardFareBanner: {
    alignItems: 'center',
    backgroundColor: '#F0FDF4',
    borderColor: '#DCFCE7',
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  cardFareLeft: {
    gap: 1,
  },
  cardFareCaption: {
    color: '#15803D',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  cardFareAmount: {
    color: '#166534',
    fontSize: 18,
    fontWeight: '900',
    letterSpacing: 0.2,
    fontVariant: ['tabular-nums'],
  },
  cardDistanceBadge: {
    alignItems: 'center',
    backgroundColor: '#F0F4F9',
    borderColor: '#CBD5E1',
    borderRadius: 6,
    borderWidth: 0.5,
    flexDirection: 'row',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  cardDistanceText: {
    color: '#061226',
    fontSize: 11,
    fontWeight: '700',
  },
  cardRouteBlock: {
    flexDirection: 'row',
    gap: 8,
    paddingVertical: 4,
  },
  cardRouteSpineMini: {
    alignItems: 'center',
    paddingTop: 3,
    width: 12,
  },
  spinePointDotA: {
    backgroundColor: '#16A34A',
    borderRadius: 4,
    height: 8,
    width: 8,
  },
  spineDottedTrackMini: {
    backgroundColor: '#CBD5E1',
    height: 18,
    marginVertical: 2,
    width: 1.5,
  },
  spinePointDotB: {
    backgroundColor: '#EA580C',
    borderRadius: 2,
    height: 8,
    width: 8,
  },
  cardRouteAddresses: {
    flex: 1,
    gap: 4,
  },
  cardPickupAddr: {
    color: '#0F172A',
    fontSize: 13.5,
    fontWeight: '800',
  },
  cardDropoffAddr: {
    color: '#0F172A',
    fontSize: 13.5,
    fontWeight: '800',
  },
  cardPublicRouteSub: {
    color: '#64748B',
    fontSize: 11,
    marginTop: -2,
    paddingLeft: 20,
  },
  routeRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 6,
  },
  routeText: {
    color: leopardPalette.textSlateDark,
    flex: 1,
    fontSize: 14.5,
    fontWeight: '800',
    lineHeight: 20,
  },
  tagsContainer: {
    flexDirection: 'row',
    gap: 8,
  },
  vehicleTag: {
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
    borderRadius: 6,
    flexDirection: 'row',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  vehicleTagText: {
    color: '#475569',
    fontSize: 11.5,
    fontWeight: '600',
  },
  cargoTag: {
    backgroundColor: '#F8FAFC',
    borderColor: '#E2E8F0',
    borderRadius: 6,
    borderWidth: 1,
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  cargoTagText: {
    color: '#64748B',
    fontSize: 11.5,
    fontWeight: '500',
    fontVariant: ['tabular-nums'],
  },
  cardFooter: {
    alignItems: 'center',
    borderTopColor: '#F1F5F9',
    borderTopWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: spacing.xs,
  },
  priceEtaRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 4,
  },
  priceText: {
    color: colors.brand.background,
    fontSize: 12.5,
    fontWeight: '700',
  },
  updatedText: {
    color: leopardPalette.textMutedSlate,
    fontSize: 11,
    fontWeight: '500',
  },
  cardActionRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 4,
  },
  cardDeclineBtn: {
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
    borderColor: '#E2E8F0',
    borderRadius: 10,
    borderWidth: 1,
    flex: 1,
    justifyContent: 'center',
    minHeight: 48,
    paddingVertical: 10,
  },
  cardDeclineText: {
    color: '#64748B',
    fontSize: 13,
    fontWeight: '700',
  },
  cardAcceptBtn: {
    alignItems: 'center',
    backgroundColor: leopardPalette.primary,
    borderRadius: 10,
    flex: 2,
    justifyContent: 'center',
    minHeight: 48,
    paddingVertical: 10,
  },
  cardAcceptText: {
    color: '#FFFFFF',
    fontSize: 13.5,
    fontWeight: '900',
    letterSpacing: 0.3,
    fontVariant: ['tabular-nums'],
  },

  /* ── Empty State ── */
  emptyBox: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderColor: '#E2E8F0',
    borderRadius: 16,
    borderWidth: 1.5,
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.xl,
  },
  emptyIconCircle: {
    alignItems: 'center',
    backgroundColor: '#F0F4F9',
    borderRadius: 28,
    height: 56,
    justifyContent: 'center',
    width: 56,
  },
  emptyTitle: {
    color: leopardPalette.textSlateDark,
    fontSize: 16,
    fontWeight: '800',
  },
  emptyMessage: {
    color: leopardPalette.textMutedSlate,
    fontSize: 13,
    lineHeight: 18,
    textAlign: 'center',
  },
  expandRadiusBtn: {
    backgroundColor: '#F0F4F9',
    borderColor: '#CBD5E1',
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 9,
  },
  expandRadiusText: {
    color: '#0B1E42',
    fontSize: 13,
    fontWeight: '800',
  },

  /* ── Active Trip Rail ── */
  activeRail: {
    backgroundColor: '#FFFFFF',
    borderColor: '#CBD5E1',
    borderLeftColor: '#0B1E42',
    borderLeftWidth: 5,
    borderRadius: 16,
    borderWidth: 1,
    gap: spacing.sm,
    padding: spacing.md,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 3,
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
    backgroundColor: '#F0F4F9',
    borderRadius: 8,
    height: 32,
    justifyContent: 'center',
    width: 32,
  },
  activeReference: {
    color: '#0F172A',
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: 0.2,
  },
  activeRouteSpineBox: {
    flexDirection: 'row',
    gap: 12,
    paddingVertical: 2,
  },
  routeSpineColumn: {
    alignItems: 'center',
    paddingTop: 2,
    width: 20,
  },
  spinePointA: {
    alignItems: 'center',
    backgroundColor: '#DCFCE7',
    borderColor: '#16A34A',
    borderRadius: 10,
    borderWidth: 1.5,
    height: 20,
    justifyContent: 'center',
    width: 20,
  },
  spinePointTextA: {
    color: '#15803D',
    fontSize: 10,
    fontWeight: '900',
  },
  spinePointB: {
    alignItems: 'center',
    backgroundColor: '#FFEDD5',
    borderColor: '#EA580C',
    borderRadius: 10,
    borderWidth: 1.5,
    height: 20,
    justifyContent: 'center',
    width: 20,
  },
  spinePointTextB: {
    color: '#C2410C',
    fontSize: 10,
    fontWeight: '900',
  },
  spineDashedLine: {
    backgroundColor: '#CBD5E1',
    flex: 1,
    marginVertical: 4,
    minHeight: 28,
    width: 2,
  },
  routeSpineLabels: {
    flex: 1,
    gap: 6,
  },
  routeLocationGroup: {
    gap: 2,
  },
  routePointTypeA: {
    color: '#15803D',
    fontSize: 10.5,
    fontWeight: '800',
    letterSpacing: 0.4,
  },
  routePointTypeB: {
    color: '#C2410C',
    fontSize: 10.5,
    fontWeight: '800',
    letterSpacing: 0.4,
  },
  activeOriginText: {
    color: '#0F172A',
    fontSize: 13.5,
    fontWeight: '600',
    lineHeight: 18,
  },
  activeDestText: {
    color: '#0F172A',
    fontSize: 14,
    fontWeight: '700',
    lineHeight: 19,
  },
  spineEtaRow: {
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: '#F0F4F9',
    borderColor: '#CBD5E1',
    borderRadius: 6,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 5,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  spineEtaText: {
    color: '#0B1E42',
    fontSize: 11.5,
    fontWeight: '700',
  },
  proofWarningBanner: {
    alignItems: 'center',
    backgroundColor: '#FEF3C7',
    borderColor: '#FDE68A',
    borderLeftColor: '#D97706',
    borderLeftWidth: 4,
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  proofWarningIcon: {
    color: '#D97706',
    fontSize: 13,
  },
  proofWarningText: {
    color: '#B45309',
    flex: 1,
    fontSize: 12,
    fontWeight: '700',
  },
  activeSignalRow: {
    alignItems: 'center',
    borderTopColor: '#F1F5F9',
    borderTopWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: 6,
  },
  liveTrackingIndicator: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 6,
  },
  livePulseDot: {
    backgroundColor: '#16A34A',
    borderRadius: 3.5,
    height: 7,
    width: 7,
  },
  trackingText: {
    color: '#64748B',
    fontSize: 11.5,
    fontWeight: '500',
  },
  activeCardFooter: {
    paddingTop: 2,
  },
  activeActionBtn: {
    alignItems: 'center',
    backgroundColor: '#0B1E42',
    borderRadius: 10,
    justifyContent: 'center',
    paddingVertical: 12,
  },
  activeActionHint: {
    color: '#FFFFFF',
    fontSize: 13.5,
    fontWeight: '800',
    letterSpacing: 0.2,
  },

  /* ── Sticky Bottom Action Bar (Thumb Zone) ── */
  stickyActionContainer: {
    backgroundColor: '#FFFFFF',
    borderTopColor: '#E2E8F0',
    borderTopWidth: 1,
    bottom: 0,
    elevation: 12,
    left: 0,
    paddingBottom: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.xs + 3,
    position: 'absolute',
    right: 0,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
  },
  stickyActionBtn: {
    alignItems: 'center',
    backgroundColor: '#0B1E42',
    borderRadius: 12,
    height: 52,
    justifyContent: 'center',
  },
  stickyActionBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: 0.4,
  },

  /* ── Notice Alert ── */
  notice: {
    borderRadius: 12,
    borderWidth: 1,
    gap: spacing.xs,
    padding: spacing.sm,
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
    ...typography.body,
    fontSize: 12.5,
  },

  /* ── Receiving Settings Modal ── */
  modalBackdrop: {
    backgroundColor: 'rgba(15, 23, 42, 0.7)',
    flex: 1,
    justifyContent: 'flex-end',
  },
  settingsSheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    gap: spacing.md,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    paddingBottom: spacing.xl + 10,
  },
  settingsHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  settingsTitle: {
    color: leopardPalette.textSlateDark,
    fontSize: 15,
    fontWeight: '900',
    letterSpacing: 0.4,
  },
  closeBtn: {
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
    borderRadius: 16,
    height: 32,
    justifyContent: 'center',
    width: 32,
  },
  filterSectionLabel: {
    color: '#475569',
    fontSize: 12.5,
    fontWeight: '800',
  },
  optionsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  optionPill: {
    backgroundColor: '#F8FAFC',
    borderColor: '#CBD5E1',
    borderRadius: 10,
    borderWidth: 1.5,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  optionPillActive: {
    backgroundColor: '#F0F4F9',
    borderColor: leopardPalette.primary,
  },
  optionPillText: {
    color: '#475569',
    fontSize: 13,
    fontWeight: '700',
  },
  optionPillTextActive: {
    color: leopardPalette.primaryDark,
    fontWeight: '900',
  },
  saveSettingsWrap: {
    marginTop: spacing.xs,
  },

  /* ── Skeleton ── */
  skeletonList: {
    gap: spacing.sm,
  },

  /* ── Utilities ── */
  pressed: {
    opacity: 0.8,
  },
});
