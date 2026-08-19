'use client';

import React from 'react';
import { cn } from './cn';

export type ButtonVariant = 'primary' | 'secondary' | 'destructive' | 'ghost';
export type ButtonSize = 'sm' | 'md' | 'lg';

export type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
  isLoading?: boolean;
  isDisabled?: boolean;
  onPress?: React.MouseEventHandler<HTMLButtonElement>;
};

const variantClasses: Record<ButtonVariant, string> = {
  primary:
    'bg-brand text-brand-text hover:brightness-90 focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2',
  secondary:
    'bg-neutral-surface text-neutral-text border border-neutral-border hover:brightness-95 focus-visible:ring-2 focus-visible:ring-neutral-border focus-visible:ring-offset-2',
  destructive:
    'bg-danger text-danger-text hover:brightness-90 focus-visible:ring-2 focus-visible:ring-danger-border focus-visible:ring-offset-2',
  ghost:
    'bg-transparent text-neutral-text hover:bg-neutral-surface focus-visible:ring-2 focus-visible:ring-neutral-border focus-visible:ring-offset-2',
};

const sizeClasses: Record<ButtonSize, string> = {
  sm: 'h-11 min-h-[44px] px-sm text-sm',
  md: 'h-11 min-h-[44px] px-md text-sm',
  lg: 'h-12 min-h-[48px] px-lg text-base',
};

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant = 'primary',
      size = 'md',
      isLoading = false,
      isDisabled = false,
      onPress,
      className,
      children,
      onClick,
      disabled,
      ...rest
    },
    ref,
  ) => {
    const isButtonDisabled = Boolean(disabled || isDisabled || isLoading);

    const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
      if (isButtonDisabled) return;
      onPress?.(e);
      onClick?.(e);
    };

    return (
      <button
        ref={ref}
        type="button"
        disabled={isButtonDisabled}
        aria-disabled={isButtonDisabled}
        aria-busy={isLoading}
        onClick={handleClick}
        className={cn(
          'inline-flex items-center justify-center gap-xs rounded-control font-medium transition-colors focus-visible:outline-none disabled:opacity-50 disabled:cursor-not-allowed motion-reduce:transition-none',
          variantClasses[variant],
          sizeClasses[size],
          className,
        )}
        {...rest}
      >
        {isLoading && (
          <span
            role="status"
            aria-hidden="true"
            className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-current border-r-transparent motion-reduce:animate-none"
          />
        )}
        {children}
      </button>
    );
  },
);

Button.displayName = 'Button';
