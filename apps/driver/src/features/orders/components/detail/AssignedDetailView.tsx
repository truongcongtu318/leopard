import React, { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import {
  Button,
  IconCamera,
  IconCheck,
  IconClock,
  IconOrders,
  IconPhone,
  IconRoute,
  IconShieldAlert,
  IconTxPayment,
  ScreenScaffold,
  StatusBadge,
  StatusTimeline,
  colors,
  leopardPalette,
  radius,
  spacing,
} from '@leopard/mobile-core';
import type { DriverAssignedDetailView, DriverPrimaryTaskView } from '../../model';
import { formatVndPrice } from '../../adapter';
import { MissionMapCanvas, openExternalNavigation } from './MissionMapCanvas';
import { MissionStepper } from './MissionStepper';
import { VerticalRouteStepper } from './VerticalRouteStepper';
import { CargoAndContactCard, callPhoneNumber } from './CargoAndContactCard';
import { EpodPanel } from './EpodPanel';
import { CompletionSummaryCard } from './CompletionSummaryCard';

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
  const [isTimelineOpen, setIsTimelineOpen] = useState(false);
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

  return (
    <ScreenScaffold
      headerTone="plain"
      onBack={onBack}
      stickyFooter={
        <View style={styles.stickyActionRow}>
          {!isTerminal && (
            <>
              <Pressable
                accessibilityHint="Gọi điện thoại trực tiếp cho người nhận hoặc thủ kho"
                accessibilityLabel="Gọi cho người nhận"
                accessibilityRole="button"
                onPress={() => callPhoneNumber(view.order.customerContact)}
                style={({ pressed }) => [styles.stickyRoundBtn, pressed ? styles.pressed : null]}
              >
                <IconPhone color={leopardPalette.primary} size={20} />
              </Pressable>

              <Pressable
                accessibilityHint="Mở ứng dụng Google Maps để dẫn đường"
                accessibilityLabel="Mở Google Maps chỉ đường"
                accessibilityRole="button"
                onPress={() => openExternalNavigation(activeNavigationTarget)}
                style={({ pressed }) => [styles.stickyRoundBtn, pressed ? styles.pressed : null]}
                testID="btn-navigate-active-leg"
              >
                <IconRoute color={leopardPalette.primary} size={20} />
              </Pressable>

              {onOpenIncidentModal && isMissionActive ? (
                <Pressable
                  accessibilityHint="Báo cáo sự cố khẩn cấp cho chuyến đi"
                  accessibilityLabel="Báo sự cố"
                  accessibilityRole="button"
                  onPress={onOpenIncidentModal}
                  style={({ pressed }) => [
                    styles.stickyRoundBtn,
                    styles.stickyIncidentBtn,
                    pressed ? styles.pressed : null,
                  ]}
                  testID="btn-open-incident-modal"
                >
                  <IconShieldAlert color={colors.danger.text} size={20} />
                </Pressable>
              ) : null}
            </>
          )}

          <View style={styles.stickyPrimaryBtnWrap}>
            {!isTerminal && taskButtonComponent ? (
              taskButtonComponent
            ) : (
              <Button
                label="Về trang chủ"
                onPress={onBack}
                size="driver-primary"
                variant="primary"
                testID="btn-terminal-home"
              />
            )}
          </View>
        </View>
      }
      title={`Đơn ${view.order.reference}`}
    >
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* 1. Full Interactive Map Canvas at Top */}
        <MissionMapCanvas
          destination={{
            label: view.order.route.destination.label,
            coords:
              view.order.route.destination.lat != null &&
              view.order.route.destination.lng != null
                ? {
                    lat: view.order.route.destination.lat,
                    lng: view.order.route.destination.lng,
                  }
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
          navigationTarget={activeNavigationTarget}
          origin={{
            label: view.order.route.origin.label,
            coords:
              view.order.route.origin.lat != null &&
              view.order.route.origin.lng != null
                ? {
                    lat: view.order.route.origin.lat,
                    lng: view.order.route.origin.lng,
                  }
                : undefined,
          }}
          originLabel={view.order.route.origin.label}
          routeCoords={view.order.route.routeCoords}
          routeSegments={view.order.route.routeSegments}
          stops={view.order.route.stops}
          tracking={view.tracking}
          vehicleType={view.order.vehicleType}
        />

        {/* 2. Nội dung chi tiết: phẳng 1 tầng, không box lồng box */}
        <View style={styles.sheetContainer}>
          {isTerminal ? (
            /* ── Trạng thái đã hoàn tất: Chỉ hiển thị thẻ tóm tắt hoàn tất & tiền cước, ẩn các tiến trình thừa ── */
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

              <CargoAndContactCard
                cargoSummary={view.order.cargoSummary}
                cargoWeightKg={view.order.cargoWeightKg}
                contactRoleLabel={view.order.contactRoleLabel}
                customerContact={view.order.customerContact}
                vehicleLabel={view.order.vehicleLabel}
              />
            </>
          ) : (
            /* ── Trạng thái đang chạy: Hiển thị tiến trình & tác vụ chặng ── */
            <>
              <View style={styles.missionHeaderRow}>
                <View style={styles.missionTitleCol}>
                  <Text style={styles.missionEyebrow}>DRIVER · ACTIVE MISSION</Text>
                  <Text style={styles.missionLegTitle}>
                    {view.order.status === 'ACCEPTED' || view.order.status === 'PICKING_UP'
                      ? 'ĐẾN ĐIỂM LẤY HÀNG'
                      : view.order.status === 'IN_TRANSIT'
                        ? 'VẬN CHUYỂN ĐẾN ĐIỂM GIAO'
                        : view.order.status === 'RETURNING'
                          ? 'HOÀN HÀNG VỀ ĐIỂM GỬI'
                          : 'TIẾN ĐỘ CHUYẾN ĐI'}
                  </Text>
                  {onOpenIncidentModal && isMissionActive ? (
                    <Pressable
                      accessibilityHint="Báo cáo sự cố khẩn cấp để huỷ chuyến và giải phóng tài xế"
                      accessibilityLabel="Báo sự cố chuyến đi"
                      accessibilityRole="button"
                      onPress={onOpenIncidentModal}
                      style={({ pressed }) => [styles.incidentBannerBtn, pressed ? styles.pressed : null]}
                      testID="btn-report-incident"
                    >
                      <IconShieldAlert color={colors.danger.text} size={13} />
                      <Text style={styles.incidentBannerBtnText}>Báo sự cố chuyến đi</Text>
                    </Pressable>
                  ) : null}
                </View>
                <StatusBadge domain="order" status={view.order.status} />
              </View>

              <MissionStepper status={view.order.status} />

              {view.notice ? (
                <View style={styles.notice}>
                  <Text accessibilityLiveRegion="polite" style={styles.warningText}>
                    {view.notice}
                  </Text>
                </View>
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

              <CargoAndContactCard
                cargoSummary={view.order.cargoSummary}
                cargoWeightKg={view.order.cargoWeightKg}
                contactRoleLabel={view.order.contactRoleLabel}
                customerContact={view.order.customerContact}
                vehicleLabel={view.order.vehicleLabel}
              />
            </>
          )}

          {/* Stage 2 Checklist: Kiểm hàng & Bốc hàng */}
          {view.order.status === 'PICKING_UP' && (
            <View style={styles.pickingChecklistCard} testID="cargo-specs-checklist">
              <View style={styles.pickingChecklistHeader}>
                <View style={styles.pickingChecklistIconBadge}>
                  <IconOrders color={leopardPalette.primary} size={18} />
                </View>
                <View style={styles.pickingChecklistTitleCol}>
                  <Text style={styles.pickingChecklistTitle}>DANH SÁCH KIỂM HÀNG & BỐC HÀNG</Text>
                  <Text style={styles.pickingChecklistSubtitle}>
                    Kiểm tra đúng quy cách trước khi tài xế bốc hàng lên xe
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
                  <Text style={styles.checklistItemValue}>
                    Miễn phí bốc xếp tiêu chuẩn
                  </Text>
                </View>
              </View>

              <Pressable
                accessibilityHint="Chụp ảnh hàng hóa trước khi bốc lên xe để làm bằng chứng tránh khiếu nại"
                accessibilityLabel="Chụp ảnh hàng trước khi bốc"
                accessibilityRole="button"
                onPress={() => {
                  setPreloadingPhotoCaptured(true);
                  if (onSelectProof) {
                    onSelectProof();
                  }
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

          {/* 5. Thu tiền mặt (Cash on Delivery) khi đơn thanh toán CASH */}
          {isCashOrder && (view.order.status === 'IN_TRANSIT' || isTerminal) && (
            <View style={styles.cashCardOuter} testID="cash-collection-container">
              <View style={styles.cashCardInner}>
                <View style={styles.cashHeaderRow}>
                  <View
                    style={[
                      styles.cashIconBadge,
                      isCashConfirmed ? styles.cashIconBadgeSuccess : null,
                    ]}
                  >
                    {isCashConfirmed ? (
                      <IconCheck color="#10B981" size={18} strokeWidth={2.5} />
                    ) : (
                      <IconTxPayment color="#D97706" size={18} />
                    )}
                  </View>
                  <View style={styles.cashHeaderTextCol}>
                    <Text style={styles.cashSectionTitle}>THU TIỀN MẶT KHI GIAO HÀNG (CASH)</Text>
                    <Text style={styles.cashSectionSubtitle}>
                      {isCashConfirmed
                        ? 'Đã xác nhận thu tiền mặt từ khách'
                        : 'Thu đúng cước tiền mặt khi bàn giao đơn hàng'}
                    </Text>
                  </View>
                  <View
                    style={[
                      styles.cashStatusPill,
                      isCashConfirmed ? styles.cashStatusPillReady : styles.cashStatusPillPending,
                    ]}
                  >
                    <Text
                      style={[
                        styles.cashStatusPillText,
                        isCashConfirmed
                          ? styles.cashStatusPillTextReady
                          : styles.cashStatusPillTextPending,
                      ]}
                    >
                      {isCashConfirmed ? 'ĐÃ THU TIỀN MẶT' : 'CHƯA THU TIỀN'}
                    </Text>
                  </View>
                </View>

                <View style={styles.cashAmountRow}>
                  <Text style={styles.cashAmountLabel}>Số tiền cước cần thu:</Text>
                  <Text style={styles.cashAmountValue} testID="cash-amount-to-collect">
                    {view.order.priceLabel ??
                      (view.order.priceVnd ? formatVndPrice(view.order.priceVnd) : 'Đang cập nhật')}
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
                    <Text style={styles.cashActionHint}>
                      Bấm xác nhận sau khi đã nhận đủ tiền mặt từ khách
                    </Text>
                  </View>
                ) : null}
              </View>
            </View>
          )}

          {/* 6. Proof of Delivery / e-POD Panel */}
          {(view.order.status === 'IN_TRANSIT' || view.order.status === 'DELIVERED') && (
            <EpodPanel
              isCashConfirmed={isCashConfirmed}
              onExecuteTask={onExecuteTask}
              onRetryProof={onRetryProof}
              onSelectProof={onSelectProof}
              orderId={view.order.id}
              paymentMethod={view.order.paymentMethod}
              paymentStatus={view.order.paymentStatus}
              priceLabel={
                view.order.priceLabel ||
                (view.order.priceVnd ? formatVndPrice(view.order.priceVnd) : undefined)
              }
              proof={view.proof}
              status={view.order.status}
            />
          )}

          {/* 6. Permission Denied Recovery Block */}
          {view.tracking.kind === 'permission-denied' ? (
            <View style={styles.permissionAlertBox}>
              <Text accessibilityRole="alert" style={styles.permissionAlertTitle}>
                Quyền vị trí bị từ chối
              </Text>
              <Text style={styles.permissionAlertMessage}>
                Ứng dụng cần quyền vị trí để tiếp tục cập nhật lộ trình di chuyển của xe.
              </Text>
              <Button
                label="Mở cài đặt vị trí"
                onPress={onOpenLocationSettings}
                variant="secondary"
              />
            </View>
          ) : null}

          {/* 7. Collapsible Status Timeline (accordion) */}
          <View style={styles.timelineSection}>
            <Pressable
              accessibilityHint="Bấm để ẩn hoặc hiện nhật ký trạng thái chi tiết"
              accessibilityLabel={`Xem nhật ký trạng thái, ${view.order.history.length} mốc`}
              accessibilityRole="button"
              onPress={() => setIsTimelineOpen(!isTimelineOpen)}
              style={({ pressed }) => [styles.timelineToggleBtn, pressed ? styles.pressed : null]}
            >
              <View style={styles.timelineToggleLeft}>
                <IconClock color={leopardPalette.primary} size={15} />
                <Text style={styles.timelineToggleText}>
                  Nhật ký trạng thái ({view.order.history.length} mốc)
                </Text>
              </View>
              <Text style={styles.timelineToggleArrow}>{isTimelineOpen ? '▲' : '▼'}</Text>
            </Pressable>
            {isTimelineOpen ? (
              <View style={styles.timelineContentWrap}>
                <StatusTimeline entries={view.order.history} />
              </View>
            ) : null}
          </View>
        </View>
      </ScrollView>
    </ScreenScaffold>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    gap: 12,
    paddingBottom: 110,
    paddingTop: 8,
  },
  sheetContainer: {
    gap: 12,
  },
  missionHeaderRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  missionTitleCol: {
    flex: 1,
    gap: 2,
  },
  missionEyebrow: {
    color: colors.neutral.subtleText,
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
  missionLegTitle: {
    color: colors.neutral.text,
    fontSize: 16,
    fontWeight: '700',
  },
  incidentBannerBtn: {
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: '#FEE2E2',
    borderColor: '#FECACA',
    borderRadius: 6,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 5,
    marginTop: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  incidentBannerBtnText: {
    color: colors.danger.text,
    fontSize: 10.5,
    fontWeight: '700',
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
  timelineSection: {
    borderColor: colors.neutral.border,
    borderRadius: 12,
    borderWidth: 1,
    overflow: 'hidden',
  },
  timelineToggleBtn: {
    alignItems: 'center',
    backgroundColor: colors.neutral.canvas,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  timelineToggleLeft: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  timelineToggleText: {
    color: leopardPalette.primary,
    fontSize: 12,
    fontWeight: '700',
  },
  timelineToggleArrow: {
    color: colors.neutral.subtleText,
    fontSize: 11,
    fontWeight: '700',
  },
  timelineContentWrap: {
    backgroundColor: colors.neutral.surface,
    padding: 12,
  },

  /* Sticky Footer Actions */
  stickyActionRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 10,
    width: '100%',
  },
  stickyRoundBtn: {
    alignItems: 'center',
    backgroundColor: colors.neutral.surface,
    borderColor: colors.neutral.border,
    borderRadius: 24,
    borderWidth: 1,
    elevation: 2,
    height: 48,
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    width: 48,
  },
  stickyIncidentBtn: {
    backgroundColor: '#FEF2F2',
    borderColor: '#FECACA',
  },
  stickyPrimaryBtnWrap: {
    flex: 1,
  },
  completedTripBadge: {
    alignItems: 'center',
    backgroundColor: '#DCFCE7',
    borderColor: '#BBF7D0',
    borderRadius: 12,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 6,
    height: 48,
    justifyContent: 'center',
  },
  completedTripText: {
    color: '#15803D',
    fontSize: 13,
    fontWeight: '800',
  },
  pressed: {
    opacity: 0.75,
  },

  /* Cash on Delivery Card */
  cashCardOuter: {
    backgroundColor: colors.neutral.canvas,
    borderColor: colors.neutral.border,
    borderRadius: 20,
    borderWidth: 1,
    padding: 3,
  },
  cashCardInner: {
    backgroundColor: colors.neutral.surface,
    borderRadius: 17,
    gap: spacing.sm,
    padding: spacing.md,
  },
  cashHeaderRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 12,
  },
  cashIconBadge: {
    alignItems: 'center',
    backgroundColor: '#FEF3C7',
    borderRadius: 18,
    height: 36,
    justifyContent: 'center',
    width: 36,
  },
  cashIconBadgeSuccess: {
    backgroundColor: '#DCFCE7',
  },
  cashHeaderTextCol: {
    flex: 1,
  },
  cashSectionTitle: {
    color: leopardPalette.primary,
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  cashSectionSubtitle: {
    color: colors.neutral.subtleText,
    fontSize: 11,
    marginTop: 2,
  },
  cashStatusPill: {
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  cashStatusPillPending: {
    backgroundColor: '#FFFBEB',
    borderColor: '#FDE68A',
    borderWidth: 1,
  },
  cashStatusPillReady: {
    backgroundColor: '#ECFDF5',
    borderColor: '#A7F3D0',
    borderWidth: 1,
  },
  cashStatusPillText: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  cashStatusPillTextPending: {
    color: '#D97706',
  },
  cashStatusPillTextReady: {
    color: '#059669',
  },
  cashAmountRow: {
    alignItems: 'center',
    backgroundColor: colors.neutral.canvas,
    borderColor: colors.neutral.border,
    borderRadius: 12,
    borderWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  cashAmountLabel: {
    color: colors.neutral.mutedText,
    fontSize: 12,
    fontWeight: '600',
  },
  cashAmountValue: {
    color: leopardPalette.primary,
    fontSize: 18,
    fontWeight: '800',
    fontVariant: ['tabular-nums'],
  },
  cashSuccessNotice: {
    alignItems: 'center',
    backgroundColor: '#F0FDF4',
    borderColor: '#BBF7D0',
    borderRadius: 10,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 8,
    padding: spacing.sm,
  },
  cashSuccessNoticeText: {
    color: '#15803D',
    fontSize: 11.5,
    fontWeight: '600',
    flex: 1,
  },
  cashActionWrap: {
    gap: 6,
    marginTop: 4,
  },
  cashActionHint: {
    color: colors.neutral.subtleText,
    fontSize: 10.5,
    textAlign: 'center',
  },
  pickingChecklistCard: {
    backgroundColor: colors.neutral.surface,
    borderColor: colors.neutral.border,
    borderRadius: 16,
    borderWidth: 1,
    gap: spacing.sm + 2,
    padding: spacing.md,
  },
  pickingChecklistHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 10,
  },
  pickingChecklistIconBadge: {
    alignItems: 'center',
    backgroundColor: '#EEF2F6',
    borderRadius: 16,
    height: 32,
    justifyContent: 'center',
    width: 32,
  },
  pickingChecklistTitleCol: {
    flex: 1,
    gap: 2,
  },
  pickingChecklistTitle: {
    color: leopardPalette.primary,
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  pickingChecklistSubtitle: {
    color: colors.neutral.subtleText,
    fontSize: 10.5,
  },
  checklistItemsCol: {
    backgroundColor: colors.neutral.canvas,
    borderColor: colors.neutral.border,
    borderRadius: 12,
    borderWidth: 1,
    gap: 8,
    padding: spacing.sm + 2,
  },
  checklistItemRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  checklistItemLabel: {
    color: colors.neutral.mutedText,
    fontSize: 11.5,
    fontWeight: '600',
    width: 90,
  },
  checklistItemValue: {
    color: leopardPalette.primary,
    flex: 1,
    fontSize: 11.5,
    fontWeight: '700',
  },
  preloadingCaptureBtn: {
    alignItems: 'center',
    backgroundColor: colors.neutral.canvas,
    borderColor: leopardPalette.inputBorder,
    borderRadius: 12,
    borderStyle: 'dashed',
    borderWidth: 1.5,
    justifyContent: 'center',
    paddingVertical: 12,
  },
  preloadingCaptureBtnDone: {
    backgroundColor: '#F0FDF4',
    borderColor: '#86EFAC',
    borderStyle: 'solid',
  },
  preloadingCaptureInner: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  preloadingCaptureText: {
    color: leopardPalette.primary,
    fontSize: 11.5,
    fontWeight: '700',
  },
  preloadingCaptureTextDone: {
    color: '#15803D',
    fontSize: 11.5,
    fontWeight: '700',
  },
});
