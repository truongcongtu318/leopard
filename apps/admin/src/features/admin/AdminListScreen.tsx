'use client';

import {
  DataTable,
  OperationsPageHeader,
  ResponsiveResultList,
  ScreenState,
  StatusBadge,
  type DataTableColumn,
  type ResponsiveResultItem,
} from '@leopard/ui';
import type { ReactNode } from 'react';

import { createAdminPreviewHref, serializeAdminListFilters } from './adapter';
import { AdminCommandLauncher } from './AdminCommandLauncher';
import {
  AdminBoundaryState,
  AdminBreadcrumbs,
  AdminNotice,
  AdminPaginationLinks,
  AdminPreviewHiddenFields,
  AdminSurface,
} from './AdminShared';
import type {
  AdminCommandView,
  AdminDriverListItemView,
  AdminFleetListItemView,
  AdminListItemView,
  AdminListRouteView,
  AdminListScreen as AdminListScreenName,
  AdminListView,
  AdminOrderListItemView,
  AdminPreviewContext,
  AdminUserListItemView,
} from './model';

const fieldClass =
  'min-h-11 w-full rounded-control border border-neutral-border bg-neutral px-sm text-neutral-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand';

const titleByScreen: Readonly<Record<AdminListScreenName, string>> = {
  orders: 'Đơn hàng',
  users: 'Người dùng',
  fleets: 'Đội xe',
  drivers: 'Tài xế',
};

function OrderRouteLedger({ order }: Readonly<{ order: AdminOrderListItemView }>) {
  const [origin = order.routeLabel, destination = order.routeLabel] = order.routeLabel.split(' → ');
  return (
    <div aria-label={`Tuyến ${order.reference}`} className="min-w-64 text-body-compact">
      <div className="flex gap-xs">
        <span aria-hidden="true" className="mt-xs h-xs w-xs shrink-0 rounded-pill bg-brand" />
        <p className="font-medium break-words">{origin}</p>
      </div>
      <div aria-hidden="true" className="ml-xxs h-sm border-l-2 border-neutral-border" />
      <div className="flex gap-xs">
        <span aria-hidden="true" className="mt-xs h-xs w-xs shrink-0 rounded-pill border-2 border-brand bg-neutral" />
        <p className="font-medium break-words">{destination}</p>
      </div>
    </div>
  );
}

function orderSignalClass(order: AdminOrderListItemView): string {
  return order.trackingTone === 'warning' || order.paymentStatus === 'FAILED'
    ? 'border-warning-border'
    : 'border-brand';
}

function OrderLink({
  order,
  previewContext,
}: Readonly<{
  order: AdminOrderListItemView;
  previewContext?: AdminPreviewContext | undefined;
}>) {
  return (
    <a
      aria-label={`Xem đơn ${order.reference}`}
      className="font-semibold text-brand underline-offset-4 hover:underline focus-visible:rounded-control focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
      href={createAdminPreviewHref(order.href, 'order-detail', previewContext)}
    >
      {order.reference}
    </a>
  );
}

function orderColumns(previewContext?: AdminPreviewContext): DataTableColumn[] {
  return [
    {
      key: 'order', header: 'Đơn hàng', render: (row) => {
        const order = row.item as AdminOrderListItemView;
        return <div className={`min-w-44 border-l-4 pl-sm ${orderSignalClass(order)}`}><OrderLink order={order} previewContext={previewContext} /><p className="mt-xxs text-xs text-neutral-muted tabular-nums">{order.createdAtLabel}</p></div>;
      },
    },
    {
      key: 'route', header: 'Lộ trình', className: 'hidden xl:table-cell', render: (row) => {
        const order = row.item as AdminOrderListItemView;
        return <OrderRouteLedger order={order} />;
      },
    },
    {
      key: 'people', header: 'Customer / Driver', className: 'hidden xl:table-cell', render: (row) => {
        const order = row.item as AdminOrderListItemView;
        return <div className="min-w-48"><p className="break-words">{order.customerLabel}</p><p className="mt-xxs text-xs text-neutral-muted break-words">{order.driverLabel}</p></div>;
      },
    },
    {
      key: 'status', header: 'Trạng thái', render: (row) => <StatusBadge domain="orderStatus" status={(row.item as AdminOrderListItemView).status} />,
    },
    {
      key: 'tracking', header: 'Tracking', className: 'hidden lg:table-cell', render: (row) => {
        const order = row.item as AdminOrderListItemView;
        return <p className={`min-w-40 break-words ${order.trackingTone === 'warning' ? 'font-semibold text-warning-text' : 'text-neutral-muted'}`}>{order.trackingLabel}</p>;
      },
    },
    {
      key: 'payment', header: 'Thanh toán', render: (row) => {
        const order = row.item as AdminOrderListItemView;
        return <div className="min-w-40"><StatusBadge domain="paymentStatus" status={order.paymentStatus} /><p className="mt-xxs text-xs tabular-nums">{order.amountLabel}</p></div>;
      },
    },
    { key: 'action', header: 'Chi tiết', render: (row) => <OrderLink order={row.item as AdminOrderListItemView} previewContext={previewContext} /> },
  ];
}

function userColumns(): DataTableColumn[] {
  return [
    {
      key: 'identity', header: 'Người dùng', render: (row) => {
        const user = row.item as AdminUserListItemView;
        return <div className="min-w-48"><p className="font-semibold break-words">{user.displayName}</p><p className="mt-xxs text-xs text-neutral-muted">{user.maskedPhone}</p></div>;
      },
    },
    { key: 'role', header: 'Role', render: (row) => <span className="font-mono text-xs">{(row.item as AdminUserListItemView).role}</span> },
    { key: 'status', header: 'Tài khoản', render: (row) => <StatusBadge domain="userStatus" status={(row.item as AdminUserListItemView).status} /> },
    {
      key: 'updated', header: 'Cập nhật', render: (row) => {
        const user = row.item as AdminUserListItemView;
        return <div className="min-w-40"><p className="tabular-nums">{user.updatedAtLabel}</p>{user.exceptionLabel ? <p className="mt-xxs text-xs font-semibold text-danger-text">{user.exceptionLabel}</p> : null}</div>;
      },
    },
  ];
}

function fleetColumns(): DataTableColumn[] {
  return [
    {
      key: 'fleet', header: 'Đội xe', render: (row) => {
        const fleet = row.item as AdminFleetListItemView;
        return <div className="min-w-48"><p className="font-semibold break-words">{fleet.displayName}</p><p className="mt-xxs font-mono text-xs text-neutral-muted break-all">{fleet.displayId}</p></div>;
      },
    },
    { key: 'owner', header: 'Owner / membership', className: 'hidden xl:table-cell', render: (row) => <p className="min-w-48 break-words">{(row.item as AdminFleetListItemView).ownerSummary}</p> },
    {
      key: 'counts', header: 'Quy mô', render: (row) => {
        const fleet = row.item as AdminFleetListItemView;
        return <dl className="min-w-40 text-body-compact"><div className="flex justify-between gap-sm"><dt>Membership</dt><dd className="tabular-nums">{fleet.activeMembershipCount}</dd></div><div className="flex justify-between gap-sm"><dt>Driver</dt><dd className="tabular-nums">{fleet.driverCount}</dd></div><div className="flex justify-between gap-sm"><dt>Order</dt><dd className="tabular-nums">{fleet.orderCount}</dd></div></dl>;
      },
    },
    {
      key: 'membership', header: 'Tình trạng thành viên', render: (row) => {
        const fleet = row.item as AdminFleetListItemView;
        return <p className={`min-w-56 break-words ${fleet.membershipState === 'error' ? 'text-danger-text' : 'text-neutral-muted'}`}>{fleet.membershipMessage}</p>;
      },
    },
    { key: 'updated', header: 'Cập nhật', className: 'hidden lg:table-cell', render: (row) => <span className="tabular-nums">{(row.item as AdminFleetListItemView).updatedAtLabel}</span> },
  ];
}

function DriverOrderLink({
  driver,
  previewContext,
}: Readonly<{
  driver: AdminDriverListItemView;
  previewContext?: AdminPreviewContext | undefined;
}>) {
  return driver.activeOrder ? (
    <a
      aria-label={`Xem đơn ${driver.activeOrder.reference}`}
      className="font-semibold text-brand underline-offset-4 hover:underline focus-visible:rounded-control focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
      href={createAdminPreviewHref(driver.activeOrder.href, 'order-detail', previewContext)}
    >
      {driver.activeOrder.reference}
    </a>
  ) : <span className="text-neutral-muted">Không có</span>;
}

function driverColumns(previewContext?: AdminPreviewContext): DataTableColumn[] {
  return [
    {
      key: 'driver', header: 'Tài xế', render: (row) => {
        const driver = row.item as AdminDriverListItemView;
        return <div className="min-w-44"><p className="font-semibold break-words">{driver.displayName}</p><p className="mt-xxs text-xs text-neutral-muted">{driver.maskedPhone}</p></div>;
      },
    },
    { key: 'account', header: 'Tài khoản', render: (row) => <StatusBadge domain="userStatus" status={(row.item as AdminDriverListItemView).accountStatus} /> },
    { key: 'availability', header: 'Trạng thái tài xế', render: (row) => <StatusBadge domain="driverAvailability" status={(row.item as AdminDriverListItemView).availability} /> },
    { key: 'membership', header: 'Thành viên đội xe', className: 'hidden lg:table-cell', render: (row) => <div className="min-w-44"><StatusBadge domain="fleetMemberStatus" status={(row.item as AdminDriverListItemView).membershipStatus} /><p className="mt-xxs text-xs text-neutral-muted break-words">{(row.item as AdminDriverListItemView).fleetLabel}</p></div> },
    { key: 'order', header: 'Đơn đang chạy', render: (row) => <DriverOrderLink driver={row.item as AdminDriverListItemView} previewContext={previewContext} /> },
    {
      key: 'location', header: 'Vị trí gần nhất', className: 'hidden xl:table-cell', render: (row) => {
        const driver = row.item as AdminDriverListItemView;
        return <div className="min-w-44"><p className={driver.locationCondition === 'stale' ? 'font-semibold text-warning-text' : ''}>{driver.locationLabel}</p><p className="mt-xxs text-xs text-neutral-muted tabular-nums">{driver.locationUpdatedAtLabel}</p></div>;
      },
    },
  ];
}

function columnsFor(
  screen: AdminListScreenName,
  previewContext?: AdminPreviewContext,
): DataTableColumn[] {
  if (screen === 'orders') return orderColumns(previewContext);
  if (screen === 'users') return userColumns();
  if (screen === 'fleets') return fleetColumns();
  return driverColumns(previewContext);
}

function mobileItem(
  item: AdminListItemView,
  previewContext?: AdminPreviewContext,
): ResponsiveResultItem {
  if (item.entity === 'order') {
    return {
      id: item.id,
      heading: <span className={`block border-l-4 pl-sm ${orderSignalClass(item)}`}><OrderLink order={item} previewContext={previewContext} /></span>,
      status: <StatusBadge domain="orderStatus" status={item.status} />,
      details: [
        { id: 'route', label: 'Lộ trình', value: item.routeLabel },
        { id: 'people', label: 'Customer / Driver', value: `${item.customerLabel} · ${item.driverLabel}` },
        { id: 'tracking', label: 'Tracking', value: item.trackingLabel },
        { id: 'payment', label: 'Thanh toán', value: <StatusBadge domain="paymentStatus" status={item.paymentStatus} /> },
        { id: 'amount', label: 'Số tiền', value: item.amountLabel },
      ],
      actions: <OrderLink order={item} previewContext={previewContext} />,
    };
  }
  if (item.entity === 'user') {
    return {
      id: item.id,
      heading: <span className={`block border-l-4 pl-sm ${item.exceptionLabel ? 'border-danger-border' : 'border-brand'}`}>{item.displayName}</span>,
      status: <StatusBadge domain="userStatus" status={item.status} />,
      details: [
        { id: 'phone', label: 'Số điện thoại', value: item.maskedPhone },
        { id: 'role', label: 'Role', value: item.role },
        { id: 'updated', label: 'Cập nhật', value: item.updatedAtLabel },
        ...(item.exceptionLabel ? [{ id: 'exception', label: 'Ngoại lệ', value: item.exceptionLabel }] : []),
      ],
    };
  }
  if (item.entity === 'fleet') {
    return {
      id: item.id,
      heading: <span className="block border-l-4 border-brand pl-sm">{item.displayName}</span>,
      details: [
        { id: 'id', label: 'Fleet ID', value: item.displayId },
        { id: 'owner', label: 'Owner / membership', value: item.ownerSummary },
        { id: 'drivers', label: 'Driver', value: String(item.driverCount) },
        { id: 'orders', label: 'Order', value: String(item.orderCount) },
        { id: 'membership', label: 'Tình trạng thành viên', value: item.membershipMessage },
      ],
    };
  }
  return {
    id: item.id,
    heading: <span className={`block border-l-4 pl-sm ${item.locationCondition === 'stale' ? 'border-warning-border' : 'border-brand'}`}>{item.displayName}</span>,
    status: <StatusBadge domain="driverAvailability" status={item.availability} />,
    details: [
      { id: 'phone', label: 'Số điện thoại', value: item.maskedPhone },
      { id: 'account', label: 'Tài khoản', value: <StatusBadge domain="userStatus" status={item.accountStatus} /> },
      { id: 'membership', label: 'Thành viên đội xe', value: <StatusBadge domain="fleetMemberStatus" status={item.membershipStatus} /> },
      { id: 'fleet', label: 'Đội xe', value: item.fleetLabel },
      { id: 'order', label: 'Đơn đang chạy', value: <DriverOrderLink driver={item} previewContext={previewContext} /> },
      { id: 'location', label: 'Vị trí gần nhất', value: `${item.locationLabel} · ${item.locationUpdatedAtLabel}` },
    ],
  };
}

function FilterField({
  id,
  label,
  children,
  className = '',
}: Readonly<{
  id: string;
  label: string;
  children: ReactNode;
  className?: string;
}>) {
  return (
    <div className={`grid gap-xxs text-body-compact font-medium ${className}`}>
      <label htmlFor={id}>{label}</label>
      {children}
    </div>
  );
}

function SortOptions({ screen }: Readonly<{ screen: AdminListScreenName }>) {
  return (
    <>
      {screen === 'orders' || screen === 'users' ? (
        <>
          <option value="updated-desc">Mới cập nhật trước</option>
          <option value="updated-asc">Cũ cập nhật trước</option>
        </>
      ) : (
        <option value="updated-desc">Mới cập nhật trước</option>
      )}
      {screen === 'orders' ? <option value="reference-asc">Mã đơn A–Z</option> : null}
      {screen !== 'orders' ? (
        <>
          <option value="name-asc">Tên A–Z</option>
          <option value="name-desc">Tên Z–A</option>
        </>
      ) : null}
    </>
  );
}

function FilterFields({ screen, view }: Readonly<{ screen: AdminListScreenName; view: AdminListView }>) {
  const filters = view.filters;
  const idPrefix = `admin-${screen}`;
  return (
    <>
      <FilterField
        className="md:col-span-2 xl:col-span-1"
        id={`${idPrefix}-search`}
        label="Tìm nhanh trong phiên"
      >
        <input
          className={fieldClass}
          id={`${idPrefix}-search`}
          maxLength={100}
          placeholder="Tên, mã hoặc liên hệ — không lưu vào URL"
          type="search"
        />
      </FilterField>
      {screen === 'orders' ? (
        <>
          <FilterField id={`${idPrefix}-status`} label="Trạng thái">
            <select id={`${idPrefix}-status`} className={fieldClass} defaultValue={filters.status} name="status"><option value="ALL">Tất cả</option><option value="REQUESTED">Chờ tài xế</option><option value="ACCEPTED">Đã nhận đơn</option><option value="PICKING_UP">Đang đến điểm lấy</option><option value="IN_TRANSIT">Đang vận chuyển</option><option value="DELIVERED">Đã giao</option><option value="CANCELLED">Đã hủy</option></select>
          </FilterField>
          <FilterField id={`${idPrefix}-customer`} label="Customer ID">
            <input id={`${idPrefix}-customer`} className={fieldClass} defaultValue={filters.customerId} name="customerId" placeholder="UUID được phép chia sẻ" />
          </FilterField>
          <FilterField id={`${idPrefix}-driver`} label="Driver ID">
            <input id={`${idPrefix}-driver`} className={fieldClass} defaultValue={filters.driverId} name="driverId" placeholder="UUID được phép chia sẻ" />
          </FilterField>
          <FilterField id={`${idPrefix}-from`} label="Từ ngày">
            <input id={`${idPrefix}-from`} className={fieldClass} defaultValue={filters.from} name="from" type="date" />
          </FilterField>
          <FilterField id={`${idPrefix}-to`} label="Đến ngày">
            <input id={`${idPrefix}-to`} className={fieldClass} defaultValue={filters.to} name="to" type="date" />
          </FilterField>
        </>
      ) : screen === 'users' ? (
        <>
          <FilterField id={`${idPrefix}-role`} label="Role">
            <select id={`${idPrefix}-role`} className={fieldClass} defaultValue={filters.role} name="role"><option value="ALL">Tất cả</option><option value="CUSTOMER">Customer</option><option value="DRIVER">Driver</option><option value="FLEET_OWNER">Fleet Owner</option><option value="ADMIN">Admin</option></select>
          </FilterField>
          <FilterField id={`${idPrefix}-account`} label="Tài khoản">
            <select id={`${idPrefix}-account`} className={fieldClass} defaultValue={filters.userStatus} name="userStatus"><option value="ALL">Tất cả</option><option value="ACTIVE">Đang hoạt động</option><option value="DISABLED">Đã vô hiệu hóa</option></select>
          </FilterField>
        </>
      ) : screen === 'drivers' ? (
        <>
          <FilterField id={`${idPrefix}-availability`} label="Trạng thái tài xế">
            <select id={`${idPrefix}-availability`} className={fieldClass} defaultValue={filters.availability} name="availability"><option value="ALL">Tất cả</option><option value="AVAILABLE">Sẵn sàng</option><option value="BUSY">Đang bận</option><option value="OFFLINE">Ngoại tuyến</option></select>
          </FilterField>
          <FilterField id={`${idPrefix}-account`} label="Tài khoản">
            <select id={`${idPrefix}-account`} className={fieldClass} defaultValue={filters.userStatus} name="userStatus"><option value="ALL">Tất cả</option><option value="ACTIVE">Đang hoạt động</option><option value="DISABLED">Đã vô hiệu hóa</option></select>
          </FilterField>
          <FilterField id={`${idPrefix}-membership`} label="Membership">
            <select id={`${idPrefix}-membership`} className={fieldClass} defaultValue={filters.membershipStatus} name="membershipStatus"><option value="ALL">Tất cả</option><option value="INVITED">Đã mời</option><option value="ACTIVE">Đang tham gia</option><option value="REMOVED">Đã gỡ khỏi đội xe</option></select>
          </FilterField>
          <FilterField id={`${idPrefix}-fleet`} label="Fleet ID">
            <input id={`${idPrefix}-fleet`} className={fieldClass} defaultValue={filters.fleetId} name="fleetId" placeholder="UUID đội xe" />
          </FilterField>
        </>
      ) : null}
      <FilterField id={`${idPrefix}-sort`} label="Sắp xếp">
        <select id={`${idPrefix}-sort`} className={fieldClass} defaultValue={filters.sort} name="sort">
          <SortOptions screen={screen} />
        </select>
      </FilterField>
    </>
  );
}

function AdminFilters({ screen, view, previewContext }: Readonly<{ screen: AdminListScreenName; view: AdminListView; previewContext: AdminPreviewContext | undefined }>) {
  const resetQuery = serializeAdminListFilters(screen, { ...view.filters, status: 'ALL', role: 'ALL', userStatus: 'ALL', availability: 'ALL', membershipStatus: 'ALL', fleetId: '', customerId: '', driverId: '', from: '', to: '', page: 1 }, previewContext);
  return (
    <section
      aria-label={`Phạm vi điều tra ${titleByScreen[screen].toLocaleLowerCase('vi')}`}
      className="border-l-4 border-brand bg-neutral-surface p-md text-neutral-text"
    >
      <header className="mb-md flex flex-wrap items-end justify-between gap-sm border-b border-neutral-border pb-sm">
        <div>
          <p className="text-xs font-semibold tracking-wide text-brand">PHẠM VI ĐIỀU TRA</p>
          <h2 className="mt-xxs text-section-title font-semibold">Thu hẹp sổ dữ liệu</h2>
        </div>
        <p className="max-w-xl text-body-compact text-neutral-muted text-pretty">
          Trường tìm nhanh chỉ tồn tại trong phiên; URL chỉ giữ filter đã được allow-list.
        </p>
      </header>
      <form
        aria-label={`Lọc ${titleByScreen[screen].toLocaleLowerCase('vi')}`}
        className="grid gap-sm md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
        method="get"
        role="search"
      >
        <AdminPreviewHiddenFields context={previewContext} />
        <FilterFields screen={screen} view={view} />
        <input name="page" type="hidden" value="1" />
        <input name="pageSize" type="hidden" value={view.filters.pageSize} />
        <div className="flex flex-wrap items-end gap-xs md:col-span-2 lg:col-span-3 xl:col-span-4">
          <button
            className="inline-flex min-h-11 items-center rounded-control bg-brand px-md font-semibold text-brand-text transition-colors hover:brightness-90 active:brightness-75 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 motion-reduce:transition-none"
            type="submit"
          >
            Áp dụng bộ lọc
          </button>
          <a
            className="inline-flex min-h-11 items-center rounded-control border border-neutral-border bg-neutral px-md font-semibold transition-colors hover:bg-neutral-surface active:bg-neutral-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand motion-reduce:transition-none"
            href={`/admin/${screen}?${resetQuery}`}
          >
            Xóa bộ lọc
          </a>
        </div>
      </form>
    </section>
  );
}

export function AdminListScreen({
  screen,
  view,
  previewContext,
}: Readonly<{
  screen: AdminListScreenName;
  view: AdminListRouteView;
  previewContext?: AdminPreviewContext;
}>) {
  if (view.kind !== 'list' || view.entity !== screen) {
    if (view.kind === 'list') {
      return <ScreenState state="error" title="Sai phạm vi màn hình" message="Không render dữ liệu từ một Admin surface khác." />;
    }
    return <div className="flex flex-col gap-md"><OperationsPageHeader title={titleByScreen[screen]} /><AdminBoundaryState view={view} /></div>;
  }

  const rows = view.result.items.map((item) => ({ id: item.id, item }));
  const mobileItems = view.result.items.map((item) => mobileItem(item, previewContext));
  const commands: readonly AdminCommandView[] = screen === 'users'
    ? view.result.items.flatMap((item) => item.entity === 'user' ? item.availableCommands : [])
    : [];

  return (
    <div className="flex min-w-0 flex-col gap-xl">
      <AdminBreadcrumbs previewContext={previewContext} screen={screen} />
      <OperationsPageHeader
        context="Bàn điều tra theo bộ lọc · dữ liệu pilot trong quyền Admin"
        title={view.title}
        updatedAt={view.checkedAtLabel}
      />
      {view.notice ? <AdminNotice notice={view.notice} /> : null}
      <AdminFilters previewContext={previewContext} screen={screen} view={view} />
      <AdminSurface
        ariaLabel={`Sổ kết quả ${titleByScreen[screen].toLocaleLowerCase('vi')}`}
        title={`Sổ kết quả ${titleByScreen[screen].toLocaleLowerCase('vi')}`}
        description={view.result.filterSummary}
      >
        {view.state === 'no-results' ? (
          <ScreenState state="no-results" title={`Không tìm thấy ${titleByScreen[screen].toLocaleLowerCase('vi')}`} message="Không có dữ liệu phù hợp với bộ lọc hiện tại; dùng Xóa bộ lọc để phục hồi." />
        ) : (
          <div className="flex min-w-0 flex-col gap-md">
            <dl
              aria-label="Chỉ số tập kết quả"
              className="grid grid-cols-2 border-y border-neutral-border sm:grid-cols-3"
            >
              <div className="min-w-0 border-r border-neutral-border px-sm py-xs">
                <dt className="text-xs font-semibold text-neutral-muted">Kết quả</dt>
                <dd aria-live="polite" className="mt-xxs font-semibold tabular-nums">
                  {view.result.totalItems}
                </dd>
              </div>
              <div className="min-w-0 px-sm py-xs sm:border-r sm:border-neutral-border">
                <dt className="text-xs font-semibold text-neutral-muted">Trang</dt>
                <dd className="mt-xxs font-semibold tabular-nums">
                  {view.result.page} / {Math.max(view.result.totalPages, 1)}
                </dd>
              </div>
              <div className="col-span-2 min-w-0 border-t border-neutral-border px-sm py-xs sm:col-span-1 sm:border-t-0">
                <dt className="text-xs font-semibold text-neutral-muted">Revision</dt>
                <dd className="mt-xxs font-mono text-xs break-all">{view.result.revision}</dd>
              </div>
            </dl>
            <div className="hidden min-w-0 overflow-x-auto md:block">
              <DataTable
                caption={`${titleByScreen[screen]} trong phạm vi Admin và bộ lọc hiện tại`}
                columns={columnsFor(screen, previewContext)}
                rows={rows}
              />
            </div>
            <ResponsiveResultList ariaLabel={`Kết quả ${titleByScreen[screen].toLocaleLowerCase('vi')} dạng hàng responsive`} items={mobileItems} />
            <AdminPaginationLinks hrefForPage={(page) => `/admin/${screen}?${serializeAdminListFilters(screen, { ...view.filters, page }, previewContext)}`} label={titleByScreen[screen].toLocaleLowerCase('vi')} page={view.result.page} totalPages={view.result.totalPages} />
          </div>
        )}
      </AdminSurface>
      {commands.length > 0 ? (
        <AdminSurface
          title="Kiểm tra command người dùng"
          description="Target và hậu quả phải được đọc trước khi gửi command."
          variant="signal"
        >
          <AdminCommandLauncher commands={commands} dialogPreview={view.dialogPreview} />
        </AdminSurface>
      ) : null}
    </div>
  );
}
