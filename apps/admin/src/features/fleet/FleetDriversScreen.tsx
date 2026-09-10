'use client';

import {
  DataTable,
  FieldMapSchematic,
  MapPanel,
  OperationsPageHeader,
  ResponsiveResultList,
  ScreenState,
} from '@leopard/ui';

import { fleetOrderDetailHref, serializeFleetDriverFilters } from './adapter';
import {
  FleetAvailabilityBadge,
  FleetBoundaryState,
  FleetBreadcrumbs,
  FleetNotice,
  FleetPaginationLinks,
  FleetPreviewHiddenFields,
  FleetScopeRail,
  FleetSurface,
} from './FleetShared';
import type {
  FleetDriverFilters,
  FleetDriverListItemView,
  FleetDriversRouteView,
  FleetPreviewContext,
} from './model';

function driverColumns(previewContext?: FleetPreviewContext) {
  return [
  {
    key: 'driver',
    header: 'Tài xế',
    render: (row: Record<string, unknown>) => {
      const driver = row.driver as FleetDriverListItemView;
      return (
        <div className="min-w-48">
          <p className="font-semibold break-words">{driver.displayName}</p>
          <p className="mt-xxs text-xs text-neutral-muted">{driver.displayId}</p>
        </div>
      );
    },
  },
  {
    key: 'availability',
    header: 'Tình trạng sẵn sàng',
    render: (row: Record<string, unknown>) => {
      const driver = row.driver as FleetDriverListItemView;
      return <FleetAvailabilityBadge status={driver.availability} />;
    },
  },
  {
    key: 'assignment',
    header: 'Đơn đang chạy',
    render: (row: Record<string, unknown>) => {
      const driver = row.driver as FleetDriverListItemView;
      return driver.activeOrder ? (
        <a
          aria-label={`Xem đơn ${driver.activeOrder.reference}`}
          className="font-medium text-brand underline-offset-4 hover:underline focus-visible:rounded-control focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
          href={fleetOrderDetailHref(driver.activeOrder.href, previewContext)}
        >
          {driver.activeOrder.reference}
        </a>
      ) : (
        <span className="text-neutral-muted">Không có</span>
      );
    },
  },
  {
    key: 'location',
    header: 'Vị trí gần nhất',
    render: (row: Record<string, unknown>) => {
      const driver = row.driver as FleetDriverListItemView;
      return (
        <div className="min-w-52">
          <p className="break-words">{driver.lastLocationLabel}</p>
          <p className="mt-xxs text-xs text-neutral-muted tabular-nums">
            {driver.locationUpdatedAtLabel}
          </p>
          {driver.exceptionLabel ? (
            <p className="mt-xxs text-xs font-semibold text-warning-text break-words">
              {driver.exceptionLabel}
            </p>
          ) : null}
        </div>
      );
    },
  },
  ];
}

function filterHref(context?: FleetPreviewContext): string {
  const query = serializeFleetDriverFilters(
    { q: '', availability: 'ALL', sort: 'name-asc', page: 1, pageSize: 20 },
    context,
  );
  return `/fleet/drivers?${query}`;
}

function DriverFilters({
  filters,
  previewContext,
}: Readonly<{
  filters: FleetDriverFilters;
  previewContext: FleetPreviewContext | undefined;
}>) {
  const inputClass =
    'min-h-10 w-full rounded-xl border border-slate-200 bg-slate-50/60 hover:bg-white focus:bg-white px-3.5 py-2 text-xs text-slate-800 transition-colors focus:border-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-900';

  return (
    <form
      aria-label="Lọc tài xế"
      className="grid gap-4 rounded-3xl border border-slate-100 bg-white p-5 sm:p-6 shadow-sm text-neutral-text md:grid-cols-2 xl:grid-cols-[minmax(14rem,2fr)_minmax(10rem,1fr)_minmax(11rem,1fr)_auto] xl:items-end"
      method="get"
      role="search"
    >
      <div className="flex items-center justify-between border-b border-slate-100 pb-3 md:col-span-2 xl:col-span-4">
        <h2 className="text-sm font-bold text-slate-800">Bộ lọc tài xế</h2>
        <span className="text-xs text-slate-400 font-medium">Tìm kiếm & trạng thái</span>
      </div>
      <FleetPreviewHiddenFields context={previewContext} />
      <label className="grid gap-1.5 text-xs font-semibold text-slate-700">
        Tìm tài xế
        <input
          className={inputClass}
          defaultValue={filters.q}
          maxLength={100}
          name="q"
          placeholder="Tên hoặc mã hiển thị"
          type="search"
        />
      </label>
      <label className="grid gap-1.5 text-xs font-semibold text-slate-700">
        Tình trạng sẵn sàng
        <select
          className={inputClass}
          defaultValue={filters.availability}
          name="availability"
        >
          <option value="ALL">Tất cả</option>
          <option value="AVAILABLE">Sẵn sàng</option>
          <option value="BUSY">Đang bận</option>
          <option value="OFFLINE">Ngoại tuyến</option>
        </select>
      </label>
      <label className="grid gap-1.5 text-xs font-semibold text-slate-700">
        Sắp xếp
        <select
          className={inputClass}
          defaultValue={filters.sort}
          name="sort"
        >
          <option value="name-asc">Tên A–Z</option>
          <option value="name-desc">Tên Z–A</option>
          <option value="availability">Tình trạng sẵn sàng</option>
          <option value="location-updated">Vị trí cập nhật gần nhất</option>
        </select>
      </label>
      <input name="page" type="hidden" value="1" />
      <input name="pageSize" type="hidden" value={filters.pageSize} />
      <div className="flex flex-wrap gap-2 md:col-span-2 xl:col-span-1">
        <button
          className="inline-flex min-h-10 items-center justify-center rounded-xl bg-slate-900 px-5 text-xs font-semibold text-white shadow-xs hover:bg-slate-800 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900 focus-visible:ring-offset-2"
          type="submit"
        >
          Áp dụng
        </button>
        <a
          className="inline-flex min-h-10 items-center justify-center rounded-xl border border-slate-200 bg-white px-4 text-xs font-semibold text-slate-700 shadow-2xs hover:bg-slate-50 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900"
          href={filterHref(previewContext)}
        >
          Xóa bộ lọc
        </a>
      </div>
    </form>
  );
}

function DriverResults({
  view,
  previewContext,
}: Readonly<{
  view: Extract<FleetDriversRouteView, { kind: 'drivers' }>;
  previewContext: FleetPreviewContext | undefined;
}>) {
  const rows = view.result.items.map((driver) => ({ id: driver.id, driver }));
  const mobileItems = view.result.items.map((driver) => ({
    id: driver.id,
    heading: driver.displayName,
    status: <FleetAvailabilityBadge status={driver.availability} />,
    details: [
      { id: 'display-id', label: 'Mã hiển thị', value: driver.displayId },
      {
        id: 'active-order',
        label: 'Đơn đang chạy',
        value: driver.activeOrder ? (
          <a
            aria-label={`Xem đơn ${driver.activeOrder.reference}`}
            className="font-medium text-brand underline"
            href={fleetOrderDetailHref(driver.activeOrder.href, previewContext)}
          >
            {driver.activeOrder.reference}
          </a>
        ) : (
          'Không có'
        ),
      },
      { id: 'location', label: 'Vị trí gần nhất', value: driver.lastLocationLabel },
      { id: 'updated', label: 'Cập nhật', value: driver.locationUpdatedAtLabel },
      ...(driver.exceptionLabel
        ? [{ id: 'exception', label: 'Cần chú ý', value: driver.exceptionLabel }]
        : []),
    ],
  }));

  if (view.state === 'no-results') {
    return (
      <ScreenState
        message="Không có tài xế phù hợp với bộ lọc hiện tại."
        state="no-results"
        title="Không tìm thấy tài xế"
      />
    );
  }

  return (
    <div className="flex flex-col gap-md">
      <p aria-live="polite" className="text-body-compact text-neutral-muted">
        {view.result.filterSummary} · Dữ liệu lúc {view.result.asOfLabel}
      </p>
      <div className="hidden min-w-0 overflow-x-auto md:block">
        <DataTable columns={driverColumns(previewContext)} rows={rows} />
      </div>
      <ResponsiveResultList ariaLabel="Kết quả tài xế dạng hàng responsive" items={mobileItems} />
      <FleetPaginationLinks
        hrefForPage={(page) =>
          `/fleet/drivers?${serializeFleetDriverFilters({ ...view.filters, page }, previewContext)}`
        }
        page={view.result.page}
        totalPages={view.result.totalPages}
      />
    </div>
  );
}

export function FleetDriversScreen({
  view,
  previewContext,
}: Readonly<{ view: FleetDriversRouteView; previewContext?: FleetPreviewContext }>) {
  if (view.kind !== 'drivers') {
    return (
      <div className="flex flex-col gap-md">
        <OperationsPageHeader title="Tài xế" />
        <FleetBoundaryState view={view} />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-lg">
      <FleetBreadcrumbs current="drivers" />
      <OperationsPageHeader
        actions={<FleetScopeRail scope={view.scope} />}
        title="Tài xế"
      />
      {view.notice ? <FleetNotice notice={view.notice} /> : null}
      <DriverFilters filters={view.filters} previewContext={previewContext} />
      <div className="grid gap-lg xl:grid-cols-[minmax(0,3fr)_minmax(20rem,2fr)]">
        <FleetSurface title="Kết quả tài xế">
          <DriverResults previewContext={previewContext} view={view} />
        </FleetSurface>
        <MapPanel
          className="rounded-[22px] sm:rounded-[26px] border border-white/80 shadow-xs overflow-hidden"
          height="large"
          lastUpdated={view.result.asOfLabel}
          state={view.result.mapState}
          textAlternative={view.result.mapAlternative}
          title="Bản đồ tài xế trong kết quả"
        >
          <FieldMapSchematic
            fieldLabel={`Đội xe ${view.scope.displayName} · ${view.result.items.length} tài xế trong kết quả`}
            markerLabels={view.result.items.map(
              (driver) => `${driver.displayName} · ${driver.lastLocationLabel}`,
            )}
          />
        </MapPanel>
      </div>
    </div>
  );
}
