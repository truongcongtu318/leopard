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
        'flex flex-col gap-4 pb-6 text-neutral-text sm:flex-row sm:items-start sm:justify-between',
        className,
      )}
    >
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2.5 mb-2">
          {eyebrow ? (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-brand-soft border border-brand/10 px-2.5 py-1 text-[11px] font-bold tracking-widest text-brand uppercase">
              <span className="h-1.5 w-1.5 rounded-full bg-brand animate-pulse" />
              {eyebrow}
            </span>
          ) : null}
          {isStale ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-warning border border-warning-border/30 px-2.5 py-1 text-xs font-semibold text-warning-text">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
              Dữ liệu có thể đã cũ
            </span>
          ) : null}
        </div>
        <h1 className="text-[28px] font-extrabold tracking-tight leading-none break-words bg-gradient-to-r from-neutral-text to-neutral-text/70 bg-clip-text">{title}</h1>
        {context ? (
          <div className="mt-2 max-w-2xl text-sm leading-relaxed text-neutral-muted break-words">{context}</div>
        ) : null}
        {updatedAt ? (
          <div className="mt-3 inline-flex items-center gap-2 rounded-full bg-neutral-surface border border-neutral-border/50 px-3 py-1.5 text-xs text-neutral-muted">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
            <span className="tabular-nums">Cập nhật: {updatedAt}</span>
          </div>
        ) : null}
      </div>
      {actions ? (
        <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>
      ) : null}
    </header>
  );
}
