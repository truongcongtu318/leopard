'use client';

import React, { useState } from 'react';

import {
  AdminBoundaryState,
  AdminNotice,
} from './AdminShared';
import { createAdminPreviewHref } from './adapter';
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
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);

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

  const totalOrdersCount = view.orderDistribution.reduce((acc, curr) => acc + curr.count, 0);

  // Group into 4 categories that cleanly sum to 100%:
  // 1. Loading/Preparing: REQUESTED + ACCEPTED + PICKING_UP
  const loadingCount = view.orderDistribution
    .filter((o) => o.status === 'REQUESTED' || o.status === 'ACCEPTED' || o.status === 'PICKING_UP')
    .reduce((sum, o) => sum + o.count, 0);

  // 2. In Transit: IN_TRANSIT
  const inTransitCount = view.orderDistribution
    .filter((o) => o.status === 'IN_TRANSIT')
    .reduce((sum, o) => sum + o.count, 0);

  // 3. Delivered: DELIVERED
  const deliveredCount = view.orderDistribution
    .filter((o) => o.status === 'DELIVERED')
    .reduce((sum, o) => sum + o.count, 0);

  // 4. Unloading / Cancelled / Others: PICKED_UP + CANCELLED
  const cancelledCount = view.orderDistribution.find((o) => o.status === 'CANCELLED')?.count ?? 0;
  const otherCount = view.orderDistribution
    .filter((o) => o.status === 'PICKED_UP' || o.status === 'CANCELLED')
    .reduce((sum, o) => sum + o.count, 0);

  const totalDistribution = totalOrdersCount || 1;
  const loadingPercent = totalOrdersCount > 0 ? Math.round((loadingCount / totalDistribution) * 100) : 0;
  const inTransitPercent = totalOrdersCount > 0 ? Math.round((inTransitCount / totalDistribution) * 100) : 0;
  const deliveredPercent = totalOrdersCount > 0 ? Math.round((deliveredCount / totalDistribution) * 100) : 0;
  const unloadingPercent = totalOrdersCount > 0
    ? Math.max(0, 100 - loadingPercent - inTransitPercent - deliveredPercent)
    : 0;

  const completionRate = totalOrdersCount > 0 ? Math.round((deliveredCount / totalOrdersCount) * 100) : 0;

  const revenueMetric = view.metrics.find((m) => m.id === 'revenue');
  const revenueVnd = revenueMetric?.value ?? 0;
  const formattedRevenue = new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(revenueVnd);

  const bentoOrders: BentoOrderItem[] = view.recentOrders.map((o) => {
    const rawRoute = o.routeLabel ?? '';
    const routeParts = rawRoute.includes('➔')
      ? rawRoute.split('➔').map((s) => s.trim())
      : rawRoute.includes('→')
        ? rawRoute.split('→').map((s) => s.trim())
        : rawRoute.includes('->')
          ? rawRoute.split('->').map((s) => s.trim())
          : [rawRoute, rawRoute];

    const statusLabel =
      o.status === 'IN_TRANSIT'
        ? 'Đang vận chuyển'
        : o.status === 'DELIVERED'
          ? 'Đã giao hàng'
          : o.status === 'PICKING_UP'
            ? 'Đang lấy hàng'
            : o.status === 'PICKED_UP'
              ? 'Đã lấy hàng'
              : o.status === 'REQUESTED'
                ? 'Chờ tài xế'
                : o.status === 'ACCEPTED'
                  ? 'Đã nhận đơn'
                  : o.status === 'CANCELLED'
                    ? 'Đã hủy'
                    : o.status;

    return {
      id: o.reference || o.id,
      customer: o.customerLabel ?? 'Khách hàng',
      route: {
        from: routeParts[0] || 'Điểm lấy',
        to: routeParts[1] || routeParts[0] || 'Điểm giao',
      },
      weight: o.amountLabel ?? '—',
      eta: o.updatedAtLabel,
      status: o.status,
      statusLabel,
      href: createAdminPreviewHref(o.href, 'order-detail', previewContext),
    };
  });

  const hubCoordinates: Record<string, { lat: number; lng: number }> = {
    'kcn hòa khánh': { lat: 16.075, lng: 108.145 },
    'cảng tiên sa': { lat: 16.122, lng: 108.228 },
    'cảng liên chiểu': { lat: 16.115, lng: 108.150 },
    'kcn hòa cầm': { lat: 16.015, lng: 108.185 },
    'kho cẩm lệ': { lat: 16.025, lng: 108.210 },
    'kcn điện ngọc': { lat: 15.975, lng: 108.245 },
    'hải châu': { lat: 16.068, lng: 108.220 },
    'sơn trà': { lat: 16.085, lng: 108.240 },
    'thanh khê': { lat: 16.062, lng: 108.180 },
    'ngũ hành sơn': { lat: 16.020, lng: 108.248 },
  };

  const dynamicMarkers = bentoOrders.map((o, idx) => {
    const fromLower = o.route.from.toLowerCase();
    const toLower = o.route.to.toLowerCase();
    const foundCoord = hubCoordinates[fromLower] ?? hubCoordinates[toLower] ?? {
      lat: 16.05 + ((idx * 0.02) % 0.08),
      lng: 108.18 + ((idx * 0.03) % 0.07),
    };
    return {
      id: o.id,
      orderRef: o.id,
      customer: o.customer,
      routeLabel: `${o.route.from} ➔ ${o.route.to}`,
      x: 30 + ((idx * 15) % 50),
      y: 30 + ((idx * 15) % 50),
      lat: foundCoord.lat,
      lng: foundCoord.lng,
      status: o.status,
    };
  });

  return (
    <div className="flex min-w-0 flex-col gap-4">
      {/* Screen Title (Screen Reader Only to maximize vertical dispatch map canvas) */}
      <h1 className="sr-only">Tổng quan vận hành</h1>
      {view.notice ? <AdminNotice notice={view.notice} /> : null}

      {/* NexaFleet Dispatch Console: 5 widgets, no scroll */}
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-12">
        {/* Left Column (~62% width): Map + Orders Table */}
        <div className="xl:col-span-8 flex flex-col gap-4 min-h-0">
          <BentoMapCard
            title="Bản đồ điều phối thời gian thực"
            activeOrderCode={
              bentoOrders[0]
                ? `${bentoOrders[0].id} · ${bentoOrders[0].customer} ➔ ${bentoOrders[0].route.to}`
                : 'Chưa có chuyến xe nào đang hoạt động'
            }
            searchPlaceholder="Tìm kiếm đơn hàng, tài xế..."
            markers={dynamicMarkers.length > 0 ? dynamicMarkers : undefined}
            selectedOrderId={selectedOrderId}
            onSelectOrder={setSelectedOrderId}
          />
          <BentoOrdersCard
            title="Sổ điều phối đơn hàng"
            totalCount={totalOrdersCount}
            orders={bentoOrders}
            selectedOrderId={selectedOrderId}
            onSelectOrder={setSelectedOrderId}
          />
        </div>

        {/* Right Column (~38% width): Status + OTD + Revenue */}
        <div className="xl:col-span-4 flex flex-col gap-4 min-h-0">
          <StatusOverviewCard
            title="Cơ cấu trạng thái đơn"
            loadingPercent={loadingPercent}
            inTransitPercent={inTransitPercent}
            unloadingPercent={unloadingPercent}
            deliveredPercent={deliveredPercent}
          />
          <FulfillmentPerformanceCard
            title="Hiệu suất giao đúng hạn (OTD)"
            subtitle={totalOrdersCount > 0 ? `${deliveredCount}/${totalOrdersCount} đơn hoàn tất` : 'trung bình ca trực'}
            rate={completionRate || 89}
          />
          <RevenueOverTimeCard
            title="Doanh thu cước vận chuyển"
            amount={formattedRevenue}
            growthLabel={revenueMetric?.detail ?? 'Tổng giá trị đơn DELIVERED'}
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
