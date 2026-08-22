import { OperationalAlert, ScreenState, StatusBadge, type OperationalAlertTone } from '@leopard/ui';
import type { ReactNode } from 'react';

import type {
 FleetBoundaryView,
 FleetNoticeView,
 FleetPreviewContext,
 FleetScopeView,
} from './model';

export function FleetScopeRail({ scope }: Readonly<{ scope: FleetScopeView }>) {
 return (
  <section
   aria-label="Phạm vi truy cập đội xe"
   className="flex flex-wrap items-center justify-between gap-3 rounded-card bg-brand px-md py-sm text-brand-text"
  >
   <div className="flex items-center gap-3">

    <div>
     <div className="flex items-center gap-2">
      <p className="text-sm font-bold text-brand-text">Phạm vi truy cập: Đội xe {scope.displayName}</p>
      <span className="rounded-pill border border-brand-text/40 px-2 py-0.5 text-xs font-bold">
       CHỈ XEM (READ-ONLY)
      </span>
     </div>
     <p className="text-xs text-brand-soft">
      Tư cách thành viên: Đang tham gia · Chỉ xem
     </p>
    </div>
   </div>
   <p className="text-xs font-medium text-neutral-muted tabular-nums">
    Xác nhận: <span className="text-neutral-muted font-semibold">{scope.verifiedAtLabel}</span>
   </p>
  </section>
 );
}

export function FleetBoundaryState({ view }: Readonly<{ view: FleetBoundaryView }>) {
 const state =
  view.kind === 'scope-loading'
   ? 'loading'
   : view.kind === 'session-expired'
    ? 'session-expired'
    : 'permission-denied';
 return <ScreenState message={view.message} state={state} title={view.title} />;
}

export function FleetNotice({ notice }: Readonly<{ notice: FleetNoticeView }>) {
 const tone: OperationalAlertTone = notice.tone;
 return (
  <OperationalAlert
   live={notice.tone === 'danger' ? 'assertive' : 'polite'}
   title={notice.title}
   tone={tone}
  >
   <p>{notice.message}</p>
  </OperationalAlert>
 );
}

export function FleetBreadcrumbs({
 current,
 orderReference,
}: Readonly<{ current: 'drivers' | 'orders' | 'order-detail'; orderReference?: string }>) {
 return (
  <nav aria-label="Đường dẫn" className="text-xs font-medium text-neutral-muted">
   <ol className="m-0 flex flex-wrap items-center gap-2 p-0">
    <li className="list-none">
     <a
      className="hover:text-neutral-text transition-colors"
      href="/fleet"
     >
      Đội xe
     </a>
    </li>
    <li aria-hidden="true" className="list-none text-neutral-muted">
     /
    </li>
    <li className="list-none">
     {current === 'drivers' ? (
      <span aria-current="page" className="font-bold text-neutral-text">Tài xế</span>
     ) : current === 'orders' ? (
      <span aria-current="page" className="font-bold text-neutral-text">Đơn hàng</span>
     ) : (
      <a
       className="hover:text-neutral-text transition-colors"
       href="/fleet/orders"
      >
       Đơn hàng
      </a>
     )}
    </li>
    {current === 'order-detail' && orderReference ? (
     <>
      <li aria-hidden="true" className="list-none text-neutral-muted">
       /
      </li>
      <li aria-current="page" className="list-none font-bold text-neutral-text">
       {orderReference}
      </li>
     </>
    ) : null}
   </ol>
  </nav>
 );
}

export function FleetReadOnlyNote() {
 return (
  <p className="border-l-2 border-info-border bg-info px-sm py-xs text-body-compact text-info-text rounded-control">
   Bạn đang xem dữ liệu ở chế độ chỉ xem.
  </p>
 );
}

export function FleetDispatchSlab({
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
   className="min-w-0 rounded-card bg-brand p-md text-brand-text"
  >
   <div className="mb-3 flex items-center gap-2">
    <p className="text-xs font-bold uppercase tracking-wider text-brand-soft">{eyebrow}</p>
   </div>
   <div className="min-w-0">{children}</div>
  </section>
 );
}

export function FleetSurface({
 title,
 description,
 children,
}: Readonly<{
 title: string;
 description?: string;
 children: React.ReactNode;
}>) {
 return (
  <section className="min-w-0 rounded-card border border-neutral-border bg-neutral p-6 text-neutral-text">
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

export function FleetPaginationLinks({
 page,
 totalPages,
 hrefForPage,
}: Readonly<{
 page: number;
 totalPages: number;
 hrefForPage: (page: number) => string;
}>) {
 if (totalPages <= 1) return null;
 return (
  <nav aria-label="Phân trang" className="flex flex-wrap items-center justify-between gap-sm">
   {page > 1 ? (
    <a
     className="inline-flex min-h-11 items-center rounded-control border border-neutral-border px-md font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
     href={hrefForPage(page - 1)}
    >
     Trang trước
    </a>
   ) : (
    <span />
   )}
   <span className="text-body-compact text-neutral-muted">
    Trang {page} / {totalPages}
   </span>
   {page < totalPages ? (
    <a
     className="inline-flex min-h-11 items-center rounded-control border border-neutral-border px-md font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
     href={hrefForPage(page + 1)}
    >
     Trang sau
    </a>
   ) : (
    <span />
   )}
  </nav>
 );
}

export function FleetPreviewHiddenFields({
 context,
}: Readonly<{ context: FleetPreviewContext | undefined }>) {
 if (context?.preview !== 'enabled') return null;
 return (
  <>
   <input name="preview" type="hidden" value="enabled" />
   {context.scenario ? <input name="scenario" type="hidden" value={context.scenario} /> : null}
  </>
 );
}

export function FleetAvailabilityBadge({
 status,
}: Readonly<{ status: 'OFFLINE' | 'AVAILABLE' | 'BUSY' }>) {
 return <StatusBadge domain="driverAvailability" status={status} />;
}
