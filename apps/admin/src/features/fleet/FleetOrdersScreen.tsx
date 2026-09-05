'use client';

import { useState } from 'react';
import {
  MapPanel,
  OperationsPageHeader,
  ResponsiveResultList,
  RouteMapSchematic,
  ScreenState,
  StatusBadge,
} from '@leopard/ui';

import { fleetOrderDetailHref, serializeFleetOrderFilters } from './adapter';
import {
  FleetBoundaryState,
  FleetBreadcrumbs,
  FleetNotice,
  FleetPaginationLinks,
  FleetPreviewHiddenFields,
  FleetScopeRail,
  FleetSurface,
} from './FleetShared';
import type {
  FleetOrderFilters,
  FleetOrderListItemView,
  FleetOrdersRouteView,
  FleetPreviewContext,
} from './model';

function detailHref(order: FleetOrderListItemView, context?: FleetPreviewContext): string {
  return fleetOrderDetailHref(order.href, context);
}

function OrderLink({
  order,
  previewContext,
}: Readonly<{
  order: FleetOrderListItemView;
  previewContext?: FleetPreviewContext | undefined;
}>) {
  return (
    <a
      aria-label={`Xem đơn ${order.reference}`}
      className="font-semibold text-brand underline-offset-4 hover:underline focus-visible:rounded-control focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
      href={detailHref(order, previewContext)}
    >
      {order.reference}
    </a>
  );
}

function FleetOrderLedger({
  orders,
  fleetName,
  previewContext,
}: Readonly<{
  orders: readonly FleetOrderListItemView[];
  fleetName: string;
  previewContext?: FleetPreviewContext | undefined;
}>) {
  const [expandedOrderId, setExpandedOrderId] = useState<string | null>(null);

  return (
    <div className="overflow-x-auto rounded-2xl border border-slate-200/80 bg-white shadow-2xs">
      <table className="w-full min-w-[42rem] border-collapse text-left text-body-compact">
        <caption className="sr-only">
          {orders.length} đơn thuộc Đội xe {fleetName}
        </caption>
        <thead className="border-b border-slate-200/80 bg-slate-50/90 text-slate-500">
          <tr>
            <th className="px-md py-3 font-extrabold text-[11px] uppercase tracking-wider" scope="col">
              Đơn hàng
            </th>
            <th className="px-md py-3 font-extrabold text-[11px] uppercase tracking-wider" scope="col">
              Trạng thái
            </th>
            <th className="px-md py-3 font-extrabold text-[11px] uppercase tracking-wider" scope="col">
              Thông tin bổ sung
            </th>
            <th className="px-md py-3 font-extrabold text-[11px] uppercase tracking-wider" scope="col">
              Xem
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {orders.map((order) => {
            const expanded = expandedOrderId === order.id;
            return (
              <tr
                className="align-top hover:bg-slate-50/60 transition-colors"
                key={order.id}
              >
                <td className="border-l-4 border-brand px-md py-md">
                  <OrderLink order={order} previewContext={previewContext} />
                  <p className="mt-xxs text-xs text-neutral-muted tabular-nums">
                    {order.updatedAtLabel}
                  </p>
                </td>
                <td className="px-md py-md">
                  <StatusBadge domain="orderStatus" status={order.status} />
                </td>
                <td className="px-md py-md">
                  <button
                    aria-controls={`fleet-order-detail-${order.id}`}
                    aria-expanded={expanded}
                    aria-label={`Mở thông tin bổ sung cho đơn ${order.reference}`}
                    className="inline-flex min-h-10 items-center gap-xs font-semibold text-brand underline-offset-4 hover:underline focus-visible:rounded-control focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand text-xs"
                    onClick={() =>
                      setExpandedOrderId((current) => (current === order.id ? null : order.id))
                    }
                    type="button"
                  >
                    {expanded ? 'Thu gọn' : 'Mở sổ chi tiết'}
                    <span aria-hidden="true">{expanded ? '↑' : '↓'}</span>
                  </button>
                  {expanded ? (
                    <div
                      aria-label={`Thông tin bổ sung cho đơn ${order.reference}`}
                      className="mt-sm rounded-xl border border-slate-200/80 bg-[#f8fbff] p-3.5 shadow-inner"
                      id={`fleet-order-detail-${order.id}`}
                      role="region"
                    >
                      <dl className="grid gap-2 sm:grid-cols-2 text-xs">
                        <div className="sm:col-span-2">
                          <dt className="font-semibold text-neutral-muted">Lộ trình</dt>
                          <dd className="mt-0.5 font-medium text-slate-800 break-words">
                            {order.route.originLabel} → {order.route.destinationLabel}
                          </dd>
                        </div>
                        <div>
                          <dt className="font-semibold text-neutral-muted">Khách hàng</dt>
                          <dd className="mt-0.5 font-medium text-slate-800 break-words">{order.customerLabel}</dd>
                        </div>
                        <div>
                          <dt className="font-semibold text-neutral-muted">Tài xế</dt>
                          <dd className="mt-0.5 font-medium text-slate-800 break-words">{order.driverLabel}</dd>
                        </div>
                        <div>
                          <dt className="font-semibold text-neutral-muted">Thanh toán</dt>
                          <dd className="mt-0.5">
                            <StatusBadge domain="paymentStatus" status={order.paymentStatus} />
                          </dd>
                        </div>
                        <div>
                          <dt className="font-semibold text-neutral-muted">Định vị GPS</dt>
                          <dd
                            className={`mt-0.5 break-words ${order.trackingFreshness === 'stale' ? 'font-semibold text-warning-text' : 'text-slate-600'}`}
                          >
                            {order.trackingLabel}
                          </dd>
                        </div>
                      </dl>
                    </div>
                  ) : null}
                </td>
                <td className="px-md py-md">
                  <a
                    aria-label={`Xem chi tiết đơn ${order.reference}`}
                    className="inline-flex min-h-10 items-center font-semibold text-brand underline-offset-4 hover:underline focus-visible:rounded-control focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand text-xs"
                    href={detailHref(order, previewContext)}
                  >
                    Mở →
                  </a>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function clearFilterHref(context?: FleetPreviewContext): string {
  const query = serializeFleetOrderFilters(
    {
      q: '',
      status: 'ALL',
      customer: '',
      driverId: '',
      from: '',
      to: '',
      sort: 'updated-desc',
      page: 1,
      pageSize: 20,
    },
    context,
  );
  return `/fleet/orders?${query}`;
}

function OrderFilters({
  filters,
  previewContext,
}: Readonly<{
  filters: FleetOrderFilters;
  previewContext: FleetPreviewContext | undefined;
}>) {
  const fieldClass =
    'min-h-10 w-full rounded-xl border border-slate-200 bg-slate-50/60 hover:bg-white focus:bg-white px-3.5 py-2 text-xs text-slate-800 transition-colors focus:border-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-900';
  return (
    <form
      aria-label="Lọc đơn của đội xe"
      className="grid gap-4 rounded-3xl border border-slate-100 bg-white p-5 sm:p-6 shadow-sm text-neutral-text md:grid-cols-2 xl:grid-cols-4"
      method="get"
      role="search"
    >
      <div className="flex items-center justify-between border-b border-slate-100 pb-3 md:col-span-2 xl:col-span-4">
        <h2 className="text-sm font-bold text-slate-800">Bộ lọc đơn hàng</h2>
        <span className="text-xs text-slate-400 font-medium">Tìm kiếm & phân loại</span>
      </div>
      <FleetPreviewHiddenFields context={previewContext} />
      <label className="grid gap-1.5 text-xs font-semibold text-slate-700 xl:col-span-2">
        Tìm đơn
        <input
          className={fieldClass}
          defaultValue={filters.q}
          maxLength={100}
          name="q"
          placeholder="Mã đơn hoặc nội dung được phép tìm"
          type="search"
        />
      </label>
      <label className="grid gap-1.5 text-xs font-semibold text-slate-700">
        Trạng thái
        <select className={fieldClass} defaultValue={filters.status} name="status">
          <option value="ALL">Tất cả</option>
          <option value="REQUESTED">Chờ tài xế</option>
          <option value="ACCEPTED">Đã nhận đơn</option>
          <option value="PICKING_UP">Đang đến điểm lấy</option>
          <option value="IN_TRANSIT">Đang vận chuyển</option>
          <option value="DELIVERED">Đã giao</option>
          <option value="CANCELLED">Đã hủy</option>
        </select>
      </label>
      <label className="grid gap-1.5 text-xs font-semibold text-slate-700">
        Khách hàng
        <input
          className={fieldClass}
          defaultValue={filters.customer}
          maxLength={100}
          name="customer"
          placeholder="Tên hiển thị"
        />
      </label>
      <label className="grid gap-1.5 text-xs font-semibold text-slate-700">
        Tài xế
        <select className={fieldClass} defaultValue={filters.driverId} name="driverId">
          <option value="">Tất cả tài xế</option>
          <option value="22222222-2222-4222-8222-222222222001">Tài xế An Mô Phỏng</option>
          <option value="22222222-2222-4222-8222-222222222002">Tài xế Bình Mô Phỏng</option>
        </select>
      </label>
      <label className="grid gap-1.5 text-xs font-semibold text-slate-700">
        Từ ngày
        <input className={fieldClass} defaultValue={filters.from} name="from" type="date" />
      </label>
      <label className="grid gap-1.5 text-xs font-semibold text-slate-700">
        Đến ngày
        <input className={fieldClass} defaultValue={filters.to} name="to" type="date" />
      </label>
      <label className="grid gap-1.5 text-xs font-semibold text-slate-700">
        Sắp xếp
        <select className={fieldClass} defaultValue={filters.sort} name="sort">
          <option value="updated-desc">Mới cập nhật trước</option>
          <option value="updated-asc">Cũ cập nhật trước</option>
          <option value="reference-asc">Mã đơn A–Z</option>
        </select>
      </label>
      <input name="page" type="hidden" value="1" />
      <input name="pageSize" type="hidden" value={filters.pageSize} />
      <div className="flex flex-wrap items-end gap-2 md:col-span-2 xl:col-span-4 pt-2">
        <button
          className="inline-flex min-h-10 items-center justify-center rounded-xl bg-slate-900 px-5 text-xs font-semibold text-white shadow-xs hover:bg-slate-800 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900 focus-visible:ring-offset-2"
          type="submit"
        >
          Áp dụng
        </button>
        <a
          className="inline-flex min-h-10 items-center justify-center rounded-xl border border-slate-200 bg-white px-4 text-xs font-semibold text-slate-700 shadow-2xs hover:bg-slate-50 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900"
          href={clearFilterHref(previewContext)}
        >
          Xóa bộ lọc
        </a>
      </div>
    </form>
  );
}

function OrderResults({
  view,
  previewContext,
}: Readonly<{
  view: Extract<FleetOrdersRouteView, { kind: 'orders' }>;
  previewContext: FleetPreviewContext | undefined;
}>) {
  if (view.state === 'no-results') {
    return (
      <ScreenState
        message="Không có đơn phù hợp với bộ lọc hiện tại."
        state="no-results"
        title="Không tìm thấy đơn"
      />
    );
  }

  const mobileItems = view.result.items.map((order) => ({
    id: order.id,
    heading: <OrderLink order={order} previewContext={previewContext} />,
    status: <StatusBadge domain="orderStatus" status={order.status} />,
    details: [
      {
        id: 'route',
        label: 'Lộ trình',
        value: `${order.route.originLabel} → ${order.route.destinationLabel}`,
      },
      { id: 'customer', label: 'Khách hàng', value: order.customerLabel },
      { id: 'driver', label: 'Tài xế', value: order.driverLabel },
      {
        id: 'payment',
        label: 'Thanh toán',
        value: <StatusBadge domain="paymentStatus" status={order.paymentStatus} />,
      },
      { id: 'tracking', label: 'Định vị GPS', value: order.trackingLabel },
      { id: 'updated', label: 'Cập nhật', value: order.updatedAtLabel },
    ],
  }));

  return (
    <div className="flex flex-col gap-md">
      <p aria-live="polite" className="text-body-compact text-neutral-muted">
        {view.result.filterSummary} · Dữ liệu lúc {view.result.asOfLabel}
      </p>
      <div className="hidden min-w-0 overflow-x-auto md:block">
        <FleetOrderLedger
          fleetName={view.scope.displayName}
          orders={view.result.items}
          previewContext={previewContext}
        />
      </div>
      <ResponsiveResultList ariaLabel="Kết quả đơn hàng dạng hàng responsive" items={mobileItems} />
      <FleetPaginationLinks
        hrefForPage={(page) =>
          `/fleet/orders?${serializeFleetOrderFilters({ ...view.filters, page }, previewContext)}`
        }
        page={view.result.page}
        totalPages={view.result.totalPages}
      />
    </div>
  );
}

export function FleetOrdersScreen({
  view,
  previewContext,
}: Readonly<{ view: FleetOrdersRouteView; previewContext?: FleetPreviewContext }>) {
  if (view.kind !== 'orders') {
    return (
      <div className="flex flex-col gap-md">
        <OperationsPageHeader title="Đơn của đội xe" />
        <FleetBoundaryState view={view} />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-lg">
      <FleetBreadcrumbs current="orders" />
      <OperationsPageHeader
        actions={<FleetScopeRail scope={view.scope} />}
        isStale={view.state === 'offline'}
        title="Đơn của đội xe"
      />
      {view.notice ? <FleetNotice notice={view.notice} /> : null}
      <OrderFilters filters={view.filters} previewContext={previewContext} />
      <div className="grid gap-lg 2xl:grid-cols-[minmax(0,7fr)_minmax(20rem,3fr)]">
        <FleetSurface title="Kết quả đơn hàng">
          <OrderResults previewContext={previewContext} view={view} />
        </FleetSurface>
        <MapPanel
          className="rounded-[22px] sm:rounded-[26px] border border-white/80 shadow-xs overflow-hidden"
          height="large"
          lastUpdated={view.result.asOfLabel}
          state={view.result.mapState}
          textAlternative={view.result.mapAlternative}
          title="Bản đồ tuyến trong kết quả"
        >
          <RouteMapSchematic
            destinationLabel={view.result.items[0]?.route.destinationLabel ?? 'Chưa có điểm giao'}
            markerLabel={`${view.result.items.length} tuyến trong snapshot hiện tại`}
            originLabel={view.result.items[0]?.route.originLabel ?? 'Chưa có điểm lấy'}
          />
        </MapPanel>
      </div>
    </div>
  );
}
