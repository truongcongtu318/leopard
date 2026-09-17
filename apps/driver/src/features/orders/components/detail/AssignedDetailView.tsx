import React, { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import {
  Button,
  IconCamera,
  IconCheck,
  IconTxPayment,
  colors,
  leopardPalette,
  spacing,
} from '@leopard/mobile-core';
import type { DriverAssignedDetailView, DriverPrimaryTaskView } from '../../model';
import { formatVndPrice } from '../../adapter';
import { MissionMapCanvas, openExternalNavigation } from './MissionMapCanvas';
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
  onRetryProof,
  onOpenIncidentModal,
  onOpenLocationSettings,
  onConfirmCashPayment,
  isConfirmingCash,
  onRecordStopProgress,
  inFlightStopCommand,
}: AssignedDetailViewProps) {
  const [preloadingPhotoCaptured, setPreloadingPhotoCaptured] = useState(false);
  const isPickupLeg = view.order.status === 'ACCEPTED' || view.order.status === 'PICKING_UP';
  const isReturning = view.order.status === 'RETURNING';
  const isTerminal = view.order.status === 'DELIVERED' || view.order.status === 'RETURNED';

  const activeNavigationTarget = React.useMemo(() => {
    if (isReturning || isPickupLeg) {
      return view.order.route.origin;
    }
    return view.order.route.destination;
  }, [isReturning, isPickupLeg, view.order.route.origin, view.order.route.destination]);

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
        ? 'VẬN CHUYỂN ĐẾN ĐIỂM GIAO'
        : view.order.status === 'RETURNING'
          ? 'HOÀN HÀNG VỀ ĐIỂM GỬI'
          : 'TIẾN ĐỘ CHUYẾN ĐI';

  return (
    <View style={styles.root} testID="assigned-detail-view">
      <MissionMapCanvas
        destination={{
          label: view.order.route.destination.label,
          coords:
            view.order.route.destination.lat != null && view.order.route.destination.lng != null
              ? { lat: view.order.route.destination.lat, lng: view.order.route.destination.lng }
              : undefined,
        }}
        destinationLabel={view.order.route.destination.label}
        distanceLabel={view.order.route.distanceLabel}
        eta={view.order.route.eta}
        etaLabel={
          view.order.route.etaDurationSeconds > 0
            ? `${Math.round(view.order.route.etaDurationSeconds / 60)} phút`
            : undefined
        }
        fillContainer
        navigationTarget={activeNavigationTarget}
        origin={{
          label: view.order.route.origin.label,
          coords:
            view.order.route.origin.lat != null && view.order.route.origin.lng != null
              ? { lat: view.order.route.origin.lat, lng: view.order.route.origin.lng }
              : undefined,
        }}
        originLabel={view.order.route.origin.label}
        routeCoords={view.order.route.routeCoords}
        routeSegments={view.order.route.routeSegments}
        stops={view.order.route.stops}
        tracking={view.tracking}
        vehicleType={view.order.vehicleType}
      />

      <View style={styles.topOverlay} pointerEvents="box-none">
        <DriverMissionBackButton onBack={onBack} />
      </View>

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
            <CompletionSummaryCard
              deliveredAtLabel={view.order.updatedAtLabel}
              priceLabel={view.order.priceLabel}
              reference={view.order.reference}
              status={view.order.status}
            />
          ) : null}

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

          {/* Stage 2 Checklist: Kiểm hàng & Bốc hàng */}
          {view.order.status === 'PICKING_UP' && (
            <View style={styles.pickingChecklistCard} testID="cargo-specs-checklist">
              <View style={styles.pickingChecklistHeader}>
                <View style={styles.pickingChecklistIconBadge}>
                  <IconCamera color={leopardPalette.primary} size={18} />
                </View>
                <View style={styles.pickingChecklistTitleCol}>
                  <Text style={styles.pickingChecklistTitle}>Kiểm hàng & bốc hàng</Text>
                  <Text style={styles.pickingChecklistSubtitle}>
                    Kiểm tra đúng quy cách trước khi bốc hàng lên xe
                  </Text>
                </View>
              </View>

              <View style={styles.checklistItemsCol}>
                <View style={styles.checklistItemRow}>
                  <IconCheck color="#16A34A" size={16} strokeWidth={2.5} />
                  <Text style={styles.checklistItemLabel}>Tên hàng hóa:</Text>
                  <Text style={styles.checklistItemValue}>{view.order.cargoSummary}</Text>
                </View>
                <View style={styles.checklistItemRow}>
                  <IconCheck color="#16A34A" size={16} strokeWidth={2.5} />
                  <Text style={styles.checklistItemLabel}>Khối lượng:</Text>
                  <Text style={styles.checklistItemValue}>
                    {view.order.cargoWeightKg ? `${view.order.cargoWeightKg} kg` : 'Theo tải trọng xe'}
                  </Text>
                </View>
                <View style={styles.checklistItemRow}>
                  <IconCheck color="#16A34A" size={16} strokeWidth={2.5} />
                  <Text style={styles.checklistItemLabel}>Phí bốc xếp:</Text>
                  <Text style={styles.checklistItemValue}>Miễn phí bốc xếp tiêu chuẩn</Text>
                </View>
              </View>

              <Pressable
                accessibilityHint="Chụp ảnh hàng hóa trước khi bốc lên xe để làm bằng chứng tránh khiếu nại"
                accessibilityLabel="Chụp ảnh hàng trước khi bốc"
                accessibilityRole="button"
                onPress={() => {
                  setPreloadingPhotoCaptured(true);
                  if (onSelectProof) onSelectProof();
                }}
                style={({ pressed }) => [
                  styles.preloadingCaptureBtn,
                  preloadingPhotoCaptured ? styles.preloadingCaptureBtnDone : null,
                  pressed ? styles.pressed : null,
                ]}
                testID="btn-preloading-cargo-photo"
              >
                {preloadingPhotoCaptured ? (
                  <View style={styles.preloadingCaptureInner}>
                    <IconCheck color="#16A34A" size={16} strokeWidth={2.5} />
                    <Text style={styles.preloadingCaptureTextDone}>
                      Đã chụp ảnh kiểm hàng trước khi bốc (tránh khiếu nại)
                    </Text>
                  </View>
                ) : (
                  <View style={styles.preloadingCaptureInner}>
                    <IconCamera color={leopardPalette.primary} size={16} />
                    <Text style={styles.preloadingCaptureText}>
                      Chụp ảnh hàng trước khi bốc (tránh khiếu nại)
                    </Text>
                  </View>
                )}
              </Pressable>
            </View>
          )}

          {/* Thu tiền mặt (Cash on Delivery) khi đơn thanh toán CASH */}
          {isCashOrder && (view.order.status === 'IN_TRANSIT' || isTerminal) && (
            <View style={styles.cashCardOuter} testID="cash-collection-container">
              <View style={styles.cashCardInner}>
                <View style={styles.cashHeaderRow}>
                  <View style={[styles.cashIconBadge, isCashConfirmed ? styles.cashIconBadgeSuccess : null]}>
                    {isCashConfirmed ? (
                      <IconCheck color="#10B981" size={18} strokeWidth={2.5} />
                    ) : (
                      <IconTxPayment color="#D97706" size={18} />
                    )}
                  </View>
                  <View style={styles.cashHeaderTextCol}>
                    <Text style={styles.cashSectionTitle}>Thu tiền mặt (COD)</Text>
                    <Text style={styles.cashSectionSubtitle}>
                      {isCashConfirmed ? 'Đã xác nhận thu tiền mặt từ khách' : 'Thu đúng cước tiền mặt khi bàn giao đơn hàng'}
                    </Text>
                  </View>
                  <View style={[styles.cashStatusPill, isCashConfirmed ? styles.cashStatusPillReady : styles.cashStatusPillPending]}>
                    <Text style={[styles.cashStatusPillText, isCashConfirmed ? styles.cashStatusPillTextReady : styles.cashStatusPillTextPending]}>
                      {isCashConfirmed ? 'Đã thu COD' : 'Chưa thu COD'}
                    </Text>
                  </View>
                </View>

                <View style={styles.cashAmountRow}>
                  <Text style={styles.cashAmountLabel}>Số tiền cước cần thu:</Text>
                  <Text style={styles.cashAmountValue} testID="cash-amount-to-collect">
                    {view.order.priceLabel ?? (view.order.priceVnd ? formatVndPrice(view.order.priceVnd) : 'Đang cập nhật')}
                  </Text>
                </View>

                {isCashConfirmed ? (
                  <View style={styles.cashSuccessNotice} testID="cash-confirmed-notice">
                    <IconCheck color="#15803D" size={16} strokeWidth={2.5} />
                    <Text style={styles.cashSuccessNoticeText}>
                      Đã xác nhận thu tiền mặt thành công. Hệ thống tự động xuất hóa đơn VAT điện tử.
                    </Text>
                  </View>
                ) : onConfirmCashPayment ? (
                  <View style={styles.cashActionWrap}>
                    <Button
                      disabled={isConfirmingCash}
                      isLoading={isConfirmingCash}
                      label="XÁC NHẬN ĐÃ THU TIỀN MẶT"
                      loadingLabel="Đang ghi nhận thu tiền..."
                      onPress={onConfirmCashPayment}
                      size="driver-primary"
                      testID="btn-confirm-cash"
                      variant="primary"
                    />
                    <Text style={styles.cashActionHint}>Bấm xác nhận sau khi đã nhận đủ tiền mặt từ khách</Text>
                  </View>
                ) : null}
              </View>
            </View>
          )}

          {(view.order.status === 'IN_TRANSIT' || view.order.status === 'DELIVERED') && (
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

          {view.tracking.kind === 'permission-denied' ? (
            <View style={styles.permissionAlertBox}>
              <Text accessibilityRole="alert" style={styles.permissionAlertTitle}>Quyền vị trí bị từ chối</Text>
              <Text style={styles.permissionAlertMessage}>
                Ứng dụng cần quyền vị trí để tiếp tục cập nhật lộ trình di chuyển của xe.
              </Text>
              <Button label="Mở cài đặt vị trí" onPress={onOpenLocationSettings} variant="secondary" />
            </View>
          ) : null}

          <DriverMissionExtras
            cargoSummary={view.order.cargoSummary}
            cargoWeightKg={view.order.cargoWeightKg}
            contactRoleLabel={view.order.contactRoleLabel}
            customerContact={view.order.customerContact}
            history={view.order.history}
            status={view.order.status}
            vehicleLabel={view.order.vehicleLabel}
          />
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
  },
  sheet: {
    maxHeight: '48%',
  },
  sheetContent: {
    gap: 12,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
  },
  notice: {
    backgroundColor: '#FEF3C7',
    borderColor: '#FDE68A',
    borderRadius: 10,
    borderWidth: 1,
    padding: 10,
  },
  warningText: {
    color: '#B45309',
    fontSize: 11.5,
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
    fontSize: 12.5,
    fontWeight: '800',
  },
  permissionAlertMessage: {
    color: '#7F1D1D',
    fontSize: 11.5,
    lineHeight: 16,
  },
  pickingChecklistCard: {
    backgroundColor: colors.neutral.surface,
    borderColor: colors.neutral.border,
    borderRadius: 14,
    borderWidth: 1,
    gap: 10,
    padding: 12,
  },
  pickingChecklistHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 10,
  },
  pickingChecklistIconBadge: {
    alignItems: 'center',
    backgroundColor: colors.neutral.canvas,
    borderRadius: 10,
    height: 36,
    justifyContent: 'center',
    width: 36,
  },
  pickingChecklistTitleCol: {
    flex: 1,
    gap: 2,
  },
  pickingChecklistTitle: {
    color: colors.neutral.text,
    fontSize: 11.5,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  pickingChecklistSubtitle: {
    color: colors.neutral.subtleText,
    fontSize: 11,
  },
  checklistItemsCol: {
    gap: 6,
  },
  checklistItemRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 6,
  },
  checklistItemLabel: {
    color: colors.neutral.subtleText,
    fontSize: 12,
    fontWeight: '600',
  },
  checklistItemValue: {
    color: colors.neutral.text,
    flexShrink: 1,
    fontSize: 12,
    fontWeight: '700',
  },
  preloadingCaptureBtn: {
    backgroundColor: colors.neutral.canvas,
    borderColor: colors.neutral.border,
    borderRadius: 10,
    borderWidth: 1,
    padding: 10,
  },
  preloadingCaptureBtnDone: {
    backgroundColor: '#F0FDF4',
    borderColor: '#BBF7D0',
  },
  preloadingCaptureInner: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  preloadingCaptureText: {
    color: leopardPalette.primary,
    flexShrink: 1,
    fontSize: 12,
    fontWeight: '700',
  },
  preloadingCaptureTextDone: {
    color: '#15803D',
    flexShrink: 1,
    fontSize: 12,
    fontWeight: '700',
  },
  cashCardOuter: {
    borderRadius: 14,
    overflow: 'hidden',
  },
  cashCardInner: {
    backgroundColor: colors.neutral.surface,
    borderColor: colors.neutral.border,
    borderRadius: 14,
    borderWidth: 1,
    gap: 10,
    padding: 12,
  },
  cashHeaderRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 10,
  },
  cashIconBadge: {
    alignItems: 'center',
    backgroundColor: '#FFFBEB',
    borderRadius: 10,
    height: 36,
    justifyContent: 'center',
    width: 36,
  },
  cashIconBadgeSuccess: {
    backgroundColor: '#F0FDF4',
  },
  cashHeaderTextCol: {
    flex: 1,
    gap: 2,
  },
  cashSectionTitle: {
    color: colors.neutral.text,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  cashSectionSubtitle: {
    color: colors.neutral.subtleText,
    fontSize: 10.5,
  },
  cashStatusPill: {
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  cashStatusPillReady: {
    backgroundColor: '#F0FDF4',
  },
  cashStatusPillPending: {
    backgroundColor: '#FFFBEB',
  },
  cashStatusPillText: {
    fontSize: 9.5,
    fontWeight: '800',
  },
  cashStatusPillTextReady: {
    color: '#15803D',
  },
  cashStatusPillTextPending: {
    color: '#B45309',
  },
  cashAmountRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  cashAmountLabel: {
    color: colors.neutral.subtleText,
    fontSize: 12,
    fontWeight: '600',
  },
  cashAmountValue: {
    color: colors.neutral.text,
    fontSize: 16,
    fontWeight: '800',
  },
  cashSuccessNotice: {
    alignItems: 'center',
    backgroundColor: '#F0FDF4',
    borderRadius: 10,
    flexDirection: 'row',
    gap: 8,
    padding: 10,
  },
  cashSuccessNoticeText: {
    color: '#15803D',
    flexShrink: 1,
    fontSize: 11,
    fontWeight: '600',
  },
  cashActionWrap: {
    gap: 6,
  },
  cashActionHint: {
    color: colors.neutral.subtleText,
    fontSize: 10.5,
    textAlign: 'center',
  },
  pressed: {
    opacity: 0.8,
  },
});
