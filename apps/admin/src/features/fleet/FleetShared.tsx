import { OperationalAlert, ScreenState, StatusBadge, type OperationalAlertTone } from '@leopard/ui';

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
      className="grid gap-xs border-l-4 border-brand bg-neutral-surface px-md py-sm text-body-compact text-neutral-text sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center"
    >
      <div className="min-w-0">
        <p className="font-semibold break-words">Phạm vi truy cập: Đội xe {scope.displayName}</p>
        <p className="mt-xxs text-neutral-muted break-words">
          Tư cách thành viên: Đang tham gia · Chỉ xem
        </p>
      </div>
      <p className="text-xs text-neutral-muted tabular-nums break-words sm:text-right">
        Phạm vi xác nhận lúc {scope.verifiedAtLabel}
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
    <nav aria-label="Đường dẫn" className="text-body-compact text-neutral-muted">
      <ol className="m-0 flex flex-wrap items-center gap-xs p-0">
        <li className="list-none">
          <a
            className="rounded-control underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
            href="/fleet"
          >
            Đội xe
          </a>
        </li>
        <li aria-hidden="true" className="list-none">
          /
        </li>
        <li className="list-none">
          {current === 'drivers' ? (
            <span aria-current="page">Tài xế</span>
          ) : current === 'orders' ? (
            <span aria-current="page">Đơn hàng</span>
          ) : (
            <a
              className="rounded-control underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
              href="/fleet/orders"
            >
              Đơn hàng
            </a>
          )}
        </li>
        {current === 'order-detail' && orderReference ? (
          <>
            <li aria-hidden="true" className="list-none">
              /
            </li>
            <li aria-current="page" className="list-none font-medium text-neutral-text">
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
    <p className="border-l-2 border-info-border bg-info px-sm py-xs text-body-compact text-info-text">
      Bạn đang xem dữ liệu ở chế độ chỉ xem.
    </p>
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
    <section className="min-w-0 rounded-card border border-neutral-border bg-neutral p-md text-neutral-text">
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
