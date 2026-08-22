import React from 'react';

export interface DriverCallingCardProps {
  readonly name: string;
  readonly roleSubtitle?: string;
  readonly company?: string;
  readonly phone?: string;
  readonly avatarUrl?: string;
  readonly onAccept?: () => void;
  readonly onReject?: () => void;
  readonly acceptLabel?: string;
  readonly rejectLabel?: string;
  readonly isOnline?: boolean;
}

export function DriverCallingCard({
  name,
  roleSubtitle = 'Đang trong ca trực',
  company = 'Đội xe Sao Mai',
  phone = '0908 234 889',
  onAccept,
  onReject,
  acceptLabel = 'Chấp nhận',
  rejectLabel = 'Từ chối',
  isOnline = true,
}: Readonly<DriverCallingCardProps>) {
  return (
    <div className="flex flex-col justify-between rounded-2xl border border-slate-100 bg-white p-5 shadow-xs transition-all hover:shadow-md dark:border-slate-800/80 dark:bg-slate-900">
      <div className="flex items-center gap-3.5">
        <div className="relative flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-gradient-to-tr from-indigo-500 to-sky-400 text-lg font-bold text-white shadow-sm">
          {name.charAt(0)}
          {isOnline ? (
            <span className="absolute bottom-0 right-0 h-3.5 w-3.5 rounded-full border-2 border-white bg-emerald-500 dark:border-slate-900" />
          ) : null}
        </div>
        <div className="min-w-0 flex-1">
          <h4 className="truncate text-sm font-bold text-slate-900 dark:text-white">{name}</h4>
          <p className="truncate text-xs text-slate-400 dark:text-slate-500">{roleSubtitle}</p>
        </div>
      </div>

      {/* Info rows */}
      <div className="my-4 space-y-1.5 rounded-xl bg-slate-50 p-3 text-xs dark:bg-slate-800/50">
        <div className="flex justify-between">
          <span className="text-slate-400 dark:text-slate-500">Đơn vị</span>
          <span className="font-semibold text-slate-700 dark:text-slate-200">{company}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-slate-400 dark:text-slate-500">Hotline</span>
          <span className="font-bold tabular-nums text-slate-900 dark:text-white">{phone}</span>
        </div>
      </div>

      {/* Action buttons */}
      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={onReject}
          className="inline-flex h-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-xs font-semibold text-slate-600 transition-colors hover:bg-slate-50 hover:text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
        >
          {rejectLabel}
        </button>
        <button
          type="button"
          onClick={onAccept}
          className="inline-flex h-9 items-center justify-center rounded-xl bg-indigo-600 text-xs font-semibold text-white shadow-xs transition-colors hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-600"
        >
          {acceptLabel}
        </button>
      </div>
    </div>
  );
}
