import { useEffect, useRef, useState } from 'react';
import { Alert, Linking, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import {
  Avatar,
  Badge,
  Box,
  Button,
  Card,
  Divider,
  EtaIndicator,
  HStack,
  IconCheck,
  IconClock,
  IconCopy,
  IconExternalLink,
  IconLocationPin,
  IconMessage,
  IconPhone,
  IconShieldAlert,
  MapPanel,
  RouteMapSchematic,
  RouteSpine,
  ScreenScaffold,
  ScreenState,
  StatusBadge,
  StatusTimeline,
  VStack,
  colors,
  customerPalette,
  iosContinuousCurve,
  layout,
  leopardPalette,
  radius,
  spacing,
  typeScale,
  typography,
} from '@leopard/mobile-core';
import { MediaImage } from '@leopard/mobile-core';
import type { OrderStatus } from '@leopard/shared';
import type {
  CustomerDetailContentView,
  CustomerDetailView,
  CustomerTrackingView,
} from './model';

/**
 * What the driver is doing right now, in the customer's words. Driven by the
 * order status the driver's cockpit writes, so the label flips the moment the
 * driver taps the next mission step.
 */
export function describeDriverStage(status: OrderStatus): string {
  switch (status) {
    case 'ACCEPTED':
      return 'Tài xế đã nhận đơn, đang chuẩn bị di chuyển';
    case 'PICKING_UP':
      return 'Tài xế đang đến điểm lấy hàng';
    case 'IN_TRANSIT':
      return 'Tài xế đang trên đường giao hàng';
    case 'RETURNING':
      return 'Tài xế đang hoàn trả hàng về điểm lấy';
    case 'RETURNED':
      return 'Hàng đã được hoàn trả về điểm lấy';
    case 'INCIDENT_CANCELLED':
      return 'Chuyến đã dừng do sự cố';
    default:
      return 'Đang điều phối tài xế';
  }
}

/** Latest driver coordinate carried by a tracking view, when there is one. */
export function resolveTruckLocation(
  tracking: CustomerTrackingView,
): { lat: number; lng: number } | undefined {
  if ('coords' in tracking && tracking.coords) return tracking.coords;
  if ('point' in tracking && tracking.point) {
    return { lat: tracking.point.latitude, lng: tracking.point.longitude };
  }
  return undefined;
}

export type DriverRouteWaypoint = Readonly<{
  id: string;
  name: string;
  label: string;
  coords?: { lat: number; lng: number };
}>;

function haversineKm(
  a: { lat: number; lng: number },
  b: { lat: number; lng: number },
): number {
  const earthRadiusKm = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const lat1 = (a.lat * Math.PI) / 180;
  const lat2 = (b.lat * Math.PI) / 180;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * earthRadiusKm * Math.asin(Math.min(1, Math.sqrt(h)));
}

/**
 * Names the route point the driver is nearest to right now.
 *
 * The customer payload carries no per-stop progress events, so this reads the
 * live coordinate against the route the customer already has. It says "gần"
 * (near) rather than claiming a stop was reached — arrival is the driver's
 * statement to make, not ours to infer.
 */
export function describeDriverPosition(
  coords: { lat: number; lng: number } | undefined,
  waypoints: readonly DriverRouteWaypoint[],
): Readonly<{ name: string; label: string; distanceLabel: string }> | null {
  if (!coords) return null;

  let nearest: DriverRouteWaypoint | null = null;
  let nearestKm = Number.POSITIVE_INFINITY;

  for (const waypoint of waypoints) {
    if (!waypoint.coords) continue;
    const km = haversineKm(coords, waypoint.coords);
    if (km < nearestKm) {
      nearestKm = km;
      nearest = waypoint;
    }
  }

  if (!nearest) return null;

  const distanceLabel =
    nearestKm < 1
      ? `${Math.round(nearestKm * 1000)} m`
      : `${nearestKm.toFixed(1)} km`;

  return { name: nearest.name, label: nearest.label, distanceLabel };
}

export type CustomerOrderDetailScreenProps = Readonly<{
  view: CustomerDetailView;
  onBack?: () => void;
  onPrimaryAction?: (actionId: string) => void;
  onPaymentAction?: (actionId: string) => void;
  onCancel?: (actionId: string, reason?: string) => void;
  onRetry?: () => void;
  onPickCargoImage?: () => void;
  onOpenTracking?: (orderId: string) => void;
  onOpenInvoice?: (invoiceId: string) => void;
  onSendInvoiceEmail?: (invoiceId: string, email: string) => void;
}>;

const CANCEL_REASONS: readonly string[] = [
  'Đặt nhầm địa chỉ',
  'Đổi thời gian giao hàng',
  'Cước phí quá cao',
  'Tìm được phương tiện khác',
];

function CancelOrderSheet({
  onConfirm,
  onDismiss,
}: Readonly<{
  onConfirm: (reason: string) => void;
  onDismiss: () => void;
}>) {
  const [selected, setSelected] = useState<string | null>(null);
  const [customReason, setCustomReason] = useState('');
  const [error, setError] = useState<string | null>(null);

  const handleConfirm = () => {
    const reason =
      selected === '__OTHER__' ? customReason.trim() : selected?.trim() ?? '';
    if (!reason) {
      setError('Vui lòng chọn hoặc nhập lý do hủy đơn.');
      return;
    }
    setError(null);
    onConfirm(reason);
  };

  return (
    <Box style={styles.cancelOverlay}>
      <Pressable
        accessibilityLabel="Đóng"
        accessibilityRole="button"
        hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
        onPress={onDismiss}
        style={styles.cancelBackdrop}
      />
      <Card style={styles.cancelSheet}>
        <Text style={styles.cancelSheetTitle}>Hủy đơn hàng</Text>
        <Text style={styles.cancelSheetSubtitle}>
          Vui lòng cho biết lý do để hệ thống cải thiện chất lượng dịch vụ.
        </Text>
        <VStack space="xs">
          {CANCEL_REASONS.map((reasonOption) => {
            const isSelected = selected === reasonOption;
            return (
              <Pressable
                key={reasonOption}
                accessibilityLabel={`Lý do: ${reasonOption}`}
                accessibilityRole="button"
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                onPress={() => {
                  setSelected(reasonOption);
                  setError(null);
                }}
                style={({ pressed }) => [
                  styles.cancelOption,
                  isSelected ? styles.cancelOptionSelected : null,
                  pressed ? styles.pressed : null,
                ]}
              >
                <Box style={[styles.cancelRadio, isSelected ? styles.cancelRadioSelected : null]}>
                  {isSelected ? <Box style={styles.cancelRadioDot} /> : null}
                </Box>
                <Text
                  style={[
                    styles.cancelOptionText,
                    isSelected ? styles.cancelOptionTextSelected : null,
                  ]}
                >
                  {reasonOption}
                </Text>
              </Pressable>
            );
          })}
          <Pressable
            accessibilityLabel="Lý do: Khác"
            accessibilityRole="button"
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            onPress={() => {
              setSelected('__OTHER__');
              setError(null);
            }}
            style={({ pressed }) => [
              styles.cancelOption,
              selected === '__OTHER__' ? styles.cancelOptionSelected : null,
              pressed ? styles.pressed : null,
            ]}
          >
            <Box
              style={[
                styles.cancelRadio,
                selected === '__OTHER__' ? styles.cancelRadioSelected : null,
              ]}
            >
              {selected === '__OTHER__' ? <Box style={styles.cancelRadioDot} /> : null}
            </Box>
            <Text
              style={[
                styles.cancelOptionText,
                selected === '__OTHER__' ? styles.cancelOptionTextSelected : null,
              ]}
            >
              Lý do khác
            </Text>
          </Pressable>
        </VStack>
        {selected === '__OTHER__' ? (
          <TextInput
            accessibilityLabel="Nhập lý do hủy đơn"
            multiline
            onChangeText={(value) => {
              setCustomReason(value);
              setError(null);
            }}
            placeholder="Nhập lý do hủy đơn…"
            placeholderTextColor={leopardPalette.inputPlaceholder}
            style={styles.cancelInput}
            value={customReason}
          />
        ) : null}
        {error ? <Text style={styles.cancelErrorText}>{error}</Text> : null}
        <HStack space="sm" style={styles.cancelSheetActions}>
          <Box style={styles.cancelSheetActionFlex}>
            <Button label="Quay lại" onPress={onDismiss} variant="secondary" />
          </Box>
          <Box style={styles.cancelSheetActionFlex}>
            <Button label="Xác nhận hủy" onPress={handleConfirm} variant="destructive" />
          </Box>
        </HStack>
      </Card>
    </Box>
  );
}

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function InvoiceSection({
  invoice,
  onOpenInvoice,
  onSendInvoiceEmail,
}: Readonly<{
  invoice: NonNullable<CustomerDetailContentView['order']['invoice']>;
  onOpenInvoice?: (invoiceId: string) => void;
  onSendInvoiceEmail?: (invoiceId: string, email: string) => void;
}>) {
  const [email, setEmail] = useState('');
  const [emailError, setEmailError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  const handleSend = () => {
    const trimmed = email.trim();
    if (!EMAIL_PATTERN.test(trimmed)) {
      setEmailError('Email không hợp lệ.');
      return;
    }
    setEmailError(null);
    setSent(true);
    onSendInvoiceEmail?.(invoice.id, trimmed);
  };

  return (
    <Card style={styles.modernCard}>
      <VStack style={styles.cardHeader}>
        <Text accessibilityRole="header" style={styles.cardTitle}>
          Hóa đơn
        </Text>
        <Text style={styles.cardSubtitle}>Hóa đơn tự phát hành cho đơn hàng này</Text>
      </VStack>

      <VStack space="xs" style={styles.paymentDetailsBox}>
        <HStack style={styles.paymentDetailRow}>
          <Text style={styles.paymentDetailLabel}>Số hóa đơn</Text>
          <Text style={styles.paymentDetailValue}>{invoice.invoiceNumber}</Text>
        </HStack>
        <HStack style={styles.paymentDetailRow}>
          <Text style={styles.paymentDetailLabel}>Tổng tiền</Text>
          <Text style={styles.paymentDetailValue}>{invoice.totalLabel}</Text>
        </HStack>
        <HStack style={styles.paymentDetailRow}>
          <Text style={styles.paymentDetailLabel}>Ngày phát hành</Text>
          <Text style={styles.paymentDetailValue}>{invoice.issuedAtLabel}</Text>
        </HStack>
      </VStack>

      <Button
        label="Xem hóa đơn"
        onPress={() => onOpenInvoice?.(invoice.id)}
        variant="secondary"
      />

      {invoice.emailSentAt === null ? (
        <VStack space="xs" style={styles.invoiceEmailPrompt}>
          <Text style={styles.helper}>
            Chưa có email nhận hóa đơn. Nhập email để nhận liên kết xem/tải hóa đơn.
          </Text>
          <TextInput
            accessibilityLabel="Email nhận hóa đơn"
            autoCapitalize="none"
            keyboardType="email-address"
            onChangeText={(value) => {
              setEmail(value);
              setSent(false);
            }}
            placeholder="ban@vidu.com"
            style={styles.invoiceEmailInput}
            value={email}
          />
          {emailError ? <Text style={styles.warningText}>{emailError}</Text> : null}
          {sent && !emailError ? (
            <Text style={styles.paymentNoticeText}>Đã gửi yêu cầu gửi hóa đơn qua email.</Text>
          ) : null}
          <Button label="Gửi email hóa đơn" onPress={handleSend} variant="primary" />
        </VStack>
      ) : (
        <Text style={styles.helper}>Đã gửi email hóa đơn.</Text>
      )}
    </Card>
  );
}

function DriverCard({
  distanceMeters,
  driverLabel,
  driverPhone,
  etaDurationSeconds,
  onOpenTracking,
  orderId,
  status = 'Tài xế nhận chuyến',
  vehicleLabel,
}: Readonly<{
  driverLabel: string;
  driverPhone?: string | null;
  status?: string;
  vehicleLabel?: string | null;
  onOpenTracking?: (orderId: string) => void;
  etaDurationSeconds?: number | null;
  distanceMeters?: number | null;
  orderId?: string;
}>) {
  const initial = driverLabel.replace(/^Tài xế\s*/i, '').trim().charAt(0) || 'T';

  const handleCall = () => {
    const phoneToCall = driverPhone || '0901234567';
    void Linking.openURL(`tel:${phoneToCall}`).catch(() => {
      Alert.alert('Gọi tài xế', `Số điện thoại liên hệ: ${phoneToCall}`);
    });
  };

  const handleMessage = () => {
    Alert.alert('Nhắn tin', `Gửi tin nhắn trực tiếp đến tài xế ${driverLabel}`);
  };

  return (
    <Card style={styles.driverCard}>
      <HStack style={styles.driverMainRow}>
        <Avatar size="md" style={styles.driverAvatar}>
          <Avatar.FallbackText style={styles.driverAvatarText}>{initial}</Avatar.FallbackText>
        </Avatar>
        <VStack style={styles.driverInfo}>
          <HStack style={styles.driverNameRow}>
            <Text style={styles.driverName}>{driverLabel}</Text>
            <Badge action="warning" size="sm" style={styles.driverRatingPill}>
              <Badge.Text style={styles.driverRatingText}>★ 4.9</Badge.Text>
            </Badge>
          </HStack>
          <Text style={styles.driverVehicleText}>{vehicleLabel || 'Xe vận chuyển'} · {status}</Text>
        </VStack>
        <HStack style={styles.driverActions}>
          <Pressable
            accessibilityLabel="Gọi điện cho tài xế"
            accessibilityRole="button"
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            onPress={handleCall}
            style={({ pressed }) => [styles.driverCallBtn, pressed ? styles.pressed : null]}
          >
            <IconPhone color={leopardPalette.ecoGreen} size={17} />
          </Pressable>
          <Pressable
            accessibilityLabel="Nhắn tin cho tài xế"
            accessibilityRole="button"
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            onPress={handleMessage}
            style={({ pressed }) => [styles.driverMessageBtn, pressed ? styles.pressed : null]}
          >
            <IconMessage color={customerPalette.primary} size={17} />
          </Pressable>
        </HStack>
      </HStack>

      {/* Mini Progress / Live ETA Bar */}
      {typeof etaDurationSeconds === 'number' && !Number.isNaN(etaDurationSeconds) ? (
        <HStack style={styles.driverEtaBar}>
          <HStack style={styles.driverEtaLeft}>
            <IconClock color={customerPalette.primary} size={17} />
            <VStack>
              <Text style={styles.driverEtaSub}>Dự kiến giao hàng (ETA dự kiến)</Text>
              <Text style={styles.driverEtaMain}>
                ~{Math.round(etaDurationSeconds / 60)} phút
                {distanceMeters ? ` (Còn ${(distanceMeters / 1000).toFixed(1)} km)` : ''}
              </Text>
            </VStack>
          </HStack>
          {onOpenTracking && orderId ? (
            <Pressable
              accessibilityLabel="Xem GPS"
              accessibilityRole="button"
              onPress={() => onOpenTracking(orderId)}
              style={({ pressed }) => [styles.driverGpsLink, pressed ? styles.pressed : null]}
            >
              <Text style={styles.driverGpsLinkText}>Xem GPS</Text>
              <IconExternalLink color={customerPalette.primary} size={13} />
            </Pressable>
          ) : null}
        </HStack>
      ) : null}
    </Card>
  );
}

function TrackingPanel({
  destinationLabel,
  destinationCoords,
  distanceMeters,
  driverPhone,
  etaDurationSeconds,
  onOpenTracking,
  onRetry,
  orderId,
  orderStatus,
  originLabel,
  originCoords,
  stops,
  tracking,
  vehicleLabel,
}: Readonly<{
  tracking: CustomerTrackingView;
  orderStatus: OrderStatus;
  onRetry?: () => void;
  originLabel: string;
  originCoords?: { lat: number; lng: number };
  destinationLabel: string;
  destinationCoords?: { lat: number; lng: number };
  stops?: readonly { id: string; label: string; coords?: { lat: number; lng: number } }[];
  onOpenTracking?: (orderId: string) => void;
  etaDurationSeconds?: number | null;
  distanceMeters?: number | null;
  orderId?: string;
  driverPhone?: string | null;
  vehicleLabel?: string | null;
}>) {
  const truckLocation = resolveTruckLocation(tracking);
  const stageLabel = describeDriverStage(orderStatus);
  const waypoints: readonly DriverRouteWaypoint[] = [
    { id: 'origin', name: 'Điểm lấy hàng (A)', label: originLabel, coords: originCoords },
    ...(stops ?? []).map((stop, index) => ({
      id: stop.id,
      name: `Điểm dừng ${index + 1}`,
      label: stop.label,
      coords: stop.coords,
    })),
    {
      id: 'destination',
      name: 'Điểm giao hàng (B)',
      label: destinationLabel,
      coords: destinationCoords,
    },
  ];
  const position = describeDriverPosition(truckLocation, waypoints);
  const positionStrip = position ? (
    <HStack space="xs" style={styles.driverPositionStrip} testID="driver-position-strip">
      <IconLocationPin color={customerPalette.primary} size={14} />
      <Text style={styles.driverPositionText}>
        Tài xế đang ở gần <Text style={styles.driverPositionName}>{position.name}</Text> · cách{' '}
        {position.distanceLabel}
      </Text>
    </HStack>
  ) : null;

  if (tracking.kind === 'loading') {
    return <MapPanel state="loading" summary="Bản đồ lộ trình đang tải" />;
  }
  if (tracking.kind === 'map-error') {
    return (
      <View style={styles.section}>
        <Text style={styles.driverText}>{tracking.driverLabel}</Text>
        <MapPanel
          fallbackMessage={tracking.message}
          onRetry={onRetry}
          state="fallback"
          summary="Bản đồ lộ trình chưa khả dụng"
        />
      </View>
    );
  }
  if (tracking.kind === 'no-driver') {
    return (
      <View style={styles.section}>
        <View style={styles.infoBanner}>
          <Text style={styles.body}>{tracking.message}</Text>
        </View>
        <MapPanel state="ready" summary="Bản đồ lộ trình; chưa có tài xế">
          <RouteMapSchematic
            destinationCoords={destinationCoords}
            destinationLabel={destinationLabel}
            originCoords={originCoords}
            originLabel={originLabel}
            stops={stops}
          />
        </MapPanel>
      </View>
    );
  }
  if (tracking.kind === 'no-location') {
    return (
      <View style={styles.section}>
        <DriverCard
          distanceMeters={distanceMeters}
          driverLabel={tracking.driverLabel}
          driverPhone={driverPhone}
          etaDurationSeconds={etaDurationSeconds}
          onOpenTracking={onOpenTracking}
          orderId={orderId}
          status={stageLabel}
          vehicleLabel={vehicleLabel}
        />
        <View style={styles.infoBanner}>
          <Text style={styles.body}>{tracking.message}</Text>
        </View>
        <MapPanel state="ready" summary="Bản đồ lộ trình; chưa có vị trí tài xế">
          <RouteMapSchematic
            destinationCoords={destinationCoords}
            destinationLabel={destinationLabel}
            originCoords={originCoords}
            originLabel={originLabel}
            stops={stops}
          />
        </MapPanel>
      </View>
    );
  }
  const mapContent = (
    <RouteMapSchematic
      destinationCoords={destinationCoords}
      destinationLabel={destinationLabel}
      markerLabel={`${tracking.driverLabel} (${stageLabel})`}
      originCoords={originCoords}
      originLabel={originLabel}
      stops={stops}
      truckLocation={truckLocation}
    />
  );
  if (tracking.kind === 'fresh') {
    return (
      <View style={styles.section}>
        <DriverCard
          distanceMeters={distanceMeters}
          driverLabel={tracking.driverLabel}
          driverPhone={driverPhone}
          etaDurationSeconds={etaDurationSeconds}
          onOpenTracking={onOpenTracking}
          orderId={orderId}
          status={stageLabel}
          vehicleLabel={vehicleLabel}
        />
        <View style={styles.freshnessRow}>
          <View style={styles.pulseDotGreen} />
          <Text style={styles.helper}>Cập nhật lần cuối: {tracking.lastUpdatedLabel}</Text>
        </View>
        {positionStrip}
        <MapPanel state="ready" summary={tracking.summary}>
          {mapContent}
        </MapPanel>
      </View>
    );
  }
  return (
    <View style={styles.section}>
      <DriverCard
        distanceMeters={distanceMeters}
        driverLabel={tracking.driverLabel}
        driverPhone={driverPhone}
        etaDurationSeconds={etaDurationSeconds}
        onOpenTracking={onOpenTracking}
        orderId={orderId}
        status={stageLabel}
        vehicleLabel={vehicleLabel}
      />
      <View style={styles.warningBanner}>
        <Text style={styles.body}>{tracking.message}</Text>
      </View>
      <Text style={styles.helper}>Cập nhật lần cuối: {tracking.lastUpdatedLabel}</Text>
      {positionStrip}
      <MapPanel
        lastUpdatedLabel={tracking.lastUpdatedLabel}
        onRetry={onRetry}
        state="stale"
        summary={tracking.summary}
      >
        {mapContent}
      </MapPanel>
    </View>
  );
}

function CustomerDetailContent({
  onBack,
  onCancel,
  onOpenInvoice,
  onOpenTracking,
  onPaymentAction,
  onPickCargoImage,
  onPrimaryAction,
  onRetry,
  onSendInvoiceEmail,
  view,
}: Readonly<{
  view: CustomerDetailContentView;
  onBack?: () => void;
  onPrimaryAction?: (actionId: string) => void;
  onPaymentAction?: (actionId: string) => void;
  onCancel?: (actionId: string, reason?: string) => void;
  onRetry?: () => void;
  onPickCargoImage?: () => void;
  onOpenTracking?: (orderId: string) => void;
  onOpenInvoice?: (invoiceId: string) => void;
  onSendInvoiceEmail?: (invoiceId: string, email: string) => void;
}>) {
  const order = view.order;
  const cancelAction = 'action' in view.cancel ? view.cancel.action : null;
  const [copied, setCopied] = useState(false);
  const [showCancelSheet, setShowCancelSheet] = useState(false);
  const copyTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (copyTimeoutRef.current) {
        clearTimeout(copyTimeoutRef.current);
      }
    };
  }, []);

  const handleCopyOrderCode = () => {
    if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
      void navigator.clipboard.writeText(order.reference);
    }
    setCopied(true);
    if (copyTimeoutRef.current) {
      clearTimeout(copyTimeoutRef.current);
    }
    copyTimeoutRef.current = setTimeout(() => setCopied(false), 2000);
  };

  const isUnpaid = (order.payment.status === 'UNPAID' || order.payment.status === 'QR_CREATED')
    && order.status !== 'CANCELLED' && order.status !== 'DELIVERED';
  const showEta = typeof order.etaDurationSeconds === 'number'
    && !Number.isNaN(order.etaDurationSeconds)
    && order.status !== 'CANCELLED'
    && order.status !== 'DELIVERED';

  return (
    <ScreenScaffold
      onBack={onBack}
      title={`Đơn ${order.reference}`}
    >
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* 1. Sticky-style Top Meta Bar (Mã đơn + nút copy 1-chạm + Badge trạng thái) */}
        <HStack style={styles.topMetaBar}>
          <VStack style={styles.topMetaLeft}>
            <HStack style={styles.orderCodeRow}>
              <Text style={styles.orderCodeText}>{order.reference}</Text>
              <Pressable
                accessibilityLabel="Sao chép mã đơn hàng"
                accessibilityRole="button"
                hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                onPress={handleCopyOrderCode}
                style={({ pressed }) => [styles.copyBtn, pressed ? styles.pressed : null]}
              >
                {copied ? (
                  <HStack style={styles.copiedRow}>
                    <IconCheck color={colors.success.text} size={13} />
                    <Text style={styles.copiedText}>Đã chép</Text>
                  </HStack>
                ) : (
                  <HStack style={styles.copyBtnRow}>
                    <IconCopy color={customerPalette.primary} size={13} />
                    <Text style={styles.copyBtnText}>Sao chép</Text>
                  </HStack>
                )}
              </Pressable>
            </HStack>
            <Text style={styles.orderCreatedTime}>Tạo lúc {order.updatedAtLabel}</Text>
          </VStack>
          <Box style={styles.topMetaRight}>
            <StatusBadge domain="order" status={order.status} />
          </Box>
        </HStack>

        {/* 1b. Thẻ hiển thị lý do hủy khi đơn CANCELLED */}
        {order.status === 'CANCELLED' ? (
          <Card style={styles.cancelledReasonCard}>
            <HStack style={styles.cancelledReasonHeader}>
              <Box style={styles.cancelledDot} />
              <Text style={styles.cancelledReasonTitle}>Lý do hủy đơn</Text>
            </HStack>
            <Text style={styles.cancelledReasonContent}>
              {order.cancelReason?.trim() || 'Khách hàng hủy đơn'}
            </Text>
            <Text style={styles.cancelledReasonTime}>Hủy vào lúc {order.updatedAtLabel}</Text>
          </Card>
        ) : null}

        {/* 2. Thẻ Cảnh Báo Thanh Toán Cấp Bách (Urgent Payment Card) */}
        {isUnpaid ? (
          <Card style={styles.urgentPaymentCard}>
            <HStack style={styles.urgentPaymentTop}>
              <HStack style={styles.urgentPaymentTitleWrap}>
                <IconShieldAlert color={colors.warning.text} size={20} />
                <VStack style={styles.urgentPaymentTextWrap}>
                  <Text style={styles.urgentPaymentTitle}>Đơn hàng chưa thanh toán</Text>
                  <Text style={styles.urgentPaymentSub}>Thanh toán cước phí bằng VietQR Napas247</Text>
                </VStack>
              </HStack>
              <Text style={styles.urgentPaymentAmount}>{order.payment.amountLabel}</Text>
            </HStack>

            {order.payment.notice ? (
              <Box style={styles.urgentNoticeBox}>
                <Text style={styles.urgentNoticeText}>{order.payment.notice}</Text>
              </Box>
            ) : null}

            {order.payment.action ? (
              <Box style={styles.urgentPaymentBtnWrap}>
                <Button
                  disabled={order.payment.action.disabled}
                  isLoading={order.payment.action.isPending}
                  label={order.payment.action.label}
                  loadingLabel={order.payment.action.pendingLabel}
                  onPress={
                    onPaymentAction ? () => onPaymentAction(order.payment.action!.id) : undefined
                  }
                  variant="primary"
                />
              </Box>
            ) : null}
          </Card>
        ) : null}

        {/* 3. Live Journey Hero Card (Tổng quan tiến độ & Cước phí) */}
        <Card style={styles.heroCard}>
          <HStack style={styles.heroTopRow}>
            <HStack style={styles.heroStatusWrap}>
              <Text style={styles.heroSectionTitle}>Tổng quan đơn hàng</Text>
              {order.status === 'IN_TRANSIT' ? (
                <Badge action="success" size="sm" style={styles.liveTagBadge}>
                  <Box style={styles.pulseDotGreen} />
                  <Badge.Text style={styles.liveTagText}>Đang giao</Badge.Text>
                </Badge>
              ) : null}
            </HStack>
            <Text style={styles.heroPrice}>{order.priceLabel}</Text>
          </HStack>

          <Divider style={styles.heroDivider} />

          <HStack style={styles.heroStatsRow}>
            <VStack style={styles.heroStatItem}>
              <Text style={styles.heroStatLabel}>Cập nhật</Text>
              <Text style={styles.heroStatValue}>{order.updatedAtLabel}</Text>
            </VStack>
            <VStack style={styles.heroStatItem}>
              <Text style={styles.heroStatLabel}>Loại xe</Text>
              <Text style={styles.heroStatValue}>{order.requestedVehicleLabel || 'Xe Tải'}</Text>
            </VStack>
            {order.distanceMeters ? (
              <VStack style={styles.heroStatItem}>
                <Text style={styles.heroStatLabel}>Quãng đường</Text>
                <Text style={styles.heroStatValue}>
                  {(order.distanceMeters / 1000).toFixed(1)} km
                </Text>
              </VStack>
            ) : null}
            {showEta ? (
              <VStack style={styles.heroStatItem}>
                <Text style={styles.heroStatLabel}>ETA dự kiến</Text>
                <Text style={styles.heroStatValue}>
                  ~{Math.round(order.etaDurationSeconds as number / 60)} phút
                </Text>
              </VStack>
            ) : null}
          </HStack>

          {showEta ? (
            <Box style={styles.etaIndicatorBox}>
              <EtaIndicator
                durationSeconds={order.etaDurationSeconds as number}
                source={order.etaSource}
              />
            </Box>
          ) : null}
        </Card>

        {view.notice ? (
          <Box style={styles.notice}>
            <Text style={styles.warningText}>{view.notice}</Text>
          </Box>
        ) : null}

        {/* 4. Visual Tracking Preview & Map Panel */}
        <Card style={styles.modernCard}>
          <VStack style={styles.cardHeader}>
            <Text accessibilityRole="header" style={styles.cardTitle}>
              Bản đồ hành trình
            </Text>
            <Text style={styles.cardSubtitle}>Vị trí xe và lộ trình theo thời gian thực</Text>
          </VStack>

          <TrackingPanel
            destinationCoords={order.route.destination.coords}
            destinationLabel={order.route.destination.label}
            distanceMeters={order.distanceMeters}
            driverPhone={order.assignedDriver?.phone}
            etaDurationSeconds={order.etaDurationSeconds}
            onOpenTracking={onOpenTracking}
            onRetry={onRetry}
            orderId={order.id}
            orderStatus={order.status}
            originCoords={order.route.origin.coords}
            originLabel={order.route.origin.label}
            stops={order.route.stops}
            tracking={order.tracking}
            vehicleLabel={order.requestedVehicleLabel}
          />

          {/* 🚀 Nút liên kết chuyển tiếp sang trang Tracking toàn màn hình */}
          {/* Chỉ hiện khi đã có tài xế nhận chuyến — ẩn với REQUESTED / no-driver */}
          {order.status !== 'REQUESTED' && order.tracking.kind !== 'no-driver' ? (
            <Pressable
              accessibilityHint="Mở bản đồ theo dõi GPS toàn màn hình"
              accessibilityLabel="Xem bản đồ theo dõi trực tiếp"
              accessibilityRole="button"
              onPress={() => onOpenTracking?.(order.id)}
              style={({ pressed }) => [
                styles.trackingLinkBtn,
                pressed ? styles.pressed : null,
              ]}
            >
              <Box style={styles.trackingLinkIconBox}>
                <IconLocationPin color={customerPalette.primary} size={18} />
              </Box>
              <VStack style={styles.trackingLinkTextWrap}>
                <Text style={styles.trackingLinkTitle}>Xem bản đồ theo dõi trực tiếp ➔</Text>
                <Text style={styles.trackingLinkSubtitle}>
                  Giám sát lộ trình GPS thời gian thực toàn màn hình
                </Text>
              </VStack>
            </Pressable>
          ) : null}
        </Card>

        {/* 5. Section: Route */}
        <Card style={styles.modernCard}>
          <VStack style={styles.cardHeader}>
            <Text accessibilityRole="header" style={styles.cardTitle}>
              Lộ trình vận chuyển
            </Text>
            <Text style={styles.cardSubtitle}>Điểm lấy, các điểm dừng và điểm giao hàng</Text>
          </VStack>
          <RouteSpine
            destination={order.route.destination}
            origin={order.route.origin}
            stops={order.route.stops}
          />
        </Card>

        {/* 6. Section: Cargo Specs & Media */}
        <Card style={styles.modernCard}>
          <VStack style={styles.cardHeader}>
            <Text accessibilityRole="header" style={styles.cardTitle}>
              Minh chứng hàng hóa
            </Text>
            <Text style={styles.cardSubtitle}>Quy cách hàng hóa và hình ảnh đính kèm</Text>
          </VStack>

          <Box style={styles.cargoSpecsGrid}>
            <VStack style={styles.cargoGridItem}>
              <Text style={styles.cargoGridLabel}>Mặt hàng</Text>
              <Text style={styles.cargoGridValue}>{order.cargo.note || 'Hàng tổng hợp'}</Text>
            </VStack>
            <VStack style={styles.cargoGridItem}>
              <Text style={styles.cargoGridLabel}>Khối lượng</Text>
              <Text style={styles.cargoGridValue}>
                {order.cargo.weightKg ? `${order.cargo.weightKg} kg` : '—'}
              </Text>
            </VStack>
            <VStack style={styles.cargoGridItem}>
              <Text style={styles.cargoGridLabel}>Dịch vụ đi kèm</Text>
              <Text style={[styles.cargoGridValue, { color: customerPalette.primary }]}>
                {order.hasLoadingSupport ? 'Có bốc xếp 2 đầu' : 'Tự bốc xếp'}
              </Text>
            </VStack>
            <VStack style={styles.cargoGridItem}>
              <Text style={styles.cargoGridLabel}>Người nhận</Text>
              <Text style={styles.cargoGridValue} numberOfLines={1}>
                {order.route.destination.label.split(',')[0]}
              </Text>
            </VStack>
          </Box>

          <HStack style={styles.mediaGrid}>
            <Card style={styles.mediaTile}>
              <Text style={styles.mediaIndex}>01</Text>
              <Text style={styles.mediaLabel}>Ảnh hàng hóa</Text>
              {order.media.mediaId ? (
                <MediaImage mediaId={order.media.mediaId} />
              ) : onPickCargoImage ? (
                <Button label="Tải ảnh lên" onPress={onPickCargoImage} variant="secondary" />
              ) : (
                <Text style={styles.helper}>Chưa có ảnh</Text>
              )}
            </Card>
          </HStack>
        </Card>

        {/* 6b. Section: Chi tiết cước phí (Price Breakdown) */}
        <Card style={styles.modernCard}>
          <VStack style={styles.cardHeader}>
            <Text accessibilityRole="header" style={styles.cardTitle}>
              Chi tiết cước phí
            </Text>
            <Text style={styles.cardSubtitle}>
              Cơ cấu tính giá: {order.requestedVehicleLabel || 'Xe vận chuyển'}
            </Text>
          </VStack>

          <VStack space="xs" style={styles.paymentCardContent}>
            <VStack space="xs" style={styles.paymentDetailsBox}>
              <HStack style={styles.paymentDetailRow}>
                <Text style={styles.paymentDetailLabel}>
                  Cước mở cửa ({order.requestedVehicleLabel || 'Xe vận chuyển'})
                </Text>
                <Text style={styles.paymentDetailValue}>
                  {order.priceBreakdown?.baseFareVnd ? `${order.priceBreakdown.baseFareVnd.toLocaleString('vi-VN')} ₫` : '—'}
                </Text>
              </HStack>

              <HStack style={styles.paymentDetailRow}>
                <Text style={styles.paymentDetailLabel}>
                  Cước quãng đường {order.distanceMeters ? `(${(order.distanceMeters / 1000).toFixed(1)} km)` : ''}
                </Text>
                <Text style={styles.paymentDetailValue}>
                  {order.priceBreakdown?.distanceFareVnd !== undefined
                    ? `${order.priceBreakdown.distanceFareVnd.toLocaleString('vi-VN')} ₫`
                    : '—'}
                </Text>
              </HStack>

              {order.priceBreakdown?.stopSurchargeVnd ? (
                <HStack style={styles.paymentDetailRow}>
                  <Text style={styles.paymentDetailLabel}>Phụ phí điểm dừng</Text>
                  <Text style={styles.paymentDetailValue}>
                    +{order.priceBreakdown.stopSurchargeVnd.toLocaleString('vi-VN')} ₫
                  </Text>
                </HStack>
              ) : null}

              {order.priceBreakdown?.loadingFeeVnd ? (
                <HStack style={styles.paymentDetailRow}>
                  <Text style={styles.paymentDetailLabel}>Phí bốc xếp 2 đầu</Text>
                  <Text style={styles.paymentDetailValue}>
                    +{order.priceBreakdown.loadingFeeVnd.toLocaleString('vi-VN')} ₫
                  </Text>
                </HStack>
              ) : null}

              {order.priceBreakdown?.vatFeeVnd ? (
                <HStack style={styles.paymentDetailRow}>
                  <Text style={styles.paymentDetailLabel}>Thuế GTGT (VAT 8%)</Text>
                  <Text style={styles.paymentDetailValue}>
                    +{order.priceBreakdown.vatFeeVnd.toLocaleString('vi-VN')} ₫
                  </Text>
                </HStack>
              ) : null}
            </VStack>

            <Divider style={styles.heroDivider} />

            <HStack style={[styles.paymentTopRow, { marginTop: 10 }]}>
              <Text style={{ fontSize: typeScale.subheadline.fontSize, fontWeight: '600', color: customerPalette.primary }}>
                Tổng cước vận chuyển
              </Text>
              <Text style={styles.paymentAmount}>{order.priceLabel}</Text>
            </HStack>
          </VStack>
        </Card>

        {/* 7. Section: Payment & Financial Info */}
        <Card style={styles.modernCard}>
          <VStack style={styles.cardHeader}>
            <Text accessibilityRole="header" style={styles.cardTitle}>
              Thanh toán
            </Text>
            <Text style={styles.cardSubtitle}>Trạng thái thanh toán và thông tin cước phí</Text>
          </VStack>

          <VStack space="xs" style={styles.paymentCardContent}>
            <HStack style={styles.paymentTopRow}>
              <StatusBadge domain="payment" status={order.payment.status} />
              <Text style={styles.paymentAmount}>{order.payment.amountLabel}</Text>
            </HStack>

            <VStack space="xs" style={styles.paymentDetailsBox}>
              {order.payment.referenceLabel ? (
                <HStack style={styles.paymentDetailRow}>
                  <Text style={styles.paymentDetailLabel}>Mã tham chiếu</Text>
                  <Text style={styles.paymentDetailValue}>{order.payment.referenceLabel}</Text>
                </HStack>
              ) : null}
              {order.payment.sourceLabel ? (
                <HStack style={styles.paymentDetailRow}>
                  <Text style={styles.paymentDetailLabel}>Phương thức</Text>
                  <Text style={styles.paymentDetailValue}>{order.payment.sourceLabel}</Text>
                </HStack>
              ) : null}
              {order.payment.expiresAtLabel ? (
                <HStack style={styles.paymentDetailRow}>
                  <Text style={styles.paymentDetailLabel}>Hạn thanh toán</Text>
                  <Text style={styles.paymentDetailValue}>{order.payment.expiresAtLabel}</Text>
                </HStack>
              ) : null}
            </VStack>

            {!isUnpaid && order.payment.notice ? (
              <Box style={styles.paymentNoticeBox}>
                <Text style={styles.paymentNoticeText}>{order.payment.notice}</Text>
              </Box>
            ) : null}

            {!isUnpaid && order.payment.action ? (
              <Box style={styles.paymentActionWrap}>
                <Button
                  disabled={order.payment.action.disabled}
                  isLoading={order.payment.action.isPending}
                  label={order.payment.action.label}
                  loadingLabel={order.payment.action.pendingLabel}
                  onPress={
                    onPaymentAction ? () => onPaymentAction(order.payment.action!.id) : undefined
                  }
                  variant="secondary"
                />
              </Box>
            ) : null}
          </VStack>
        </Card>

        {/* 7b. Section: Invoice */}
        {order.invoice ? (
          <InvoiceSection
            invoice={order.invoice}
            onOpenInvoice={onOpenInvoice}
            onSendInvoiceEmail={onSendInvoiceEmail}
          />
        ) : null}

        {/* 8. Section: Timeline */}
        <StatusTimeline
          entries={order.history.map((h) => ({
            id: h.id,
            status: h.status,
            timestampLabel: h.timestampLabel,
            description: h.description,
            isActive: h.status === order.status,
            isCompleted: true,
          }))}
        />

        {/* 9. Action Buttons */}
        {view.actions.map((act) => (
          <Button
            key={act.id}
            disabled={act.disabled}
            isLoading={act.isPending}
            label={act.label}
            loadingLabel={act.pendingLabel}
            onPress={onPrimaryAction ? () => onPrimaryAction(act.id) : undefined}
          />
        ))}

        {cancelAction ? (
          <View style={styles.cancelSection}>
            <Button
              disabled={cancelAction.disabled}
              isLoading={cancelAction.isPending}
              label={cancelAction.label}
              onPress={() => setShowCancelSheet(true)}
              variant="destructive"
            />
          </View>
        ) : null}
      </ScrollView>

      {showCancelSheet && cancelAction ? (
        <CancelOrderSheet
          onConfirm={(reason) => {
            setShowCancelSheet(false);
            onCancel?.(cancelAction.id, reason);
          }}
          onDismiss={() => setShowCancelSheet(false)}
        />
      ) : null}
    </ScreenScaffold>
  );
}

export function CustomerOrderDetailScreen(props: CustomerOrderDetailScreenProps) {
  if (props.view.kind !== 'content') {
    return (
      <ScreenScaffold
        onBack={props.onBack}
        title="Chi tiết đơn hàng"
      >
        <ScreenState
          actionLabel={props.view.kind === 'error' ? 'Thử lại' : undefined}
          message={props.view.message}
          onAction={props.onRetry}
          state={props.view.kind}
          title={props.view.title}
        />
      </ScreenScaffold>
    );
  }
  return <CustomerDetailContent {...props} view={props.view} />;
}

const styles = StyleSheet.create({
  scrollContent: {
    gap: spacing.md,
    paddingBottom: layout.bottomNavClearance + 28,
  },
  section: {
    gap: spacing.sm,
  },
  heroCard: {
    backgroundColor: colors.neutral.surface,
    borderColor: colors.neutral.border,
    borderRadius: 16,
    borderWidth: 1,
    padding: spacing.md,
    gap: 12,
    shadowColor: colors.neutral.text,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  heroSectionTitle: {
    fontSize: typeScale.callout.fontSize,
    fontWeight: '600',
    color: colors.neutral.text,
  },
  heroTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  heroStatusWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  liveTagBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.success.background,
    borderColor: leopardPalette.ecoGreenSoft,
    borderWidth: 1,
    borderRadius: 6,
    paddingHorizontal: 7,
    paddingVertical: 2,
    gap: 5,
  },
  liveTagText: {
    color: colors.success.text,
    fontSize: typeScale.caption2.fontSize,
    fontWeight: '600',
  },
  heroPrice: {
    color: customerPalette.primary,
    ...typeScale.title3,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
  heroDivider: {
    height: 1,
    backgroundColor: colors.neutral.surfaceMuted,
  },
  heroStatsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.xs,
  },
  heroStatItem: {
    flex: 1,
    gap: spacing.hairline,
  },
  heroStatLabel: {
    color: colors.neutral.subtleText,
    fontSize: typeScale.caption2.fontSize,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  heroStatValue: {
    color: colors.neutral.text,
    ...typeScale.footnote,
    fontWeight: '600',
  },
  etaIndicatorBox: {
    marginTop: spacing.hairline,
  },
  modernCard: {
    backgroundColor: colors.neutral.surface,
    borderColor: colors.neutral.border,
    borderRadius: radius.cardLg,
    ...iosContinuousCurve,
    borderWidth: 1,
    gap: spacing.sm,
    padding: spacing.md,
    shadowColor: colors.neutral.text,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  cardHeader: {
    gap: spacing.hairline,
    marginBottom: spacing.xxs,
  },
  cardTitle: {
    color: colors.neutral.text,
    fontSize: typeScale.callout.fontSize,
    fontWeight: '600',
  },
  cardSubtitle: {
    color: colors.neutral.subtleText,
    ...typeScale.caption1,
  },
  trackingLinkBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.neutral.canvas,
    borderColor: colors.neutral.border,
    borderWidth: 1,
    borderRadius: radius.control,
    ...iosContinuousCurve,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    gap: spacing.xs,
    marginTop: spacing.xxs,
  },
  trackingLinkIconBox: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: colors.neutral.surfaceMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  trackingLinkTextWrap: {
    flex: 1,
    gap: 1,
  },
  trackingLinkTitle: {
    color: customerPalette.primary,
    fontSize: 13,
    fontWeight: '600',
  },
  trackingLinkSubtitle: {
    color: colors.neutral.subtleText,
    fontSize: 11,
  },
  topMetaBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.neutral.surface,
    borderColor: colors.neutral.border,
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 10,
    shadowColor: colors.neutral.text,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  topMetaLeft: {
    gap: 3,
  },
  orderCodeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  orderCodeText: {
    color: colors.neutral.text,
    fontSize: 15,
    fontWeight: '700',
    fontFamily: 'monospace',
    letterSpacing: 0.5,
  },
  copyBtn: {
    backgroundColor: colors.neutral.surfaceMuted,
    borderColor: colors.neutral.border,
    borderWidth: 1,
    borderRadius: 6,
    paddingHorizontal: 7,
    paddingVertical: 3,
  },
  copyBtnRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  copyBtnText: {
    color: customerPalette.primary,
    fontSize: 11,
    fontWeight: '600',
  },
  copiedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  copiedText: {
    color: colors.success.text,
    fontSize: 11,
    fontWeight: '600',
  },
  orderCreatedTime: {
    color: colors.neutral.subtleText,
    fontSize: 11,
  },
  topMetaRight: {
    alignItems: 'flex-end',
  },
  urgentPaymentCard: {
    backgroundColor: colors.warning.background,
    borderColor: colors.warning.border,
    borderRadius: 16,
    borderWidth: 1.5,
    padding: spacing.md,
    gap: 12,
    shadowColor: colors.warning.text,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 2,
  },
  urgentPaymentTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  urgentPaymentTitleWrap: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  urgentPaymentTextWrap: {
    flex: 1,
    gap: 2,
  },
  urgentPaymentTitle: {
    color: colors.warning.text,
    fontSize: typeScale.subheadline.fontSize,
    fontWeight: '600',
  },
  urgentPaymentSub: {
    color: colors.warning.text,
    fontSize: typeScale.caption1.fontSize,
  },
  urgentPaymentAmount: {
    color: customerPalette.primary,
    fontSize: typeScale.body.fontSize,
    fontWeight: '700',
    fontFamily: 'monospace',
  },
  urgentNoticeBox: {
    backgroundColor: colors.warning.background,
    borderColor: colors.warning.border,
    borderRadius: 8,
    borderWidth: 1,
    padding: 8,
  },
  urgentNoticeText: {
    color: colors.warning.text,
    fontSize: 12,
  },
  urgentPaymentBtnWrap: {
    marginTop: 2,
  },
  cargoSpecsGrid: {
    backgroundColor: colors.neutral.canvas,
    borderColor: colors.neutral.border,
    borderRadius: 12,
    borderWidth: 1,
    padding: 10,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  cargoGridItem: {
    width: '48%',
    backgroundColor: colors.neutral.surface,
    borderColor: colors.neutral.border,
    borderRadius: 8,
    borderWidth: 1,
    padding: 8,
    gap: 2,
  },
  cargoGridLabel: {
    color: colors.neutral.subtleText,
    fontSize: typeScale.caption2.fontSize,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  cargoGridValue: {
    color: colors.neutral.text,
    fontSize: typeScale.footnote.fontSize,
    fontWeight: '600',
  },
  driverMainRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  driverNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  driverRatingPill: {
    backgroundColor: colors.warning.background,
    borderRadius: 4,
    paddingHorizontal: 5,
    paddingVertical: 1,
  },
  driverRatingText: {
    color: colors.warning.text,
    fontSize: typeScale.caption2.fontSize,
    fontWeight: '600',
  },
  driverVehicleText: {
    color: colors.neutral.subtleText,
    fontSize: 12,
  },
  driverCallBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: colors.success.background,
    borderColor: colors.success.border,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  driverMessageBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: colors.neutral.surfaceMuted,
    borderColor: colors.neutral.border,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  driverEtaBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.neutral.surface,
    borderColor: colors.neutral.border,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
    marginTop: 8,
  },
  driverEtaLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  driverEtaSub: {
    color: colors.neutral.subtleText,
    fontSize: typeScale.caption2.fontSize,
  },
  driverEtaMain: {
    color: colors.neutral.text,
    fontSize: 13,
    fontWeight: '700',
  },
  driverGpsLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    backgroundColor: colors.neutral.surfaceMuted,
    borderRadius: 6,
  },
  driverGpsLinkText: {
    color: customerPalette.primary,
    fontSize: typeScale.caption1.fontSize,
    fontWeight: '600',
  },
  driverCard: {
    backgroundColor: colors.neutral.canvas,
    borderColor: colors.neutral.border,
    borderRadius: 14,
    borderWidth: 1,
    padding: spacing.md,
    gap: 6,
  },
  driverAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.neutral.text,
    alignItems: 'center',
    justifyContent: 'center',
  },
  driverAvatarText: {
    color: colors.neutral.surface,
    fontSize: typeScale.body.fontSize,
    fontWeight: '700',
  },
  driverInfo: {
    flex: 1,
    gap: 2,
  },
  driverName: {
    color: colors.neutral.text,
    fontSize: typeScale.subheadline.fontSize,
    fontWeight: '600',
  },
  driverStatusText: {
    color: colors.neutral.subtleText,
    fontSize: 12,
  },
  driverActions: {
    flexDirection: 'row',
    gap: 8,
  },
  driverActionBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.neutral.surface,
    borderWidth: 1,
    borderColor: colors.neutral.subtleBorder,
    alignItems: 'center',
    justifyContent: 'center',
  },
  driverText: {
    color: colors.neutral.text,
    fontSize: 13,
    fontWeight: '600',
    flexShrink: 1,
  },
  body: {
    fontSize: typeScale.footnote.fontSize,
    color: colors.neutral.mutedText,
    lineHeight: 19,
    flexShrink: 1,
  },
  helper: {
    fontSize: 12,
    color: colors.neutral.subtleText,
    flexShrink: 1,
  },
  freshnessRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  driverPositionStrip: {
    alignItems: 'center',
    backgroundColor: customerPalette.primaryBg,
    borderColor: customerPalette.primaryBorder,
    borderRadius: radius.control,
    ...iosContinuousCurve,
    borderWidth: 1,
    paddingHorizontal: spacing.xs,
    paddingVertical: spacing.xxs,
  },
  driverPositionText: {
    ...typeScale.footnote,
    color: colors.neutral.mutedText,
    flexShrink: 1,
  },
  driverPositionName: {
    ...typeScale.footnote,
    color: customerPalette.primary,
    fontWeight: '600',
  },
  pulseDotGreen: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: colors.success.text,
  },
  infoBanner: {
    backgroundColor: colors.neutral.canvas,
    borderColor: colors.neutral.border,
    borderRadius: 10,
    borderWidth: 1,
    padding: spacing.sm,
  },
  warningBanner: {
    backgroundColor: colors.warning.background,
    borderColor: colors.warning.border,
    borderRadius: 10,
    borderWidth: 1,
    padding: spacing.sm,
  },
  warningText: {
    fontSize: 13,
    color: colors.warning.text,
    flexShrink: 1,
  },
  cargoSpecsBox: {
    backgroundColor: colors.neutral.canvas,
    borderColor: colors.neutral.border,
    borderRadius: 10,
    borderWidth: 1,
    padding: 10,
    gap: 6,
  },
  cargoSpecRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  cargoSpecLabel: {
    color: colors.neutral.subtleText,
    fontSize: 12,
    fontWeight: '600',
    minWidth: 80,
  },
  cargoSpecValue: {
    color: colors.neutral.text,
    fontSize: typeScale.footnote.fontSize,
    fontWeight: '600',
    flex: 1,
  },
  mediaGrid: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  mediaTile: {
    backgroundColor: colors.neutral.canvas,
    borderColor: colors.neutral.border,
    borderRadius: 12,
    borderWidth: 1,
    flex: 1,
    gap: spacing.sm,
    minHeight: 100,
    padding: spacing.sm,
  },
  mediaIndex: {
    color: customerPalette.primary,
    fontSize: 11,
    fontWeight: '600',
  },
  mediaLabel: {
    color: colors.neutral.subtleText,
    fontSize: typeScale.caption1.fontSize,
    fontWeight: '600',
  },
  paymentCardContent: {
    gap: 12,
  },
  paymentTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  paymentAmount: {
    color: customerPalette.primary,
    fontSize: 20,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
  paymentDetailsBox: {
    backgroundColor: colors.neutral.canvas,
    borderColor: colors.neutral.border,
    borderRadius: 10,
    borderWidth: 1,
    padding: 10,
    gap: 6,
  },
  paymentDetailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  paymentDetailLabel: {
    color: colors.neutral.subtleText,
    fontSize: 12,
  },
  paymentDetailValue: {
    color: colors.neutral.text,
    fontSize: typeScale.footnote.fontSize,
    fontWeight: '700',
  },
  paymentNoticeBox: {
    backgroundColor: colors.success.background,
    borderColor: leopardPalette.ecoGreenSoft,
    borderRadius: 8,
    borderWidth: 1,
    padding: 10,
  },
  paymentNoticeText: {
    color: colors.success.text,
    fontSize: 12,
    lineHeight: 17,
  },
  paymentActionWrap: {
    marginTop: 4,
  },
  invoiceEmailPrompt: {
    gap: spacing.xs,
    marginTop: 4,
  },
  invoiceEmailInput: {
    backgroundColor: colors.neutral.canvas,
    borderColor: colors.neutral.border,
    borderRadius: 10,
    borderWidth: 1,
    color: colors.neutral.text,
    fontSize: 13,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  notice: {
    backgroundColor: colors.warning.background,
    borderLeftColor: leopardPalette.accentYellow,
    borderLeftWidth: 4,
    padding: spacing.sm,
    borderRadius: 10,
  },
  cancelledReasonCard: {
    backgroundColor: colors.danger.background,
    borderColor: colors.danger.border,
    borderWidth: 1,
    borderRadius: 14,
    padding: 14,
    gap: 6,
  },
  cancelledReasonHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  cancelledDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.danger.text,
  },
  cancelledReasonTitle: {
    ...typeScale.footnote,
    fontWeight: '600',
    color: colors.danger.text,
  },
  cancelledReasonContent: {
    fontSize: typeScale.subheadline.fontSize,
    fontWeight: '600',
    color: colors.danger.text,
  },
  cancelledReasonTime: {
    fontSize: typeScale.caption1.fontSize,
    color: colors.danger.text,
    opacity: 0.8,
  },
  cancelOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'flex-end',
    zIndex: 999,
  },
  cancelBackdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(15, 23, 42, 0.4)',
  },
  cancelSheet: {
    backgroundColor: colors.neutral.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 34,
    gap: 12,
    shadowColor: colors.neutral.text,
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 16,
    elevation: 8,
  },
  cancelSheetTitle: {
    fontSize: typeScale.body.fontSize,
    fontWeight: '700',
    color: colors.neutral.text,
  },
  cancelSheetSubtitle: {
    fontSize: 13,
    color: colors.neutral.subtleText,
    marginBottom: 4,
  },
  cancelOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.neutral.border,
    backgroundColor: colors.neutral.canvas,
    gap: 12,
  },
  cancelOptionSelected: {
    borderColor: customerPalette.primary,
    backgroundColor: colors.neutral.surfaceMuted,
  },
  cancelRadio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: leopardPalette.inputPlaceholder,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelRadioSelected: {
    borderColor: customerPalette.primary,
  },
  cancelRadioDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: customerPalette.primary,
  },
  cancelOptionText: {
    fontSize: typeScale.subheadline.fontSize,
    color: colors.neutral.mutedText,
    flex: 1,
  },
  cancelOptionTextSelected: {
    fontWeight: '600',
    color: customerPalette.primary,
  },
  cancelInput: {
    backgroundColor: colors.neutral.canvas,
    borderColor: colors.neutral.subtleBorder,
    borderWidth: 1,
    borderRadius: 10,
    padding: 12,
    fontSize: typeScale.footnote.fontSize,
    color: colors.neutral.text,
    minHeight: 70,
    textAlignVertical: 'top',
  },
  cancelErrorText: {
    fontSize: 12,
    color: colors.danger.text,
    fontWeight: '600',
  },
  cancelSheetActions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 8,
  },
  cancelSheetActionFlex: {
    flex: 1,
  },
  cancelSection: {
    borderTopColor: colors.danger.border,
    borderTopWidth: 1,
    gap: spacing.sm,
    paddingTop: spacing.md,
  },
  pressed: {
    opacity: 0.85,
  },
});
