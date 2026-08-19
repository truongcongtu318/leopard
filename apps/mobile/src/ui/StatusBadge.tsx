import type {
  DriverAvailability,
  FleetMemberStatus,
  OrderStatus,
  PaymentStatus,
  UserStatus,
} from '@leopard/shared';
import { StyleSheet, Text, View } from 'react-native';

import { colors, radius, spacing, typography } from '../theme/tokens';

export type StatusDomain = 'order' | 'payment' | 'driver-availability' | 'fleet-member' | 'user';

type LegacyStatus = Exclude<
  DriverAvailability | FleetMemberStatus | OrderStatus | PaymentStatus | UserStatus,
  'ACTIVE'
>;

type DomainStatusBadgeProps =
  | Readonly<{ domain: 'order'; status: OrderStatus }>
  | Readonly<{ domain: 'payment'; status: PaymentStatus }>
  | Readonly<{ domain: 'driver-availability'; status: DriverAvailability }>
  | Readonly<{ domain: 'fleet-member'; status: FleetMemberStatus }>
  | Readonly<{ domain: 'user'; status: UserStatus }>;

export type StatusBadgeProps =
  | DomainStatusBadgeProps
  | Readonly<{ domain?: never; status: LegacyStatus }>;

type StatusColorRole = 'neutral' | 'info' | 'warning' | 'active' | 'success' | 'danger';

type StatusPresentation = Readonly<{
  accessibilityPrefix: string;
  colorRole: StatusColorRole;
  label: string;
}>;

type StatusPresentationCatalog = Readonly<{
  order: Readonly<Record<OrderStatus, StatusPresentation>>;
  payment: Readonly<Record<PaymentStatus, StatusPresentation>>;
  'driver-availability': Readonly<Record<DriverAvailability, StatusPresentation>>;
  'fleet-member': Readonly<Record<FleetMemberStatus, StatusPresentation>>;
  user: Readonly<Record<UserStatus, StatusPresentation>>;
}>;

const statusPresentations: StatusPresentationCatalog = {
  order: {
    REQUESTED: {
      accessibilityPrefix: 'Trạng thái đơn',
      colorRole: 'info',
      label: 'Chờ tài xế',
    },
    ACCEPTED: {
      accessibilityPrefix: 'Trạng thái đơn',
      colorRole: 'active',
      label: 'Đã nhận đơn',
    },
    PICKING_UP: {
      accessibilityPrefix: 'Trạng thái đơn',
      colorRole: 'warning',
      label: 'Đang đến điểm lấy',
    },
    PICKED_UP: {
      accessibilityPrefix: 'Trạng thái đơn',
      colorRole: 'active',
      label: 'Đã lấy hàng',
    },
    IN_TRANSIT: {
      accessibilityPrefix: 'Trạng thái đơn',
      colorRole: 'active',
      label: 'Đang vận chuyển',
    },
    DELIVERED: {
      accessibilityPrefix: 'Trạng thái đơn',
      colorRole: 'success',
      label: 'Đã giao',
    },
    CANCELLED: {
      accessibilityPrefix: 'Trạng thái đơn',
      colorRole: 'danger',
      label: 'Đã hủy',
    },
  },
  payment: {
    UNPAID: {
      accessibilityPrefix: 'Trạng thái thanh toán',
      colorRole: 'warning',
      label: 'Chưa thanh toán',
    },
    QR_CREATED: {
      accessibilityPrefix: 'Trạng thái thanh toán',
      colorRole: 'info',
      label: 'Đã tạo mã QR',
    },
    PAID_MANUAL: {
      accessibilityPrefix: 'Trạng thái thanh toán',
      colorRole: 'success',
      label: 'Đã xác nhận thanh toán',
    },
    FAILED: {
      accessibilityPrefix: 'Trạng thái thanh toán',
      colorRole: 'danger',
      label: 'Thất bại',
    },
  },
  'driver-availability': {
    OFFLINE: {
      accessibilityPrefix: 'Trạng thái nhận đơn',
      colorRole: 'neutral',
      label: 'Ngoại tuyến',
    },
    AVAILABLE: {
      accessibilityPrefix: 'Trạng thái nhận đơn',
      colorRole: 'success',
      label: 'Sẵn sàng',
    },
    BUSY: {
      accessibilityPrefix: 'Trạng thái nhận đơn',
      colorRole: 'active',
      label: 'Đang bận',
    },
  },
  'fleet-member': {
    INVITED: {
      accessibilityPrefix: 'Trạng thái thành viên đội xe',
      colorRole: 'info',
      label: 'Đã mời',
    },
    ACTIVE: {
      accessibilityPrefix: 'Trạng thái thành viên đội xe',
      colorRole: 'active',
      label: 'Đang tham gia',
    },
    REMOVED: {
      accessibilityPrefix: 'Trạng thái thành viên đội xe',
      colorRole: 'neutral',
      label: 'Đã gỡ khỏi đội xe',
    },
  },
  user: {
    ACTIVE: {
      accessibilityPrefix: 'Trạng thái tài khoản',
      colorRole: 'active',
      label: 'Đang hoạt động',
    },
    DISABLED: {
      accessibilityPrefix: 'Trạng thái tài khoản',
      colorRole: 'danger',
      label: 'Đã vô hiệu hóa',
    },
  },
};

const legacyStatusDomains: Readonly<Record<LegacyStatus, StatusDomain>> = {
  REQUESTED: 'order',
  ACCEPTED: 'order',
  PICKING_UP: 'order',
  PICKED_UP: 'order',
  IN_TRANSIT: 'order',
  DELIVERED: 'order',
  CANCELLED: 'order',
  UNPAID: 'payment',
  QR_CREATED: 'payment',
  PAID_MANUAL: 'payment',
  FAILED: 'payment',
  OFFLINE: 'driver-availability',
  AVAILABLE: 'driver-availability',
  BUSY: 'driver-availability',
  INVITED: 'fleet-member',
  REMOVED: 'fleet-member',
  DISABLED: 'user',
};

const unknownPresentation: StatusPresentation = {
  accessibilityPrefix: 'Trạng thái',
  colorRole: 'neutral',
  label: 'Không xác định',
};

function resolvePresentation({ domain, status }: StatusBadgeProps): StatusPresentation {
  const resolvedDomain = domain ?? legacyStatusDomains[status as LegacyStatus];

  if (
    !resolvedDomain ||
    !Object.prototype.hasOwnProperty.call(statusPresentations, resolvedDomain)
  ) {
    return unknownPresentation;
  }

  const presentationsForDomain: Readonly<Record<string, StatusPresentation>> =
    statusPresentations[resolvedDomain];

  return presentationsForDomain[status] ?? unknownPresentation;
}

const colorRoleStyles = StyleSheet.create({
  neutral: {
    backgroundColor: colors.neutral.background,
    borderColor: colors.neutral.border,
  },
  info: {
    backgroundColor: colors.info.background,
    borderColor: colors.info.border,
  },
  warning: {
    backgroundColor: colors.warning.background,
    borderColor: colors.warning.border,
  },
  active: {
    backgroundColor: colors.active.background,
    borderColor: colors.active.border,
  },
  success: {
    backgroundColor: colors.success.background,
    borderColor: colors.success.border,
  },
  danger: {
    backgroundColor: colors.danger.background,
    borderColor: colors.danger.border,
  },
});

const colorRoleTextStyles = StyleSheet.create({
  neutral: { color: colors.neutral.text },
  info: { color: colors.info.text },
  warning: { color: colors.warning.text },
  active: { color: colors.active.text },
  success: { color: colors.success.text },
  danger: { color: colors.danger.text },
});

const colorRoleDotStyles = StyleSheet.create({
  neutral: { backgroundColor: colors.neutral.text },
  info: { backgroundColor: colors.info.text },
  warning: { backgroundColor: colors.warning.text },
  active: { backgroundColor: colors.active.text },
  success: { backgroundColor: colors.success.text },
  danger: { backgroundColor: colors.danger.text },
});

export function StatusBadge(props: StatusBadgeProps) {
  const presentation = resolvePresentation(props);
  const accessibilityLabel =
    presentation === unknownPresentation
      ? 'Trạng thái không xác định'
      : `${presentation.accessibilityPrefix}: ${presentation.label}. Mã trạng thái: ${props.status}`;

  return (
    <View
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="text"
      accessible
      style={[styles.badge, colorRoleStyles[presentation.colorRole]]}
    >
      <View
        accessibilityElementsHidden
        importantForAccessibility="no"
        style={[styles.dot, colorRoleDotStyles[presentation.colorRole]]}
      />
      <Text style={[styles.text, colorRoleTextStyles[presentation.colorRole]]}>
        {presentation.label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    alignItems: 'center',
    alignSelf: 'flex-start',
    borderRadius: radius.pill,
    borderWidth: 1,
    flexDirection: 'row',
    maxWidth: '100%',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xxs,
  },
  dot: {
    borderRadius: radius.pill,
    height: 6,
    marginRight: spacing.xs,
    width: 6,
  },
  text: {
    ...typography.label,
    flexShrink: 1,
  },
});
