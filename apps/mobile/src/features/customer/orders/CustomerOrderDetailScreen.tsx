import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Alert,
  Linking,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import {
  Avatar,
  Badge,
  Box,
  Button,
  Card,
  colors,
  customerPalette,
  Divider,
  EtaIndicator,
  haptic,
  HStack,
  IconCheck,
  IconClock,
  IconCopy,
  IconExternalLink,
  IconLocationPin,
  IconMessage,
  IconPhone,
  IconShieldAlert,
  IconStar,
  iosContinuousCurve,
  layout,
  leopardPalette,
  MapPanel,
  MediaImage,
  radius,
  RouteMapSchematic,
  RouteSpine,
  ScreenScaffold,
  ScreenState,
  spacing,
  StatusBadge,
  StatusTimeline,
  typeScale,
  VStack,
} from '@leopard/mobile-core';
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
  onRefresh?: () => Promise<void> | void;
  isRefreshing?: boolean;
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
    haptic.warning();
    onConfirm(reason);
  };

  return (
    <Box style={styles.cancelOverlay}>
      <Pressable
        accessibilityLabel="Đóng"
        accessibilityRole="button"
        hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
        onPress={() => {
          haptic.light();
          onDismiss();
        }}
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
                  haptic.selection();
                  setSelected(reasonOption);
                  setError(null);
                }}
                style={({ pressed }) => [
                  styles.cancelOption,
                  isSelected ? styles.cancelOptionSelected : null,
                  pressed ? styles.cardPressed : null,
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
              haptic.selection();
              setSelected('__OTHER__');
              setError(null);
            }}
            style={({ pressed }) => [
              styles.cancelOption,
              selected === '__OTHER__' ? styles.cancelOptionSelected : null,
              pressed ? styles.cardPressed : null,
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
            <Button
              label="Quay lại"
              onPress={() => {
                haptic.light();
                onDismiss();
              }}
              variant="secondary"
            />
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
    haptic.success();
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
        onPress={() => {
          haptic.light();
          onOpenInvoice?.(invoice.id);
        }}
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
            placeholderTextColor={leopardPalette.inputPlaceholder}
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
    haptic.light();
    const phoneToCall = driverPhone || '0901234567';
    void Linking.openURL(`tel:${phoneToCall}`).catch(() => {
      Alert.alert('Gọi tài xế', `Số điện thoại liên hệ: ${phoneToCall}`);
    });
  };

  const handleMessage = () => {
    haptic.light();
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
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            onPress={handleCall}
            style={({ pressed }) => [styles.driverCallBtn, pressed ? styles.cardPressed : null]}
          >
            <IconPhone color={leopardPalette.ecoGreen} size={16} />
          </Pressable>
          <Pressable
            accessibilityLabel="Nhắn tin cho tài xế"
            accessibilityRole="button"
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            onPress={handleMessage}
            style={({ pressed }) => [styles.driverMessageBtn, pressed ? styles.cardPressed : null]}
          >
            <IconMessage color={customerPalette.primary} size={16} />
          </Pressable>
        </HStack>
      </HStack>

      {/* Mini Progress / Live ETA Bar */}
      {typeof etaDurationSeconds === 'number' && !Number.isNaN(etaDurationSeconds) ? (
        <HStack style={styles.driverEtaBar}>
          <HStack style={styles.driverEtaLeft}>
            <IconClock color={customerPalette.primary} size={16} />
            <VStack>
              <Text style={styles.driverEtaSub}>Dự kiến giao hàng (ETA dự kiến)</Text>
              <Text style={styles.driverEtaMain}>
                ~{Math.round(etaDurationSeconds / 60)} phút
                {distanceMeters ? ` (Còn ${(distanceMeters / 1000).toFixed(1)} km)` : ''}
              </Text>
            </VStack>
          </HStack>
        </HStack>
      ) : null}
    </Card>
  );
}

function TrackingPanel({
  destinationCoords,
  destinationLabel,
  distanceMeters,
  driverPhone,
  etaDurationSeconds,
  onOpenTracking,
  onRetry,
  orderId,
  orderStatus,
  originCoords,
  originLabel,
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
            hideLedger
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
            hideLedger
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
      hideLedger
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

function getRatingEmotion(rating: number): string {
  switch (Math.round(rating)) {
    case 5:
      return 'Tuyệt vời!';
    case 4:
      return 'Rất tốt';
    case 3:
      return 'Bình thường';
    case 2:
      return 'Chưa hài lòng';
    case 1:
      return 'Rất tệ';
    default:
      return rating >= 4 ? 'Rất tốt' : 'Bình thường';
  }
}

function YourReviewCard({
  review,
}: Readonly<{
  review: NonNullable<CustomerDetailContentView['order']['review']>;
}>) {
  const ratingText = `${review.rating.toFixed(1)} ★`;
  const emotionText = getRatingEmotion(review.rating);

  return (
    <Card style={styles.yourReviewCard}>
      <HStack style={styles.yourReviewHeaderRow}>
        <Text style={styles.yourReviewTitle}>Đánh giá của bạn</Text>
        <Badge action="warning" size="sm" style={styles.yourReviewRatingBadge}>
          <Badge.Text style={styles.yourReviewRatingText}>{ratingText}</Badge.Text>
        </Badge>
      </HStack>

      <HStack style={styles.yourReviewStarsRow}>
        <HStack style={styles.yourReviewStarsGroup}>
          {[0, 1, 2, 3, 4].map((index) => {
            const isFilled = index < review.rating;
            return (
              <IconStar
                color={isFilled ? leopardPalette.accentYellow : colors.neutral.subtleBorder}
                fill={isFilled ? leopardPalette.accentYellow : 'none'}
                filled={isFilled}
                key={index}
                size={22}
              />
            );
          })}
        </HStack>
        <Text style={styles.yourReviewEmotionText}>{emotionText}</Text>
      </HStack>

      {typeof review.tipVnd === 'number' && review.tipVnd > 0 ? (
        <HStack style={styles.yourReviewTipBadge}>
          <Text style={styles.yourReviewTipText}>
            +{review.tipVnd.toLocaleString('vi-VN')} đ Tip cho tài xế
          </Text>
        </HStack>
      ) : null}

      {review.comment ? (
        <Box style={styles.yourReviewQuoteBox}>
          <Text style={styles.yourReviewQuoteText}>{review.comment}</Text>
        </Box>
      ) : null}
    </Card>
  );
}

function DeliveryRatingPromptCard() {
  return (
    <Card style={styles.deliveryRatingPromptCard}>
      <HStack style={styles.deliveryRatingPromptRow}>
        <Box style={styles.deliveryRatingPromptIconBox}>
          <IconStar
            color={leopardPalette.accentYellow}
            fill={leopardPalette.accentYellow}
            filled
            size={20}
          />
        </Box>
        <VStack style={styles.deliveryRatingPromptTextWrap}>
          <Text style={styles.deliveryRatingPromptTitle}>
            Đơn hàng đã được giao thành công! Bạn có hài lòng với chuyến đi không?
          </Text>
          <Text style={styles.deliveryRatingPromptSubtitle}>
            Đánh giá giúp tài xế và cải thiện chất lượng phục vụ
          </Text>
        </VStack>
      </HStack>
    </Card>
  );
}

function CustomerDetailContent({
  isRefreshing,
  onBack,
  onCancel,
  onOpenInvoice,
  onOpenTracking,
  onPaymentAction,
  onPickCargoImage,
  onPrimaryAction,
  onRefresh,
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
  onRefresh?: () => Promise<void> | void;
  isRefreshing?: boolean;
}>) {
  const order = view.order;
  const cancelAction = 'action' in view.cancel ? view.cancel.action : null;
  const [copied, setCopied] = useState(false);
  const [showCancelSheet, setShowCancelSheet] = useState(false);
  const [localRefreshing, setLocalRefreshing] = useState(false);
  const copyTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (copyTimeoutRef.current) {
        clearTimeout(copyTimeoutRef.current);
      }
    };
  }, []);

  const handleCopyOrderCode = () => {
    haptic.selection();
    if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
      void navigator.clipboard.writeText(order.reference);
    }
    setCopied(true);
    if (copyTimeoutRef.current) {
      clearTimeout(copyTimeoutRef.current);
    }
    copyTimeoutRef.current = setTimeout(() => setCopied(false), 2000);
  };

  const handleRefresh = useCallback(async () => {
    if (onRefresh) {
      setLocalRefreshing(true);
      haptic.light();
      try {
        await onRefresh();
      } finally {
        setLocalRefreshing(false);
      }
    } else if (onRetry) {
      setLocalRefreshing(true);
      haptic.light();
      try {
        onRetry();
      } finally {
        setLocalRefreshing(false);
      }
    }
  }, [onRefresh, onRetry]);

  const isUnpaid = (order.payment.status === 'UNPAID' || order.payment.status === 'QR_CREATED')
    && order.status !== 'CANCELLED' && order.status !== 'DELIVERED';
  const showEta = typeof order.etaDurationSeconds === 'number'
    && !Number.isNaN(order.etaDurationSeconds)
    && order.status !== 'CANCELLED'
    && order.status !== 'DELIVERED';
  const isOrderActive =
    order.status === 'ACCEPTED' ||
    order.status === 'PICKING_UP' ||
    order.status === 'IN_TRANSIT' ||
    order.status === 'RETURNING';

  return (
    <ScreenScaffold
      onBack={onBack}
      title={`Đơn ${order.reference}`}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            colors={[customerPalette.primary]}
            onRefresh={handleRefresh}
            refreshing={isRefreshing ?? localRefreshing}
            tintColor={customerPalette.primary}
          />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* 1. Inset Grouped Top Meta Bar (Mã đơn + nút copy 1-chạm + Badge trạng thái) */}
        <HStack style={styles.topMetaBar}>
          <VStack style={styles.topMetaLeft}>
            <HStack style={styles.orderCodeRow}>
              <Text style={styles.orderCodeText}>{order.reference}</Text>
              <Pressable
                accessibilityLabel="Sao chép mã đơn hàng"
                accessibilityRole="button"
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                onPress={handleCopyOrderCode}
                style={({ pressed }) => [styles.copyBtn, pressed ? styles.cardPressed : null]}
              >
                {copied ? (
                  <HStack style={styles.copiedRow}>
                    <IconCheck color={colors.success.text} size={12} />
                    <Text style={styles.copiedText}>Đã chép</Text>
                  </HStack>
                ) : (
                  <HStack style={styles.copyBtnRow}>
                    <IconCopy color={customerPalette.primary} size={12} />
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
                    onPaymentAction
                      ? () => {
                          haptic.light();
                          onPaymentAction(order.payment.action!.id);
                        }
                      : undefined
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

        {/* 4. Section: Route & Interactive Map */}
        <Card style={styles.modernCard}>
          <VStack style={styles.cardHeader}>
            <Text accessibilityRole="header" style={styles.cardTitle}>
              Lộ trình vận chuyển
            </Text>
            <Text style={styles.cardSubtitle}>Bản đồ tuyến đường và chi tiết điểm đón/trả</Text>
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

          <Divider style={styles.routeDivider} />

          <RouteSpine
            destination={order.route.destination}
            origin={order.route.origin}
            stops={order.route.stops}
          />

          {/* Nút liên kết chuyển tiếp sang trang Tracking toàn màn hình (chỉ hiển thị khi đơn đang thực hiện) */}
          {isOrderActive && order.tracking.kind !== 'no-driver' ? (
            <Pressable
              accessibilityHint="Mở bản đồ theo dõi GPS toàn màn hình"
              accessibilityLabel="Xem bản đồ theo dõi trực tiếp"
              accessibilityRole="button"
              onPress={() => {
                haptic.light();
                onOpenTracking?.(order.id);
              }}
              style={({ pressed }) => [
                styles.trackingLinkBtn,
                pressed ? styles.cardPressed : null,
              ]}
            >
              <Box style={styles.trackingLinkIconBox}>
                <IconLocationPin color={customerPalette.surfaceWhite} size={18} />
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

        {/* 5. Section: Cargo Specs & Media */}
        <Card style={styles.modernCard}>
          <VStack style={styles.cardHeader}>
            <Text accessibilityRole="header" style={styles.cardTitle}>
              Thông tin kiện hàng
            </Text>
            <Text style={styles.cardSubtitle}>Quy cách hàng hóa và xác nhận bàn giao</Text>
          </VStack>

          <VStack space="xs" style={styles.cargoSpecsList}>
            <HStack style={styles.cargoSpecRow}>
              <Text style={styles.cargoSpecLabel}>Mặt hàng</Text>
              <Text numberOfLines={2} style={styles.cargoSpecValue}>
                {order.cargo.note || 'Hàng hóa thông thường'}
              </Text>
            </HStack>

            <Divider style={styles.cargoDivider} />

            <HStack style={styles.cargoSpecRow}>
              <Text style={styles.cargoSpecLabel}>Khối lượng</Text>
              <Text style={styles.cargoSpecValue}>
                {order.cargo.weightKg ? `${order.cargo.weightKg} kg` : 'Theo tải trọng xe'}
              </Text>
            </HStack>

            <Divider style={styles.cargoDivider} />

            <HStack style={styles.cargoSpecRow}>
              <Text style={styles.cargoSpecLabel}>Bốc xếp</Text>
              <Text style={[styles.cargoSpecValue, { color: customerPalette.primary }]}>
                {order.hasLoadingSupport ? 'Có bốc xếp 2 đầu' : 'Tự bốc xếp'}
              </Text>
            </HStack>
          </VStack>

          {/* Media / POD Section */}
          <VStack space="xs" style={styles.cargoMediaSection}>
            <HStack style={styles.cargoMediaHeader}>
              <Text style={styles.cargoMediaTitle}>Ảnh hàng hóa</Text>
              {order.status === 'DELIVERED' && (
                <HStack style={styles.podInlineBadge}>
                  <IconCheck color={colors.success.text} size={12} strokeWidth={2.5} />
                  <Text style={styles.podInlineBadgeText}>Đã giao thành công</Text>
                </HStack>
              )}
            </HStack>

            {order.media.mediaId ? (
              <Box style={styles.mediaPreviewWrap}>
                <MediaImage mediaId={order.media.mediaId} />
              </Box>
            ) : order.status === 'DELIVERED' ? (
              <HStack style={styles.podDeliveredBanner}>
                <Box style={styles.podCheckCircle}>
                  <IconCheck color={colors.success.text} size={14} strokeWidth={2.5} />
                </Box>
                <VStack style={styles.podTextWrap}>
                  <Text style={styles.podTitle}>Biên bản giao nhận POD</Text>
                  <Text style={styles.podSub}>Tài xế đã bàn giao nguyên vẹn</Text>
                </VStack>
              </HStack>
            ) : onPickCargoImage ? (
              <Button
                label="Tải ảnh lên"
                onPress={() => {
                  haptic.light();
                  onPickCargoImage();
                }}
                variant="secondary"
              />
            ) : (
              <Text style={styles.helper}>Chưa có ảnh</Text>
            )}
          </VStack>
        </Card>

        {/* 6. Section: Đánh giá chuyến đi (Rating & Review) */}
        {order.review ? (
          <YourReviewCard review={order.review} />
        ) : order.status === 'DELIVERED' ? (
          <DeliveryRatingPromptCard />
        ) : null}

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

            <HStack style={[styles.paymentTopRow, { marginTop: spacing.xs }]}>
              <Text style={styles.totalFareLabel}>
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
                    onPaymentAction
                      ? () => {
                          haptic.light();
                          onPaymentAction(order.payment.action!.id);
                        }
                      : undefined
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
            onPress={
              onPrimaryAction
                ? () => {
                    haptic.light();
                    onPrimaryAction(act.id);
                  }
                : undefined
            }
          />
        ))}

        {cancelAction ? (
          <View style={styles.cancelSection}>
            <Button
              disabled={cancelAction.disabled}
              isLoading={cancelAction.isPending}
              label={cancelAction.label}
              onPress={() => {
                haptic.light();
                setShowCancelSheet(true);
              }}
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
    gap: spacing.sm,
    paddingBottom: layout.bottomNavClearance + spacing.lg,
  },
  section: {
    gap: spacing.xs,
  },

  // ─── Hero Progress Card (Inset Grouped) ───────────────────────
  heroCard: {
    backgroundColor: colors.neutral.surface,
    borderColor: colors.neutral.border,
    borderRadius: radius.cardLg,
    ...iosContinuousCurve,
    borderWidth: StyleSheet.hairlineWidth,
    padding: spacing.md,
    gap: spacing.sm,
    boxShadow: '0 2px 8px rgba(11, 37, 69, 0.05)',
    elevation: 2,
  },
  heroSectionTitle: {
    ...typeScale.callout,
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
    gap: spacing.xs,
  },
  liveTagBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.success.background,
    borderColor: leopardPalette.ecoGreenSoft,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.xs,
    paddingVertical: spacing.hairline,
    gap: spacing.xxs,
  },
  liveTagText: {
    color: colors.success.text,
    ...typeScale.caption2,
    fontWeight: '600',
  },
  heroPrice: {
    color: customerPalette.primary,
    ...typeScale.title3,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
  heroDivider: {
    height: StyleSheet.hairlineWidth,
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
    ...typeScale.caption2,
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

  // ─── Modern Inset Grouped Card ────────────────────────────────
  modernCard: {
    backgroundColor: colors.neutral.surface,
    borderColor: colors.neutral.border,
    borderRadius: radius.cardLg,
    ...iosContinuousCurve,
    borderWidth: StyleSheet.hairlineWidth,
    gap: spacing.sm,
    padding: spacing.md,
    boxShadow: '0 2px 6px rgba(0, 0, 0, 0.03)',
    elevation: 1,
  },
  cardHeader: {
    gap: spacing.hairline,
    marginBottom: spacing.xxs,
  },
  cardTitle: {
    color: colors.neutral.text,
    ...typeScale.callout,
    fontWeight: '600',
  },
  cardSubtitle: {
    color: colors.neutral.subtleText,
    ...typeScale.caption1,
  },
  trackingLinkBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: customerPalette.primaryBg,
    borderColor: customerPalette.primaryBorder,
    borderWidth: 1,
    borderRadius: radius.card,
    ...iosContinuousCurve,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    gap: spacing.sm,
    marginTop: spacing.xs,
    minHeight: 52,
  },
  trackingLinkIconBox: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: customerPalette.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  trackingLinkTextWrap: {
    flex: 1,
    gap: 2,
  },
  trackingLinkTitle: {
    color: customerPalette.primary,
    ...typeScale.subheadline,
    fontWeight: '700',
  },
  trackingLinkSubtitle: {
    color: colors.neutral.mutedText,
    ...typeScale.caption2,
  },

  // ─── Top Meta Bar (Inset Grouped) ─────────────────────────────
  topMetaBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.neutral.surface,
    borderColor: colors.neutral.border,
    borderRadius: radius.cardLg,
    ...iosContinuousCurve,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    boxShadow: '0 2px 4px rgba(0, 0, 0, 0.03)',
    elevation: 1,
  },
  topMetaLeft: {
    gap: spacing.hairline,
  },
  orderCodeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  orderCodeText: {
    color: colors.neutral.text,
    ...typeScale.subheadline,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
    letterSpacing: 0.5,
  },
  copyBtn: {
    backgroundColor: colors.neutral.surfaceMuted,
    borderColor: colors.neutral.border,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radius.control,
    ...iosContinuousCurve,
    paddingHorizontal: spacing.xs,
    paddingVertical: spacing.hairline,
  },
  copyBtnRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xxs,
  },
  copyBtnText: {
    color: customerPalette.primary,
    ...typeScale.caption2,
    fontWeight: '600',
  },
  copiedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xxs,
  },
  copiedText: {
    color: colors.success.text,
    ...typeScale.caption2,
    fontWeight: '600',
  },
  orderCreatedTime: {
    color: colors.neutral.subtleText,
    ...typeScale.caption2,
  },
  topMetaRight: {
    alignItems: 'flex-end',
  },

  // ─── Urgent Payment Card ──────────────────────────────────────
  urgentPaymentCard: {
    backgroundColor: colors.warning.background,
    borderColor: colors.warning.border,
    borderRadius: radius.cardLg,
    ...iosContinuousCurve,
    borderWidth: 1,
    padding: spacing.md,
    gap: spacing.sm,
    boxShadow: '0 3px 8px rgba(245, 158, 11, 0.08)',
    elevation: 2,
  },
  urgentPaymentTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.xs,
  },
  urgentPaymentTitleWrap: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  urgentPaymentTextWrap: {
    flex: 1,
    gap: spacing.hairline,
  },
  urgentPaymentTitle: {
    color: colors.warning.text,
    ...typeScale.subheadline,
    fontWeight: '600',
  },
  urgentPaymentSub: {
    color: colors.warning.text,
    ...typeScale.caption1,
  },
  urgentPaymentAmount: {
    color: customerPalette.primary,
    ...typeScale.body,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
  urgentNoticeBox: {
    backgroundColor: colors.neutral.surface,
    borderColor: colors.warning.border,
    borderRadius: radius.cardSm,
    ...iosContinuousCurve,
    borderWidth: StyleSheet.hairlineWidth,
    padding: spacing.xs,
  },
  urgentNoticeText: {
    color: colors.warning.text,
    ...typeScale.caption1,
  },
  urgentPaymentBtnWrap: {
    marginTop: spacing.xxs,
  },

  // ─── Cargo Specs ──────────────────────────────────────────────
  cargoSpecsList: {
    backgroundColor: colors.neutral.canvas,
    borderColor: colors.neutral.border,
    borderRadius: radius.cardSm,
    ...iosContinuousCurve,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  cargoSpecRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.xxs,
    gap: spacing.sm,
  },
  cargoSpecLabel: {
    color: colors.neutral.subtleText,
    ...typeScale.caption1,
    minWidth: 80,
  },
  cargoSpecValue: {
    flex: 1,
    textAlign: 'right',
    color: colors.neutral.text,
    ...typeScale.footnote,
    fontWeight: '600',
  },
  cargoDivider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.neutral.border,
  },
  routeDivider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.neutral.border,
    marginVertical: spacing.sm,
  },

  // ─── Driver Card ──────────────────────────────────────────────
  driverCard: {
    backgroundColor: colors.neutral.canvas,
    borderColor: colors.neutral.border,
    borderRadius: radius.cardLg,
    ...iosContinuousCurve,
    borderWidth: StyleSheet.hairlineWidth,
    padding: spacing.md,
    gap: spacing.xs,
  },
  driverMainRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  driverNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  driverRatingPill: {
    backgroundColor: colors.warning.background,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.xxs + 1,
    paddingVertical: spacing.hairline,
  },
  driverRatingText: {
    color: colors.warning.text,
    ...typeScale.caption2,
    fontWeight: '600',
  },
  driverVehicleText: {
    color: colors.neutral.subtleText,
    ...typeScale.caption1,
  },
  driverCallBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.success.background,
    borderColor: colors.success.border,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  driverMessageBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
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
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radius.control,
    ...iosContinuousCurve,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    marginTop: spacing.xs,
  },
  driverEtaLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  driverEtaSub: {
    color: colors.neutral.subtleText,
    ...typeScale.caption2,
  },
  driverEtaMain: {
    color: colors.neutral.text,
    ...typeScale.footnote,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
  driverAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: customerPalette.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  driverAvatarText: {
    color: colors.neutral.surface,
    ...typeScale.headline,
    fontWeight: '700',
  },
  driverInfo: {
    flex: 1,
    gap: spacing.hairline,
  },
  driverName: {
    color: colors.neutral.text,
    ...typeScale.subheadline,
    fontWeight: '600',
  },
  driverActions: {
    flexDirection: 'row',
    gap: spacing.xs,
  },
  driverText: {
    color: colors.neutral.text,
    ...typeScale.footnote,
    fontWeight: '600',
    flexShrink: 1,
  },
  body: {
    ...typeScale.footnote,
    color: colors.neutral.mutedText,
    lineHeight: 19,
    flexShrink: 1,
  },
  helper: {
    ...typeScale.caption1,
    color: colors.neutral.subtleText,
    flexShrink: 1,
  },
  freshnessRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  driverPositionStrip: {
    alignItems: 'center',
    backgroundColor: customerPalette.primaryBg,
    borderColor: customerPalette.primaryBorder,
    borderRadius: radius.control,
    ...iosContinuousCurve,
    borderWidth: StyleSheet.hairlineWidth,
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
    borderRadius: radius.cardSm,
    ...iosContinuousCurve,
    borderWidth: StyleSheet.hairlineWidth,
    padding: spacing.sm,
  },
  warningBanner: {
    backgroundColor: colors.warning.background,
    borderColor: colors.warning.border,
    borderRadius: radius.cardSm,
    ...iosContinuousCurve,
    borderWidth: StyleSheet.hairlineWidth,
    padding: spacing.sm,
  },
  warningText: {
    ...typeScale.footnote,
    color: colors.warning.text,
    flexShrink: 1,
  },
  cargoMediaSection: {
    marginTop: spacing.xxs,
    gap: spacing.xs,
  },
  cargoMediaHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  cargoMediaTitle: {
    color: colors.neutral.text,
    ...typeScale.caption1,
    fontWeight: '600',
  },
  mediaPreviewWrap: {
    borderRadius: radius.cardSm,
    ...iosContinuousCurve,
    overflow: 'hidden',
    minHeight: 100,
  },
  podInlineBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xxs,
    backgroundColor: colors.success.background,
    borderColor: colors.success.border,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.xs,
    paddingVertical: spacing.hairline,
  },
  podInlineBadgeText: {
    color: colors.success.text,
    ...typeScale.caption2,
    fontWeight: '600',
  },
  podDeliveredBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: colors.success.background,
    borderColor: colors.success.border,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radius.cardSm,
    ...iosContinuousCurve,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  podCheckCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.neutral.surface,
    borderColor: colors.success.border,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  podTextWrap: {
    flex: 1,
    gap: 1,
  },
  podTitle: {
    color: colors.success.text,
    ...typeScale.footnote,
    fontWeight: '600',
  },
  podSub: {
    color: colors.neutral.mutedText,
    ...typeScale.caption2,
  },
  paymentCardContent: {
    gap: spacing.sm,
  },
  paymentTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  totalFareLabel: {
    ...typeScale.subheadline,
    fontWeight: '600',
    color: customerPalette.primary,
  },
  paymentAmount: {
    color: customerPalette.primary,
    ...typeScale.title3,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
  paymentDetailsBox: {
    backgroundColor: colors.neutral.canvas,
    borderColor: colors.neutral.border,
    borderRadius: radius.cardSm,
    ...iosContinuousCurve,
    borderWidth: StyleSheet.hairlineWidth,
    padding: spacing.xs,
    gap: spacing.xxs,
  },
  paymentDetailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.xs,
  },
  paymentDetailLabel: {
    color: colors.neutral.subtleText,
    ...typeScale.caption1,
  },
  paymentDetailValue: {
    color: colors.neutral.text,
    ...typeScale.footnote,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
  paymentNoticeBox: {
    backgroundColor: colors.success.background,
    borderColor: leopardPalette.ecoGreenSoft,
    borderRadius: radius.cardSm,
    ...iosContinuousCurve,
    borderWidth: StyleSheet.hairlineWidth,
    padding: spacing.xs,
  },
  paymentNoticeText: {
    color: colors.success.text,
    ...typeScale.caption1,
    lineHeight: 17,
  },
  paymentActionWrap: {
    marginTop: spacing.xxs,
  },
  invoiceEmailPrompt: {
    gap: spacing.xs,
    marginTop: spacing.xxs,
  },
  invoiceEmailInput: {
    backgroundColor: colors.neutral.canvas,
    borderColor: colors.neutral.border,
    borderRadius: radius.control,
    ...iosContinuousCurve,
    borderWidth: StyleSheet.hairlineWidth,
    color: colors.neutral.text,
    ...typeScale.footnote,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  notice: {
    backgroundColor: colors.warning.background,
    borderLeftColor: leopardPalette.accentYellow,
    borderLeftWidth: 4,
    padding: spacing.sm,
    borderRadius: radius.control,
    ...iosContinuousCurve,
  },
  cancelledReasonCard: {
    backgroundColor: colors.danger.background,
    borderColor: colors.danger.border,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radius.cardLg,
    ...iosContinuousCurve,
    padding: spacing.md,
    gap: spacing.xxs,
  },
  cancelledReasonHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
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
    ...typeScale.subheadline,
    fontWeight: '600',
    color: colors.danger.text,
  },
  cancelledReasonTime: {
    ...typeScale.caption1,
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
    borderTopLeftRadius: radius.modal,
    borderTopRightRadius: radius.modal,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: layout.bottomNavClearance,
    gap: spacing.sm,
    boxShadow: '0 -4px 16px rgba(0, 0, 0, 0.1)',
    elevation: 8,
  },
  cancelSheetTitle: {
    ...typeScale.headline,
    fontWeight: '700',
    color: colors.neutral.text,
  },
  cancelSheetSubtitle: {
    ...typeScale.footnote,
    color: colors.neutral.subtleText,
    marginBottom: spacing.xxs,
  },
  cancelOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radius.control,
    ...iosContinuousCurve,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.neutral.border,
    backgroundColor: colors.neutral.canvas,
    gap: spacing.sm,
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
    ...typeScale.subheadline,
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
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radius.control,
    ...iosContinuousCurve,
    padding: spacing.sm,
    ...typeScale.footnote,
    color: colors.neutral.text,
    minHeight: 70,
    textAlignVertical: 'top',
  },
  cancelErrorText: {
    ...typeScale.caption1,
    color: colors.danger.text,
    fontWeight: '600',
  },
  cancelSheetActions: {
    flexDirection: 'row',
    gap: spacing.xs,
    marginTop: spacing.xs,
  },
  cancelSheetActionFlex: {
    flex: 1,
  },
  cancelSection: {
    borderTopColor: colors.danger.border,
    borderTopWidth: StyleSheet.hairlineWidth,
    gap: spacing.sm,
    paddingTop: spacing.md,
  },

  // ─── Your Review Card (Inset Grouped) ────────────────────────
  yourReviewCard: {
    backgroundColor: customerPalette.surfaceWhite,
    borderRadius: radius.cardLg,
    ...iosContinuousCurve,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(11, 30, 66, 0.08)',
    padding: spacing.md,
    gap: spacing.sm,
    boxShadow: '0 2px 6px rgba(0, 0, 0, 0.03)',
    elevation: 1,
  },
  yourReviewHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.xs,
  },
  yourReviewTitle: {
    color: customerPalette.textSlateDark,
    ...typeScale.headline,
    fontWeight: '600',
  },
  yourReviewRatingBadge: {
    backgroundColor: '#FEF3C7',
    borderColor: leopardPalette.accentYellow,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.xs,
    paddingVertical: spacing.hairline,
  },
  yourReviewRatingText: {
    color: customerPalette.textSlateDark,
    ...typeScale.caption1,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
  yourReviewStarsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  yourReviewStarsGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  yourReviewEmotionText: {
    color: customerPalette.textSlateDark,
    ...typeScale.subheadline,
    fontWeight: '600',
  },
  yourReviewTipBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#FEF3C7',
    borderColor: '#FDE68A',
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radius.control,
    ...iosContinuousCurve,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xxs,
  },
  yourReviewTipText: {
    color: '#92400E',
    ...typeScale.footnote,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
  yourReviewQuoteBox: {
    backgroundColor: customerPalette.canvas,
    borderColor: customerPalette.cardBorder,
    borderWidth: 1,
    borderRadius: 10,
    ...iosContinuousCurve,
    padding: spacing.sm,
  },
  yourReviewQuoteText: {
    color: customerPalette.textSlateDark,
    ...typeScale.callout,
    fontStyle: 'italic',
  },

  // ─── Delivery Rating Prompt Card ──────────────────────────────
  deliveryRatingPromptCard: {
    backgroundColor: customerPalette.surfaceWhite,
    borderColor: 'rgba(11, 30, 66, 0.08)',
    borderRadius: radius.cardLg,
    ...iosContinuousCurve,
    borderWidth: StyleSheet.hairlineWidth,
    padding: spacing.md,
    boxShadow: '0 2px 6px rgba(0, 0, 0, 0.03)',
    elevation: 1,
  },
  deliveryRatingPromptRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  deliveryRatingPromptIconBox: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#FEF3C7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  deliveryRatingPromptTextWrap: {
    flex: 1,
    gap: spacing.hairline,
  },
  deliveryRatingPromptTitle: {
    color: customerPalette.textSlateDark,
    ...typeScale.subheadline,
    fontWeight: '600',
  },
  deliveryRatingPromptSubtitle: {
    color: customerPalette.textSubtle,
    ...typeScale.caption1,
  },

  // ─── Emil Kowalski Active State ───────────────────────────────
  cardPressed: {
    transform: [{ scale: 0.985 }],
    opacity: 0.9,
  },
});
