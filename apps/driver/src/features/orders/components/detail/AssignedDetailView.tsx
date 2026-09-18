import React, { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Line, Path, Polygon } from 'react-native-svg';
import {
  Button,
  IconCamera,
  IconCheck,
  IconTxPayment,
  colors,
  iosContinuousCurve,
  leopardPalette,
  radius,
  spacing,
  typeScale,
} from '@leopard/mobile-core';
import type { DriverAssignedDetailView } from '../../model';
import { formatVndPrice } from '../../adapter';
import { useLiveTruckLocation } from '../../use-live-truck-location';
import { postMapMessageToFrames } from '@leopard/mobile-core';
import { MissionMapCanvas } from './MissionMapCanvas';
import { VerticalRouteStepper } from './VerticalRouteStepper';
import { CompletionSummaryCard } from './CompletionSummaryCard';
import { DriverMissionBackButton } from './DriverMissionBackButton';
import { DriverMissionActionBar } from './DriverMissionActionBar';
import { DriverMissionExtras } from './DriverMissionExtras';

export type AssignedDetailViewProps = Readonly<{
  view: DriverAssignedDetailView;
  taskButtonComponent?: React.ReactNode;
  onBack?: () => void;
  onExecuteTask?: (commandId: string) => void;
  onOpenPickupProof?: () => void;
  onOpenDeliveryProof?: () => void;
  onRetryProof?: (commandId: string) => void;
  onOpenIncidentModal?: () => void;
  onOpenLocationSettings?: () => void;
  onConfirmCashPayment?: () => void;
  isConfirmingCash?: boolean;
  onRecordStopProgress?: (
    stopId: string,
    step: 'ARRIVED' | 'SERVICE_STARTED' | 'SERVICE_COMPLETED',
  ) => void | Promise<void>;
  inFlightStopCommand?: { stopId: string; step: string } | null;
}>;

export function AssignedDetailView({
  view,
  taskButtonComponent,
  onBack,
  onExecuteTask,
  onOpenPickupProof,
  onOpenDeliveryProof,
  onRetryProof,
  onOpenIncidentModal,
  onOpenLocationSettings,
  onConfirmCashPayment,
  isConfirmingCash,
  onRecordStopProgress,
  inFlightStopCommand,
}: AssignedDetailViewProps) {
  const [isMapOffCenter, setIsMapOffCenter] = useState(false);
  const [navMode, setNavMode] = useState<'overview' | 'turn-by-turn'>('overview');

  const isPickupLeg = view.order.status === 'ACCEPTED' || view.order.status === 'PICKING_UP';
  const isReturning = view.order.status === 'RETURNING';
  const isTerminal = view.order.status === 'DELIVERED' || view.order.status === 'RETURNED';

  // Live GPS feed. The marker is only drawn when a real fix exists — a missing
  // fix must never be replaced by an invented coordinate, or the map would show
  // the truck somewhere it has never been.
  const { coords: truckLocation, heading: truckHeading } = useLiveTruckLocation(!isTerminal);

  // The map frame builds its truck marker from the initial HTML, so a moving
  // vehicle only follows if each new fix is pushed into the frame. Without this
  // the marker stayed frozen at the position captured when the map mounted.
  React.useEffect(() => {
    if (!truckLocation || isTerminal) return;
    postMapMessageToFrames({
      type: 'LEOPARD_UPDATE_TRUCK_LOCATION',
      lat: truckLocation.lat,
      lng: truckLocation.lng,
      eta: view.order.route.distanceLabel ?? '',
    });
  }, [isTerminal, truckLocation, view.order.route.distanceLabel]);

  const handleRecenterDriverLocation = () => {
    setIsMapOffCenter(false);
    postMapMessageToFrames({ type: 'LEOPARD_MAP_RECENTER' });
  };

  const handleToggleNavigationMode = () => {
    const nextMode = navMode === 'overview' ? 'turn-by-turn' : 'overview';
    setNavMode(nextMode);
    postMapMessageToFrames({
      type: 'LEOPARD_MAP_SET_VIEW_MODE',
      mode: nextMode === 'overview' ? 'overview' : 'driving',
    });
  };

  /** Pickup point (A) — the fixed first stop of the order, never the vehicle. */
  const pickupPoint = React.useMemo(() => {
    const { origin } = view.order.route;
    return {
      // The action bar's external-navigation handoff reads flat lat/lng while
      // the map canvas reads `coords`, so both must stay populated.
      id: origin.id,
      label: origin.label,
      lat: origin.lat,
      lng: origin.lng,
      coords:
        origin.lat != null && origin.lng != null
          ? { lat: origin.lat, lng: origin.lng }
          : undefined,
    };
  }, [view.order.route.origin]);

  /** Delivery point (B) — the fixed final stop of the order. */
  const deliveryPoint = React.useMemo(() => {
    const { destination } = view.order.route;
    return {
      id: destination.id,
      label: destination.label,
      lat: destination.lat,
      lng: destination.lng,
      coords:
        destination.lat != null && destination.lng != null
          ? { lat: destination.lat, lng: destination.lng }
          : undefined,
    };
  }, [view.order.route.destination]);

  // Both endpoints stay on the map for the whole trip, so the driver always
  // sees where the cargo is coming from and where it is going.
  const mapOrigin = pickupPoint;
  const mapDestination = deliveryPoint;

  const activeNavigationTarget = React.useMemo(
    () => (isReturning || isPickupLeg ? pickupPoint : deliveryPoint),
    [deliveryPoint, isPickupLeg, isReturning, pickupPoint],
  );

  const isMissionActive =
    !isTerminal &&
    view.order.status !== 'CANCELLED' &&
    view.order.status !== 'INCIDENT_CANCELLED';
  const isCashOrder = view.order.paymentMethod === 'CASH';
  const isCashConfirmed = Boolean(
    view.order.isCashConfirmed || view.order.paymentStatus === 'PAID_MANUAL',
  );

  // ── Arrival geofence: switch from the driving cockpit to the on-site form
  // automatically once the truck reaches the active stop. ──
  const legTitle = isTerminal
    ? 'HOÀN TẤT'
    : view.order.status === 'ACCEPTED' || view.order.status === 'PICKING_UP'
      ? 'ĐẾN ĐIỂM LẤY HÀNG'
      : view.order.status === 'IN_TRANSIT'
        ? 'ĐẾN ĐIỂM GIAO HÀNG'
        : view.order.status === 'RETURNING'
          ? 'HOÀN HÀNG VỀ ĐIỂM GỬI'
          : 'TIẾN ĐỘ CHUYẾN ĐI';

  return (
    <View style={styles.root} testID="assigned-detail-view">
      <MissionMapCanvas
        cargoSummary={view.order.cargoSummary}
        cargoWeightKg={view.order.cargoWeightKg}
        destination={mapDestination}
        destinationLabel={mapDestination.label}
        distanceLabel={view.order.route.distanceLabel}
        eta={view.order.route.eta}
        etaLabel={
          view.order.route.etaDurationSeconds > 0
            ? `${Math.round(view.order.route.etaDurationSeconds / 60)} phút`
            : undefined
        }
        fillContainer
        navMode={navMode}
        navigationTarget={activeNavigationTarget}
        origin={mapOrigin}
        originLabel={mapOrigin.label}
        routeCoords={view.order.route.routeCoords}
        routeSegments={view.order.route.routeSegments}
        stops={isPickupLeg ? [] : view.order.route.stops}
        tracking={view.tracking}
        truckHeading={truckHeading}
        truckLocation={truckLocation ?? undefined}
        vehicleType={view.order.vehicleType}
      />

      {isTerminal ? (
        <View style={styles.topOverlay} pointerEvents="box-none">
          <DriverMissionBackButton onBack={onBack} />
        </View>
      ) : null}

      {/* ── Cụm 2 nút nổi điều khiển bản đồ: Về vị trí & Overview/Turn-by-turn ── */}
      {!isTerminal ? (
        <View style={styles.floatingMapControls} pointerEvents="box-none" testID="driver-map-navigation-controls">
          {/* Nút 1: Về vị trí hiện tại (Crosshair / Target) */}
          <Pressable
            accessibilityHint="Đưa bản đồ về vị trí xe hiện tại của bạn"
            accessibilityLabel="Về vị trí hiện tại"
            accessibilityRole="button"
            onPress={handleRecenterDriverLocation}
            style={({ pressed }) => [
              styles.floatingMapBtn,
              isMapOffCenter ? styles.floatingMapBtnRecenterActive : null,
              pressed ? styles.btnPressed : null,
            ]}
            testID="btn-recenter-driver-location"
          >
            <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
              <Circle cx="12" cy="12" r="8" stroke={isMapOffCenter ? '#F59E0B' : '#0B2545'} strokeWidth="2" />
              <Circle cx="12" cy="12" r="3" fill={isMapOffCenter ? '#F59E0B' : '#0B2545'} />
              <Line x1="12" y1="1" x2="12" y2="4" stroke={isMapOffCenter ? '#F59E0B' : '#0B2545'} strokeWidth="2" strokeLinecap="round" />
              <Line x1="12" y1="20" x2="12" y2="23" stroke={isMapOffCenter ? '#F59E0B' : '#0B2545'} strokeWidth="2" strokeLinecap="round" />
              <Line x1="1" y1="12" x2="4" y2="12" stroke={isMapOffCenter ? '#F59E0B' : '#0B2545'} strokeWidth="2" strokeLinecap="round" />
              <Line x1="20" y1="12" x2="23" y2="12" stroke={isMapOffCenter ? '#F59E0B' : '#0B2545'} strokeWidth="2" strokeLinecap="round" />
            </Svg>
          </Pressable>

          {/* Nút 2: Chuyển chế độ Overview / Turn-by-turn */}
          <Pressable
            accessibilityHint="Chuyển đổi giữa chế độ xem toàn cảnh lộ trình và dẫn đường chi tiết theo xe"
            accessibilityLabel="Chuyển chế độ Overview và Turn by turn"
            accessibilityRole="button"
            onPress={handleToggleNavigationMode}
            style={({ pressed }) => [
              styles.floatingMapBtn,
              navMode === 'turn-by-turn' ? styles.floatingMapBtnNavActive : null,
              pressed ? styles.btnPressed : null,
            ]}
            testID="btn-toggle-navigation-mode"
          >
            {navMode === 'overview' ? (
              <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
                <Circle cx="12" cy="12" r="9" stroke="#0B2545" strokeWidth="2" />
                <Polygon points="12,6 15,12 12,18 9,12" fill="#0B2545" />
                <Polygon points="12,6 15,12 12,12" fill="#F59E0B" />
              </Svg>
            ) : (
              <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
                <Path d="M9 18L3 15V3L9 6M9 18L15 21M9 18V6M15 21L21 18V6L15 9M15 21V9M9 6L15 9" stroke="#0B2545" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </Svg>
            )}
          </Pressable>
        </View>
      ) : null}

      <View style={styles.bottomStack} pointerEvents="box-none">
        <ScrollView
          contentContainerStyle={styles.sheetContent}
          showsVerticalScrollIndicator={false}
          style={styles.sheet}
        >
          {view.notice ? (
            <View style={styles.notice}>
              <Text accessibilityLiveRegion="polite" style={styles.warningText}>
                {view.notice}
              </Text>
            </View>
          ) : null}

          {isTerminal ? (
            <>
              <CompletionSummaryCard
                deliveredAtLabel={view.order.updatedAtLabel}
                priceLabel={view.order.priceLabel}
                reference={view.order.reference}
                status={view.order.status}
              />
              <VerticalRouteStepper
                destination={view.order.route.destination}
                destinationLabel={view.order.route.destination.label}
                distanceLabel={view.order.route.distanceLabel}
                inFlightCommand={inFlightStopCommand}
                onRecordProgress={onRecordStopProgress}
                origin={view.order.route.origin}
                originLabel={view.order.route.origin.label}
                status={view.order.status}
                stops={view.order.route.stops}
              />
            </>
          ) : null}
          {/* The active-leg card (address, cargo, loading fee) is gone: the
              address already lives on the map HUD and cargo moved to the map
              header, so the sheet no longer repeats it. */}

          {/* Thu tiền mặt (Cash on Delivery) khi đơn thanh toán CASH chuẩn Apple HIG */}
          {isCashOrder && (view.order.status === 'IN_TRANSIT' || isTerminal) && (
            <View style={styles.appleActionSurfaceCard} testID="cash-collection-container">
              <View style={styles.appleCardHeaderRow}>
                <View style={[styles.appleIconBadgeAmber, isCashConfirmed ? styles.appleIconBadgeSuccess : null]}>
                  {isCashConfirmed ? (
                    <IconCheck color="#15803D" size={20} strokeWidth={2.5} />
                  ) : (
                    <IconTxPayment color="#D97706" size={20} />
                  )}
                </View>
                <View style={styles.appleCardHeaderTextCol}>
                  <Text style={styles.appleCardTitle}>Thu tiền mặt (COD)</Text>
                  <Text style={styles.appleCardSubtitle}>
                    {isCashConfirmed ? 'Đã thu đủ tiền mặt' : 'Thu tiền mặt khi bàn giao'}
                  </Text>
                </View>
                <View style={[styles.appleBadgePending, isCashConfirmed ? styles.appleBadgeSuccess : null]}>
                  <Text style={[styles.appleBadgePendingText, isCashConfirmed ? styles.appleBadgeSuccessText : null]}>
                    {isCashConfirmed ? 'Đã thu COD' : 'Chưa thu COD'}
                  </Text>
                </View>
              </View>

              <View style={styles.appleCashAmountBox}>
                <Text style={styles.appleCashLabel}>Số tiền cước cần thu</Text>
                <Text style={styles.appleCashHero} testID="cash-amount-to-collect">
                  {view.order.priceLabel ?? (view.order.priceVnd ? formatVndPrice(view.order.priceVnd) : 'Đang cập nhật')}
                </Text>
              </View>

              {isCashConfirmed ? (
                <View style={styles.appleSuccessBanner} testID="cash-confirmed-notice">
                  <IconCheck color="#15803D" size={16} strokeWidth={2.5} />
                  <Text style={styles.appleSuccessBannerText}>
                    Đã xác nhận thu đủ tiền mặt từ người nhận.
                  </Text>
                </View>
              ) : onConfirmCashPayment ? (
                <Pressable
                  accessibilityRole="button"
                  disabled={isConfirmingCash}
                  onPress={onConfirmCashPayment}
                  style={({ pressed }) => [
                    styles.appleCodCtaBtn,
                    pressed ? styles.btnPressed : null,
                  ]}
                  testID="btn-confirm-cash"
                >
                  <Text style={styles.appleCodCtaBtnText}>
                    {isConfirmingCash ? 'Đang ghi nhận...' : '⚡ XÁC NHẬN ĐÃ THU TIỀN MẶT'}
                  </Text>
                </Pressable>
              ) : null}
            </View>
          )}

          {view.tracking.kind === 'permission-denied' ? (            <View style={styles.permissionAlertBox}>
              <Text accessibilityRole="alert" style={styles.permissionAlertTitle}>Quyền vị trí bị từ chối</Text>
              <Text style={styles.permissionAlertMessage}>
                Ứng dụng cần quyền vị trí để tiếp tục cập nhật lộ trình di chuyển của xe.
              </Text>
              <Button label="Mở cài đặt vị trí" onPress={onOpenLocationSettings} variant="secondary" />
            </View>
          ) : null}

          {/* Extras drawer hidden from active driving cockpit per Apple HIG simplicity */}
          {!isTerminal ? (
            <View style={styles.srOnly}>
              <DriverMissionExtras
                cargoSummary={view.order.cargoSummary}
                cargoWeightKg={view.order.cargoWeightKg}
                contactRoleLabel={view.order.contactRoleLabel}
                customerContact={view.order.customerContact}
                history={view.order.history}
                status={view.order.status}
                vehicleLabel={view.order.vehicleLabel}
              />
            </View>
          ) : null}
        </ScrollView>

        <DriverMissionActionBar
          customerContact={view.order.customerContact}
          isMissionActive={isMissionActive}
          isTerminal={isTerminal}
          legTitle={legTitle}
          navigationTarget={activeNavigationTarget}
          onBack={onBack}
          onOpenIncidentModal={onOpenIncidentModal}
          taskButtonComponent={
            !isTerminal && taskButtonComponent ? taskButtonComponent : undefined
          }
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  topOverlay: {
    left: spacing.md,
    position: 'absolute',
    top: spacing.xl,
  },
  bottomStack: {
    bottom: 0,
    left: 0,
    position: 'absolute',
    right: 0,
    gap: spacing.xs,
  },
  floatingMapControls: {
    position: 'absolute',
    right: 16,
    bottom: 295,
    flexDirection: 'column',
    gap: 10,
    zIndex: 999,
  },
  floatingMapBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#0B2545',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 5,
    elevation: 3,
  },
  floatingMapBtnRecenterActive: {
    borderColor: '#F59E0B',
    backgroundColor: '#FFFBEB',
  },
  floatingMapBtnNavActive: {
    borderColor: '#0B2545',
    backgroundColor: '#F0F4FA',
  },
  btnPressed: {
    opacity: 0.8,
    transform: [{ scale: 0.96 }],
  },
  sheet: {
    maxHeight: '48%',
  },
  sheetContent: {
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.xs,
    paddingBottom: spacing.xs,
  },
  notice: {
    backgroundColor: '#FEF3C7',
    borderColor: '#FDE68A',
    borderRadius: 10,
    borderWidth: 1,
    padding: 10,
  },
  warningText: {
    ...typeScale.caption1,
    color: '#B45309',
    fontWeight: '600',
  },
  permissionAlertBox: {
    backgroundColor: '#FEF2F2',
    borderColor: '#FECACA',
    borderRadius: 12,
    borderWidth: 1,
    gap: 8,
    padding: 12,
  },
  permissionAlertTitle: {
    color: '#991B1B',
    ...typeScale.caption1,
    fontWeight: '600',
  },
  permissionAlertMessage: {
    ...typeScale.caption1,
    color: '#7F1D1D',
  },
  appleActionSurfaceCard: {
    backgroundColor: '#FFFFFF',
    borderColor: '#E2E8F0',
    borderRadius: radius.card,
    borderWidth: 1,
    padding: spacing.md,
    ...iosContinuousCurve,
    shadowColor: '#0B2545',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 5,
    elevation: 2,
    gap: spacing.sm,
  },
  appleCardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  appleIconBadgeAmber: {
    width: 36,
    height: 36,
    borderRadius: radius.pill,
    backgroundColor: '#FFFBEB',
    borderColor: '#FDE68A',
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  appleIconBadgeSuccess: {
    backgroundColor: '#E8F8EE',
    borderColor: '#86EFAC',
  },
  appleCardHeaderTextCol: {
    flex: 1,
  },
  appleCardTitle: {
    color: '#0F172A',
    ...typeScale.headline,
    fontWeight: '700',
  },
  appleCardSubtitle: {
    color: '#64748B',
    ...typeScale.footnote,
    marginTop: 2,
  },
  appleBadgeSuccess: {
    backgroundColor: '#E8F8EE',
    borderColor: '#86EFAC',
    borderWidth: 1,
    borderRadius: radius.pill,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  appleBadgeSuccessText: {
    color: '#15803D',
    ...typeScale.caption2,
    fontWeight: '700',
  },
  appleBadgePending: {
    backgroundColor: '#FFFBEB',
    borderColor: '#FDE68A',
    borderWidth: 1,
    borderRadius: radius.pill,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  appleBadgePendingText: {
    color: '#B45309',
    ...typeScale.caption2,
    fontWeight: '700',
  },
  appleCashAmountBox: {
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    padding: spacing.sm,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  appleCashLabel: {
    color: '#64748B',
    ...typeScale.caption1,
    fontWeight: '600',
  },
  appleCashHero: {
    fontSize: 28,
    fontWeight: '800',
    color: '#0B2545',
    fontVariant: ['tabular-nums'],
    marginTop: 2,
  },
  appleSuccessBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E8F8EE',
    borderRadius: 10,
    padding: spacing.xs,
    gap: 6,
  },
  appleSuccessBannerText: {
    color: '#15803D',
    ...typeScale.caption1,
    fontWeight: '600',
  },
  appleCodCtaBtn: {
    height: 50,
    borderRadius: 14,
    backgroundColor: '#0B2545',
    borderColor: '#F59E0B',
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    ...iosContinuousCurve,
    shadowColor: '#0B2545',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 5,
    elevation: 3,
  },
  appleCodCtaBtnText: {
    color: '#FBBF24',
    ...typeScale.subheadline,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  srOnly: {
    height: 1,
    opacity: 0.001,
    position: 'absolute',
    width: 1,
    overflow: 'hidden',
  },
});
