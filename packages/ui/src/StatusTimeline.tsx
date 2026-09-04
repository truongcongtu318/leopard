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
        <li key={item.id} className="flex gap-3 text-neutral-text">
          <div className="flex w-6 shrink-0 flex-col items-center pt-0.5" aria-hidden="true">
            <span
              className={cn(
                'h-3.5 w-3.5 rounded-full border-2 bg-white ring-4 transition-all',
                item.isCurrent
                  ? 'border-brand bg-brand ring-brand/20 shadow-xs'
                  : 'border-slate-300 ring-slate-100',
              )}
            />
            {index < items.length - 1 ? (
              <span className="min-h-7 flex-1 border-l-2 border-slate-200/90 my-1" />
            ) : null}
          </div>
          <article className="min-w-0 flex-1 pb-4">
            <div className="flex flex-wrap items-start justify-between gap-1.5">
              <h3 className="text-sm font-semibold text-slate-900 break-words">{item.label}</h3>
              {item.isCurrent ? (
                <span className="rounded-pill border border-active-border bg-active px-2 py-0.5 text-[10px] font-bold text-active-text shadow-2xs">
                  Hiện tại
                </span>
              ) : null}
            </div>
            {item.timestamp ? (
              <time
                dateTime={item.dateTime}
                className="mt-0.5 block text-xs text-slate-500 tabular-nums"
              >
                {item.timestamp}
              </time>
            ) : null}
            {item.description ? (
              <div className="mt-1.5 rounded-xl border border-slate-100 bg-slate-50/70 p-2.5 text-xs text-slate-600 break-words">
                {item.description}
              </div>
            ) : null}
            {variant === 'audit' ? (
              <dl className="mt-2.5 grid gap-1.5 rounded-xl border border-slate-200/70 bg-slate-50/80 p-3 text-xs">
                {auditFields.map(([field, label]) =>
                  item[field] ? (
                    <div key={field} className="grid gap-1 sm:grid-cols-3">
                      <dt className="font-bold text-slate-500">{label}</dt>
                      <dd className="min-w-0 font-medium text-slate-800 break-words sm:col-span-2">
                        {item[field]}
                      </dd>
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
