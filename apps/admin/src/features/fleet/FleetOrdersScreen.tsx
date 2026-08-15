'use client';

import {
  DataTable,
  MapPanel,
  OperationsPageHeader,
  ResponsiveResultList,
  ScreenState,
  StatusBadge,
} from '@leopard/ui';

import { serializeFleetOrderFilters } from './adapter';
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

function OrderLink({ order }: Readonly<{ order: FleetOrderListItemView }>) {
  return (
    <a
      aria-label={`Xem đơn ${order.reference}`}
      className="font-semibold text-brand underline-offset-4 hover:underline focus-visible:rounded-control focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
      href={order.href}
    >
      {order.reference}
    </a>
  );
}

const ORDER_COLUMNS = [
  {
    key: 'order',
    header: 'Đơn hàng',
    render: (row: Record<string, unknown>) => {
      const order = row.order as FleetOrderListItemView;
      return (
        <div className="min-w-44">
          <OrderLink order={order} />
          <p className="mt-xxs text-xs text-neutral-muted tabular-nums">{order.updatedAtLabel}</p>
        </div>
      );
    },
  },
  {
    key: 'status',
    header: 'Trạng thái',
    render: (row: Record<string, unknown>) => {
      const order = row.order as FleetOrderListItemView;
      return <StatusBadge domain="orderStatus" status={order.status} />;
    },
  },
  {
    key: 'route',
    header: 'Lộ trình',
    render: (row: Record<string, unknown>) => {
      const order = row.order as FleetOrderListItemView;
      return (
        <p className="min-w-56 break-words">
          {order.route.originLabel} → {order.route.destinationLabel}
        </p>
      );
    },
  },
  {
    key: 'people',
    header: 'Customer / Driver',
    render: (row: Record<string, unknown>) => {
      const order = row.order as FleetOrderListItemView;
      return (
        <div className="min-w-48">
          <p className="break-words">{order.customerLabel}</p>
          <p className="mt-xxs text-xs text-neutral-muted break-words">{order.driverLabel}</p>
        </div>
      );
    },
  },
  {
    key: 'payment',
    header: 'Thanh toán',
    render: (row: Record<string, unknown>) => {
      const order = row.order as FleetOrderListItemView;
      return <StatusBadge domain="paymentStatus" status={order.paymentStatus} />;
    },
  },
  {
    key: 'tracking',
    header: 'Tracking',
    render: (row: Record<string, unknown>) => {
      const order = row.order as FleetOrderListItemView;
      return (
        <p
          className={
            order.trackingFreshness === 'stale'
              ? 'min-w-44 font-medium text-warning-text break-words'
              : 'min-w-44 text-neutral-muted break-words'
          }
        >
          {order.trackingLabel}
        </p>
      );
    },
  },
];

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
    'min-h-11 w-full rounded-control border border-neutral-border bg-neutral px-sm text-neutral-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand';
  return (
    <form
      aria-label="Lọc đơn của đội xe"
      className="grid gap-sm rounded-card border border-neutral-border bg-neutral-surface p-md md:grid-cols-2 xl:grid-cols-4"
      method="get"
      role="search"
    >
      <FleetPreviewHiddenFields context={previewContext} />
      <label className="grid gap-xxs text-body-compact font-medium xl:col-span-2">
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
      <label className="grid gap-xxs text-body-compact font-medium">
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
      <label className="grid gap-xxs text-body-compact font-medium">
        Customer
        <input
          className={fieldClass}
          defaultValue={filters.customer}
          maxLength={100}
          name="customer"
          placeholder="Tên hiển thị"
        />
      </label>
      <label className="grid gap-xxs text-body-compact font-medium">
        Driver
        <select className={fieldClass} defaultValue={filters.driverId} name="driverId">
          <option value="">Tất cả tài xế</option>
          <option value="22222222-2222-4222-8222-222222222001">Tài xế An Mô Phỏng</option>
          <option value="22222222-2222-4222-8222-222222222002">Tài xế Bình Mô Phỏng</option>
        </select>
      </label>
      <label className="grid gap-xxs text-body-compact font-medium">
        Từ ngày
        <input className={fieldClass} defaultValue={filters.from} name="from" type="date" />
      </label>
      <label className="grid gap-xxs text-body-compact font-medium">
        Đến ngày
        <input className={fieldClass} defaultValue={filters.to} name="to" type="date" />
      </label>
      <label className="grid gap-xxs text-body-compact font-medium">
        Sắp xếp
        <select className={fieldClass} defaultValue={filters.sort} name="sort">
          <option value="updated-desc">Mới cập nhật trước</option>
          <option value="updated-asc">Cũ cập nhật trước</option>
          <option value="reference-asc">Mã đơn A–Z</option>
        </select>
      </label>
      <input name="page" type="hidden" value="1" />
      <input name="pageSize" type="hidden" value={filters.pageSize} />
      <div className="flex flex-wrap items-end gap-xs md:col-span-2 xl:col-span-4">
        <button
          className="inline-flex min-h-11 items-center rounded-control bg-brand px-md font-semibold text-brand-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2"
          type="submit"
        >
          Áp dụng
        </button>
        <a
          className="inline-flex min-h-11 items-center rounded-control border border-neutral-border px-md font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
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

  const rows = view.result.items.map((order) => ({ id: order.id, order }));
  const mobileItems = view.result.items.map((order) => ({
    id: order.id,
    heading: <OrderLink order={order} />,
    status: <StatusBadge domain="orderStatus" status={order.status} />,
    details: [
      {
        id: 'route',
        label: 'Lộ trình',
        value: `${order.route.originLabel} → ${order.route.destinationLabel}`,
      },
      { id: 'customer', label: 'Customer', value: order.customerLabel },
      { id: 'driver', label: 'Driver', value: order.driverLabel },
      {
        id: 'payment',
        label: 'Thanh toán',
        value: <StatusBadge domain="paymentStatus" status={order.paymentStatus} />,
      },
      { id: 'tracking', label: 'Tracking', value: order.trackingLabel },
      { id: 'updated', label: 'Cập nhật', value: order.updatedAtLabel },
    ],
  }));

  return (
    <div className="flex flex-col gap-md">
      <p aria-live="polite" className="text-body-compact text-neutral-muted">
        {view.result.filterSummary} · Snapshot {view.result.asOfLabel}
      </p>
      <div className="hidden min-w-0 overflow-x-auto md:block">
        <DataTable columns={ORDER_COLUMNS} rows={rows} />
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
        context="Danh sách read-only theo trạng thái, Customer, Driver và khoảng ngày"
        isStale={view.state === 'offline'}
        title="Đơn của đội xe"
      />
      <FleetScopeRail scope={view.scope} />
      {view.notice ? <FleetNotice notice={view.notice} /> : null}
      <OrderFilters filters={view.filters} previewContext={previewContext} />
      <div className="grid gap-lg 2xl:grid-cols-[minmax(0,7fr)_minmax(20rem,3fr)]">
        <FleetSurface title="Kết quả đơn hàng">
          <OrderResults previewContext={previewContext} view={view} />
        </FleetSurface>
        <MapPanel
          height="large"
          lastUpdated={view.result.asOfLabel}
          state={view.result.mapState}
          textAlternative={view.result.mapAlternative}
          title="Bản đồ tuyến trong kết quả"
        >
          <div className="flex h-full min-h-map-min items-center justify-center p-md text-center text-body-compact text-neutral-muted">
            Tuyến mô phỏng được phối hợp với cùng tập kết quả trong bảng.
          </div>
        </MapPanel>
      </div>
    </div>
  );
}
