import React from 'react';

export interface CapacityItem {
  readonly day: string;
  readonly value: number;
  readonly target?: number;
  readonly isPeak?: boolean;
}

export interface CapacityBarChartProps {
  readonly title?: string;
  readonly activeWeightTag?: string;
  readonly items?: readonly CapacityItem[];
}

const DEFAULT_CAPACITY: readonly CapacityItem[] = [
  { day: '3 Nov', value: 45 },
  { day: '5 Nov', value: 65 },
  { day: '8 Nov', value: 92, isPeak: true },
  { day: '10 Nov', value: 55 },
  { day: '12 Nov', value: 38 },
];

export function CapacityBarChart({
  title = 'Tải trọng đội xe',
  activeWeightTag = '30kg - 40kg',
  items = DEFAULT_CAPACITY,
}: Readonly<CapacityBarChartProps>) {
  return (
    <div className="flex flex-col justify-between rounded-2xl border border-slate-100 bg-white p-5 shadow-xs transition-all hover:shadow-md dark:border-slate-800/80 dark:bg-slate-900">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">{title}</span>
        <span className="rounded-full bg-violet-50 px-2.5 py-0.5 text-xs font-bold text-violet-600 dark:bg-violet-950/40 dark:text-violet-400">
          {activeWeightTag}
        </span>
      </div>

      <div className="mt-4 flex h-20 items-end justify-between gap-3 pt-2">
        {items.map((item) => (
          <div key={item.day} className="flex flex-1 flex-col items-center justify-end h-full">
            <div className="w-full flex justify-center h-full items-end">
              <div
                style={{ height: `${item.value}%` }}
                className={`w-full max-w-[24px] rounded-t-lg transition-all duration-500 ${
                  item.isPeak
                    ? 'bg-violet-600 shadow-sm shadow-violet-500/30'
                    : 'bg-violet-200 dark:bg-violet-900/60'
                }`}
              />
            </div>
            <span className="mt-2 text-[10px] font-medium text-slate-400 dark:text-slate-500">
              {item.day}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
