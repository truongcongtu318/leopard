import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { colors, leopardPalette, radius, spacing, typography } from '../../../theme/tokens';
import { Button } from '../../../ui/Button';
import { EtaIndicator } from '../../../ui/EtaIndicator';
import { IconMessage, IconPhone } from '../../../ui/icons/CoreIcons';
import { MapPanel } from '../../../ui/MapPanel';
import { PaymentSummary } from '../../../ui/PaymentSummary';
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
  onPrimaryAction?: (actionId: string) => void;
  onPaymentAction?: (actionId: string) => void;
  onCancel?: (actionId: string) => void;
  onRetry?: () => void;
  onPickCargoImage?: () => void;
}>;

function DriverCard({
  driverLabel,
  status = 'Tài xế nhận chuyến',
}: Readonly<{
  driverLabel: string;
  status?: string;
}>) {
  const initial = driverLabel.replace(/^Tài xế\s*/i, '').trim().charAt(0) || 'T';

  return (
    <View style={styles.driverCard}>
      <View style={styles.driverAvatar}>
        <Text style={styles.driverAvatarText}>{initial}</Text>
      </View>
      <View style={styles.driverInfo}>
        <Text style={styles.driverName}>{driverLabel}</Text>
        <Text style={styles.driverStatusText}>{status} • ★ 4.9</Text>
      </View>
      <View style={styles.driverActions}>
        <View style={styles.driverActionBtn}>
          <IconPhone color={colors.brand.background} size={18} />
        </View>
        <View style={styles.driverActionBtn}>
          <IconMessage color={colors.brand.background} size={18} />
        </View>
      </View>
    </View>
  );
}

function TrackingPanel({
  destinationLabel,
  onRetry,
  originLabel,
  tracking,
}: Readonly<{
  tracking: CustomerTrackingView;
  onRetry?: () => void;
  originLabel: string;
  destinationLabel: string;
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
        <DriverCard driverLabel={tracking.driverLabel} status="Đang định vị" />
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
      markerLabel={`${tracking.driverLabel} · marker mô phỏng`}
      originLabel={originLabel}
    />
  );
  if (tracking.kind === 'fresh') {
    return (
      <View style={styles.section}>
        <DriverCard driverLabel={tracking.driverLabel} status="Đang di chuyển" />
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
      <DriverCard driverLabel={tracking.driverLabel} status="Vị trí chưa cập nhật" />
      <View style={styles.warningBanner}>
        <Text style={styles.body}>{tracking.message}</Text>
      </View>
      <Text style={styles.helper}>Cập nhật lần cuối: {tracking.lastUpdatedLabel}</Text>
      <MapPanel lastUpdatedLabel={tracking.lastUpdatedLabel} onRetry={onRetry} state="stale" summary={tracking.summary}>
        {mapContent}
      </MapPanel>
    </View>
  );
}

function CustomerDetailContent({
  onCancel,
  onPaymentAction,
  onPickCargoImage,
  onPrimaryAction,
  onRetry,
  view,
}: Readonly<{
  view: CustomerDetailContentView;
  onPrimaryAction?: (actionId: string) => void;
  onPaymentAction?: (actionId: string) => void;
  onCancel?: (actionId: string) => void;
  onRetry?: () => void;
  onPickCargoImage?: () => void;
}>) {
  const order = view.order;
  const cancelAction = 'action' in view.cancel ? view.cancel.action : null;

  return (
    <ScreenScaffold
      eyebrow="CUSTOMER · JOURNEY SHEET"
      title={`Đơn ${order.reference}`}
    >
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Journey Status Slab */}
        <View style={styles.journeyStatusSlab}>
          <Text style={styles.slabEyebrow}>TRẠNG THÁI HIỆN TẠI</Text>
          <View style={styles.statusRow}>
            <StatusBadge domain="order" status={order.status} />
            <Text style={styles.slabPrice}>{order.priceLabel}</Text>
          </View>
        </View>

        {view.notice ? (
          <View style={styles.notice}>
            <Text style={styles.warningText}>{view.notice}</Text>
          </View>
        ) : null}

        {/* Section: Tracking Map & Driver Hero */}
        <View style={styles.modernCard}>
          <View style={styles.cardHeader}>
            <Text accessibilityRole="header" style={styles.cardTitle}>
              Bản đồ hành trình
            </Text>
            <Text style={styles.cardSubtitle}>Vị trí xe và lộ trình theo thời gian thực</Text>
          </View>
          <TrackingPanel
            destinationLabel={order.route.destination.label}
            onRetry={onRetry}
            originLabel={order.route.origin.label}
            tracking={order.tracking}
          />
          {typeof order.etaDurationSeconds === 'number' && !Number.isNaN(order.etaDurationSeconds) ? (
            <EtaIndicator
              durationSeconds={order.etaDurationSeconds}
              source={order.etaSource}
            />
          ) : null}
        </View>

        {/* Section: Route */}
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

        {/* Section: Payment */}
        <PaymentSummary
          action={
            order.payment.action
              ? {
                  label: order.payment.action.label,
                  onPress: onPaymentAction ? () => onPaymentAction(order.payment.action!.id) : undefined,
                  disabled: order.payment.action.disabled,
                  isLoading: order.payment.action.isPending,
                  loadingLabel: order.payment.action.pendingLabel,
                }
              : undefined
          }
          amountLabel={order.payment.amountLabel}
          expiresAtLabel={order.payment.expiresAtLabel}
          notice={order.payment.notice}
          referenceLabel={order.payment.referenceLabel}
          sourceLabel={order.payment.sourceLabel}
          status={order.payment.status}
        />

        {/* Section: Media */}
        <View style={styles.modernCard}>
          <View style={styles.cardHeader}>
            <Text accessibilityRole="header" style={styles.cardTitle}>
              Minh chứng hàng hóa
            </Text>
            <Text style={styles.cardSubtitle}>Quy cách hàng hóa và hình ảnh đính kèm</Text>
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

        {/* Section: Timeline */}
        <StatusTimeline
          entries={order.history.map((h) => ({
            id: h.id,
            status: h.status,
            timestampLabel: h.timestampLabel,
            description: h.description,
            isCurrent: h.status === order.status,
          }))}
        />

        {/* Primary Action Buttons */}
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
      <ScreenScaffold eyebrow="CUSTOMER · JOURNEY SHEET" title="Chi tiết đơn hàng">
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
    paddingBottom: spacing.xl,
  },
  section: {
    gap: spacing.sm,
  },
  modernCard: {
    backgroundColor: leopardPalette.surfaceWhite,
    borderColor: leopardPalette.cardBorder,
    borderRadius: radius.card,
    borderWidth: 1,
    gap: spacing.sm,
    padding: spacing.md,
  },
  cardHeader: {
    gap: 2,
    marginBottom: spacing.xxs,
  },
  cardTitle: {
    ...typography.sectionTitle,
    color: colors.neutral.titleText,
    fontSize: 16,
    fontWeight: '700',
  },
  cardSubtitle: {
    ...typography.caption,
    color: colors.neutral.mutedText,
    fontSize: 12,
  },
  journeyStatusSlab: {
    backgroundColor: leopardPalette.surfaceWhite,
    borderLeftColor: colors.brand.background,
    borderLeftWidth: 4,
    borderRadius: radius.card,
    borderColor: leopardPalette.cardBorder,
    borderWidth: 1,
    gap: spacing.xs,
    padding: spacing.md,
  },
  slabEyebrow: {
    ...typography.caption,
    color: colors.brand.softText,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.8,
  },
  statusRow: {
    alignItems: 'center',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    justifyContent: 'space-between',
  },
  slabPrice: {
    ...typography.label,
    color: leopardPalette.primary,
    fontSize: 20,
    fontWeight: '800',
    fontVariant: ['tabular-nums'],
    flexShrink: 1,
  },
  driverCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderColor: '#E2E8F0',
    borderRadius: 10,
    borderWidth: 1,
    padding: spacing.sm,
    gap: spacing.sm,
  },
  driverAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.brand.softBackground,
    borderWidth: 1,
    borderColor: colors.brand.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  driverAvatarText: {
    color: colors.brand.background,
    fontSize: 18,
    fontWeight: '800',
  },
  driverInfo: {
    flex: 1,
    gap: 2,
  },
  driverName: {
    color: colors.neutral.titleText,
    fontSize: 14.5,
    fontWeight: '700',
  },
  driverStatusText: {
    color: colors.neutral.mutedText,
    fontSize: 12,
    fontWeight: '500',
  },
  driverActions: {
    flexDirection: 'row',
    gap: 8,
  },
  driverActionBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    alignItems: 'center',
    justifyContent: 'center',
  },
  driverText: {
    ...typography.label,
    color: colors.neutral.text,
    flexShrink: 1,
  },
  body: {
    ...typography.body,
    fontSize: 14,
    color: colors.neutral.text,
    flexShrink: 1,
  },
  helper: {
    ...typography.caption,
    color: colors.neutral.mutedText,
    flexShrink: 1,
  },
  freshnessRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  pulseDotGreen: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.success.border,
  },
  infoBanner: {
    backgroundColor: colors.info.background,
    borderColor: colors.info.border,
    borderRadius: radius.control,
    borderWidth: 1,
    padding: spacing.sm,
  },
  warningBanner: {
    backgroundColor: colors.warning.background,
    borderColor: colors.warning.border,
    borderRadius: radius.control,
    borderWidth: 1,
    padding: spacing.sm,
  },
  warningText: {
    ...typography.body,
    fontSize: 13.5,
    color: colors.warning.text,
    flexShrink: 1,
  },
  mediaGrid: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  mediaTile: {
    backgroundColor: leopardPalette.surfaceWhite,
    borderColor: leopardPalette.cardBorder,
    borderRadius: radius.card,
    borderWidth: 1,
    flex: 1,
    gap: spacing.sm,
    minHeight: 100,
    padding: spacing.sm,
  },
  mediaIndex: {
    ...typography.caption,
    color: colors.brand.background,
    fontWeight: '700',
  },
  mediaLabel: {
    ...typography.caption,
    color: colors.neutral.mutedText,
    fontWeight: '600',
  },
  notice: {
    backgroundColor: colors.warning.background,
    borderLeftColor: colors.warning.border,
    borderLeftWidth: 4,
    padding: spacing.sm,
    borderRadius: radius.cardSm,
  },
  cancelSection: {
    borderTopColor: colors.danger.border,
    borderTopWidth: 1,
    gap: spacing.sm,
    paddingTop: spacing.md,
  },
});
