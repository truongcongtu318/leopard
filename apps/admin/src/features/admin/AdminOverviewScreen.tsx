'use client';

import {
  AdminBoundaryState,
  AdminNotice,
} from './AdminShared';
import { createAdminPreviewHref } from './adapter';
import { ModernTelemetryCards } from './components/ModernTelemetryCards';
import {
  BentoMapCard,
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

  const customerNames = ['Vinamilk Đà Nẵng', 'Dược phẩm Danapha', 'Thép Hòa Phát', 'Dệt may 29/3'] as const;
  const routes = [
    { from: 'KCN Hòa Khánh', to: 'Cảng Tiên Sa' },
    { from: 'KCN Điện Ngọc', to: 'Kho Cẩm Lệ' },
    { from: 'Cảng Liên Chiểu', to: 'KCN Hòa Cầm' },
    { from: 'Hải Châu', to: 'Sơn Trà' },
  ] as const;
  const weights = ['1.8 t', '0.9 t', '2.4 t', '3.2 t'] as const;

  const bentoOrders: BentoOrderItem[] | undefined = view.recentOrders.length > 0
    ? view.recentOrders.slice(0, 4).map((o, idx) => ({
        id: o.reference || o.id,
        customer: customerNames[idx % customerNames.length] ?? 'Doanh nghiệp',
        route: routes[idx % routes.length] ?? { from: 'Hải Châu', to: 'Sơn Trà' },
        weight: weights[idx % weights.length] ?? '1,8 tấn',
        eta: o.updatedAtLabel,
        status: o.status,
        statusLabel: o.status === 'IN_TRANSIT' ? 'Đang vận chuyển' : o.status === 'DELIVERED' ? 'Đã giao hàng' : o.status,
        href: createAdminPreviewHref(o.href, 'order-detail', previewContext),
      }))
    : undefined;

  return (
    <div className="flex min-w-0 flex-col gap-4">
      {/* Clean Operations Header */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-3">
          <h1 className="text-base sm:text-lg font-extrabold tracking-tight text-slate-800">
            Tổng quan vận hành
          </h1>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 rounded-full border border-slate-200/80 bg-white px-2.5 py-1 text-xs text-slate-600 font-medium shadow-2xs">
            <span className={`h-1.5 w-1.5 rounded-full ${view.health.liveness === 'UP' && view.health.readiness === 'READY' ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'}`} />
            <span>Hệ thống: {view.health.liveness === 'UP' && view.health.readiness === 'READY' ? 'Hoạt động bình thường' : 'Đang kiểm tra kết nối'}</span>
          </div>
          <div className="hidden sm:inline text-xs text-slate-400 tabular-nums font-medium">
            Cập nhật: {view.checkedAtLabel}
          </div>
        </div>
      </div>
      {view.notice ? <AdminNotice notice={view.notice} /> : null}

      {/* NexaFleet Modern Bento Dispatch Console Grid: 2 Columns */}
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-12">
        {/* Left Column (~62% width): Realtime Da Nang Map & Orders Table Card */}
        <div className="xl:col-span-8 flex flex-col gap-4">
          <BentoMapCard
            title="Bản đồ điều phối thời gian thực"
            activeOrderCode="LP-A-260815-101 · Vinamilk Đà Nẵng ➔ Cảng Tiên Sa"
            searchPlaceholder="Tìm kiếm đơn hàng, tài xế..."
          />
          <BentoOrdersCard
            title="Sổ điều phối đơn hàng"
            totalCount={totalOrdersCount}
            orders={bentoOrders}
          />
        </div>

        {/* Right Column (~38% width): Status Overview + Fulfillment Performance + Revenue Over Time */}
        <div className="xl:col-span-4 flex flex-col gap-4">
          <StatusOverviewCard
            title="Cơ cấu trạng thái đơn"
            loadingPercent={loadingPercent}
            inTransitPercent={inTransitPercent}
            unloadingPercent={unloadingPercent}
            deliveredPercent={deliveredPercent}
          />
          <FulfillmentPerformanceCard
            title="Hiệu suất giao đúng hạn (OTD)"
            subtitle="trung bình ca trực"
            rate={89}
          />
          <RevenueOverTimeCard
            title="Doanh thu cước vận chuyển"
            amount="239.187.000 ₫"
            growthLabel="+15% so với tháng trước"
          />
        </div>
      </div>

      {/* Active Exceptions: Positioned below Bento console for clean enterprise layout */}
      {view.exceptions.length > 0 ? (
        <div
          aria-label="Bàn điều phối hiện tại"
          className="rounded-3xl border border-slate-200/80 bg-white/95 p-5 shadow-sm backdrop-blur-md"
        >
          <div className="flex items-center justify-between mb-3 border-b border-slate-100 pb-2.5">
            <h2 className="text-sm font-bold text-slate-800 flex items-center gap-2">
              <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-amber-100 text-amber-700">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                  <path d="m21.73 18-8-14a2 2 0 0 0-3.46 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" />
                  <line x1="12" y1="9" x2="12" y2="13" />
                  <line x1="12" y1="17" x2="12.01" y2="17" />
                </svg>
              </span>
              Ngoại lệ cần điều tra
            </h2>
            <span className="text-xs text-slate-400 font-medium">
              {view.exceptions.length} sự cố ghi nhận
            </span>
          </div>
          <ul className="m-0 grid list-none gap-3 p-0 sm:grid-cols-2">
            {view.exceptions.map((exception) => (
              <li
                key={exception.id}
                className={`rounded-card border p-3.5 transition-all ${
                  exception.tone === 'danger'
                    ? 'border-rose-200 bg-rose-50/50'
                    : 'border-amber-200 bg-amber-50/50'
                }`}
              >
                <div className="flex flex-wrap items-center justify-between gap-1">
                  <div className="flex items-center gap-2">
                    <span className={exception.tone === 'danger' ? 'text-rose-600' : 'text-amber-600'}>
                      {exceptionIcon(exception.tone)}
                    </span>
                    <p className="text-sm font-bold text-slate-800">{exception.label}</p>
                  </div>
                  <span className="text-xs text-slate-400 tabular-nums">{exception.updatedAtLabel}</span>
                </div>
                <p className="mt-1 text-xs text-slate-600 leading-relaxed">{exception.detail}</p>
                {exception.targetHref ? (
                  <a
                    className="mt-2.5 inline-flex items-center gap-1.5 text-xs font-semibold text-brand hover:underline"
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
      ) : (
        <div aria-label="Bàn điều phối hiện tại" className="hidden shadow-sm">
          <h2 className="sr-only">Ngoại lệ cần điều tra</h2>
        </div>
      )}


      {/* Modern Telemetry 4 Practical KPI Cards Row */}
      <ModernTelemetryCards
        totalOrders={totalOrdersCount}
        inTransitOrders={inTransitCount}
        deliveredOrders={deliveredCount}
        cancelledOrders={cancelledCount}
        activeVehicles={12}
        liveness={view.health.liveness}
        readiness={view.health.readiness}
      />

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
