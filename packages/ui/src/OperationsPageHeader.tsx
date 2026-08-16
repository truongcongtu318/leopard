import React from 'react';
import { cn } from './cn';

export type OperationsPageHeaderProps = Readonly<{
  title: string;
  eyebrow?: React.ReactNode;
  context?: React.ReactNode;
  updatedAt?: React.ReactNode;
  isStale?: boolean;
  actions?: React.ReactNode;
  className?: string;
}>;

export function OperationsPageHeader({
  title,
  eyebrow = 'OPERATIONS LEDGER',
  context,
  updatedAt,
  isStale = false,
  actions,
  className,
}: OperationsPageHeaderProps) {
  return (
    <header
      className={cn(
        'flex flex-col gap-sm border-b border-neutral-border pb-md text-neutral-text sm:flex-row sm:items-start sm:justify-between',
        className,
      )}
    >
      <div className="min-w-0 border-l-4 border-brand pl-md">
        {eyebrow ? (
          <div className="mb-xxs text-[0.625rem] font-bold tracking-widest text-brand break-words">
            {eyebrow}
          </div>
        ) : null}
        <h1 className="text-page-title font-bold tracking-tight break-words">{title}</h1>
        {context ? (
          <div className="mt-xxs text-body-compact text-neutral-muted break-words">{context}</div>
        ) : null}
        {updatedAt || isStale ? (
          <div className="mt-xs flex flex-wrap items-center gap-xs text-xs text-neutral-muted">
            {isStale ? (
              <span className="font-semibold text-warning-text">Dữ liệu có thể đã cũ</span>
            ) : null}
            {updatedAt ? <span>Cập nhật: {updatedAt}</span> : null}
          </div>
        ) : null}
      </div>
      {actions ? (
        <div className="flex shrink-0 flex-wrap items-center gap-xs">{actions}</div>
      ) : null}
    </header>
  );
}
