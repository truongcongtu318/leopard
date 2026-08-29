'use client';

import React from 'react';
import { cn } from './cn';

export type DataTableColumn = {
  key: string;
  header: string;
  sortable?: boolean;
  className?: string;
  render?: (row: Record<string, unknown>) => React.ReactNode;
};

export type DataTableProps = {
  columns: DataTableColumn[];
  rows: Record<string, unknown>[];
  caption?: string;
  isLoading?: boolean;
  emptyMessage?: string;
  onSort?: (sortKey: string) => void;
  sortKey?: string;
  sortDirection?: 'ascending' | 'descending';
  className?: string;
};

function SkeletonRow({ columns }: { columns: DataTableColumn[] }) {
  return (
    <tr aria-busy="true" role="row">
      {columns.map((column) => (
        <td key={column.key} className={cn('px-md py-sm', column.className)}>
          <div className="h-4 w-full animate-pulse rounded bg-neutral-surface motion-reduce:animate-none" />
        </td>
      ))}
    </tr>
  );
}

export function DataTable({
  columns,
  rows,
  caption,
  isLoading = false,
  emptyMessage = 'No data',
  onSort,
  sortKey,
  sortDirection,
  className,
}: DataTableProps) {
  return (
    <div className={cn('w-full overflow-hidden rounded-xl border border-neutral-border/60 bg-white shadow-sm', className)}>
      <table role="table" className="w-full border-collapse text-left text-sm">
        {caption ? <caption className="sr-only">{caption}</caption> : null}
        <thead>
          <tr role="row" className="bg-neutral-surface/70 backdrop-blur border-b border-neutral-border/60">
            {columns.map((col) => (
              <th
                key={col.key}
                role="columnheader"
                scope="col"
                aria-sort={col.sortable && col.key === sortKey ? sortDirection : undefined}
                className={cn(
                  'text-xs font-bold tracking-widest uppercase text-neutral-muted',
                  col.sortable ? 'p-0' : 'px-md py-3',
                  col.className,
                )}
              >
                {col.sortable ? (
                  <button
                    type="button"
                    onClick={() => onSort?.(col.key)}
                    className={cn(
                      'flex min-h-11 min-w-11 w-full cursor-pointer select-none items-center gap-1.5 bg-transparent px-md py-3 text-left text-xs font-bold tracking-widest uppercase text-neutral-muted',
                      'hover:text-neutral-text hover:bg-white focus-visible:outline-2 focus-visible:outline-offset-[-4px] focus-visible:outline-brand-soft focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-inset',
                    )}
                  >
                    <span>{col.header}</span>
                    <svg
                      className="h-3 w-3 text-brand-soft"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                      aria-hidden="true"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4"
                      />
                    </svg>
                  </button>
                ) : (
                  col.header
                )}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {isLoading ? (
            Array.from({ length: 3 }).map((_, i) => <SkeletonRow key={i} columns={columns} />)
          ) : rows.length === 0 ? (
            <tr role="row">
              <td colSpan={columns.length} className="px-md py-lg text-center text-neutral-muted">
                {emptyMessage}
              </td>
            </tr>
          ) : (
            rows.map((row, rowIdx) => (
              <tr
                key={rowIdx}
                role="row"
                className="border-b border-neutral-border/40 last:border-b-0 hover:bg-brand-soft/30 transition-colors group"
              >
                {columns.map((col) => (
                  <td key={col.key} className={cn('px-md py-sm text-neutral-text', col.className)}>
                    {col.render ? col.render(row) : String(row[col.key] ?? '')}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
