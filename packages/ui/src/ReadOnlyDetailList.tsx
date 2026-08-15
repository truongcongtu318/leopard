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
      <dl className="grid gap-sm text-body-compact text-neutral-text">
        {items.map((item) => {
          const state = item.state ?? 'value';
          const renderedValue =
            state === 'value' ? (item.value ?? 'Chưa có dữ liệu') : stateCopy[state];

          return (
            <div key={item.id} className="grid min-w-0 gap-xxs sm:grid-cols-3">
              <dt className="font-semibold text-neutral-muted break-words">{item.label}</dt>
              <dd className="min-w-0 break-words sm:col-span-2">{renderedValue}</dd>
            </div>
          );
        })}
      </dl>
    </div>
  );
}
