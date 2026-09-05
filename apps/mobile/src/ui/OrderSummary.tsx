import React from 'react';
import type { OrderStatus } from '@leopard/shared';
import type { PressableProps } from 'react-native';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, control, radius, spacing, typography } from '../theme/tokens';
import { IconSpeedTruck } from './icons/CoreIcons';
import type { RoutePoint } from './RouteSpine';
import { StatusBadge } from './StatusBadge';

export type OrderSummaryMetadata = Readonly<{
  id: string;
  label: string;
  value: string;
}>;

export type OrderSummaryProps = Readonly<{
  accessibilityHint?: string;
  accessibilityLabel?: string;
  actionButton?: React.ReactNode;
  destination: RoutePoint;
  metadata?: readonly OrderSummaryMetadata[];
  onPress?: PressableProps['onPress'];
  orderReference: string;
  origin: RoutePoint;
  status: OrderStatus;
  stops?: readonly RoutePoint[];
  variant?: 'horizontal' | 'vertical';
}>;

function OrderSummaryContent({
  actionButton,
  destination,
  metadata = [],
  orderReference,
  origin,
  status,
  stops = [],
  variant = 'vertical',
}: Omit<OrderSummaryProps, 'accessibilityHint' | 'accessibilityLabel' | 'onPress'>) {
  const etaItem = metadata.find((m) => m.id === 'eta');
  const priceItem = metadata.find((m) => m.id === 'price');
  const updatedItem = metadata.find((m) => m.id === 'updated');

  return (
    <>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <View style={styles.iconBox}>
            <IconSpeedTruck color={colors.brand.background} size={20} />
          </View>
          <View style={styles.titleWrap}>
            <Text numberOfLines={1} style={styles.reference}>
              Đơn {orderReference}
            </Text>
            {updatedItem ? (
              <Text numberOfLines={1} style={styles.updatedAt}>
                {updatedItem.value}
              </Text>
            ) : null}
          </View>
        </View>
        <StatusBadge domain="order" status={status} />
      </View>

      {variant === 'horizontal' ? (
        <View style={styles.routeBox}>
          <View style={styles.routeColLeft}>
            <Text style={styles.routeLabel}>TỪ</Text>
            <Text numberOfLines={1} style={styles.routeAddress}>
              {origin.label}
            </Text>
          </View>

          <View style={styles.routeConnector}>
            <View style={[styles.connectorDot, { backgroundColor: colors.brand.background }]} />
            <View style={styles.connectorLine} />
            <View style={[styles.connectorDot, { backgroundColor: colors.active.border }]} />
          </View>

          <View style={styles.routeColRight}>
            <Text style={styles.routeLabel}>ĐẾN</Text>
            <Text numberOfLines={1} style={[styles.routeAddress, { textAlign: 'right' }]}>
              {destination.label}
            </Text>
          </View>
        </View>
      ) : (
        <View style={styles.verticalRoute}>
          <View style={styles.verticalRouteRow}>
            <View style={styles.markerCol}>
              <View style={[styles.originMarker, { backgroundColor: colors.brand.background }]} />
              <View style={styles.connectorLineVertical} />
            </View>
            <View style={styles.addressCol}>
              <Text style={styles.routeSubLabel}>ĐIỂM LẤY HÀNG</Text>
              <Text numberOfLines={2} style={styles.routeAddressVertical}>
                {origin.label}
              </Text>
            </View>
          </View>

          {stops && stops.length > 0 ? (
            <View style={styles.verticalRouteRow}>
              <View style={styles.markerCol}>
                <View style={styles.stopMarker} />
                <View style={styles.connectorLineVertical} />
              </View>
              <View style={styles.addressCol}>
                <Text style={styles.stopsBadge}>{`+ ${stops.length} điểm dừng`}</Text>
              </View>
            </View>
          ) : null}

          <View style={styles.verticalRouteRow}>
            <View style={styles.markerCol}>
              <View style={[styles.destMarker, { backgroundColor: colors.warning.border }]} />
            </View>
            <View style={styles.addressCol}>
              <Text style={styles.routeSubLabel}>ĐIỂM GIAO HÀNG</Text>
              <Text numberOfLines={2} style={styles.routeAddressVertical}>
                {destination.label}
              </Text>
            </View>
          </View>
        </View>
      )}

      <View style={styles.footerRow}>
        <View style={styles.priceContainer}>
          <Text style={styles.priceSubLabel}>Giá cước</Text>
          <Text style={styles.priceText}>{priceItem?.value ?? '—'}</Text>
        </View>
        <View style={styles.footerRight}>
          {etaItem ? (
            <View style={styles.etaBox}>
              <Text style={styles.etaLabel}>{etaItem.label}</Text>
              <Text style={styles.etaText}>{etaItem.value}</Text>
            </View>
          ) : null}
          {actionButton ? actionButton : <Text style={styles.chevron}>›</Text>}
        </View>
      </View>
    </>
  );
}

function OrderSummaryComponent(props: OrderSummaryProps) {
  const content = <OrderSummaryContent {...props} />;

  const accentColor = (() => {
    switch (props.status) {
      case 'REQUESTED':
        return colors.info.border;
      case 'ACCEPTED':
      case 'IN_TRANSIT':
        return colors.active.border;
      case 'DELIVERED':
        return colors.success.border;
      case 'CANCELLED':
        return colors.danger.border;
      default:
        return colors.neutral.border;
    }
  })();

  const containerStyle = [
    styles.container,
    { borderLeftWidth: 4, borderLeftColor: accentColor },
  ];

  if (!props.onPress) {
    return <View style={containerStyle}>{content}</View>;
  }

  return (
    <Pressable
      accessibilityHint={props.accessibilityHint ?? 'Mở chi tiết đơn'}
      accessibilityLabel={props.accessibilityLabel}
      accessibilityRole="button"
      onPress={props.onPress}
      style={({ pressed }) => [containerStyle, pressed ? styles.pressed : null]}
      testID={`order-summary-${props.orderReference}`}
    >
      {content}
    </Pressable>
  );
}

export const OrderSummary = React.memo(OrderSummaryComponent);

const styles = StyleSheet.create({
  container: {
    alignSelf: 'stretch',
    backgroundColor: '#FFFFFF',
    borderColor: '#E2E8F0',
    borderRadius: 16,
    borderWidth: 1,
    gap: spacing.sm,
    minHeight: control.minimumTouchHeight,
    padding: spacing.md,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  etaLabel: {
    ...typography.caption,
    color: colors.info.text,
    fontSize: 11,
    fontWeight: '600',
  },
  pressed: {
    opacity: 0.88,
  },
  header: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: spacing.xs,
  },
  headerLeft: {
    alignItems: 'center',
    flex: 1,
    flexDirection: 'row',
    gap: spacing.sm,
    minWidth: 0,
  },
  iconBox: {
    alignItems: 'center',
    backgroundColor: colors.brand.softBackground,
    borderRadius: radius.control,
    height: 36,
    justifyContent: 'center',
    width: 36,
  },
  titleWrap: {
    flex: 1,
    minWidth: 0,
  },
  reference: {
    color: colors.neutral.titleText,
    fontSize: 15,
    fontWeight: '700',
  },
  updatedAt: {
    ...typography.caption,
    color: colors.neutral.subtleText,
    marginTop: 1,
  },
  routeBox: {
    alignItems: 'center',
    backgroundColor: colors.neutral.canvas,
    borderColor: colors.neutral.border,
    borderRadius: radius.control,
    borderWidth: 1,
    flexDirection: 'row',
    gap: spacing.xs,
    paddingHorizontal: spacing.sm,
    paddingVertical: 8,
  },
  routeColLeft: {
    flex: 1,
    minWidth: 0,
  },
  routeColRight: {
    flex: 1,
    minWidth: 0,
    alignItems: 'flex-end',
  },
  routeLabel: {
    ...typography.caption,
    color: colors.brand.softText,
    fontSize: 10,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
  routeAddress: {
    color: colors.neutral.text,
    fontSize: 13,
    fontWeight: '400',
    marginTop: 1,
  },
  routeConnector: {
    alignItems: 'center',
    flexShrink: 0,
    gap: 2,
    paddingHorizontal: 4,
  },
  connectorDot: {
    borderRadius: radius.pill,
    height: 6,
    width: 6,
  },
  connectorLine: {
    backgroundColor: colors.neutral.border,
    height: 12,
    width: 1,
  },
  verticalRoute: {
    backgroundColor: '#F8FAFC',
    borderColor: '#E2E8F0',
    borderRadius: 8,
    borderWidth: 1,
    gap: 2,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  verticalRouteRow: {
    flexDirection: 'row',
    gap: 10,
  },
  markerCol: {
    alignItems: 'center',
    width: 16,
    paddingTop: 3,
  },
  originMarker: {
    borderRadius: 999,
    height: 8,
    width: 8,
  },
  destMarker: {
    borderRadius: 2,
    height: 8,
    width: 8,
  },
  stopMarker: {
    backgroundColor: colors.neutral.border,
    borderRadius: 999,
    height: 6,
    width: 6,
  },
  connectorLineVertical: {
    backgroundColor: '#CBD5E1',
    flex: 1,
    marginVertical: 2,
    minHeight: 14,
    width: 1.5,
  },
  addressCol: {
    flex: 1,
    minWidth: 0,
    paddingBottom: 4,
  },
  routeSubLabel: {
    color: colors.neutral.mutedText,
    fontSize: 9.5,
    fontWeight: '700',
    letterSpacing: 0.4,
    marginBottom: 1,
  },
  routeAddressVertical: {
    color: colors.neutral.text,
    fontSize: 13,
    fontWeight: '500',
    lineHeight: 18,
  },
  stopsBadge: {
    ...typography.caption,
    color: colors.brand.background,
    fontSize: 11,
    fontWeight: '600',
    paddingVertical: 1,
  },
  footerRow: {
    alignItems: 'center',
    borderTopColor: '#F1F5F9',
    borderTopWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: spacing.xs,
  },
  priceContainer: {
    gap: 1,
  },
  priceSubLabel: {
    color: colors.neutral.mutedText,
    fontSize: 10,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
  priceText: {
    color: colors.brand.background,
    fontSize: 17,
    fontWeight: '800',
    fontVariant: ['tabular-nums'],
  },
  footerRight: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 6,
  },
  etaBox: {
    alignItems: 'center',
    backgroundColor: colors.info.background,
    borderColor: colors.info.border,
    borderRadius: radius.pill,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  etaText: {
    ...typography.caption,
    color: colors.info.text,
    fontSize: 11.5,
    fontWeight: '700',
  },
  chevron: {
    color: colors.neutral.mutedText,
    fontSize: 18,
    fontWeight: '700',
    lineHeight: 18,
    marginLeft: 2,
  },
});
