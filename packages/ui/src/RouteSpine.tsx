import React from 'react';
import { cn } from './cn';

export type RouteSpinePoint = Readonly<{
  id: string;
  label: string;
  metadata?: React.ReactNode;
}>;

export type RouteSpineProps = Readonly<{
  origin: RouteSpinePoint;
  stops: readonly RouteSpinePoint[];
  destination: RouteSpinePoint;
  variant?: 'full' | 'compact';
  currentLegIndex?: number;
  isStale?: boolean;
  ariaLabel?: string;
  className?: string;
}>;

type RouteNode = RouteSpinePoint &
  Readonly<{
    kind: 'origin' | 'stop' | 'destination';
    sequence?: number;
  }>;

export function RouteSpine({
  origin,
  stops,
  destination,
  variant = 'full',
  currentLegIndex,
  isStale = false,
  ariaLabel = 'Lộ trình giao hàng',
  className,
}: RouteSpineProps) {
  const routeNodes: readonly RouteNode[] = [
    { ...origin, kind: 'origin' },
    ...stops.map((stop, index) => ({
      ...stop,
      kind: 'stop' as const,
      sequence: index + 1,
    })),
    { ...destination, kind: 'destination' },
  ];

  return (
    <section className={cn('text-neutral-text', className)}>
      {isStale ? (
        <p
          role="status"
          className="mb-3 rounded-xl border border-warning-border border-l-4 bg-warning px-3.5 py-2 text-xs font-semibold text-warning-text shadow-2xs"
        >
          Dữ liệu tuyến có thể đã cũ
        </p>
      ) : null}
      <ol
        aria-label={ariaLabel}
        className={cn(
          'm-0 list-none p-0',
          variant === 'compact' ? 'text-body-compact text-xs' : 'text-sm',
        )}
      >
        {routeNodes.map((node, index) => {
          const isCurrent = currentLegIndex === index;
          const nodeLabel =
            node.kind === 'origin'
              ? 'Điểm lấy'
              : node.kind === 'destination'
                ? 'Điểm giao'
                : `Điểm dừng ${node.sequence}`;

          const dotColor =
            node.kind === 'origin'
              ? 'border-emerald-500 ring-emerald-500/15'
              : node.kind === 'destination'
                ? 'border-sky-600 ring-sky-600/15'
                : 'border-amber-500 ring-amber-500/15';

          return (
            <li key={node.id} className="flex gap-3">
              <div className="flex w-6 shrink-0 flex-col items-center pt-0.5" aria-hidden="true">
                <span
                  className={cn(
                    'h-3.5 w-3.5 shrink-0 rounded-full border-2 bg-white ring-4 transition-all',
                    isCurrent
                      ? 'border-brand bg-brand ring-brand/20 shadow-xs'
                      : dotColor,
                  )}
                />
                {index < routeNodes.length - 1 ? (
                  <span className="min-h-7 flex-1 border-l-2 border-slate-200/90 my-1" />
                ) : null}
              </div>
              <div className="min-w-0 flex-1 pb-4">
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                    {nodeLabel}
                  </span>
                  {isCurrent ? (
                    <span className="rounded-pill border border-active-border bg-active px-2 py-0.5 text-[10px] font-bold text-active-text shadow-2xs">
                      Chặng hiện tại
                    </span>
                  ) : null}
                </div>
                <p className="mt-0.5 font-semibold text-slate-900 break-words">{node.label}</p>
                {node.metadata ? (
                  <div className="mt-0.5 text-xs text-slate-500 break-words">
                    {node.metadata}
                  </div>
                ) : null}
              </div>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
