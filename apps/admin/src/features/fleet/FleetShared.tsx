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
    className="relative overflow-hidden flex flex-wrap items-center justify-between gap-3 rounded-[16px] bg-gradient-to-r from-brand via-teal-700 to-cyan-700 px-5 py-4 text-white shadow-brand"
   >
    <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.08)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.08)_1px,transparent_1px)] bg-[size:24px_24px] opacity-30 pointer-events-none" />
    <div className="absolute -right-8 -top-8 h-24 w-24 rounded-full bg-white/10 blur-2xl pointer-events-none" />
    <div className="relative flex items-center gap-3">
     <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/15 backdrop-blur border border-white/20 text-white">
       <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
     </div>
     <div>
      <div className="flex items-center gap-2">
       <p className="text-sm font-bold">Đội xe {scope.displayName}</p>
       <span className="inline-flex items-center gap-1 rounded-full bg-white px-2.5 py-1 text-[11px] font-bold tracking-wide text-brand">
         <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" /> READ-ONLY
       </span>
      </div>
      <p className="text-xs text-white/80">
       Đang tham gia · Xác nhận {scope.verifiedAtLabel}
      </p>
     </div>
    </div>
    <div className="relative hidden sm:flex items-center gap-2 rounded-full bg-white/15 backdrop-blur px-3 py-1.5 border border-white/20">
      <div className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
      <span className="text-xs font-semibold">Đã xác thực</span>
    </div>
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
    className="min-w-0 overflow-hidden rounded-[16px] border border-neutral-border/20 bg-gradient-to-br from-neutral-text via-[#1e293b] to-[#0f172a] p-6 text-white shadow-elevated relative"
   >
    <div className="absolute inset-0 bg-gradient-to-br from-brand/10 via-transparent to-teal-600/10 pointer-events-none" />
    <div className="absolute -right-12 -top-12 h-32 w-32 rounded-full bg-brand/10 blur-2xl pointer-events-none" />
    <div className="relative">
      <div className="flex items-center gap-2 mb-4">
        <span className="flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-2 w-2 rounded-full bg-emerald-400 opacity-75 motion-reduce:animate-none" />
          <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-400" />
        </span>
        <p className="text-xs font-bold tracking-[0.12em] text-white/90 uppercase">{eyebrow}</p>
      </div>
      <div className="min-w-0">{children}</div>
    </div>
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
   <section className="min-w-0 rounded-[16px] border border-neutral-border/60 bg-white p-6 text-neutral-text shadow-card hover:shadow-card-hover transition-shadow">
    <header className="mb-5 flex items-start gap-3">
     <div className="hidden sm:flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-brand-soft text-brand border border-brand/10">
       <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>
     </div>
     <div className="min-w-0 flex-1">
       <h2 className="text-[15px] font-bold tracking-tight break-words leading-tight">{title}</h2>
       {description ? (
        <p className="mt-1 text-xs leading-relaxed text-neutral-muted break-words">{description}</p>
       ) : null}
     </div>
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
