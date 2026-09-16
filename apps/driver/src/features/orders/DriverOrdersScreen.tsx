import React, { useEffect, useState } from 'react';
import { Alert, Linking, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';

import { GestureBottomSheet, RealInteractiveMap, ScreenState, SkeletonCard, resolveLocationCoords } from '@leopard/mobile-core';

import { IncomingDispatchModal } from './IncomingDispatchModal';
import type { IncomingDispatchOffer } from './IncomingDispatchModal';
import type { DriverListView } from './model';

import { DriverConnectionCapsule } from './components/DriverConnectionCapsule';
import { DriverConnectionStatusRow } from './components/DriverConnectionStatusRow';
import { DriverMapControlStack } from './components/DriverMapControlStack';
import { DriverQuickActionGrid } from './components/DriverQuickActionGrid';
import { DriverLocationStatus } from './components/DriverLocationStatus';
import { DriverReceivingSettingsModal } from './components/DriverReceivingSettingsModal';
import { DriverSystemBanner } from './components/DriverSystemBanner';
import { DriverActiveTripCard } from './components/DriverActiveTripCard';
import { DriverNotice } from './components/DriverNotice';
import { DriverQuickNavOverlay } from './components/DriverQuickNavOverlay';
import { useDriverIdlePingHealth } from './useDriverIdlePing';
import { getDriverCurrentLocation, type DriverLocationState } from './driver-current-location';

/**
 * Home is a pure cockpit: duty toggle, map/location, active trip. The idle
 * panel (status + quick actions) is a fixed, non-scrolling block — there is
 * nothing in it worth dragging or scrolling, so it is a plain View, not a
 * GestureBottomSheet. The sheet is reserved for the active-trip mission
 * cockpit, which has enough content to benefit from drag/snap.
 */
const ACTIVE_TRIP_SNAP_POINTS: number[] = [0.32, 0.62, 0.92];

/** Vertical gap between the connection pill and the sheet's top edge. */
const CAPSULE_GAP = 8;

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
    vehiclePlate?: string | null;
    vehicleType?: string | null;
  };
  showDebugActions?: boolean;
}>;

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
  const [locationRequestKey, setLocationRequestKey] = useState(0);
  const [driverLocation, setDriverLocation] = useState<DriverLocationState>({ kind: 'loading' });
  /** Measured height of the fixed idle panel, so the duty capsule floats just above it. */
  const [idlePanelHeight, setIdlePanelHeight] = useState(0);
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

  /** Demo hotline for LEOPARD's own emergency dispatch desk (fictional, dialable digits). */
  const SOS_HOTLINE_DIAL = '19001919';
  const SOS_HOTLINE_LABEL = '1900 1919';

  const handleTriggerSos = () => {
    const title = 'Cuộc gọi khẩn cấp SOS';
    const message = `Gọi Đội cứu hộ khẩn cấp LEOPARD 24/7 (${SOS_HOTLINE_LABEL})? Tọa độ GPS của bạn sẽ được chuyển tiếp tức thì.`;
    const dial = () => void Linking.openURL(`tel:${SOS_HOTLINE_DIAL}`);
    // react-native-web's Alert.alert is a no-op (no dialog implementation) —
    // fall back to window.confirm so the action still dials while testing on web.
    if (Platform.OS === 'web') {
      if (window.confirm(`${title}\n\n${message}`)) dial();
      return;
    }
    Alert.alert(title, message, [
      { text: 'Hủy', style: 'cancel' },
      { text: 'Gọi ngay', style: 'destructive', onPress: dial },
    ]);
  };

  const handleSimulateIncomingOffer = () => {
    const first =
      view.kind === 'content' && view.requestedOrders.length > 0 ? view.requestedOrders[0] : null;
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

  const isContent = view.kind === 'content';
  const activeTrip = isContent ? view.activeTrip : null;
  const isOnline = isContent
    ? view.availability.status === 'AVAILABLE' ||
      (view.availability.status as string) === 'ONLINE'
    : false;

  const handleToggleAvailability = () => {
    if (!isContent) return;
    if (view.availability.action?.isPending || view.availability.action?.disabled) return;
    if (onSetAvailability) {
      onSetAvailability(view.availability.action?.id ?? (isOnline ? 'OFFLINE' : 'ONLINE'));
    }
  };

  /** Secondary line under the connection status: the driver's registered vehicle. */
  const vehicleSubtitle = [driverIdentity?.vehiclePlate?.trim(), driverIdentity?.vehicleType?.trim()]
    .filter((part): part is string => Boolean(part))
    .join(' · ');

  return (
    <View style={styles.screenRoot}>
      {/* ── Layer 0: full-bleed live map ── */}
      <View style={styles.mapLayer} testID="driver-map-canvas">
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
          interactive={isContent}
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

      {/* ── Layer 1: right-edge map control stack (Grab-style) ── */}
      <View pointerEvents="box-none" style={styles.mapControlLayer}>
        <Text style={styles.srOnly}>Trạng thái nhận đơn</Text>
        <DriverMapControlStack
          isLocating={driverLocation.kind === 'loading'}
          onOpenRadiusSettings={() => setIsSettingsOpen(true)}
          onRecenter={retryCurrentLocation}
          onRefreshOffers={onRetry}
        />
      </View>

      {/* ── Layer 2: duty pill pinned just above the sheet's top edge ── */}
      {isContent && !activeTrip ? (
        <View
          pointerEvents="box-none"
          style={[styles.capsuleLayer, { bottom: idlePanelHeight + CAPSULE_GAP }]}
        >
          <DriverConnectionCapsule
            disabled={Boolean(view.availability.action?.disabled)}
            isOnline={isOnline}
            isPending={Boolean(view.availability.action?.isPending)}
            onToggle={handleToggleAvailability}
          />
        </View>
      ) : null}

      {/* ── Layer 3: mission cockpit (draggable) or idle panel (fixed, no scroll) ── */}
      {activeTrip ? (
        <GestureBottomSheet
          initialSnapIndex={1}
          snapPoints={ACTIVE_TRIP_SNAP_POINTS}
          style={styles.sheetSurface}
          testID="driver-load-board-sheet"
        >
          <ScrollView
            contentContainerStyle={styles.sheetContent}
            nestedScrollEnabled
            showsVerticalScrollIndicator={false}
          >
            <DriverActiveTripCard onNavigate={onNavigate} onOpenOrder={onOpenOrder} trip={activeTrip} />

            <DriverSystemBanner
              hasActiveTrip
              idlePingHealth={idlePingHealth}
              isOnline={isOnline}
              networkError={networkError}
              onRetry={onRetry}
            />

            {isContent ? <DriverNotice onNoticeAction={onNoticeAction} view={view} /> : null}
          </ScrollView>
        </GestureBottomSheet>
      ) : (
        /* Grab renders this as a couple of stacked, fixed floating cards over the
           map — not a scrollable/draggable sheet. There's nothing here worth
           dragging, so this is a plain View: no ScrollView, no gesture handle. */
        <View
          onLayout={(event) => setIdlePanelHeight(event.nativeEvent.layout.height)}
          style={styles.idlePanel}
          testID="driver-load-board-sheet"
        >
          {/* Fade the backdrop in from the map (transparent) to solid canvas toward the
              bottom, instead of a flat opacity — a hard-edged rectangle over the map reads
              as a pasted-on panel. */}
          <Svg height="100%" style={[StyleSheet.absoluteFill, styles.idlePanelFadeSvg]} width="100%">
            <Defs>
              <LinearGradient id="idlePanelFade" x1="0" x2="0" y1="0" y2="1">
                <Stop offset="0" stopColor="#F8FAFC" stopOpacity={0} />
                <Stop offset="0.35" stopColor="#F8FAFC" stopOpacity={0.8} />
                <Stop offset="1" stopColor="#F8FAFC" stopOpacity={0.97} />
              </LinearGradient>
            </Defs>
            <Rect fill="url(#idlePanelFade)" height="100%" width="100%" />
          </Svg>

          {view.kind === 'loading' ? (
            <View style={styles.sheetSectionGap}>
              <View style={styles.sheetHeader}>
                <Text accessibilityRole="header" style={styles.sheetTitle}>
                  Đang tải bảng đơn
                </Text>
                <Text style={styles.sheetSubtitle}>LEOPARD đang kết nối điều phối...</Text>
              </View>
              <SkeletonCard />
              <SkeletonCard />
            </View>
          ) : null}

          {view.kind === 'permission-denied' || view.kind === 'error' ? (
            <View style={styles.boundaryBox}>
              <ScreenState
                actionLabel={view.kind === 'error' ? 'Thử tải lại danh sách' : undefined}
                message={view.message}
                onAction={onRetry}
                state={view.kind}
                title={view.title}
              />
            </View>
          ) : null}

          {isContent ? (
            <>
              <DriverConnectionStatusRow isOnline={isOnline} subtitle={vehicleSubtitle || null} />

              <DriverQuickActionGrid
                onOpenSettings={() => setIsSettingsOpen(true)}
                onOpenVehicle={() => onNavigate?.('/profile')}
                onOpenWallet={() => onNavigate?.('/wallet')}
                onTriggerSos={handleTriggerSos}
              />

              <DriverLocationStatus location={driverLocation} onRetry={retryCurrentLocation} />

              {showDebugActions ? (
                <Pressable
                  accessibilityHint="Mở modal đơn nổ để thử nghiệm giao diện tiếp nhận"
                  accessibilityLabel="Mô phỏng nổ đơn"
                  accessibilityRole="button"
                  onPress={handleSimulateIncomingOffer}
                  style={({ pressed }) => [styles.debugBtn, pressed ? styles.debugBtnPressed : null]}
                >
                  <Text style={styles.debugBtnText}>Thử nổ đơn</Text>
                </Pressable>
              ) : null}

              <DriverSystemBanner
                hasActiveTrip={false}
                idlePingHealth={idlePingHealth}
                isOnline={isOnline}
                networkError={networkError}
                onRetry={onRetry}
              />

              <DriverNotice onNoticeAction={onNoticeAction} view={view} />
            </>
          ) : null}
        </View>
      )}

      {/* ── Layer 4: Grab-style floating quick-nav (pill + avatar) ── */}
      {!activeTrip ? (
        <DriverQuickNavOverlay driverName={driverIdentity?.name} onNavigate={onNavigate} />
      ) : null}

      {/* ── Layer 5: overlays ── */}
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

      <DriverReceivingSettingsModal
        onClose={() => setIsSettingsOpen(false)}
        onSave={setRadiusKm}
        radiusKm={radiusKm}
        visible={isSettingsOpen}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  sheetSurface: {
    backgroundColor: '#F8FAFC',
    shadowOpacity: 0,
    elevation: 0,
  },
  screenRoot: {
    backgroundColor: '#F8FAFC',
    flex: 1,
    overflow: 'hidden',
    position: 'relative',
  },
  mapLayer: {
    ...StyleSheet.absoluteFill,
    zIndex: 0,
  },
  mapControlLayer: {
    position: 'absolute',
    right: 16,
    top: '34%',
    zIndex: 20,
  },
  idlePanelFadeSvg: {
    pointerEvents: 'none',
  },
  idlePanel: {
    bottom: 0,
    left: 0,
    paddingBottom: 20,
    paddingHorizontal: 16,
    paddingTop: 12,
    position: 'absolute',
    right: 0,
    zIndex: 40,
  },
  capsuleLayer: {
    alignItems: 'center',
    left: 0,
    position: 'absolute',
    right: 0,
    zIndex: 25,
  },
  sheetContent: {
    paddingBottom: 104,
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  sheetSectionGap: {
    gap: 12,
  },
  sheetHeader: {
    marginBottom: 4,
  },
  sheetTitle: {
    color: '#0B1E42',
    fontSize: 17,
    fontWeight: '800',
  },
  sheetSubtitle: {
    color: '#64748B',
    fontSize: 12,
    fontWeight: '500',
    marginTop: 2,
  },
  boundaryBox: {
    paddingVertical: 12,
  },
  debugBtn: {
    alignItems: 'center',
    backgroundColor: '#F0F4F9',
    borderColor: '#CBD5E1',
    borderRadius: 10,
    borderWidth: 1,
    marginTop: 10,
    minHeight: 36,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  debugBtnPressed: {
    opacity: 0.85,
  },
  debugBtnText: {
    color: '#0B1E42',
    fontSize: 11,
    fontWeight: '700',
  },
  srOnly: {
    height: 1,
    opacity: 0,
    position: 'absolute',
    width: 1,
  },
});
