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

  const metricIcons: Record<string, React.ReactNode> = {
    users: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>,
    fleets: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M3 9h18v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V9Z"/><path d="m3 9 2.45-4.9A2 2 0 0 1 7.24 3h9.52a2 2 0 0 1 1.8 1.1L21 9"/><path d="M12 11a2 2 0 0 0 0 4 2 2 0 0 0 0-4Z"/></svg>,
    "active-orders": <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>,
    revenue: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><line x1="12" y1="2" x2="12" y2="22"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>,
  };

  const exceptionIcon = (tone: string) => {
    if (tone === 'danger') return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>;
    if (tone === 'warning') return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="m21.73 18-8-14a2 2 0 0 0-3.46 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>;
    return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/></svg>;
  };

  return (
    <div className="flex min-w-0 flex-col gap-6">
      <OperationsPageHeader
        context="Ưu tiên ngoại lệ, phạm vi điều tra và dữ liệu mới nhất trong ca trực pilot"
        isStale={view.state === 'offline'}
        title="Tổng quan vận hành"
        updatedAt={view.checkedAtLabel}
      />
      {view.notice ? <AdminNotice notice={view.notice} /> : null}

      {/* Metrics — premium cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {view.metrics.map((metric) => {
          const content = (
            <div className="group relative overflow-hidden rounded-[16px] border border-neutral-border/60 bg-white p-5 shadow-card hover:shadow-card-hover hover:-translate-y-0.5 transition-all">
              <div className="absolute right-0 top-0 h-20 w-20 bg-gradient-to-br from-brand/5 to-transparent rounded-bl-[32px] pointer-events-none" />
              <div className="flex items-start justify-between gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-soft text-brand group-hover:bg-brand group-hover:text-white transition-colors shadow-sm">
                  {metricIcons[metric.id] ?? metricIcons['active-orders']}
                </div>
                {metric.href ? (
                  <span className="flex h-7 w-7 items-center justify-center rounded-full bg-neutral-surface text-neutral-muted group-hover:bg-brand group-hover:text-white transition-colors">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="m9 18 6-6-6-6"/></svg>
                  </span>
                ) : null}
              </div>
              <div className="mt-4">
                <p className="text-xs font-semibold tracking-wide text-neutral-muted uppercase">{metric.label}</p>
                <p className="mt-1 text-2xl font-bold tracking-tight text-neutral-text tabular-nums">{metric.value}</p>
                <p className="mt-1 text-xs leading-relaxed text-neutral-muted line-clamp-2">{metric.detail}</p>
              </div>
            </div>
          );
          return metric.href ? (
            <a
              key={metric.id}
              href={createAdminPreviewHref(metric.href, screenForHref(metric.href), previewContext)}
              className="block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand rounded-[16px]"
            >
              {content}
            </a>
          ) : (
            <div key={metric.id}>{content}</div>
          );
        })}
      </div>

      <AdminDispatchSlab ariaLabel="Bàn điều phối hiện tại" eyebrow="CA TRỰC PILOT · TÍN HIỆU HIỆN TẠI">
        <div className="grid min-w-0 gap-6 lg:grid-cols-[320px_1fr]">
          <div className="min-w-0">
            <h2 className="text-base font-bold tracking-tight flex items-center gap-2">
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-white/10 backdrop-blur">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg>
              </span>
              Sức khỏe hệ thống
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-white/70">
              Liveness và readiness được giữ tách biệt để tránh bỏ sót dependency lỗi.
            </p>
            <div className="mt-5 grid grid-cols-2 gap-3">
              <div className="rounded-xl bg-white/10 backdrop-blur border border-white/10 p-3.5">
                <div className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.6)]" />
                  <span className="text-xs font-semibold tracking-wide text-white/70 uppercase">Liveness</span>
                </div>
                <p className="mt-2 text-sm font-bold tabular-nums">{view.health.liveness}</p>
                <p className="mt-1 text-xs text-white/60">Hoạt động ổn định</p>
              </div>
              <div className={`rounded-xl backdrop-blur border p-3.5 ${view.health.readiness === 'READY' ? 'bg-emerald-500/10 border-emerald-500/20' : 'bg-red-500/10 border-red-500/20'}`}>
                <div className="flex items-center gap-2">
                  <span className={`h-2 w-2 rounded-full ${view.health.readiness === 'READY' ? 'bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.6)]' : 'bg-red-400 shadow-[0_0_8px_rgba(248,113,113,0.6)]'}`} />
                  <span className="text-xs font-semibold tracking-wide text-white/70 uppercase">Readiness</span>
                </div>
                <p className="mt-2 text-sm font-bold tabular-nums">{view.health.readiness}</p>
                <p className="mt-1 text-xs text-white/60 line-clamp-2">{view.health.dependencyLabel}</p>
              </div>
            </div>
          </div>

          <div className="min-w-0 rounded-xl bg-white/5 backdrop-blur border border-white/10 p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xs font-bold tracking-widest text-white/60 uppercase">Chỉ số vận hành</h3>
              <span className="text-xs text-white/40 tabular-nums">Real-time</span>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {view.metrics.slice(0, 4).map((metric) => (
                <div key={`slab-${metric.id}`} className="rounded-xl bg-white p-3.5 shadow-sm border border-white/50">
                  <p className="text-xs font-medium text-neutral-muted truncate">{metric.label}</p>
                  <p className="mt-1 text-lg font-bold tracking-tight text-neutral-text tabular-nums">{metric.value}</p>
                  <p className="mt-0.5 text-xs text-neutral-muted truncate">{metric.detail}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </AdminDispatchSlab>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <AdminSurface
            title="Ngoại lệ cần điều tra"
            description="Hàng được xếp theo tín hiệu adapter; màu và signal rail không thay thế nhãn điều kiện."
            icon={<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="m21.73 18-8-14a2 2 0 0 0-3.46 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>}
          >
            {view.exceptions.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-success/50 text-success-text border border-success-border/30">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
                </div>
                <p className="mt-3 text-sm font-semibold text-neutral-text">Hệ thống ổn định</p>
                <p className="mt-1 max-w-sm text-xs leading-relaxed text-neutral-muted">
                  Không có ngoại lệ nào trong snapshot hiện tại. Tiếp tục theo dõi ở sổ trạng thái đơn bên dưới.
                </p>
              </div>
            ) : (
              <ul className="m-0 grid list-none gap-3 p-0">
              {view.exceptions.map((exception) => (
                <li
                  key={exception.id}
                  className={`group relative overflow-hidden rounded-xl border bg-white p-4 shadow-sm hover:shadow-md transition-shadow ${
                    exception.tone === 'danger'
                      ? 'border-danger-border/40 hover:border-danger-border/60'
                      : exception.tone === 'warning'
                        ? 'border-warning-border/40 hover:border-warning-border/60'
                        : 'border-neutral-border/60 hover:border-brand/20'
                  }`}
                >
                  <div className={`absolute left-0 top-0 bottom-0 w-1 ${
                    exception.tone === 'danger' ? 'bg-danger-border' : exception.tone === 'warning' ? 'bg-warning-border' : 'bg-brand'
                  }`} />
                  <div className="flex gap-3">
                    <div className={`hidden sm:flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border ${
                      exception.tone === 'danger' ? 'bg-danger text-danger-text border-danger-border/20' : exception.tone === 'warning' ? 'bg-warning text-warning-text border-warning-border/20' : 'bg-brand-soft text-brand border-brand/10'
                    }`}>
                      {exceptionIcon(exception.tone)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <p className="font-semibold text-sm leading-tight break-words text-neutral-text">{exception.label}</p>
                        <span className="shrink-0 rounded-full bg-neutral-surface border border-neutral-border/50 px-2.5 py-1 text-xs font-medium text-neutral-muted tabular-nums">{exception.updatedAtLabel}</span>
                      </div>
                      <p className="mt-1.5 text-sm leading-relaxed text-neutral-muted break-words">{exception.detail}</p>
                      {exception.targetHref ? (
                        <a
                          className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-brand px-3.5 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-brand-hover transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2"
                          href={createAdminPreviewHref(
                            exception.targetHref,
                            screenForHref(exception.targetHref),
                            previewContext,
                            exception.targetScenario,
                          )}
                        >
                          Điều tra chi tiết
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
                        </a>
                      ) : null}
                    </div>
                  </div>
                </li>
              ))}
              </ul>
            )}
          </AdminSurface>
        </div>

        <AdminSurface
          title="Sổ trạng thái đơn"
          description="Số lượng theo snapshot hiện tại."
          icon={<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><rect x="8" y="2" width="8" height="4" rx="1" ry="1"/></svg>}
        >
          <div className="space-y-2.5">
            {view.orderDistribution.map((item) => (
              <div key={item.status} className="group flex items-center justify-between gap-3 rounded-xl border border-neutral-border/60 bg-neutral-surface/50 px-3.5 py-3 hover:bg-white hover:border-neutral-border hover:shadow-sm transition-all">
                <div className="min-w-0 flex-1"><StatusBadge domain="orderStatus" status={item.status} /></div>
                <span className="flex h-7 min-w-7 items-center justify-center rounded-full bg-white border border-neutral-border px-2.5 text-sm font-bold tabular-nums shadow-sm group-hover:bg-brand group-hover:text-white group-hover:border-brand transition-colors">{item.count}</span>
              </div>
            ))}
          </div>
        </AdminSurface>
      </div>


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
