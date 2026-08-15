import type { OrderStatus } from '@leopard/shared';
import type { PressableProps } from 'react-native';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, control, spacing, typography } from '../theme/tokens';
import type { RoutePoint } from './RouteSpine';
import { RouteSummary } from './RouteSpine';
import { StatusBadge } from './StatusBadge';

export type OrderSummaryMetadata = Readonly<{
  id: string;
  label: string;
  value: string;
}>;

export type OrderSummaryProps = Readonly<{
  accessibilityHint?: string;
  accessibilityLabel?: string;
  destination: RoutePoint;
  metadata?: readonly OrderSummaryMetadata[];
  onPress?: PressableProps['onPress'];
  orderReference: string;
  origin: RoutePoint;
  status: OrderStatus;
  stops: readonly RoutePoint[];
}>;

function OrderSummaryContent({
  destination,
  metadata = [],
  orderReference,
  origin,
  status,
  stops,
}: Omit<OrderSummaryProps, 'accessibilityHint' | 'accessibilityLabel' | 'onPress'>) {
  return (
    <>
      <View style={styles.header}>
        <Text style={styles.reference}>Đơn {orderReference}</Text>
        <StatusBadge domain="order" status={status} />
      </View>
      <RouteSummary destination={destination} origin={origin} stops={stops} />
      {metadata.length > 0 ? (
        <View style={styles.metadata}>
          {metadata.map((item) => (
            <View key={item.id} style={styles.metadataItem}>
              <Text style={styles.metadataLabel}>{item.label}</Text>
              <Text style={styles.metadataValue}>{item.value}</Text>
            </View>
          ))}
        </View>
      ) : null}
    </>
  );
}

export function OrderSummary(props: OrderSummaryProps) {
  const content = <OrderSummaryContent {...props} />;

  if (!props.onPress) {
    return <View style={styles.container}>{content}</View>;
  }

  return (
    <Pressable
      accessibilityHint={props.accessibilityHint ?? 'Mở chi tiết đơn'}
      accessibilityLabel={props.accessibilityLabel}
      accessibilityRole="button"
      onPress={props.onPress}
      style={({ pressed }) => [styles.container, pressed ? styles.pressed : null]}
    >
      {content}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    alignSelf: 'stretch',
    borderBottomColor: colors.neutral.border,
    borderBottomWidth: 1,
    gap: spacing.sm,
    minHeight: control.minimumTouchHeight,
    paddingVertical: spacing.sm,
  },
  pressed: {
    backgroundColor: colors.brand.softBackground,
  },
  header: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
    justifyContent: 'space-between',
  },
  reference: {
    ...typography.label,
    color: colors.neutral.text,
    flexShrink: 1,
  },
  metadata: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
  metadataItem: {
    gap: spacing.xxs,
  },
  metadataLabel: {
    ...typography.caption,
    color: colors.neutral.mutedText,
    flexShrink: 1,
  },
  metadataValue: {
    ...typography.label,
    color: colors.neutral.text,
    flexShrink: 1,
  },
});
