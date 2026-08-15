"use client";

import React from "react";
import { cn } from "./cn";

export type DataTableColumn = {
  key: string;
  header: string;
  sortable?: boolean;
  render?: (row: Record<string, unknown>) => React.ReactNode;
};

export type DataTableProps = {
  columns: DataTableColumn[];
  rows: Record<string, unknown>[];
  isLoading?: boolean;
  emptyMessage?: string;
  onSort?: (sortKey: string) => void;
  sortKey?: string;
  sortDirection?: "ascending" | "descending";
  className?: string;
};

function SkeletonRow({ cols }: { cols: number }) {
  return (
    <tr aria-busy="true" role="row">
      {Array.from({ length: cols }).map((_, i) => (
        <td key={i} className="px-md py-sm">
          <div className="h-4 w-full animate-pulse rounded bg-neutral-surface motion-reduce:animate-none" />
        </td>
      ))}
    </tr>
  );
}

export function DataTable({
  columns,
  rows,
  isLoading = false,
  emptyMessage = "No data",
  onSort,
  sortKey,
  sortDirection,
  className,
}: DataTableProps) {
  return (
    <div
      className={cn("w-full overflow-x-auto rounded-card border border-neutral-border", className)}
    >
      <table role="table" className="w-full border-collapse text-left text-sm">
        <thead>
          <tr role="row" className="border-b border-neutral-border bg-neutral-surface">
            {columns.map((col) => (
              <th
                key={col.key}
                role="columnheader"
                scope="col"
                aria-sort={
                  col.sortable && col.key === sortKey
                    ? sortDirection
                    : undefined
                }
                className={cn(
                  "font-semibold text-neutral-text",
                  col.sortable ? "p-0" : "px-md py-sm",
                )}
              >
                {col.sortable ? (
                  <button
                    type="button"
                    onClick={() => onSort?.(col.key)}
                    className={cn(
                      "flex min-h-11 min-w-11 w-full cursor-pointer select-none items-center gap-1 bg-transparent px-md py-sm text-left text-sm font-semibold text-neutral-text",
                      "hover:bg-neutral-border/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2",
                    )}
                  >
                    <span>{col.header}</span>
                    <svg
                      className="h-3 w-3 text-neutral-muted"
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
            Array.from({ length: 3 }).map((_, i) => (
              <SkeletonRow key={i} cols={columns.length} />
            ))
          ) : rows.length === 0 ? (
            <tr role="row">
              <td
                colSpan={columns.length}
                className="px-md py-lg text-center text-neutral-muted"
              >
                {emptyMessage}
              </td>
            </tr>
          ) : (
            rows.map((row, rowIdx) => (
              <tr
                key={rowIdx}
                role="row"
                className="border-b border-neutral-border last:border-b-0 hover:bg-neutral-surface/50"
              >
                {columns.map((col) => (
                  <td key={col.key} className="px-md py-sm text-neutral-text">
                    {col.render
                      ? col.render(row)
                      : String(row[col.key] ?? "")}
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
