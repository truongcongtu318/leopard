import React from 'react';

export interface FleetUtilizationGaugeProps {
  readonly activeDrivers: number;
  readonly totalDrivers: number;
  readonly activeTrips: number;
  readonly title?: string;
  readonly subtitle?: string;
}

export function FleetUtilizationGauge({
  activeDrivers,
  totalDrivers,
  activeTrips,
  title = 'Hiệu suất vận hành đội xe',
  subtitle = 'Tỷ lệ tài xế đang lăn bánh trên tổng số đội xe',
}: Readonly<FleetUtilizationGaugeProps>) {
  const percentage = totalDrivers > 0 ? Math.round((activeDrivers / totalDrivers) * 100) : 0;
  const strokeDashoffset = 283 - (283 * percentage) / 100;

  return (
    <div
      aria-label={title}
      className="rounded-xl border border-slate-200/80 bg-white p-5 shadow-xs transition-all dark:border-slate-800/80 dark:bg-slate-900/60"
    >
      <div className="flex items-center justify-between border-b border-slate-100 pb-3 dark:border-slate-800/80">
        <div>
          <h3 className="text-sm font-bold tracking-tight text-slate-900 dark:text-white">{title}</h3>
          <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">{subtitle}</p>
        </div>
        <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-2 py-0.5 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
          Realtime
        </span>
      </div>

      <div className="mt-4 flex flex-col sm:flex-row items-center justify-around gap-6">
        {/* Radial gauge */}
        <div className="relative flex items-center justify-center">
          <svg className="h-28 w-28 -rotate-90 transform" viewBox="0 0 100 100">
            {/* Background track */}
            <circle
              className="text-slate-100 dark:text-slate-800"
              stroke="currentColor"
              strokeWidth="10"
              fill="transparent"
              r="45"
              cx="50"
              cy="50"
            />
            {/* Progress arc */}
            <circle
              className="text-sky-500 transition-all duration-1000 ease-out"
              stroke="currentColor"
              strokeWidth="10"
              strokeDasharray="283"
              strokeDashoffset={strokeDashoffset}
              strokeLinecap="round"
              fill="transparent"
              r="45"
              cx="50"
              cy="50"
            />
          </svg>
          <div className="absolute flex flex-col items-center justify-center text-center">
            <span className="text-2xl font-black tabular-nums tracking-tight text-slate-900 dark:text-white">
              {percentage}%
            </span>
            <span className="text-[10px] font-medium uppercase tracking-wider text-slate-400">
              Công suất
            </span>
          </div>
        </div>

        {/* Breakdown counters */}
        <div className="grid grid-cols-2 sm:grid-cols-1 gap-3 w-full sm:w-auto">
          <div className="rounded-lg bg-sky-50/80 dark:bg-sky-950/30 border border-sky-100 dark:border-sky-900/50 p-2.5">
            <p className="text-[11px] font-medium text-sky-700 dark:text-sky-400">Tài xế đang chạy</p>
            <p className="text-lg font-bold tabular-nums text-sky-950 dark:text-sky-100">
              {activeDrivers} <span className="text-xs font-normal text-sky-600/80">/ {totalDrivers} xe</span>
            </p>
          </div>
          <div className="rounded-lg bg-emerald-50/80 dark:bg-emerald-950/30 border border-emerald-100 dark:border-emerald-900/50 p-2.5">
            <p className="text-[11px] font-medium text-emerald-700 dark:text-emerald-400">Chuyến đang giao</p>
            <p className="text-lg font-bold tabular-nums text-emerald-950 dark:text-emerald-100">
              {activeTrips} <span className="text-xs font-normal text-emerald-600/80">chuyến active</span>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
