import React from 'react';

export interface WaypointItem {
  readonly title: string;
  readonly role: 'departure' | 'waypoint' | 'arrival';
  readonly timeLabel?: string;
  readonly isCompleted?: boolean;
}

export interface TrackingWaypointCardProps {
  readonly trackingNumber: string;
  readonly statusLabel?: string;
  readonly waypoints?: readonly WaypointItem[];
}

const DEFAULT_WAYPOINTS: readonly WaypointItem[] = [
  { title: 'Kho Tổng Quận 7 (Điểm lấy)', role: 'departure', timeLabel: '13:45 · Đã lấy hàng', isCompleted: true },
  { title: 'Hub Trung Chuyển Quận 4', role: 'waypoint', timeLabel: '14:10 · Đã qua trạm', isCompleted: true },
  { title: 'Điểm giao TP. Thủ Đức', role: 'arrival', timeLabel: 'ETA dự kiến 15:30', isCompleted: false },
];

export function TrackingWaypointCard({
  trackingNumber,
  statusLabel = 'Đang vận chuyển',
  waypoints = DEFAULT_WAYPOINTS,
}: Readonly<TrackingWaypointCardProps>) {
  return (
    <div className="flex flex-col justify-between rounded-2xl border border-slate-100 bg-white p-5 shadow-xs transition-all hover:shadow-md dark:border-slate-800/80 dark:bg-slate-900">
      <div className="flex items-center justify-between border-b border-slate-100 pb-3 dark:border-slate-800/80">
        <div>
          <span className="text-[11px] font-medium text-slate-400 dark:text-slate-500">Mã vận đơn</span>
          <h4 className="font-mono text-sm font-bold text-slate-900 dark:text-white">#{trackingNumber}</h4>
        </div>
        <span className="inline-flex items-center rounded-full bg-indigo-50 px-2.5 py-1 text-xs font-semibold text-indigo-600 dark:bg-indigo-950/50 dark:text-indigo-400">
          {statusLabel}
        </span>
      </div>

      {/* Waypoints route spine */}
      <div className="mt-4 space-y-4">
        {waypoints.map((wp, idx) => {
          const isLast = idx === waypoints.length - 1;
          return (
            <div key={wp.title} className="relative flex items-start gap-3">
              {/* Connector line */}
              {!isLast ? (
                <div
                  className={`absolute left-[11px] top-5 h-full w-0.5 ${
                    wp.isCompleted ? 'bg-indigo-500' : 'bg-slate-200 dark:bg-slate-700'
                  }`}
                />
              ) : null}

              {/* Node dot */}
              <div
                className={`relative z-10 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 ${
                  wp.isCompleted
                    ? 'border-indigo-600 bg-indigo-600 text-white'
                    : wp.role === 'arrival'
                      ? 'border-emerald-500 bg-white dark:bg-slate-900 text-emerald-500'
                      : 'border-slate-300 bg-white dark:bg-slate-900'
                }`}
              >
                {wp.isCompleted ? (
                  <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                  </svg>
                ) : (
                  <span className={`h-2 w-2 rounded-full ${wp.role === 'arrival' ? 'bg-emerald-500' : 'bg-slate-400'}`} />
                )}
              </div>

              {/* Waypoint details */}
              <div className="min-w-0 flex-1 pt-0.5">
                <p className="text-xs font-bold text-slate-800 dark:text-slate-200">{wp.title}</p>
                {wp.timeLabel ? (
                  <p className="mt-0.5 text-[11px] text-slate-400 dark:text-slate-500">{wp.timeLabel}</p>
                ) : null}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
