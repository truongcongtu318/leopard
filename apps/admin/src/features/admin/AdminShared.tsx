import {
  OperationalAlert,
  ScreenState,
  type OperationalAlertTone,
} from '@leopard/ui';
import { LayoutGrid } from 'lucide-react';
import type { ReactNode } from 'react';

import type {
  AdminAuditRailView,
  AdminBoundaryView,
  AdminListScreen,
  AdminNoticeView,
  AdminPreviewContext,
} from './model';
import { createAdminPreviewHref } from './adapter';

export function AdminBoundaryState({ view }: Readonly<{ view: AdminBoundaryView }>) {
  return <ScreenState message={view.message} state={view.kind} title={view.title} />;
}

export function AdminNotice({ notice }: Readonly<{ notice: AdminNoticeView }>) {
  const tone: OperationalAlertTone = notice.tone;
  return (
    <OperationalAlert
      live={notice.tone === 'danger' ? 'assertive' : 'polite'}
      title={notice.title}
      tone={tone}
    >
      <p>{notice.message}</p>
      {notice.requestId ? (
        <p className="mt-xxs font-mono text-xs break-all">Mã yêu cầu: {notice.requestId}</p>
      ) : null}
    </OperationalAlert>
  );
}

const listLabel: Readonly<Record<AdminListScreen, string>> = {
  orders: 'Đơn hàng',
  users: 'Người dùng',
  fleets: 'Đội xe',
  drivers: 'Tài xế',
};

export function AdminBreadcrumbs({
  screen,
  orderReference,
  previewContext,
}: Readonly<{
  screen: AdminListScreen | 'order-detail';
  orderReference?: string;
  previewContext?: AdminPreviewContext | undefined;
}>) {
  return (
    <nav aria-label="Đường dẫn" className="text-xs text-neutral-muted">
      <ol className="m-0 flex flex-wrap items-center gap-1.5 p-0">
        <li className="list-none">
          <a
            className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-slate-600 hover:text-brand hover:bg-white/80 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand font-medium motion-reduce:transition-none"
            href={createAdminPreviewHref('/admin', 'overview', previewContext)}
          >
            <LayoutGrid className="w-3 h-3" strokeWidth={2} aria-hidden="true" />
            Tổng quan
          </a>
        </li>
        <li aria-hidden="true" className="list-none text-slate-300">/</li>
        {screen === 'order-detail' ? (
          <>
            <li className="list-none">
              <a
                className="inline-flex items-center rounded-lg px-2.5 py-1 text-slate-600 hover:text-brand hover:bg-white/80 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand font-medium motion-reduce:transition-none"
                href={createAdminPreviewHref('/admin/orders', 'orders', previewContext)}
              >
                Đơn hàng
              </a>
            </li>
            <li aria-hidden="true" className="list-none text-slate-300">/</li>
            <li aria-current="page" className="list-none font-bold text-slate-800 px-2.5 py-1 break-all bg-white/70 rounded-lg shadow-2xs border border-white/60">
              {orderReference}
            </li>
          </>
        ) : (
          <li aria-current="page" className="list-none font-bold text-slate-800 px-2.5 py-1 bg-white/70 rounded-lg shadow-2xs border border-white/60">
            {listLabel[screen]}
          </li>
        )}
      </ol>
    </nav>
  );
}

export function AdminSurface({
  title,
  description,
  children,
  className = '',
  ariaLabel,
  variant = 'section',
  icon,
}: Readonly<{
  title: string;
  description?: string;
  children: ReactNode;
  className?: string;
  ariaLabel?: string;
  variant?: 'section' | 'panel' | 'signal';
  icon?: ReactNode;
}>) {
  const variantClass =
    variant === 'signal'
      ? 'rounded-3xl border border-amber-200/80 bg-amber-50/70 p-5 sm:p-6 shadow-sm'
      : 'rounded-3xl border border-slate-100 bg-white p-5 sm:p-6 shadow-sm';
  return (
    <section
      aria-label={ariaLabel}
      className={`min-w-0 text-neutral-text ${variantClass} ${className}`}
    >
      <header className="mb-5 flex items-start justify-between gap-3">
        <div className="flex gap-3 min-w-0 flex-1">
          {icon ? (
            <div className="hidden sm:flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-700">
              {icon}
            </div>
          ) : null}
          <div className="min-w-0 flex-1">
            <h2 className="text-base sm:text-lg font-bold tracking-tight text-slate-900 break-words leading-tight">{title}</h2>
            {description ? (
              <p className="mt-1 text-xs leading-relaxed text-slate-400 break-words">{description}</p>
            ) : null}
          </div>
        </div>
      </header>
      {children}
    </section>
  );
}

export function AdminDispatchSlab({
  ariaLabel,
  eyebrow,
  children,
}: Readonly<{
  ariaLabel: string;
  eyebrow: string;
  children: ReactNode;
}>) {
  return (
    <section
      aria-label={ariaLabel}
      className="min-w-0 rounded-3xl border border-slate-100 bg-white p-5 sm:p-6 text-slate-800 shadow-sm"
    >
      <div className="flex items-center gap-2.5 mb-4">
        <span aria-hidden="true" className="h-2 w-2 rounded-full bg-emerald-500 ring-2 ring-emerald-500/20 animate-pulse" />
        <p className="text-xs font-bold tracking-[0.12em] text-brand uppercase">
          {eyebrow}
        </p>
        <span className="ml-auto inline-flex items-center gap-1.5 rounded-full border border-slate-200/80 bg-slate-50 px-2.5 py-0.5 text-[10px] font-semibold text-slate-600">
          <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
          Trực tiếp
        </span>
      </div>
      <div className="min-w-0">{children}</div>
    </section>
  );
}

export function AdminPreviewHiddenFields({
  context,
}: Readonly<{ context: AdminPreviewContext | undefined }>) {
  if (context?.preview !== 'enabled') return null;
  return (
    <>
      <input name="preview" type="hidden" value="enabled" />
      {context.scenario ? <input name="scenario" type="hidden" value={context.scenario} /> : null}
      {context.command ? <input name="command" type="hidden" value={context.command} /> : null}
    </>
  );
}

export function AdminPaginationLinks({
  label,
  page,
  totalPages,
  hrefForPage,
}: Readonly<{
  label: string;
  page: number;
  totalPages: number;
  hrefForPage: (page: number) => string;
}>) {
  if (totalPages <= 1) return null;
  return (
    <nav aria-label={`Phân trang ${label}`} className="flex flex-wrap items-center justify-between gap-sm pt-3">
      {page > 1 ? (
        <a
          className="inline-flex min-h-10 items-center rounded-xl border border-slate-200/80 bg-white/90 px-4 text-xs font-semibold text-neutral-text shadow-2xs hover:bg-neutral-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
          href={hrefForPage(page - 1)}
        >
          Trang trước
        </a>
      ) : <span />}
      <span className="text-xs font-medium text-neutral-muted">Trang {page} / {totalPages}</span>
      {page < totalPages ? (
        <a
          className="inline-flex min-h-10 items-center rounded-xl border border-slate-200/80 bg-white/90 px-4 text-xs font-semibold text-neutral-text shadow-2xs hover:bg-neutral-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
          href={hrefForPage(page + 1)}
        >
          Trang sau
        </a>
      ) : <span />}
    </nav>
  );
}

export function AdminAuditRail({ audit }: Readonly<{ audit: AdminAuditRailView }>) {
  return (
    <aside
      aria-label="Nhật ký kiểm toán — thao tác đặc quyền"
      className="min-w-0 rounded-[22px] sm:rounded-[26px] border-l-4 border-l-brand border border-white/80 bg-white/90 backdrop-blur-sm p-5 sm:p-6 shadow-xs text-neutral-text"
    >
      <header className="mb-4 flex items-center justify-between border-b border-slate-100 pb-3">
        <div>
          <h2 className="text-base sm:text-lg font-bold text-neutral-text">Nhật ký kiểm toán</h2>
          <p className="mt-0.5 text-xs text-neutral-muted uppercase tracking-wider font-semibold">Thao tác đặc quyền · Mới nhất trước</p>
        </div>
        <span className="rounded-full bg-slate-100 border border-slate-200 px-2.5 py-0.5 text-[11px] font-bold text-slate-700">ĐÃ KIỂM TOÁN</span>
      </header>
      {audit.state === 'error' ? (
        <ScreenState
          state="error"
          title="Không thể tải nhật ký"
          message={audit.message ?? 'Không thể tải nhật ký kiểm toán trong lần kiểm tra này.'}
        />
      ) : audit.state === 'empty' ? (
        <p className="text-xs text-neutral-muted italic py-2">Chưa có thao tác đặc quyền được ghi nhận.</p>
      ) : audit.state === 'delayed' ? (
        <OperationalAlert title="Nhật ký đang đồng bộ" tone="info">
          <p>{audit.message ?? 'Thao tác đã lưu nhưng mục kiểm toán chưa được trả về.'}</p>
        </OperationalAlert>
      ) : (
        <ol className="m-0 grid list-none gap-3 p-0">
          {audit.entries.map((entry) => (
            <li key={entry.id} className="min-w-0 rounded-xl border border-slate-200/80 bg-[#f8fbff] p-3.5 shadow-2xs">
              <div className="flex flex-wrap items-center justify-between gap-1.5 mb-2">
                <span className="rounded-full bg-success px-2 py-0.5 text-[11px] font-bold text-success-text border border-success-border">
                  {entry.outcomeLabel}
                </span>
                <time className="text-xs font-medium text-neutral-muted tabular-nums" dateTime={entry.dateTime}>
                  {entry.timestampLabel}
                </time>
              </div>
              <h3 className="text-xs font-bold text-neutral-text break-words mb-2">{entry.actionLabel}</h3>
              <dl className="grid gap-1.5 text-xs text-neutral-muted">
                <div className="flex justify-between gap-2 border-t border-slate-200/60 pt-1.5">
                  <dt className="text-xs font-semibold text-neutral-muted uppercase">Người thực hiện</dt>
                  <dd className="font-medium text-neutral-text text-right">{entry.actorLabel}</dd>
                </div>
                <div className="flex justify-between gap-2">
                  <dt className="text-xs font-semibold text-neutral-muted uppercase">Đối tượng</dt>
                  <dd className="font-medium text-neutral-text text-right">{entry.targetLabel}</dd>
                </div>
                <div>
                  <dt className="text-xs font-semibold text-neutral-muted uppercase">Lý do đã kiểm duyệt</dt>
                  <dd className="mt-0.5 rounded-xl bg-white p-2 text-xs text-neutral-text whitespace-pre-wrap break-words border border-slate-200/80 shadow-2xs">{entry.reason}</dd>
                </div>
                <div className="flex justify-between gap-2">
                  <dt className="text-xs font-semibold text-neutral-muted uppercase">Thời gian</dt>
                  <dd className="mt-xxs"><time dateTime={entry.dateTime}>{entry.timestampLabel}</time></dd>
                </div>
                <div className="flex justify-between gap-2">
                  <dt className="text-xs font-semibold text-neutral-muted uppercase">Mã yêu cầu</dt>
                  <dd className="font-mono text-xs text-neutral-text break-all">{entry.requestId}</dd>
                </div>
                <div className="flex justify-between gap-2">
                  <dt className="text-xs font-semibold text-neutral-muted uppercase">Mã kiểm toán</dt>
                  <dd className="font-mono text-xs text-neutral-text break-all">{entry.auditId}</dd>
                </div>
              </dl>
            </li>
          ))}
        </ol>
      )}
    </aside>
  );
}
