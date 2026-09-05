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
          <p className="text-[11px] font-medium text-slate-400">Đang lấy hàng</p>
        </div>

        {/* Đang vận chuyển */}
        <div>
          <p className="text-base sm:text-lg font-bold text-slate-900 tabular-nums">{inTransitPercent}%</p>
          <p className="text-[11px] font-medium text-slate-400">Đang vận chuyển</p>
        </div>

        {/* Đang dỡ hàng */}
        <div>
          <p className="text-base sm:text-lg font-bold text-slate-900 tabular-nums">{unloadingPercent}%</p>
          <p className="text-[11px] font-medium text-slate-400">Đang dỡ hàng</p>
        </div>

        {/* Đã giao hàng */}
        <div>
          <p className="text-base sm:text-lg font-bold text-slate-900 tabular-nums">{deliveredPercent}%</p>
          <p className="text-[11px] font-medium text-slate-400">Đã giao hàng</p>
        </div>
      </div>

      {/* Continuous Segmented Progress Bar */}
      <div className="flex h-5 w-full items-stretch gap-1 rounded-xl p-0.5" aria-hidden="true">
        {/* Đang lấy hàng (Amber) */}
        <div
          style={{ width: `${loadingPercent}%` }}
          className="rounded-lg bg-[#fbbf24] transition-all"
          title={`Đang lấy hàng: ${loadingPercent}%`}
        />
        {/* Đang vận chuyển (Emerald Green) */}
        <div
          style={{ width: `${inTransitPercent}%` }}
          className="rounded-lg bg-[#10b981] transition-all"
          title={`Đang vận chuyển: ${inTransitPercent}%`}
        />
        {/* Đang dỡ hàng (Coral / Red) */}
        <div
          style={{ width: `${unloadingPercent}%` }}
          className="rounded-lg bg-[#f87171] transition-all"
          title={`Đang dỡ hàng: ${unloadingPercent}%`}
        />
        {/* Đã giao hàng (Pink / Magenta) */}
        <div
          style={{ width: `${deliveredPercent}%` }}
          className="rounded-lg bg-[#ec4899] transition-all"
          title={`Đã giao hàng: ${deliveredPercent}%`}
        />
      </div>
    </div>
  );
}
