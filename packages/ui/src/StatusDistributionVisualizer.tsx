import React from 'react';
import { StatusBadge, type OrderStatus } from './StatusBadge';

export interface StatusDistributionItem {
  readonly status: OrderStatus;
  readonly count: number;
  readonly label?: string;
}

export interface StatusDistributionVisualizerProps {
  readonly items: readonly StatusDistributionItem[];
  readonly title?: string;
  readonly description?: string;
}

const STATUS_COLORS: Record<OrderStatus, string> = {
  DELIVERED: 'bg-emerald-500',
  IN_TRANSIT: 'bg-blue-600',
  PICKED_UP: 'bg-sky-500',
  PICKING_UP: 'bg-cyan-500',
  ACCEPTED: 'bg-indigo-500',
  REQUESTED: 'bg-amber-500',
  CANCELLED: 'bg-rose-500',
};

export function StatusDistributionVisualizer({
  items,
  title = 'Phân bổ trạng thái đơn',
  description = 'Tỷ lệ theo snapshot hiện tại',
}: Readonly<StatusDistributionVisualizerProps>) {
  const total = items.reduce((sum, item) => sum + item.count, 0);

  return (
    <div
      aria-label={title}
      className="rounded-xl border border-slate-200/80 bg-white p-5 shadow-xs transition-all dark:border-slate-800/80 dark:bg-slate-900/60"
    >
      <div className="flex items-center justify-between border-b border-slate-100 pb-3 dark:border-slate-800/80">
        <div>
          <h3 className="text-sm font-bold tracking-tight text-slate-900 dark:text-white">{title}</h3>
          <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">{description}</p>
        </div>
        <span className="text-xs font-semibold text-slate-600 dark:text-slate-300">
          Tổng: <span className="font-bold tabular-nums text-slate-900 dark:text-white">{total} đơn</span>
        </span>
      </div>

      {/* Segmented progress bar */}
      <div className="mt-4">
        <div className="flex h-3 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800 p-0.5 gap-0.5">
          {items.map((item) => {
            if (item.count === 0 || total === 0) return null;
            const pct = Math.max(2, Math.round((item.count / total) * 100));
            const colorClass = STATUS_COLORS[item.status] ?? 'bg-slate-400';
            return (
              <div
                key={item.status}
                style={{ width: `${pct}%` }}
                title={`${item.status}: ${item.count} (${pct}%)`}
                className={`h-full rounded-full transition-all duration-500 ${colorClass}`}
              />
            );
          })}
        </div>

        {/* Legend grid */}
        <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 gap-2">
          {items.map((item) => {
            const pct = total > 0 ? Math.round((item.count / total) * 100) : 0;
            return (
              <div
                key={item.status}
                className="flex items-center justify-between rounded-lg bg-slate-50 px-2.5 py-1.5 dark:bg-slate-800/40"
              >
                <div className="flex items-center gap-1.5 min-w-0">
                  <span className={`h-2 w-2 rounded-full shrink-0 ${STATUS_COLORS[item.status] ?? 'bg-slate-400'}`} />
                  <StatusBadge domain="orderStatus" status={item.status} />
                </div>
                <div className="text-right pl-2">
                  <span className="text-xs font-bold tabular-nums text-slate-800 dark:text-slate-200">{item.count}</span>
                  <span className="ml-1 text-[10px] text-slate-400">({pct}%)</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
