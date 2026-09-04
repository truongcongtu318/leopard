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
    className="flex flex-wrap items-center justify-between gap-3 rounded-[20px] sm:rounded-[22px] border border-white/80 bg-white/90 backdrop-blur-sm px-5 py-4 text-neutral-text shadow-xs"
   >
    <div className="flex items-center gap-3">
     <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-soft text-brand-soft-text">
       <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true" focusable="false"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
     </div>
     <div>
      <div className="flex flex-wrap items-center gap-2">
       <p className="text-sm font-bold">Đội xe {scope.displayName}</p>
       <span className="inline-flex items-center gap-1 rounded-full border border-brand/20 bg-brand-soft px-2.5 py-0.5 text-[11px] font-semibold text-brand-soft-text">
         Chỉ xem
       </span>
      </div>
      <p className="mt-0.5 text-xs text-neutral-muted tabular-nums">
       Đang tham gia · Xác nhận {scope.verifiedAtLabel}
      </p>
     </div>
    </div>
    <p className="hidden items-center gap-2 text-xs font-semibold text-neutral-muted sm:flex">
      <span aria-hidden="true" className="h-2 w-2 rounded-full bg-emerald-500 ring-2 ring-emerald-100" />
      Đã xác thực
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
   <ol className="m-0 flex flex-wrap items-center gap-1.5 p-0">
    <li className="list-none">
     <a
      className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-slate-600 hover:text-brand hover:bg-white/80 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand font-medium motion-reduce:transition-none"
      href="/fleet"
     >
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
      Đội xe
     </a>
    </li>
    <li aria-hidden="true" className="list-none text-slate-300">
     /
    </li>
    <li className="list-none">
     {current === 'drivers' ? (
      <span aria-current="page" className="font-bold text-slate-800 px-2.5 py-1 bg-white/70 rounded-lg shadow-2xs border border-white/60">Tài xế</span>
     ) : current === 'orders' ? (
      <span aria-current="page" className="font-bold text-slate-800 px-2.5 py-1 bg-white/70 rounded-lg shadow-2xs border border-white/60">Đơn hàng</span>
     ) : (
      <a
       className="inline-flex items-center rounded-lg px-2.5 py-1 text-slate-600 hover:text-brand hover:bg-white/80 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand font-medium motion-reduce:transition-none"
       href="/fleet/orders"
      >
       Đơn hàng
      </a>
     )}
    </li>
    {current === 'order-detail' && orderReference ? (
     <>
      <li aria-hidden="true" className="list-none text-slate-300">
       /
      </li>
      <li aria-current="page" className="list-none font-bold text-slate-800 px-2.5 py-1 break-all bg-white/70 rounded-lg shadow-2xs border border-white/60">
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
  <div className="flex items-center gap-2.5 rounded-xl border border-sky-200 bg-sky-50/80 px-4 py-2.5 text-xs font-medium text-sky-800 shadow-2xs backdrop-blur-xs">
   <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true" className="shrink-0 text-sky-600">
     <circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/>
   </svg>
   <span>Bạn đang xem dữ liệu ở chế độ chỉ xem.</span>
  </div>
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
    className="min-w-0 rounded-[22px] sm:rounded-[26px] border border-white/80 bg-white/95 backdrop-blur-sm p-5 sm:p-6 text-slate-800 shadow-sm"
   >
    <div className="flex items-center justify-between gap-2 mb-4">
      <div className="flex items-center gap-2">
        <span aria-hidden="true" className="h-2 w-2 rounded-full bg-emerald-500 ring-2 ring-emerald-500/20 animate-pulse" />
        <p className="text-xs font-bold tracking-[0.12em] text-brand uppercase">{eyebrow}</p>
      </div>
      <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-200/80 bg-slate-50 px-2.5 py-0.5 text-[10px] font-semibold text-slate-600">
        <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
        Live Scope
      </span>
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
   <section className="min-w-0 rounded-[22px] sm:rounded-[26px] border border-white/80 bg-white/90 backdrop-blur-sm p-5 sm:p-6 text-neutral-text shadow-xs">
    <header className="mb-5 flex items-start gap-3">
     <div className="hidden sm:flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-brand-soft text-brand-soft-text">
       <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true" focusable="false"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>
     </div>
     <div className="min-w-0 flex-1">
       <h2 className="text-base sm:text-lg font-bold tracking-tight text-neutral-text break-words leading-tight">{title}</h2>
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
  <nav aria-label="Phân trang" className="flex flex-wrap items-center justify-between gap-sm pt-3">
   {page > 1 ? (
    <a
     className="inline-flex min-h-10 items-center rounded-xl border border-slate-200/80 bg-white/90 px-4 text-xs font-semibold text-slate-700 shadow-2xs hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
     href={hrefForPage(page - 1)}
    >
     Trang trước
    </a>
   ) : (
    <span />
   )}
   <span className="text-xs font-medium text-neutral-muted">
    Trang {page} / {totalPages}
   </span>
   {page < totalPages ? (
    <a
     className="inline-flex min-h-10 items-center rounded-xl border border-slate-200/80 bg-white/90 px-4 text-xs font-semibold text-slate-700 shadow-2xs hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
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
