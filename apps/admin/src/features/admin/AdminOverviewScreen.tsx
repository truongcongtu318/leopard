'use client';

import {
  DataTable,
  OperationsPageHeader,
  ResponsiveResultList,
  StatusBadge,
} from '@leopard/ui';

import { AdminBoundaryState, AdminNotice, AdminSurface } from './AdminShared';
import type { AdminOverviewRouteView, AdminOrderSummaryView } from './model';

const RECENT_ORDER_COLUMNS = [
  {
    key: 'order',
    header: 'Đơn hàng',
    render: (row: Record<string, unknown>) => {
      const order = row.order as AdminOrderSummaryView;
      return (
        <a
          aria-label={`Xem đơn ${order.reference}`}
          className="font-semibold text-brand underline-offset-4 hover:underline focus-visible:rounded-control focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
          href={order.href}
        >
          {order.reference}
        </a>
      );
    },
  },
  {
    key: 'status',
    header: 'Trạng thái',
    render: (row: Record<string, unknown>) => {
      const order = row.order as AdminOrderSummaryView;
      return <StatusBadge domain="orderStatus" status={order.status} />;
    },
  },
  {
    key: 'payment',
    header: 'Thanh toán',
    render: (row: Record<string, unknown>) => {
      const order = row.order as AdminOrderSummaryView;
      return <StatusBadge domain="paymentStatus" status={order.paymentStatus} />;
    },
  },
  {
    key: 'updated',
    header: 'Cập nhật',
    render: (row: Record<string, unknown>) => {
      const order = row.order as AdminOrderSummaryView;
      return <span className="tabular-nums text-neutral-muted">{order.updatedAtLabel}</span>;
    },
  },
];

export function AdminOverviewScreen({ view }: Readonly<{ view: AdminOverviewRouteView }>) {
  if (view.kind !== 'overview') {
    return (
      <div className="flex flex-col gap-md">
        <OperationsPageHeader title="Tổng quan vận hành" />
        <AdminBoundaryState view={view} />
      </div>
    );
  }

  const recentRows = view.recentOrders.map((order) => ({ id: order.id, order }));
  const recentMobile = view.recentOrders.map((order) => ({
    id: order.id,
    heading: (
      <a className="text-brand underline" href={order.href}>{order.reference}</a>
    ),
    status: <StatusBadge domain="orderStatus" status={order.status} />,
    details: [
      { id: 'payment', label: 'Thanh toán', value: <StatusBadge domain="paymentStatus" status={order.paymentStatus} /> },
      { id: 'updated', label: 'Cập nhật', value: order.updatedAtLabel },
    ],
  }));

  return (
    <div className="flex min-w-0 flex-col gap-lg">
      <OperationsPageHeader
        context="Theo dõi sức khỏe hệ thống và ngoại lệ trong phạm vi pilot"
        isStale={view.state === 'offline'}
        title="Tổng quan vận hành"
        updatedAt={view.checkedAtLabel}
      />
      {view.notice ? <AdminNotice notice={view.notice} /> : null}

      <AdminSurface title="Sức khỏe hệ thống" description="Liveness và readiness là hai tín hiệu độc lập.">
        <dl className="grid gap-sm sm:grid-cols-2">
          <div className="border-l-2 border-success-border pl-sm">
            <dt className="text-xs font-semibold text-neutral-muted">Liveness</dt>
            <dd className="mt-xxs font-semibold">{view.health.liveness}</dd>
          </div>
          <div className={`border-l-2 pl-sm ${view.health.readiness === 'READY' ? 'border-success-border' : 'border-danger-border'}`}>
            <dt className="text-xs font-semibold text-neutral-muted">Readiness</dt>
            <dd className="mt-xxs font-semibold">{view.health.readiness}</dd>
            <dd className="mt-xxs text-body-compact text-neutral-muted">{view.health.dependencyLabel}</dd>
          </div>
        </dl>
      </AdminSurface>

      <section aria-label="Chỉ số vận hành" className="grid gap-sm sm:grid-cols-2 xl:grid-cols-4">
        {view.metrics.map((metric) => {
          const content = (
            <dl className="h-full border-l-4 border-brand bg-neutral-surface px-md py-sm text-neutral-text">
              <dt className="text-body-compact font-medium text-neutral-muted">{metric.label}</dt>
              <dd className="mt-xxs text-section-title font-bold tabular-nums">{metric.value}</dd>
              <dd className="mt-xxs text-xs text-neutral-muted">{metric.detail}</dd>
            </dl>
          );
          return metric.href ? (
            <a key={metric.id} className="rounded-control focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand" href={metric.href}>{content}</a>
          ) : <div key={metric.id}>{content}</div>;
        })}
      </section>

      <div className="grid min-w-0 gap-lg xl:grid-cols-[minmax(0,2fr)_minmax(18rem,1fr)]">
        <AdminSurface title="Ngoại lệ cần điều tra" description="Condition và mức độ đã được adapter cung cấp; UI không tự suy diễn severity.">
          <ul className="m-0 grid list-none gap-sm p-0">
            {view.exceptions.map((exception) => (
              <li key={exception.id} className="border-b border-neutral-border pb-sm last:border-0 last:pb-0">
                <div className="flex flex-wrap items-start justify-between gap-xs">
                  <div className="min-w-0">
                    <p className={`font-semibold break-words ${exception.tone === 'danger' ? 'text-danger-text' : exception.tone === 'warning' ? 'text-warning-text' : ''}`}>{exception.label}</p>
                    <p className="mt-xxs text-body-compact text-neutral-muted break-words">{exception.detail}</p>
                  </div>
                  <span className="text-xs text-neutral-muted tabular-nums">{exception.updatedAtLabel}</span>
                </div>
                {exception.targetHref ? (
                  <a className="mt-xs inline-flex min-h-11 items-center font-semibold text-brand underline-offset-4 hover:underline focus-visible:rounded-control focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand" href={exception.targetHref}>Điều tra chi tiết</a>
                ) : null}
              </li>
            ))}
          </ul>
        </AdminSurface>

        <AdminSurface title="Phân bố trạng thái đơn">
          <dl className="grid gap-xs">
            {view.orderDistribution.map((item) => (
              <div key={item.status} className="flex items-center justify-between gap-sm border-b border-neutral-border py-xs last:border-0">
                <dt><StatusBadge domain="orderStatus" status={item.status} /></dt>
                <dd className="font-semibold tabular-nums">{item.count}</dd>
              </div>
            ))}
          </dl>
        </AdminSurface>
      </div>

      <AdminSurface title="Đơn cập nhật gần đây">
        <div className="hidden min-w-0 overflow-x-auto md:block">
          <DataTable
            caption="Đơn cập nhật gần đây trong phạm vi Admin hiện tại"
            columns={RECENT_ORDER_COLUMNS}
            rows={recentRows}
          />
        </div>
        <ResponsiveResultList ariaLabel="Đơn gần đây dạng hàng responsive" items={recentMobile} />
      </AdminSurface>
    </div>
  );
}
