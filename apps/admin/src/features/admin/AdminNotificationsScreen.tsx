'use client';

import { useId, useMemo, useState } from 'react';
import {
  AlertTriangle,
  Bell,
  CheckCircle2,
  ChevronRight,
  Filter,
  History,
  Info,
  Radio,
  Search,
  Send,
  Smartphone,
  Sparkles,
  Users,
  X,
} from 'lucide-react';

import { OperationsPageHeader } from '@leopard/ui';

import { browserClient } from '../../lib/api/browser-client';
import { ApiError } from '../../lib/api/api-error';
import type {
  AdminBroadcastAudience,
  AdminBroadcastLogItemView,
  AdminBroadcastType,
  AdminNotificationsRouteView,
  AdminPreviewContext,
} from './model';
import {
  AdminBoundaryState,
  AdminBreadcrumbs,
  AdminNotice,
  AdminSurface,
} from './AdminShared';

const AUDIENCE_CONFIG: Record<
  AdminBroadcastAudience,
  { label: string; count: number; desc: string }
> = {
  ALL: { label: 'Tất cả', count: 3192, desc: 'Toàn bộ khách hàng và đối tác tài xế' },
  DRIVER: { label: 'Tài xế', count: 1842, desc: 'Tất cả đối tác tài xế đang hoạt động' },
  CUSTOMER: { label: 'Khách hàng', count: 1350, desc: 'Tất cả khách hàng đã đăng ký' },
};

const TYPE_CONFIG: Record<AdminBroadcastType, { label: string; tone: string }> = {
  SYSTEM: { label: 'Hệ thống', tone: 'bg-slate-100 text-slate-700 border-slate-200' },
  PROMO: { label: 'Khuyến mãi', tone: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  ORDER: { label: 'Vận hành', tone: 'bg-blue-50 text-blue-700 border-blue-200' },
};

export function AdminNotificationsScreen({
  view,
  previewContext,
  commandRuntime,
}: Readonly<{
  view: AdminNotificationsRouteView;
  previewContext?: AdminPreviewContext | undefined;
  commandRuntime?: boolean | undefined;
}>) {
  const titleInputId = useId();
  const bodyInputId = useId();
  const searchInputId = useId();

  if (view.kind !== 'notifications') {
    return (
      <div className="flex flex-col gap-md">
        <OperationsPageHeader title="Thông Báo & Broadcast" />
        <AdminBoundaryState view={view} />
      </div>
    );
  }

  // Compose State
  const [audience, setAudience] = useState<AdminBroadcastAudience>('DRIVER');
  const [type, setType] = useState<AdminBroadcastType>('SYSTEM');
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');

  // Confirmation Modal State
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  // History State
  const [logs, setLogs] = useState<readonly AdminBroadcastLogItemView[]>(view.broadcastLogs);
  const [searchQuery, setSearchQuery] = useState('');

  const filteredLogs = useMemo(() => {
    if (!searchQuery.trim()) return logs;
    const q = searchQuery.toLowerCase();
    return logs.filter(
      (l) =>
        l.title.toLowerCase().includes(q) ||
        l.body.toLowerCase().includes(q) ||
        l.audienceLabel.toLowerCase().includes(q) ||
        l.createdByName.toLowerCase().includes(q),
    );
  }, [logs, searchQuery]);

  const audienceEstimatedReach = AUDIENCE_CONFIG[audience].count;

  const handleOpenConfirm = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedTitle = title.trim();
    const trimmedBody = body.trim();

    if (trimmedTitle.length < 5 || trimmedTitle.length > 200) {
      setActionError('Tiêu đề thông báo phải từ 5 đến 200 ký tự.');
      return;
    }
    if (trimmedBody.length < 10 || trimmedBody.length > 2000) {
      setActionError('Nội dung thông báo phải từ 10 đến 2000 ký tự.');
      return;
    }
    setActionError(null);
    setShowConfirmModal(true);
  };

  const handleSendBroadcast = async () => {
    setIsSubmitting(true);
    setActionError(null);

    const clientRequestId = `bcast-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

    if (commandRuntime) {
      try {
        await browserClient.post('/admin/notifications/broadcast', {
          audience,
          type,
          title: title.trim(),
          body: body.trim(),
          clientRequestId,
        });

        const newLog: AdminBroadcastLogItemView = {
          id: clientRequestId,
          audience,
          audienceLabel: AUDIENCE_CONFIG[audience].label,
          type,
          typeLabel: TYPE_CONFIG[type].label,
          title: title.trim(),
          body: body.trim(),
          sentCount: audienceEstimatedReach,
          createdAtLabel: 'Vừa xong',
          createdByName: 'Bạn (Admin)',
        };

        setLogs([newLog, ...logs]);
        setActionSuccess(
          `Đã phát sóng thông báo thành công tới khoảng ${audienceEstimatedReach.toLocaleString('vi-VN')} thiết bị. Mã yêu cầu: ${clientRequestId}`,
        );
        setTitle('');
        setBody('');
        setShowConfirmModal(false);
      } catch (err: unknown) {
        const message = err instanceof ApiError ? err.message : 'Không thể phát sóng thông báo.';
        setActionError(message);
      } finally {
        setIsSubmitting(false);
      }
    } else {
      // Preview mode simulation
      const newLog: AdminBroadcastLogItemView = {
        id: clientRequestId,
        audience,
        audienceLabel: AUDIENCE_CONFIG[audience].label,
        type,
        typeLabel: TYPE_CONFIG[type].label,
        title: title.trim(),
        body: body.trim(),
        sentCount: audienceEstimatedReach,
        createdAtLabel: 'Vừa xong',
        createdByName: 'Quản trị viên (Mô phỏng)',
      };

      setLogs([newLog, ...logs]);
      setActionSuccess(
        `[Mô phỏng] Đã phát sóng thông báo thành công tới khoảng ${audienceEstimatedReach.toLocaleString('vi-VN')} thiết bị.`,
      );
      setTitle('');
      setBody('');
      setShowConfirmModal(false);
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Top Header & Breadcrumbs */}
      <div>
        <AdminBreadcrumbs previewContext={previewContext} screen="notifications" />
        <OperationsPageHeader
          title="Thông Báo & Broadcast Push"
          context="Soạn thảo, xem trước trực quan và phát thông báo diện rộng tới khách hàng, tài xế và chủ đội xe"
        />
      </div>

      {view.notice ? <AdminNotice notice={view.notice} /> : null}

      {/* Success / Error Alerts */}
      {actionSuccess ? (
        <div
          role="status"
          className="flex items-start gap-3 rounded-2xl border border-emerald-200/80 bg-emerald-50/90 p-4 text-sm text-emerald-800 shadow-xs"
        >
          <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-600 mt-0.5" />
          <div className="flex-1 font-medium">{actionSuccess}</div>
          <button
            type="button"
            onClick={() => setActionSuccess(null)}
            className="text-emerald-600 hover:text-emerald-900"
            aria-label="Đóng thông báo thành công"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      ) : null}

      {actionError ? (
        <div
          role="alert"
          className="flex items-start gap-3 rounded-2xl border border-rose-200/80 bg-rose-50/90 p-4 text-sm text-rose-800 shadow-xs"
        >
          <AlertTriangle className="h-5 w-5 shrink-0 text-rose-600 mt-0.5" />
          <div className="flex-1 font-medium">{actionError}</div>
          <button
            type="button"
            onClick={() => setActionError(null)}
            className="text-rose-600 hover:text-rose-900"
            aria-label="Đóng thông báo lỗi"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      ) : null}

      {/* 4 Bento KPI Metric Strip */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="rounded-3xl border border-black/[0.06] bg-white p-5 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Tổng Broadcast</span>
            <Radio className="h-4 w-4 text-brand" />
          </div>
          <div className="text-2xl font-black text-slate-900">{view.totalSentBroadcasts}</div>
          <div className="text-xs text-slate-500 mt-1">Chiến dịch đã gửi</div>
        </div>

        <div className="rounded-3xl border border-black/[0.06] bg-white p-5 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Lượt Tiếp Cận</span>
            <Users className="h-4 w-4 text-indigo-600" />
          </div>
          <div className="text-2xl font-black text-slate-900">
            {view.totalAudienceReach.toLocaleString('vi-VN')}
          </div>
          <div className="text-xs text-slate-500 mt-1">Lượt nhận tích lũy</div>
        </div>

        <div className="rounded-3xl border border-black/[0.06] bg-white p-5 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Đội Ngũ Tài Xế</span>
            <Smartphone className="h-4 w-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-black text-slate-900">
            {view.audienceCounts.DRIVER.toLocaleString('vi-VN')}
          </div>
          <div className="text-xs text-slate-500 mt-1">Đối tác tài xế sẵn sàng</div>
        </div>

        <div className="rounded-3xl border border-black/[0.06] bg-white p-5 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Khách Hàng</span>
            <Bell className="h-4 w-4 text-amber-600" />
          </div>
          <div className="text-2xl font-black text-slate-900">
            {view.audienceCounts.CUSTOMER.toLocaleString('vi-VN')}
          </div>
          <div className="text-xs text-slate-500 mt-1">Tài khoản khách hàng</div>
        </div>
      </div>

      {/* Main Workflow: Staged Bento 2-Column (Compose & Live Preview) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column (Compose Form: 7 cols) */}
        <div className="lg:col-span-7">
          <AdminSurface
            title="Soạn Thảo Thông Báo"
            description="Thiết lập nhóm đối tượng và thông điệp broadcast tức thời"
            icon={<Sparkles className="h-5 w-5 text-brand" />}
          >
            <form onSubmit={handleOpenConfirm} className="space-y-5">
              {/* Audience Selector */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                  Nhóm đối tượng nhận thông báo
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {(Object.keys(AUDIENCE_CONFIG) as AdminBroadcastAudience[]).map((key) => {
                    const cfg = AUDIENCE_CONFIG[key];
                    const isSelected = audience === key;
                    return (
                      <button
                        key={key}
                        type="button"
                        onClick={() => setAudience(key)}
                        className={`flex flex-col items-start p-3 rounded-2xl border text-left transition-all ${
                          isSelected
                            ? 'bg-slate-900 text-white border-slate-900 shadow-sm'
                            : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100/80'
                        }`}
                      >
                        <span className="text-xs font-bold">{cfg.label}</span>
                        <span
                          className={`text-[11px] mt-0.5 ${
                            isSelected ? 'text-slate-300' : 'text-slate-500'
                          }`}
                        >
                          ~{cfg.count.toLocaleString('vi-VN')}
                        </span>
                      </button>
                    );
                  })}
                </div>
                <p className="text-xs text-slate-500 mt-2 flex items-center gap-1.5">
                  <Info className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                  {AUDIENCE_CONFIG[audience].desc}
                </p>
              </div>

              {/* Type Selector */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                  Phân loại thông báo
                </label>
                <div className="flex flex-wrap gap-2">
                  {(Object.keys(TYPE_CONFIG) as AdminBroadcastType[]).map((key) => {
                    const cfg = TYPE_CONFIG[key];
                    const isSelected = type === key;
                    return (
                      <button
                        key={key}
                        type="button"
                        onClick={() => setType(key)}
                        className={`px-3.5 py-1.5 rounded-full text-xs font-semibold border transition-all ${
                          isSelected
                            ? 'bg-slate-900 text-white border-slate-900 shadow-xs'
                            : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                        }`}
                      >
                        {cfg.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Title Field */}
              <div>
                <label
                  htmlFor={titleInputId}
                  className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5"
                >
                  Tiêu đề thông báo <span className="text-rose-500">*</span>
                </label>
                <input
                  id={titleInputId}
                  type="text"
                  required
                  maxLength={200}
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Ví dụ: Cập nhật chính sách an toàn mùa mưa..."
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50/60 px-4 py-2.5 text-sm text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-slate-900 transition-colors"
                />
                <div className="flex justify-between text-[11px] text-slate-400 mt-1">
                  <span>Tối thiểu 5 ký tự</span>
                  <span>{title.length}/200</span>
                </div>
              </div>

              {/* Body Field */}
              <div>
                <label
                  htmlFor={bodyInputId}
                  className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5"
                >
                  Nội dung chi tiết <span className="text-rose-500">*</span>
                </label>
                <textarea
                  id={bodyInputId}
                  required
                  rows={4}
                  maxLength={2000}
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  placeholder="Nhập nội dung push notification gửi trực tiếp tới màn hình khóa của người dùng..."
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50/60 px-4 py-2.5 text-sm text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-slate-900 transition-colors"
                />
                <div className="flex justify-between text-[11px] text-slate-400 mt-1">
                  <span>Tối thiểu 10 ký tự</span>
                  <span>{body.length}/2000</span>
                </div>
              </div>

              {/* Submit CTA */}
              <div className="pt-2 flex justify-end">
                <button
                  type="submit"
                  className="inline-flex items-center gap-2 rounded-2xl bg-slate-900 px-6 py-3 text-sm font-semibold text-white shadow-sm hover:bg-slate-800 transition-colors"
                >
                  <Send className="h-4 w-4" />
                  Xem trước & Xác nhận phát sóng
                </button>
              </div>
            </form>
          </AdminSurface>
        </div>

        {/* Right Column (Live Push Preview & Audience Reach: 5 cols) */}
        <div className="lg:col-span-5 space-y-6">
          <AdminSurface
            title="Xem Trước Push Notification"
            description="Mô phỏng hiển thị trên thiết bị di động thực tế"
            icon={<Smartphone className="h-5 w-5 text-indigo-600" />}
          >
            {/* Phone Lockscreen Card */}
            <div className="rounded-3xl border border-slate-200/80 bg-slate-100 p-4 shadow-inner">
              <div className="text-center text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-3">
                Màn hình khóa / Banner Thông báo
              </div>

              {/* Mock iOS / Android Notification Card */}
              <div className="rounded-2xl border border-white/80 bg-white/90 p-4 shadow-sm backdrop-blur-md">
                <div className="flex items-center justify-between gap-2 mb-2">
                  <div className="flex items-center gap-2">
                    <div className="h-5 w-5 rounded-md bg-slate-900 text-white flex items-center justify-center text-[10px] font-black">
                      LP
                    </div>
                    <span className="text-xs font-bold text-slate-900">LEOPARD</span>
                    <span
                      className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${
                        TYPE_CONFIG[type].tone
                      }`}
                    >
                      {TYPE_CONFIG[type].label}
                    </span>
                  </div>
                  <span className="text-[11px] text-slate-400">Vừa xong</span>
                </div>

                <div className="text-sm font-bold text-slate-900 leading-snug">
                  {title.trim() ? title : 'Tiêu đề thông báo của bạn sẽ xuất hiện tại đây'}
                </div>

                <div className="text-xs text-slate-600 mt-1 leading-relaxed line-clamp-3">
                  {body.trim()
                    ? body
                    : 'Nội dung thông báo đầy đủ sẽ được người dùng đọc thấy ngay trên màn hình khóa điện thoại.'}
                </div>
              </div>
            </div>

            {/* Audience Summary Box */}
            <div className="mt-5 rounded-2xl border border-blue-200/80 bg-blue-50/70 p-4 text-xs text-blue-900 space-y-2">
              <div className="flex items-center gap-2 font-bold text-blue-950">
                <Users className="h-4 w-4 text-blue-700" />
                Ước tính quy mô tiếp cận
              </div>
              <p className="leading-relaxed">
                Thông báo sẽ được chuyển tiếp tới{' '}
                <strong className="text-slate-900 font-bold">
                  khoảng {audienceEstimatedReach.toLocaleString('vi-VN')}
                </strong>{' '}
                tài khoản thuộc nhóm <strong>{AUDIENCE_CONFIG[audience].label}</strong>.
              </p>
              <div className="text-[11px] text-blue-800/80 pt-1 border-t border-blue-200/60">
                Toàn bộ thao tác gửi được ghi nhận vào Nhật Ký Kiểm Toán (`AuditLog`) kèm mã yêu cầu
                duy nhất để đảm bảo tính minh bạch.
              </div>
            </div>
          </AdminSurface>
        </div>
      </div>

      {/* Broadcast History Table */}
      <AdminSurface
        title="Lịch Sử Broadcast Đã Phát"
        description="Danh sách các thông điệp thông báo diện rộng đã phát hành trong hệ thống"
        icon={<History className="h-5 w-5 text-slate-700" />}
      >
        <div className="mb-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="relative w-full sm:w-80">
            <Search className="h-4 w-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              id={searchInputId}
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Tìm kiếm theo tiêu đề, nội dung..."
              className="w-full rounded-2xl border border-slate-200 bg-slate-50/60 pl-10 pr-4 py-2 text-xs text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-slate-900 transition-colors"
            />
          </div>
          <div className="text-xs font-semibold text-slate-500">
            Hiển thị {filteredLogs.length} / {logs.length} bản ghi
          </div>
        </div>

        {filteredLogs.length === 0 ? (
          <div className="text-center py-10 text-slate-400 text-sm">
            Không tìm thấy thông báo broadcast nào phù hợp.
          </div>
        ) : (
          <div className="overflow-x-auto rounded-2xl border border-slate-100">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/80 font-bold text-slate-600 uppercase tracking-wider text-[11px]">
                  <th className="py-3 px-4">Thời gian</th>
                  <th className="py-3 px-4">Đối tượng</th>
                  <th className="py-3 px-4">Tiêu đề & Nội dung</th>
                  <th className="py-3 px-4 text-right">Lượt gửi</th>
                  <th className="py-3 px-4">Người thực hiện</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredLogs.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="py-3 px-4 whitespace-nowrap font-medium text-slate-500">
                      {item.createdAtLabel}
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap">
                      <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-semibold bg-slate-100 text-slate-800 border border-slate-200">
                        {item.audienceLabel}
                      </span>
                    </td>
                    <td className="py-3 px-4 max-w-md">
                      <div className="font-bold text-slate-900 line-clamp-1">{item.title}</div>
                      <div className="text-slate-500 text-[11px] line-clamp-2 mt-0.5">
                        {item.body}
                      </div>
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap text-right font-mono font-bold text-slate-900">
                      {item.sentCount.toLocaleString('vi-VN')}
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap text-slate-600 font-medium">
                      {item.createdByName}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </AdminSurface>

      {/* Confirmation Modal */}
      {showConfirmModal ? (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="confirm-modal-title"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm"
        >
          <div className="w-full max-w-lg rounded-3xl bg-white p-6 shadow-2xl border border-slate-100 space-y-5 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <div className="h-10 w-10 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center">
                  <AlertTriangle className="h-5 w-5" />
                </div>
                <div>
                  <h3 id="confirm-modal-title" className="text-base font-bold text-slate-900">
                    Xác Nhận Phát Sóng Broadcast
                  </h3>
                  <p className="text-xs text-slate-500">
                    Hành động này sẽ gửi thông báo đẩy tới thiết bị người dùng
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowConfirmModal(false)}
                className="text-slate-400 hover:text-slate-700 p-1"
                aria-label="Đóng modal"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="rounded-2xl border border-slate-200/80 bg-slate-50 p-4 space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-500">Đối tượng mục tiêu:</span>
                <span className="font-bold text-slate-900">
                  {AUDIENCE_CONFIG[audience].label} (~{audienceEstimatedReach.toLocaleString('vi-VN')} người)
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Phân loại:</span>
                <span className="font-semibold text-slate-900">{TYPE_CONFIG[type].label}</span>
              </div>
              <div className="pt-2 border-t border-slate-200/60">
                <span className="text-slate-500 block mb-1">Tiêu đề:</span>
                <span className="font-bold text-slate-900 block">{title}</span>
              </div>
              <div className="pt-2 border-t border-slate-200/60">
                <span className="text-slate-500 block mb-1">Nội dung:</span>
                <span className="text-slate-700 block leading-relaxed">{body}</span>
              </div>
            </div>

            <div className="rounded-2xl bg-amber-50/80 border border-amber-200 p-3 text-xs text-amber-900 flex items-start gap-2">
              <Info className="h-4 w-4 text-amber-700 shrink-0 mt-0.5" />
              <span>
                Thông báo đã phát sóng không thể thu hồi. Vui lòng kiểm tra kỹ chính tả và nội dung
                trước khi gửi.
              </span>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowConfirmModal(false)}
                disabled={isSubmitting}
                className="rounded-2xl border border-slate-200 px-5 py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-50 transition-colors"
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                onClick={handleSendBroadcast}
                disabled={isSubmitting}
                className="inline-flex items-center gap-2 rounded-2xl bg-slate-900 px-6 py-2.5 text-xs font-bold text-white shadow-sm hover:bg-slate-800 disabled:opacity-50 transition-colors"
              >
                {isSubmitting ? (
                  <>Đang phát sóng...</>
                ) : (
                  <>
                    <Send className="h-3.5 w-3.5" />
                    Xác nhận & Phát sóng
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
