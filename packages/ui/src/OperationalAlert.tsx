import React from 'react';
import { cn } from './cn';

export type OperationalAlertTone = 'neutral' | 'info' | 'warning' | 'success' | 'danger';

export type OperationalAlertProps = Readonly<{
  title: string;
  tone?: OperationalAlertTone;
  live?: 'off' | 'polite' | 'assertive';
  actions?: React.ReactNode;
  className?: string;
  children: React.ReactNode;
}>;

const toneClasses: Readonly<Record<OperationalAlertTone, string>> = {
  neutral: 'border-neutral-border bg-neutral-surface text-neutral-text',
  info: 'border-info-border bg-info text-info-text',
  warning: 'border-warning-border bg-warning text-warning-text',
  success: 'border-success-border bg-success text-success-text',
  danger: 'border-danger-border bg-danger text-danger-text',
};

export function OperationalAlert({
  title,
  tone = 'neutral',
  live = 'off',
  actions,
  className,
  children,
}: OperationalAlertProps) {
  const titleId = React.useId();
  const role = live === 'assertive' ? 'alert' : live === 'polite' ? 'status' : undefined;

  return (
    <section
      role={role}
      aria-live={live === 'off' ? undefined : live}
      aria-atomic={live === 'off' ? undefined : 'true'}
      aria-labelledby={titleId}
      className={cn(
        'rounded-2xl border border-l-4 p-4 text-xs shadow-2xs transition-all',
        toneClasses[tone],
        className,
      )}
    >
      <p id={titleId} className="font-bold text-sm tracking-tight break-words">
        {title}
      </p>
      <div className="mt-1 leading-relaxed break-words">{children}</div>
      {actions ? <div className="mt-3 flex flex-wrap gap-2">{actions}</div> : null}
    </section>
  );
}
