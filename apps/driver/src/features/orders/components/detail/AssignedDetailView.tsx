import React, { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import {
  Button,
  IconCheck,
  IconClock,
  IconPhone,
  IconRoute,
  IconShieldAlert,
  radius,
  ScreenScaffold,
  spacing,
  StatusBadge,
  StatusTimeline,
} from '@leopard/mobile-core';
import type { DriverAssignedDetailView, DriverPrimaryTaskView } from '../../model';
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
}: AssignedDetailViewProps) {
  const [isTimelineOpen, setIsTimelineOpen] = useState(false);
  const isPickupLeg = view.order.status === 'ACCEPTED' || view.order.status === 'PICKING_UP';
  const activeNavigationTarget = isPickupLeg ? view.order.route.origin : view.order.route.destination;
  const isMissionActive =
    view.order.status !== 'DELIVERED' &&
    view.order.status !== 'CANCELLED' &&
    view.order.status !== 'INCIDENT_CANCELLED';

  return (
    <ScreenScaffold
      headerTone="ink"
      onBack={onBack}
      stickyFooter={
        <View style={styles.stickyActionRow}>
          <Pressable
            accessibilityHint="Gọi điện thoại trực tiếp cho người nhận hoặc thủ kho"
            accessibilityLabel="Gọi cho người nhận"
            accessibilityRole="button"
            onPress={() => callPhoneNumber(view.order.customerContact)}
            style={({ pressed }) => [styles.stickyRoundBtn, pressed ? styles.pressed : null]}
          >
            <IconPhone color="#0B1E42" size={20} />
          </Pressable>

          <Pressable
            accessibilityHint="Mở ứng dụng Google Maps để dẫn đường"
            accessibilityLabel="Mở Google Maps chỉ đường"
            accessibilityRole="button"
            onPress={() => openExternalNavigation(activeNavigationTarget)}
            style={({ pressed }) => [styles.stickyRoundBtn, pressed ? styles.pressed : null]}
            testID="btn-navigate-active-leg"
          >
            <IconRoute color="#0B1E42" size={20} />
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
              <IconShieldAlert color="#DC2626" size={20} />
            </Pressable>
          ) : null}

          <View style={styles.stickyPrimaryBtnWrap}>
            {taskButtonComponent ? (
              taskButtonComponent
            ) : (
              <View style={styles.completedTripBadge}>
                <IconCheck color="#15803D" size={14} strokeWidth={2.5} />
                <Text style={styles.completedTripText}>Đã hoàn thành chuyến</Text>
              </View>
            )}
          </View>
        </View>
      }
      title={`Đơn ${view.order.reference}`}
    >
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* 1. Full Interactive Map Canvas at Top */}
        <MissionMapCanvas
          destinationLabel={view.order.route.destination.label}
          distanceLabel={view.order.route.distanceLabel}
          etaLabel={
            view.order.route.etaDurationSeconds > 0
              ? `${Math.round(view.order.route.etaDurationSeconds / 60)} phút`
              : undefined
          }
          navigationTarget={activeNavigationTarget}
          originLabel={view.order.route.origin.label}
          stops={view.order.route.stops}
          tracking={view.tracking}
        />

        {/* 2. Floating Bottom Sheet: Task Sheet overlapping map */}
        <View style={styles.sheetContainer}>
          <View style={styles.sheetGrabHandle} />

          {/* Current Leg Header */}
          <View style={styles.missionHeaderRow}>
            <View style={styles.missionTitleCol}>
              <Text style={styles.missionEyebrow}>DRIVER · ACTIVE MISSION</Text>
              <Text style={styles.missionLegTitle}>
                {view.order.status === 'ACCEPTED' || view.order.status === 'PICKING_UP'
                  ? 'ĐẾN ĐIỂM LẤY HÀNG'
                  : view.order.status === 'IN_TRANSIT'
                    ? 'VẬN CHUYỂN ĐẾN ĐIỂM GIAO'
                    : 'HOÀN TẤT ĐƠN HÀNG'}
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
                  <IconShieldAlert color="#DC2626" size={13} />
                  <Text style={styles.incidentBannerBtnText}>Báo sự cố chuyến đi</Text>
                </Pressable>
              ) : null}
            </View>
            <StatusBadge domain="order" status={view.order.status} />
          </View>

          {/* Stepper Progress */}
          <MissionStepper status={view.order.status} />

          {/* Completion Summary Card for Terminal States */}
          {(view.order.status === 'DELIVERED' || view.order.status === 'RETURNED') && (
            <CompletionSummaryCard
              deliveredAtLabel={view.order.updatedAtLabel}
              priceLabel={view.order.priceLabel}
              reference={view.order.reference}
              status={view.order.status}
            />
          )}

          {/* Notice Banner if any */}
          {view.notice ? (
            <View style={styles.notice}>
              <Text accessibilityLiveRegion="polite" style={styles.warningText}>
                {view.notice}
              </Text>
            </View>
          ) : null}

          {/* 3. Vertical Route Stepper (A -> B) */}
          <VerticalRouteStepper
            destinationLabel={view.order.route.destination.label}
            distanceLabel={view.order.route.distanceLabel}
            originLabel={view.order.route.origin.label}
            status={view.order.status}
          />

          {/* 4. Cargo and Customer Contact Card */}
          <CargoAndContactCard
            cargoSummary={view.order.cargoSummary}
            cargoWeightKg={view.order.cargoWeightKg}
            contactRoleLabel={view.order.contactRoleLabel}
            customerContact={view.order.customerContact}
            vehicleLabel={view.order.vehicleLabel}
          />

          {/* 5. Proof of Delivery / e-POD Panel */}
          <EpodPanel
            onExecuteTask={onExecuteTask}
            onRetryProof={onRetryProof}
            onSelectProof={onSelectProof}
            orderId={view.order.id}
            proof={view.proof}
            status={view.order.status}
          />

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
                <IconClock color="#0B1E42" size={15} />
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
    gap: spacing.sm,
    paddingBottom: 110,
  },
  sheetContainer: {
    backgroundColor: '#FFFFFF',
    borderColor: '#E2E8F0',
    borderRadius: 20,
    borderWidth: 1,
    elevation: 3,
    gap: spacing.sm + 2,
    marginTop: -8,
    padding: spacing.md,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
  },
  sheetGrabHandle: {
    alignSelf: 'center',
    backgroundColor: '#CBD5E1',
    borderRadius: 2,
    height: 4,
    marginBottom: 4,
    width: 36,
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
    color: '#0B1E42',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.6,
  },
  missionLegTitle: {
    color: '#0F172A',
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: -0.2,
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
    color: '#DC2626',
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
    borderColor: '#E2E8F0',
    borderRadius: 12,
    borderWidth: 1,
    overflow: 'hidden',
  },
  timelineToggleBtn: {
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
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
    color: '#0B1E42',
    fontSize: 12,
    fontWeight: '700',
  },
  timelineToggleArrow: {
    color: '#64748B',
    fontSize: 11,
    fontWeight: '700',
  },
  timelineContentWrap: {
    backgroundColor: '#FFFFFF',
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
    backgroundColor: '#FFFFFF',
    borderColor: '#E2E8F0',
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
});
