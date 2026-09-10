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
  'inline-flex min-h-11 min-w-11 items-center justify-center rounded-xl text-xs font-semibold transition-all border shadow-2xs',
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-1',
  'motion-reduce:transition-none disabled:cursor-not-allowed disabled:opacity-40 disabled:border-slate-200 disabled:bg-slate-50',
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
    <nav aria-label={ariaLabel} className={cn('flex flex-wrap items-center gap-1.5', className)}>
      <button
        type="button"
        onClick={() => onPageChange(currentPage - 1)}
        disabled={currentPage <= 1}
        aria-label="Về trang trước"
        className={cn(
          controlClasses,
          'border-slate-200/80 bg-white hover:bg-slate-50',
          currentPage <= 1 ? 'text-slate-300' : 'text-slate-700',
        )}
      >
        <span aria-hidden="true">&lsaquo;</span>
      </button>

      {pages.map((item, index) =>
        item === 'ellipsis' ? (
          <span
            key={`ellipsis-${index}`}
            className="inline-flex min-h-10 min-w-10 items-center justify-center text-xs font-semibold text-slate-400"
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
                ? 'bg-brand text-white border-brand shadow-xs font-bold'
                : 'border-slate-200/80 bg-white text-slate-700 hover:bg-slate-50 hover:border-slate-300',
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
          'border-slate-200/80 bg-white hover:bg-slate-50',
          currentPage >= safeTotalPages ? 'text-slate-300' : 'text-slate-700',
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
