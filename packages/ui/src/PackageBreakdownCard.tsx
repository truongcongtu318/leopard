import React from 'react';

export interface PackageCategory {
  readonly name: string;
  readonly percentage: number;
  readonly countLabel?: string;
  readonly color?: string;
}

export interface PackageBreakdownCardProps {
  readonly totalItems?: string;
  readonly categories?: readonly PackageCategory[];
}

const DEFAULT_CATEGORIES: readonly PackageCategory[] = [
  { name: 'Điện tử', percentage: 67, countLabel: '27.590', color: 'bg-indigo-600' },
  { name: 'Gia dụng', percentage: 24, countLabel: '9.880', color: 'bg-sky-500' },
  { name: 'Thời trang', percentage: 43, countLabel: '17.700', color: 'bg-violet-500' },
];

export function PackageBreakdownCard({
  totalItems = '41.180 kiện',
  categories = DEFAULT_CATEGORIES,
}: Readonly<PackageBreakdownCardProps>) {
  return (
    <div className="flex flex-col justify-between rounded-2xl border border-slate-100 bg-white p-5 shadow-xs transition-all hover:shadow-md dark:border-slate-800/80 dark:bg-slate-900">
      <div className="flex items-center justify-between border-b border-slate-100 pb-3 dark:border-slate-800/80">
        <div>
          <span className="text-[11px] font-medium text-slate-400 dark:text-slate-500">Chi tiết hàng hóa</span>
          <h4 className="text-sm font-bold text-slate-900 dark:text-white">Phân loại kiện hàng</h4>
        </div>
        <span className="font-bold text-xs tabular-nums text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/50 px-2.5 py-1 rounded-full">
          {totalItems}
        </span>
      </div>

      {/* Vertical bars */}
      <div className="mt-4 flex h-40 items-end justify-around gap-4 px-2">
        {categories.map((cat) => (
          <div key={cat.name} className="flex flex-1 flex-col items-center justify-end h-full">
            <span className="mb-2 text-xs font-bold text-slate-700 dark:text-slate-300">
              {cat.percentage}%
            </span>
            <div className="w-full flex justify-center h-full items-end">
              <div
                style={{ height: `${cat.percentage}%` }}
                className={`w-full max-w-[42px] rounded-t-xl transition-all duration-500 ${
                  cat.color ?? 'bg-indigo-600'
                }`}
              />
            </div>
            <span className="mt-2.5 text-[11px] font-semibold text-slate-800 dark:text-slate-200">
              {cat.name}
            </span>
            {cat.countLabel ? (
              <span className="text-[10px] text-slate-400 dark:text-slate-500">
                {cat.countLabel}
              </span>
            ) : null}
          </div>
        ))}
      </div>
    </div>
  );
}
