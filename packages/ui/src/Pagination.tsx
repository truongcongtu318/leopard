'use client';

import React from 'react';
import { cn } from './cn';

export type PaginationProps = Readonly<{
  page: number;
  totalPages: number;
  totalItems?: number;
  onPageChange: (page: number) => void;
  ariaLabel?: string;
  className?: string;
}>;

function getPageNumbers(current: number, total: number): (number | 'ellipsis')[] {
  if (total <= 7) {
    return Array.from({ length: total }, (_, index) => index + 1);
  }

  const pages: (number | 'ellipsis')[] = [1];

  if (current > 3) {
    pages.push('ellipsis');
  }

  const start = Math.max(2, current - 1);
  const end = Math.min(total - 1, current + 1);

  for (let pageNumber = start; pageNumber <= end; pageNumber += 1) {
    pages.push(pageNumber);
  }

  if (current < total - 2) {
    pages.push('ellipsis');
  }

  pages.push(total);
  return pages;
}

const controlClasses = cn(
  'inline-flex min-h-11 min-w-11 items-center justify-center rounded-control text-sm font-medium transition-colors',
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2',
  'motion-reduce:transition-none disabled:cursor-not-allowed disabled:opacity-40',
);

export function Pagination({
  page,
  totalPages,
  totalItems,
  onPageChange,
  ariaLabel = 'Phân trang kết quả',
  className,
}: PaginationProps) {
  const safeTotalPages = Math.max(1, Math.floor(totalPages) || 1);
  const currentPage = Math.min(Math.max(1, Math.floor(page) || 1), safeTotalPages);
  const pages = getPageNumbers(currentPage, safeTotalPages);
  const pageSummary = `Trang ${currentPage} trên ${safeTotalPages}`;
  const resultSummary =
    totalItems === undefined ? pageSummary : `${pageSummary} · ${totalItems} kết quả`;

  return (
    <nav aria-label={ariaLabel} className={cn('flex flex-wrap items-center gap-xs', className)}>
      <button
        type="button"
        onClick={() => onPageChange(currentPage - 1)}
        disabled={currentPage <= 1}
        aria-label="Về trang trước"
        className={cn(
          controlClasses,
          'hover:bg-neutral-surface',
          currentPage <= 1 ? 'text-neutral-muted' : 'text-neutral-text',
        )}
      >
        <span aria-hidden="true">&lsaquo;</span>
      </button>

      {pages.map((item, index) =>
        item === 'ellipsis' ? (
          <span
            key={`ellipsis-${index}`}
            className="inline-flex min-h-11 min-w-11 items-center justify-center text-sm text-neutral-muted"
            aria-hidden="true"
          >
            …
          </span>
        ) : (
          <button
            key={item}
            type="button"
            onClick={() => onPageChange(item)}
            aria-label={
              item === currentPage ? `Trang ${item}, trang hiện tại` : `Đến trang ${item}`
            }
            aria-current={item === currentPage ? 'page' : undefined}
            className={cn(
              controlClasses,
              item === currentPage
                ? 'bg-brand text-brand-text'
                : 'text-neutral-text hover:bg-neutral-surface',
            )}
          >
            {item}
          </button>
        ),
      )}

      <button
        type="button"
        onClick={() => onPageChange(currentPage + 1)}
        disabled={currentPage >= safeTotalPages}
        aria-label="Đến trang sau"
        className={cn(
          controlClasses,
          'hover:bg-neutral-surface',
          currentPage >= safeTotalPages ? 'text-neutral-muted' : 'text-neutral-text',
        )}
      >
        <span aria-hidden="true">&rsaquo;</span>
      </button>

      <span className="sr-only" role="status" aria-live="polite" aria-atomic="true">
        {resultSummary}
      </span>
    </nav>
  );
}
