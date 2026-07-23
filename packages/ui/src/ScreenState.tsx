"use client";

import React from "react";
import { cn } from "./cn";

export type ScreenStateProps = {
  state: "loading" | "empty" | "error" | "success";
  message?: string;
  onRetry?: () => void;
  className?: string;
  children?: React.ReactNode;
};

function Spinner() {
  return (
    <svg
      className="h-12 w-12 animate-spin text-brand"
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      role="status"
      aria-label="Loading"
    >
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="4"
      />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
      />
    </svg>
  );
}

export function ScreenState({
  state,
  message,
  onRetry,
  className,
  children,
}: ScreenStateProps) {
  if (state === "success") {
    return <>{children}</>;
  }

  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-md py-xl text-center",
        className,
      )}
    >
      {state === "loading" && (
        <>
          <Spinner />
          <p className="text-sm text-neutral-muted">{message ?? "Loading..."}</p>
        </>
      )}

      {state === "empty" && (
        <>
          <span className="sr-only">Empty state</span>
          <svg
            className="h-16 w-16 text-neutral-muted"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={1}
            stroke="currentColor"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"
            />
          </svg>
          <p className="text-sm text-neutral-muted">{message ?? "Empty"}</p>
        </>
      )}

      {state === "error" && (
        <>
          <svg
            className="h-16 w-16 text-danger"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={1}
            stroke="currentColor"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z"
            />
          </svg>
          <p className="text-sm text-danger-text">{message ?? "An error occurred"}</p>
          {onRetry && (
            <button
              type="button"
              onClick={onRetry}
              className="inline-flex items-center rounded-control bg-brand px-md py-2 text-sm font-medium text-brand-text hover:brightness-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2"
            >
              Retry
            </button>
          )}
        </>
      )}
    </div>
  );
}
