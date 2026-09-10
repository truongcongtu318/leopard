import React from 'react';
import { ChevronRight } from 'lucide-react';
import { cn } from './cn';

export type CompactMetricSummaryItem = Readonly<{
  id: string;
  label: string;
  value: React.ReactNode;
  detail?: React.ReactNode;
  href?: string;
  accessibleLabel?: string;
}>;

export type CompactMetricSummaryProps = Readonly<{
  items: readonly CompactMetricSummaryItem[];
  ariaLabel: string;
  isLoading?: boolean;
  className?: string;
}>;

export function CompactMetricSummary({
  items,
  ariaLabel,
  isLoading = false,
  className,
}: CompactMetricSummaryProps) {
  return (
    <section
      aria-label={ariaLabel}
      aria-busy={isLoading ? 'true' : undefined}
      className={cn(
        'overflow-hidden rounded-card rounded-[22px] border border-white/80 bg-white/95 backdrop-blur-md shadow-xs transition-all',
        className,
      )}
    >
      <dl className="grid gap-0 sm:grid-cols-2 lg:grid-cols-4 divide-y sm:divide-y-0 sm:divide-x divide-slate-100/90">
        {items.map((item) => (
          <div key={item.id} className="min-w-0 p-5 sm:p-5.5 hover:bg-sky-50/20 transition-colors">
            <dt className="text-[11px] font-extrabold tracking-wider text-slate-500 uppercase break-words">
              {item.label}
            </dt>
            <dd className="mt-2 min-h-7 text-2xl font-black tracking-tight tabular-nums break-words text-slate-900">
              {isLoading ? (
                <span
                  className="block h-7 w-20 animate-pulse rounded-lg bg-slate-100 motion-reduce:animate-none"
                  aria-hidden="true"
                />
              ) : item.href ? (
                <a
                  href={item.href}
                  aria-label={item.accessibleLabel}
                  className="inline-flex items-center gap-1.5 text-slate-900 hover:text-brand transition-colors focus-visible:rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
                >
                  {item.value}
                  <ChevronRight className="h-3.5 w-3.5 text-slate-400 group-hover:text-brand" aria-hidden="true" />
                </a>
              ) : (
                item.value
              )}
            </dd>
            {!isLoading && item.detail ? (
              <dd className="mt-1 text-xs font-medium leading-relaxed text-slate-500 break-words">
                {item.detail}
              </dd>
            ) : null}
          </div>
        ))}
      </dl>
      {isLoading ? <span className="sr-only">Đang tải số liệu vận hành…</span> : null}
    </section>
  );
}
