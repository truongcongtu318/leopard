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
}: Readonly<{ screen: AdminListScreen | 'order-detail'; orderReference?: string }>) {
  return (
    <nav aria-label="Đường dẫn" className="text-body-compact text-neutral-muted">
      <ol className="m-0 flex flex-wrap items-center gap-xs p-0">
        <li className="list-none">
          <a
            className="rounded-control underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
            href="/admin"
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
                href="/admin/orders"
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
}: Readonly<{
  title: string;
  description?: string;
  children: ReactNode;
  className?: string;
}>) {
  return (
    <section
      className={`min-w-0 rounded-card border border-neutral-border bg-neutral p-md text-neutral-text ${className}`}
    >
      <header className="mb-md">
        <h2 className="text-section-title font-semibold break-words">{title}</h2>
        {description ? (
          <p className="mt-xxs text-body-compact text-neutral-muted break-words">{description}</p>
        ) : null}
      </header>
      {children}
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
    <nav aria-label={`Phân trang ${label}`} className="flex flex-wrap items-center justify-between gap-sm">
      {page > 1 ? (
        <a
          className="inline-flex min-h-11 items-center rounded-control border border-neutral-border px-md font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
          href={hrefForPage(page - 1)}
        >
          Trang trước
        </a>
      ) : <span />}
      <span className="text-body-compact text-neutral-muted">Trang {page} / {totalPages}</span>
      {page < totalPages ? (
        <a
          className="inline-flex min-h-11 items-center rounded-control border border-neutral-border px-md font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
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
      aria-label="Audit Rail — thao tác đặc quyền"
      className="min-w-0 rounded-card border border-neutral-border bg-neutral p-md text-neutral-text"
    >
      <header className="mb-md border-b border-neutral-border pb-sm">
        <h2 className="text-section-title font-semibold">Audit Rail</h2>
        <p className="mt-xxs text-xs text-neutral-muted">Thao tác đặc quyền · Mới nhất trước</p>
      </header>
      {audit.state === 'error' ? (
        <ScreenState
          state="error"
          title="Không thể tải audit"
          message={audit.message ?? 'Không thể tải Audit Rail trong lần kiểm tra này.'}
        />
      ) : audit.state === 'empty' ? (
        <p className="text-body-compact text-neutral-muted">Chưa có thao tác đặc quyền được ghi nhận.</p>
      ) : audit.state === 'delayed' ? (
        <OperationalAlert title="Nhật ký đang đồng bộ" tone="info">
          <p>{audit.message ?? 'Command đã persist nhưng audit entry chưa được trả về.'}</p>
        </OperationalAlert>
      ) : (
        <ol className="m-0 grid list-none gap-md p-0">
          {audit.entries.map((entry) => (
            <li key={entry.id} className="min-w-0 border-l-2 border-brand pl-sm">
              <div className="flex flex-wrap items-center gap-xs">
                <span className="rounded-pill border border-success-border bg-success px-xs py-1 text-xs font-medium text-success-text">
                  {entry.outcomeLabel}
                </span>
                <h3 className="font-semibold break-words">{entry.actionLabel}</h3>
              </div>
              <dl className="mt-sm grid gap-xs text-body-compact">
                <div><dt className="text-xs font-semibold text-neutral-muted">Actor</dt><dd className="mt-xxs break-words">{entry.actorLabel}</dd></div>
                <div><dt className="text-xs font-semibold text-neutral-muted">Target</dt><dd className="mt-xxs break-words">{entry.targetLabel}</dd></div>
                <div><dt className="text-xs font-semibold text-neutral-muted">Lý do đã sanitize</dt><dd className="mt-xxs whitespace-pre-wrap break-words">{entry.reason}</dd></div>
                <div><dt className="text-xs font-semibold text-neutral-muted">Thời gian</dt><dd className="mt-xxs"><time dateTime={entry.dateTime}>{entry.timestampLabel}</time></dd></div>
                <div><dt className="text-xs font-semibold text-neutral-muted">Request ID</dt><dd className="mt-xxs font-mono text-xs break-all">{entry.requestId}</dd></div>
                <div><dt className="text-xs font-semibold text-neutral-muted">Audit ID</dt><dd className="mt-xxs font-mono text-xs break-all">{entry.auditId}</dd></div>
              </dl>
            </li>
          ))}
        </ol>
      )}
    </aside>
  );
}
