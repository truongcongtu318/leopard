import React, { useCallback, useEffect, useState } from 'react';
import { Alert, Linking, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';

import {
  GestureBottomSheet,
  RealInteractiveMap,
  ScreenState,
  SkeletonCard,
  colors,
  iosContinuousCurve,
  leopardPalette,
  radius,
  resolveLocationCoords,
  spacing,
  typeScale,
} from '@leopard/mobile-core';

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
  incomingOffer?: IncomingDispatchOffer | null;
  onAcceptIncomingOffer?: (orderId: string) => void;
  onDeclineIncomingOffer?: (orderId: string) => void;
  isAcceptingIncomingOffer?: boolean;
  onNavigate?: (route: string) => void;
  networkError?: string | null;
  driverIdentity?: {
    name?: string | null;
    avatarUrl?: string | null;
    vehiclePlate?: string | null;
    vehicleType?: string | null;
  };
  earningsTodayVnd?: number;
  walletBalanceVnd?: number;
  ratingAvg?: number;
  showDebugActions?: boolean;
}>;

function formatDongLabel(value: number): string {
  return `đ ${Math.round(value).toLocaleString('vi-VN')}`;
}

export function DriverOrdersScreen({
  driverIdentity,
  earningsTodayVnd,
  incomingOffer = null,
  isAcceptingIncomingOffer = false,
  networkError = null,
  onAcceptIncomingOffer,
  onDeclineIncomingOffer,
  onNavigate,
  onOpenOrder,
  onRetry,
  onSetAvailability,
  ratingAvg,
  showDebugActions = false,
  view,
  walletBalanceVnd,
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

  // No backend-configured emergency line exists: surface a placeholder instead
  // of dialing a fabricated hotline number.
  const handleTriggerSos = () => {
    const title = 'Cuộc gọi khẩn cấp SOS';
    const message = 'Đường dây nóng khẩn cấp sẽ hiển thị khi BE cấu hình. Hiện chưa có số liên hệ.';
    Alert.alert(title, message, [{ text: 'Đã hiểu', style: 'cancel' }]);
  };

  // Debug-only: replay the first real BE offer to exercise the incoming-offer
  // modal UI. Never fabricates order data — returns silently in production.
  const handleSimulateIncomingOffer = () => {
    if (!__DEV__) return;
    const first =
      view.kind === 'content' && view.requestedOrders.length > 0 ? view.requestedOrders[0] : null;
    if (!first) return;
    setDismissedOfferId(null);
    setSimulatedOffer({
      id: first.id,
      reference: first.reference,
      pickupDistanceLabel: first.pickupDistanceLabel ?? 'Đang cập nhật',
      pickupAddress: first.pickupLocationLabel ?? 'Điểm lấy hàng',
      dropoffAddress: first.dropoffLocationLabel ?? 'Điểm giao hàng',
      tripDistanceLabel: first.distanceLabel ?? 'Đang cập nhật',
      etaLabel: first.etaLabel ?? 'ETA dự kiến: đang cập nhật',
      priceLabel: first.priceLabel ?? 'Đang cập nhật',
      vehicleLabel: first.vehicleLabel ?? '—',
      cargoSummary: first.cargoSummary ?? '—',
      timeoutSeconds: 30,
    });
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

  const handleAcceptIncomingModal = useCallback(
    (orderId: string) => {
      if (onAcceptIncomingOffer) {
        onAcceptIncomingOffer(orderId);
      } else if (onOpenOrder) {
        setSimulatedOffer(null);
        onOpenOrder(orderId);
      }
    },
    [onAcceptIncomingOffer, onOpenOrder],
  );

  const handleDeclineIncomingModal = useCallback(
    (orderId: string) => {
      setDismissedOfferId(orderId);
      setSimulatedOffer(null);
      if (onDeclineIncomingOffer) {
        onDeclineIncomingOffer(orderId);
      }
    },
    [onDeclineIncomingOffer],
  );

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
                <Stop offset="0" stopColor={colors.neutral.canvas} stopOpacity={0} />
                <Stop offset="0.35" stopColor={colors.neutral.canvas} stopOpacity={0.8} />
                <Stop offset="1" stopColor={colors.neutral.canvas} stopOpacity={0.97} />
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
                onOpenOrderList={() => onNavigate?.('/board')}
                onOpenSettings={() => setIsSettingsOpen(true)}
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
            </>
          ) : null}
        </View>
      )}

      {/* ── Layer 4: Grab-style floating quick-nav (pill + avatar) ── */}
      {!activeTrip ? (
        <DriverQuickNavOverlay
          avatarUrl={driverIdentity?.avatarUrl}
          driverName={driverIdentity?.name}
          earningsTodayLabel={earningsTodayVnd !== undefined ? formatDongLabel(earningsTodayVnd) : undefined}
          isOnline={isOnline}
          onNavigate={onNavigate}
          rating={ratingAvg !== undefined ? ratingAvg.toFixed(2) : undefined}
          walletBalanceLabel={walletBalanceVnd !== undefined ? formatDongLabel(walletBalanceVnd) : undefined}
        />
      ) : null}

      {/* ── Layer 5: overlays ── */}
      <IncomingDispatchModal
        isAccepting={isAcceptingIncomingOffer}
        offer={activeIncomingOffer}
        onAccept={handleAcceptIncomingModal}
        onDecline={handleDeclineIncomingModal}
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
    backgroundColor: colors.neutral.canvas,
    boxShadow: 'none',
  },
  screenRoot: {
    backgroundColor: colors.neutral.canvas,
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
    right: spacing.md,
    top: '34%',
    zIndex: 20,
  },
  idlePanelFadeSvg: {
    pointerEvents: 'none',
  },
  idlePanel: {
    bottom: 0,
    left: 0,
    paddingBottom: spacing.lg,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
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
    paddingHorizontal: spacing.md,
    paddingTop: spacing.xs,
  },
  sheetSectionGap: {
    gap: spacing.sm,
  },
  sheetHeader: {
    marginBottom: spacing.xxs,
  },
  sheetTitle: {
    ...typeScale.headline,
    color: leopardPalette.primary,
  },
  sheetSubtitle: {
    ...typeScale.caption1,
    color: colors.neutral.mutedText,
    marginTop: spacing.hairline,
  },
  boundaryBox: {
    paddingVertical: spacing.sm,
  },
  debugBtn: {
    alignItems: 'center',
    backgroundColor: colors.neutral.canvas,
    borderColor: leopardPalette.inputBorder,
    borderRadius: radius.cardSm,
    ...iosContinuousCurve,
    borderWidth: 1,
    marginTop: spacing.xs,
    minHeight: 36,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  debugBtnPressed: {
    opacity: 0.85,
  },
  debugBtnText: {
    ...typeScale.caption2,
    color: leopardPalette.primary,
    fontWeight: '600',
  },
  srOnly: {
    height: 1,
    opacity: 0,
    position: 'absolute',
    width: 1,
  },
});
