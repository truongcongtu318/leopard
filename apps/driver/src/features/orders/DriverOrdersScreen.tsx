import React, { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaInsetsContext } from 'react-native-safe-area-context';

import { GestureBottomSheet, RealInteractiveMap, ScreenState, SkeletonCard, resolveLocationCoords } from '@leopard/mobile-core';

import { IncomingDispatchModal } from './IncomingDispatchModal';
import type { IncomingDispatchOffer } from './IncomingDispatchModal';
import type { DriverListView } from './model';

import { DriverGlassTopbar } from './components/DriverGlassTopbar';
import { DriverConnectionCapsule } from './components/DriverConnectionCapsule';
import { DriverQuickActionGrid } from './components/DriverQuickActionGrid';
import { DriverEmptyBoard } from './components/DriverEmptyBoard';
import { DriverLocationStatus } from './components/DriverLocationStatus';
import { DriverReceivingSettingsModal } from './components/DriverReceivingSettingsModal';
import { DriverSystemBanner } from './components/DriverSystemBanner';
import { DriverActiveTripCard } from './components/DriverActiveTripCard';
import { DriverOrderFilters } from './components/DriverOrderFilters';
import { DriverNearbyOrderCard } from './components/DriverNearbyOrderCard';
import { DriverBottomNavigation } from './components/DriverBottomNavigation';
import { DriverNotice } from './components/DriverNotice';
import { useDriverIdlePingHealth } from './useDriverIdlePing';
import { getDriverCurrentLocation, type DriverLocationState } from './driver-current-location';

/**
 * Idle board snap points: collapsed map peek, working load board, expanded list.
 * Matches the Customer home sheet geometry so both apps feel like one product.
 */
const IDLE_SNAP_POINTS: number[] = [0.18, 0.52, 0.92];
/** Active trip keeps a taller collapsed position: the mission card must stay readable. */
const ACTIVE_TRIP_SNAP_POINTS: number[] = [0.32, 0.62, 0.92];

const DRIVER_GREETING = 'Chào bác tài';

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
  const insets = React.useContext(SafeAreaInsetsContext);
  const topInset = insets?.top ?? 0;

  const [dismissedOfferId, setDismissedOfferId] = useState<string | null>(null);
  const [simulatedOffer, setSimulatedOffer] = useState<IncomingDispatchOffer | null>(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [radiusKm, setRadiusKm] = useState('5');
  const [dismissedOrderIds, setDismissedOrderIds] = useState<readonly string[]>([]);
  const [locationRequestKey, setLocationRequestKey] = useState(0);
  const [driverLocation, setDriverLocation] = useState<DriverLocationState>({ kind: 'loading' });
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

  const pendingOfferCount = isContent
    ? view.requestedOrders.filter((item) => !dismissedOrderIds.includes(item.id)).length
    : 0;

  const filteredOrders = isContent
    ? view.requestedOrders.filter((item) => !dismissedOrderIds.includes(item.id))
    : [];

  const snapPoints = activeTrip ? ACTIVE_TRIP_SNAP_POINTS : IDLE_SNAP_POINTS;
  const initialSnapIndex = 1;

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

      {/* ── Layer 1: floating glass top bar + GPS pill ── */}
      <View style={[styles.topBarLayer, { top: Math.max(topInset, 12) }]}>
        <Text style={styles.srOnly}>Trạng thái nhận đơn</Text>
        <DriverGlassTopbar
          driverName={driverIdentity?.name}
          greeting={DRIVER_GREETING}
          onOpenNotifications={onNoticeAction ? () => onNoticeAction() : undefined}
          onOpenProfile={() => onNavigate?.('/profile')}
          pendingOfferCount={pendingOfferCount}
          vehiclePlate={driverIdentity?.vehiclePlate}
          vehicleType={driverIdentity?.vehicleType}
        />
        <DriverLocationStatus location={driverLocation} onRetry={retryCurrentLocation} />
      </View>

      {/* ── Layer 2: duty capsule floating over the map (single availability control) ── */}
      {isContent && !activeTrip ? (
        <View
          pointerEvents="box-none"
          style={[styles.capsuleLayer, { top: Math.max(topInset, 12) + 92 }]}
        >
          <DriverConnectionCapsule
            disabled={Boolean(view.availability.action?.disabled)}
            isOnline={isOnline}
            isPending={Boolean(view.availability.action?.isPending)}
            onToggle={handleToggleAvailability}
          />
        </View>
      ) : null}

      {/* ── Layer 3: gesture bottom sheet — mission cockpit or idle load board ── */}
      <GestureBottomSheet
        initialSnapIndex={initialSnapIndex}
        snapPoints={snapPoints}
        testID="driver-load-board-sheet"
      >
        <ScrollView
          contentContainerStyle={styles.sheetContent}
          nestedScrollEnabled
          showsVerticalScrollIndicator={false}
        >
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
              {activeTrip ? (
                <DriverActiveTripCard
                  onNavigate={onNavigate}
                  onOpenOrder={onOpenOrder}
                  trip={activeTrip}
                />
              ) : (
                <DriverQuickActionGrid
                  onOpenSettings={() => setIsSettingsOpen(true)}
                  onOpenTrips={() => onNavigate?.('/history')}
                  onOpenVehicle={() => onNavigate?.('/profile')}
                  onOpenWallet={() => onNavigate?.('/wallet')}
                />
              )}

              <DriverSystemBanner
                hasActiveTrip={Boolean(activeTrip)}
                idlePingHealth={idlePingHealth}
                isOnline={isOnline}
                networkError={networkError}
                onRetry={onRetry}
              />

              <DriverNotice onNoticeAction={onNoticeAction} view={view} />

              <DriverOrderFilters
                hasActiveTrip={Boolean(activeTrip)}
                onOpenSettings={() => setIsSettingsOpen(true)}
                onSimulateOffer={showDebugActions ? handleSimulateIncomingOffer : undefined}
                radiusKm={radiusKm}
                showDebugActions={showDebugActions}
                totalCount={filteredOrders.length}
                waitingCount={filteredOrders.length}
              />

              {filteredOrders.length > 0 ? (
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
              ) : activeTrip ? null : (
                <DriverEmptyBoard
                  isOnline={isOnline}
                  onExpandRadius={() => setIsSettingsOpen(true)}
                  onGoOnline={handleToggleAvailability}
                />
              )}
            </>
          ) : null}
        </ScrollView>
      </GestureBottomSheet>

      {/* ── Layer 4: docked 5-tab navigation (hidden during an active trip) ── */}
      {!activeTrip ? <DriverBottomNavigation activeTab="home" onNavigate={onNavigate} /> : null}

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
  topBarLayer: {
    left: 16,
    position: 'absolute',
    right: 16,
    zIndex: 20,
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
  ordersFeed: {
    gap: 12,
  },
  srOnly: {
    height: 1,
    opacity: 0,
    position: 'absolute',
    width: 1,
  },
});
