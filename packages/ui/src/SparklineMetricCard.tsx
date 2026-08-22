import React from 'react';

export interface SparklineMetricCardProps {
  readonly title: string;
  readonly value: string | number;
  readonly delta?: string;
  readonly deltaType?: 'increase' | 'decrease';
  readonly points?: readonly number[];
  readonly sparkColor?: string;
  readonly subtitle?: string;
}

const DEFAULT_POINTS = [25, 32, 28, 45, 38, 52, 68, 59, 78, 85, 92];

export function SparklineMetricCard({
  title,
  value,
  delta = '+14%',
  deltaType = 'increase',
  points = DEFAULT_POINTS,
  sparkColor = '#4F46E5',
  subtitle,
}: Readonly<SparklineMetricCardProps>) {
  const min = Math.min(...points);
  const max = Math.max(...points);
  const range = max - min || 1;
  const width = 140;
  const height = 45;

  const pathCoords = points.map((pt, idx) => {
    const x = (idx / (points.length - 1)) * width;
    const y = height - ((pt - min) / range) * (height - 12) - 6;
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  });

  const pathD = `M ${pathCoords.join(' L ')}`;
  const areaD = `M 0,${height} L ${pathCoords.join(' L ')} L ${width},${height} Z`;

  return (
    <div className="flex flex-col justify-between rounded-2xl border border-slate-100 bg-white p-5 shadow-xs transition-all hover:shadow-md dark:border-slate-800/80 dark:bg-slate-900">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">{title}</span>
        {delta ? (
          <span
            className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-bold ${
              deltaType === 'increase'
                ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400'
                : 'bg-rose-50 text-rose-600 dark:bg-rose-950/40 dark:text-rose-400'
            }`}
          >
            {deltaType === 'increase' ? '↗' : '↘'} {delta}
          </span>
        ) : null}
      </div>

      <div className="mt-4 flex items-end justify-between gap-4">
        <div>
          <div className="text-3xl font-extrabold tabular-nums tracking-tight text-slate-900 dark:text-white">
            {value}
          </div>
          {subtitle ? (
            <p className="mt-1 text-xs text-slate-400 dark:text-slate-500">{subtitle}</p>
          ) : null}
        </div>

        {/* Smooth SVG Sparkline */}
        <div className="shrink-0 overflow-hidden">
          <svg className="h-11 w-32" viewBox={`0 0 ${width} ${height}`}>
            <defs>
              <linearGradient id={`sparkGrad-${title.replace(/\s+/g, '')}`} x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor={sparkColor} stopOpacity="0.25" />
                <stop offset="100%" stopColor={sparkColor} stopOpacity="0.0" />
              </linearGradient>
            </defs>
            <path
              d={areaD}
              fill={`url(#sparkGrad-${title.replace(/\s+/g, '')})`}
            />
            <path
              d={pathD}
              fill="none"
              stroke={sparkColor}
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            {/* Highlight point on latest entry */}
            <circle
              cx={width}
              cy={height - (((points[points.length - 1] ?? min) - min) / range) * (height - 12) - 6}
              r="3.5"
              fill="#FFFFFF"
              stroke={sparkColor}
              strokeWidth="2.5"
            />
          </svg>
        </div>
      </div>
    </div>
  );
}
