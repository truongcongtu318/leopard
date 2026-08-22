import React from 'react';

export interface VehicleSpecCardProps {
  readonly modelName?: string;
  readonly plateNumber?: string;
  readonly volume?: string;
  readonly length?: string;
  readonly width?: string;
}

export function VehicleSpecCard({
  modelName = 'White Bengala Box',
  plateNumber = '51C-882.34',
  volume = '45.2 m³',
  length = '3.6 m',
  width = '1.8 m',
}: Readonly<VehicleSpecCardProps>) {
  return (
    <div className="flex flex-col justify-between rounded-2xl border border-slate-100 bg-white p-5 shadow-xs transition-all hover:shadow-md dark:border-slate-800/80 dark:bg-slate-900">
      <div className="flex items-center justify-between border-b border-slate-100 pb-3 dark:border-slate-800/80">
        <div>
          <span className="text-[11px] font-medium text-slate-400 dark:text-slate-500">Thông số phương tiện</span>
          <h4 className="text-sm font-bold text-slate-900 dark:text-white">{modelName}</h4>
        </div>
        <span className="font-mono text-xs font-bold text-slate-700 dark:text-slate-300 rounded-md bg-slate-100 px-2 py-0.5 dark:bg-slate-800">
          {plateNumber}
        </span>
      </div>

      {/* Truck Vector Illustration */}
      <div className="my-3 flex items-center justify-center py-1">
        <svg className="h-20 w-40 text-indigo-500" viewBox="0 0 160 80" fill="none">
          {/* Truck Body */}
          <rect x="15" y="15" width="85" height="42" rx="4" fill="#EEF2FF" stroke="#6366F1" strokeWidth="2" />
          <rect x="100" y="28" width="40" height="29" rx="3" fill="#E0E7FF" stroke="#4F46E5" strokeWidth="2" />
          {/* Windshield */}
          <path d="M120 32 L136 32 L138 42 L120 42 Z" fill="#93C5FD" opacity="0.8" />
          {/* Wheels */}
          <circle cx="40" cy="58" r="9" fill="#1E293B" stroke="#64748B" strokeWidth="2" />
          <circle cx="40" cy="58" r="4" fill="#94A3B8" />
          <circle cx="75" cy="58" r="9" fill="#1E293B" stroke="#64748B" strokeWidth="2" />
          <circle cx="75" cy="58" r="4" fill="#94A3B8" />
          <circle cx="125" cy="58" r="9" fill="#1E293B" stroke="#64748B" strokeWidth="2" />
          <circle cx="125" cy="58" r="4" fill="#94A3B8" />
        </svg>
      </div>

      {/* Specs Badges */}
      <div className="grid grid-cols-3 gap-2">
        <div className="rounded-xl bg-slate-50 p-2 text-center dark:bg-slate-800/50">
          <span className="text-[10px] text-slate-400 dark:text-slate-500">Thể tích</span>
          <p className="mt-0.5 text-xs font-bold text-slate-900 dark:text-white">{volume}</p>
        </div>
        <div className="rounded-xl bg-slate-50 p-2 text-center dark:bg-slate-800/50">
          <span className="text-[10px] text-slate-400 dark:text-slate-500">Chiều dài</span>
          <p className="mt-0.5 text-xs font-bold text-slate-900 dark:text-white">{length}</p>
        </div>
        <div className="rounded-xl bg-slate-50 p-2 text-center dark:bg-slate-800/50">
          <span className="text-[10px] text-slate-400 dark:text-slate-500">Chiều rộng</span>
          <p className="mt-0.5 text-xs font-bold text-slate-900 dark:text-white">{width}</p>
        </div>
      </div>
    </div>
  );
}
