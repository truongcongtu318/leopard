'use client';

import { useCallback, useEffect, useId, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  AlertCircle,
  AlertTriangle,
  Camera,
  CheckCircle2,
  ChevronRight,
  Clock,
  ExternalLink,
  Filter,
  Inbox,
  Search,
  ShieldAlert,
  User,
  X,
} from 'lucide-react';

import { OperationsPageHeader } from '@leopard/ui';

import {
  createAdminPreviewHref,
  serializeAdminListFilters,
} from './adapter';
import type {
  AdminListFilters,
  AdminListRouteView,
  AdminPreviewContext,
  AdminReportListItemView,
} from './model';
import {
  AdminBoundaryState,
  AdminBreadcrumbs,
  AdminNotice,
} from './AdminShared';

const SEVERITY_BADGES: Readonly<Record<string, { label: string; className: string }>> = {
  CRITICAL: {
    label: 'Khẩn cấp',
    className: 'bg-rose-50 text-rose-700 border-rose-200 font-bold',
  },
  HIGH: {
    label: 'Cao',
    className: 'bg-amber-50 text-amber-800 border-amber-200 font-semibold',
  },
  MEDIUM: {
    label: 'Trung bình',
    className: 'bg-yellow-50 text-yellow-800 border-yellow-200',
  },
  LOW: {
    label: 'Thấp',
    className: 'bg-slate-100 text-slate-600 border-slate-200',
  },
};

const STATUS_BADGES: Readonly<Record<string, { label: string; className: string }>> = {
  OPEN: {
    label: 'Chờ tiếp nhận',
    className: 'bg-blue-50 text-blue-700 border-blue-200',
  },
  IN_PROGRESS: {
    label: 'Đang điều tra',
    className: 'bg-amber-50 text-amber-700 border-amber-200',
  },
  RESOLVED: {
    label: 'Đã giải quyết',
    className: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  },
  CLOSED: {
    label: 'Đã đóng',
    className: 'bg-slate-100 text-slate-600 border-slate-200',
  },
};

const CATEGORIES: ReadonlyArray<{ value: string; label: string }> = [
  { value: 'ALL', label: 'Tất cả danh mục' },
  { value: 'DAMAGED_GOODS', label: 'Hàng hỏng hóc / bể vỡ' },
  { value: 'LATE_DELIVERY', label: 'Giao hàng trễ hẹn' },
  { value: 'DRIVER_ATTITUDE', label: 'Thái độ tài xế' },
  { value: 'WRONG_PRICE_COD', label: 'Sai cước phí / tiền COD' },
  { value: 'OTHER', label: 'Lý do khác' },
];

export function AdminReportsScreen({
  view,
  previewContext,
  commandRuntime,
}: Readonly<{
  view: AdminListRouteView;
  previewContext?: AdminPreviewContext | undefined;
  commandRuntime?: boolean | undefined;
}>) {
  const searchInputId = useId();
  const categorySelectId = useId();

  if (view.kind !== 'list') {
    return (
      <div className="flex flex-col gap-md">
        <OperationsPageHeader title="Khiếu nại & Hỗ trợ" />
        <AdminBoundaryState view={view} />
      </div>
    );
  }

  const reports = useMemo(
    () =>
      view.result.items.filter(
        (item): item is AdminReportListItemView => item.entity === 'report',
      ),
    [view.result.items],
  );

  const [selectedReport, setSelectedReport] = useState<AdminReportListItemView | null>(null);
  const [searchTerm, setSearchTerm] = useState(view.filters.q ?? '');
  const [selectedStatus, setSelectedStatus] = useState<string>(view.filters.status ?? 'ALL');
  const [selectedCategory, setSelectedCategory] = useState<string>(view.filters.category ?? 'ALL');

  // KPI calculations
  const kpis = useMemo(() => {
    const total = view.result.totalItems || reports.length;
    const openCount = reports.filter((r) => r.status === 'OPEN').length;
    const inProgressCount = reports.filter((r) => r.status === 'IN_PROGRESS').length;
    const resolvedCount = reports.filter((r) => r.status === 'RESOLVED' || r.status === 'CLOSED').length;
    return {
      total,
      open: openCount,
      inProgress: inProgressCount,
      resolved: resolvedCount,
    };
  }, [view.result.totalItems, reports]);

  // Client filtering
  const filteredReports = useMemo(() => {
    return reports.filter((report) => {
      if (selectedStatus !== 'ALL' && report.status !== selectedStatus) return false;
      if (selectedCategory !== 'ALL' && report.category !== selectedCategory) return false;
      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase();
        const matchTicket = report.ticketNumber.toLowerCase().includes(q);
        const matchOrder = report.orderCode?.toLowerCase().includes(q) ?? false;
        const matchCustomer = report.customerName.toLowerCase().includes(q);
        const matchPhone = report.customerPhone?.toLowerCase().includes(q) ?? false;
        const matchDesc = report.description.toLowerCase().includes(q);
        if (!matchTicket && !matchOrder && !matchCustomer && !matchPhone && !matchDesc) return false;
      }
      return true;
    });
  }, [reports, selectedStatus, selectedCategory, searchTerm]);

  // Close Quick Drawer on Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setSelectedReport(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <div className="flex min-w-0 flex-col gap-6">
      <AdminBreadcrumbs previewContext={previewContext} screen="reports" />

      <OperationsPageHeader
        title="Hàng Đợi Khiếu Nại & Hỗ Trợ"
        updatedAt={view.checkedAtLabel}
      />

      {view.notice ? <AdminNotice notice={view.notice} /> : null}

      {/* KPI Metric Strip (4 Bento cards) */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <div className="rounded-3xl border border-slate-100 bg-white p-5 shadow-xs transition-shadow hover:shadow-sm">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-semibold uppercase tracking-wider">Tổng khiếu nại</span>
            <AlertCircle className="h-4 w-4 text-slate-400" />
          </div>
          <p className="mt-3 text-2xl sm:text-3xl font-black text-slate-900">{kpis.total}</p>
          <p className="mt-1 text-xs text-slate-500 font-medium">Toàn hệ thống</p>
        </div>

        <div className="rounded-3xl border border-blue-100 bg-white p-5 shadow-xs transition-shadow hover:shadow-sm">
          <div className="flex items-center justify-between text-blue-600">
            <span className="text-xs font-semibold uppercase tracking-wider">Chờ tiếp nhận</span>
            <Clock className="h-4 w-4 text-blue-500" />
          </div>
          <p className="mt-3 text-2xl sm:text-3xl font-black text-blue-700">{kpis.open}</p>
          <p className="mt-1 text-xs text-blue-600/80 font-medium">Cần xử lý ban đầu</p>
        </div>

        <div className="rounded-3xl border border-amber-100 bg-white p-5 shadow-xs transition-shadow hover:shadow-sm">
          <div className="flex items-center justify-between text-amber-600">
            <span className="text-xs font-semibold uppercase tracking-wider">Đang điều tra</span>
            <AlertTriangle className="h-4 w-4 text-amber-500" />
          </div>
          <p className="mt-3 text-2xl sm:text-3xl font-black text-amber-700">{kpis.inProgress}</p>
          <p className="mt-1 text-xs text-amber-600/80 font-medium">Đối soát tài xế & kho</p>
        </div>

        <div className="rounded-3xl border border-emerald-100 bg-white p-5 shadow-xs transition-shadow hover:shadow-sm">
          <div className="flex items-center justify-between text-emerald-600">
            <span className="text-xs font-semibold uppercase tracking-wider">Đã giải quyết</span>
            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
          </div>
          <p className="mt-3 text-2xl sm:text-3xl font-black text-emerald-700">{kpis.resolved}</p>
          <p className="mt-1 text-xs text-emerald-600/80 font-medium">Đã bồi hoàn / xử lý</p>
        </div>
      </div>

      {/* Filter Toolbar Bento */}
      <div className="rounded-3xl border border-slate-100 bg-white p-4 sm:p-5 shadow-xs flex flex-col gap-4">
        {/* Status Pill Filters */}
        <div className="flex flex-wrap items-center gap-1.5 pb-2 border-b border-slate-100">
          <span className="text-xs font-semibold text-slate-500 mr-2 flex items-center gap-1">
            <Filter className="w-3.5 h-3.5" /> Trạng thái:
          </span>
          {[
            { key: 'ALL', label: 'Tất cả' },
            { key: 'OPEN', label: 'Chờ tiếp nhận' },
            { key: 'IN_PROGRESS', label: 'Đang điều tra' },
            { key: 'RESOLVED', label: 'Đã giải quyết' },
            { key: 'CLOSED', label: 'Đã đóng' },
          ].map((status) => (
            <button
              key={status.key}
              type="button"
              onClick={() => setSelectedStatus(status.key)}
              className={`rounded-full px-3 py-1 text-xs font-semibold transition-all ${
                selectedStatus === status.key
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'bg-slate-50 text-slate-600 hover:bg-slate-100 hover:text-slate-900'
              }`}
            >
              {status.label}
            </button>
          ))}
        </div>

        {/* Search & Category Filter Controls */}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-12 items-center">
          <div className="relative sm:col-span-7">
            <label htmlFor={searchInputId} className="sr-only">
              Tìm kiếm khiếu nại
            </label>
            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
              <Search className="h-4 w-4 text-slate-400" />
            </div>
            <input
              id={searchInputId}
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Tìm theo mã vé, mã đơn, tên khách hàng, số điện thoại..."
              className="w-full rounded-2xl border border-slate-200 bg-slate-50/50 py-2 pl-9 pr-3 text-xs text-slate-900 placeholder:text-slate-400 focus:border-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-slate-900/10"
            />
          </div>

          <div className="sm:col-span-5">
            <label htmlFor={categorySelectId} className="sr-only">
              Phân loại danh mục
            </label>
            <select
              id={categorySelectId}
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="w-full rounded-2xl border border-slate-200 bg-slate-50/50 py-2 px-3 text-xs text-slate-900 focus:border-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-slate-900/10"
            >
              {CATEGORIES.map((cat) => (
                <option key={cat.value} value={cat.value}>
                  {cat.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Reports Table Bento */}
      <div className="rounded-3xl border border-slate-100 bg-white p-4 sm:p-5 shadow-xs overflow-hidden">
        {filteredReports.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <Inbox className="h-10 w-10 text-slate-300 mb-3" />
            <p className="text-sm font-bold text-slate-700">Không tìm thấy khiếu nại nào</p>
            <p className="text-xs text-slate-500 mt-1 max-w-sm">
              Hãy thử thay đổi bộ lọc trạng thái, phân loại danh mục hoặc từ khóa tìm kiếm.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-100 text-slate-500 font-medium">
                  <th className="py-3 px-3">Mã vé</th>
                  <th className="py-3 px-3">Khách hàng</th>
                  <th className="py-3 px-3">Đơn hàng</th>
                  <th className="py-3 px-3">Danh mục</th>
                  <th className="py-3 px-3">Mức độ</th>
                  <th className="py-3 px-3">Trạng thái</th>
                  <th className="py-3 px-3">Thời gian</th>
                  <th className="py-3 px-3 text-right">Chi tiết</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {filteredReports.map((item) => {
                  const severityConfig = SEVERITY_BADGES[item.severity] || SEVERITY_BADGES.LOW!;
                  const statusConfig = STATUS_BADGES[item.status] || STATUS_BADGES.OPEN!;
                  const isSelected = selectedReport?.id === item.id;

                  return (
                    <tr
                      key={item.id}
                      onClick={() => setSelectedReport(item)}
                      className={`cursor-pointer transition-colors hover:bg-slate-50/80 ${
                        isSelected ? 'bg-slate-50 ring-1 ring-slate-200' : ''
                      }`}
                    >
                      <td className="py-3.5 px-3 font-mono font-bold text-slate-900">
                        <div className="flex items-center gap-1.5">
                          <span>{item.ticketNumber}</span>
                          {item.hasPhoto ? (
                            <span
                              title="Có hình ảnh bằng chứng"
                              className="inline-flex items-center p-1 rounded-md bg-blue-50 text-blue-600"
                            >
                              <Camera className="w-3 h-3" />
                            </span>
                          ) : null}
                        </div>
                      </td>

                      <td className="py-3.5 px-3">
                        <div className="font-semibold text-slate-800">{item.customerName}</div>
                        <div className="text-[11px] text-slate-500">{item.customerPhone ?? '—'}</div>
                      </td>

                      <td className="py-3.5 px-3 font-mono text-slate-700">
                        {item.orderCode ? (
                          <span className="font-semibold text-brand">{item.orderCode}</span>
                        ) : (
                          <span className="text-slate-400">Không gắn đơn</span>
                        )}
                      </td>

                      <td className="py-3.5 px-3">
                        <span className="font-medium text-slate-700">{item.categoryLabel}</span>
                      </td>

                      <td className="py-3.5 px-3">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] border ${severityConfig.className}`}
                        >
                          {severityConfig.label}
                        </span>
                      </td>

                      <td className="py-3.5 px-3">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] border font-medium ${statusConfig.className}`}
                        >
                          {statusConfig.label}
                        </span>
                      </td>

                      <td className="py-3.5 px-3 text-slate-500 whitespace-nowrap">
                        {item.createdAtLabel}
                      </td>

                      <td className="py-3.5 px-3 text-right">
                        <span className="inline-flex items-center gap-0.5 text-xs font-semibold text-slate-600 group-hover:text-slate-900">
                          Xem <ChevronRight className="w-3.5 h-3.5" />
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Quick Drawer (Slide-in from Right) */}
      {selectedReport ? (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={`Tóm tắt khiếu nại ${selectedReport.ticketNumber}`}
          className="fixed inset-0 z-50 flex justify-end bg-slate-900/40 backdrop-blur-xs transition-opacity animate-in fade-in duration-200"
          onClick={() => setSelectedReport(null)}
        >
          <div
            className="h-full w-full max-w-md sm:max-w-lg bg-white shadow-2xl p-6 flex flex-col justify-between overflow-y-auto animate-in slide-in-from-right duration-250"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Drawer Header */}
            <div>
              <div className="flex items-center justify-between pb-4 border-b border-slate-100">
                <div>
                  <span className="font-mono text-xs font-bold text-slate-400 uppercase tracking-wide">
                    Tóm tắt khiếu nại
                  </span>
                  <h2 className="text-xl font-black text-slate-900 mt-0.5">
                    {selectedReport.ticketNumber}
                  </h2>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedReport(null)}
                  className="rounded-full p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors"
                  aria-label="Đóng bảng tóm tắt"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Status & Severity Bar */}
              <div className="flex flex-wrap items-center gap-2 mt-4">
                <span
                  className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs border font-medium ${
                    STATUS_BADGES[selectedReport.status]?.className ?? ''
                  }`}
                >
                  {selectedReport.statusLabel}
                </span>
                <span
                  className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs border font-bold ${
                    SEVERITY_BADGES[selectedReport.severity]?.className ?? ''
                  }`}
                >
                  Mức độ: {selectedReport.severityLabel}
                </span>
                <span className="text-xs text-slate-400 ml-auto">
                  {selectedReport.createdAtLabel}
                </span>
              </div>

              {/* Complaint Description */}
              <div className="mt-5 rounded-2xl bg-slate-50 p-4 border border-slate-100">
                <p className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">
                  Nội dung khiếu nại
                </p>
                <p className="text-xs font-semibold text-slate-800 mb-2">
                  Phân loại: {selectedReport.categoryLabel}
                </p>
                <p className="text-sm text-slate-700 leading-relaxed italic">
                  "{selectedReport.description}"
                </p>
                {selectedReport.photoUrls && selectedReport.photoUrls.length > 0 ? (
                  <div className="mt-3">
                    <p className="text-xs font-semibold text-slate-600 mb-1.5 flex items-center gap-1">
                      <Camera className="w-3.5 h-3.5 text-blue-600" /> Hình ảnh bằng chứng:
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {selectedReport.photoUrls.map((url, idx) => (
                        <a
                          key={idx}
                          href={url}
                          target="_blank"
                          rel="noreferrer"
                          className="block rounded-xl overflow-hidden border border-slate-200 hover:opacity-90"
                        >
                          <img
                            src={url}
                            alt="Bằng chứng khiếu nại"
                            className="w-16 h-16 object-cover"
                          />
                        </a>
                      ))}
                    </div>
                  </div>
                ) : null}
              </div>

              {/* Customer Information */}
              <div className="mt-4 rounded-2xl bg-white p-4 border border-slate-100 shadow-2xs">
                <p className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2 flex items-center gap-1">
                  <User className="w-3.5 h-3.5" /> Thông tin khách hàng
                </p>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <span className="text-slate-400 block">Họ và tên:</span>
                    <span className="font-semibold text-slate-800">{selectedReport.customerName}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block">Số điện thoại:</span>
                    <span className="font-semibold text-slate-800">
                      {selectedReport.customerPhone ?? 'Chưa cập nhật'}
                    </span>
                  </div>
                  {selectedReport.customerEmail ? (
                    <div className="col-span-2">
                      <span className="text-slate-400 block">Email:</span>
                      <span className="font-semibold text-slate-800 break-all">
                        {selectedReport.customerEmail}
                      </span>
                    </div>
                  ) : null}
                </div>
              </div>

              {/* Order Information */}
              {selectedReport.orderCode ? (
                <div className="mt-4 rounded-2xl bg-white p-4 border border-slate-100 shadow-2xs">
                  <p className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
                    Đơn hàng liên quan
                  </p>
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="font-mono text-sm font-bold text-slate-900 block">
                        {selectedReport.orderCode}
                      </span>
                      {selectedReport.driverName ? (
                        <span className="text-xs text-slate-500 block mt-0.5">
                          Tài xế: {selectedReport.driverName}
                        </span>
                      ) : null}
                    </div>
                    {selectedReport.orderId ? (
                      <Link
                        href={createAdminPreviewHref(
                          `/admin/orders/${selectedReport.orderId}`,
                          'order-detail',
                          previewContext,
                        )}
                        className="inline-flex items-center gap-1 text-xs font-semibold text-brand hover:underline"
                      >
                        Mở đơn <ExternalLink className="w-3 h-3" />
                      </Link>
                    ) : null}
                  </div>
                </div>
              ) : null}
            </div>

            {/* Quick Drawer Actions */}
            <div className="pt-6 border-t border-slate-100 flex flex-col gap-2 mt-6">
              <Link
                href={createAdminPreviewHref(
                  `/admin/reports/${selectedReport.id}`,
                  'report-detail',
                  previewContext,
                )}
                className="w-full flex items-center justify-center gap-2 rounded-2xl bg-slate-900 py-3 px-4 text-xs font-bold text-white shadow-xs hover:bg-slate-800 transition-colors"
              >
                Xem không gian xử lý đầy đủ
                <ExternalLink className="w-3.5 h-3.5" />
              </Link>
              <button
                type="button"
                onClick={() => setSelectedReport(null)}
                className="w-full rounded-2xl border border-slate-200 py-2.5 px-4 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition-colors"
              >
                Đóng tóm tắt
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
