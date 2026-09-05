'use client';

import React from 'react';

export interface StatusOverviewCardProps {
  title?: string;
  periodLabel?: string;
  loadingPercent?: number;
  inTransitPercent?: number;
  unloadingPercent?: number;
  deliveredPercent?: number;
}

export function StatusOverviewCard({
  title = 'Cơ cấu trạng thái đơn',
  periodLabel = 'Tháng này',
  loadingPercent = 17,
  inTransitPercent = 32,
  unloadingPercent = 13,
  deliveredPercent = 38,
}: StatusOverviewCardProps) {
  return (
    <div className="rounded-3xl bg-white p-5 sm:p-6 border border-slate-100 shadow-sm flex flex-col justify-between gap-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-base font-bold text-slate-900">{title}</h2>
        <span className="rounded-full bg-slate-100/90 px-3 py-1 text-xs font-semibold text-slate-600">
          {periodLabel}
        </span>
      </div>

      {/* 4 Status Metric Columns */}
      <div className="grid grid-cols-4 gap-2 text-center sm:text-left">
        {/* Đang lấy hàng */}
        <div>
          <p className="text-base sm:text-lg font-bold text-slate-900 tabular-nums">{loadingPercent}%</p>
          <p className="text-[11px] font-medium text-slate-500 flex items-center justify-center sm:justify-start gap-1 mt-0.5">
            <span className="h-1.5 w-1.5 rounded-full bg-amber-400 shrink-0" aria-hidden="true" />
            Đang lấy hàng
          </p>
        </div>

        {/* Đang vận chuyển */}
        <div>
          <p className="text-base sm:text-lg font-bold text-slate-900 tabular-nums">{inTransitPercent}%</p>
          <p className="text-[11px] font-medium text-slate-500 flex items-center justify-center sm:justify-start gap-1 mt-0.5">
            <span className="h-1.5 w-1.5 rounded-full bg-sky-500 shrink-0" aria-hidden="true" />
            Đang vận chuyển
          </p>
        </div>

        {/* Đang dỡ hàng */}
        <div>
          <p className="text-base sm:text-lg font-bold text-slate-900 tabular-nums">{unloadingPercent}%</p>
          <p className="text-[11px] font-medium text-slate-500 flex items-center justify-center sm:justify-start gap-1 mt-0.5">
            <span className="h-1.5 w-1.5 rounded-full bg-indigo-500 shrink-0" aria-hidden="true" />
            Đang dỡ hàng
          </p>
        </div>

        {/* Đã giao hàng */}
        <div>
          <p className="text-base sm:text-lg font-bold text-slate-900 tabular-nums">{deliveredPercent}%</p>
          <p className="text-[11px] font-medium text-slate-500 flex items-center justify-center sm:justify-start gap-1 mt-0.5">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 shrink-0" aria-hidden="true" />
            Đã giao hàng
          </p>
        </div>
      </div>

      {/* Continuous Segmented Progress Bar */}
      <div className="flex h-3.5 w-full items-stretch gap-1 rounded-full bg-slate-100 p-0.5 overflow-hidden" aria-hidden="true">
        {/* Đang lấy hàng (Amber) */}
        <div
          style={{ width: `${loadingPercent}%` }}
          className="rounded-full bg-amber-400 transition-all"
          title={`Đang lấy hàng: ${loadingPercent}%`}
        />
        {/* Đang vận chuyển (Sky Blue) */}
        <div
          style={{ width: `${inTransitPercent}%` }}
          className="rounded-full bg-sky-500 transition-all"
          title={`Đang vận chuyển: ${inTransitPercent}%`}
        />
        {/* Đang dỡ hàng (Indigo) */}
        <div
          style={{ width: `${unloadingPercent}%` }}
          className="rounded-full bg-indigo-500 transition-all"
          title={`Đang dỡ hàng: ${unloadingPercent}%`}
        />
        {/* Đã giao hàng (Emerald) */}
        <div
          style={{ width: `${deliveredPercent}%` }}
          className="rounded-full bg-emerald-500 transition-all"
          title={`Đã giao hàng: ${deliveredPercent}%`}
        />
      </div>
    </div>
  );
}
