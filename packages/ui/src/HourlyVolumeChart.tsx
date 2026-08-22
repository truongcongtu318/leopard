import React from 'react';

export interface HourlyVolumeDataPoint {
  readonly hour: string;
  readonly count: number;
  readonly activeCount?: number;
}

export interface HourlyVolumeChartProps {
  readonly data?: readonly HourlyVolumeDataPoint[];
  readonly title?: string;
  readonly subtitle?: string;
  readonly peakHourLabel?: string;
}

const DEFAULT_DATA: readonly HourlyVolumeDataPoint[] = [
  { hour: '06:00', count: 12, activeCount: 4 },
  { hour: '08:00', count: 38, activeCount: 14 },
  { hour: '10:00', count: 64, activeCount: 22 },
  { hour: '12:00', count: 82, activeCount: 28 },
  { hour: '14:00', count: 95, activeCount: 32 },
  { hour: '16:00', count: 74, activeCount: 25 },
  { hour: '18:00', count: 58, activeCount: 18 },
  { hour: '20:00', count: 32, activeCount: 10 },
  { hour: '22:00', count: 16, activeCount: 5 },
];

export function HourlyVolumeChart({
  data = DEFAULT_DATA,
  title = 'Nhịp độ đơn hàng theo giờ (24h)',
  subtitle = 'Phân bổ lưu lượng đơn tạo mới và đơn đang hoạt động theo khung giờ',
  peakHourLabel = 'Cao điểm: 14:00 (95 đơn)',
}: Readonly<HourlyVolumeChartProps>) {
  const maxVal = Math.max(...data.map((d) => d.count), 10);

  return (
    <div
      aria-label={title}
      className="rounded-xl border border-slate-200/80 bg-white p-5 shadow-xs transition-all dark:border-slate-800/80 dark:bg-slate-900/60"
    >
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3 dark:border-slate-800/80">
        <div>
          <h3 className="text-sm font-bold tracking-tight text-slate-900 dark:text-white">
            {title}
          </h3>
          <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">{subtitle}</p>
        </div>
        <span className="inline-flex items-center gap-1.5 rounded-full bg-sky-500/10 px-2.5 py-1 text-xs font-semibold text-sky-600 dark:text-sky-400">
          <span className="h-1.5 w-1.5 rounded-full bg-sky-500 animate-pulse" />
          {peakHourLabel}
        </span>
      </div>

      <div className="mt-4">
        {/* Chart container */}
        <div className="flex h-36 items-end gap-2 sm:gap-3 pt-4 pb-1">
          {data.map((point) => {
            const heightPercent = Math.max(8, Math.round((point.count / maxVal) * 100));
            const isPeak = point.count === maxVal;
            return (
              <div
                key={point.hour}
                className="group relative flex flex-1 flex-col items-center justify-end h-full"
              >
                {/* Tooltip */}
                <div className="pointer-events-none absolute -top-8 z-10 hidden rounded bg-slate-900 px-2 py-0.5 text-[10px] font-semibold text-white shadow-md group-hover:block dark:bg-slate-800">
                  {point.count} đơn
                </div>

                {/* Bar */}
                <div className="w-full flex justify-center h-full items-end">
                  <div
                    style={{ height: `${heightPercent}%` }}
                    className={`w-full max-w-[28px] rounded-t-md transition-all duration-300 ${
                      isPeak
                        ? 'bg-gradient-to-t from-sky-600 to-cyan-400 shadow-sm shadow-sky-500/30'
                        : 'bg-slate-200 hover:bg-sky-400/80 dark:bg-slate-700/80 dark:hover:bg-sky-500/80'
                    }`}
                  />
                </div>

                {/* X-axis label */}
                <span className="mt-2 text-[10px] font-medium text-slate-400 dark:text-slate-500">
                  {point.hour}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
