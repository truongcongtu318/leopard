import React from 'react';

import { cn } from './cn';

export type RouteMapSchematicProps = Readonly<{
  originLabel: React.ReactNode;
  destinationLabel: React.ReactNode;
  markerLabel?: React.ReactNode;
  className?: string;
}>;

export function RouteMapSchematic({
  originLabel,
  destinationLabel,
  markerLabel,
  className,
}: RouteMapSchematicProps) {
  return (
    <div
      className={cn('flex h-full min-h-map-min flex-col bg-neutral text-neutral-text', className)}
      data-testid="route-map-schematic"
    >
      <div className="relative min-h-52 flex-1 overflow-hidden bg-neutral-surface">
        <svg
          aria-hidden="true"
          className="absolute inset-0 h-full w-full text-neutral-border"
          preserveAspectRatio="none"
          viewBox="0 0 800 360"
        >
          <g fill="none" stroke="currentColor" strokeOpacity="0.28" strokeWidth="10">
            <path d="M-40 86 C130 30 260 130 430 72 S690 22 850 92" />
            <path d="M-20 250 C150 190 280 310 460 238 S710 180 850 246" />
            <path d="M120 -30 C164 86 110 176 176 390" />
            <path d="M620 -30 C566 80 652 194 586 390" />
          </g>
          <path
            d="M154 70 C202 104 178 166 258 188 S382 148 438 214 S564 274 652 246"
            fill="none"
            stroke="var(--color-brand)"
            strokeLinecap="square"
            strokeLinejoin="round"
            strokeWidth="7"
          />
          <circle
            cx="154"
            cy="70"
            fill="var(--color-neutral)"
            r="13"
            stroke="var(--color-brand)"
            strokeWidth="7"
          />
          <circle
            cx="652"
            cy="246"
            fill="var(--color-neutral)"
            r="13"
            stroke="var(--color-brand)"
            strokeWidth="7"
          />
          {markerLabel ? (
            <g>
              <circle
                cx="438"
                cy="214"
                fill="var(--color-warning)"
                r="18"
                stroke="var(--color-warning-border)"
                strokeWidth="5"
              />
              <circle cx="438" cy="214" fill="var(--color-warning-border)" r="5" />
            </g>
          ) : null}
        </svg>
        <div className="absolute left-sm top-sm bg-neutral-text px-xs py-xxs text-[0.625rem] font-bold tracking-widest text-brand-text">
          ROUTE / PREVIEW
        </div>
        {markerLabel ? (
          <div className="absolute bottom-sm left-sm max-w-[calc(100%-1.5rem)] border-l-4 border-warning-border bg-warning px-sm py-xs text-xs font-semibold text-warning-text">
            {markerLabel}
          </div>
        ) : null}
      </div>
      <dl className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-start gap-sm border-t border-neutral-border bg-neutral px-md py-sm">
        <div className="min-w-0">
          <dt className="text-[0.625rem] font-bold tracking-widest text-neutral-muted">ĐIỂM LẤY</dt>
          <dd className="mt-xxs font-semibold break-words">{originLabel}</dd>
        </div>
        <div aria-hidden="true" className="pt-sm text-section-title font-bold text-brand">
          →
        </div>
        <div className="min-w-0 text-right">
          <dt className="text-[0.625rem] font-bold tracking-widest text-neutral-muted">
            ĐIỂM GIAO
          </dt>
          <dd className="mt-xxs font-semibold break-words">{destinationLabel}</dd>
        </div>
      </dl>
    </div>
  );
}
