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
}: Readonly<{
  title: string;
  description?: string;
  children: ReactNode;
  className?: string;
  ariaLabel?: string;
  variant?: 'section' | 'panel' | 'signal';
}>) {
  const variantClass =
    variant === 'panel'
      ? 'rounded-card border border-neutral-border bg-neutral p-6 '
      : variant === 'signal'
        ? 'rounded-control border-l-4 border-brand bg-brand-soft/40 p-5'
        : 'rounded-card border border-neutral-border bg-neutral p-6 ';
  return (
    <section
      aria-label={ariaLabel}
      className={`min-w-0 text-neutral-text ${variantClass} ${className}`}
    >
      <header className="mb-4 pb-3 border-b border-neutral-border flex flex-col gap-1">
        <h2 className="text-base font-bold text-neutral-text break-words">{title}</h2>
        {description ? (
          <p className="text-xs font-medium text-neutral-muted break-words">{description}</p>
        ) : null}
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
      className="min-w-0 border-l-4 border-brand bg-neutral-text rounded-card p-6 text-brand-text shadow-xl"
    >
      <div className="flex items-center gap-2 mb-3">
        <span className="h-2 w-2 rounded-full bg-cyan-400 animate-pulse" />
        <p className="text-xs font-bold tracking-wider text-cyan-400 uppercase">{eyebrow}</p>
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
