import React from 'react';
import { cn } from './cn';

export type ReadOnlyDetailState = 'value' | 'unavailable' | 'restricted';

export type ReadOnlyDetailItem = Readonly<{
  id: string;
  label: string;
  value?: React.ReactNode;
  state?: ReadOnlyDetailState;
}>;

export type ReadOnlyDetailListProps = Readonly<{
  items: readonly ReadOnlyDetailItem[];
  ariaLabel: string;
  className?: string;
}>;

const stateCopy: Readonly<Record<Exclude<ReadOnlyDetailState, 'value'>, string>> = {
  unavailable: 'Chưa có dữ liệu',
  restricted: 'Thông tin bị giới hạn',
};

export function ReadOnlyDetailList({ items, ariaLabel, className }: ReadOnlyDetailListProps) {
  return (
    <div role="group" aria-label={ariaLabel} className={className}>
      <dl className="grid gap-2 text-xs sm:text-sm text-neutral-text">
        {items.map((item) => {
          const state = item.state ?? 'value';
          const renderedValue =
            state === 'value' ? (item.value ?? 'Chưa có dữ liệu') : stateCopy[state];

          return (
            <div key={item.id} className="grid min-w-0 gap-1 rounded-xl bg-slate-50/70 p-3 sm:grid-cols-3 sm:items-center border border-slate-100/80 transition-colors hover:bg-slate-50">
              <dt className="text-xs font-bold text-slate-500 break-words">{item.label}</dt>
              <dd className="min-w-0 font-medium text-slate-800 break-words sm:col-span-2">{renderedValue}</dd>
            </div>
          );
        })}
      </dl>
    </div>
  );
}
