import { useState } from 'react';
import { Alert, Linking, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { colors, layout, leopardPalette, radius, spacing, typography, Button, EtaIndicator, IconCheck, IconClock, IconCopy, IconExternalLink, IconLocationPin, IconMessage, IconPhone, IconShieldAlert, MapPanel, RouteSpine, RouteMapSchematic, ScreenScaffold, ScreenState, StatusBadge, StatusTimeline } from '@leopard/mobile-core';
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
            placeholderTextColor="#94A3B8"
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
  etaDurationSeconds,
  onOpenTracking,
  orderId,
  status = 'Tài xế nhận chuyến',
}: Readonly<{
  driverLabel: string;
  status?: string;
  onOpenTracking?: (orderId: string) => void;
  etaDurationSeconds?: number | null;
  distanceMeters?: number | null;
  orderId?: string;
}>) {
  const initial = driverLabel.replace(/^Tài xế\s*/i, '').trim().charAt(0) || 'T';

  const handleCall = () => {
    void Linking.openURL('tel:0901234567').catch(() => {
      Alert.alert('Gọi tài xế', 'Số điện thoại liên hệ: 0901 234 567');
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
          <Text style={styles.driverVehicleText}>Xe tải 1.25T · {status}</Text>
        </View>
        <View style={styles.driverActions}>
          <Pressable
            accessibilityLabel="Gọi điện cho tài xế"
            accessibilityRole="button"
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            onPress={handleCall}
            style={({ pressed }) => [styles.driverCallBtn, pressed ? styles.pressed : null]}
          >
            <IconPhone color="#16A34A" size={17} />
          </Pressable>
          <Pressable
            accessibilityLabel="Nhắn tin cho tài xế"
            accessibilityRole="button"
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            onPress={handleMessage}
            style={({ pressed }) => [styles.driverMessageBtn, pressed ? styles.pressed : null]}
          >
            <IconMessage color="#0B1E42" size={17} />
          </Pressable>
        </View>
      </View>

      {/* Mini Progress / Live ETA Bar */}
      {typeof etaDurationSeconds === 'number' && !Number.isNaN(etaDurationSeconds) ? (
        <View style={styles.driverEtaBar}>
          <View style={styles.driverEtaLeft}>
            <IconClock color="#0B1E42" size={17} />
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
              <IconExternalLink color="#0B1E42" size={13} />
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
  etaDurationSeconds,
  onOpenTracking,
  onRetry,
  orderId,
  originLabel,
  originCoords,
  stops,
  tracking,
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
          etaDurationSeconds={etaDurationSeconds}
          onOpenTracking={onOpenTracking}
          orderId={orderId}
          status="Đang định vị"
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
          etaDurationSeconds={etaDurationSeconds}
          onOpenTracking={onOpenTracking}
          orderId={orderId}
          status="Đang di chuyển"
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
        etaDurationSeconds={etaDurationSeconds}
        onOpenTracking={onOpenTracking}
        orderId={orderId}
        status="Vị trí chưa cập nhật"
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

  const handleCopyOrderCode = () => {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      void navigator.clipboard.writeText(order.reference);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
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
                    <IconCheck color="#10B981" size={13} />
                    <Text style={styles.copiedText}>Đã chép</Text>
                  </View>
                ) : (
                  <View style={styles.copyBtnRow}>
                    <IconCopy color="#0B1E42" size={13} />
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
                <IconShieldAlert color="#D97706" size={20} />
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
                <Text style={styles.heroStatLabel}>DỰ KIẾN (ETA)</Text>
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
            etaDurationSeconds={order.etaDurationSeconds}
            onOpenTracking={onOpenTracking}
            onRetry={onRetry}
            orderId={order.id}
            originCoords={order.route.origin.coords}
            originLabel={order.route.origin.label}
            stops={order.route.stops}
            tracking={order.tracking}
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
                <IconLocationPin color="#0B1E42" size={18} />
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
              <Text style={styles.cargoGridValue}>{order.cargo.note || 'Xi măng (VLXD)'}</Text>
            </View>
            <View style={styles.cargoGridItem}>
              <Text style={styles.cargoGridLabel}>KHỐI LƯỢNG</Text>
              <Text style={styles.cargoGridValue}>
                {order.cargo.weightKg ? `${order.cargo.weightKg} kg` : '250 kg'}
              </Text>
            </View>
            <View style={styles.cargoGridItem}>
              <Text style={styles.cargoGridLabel}>DỊCH VỤ ĐI KÈM</Text>
              <Text style={[styles.cargoGridValue, { color: '#0B1E42' }]}>Có bốc xếp 2 đầu</Text>
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
    backgroundColor: '#FFFFFF',
    borderColor: '#E2E8F0',
    borderRadius: 16,
    borderWidth: 1,
    padding: spacing.md,
    gap: 12,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  heroSectionTitle: {
    fontSize: 15.5,
    fontWeight: '700',
    color: '#0F172A',
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
    backgroundColor: '#DCFCE7',
    borderColor: '#BBF7D0',
    borderWidth: 1,
    borderRadius: 6,
    paddingHorizontal: 7,
    paddingVertical: 2,
    gap: 5,
  },
  liveTagText: {
    color: '#15803D',
    fontSize: 10.5,
    fontWeight: '700',
  },
  heroPrice: {
    color: '#0B1E42',
    fontSize: 20,
    fontWeight: '800',
    fontVariant: ['tabular-nums'],
  },
  heroDivider: {
    height: 1,
    backgroundColor: '#F1F5F9',
  },
  heroStatsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  heroStatItem: {
    flex: 1,
    gap: 2,
  },
  heroStatLabel: {
    color: '#64748B',
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  heroStatValue: {
    color: '#0F172A',
    fontSize: 13,
    fontWeight: '700',
  },
  etaIndicatorBox: {
    marginTop: 2,
  },
  modernCard: {
    backgroundColor: '#FFFFFF',
    borderColor: '#E2E8F0',
    borderRadius: 16,
    borderWidth: 1,
    gap: spacing.sm,
    padding: spacing.md,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  cardHeader: {
    gap: 2,
    marginBottom: spacing.xxs,
  },
  cardTitle: {
    color: '#0F172A',
    fontSize: 15.5,
    fontWeight: '700',
  },
  cardSubtitle: {
    color: '#64748B',
    fontSize: 12,
  },
  trackingLinkBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderColor: '#E2E8F0',
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 10,
    marginTop: 4,
  },
  trackingLinkIconBox: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  trackingLinkTextWrap: {
    flex: 1,
    gap: 1,
  },
  trackingLinkTitle: {
    color: '#0B1E42',
    fontSize: 13,
    fontWeight: '700',
  },
  trackingLinkSubtitle: {
    color: '#64748B',
    fontSize: 11,
  },
  topMetaBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    borderColor: '#E2E8F0',
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 10,
    shadowColor: '#0F172A',
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
    color: '#0F172A',
    fontSize: 15,
    fontWeight: '800',
    fontFamily: 'monospace',
    letterSpacing: 0.5,
  },
  copyBtn: {
    backgroundColor: '#F0F4F9',
    borderColor: '#E2E8F0',
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
    color: '#0B1E42',
    fontSize: 11,
    fontWeight: '700',
  },
  copiedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  copiedText: {
    color: '#10B981',
    fontSize: 11,
    fontWeight: '700',
  },
  orderCreatedTime: {
    color: '#64748B',
    fontSize: 11,
    fontWeight: '500',
  },
  topMetaRight: {
    alignItems: 'flex-end',
  },
  urgentPaymentCard: {
    backgroundColor: '#FFFBEB',
    borderColor: '#FDE68A',
    borderRadius: 16,
    borderWidth: 1.5,
    padding: spacing.md,
    gap: 12,
    shadowColor: '#D97706',
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
    color: '#92400E',
    fontSize: 14.5,
    fontWeight: '800',
  },
  urgentPaymentSub: {
    color: '#B45309',
    fontSize: 11.5,
    fontWeight: '500',
  },
  urgentPaymentAmount: {
    color: '#0B1E42',
    fontSize: 18,
    fontWeight: '900',
    fontFamily: 'monospace',
  },
  urgentNoticeBox: {
    backgroundColor: '#FEF3C7',
    borderColor: '#FDE68A',
    borderRadius: 8,
    borderWidth: 1,
    padding: 8,
  },
  urgentNoticeText: {
    color: '#92400E',
    fontSize: 12,
  },
  urgentPaymentBtnWrap: {
    marginTop: 2,
  },
  cargoSpecsGrid: {
    backgroundColor: '#F8FAFC',
    borderColor: '#E2E8F0',
    borderRadius: 12,
    borderWidth: 1,
    padding: 10,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  cargoGridItem: {
    width: '48%',
    backgroundColor: '#FFFFFF',
    borderColor: '#E2E8F0',
    borderRadius: 8,
    borderWidth: 1,
    padding: 8,
    gap: 2,
  },
  cargoGridLabel: {
    color: '#64748B',
    fontSize: 9.5,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  cargoGridValue: {
    color: '#0F172A',
    fontSize: 12.5,
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
    backgroundColor: '#FEF3C7',
    borderRadius: 4,
    paddingHorizontal: 5,
    paddingVertical: 1,
  },
  driverRatingText: {
    color: '#D97706',
    fontSize: 10.5,
    fontWeight: '700',
  },
  driverVehicleText: {
    color: '#64748B',
    fontSize: 12,
    fontWeight: '500',
  },
  driverCallBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#ECFDF5',
    borderColor: '#A7F3D0',
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  driverMessageBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#F0F4F9',
    borderColor: '#E2E8F0',
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  driverEtaBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    borderColor: '#E2E8F0',
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
    color: '#64748B',
    fontSize: 10.5,
    fontWeight: '500',
  },
  driverEtaMain: {
    color: '#0F172A',
    fontSize: 13,
    fontWeight: '700',
  },
  driverGpsLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    backgroundColor: '#F0F4F9',
    borderRadius: 6,
  },
  driverGpsLinkText: {
    color: '#0B1E42',
    fontSize: 11.5,
    fontWeight: '700',
  },
  driverCard: {
    backgroundColor: '#F8FAFC',
    borderColor: '#E2E8F0',
    borderRadius: 14,
    borderWidth: 1,
    padding: spacing.md,
    gap: 6,
  },
  driverAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#0F172A',
    alignItems: 'center',
    justifyContent: 'center',
  },
  driverAvatarText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '800',
  },
  driverInfo: {
    flex: 1,
    gap: 2,
  },
  driverName: {
    color: '#0F172A',
    fontSize: 14.5,
    fontWeight: '700',
  },
  driverStatusText: {
    color: '#64748B',
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
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    alignItems: 'center',
    justifyContent: 'center',
  },
  driverText: {
    color: '#0F172A',
    fontSize: 13,
    fontWeight: '600',
    flexShrink: 1,
  },
  body: {
    fontSize: 13.5,
    color: '#334155',
    lineHeight: 19,
    flexShrink: 1,
  },
  helper: {
    fontSize: 12,
    color: '#64748B',
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
    backgroundColor: '#22C55E',
  },
  infoBanner: {
    backgroundColor: '#F8FAFC',
    borderColor: '#E2E8F0',
    borderRadius: 10,
    borderWidth: 1,
    padding: spacing.sm,
  },
  warningBanner: {
    backgroundColor: '#FEF3C7',
    borderColor: '#FDE68A',
    borderRadius: 10,
    borderWidth: 1,
    padding: spacing.sm,
  },
  warningText: {
    fontSize: 13,
    color: '#92400E',
    flexShrink: 1,
  },
  cargoSpecsBox: {
    backgroundColor: '#F8FAFC',
    borderColor: '#E2E8F0',
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
    color: '#64748B',
    fontSize: 12,
    fontWeight: '600',
    minWidth: 80,
  },
  cargoSpecValue: {
    color: '#0F172A',
    fontSize: 12.5,
    fontWeight: '700',
    flex: 1,
  },
  mediaGrid: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  mediaTile: {
    backgroundColor: '#F8FAFC',
    borderColor: '#E2E8F0',
    borderRadius: 12,
    borderWidth: 1,
    flex: 1,
    gap: spacing.sm,
    minHeight: 100,
    padding: spacing.sm,
  },
  mediaIndex: {
    color: '#0B1E42',
    fontSize: 11,
    fontWeight: '700',
  },
  mediaLabel: {
    color: '#64748B',
    fontSize: 11.5,
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
    color: '#0B1E42',
    fontSize: 20,
    fontWeight: '800',
    fontVariant: ['tabular-nums'],
  },
  paymentDetailsBox: {
    backgroundColor: '#F8FAFC',
    borderColor: '#E2E8F0',
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
    color: '#64748B',
    fontSize: 12,
    fontWeight: '500',
  },
  paymentDetailValue: {
    color: '#0F172A',
    fontSize: 12.5,
    fontWeight: '700',
  },
  paymentNoticeBox: {
    backgroundColor: '#F0FDF4',
    borderColor: '#BBF7D0',
    borderRadius: 8,
    borderWidth: 1,
    padding: 10,
  },
  paymentNoticeText: {
    color: '#15803D',
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
    backgroundColor: '#F8FAFC',
    borderColor: '#E2E8F0',
    borderRadius: 10,
    borderWidth: 1,
    color: '#0F172A',
    fontSize: 13,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  notice: {
    backgroundColor: '#FEF3C7',
    borderLeftColor: '#F59E0B',
    borderLeftWidth: 4,
    padding: spacing.sm,
    borderRadius: 10,
  },
  cancelledReasonCard: {
    backgroundColor: '#FEF2F2',
    borderColor: '#FECACA',
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
    backgroundColor: '#DC2626',
  },
  cancelledReasonTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#991B1B',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  cancelledReasonContent: {
    fontSize: 14.5,
    fontWeight: '600',
    color: '#7F1D1D',
  },
  cancelledReasonTime: {
    fontSize: 11.5,
    color: '#991B1B',
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
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 34,
    gap: 12,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 16,
    elevation: 8,
  },
  cancelSheetTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
  },
  cancelSheetSubtitle: {
    fontSize: 13,
    color: '#64748B',
    marginBottom: 4,
  },
  cancelOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#F8FAFC',
    gap: 12,
  },
  cancelOptionSelected: {
    borderColor: '#0B1E42',
    backgroundColor: '#F0F4F9',
  },
  cancelRadio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#94A3B8',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelRadioSelected: {
    borderColor: '#0B1E42',
  },
  cancelRadioDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#0B1E42',
  },
  cancelOptionText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#334155',
    flex: 1,
  },
  cancelOptionTextSelected: {
    fontWeight: '700',
    color: '#0B1E42',
  },
  cancelInput: {
    backgroundColor: '#F8FAFC',
    borderColor: '#CBD5E1',
    borderWidth: 1,
    borderRadius: 10,
    padding: 12,
    fontSize: 13.5,
    color: '#0F172A',
    minHeight: 70,
    textAlignVertical: 'top',
  },
  cancelErrorText: {
    fontSize: 12,
    color: '#DC2626',
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
    borderTopColor: '#FEE2E2',
    borderTopWidth: 1,
    gap: spacing.sm,
    paddingTop: spacing.md,
  },
  pressed: {
    opacity: 0.85,
  },
});
