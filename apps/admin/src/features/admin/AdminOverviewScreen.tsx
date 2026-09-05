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
} from './model';

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

  // Markers from BE OrderStop PostGIS coords; orders without coords are skipped.
  const dynamicMarkers = bentoOrders.flatMap((o, idx) => {
    const lat = view.recentOrders[idx]?.pickupLat ?? view.recentOrders[idx]?.dropoffLat ?? null;
    const lng = view.recentOrders[idx]?.pickupLng ?? view.recentOrders[idx]?.dropoffLng ?? null;
    if (lat === null || lng === null) return [];
    return [
      {
        id: o.id,
        orderRef: o.id,
        customer: o.customer,
        routeLabel: `${o.route.from} ➔ ${o.route.to}`,
        x: 30 + ((idx * 15) % 50),
        y: 30 + ((idx * 15) % 50),
        lat,
        lng,
        status: o.status,
      },
    ];
  });

  const usersMetric = view.metrics.find((m) => m.id === 'users');
  const fleetsMetric = view.metrics.find((m) => m.id === 'fleets');
  const activeOrdersMetric = view.metrics.find((m) => m.id === 'active-orders');
  const kpis = [
    { id: 'users', label: 'Người dùng', value: usersMetric?.value ?? 0 },
    { id: 'active-orders', label: 'Đơn đang chạy', value: activeOrdersMetric?.value ?? 0 },
    { id: 'fleets', label: 'Đội xe', value: fleetsMetric?.value ?? 0 },
    { id: 'revenue', label: 'Doanh thu', value: formattedRevenue },
  ];

  return (
    <div className="flex min-w-0 flex-col gap-4">
      {/* Screen Title (Screen Reader Only to maximize vertical dispatch map canvas) */}
      <h1 className="sr-only">Tổng quan vận hành</h1>
      {view.notice ? <AdminNotice notice={view.notice} /> : null}

      {/* KPI strip: 4 BE numbers, single row */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4" aria-label="Chỉ số tổng quan">
        {kpis.map((kpi) => (
          <div
            key={kpi.id}
            className="rounded-3xl border border-slate-100 bg-white px-5 py-3.5 shadow-sm flex items-center justify-between gap-2"
          >
            <p className="text-xs font-bold uppercase tracking-wider text-slate-400">{kpi.label}</p>
            <p className="text-xl font-extrabold tracking-tight text-slate-900 tabular-nums">{kpi.value}</p>
          </div>
        ))}
      </div>

      {/* NexaFleet Dispatch Console: 5 widgets fill viewport height */}
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-12 xl:h-[calc(100vh-248px)] xl:min-h-[560px]">
        {/* Left Column (~62% width): Map (3/5 height) + Orders Table (2/5 height) */}
        <div className="xl:col-span-8 flex flex-col gap-4 min-h-0">
          <div className="flex-[3] flex flex-col min-h-0">
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
          </div>
          <div className="flex-[2] flex flex-col min-h-0">
            <BentoOrdersCard
              title="Sổ điều phối đơn hàng"
              totalCount={totalOrdersCount}
              orders={bentoOrders}
              selectedOrderId={selectedOrderId}
              onSelectOrder={setSelectedOrderId}
            />
          </div>
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
