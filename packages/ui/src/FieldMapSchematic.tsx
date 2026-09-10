import React from 'react';

import { cn } from './cn';

export type FieldMapSchematicProps = Readonly<{
  fieldLabel: React.ReactNode;
  markerLabels: readonly React.ReactNode[];
  className?: string;
}>;

const markerPositions = [
  { cx: 190, cy: 104 },
  { cx: 486, cy: 212 },
  { cx: 644, cy: 116 },
  { cx: 336, cy: 286 },
] as const;

export function FieldMapSchematic({ fieldLabel, markerLabels, className }: FieldMapSchematicProps) {
  return (
    <div className={cn('flex h-full min-h-map-min flex-col bg-neutral', className)}>
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
          {markerLabels.slice(0, markerPositions.length).map((_, index) => {
            const position = markerPositions[index] ?? markerPositions[0];
            return (
              <g key={index}>
                <circle
                  cx={position.cx}
                  cy={position.cy}
                  fill="var(--color-info)"
                  r="18"
                  stroke="var(--color-info-border)"
                  strokeWidth="5"
                />
                <circle cx={position.cx} cy={position.cy} fill="var(--color-info-border)" r="5" />
              </g>
            );
          })}
        </svg>
        <div className="absolute left-sm top-sm bg-neutral-text px-xs py-xxs text-[0.625rem] font-bold tracking-widest text-brand-text">
          FLEET / FIELD
        </div>
      </div>
      <div className="border-t border-neutral-border bg-neutral px-md py-sm">
        <p className="text-[0.625rem] font-bold tracking-widest text-neutral-muted">PHẠM VI</p>
        <p className="mt-xxs font-semibold break-words">{fieldLabel}</p>
        {markerLabels.length > 0 ? (
          <ul className="mt-sm grid list-none gap-xs border-t border-neutral-border pt-sm sm:grid-cols-2">
            {markerLabels.map((label, index) => (
              <li
                className="flex min-w-0 items-center gap-xs text-xs text-neutral-muted"
                key={index}
              >
                <span aria-hidden="true" className="h-2 w-2 shrink-0 rounded-pill bg-info-border" />
                <span className="break-words">{label}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-xs text-body-compact text-neutral-muted">
            Chưa có marker trong tập kết quả.
          </p>
        )}
      </div>
    </div>
  );
}
