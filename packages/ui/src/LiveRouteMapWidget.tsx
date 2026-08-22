import React from 'react';

export interface LiveRouteMapWidgetProps {
  readonly originName?: string;
  readonly destinationName?: string;
  readonly remainingDistance?: string;
  readonly remainingEta?: string;
  readonly height?: number | string;
}

export function LiveRouteMapWidget({
  originName = 'Kho Tổng Quận 7',
  destinationName = 'Điểm giao TP. Thủ Đức',
  remainingDistance = '50 km',
  remainingEta = '1 giờ 20 phút',
  height = 320,
}: Readonly<LiveRouteMapWidgetProps>) {
  return (
    <div
      style={{ height }}
      className="relative overflow-hidden rounded-2xl border border-slate-100 bg-[#F1F5F9] shadow-xs dark:border-slate-800 dark:bg-slate-950"
    >
      {/* Modern stylized vector map background */}
      <svg className="absolute inset-0 h-full w-full opacity-60 dark:opacity-25" xmlns="http://www.w3.org/2000/svg">
        {/* Road network grid lines */}
        <line x1="0" y1="60" x2="100%" y2="60" stroke="#CBD5E1" strokeWidth="6" />
        <line x1="0" y1="180" x2="100%" y2="180" stroke="#CBD5E1" strokeWidth="8" />
        <line x1="0" y1="280" x2="100%" y2="280" stroke="#CBD5E1" strokeWidth="4" />
        <line x1="120" y1="0" x2="120" y2="100%" stroke="#CBD5E1" strokeWidth="8" />
        <line x1="280" y1="0" x2="280" y2="100%" stroke="#CBD5E1" strokeWidth="12" />
        <line x1="480" y1="0" x2="480" y2="100%" stroke="#CBD5E1" strokeWidth="6" />
        <line x1="640" y1="0" x2="640" y2="100%" stroke="#CBD5E1" strokeWidth="10" />

        {/* Diagonal boulevard */}
        <line x1="0" y1="320" x2="600" y2="0" stroke="#E2E8F0" strokeWidth="14" />
        <line x1="200" y1="320" x2="800" y2="0" stroke="#E2E8F0" strokeWidth="10" />

        {/* Blue Shipment Polyline */}
        <path
          d="M 120 180 Q 200 180 280 120 T 480 120 T 640 220"
          fill="none"
          stroke="#4F46E5"
          strokeWidth="6"
          strokeLinecap="round"
          strokeDasharray="12 6"
          className="animate-pulse"
        />

        {/* Origin Marker */}
        <circle cx="120" cy="180" r="8" fill="#4F46E5" />
        <circle cx="120" cy="180" r="16" fill="#4F46E5" opacity="0.2" />

        {/* Moving Truck / Current GPS Marker */}
        <circle cx="380" cy="120" r="12" fill="#2563EB" />
        <circle cx="380" cy="120" r="22" fill="#3B82F6" opacity="0.3" className="animate-ping" />

        {/* Destination Marker */}
        <circle cx="640" cy="220" r="9" fill="#10B981" />
        <circle cx="640" cy="220" r="18" fill="#10B981" opacity="0.25" />
      </svg>

      {/* Floating HUD Card: ETA & Distance */}
      <div className="absolute bottom-4 left-4 z-10 flex items-center gap-4 rounded-xl border border-slate-100 bg-white/95 px-4 py-3 shadow-lg backdrop-blur-md dark:border-slate-800 dark:bg-slate-900/95">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 dark:bg-indigo-950/60 dark:text-indigo-400">
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
        </div>
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
            Khoảng cách đến điểm giao
          </p>
          <p className="text-sm font-extrabold text-slate-900 dark:text-white">
            <span className="text-indigo-600 dark:text-indigo-400">{remainingDistance}</span> · {remainingEta}
          </p>
        </div>
      </div>

      {/* Live Badge in top right */}
      <div className="absolute top-4 right-4 z-10 flex items-center gap-1.5 rounded-full bg-white/90 px-3 py-1 text-xs font-semibold text-slate-700 shadow-sm backdrop-blur-xs dark:bg-slate-900/90 dark:text-slate-200">
        <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
        GPS Live Radar
      </div>
    </div>
  );
}
