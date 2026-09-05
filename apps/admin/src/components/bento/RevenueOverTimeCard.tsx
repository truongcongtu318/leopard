'use client';

import React, { useState } from 'react';
import { Area, AreaChart, ResponsiveContainer } from 'recharts';

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

const REVENUE_CHART_DATA: Record<string, Array<{ p: string; val: number }>> = {
  week: [
    { p: 'T2', val: 7.2 },
    { p: 'T3', val: 8.5 },
    { p: 'T4', val: 6.8 },
    { p: 'T5', val: 9.4 },
    { p: 'T6', val: 11.2 },
    { p: 'T7', val: 8.9 },
    { p: 'CN', val: 6.2 },
  ],
  month: [
    { p: 'W1', val: 48 },
    { p: 'W2', val: 56 },
    { p: 'W3', val: 62 },
    { p: 'W4', val: 73 },
  ],
  '6months': [
    { p: 'T3', val: 180 },
    { p: 'T4', val: 210 },
    { p: 'T5', val: 240 },
    { p: 'T6', val: 235 },
    { p: 'T7', val: 270 },
    { p: 'T8', val: 290 },
  ],
  year: [
    { p: 'Q1', val: 580 },
    { p: 'Q2', val: 690 },
    { p: 'Q3', val: 780 },
    { p: 'Q4', val: 844 },
  ],
};

const DEFAULT_REVENUE_SERIES: Array<{ p: string; val: number }> = [
  { p: 'W1', val: 48 },
  { p: 'W2', val: 56 },
  { p: 'W3', val: 62 },
  { p: 'W4', val: 73 },
];

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

      {/* Smooth Flowing White Wave Sparkline Chart (Recharts) */}
      <div className="absolute inset-x-0 bottom-12 h-24 overflow-hidden pointer-events-none" aria-hidden="true">
        <ResponsiveContainer width="100%" height="100%" initialDimension={{ width: 400, height: 96 }}>
          <AreaChart
            data={(currentPeriod in REVENUE_CHART_DATA ? REVENUE_CHART_DATA[currentPeriod] : undefined) ?? DEFAULT_REVENUE_SERIES}
            margin={{ top: 12, right: 0, left: 0, bottom: 0 }}
          >
            <defs>
              <linearGradient id="whiteWaveGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#ffffff" stopOpacity={0.4} />
                <stop offset="100%" stopColor="#ffffff" stopOpacity={0.05} />
              </linearGradient>
            </defs>
            <Area
              type="natural"
              dataKey="val"
              stroke="#ffffff"
              strokeWidth={3}
              fill="url(#whiteWaveGrad)"
              isAnimationActive={false}
            />
          </AreaChart>
        </ResponsiveContainer>
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
