'use client';

import React, { useState } from 'react';

export interface RevenueOverTimeCardProps {
  title?: string;
  amount?: string;
  growthLabel?: string;
  period?: string;
  onPeriodChange?: (period: string) => void;
}

const PERIODS = [{ id: 'month', label: 'Tháng' }] as const;

export function RevenueOverTimeCard({
  title = 'Doanh thu cước vận chuyển',
  amount,
  growthLabel,
  period: controlledPeriod,
  onPeriodChange,
}: RevenueOverTimeCardProps) {
  const [internalPeriod, setInternalPeriod] = useState('month');
  const currentPeriod = controlledPeriod ?? internalPeriod;
  const displayAmount = amount ?? '0 ₫';
  const displayGrowth = growthLabel ?? 'Tổng giá trị đơn DELIVERED';

  const handlePeriodClick = (id: string) => {
    setInternalPeriod(id);
    onPeriodChange?.(id);
  };

  const isZeroRevenue = displayAmount === '0 ₫' || displayAmount === '0' || displayAmount === '0 VND';

  return (
    <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900 via-slate-900 to-slate-950 p-5 sm:p-6 text-white border border-slate-800/90 shadow-sm flex flex-1 flex-col justify-between">
      {/* Subtle ambient glow */}
      <div className="absolute -right-10 -top-10 h-36 w-36 rounded-full bg-emerald-500/10 blur-3xl pointer-events-none" aria-hidden="true" />
      <div className="absolute -left-10 -bottom-10 h-36 w-36 rounded-full bg-sky-500/10 blur-3xl pointer-events-none" aria-hidden="true" />

      {/* Top Header & Amounts */}
      <div className="relative z-10">
        <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400">{title}</h2>
        <div className="mt-2.5 flex flex-wrap items-baseline gap-2.5">
          <p className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white tabular-nums">
            {displayAmount}
          </p>
          {!isZeroRevenue ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 border border-emerald-500/30 px-2 py-0.5 text-[11px] font-bold text-emerald-400">
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <polyline points="22 7 13.5 15.5 8.5 10.5 2 17" />
                <polyline points="16 7 22 7 22 13" />
              </svg>
              {displayGrowth}
            </span>
          ) : (
            <span className="inline-flex items-center rounded-full bg-slate-800 border border-slate-700/60 px-2 py-0.5 text-[11px] font-semibold text-slate-400">
              Chưa phát sinh doanh thu
            </span>
          )}
        </div>
      </div>

      {/* SVG Smooth Flowing Emerald Wave Sparkline Chart */}
      <div className="absolute inset-x-0 bottom-14 h-24 overflow-hidden pointer-events-none" aria-hidden="true">
        <svg
          className="w-full h-full"
          viewBox="0 0 400 100"
          preserveAspectRatio="none"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            <linearGradient id="revenue-wave-gradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#10b981" stopOpacity="0.28" />
              <stop offset="100%" stopColor="#10b981" stopOpacity="0.0" />
            </linearGradient>
          </defs>
          {isZeroRevenue ? (
            /* Subtle flat baseline for 0 revenue */
            <line
              x1="0"
              y1="82"
              x2="400"
              y2="82"
              stroke="#334155"
              strokeWidth="2"
              strokeDasharray="4 4"
              opacity="0.6"
            />
          ) : (
            <>
              {/* Translucent area fill */}
              <path
                d="M 0 65 Q 60 85 120 48 T 240 68 T 340 32 T 400 48 L 400 100 L 0 100 Z"
                fill="url(#revenue-wave-gradient)"
              />
              {/* Crisp emerald stroke line */}
              <path
                d="M 0 65 Q 60 85 120 48 T 240 68 T 340 32 T 400 48"
                stroke="#10b981"
                strokeWidth="2.5"
                strokeLinecap="round"
                fill="none"
              />
            </>
          )}
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
                  ? 'bg-white text-slate-900 shadow-xs font-bold'
                  : 'bg-slate-800/80 hover:bg-slate-800 text-slate-400 hover:text-white border border-slate-700/60 backdrop-blur-xs'
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
