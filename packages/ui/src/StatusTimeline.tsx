import React from 'react';
import { cn } from './cn';

export type StatusTimelineItem = Readonly<{
  id: string;
  label: string;
  description?: React.ReactNode;
  timestamp?: React.ReactNode;
  dateTime?: string;
  isCurrent?: boolean;
  actor?: React.ReactNode;
  reason?: React.ReactNode;
  requestId?: React.ReactNode;
  outcome?: React.ReactNode;
}>;

export type StatusTimelineProps = Readonly<{
  items: readonly StatusTimelineItem[];
  variant?: 'status' | 'audit';
  ariaLabel: string;
  className?: string;
}>;

const auditFields = [
  ['actor', 'Người thực hiện'],
  ['reason', 'Lý do'],
  ['requestId', 'Mã yêu cầu'],
  ['outcome', 'Kết quả'],
] as const;

export function StatusTimeline({
  items,
  variant = 'status',
  ariaLabel,
  className,
}: StatusTimelineProps) {
  return (
    <ol aria-label={ariaLabel} className={cn('m-0 list-none p-0', className)}>
      {items.map((item, index) => (
        <li key={item.id} className="flex gap-sm text-neutral-text">
          <div className="flex w-md shrink-0 flex-col items-center" aria-hidden="true">
            <span
              className={cn(
                'mt-xxs h-sm w-sm rounded-pill border-2',
                item.isCurrent
                  ? 'border-active-border bg-active'
                  : 'border-neutral-border bg-neutral',
              )}
            />
            {index < items.length - 1 ? (
              <span className="min-h-lg flex-1 border-l-2 border-neutral-border" />
            ) : null}
          </div>
          <article className="min-w-0 flex-1 pb-md">
            <div className="flex flex-wrap items-start justify-between gap-xs">
              <h3 className="font-semibold break-words">{item.label}</h3>
              {item.isCurrent ? (
                <span className="text-xs font-semibold text-active-text">Hiện tại</span>
              ) : null}
            </div>
            {item.timestamp ? (
              <time
                dateTime={item.dateTime}
                className="mt-xxs block text-xs text-neutral-muted tabular-nums"
              >
                {item.timestamp}
              </time>
            ) : null}
            {item.description ? (
              <div className="mt-xs text-body-compact text-neutral-muted break-words">
                {item.description}
              </div>
            ) : null}
            {variant === 'audit' ? (
              <dl className="mt-sm grid gap-xs text-body-compact">
                {auditFields.map(([field, label]) =>
                  item[field] ? (
                    <div key={field} className="grid gap-xxs sm:grid-cols-3">
                      <dt className="font-semibold text-neutral-muted">{label}</dt>
                      <dd className="min-w-0 break-words sm:col-span-2">{item[field]}</dd>
                    </div>
                  ) : null,
                )}
              </dl>
            ) : null}
          </article>
        </li>
      ))}
    </ol>
  );
}
