import React from 'react';

export interface MetricCardProps {
  readonly id: string;
  readonly label: string;
  readonly value: string | number;
  readonly detail?: string;
  readonly delta?: string;
  readonly deltaTone?: 'positive' | 'negative' | 'neutral';
  readonly icon?: React.ReactNode;
  readonly href?: string;
}

export function MetricCard({
  label,
  value,
  detail,
  delta,
  deltaTone = 'positive',
  icon,
  href,
}: Readonly<MetricCardProps>) {
  const content = (
    <div className="group relative flex flex-col justify-between rounded-xl border border-slate-200/80 bg-white p-4 shadow-xs transition-all hover:border-sky-500/40 hover:shadow-md dark:border-slate-800/80 dark:bg-slate-900/60 dark:hover:border-sky-500/40">
      <div className="flex items-start justify-between gap-2">
        <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
          {label}
        </span>
        {icon ? (
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 transition-colors group-hover:bg-sky-500/10 group-hover:text-sky-500">
            {icon}
          </span>
        ) : null}
      </div>

      <div className="mt-3">
        <div className="text-2xl font-black tabular-nums tracking-tight text-slate-900 dark:text-white">
          {value}
        </div>

        <div className="mt-1.5 flex items-center gap-2">
          {delta ? (
            <span
              className={`inline-flex items-center text-xs font-bold ${
                deltaTone === 'positive'
                  ? 'text-emerald-600 dark:text-emerald-400'
                  : deltaTone === 'negative'
                    ? 'text-rose-600 dark:text-rose-400'
                    : 'text-slate-500'
              }`}
            >
              {deltaTone === 'positive' ? '↗ ' : deltaTone === 'negative' ? '↘ ' : ''}
              {delta}
            </span>
          ) : null}

          {detail ? (
            <span className="text-xs text-slate-400 dark:text-slate-500 truncate">
              {detail}
            </span>
          ) : null}
        </div>
      </div>
    </div>
  );

  if (href) {
    return (
      <a className="block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 rounded-xl" href={href}>
        {content}
      </a>
    );
  }

  return content;
}
