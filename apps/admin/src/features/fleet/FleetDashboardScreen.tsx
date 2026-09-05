'use client';

import {
  CompactMetricSummary,
  OperationsPageHeader,
  OperationalAlert,
  StatusBadge,
} from '@leopard/ui';

import { fleetOrderDetailHref, fleetPreviewHref } from './adapter';
import type { FleetDashboardRouteView, FleetPreviewContext } from './model';
import {
  FleetBoundaryState,
  FleetDispatchSlab,
  FleetNotice,
  FleetScopeRail,
  FleetSurface,
} from './FleetShared';
import {
  BentoMapCard,
  BentoOrdersCard,
  StatusOverviewCard,
  FulfillmentPerformanceCard,
  RevenueOverTimeCard,
  type BentoOrderItem,
} from '@/components/bento';

export function FleetDashboardScreen({
  view,
  previewContext,
}: Readonly<{
  view: FleetDashboardRouteView;
  previewContext?: FleetPreviewContext;
}>) {
  if (view.kind !== 'dashboard') {
    return (
      <div className="flex flex-col gap-md">
        <OperationsPageHeader title="Tổng quan đội xe" />
        <FleetBoundaryState view={view} />
      </div>
    );
  }

  const bentoOrders: BentoOrderItem[] = view.activeOrders.map((order) => {
    const routeParts = order.routeLabel.split('➔').map((s) => s.trim());
    const statusLabel =
      order.status === 'IN_TRANSIT'
        ? 'Đang vận chuyển'
        : order.status === 'DELIVERED'
          ? 'Đã giao hàng'
          : order.status === 'PICKING_UP'
            ? 'Đang lấy hàng'
            : order.status === 'REQUESTED'
              ? 'Chờ tiếp nhận'
              : order.status === 'ACCEPTED'
                ? 'Đã nhận đơn'
                : order.status === 'CANCELLED'
                  ? 'Đã hủy'
                  : order.status;

    return {
      id: order.reference,
      customer: order.customerLabel || 'Khách hàng',
      route: {
        from: routeParts[0] || 'Điểm lấy',
        to: routeParts[1] || 'Điểm giao',
      },
      weight: '1,8 tấn',
      eta: order.trackingLabel,
      status: order.status,
      statusLabel,
      href: fleetOrderDetailHref(order.href, previewContext),
    };
  });

  const totalActive = view.activeOrders.length;
  const loadingCount = view.activeOrders.filter(
    (o) => o.status === 'REQUESTED' || o.status === 'ACCEPTED' || o.status === 'PICKING_UP',
  ).length;
  const inTransitCount = view.activeOrders.filter((o) => o.status === 'IN_TRANSIT').length;
  const unloadingCount = view.activeOrders.filter((o) => o.status === 'PICKED_UP').length;
  const deliveredCount = view.activeOrders.filter((o) => o.status === 'DELIVERED').length;

  const loadingPercent = totalActive > 0 ? Math.round((loadingCount / totalActive) * 100) : 0;
  const inTransitPercent = totalActive > 0 ? Math.round((inTransitCount / totalActive) * 100) : 0;
  const unloadingPercent = totalActive > 0 ? Math.round((unloadingCount / totalActive) * 100) : 0;
  const deliveredPercent = totalActive > 0 ? Math.round((deliveredCount / totalActive) * 100) : 0;

  const revenueMetric = view.metrics.find((m) => m.id === 'today-revenue');
  const revenueVnd = revenueMetric?.value ?? 0;
  const formattedRevenue = new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(revenueVnd);

  return (
    <div className="flex flex-col gap-4">
      <OperationsPageHeader
        actions={<FleetScopeRail scope={view.scope} />}
        title="Tổng quan đội xe"
        updatedAt={view.asOfLabel}
      />
      {view.notice ? <FleetNotice notice={view.notice} /> : null}

      {/* NexaFleet Bento 2-Column Grid for Fleet Owner */}
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-12">
        {/* Left Column (~62% width): Fleet Map + Orders Table */}
        <div className="xl:col-span-8 flex flex-col gap-4">
          <BentoMapCard
            title={`Bản đồ điều phối ${view.scope.displayName}`}
            activeOrderCode={
              bentoOrders.length > 0
                ? `${bentoOrders[0].id} · ${bentoOrders[0].route.from} ➔ ${bentoOrders[0].route.to}`
                : 'Không có đơn hàng nào đang vận chuyển'
            }
            searchPlaceholder="Tìm kiếm đơn đội xe..."
          />
          <BentoOrdersCard
            title="Đơn đang hoạt động"
            totalCount={view.activeOrders.length}
            orders={bentoOrders}
          />
        </div>

        {/* Right Column (~38% width): Status Overview + Fulfillment Performance + Revenue */}
        <div className="xl:col-span-4 flex flex-col gap-4">
          <StatusOverviewCard
            title="Trạng thái đội xe"
            loadingPercent={loadingPercent}
            inTransitPercent={inTransitPercent}
            unloadingPercent={unloadingPercent}
            deliveredPercent={deliveredPercent}
          />
          <FulfillmentPerformanceCard
            title="Hiệu suất đội xe"
            rate={totalActive > 0 ? Math.round((deliveredCount / totalActive) * 100) : 100}
            subtitle={totalActive > 0 ? `${deliveredCount}/${totalActive} đơn hoàn tất` : 'tỷ lệ hoàn thành'}
          />
          <RevenueOverTimeCard
            title="Doanh thu đội xe"
            amount={formattedRevenue}
            growthLabel={revenueMetric?.detail ?? 'Doanh thu hôm nay'}
          />
        </div>
      </div>

      <CompactMetricSummary
        ariaLabel="Tóm tắt vận hành đội xe"
        className="rounded-[22px] sm:rounded-3xl border border-white/80 bg-white/90 shadow-xs backdrop-blur-sm"
        items={view.metrics}
      />

      {/* Attention / Exceptions */}
      <FleetSurface
        description="Chỉ hiển thị ngoại lệ đã được nguồn dữ liệu phân loại."
        title="Cần chú ý"
      >
        {view.attentionItems.length === 0 ? (
          <p className="py-sm text-body-compact text-neutral-muted">
            Chưa có ngoại lệ cần xử lý trong snapshot hiện tại.
          </p>
        ) : (
          <ul className="m-0 grid list-none gap-sm p-0">
            {view.attentionItems.map((item) => (
              <li key={item.id}>
                <OperationalAlert title={item.title} tone={item.severity}>
                  <p>{item.reason}</p>
                  <p className="mt-xs text-xs tabular-nums">Ghi nhận: {item.observedAtLabel}</p>
                  <a
                    className="mt-xs inline-flex min-h-11 items-center font-semibold underline underline-offset-4 focus-visible:rounded-control focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-current"
                    href={fleetOrderDetailHref(item.href, previewContext)}
                  >
                    Xem {item.resourceLabel}
                  </a>
                </OperationalAlert>
              </li>
            ))}
          </ul>
        )}
      </FleetSurface>


      {/* Driver Status Slab */}
      <FleetDispatchSlab ariaLabel="Tình trạng tài xế" eyebrow="TÀI XẾ · SNAPSHOT HIỆN TẠI">
        <h2 className="text-section-title font-semibold">Tình trạng tài xế</h2>
        {view.unavailableRegionLabel ? (
          <div className="mt-3">
            <OperationalAlert title="Không thể tải vùng dữ liệu" tone="warning">
              <p>{view.unavailableRegionLabel}</p>
            </OperationalAlert>
          </div>
        ) : (
          <div className="mt-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur-xs flex-1">
              <p className="text-xs font-medium text-white/60">Tóm tắt khả dụng</p>
              <p className="mt-1 text-lg font-bold text-white break-words">{view.availabilitySummary}</p>
            </div>
            <a
              className="inline-flex min-h-11 items-center justify-center rounded-xl bg-white/15 px-5 text-xs font-semibold text-white hover:bg-white/25 transition-colors focus-visible:rounded-control focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
              href={fleetPreviewHref(
                '/fleet/drivers',
                'fleet-drivers-mixed',
                previewContext,
              )}
            >
              Xem danh sách tài xế
            </a>
          </div>
        )}
      </FleetDispatchSlab>
    </div>
  );
}
