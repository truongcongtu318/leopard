import { useEffect, useRef, useState } from 'react';
import { Alert, Linking, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { typeScale, colors, customerPalette, iosContinuousCurve, layout, leopardPalette, radius, spacing, typography, Button, EtaIndicator, IconCheck, IconClock, IconCopy, IconExternalLink, IconLocationPin, IconMessage, IconPhone, IconShieldAlert, MapPanel, RouteSpine, RouteMapSchematic, ScreenScaffold, ScreenState, StatusBadge, StatusTimeline } from '@leopard/mobile-core';
import { MediaImage } from '@leopard/mobile-core';
import type {
  CustomerDetailContentView,
  CustomerDetailView,
  CustomerTrackingView,
} from './model';

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
    <View style={styles.cancelOverlay}>
      <Pressable
        accessibilityLabel="Đóng"
        accessibilityRole="button"
        hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
        onPress={onDismiss}
        style={styles.cancelBackdrop}
      />
      <View style={styles.cancelSheet}>
        <Text style={styles.cancelSheetTitle}>Hủy đơn hàng</Text>
        <Text style={styles.cancelSheetSubtitle}>
          Vui lòng cho biết lý do để hệ thống cải thiện chất lượng dịch vụ.
        </Text>
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
              <View style={[styles.cancelRadio, isSelected ? styles.cancelRadioSelected : null]}>
                {isSelected ? <View style={styles.cancelRadioDot} /> : null}
              </View>
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
          <View
            style={[
              styles.cancelRadio,
              selected === '__OTHER__' ? styles.cancelRadioSelected : null,
            ]}
          >
            {selected === '__OTHER__' ? <View style={styles.cancelRadioDot} /> : null}
          </View>
          <Text
            style={[
              styles.cancelOptionText,
              selected === '__OTHER__' ? styles.cancelOptionTextSelected : null,
            ]}
          >
            Lý do khác
          </Text>
        </Pressable>
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
        <View style={styles.cancelSheetActions}>
          <View style={styles.cancelSheetActionFlex}>
            <Button label="Quay lại" onPress={onDismiss} variant="secondary" />
          </View>
          <View style={styles.cancelSheetActionFlex}>
            <Button label="Xác nhận hủy" onPress={handleConfirm} variant="destructive" />
          </View>
        </View>
      </View>
    </View>
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
    <View style={styles.modernCard}>
      <View style={styles.cardHeader}>
        <Text accessibilityRole="header" style={styles.cardTitle}>
          Hóa đơn
        </Text>
        <Text style={styles.cardSubtitle}>Hóa đơn tự phát hành cho đơn hàng này</Text>
      </View>

      <View style={styles.paymentDetailsBox}>
        <View style={styles.paymentDetailRow}>
          <Text style={styles.paymentDetailLabel}>Số hóa đơn</Text>
          <Text style={styles.paymentDetailValue}>{invoice.invoiceNumber}</Text>
        </View>
        <View style={styles.paymentDetailRow}>
          <Text style={styles.paymentDetailLabel}>Tổng tiền</Text>
          <Text style={styles.paymentDetailValue}>{invoice.totalLabel}</Text>
        </View>
        <View style={styles.paymentDetailRow}>
          <Text style={styles.paymentDetailLabel}>Ngày phát hành</Text>
          <Text style={styles.paymentDetailValue}>{invoice.issuedAtLabel}</Text>
        </View>
      </View>

      <Button
        label="Xem hóa đơn"
        onPress={() => onOpenInvoice?.(invoice.id)}
        variant="secondary"
      />

      {invoice.emailSentAt === null ? (
        <View style={styles.invoiceEmailPrompt}>
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
        </View>
      ) : (
        <Text style={styles.helper}>Đã gửi email hóa đơn.</Text>
      )}
    </View>
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
    <View style={styles.driverCard}>
      <View style={styles.driverMainRow}>
        <View style={styles.driverAvatar}>
          <Text style={styles.driverAvatarText}>{initial}</Text>
        </View>
        <View style={styles.driverInfo}>
          <View style={styles.driverNameRow}>
            <Text style={styles.driverName}>{driverLabel}</Text>
            <View style={styles.driverRatingPill}>
              <Text style={styles.driverRatingText}>★ 4.9</Text>
            </View>
          </View>
          <Text style={styles.driverVehicleText}>{vehicleLabel || 'Xe vận chuyển'} · {status}</Text>
        </View>
        <View style={styles.driverActions}>
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
        </View>
      </View>

      {/* Mini Progress / Live ETA Bar */}
      {typeof etaDurationSeconds === 'number' && !Number.isNaN(etaDurationSeconds) ? (
        <View style={styles.driverEtaBar}>
          <View style={styles.driverEtaLeft}>
            <IconClock color={customerPalette.primary} size={17} />
            <View>
              <Text style={styles.driverEtaSub}>Dự kiến giao hàng (ETA dự kiến)</Text>
              <Text style={styles.driverEtaMain}>
                ~{Math.round(etaDurationSeconds / 60)} phút
                {distanceMeters ? ` (Còn ${(distanceMeters / 1000).toFixed(1)} km)` : ''}
              </Text>
            </View>
          </View>
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
        </View>
      ) : null}
    </View>
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
  originLabel,
  originCoords,
  stops,
  tracking,
  vehicleLabel,
}: Readonly<{
  tracking: CustomerTrackingView;
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
          status="Đang định vị"
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
      markerLabel={`${tracking.driverLabel} (Đang di chuyển)`}
      originCoords={originCoords}
      originLabel={originLabel}
      stops={stops}
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
          status="Đang di chuyển"
          vehicleLabel={vehicleLabel}
        />
        <View style={styles.freshnessRow}>
          <View style={styles.pulseDotGreen} />
          <Text style={styles.helper}>Cập nhật lần cuối: {tracking.lastUpdatedLabel}</Text>
        </View>
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
        status="Vị trí chưa cập nhật"
        vehicleLabel={vehicleLabel}
      />
      <View style={styles.warningBanner}>
        <Text style={styles.body}>{tracking.message}</Text>
      </View>
      <Text style={styles.helper}>Cập nhật lần cuối: {tracking.lastUpdatedLabel}</Text>
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
        <View style={styles.topMetaBar}>
          <View style={styles.topMetaLeft}>
            <View style={styles.orderCodeRow}>
              <Text style={styles.orderCodeText}>{order.reference}</Text>
              <Pressable
                accessibilityLabel="Sao chép mã đơn hàng"
                accessibilityRole="button"
                hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                onPress={handleCopyOrderCode}
                style={({ pressed }) => [styles.copyBtn, pressed ? styles.pressed : null]}
              >
                {copied ? (
                  <View style={styles.copiedRow}>
                    <IconCheck color={colors.success.text} size={13} />
                    <Text style={styles.copiedText}>Đã chép</Text>
                  </View>
                ) : (
                  <View style={styles.copyBtnRow}>
                    <IconCopy color={customerPalette.primary} size={13} />
                    <Text style={styles.copyBtnText}>Sao chép</Text>
                  </View>
                )}
              </Pressable>
            </View>
            <Text style={styles.orderCreatedTime}>Tạo lúc {order.updatedAtLabel}</Text>
          </View>
          <View style={styles.topMetaRight}>
            <StatusBadge domain="order" status={order.status} />
          </View>
        </View>

        {/* 1b. Thẻ hiển thị lý do hủy khi đơn CANCELLED */}
        {order.status === 'CANCELLED' ? (
          <View style={styles.cancelledReasonCard}>
            <View style={styles.cancelledReasonHeader}>
              <View style={styles.cancelledDot} />
              <Text style={styles.cancelledReasonTitle}>Lý do hủy đơn</Text>
            </View>
            <Text style={styles.cancelledReasonContent}>
              {order.cancelReason?.trim() || 'Khách hàng hủy đơn'}
            </Text>
            <Text style={styles.cancelledReasonTime}>Hủy vào lúc {order.updatedAtLabel}</Text>
          </View>
        ) : null}

        {/* 2. Thẻ Cảnh Báo Thanh Toán Cấp Bách (Urgent Payment Card) */}
        {isUnpaid ? (
          <View style={styles.urgentPaymentCard}>
            <View style={styles.urgentPaymentTop}>
              <View style={styles.urgentPaymentTitleWrap}>
                <IconShieldAlert color={colors.warning.text} size={20} />
                <View style={styles.urgentPaymentTextWrap}>
                  <Text style={styles.urgentPaymentTitle}>Đơn hàng chưa thanh toán</Text>
                  <Text style={styles.urgentPaymentSub}>Thanh toán cước phí bằng VietQR Napas247</Text>
                </View>
              </View>
              <Text style={styles.urgentPaymentAmount}>{order.payment.amountLabel}</Text>
            </View>

            {order.payment.notice ? (
              <View style={styles.urgentNoticeBox}>
                <Text style={styles.urgentNoticeText}>{order.payment.notice}</Text>
              </View>
            ) : null}

            {order.payment.action ? (
              <View style={styles.urgentPaymentBtnWrap}>
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
              </View>
            ) : null}
          </View>
        ) : null}

        {/* 3. Live Journey Hero Card (Tổng quan tiến độ & Cước phí) */}
        <View style={styles.heroCard}>
          <View style={styles.heroTopRow}>
            <View style={styles.heroStatusWrap}>
              <Text style={styles.heroSectionTitle}>Tổng quan đơn hàng</Text>
              {order.status === 'IN_TRANSIT' ? (
                <View style={styles.liveTagBadge}>
                  <View style={styles.pulseDotGreen} />
                  <Text style={styles.liveTagText}>Đang giao</Text>
                </View>
              ) : null}
            </View>
            <Text style={styles.heroPrice}>{order.priceLabel}</Text>
          </View>

          <View style={styles.heroDivider} />

          <View style={styles.heroStatsRow}>
            <View style={styles.heroStatItem}>
              <Text style={styles.heroStatLabel}>CẬP NHẬT</Text>
              <Text style={styles.heroStatValue}>{order.updatedAtLabel}</Text>
            </View>
            <View style={styles.heroStatItem}>
              <Text style={styles.heroStatLabel}>LOẠI XE</Text>
              <Text style={styles.heroStatValue}>{order.requestedVehicleLabel || 'Xe Tải'}</Text>
            </View>
            {order.distanceMeters ? (
              <View style={styles.heroStatItem}>
                <Text style={styles.heroStatLabel}>QUÃNG ĐƯỜNG</Text>
                <Text style={styles.heroStatValue}>
                  {(order.distanceMeters / 1000).toFixed(1)} km
                </Text>
              </View>
            ) : null}
            {showEta ? (
              <View style={styles.heroStatItem}>
                <Text style={styles.heroStatLabel}>ETA DỰ KIẾN</Text>
                <Text style={styles.heroStatValue}>
                  ~{Math.round(order.etaDurationSeconds as number / 60)} phút
                </Text>
              </View>
            ) : null}
          </View>

          {showEta ? (
            <View style={styles.etaIndicatorBox}>
              <EtaIndicator
                durationSeconds={order.etaDurationSeconds as number}
                source={order.etaSource}
              />
            </View>
          ) : null}
        </View>

        {view.notice ? (
          <View style={styles.notice}>
            <Text style={styles.warningText}>{view.notice}</Text>
          </View>
        ) : null}

        {/* 4. Visual Tracking Preview & Map Panel */}
        <View style={styles.modernCard}>
          <View style={styles.cardHeader}>
            <Text accessibilityRole="header" style={styles.cardTitle}>
              Bản đồ hành trình
            </Text>
            <Text style={styles.cardSubtitle}>Vị trí xe và lộ trình theo thời gian thực</Text>
          </View>

          <TrackingPanel
            destinationCoords={order.route.destination.coords}
            destinationLabel={order.route.destination.label}
            distanceMeters={order.distanceMeters}
            driverPhone={order.assignedDriver?.phone}
            etaDurationSeconds={order.etaDurationSeconds}
            onOpenTracking={onOpenTracking}
            onRetry={onRetry}
            orderId={order.id}
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
              <View style={styles.trackingLinkIconBox}>
                <IconLocationPin color={customerPalette.primary} size={18} />
              </View>
              <View style={styles.trackingLinkTextWrap}>
                <Text style={styles.trackingLinkTitle}>Xem bản đồ theo dõi trực tiếp ➔</Text>
                <Text style={styles.trackingLinkSubtitle}>
                  Giám sát lộ trình GPS thời gian thực toàn màn hình
                </Text>
              </View>
            </Pressable>
          ) : null}
        </View>

        {/* 5. Section: Route */}
        <View style={styles.modernCard}>
          <View style={styles.cardHeader}>
            <Text accessibilityRole="header" style={styles.cardTitle}>
              Lộ trình vận chuyển
            </Text>
            <Text style={styles.cardSubtitle}>Điểm lấy, các điểm dừng và điểm giao hàng</Text>
          </View>
          <RouteSpine
            destination={order.route.destination}
            origin={order.route.origin}
            stops={order.route.stops}
          />
        </View>

        {/* 6. Section: Cargo Specs & Media */}
        <View style={styles.modernCard}>
          <View style={styles.cardHeader}>
            <Text accessibilityRole="header" style={styles.cardTitle}>
              Minh chứng hàng hóa
            </Text>
            <Text style={styles.cardSubtitle}>Quy cách hàng hóa và hình ảnh đính kèm</Text>
          </View>

          <View style={styles.cargoSpecsGrid}>
            <View style={styles.cargoGridItem}>
              <Text style={styles.cargoGridLabel}>MẶT HÀNG</Text>
              <Text style={styles.cargoGridValue}>{order.cargo.note || 'Hàng tổng hợp'}</Text>
            </View>
            <View style={styles.cargoGridItem}>
              <Text style={styles.cargoGridLabel}>KHỐI LƯỢNG</Text>
              <Text style={styles.cargoGridValue}>
                {order.cargo.weightKg ? `${order.cargo.weightKg} kg` : '—'}
              </Text>
            </View>
            <View style={styles.cargoGridItem}>
              <Text style={styles.cargoGridLabel}>DỊCH VỤ ĐI KÈM</Text>
              <Text style={[styles.cargoGridValue, { color: customerPalette.primary }]}>
                {order.hasLoadingSupport ? 'Có bốc xếp 2 đầu' : 'Tự bốc xếp'}
              </Text>
            </View>
            <View style={styles.cargoGridItem}>
              <Text style={styles.cargoGridLabel}>NGƯỜI NHẬN</Text>
              <Text style={styles.cargoGridValue} numberOfLines={1}>
                {order.route.destination.label.split(',')[0]}
              </Text>
            </View>
          </View>

          <View style={styles.mediaGrid}>
            <View style={styles.mediaTile}>
              <Text style={styles.mediaIndex}>01</Text>
              <Text style={styles.mediaLabel}>Ảnh hàng hóa</Text>
              {order.media.mediaId ? (
                <MediaImage mediaId={order.media.mediaId} />
              ) : onPickCargoImage ? (
                <Button label="Tải ảnh lên" onPress={onPickCargoImage} variant="secondary" />
              ) : (
                <Text style={styles.helper}>Chưa có ảnh</Text>
              )}
            </View>
          </View>
        </View>

        {/* 6b. Section: Chi tiết cước phí (Price Breakdown) */}
        <View style={styles.modernCard}>
          <View style={styles.cardHeader}>
            <Text accessibilityRole="header" style={styles.cardTitle}>
              Chi tiết cước phí
            </Text>
            <Text style={styles.cardSubtitle}>
              Cơ cấu tính giá: {order.requestedVehicleLabel || 'Xe vận chuyển'}
            </Text>
          </View>

          <View style={styles.paymentCardContent}>
            <View style={styles.paymentDetailsBox}>
              <View style={styles.paymentDetailRow}>
                <Text style={styles.paymentDetailLabel}>
                  Cước mở cửa ({order.requestedVehicleLabel || 'Xe vận chuyển'})
                </Text>
                <Text style={styles.paymentDetailValue}>
                  {order.priceBreakdown?.baseFareVnd ? `${order.priceBreakdown.baseFareVnd.toLocaleString('vi-VN')} ₫` : '—'}
                </Text>
              </View>

              <View style={styles.paymentDetailRow}>
                <Text style={styles.paymentDetailLabel}>
                  Cước quãng đường {order.distanceMeters ? `(${(order.distanceMeters / 1000).toFixed(1)} km)` : ''}
                </Text>
                <Text style={styles.paymentDetailValue}>
                  {order.priceBreakdown?.distanceFareVnd !== undefined
                    ? `${order.priceBreakdown.distanceFareVnd.toLocaleString('vi-VN')} ₫`
                    : '—'}
                </Text>
              </View>

              {order.priceBreakdown?.stopSurchargeVnd ? (
                <View style={styles.paymentDetailRow}>
                  <Text style={styles.paymentDetailLabel}>Phụ phí điểm dừng</Text>
                  <Text style={styles.paymentDetailValue}>
                    +{order.priceBreakdown.stopSurchargeVnd.toLocaleString('vi-VN')} ₫
                  </Text>
                </View>
              ) : null}

              {order.priceBreakdown?.loadingFeeVnd ? (
                <View style={styles.paymentDetailRow}>
                  <Text style={styles.paymentDetailLabel}>Phí bốc xếp 2 đầu</Text>
                  <Text style={styles.paymentDetailValue}>
                    +{order.priceBreakdown.loadingFeeVnd.toLocaleString('vi-VN')} ₫
                  </Text>
                </View>
              ) : null}

              {order.priceBreakdown?.vatFeeVnd ? (
                <View style={styles.paymentDetailRow}>
                  <Text style={styles.paymentDetailLabel}>Thuế GTGT (VAT 8%)</Text>
                  <Text style={styles.paymentDetailValue}>
                    +{order.priceBreakdown.vatFeeVnd.toLocaleString('vi-VN')} ₫
                  </Text>
                </View>
              ) : null}
            </View>

            <View style={styles.heroDivider} />

            <View style={[styles.paymentTopRow, { marginTop: 10 }]}>
              <Text style={{ fontSize: typeScale.subheadline.fontSize, fontWeight: '700', color: customerPalette.primary }}>
                Tổng cước vận chuyển
              </Text>
              <Text style={styles.paymentAmount}>{order.priceLabel}</Text>
            </View>
          </View>
        </View>

        {/* 7. Section: Payment & Financial Info */}
        <View style={styles.modernCard}>
          <View style={styles.cardHeader}>
            <Text accessibilityRole="header" style={styles.cardTitle}>
              Thanh toán
            </Text>
            <Text style={styles.cardSubtitle}>Trạng thái thanh toán và thông tin cước phí</Text>
          </View>

          <View style={styles.paymentCardContent}>
            <View style={styles.paymentTopRow}>
              <StatusBadge domain="payment" status={order.payment.status} />
              <Text style={styles.paymentAmount}>{order.payment.amountLabel}</Text>
            </View>

            <View style={styles.paymentDetailsBox}>
              {order.payment.referenceLabel ? (
                <View style={styles.paymentDetailRow}>
                  <Text style={styles.paymentDetailLabel}>Mã tham chiếu</Text>
                  <Text style={styles.paymentDetailValue}>{order.payment.referenceLabel}</Text>
                </View>
              ) : null}
              {order.payment.sourceLabel ? (
                <View style={styles.paymentDetailRow}>
                  <Text style={styles.paymentDetailLabel}>Phương thức</Text>
                  <Text style={styles.paymentDetailValue}>{order.payment.sourceLabel}</Text>
                </View>
              ) : null}
              {order.payment.expiresAtLabel ? (
                <View style={styles.paymentDetailRow}>
                  <Text style={styles.paymentDetailLabel}>Hạn thanh toán</Text>
                  <Text style={styles.paymentDetailValue}>{order.payment.expiresAtLabel}</Text>
                </View>
              ) : null}
            </View>

            {!isUnpaid && order.payment.notice ? (
              <View style={styles.paymentNoticeBox}>
                <Text style={styles.paymentNoticeText}>{order.payment.notice}</Text>
              </View>
            ) : null}

            {!isUnpaid && order.payment.action ? (
              <View style={styles.paymentActionWrap}>
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
              </View>
            ) : null}
          </View>
        </View>

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
    fontWeight: '700',
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
    fontWeight: '700',
  },
  heroPrice: {
    color: customerPalette.primary,
    ...typeScale.title3,
    fontWeight: '800',
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
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  heroStatValue: {
    color: colors.neutral.text,
    ...typeScale.footnote,
    fontWeight: '700',
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
    fontWeight: '700',
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
    fontWeight: '700',
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
    fontWeight: '800',
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
    fontWeight: '700',
  },
  copiedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  copiedText: {
    color: colors.success.text,
    fontSize: 11,
    fontWeight: '700',
  },
  orderCreatedTime: {
    color: colors.neutral.subtleText,
    fontSize: 11,
    fontWeight: '500',
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
    fontWeight: '800',
  },
  urgentPaymentSub: {
    color: colors.warning.text,
    fontSize: typeScale.caption1.fontSize,
    fontWeight: '500',
  },
  urgentPaymentAmount: {
    color: customerPalette.primary,
    fontSize: typeScale.body.fontSize,
    fontWeight: '900',
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
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  cargoGridValue: {
    color: colors.neutral.text,
    fontSize: typeScale.footnote.fontSize,
    fontWeight: '700',
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
    fontWeight: '700',
  },
  driverVehicleText: {
    color: colors.neutral.subtleText,
    fontSize: 12,
    fontWeight: '500',
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
    fontWeight: '500',
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
    fontWeight: '700',
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
    fontWeight: '800',
  },
  driverInfo: {
    flex: 1,
    gap: 2,
  },
  driverName: {
    color: colors.neutral.text,
    fontSize: typeScale.subheadline.fontSize,
    fontWeight: '700',
  },
  driverStatusText: {
    color: colors.neutral.subtleText,
    fontSize: 12,
    fontWeight: '500',
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
    fontWeight: '700',
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
    fontWeight: '700',
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
    fontWeight: '800',
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
    fontWeight: '500',
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
    fontSize: 13,
    fontWeight: '700',
    color: colors.danger.text,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
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
    fontWeight: '800',
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
    fontWeight: '500',
    color: colors.neutral.mutedText,
    flex: 1,
  },
  cancelOptionTextSelected: {
    fontWeight: '700',
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
