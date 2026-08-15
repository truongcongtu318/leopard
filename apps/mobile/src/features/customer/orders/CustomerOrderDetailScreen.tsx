import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { colors, radius, spacing, typography } from '../../../theme/tokens';
import { Button } from '../../../ui/Button';
import { EtaIndicator } from '../../../ui/EtaIndicator';
import { MapPanel } from '../../../ui/MapPanel';
import { PaymentSummary } from '../../../ui/PaymentSummary';
import { RouteSpine } from '../../../ui/RouteSpine';
import { ScreenScaffold, SectionHeading } from '../../../ui/ScreenScaffold';
import { ScreenState } from '../../../ui/ScreenState';
import { StatusBadge } from '../../../ui/StatusBadge';
import { StatusTimeline } from '../../../ui/StatusTimeline';
import type {
  CustomerActionView,
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
}>;

function TrackingPanel({
  tracking,
  onRetry,
}: Readonly<{ tracking: CustomerTrackingView; onRetry?: () => void }>) {
  if (tracking.kind === 'loading') {
    return <MapPanel state="loading" summary="Bản đồ lộ trình đang tải" />;
  }
  if (tracking.kind === 'map-error') {
    return (
      <View style={styles.section}>
        <Text style={styles.body}>{tracking.driverLabel}</Text>
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
        <Text style={styles.body}>{tracking.message}</Text>
        <MapPanel state="ready" summary="Bản đồ lộ trình; chưa có tài xế">
          <View style={styles.mapPlaceholder}>
            <Text style={styles.body}>Lộ trình đã sẵn sàng; chưa có marker tài xế.</Text>
          </View>
        </MapPanel>
      </View>
    );
  }
  if (tracking.kind === 'no-location') {
    return (
      <View style={styles.section}>
        <Text style={styles.driver}>{tracking.driverLabel}</Text>
        <Text style={styles.body}>{tracking.message}</Text>
        <MapPanel state="ready" summary="Bản đồ lộ trình; chưa có vị trí tài xế">
          <View style={styles.mapPlaceholder}>
            <Text style={styles.body}>Route-only map · chưa có vị trí tài xế.</Text>
          </View>
        </MapPanel>
      </View>
    );
  }
  const mapContent = (
    <View style={styles.mapPlaceholder}>
      <Text style={styles.driver}>{tracking.driverLabel}</Text>
      <Text style={styles.body}>Marker vị trí mô phỏng · không phải tracking trực tiếp.</Text>
    </View>
  );
  if (tracking.kind === 'fresh') {
    return (
      <View style={styles.section}>
        <Text style={styles.driver}>{tracking.driverLabel}</Text>
        <Text style={styles.helper}>Cập nhật lần cuối: {tracking.lastUpdatedLabel}</Text>
        <MapPanel state="ready" summary={tracking.summary}>
          {mapContent}
        </MapPanel>
      </View>
    );
  }
  return (
    <View style={styles.section}>
      <Text style={styles.driver}>{tracking.driverLabel}</Text>
      <Text accessibilityLiveRegion="polite" style={styles.warningText}>
        {tracking.message}
      </Text>
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

function ActionButton({
  action,
  onPress,
}: Readonly<{ action: CustomerActionView; onPress?: (actionId: string) => void }>) {
  return (
    <Button
      disabled={action.disabled}
      isLoading={action.isPending}
      label={action.label}
      loadingLabel={action.pendingLabel}
      onPress={
        onPress && !action.disabled && !action.isPending ? () => onPress(action.id) : undefined
      }
      variant={
        action.emphasis === 'destructive'
          ? 'destructive'
          : action.emphasis === 'secondary'
            ? 'secondary'
            : 'primary'
      }
    />
  );
}

function CustomerDetailContent({
  view,
  onPrimaryAction,
  onPaymentAction,
  onCancel,
  onRetry,
}: Readonly<Omit<CustomerOrderDetailScreenProps, 'view'> & { view: CustomerDetailContentView }>) {
  const { order } = view;
  return (
    <ScreenScaffold subtitle={`Cập nhật ${order.updatedAtLabel}`} title={`Đơn ${order.reference}`}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.statusRow}>
          <StatusBadge domain="order" status={order.status} />
          <Text style={styles.price}>Giá dự kiến · {order.priceLabel}</Text>
        </View>
        {view.notice ? (
          <View accessibilityLiveRegion="polite" style={styles.notice}>
            <Text style={styles.warningText}>{view.notice}</Text>
          </View>
        ) : null}

        <View style={styles.section}>
          <SectionHeading title="Lộ trình" />
          <RouteSpine
            destination={order.route.destination}
            origin={order.route.origin}
            stops={order.route.stops}
          />
          <Text style={styles.helper}>Khoảng cách {order.route.distanceLabel}</Text>
          <EtaIndicator durationSeconds={order.etaDurationSeconds} source={order.etaSource} />
        </View>

        <View style={styles.section}>
          <SectionHeading title="Tài xế và tracking" />
          <TrackingPanel onRetry={onRetry} tracking={order.tracking} />
        </View>

        <PaymentSummary
          action={
            order.payment.action
              ? {
                  disabled: order.payment.action.disabled,
                  isLoading: order.payment.action.isPending,
                  label: order.payment.action.label,
                  loadingLabel: order.payment.action.pendingLabel,
                  onPress: onPaymentAction
                    ? () => onPaymentAction(order.payment.action?.id ?? 'payment')
                    : undefined,
                }
              : undefined
          }
          amountLabel={order.payment.amountLabel}
          expiresAtLabel={order.payment.expiresAtLabel}
          referenceLabel={order.payment.referenceLabel}
          sourceLabel={order.payment.sourceLabel}
          status={order.payment.status}
        />
        {order.payment.notice ? (
          <View style={order.payment.qrState === 'expired' ? styles.expiredNotice : styles.notice}>
            <Text
              accessibilityRole={order.payment.status === 'FAILED' ? 'alert' : undefined}
              style={styles.body}
            >
              {order.payment.notice}
            </Text>
          </View>
        ) : null}

        <View style={styles.section}>
          <SectionHeading title={order.media.label} />
          <Text
            accessibilityRole={order.media.kind === 'error' ? 'alert' : undefined}
            style={styles.body}
          >
            {order.media.description}
          </Text>
        </View>

        <StatusTimeline entries={order.history} />

        {view.actions.map((action) => (
          <ActionButton action={action} key={action.id} onPress={onPrimaryAction} />
        ))}

        {view.cancel.kind === 'unavailable' ? (
          <View style={styles.section}>
            <SectionHeading title="Hủy đơn" />
            <Text style={styles.helper}>{view.cancel.reason}</Text>
          </View>
        ) : null}
        {view.cancel.kind !== 'hidden' && view.cancel.kind !== 'unavailable' ? (
          <View style={styles.cancelSection}>
            <SectionHeading title="Hủy đơn" />
            <Text
              accessibilityRole={view.cancel.kind === 'error' ? 'alert' : undefined}
              style={styles.body}
            >
              {view.cancel.message}
            </Text>
            <ActionButton action={view.cancel.action} onPress={onCancel} />
          </View>
        ) : null}
      </ScrollView>
    </ScreenScaffold>
  );
}

export function CustomerOrderDetailScreen(props: CustomerOrderDetailScreenProps) {
  if (props.view.kind !== 'content') {
    return (
      <ScreenScaffold title="Chi tiết đơn">
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
    gap: spacing.lg,
    paddingBottom: spacing.xl,
  },
  section: { gap: spacing.sm },
  statusRow: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    justifyContent: 'space-between',
  },
  price: {
    ...typography.label,
    color: colors.neutral.text,
    flexShrink: 1,
  },
  driver: {
    ...typography.label,
    color: colors.neutral.text,
    flexShrink: 1,
  },
  body: {
    ...typography.body,
    color: colors.neutral.text,
    flexShrink: 1,
  },
  helper: {
    ...typography.caption,
    color: colors.neutral.mutedText,
    flexShrink: 1,
  },
  warningText: {
    ...typography.body,
    color: colors.warning.text,
    flexShrink: 1,
  },
  mapPlaceholder: {
    alignItems: 'center',
    flex: 1,
    gap: spacing.xs,
    justifyContent: 'center',
    padding: spacing.md,
  },
  notice: {
    backgroundColor: colors.warning.background,
    borderLeftColor: colors.warning.border,
    borderLeftWidth: 4,
    padding: spacing.sm,
  },
  expiredNotice: {
    backgroundColor: colors.danger.background,
    borderColor: colors.danger.border,
    borderRadius: radius.card,
    borderWidth: 1,
    padding: spacing.sm,
  },
  cancelSection: {
    borderTopColor: colors.danger.border,
    borderTopWidth: 1,
    gap: spacing.sm,
    paddingTop: spacing.md,
  },
});
