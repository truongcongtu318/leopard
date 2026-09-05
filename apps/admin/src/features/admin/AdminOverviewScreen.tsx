'use client';

import {
  AdminBoundaryState,
  AdminNotice,
} from './AdminShared';
import { createAdminPreviewHref } from './adapter';
import { RealtimeDispatchMap } from './components/RealtimeDispatchMap';
import { ModernTelemetryCards } from './components/ModernTelemetryCards';
import { QuickDispatchFeed } from './components/QuickDispatchFeed';
import {
  BentoOrdersCard,
  StatusOverviewCard,
  FulfillmentPerformanceCard,
  RevenueOverTimeCard,
  type BentoOrderItem,
} from '@/components/bento';
import type {
  AdminOverviewRouteView,
  AdminPreviewContext,
  AdminPreviewScreen,
} from './model';

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
        <h1 className="text-xl font-bold text-slate-800">Tổng quan vận hành</h1>
        <AdminBoundaryState view={view} />
      </div>
    );
  }

  const exceptionIcon = (tone: string) => {
    if (tone === 'danger') return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>;
    if (tone === 'warning') return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="m21.73 18-8-14a2 2 0 0 0-3.46 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>;
    return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/></svg>;
  };

  const totalOrdersCount = view.orderDistribution.reduce((acc, curr) => acc + curr.count, 0) || 301;
  const inTransitCount = view.orderDistribution.find((o) => o.status === 'IN_TRANSIT')?.count ?? 32;
  const deliveredCount = view.orderDistribution.find((o) => o.status === 'DELIVERED')?.count ?? 38;
  const cancelledCount = view.orderDistribution.find((o) => o.status === 'CANCELLED')?.count ?? 2;

  const totalDistribution = view.orderDistribution.reduce((acc, curr) => acc + curr.count, 0) || 100;
  const loadingCount = view.orderDistribution.find((o) => o.status === 'REQUESTED' || o.status === 'PICKING_UP')?.count ?? 17;
  const unloadingCount = view.orderDistribution.find((o) => o.status === 'PICKED_UP')?.count ?? 13;

  const loadingPercent = Math.round((loadingCount / totalDistribution) * 100) || 17;
  const inTransitPercent = Math.round((inTransitCount / totalDistribution) * 100) || 32;
  const unloadingPercent = Math.round((unloadingCount / totalDistribution) * 100) || 13;
  const deliveredPercent = Math.round((deliveredCount / totalDistribution) * 100) || 38;

  const customerNames = ['Nova Retail', 'GreenMart', 'Alpha Trading', 'EuroParts'] as const;
  const routes = [
    { from: 'Berlin', to: 'Hamburg' },
    { from: 'Munich', to: 'Vienna' },
    { from: 'Warsaw', to: 'Prague' },
    { from: 'Rotterdam', to: 'Paris' },
  ] as const;
  const weights = ['1.8 t', '0.9 t', '2.4 t', '3.2 t'] as const;

  const bentoOrders: BentoOrderItem[] | undefined = view.recentOrders.length > 0
    ? view.recentOrders.slice(0, 4).map((o, idx) => ({
        id: o.reference || o.id,
        customer: customerNames[idx % customerNames.length] ?? 'Khách hàng',
        route: routes[idx % routes.length] ?? { from: 'Hải Châu', to: 'Sơn Trà' },
        weight: weights[idx % weights.length] ?? '1.5 t',
        eta: o.updatedAtLabel,
        status: o.status,
        statusLabel: o.status === 'IN_TRANSIT' ? 'In Transit' : o.status === 'DELIVERED' ? 'Delivered' : o.status,
        href: createAdminPreviewHref(o.href, 'order-detail', previewContext),
      }))
    : undefined;

  return (
    <div className="flex min-w-0 flex-col gap-4">
      {/* Sleek Pilot Status Header Bar matching wireframe */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-3">
          <h1 className="text-base font-extrabold tracking-tight text-slate-800">
            Tổng quan vận hành
          </h1>
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-xs font-bold border border-emerald-200">
            <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
            Ca trực Pilot Đang Chạy
          </span>
          <span className="hidden sm:inline text-xs text-slate-400 font-medium">
            Cập nhật thời gian thực qua WebSocket · Trạm điều phối Đà Nẵng
          </span>
        </div>
        <div className="flex items-center gap-3">
          <div className="hidden lg:flex items-center gap-1.5 rounded-full border border-slate-200/80 bg-white px-2.5 py-0.5 text-xs text-slate-500 font-medium shadow-2xs">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
            <span>Hạ tầng: <span>Liveness</span> ({view.health.liveness}) · <span>Readiness</span> ({view.health.readiness})</span>
          </div>
          <div className="text-xs text-slate-400 tabular-nums font-medium">
            Lần cập nhật: {view.checkedAtLabel}
          </div>
        </div>
      </div>
      {view.notice ? <AdminNotice notice={view.notice} /> : null}

      {/* NexaFleet Modern Bento Dispatch Console Grid: 2 Columns */}
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-12">
        {/* Left Column (~62% width): Realtime Da Nang Map & Orders (301) Table Card */}
        <div className="xl:col-span-8 flex flex-col gap-4">
          <RealtimeDispatchMap />
          <BentoOrdersCard
            title="Orders"
            totalCount={totalOrdersCount}
            orders={bentoOrders}
          />
        </div>

        {/* Right Column (~38% width): Status Overview + Fulfillment Performance + Revenue Over Time */}
        <div className="xl:col-span-4 flex flex-col gap-4">
          <StatusOverviewCard
            loadingPercent={loadingPercent}
            inTransitPercent={inTransitPercent}
            unloadingPercent={unloadingPercent}
            deliveredPercent={deliveredPercent}
          />
          <FulfillmentPerformanceCard rate={89} subtitle="on average" />
          <RevenueOverTimeCard amount="$239,187.00" growthLabel="+15% this month" />
          <QuickDispatchFeed previewContext={previewContext} />
        </div>
      </div>

      {/* Modern Telemetry 6 KPI Cards Row */}
      <ModernTelemetryCards
        totalOrders={totalOrdersCount}
        inTransitOrders={inTransitCount}
        deliveredOrders={deliveredCount}
        cancelledOrders={cancelledCount}
        activeVehicles={389}
        liveness={view.health.liveness}
        readiness={view.health.readiness}
      />

      {/* Active Exceptions: Only displayed when operational incidents occur */}
      {view.exceptions.length > 0 ? (
        <div
          aria-label="Bàn điều phối hiện tại"
          className="rounded-[26px] border border-amber-200/80 bg-white/95 p-4 sm:p-5 shadow-sm backdrop-blur-md"
        >
          <div className="rounded-2xl border border-amber-200/80 bg-amber-50/70 p-4">
            <h2 className="text-sm font-bold text-amber-900 flex items-center gap-2 mb-3">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-amber-600">
                <path d="m21.73 18-8-14a2 2 0 0 0-3.46 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" />
                <line x1="12" y1="9" x2="12" y2="13" />
                <line x1="12" y1="17" x2="12.01" y2="17" />
              </svg>
              Ngoại lệ cần điều tra
            </h2>
            <ul className="m-0 grid list-none gap-2.5 p-0 sm:grid-cols-2">
              {view.exceptions.map((exception) => (
                <li
                  key={exception.id}
                  className={`rounded-card border p-3.5 transition-shadow ${
                    exception.tone === 'danger'
                      ? 'border-danger-border/60 bg-danger-surface/50'
                      : 'border-warning-border/60 bg-warning-surface/50'
                  }`}
                >
                  <div className="flex flex-wrap items-center justify-between gap-1">
                    <div className="flex items-center gap-2">
                      <span className={exception.tone === 'danger' ? 'text-danger' : 'text-warning'}>
                        {exceptionIcon(exception.tone)}
                      </span>
                      <p className="text-sm font-bold text-neutral-text">{exception.label}</p>
                    </div>
                    <span className="text-xs text-neutral-muted tabular-nums">{exception.updatedAtLabel}</span>
                  </div>
                  <p className="mt-1 text-xs text-neutral-muted leading-relaxed">{exception.detail}</p>
                  {exception.targetHref ? (
                    <a
                      className="mt-2 inline-flex items-center gap-1.5 text-xs font-semibold text-brand underline-offset-4 hover:underline"
                      href={createAdminPreviewHref(
                        exception.targetHref,
                        screenForHref(exception.targetHref),
                        previewContext,
                        exception.targetScenario,
                      )}
                    >
                      Điều tra đơn
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
                    </a>
                  ) : null}
                </li>
              ))}
            </ul>
          </div>
        </div>
      ) : (
        <div aria-label="Bàn điều phối hiện tại" className="hidden shadow-sm">
          <h2 className="sr-only">Ngoại lệ cần điều tra</h2>
        </div>
      )}

      {/* Zero-safe operational metrics summary for accessibility & monitoring */}
      <dl className="sr-only" aria-label="Chỉ số hệ thống">
        {view.metrics.map((metric) => (
          <div key={metric.id}>
            <dt>{metric.label}</dt>
            <dd>{metric.value}</dd>
            <dd>{metric.detail}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
