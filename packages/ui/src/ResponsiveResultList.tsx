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
    <ul aria-label={ariaLabel} className={cn('m-0 grid list-none gap-md p-0 md:hidden', className)}>
      {items.length === 0 ? (
        <li className="border-y border-neutral-border py-lg text-center text-neutral-muted">
          {emptyMessage}
        </li>
      ) : (
        items.map((item) => (
          <li key={item.id}>
            <article className="border-b border-neutral-border pb-md text-neutral-text">
              <header className="flex flex-wrap items-start justify-between gap-xs">
                <h3 className="min-w-0 font-semibold break-words">{item.heading}</h3>
                {item.status}
              </header>
              <ReadOnlyDetailList
                ariaLabel={`Chi tiết ${item.id}`}
                items={item.details}
                className="mt-sm"
              />
              {item.actions ? (
                <div className="mt-sm flex flex-wrap gap-xs">{item.actions}</div>
              ) : null}
            </article>
          </li>
        ))
      )}
    </ul>
  );
}
