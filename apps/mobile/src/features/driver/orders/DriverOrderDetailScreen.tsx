import React, { useState } from 'react';
import {
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { colors, leopardPalette, radius, spacing, typography } from '@leopard/mobile-core';
import { Button } from '../../../ui/Button';
import {
  IconCameraProof,
  IconClock,
  IconLocationPin,
  IconOrders,
  IconPhone,
  IconRadarPulse,
  IconRoute,
  IconSpeedTruck,
} from '../../../ui/icons/CoreIcons';
import { RealInteractiveMap } from '../../../ui/RealInteractiveMap';
import { ScreenScaffold, SectionHeading } from '../../../ui/ScreenScaffold';
import { ScreenState } from '../../../ui/ScreenState';
import { StatusBadge } from '../../../ui/StatusBadge';
import { StatusTimeline } from '../../../ui/StatusTimeline';
import type {
  DriverAssignedDetailView,
  DriverCommandView,
  DriverDetailContentView,
  DriverDetailView,
  DriverPrimaryTaskView,
  DriverProofView,
  DriverTrackingView,
} from './model';

export type DriverOrderDetailScreenProps = Readonly<{
  view: DriverDetailView;
  onExecuteTask?: (commandId: string) => void;
  onSelectProof?: () => void;
  onRetryProof?: (commandId: string) => void;
  onRetry?: () => void;
  onResolveConflict?: () => void;
  onOpenLocationSettings?: () => void;
  onBack?: () => void;
}>;

function openExternalNavigation(destinationLabel: string) {
  const encoded = encodeURIComponent(destinationLabel);
  const url = `https://www.google.com/maps/dir/?api=1&destination=${encoded}`;
  void Linking.openURL(url).catch(() => {});
}

function callPhoneNumber(contact: string) {
  const match = contact.match(/[\d+]{8,15}/);
  const phone = match ? match[0] : '19001234';
  void Linking.openURL(`tel:${phone}`).catch(() => {});
}

function CommandButton({
  command,
  onPress,
}: Readonly<{ command: DriverCommandView; onPress?: (commandId: string) => void }>) {
  const disabled = command.disabled || command.isPending;
  return (
    <Button
      disabled={disabled}
      disabledLabel={
        command.disabledReason ? `${command.label} — ${command.disabledReason}` : undefined
      }
      isLoading={command.isPending}
      label={command.label}
      loadingLabel={command.pendingLabel}
      onPress={onPress && !disabled ? () => onPress(command.id) : undefined}
      size="driver-primary"
    />
  );
}

function TaskButton({
  task,
  onExecuteTask,
  onSelectProof,
  onRetryProof,
}: Readonly<{
  task: Exclude<DriverPrimaryTaskView, null>;
  onExecuteTask?: (commandId: string) => void;
  onSelectProof?: () => void;
  onRetryProof?: (commandId: string) => void;
}>) {
  if (task.kind === 'upload-proof') {
    const handler = task.command.id === 'cmd-retry-proof-demo' ? onRetryProof : onSelectProof;
    return (
      <CommandButton
        command={task.command}
        onPress={handler ? () => handler(task.command.id) : undefined}
      />
    );
  }
  return <CommandButton command={task.command} onPress={onExecuteTask} />;
}

function ProofPanel({ proof }: Readonly<{ proof: DriverProofView }>) {
  if (proof.kind === 'empty') return null;
  const isError =
    proof.kind === 'invalid-type' || proof.kind === 'too-large' || proof.kind === 'upload-retry';
  return (
    <View style={[styles.proofPanel, isError ? styles.proofError : null]}>
      <View style={styles.proofHeaderRow}>
        <View style={[styles.proofIconChip, isError ? styles.proofIconChipError : null]}>
          <IconCameraProof
            color={isError ? '#DC2626' : '#0B1E42'}
            size={18}
          />
        </View>
        <View style={styles.proofHeaderText}>
          <Text accessibilityRole={isError ? 'alert' : undefined} style={styles.proofTitle}>
            {proof.label}
          </Text>
          <Text style={styles.proofMessage}>{proof.message}</Text>
        </View>
      </View>
      {proof.fileLabel ? (
        <Text style={styles.proofHelper}>Ảnh đính kèm: {proof.fileLabel}</Text>
      ) : null}
    </View>
  );
}

function MissionStepper({ status }: Readonly<{ status: string }>) {
  let activeIndex = 0;
  if (status === 'PICKING_UP') activeIndex = 1;
  else if (status === 'PICKED_UP' || status === 'IN_TRANSIT') activeIndex = 2;
  else if (status === 'DELIVERED') {
    activeIndex = 3;
  }

  const steps = [
    { label: 'Đến kho', index: 0 },
    { label: 'Bốc hàng', index: 1 },
    { label: 'Vận chuyển', index: 2 },
    { label: 'Giao hàng', index: 3 },
  ];

  return (
    <View style={styles.stepperContainer}>
      {steps.map((step, idx) => {
        const isCurrent = idx === activeIndex;
        const isPast = idx < activeIndex;
        return (
          <React.Fragment key={step.index}>
            <View style={styles.stepItem}>
              <View
                style={[
                  styles.stepDot,
                  isCurrent
                    ? styles.stepDotCurrent
                    : isPast
                      ? styles.stepDotPast
                      : styles.stepDotFuture,
                ]}
              >
                <Text
                  style={[
                    styles.stepDotNumber,
                    isCurrent || isPast
                      ? styles.stepDotNumberActive
                      : styles.stepDotNumberFuture,
                  ]}
                >
                  {isPast ? '✓' : idx + 1}
                </Text>
              </View>
              <Text
                style={[
                  styles.stepLabel,
                  isCurrent
                    ? styles.stepLabelCurrent
                    : isPast
                      ? styles.stepLabelPast
                      : styles.stepLabelFuture,
                ]}
              >
                {step.label}
              </Text>
            </View>
            {idx < steps.length - 1 ? (
              <View
                style={[
                  styles.stepLine,
                  idx < activeIndex ? styles.stepLineActive : styles.stepLineFuture,
                ]}
              />
            ) : null}
          </React.Fragment>
        );
      })}
    </View>
  );
}

function VerticalRouteStepper({
  originLabel,
  destinationLabel,
  distanceLabel,
  status,
}: Readonly<{
  originLabel: string;
  destinationLabel: string;
  distanceLabel?: string;
  status: string;
}>) {
  const isPassedPickup =
    status === 'PICKED_UP' ||
    status === 'IN_TRANSIT' ||
    status === 'DELIVERED';

  return (
    <View style={styles.verticalRouteCard}>
      {/* Node A (Điểm lấy hàng) */}
      {isPassedPickup ? (
        <View style={styles.routeNodeACollapsed}>
          <View style={styles.checkBadge}>
            <Text style={styles.checkBadgeText}>✓</Text>
          </View>
          <View style={styles.routeTextCol}>
            <Text style={styles.routeNodeSubA}>ĐÃ BỐC HÀNG TẠI</Text>
            <Text numberOfLines={2} style={styles.routeNodeTitleA}>
              {originLabel}
            </Text>
          </View>
        </View>
      ) : (
        <View style={styles.routeNodeAExpanded}>
          <View style={styles.badgeA}>
            <Text style={styles.badgeTextA}>A</Text>
          </View>
          <View style={styles.routeTextCol}>
            <View style={styles.rowBetween}>
              <Text style={styles.routeNodeSubA}>ĐIỂM LẤY HÀNG (A)</Text>
              <View style={styles.activeLegTag}>
                <Text style={styles.activeLegTagText}>CHẶNG HIỆN TẠI</Text>
              </View>
            </View>
            <Text style={styles.routeNodeTitleAExpanded}>{originLabel}</Text>
          </View>
        </View>
      )}

      {/* Trục nối dọc (Vertical Spine) */}
      <View style={styles.routeSpineRow}>
        <View style={styles.spineDashedLine} />
        {distanceLabel ? (
          <View style={styles.spineDistancePill}>
            <Text style={styles.spineDistanceText}>Lộ trình · {distanceLabel}</Text>
          </View>
        ) : null}
      </View>

      {/* Node B (Điểm giao hàng) */}
      <View style={styles.routeNodeB}>
        <View style={styles.badgeB}>
          <Text style={styles.badgeTextB}>B</Text>
        </View>
        <View style={styles.routeTextCol}>
          <View style={styles.rowBetween}>
            <Text style={styles.routeNodeSubB}>ĐIỂM GIAO HÀNG (B)</Text>
            {isPassedPickup ? (
              <View style={styles.activeLegTag}>
                <Text style={styles.activeLegTagText}>CHẶNG HIỆN TẠI</Text>
              </View>
            ) : null}
          </View>
          <Text style={styles.routeNodeTitleB}>{destinationLabel}</Text>
        </View>
      </View>
    </View>
  );
}

function CargoAndContactCard({
  vehicleLabel,
  cargoSummary,
  customerContact,
}: Readonly<{
  vehicleLabel: string;
  cargoSummary: string;
  customerContact: string;
}>) {
  return (
    <View style={styles.cargoContactCard}>
      <Text style={styles.cardSectionTitle}>HÀNG HÓA & LIÊN HỆ</Text>

      {/* Cargo Spec Chips */}
      <View style={styles.specChipsRow}>
        <View style={styles.specChip}>
          <IconSpeedTruck color="#0B1E42" size={14} />
          <Text style={styles.specChipText}>{vehicleLabel}</Text>
        </View>
        <View style={styles.specChip}>
          <IconOrders color="#0B1E42" size={14} />
          <Text numberOfLines={1} style={styles.specChipText}>
            {cargoSummary}
          </Text>
        </View>
      </View>

      {/* Customer Contact Card */}
      <View style={styles.contactCardRow}>
        <View style={styles.contactIconChip}>
          <IconPhone color="#0B1E42" size={16} />
        </View>
        <View style={styles.contactTextColumn}>
          <Text style={styles.contactCaption}>LIÊN HỆ KHÁCH HÀNG / THỦ KHO</Text>
          <Text style={styles.contactValue}>{customerContact}</Text>
        </View>
        <Pressable
          accessibilityHint="Gọi điện thoại cho người nhận hoặc thủ kho"
          accessibilityLabel="Gọi điện thoại"
          accessibilityRole="button"
          onPress={() => callPhoneNumber(customerContact)}
          style={({ pressed }) => [styles.contactCallBtn, pressed ? styles.pressed : null]}
        >
          <IconPhone color="#FFFFFF" size={14} />
          <Text style={styles.contactCallBtnText}>Gọi</Text>
        </Pressable>
      </View>
    </View>
  );
}

function MissionMapCanvas({
  originLabel,
  destinationLabel,
  stops,
  tracking,
  distanceLabel,
  etaLabel,
}: Readonly<{
  originLabel: string;
  destinationLabel: string;
  stops?: readonly { id: string; label: string }[];
  tracking: DriverTrackingView;
  distanceLabel: string;
  etaLabel?: string;
}>) {
  const isStale =
    tracking.kind === 'stale' ||
    tracking.kind === 'offline' ||
    tracking.kind === 'reconnecting' ||
    tracking.kind === 'permission-denied';

  return (
    <View style={styles.mapCanvasContainer} testID="route-map-schematic">
      <RealInteractiveMap
        destination={{ label: destinationLabel }}
        height="100%"
        mode="tracking"
        origin={{ label: originLabel }}
        stops={stops?.map((s) => ({ id: s.id, label: s.label }))}
        truckEtaLabel={tracking.label}
      />

      {/* Floating Pill Top Right: Tracking Status */}
      <View style={styles.mapFloatingStatusPill}>
        <View
          style={[
            styles.mapStatusDot,
            isStale ? styles.mapStatusDotWarning : styles.mapStatusDotHealthy,
          ]}
        />
        <Text numberOfLines={1} style={styles.mapStatusPillText}>
          {tracking.label}
        </Text>
      </View>

      {/* Floating Pill Bottom Left: ETA & Distance */}
      <View style={styles.mapFloatingEtaPill}>
        <IconClock color="#0B1E42" size={13} />
        <Text style={styles.mapFloatingEtaText}>
          {distanceLabel}{etaLabel ? ` · ${etaLabel}` : ''}
        </Text>
      </View>

      {/* Floating Quick Action Group Bottom Right */}
      <View style={styles.mapFloatingControlsGroup}>
        <Pressable
          accessibilityHint="Mở ứng dụng Google Maps để dẫn đường"
          accessibilityLabel="Mở Google Maps chỉ đường"
          accessibilityRole="button"
          onPress={() => openExternalNavigation(destinationLabel)}
          style={({ pressed }) => [styles.mapFloatingQuickBtn, pressed ? styles.pressed : null]}
        >
          <IconRoute color="#0B1E42" size={18} />
        </Pressable>
      </View>
    </View>
  );
}

function PublicDetail({
  onBack,
  onExecuteTask,
  onRetryProof,
  onSelectProof,
  view,
}: Readonly<
  Pick<DriverOrderDetailScreenProps, 'onBack' | 'onExecuteTask' | 'onSelectProof' | 'onRetryProof'> & {
    view: Extract<DriverDetailContentView, { accessScope: 'PUBLIC_SUMMARY' }>;
  }
>) {
  const pickupLabel =
    view.order.pickupLocationLabel ||
    view.order.publicRouteLabel.split('→')[0]?.trim() ||
    'Khu vực lấy hàng';
  const dropoffLabel =
    view.order.dropoffLocationLabel ||
    view.order.publicRouteLabel.split('→')[1]?.trim() ||
    'Khu vực giao hàng';

  return (
    <ScreenScaffold
      eyebrow="DRIVER · FIELD COCKPIT"
      headerTone="ink"
      onBack={onBack}
      stickyFooter={
        view.primaryTask ? (
          <TaskButton
            onExecuteTask={onExecuteTask}
            onRetryProof={onRetryProof}
            onSelectProof={onSelectProof}
            task={view.primaryTask}
          />
        ) : null
      }
      title={`Đơn ${view.order.reference}`}
    >
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* 1. Interactive Preview Map Canvas */}
        <View style={styles.mapCanvasContainer} testID="public-route-map-schematic">
          <RealInteractiveMap
            destination={{ label: dropoffLabel }}
            height="100%"
            mode="route"
            origin={{ label: pickupLabel }}
          />

          {/* Floating Tag Top Right: Public Preview Mode */}
          <View style={styles.publicMapTopTag}>
            <View style={styles.publicMapDot} />
            <Text style={styles.publicMapTopTagText}>XEM TRƯỚC LỘ TRÌNH</Text>
          </View>

          {/* Floating Pill Bottom Left: ETA & Distance */}
          <View style={styles.mapFloatingEtaPill}>
            <IconClock color="#0B1E42" size={13} />
            <Text style={styles.mapFloatingEtaText}>
              {view.order.distanceLabel ? `${view.order.distanceLabel} · ` : ''}{view.order.etaLabel}
            </Text>
          </View>

          {/* Floating Pill Bottom Right: Protected View */}
          <View style={styles.publicProtectedTag}>
            <Text style={styles.publicProtectedText}>Chế độ xem trước</Text>
          </View>
        </View>

        {/* 2. Sheet Container */}
        <View style={styles.publicSheetContainer}>
          {/* Header Row: Title and Status */}
          <View style={styles.missionHeaderRow}>
            <View style={styles.missionTitleCol}>
              <Text style={styles.missionEyebrow}>ĐƠN HÀNG CHỜ TIẾP NHẬN</Text>
              <Text style={styles.missionLegTitle}>THÔNG TIN QUYẾT ĐỊNH NHẬN ĐƠN</Text>
            </View>
            <StatusBadge domain="order" status={view.order.status} />
          </View>

          {/* 3. Dispatch Fare Slab: Prominent Earnings */}
          <View style={styles.fareSlab}>
            <View style={styles.fareSlabTopRow}>
              <View style={styles.fareIconBadge}>
                <IconOrders color="#0B1E42" size={16} />
              </View>
              <View style={styles.fareTitleCol}>
                <Text style={styles.fareCaption}>CƯỚC THỰC NHẬN DỰ KIẾN</Text>
                <Text style={styles.fareSubcaption}>Nhận vào ví ngay khi hoàn tất giao hàng</Text>
              </View>
              <View style={styles.fareNetPill}>
                <Text style={styles.fareNetPillText}>Thu nhập ròng</Text>
              </View>
            </View>
            <View style={styles.fareAmountRow}>
              <Text style={styles.fareAmountText}>{view.order.priceLabel || '285.000 ₫'}</Text>
            </View>
            <Text style={styles.fareTermsText}>
              ✓ Đã khấu trừ phí nền tảng · Khách thanh toán bảo đảm qua VietQR Napas247
            </Text>
          </View>

          {/* 4. Vertical Route Spine (Public Scope) */}
          <View style={styles.publicRouteCard}>
            <Text style={styles.cardSectionTitle}>LỘ TRÌNH VẬN CHUYỂN</Text>
            <View style={styles.publicRouteSpineRow}>
              {/* Route column: A and B */}
              <View style={styles.publicSpineColumn}>
                <View style={styles.publicSpinePointA}>
                  <Text style={styles.publicSpinePointTextA}>A</Text>
                </View>
                <View style={styles.publicSpineDashedLine} />
                <View style={styles.publicSpinePointB}>
                  <Text style={styles.publicSpinePointTextB}>B</Text>
                </View>
              </View>

              {/* Route labels */}
              <View style={styles.publicSpineLabelsCol}>
                <View style={styles.publicPointBlock}>
                  <View style={styles.rowBetween}>
                    <Text style={styles.publicPointSubA}>ĐIỂM LẤY HÀNG (A)</Text>
                    <View style={styles.publicDistanceChip}>
                      <IconLocationPin color="#0B1E42" size={10} />
                      <Text style={styles.publicDistanceChipText}>
                        {view.order.pickupDistanceLabel || 'Cách bạn 1.2 km'}
                      </Text>
                    </View>
                  </View>
                  <Text style={styles.publicPointTitleA}>{pickupLabel}</Text>
                </View>

                <View style={styles.publicDistanceBetweenRow}>
                  <IconRoute color="#0B1E42" size={12} />
                  <Text style={styles.publicDistanceBetweenText}>
                    Khoảng cách chặng · {view.order.distanceLabel || '18,4 km'}
                  </Text>
                </View>

                <View style={styles.publicPointBlock}>
                  <Text style={styles.publicPointSubB}>ĐIỂM GIAO HÀNG (B)</Text>
                  <Text style={styles.publicPointTitleB}>{dropoffLabel}</Text>
                </View>
              </View>
            </View>

            {/* Accessible full route string for screen readers and test assertions */}
            <View style={styles.publicRouteMetaFooter}>
              <Text style={styles.publicRouteMetaText}>
                {view.order.publicRouteLabel}
              </Text>
            </View>
          </View>

          {/* 5. Cargo & Vehicle Specs Grid */}
          <View style={styles.publicSpecsGrid}>
            <View style={styles.publicSpecCell}>
              <View style={styles.specCellIconOuter}>
                <IconSpeedTruck color="#0B1E42" size={16} />
              </View>
              <View style={styles.specCellTextCol}>
                <Text style={styles.specCellLabel}>LOẠI XE YÊU CẦU</Text>
                <Text style={styles.specCellValue}>{view.order.vehicleLabel}</Text>
              </View>
            </View>

            <View style={styles.publicSpecCell}>
              <View style={styles.specCellIconOuter}>
                <IconOrders color="#0B1E42" size={16} />
              </View>
              <View style={styles.specCellTextCol}>
                <Text style={styles.specCellLabel}>QUY CÁCH HÀNG HÓA</Text>
                <Text numberOfLines={2} style={styles.specCellValue}>{view.order.cargoSummary}</Text>
              </View>
            </View>

            <View style={styles.publicSpecCell}>
              <View style={styles.specCellIconOuter}>
                <IconClock color="#0B1E42" size={16} />
              </View>
              <View style={styles.specCellTextCol}>
                <Text style={styles.specCellLabel}>THỜI GIAN DỰ KIẾN</Text>
                <Text style={styles.specCellValue}>{view.order.etaLabel}</Text>
              </View>
            </View>

            <View style={styles.publicSpecCell}>
              <View style={styles.specCellIconOuter}>
                <IconLocationPin color="#0B1E42" size={16} />
              </View>
              <View style={styles.specCellTextCol}>
                <Text style={styles.specCellLabel}>CẬP NHẬT ĐƠN</Text>
                <Text style={styles.specCellValue}>{view.order.updatedAtLabel}</Text>
              </View>
            </View>
          </View>

          {/* 6. Dispatch Notice: Open offer to nearby drivers */}
          <View style={styles.publicDispatchNotice}>
            <View style={styles.noticeIconCircle}>
              <IconRadarPulse color="#0B1E42" size={16} />
            </View>
            <View style={styles.noticeTextCol}>
              <Text style={styles.noticeHeader}>Đơn đang mở cho tài xế khu vực</Text>
              <Text style={styles.noticeBodyText}>
                Đơn hàng đang phát cho các tài xế phù hợp trong bán kính 5 km. Hãy nhận đơn sớm nếu sẵn sàng nhận hàng.
              </Text>
            </View>
          </View>

          {/* 7. Privacy statement */}
          <View style={styles.publicPrivacyCard}>
            <Text style={styles.publicPrivacyTitle}>Bảo mật thông tin trước khi nhận</Text>
            <Text style={styles.privacyCopy}>
              Địa chỉ đầy đủ, liên hệ, media và tracking chỉ xuất hiện sau khi hệ thống xác nhận phân công.
            </Text>
          </View>
        </View>
      </ScrollView>
    </ScreenScaffold>
  );
}

function AssignedDetail({
  onBack,
  onExecuteTask,
  onOpenLocationSettings,
  onRetryProof,
  onSelectProof,
  view,
}: Readonly<
  Omit<DriverOrderDetailScreenProps, 'view' | 'onResolveConflict'> & {
    view: DriverAssignedDetailView;
  }
>) {
  const [isTimelineOpen, setIsTimelineOpen] = useState(false);

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
            onPress={() => openExternalNavigation(view.order.route.destination.label)}
            style={({ pressed }) => [styles.stickyRoundBtn, pressed ? styles.pressed : null]}
          >
            <IconRoute color="#0B1E42" size={20} />
          </Pressable>

          <View style={styles.stickyPrimaryBtnWrap}>
            {view.primaryTask ? (
              <TaskButton
                onExecuteTask={onExecuteTask}
                onRetryProof={onRetryProof}
                onSelectProof={onSelectProof}
                task={view.primaryTask}
              />
            ) : (
              <View style={styles.completedTripBadge}>
                <Text style={styles.completedTripText}>Đã hoàn thành chuyến ✓</Text>
              </View>
            )}
          </View>
        </View>
      }
      title={`Đơn ${view.order.reference}`}
    >
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* 1. Full Interactive Map Canvas at Top */}
        <MissionMapCanvas
          destinationLabel={view.order.route.destination.label}
          distanceLabel={view.order.route.distanceLabel}
          etaLabel={
            view.order.route.etaDurationSeconds > 0
              ? `${Math.round(view.order.route.etaDurationSeconds / 60)} phút`
              : undefined
          }
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
                  : view.order.status === 'IN_TRANSIT' || view.order.status === 'PICKED_UP'
                    ? 'VẬN CHUYỂN ĐẾN ĐIỂM GIAO'
                    : 'HOÀN TẤT ĐƠN HÀNG'}
              </Text>
            </View>
            <StatusBadge domain="order" status={view.order.status} />
          </View>

          {/* Stepper Progress */}
          <MissionStepper status={view.order.status} />

          {/* Notice Banner if any */}
          {view.notice ? (
            <View style={styles.notice}>
              <Text accessibilityLiveRegion="polite" style={styles.warningText}>
                {view.notice}
              </Text>
            </View>
          ) : null}

          {/* 3. Vertical Route Stepper (A -> B, no side-by-side crushing!) */}
          <VerticalRouteStepper
            destinationLabel={view.order.route.destination.label}
            distanceLabel={view.order.route.distanceLabel}
            originLabel={view.order.route.origin.label}
            status={view.order.status}
          />

          {/* 4. Cargo and Customer Contact Card */}
          <CargoAndContactCard
            cargoSummary={view.order.cargoSummary}
            customerContact={view.order.customerContact}
            vehicleLabel={view.order.vehicleLabel}
          />

          {/* 5. Proof of Delivery Panel */}
          <ProofPanel proof={view.proof} />

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

export function DriverOrderDetailScreen(props: DriverOrderDetailScreenProps) {
  const { view, onBack } = props;
  if (view.kind === 'conflict') {
    return (
      <ScreenScaffold
        headerTone="ink"
        onBack={onBack}
        title="Chi tiết đơn"
      >
        <ScreenState
          actionLabel={view.recoveryLabel}
          message={`${view.message}${view.activeOrderReference ? ` Chuyến hiện tại: ${view.activeOrderReference}.` : ''}`}
          onAction={props.onResolveConflict}
          state="conflict"
          title={view.title}
        />
      </ScreenScaffold>
    );
  }
  if (view.kind !== 'content') {
    return (
      <ScreenScaffold
        headerTone="ink"
        onBack={onBack}
        title="Chi tiết đơn"
      >
        <ScreenState
          actionLabel={view.kind === 'error' ? 'Thử tải lại chi tiết' : undefined}
          message={view.message}
          onAction={props.onRetry}
          state={view.kind}
          title={view.title}
        />
      </ScreenScaffold>
    );
  }
  if (view.accessScope === 'PUBLIC_SUMMARY') return <PublicDetail {...props} view={view} />;
  return <AssignedDetail {...props} view={view} />;
}

const styles = StyleSheet.create({
  scrollContent: {
    gap: spacing.sm,
    paddingBottom: 110,
  },
  pressed: {
    opacity: 0.75,
  },

  /* ── 1. Map Canvas Section ── */
  mapCanvasContainer: {
    backgroundColor: '#0F172A',
    borderRadius: 16,
    height: 270,
    overflow: 'hidden',
    position: 'relative',
    width: '100%',
  },
  mapFloatingStatusPill: {
    alignItems: 'center',
    backgroundColor: 'rgba(15, 23, 42, 0.82)',
    borderColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: radius.pill,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 6,
    maxWidth: 200,
    paddingHorizontal: 10,
    paddingVertical: 4,
    position: 'absolute',
    right: 10,
    top: 10,
    zIndex: 10,
  },
  mapStatusDot: {
    borderRadius: 3,
    height: 6,
    width: 6,
  },
  mapStatusDotHealthy: {
    backgroundColor: '#22C55E',
  },
  mapStatusDotWarning: {
    backgroundColor: '#F59E0B',
  },
  mapStatusPillText: {
    color: '#FFFFFF',
    fontSize: 10.5,
    fontWeight: '700',
  },
  mapFloatingEtaPill: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderColor: '#E2E8F0',
    borderRadius: radius.pill,
    borderWidth: 1,
    elevation: 3,
    flexDirection: 'row',
    gap: 5,
    left: 10,
    paddingHorizontal: 10,
    paddingVertical: 5,
    position: 'absolute',
    bottom: 12,
    zIndex: 10,
  },
  mapFloatingEtaText: {
    color: leopardPalette.textSlateDark,
    fontSize: 11,
    fontWeight: '800',
  },
  mapFloatingControlsGroup: {
    bottom: 10,
    position: 'absolute',
    right: 10,
    zIndex: 10,
  },
  mapFloatingQuickBtn: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderColor: '#E2E8F0',
    borderRadius: 20,
    borderWidth: 1,
    elevation: 4,
    height: 40,
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 3,
    width: 40,
  },

  /* ── 2. Floating Bottom Sheet ── */
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
    gap: 1,
  },
  missionEyebrow: {
    color: '#0B1E42',
    fontSize: 9.5,
    fontWeight: '800',
    letterSpacing: 0.6,
  },
  missionLegTitle: {
    color: leopardPalette.textSlateDark,
    fontSize: 14.5,
    fontWeight: '800',
    letterSpacing: -0.2,
  },

  /* ── 3. Stepper ── */
  stepperContainer: {
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderColor: '#E2E8F0',
    borderRadius: 12,
    borderWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs + 2,
  },
  stepItem: {
    alignItems: 'center',
    gap: 3,
  },
  stepDot: {
    alignItems: 'center',
    borderRadius: 10,
    height: 20,
    justifyContent: 'center',
    width: 20,
  },
  stepDotCurrent: {
    backgroundColor: leopardPalette.primary,
  },
  stepDotPast: {
    backgroundColor: '#16A34A',
  },
  stepDotFuture: {
    backgroundColor: '#CBD5E1',
  },
  stepDotNumber: {
    fontSize: 10,
    fontWeight: '800',
  },
  stepDotNumberActive: {
    color: '#FFFFFF',
  },
  stepDotNumberFuture: {
    color: '#64748B',
  },
  stepLabel: {
    fontSize: 10,
    fontWeight: '600',
  },
  stepLabelCurrent: {
    color: leopardPalette.primary,
    fontWeight: '800',
  },
  stepLabelPast: {
    color: '#16A34A',
  },
  stepLabelFuture: {
    color: '#94A3B8',
  },
  stepLine: {
    flex: 1,
    height: 2,
    marginBottom: 12,
    marginHorizontal: 3,
  },
  stepLineActive: {
    backgroundColor: '#16A34A',
  },
  stepLineFuture: {
    backgroundColor: '#E2E8F0',
  },

  /* ── 4. Vertical Route Stepper (A -> B) ── */
  verticalRouteCard: {
    backgroundColor: '#F8FAFC',
    borderColor: '#E2E8F0',
    borderRadius: 14,
    borderWidth: 1,
    padding: spacing.sm + 2,
  },
  routeNodeACollapsed: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 10,
  },
  checkBadge: {
    alignItems: 'center',
    backgroundColor: '#DCFCE7',
    borderColor: '#86EFAC',
    borderRadius: 12,
    borderWidth: 1,
    height: 24,
    justifyContent: 'center',
    width: 24,
  },
  checkBadgeText: {
    color: '#15803D',
    fontSize: 12,
    fontWeight: '800',
  },
  routeNodeAExpanded: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: 10,
  },
  badgeA: {
    alignItems: 'center',
    backgroundColor: '#16A34A',
    borderRadius: 12,
    height: 24,
    justifyContent: 'center',
    width: 24,
  },
  badgeTextA: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '800',
  },
  routeTextCol: {
    flex: 1,
    gap: 2,
  },
  routeNodeSubA: {
    color: '#059669',
    fontSize: 9.5,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  routeNodeTitleA: {
    color: '#475569',
    fontSize: 12.5,
    fontWeight: '600',
  },
  routeNodeTitleAExpanded: {
    color: leopardPalette.textSlateDark,
    fontSize: 13.5,
    fontWeight: '700',
  },
  routeSpineRow: {
    alignItems: 'center',
    flexDirection: 'row',
    marginVertical: 4,
    paddingLeft: 11,
  },
  spineDashedLine: {
    borderLeftColor: '#94A3B8',
    borderLeftWidth: 2,
    borderStyle: 'dashed',
    height: 24,
    width: 2,
  },
  spineDistancePill: {
    backgroundColor: '#F1F5F9',
    borderColor: '#E2E8F0',
    borderRadius: radius.pill,
    borderWidth: 1,
    marginLeft: 12,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  spineDistanceText: {
    color: '#475569',
    fontSize: 10,
    fontWeight: '600',
  },
  routeNodeB: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: 10,
  },
  badgeB: {
    alignItems: 'center',
    backgroundColor: '#EA580C',
    borderRadius: 12,
    height: 24,
    justifyContent: 'center',
    width: 24,
  },
  badgeTextB: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '800',
  },
  routeNodeSubB: {
    color: '#EA580C',
    fontSize: 9.5,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  routeNodeTitleB: {
    color: leopardPalette.textSlateDark,
    fontSize: 14.5,
    fontWeight: '800',
  },
  activeLegTag: {
    backgroundColor: '#FEF3C7',
    borderColor: '#FDE68A',
    borderRadius: 4,
    borderWidth: 1,
    paddingHorizontal: 5,
    paddingVertical: 1,
  },
  activeLegTagText: {
    color: '#B45309',
    fontSize: 8.5,
    fontWeight: '800',
  },

  /* ── 5. Cargo & Contact Card ── */
  cargoContactCard: {
    backgroundColor: '#F8FAFC',
    borderColor: '#E2E8F0',
    borderRadius: 14,
    borderWidth: 1,
    gap: 8,
    padding: spacing.sm + 2,
  },
  cardSectionTitle: {
    color: '#64748B',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.6,
  },
  specChipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  specChip: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderColor: '#E2E8F0',
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  specChipText: {
    color: leopardPalette.textSlateDark,
    fontSize: 11.5,
    fontWeight: '600',
  },
  contactCardRow: {
    alignItems: 'center',
    backgroundColor: '#EFF6FF',
    borderColor: '#BFDBFE',
    borderRadius: 10,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 8,
    padding: spacing.sm,
  },
  contactIconChip: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    height: 32,
    justifyContent: 'center',
    width: 32,
  },
  contactTextColumn: {
    flex: 1,
    gap: 1,
  },
  contactCaption: {
    color: '#1D4ED8',
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  contactValue: {
    color: leopardPalette.textSlateDark,
    fontSize: 13,
    fontWeight: '700',
  },
  contactCallBtn: {
    alignItems: 'center',
    backgroundColor: '#0B1E42',
    borderRadius: 8,
    flexDirection: 'row',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  contactCallBtnText: {
    color: '#FFFFFF',
    fontSize: 11.5,
    fontWeight: '700',
  },

  /* ── 6. Proof Panel ── */
  proofPanel: {
    backgroundColor: '#F0FDF4',
    borderColor: '#BBF7D0',
    borderRadius: 12,
    borderWidth: 1,
    gap: 4,
    padding: spacing.sm + 2,
  },
  proofError: {
    backgroundColor: '#FEF2F2',
    borderColor: '#FECACA',
  },
  proofHeaderRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  proofIconChip: {
    alignItems: 'center',
    backgroundColor: '#DCFCE7',
    borderRadius: 8,
    height: 32,
    justifyContent: 'center',
    width: 32,
  },
  proofIconChipError: {
    backgroundColor: '#FEE2E2',
  },
  proofHeaderText: {
    flex: 1,
    gap: 1,
  },
  proofTitle: {
    color: leopardPalette.textSlateDark,
    fontSize: 12.5,
    fontWeight: '800',
  },
  proofMessage: {
    color: '#475569',
    fontSize: 11,
  },
  proofHelper: {
    color: '#64748B',
    fontSize: 10,
    marginTop: 2,
  },

  /* ── 7. Permission Alert ── */
  permissionAlertBox: {
    backgroundColor: '#FEF3C7',
    borderColor: '#FDE68A',
    borderRadius: 12,
    borderWidth: 1,
    gap: 6,
    padding: spacing.sm + 2,
  },
  permissionAlertTitle: {
    color: '#92400E',
    fontSize: 13,
    fontWeight: '800',
  },
  permissionAlertMessage: {
    color: '#78350F',
    fontSize: 11,
  },

  /* ── 8. Status Timeline Accordion ── */
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
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: spacing.sm,
  },
  timelineToggleLeft: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  timelineToggleText: {
    color: '#475569',
    fontSize: 12,
    fontWeight: '700',
  },
  timelineToggleArrow: {
    color: '#64748B',
    fontSize: 11,
    fontWeight: '800',
  },
  timelineContentWrap: {
    backgroundColor: '#FFFFFF',
    borderTopColor: '#E2E8F0',
    borderTopWidth: 1,
    padding: spacing.sm,
  },

  /* ── 9. Sticky Action Bar at Bottom ── */
  stickyActionRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
    width: '100%',
  },
  stickyRoundBtn: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderColor: '#CBD5E1',
    borderRadius: 25,
    borderWidth: 1.5,
    elevation: 3,
    height: 48,
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    width: 48,
  },
  stickyPrimaryBtnWrap: {
    flex: 1,
  },
  completedTripBadge: {
    alignItems: 'center',
    backgroundColor: '#DCFCE7',
    borderColor: '#86EFAC',
    borderRadius: 12,
    borderWidth: 1,
    height: 48,
    justifyContent: 'center',
  },
  completedTripText: {
    color: '#15803D',
    fontSize: 14,
    fontWeight: '800',
  },

  /* Notice / Helper / Public Screen */
  notice: {
    backgroundColor: colors.warning.background,
    borderLeftColor: colors.warning.border,
    borderLeftWidth: 4,
    padding: spacing.sm,
  },
  warningText: { ...typography.body, color: colors.warning.text, flexShrink: 1 },
  rowBetween: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  currentTask: {
    backgroundColor: colors.neutral.background,
    borderLeftColor: colors.active.border,
    borderLeftWidth: 4,
    gap: spacing.sm,
    padding: spacing.md,
  },
  taskEyebrow: {
    ...typography.caption,
    color: colors.brand.background,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.8,
  },
  routeLabel: { ...typography.sectionTitle, color: colors.neutral.text, flexShrink: 1 },
  body: { ...typography.body, color: colors.neutral.text, flexShrink: 1 },
  helper: { ...typography.caption, color: colors.neutral.mutedText, flexShrink: 1 },
  privacyCopy: {
    ...typography.body,
    backgroundColor: colors.info.background,
    color: colors.info.text,
    flexShrink: 1,
    padding: spacing.md,
  },

  /* ── Public Detail Redesign Styles ── */
  publicMapTopTag: {
    alignItems: 'center',
    backgroundColor: 'rgba(15, 23, 42, 0.85)',
    borderColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: radius.pill,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 5,
    position: 'absolute',
    right: 10,
    top: 10,
    zIndex: 10,
  },
  publicMapDot: {
    backgroundColor: '#38BDF8',
    borderRadius: 3,
    height: 6,
    width: 6,
  },
  publicMapTopTagText: {
    color: '#FFFFFF',
    fontSize: 10.5,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  publicProtectedTag: {
    alignItems: 'center',
    backgroundColor: 'rgba(15, 23, 42, 0.75)',
    borderRadius: 6,
    bottom: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
    position: 'absolute',
    right: 10,
    zIndex: 10,
  },
  publicProtectedText: {
    color: '#94A3B8',
    fontSize: 10,
    fontWeight: '700',
  },
  publicSheetContainer: {
    gap: spacing.sm,
    paddingHorizontal: spacing.sm,
  },
  fareSlab: {
    backgroundColor: '#F0FDF4',
    borderColor: '#BBF7D0',
    borderRadius: 14,
    borderWidth: 1.5,
    gap: 8,
    padding: spacing.md,
    shadowColor: '#166534',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  fareSlabTopRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'space-between',
  },
  fareIconBadge: {
    alignItems: 'center',
    backgroundColor: '#DCFCE7',
    borderRadius: 8,
    height: 32,
    justifyContent: 'center',
    width: 32,
  },
  fareTitleCol: {
    flex: 1,
  },
  fareCaption: {
    color: '#15803D',
    fontSize: 10.5,
    fontWeight: '800',
    letterSpacing: 0.4,
  },
  fareSubcaption: {
    color: '#4B5563',
    fontSize: 11,
  },
  fareNetPill: {
    backgroundColor: '#DCFCE7',
    borderColor: '#86EFAC',
    borderRadius: radius.pill,
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  fareNetPillText: {
    color: '#166534',
    fontSize: 10.5,
    fontWeight: '800',
  },
  fareAmountRow: {
    paddingVertical: 2,
  },
  fareAmountText: {
    color: '#14532D',
    fontSize: 28,
    fontWeight: '900',
    letterSpacing: 0.3,
  },
  fareTermsText: {
    color: '#166534',
    fontSize: 11.5,
    fontWeight: '600',
    lineHeight: 16,
  },
  publicRouteCard: {
    backgroundColor: '#FFFFFF',
    borderColor: '#E2E8F0',
    borderRadius: 14,
    borderWidth: 1,
    gap: spacing.sm,
    padding: spacing.md,
  },
  publicRouteSpineRow: {
    flexDirection: 'row',
    gap: 12,
    paddingVertical: 4,
  },
  publicSpineColumn: {
    alignItems: 'center',
    paddingTop: 2,
    width: 20,
  },
  publicSpinePointA: {
    alignItems: 'center',
    backgroundColor: '#DCFCE7',
    borderColor: '#16A34A',
    borderRadius: 10,
    borderWidth: 1.5,
    height: 20,
    justifyContent: 'center',
    width: 20,
  },
  publicSpinePointTextA: {
    color: '#15803D',
    fontSize: 10,
    fontWeight: '900',
  },
  publicSpineDashedLine: {
    backgroundColor: '#CBD5E1',
    height: 38,
    marginVertical: 3,
    width: 2,
  },
  publicSpinePointB: {
    alignItems: 'center',
    backgroundColor: '#FFEDD5',
    borderColor: '#EA580C',
    borderRadius: 10,
    borderWidth: 1.5,
    height: 20,
    justifyContent: 'center',
    width: 20,
  },
  publicSpinePointTextB: {
    color: '#C2410C',
    fontSize: 10,
    fontWeight: '900',
  },
  publicSpineLabelsCol: {
    flex: 1,
    gap: 6,
  },
  publicPointBlock: {
    gap: 2,
  },
  publicPointSubA: {
    color: '#15803D',
    fontSize: 10.5,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  publicPointTitleA: {
    color: '#0F172A',
    fontSize: 14,
    fontWeight: '800',
  },
  publicDistanceChip: {
    alignItems: 'center',
    backgroundColor: '#F0F4F9',
    borderRadius: radius.pill,
    flexDirection: 'row',
    gap: 3,
    paddingHorizontal: 7,
    paddingVertical: 2,
  },
  publicDistanceChipText: {
    color: '#061226',
    fontSize: 10.5,
    fontWeight: '700',
  },
  publicDistanceBetweenRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 4,
    paddingVertical: 1,
  },
  publicDistanceBetweenText: {
    color: '#0B1E42',
    fontSize: 11.5,
    fontWeight: '700',
  },
  publicPointSubB: {
    color: '#EA580C',
    fontSize: 10.5,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  publicPointTitleB: {
    color: '#0F172A',
    fontSize: 14,
    fontWeight: '800',
  },
  publicRouteMetaFooter: {
    borderTopColor: '#F1F5F9',
    borderTopWidth: 1,
    paddingTop: 8,
  },
  publicRouteMetaText: {
    color: '#64748B',
    fontSize: 12,
    fontWeight: '600',
  },
  publicSpecsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  publicSpecCell: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderColor: '#E2E8F0',
    borderRadius: 10,
    borderWidth: 1,
    flexBasis: '48%',
    flexDirection: 'row',
    flexGrow: 1,
    gap: 8,
    padding: 10,
  },
  specCellIconOuter: {
    alignItems: 'center',
    backgroundColor: '#F0F4F9',
    borderRadius: 8,
    height: 32,
    justifyContent: 'center',
    width: 32,
  },
  specCellTextCol: {
    flex: 1,
  },
  specCellLabel: {
    color: '#64748B',
    fontSize: 9.5,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  specCellValue: {
    color: '#0F172A',
    fontSize: 12.5,
    fontWeight: '800',
    marginTop: 1,
  },
  publicDispatchNotice: {
    alignItems: 'flex-start',
    backgroundColor: '#EFF6FF',
    borderColor: '#BFDBFE',
    borderRadius: 12,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 10,
    padding: spacing.md,
  },
  noticeIconCircle: {
    alignItems: 'center',
    backgroundColor: '#DBEAFE',
    borderRadius: 16,
    height: 32,
    justifyContent: 'center',
    width: 32,
  },
  noticeTextCol: {
    flex: 1,
    gap: 2,
  },
  noticeHeader: {
    color: '#1E40AF',
    fontSize: 13,
    fontWeight: '800',
  },
  noticeBodyText: {
    color: '#1E3A8A',
    fontSize: 12,
    lineHeight: 17,
  },
  publicPrivacyCard: {
    backgroundColor: '#F8FAFC',
    borderColor: '#E2E8F0',
    borderRadius: 10,
    borderWidth: 1,
    gap: 4,
    padding: spacing.md,
  },
  publicPrivacyTitle: {
    color: '#475569',
    fontSize: 12,
    fontWeight: '800',
  },
});
