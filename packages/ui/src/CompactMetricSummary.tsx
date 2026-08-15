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
      className={cn('border-y border-neutral-border bg-neutral py-sm text-neutral-text', className)}
    >
      <dl className="grid gap-sm sm:grid-cols-2 lg:grid-cols-4">
        {items.map((item) => (
          <div key={item.id} className="min-w-0 px-sm">
            <dt className="text-xs font-semibold text-neutral-muted break-words">{item.label}</dt>
            <dd className="mt-xxs min-h-lg text-section-title font-semibold tabular-nums break-words">
              {isLoading ? (
                <span
                  className="block h-lg w-full animate-pulse rounded-control bg-neutral-surface motion-reduce:animate-none"
                  aria-hidden="true"
                />
              ) : item.href ? (
                <a
                  href={item.href}
                  aria-label={item.accessibleLabel}
                  className="inline-flex min-h-11 items-center text-brand underline-offset-4 hover:underline focus-visible:rounded-control focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2"
                >
                  {item.value}
                </a>
              ) : (
                item.value
              )}
            </dd>
            {!isLoading && item.detail ? (
              <dd className="mt-xxs text-xs text-neutral-muted break-words">{item.detail}</dd>
            ) : null}
          </div>
        ))}
      </dl>
      {isLoading ? <span className="sr-only">Đang tải số liệu vận hành…</span> : null}
    </section>
  );
}
