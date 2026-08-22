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

      <CompactMetricSummary ariaLabel="Tóm tắt vận hành đội xe" items={view.metrics} />

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

      <div className="grid gap-lg xl:grid-cols-[minmax(0,2fr)_minmax(16rem,1fr)]">
        <FleetSurface
          description="Các đơn đang hoạt động do snapshot đã xác thực cung cấp."
          title="Đơn đang hoạt động"
        >
          {view.activeOrders.length === 0 ? (
            <p className="py-sm text-body-compact text-neutral-muted">
              Chưa có đơn đang hoạt động trong đội xe.
            </p>
          ) : (
            <ul className="m-0 grid list-none gap-md p-0">
              {view.activeOrders.map((order) => (
                <li key={order.id} className="border-l-4 border-brand bg-neutral-surface p-md">
                  <p className="mb-xs text-[0.625rem] font-bold tracking-widest text-brand">
                    ACTIVE ORDER
                  </p>
                  <div className="flex flex-wrap items-start justify-between gap-xs">
                    <a
                      className="font-semibold text-brand underline-offset-4 hover:underline focus-visible:rounded-control focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
                      href={fleetOrderDetailHref(order.href, previewContext)}
                    >
                      {order.reference}
                    </a>
                    <StatusBadge domain="orderStatus" status={order.status} />
                  </div>
                  <p className="mt-xs text-body-compact">{order.routeLabel}</p>
                  <p className="mt-xxs text-body-compact text-neutral-muted">{order.driverLabel}</p>
                  <p className="mt-xxs text-xs text-neutral-muted">{order.trackingLabel}</p>
                </li>
              ))}
            </ul>
          )}
        </FleetSurface>

        <FleetDispatchSlab ariaLabel="Tình trạng tài xế" eyebrow="DRIVER FIELD · SNAPSHOT">
          <h2 className="text-section-title font-semibold">Tình trạng tài xế</h2>
          {view.unavailableRegionLabel ? (
            <OperationalAlert title="Không thể tải vùng dữ liệu" tone="warning">
              <p>{view.unavailableRegionLabel}</p>
            </OperationalAlert>
          ) : (
            <>
              <p className="mt-sm text-lg font-semibold break-words">{view.availabilitySummary}</p>
              <a
                className="mt-md inline-flex min-h-11 items-center font-semibold text-brand-soft underline-offset-4 hover:underline focus-visible:rounded-control focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-soft"
                href={fleetPreviewHref(
                  '/fleet/drivers',
                  'fleet-drivers-mixed',
                  previewContext,
                )}
              >
                Xem danh sách tài xế
              </a>
            </>
          )}
        </FleetDispatchSlab>
      </div>
    </div>
  );
}
