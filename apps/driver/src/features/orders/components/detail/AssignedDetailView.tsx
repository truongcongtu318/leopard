import React, { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Line, Path, Polygon } from 'react-native-svg';
import {
  Button,
  IconCamera,
  IconCheck,
  IconTxPayment,
  iosContinuousCurve,
  leopardPalette,
  radius,
  spacing,
  typeScale,
} from '@leopard/mobile-core';
import type { DriverAssignedDetailView } from '../../model';
import { formatVndPrice } from '../../adapter';
import { getDriverCurrentLocation } from '../../driver-current-location';
import { postMapMessageToFrames } from '@leopard/mobile-core';
import { MissionMapCanvas } from './MissionMapCanvas';
import { VerticalRouteStepper } from './VerticalRouteStepper';
import { EpodPanel } from './EpodPanel';
import { CompletionSummaryCard } from './CompletionSummaryCard';
import { DriverMissionBackButton } from './DriverMissionBackButton';
import { DriverMissionActionBar } from './DriverMissionActionBar';
import { DriverMissionExtras } from './DriverMissionExtras';

export type AssignedDetailViewProps = Readonly<{
  view: DriverAssignedDetailView;
  taskButtonComponent?: React.ReactNode;
  onBack?: () => void;
  onExecuteTask?: (commandId: string) => void;
  onSelectProof?: () => void;
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
  onSelectProof,
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
  const [preloadingPhotoCaptured, setPreloadingPhotoCaptured] = useState(false);
  const [driverLocation, setDriverLocation] = useState<{ lat: number; lng: number } | undefined>(undefined);
  const [isMapOffCenter, setIsMapOffCenter] = useState(false);
  const [navMode, setNavMode] = useState<'overview' | 'turn-by-turn'>('overview');

  const isPickupLeg = view.order.status === 'ACCEPTED' || view.order.status === 'PICKING_UP';
  const isReturning = view.order.status === 'RETURNING';
  const isTerminal = view.order.status === 'DELIVERED' || view.order.status === 'RETURNED';

  React.useEffect(() => {
    let isMounted = true;
    void getDriverCurrentLocation().then((loc) => {
      if (isMounted && loc.kind === 'ready') {
        setDriverLocation(loc.coords);
      }
    });
    return () => {
      isMounted = false;
    };
  }, []);

  const effectiveTruckLocation = React.useMemo(() => {
    if (driverLocation && driverLocation.lat > 20 && driverLocation.lat < 22) {
      return driverLocation;
    }
    // Default near Hanoi origin for driver Tran Minh Quan
    return { lat: 21.0280, lng: 105.8345 };
  }, [driverLocation]);

  const handleRecenterDriverLocation = () => {
    setIsMapOffCenter(false);
    postMapMessageToFrames({ type: 'LEOPARD_MAP_SET_VIEW_MODE', mode: 'driving' });
  };

  const handleToggleNavigationMode = () => {
    const nextMode = navMode === 'overview' ? 'turn-by-turn' : 'overview';
    setNavMode(nextMode);
    postMapMessageToFrames({
      type: 'LEOPARD_MAP_SET_VIEW_MODE',
      mode: nextMode === 'overview' ? 'overview' : 'driving',
    });
  };

  const activeNavigationTarget = React.useMemo(() => {
    if (isReturning || isPickupLeg) {
      return view.order.route.origin;
    }
    return view.order.route.destination;
  }, [isReturning, isPickupLeg, view.order.route.origin, view.order.route.destination]);

  const mapOrigin = React.useMemo(() => {
    // Luôn ưu tiên vị trí xe hợp lệ trong khu vực của chuyến đi
    if (effectiveTruckLocation) {
      return { label: 'Vị trí của bạn', coords: effectiveTruckLocation };
    }
    return {
      label: view.order.route.origin.label,
      coords:
        view.order.route.origin.lat != null && view.order.route.origin.lng != null
          ? { lat: view.order.route.origin.lat, lng: view.order.route.origin.lng }
          : undefined,
    };
  }, [effectiveTruckLocation, view.order.route.origin]);

  const mapDestination = React.useMemo(() => {
    // Trong giai đoạn đi lấy hàng (ACCEPTED, PICKING_UP), đích đến của bản đồ là ĐIỂM LẤY HÀNG
    if (isPickupLeg) {
      return {
        label: view.order.route.origin.label,
        coords:
          view.order.route.origin.lat != null && view.order.route.origin.lng != null
            ? { lat: view.order.route.origin.lat, lng: view.order.route.origin.lng }
            : undefined,
      };
    }
    return {
      label: view.order.route.destination.label,
      coords:
        view.order.route.destination.lat != null && view.order.route.destination.lng != null
          ? { lat: view.order.route.destination.lat, lng: view.order.route.destination.lng }
          : undefined,
    };
  }, [isPickupLeg, view.order.route.origin, view.order.route.destination]);

  const isMissionActive =
    !isTerminal &&
    view.order.status !== 'CANCELLED' &&
    view.order.status !== 'INCIDENT_CANCELLED';
  const isCashOrder = view.order.paymentMethod === 'CASH';
  const isCashConfirmed = Boolean(
    view.order.isCashConfirmed || view.order.paymentStatus === 'PAID_MANUAL',
  );

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
        navigationTarget={activeNavigationTarget}
        origin={mapOrigin}
        originLabel={mapOrigin.label}
        routeCoords={view.order.route.routeCoords}
        routeSegments={view.order.route.routeSegments}
        stops={isPickupLeg ? [] : view.order.route.stops}
        tracking={view.tracking}
        truckLocation={effectiveTruckLocation}
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
          ) : (
            /* Active Target Destination Card (Clean Apple HIG - Glanceable while driving) */
            <View style={styles.activeLegGlanceCard} testID="active-leg-glance-card">
              <View style={styles.activeLegBadgeRow}>
                <View style={styles.activeLegPill}>
                  <Text style={styles.activeLegPillText}>
                    {isPickupLeg ? 'ĐIỂM LẤY HÀNG (A)' : 'ĐIỂM GIAO HÀNG (B)'}
                  </Text>
                </View>
                {view.order.route.distanceLabel ? (
                  <Text style={styles.activeLegDistanceText}>
                    {view.order.route.distanceLabel}
                  </Text>
                ) : null}
              </View>

              <Text numberOfLines={2} style={styles.activeLegAddressText}>
                {isPickupLeg
                  ? view.order.route.origin.label
                  : view.order.route.destination.label}
              </Text>

              {/* Stage 2 (PICKING_UP): Tích hợp gọn gàng kiểm hàng ngay trong thẻ điểm đến, KHÔNG tạo card riêng che map */}
              {view.order.status === 'PICKING_UP' ? (
                <View style={styles.inlineCargoChecklist} testID="cargo-specs-checklist">
                  <View style={styles.inlineCargoInfoRow}>
                    <View style={styles.inlineCargoSummaryCol}>
                      <Text numberOfLines={1} style={styles.inlineCargoText}>
                        {view.order.cargoSummary || 'Hàng hóa tiêu chuẩn'}
                      </Text>
                      {view.order.cargoWeightKg ? (
                        <Text style={styles.inlineCargoWeightText}>{view.order.cargoWeightKg} kg</Text>
                      ) : null}
                    </View>
                    <View style={styles.inlineCargoFeeCol}>
                      <Text style={styles.inlineCargoFeeLabel}>Phí bốc xếp:</Text>
                      <Text style={styles.inlineCargoBold}> Miễn phí tiêu chuẩn</Text>
                    </View>
                  </View>

                  <Pressable
                    accessibilityHint="Chụp ảnh hàng hóa trước khi bốc lên xe để làm bằng chứng tránh khiếu nại"
                    accessibilityLabel="Chụp ảnh hàng trước khi bốc"
                    accessibilityRole="button"
                    onPress={() => {
                      setPreloadingPhotoCaptured(true);
                      if (onOpenPickupProof) {
                        onOpenPickupProof();
                      } else if (onSelectProof) {
                        onSelectProof();
                      }
                    }}
                    style={({ pressed }) => [
                      styles.inlineCaptureBtn,
                      preloadingPhotoCaptured ? styles.inlineCaptureBtnDone : null,
                      pressed ? styles.btnPressed : null,
                    ]}
                    testID="btn-preloading-cargo-photo"
                  >
                    {preloadingPhotoCaptured ? (
                      <View style={styles.inlineCaptureInnerRow}>
                        <IconCheck color="#15803D" size={16} strokeWidth={2.5} />
                        <Text style={styles.inlineCaptureDoneText}>
                          Đã chụp ảnh kiểm hàng (tránh khiếu nại)
                        </Text>
                      </View>
                    ) : (
                      <View style={styles.inlineCaptureInnerRow}>
                        <IconCamera color="#0B2545" size={16} />
                        <Text style={styles.inlineCapturePromptText}>
                          + Chụp ảnh kiểm hàng tại điểm lấy
                        </Text>
                      </View>
                    )}
                  </Pressable>
                </View>
              ) : view.order.cargoSummary ? (
                <View style={styles.activeLegCargoRow}>
                  <Text numberOfLines={1} style={styles.activeLegCargoText}>
                    📦 {view.order.cargoSummary}
                    {view.order.cargoWeightKg ? ` (${view.order.cargoWeightKg} kg)` : ''}
                  </Text>
                </View>
              ) : null}
            </View>
          )}

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

          {view.order.status === 'DELIVERED' && (
            <EpodPanel
              isCashConfirmed={isCashConfirmed}
              onExecuteTask={onExecuteTask}
              onRetryProof={onRetryProof}
              onSelectProof={onSelectProof}
              orderId={view.order.id}
              paymentMethod={view.order.paymentMethod}
              paymentStatus={view.order.paymentStatus}
              priceLabel={view.order.priceLabel || (view.order.priceVnd ? formatVndPrice(view.order.priceVnd) : undefined)}
              proof={view.proof}
              status={view.order.status}
            />
          )}

          {view.order.status === 'IN_TRANSIT' && (
            <View style={styles.srOnly}>
              <EpodPanel
                isCashConfirmed={isCashConfirmed}
                onExecuteTask={onExecuteTask}
                onRetryProof={onRetryProof}
                onSelectProof={onSelectProof}
                orderId={view.order.id}
                paymentMethod={view.order.paymentMethod}
                paymentStatus={view.order.paymentStatus}
                priceLabel={view.order.priceLabel || (view.order.priceVnd ? formatVndPrice(view.order.priceVnd) : undefined)}
                proof={view.proof}
                status={view.order.status}
              />
            </View>
          )}

          {view.tracking.kind === 'permission-denied' ? (
            <View style={styles.permissionAlertBox}>
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
  activeLegGlanceCard: {
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
    gap: 4,
  },
  activeLegBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 2,
  },
  activeLegPill: {
    backgroundColor: '#FFFBEB',
    borderColor: '#FDE68A',
    borderWidth: 1,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.xs,
    paddingVertical: 2,
  },
  activeLegPillText: {
    color: '#D97706',
    ...typeScale.caption2,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  activeLegDistanceText: {
    color: leopardPalette.primary,
    ...typeScale.footnote,
    fontWeight: '700',
  },
  activeLegAddressText: {
    color: '#0F172A',
    ...typeScale.headline,
    fontWeight: '700',
  },
  activeLegCargoRow: {
    marginTop: 2,
  },
  activeLegCargoText: {
    color: '#64748B',
    ...typeScale.footnote,
  },
  inlineCargoChecklist: {
    marginTop: spacing.xs,
    paddingTop: spacing.xs,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    gap: 6,
  },
  inlineCargoInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  inlineCargoSummaryCol: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flex: 1,
  },
  inlineCargoText: {
    ...typeScale.footnote,
    color: '#0F172A',
    fontWeight: '600',
  },
  inlineCargoWeightText: {
    ...typeScale.footnote,
    color: '#64748B',
    fontWeight: '500',
  },
  inlineCargoFeeCol: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  inlineCargoFeeLabel: {
    ...typeScale.caption1,
    color: '#64748B',
  },
  inlineCargoBold: {
    fontWeight: '700',
    color: '#0B2545',
  },
  inlineCaptureBtn: {
    height: 38,
    borderRadius: radius.control,
    backgroundColor: '#FFFBEB',
    borderWidth: 1,
    borderColor: '#FDE68A',
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.sm,
    ...iosContinuousCurve,
  },
  inlineCaptureBtnDone: {
    backgroundColor: '#F0FDF4',
    borderColor: '#BBF7D0',
    borderStyle: 'solid',
  },
  inlineCaptureInnerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  inlineCapturePromptText: {
    ...typeScale.footnote,
    color: '#0B2545',
    fontWeight: '600',
  },
  inlineCaptureDoneText: {
    ...typeScale.footnote,
    color: '#15803D',
    fontWeight: '600',
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
