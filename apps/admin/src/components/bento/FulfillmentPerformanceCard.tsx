'use client';

import React from 'react';

export interface FulfillmentPerformanceCardProps {
  title?: string;
  periodLabel?: string;
  rate?: number;
  subtitle?: string;
  bars?: readonly number[];
}

export function FulfillmentPerformanceCard({
  title = 'Hiệu suất giao đúng hạn (OTD)',
  periodLabel = 'Tháng này',
  rate = 89,
  subtitle = 'trung bình ca trực',
  bars,
}: FulfillmentPerformanceCardProps) {
  // ponytail: bars required from BE (no fake multiplier), pass explicit bars when available
  const renderedBars = bars ?? [rate];

  return (
    <div className="rounded-3xl bg-white p-5 sm:p-6 border border-slate-100 shadow-sm flex flex-1 flex-col justify-between gap-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-base font-bold text-slate-900">{title}</h2>
        <span className="rounded-full bg-slate-100/90 px-3 py-1 text-xs font-semibold text-slate-600">
          {periodLabel}
        </span>
      </div>

      {/* KPI Metric */}
      <div className="flex items-baseline gap-2">
        <span className="text-3xl sm:text-4xl font-extrabold tracking-tight text-slate-900 tabular-nums">
          {rate}%
        </span>
        <span className="text-xs font-medium text-slate-400">{subtitle}</span>
      </div>

      {/* Vertical Bar Chart (Emerald Green Bars) */}
      <div className="flex h-20 items-end justify-between gap-1 sm:gap-1.5 pt-2" aria-hidden="true">
        {renderedBars.map((heightPercent, index) => (
          <div
            key={index}
            className="flex-1 flex flex-col justify-end items-center h-full group"
          >
            <div
              style={{ height: `${heightPercent}%` }}
              className="w-full max-w-[12px] rounded-full bg-[#10b981] transition-all group-hover:bg-[#059669]"
              title={`Ngày ${index + 1}: ${heightPercent}%`}
            />
          </div>
        ))}
      </div>
    </div>
  );
}
