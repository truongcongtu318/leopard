'use client';

import React, { useState } from 'react';

export interface RevenueOverTimeCardProps {
  title?: string;
  amount?: string;
  growthLabel?: string;
  period?: string;
  onPeriodChange?: (period: string) => void;
}

const PERIODS = [
  { id: 'week', label: 'Tuần' },
  { id: 'month', label: 'Tháng' },
  { id: '6months', label: '6 tháng' },
  { id: 'year', label: 'Năm' },
] as const;

const PERIOD_DATA: Record<string, { amount: string; growth: string }> = {
  week: { amount: '58.200.000 ₫', growth: '+8% so với tuần trước' },
  month: { amount: '239.187.000 ₫', growth: '+15% so với tháng trước' },
  '6months': { amount: '1.428.500.000 ₫', growth: '+22% so với nửa năm trước' },
  year: { amount: '2.894.100.000 ₫', growth: '+31% so với năm trước' },
};

const DEFAULT_PERIOD_DATA = { amount: '239.187.000 ₫', growth: '+15% so với tháng trước' };

export function RevenueOverTimeCard({
  title = 'Doanh thu cước vận chuyển',
  amount,
  growthLabel,
  period: controlledPeriod,
  onPeriodChange,
}: RevenueOverTimeCardProps) {
  const [internalPeriod, setInternalPeriod] = useState('month');
  const currentPeriod = controlledPeriod ?? internalPeriod;
  const currentData = PERIOD_DATA[currentPeriod] ?? DEFAULT_PERIOD_DATA;
  const displayAmount = amount && currentPeriod === 'month' ? amount : currentData.amount;
  const displayGrowth = growthLabel && currentPeriod === 'month' ? growthLabel : currentData.growth;

  const handlePeriodClick = (id: string) => {
    setInternalPeriod(id);
    onPeriodChange?.(id);
  };

  return (
    <div className="relative overflow-hidden rounded-3xl bg-gradient-to-tr from-[#fcd34d] via-[#fb923c] to-[#f472b6] p-5 sm:p-6 text-slate-950 shadow-sm flex flex-col justify-between min-h-[220px]">
      {/* Top Header & Amounts */}
      <div className="relative z-10">
        <h2 className="text-sm font-bold text-slate-900/90 tracking-tight">{title}</h2>
        <div className="mt-2">
          <p className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-950 tabular-nums">
            {displayAmount}
          </p>
          <p className="mt-0.5 text-xs font-semibold text-slate-900/80">
            {displayGrowth}
          </p>
        </div>
      </div>

      {/* SVG Smooth Flowing White Wave Sparkline Chart */}
      <div className="absolute inset-x-0 bottom-12 h-24 overflow-hidden pointer-events-none" aria-hidden="true">
        <svg
          className="w-full h-full"
          viewBox="0 0 400 100"
          preserveAspectRatio="none"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          {/* Subtle translucent area fill */}
          <path
            d="M 0 60 Q 60 80 120 45 T 240 70 T 340 30 T 400 50 L 400 100 L 0 100 Z"
            fill="rgba(255, 255, 255, 0.25)"
          />
          {/* Crisp white stroke line */}
          <path
            d="M 0 60 Q 60 80 120 45 T 240 70 T 340 30 T 400 50"
            stroke="#ffffff"
            strokeWidth="3"
            strokeLinecap="round"
            fill="none"
          />
        </svg>
      </div>

      {/* Bottom Period Filter Pills */}
      <div className="relative z-10 flex items-center gap-1.5 pt-4">
        {PERIODS.map((p) => {
          const isActive = currentPeriod === p.id;
          return (
            <button
              key={p.id}
              type="button"
              onClick={() => handlePeriodClick(p.id)}
              className={`rounded-full px-3 py-1 text-xs font-semibold transition-all cursor-pointer ${
                isActive
                  ? 'bg-slate-950 text-white shadow-xs'
                  : 'bg-white/40 hover:bg-white/60 text-slate-900 backdrop-blur-xs'
              }`}
            >
              {p.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
