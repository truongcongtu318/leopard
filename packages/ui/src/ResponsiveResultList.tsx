import React from 'react';
import { cn } from './cn';
import { ReadOnlyDetailList, type ReadOnlyDetailItem } from './ReadOnlyDetailList';

export type ResponsiveResultItem = Readonly<{
  id: string;
  heading: React.ReactNode;
  status?: React.ReactNode;
  details: readonly ReadOnlyDetailItem[];
  actions?: React.ReactNode;
}>;

export type ResponsiveResultListProps = Readonly<{
  items: readonly ResponsiveResultItem[];
  ariaLabel: string;
  emptyMessage?: string;
  className?: string;
}>;

export function ResponsiveResultList({
  items,
  ariaLabel,
  emptyMessage = 'Chưa có kết quả để hiển thị.',
  className,
}: ResponsiveResultListProps) {
  return (
    <ul aria-label={ariaLabel} className={cn('m-0 grid list-none gap-3.5 p-0 md:hidden', className)}>
      {items.length === 0 ? (
        <li className="rounded-2xl border border-dashed border-slate-200 bg-white/60 p-8 text-center text-xs font-medium text-slate-500 shadow-2xs">
          {emptyMessage}
        </li>
      ) : (
        items.map((item) => (
          <li key={item.id}>
            <article className="rounded-2xl border border-slate-200/80 bg-white p-4 text-neutral-text shadow-xs border-l-4 border-l-brand hover:border-slate-300 transition-all">
              <header className="flex flex-wrap items-start justify-between gap-2">
                <h3 className="min-w-0 text-sm font-bold text-slate-900 break-words">{item.heading}</h3>
                {item.status}
              </header>
              <ReadOnlyDetailList
                ariaLabel={`Chi tiết ${item.id}`}
                items={item.details}
                className="mt-3"
              />
              {item.actions ? (
                <div className="mt-3 flex flex-wrap gap-2 pt-2 border-t border-slate-100">{item.actions}</div>
              ) : null}
            </article>
          </li>
        ))
      )}
    </ul>
  );
}
