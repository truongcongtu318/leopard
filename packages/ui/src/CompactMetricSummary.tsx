import React from 'react';
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
      className={cn('overflow-hidden rounded-[16px] border border-neutral-border/20 bg-gradient-to-br from-neutral-text via-[#1e293b] to-[#0f172a] shadow-elevated relative', className)}
    >
      <div className="absolute inset-0 bg-gradient-to-br from-brand/10 via-transparent to-teal-600/10 pointer-events-none" />
      <dl className="relative grid gap-0 sm:grid-cols-2 lg:grid-cols-4 divide-y sm:divide-y-0 sm:divide-x divide-white/10">
        {items.map((item) => (
          <div key={item.id} className="min-w-0 p-5">
            <dt className="text-xs font-semibold tracking-wide text-white/60 uppercase break-words">{item.label}</dt>
            <dd className="mt-2 min-h-lg text-2xl font-bold tabular-nums break-words text-white">
              {isLoading ? (
                <span
                  className="block h-7 w-20 animate-pulse rounded-lg bg-white/20 motion-reduce:animate-none"
                  aria-hidden="true"
                />
              ) : item.href ? (
                <a
                  href={item.href}
                  aria-label={item.accessibleLabel}
                  className="inline-flex items-center gap-1.5 text-white underline-offset-4 hover:underline decoration-white/30 focus-visible:rounded-control focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50"
                >
                  {item.value}
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="opacity-60"><path d="m9 18 6-6-6-6"/></svg>
                </a>
              ) : (
                item.value
              )}
            </dd>
            {!isLoading && item.detail ? (
              <dd className="mt-1 text-xs leading-relaxed text-white/60 break-words">{item.detail}</dd>
            ) : null}
          </div>
        ))}
      </dl>
      {isLoading ? <span className="sr-only">Đang tải số liệu vận hành…</span> : null}
    </section>
  );
}
