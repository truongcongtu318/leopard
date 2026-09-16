'use client';

import { useCallback, useState } from 'react';
import Link from 'next/link';
import {
  AlertCircle,
  AlertTriangle,
  ArrowRight,
  Camera,
  CheckCircle2,
  Clock,
  ExternalLink,
  FileCheck2,
  History,
  MessageSquare,
  Package,
  Send,
  ShieldAlert,
  Truck,
  User,
  X,
} from 'lucide-react';

import { OperationsPageHeader } from '@leopard/ui';

import { browserClient } from '../../lib/api/browser-client';
import { ApiError } from '../../lib/api/api-error';
import { createAdminPreviewHref } from './adapter';
import type {
  AdminAuditEntryView,
  AdminPreviewContext,
  AdminReportDetailRouteView,
} from './model';
import {
  AdminAuditRail,
  AdminBoundaryState,
  AdminBreadcrumbs,
  AdminNotice,
  AdminSurface,
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

export function AdminReportDetailScreen({
  view,
  previewContext,
  commandRuntime,
}: Readonly<{
  view: AdminReportDetailRouteView;
  previewContext?: AdminPreviewContext | undefined;
  commandRuntime?: boolean | undefined;
}>) {
  if (view.kind !== 'report-detail') {
    return (
      <div className="flex flex-col gap-md">
        <OperationsPageHeader title="Chi tiết khiếu nại" />
        <AdminBoundaryState view={view} />
      </div>
    );
  }

  const { report } = view;
  const ticket = report.ticket;
  const order = report.order;
  const customer = report.customer;
  const driver = report.driver;

  // Local state
  const [internalNotes, setInternalNotes] = useState(report.internalNotes);
  const [newNote, setNewNote] = useState('');
  const [resolutionStatus, setResolutionStatus] = useState<'RESOLVED' | 'CLOSED'>('RESOLVED');
  const [resolutionNote, setResolutionNote] = useState('');
  const [isSubmittingResolution, setIsSubmittingResolution] = useState(false);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [previewPhotoUrl, setPreviewPhotoUrl] = useState<string | null>(null);
  const [auditEntries, setAuditEntries] = useState<readonly AdminAuditEntryView[]>(
    view.audit.entries,
  );
  const [currentStatus, setCurrentStatus] = useState(ticket.status);

  // Add internal note
  const handleAddInternalNote = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNote.trim()) return;

    const added = {
      id: `note-${Date.now()}`,
      author: 'Quản trị viên (Hiện tại)',
      note: newNote.trim(),
      createdAtLabel: 'Vừa xong',
    };
    setInternalNotes((prev) => [added, ...prev]);
    setNewNote('');
  };

  // Submit resolution
  const handleResolve = async (e: React.FormEvent) => {
    e.preventDefault();
    if (resolutionNote.trim().length < 5) {
      setActionError('Ghi chú giải quyết bắt buộc phải từ 5 ký tự trở lên.');
      return;
    }

    setIsSubmittingResolution(true);
    setActionError(null);
    setActionSuccess(null);

    try {
      if (commandRuntime) {
        await browserClient.post(`/admin/reports/${ticket.id}/resolve`, {
          status: resolutionStatus,
          resolutionNote: resolutionNote.trim(),
        });
      }

      setCurrentStatus(resolutionStatus);
      setActionSuccess(
        `Đã chuyển trạng thái khiếu nại thành "${
          resolutionStatus === 'RESOLVED' ? 'Đã giải quyết' : 'Đã đóng'
        }". Nhật ký kiểm toán đã được cập nhật.`,
      );

      // Append local audit entry
      const now = new Date();
      const newAudit: AdminAuditEntryView = {
        entity: 'audit',
        id: `aud-${Date.now()}`,
        outcomeLabel: 'Thành công',
        actionLabel: resolutionStatus === 'RESOLVED' ? 'Giải quyết khiếu nại' : 'Đóng khiếu nại',
        actorLabel: 'Quản trị viên',
        targetLabel: `${ticket.ticketNumber} · ${ticket.id}`,
        reason: resolutionNote.trim(),
        timestampLabel: 'Vừa xong',
        dateTime: now.toISOString(),
        requestId: `req-${Date.now()}`,
        auditId: `aud-${Date.now()}`,
      };
      setAuditEntries((prev) => [newAudit, ...prev]);
      setResolutionNote('');
    } catch (err) {
      setActionError(
        err instanceof ApiError
          ? err.message
          : 'Không thể xử lý khiếu nại lúc này. Vui lòng thử lại.',
      );
    } finally {
      setIsSubmittingResolution(false);
    }
  };

  const severityBadge = SEVERITY_BADGES[ticket.severity] || SEVERITY_BADGES.LOW!;
  const statusBadge = STATUS_BADGES[currentStatus] || STATUS_BADGES.OPEN!;

  return (
    <div className="flex min-w-0 flex-col gap-6">
      <AdminBreadcrumbs
        previewContext={previewContext}
        reportTicketNumber={ticket.ticketNumber}
        screen="report-detail"
      />

      <OperationsPageHeader
        title={`Không Gian Xử Lý: ${ticket.ticketNumber}`}
        updatedAt={ticket.updatedAtLabel}
      />

      {view.notice ? <AdminNotice notice={view.notice} /> : null}

      {actionSuccess ? (
        <div
          role="status"
          className="rounded-2xl border border-emerald-200 bg-emerald-50/90 p-4 text-xs font-semibold text-emerald-800 flex items-center gap-2 shadow-xs"
        >
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{actionSuccess}</span>
        </div>
      ) : null}

      {actionError ? (
        <div
          role="alert"
          className="rounded-2xl border border-rose-200 bg-rose-50/90 p-4 text-xs font-semibold text-rose-800 flex items-center gap-2 shadow-xs"
        >
          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
          <span>{actionError}</span>
        </div>
      ) : null}

      {/* Case Workspace 2-Column Bento Grid */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12 items-start">
        {/* ================= LEFT COLUMN: Complaint & Customer (7 cols) ================= */}
        <div className="flex flex-col gap-6 lg:col-span-7">
          {/* Header Summary Card */}
          <div className="rounded-3xl border border-slate-100 bg-white p-5 sm:p-6 shadow-xs">
            <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-slate-100">
              <div>
                <span className="font-mono text-xs font-bold uppercase tracking-wider text-slate-400">
                  Mã vé khiếu nại
                </span>
                <h2 className="text-2xl font-black text-slate-900">{ticket.ticketNumber}</h2>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <span
                  className={`inline-flex items-center px-3 py-1 rounded-full text-xs border ${severityBadge.className}`}
                >
                  Mức độ: {severityBadge.label}
                </span>
                <span
                  className={`inline-flex items-center px-3 py-1 rounded-full text-xs border font-medium ${statusBadge.className}`}
                >
                  {statusBadge.label}
                </span>
              </div>
            </div>

            {/* Description & Evidence */}
            <div className="mt-5">
              <div className="flex items-center justify-between text-xs text-slate-500 mb-2">
                <span className="font-semibold text-slate-800">
                  Phân loại: {ticket.categoryLabel}
                </span>
                <span>Gửi lúc: {ticket.createdAtLabel}</span>
              </div>
              <blockquote className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-700 italic border-l-4 border-slate-400 leading-relaxed">
                "{ticket.description}"
              </blockquote>

              {/* Photos Gallery */}
              {ticket.photoUrls && ticket.photoUrls.length > 0 ? (
                <div className="mt-4">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5 mb-2">
                    <Camera className="w-3.5 h-3.5 text-blue-600" /> Bằng chứng hình ảnh ({ticket.photoUrls.length}):
                  </span>
                  <div className="flex flex-wrap gap-3">
                    {ticket.photoUrls.map((url, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => setPreviewPhotoUrl(url)}
                        className="group relative h-24 w-24 overflow-hidden rounded-2xl border border-slate-200 shadow-2xs hover:ring-2 hover:ring-slate-900 focus:outline-none"
                      >
                        <img
                          src={url}
                          alt="Bằng chứng khiếu nại"
                          className="h-full w-full object-cover transition-transform group-hover:scale-105"
                        />
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                <p className="mt-3 text-xs text-slate-400 italic">
                  Không có hình ảnh đính kèm từ khách hàng.
                </p>
              )}
            </div>
          </div>

          {/* Customer Card */}
          <div className="rounded-3xl border border-slate-100 bg-white p-5 sm:p-6 shadow-xs">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3 flex items-center gap-1.5">
              <User className="w-4 h-4 text-slate-500" /> Thông tin khách hàng phản ánh
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div>
                <span className="text-slate-400 block mb-0.5">Họ và tên:</span>
                <span className="text-sm font-bold text-slate-900">{customer.name}</span>
              </div>
              <div>
                <span className="text-slate-400 block mb-0.5">Số điện thoại:</span>
                <span className="text-sm font-bold text-slate-900 font-mono">
                  {customer.phone ?? '—'}
                </span>
              </div>
              <div className="sm:col-span-2">
                <span className="text-slate-400 block mb-0.5">Email liên hệ:</span>
                <span className="text-xs font-medium text-slate-800">
                  {customer.email ?? 'Chưa cung cấp'}
                </span>
              </div>
            </div>
          </div>

          {/* Internal Investigation Notes */}
          <div className="rounded-3xl border border-slate-100 bg-white p-5 sm:p-6 shadow-xs">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-4 flex items-center gap-1.5">
              <MessageSquare className="w-4 h-4 text-slate-500" /> Ghi chú điều tra nội bộ
            </h3>

            {/* Notes List */}
            <div className="space-y-3 mb-5 max-h-80 overflow-y-auto pr-1">
              {internalNotes.map((note) => (
                <div
                  key={note.id}
                  className="rounded-2xl bg-slate-50/80 p-3.5 border border-slate-100/80 text-xs"
                >
                  <div className="flex items-center justify-between font-semibold text-slate-800 mb-1">
                    <span>{note.author}</span>
                    <span className="text-[11px] text-slate-400 font-normal">
                      {note.createdAtLabel}
                    </span>
                  </div>
                  <p className="text-slate-600 leading-relaxed">{note.note}</p>
                </div>
              ))}
            </div>

            {/* Add Note Form */}
            <form onSubmit={handleAddInternalNote} className="flex flex-col gap-2">
              <textarea
                value={newNote}
                onChange={(e) => setNewNote(e.target.value)}
                placeholder="Thêm ghi chú điều tra nội bộ (chỉ hiển thị cho điều phối & CSKH)..."
                rows={3}
                className="w-full rounded-2xl border border-slate-200 bg-slate-50/50 p-3 text-xs text-slate-900 placeholder:text-slate-400 focus:border-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-slate-900/10"
              />
              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={!newNote.trim()}
                  className="inline-flex items-center gap-1.5 rounded-full bg-slate-900 px-4 py-2 text-xs font-bold text-white hover:bg-slate-800 disabled:opacity-40 transition-colors shadow-2xs"
                >
                  <Send className="w-3 h-3" /> Gửi ghi chú
                </button>
              </div>
            </form>
          </div>
        </div>

        {/* ================= RIGHT COLUMN: Related Order & Resolution (5 cols) ================= */}
        <div className="flex flex-col gap-6 lg:col-span-5">
          {/* Related Order Context Card */}
          <div className="rounded-3xl border border-slate-100 bg-white p-5 sm:p-6 shadow-xs">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <Package className="w-4 h-4 text-slate-500" /> Ngữ cảnh đơn hàng liên quan
              </span>
              {order ? (
                <Link
                  href={createAdminPreviewHref(
                    `/admin/orders/${order.id}`,
                    'order-detail',
                    previewContext,
                  )}
                  className="inline-flex items-center gap-1 text-xs font-semibold text-brand hover:underline normal-case"
                >
                  Xem chi tiết <ExternalLink className="w-3 h-3" />
                </Link>
              ) : null}
            </h3>

            {order ? (
              <div className="space-y-4 text-xs">
                <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                  <div>
                    <span className="font-mono text-sm font-bold text-slate-900 block">
                      {order.code}
                    </span>
                    <span className="text-slate-500 text-[11px] block mt-0.5">
                      Cước phí: {order.priceLabel}
                    </span>
                  </div>
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                    {order.statusLabel}
                  </span>
                </div>

                {/* Route */}
                <div>
                  <span className="text-slate-400 font-medium block mb-1">Lộ trình vận chuyển:</span>
                  <div className="space-y-1.5 pl-2 border-l-2 border-slate-200">
                    <div className="flex items-start gap-2">
                      <span className="h-2 w-2 rounded-full bg-emerald-500 mt-1 shrink-0" />
                      <div>
                        <span className="text-slate-400 text-[10px] block">Điểm nhận:</span>
                        <p className="font-semibold text-slate-800 leading-tight">{order.pickupAddress}</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-2">
                      <span className="h-2 w-2 rounded-full bg-rose-500 mt-1 shrink-0" />
                      <div>
                        <span className="text-slate-400 text-[10px] block">Điểm giao:</span>
                        <p className="font-semibold text-slate-800 leading-tight">{order.dropoffAddress}</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Assigned Driver */}
                {driver ? (
                  <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                    <div>
                      <span className="text-slate-400 text-[10px] block">Tài xế giao hàng:</span>
                      <span className="font-bold text-slate-900 block">{driver.name}</span>
                      <span className="text-slate-500 font-mono text-[11px] block">
                        {driver.phone ?? '—'}
                      </span>
                    </div>
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-slate-50 border border-slate-200 text-[11px] text-slate-700">
                      <Truck className="w-3.5 h-3.5 text-slate-500" />
                      {driver.vehicleType ?? 'Xe giao nhận'}
                    </span>
                  </div>
                ) : null}

                {/* Order Timeline */}
                {order.timeline && order.timeline.length > 0 ? (
                  <div className="pt-2 border-t border-slate-100">
                    <span className="text-slate-400 text-[10px] font-semibold uppercase tracking-wider block mb-2">
                      Lịch sử hành trình:
                    </span>
                    <div className="space-y-2">
                      {order.timeline.map((step) => (
                        <div key={step.id} className="flex items-center justify-between text-[11px]">
                          <span className="font-medium text-slate-700">{step.label}</span>
                          <span className="text-slate-400">{step.timestampLabel}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : null}
              </div>
            ) : (
              <p className="text-xs text-slate-400 italic py-3">
                Khiếu nại này được gửi độc lập, không gắn với mã đơn hàng cụ thể nào.
              </p>
            )}
          </div>

          {/* Resolution Box Bento Card */}
          <div className="rounded-3xl border border-slate-100 bg-white p-5 sm:p-6 shadow-xs">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3 flex items-center gap-1.5">
              <FileCheck2 className="w-4 h-4 text-emerald-600" /> Khung giải quyết khiếu nại (Resolution)
            </h3>
            <p className="text-xs text-slate-500 mb-4">
              Xác nhận kết quả xử lý thỏa đáng cho khách hàng hoặc đóng khiếu nại sau khi đối soát.
            </p>

            <form onSubmit={handleResolve} className="space-y-4">
              {/* Select Resolution Status */}
              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1.5">
                  Trạng thái giải quyết:
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setResolutionStatus('RESOLVED')}
                    className={`rounded-2xl p-3 text-left border transition-all text-xs ${
                      resolutionStatus === 'RESOLVED'
                        ? 'border-emerald-500 bg-emerald-50/70 text-emerald-900 font-bold ring-2 ring-emerald-500/20'
                        : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center gap-1.5 mb-0.5">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Đã giải quyết</span>
                    </div>
                    <span className="text-[10px] text-slate-500 font-normal block">
                      Đã đền bù / bồi hoàn / xử lý thỏa đáng
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setResolutionStatus('CLOSED')}
                    className={`rounded-2xl p-3 text-left border transition-all text-xs ${
                      resolutionStatus === 'CLOSED'
                        ? 'border-slate-800 bg-slate-100 text-slate-900 font-bold ring-2 ring-slate-800/20'
                        : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center gap-1.5 mb-0.5">
                      <X className="w-3.5 h-3.5 text-slate-600" />
                      <span>Đóng khiếu nại</span>
                    </div>
                    <span className="text-[10px] text-slate-500 font-normal block">
                      Khiếu nại không hợp lệ / khách huỷ
                    </span>
                  </button>
                </div>
              </div>

              {/* Resolution Note Textarea */}
              <div>
                <label htmlFor="resolutionNote" className="text-xs font-semibold text-slate-700 block mb-1.5">
                  Ghi chú kết quả xử lý <span className="text-rose-500">* (tối thiểu 5 ký tự)</span>:
                </label>
                <textarea
                  id="resolutionNote"
                  value={resolutionNote}
                  onChange={(e) => setResolutionNote(e.target.value)}
                  placeholder="Mô tả hướng xử lý (ví dụ: Đã hoàn 50.000đ tiền hàng cho khách qua ví, lập biên bản nhắc nhở tài xế)..."
                  rows={4}
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50/50 p-3 text-xs text-slate-900 placeholder:text-slate-400 focus:border-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-slate-900/10"
                />
              </div>

              <button
                type="submit"
                disabled={isSubmittingResolution || resolutionNote.trim().length < 5}
                className="w-full rounded-2xl bg-slate-900 py-3 px-4 text-xs font-bold text-white shadow-xs hover:bg-slate-800 disabled:opacity-40 transition-colors flex items-center justify-center gap-2"
              >
                {isSubmittingResolution ? (
                  <>Đang ghi nhận...</>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    Xác nhận giải quyết khiếu nại
                  </>
                )}
              </button>
            </form>
          </div>

          {/* Audit Rail Card */}
          <div className="rounded-3xl border border-slate-100 bg-white p-5 sm:p-6 shadow-xs">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3 flex items-center gap-1.5">
              <History className="w-4 h-4 text-slate-500" /> Nhật ký kiểm toán vụ việc
            </h3>
            {auditEntries.length === 0 ? (
              <p className="text-xs text-slate-400 italic">Chưa có bản ghi kiểm toán nào.</p>
            ) : (
              <div className="space-y-3">
                {auditEntries.map((entry) => (
                  <div
                    key={entry.id}
                    className="rounded-2xl bg-slate-50 p-3 border border-slate-100 text-xs"
                  >
                    <div className="flex items-center justify-between font-semibold text-slate-800 mb-1">
                      <span>{entry.actionLabel}</span>
                      <span className="text-[11px] text-slate-400 font-normal">
                        {entry.timestampLabel}
                      </span>
                    </div>
                    <p className="text-slate-600 mb-1">{entry.reason}</p>
                    <div className="flex items-center justify-between text-[10px] text-slate-400">
                      <span>Thực hiện: {entry.actorLabel}</span>
                      <span className="font-mono">{entry.requestId}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Photo Zoom Modal */}
      {previewPhotoUrl ? (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/80 p-4 backdrop-blur-xs"
          onClick={() => setPreviewPhotoUrl(null)}
        >
          <div
            className="relative max-w-2xl max-h-[85vh] overflow-hidden rounded-3xl bg-white p-2 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setPreviewPhotoUrl(null)}
              className="absolute top-4 right-4 rounded-full bg-slate-900/60 p-2 text-white hover:bg-slate-900 transition-colors"
              aria-label="Đóng ảnh phóng to"
            >
              <X className="w-5 h-5" />
            </button>
            <img
              src={previewPhotoUrl}
              alt="Bằng chứng khiếu nại phóng to"
              className="max-h-[80vh] w-auto rounded-2xl object-contain"
            />
          </div>
        </div>
      ) : null}
    </div>
  );
}
