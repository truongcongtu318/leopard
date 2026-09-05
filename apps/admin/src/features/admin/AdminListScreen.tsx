'use client';

import {
  Button,
  DataTable,
  OperationsPageHeader,
  ResponsiveResultList,
  ScreenState,
  StatusBadge,
  type DataTableColumn,
  type ResponsiveResultItem,
} from '@leopard/ui';
import React, { useState, type ReactNode } from 'react';

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
  'min-h-10 w-full rounded-xl border border-slate-200/90 bg-slate-50/70 hover:bg-white focus:bg-white px-3.5 py-2 text-xs text-slate-800 shadow-2xs transition-all focus:border-brand focus:outline-none focus-visible:ring-2 focus-visible:ring-brand';

const titleByScreen: Readonly<Record<AdminListScreenName, string>> = {
  orders: 'Đơn hàng',
  users: 'Người dùng',
  fleets: 'Đội xe',
  drivers: 'Tài xế',
};

function OrderRouteLedger({ order }: Readonly<{ order: AdminOrderListItemView }>) {
  const [origin = order.routeLabel, destination = order.routeLabel] = order.routeLabel.split(' → ');
  return (
    <div aria-label={`Tuyến ${order.reference}`} className="min-w-64 text-xs">
      <div className="flex items-start gap-2">
        <span aria-hidden="true" className="mt-1 h-2.5 w-2.5 shrink-0 rounded-full bg-emerald-500 ring-2 ring-emerald-500/20" />
        <p className="font-semibold text-slate-800 break-words">{origin}</p>
      </div>
      <div aria-hidden="true" className="ml-1 h-3 border-l-2 border-slate-200/90 my-0.5" />
      <div className="flex items-start gap-2">
        <span aria-hidden="true" className="mt-1 h-2.5 w-2.5 shrink-0 rounded-full border-2 border-sky-600 bg-white ring-2 ring-sky-600/20" />
        <p className="font-semibold text-slate-700 break-words">{destination}</p>
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
    {
      key: 'action',
      header: 'Hành động',
      render: (row) => {
        const order = row.item as AdminOrderListItemView;
        return (
          <a
            aria-label={`Xem đơn ${order.reference}`}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-semibold text-xs text-brand bg-brand/5 hover:bg-brand/10 border border-brand/20 transition-all shadow-2xs hover:shadow-xs group focus-visible:rounded-control focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
            href={createAdminPreviewHref(order.href, 'order-detail', previewContext)}
          >
            <span>Chi tiết</span>
            <svg className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5 text-brand" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" />
            </svg>
          </a>
        );
      },
    },
  ];
}

function userColumns(onSelectCommand?: (command: AdminCommandView) => void): DataTableColumn[] {
  return [
    {
      key: 'identity', header: 'Người dùng', render: (row) => {
        const user = row.item as AdminUserListItemView;
        return <div className="min-w-48"><p className="font-semibold break-words text-slate-800">{user.displayName}</p><p className="mt-xxs text-xs text-neutral-muted">{user.maskedPhone}</p></div>;
      },
    },
    {
      key: 'role',
      header: 'Role',
      render: (row) => (
        <span className="inline-flex items-center px-2 py-0.5 rounded-md font-mono text-[11px] font-bold bg-slate-100 text-slate-700">
          {(row.item as AdminUserListItemView).role}
        </span>
      ),
    },
    { key: 'status', header: 'Tài khoản', render: (row) => <StatusBadge domain="userStatus" status={(row.item as AdminUserListItemView).status} /> },
    {
      key: 'updated', header: 'Cập nhật', render: (row) => {
        const user = row.item as AdminUserListItemView;
        return <div className="min-w-36"><p className="tabular-nums text-xs text-slate-600">{user.updatedAtLabel}</p>{user.exceptionLabel ? <p className="mt-xxs text-xs font-semibold text-danger-text">{user.exceptionLabel}</p> : null}</div>;
      },
    },
    {
      key: 'actions',
      header: 'Hành động',
      render: (row) => {
        const user = row.item as AdminUserListItemView;
        if (!user.availableCommands || user.availableCommands.length === 0) {
          return <span className="text-xs text-slate-400 font-medium">—</span>;
        }
        return (
          <div className="flex flex-wrap items-center gap-1.5">
            {user.availableCommands.map((command) => (
              <Button
                key={`${command.kind}-${command.targetId}`}
                variant={command.buttonVariant}
                size="sm"
                className="h-8 min-h-[32px] px-2.5 text-xs font-semibold rounded-lg shadow-2xs transition-all hover:scale-[1.02] active:scale-[0.98]"
                onPress={() => onSelectCommand?.(command)}
              >
                {command.commandLabel}
              </Button>
            ))}
          </div>
        );
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
  onSelectCommand?: (command: AdminCommandView) => void,
): DataTableColumn[] {
  if (screen === 'orders') return orderColumns(previewContext);
  if (screen === 'users') return userColumns(onSelectCommand);
  if (screen === 'fleets') return fleetColumns();
  return driverColumns(previewContext);
}

function mobileItem(
  item: AdminListItemView,
  previewContext?: AdminPreviewContext,
  onSelectCommand?: (command: AdminCommandView) => void,
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
      actions: (
        <a
          aria-label={`Xem đơn ${item.reference}`}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-semibold text-xs text-brand bg-brand/5 hover:bg-brand/10 border border-brand/20 transition-all shadow-2xs"
          href={createAdminPreviewHref(item.href, 'order-detail', previewContext)}
        >
          <span>Chi tiết</span>
          <svg className="w-3.5 h-3.5 text-brand" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" />
          </svg>
        </a>
      ),
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
      actions: item.availableCommands.length > 0 ? (
        <div className="flex flex-wrap items-center gap-1.5">
          {item.availableCommands.map((command) => (
            <Button
              key={`${command.kind}-${command.targetId}`}
              variant={command.buttonVariant}
              size="sm"
              className="h-8 min-h-[32px] px-2.5 text-xs font-semibold rounded-lg shadow-2xs"
              onPress={() => onSelectCommand?.(command)}
            >
              {command.commandLabel}
            </Button>
          ))}
        </div>
      ) : undefined,
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
      className="rounded-[22px] sm:rounded-[26px] border border-white/80 bg-white/90 backdrop-blur-sm p-5 sm:p-6 shadow-xs text-neutral-text"
    >
      <header className="mb-md flex flex-wrap items-end justify-between gap-sm border-b border-slate-100 pb-sm">
        <div>
          <span className="inline-flex items-center gap-1 rounded-full bg-brand/10 px-2.5 py-0.5 text-[10px] font-bold tracking-wider text-brand uppercase">
            PHẠM VI ĐIỀU TRA
          </span>
          <h2 className="mt-1 text-base sm:text-lg font-bold text-neutral-text">Thu hẹp sổ dữ liệu</h2>
        </div>
        <p className="max-w-xl text-xs text-neutral-muted text-pretty">
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
        <div className="flex flex-wrap items-end gap-2 md:col-span-2 lg:col-span-3 xl:col-span-4">
          <button
            className="inline-flex min-h-10 items-center justify-center rounded-xl bg-slate-900 px-5 text-xs font-semibold text-white shadow-xs hover:bg-slate-800 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2"
            type="submit"
          >
            Áp dụng bộ lọc
          </button>
          <a
            className="inline-flex min-h-10 items-center justify-center rounded-xl border border-slate-200/80 bg-white px-4 text-xs font-semibold text-slate-700 shadow-2xs hover:bg-slate-50 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
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
  commandRuntime,
  screen,
  view,
  previewContext,
}: Readonly<{
  screen: AdminListScreenName;
  view: AdminListRouteView;
  previewContext?: AdminPreviewContext;
  /** Live API command execution (runtime data path); absent in preview renders. */
  commandRuntime?: boolean | undefined;
}>) {
  const commands: readonly AdminCommandView[] = screen === 'users' && view.kind === 'list' && view.entity === 'users'
    ? view.result.items.flatMap((item) => item.entity === 'user' ? item.availableCommands : [])
    : [];

  const initialCommand = view.kind === 'list' && view.dialogPreview && screen === 'users'
    ? commands.find((candidate) => candidate.kind === view.dialogPreview?.commandKind) ?? null
    : null;

  const [activeCommand, setActiveCommand] = useState<AdminCommandView | null>(initialCommand);

  if (view.kind !== 'list' || view.entity !== screen) {
    if (view.kind === 'list') {
      return <ScreenState state="error" title="Sai phạm vi màn hình" message="Không render dữ liệu từ một Admin surface khác." />;
    }
    return <div className="flex flex-col gap-md"><OperationsPageHeader title={titleByScreen[screen]} /><AdminBoundaryState view={view} /></div>;
  }

  const rows = view.result.items.map((item) => ({ id: item.id, item }));
  const mobileItems = view.result.items.map((item) => mobileItem(item, previewContext, (cmd) => setActiveCommand(cmd)));

  return (
    <div className="flex min-w-0 flex-col gap-4 sm:gap-5">
      <AdminBreadcrumbs previewContext={previewContext} screen={screen} />
      <OperationsPageHeader
        context="Bàn điều tra theo bộ lọc · dữ liệu pilot trong quyền Admin"
        title={view.title}
        updatedAt={view.checkedAtLabel}
      />
      {view.notice ? <AdminNotice notice={view.notice} /> : null}
      <AdminFilters previewContext={previewContext} screen={screen} view={view} />
      <div aria-hidden={activeCommand ? 'true' : undefined} className="min-w-0">
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
                className="grid grid-cols-2 gap-3 sm:grid-cols-3 p-3 rounded-2xl bg-slate-50/80 border border-slate-200/60"
              >
                <div className="min-w-0 rounded-xl bg-white p-3.5 border border-slate-100 shadow-2xs">
                  <dt className="text-[11px] font-extrabold text-slate-400 uppercase tracking-wider">Kết quả</dt>
                  <dd aria-live="polite" className="mt-1 text-base sm:text-lg font-black text-slate-800 tabular-nums">
                    {view.result.totalItems}
                  </dd>
                </div>
                <div className="min-w-0 rounded-xl bg-white p-3.5 border border-slate-100 shadow-2xs">
                  <dt className="text-[11px] font-extrabold text-slate-400 uppercase tracking-wider">Trang</dt>
                  <dd className="mt-1 text-base sm:text-lg font-black text-slate-800 tabular-nums">
                    {view.result.page} / {Math.max(view.result.totalPages, 1)}
                  </dd>
                </div>
                <div className="col-span-2 min-w-0 rounded-xl bg-white p-3.5 border border-slate-100 shadow-2xs sm:col-span-1">
                  <dt className="text-[11px] font-extrabold text-slate-400 uppercase tracking-wider">Revision</dt>
                  <dd className="mt-1 font-mono text-xs font-semibold text-slate-700 break-all">{view.result.revision}</dd>
                </div>
              </dl>
              <div className="hidden min-w-0 overflow-x-auto md:block">
                <DataTable
                  caption={`${titleByScreen[screen]} trong phạm vi Admin và bộ lọc hiện tại`}
                  columns={columnsFor(screen, previewContext, (cmd) => setActiveCommand(cmd))}
                  rows={rows}
                />
              </div>
              <ResponsiveResultList ariaLabel={`Kết quả ${titleByScreen[screen].toLocaleLowerCase('vi')} dạng hàng responsive`} items={mobileItems} />
              <AdminPaginationLinks hrefForPage={(page) => `/admin/${screen}?${serializeAdminListFilters(screen, { ...view.filters, page }, previewContext)}`} label={titleByScreen[screen].toLocaleLowerCase('vi')} page={view.result.page} totalPages={view.result.totalPages} />
            </div>
          )}
        </AdminSurface>
      </div>
      <AdminCommandLauncher
        activeCommand={activeCommand}
        commands={commands}
        dialogPreview={view.dialogPreview}
        hideTriggerList
        onActiveCommandChange={setActiveCommand}
        runtime={commandRuntime === true}
      />
    </div>
  );
}
