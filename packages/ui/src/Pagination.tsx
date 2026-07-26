"use client";

import React from "react";
import { cn } from "./cn";

export type PaginationProps = {
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  className?: string;
};

function getPageNumbers(current: number, total: number): (number | "ellipsis")[] {
  if (total <= 7) {
    return Array.from({ length: total }, (_, i) => i + 1);
  }

  const pages: (number | "ellipsis")[] = [];

  // Always show first page
  pages.push(1);

  if (current > 3) {
    pages.push("ellipsis");
  }

  // Pages around current
  const start = Math.max(2, current - 1);
  const end = Math.min(total - 1, current + 1);

  for (let i = start; i <= end; i++) {
    pages.push(i);
  }

  if (current < total - 2) {
    pages.push("ellipsis");
  }

  // Always show last page
  pages.push(total);

  return pages;
}

export function Pagination({
  page,
  totalPages,
  onPageChange,
  className,
}: PaginationProps) {
  const pages = getPageNumbers(page, totalPages);

  return (
    <nav aria-label="Pagination" className={cn("flex items-center gap-xs", className)}>
      <button
        type="button"
        onClick={() => onPageChange(page - 1)}
        disabled={page <= 1}
        aria-label="Previous page"
        className={cn(
          "inline-flex h-8 w-8 items-center justify-center rounded-control text-sm font-medium transition-colors",
          "hover:bg-neutral-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand",
          "disabled:opacity-40 disabled:cursor-not-allowed",
          page <= 1 ? "text-neutral-muted" : "text-neutral-text",
        )}
      >
        &laquo;
      </button>

      {pages.map((p, i) =>
        p === "ellipsis" ? (
          <span
            key={`ellipsis-${i}`}
            className="inline-flex h-8 w-8 items-center justify-center text-sm text-neutral-muted"
            aria-hidden="true"
          >
            ...
          </span>
        ) : (
          <button
            key={p}
            type="button"
            onClick={() => onPageChange(p)}
            aria-label={`Page ${p}`}
            aria-current={p === page ? "page" : undefined}
            className={cn(
              "inline-flex h-8 w-8 items-center justify-center rounded-control text-sm font-medium transition-colors",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand",
              p === page
                ? "bg-brand text-brand-text"
                : "text-neutral-text hover:bg-neutral-surface",
            )}
          >
            {p}
          </button>
        ),
      )}

      <button
        type="button"
        onClick={() => onPageChange(page + 1)}
        disabled={page >= totalPages}
        aria-label="Next page"
        className={cn(
          "inline-flex h-8 w-8 items-center justify-center rounded-control text-sm font-medium transition-colors",
          "hover:bg-neutral-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand",
          "disabled:opacity-40 disabled:cursor-not-allowed",
          page >= totalPages ? "text-neutral-muted" : "text-neutral-text",
        )}
      >
        &raquo;
      </button>

      <span className="sr-only" aria-live="polite">
        Page {page} of {totalPages}
      </span>
    </nav>
  );
}
