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

  return (
    <div className="flex flex-col gap-lg">
      <OperationsPageHeader
        context="Ngoại lệ và snapshot vận hành thuộc đúng phạm vi đội xe"
        title="Tổng quan đội xe"
      />
      <FleetScopeRail scope={view.scope} />
      <p className="text-xs text-neutral-muted tabular-nums">Snapshot: {view.asOfLabel}</p>
      {view.notice ? <FleetNotice notice={view.notice} /> : null}

      <CompactMetricSummary
        ariaLabel="Tóm tắt vận hành đội xe"
        className="rounded-[22px] sm:rounded-[26px] border border-white/80 bg-white/90 shadow-xs backdrop-blur-sm"
        items={view.metrics}
      />

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

      <div className="grid gap-lg xl:grid-cols-[minmax(0,2fr)_minmax(18rem,1fr)]">
        <FleetSurface
          description="Các đơn đang hoạt động do snapshot đã xác thực cung cấp."
          title="Đơn đang hoạt động"
        >
          {view.activeOrders.length === 0 ? (
            <div className="py-sm text-body-compact text-neutral-muted">
              Chưa có đơn đang hoạt động trong đội xe.
              <a
                className="mt-xs block min-h-11 font-semibold text-brand underline-offset-4 hover:underline focus-visible:rounded-control focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
                href={fleetPreviewHref('/fleet/orders', 'fleet-orders-active', previewContext)}
              >
                Xem tất cả đơn của đội xe
              </a>
            </div>
          ) : (
            <ul className="m-0 grid list-none gap-3 p-0">
              {view.activeOrders.map((order) => (
                <li
                  key={order.id}
                  className="rounded-2xl border border-slate-200/80 bg-[#f8fbff] p-4 shadow-2xs transition-shadow hover:shadow-xs"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                    <span className="inline-flex items-center gap-1 rounded-full bg-brand/10 px-2 py-0.5 text-[10px] font-bold tracking-wider text-brand uppercase">
                      ĐƠN ĐANG CHẠY
                    </span>
                    <StatusBadge domain="orderStatus" status={order.status} />
                  </div>
                  <div className="flex flex-wrap items-baseline justify-between gap-xs">
                    <a
                      className="font-bold text-brand hover:underline underline-offset-4 focus-visible:rounded-control focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
                      href={fleetOrderDetailHref(order.href, previewContext)}
                    >
                      {order.reference}
                    </a>
                  </div>
                  <p className="mt-1 text-sm font-medium text-slate-800 break-words">{order.routeLabel}</p>
                  <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-neutral-muted">
                    <span className="font-medium text-slate-600">{order.driverLabel}</span>
                    <span>·</span>
                    <span className="text-slate-500">{order.trackingLabel}</span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </FleetSurface>

        <FleetDispatchSlab ariaLabel="Tình trạng tài xế" eyebrow="TÀI XẾ · SNAPSHOT HIỆN TẠI">
          <h2 className="text-section-title font-semibold">Tình trạng tài xế</h2>
          {view.unavailableRegionLabel ? (
            <div className="mt-3">
              <OperationalAlert title="Không thể tải vùng dữ liệu" tone="warning">
                <p>{view.unavailableRegionLabel}</p>
              </OperationalAlert>
            </div>
          ) : (
            <div className="mt-4 flex flex-col gap-4">
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur-xs">
                <p className="text-xs font-medium text-white/60">Tóm tắt khả dụng</p>
                <p className="mt-1 text-lg font-bold text-white break-words">{view.availabilitySummary}</p>
              </div>
              <a
                className="inline-flex min-h-10 items-center justify-center rounded-xl bg-white/15 px-4 text-xs font-semibold text-white hover:bg-white/25 transition-colors focus-visible:rounded-control focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
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
    </div>
  );
}
