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
  title = 'Status Overview',
  periodLabel = 'Month',
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
        <div className="flex items-center gap-1 rounded-full bg-slate-100/90 px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-slate-200 transition-colors cursor-pointer">
          <span>{periodLabel}</span>
          <svg className="w-3 h-3 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </div>

      {/* 4 Status Metric Columns */}
      <div className="grid grid-cols-4 gap-2 text-center sm:text-left">
        {/* Loading */}
        <div>
          <p className="text-base sm:text-lg font-bold text-slate-900 tabular-nums">{loadingPercent}%</p>
          <p className="text-[11px] font-medium text-slate-400">Loading</p>
        </div>

        {/* In Transit */}
        <div>
          <p className="text-base sm:text-lg font-bold text-slate-900 tabular-nums">{inTransitPercent}%</p>
          <p className="text-[11px] font-medium text-slate-400">In Transit</p>
        </div>

        {/* Unloading */}
        <div>
          <p className="text-base sm:text-lg font-bold text-slate-900 tabular-nums">{unloadingPercent}%</p>
          <p className="text-[11px] font-medium text-slate-400">Unloading</p>
        </div>

        {/* Delivered */}
        <div>
          <p className="text-base sm:text-lg font-bold text-slate-900 tabular-nums">{deliveredPercent}%</p>
          <p className="text-[11px] font-medium text-slate-400">Delivered</p>
        </div>
      </div>

      {/* Continuous Segmented Progress Bar */}
      <div className="flex h-5 w-full items-stretch gap-1 rounded-xl p-0.5" aria-hidden="true">
        {/* Loading (Amber) */}
        <div
          style={{ width: `${loadingPercent}%` }}
          className="rounded-lg bg-[#fbbf24] transition-all"
          title={`Loading: ${loadingPercent}%`}
        />
        {/* In Transit (Emerald Green) */}
        <div
          style={{ width: `${inTransitPercent}%` }}
          className="rounded-lg bg-[#10b981] transition-all"
          title={`In Transit: ${inTransitPercent}%`}
        />
        {/* Unloading (Coral / Red) */}
        <div
          style={{ width: `${unloadingPercent}%` }}
          className="rounded-lg bg-[#f87171] transition-all"
          title={`Unloading: ${unloadingPercent}%`}
        />
        {/* Delivered (Pink / Magenta) */}
        <div
          style={{ width: `${deliveredPercent}%` }}
          className="rounded-lg bg-[#ec4899] transition-all"
          title={`Delivered: ${deliveredPercent}%`}
        />
      </div>
    </div>
  );
}
