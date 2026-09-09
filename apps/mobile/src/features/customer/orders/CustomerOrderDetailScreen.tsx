import { useState } from 'react';
import { Alert, Linking, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import {
  colors,
  layout,
  leopardPalette,
  radius,
  spacing,
  typography,
} from '../../../theme/tokens';
import { Button } from '../../../ui/Button';
import { EtaIndicator } from '../../../ui/EtaIndicator';
import {
  IconCheck,
  IconClock,
  IconCopy,
  IconExternalLink,
  IconLocationPin,
  IconMessage,
  IconPhone,
  IconShieldAlert,
} from '../../../ui/icons/CoreIcons';
import { MapPanel } from '../../../ui/MapPanel';
import { RouteSpine } from '../../../ui/RouteSpine';
import { RouteMapSchematic } from '../../../ui/RouteMapSchematic';
import { MediaImage } from '../../../ui/MediaImage';
import { ScreenScaffold } from '../../../ui/ScreenScaffold';
import { ScreenState } from '../../../ui/ScreenState';
import { StatusBadge } from '../../../ui/StatusBadge';
import { StatusTimeline } from '../../../ui/StatusTimeline';
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
  onCancel?: (actionId: string) => void;
  onRetry?: () => void;
  onPickCargoImage?: () => void;
  onOpenTracking?: (orderId: string) => void;
  onOpenInvoice?: (invoiceId: string) => void;
  onSendInvoiceEmail?: (invoiceId: string, email: string) => void;
}>;

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
            onPress={handleCall}
            style={({ pressed }) => [styles.driverCallBtn, pressed ? styles.pressed : null]}
          >
            <IconPhone color="#16A34A" size={17} />
          </Pressable>
          <Pressable
            accessibilityLabel="Nhắn tin cho tài xế"
            accessibilityRole="button"
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
  distanceMeters,
  etaDurationSeconds,
  onOpenTracking,
  onRetry,
  orderId,
  originLabel,
  tracking,
}: Readonly<{
  tracking: CustomerTrackingView;
  onRetry?: () => void;
  originLabel: string;
  destinationLabel: string;
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
          <RouteMapSchematic destinationLabel={destinationLabel} originLabel={originLabel} />
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
          <RouteMapSchematic destinationLabel={destinationLabel} originLabel={originLabel} />
        </MapPanel>
      </View>
    );
  }
  const mapContent = (
    <RouteMapSchematic
      destinationLabel={destinationLabel}
      markerLabel={`${tracking.driverLabel} (Đang di chuyển)`}
      originLabel={originLabel}
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
  onCancel?: (actionId: string) => void;
  onRetry?: () => void;
  onPickCargoImage?: () => void;
  onOpenTracking?: (orderId: string) => void;
  onOpenInvoice?: (invoiceId: string) => void;
  onSendInvoiceEmail?: (invoiceId: string, email: string) => void;
}>) {
  const order = view.order;
  const cancelAction = 'action' in view.cancel ? view.cancel.action : null;
  const [copied, setCopied] = useState(false);

  const handleCopyOrderCode = () => {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      void navigator.clipboard.writeText(order.reference);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const isUnpaid = order.payment.status === 'UNPAID' || order.payment.status === 'QR_CREATED';

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
              <StatusBadge domain="order" status={order.status} />
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
            {typeof order.etaDurationSeconds === 'number' && !Number.isNaN(order.etaDurationSeconds) ? (
              <View style={styles.heroStatItem}>
                <Text style={styles.heroStatLabel}>DỰ KIẾN (ETA)</Text>
                <Text style={styles.heroStatValue}>
                  ~{Math.round(order.etaDurationSeconds / 60)} phút
                </Text>
              </View>
            ) : null}
          </View>

          {typeof order.etaDurationSeconds === 'number' && !Number.isNaN(order.etaDurationSeconds) ? (
            <View style={styles.etaIndicatorBox}>
              <EtaIndicator
                durationSeconds={order.etaDurationSeconds}
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
            destinationLabel={order.route.destination.label}
            distanceMeters={order.distanceMeters}
            etaDurationSeconds={order.etaDurationSeconds}
            onOpenTracking={onOpenTracking}
            onRetry={onRetry}
            orderId={order.id}
            originLabel={order.route.origin.label}
            tracking={order.tracking}
          />

          {/* 🚀 Nút liên kết chuyển tiếp sang trang Tracking toàn màn hình */}
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
              onPress={onCancel ? () => onCancel(cancelAction.id) : undefined}
              variant="destructive"
            />
          </View>
        ) : null}
      </ScrollView>
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
    paddingBottom: layout.bottomNavClearance,
  },
  section: {
    gap: spacing.sm,
  },
  heroCard: {
    backgroundColor: '#FFFFFF',
    borderColor: '#E2E8F0',
    borderLeftWidth: 4,
    borderLeftColor: '#0B1E42',
    borderRadius: 16,
    borderWidth: 1,
    padding: spacing.md,
    gap: 12,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 3,
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
    backgroundColor: '#EFF6FF',
    borderColor: '#BFDBFE',
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
    backgroundColor: '#DBEAFE',
    alignItems: 'center',
    justifyContent: 'center',
  },
  trackingLinkTextWrap: {
    flex: 1,
    gap: 1,
  },
  trackingLinkTitle: {
    color: '#1D4ED8',
    fontSize: 13,
    fontWeight: '700',
  },
  trackingLinkSubtitle: {
    color: '#60A5FA',
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
    backgroundColor: '#EFF6FF',
    borderColor: '#BFDBFE',
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
    color: '#94A3B8',
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
    color: '#94A3B8',
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
    backgroundColor: '#EFF6FF',
    borderColor: '#BFDBFE',
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
    backgroundColor: '#EFF6FF',
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
    backgroundColor: '#EFF6FF',
    borderColor: '#BFDBFE',
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
