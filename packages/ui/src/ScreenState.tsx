'use client';

import React from 'react';
import { AlertTriangle, Inbox, Loader2 } from 'lucide-react';
import { Button } from './Button';
import { cn } from './cn';

export type ScreenStateName =
  | 'loading'
  | 'empty'
  | 'no-results'
  | 'error'
  | 'success'
  | 'permission-denied'
  | 'offline'
  | 'stale'
  | 'reconnecting'
  | 'session-expired'
  | 'conflict';

export type ScreenStateProps = {
  state: ScreenStateName;
  title?: string;
  message?: string;
  onRetry?: () => void;
  actionLabel?: string;
  onAction?: () => void;
  className?: string;
  children?: React.ReactNode;
};

type ScreenStateCopy = Readonly<{
  title: string;
  message: string;
}>;

const defaultCopy: Readonly<Record<ScreenStateName, ScreenStateCopy>> = {
  loading: {
    title: 'Đang tải dữ liệu',
    message: 'Vui lòng chờ trong giây lát.',
  },
  empty: {
    title: 'Chưa có dữ liệu',
    message: 'Chưa có nội dung phù hợp để hiển thị.',
  },
  'no-results': {
    title: 'Không tìm thấy kết quả',
    message: 'Không có dữ liệu phù hợp với bộ lọc hiện tại.',
  },
  error: {
    title: 'Không thể tải dữ liệu',
    message: 'Vui lòng thử lại khi kết nối ổn định.',
  },
  success: {
    title: 'Đã cập nhật dữ liệu',
    message: 'Thông tin mới nhất đã được ghi nhận.',
  },
  'permission-denied': {
    title: 'Bạn không có quyền truy cập',
    message: 'Hãy quay về khu vực được cấp quyền.',
  },
  offline: {
    title: 'Đang ngoại tuyến',
    message: 'Nội dung hiện có có thể chưa phải dữ liệu mới nhất.',
  },
  stale: {
    title: 'Dữ liệu có thể đã cũ',
    message: 'Nội dung này là lần cập nhật gần nhất đã nhận được.',
  },
  reconnecting: {
    title: 'Đang kết nối lại',
    message: 'Nội dung hiện có vẫn được giữ trong khi khôi phục kết nối.',
  },
  'session-expired': {
    title: 'Phiên làm việc đã hết hạn',
    message: 'Vui lòng đăng nhập lại để tiếp tục.',
  },
  conflict: {
    title: 'Dữ liệu đã thay đổi',
    message: 'Hãy tải lại dữ liệu mới nhất trước khi tiếp tục.',
  },
};

type ScreenStateTone = 'neutral' | 'info' | 'warning' | 'danger';

type ScreenStateConfig = Readonly<{
  tone: ScreenStateTone;
  role: 'status' | 'alert';
  live: 'polite' | 'assertive';
  indicator: 'spinner' | 'empty' | 'alert' | 'none';
  isBusy?: boolean;
  preservesContext?: boolean;
  focusesHeading?: boolean;
}>;

const stateConfig: Readonly<Record<ScreenStateName, ScreenStateConfig>> = {
  loading: {
    tone: 'info',
    role: 'status',
    live: 'polite',
    indicator: 'spinner',
    isBusy: true,
  },
  empty: {
    tone: 'neutral',
    role: 'status',
    live: 'polite',
    indicator: 'empty',
  },
  'no-results': {
    tone: 'neutral',
    role: 'status',
    live: 'polite',
    indicator: 'empty',
  },
  error: {
    tone: 'danger',
    role: 'alert',
    live: 'assertive',
    indicator: 'alert',
  },
  success: {
    tone: 'info',
    role: 'status',
    live: 'polite',
    indicator: 'none',
  },
  'permission-denied': {
    tone: 'danger',
    role: 'alert',
    live: 'assertive',
    indicator: 'alert',
    focusesHeading: true,
  },
  offline: {
    tone: 'warning',
    role: 'status',
    live: 'polite',
    indicator: 'alert',
    preservesContext: true,
  },
  stale: {
    tone: 'warning',
    role: 'status',
    live: 'polite',
    indicator: 'alert',
    preservesContext: true,
  },
  reconnecting: {
    tone: 'info',
    role: 'status',
    live: 'polite',
    indicator: 'spinner',
    isBusy: true,
    preservesContext: true,
  },
  'session-expired': {
    tone: 'danger',
    role: 'alert',
    live: 'assertive',
    indicator: 'alert',
    focusesHeading: true,
  },
  conflict: {
    tone: 'warning',
    role: 'alert',
    live: 'assertive',
    indicator: 'alert',
    preservesContext: true,
  },
};

const toneClasses: Readonly<Record<ScreenStateTone, string>> = {
  neutral: 'border-neutral-border bg-neutral-surface text-neutral-text',
  info: 'border-info-border bg-info text-info-text',
  warning: 'border-warning-border bg-warning text-warning-text',
  danger: 'border-danger-border bg-danger text-danger-text',
};

function StateIndicator({ indicator }: Pick<ScreenStateConfig, 'indicator'>) {
  if (indicator === 'spinner') {
    return <Loader2 className="h-xl w-xl shrink-0 animate-spin text-current motion-reduce:animate-none" aria-hidden="true" />;
  }

  if (indicator === 'empty') {
    return <Inbox className="h-xl w-xl shrink-0 text-current" strokeWidth={1} aria-hidden="true" />;
  }

  if (indicator === 'alert') {
    return <AlertTriangle className="h-xl w-xl shrink-0 text-current" strokeWidth={1} aria-hidden="true" />;
  }

  return null;
}

export function ScreenState({
  state,
  title,
  message,
  onRetry,
  actionLabel,
  onAction,
  className,
  children,
}: ScreenStateProps) {
  const headingRef = React.useRef<HTMLHeadingElement>(null);
  const copy = defaultCopy[state];
  const config = stateConfig[state];
  const focusesHeading = config.focusesHeading === true;

  React.useEffect(() => {
    if (focusesHeading) {
      headingRef.current?.focus();
    }
  }, [focusesHeading, state]);

  if (state === 'success') {
    return (
      <>
        <span className="sr-only" role="status" aria-live="polite" aria-atomic="true">
          <span>{title ?? copy.title}</span> <span>{message ?? copy.message}</span>
        </span>
        {children}
      </>
    );
  }

  const action =
    onAction && actionLabel
      ? { label: actionLabel, handler: onAction }
      : onRetry
        ? { label: actionLabel ?? 'Thử lại', handler: onRetry }
        : null;

  return (
    <div className={cn('flex flex-col items-stretch gap-md py-xl', className)}>
      <div
        role={config.role}
        aria-live={config.live}
        aria-atomic="true"
        aria-busy={config.isBusy === true ? 'true' : undefined}
        className={cn(
          'flex flex-col items-center justify-center gap-2.5 rounded-card rounded-[24px] border p-8 sm:p-10 text-center shadow-xs transition-all',
          toneClasses[config.tone],
        )}
      >
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/80 shadow-2xs border border-white/60 mb-1">
          <StateIndicator indicator={config.indicator} />
        </div>
        <h2
          ref={headingRef}
          tabIndex={focusesHeading ? -1 : undefined}
          className="text-lg font-bold tracking-tight text-slate-900"
        >
          {title ?? copy.title}
        </h2>
        <p className="max-w-md text-xs leading-relaxed text-slate-600">{message ?? copy.message}</p>
      </div>

      {config.preservesContext ? children : null}

      {action ? (
        <Button variant="secondary" onPress={action.handler} className="self-center shadow-2xs">
          {action.label}
        </Button>
      ) : null}
    </div>
  );
}
