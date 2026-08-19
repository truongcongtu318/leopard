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
          className="mb-sm border-l-2 border-warning-border bg-warning px-sm py-xs text-body-compact text-warning-text"
        >
          Dữ liệu tuyến có thể đã cũ
        </p>
      ) : null}
      <ol
        aria-label={ariaLabel}
        className={cn(
          'm-0 list-none p-0',
          variant === 'compact' ? 'text-body-compact' : 'text-base',
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

          return (
            <li key={node.id} className="flex gap-sm">
              <div className="flex w-lg shrink-0 flex-col items-center" aria-hidden="true">
                <span
                  className={cn(
                    'mt-xxs h-sm w-sm shrink-0 rounded-pill border-2',
                    isCurrent
                      ? 'border-active-border bg-active'
                      : 'border-neutral-border bg-neutral',
                  )}
                />
                {index < routeNodes.length - 1 ? (
                  <span className="min-h-lg flex-1 border-l-2 border-neutral-border" />
                ) : null}
              </div>
              <div className="min-w-0 flex-1 pb-md">
                <div className="flex flex-wrap items-center gap-xs">
                  <span className="text-xs font-semibold text-neutral-muted">{nodeLabel}</span>
                  {isCurrent ? (
                    <span className="rounded-pill border border-active-border bg-active px-xs py-xxs text-xs font-semibold text-active-text">
                      Chặng hiện tại
                    </span>
                  ) : null}
                </div>
                <p className="mt-xxs font-medium break-words">{node.label}</p>
                {node.metadata ? (
                  <div className="mt-xxs text-xs text-neutral-muted break-words">
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
