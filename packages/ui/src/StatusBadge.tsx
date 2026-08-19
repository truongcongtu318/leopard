import React from 'react';
import { cn } from './cn';

export type OrderStatus =
  | 'REQUESTED'
  | 'ACCEPTED'
  | 'PICKING_UP'
  | 'IN_TRANSIT'
  | 'DELIVERED'
  | 'CANCELLED';

export type PaymentStatus = 'UNPAID' | 'QR_CREATED' | 'PAID_MANUAL' | 'FAILED';

export type DriverAvailability = 'OFFLINE' | 'AVAILABLE' | 'BUSY';
export type FleetMemberStatus = 'INVITED' | 'ACTIVE' | 'REMOVED';
export type UserStatus = 'ACTIVE' | 'DISABLED';

export type StatusDomain =
  | 'orderStatus'
  | 'paymentStatus'
  | 'driverAvailability'
  | 'fleetMemberStatus'
  | 'userStatus';

export type StatusTone = 'neutral' | 'info' | 'warning' | 'active' | 'success' | 'danger';

type CanonicalStatus = Readonly<{
  label: string;
  tone: StatusTone;
}>;

type StatusValueByDomain = Readonly<{
  orderStatus: OrderStatus;
  paymentStatus: PaymentStatus;
  driverAvailability: DriverAvailability;
  fleetMemberStatus: FleetMemberStatus;
  userStatus: UserStatus;
}>;

type CanonicalStatusMap = Readonly<{
  [Domain in StatusDomain]: Readonly<Record<StatusValueByDomain[Domain], CanonicalStatus>>;
}>;

const STATUS_BY_DOMAIN: CanonicalStatusMap = {
  orderStatus: {
    REQUESTED: { label: 'Chờ tài xế', tone: 'info' },
    ACCEPTED: { label: 'Đã nhận đơn', tone: 'active' },
    PICKING_UP: { label: 'Đang đến điểm lấy', tone: 'warning' },
    IN_TRANSIT: { label: 'Đang vận chuyển', tone: 'active' },
    DELIVERED: { label: 'Đã giao', tone: 'success' },
    CANCELLED: { label: 'Đã hủy', tone: 'danger' },
  },
  paymentStatus: {
    UNPAID: { label: 'Chưa thanh toán', tone: 'warning' },
    QR_CREATED: { label: 'Đã tạo mã QR', tone: 'info' },
    PAID_MANUAL: { label: 'Đã xác nhận thanh toán', tone: 'success' },
    FAILED: { label: 'Thất bại', tone: 'danger' },
  },
  driverAvailability: {
    OFFLINE: { label: 'Ngoại tuyến', tone: 'neutral' },
    AVAILABLE: { label: 'Sẵn sàng', tone: 'success' },
    BUSY: { label: 'Đang bận', tone: 'active' },
  },
  fleetMemberStatus: {
    INVITED: { label: 'Đã mời', tone: 'info' },
    ACTIVE: { label: 'Đang tham gia', tone: 'active' },
    REMOVED: { label: 'Đã gỡ khỏi đội xe', tone: 'neutral' },
  },
  userStatus: {
    ACTIVE: { label: 'Đang hoạt động', tone: 'active' },
    DISABLED: { label: 'Đã vô hiệu hóa', tone: 'danger' },
  },
};

const toneClasses: Readonly<Record<StatusTone, string>> = {
  neutral: 'bg-neutral-surface text-neutral-text border-neutral-border',
  info: 'bg-info text-info-text border-info-border',
  warning: 'bg-warning text-warning-text border-warning-border',
  active: 'bg-active text-active-text border-active-border',
  success: 'bg-success text-success-text border-success-border',
  danger: 'bg-danger text-danger-text border-danger-border',
};

const dotClasses: Readonly<Record<StatusTone, string>> = {
  neutral: 'bg-neutral-text/60',
  info: 'bg-info-text',
  warning: 'bg-warning-text',
  active: 'bg-active-text',
  success: 'bg-success-text',
  danger: 'bg-danger-text',
};

const unknownStatus: CanonicalStatus = {
  label: 'Trạng thái chưa được hỗ trợ',
  tone: 'neutral',
};

type CanonicalStatusSelection =
  | Readonly<{ domain: 'orderStatus'; status: OrderStatus }>
  | Readonly<{ domain: 'paymentStatus'; status: PaymentStatus }>
  | Readonly<{
      domain: 'driverAvailability';
      status: DriverAvailability;
    }>
  | Readonly<{
      domain: 'fleetMemberStatus';
      status: FleetMemberStatus;
    }>
  | Readonly<{ domain: 'userStatus'; status: UserStatus }>;

export type StatusBadgeProps = CanonicalStatusSelection & Readonly<{ className?: string }>;

export type ExternalStatusBadgeProps = Readonly<{
  domain: StatusDomain;
  status: string;
  className?: string;
}>;

function resolveCanonicalStatus(selection: CanonicalStatusSelection): CanonicalStatus {
  switch (selection.domain) {
    case 'orderStatus':
      return STATUS_BY_DOMAIN.orderStatus[selection.status];
    case 'paymentStatus':
      return STATUS_BY_DOMAIN.paymentStatus[selection.status];
    case 'driverAvailability':
      return STATUS_BY_DOMAIN.driverAvailability[selection.status];
    case 'fleetMemberStatus':
      return STATUS_BY_DOMAIN.fleetMemberStatus[selection.status];
    case 'userStatus':
      return STATUS_BY_DOMAIN.userStatus[selection.status];
  }
}

function resolveExternalStatus(domain: StatusDomain, status: string): CanonicalStatus {
  const externalDomainMap = STATUS_BY_DOMAIN[domain] as Readonly<
    Record<string, CanonicalStatus | undefined>
  >;
  return externalDomainMap[status] ?? unknownStatus;
}

function StatusBadgeView({
  canonicalStatus,
  className,
}: Readonly<{
  canonicalStatus: CanonicalStatus;
  className: string | undefined;
}>) {
  return (
    <span
      className={cn(
        'inline-flex max-w-full items-center rounded-pill border px-xs py-1 text-xs font-medium break-words',
        toneClasses[canonicalStatus.tone],
        className,
      )}
    >
      <span
        className={cn(
          'mr-1.5 inline-block h-1.5 w-1.5 rounded-full shrink-0',
          canonicalStatus.tone === 'active' ? 'animate-pulse' : '',
          dotClasses[canonicalStatus.tone],
        )}
        aria-hidden="true"
      />
      {canonicalStatus.label}
    </span>
  );
}

export function StatusBadge(props: StatusBadgeProps) {
  return (
    <StatusBadgeView canonicalStatus={resolveCanonicalStatus(props)} className={props.className} />
  );
}

export function ExternalStatusBadge({ domain, status, className }: ExternalStatusBadgeProps) {
  return (
    <StatusBadgeView
      canonicalStatus={resolveExternalStatus(domain, status)}
      className={className}
    />
  );
}
