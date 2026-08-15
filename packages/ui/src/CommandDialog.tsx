'use client';

import React from 'react';
import { Button } from './Button';
import { cn } from './cn';
import { ReadOnlyDetailList, type ReadOnlyDetailItem } from './ReadOnlyDetailList';

export type CommandDialogState =
  | 'idle'
  | 'invalid'
  | 'pending'
  | 'error'
  | 'conflict'
  | 'success'
  | 'permission-denied'
  | 'session-expired';

export type CommandReasonPolicy = Readonly<{
  required?: boolean;
  minLength?: number;
  maxLength?: number;
  hint?: string;
}>;

export type CommandDialogProps = Readonly<{
  isOpen: boolean;
  state: CommandDialogState;
  title: string;
  commandLabel: string;
  targetItems: readonly ReadOnlyDetailItem[];
  consequence: string;
  reasonLabel: string;
  reasonValue: string;
  reasonPolicy?: CommandReasonPolicy;
  reasonError?: string;
  message?: string;
  onReasonChange: (reason: string) => void;
  onSubmit: (reason: string) => void;
  onClose: () => void;
  onResolveConflict?: () => void;
  fallbackFocusRef?: React.RefObject<HTMLElement | null>;
  className?: string;
}>;

const focusableSelector = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(',');

const privacyCopy = {
  'permission-denied': {
    title: 'Bạn không có quyền thực hiện thao tác này',
    message: 'Nội dung thao tác đã được đóng để bảo vệ dữ liệu.',
  },
  'session-expired': {
    title: 'Phiên đăng nhập đã hết hạn',
    message: 'Nội dung thao tác đã được xóa. Hãy đăng nhập lại để tiếp tục.',
  },
} as const;

function getReasonError(reason: string, reasonLabel: string, policy: CommandReasonPolicy) {
  const length = reason.trim().length;

  if (policy.required && length === 0) {
    return `${reasonLabel} là bắt buộc.`;
  }

  if (policy.minLength !== undefined && length < policy.minLength) {
    return `${reasonLabel} phải có ít nhất ${policy.minLength} ký tự.`;
  }

  if (policy.maxLength !== undefined && length > policy.maxLength) {
    return `${reasonLabel} không được vượt quá ${policy.maxLength} ký tự.`;
  }

  return null;
}

export function CommandDialog({
  isOpen,
  state,
  title,
  commandLabel,
  targetItems,
  consequence,
  reasonLabel,
  reasonValue,
  reasonPolicy = {},
  reasonError,
  message,
  onReasonChange,
  onSubmit,
  onClose,
  onResolveConflict,
  fallbackFocusRef,
  className,
}: CommandDialogProps) {
  const dialogRef = React.useRef<HTMLDivElement>(null);
  const headingRef = React.useRef<HTMLHeadingElement>(null);
  const textareaRef = React.useRef<HTMLTextAreaElement>(null);
  const feedbackRef = React.useRef<HTMLElement>(null);
  const previousFocusRef = React.useRef<HTMLElement | null>(null);
  const privacyBoundaryRef = React.useRef(false);
  const [localReasonError, setLocalReasonError] = React.useState<string | null>(null);

  const titleId = React.useId();
  const consequenceId = React.useId();
  const reasonId = React.useId();
  const reasonHintId = React.useId();
  const reasonCountId = React.useId();
  const reasonErrorId = React.useId();

  const isPrivacyBoundary = state === 'permission-denied' || state === 'session-expired';
  const showsReason =
    state === 'idle' || state === 'invalid' || state === 'pending' || state === 'error';
  const isDismissible =
    state === 'idle' || state === 'invalid' || state === 'error' || state === 'success';
  const effectiveReasonError = reasonError ?? localReasonError;
  privacyBoundaryRef.current = isPrivacyBoundary;

  React.useEffect(() => {
    if (!isOpen) return;

    const activeElement = document.activeElement;
    previousFocusRef.current =
      activeElement instanceof HTMLElement && activeElement !== document.body
        ? activeElement
        : null;

    return () => {
      const fallback = fallbackFocusRef?.current ?? null;
      const previous = previousFocusRef.current;
      const previousIsSafe =
        !privacyBoundaryRef.current && previous !== null && document.contains(previous);
      const restoreTarget = previousIsSafe ? previous : fallback;
      restoreTarget?.focus();
    };
  }, [fallbackFocusRef, isOpen]);

  React.useEffect(() => {
    if (!isOpen) return;

    if (state === 'invalid') {
      textareaRef.current?.focus();
      return;
    }

    if (state === 'error' || state === 'conflict' || state === 'success' || isPrivacyBoundary) {
      feedbackRef.current?.focus();
      return;
    }

    headingRef.current?.focus();
  }, [isOpen, isPrivacyBoundary, state]);

  if (!isOpen) return null;

  const handleReasonChange = (event: React.ChangeEvent<HTMLTextAreaElement>) => {
    setLocalReasonError(null);
    onReasonChange(event.target.value);
  };

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (state === 'pending') return;

    const validationError = getReasonError(reasonValue, reasonLabel, reasonPolicy);
    if (validationError) {
      setLocalReasonError(validationError);
      textareaRef.current?.focus();
      return;
    }

    onSubmit(reasonValue);
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'Escape') {
      event.preventDefault();
      if (isDismissible) onClose();
      return;
    }

    if (event.key !== 'Tab') return;

    const focusableElements = Array.from(
      dialogRef.current?.querySelectorAll<HTMLElement>(focusableSelector) ?? [],
    );
    if (focusableElements.length === 0) {
      event.preventDefault();
      feedbackRef.current?.focus();
      return;
    }

    const activeIndex = focusableElements.indexOf(document.activeElement as HTMLElement);
    const first = focusableElements[0];
    const last = focusableElements[focusableElements.length - 1];

    if (event.shiftKey && activeIndex <= 0) {
      event.preventDefault();
      last?.focus();
    } else if (
      !event.shiftKey &&
      (activeIndex < 0 || activeIndex === focusableElements.length - 1)
    ) {
      event.preventDefault();
      first?.focus();
    }
  };

  if (isPrivacyBoundary) {
    const copy = privacyCopy[state];
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-neutral-text/40 p-md">
        <div
          ref={dialogRef}
          role="dialog"
          aria-modal="true"
          aria-labelledby={titleId}
          onKeyDown={handleKeyDown}
          className={cn(
            'max-h-full w-full max-w-xl overflow-y-auto rounded-card border border-danger-border bg-neutral p-lg text-neutral-text shadow-xl',
            className,
          )}
        >
          <h2
            ref={feedbackRef as React.RefObject<HTMLHeadingElement>}
            id={titleId}
            tabIndex={-1}
            className="text-section-title font-semibold break-words"
          >
            {copy.title}
          </h2>
          <p role="alert" className="mt-sm text-body-compact text-danger-text">
            {copy.message}
          </p>
          <div className="mt-lg flex justify-end">
            <Button variant="secondary" onPress={onClose}>
              Đóng
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const renderedTitle =
    state === 'success'
      ? 'Thao tác đã hoàn tất'
      : state === 'conflict'
        ? 'Dữ liệu đã thay đổi'
        : title;
  const describedBy = showsReason ? consequenceId : undefined;
  const reasonDescribedBy = [
    reasonPolicy.hint ? reasonHintId : null,
    reasonPolicy.maxLength !== undefined ? reasonCountId : null,
    effectiveReasonError ? reasonErrorId : null,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-neutral-text/40 p-md">
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={describedBy}
        onKeyDown={handleKeyDown}
        className={cn(
          'max-h-full w-full max-w-xl overflow-y-auto rounded-card border border-neutral-border bg-neutral p-lg text-neutral-text shadow-xl',
          className,
        )}
      >
        <h2
          ref={
            state === 'success' || state === 'conflict'
              ? (feedbackRef as React.RefObject<HTMLHeadingElement>)
              : headingRef
          }
          id={titleId}
          tabIndex={-1}
          className="text-section-title font-semibold break-words"
        >
          {renderedTitle}
        </h2>

        {state === 'success' ? (
          <>
            <p role="status" aria-live="polite" className="mt-md break-words">
              {message ?? 'Thao tác đã được ghi nhận từ phản hồi hệ thống.'}
            </p>
            <div className="mt-lg flex justify-end">
              <Button variant="secondary" onPress={onClose}>
                Đóng
              </Button>
            </div>
          </>
        ) : (
          <>
            <p id={consequenceId} className="mt-sm text-body-compact break-words">
              {consequence}
            </p>
            <ReadOnlyDetailList
              ariaLabel="Ngữ cảnh thao tác"
              items={targetItems}
              className="mt-md border-y border-neutral-border py-sm"
            />

            {state === 'conflict' ? (
              <div className="mt-md">
                <p className="text-warning-text break-words">
                  {message ?? 'Dữ liệu đã thay đổi trong khi bạn thao tác.'}
                </p>
                {onResolveConflict ? (
                  <Button variant="secondary" onPress={onResolveConflict} className="mt-md">
                    Tải dữ liệu mới nhất
                  </Button>
                ) : null}
              </div>
            ) : (
              <form noValidate onSubmit={handleSubmit} className="mt-md">
                {state === 'error' ? (
                  <div
                    ref={feedbackRef as React.RefObject<HTMLDivElement>}
                    role="alert"
                    tabIndex={-1}
                    className="mb-md border-l-4 border-danger-border bg-danger px-sm py-xs text-danger-text break-words"
                  >
                    {message ?? 'Không thể hoàn tất thao tác. Vui lòng thử lại.'}
                  </div>
                ) : null}

                <label htmlFor={reasonId} className="block text-sm font-semibold">
                  {reasonLabel}
                  {reasonPolicy.required ? (
                    <span className="ml-xxs text-danger-text">
                      <span aria-hidden="true">*</span>
                      <span className="sr-only"> (bắt buộc)</span>
                    </span>
                  ) : null}
                </label>
                {reasonPolicy.hint ? (
                  <p id={reasonHintId} className="mt-xxs text-xs text-neutral-muted">
                    {reasonPolicy.hint}
                  </p>
                ) : null}
                <textarea
                  ref={textareaRef}
                  id={reasonId}
                  rows={5}
                  value={reasonValue}
                  required={reasonPolicy.required}
                  maxLength={reasonPolicy.maxLength}
                  aria-required={reasonPolicy.required ? 'true' : undefined}
                  aria-invalid={effectiveReasonError ? 'true' : 'false'}
                  aria-describedby={reasonDescribedBy || undefined}
                  onChange={handleReasonChange}
                  disabled={state === 'pending'}
                  className="mt-xs w-full resize-y rounded-control border border-neutral-border bg-neutral px-sm py-xs text-neutral-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:bg-neutral-surface"
                />
                {reasonPolicy.maxLength !== undefined ? (
                  <p id={reasonCountId} className="mt-xxs text-xs text-neutral-muted">
                    {reasonValue.length}/{reasonPolicy.maxLength} ký tự
                  </p>
                ) : null}
                {effectiveReasonError ? (
                  <p
                    id={reasonErrorId}
                    role="alert"
                    className="mt-xs text-sm font-semibold text-danger-text"
                  >
                    {effectiveReasonError}
                  </p>
                ) : null}

                {state === 'pending' ? (
                  <p role="status" aria-live="polite" className="mt-sm text-sm">
                    Đang xử lý yêu cầu…
                  </p>
                ) : null}

                <div className="mt-lg flex flex-wrap justify-end gap-xs">
                  <Button variant="secondary" onPress={onClose} isDisabled={state === 'pending'}>
                    Hủy thao tác
                  </Button>
                  <Button type="submit" variant="destructive" isLoading={state === 'pending'}>
                    {state === 'pending' ? 'Đang xử lý…' : commandLabel}
                  </Button>
                </div>
              </form>
            )}
          </>
        )}
      </div>
    </div>
  );
}
