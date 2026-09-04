import React from 'react';
import { cn } from './cn';

export type OperationsPageHeaderProps = Readonly<{
  title: string;
  /** Short uppercase micro-label rendered above the title. Keep it functional, not decorative. */
  eyebrow?: React.ReactNode;
  context?: React.ReactNode;
  updatedAt?: React.ReactNode;
  isStale?: boolean;
  actions?: React.ReactNode;
  className?: string;
}>;

export function OperationsPageHeader({
  title,
  eyebrow,
  context,
  updatedAt,
  isStale = false,
  actions,
  className,
}: OperationsPageHeaderProps) {
  return (
    <header
      className={cn(
        'flex flex-col gap-4 rounded-[22px] sm:rounded-[26px] border border-white/80 bg-white/95 backdrop-blur-md p-5 sm:p-6 shadow-xs text-neutral-text sm:flex-row sm:items-start sm:justify-between',
        className,
      )}
    >
      <div className="min-w-0 flex-1">
        {eyebrow || isStale ? (
          <div className="mb-2 flex flex-wrap items-center gap-2">
            {eyebrow ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-brand/10 px-2.5 py-0.5 text-[11px] font-bold tracking-wider text-brand uppercase">
                {eyebrow}
              </span>
            ) : null}
            {isStale ? (
              <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-200 bg-amber-50 px-2.5 py-0.5 text-xs font-semibold text-amber-800">
                <svg
                  width="12"
                  height="12"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  aria-hidden="true"
                >
                  <circle cx="12" cy="12" r="10" />
                  <line x1="12" y1="8" x2="12" y2="12" />
                  <line x1="12" y1="16" x2="12.01" y2="16" />
                </svg>
                Dữ liệu có thể đã cũ
              </span>
            ) : null}
          </div>
        ) : null}
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-xl sm:text-2xl font-black text-slate-800 tracking-tight break-words">{title}</h1>
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-xs font-bold border border-emerald-200">
            <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
            Ca trực Pilot
          </span>
        </div>
        {context ? (
          <div className="mt-1.5 max-w-3xl text-xs sm:text-sm text-slate-500 font-medium leading-relaxed break-words">
            {context}
          </div>
        ) : null}
        {updatedAt ? (
          <div className="mt-3 inline-flex items-center gap-1.5 text-xs text-slate-400 tabular-nums font-medium">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
            Cập nhật: {updatedAt}
          </div>
        ) : null}
      </div>
      {actions ? (
        <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>
      ) : null}
    </header>
  );
}
