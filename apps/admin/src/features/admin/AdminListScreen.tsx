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
import Link from 'next/link';
import { ArrowRight, CheckCircle2, FileText, Plus, Star, TicketPercent, XCircle } from 'lucide-react';

import { createAdminPreviewHref, serializeAdminListFilters } from './adapter';
import { AdminCommandLauncher } from './AdminCommandLauncher';
import { CreatePromotionModal } from './CreatePromotionModal';
import { ResendInvoiceModal } from './ResendInvoiceModal';
import { AuditDetailModal } from './AuditDetailModal';
import {
  AdminBoundaryState,
  AdminBreadcrumbs,
  AdminNotice,
  AdminPaginationLinks,
  AdminPreviewHiddenFields,
  AdminSurface,
} from './AdminShared';
import type {
  AdminAuditEntryView,
  AdminCommandView,
  AdminDriverListItemView,
  AdminFleetListItemView,
  AdminInvoiceListItemView,
  AdminListItemView,
  AdminListRouteView,
  AdminListScreen as AdminListScreenName,
  AdminListView,
  AdminOrderListItemView,
  AdminPaymentListItemView,
  AdminPreviewContext,
  AdminPromotionListItemView,
  AdminReviewListItemView,
  AdminUserListItemView,
} from './model';

const fieldClass =
  'min-h-10 w-full rounded-full border border-slate-200/60 bg-slate-100/80 hover:bg-white focus:bg-white px-4 py-2 text-xs text-slate-800 transition-colors focus:border-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900';

const titleByScreen: Readonly<Record<AdminListScreenName, string>> = {
  orders: 'Đơn hàng',
  users: 'Người dùng',
  fleets: 'Đội xe',
  drivers: 'Tài xế',
  payments: 'Quản lý thanh toán',
  invoices: 'Quản lý hóa đơn',
  audit: 'Nhật ký kiểm toán',
  promotions: 'Quản lý khuyến mãi',
  reviews: 'Đánh giá tài xế',
  reports: 'Khiếu nại & Hỗ trợ',
};

const entityNounByScreen: Readonly<Record<AdminListScreenName, string>> = {
  orders: 'đơn hàng',
  users: 'người dùng',
  fleets: 'đội xe',
  drivers: 'tài xế',
  payments: 'thanh toán',
  invoices: 'hóa đơn',
  audit: 'mục kiểm toán',
  promotions: 'khuyến mãi',
  reviews: 'đánh giá',
  reports: 'khiếu nại',
};

function formatUserRole(role: string): string {
  switch (role) {
    case 'ADMIN':
      return 'Quản trị viên';
    case 'FLEET_OWNER':
      return 'Chủ đội xe';
    case 'DRIVER':
      return 'Tài xế';
    case 'CUSTOMER':
      return 'Khách hàng';
    default:
      return role;
  }
}

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
      key: 'people', header: 'Khách hàng / Tài xế', className: 'hidden xl:table-cell', render: (row) => {
        const order = row.item as AdminOrderListItemView;
        return <div className="min-w-48"><p className="break-words">{order.customerLabel}</p><p className="mt-xxs text-xs text-neutral-muted break-words">{order.driverLabel}</p></div>;
      },
    },
    {
      key: 'status', header: 'Trạng thái', render: (row) => <StatusBadge domain="orderStatus" status={(row.item as AdminOrderListItemView).status} />,
    },
    {
      key: 'tracking', header: 'Định vị GPS', className: 'hidden lg:table-cell', render: (row) => {
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
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full font-semibold text-xs text-brand bg-brand/5 hover:bg-brand/10 border border-brand/20 transition-all shadow-2xs hover:shadow-xs group focus-visible:rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
            href={createAdminPreviewHref(order.href, 'order-detail', previewContext)}
          >
            <span>Chi tiết</span>
            <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5 text-brand" strokeWidth={2.5} aria-hidden="true" />
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
      header: 'Vai trò',
      render: (row) => (
        <span className="inline-flex items-center px-2 py-0.5 rounded-md font-medium text-xs bg-slate-100 text-slate-700">
          {formatUserRole((row.item as AdminUserListItemView).role)}
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
                className="h-8 min-h-[32px] px-3 text-xs font-semibold rounded-full shadow-2xs transition-all hover:scale-[1.02] active:scale-[0.98]"
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
    { key: 'owner', header: 'Chủ sở hữu & Liên kết', className: 'hidden xl:table-cell', render: (row) => <p className="min-w-48 break-words">{(row.item as AdminFleetListItemView).ownerSummary}</p> },
    {
      key: 'counts', header: 'Quy mô', render: (row) => {
        const fleet = row.item as AdminFleetListItemView;
        return <dl className="min-w-40 text-body-compact"><div className="flex justify-between gap-sm"><dt>Thành viên</dt><dd className="tabular-nums">{fleet.activeMembershipCount}</dd></div><div className="flex justify-between gap-sm"><dt>Tài xế</dt><dd className="tabular-nums">{fleet.driverCount}</dd></div><div className="flex justify-between gap-sm"><dt>Đơn hàng</dt><dd className="tabular-nums">{fleet.orderCount}</dd></div></dl>;
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

function paymentColumns(
  onSelectCommand?: (command: AdminCommandView) => void,
  previewContext?: AdminPreviewContext,
): DataTableColumn[] {
  return [
    {
      key: 'order',
      header: 'Mã đơn',
      render: (row) => {
        const payment = row.item as AdminPaymentListItemView;
        return (
          <div className="min-w-36">
            <Link
              aria-label={`Xem đơn ${payment.orderCode}`}
              className="font-semibold text-brand underline-offset-4 hover:underline focus-visible:rounded-control focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
              href={createAdminPreviewHref(payment.href, 'order-detail', previewContext)}
            >
              {payment.orderCode}
            </Link>
            <p className="mt-xxs text-xs text-neutral-muted font-mono">{payment.referenceLabel}</p>
          </div>
        );
      },
    },
    {
      key: 'customer',
      header: 'Khách hàng',
      render: (row) => {
        const payment = row.item as AdminPaymentListItemView;
        return (
          <div className="min-w-44">
            <p className="font-semibold text-slate-800 break-words">{payment.customerName}</p>
            <p className="mt-xxs text-xs text-neutral-muted">{payment.customerPhone ?? '—'}</p>
          </div>
        );
      },
    },
    {
      key: 'amount',
      header: 'Số tiền',
      render: (row) => {
        const payment = row.item as AdminPaymentListItemView;
        return (
          <div className="min-w-32">
            <p className="font-semibold text-slate-900 tabular-nums">{payment.amountLabel}</p>
          </div>
        );
      },
    },
    {
      key: 'source',
      header: 'Nguồn',
      render: (row) => {
        const payment = row.item as AdminPaymentListItemView;
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full font-medium text-xs bg-slate-100 text-slate-700">
            {payment.sourceLabel}
          </span>
        );
      },
    },
    {
      key: 'status',
      header: 'Trạng thái',
      render: (row) => (
        <StatusBadge domain="paymentStatus" status={(row.item as AdminPaymentListItemView).status} />
      ),
    },
    {
      key: 'created',
      header: 'Ngày tạo',
      className: 'hidden lg:table-cell',
      render: (row) => {
        const payment = row.item as AdminPaymentListItemView;
        return (
          <div className="min-w-36 text-xs tabular-nums text-slate-600">
            <p>{payment.createdAtLabel}</p>
            {payment.confirmedByName ? (
              <p className="mt-xxs text-[11px] text-slate-400">Bởi {payment.confirmedByName}</p>
            ) : null}
          </div>
        );
      },
    },
    {
      key: 'actions',
      header: 'Thao tác',
      render: (row) => {
        const payment = row.item as AdminPaymentListItemView;
        if (!payment.availableCommands || payment.availableCommands.length === 0) {
          return <span className="text-xs text-slate-400 font-medium">—</span>;
        }
        return (
          <div className="flex flex-wrap items-center gap-1.5">
            {payment.availableCommands.map((command) => (
              <Button
                key={`${command.kind}-${command.targetId}`}
                variant={command.buttonVariant}
                size="sm"
                className="h-8 min-h-[32px] px-3 text-xs font-semibold rounded-full shadow-2xs transition-all hover:scale-[1.02] active:scale-[0.98]"
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

function invoiceColumns(
  previewContext?: AdminPreviewContext,
  onResendInvoice?: (invoice: AdminInvoiceListItemView) => void,
): DataTableColumn[] {
  return [
    {
      key: 'invoiceNumber',
      header: 'Số HĐ',
      render: (row) => {
        const invoice = row.item as AdminInvoiceListItemView;
        return (
          <div className="min-w-32">
            <span className="font-mono text-xs font-semibold text-slate-900 bg-slate-100 px-2.5 py-1 rounded-md">
              {invoice.invoiceNumber}
            </span>
          </div>
        );
      },
    },
    {
      key: 'order',
      header: 'Đơn hàng',
      render: (row) => {
        const invoice = row.item as AdminInvoiceListItemView;
        return (
          <div className="min-w-36">
            <Link
              href={createAdminPreviewHref(`/admin/orders/${invoice.orderId}`, 'order-detail', previewContext)}
              className="font-semibold text-xs text-brand hover:underline"
            >
              {invoice.orderCode}
            </Link>
          </div>
        );
      },
    },
    {
      key: 'customer',
      header: 'Khách hàng',
      render: (row) => {
        const invoice = row.item as AdminInvoiceListItemView;
        return (
          <div className="min-w-44">
            <p className="font-semibold text-slate-800 break-words">{invoice.customerName}</p>
            {invoice.isMissingEmail || !invoice.customerEmail ? (
              <span className="mt-1 inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                Thiếu email
              </span>
            ) : (
              <p className="mt-xxs text-xs text-neutral-muted truncate">{invoice.customerEmail}</p>
            )}
          </div>
        );
      },
    },
    {
      key: 'total',
      header: 'Tổng tiền',
      render: (row) => {
        const invoice = row.item as AdminInvoiceListItemView;
        return (
          <div className="min-w-32">
            <p className="font-semibold text-slate-900 tabular-nums">{invoice.totalLabel}</p>
            <p className="text-[11px] text-slate-400">Trước VAT: {invoice.amountLabel}</p>
          </div>
        );
      },
    },
    {
      key: 'status',
      header: 'Trạng thái',
      render: (row) => (
        <StatusBadge domain="invoiceStatus" status={(row.item as AdminInvoiceListItemView).status} />
      ),
    },
    {
      key: 'issuedAt',
      header: 'Ngày phát hành',
      className: 'hidden lg:table-cell',
      render: (row) => {
        const invoice = row.item as AdminInvoiceListItemView;
        return (
          <div className="min-w-36 text-xs tabular-nums text-slate-600">
            <p>{invoice.issuedAtLabel}</p>
            {invoice.emailSentAtLabel ? (
              <p className="mt-xxs text-[11px] text-slate-400">Email: {invoice.emailSentAtLabel}</p>
            ) : null}
          </div>
        );
      },
    },
    {
      key: 'actions',
      header: 'Thao tác',
      render: (row) => {
        const invoice = row.item as AdminInvoiceListItemView;
        return (
          <div className="flex flex-wrap items-center gap-1.5">
            <a
              href={invoice.pdfDownloadUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 h-8 min-h-[32px] px-3 text-xs font-semibold rounded-full border border-slate-200 bg-white text-slate-700 shadow-2xs transition-all hover:bg-slate-50 hover:scale-[1.02] active:scale-[0.98]"
            >
              <FileText className="h-3.5 w-3.5 text-slate-600" aria-hidden="true" />
              Tải PDF
            </a>
            <Button
              variant="secondary"
              size="sm"
              className="h-8 min-h-[32px] px-3 text-xs font-semibold rounded-full shadow-2xs transition-all hover:scale-[1.02] active:scale-[0.98]"
              isDisabled={invoice.isMissingEmail}
              onPress={() => onResendInvoice?.(invoice)}
            >
              Gửi lại email
            </Button>
          </div>
        );
      },
    },
  ];
}

function auditColumns(
  onViewAuditDetail?: (entry: AdminAuditEntryView) => void,
): DataTableColumn[] {
  return [
    {
      key: 'timestamp',
      header: 'Thời điểm',
      render: (row) => {
        const entry = row.item as AdminAuditEntryView;
        return (
          <div className="min-w-32">
            <time className="font-mono text-xs font-semibold text-slate-700 tabular-nums" dateTime={entry.dateTime}>
              {entry.timestampLabel}
            </time>
          </div>
        );
      },
    },
    {
      key: 'actor',
      header: 'Người thực hiện',
      render: (row) => {
        const entry = row.item as AdminAuditEntryView;
        const role = entry.actorRole ? formatUserRole(entry.actorRole) : 'Hệ thống';
        return (
          <div className="min-w-36">
            <p className="font-semibold text-xs text-slate-900">{entry.actorName || entry.actorLabel || 'Hệ thống'}</p>
            <span className="text-[11px] text-slate-500 font-mono">{role}</span>
          </div>
        );
      },
    },
    {
      key: 'action',
      header: 'Hành động',
      render: (row) => {
        const entry = row.item as AdminAuditEntryView;
        return (
          <div className="min-w-36">
            <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-semibold bg-slate-100 text-slate-800 border border-slate-200/60 font-mono">
              {entry.actionLabel || entry.action}
            </span>
          </div>
        );
      },
    },
    {
      key: 'resource',
      header: 'Tài nguyên',
      render: (row) => {
        const entry = row.item as AdminAuditEntryView;
        return (
          <div className="min-w-36">
            <p className="font-semibold text-xs text-slate-800">{entry.resourceType || '—'}</p>
            {entry.resourceId ? (
              <p className="text-[11px] font-mono text-slate-500 truncate max-w-[160px]">{entry.resourceId}</p>
            ) : entry.targetLabel ? (
              <p className="text-[11px] text-slate-500 truncate max-w-[160px]">{entry.targetLabel}</p>
            ) : null}
          </div>
        );
      },
    },
    {
      key: 'requestId',
      header: 'Mã yêu cầu',
      className: 'hidden lg:table-cell',
      render: (row) => {
        const entry = row.item as AdminAuditEntryView;
        return (
          <div className="min-w-32">
            <span className="font-mono text-[11px] text-slate-500 break-all">{entry.requestId || '—'}</span>
          </div>
        );
      },
    },
    {
      key: 'details',
      header: 'Chi tiết',
      render: (row) => {
        const entry = row.item as AdminAuditEntryView;
        return (
          <div className="min-w-44 text-xs text-slate-600">
            <div className="flex items-center gap-1.5 mb-1">
              <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700 border border-emerald-200/70">
                {entry.outcomeLabel}
              </span>
              {entry.metadata ? (
                <button
                  type="button"
                  onClick={() => onViewAuditDetail?.(entry)}
                  className="inline-flex items-center gap-1 text-[11px] font-semibold text-brand hover:text-brand/80 hover:underline cursor-pointer"
                >
                  Chi tiết JSON
                </button>
              ) : null}
            </div>
            {entry.reason ? <p className="text-slate-700 break-words">{entry.reason}</p> : null}
          </div>
        );
      },
    },
  ];
}

function promotionColumns(
  onSelectCommand?: (command: AdminCommandView) => void,
): DataTableColumn[] {
  return [
    {
      key: 'code',
      header: 'Mã voucher',
      render: (row) => {
        const promo = row.item as AdminPromotionListItemView;
        return (
          <div className="min-w-36">
            <span className="inline-flex items-center gap-1.5 font-mono text-xs font-bold text-slate-900 bg-slate-100 border border-slate-200/80 px-2.5 py-1 rounded-full">
              <TicketPercent className="w-3.5 h-3.5 text-slate-600" aria-hidden="true" />
              {promo.code}
            </span>
          </div>
        );
      },
    },
    {
      key: 'title',
      header: 'Tiêu đề & Mô tả',
      render: (row) => {
        const promo = row.item as AdminPromotionListItemView;
        return (
          <div className="min-w-48 max-w-xs">
            <p className="font-semibold text-xs text-slate-900 break-words">{promo.title}</p>
            <p className="mt-0.5 text-xs text-slate-500 line-clamp-1">{promo.description}</p>
          </div>
        );
      },
    },
    {
      key: 'discount',
      header: 'Mức giảm',
      render: (row) => {
        const promo = row.item as AdminPromotionListItemView;
        const discountLabel =
          promo.discountType === 'PERCENT'
            ? `${promo.discountValue}%${promo.maxDiscountVnd ? ` (Tối đa ${promo.maxDiscountVnd.toLocaleString('vi-VN')} ₫)` : ''}`
            : `${promo.discountValue.toLocaleString('vi-VN')} ₫`;
        return (
          <div className="min-w-32">
            <p className="font-semibold text-xs text-slate-900 tabular-nums">{discountLabel}</p>
            <span className="text-[11px] text-slate-500">
              {promo.discountType === 'PERCENT' ? 'Theo tỷ lệ' : 'Cố định'}
            </span>
          </div>
        );
      },
    },
    {
      key: 'condition',
      header: 'Đơn tối thiểu',
      className: 'hidden lg:table-cell',
      render: (row) => {
        const promo = row.item as AdminPromotionListItemView;
        return (
          <div className="min-w-28 text-xs tabular-nums text-slate-700">
            <span>{promo.minOrderAmountVnd.toLocaleString('vi-VN')} ₫</span>
          </div>
        );
      },
    },
    {
      key: 'usage',
      header: 'Lượt dùng',
      render: (row) => {
        const promo = row.item as AdminPromotionListItemView;
        const percent = promo.usageLimit > 0 ? Math.min(Math.round((promo.usageCount / promo.usageLimit) * 100), 100) : 0;
        return (
          <div className="min-w-32">
            <p className="font-semibold text-xs text-slate-900 tabular-nums">
              {promo.usageCount.toLocaleString('vi-VN')} / {promo.usageLimit.toLocaleString('vi-VN')}
            </p>
            <div className="mt-1 h-1.5 w-24 bg-slate-100 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full ${percent >= 90 ? 'bg-amber-500' : 'bg-slate-900'}`}
                style={{ width: `${percent}%` }}
              />
            </div>
          </div>
        );
      },
    },
    {
      key: 'expires',
      header: 'Hạn sử dụng',
      className: 'hidden xl:table-cell',
      render: (row) => {
        const promo = row.item as AdminPromotionListItemView;
        return (
          <div className="min-w-36 text-xs tabular-nums text-slate-600 font-mono">
            {promo.expiresAtLabel}
          </div>
        );
      },
    },
    {
      key: 'status',
      header: 'Trạng thái',
      render: (row) => {
        const promo = row.item as AdminPromotionListItemView;
        return promo.isActive ? (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200/80">
            <CheckCircle2 className="w-3 h-3 text-emerald-600" aria-hidden="true" />
            Đang áp dụng
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-600 border border-slate-200">
            <XCircle className="w-3 h-3 text-slate-400" aria-hidden="true" />
            Tạm dừng
          </span>
        );
      },
    },
    {
      key: 'actions',
      header: 'Thao tác',
      render: (row) => {
        const promo = row.item as AdminPromotionListItemView;
        if (!promo.availableCommands || promo.availableCommands.length === 0) {
          return <span className="text-xs text-slate-400 font-medium">—</span>;
        }
        return (
          <div className="flex flex-wrap items-center gap-1.5">
            {promo.availableCommands.map((command) => (
              <Button
                key={`${command.kind}-${command.targetId}`}
                variant={command.buttonVariant}
                size="sm"
                className="h-8 min-h-[32px] px-3 text-xs font-semibold rounded-full shadow-2xs transition-all hover:scale-[1.02] active:scale-[0.98]"
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

function reviewColumns(
  onSelectCommand?: (command: AdminCommandView) => void,
  previewContext?: AdminPreviewContext,
): DataTableColumn[] {
  return [
    {
      key: 'rating',
      header: 'Điểm số',
      render: (row) => {
        const rev = row.item as AdminReviewListItemView;
        return (
          <div className="min-w-32">
            <div className="flex items-center gap-1">
              <div className="flex items-center gap-0.5">
                {[1, 2, 3, 4, 5].map((star) => (
                  <Star
                    key={star}
                    className={`w-3.5 h-3.5 ${
                      star <= rev.rating
                        ? 'fill-amber-400 text-amber-400'
                        : 'text-slate-200 fill-slate-100'
                    }`}
                    aria-hidden="true"
                  />
                ))}
              </div>
              <span className="font-bold text-xs text-slate-900 ml-1 tabular-nums">{rev.rating}.0</span>
            </div>
          </div>
        );
      },
    },
    {
      key: 'order',
      header: 'Đơn hàng',
      render: (row) => {
        const rev = row.item as AdminReviewListItemView;
        return (
          <div className="min-w-32">
            <Link
              href={createAdminPreviewHref(`/admin/orders/${rev.orderId}`, 'order-detail', previewContext)}
              className="font-semibold text-xs text-brand hover:underline font-mono"
            >
              {rev.orderCode}
            </Link>
          </div>
        );
      },
    },
    {
      key: 'customer',
      header: 'Khách hàng',
      render: (row) => {
        const rev = row.item as AdminReviewListItemView;
        return (
          <div className="min-w-36">
            <p className="font-semibold text-xs text-slate-900 break-words">{rev.customerName}</p>
            <p className="text-xs text-slate-400 font-mono">{rev.customerPhone}</p>
          </div>
        );
      },
    },
    {
      key: 'driver',
      header: 'Tài xế',
      render: (row) => {
        const rev = row.item as AdminReviewListItemView;
        return (
          <div className="min-w-36">
            <p className="font-semibold text-xs text-slate-900 break-words">{rev.driverName}</p>
            <p className="text-xs text-slate-400 font-mono">{rev.driverPhone}</p>
          </div>
        );
      },
    },
    {
      key: 'comment',
      header: 'Nội dung nhận xét',
      render: (row) => {
        const rev = row.item as AdminReviewListItemView;
        const isHidden = rev.comment.startsWith('[Đã ẩn');
        return (
          <div className="min-w-48 max-w-sm">
            {isHidden ? (
              <p className="text-xs italic text-amber-800 bg-amber-50/80 px-2.5 py-1 rounded-lg border border-amber-200/60 break-words">
                {rev.comment}
              </p>
            ) : (
              <p className="text-xs text-slate-700 break-words line-clamp-2">
                {rev.comment}
              </p>
            )}
          </div>
        );
      },
    },
    {
      key: 'tip',
      header: 'Tiền tip',
      className: 'hidden lg:table-cell',
      render: (row) => {
        const rev = row.item as AdminReviewListItemView;
        return (
          <div className="min-w-24 text-xs font-semibold text-slate-800 tabular-nums">
            {rev.tipVndLabel}
          </div>
        );
      },
    },
    {
      key: 'created',
      header: 'Thời điểm',
      className: 'hidden xl:table-cell',
      render: (row) => {
        const rev = row.item as AdminReviewListItemView;
        return (
          <time className="text-xs text-slate-500 tabular-nums font-mono">
            {rev.createdAtLabel}
          </time>
        );
      },
    },
    {
      key: 'actions',
      header: 'Thao tác',
      render: (row) => {
        const rev = row.item as AdminReviewListItemView;
        if (!rev.availableCommands || rev.availableCommands.length === 0) {
          return <span className="text-xs text-slate-400 font-medium">Đã xử lý</span>;
        }
        return (
          <div className="flex flex-wrap items-center gap-1.5">
            {rev.availableCommands.map((command) => (
              <Button
                key={`${command.kind}-${command.targetId}`}
                variant={command.buttonVariant}
                size="sm"
                className="h-8 min-h-[32px] px-3 text-xs font-semibold rounded-full shadow-2xs transition-all hover:scale-[1.02] active:scale-[0.98]"
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

type AdminListActionCallbacks = {
  onResendInvoice?: (invoice: AdminInvoiceListItemView) => void;
  onViewAuditDetail?: (entry: AdminAuditEntryView) => void;
};

function columnsFor(
  screen: AdminListScreenName,
  previewContext?: AdminPreviewContext,
  onSelectCommand?: (command: AdminCommandView) => void,
  callbacks?: AdminListActionCallbacks,
): DataTableColumn[] {
  if (screen === 'orders') return orderColumns(previewContext);
  if (screen === 'users') return userColumns(onSelectCommand);
  if (screen === 'fleets') return fleetColumns();
  if (screen === 'payments') return paymentColumns(onSelectCommand, previewContext);
  if (screen === 'invoices') return invoiceColumns(previewContext, callbacks?.onResendInvoice);
  if (screen === 'audit') return auditColumns(callbacks?.onViewAuditDetail);
  if (screen === 'promotions') return promotionColumns(onSelectCommand);
  if (screen === 'reviews') return reviewColumns(onSelectCommand, previewContext);
  return driverColumns(previewContext);
}

function mobileItem(
  item: AdminListItemView,
  previewContext?: AdminPreviewContext,
  onSelectCommand?: (command: AdminCommandView) => void,
  callbacks?: AdminListActionCallbacks,
): ResponsiveResultItem {
  if (item.entity === 'order') {
    return {
      id: item.id,
      heading: <span className={`block border-l-4 pl-sm ${orderSignalClass(item)}`}><OrderLink order={item} previewContext={previewContext} /></span>,
      status: <StatusBadge domain="orderStatus" status={item.status} />,
      details: [
        { id: 'route', label: 'Lộ trình', value: item.routeLabel },
        { id: 'people', label: 'Khách hàng / Tài xế', value: `${item.customerLabel} · ${item.driverLabel}` },
        { id: 'tracking', label: 'Định vị GPS', value: item.trackingLabel },
        { id: 'payment', label: 'Thanh toán', value: <StatusBadge domain="paymentStatus" status={item.paymentStatus} /> },
        { id: 'amount', label: 'Số tiền', value: item.amountLabel },
      ],
      actions: (
        <a
          aria-label={`Xem đơn ${item.reference}`}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full font-semibold text-xs text-brand bg-brand/5 hover:bg-brand/10 border border-brand/20 transition-all shadow-2xs"
          href={createAdminPreviewHref(item.href, 'order-detail', previewContext)}
        >
          <span>Chi tiết</span>
          <ArrowRight className="w-3.5 h-3.5 text-brand" strokeWidth={2.5} aria-hidden="true" />
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
        { id: 'role', label: 'Vai trò', value: formatUserRole(item.role) },
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
              className="h-8 min-h-[32px] px-3 text-xs font-semibold rounded-full shadow-2xs"
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
        { id: 'id', label: 'Mã đội xe', value: item.displayId },
        { id: 'owner', label: 'Chủ sở hữu & Liên kết', value: item.ownerSummary },
        { id: 'drivers', label: 'Tài xế', value: String(item.driverCount) },
        { id: 'orders', label: 'Đơn hàng', value: String(item.orderCount) },
        { id: 'membership', label: 'Tình trạng thành viên', value: item.membershipMessage },
      ],
    };
  }
  if (item.entity === 'payment') {
    return {
      id: item.id,
      heading: (
        <span className="block border-l-4 border-brand pl-sm font-semibold">
          <Link
            aria-label={`Xem đơn ${item.orderCode}`}
            className="text-brand underline-offset-4 hover:underline"
            href={createAdminPreviewHref(item.href, 'order-detail', previewContext)}
          >
            {item.orderCode}
          </Link>
        </span>
      ),
      status: <StatusBadge domain="paymentStatus" status={item.status} />,
      details: [
        { id: 'customer', label: 'Khách hàng', value: `${item.customerName}${item.customerPhone ? ` · ${item.customerPhone}` : ''}` },
        { id: 'amount', label: 'Số tiền', value: item.amountLabel },
        { id: 'source', label: 'Nguồn', value: item.sourceLabel },
        { id: 'reference', label: 'Mã tham chiếu', value: item.referenceLabel },
        { id: 'created', label: 'Ngày tạo', value: item.createdAtLabel },
        ...(item.confirmedByName ? [{ id: 'confirmedBy', label: 'Người xác nhận', value: item.confirmedByName }] : []),
        ...(item.confirmationNote ? [{ id: 'note', label: 'Ghi chú', value: item.confirmationNote }] : []),
      ],
      actions: item.availableCommands.length > 0 ? (
        <div className="flex flex-wrap items-center gap-1.5">
          {item.availableCommands.map((command) => (
            <Button
              key={`${command.kind}-${command.targetId}`}
              variant={command.buttonVariant}
              size="sm"
              className="h-8 min-h-[32px] px-3 text-xs font-semibold rounded-full shadow-2xs"
              onPress={() => onSelectCommand?.(command)}
            >
              {command.commandLabel}
            </Button>
          ))}
        </div>
      ) : undefined,
    };
  }
  if (item.entity === 'invoice') {
    return {
      id: item.id,
      heading: (
        <span className="block border-l-4 border-brand pl-sm font-semibold font-mono text-xs text-slate-900">
          {item.invoiceNumber}
        </span>
      ),
      status: <StatusBadge domain="invoiceStatus" status={item.status} />,
      details: [
        {
          id: 'order',
          label: 'Đơn hàng',
          value: (
            <Link
              href={createAdminPreviewHref(`/admin/orders/${item.orderId}`, 'order-detail', previewContext)}
              className="font-semibold text-xs text-brand hover:underline"
            >
              {item.orderCode}
            </Link>
          ),
        },
        {
          id: 'customer',
          label: 'Khách hàng',
          value: `${item.customerName}${item.customerEmail ? ` · ${item.customerEmail}` : ' (Thiếu email)'}`,
        },
        { id: 'total', label: 'Tổng tiền', value: item.totalLabel },
        { id: 'issued', label: 'Ngày phát hành', value: item.issuedAtLabel },
      ],
      actions: (
        <div className="flex flex-wrap items-center gap-1.5">
          <a
            href={item.pdfDownloadUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 h-8 min-h-[32px] px-3 text-xs font-semibold rounded-full border border-slate-200 bg-white text-slate-700 shadow-2xs transition-all hover:bg-slate-50"
          >
            <FileText className="h-3.5 w-3.5 text-slate-600" aria-hidden="true" />
            Tải PDF
          </a>
          <Button
            variant="secondary"
            size="sm"
            className="h-8 min-h-[32px] px-3 text-xs font-semibold rounded-full shadow-2xs"
            isDisabled={item.isMissingEmail}
            onPress={() => callbacks?.onResendInvoice?.(item)}
          >
            Gửi lại email
          </Button>
        </div>
      ),
    };
  }
  if (item.entity === 'audit') {
    return {
      id: item.id,
      heading: (
        <span className="block border-l-4 border-brand pl-sm font-semibold text-xs text-slate-900">
          {item.actionLabel || item.action}
        </span>
      ),
      status: (
        <span className="rounded-full bg-emerald-50 px-2.5 py-0.5 text-[11px] font-bold text-emerald-700 border border-emerald-200/70 shadow-2xs">
          {item.outcomeLabel}
        </span>
      ),
      details: [
        { id: 'actor', label: 'Người thực hiện', value: `${item.actorName ?? item.actorLabel ?? 'Hệ thống'}${item.actorRole ? ` · ${formatUserRole(item.actorRole)}` : ''}` },
        { id: 'resource', label: 'Tài nguyên', value: `${item.resourceType ?? ''}${item.resourceId ? ` · ${item.resourceId}` : (item.targetLabel ? ` · ${item.targetLabel}` : '')}` },
        { id: 'time', label: 'Thời điểm', value: item.timestampLabel },
        ...(item.requestId ? [{ id: 'request', label: 'Mã yêu cầu', value: item.requestId }] : []),
        ...(item.reason ? [{ id: 'reason', label: 'Chi tiết', value: item.reason }] : []),
      ],
      actions: item.metadata ? (
        <button
          type="button"
          onClick={() => callbacks?.onViewAuditDetail?.(item)}
          className="inline-flex items-center gap-1 text-xs font-semibold text-brand hover:underline cursor-pointer"
        >
          Xem chi tiết JSON
        </button>
      ) : undefined,
    };
  }
  if (item.entity === 'promotion') {
    const discountLabel =
      item.discountType === 'PERCENT'
        ? `${item.discountValue}%${item.maxDiscountVnd ? ` (Tối đa ${item.maxDiscountVnd.toLocaleString('vi-VN')} ₫)` : ''}`
        : `${item.discountValue.toLocaleString('vi-VN')} ₫`;
    return {
      id: item.id,
      heading: (
        <span className="inline-flex items-center gap-1.5 font-mono text-xs font-bold text-slate-900 bg-slate-100 border border-slate-200/80 px-2.5 py-1 rounded-full">
          <TicketPercent className="w-3.5 h-3.5 text-slate-600" aria-hidden="true" />
          {item.code}
        </span>
      ),
      status: item.isActive ? (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200/80">
          <CheckCircle2 className="w-3 h-3 text-emerald-600" aria-hidden="true" />
          Đang áp dụng
        </span>
      ) : (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-600 border border-slate-200">
          <XCircle className="w-3 h-3 text-slate-400" aria-hidden="true" />
          Tạm dừng
        </span>
      ),
      details: [
        { id: 'title', label: 'Chương trình', value: item.title },
        { id: 'discount', label: 'Mức giảm', value: discountLabel },
        { id: 'minOrder', label: 'Đơn tối thiểu', value: `${item.minOrderAmountVnd.toLocaleString('vi-VN')} ₫` },
        { id: 'usage', label: 'Lượt dùng', value: `${item.usageCount.toLocaleString('vi-VN')} / ${item.usageLimit.toLocaleString('vi-VN')}` },
        { id: 'expires', label: 'Hạn dùng', value: item.expiresAtLabel },
      ],
      actions: item.availableCommands.length > 0 ? (
        <div className="flex flex-wrap items-center gap-1.5">
          {item.availableCommands.map((command) => (
            <Button
              key={`${command.kind}-${command.targetId}`}
              variant={command.buttonVariant}
              size="sm"
              className="h-8 min-h-[32px] px-3 text-xs font-semibold rounded-full shadow-2xs"
              onPress={() => onSelectCommand?.(command)}
            >
              {command.commandLabel}
            </Button>
          ))}
        </div>
      ) : undefined,
    };
  }
  if (item.entity === 'review') {
    const isHidden = item.comment.startsWith('[Đã ẩn');
    return {
      id: item.id,
      heading: (
        <span className="block border-l-4 border-brand pl-sm font-semibold">
          <Link
            aria-label={`Xem đơn ${item.orderCode}`}
            className="text-brand underline-offset-4 hover:underline font-mono text-xs"
            href={createAdminPreviewHref(`/admin/orders/${item.orderId}`, 'order-detail', previewContext)}
          >
            {item.orderCode}
          </Link>
        </span>
      ),
      status: (
        <div className="flex items-center gap-1">
          <div className="flex items-center gap-0.5">
            {[1, 2, 3, 4, 5].map((star) => (
              <Star
                key={star}
                className={`w-3.5 h-3.5 ${
                  star <= item.rating
                    ? 'fill-amber-400 text-amber-400'
                    : 'text-slate-200 fill-slate-100'
                }`}
                aria-hidden="true"
              />
            ))}
          </div>
          <span className="font-bold text-xs text-slate-900 ml-1">{item.rating}.0</span>
        </div>
      ),
      details: [
        { id: 'customer', label: 'Khách hàng', value: `${item.customerName} · ${item.customerPhone}` },
        { id: 'driver', label: 'Tài xế', value: `${item.driverName} · ${item.driverPhone}` },
        {
          id: 'comment',
          label: 'Nhận xét',
          value: isHidden ? (
            <span className="italic text-amber-800 bg-amber-50 px-2 py-0.5 rounded border border-amber-200 text-xs">
              {item.comment}
            </span>
          ) : (
            item.comment
          ),
        },
        { id: 'tip', label: 'Tiền tip', value: item.tipVndLabel },
        { id: 'time', label: 'Thời điểm', value: item.createdAtLabel },
      ],
      actions: item.availableCommands.length > 0 ? (
        <div className="flex flex-wrap items-center gap-1.5">
          {item.availableCommands.map((command) => (
            <Button
              key={`${command.kind}-${command.targetId}`}
              variant={command.buttonVariant}
              size="sm"
              className="h-8 min-h-[32px] px-3 text-xs font-semibold rounded-full shadow-2xs"
              onPress={() => onSelectCommand?.(command)}
            >
              {command.commandLabel}
            </Button>
          ))}
        </div>
      ) : undefined,
    };
  }
  if (item.entity === 'report') {
    return {
      id: item.id,
      heading: (
        <span className="block border-l-4 border-brand pl-sm font-semibold">
          <Link
            aria-label={`Xem chi tiết khiếu nại ${item.ticketNumber}`}
            className="text-brand underline-offset-4 hover:underline font-mono text-xs"
            href={createAdminPreviewHref(`/admin/reports/${item.id}`, 'report-detail', previewContext)}
          >
            {item.ticketNumber}
          </Link>
        </span>
      ),
      status: (
        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-slate-100 text-slate-800">
          {item.statusLabel}
        </span>
      ),
      details: [
        { id: 'customer', label: 'Khách hàng', value: `${item.customerName} (${item.customerPhone ?? 'N/A'})` },
        { id: 'order', label: 'Mã đơn', value: item.orderCode ?? 'Không có' },
        { id: 'category', label: 'Danh mục', value: item.categoryLabel },
        { id: 'severity', label: 'Mức độ', value: item.severityLabel },
        { id: 'time', label: 'Thời điểm', value: item.createdAtLabel },
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
      <option value="updated-desc">Mới cập nhật trước</option>
      <option value="updated-asc">Cũ cập nhật trước</option>
      {screen === 'orders' || screen === 'payments' ? (
        <option value="reference-asc">Mã đơn A–Z</option>
      ) : null}
      {screen === 'promotions' ? (
        <option value="code-asc">Mã voucher A–Z</option>
      ) : null}
      {screen === 'reviews' ? (
        <>
          <option value="rating-desc">Điểm cao nhất</option>
          <option value="rating-asc">Điểm thấp nhất</option>
        </>
      ) : null}
      {screen === 'users' || screen === 'fleets' || screen === 'drivers' ? (
        <>
          <option value="name-asc">Tên A–Z</option>
          <option value="name-desc">Tên Z–A</option>
        </>
      ) : null}
    </>
  );
}

function matchesSessionSearch(item: AdminListItemView, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  if (item.entity === 'order') {
    return (
      item.reference.toLowerCase().includes(q) ||
      item.routeLabel.toLowerCase().includes(q) ||
      item.customerLabel.toLowerCase().includes(q) ||
      item.driverLabel.toLowerCase().includes(q)
    );
  }
  if (item.entity === 'payment') {
    return (
      item.orderCode.toLowerCase().includes(q) ||
      item.customerName.toLowerCase().includes(q) ||
      (item.customerPhone ? item.customerPhone.toLowerCase().includes(q) : false) ||
      item.referenceLabel.toLowerCase().includes(q) ||
      item.sourceLabel.toLowerCase().includes(q)
    );
  }
  if (item.entity === 'invoice') {
    return (
      item.invoiceNumber.toLowerCase().includes(q) ||
      item.orderCode.toLowerCase().includes(q) ||
      item.customerName.toLowerCase().includes(q) ||
      (item.customerEmail ? item.customerEmail.toLowerCase().includes(q) : false)
    );
  }
  if (item.entity === 'audit') {
    return (
      (item.actorName ? item.actorName.toLowerCase().includes(q) : false) ||
      (item.actorLabel ? item.actorLabel.toLowerCase().includes(q) : false) ||
      (item.action ? item.action.toLowerCase().includes(q) : false) ||
      (item.actionLabel ? item.actionLabel.toLowerCase().includes(q) : false) ||
      (item.resourceType ? item.resourceType.toLowerCase().includes(q) : false) ||
      (item.resourceId ? item.resourceId.toLowerCase().includes(q) : false) ||
      (item.requestId ? item.requestId.toLowerCase().includes(q) : false) ||
      (item.reason ? item.reason.toLowerCase().includes(q) : false)
    );
  }
  if (item.entity === 'user') {
    return (
      item.displayName.toLowerCase().includes(q) ||
      item.maskedPhone.toLowerCase().includes(q) ||
      item.role.toLowerCase().includes(q)
    );
  }
  if (item.entity === 'fleet') {
    return (
      item.displayName.toLowerCase().includes(q) ||
      item.displayId.toLowerCase().includes(q) ||
      item.ownerSummary.toLowerCase().includes(q)
    );
  }
  if (item.entity === 'driver') {
    return (
      item.displayName.toLowerCase().includes(q) ||
      item.maskedPhone.toLowerCase().includes(q) ||
      item.fleetLabel.toLowerCase().includes(q)
    );
  }
  if (item.entity === 'promotion') {
    return (
      item.code.toLowerCase().includes(q) ||
      item.title.toLowerCase().includes(q) ||
      item.description.toLowerCase().includes(q)
    );
  }
  if (item.entity === 'review') {
    return (
      item.orderCode.toLowerCase().includes(q) ||
      item.customerName.toLowerCase().includes(q) ||
      item.driverName.toLowerCase().includes(q) ||
      item.comment.toLowerCase().includes(q) ||
      item.customerPhone.toLowerCase().includes(q) ||
      item.driverPhone.toLowerCase().includes(q)
    );
  }
  if (item.entity === 'report') {
    return (
      item.ticketNumber.toLowerCase().includes(q) ||
      (item.orderCode?.toLowerCase().includes(q) ?? false) ||
      item.customerName.toLowerCase().includes(q) ||
      (item.customerPhone?.toLowerCase().includes(q) ?? false) ||
      item.categoryLabel.toLowerCase().includes(q) ||
      item.description.toLowerCase().includes(q)
    );
  }
  return false;
}

function FilterFields({
  screen,
  view,
  sessionSearch,
  onSessionSearchChange,
}: Readonly<{
  screen: AdminListScreenName;
  view: AdminListView;
  sessionSearch?: string | undefined;
  onSessionSearchChange?: ((value: string) => void) | undefined;
}>) {
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
          placeholder="Tìm kiếm theo tên, mã đơn hoặc SĐT..."
          type="search"
          value={sessionSearch ?? ''}
          onChange={(e) => onSessionSearchChange?.(e.target.value)}
        />
      </FilterField>
      {screen === 'orders' ? (
        <>
          <FilterField id={`${idPrefix}-status`} label="Trạng thái">
            <select id={`${idPrefix}-status`} className={fieldClass} defaultValue={filters.status} name="status"><option value="ALL">Tất cả</option><option value="REQUESTED">Chờ tài xế</option><option value="ACCEPTED">Đã nhận đơn</option><option value="PICKING_UP">Đang đến điểm lấy</option><option value="IN_TRANSIT">Đang vận chuyển</option><option value="DELIVERED">Đã giao</option><option value="CANCELLED">Đã hủy</option></select>
          </FilterField>
          <FilterField id={`${idPrefix}-customer`} label="Mã khách hàng">
            <input id={`${idPrefix}-customer`} className={fieldClass} defaultValue={filters.customerId} name="customerId" placeholder="Mã hoặc ID khách hàng" />
          </FilterField>
          <FilterField id={`${idPrefix}-driver`} label="Mã tài xế">
            <input id={`${idPrefix}-driver`} className={fieldClass} defaultValue={filters.driverId} name="driverId" placeholder="Mã hoặc ID tài xế" />
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
          <FilterField id={`${idPrefix}-role`} label="Vai trò">
            <select id={`${idPrefix}-role`} className={fieldClass} defaultValue={filters.role} name="role"><option value="ALL">Tất cả</option><option value="CUSTOMER">Khách hàng</option><option value="DRIVER">Tài xế</option><option value="ADMIN">Quản trị viên</option></select>
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
          <FilterField id={`${idPrefix}-membership`} label="Liên kết đội xe">
            <select id={`${idPrefix}-membership`} className={fieldClass} defaultValue={filters.membershipStatus} name="membershipStatus"><option value="ALL">Tất cả</option><option value="INVITED">Đã mời</option><option value="ACTIVE">Đang tham gia</option><option value="REMOVED">Đã gỡ khỏi đội xe</option></select>
          </FilterField>
          <FilterField id={`${idPrefix}-fleet`} label="Mã đội xe">
            <input id={`${idPrefix}-fleet`} className={fieldClass} defaultValue={filters.fleetId} name="fleetId" placeholder="Mã hoặc ID đội xe" />
          </FilterField>
        </>
      ) : screen === 'payments' ? (
        <>
          <FilterField id={`${idPrefix}-status`} label="Trạng thái thanh toán">
            <select id={`${idPrefix}-status`} className={fieldClass} defaultValue={filters.status} name="status">
              <option value="ALL">Tất cả</option>
              <option value="UNPAID">Chưa thanh toán</option>
              <option value="QR_CREATED">Đã tạo mã QR</option>
              <option value="PAID_MANUAL">Đã xác nhận</option>
              <option value="FAILED">Thất bại</option>
            </select>
          </FilterField>
          <FilterField id={`${idPrefix}-from`} label="Từ ngày">
            <input id={`${idPrefix}-from`} className={fieldClass} defaultValue={filters.from} name="from" type="date" />
          </FilterField>
          <FilterField id={`${idPrefix}-to`} label="Đến ngày">
            <input id={`${idPrefix}-to`} className={fieldClass} defaultValue={filters.to} name="to" type="date" />
          </FilterField>
        </>
      ) : screen === 'invoices' ? (
        <>
          <FilterField id={`${idPrefix}-status`} label="Trạng thái hóa đơn">
            <select id={`${idPrefix}-status`} className={fieldClass} defaultValue={filters.status} name="status">
              <option value="ALL">Tất cả</option>
              <option value="ISSUED">Đã phát hành</option>
              <option value="VOIDED">Đã hủy</option>
            </select>
          </FilterField>
          <FilterField id={`${idPrefix}-missingEmail`} label="Lọc email">
            <select id={`${idPrefix}-missingEmail`} className={fieldClass} defaultValue={filters.missingEmail ? 'true' : ''} name="missingEmail">
              <option value="">Tất cả hóa đơn</option>
              <option value="true">Chỉ hóa đơn thiếu email</option>
            </select>
          </FilterField>
          <FilterField id={`${idPrefix}-from`} label="Từ ngày">
            <input id={`${idPrefix}-from`} className={fieldClass} defaultValue={filters.from} name="from" type="date" />
          </FilterField>
          <FilterField id={`${idPrefix}-to`} label="Đến ngày">
            <input id={`${idPrefix}-to`} className={fieldClass} defaultValue={filters.to} name="to" type="date" />
          </FilterField>
        </>
      ) : screen === 'audit' ? (
        <>
          <FilterField id={`${idPrefix}-actorId`} label="Người thực hiện">
            <input id={`${idPrefix}-actorId`} className={fieldClass} defaultValue={filters.actorId ?? ''} name="actorId" placeholder="Mã ID người thực hiện" />
          </FilterField>
          <FilterField id={`${idPrefix}-action`} label="Hành động">
            <input id={`${idPrefix}-action`} className={fieldClass} defaultValue={filters.action ?? ''} name="action" placeholder="VD: USER_STATUS_UPDATE, CANCEL_ORDER" />
          </FilterField>
          <FilterField id={`${idPrefix}-from`} label="Từ ngày">
            <input id={`${idPrefix}-from`} className={fieldClass} defaultValue={filters.from} name="from" type="date" />
          </FilterField>
          <FilterField id={`${idPrefix}-to`} label="Đến ngày">
            <input id={`${idPrefix}-to`} className={fieldClass} defaultValue={filters.to} name="to" type="date" />
          </FilterField>
        </>
      ) : screen === 'promotions' ? (
        <>
          <FilterField id={`${idPrefix}-status`} label="Trạng thái voucher">
            <select id={`${idPrefix}-status`} className={fieldClass} defaultValue={filters.status} name="status">
              <option value="ALL">Tất cả</option>
              <option value="ACTIVE">Đang áp dụng</option>
              <option value="INACTIVE">Tạm dừng</option>
            </select>
          </FilterField>
          <FilterField id={`${idPrefix}-discountType`} label="Loại chiết khấu">
            <select id={`${idPrefix}-discountType`} className={fieldClass} defaultValue={filters.discountType ?? 'ALL'} name="discountType">
              <option value="ALL">Tất cả hình thức</option>
              <option value="PERCENT">Phần trăm (%)</option>
              <option value="FIXED">Số tiền cố định (₫)</option>
            </select>
          </FilterField>
          <FilterField id={`${idPrefix}-q`} label="Từ khóa (Mã/Tên)">
            <input id={`${idPrefix}-q`} className={fieldClass} defaultValue={filters.q ?? ''} name="q" placeholder="Mã voucher hoặc tiêu đề..." />
          </FilterField>
        </>
      ) : screen === 'reviews' ? (
        <>
          <FilterField id={`${idPrefix}-rating`} label="Số sao đánh giá">
            <select id={`${idPrefix}-rating`} className={fieldClass} defaultValue={filters.rating ?? 'ALL'} name="rating">
              <option value="ALL">Tất cả điểm số</option>
              <option value="5">5 sao (Rất tốt)</option>
              <option value="4">4 sao (Tốt)</option>
              <option value="3">3 sao (Bình thường)</option>
              <option value="2">2 sao (Chưa hài lòng)</option>
              <option value="1">1 sao (Kém)</option>
            </select>
          </FilterField>
          <FilterField id={`${idPrefix}-q`} label="Nội dung nhận xét">
            <input id={`${idPrefix}-q`} className={fieldClass} defaultValue={filters.q ?? ''} name="q" placeholder="Nội dung bình luận hoặc tên..." />
          </FilterField>
          <FilterField id={`${idPrefix}-from`} label="Từ ngày">
            <input id={`${idPrefix}-from`} className={fieldClass} defaultValue={filters.from} name="from" type="date" />
          </FilterField>
          <FilterField id={`${idPrefix}-to`} label="Đến ngày">
            <input id={`${idPrefix}-to`} className={fieldClass} defaultValue={filters.to} name="to" type="date" />
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

function AdminFilters({
  screen,
  view,
  previewContext,
  sessionSearch,
  onSessionSearchChange,
}: Readonly<{
  screen: AdminListScreenName;
  view: AdminListView;
  previewContext: AdminPreviewContext | undefined;
  sessionSearch?: string | undefined;
  onSessionSearchChange?: ((value: string) => void) | undefined;
}>) {
  const resetQuery = serializeAdminListFilters(screen, { ...view.filters, status: 'ALL', role: 'ALL', userStatus: 'ALL', availability: 'ALL', membershipStatus: 'ALL', fleetId: '', customerId: '', driverId: '', from: '', to: '', discountType: 'ALL', rating: 'ALL', q: '', page: 1 }, previewContext);
  return (
    <section
      aria-label={`Phạm vi điều tra ${titleByScreen[screen].toLocaleLowerCase('vi')}`}
      className="rounded-3xl border border-black/[0.06] bg-white/80 backdrop-blur-xl p-5 sm:p-6 shadow-sm shadow-[0_2px_12px_rgba(0,0,0,0.03)] text-neutral-text"
    >
      <header className="mb-4 flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3">
        <h2 className="text-sm font-bold text-slate-800">Bộ lọc tìm kiếm</h2>
        <span className="text-xs text-slate-400 font-medium">Tìm kiếm & phân loại dữ liệu</span>
      </header>
      <form
        aria-label={`Lọc ${titleByScreen[screen].toLocaleLowerCase('vi')}`}
        className="grid gap-sm md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
        method="get"
        role="search"
      >
        <AdminPreviewHiddenFields context={previewContext} />
        <FilterFields
          screen={screen}
          view={view}
          sessionSearch={sessionSearch}
          onSessionSearchChange={onSessionSearchChange}
        />
        <input name="page" type="hidden" value="1" />
        <input name="pageSize" type="hidden" value={view.filters.pageSize} />
        <div className="flex flex-wrap items-end gap-2 md:col-span-2 lg:col-span-3 xl:col-span-4 pt-2">
          <button
            className="inline-flex min-h-10 items-center justify-center rounded-full bg-slate-900 px-5 text-xs font-semibold text-white shadow-xs hover:bg-slate-800 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900 focus-visible:ring-offset-2"
            type="submit"
          >
            Áp dụng bộ lọc
          </button>
          <a
            className="inline-flex min-h-10 items-center justify-center rounded-full border border-slate-200/80 bg-white/90 px-4 text-xs font-semibold text-slate-700 shadow-2xs hover:bg-slate-50 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900"
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
  const [sessionSearch, setSessionSearch] = useState('');
  const [isCreatePromoOpen, setIsCreatePromoOpen] = useState(false);
  const [resendInvoiceTarget, setResendInvoiceTarget] = useState<AdminInvoiceListItemView | null>(null);
  const [auditDetailTarget, setAuditDetailTarget] = useState<AdminAuditEntryView | null>(null);
  const [actionToast, setActionToast] = useState<string | null>(null);

  const actionCallbacks: AdminListActionCallbacks = {
    onResendInvoice: (invoice) => setResendInvoiceTarget(invoice),
    onViewAuditDetail: (entry) => setAuditDetailTarget(entry),
  };

  const commands: readonly AdminCommandView[] =
    (screen === 'users' || screen === 'payments' || screen === 'promotions' || screen === 'reviews') && view.kind === 'list' && view.entity === screen
      ? view.result.items.flatMap((item) =>
          item.entity === 'user'
            ? item.availableCommands
            : item.entity === 'payment'
              ? item.availableCommands
              : item.entity === 'promotion'
                ? item.availableCommands
                : item.entity === 'review'
                  ? item.availableCommands
                  : [],
        )
      : [];

  const initialCommand =
    view.kind === 'list' && view.dialogPreview && (screen === 'users' || screen === 'payments' || screen === 'promotions' || screen === 'reviews')
      ? commands.find((candidate) => candidate.kind === view.dialogPreview?.commandKind) ?? null
      : null;

  const [activeCommand, setActiveCommand] = useState<AdminCommandView | null>(initialCommand);

  if (view.kind !== 'list' || view.entity !== screen) {
    if (view.kind === 'list') {
      return <ScreenState state="error" title="Sai phạm vi màn hình" message="Không render dữ liệu từ một Admin surface khác." />;
    }
    return <div className="flex flex-col gap-md"><OperationsPageHeader title={titleByScreen[screen]} /><AdminBoundaryState view={view} /></div>;
  }

  const displayedItems = view.result.items.filter((item) =>
    matchesSessionSearch(item, sessionSearch),
  );
  const rows = displayedItems.map((item) => ({ id: item.id, item }));
  const mobileItems = displayedItems.map((item) =>
    mobileItem(item, previewContext, (cmd) => setActiveCommand(cmd), actionCallbacks),
  );

  return (
    <div className="flex min-w-0 flex-col gap-4 sm:gap-5">
      <AdminBreadcrumbs previewContext={previewContext} screen={screen} />
      <OperationsPageHeader
        title={view.title}
        updatedAt={view.checkedAtLabel}
      />
      {view.notice ? <AdminNotice notice={view.notice} /> : null}
      {actionToast ? (
        <div className="flex items-center justify-between gap-3 px-4 py-3 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs font-semibold shadow-xs animate-in fade-in-0 duration-200">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-none" aria-hidden="true" />
            <span>{actionToast}</span>
          </div>
          <button
            type="button"
            onClick={() => setActionToast(null)}
            className="text-emerald-700 hover:text-emerald-900 text-xs font-bold px-2 py-1 rounded-md hover:bg-emerald-100/60 transition-colors cursor-pointer"
            aria-label="Đóng thông báo"
          >
            Đóng
          </button>
        </div>
      ) : null}
      {view.metrics && view.metrics.length > 0 ? (
        <section aria-label="Chỉ số vận hành" className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          {view.metrics.map((metric) => (
            <div
              key={metric.id}
              className="flex flex-col gap-1 rounded-2xl border border-slate-200/80 bg-white p-4 shadow-xs"
            >
              <span className="text-xs font-medium text-slate-500 truncate">{metric.label}</span>
              <span className="text-lg sm:text-xl font-bold text-slate-900 tracking-tight tabular-nums">
                {typeof metric.value === 'number'
                  ? metric.value.toLocaleString('vi-VN')
                  : metric.value}
              </span>
              <span className="text-[11px] text-slate-400 truncate">{metric.detail}</span>
            </div>
          ))}
        </section>
      ) : null}
      <AdminFilters
        previewContext={previewContext}
        screen={screen}
        view={view}
        sessionSearch={sessionSearch}
        onSessionSearchChange={setSessionSearch}
      />
      <div aria-hidden={activeCommand ? 'true' : undefined} className="min-w-0">
        <AdminSurface
          ariaLabel={`Sổ kết quả ${entityNounByScreen[screen]}`}
          title={`Sổ kết quả ${entityNounByScreen[screen]}`}
          description={`${displayedItems.length}${displayedItems.length !== view.result.totalItems ? ` / ${view.result.totalItems}` : ''} kết quả · Trang ${view.result.page}/${Math.max(view.result.totalPages, 1)}`}
        >
          {displayedItems.length === 0 ? (
            <ScreenState state="no-results" title={`Không tìm thấy ${entityNounByScreen[screen]}`} message="Không có dữ liệu phù hợp với bộ lọc hoặc từ khóa tìm kiếm hiện tại; dùng Xóa bộ lọc để phục hồi." />
          ) : (
            <div className="flex min-w-0 flex-col gap-md">
              {screen === 'orders' ? (
                <div className="flex items-center gap-1.5 overflow-x-auto pb-3 mb-2 border-b border-slate-100 custom-scrollbar">
                  {[
                    { id: 'ALL', label: 'Tất cả' },
                    { id: 'REQUESTED', label: 'Chờ tài xế' },
                    { id: 'ACCEPTED', label: 'Đã nhận đơn' },
                    { id: 'PICKING_UP', label: 'Đang lấy hàng' },
                    { id: 'IN_TRANSIT', label: 'Đang vận chuyển' },
                    { id: 'DELIVERED', label: 'Đã giao' },
                    { id: 'CANCELLED', label: 'Đã hủy' }
                  ].map((f) => {
                    const isActive = view.filters.status === f.id;
                    const href = `/admin/${screen}?${serializeAdminListFilters(screen, { ...view.filters, status: f.id as any, page: 1 }, previewContext)}`;
                    return (
                      <Link
                        key={f.id}
                        href={href}
                        className={`flex-none rounded-full px-3.5 py-1.5 text-xs font-semibold transition-all ${
                          isActive
                            ? 'bg-slate-900 text-white shadow-xs'
                            : 'bg-slate-100/70 text-slate-600 hover:bg-slate-200/70 hover:text-slate-900'
                        }`}
                      >
                        {f.label}
                      </Link>
                    );
                  })}
                </div>
              ) : screen === 'users' ? (
                <div className="flex items-center gap-1.5 overflow-x-auto pb-3 mb-2 border-b border-slate-100 custom-scrollbar">
                  {[
                    { id: 'ALL', label: 'Tất cả' },
                    { id: 'CUSTOMER', label: 'Khách hàng' },
                    { id: 'DRIVER', label: 'Tài xế' },
                    { id: 'ADMIN', label: 'Quản trị viên' }
                  ].map((f) => {
                    const isActive = view.filters.role === f.id;
                    const href = `/admin/${screen}?${serializeAdminListFilters(screen, { ...view.filters, role: f.id as any, page: 1 }, previewContext)}`;
                    return (
                      <Link
                        key={f.id}
                        href={href}
                        className={`flex-none rounded-full px-3.5 py-1.5 text-xs font-semibold transition-all ${
                          isActive
                            ? 'bg-slate-900 text-white shadow-xs'
                            : 'bg-slate-100/70 text-slate-600 hover:bg-slate-200/70 hover:text-slate-900'
                        }`}
                      >
                        {f.label}
                      </Link>
                    );
                  })}
                </div>
              ) : screen === 'payments' ? (
                <div className="flex items-center gap-1.5 overflow-x-auto pb-3 mb-2 border-b border-slate-100 custom-scrollbar">
                  {[
                    { id: 'ALL', label: 'Tất cả' },
                    { id: 'UNPAID', label: 'Chưa thanh toán' },
                    { id: 'QR_CREATED', label: 'Đã tạo mã QR' },
                    { id: 'PAID_MANUAL', label: 'Đã xác nhận' },
                    { id: 'FAILED', label: 'Thất bại' },
                  ].map((f) => {
                    const isActive = view.filters.status === f.id;
                    const href = `/admin/${screen}?${serializeAdminListFilters(screen, { ...view.filters, status: f.id as any, page: 1 }, previewContext)}`;
                    return (
                      <Link
                        key={f.id}
                        href={href}
                        className={`flex-none rounded-full px-3.5 py-1.5 text-xs font-semibold transition-all ${
                          isActive
                            ? 'bg-slate-900 text-white shadow-xs'
                            : 'bg-slate-100/70 text-slate-600 hover:bg-slate-200/70 hover:text-slate-900'
                        }`}
                      >
                        {f.label}
                      </Link>
                    );
                  })}
                </div>
              ) : screen === 'invoices' ? (
                <div className="flex items-center gap-1.5 overflow-x-auto pb-3 mb-2 border-b border-slate-100 custom-scrollbar">
                  {[
                    { id: 'ALL', label: 'Tất cả' },
                    { id: 'ISSUED', label: 'Đã phát hành' },
                    { id: 'VOIDED', label: 'Đã hủy' },
                  ].map((f) => {
                    const isActive = view.filters.status === f.id;
                    const href = `/admin/${screen}?${serializeAdminListFilters(screen, { ...view.filters, status: f.id as any, page: 1 }, previewContext)}`;
                    return (
                      <Link
                        key={f.id}
                        href={href}
                        className={`flex-none rounded-full px-3.5 py-1.5 text-xs font-semibold transition-all ${
                          isActive
                            ? 'bg-slate-900 text-white shadow-xs'
                            : 'bg-slate-100/70 text-slate-600 hover:bg-slate-200/70 hover:text-slate-900'
                        }`}
                      >
                        {f.label}
                      </Link>
                    );
                  })}
                </div>
              ) : screen === 'promotions' ? (
                <div className="flex items-center justify-between gap-2 overflow-x-auto pb-3 mb-2 border-b border-slate-100 custom-scrollbar">
                  <div className="flex items-center gap-1.5">
                    {[
                      { id: 'ALL', label: 'Tất cả' },
                      { id: 'ACTIVE', label: 'Đang áp dụng' },
                      { id: 'INACTIVE', label: 'Tạm dừng' },
                    ].map((f) => {
                      const isActive = view.filters.status === f.id;
                      const href = `/admin/${screen}?${serializeAdminListFilters(screen, { ...view.filters, status: f.id as any, page: 1 }, previewContext)}`;
                      return (
                        <Link
                          key={f.id}
                          href={href}
                          className={`flex-none rounded-full px-3.5 py-1.5 text-xs font-semibold transition-all ${
                            isActive
                              ? 'bg-slate-900 text-white shadow-xs'
                              : 'bg-slate-100/70 text-slate-600 hover:bg-slate-200/70 hover:text-slate-900'
                          }`}
                        >
                          {f.label}
                        </Link>
                      );
                    })}
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsCreatePromoOpen(true)}
                    className="flex-none inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs font-bold bg-slate-900 text-white shadow-xs hover:bg-slate-800 transition-all cursor-pointer active:scale-95"
                  >
                    <Plus className="w-3.5 h-3.5" aria-hidden="true" />
                    Tạo voucher mới
                  </button>
                </div>
              ) : screen === 'reviews' ? (
                <div className="flex items-center gap-1.5 overflow-x-auto pb-3 mb-2 border-b border-slate-100 custom-scrollbar">
                  {[
                    { id: 'ALL', label: 'Tất cả' },
                    { id: '5', label: '5 sao' },
                    { id: '4', label: '4 sao' },
                    { id: '3', label: '3 sao' },
                    { id: '2', label: '2 sao' },
                    { id: '1', label: '1 sao' },
                  ].map((f) => {
                    const isActive = (view.filters.rating ?? 'ALL') === f.id;
                    const href = `/admin/${screen}?${serializeAdminListFilters(screen, { ...view.filters, rating: f.id as any, page: 1 }, previewContext)}`;
                    return (
                      <Link
                        key={f.id}
                        href={href}
                        className={`flex-none rounded-full px-3.5 py-1.5 text-xs font-semibold transition-all ${
                          isActive
                            ? 'bg-slate-900 text-white shadow-xs'
                            : 'bg-slate-100/70 text-slate-600 hover:bg-slate-200/70 hover:text-slate-900'
                        }`}
                      >
                        {f.label}
                      </Link>
                    );
                  })}
                </div>
              ) : null}
              <div className="hidden min-w-0 overflow-x-auto md:block">
                <DataTable
                  caption={`${titleByScreen[screen]} trong phạm vi Admin và bộ lọc hiện tại`}
                  columns={columnsFor(screen, previewContext, (cmd) => setActiveCommand(cmd), actionCallbacks)}
                  rows={rows}
                />
              </div>
              <ResponsiveResultList ariaLabel={`Kết quả ${entityNounByScreen[screen]} dạng hàng responsive`} items={mobileItems} />
              <AdminPaginationLinks hrefForPage={(page) => `/admin/${screen}?${serializeAdminListFilters(screen, { ...view.filters, page }, previewContext)}`} label={entityNounByScreen[screen]} page={view.result.page} totalPages={view.result.totalPages} />
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
      <CreatePromotionModal
        isOpen={isCreatePromoOpen}
        onClose={() => setIsCreatePromoOpen(false)}
        onSuccess={(msg) => setActionToast(msg)}
        commandRuntime={commandRuntime}
      />
      <ResendInvoiceModal
        invoice={resendInvoiceTarget}
        isOpen={resendInvoiceTarget !== null}
        onClose={() => setResendInvoiceTarget(null)}
        onSuccess={(msg) => setActionToast(msg)}
        commandRuntime={commandRuntime}
      />
      <AuditDetailModal
        entry={auditDetailTarget}
        isOpen={auditDetailTarget !== null}
        onClose={() => setAuditDetailTarget(null)}
      />
    </div>
  );
}
