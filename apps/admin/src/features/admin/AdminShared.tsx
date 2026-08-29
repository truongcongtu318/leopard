import {
  OperationalAlert,
  ScreenState,
  type OperationalAlertTone,
} from '@leopard/ui';
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
        <p className="mt-xxs font-mono text-xs break-all">Request ID: {notice.requestId}</p>
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
    <nav aria-label="Đường dẫn" className="text-body-compact text-neutral-muted">
      <ol className="m-0 flex flex-wrap items-center gap-xs p-0">
        <li className="list-none">
          <a
            className="rounded-control underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
            href={createAdminPreviewHref('/admin', 'overview', previewContext)}
          >
            Tổng quan
          </a>
        </li>
        <li aria-hidden="true" className="list-none">/</li>
        {screen === 'order-detail' ? (
          <>
            <li className="list-none">
              <a
                className="rounded-control underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
                href={createAdminPreviewHref('/admin/orders', 'orders', previewContext)}
              >
                Đơn hàng
              </a>
            </li>
            <li aria-hidden="true" className="list-none">/</li>
            <li aria-current="page" className="list-none font-medium text-neutral-text break-all">
              {orderReference}
            </li>
          </>
        ) : (
          <li aria-current="page" className="list-none font-medium text-neutral-text">
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
    variant === 'panel'
      ? 'rounded-[16px] border border-neutral-border/60 bg-white p-6 shadow-card hover:shadow-card-hover transition-shadow'
      : variant === 'signal'
        ? 'rounded-xl border border-brand/20 bg-gradient-to-br from-brand-soft to-brand-soft/40 p-5 shadow-sm'
        : 'rounded-[16px] border border-neutral-border/60 bg-white p-6 shadow-card hover:shadow-card-hover transition-shadow';
  return (
    <section
      aria-label={ariaLabel}
      className={`min-w-0 text-neutral-text ${variantClass} ${className}`}
    >
      <header className="mb-5 flex items-start justify-between gap-3">
        <div className="flex gap-3 min-w-0 flex-1">
          {icon ? (
            <div className="hidden sm:flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-brand-soft text-brand border border-brand/10">
              {icon}
            </div>
          ) : null}
          <div className="min-w-0 flex-1">
            <h2 className="text-[15px] font-bold tracking-tight text-neutral-text break-words leading-tight">{title}</h2>
            {description ? (
              <p className="mt-1 text-xs leading-relaxed text-neutral-muted break-words">{description}</p>
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
      className="min-w-0 overflow-hidden rounded-[16px] border border-neutral-border/20 bg-neutral-text bg-gradient-to-br from-neutral-text via-[#1e293b] to-[#0f172a] p-6 text-white shadow-elevated relative"
    >
      <div className="absolute inset-0 bg-gradient-to-br from-brand/10 via-transparent to-teal-600/10 pointer-events-none" />
      <div className="absolute -right-12 -top-12 h-32 w-32 rounded-full bg-brand/10 blur-2xl pointer-events-none" />
      <div className="relative">
        <div className="flex items-center gap-2.5 mb-4">
          <span className="flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-2 w-2 rounded-full bg-emerald-400 opacity-75 motion-reduce:animate-none" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-400" />
          </span>
          <p className="text-xs font-bold tracking-[0.12em] text-white/90 uppercase">{eyebrow}</p>
          <span className="ml-auto hidden sm:inline-flex items-center gap-1.5 rounded-full bg-white/10 px-2.5 py-1 text-[11px] font-medium text-white/80 backdrop-blur border border-white/10">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
            Live
          </span>
        </div>
        <div className="min-w-0">{children}</div>
      </div>
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
          className="inline-flex min-h-10 items-center rounded-control border border-neutral-border bg-neutral px-4 text-xs font-semibold text-neutral-text  hover:bg-neutral-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
          href={hrefForPage(page - 1)}
        >
          ← Trang trước
        </a>
      ) : <span />}
      <span className="text-xs font-medium text-neutral-muted">Trang {page} / {totalPages}</span>
      {page < totalPages ? (
        <a
          className="inline-flex min-h-10 items-center rounded-control border border-neutral-border bg-neutral px-4 text-xs font-semibold text-neutral-text  hover:bg-neutral-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
          href={hrefForPage(page + 1)}
        >
          Trang sau →
        </a>
      ) : <span />}
    </nav>
  );
}

export function AdminAuditRail({ audit }: Readonly<{ audit: AdminAuditRailView }>) {
  return (
    <aside
      aria-label="Audit Rail — thao tác đặc quyền"
      className="min-w-0 border-l-4 border-brand bg-neutral-surface p-md text-neutral-text rounded-card"
    >
      <header className="mb-4 flex items-center justify-between border-b border-neutral-border pb-3">
        <div>
          <h2 className="text-section-title font-semibold">Audit Rail</h2>
          <p className="mt-0.5 text-xs text-neutral-muted uppercase tracking-wider font-semibold">Thao tác đặc quyền · Mới nhất trước</p>
        </div>
        <span className="rounded-full bg-neutral-border px-2 py-0.5 text-xs font-bold text-neutral-text">AUDITED</span>
      </header>
      {audit.state === 'error' ? (
        <ScreenState
          state="error"
          title="Không thể tải audit"
          message={audit.message ?? 'Không thể tải Audit Rail trong lần kiểm tra này.'}
        />
      ) : audit.state === 'empty' ? (
        <p className="text-xs text-neutral-muted italic py-2">Chưa có thao tác đặc quyền được ghi nhận.</p>
      ) : audit.state === 'delayed' ? (
        <OperationalAlert title="Nhật ký đang đồng bộ" tone="info">
          <p>{audit.message ?? 'Command đã persist nhưng audit entry chưa được trả về.'}</p>
        </OperationalAlert>
      ) : (
        <ol className="m-0 grid list-none gap-3 p-0">
          {audit.entries.map((entry) => (
            <li key={entry.id} className="min-w-0 rounded-control border border-neutral-border bg-neutral p-3.5">
              <div className="flex flex-wrap items-center justify-between gap-1.5 mb-2">
                <span className="rounded-full bg-success px-2 py-0.5 text-xs font-bold text-success-text border border-success-border">
                  {entry.outcomeLabel}
                </span>
                <time className="text-xs font-medium text-neutral-muted tabular-nums" dateTime={entry.dateTime}>
                  {entry.timestampLabel}
                </time>
              </div>
              <h3 className="text-xs font-bold text-neutral-text break-words mb-2">{entry.actionLabel}</h3>
              <dl className="grid gap-1.5 text-xs text-neutral-muted">
                <div className="flex justify-between gap-2 border-t border-neutral-border pt-1.5">
                  <dt className="text-xs font-semibold text-neutral-muted uppercase">Actor</dt>
                  <dd className="font-medium text-neutral-text text-right">{entry.actorLabel}</dd>
                </div>
                <div className="flex justify-between gap-2">
                  <dt className="text-xs font-semibold text-neutral-muted uppercase">Target</dt>
                  <dd className="font-medium text-neutral-text text-right">{entry.targetLabel}</dd>
                </div>
                <div>
                  <dt className="text-xs font-semibold text-neutral-muted uppercase">Lý do đã sanitize</dt>
                  <dd className="mt-0.5 rounded-control bg-neutral-surface p-2 text-xs text-neutral-text whitespace-pre-wrap break-words border border-neutral-border">{entry.reason}</dd>
                </div>
                <div className="flex justify-between gap-2">
                  <dt className="text-xs font-semibold text-neutral-muted uppercase">Thời gian</dt>
                  <dd className="mt-xxs"><time dateTime={entry.dateTime}>{entry.timestampLabel}</time></dd>
                </div>
                <div className="flex justify-between gap-2">
                  <dt className="text-xs font-semibold text-neutral-muted uppercase">Request ID</dt>
                  <dd className="font-mono text-xs text-neutral-text break-all">{entry.requestId}</dd>
                </div>
                <div className="flex justify-between gap-2">
                  <dt className="text-xs font-semibold text-neutral-muted uppercase">Audit ID</dt>
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
