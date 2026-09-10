'use client';

import React from 'react';
import { Button } from './Button';
import { cn } from './cn';

export type MapPanelState =
  | 'loading'
  | 'route'
  | 'stale'
  | 'no-location'
  | 'unavailable'
  | 'permission-denied';

export type MapPanelHeight = 'minimum' | 'standard' | 'large';

export type MapPanelProps = Readonly<{
  state?: MapPanelState;
  title?: string;
  textAlternative?: React.ReactNode;
  lastUpdated?: React.ReactNode;
  onRetry?: () => void;
  height?: MapPanelHeight;
  className?: string;
  children?: React.ReactNode;
}>;

const heightClasses: Readonly<Record<MapPanelHeight, string>> = {
  minimum: 'h-map-min',
  standard: 'h-map-standard',
  large: 'h-map-large',
};

function LoadingState() {
  return (
    <div
      role="status"
      aria-live="polite"
      className="flex flex-1 flex-col items-center justify-center gap-xs text-neutral-muted"
    >
      <span
        className="h-lg w-lg animate-spin rounded-pill border-2 border-info-border border-r-transparent motion-reduce:animate-none"
        aria-hidden="true"
      />
      <span>Đang tải bản đồ…</span>
    </div>
  );
}

export function MapPanel({
  state = 'loading',
  title = 'Bản đồ tuyến đường',
  textAlternative,
  lastUpdated,
  onRetry,
  height = 'standard',
  className,
  children,
}: MapPanelProps) {
  const titleId = React.useId();
  const preservesMap = state === 'route' || state === 'stale';
  const showsAlternative = state !== 'loading' && state !== 'permission-denied' && textAlternative;

  return (
    <section
      aria-labelledby={titleId}
      aria-busy={state === 'loading' ? 'true' : undefined}
      className={cn(
        'flex min-h-map-min w-full flex-col overflow-auto border-y border-neutral-border bg-neutral-surface text-body-compact text-neutral-text',
        heightClasses[height],
        className,
      )}
    >
      <div className="border-b border-neutral-border border-l-4 border-l-brand bg-neutral-text px-md py-sm text-brand-text">
        <h2 id={titleId} className="text-section-title font-semibold break-words">
          {title}
        </h2>
      </div>

      {state === 'loading' ? <LoadingState /> : null}

      {preservesMap ? <div className="min-h-0 flex-1 bg-neutral">{children}</div> : null}

      {state === 'stale' ? (
        <div
          role="status"
          aria-live="polite"
          className="border-t border-warning-border bg-warning px-md py-sm text-warning-text"
        >
          <p className="font-semibold">Dữ liệu bản đồ có thể đã cũ</p>
          {lastUpdated ? <p className="mt-xxs">Cập nhật lần cuối: {lastUpdated}</p> : null}
        </div>
      ) : null}

      {state === 'no-location' ? (
        <p className="flex flex-1 items-center justify-center p-md text-center text-neutral-muted">
          Chưa có vị trí hợp lệ.
        </p>
      ) : null}

      {state === 'unavailable' ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-md p-md text-center">
          <p>Bản đồ tạm thời không khả dụng. Danh sách và thông tin vị trí vẫn được giữ.</p>
          {onRetry ? (
            <Button variant="secondary" onPress={onRetry}>
              Thử tải lại bản đồ
            </Button>
          ) : null}
        </div>
      ) : null}

      {state === 'permission-denied' ? (
        <p
          role="alert"
          className="flex flex-1 items-center justify-center bg-danger p-md text-center text-danger-text"
        >
          Bạn không có quyền xem dữ liệu bản đồ này.
        </p>
      ) : null}

      {showsAlternative ? (
        <div
          aria-label="Thông tin thay thế cho bản đồ"
          className="border-t border-neutral-border bg-neutral px-md py-sm break-words"
        >
          {textAlternative}
        </div>
      ) : null}
    </section>
  );
}
