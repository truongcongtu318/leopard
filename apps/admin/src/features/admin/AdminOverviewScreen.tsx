'use client';

import {
  DataTable,
  OperationsPageHeader,
  ResponsiveResultList,
  StatusBadge,
} from '@leopard/ui';

import {
  AdminBoundaryState,
  AdminDispatchSlab,
  AdminNotice,
  AdminSurface,
} from './AdminShared';
import { createAdminPreviewHref } from './adapter';
import type {
  AdminOverviewRouteView,
  AdminOrderSummaryView,
  AdminPreviewContext,
  AdminPreviewScreen,
} from './model';

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

function screenForHref(href: string): AdminPreviewScreen {
  if (/^\/admin\/orders\/[^/]+/.test(href)) return 'order-detail';
  if (href === '/admin/orders') return 'orders';
  if (href === '/admin/users') return 'users';
  if (href === '/admin/fleets') return 'fleets';
  if (href === '/admin/drivers') return 'drivers';
  return 'overview';
}

export function AdminOverviewScreen({
  view,
  previewContext,
}: Readonly<{
  view: AdminOverviewRouteView;
  previewContext?: AdminPreviewContext;
}>) {
  if (view.kind !== 'overview') {
    return (
      <div className="flex flex-col gap-md">
        <OperationsPageHeader title="Tổng quan vận hành" />
        <AdminBoundaryState view={view} />
      </div>
    );
  }

  const recentOrders = view.recentOrders.map((order) => ({
    ...order,
    href: createAdminPreviewHref(order.href, 'order-detail', previewContext),
  }));
  const recentRows = recentOrders.map((order) => ({ id: order.id, order }));
  const recentMobile = recentOrders.map((order) => ({
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
    <div className="flex min-w-0 flex-col gap-xl">
      <OperationsPageHeader
        context="Ưu tiên ngoại lệ, phạm vi điều tra và dữ liệu mới nhất trong ca trực pilot"
        isStale={view.state === 'offline'}
        title="Tổng quan vận hành"
        updatedAt={view.checkedAtLabel}
      />
      {view.notice ? <AdminNotice notice={view.notice} /> : null}

      <AdminSurface
        title="Ngoại lệ cần điều tra"
        description="Hàng được xếp theo tín hiệu adapter; màu và signal rail không thay thế nhãn điều kiện."
      >
        {view.exceptions.length === 0 ? (
          <p className="py-sm text-body-compact text-neutral-muted">
            Không có ngoại lệ nào trong snapshot hiện tại. Tiếp tục theo dõi ở sổ trạng thái đơn bên dưới.
          </p>
        ) : (
          <ul className="m-0 grid list-none gap-sm p-0">
          {view.exceptions.map((exception) => (
            <li
              key={exception.id}
              className={`border-l-4 bg-neutral-surface py-sm pl-md pr-sm ${
                exception.tone === 'danger'
                  ? 'border-danger-border'
                  : exception.tone === 'warning'
                    ? 'border-warning-border'
                    : 'border-brand'
              }`}
            >
              <div className="flex flex-wrap items-start justify-between gap-xs">
                <div className="min-w-0">
                  <p className={`font-semibold break-words ${exception.tone === 'danger' ? 'text-danger-text' : exception.tone === 'warning' ? 'text-warning-text' : ''}`}>{exception.label}</p>
                  <p className="mt-xxs text-body-compact text-neutral-muted break-words">{exception.detail}</p>
                </div>
                <span className="text-xs text-neutral-muted tabular-nums">{exception.updatedAtLabel}</span>
              </div>
              {exception.targetHref ? (
                <a
                  className="mt-xs inline-flex min-h-11 items-center font-semibold text-brand underline-offset-4 hover:underline focus-visible:rounded-control focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
                  href={createAdminPreviewHref(
                    exception.targetHref,
                    screenForHref(exception.targetHref),
                    previewContext,
                    exception.targetScenario,
                  )}
                >
                  Điều tra chi tiết
                </a>
              ) : null}
            </li>
          ))}
          </ul>
        )}
      </AdminSurface>

      <AdminDispatchSlab ariaLabel="Bàn điều phối hiện tại" eyebrow="CA TRỰC PILOT · TÍN HIỆU HIỆN TẠI">
        <div className="grid min-w-0 gap-md lg:grid-cols-[minmax(14rem,1fr)_minmax(0,2fr)] lg:items-end">
          <div className="min-w-0">
            <h2 className="text-section-title font-semibold">Sức khỏe hệ thống</h2>
            <p className="mt-xxs text-body-compact text-brand-soft">
              Liveness và readiness được giữ tách biệt để tránh bỏ sót dependency lỗi.
            </p>
            <dl className="mt-md grid grid-cols-2 gap-sm">
              <div className="border-l-4 border-success-border pl-sm">
                <dt className="text-xs font-semibold text-brand-soft">Liveness</dt>
                <dd className="mt-xxs font-semibold tabular-nums">{view.health.liveness}</dd>
              </div>
              <div
                className={`border-l-4 pl-sm ${
                  view.health.readiness === 'READY'
                    ? 'border-success-border'
                    : 'border-danger-border'
                }`}
              >
                <dt className="text-xs font-semibold text-brand-soft">Readiness</dt>
                <dd className="mt-xxs font-semibold tabular-nums">{view.health.readiness}</dd>
                <dd className="mt-xxs text-xs text-brand-soft break-words">
                  {view.health.dependencyLabel}
                </dd>
              </div>
            </dl>
          </div>

          <dl
            aria-label="Chỉ số vận hành"
            className="grid min-w-0 grid-cols-2 border-t border-brand-soft lg:grid-cols-4 lg:border-l lg:border-t-0"
          >
            {view.metrics.map((metric) => {
              const metricValue = (
                <div className="min-w-0 border-b border-brand-soft px-sm py-sm last:border-b-0 lg:border-b-0 lg:border-r lg:last:border-r-0">
                  <dt className="text-xs font-medium text-brand-soft break-words">{metric.label}</dt>
                  <dd className="mt-xxs text-section-title font-bold tabular-nums">{metric.value}</dd>
                  <dd className="mt-xxs text-xs text-brand-soft break-words">{metric.detail}</dd>
                </div>
              );
              return metric.href ? (
                <a
                  key={metric.id}
                  className="min-w-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-soft focus-visible:ring-inset"
                  href={createAdminPreviewHref(
                    metric.href,
                    screenForHref(metric.href),
                    previewContext,
                  )}
                >
                  {metricValue}
                </a>
              ) : (
                <div key={metric.id} className="min-w-0">{metricValue}</div>
              );
            })}
          </dl>
        </div>
      </AdminDispatchSlab>

      <AdminSurface title="Sổ trạng thái đơn" description="Số lượng theo snapshot hiện tại.">
        <dl className="grid grid-cols-2 gap-x-md sm:grid-cols-4">
          {view.orderDistribution.map((item) => (
            <div key={item.status} className="flex min-w-0 items-center justify-between gap-sm border-b border-neutral-border py-sm">
              <dt><StatusBadge domain="orderStatus" status={item.status} /></dt>
              <dd className="font-semibold tabular-nums">{item.count}</dd>
            </div>
          ))}
        </dl>
      </AdminSurface>


      <AdminSurface title="Sổ đơn cập nhật gần đây" description="Mới nhất trước · phạm vi Admin hiện tại">
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
