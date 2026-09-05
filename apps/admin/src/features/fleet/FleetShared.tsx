import { OperationalAlert, ScreenState, StatusBadge, type OperationalAlertTone } from '@leopard/ui';
import { FileText, Info, Users } from 'lucide-react';
import type { ReactNode } from 'react';

import type {
 FleetBoundaryView,
 FleetNoticeView,
 FleetPreviewContext,
 FleetScopeView,
} from './model';

export function FleetScopeRail({ scope }: Readonly<{ scope: FleetScopeView }>) {
  return (
    <div
      aria-label="Phạm vi truy cập đội xe"
      className="inline-flex flex-wrap items-center gap-2 rounded-full border border-slate-200/80 bg-white/95 px-3.5 py-1 text-xs text-slate-700 shadow-2xs backdrop-blur-sm"
    >
      <span aria-hidden="true" className="h-2 w-2 rounded-full bg-emerald-500 ring-2 ring-emerald-100 animate-pulse" />
      <span className="font-bold text-slate-800">Đội xe {scope.displayName}</span>
      <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-600">
        Chỉ xem
      </span>
      <span className="hidden sm:inline text-[11px] text-slate-400">
        · Đang tham gia · {scope.verifiedAtLabel}
      </span>
    </div>
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
       <Users className="w-3 h-3" strokeWidth={2} aria-hidden="true" />
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
  <div className="inline-flex items-center gap-2 rounded-full border border-sky-200/80 bg-sky-50/80 px-3.5 py-1 text-xs font-medium text-sky-800 shadow-2xs">
    <Info className="w-3.5 h-3.5 shrink-0 text-sky-600" strokeWidth={2} aria-hidden="true" />
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
    className="min-w-0 rounded-3xl border border-slate-100 bg-white p-5 sm:p-6 text-slate-800 shadow-sm"
   >
    <div className="flex items-center justify-between gap-2 mb-4">
      <div className="flex items-center gap-2">
        <span aria-hidden="true" className="h-2 w-2 rounded-full bg-emerald-500 ring-2 ring-emerald-500/20 animate-pulse" />
        <p className="text-xs font-bold tracking-[0.12em] text-brand uppercase">{eyebrow}</p>
      </div>
      <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-200/80 bg-slate-50 px-2.5 py-0.5 text-[10px] font-semibold text-slate-600">
        <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
        Trực tiếp
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
   <section className="min-w-0 rounded-3xl border border-slate-100 bg-white p-5 sm:p-6 text-neutral-text shadow-sm">
    <header className="mb-5 flex items-start gap-3">
     <div className="hidden sm:flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-700">
        <FileText className="w-[18px] h-[18px]" strokeWidth={1.8} aria-hidden="true" />
     </div>
     <div className="min-w-0 flex-1">
       <h2 className="text-base sm:text-lg font-bold tracking-tight text-slate-900 break-words leading-tight">{title}</h2>
       {description ? (
        <p className="mt-1 text-xs leading-relaxed text-slate-400 break-words">{description}</p>
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
