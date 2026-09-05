'use client';

import React from 'react';
import { ArrowUpDown } from 'lucide-react';
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
    <div className={cn('w-full overflow-hidden rounded-card rounded-2xl border border-slate-200/80 bg-white shadow-2xs', className)}>
      <table role="table" className="w-full border-collapse text-left text-xs sm:text-sm">
        {caption ? <caption className="sr-only">{caption}</caption> : null}
        <thead>
          <tr role="row" className="border-b border-slate-200/80 bg-slate-50/90">
            {columns.map((col) => (
              <th
                key={col.key}
                role="columnheader"
                scope="col"
                aria-sort={col.sortable && col.key === sortKey ? sortDirection : undefined}
                className={cn(
                  'text-[11px] font-extrabold tracking-wider uppercase text-slate-500 py-3',
                  col.sortable ? 'p-0' : 'px-4',
                  col.className,
                )}
              >
                {col.sortable ? (
                  <button
                    type="button"
                    onClick={() => onSort?.(col.key)}
                    className={cn(
                      'flex min-h-11 min-w-11 w-full cursor-pointer select-none items-center gap-1.5 bg-transparent px-4 py-3 text-left text-[11px] font-extrabold tracking-wider uppercase text-slate-500',
                      'hover:text-slate-800 hover:bg-slate-100/60 focus-visible:outline-2 focus-visible:outline-offset-[-4px] focus-visible:outline-brand-soft focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-inset motion-reduce:transition-none',
                    )}
                  >
                    <span>{col.header}</span>
                    <ArrowUpDown className="h-3 w-3 text-slate-400" aria-hidden="true" />
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
              <td colSpan={columns.length} className="px-md py-lg text-center text-slate-400">
                {emptyMessage}
              </td>
            </tr>
          ) : (
            rows.map((row, rowIdx) => (
              <tr
                key={rowIdx}
                role="row"
                className="border-b border-slate-100/90 last:border-b-0 hover:bg-sky-50/40 transition-colors"
              >
                {columns.map((col) => (
                  <td key={col.key} className={cn('px-4 py-3.5 text-slate-700', col.className)}>
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
