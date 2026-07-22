import type {
  DriverAvailability,
  OrderStatus,
  PaymentStatus,
  UserStatus,
} from '@leopard/shared';
import { StyleSheet, Text, View } from 'react-native';

import { colors, radius, spacing, typography } from '../theme/tokens';

type MobileStatus = DriverAvailability | OrderStatus | PaymentStatus | UserStatus;
type StatusColorRole = 'neutral' | 'info' | 'warning' | 'active' | 'success' | 'danger';

const statusColorRoles: Record<MobileStatus, StatusColorRole> = {
  REQUESTED: 'info',
  ACCEPTED: 'active',
  PICKING_UP: 'warning',
  IN_TRANSIT: 'active',
  DELIVERED: 'success',
  CANCELLED: 'danger',
  UNPAID: 'warning',
  QR_CREATED: 'info',
  PAID_MANUAL: 'success',
  FAILED: 'danger',
  OFFLINE: 'neutral',
  AVAILABLE: 'success',
  BUSY: 'active',
  ACTIVE: 'active',
  DISABLED: 'danger',
};

type StatusBadgeProps = {
  status: MobileStatus;
};

export function StatusBadge({ status }: StatusBadgeProps) {
  const semanticColors = colors[statusColorRoles[status]];

  return (
    <View
      accessibilityLabel={`Trạng thái ${status}`}
      style={[
        styles.badge,
        {
          backgroundColor: semanticColors.background,
          borderColor: semanticColors.border,
        },
      ]}
    >
      <Text style={[styles.text, { color: semanticColors.text }]}>{status}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    alignItems: 'center',
    alignSelf: 'flex-start',
    borderRadius: radius.pill,
    borderWidth: 1,
    maxWidth: '100%',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xxs,
  },
  text: {
    ...typography.label,
    flexShrink: 1,
  },
});
