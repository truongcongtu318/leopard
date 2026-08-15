"use client";

import React from "react";
import { cn } from "./cn";

export type FilterBarFilters = {
  search: string;
  status: string;
};

export type FilterBarStatusOption = {
  readonly value: string;
  readonly label: string;
};

export type FilterBarProps = {
  filters: FilterBarFilters;
  statusOptions: readonly FilterBarStatusOption[];
  onFilterChange: (filters: FilterBarFilters) => void;
  className?: string;
};

export function FilterBar({
  filters,
  statusOptions,
  onFilterChange,
  className,
}: FilterBarProps) {
  const searchTimeoutRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const [localSearch, setLocalSearch] = React.useState(filters.search);
  const searchInputId = React.useId();
  const statusSelectId = React.useId();

  // Sync external search value when it changes from outside (e.g. clear)
  React.useEffect(() => {
    setLocalSearch(filters.search);
  }, [filters.search]);

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setLocalSearch(value);

    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    searchTimeoutRef.current = setTimeout(() => {
      onFilterChange({ ...filters, search: value });
    }, 200);
  };

  const handleStatusChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    onFilterChange({ ...filters, status: e.target.value });
  };

  const handleClear = () => {
    setLocalSearch("");
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
      searchTimeoutRef.current = null;
    }
    onFilterChange({ search: "", status: "" });
  };

  // Cleanup timer on unmount
  React.useEffect(() => {
    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, []);

  const hasFilters = filters.search !== "" || filters.status !== "";

  return (
    <div
      className={cn(
        "flex flex-wrap items-end gap-sm",
        className,
      )}
    >
      <div className="flex min-w-[200px] flex-1 flex-col gap-xxs">
        <label
          htmlFor={searchInputId}
          className="text-sm font-semibold text-neutral-text"
        >
          Tìm kiếm
        </label>
        <input
          id={searchInputId}
          type="text"
          placeholder="Nhập từ khóa"
          value={localSearch}
          onChange={handleSearchChange}
          className={cn(
            "min-h-11 w-full rounded-control border border-neutral-border bg-neutral px-sm py-2 text-sm text-neutral-text",
            "placeholder:text-neutral-muted",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2",
          )}
        />
      </div>

      <div className="flex flex-col gap-xxs">
        <label
          htmlFor={statusSelectId}
          className="text-sm font-semibold text-neutral-text"
        >
          Trạng thái
        </label>
        <select
          id={statusSelectId}
          value={filters.status}
          onChange={handleStatusChange}
          className={cn(
            "min-h-11 rounded-control border border-neutral-border bg-neutral px-sm py-2 text-sm text-neutral-text",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2",
          )}
        >
          {statusOptions.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>

      {hasFilters && (
        <button
          type="button"
          onClick={handleClear}
          className={cn(
            "inline-flex min-h-11 items-center rounded-control border border-neutral-border bg-neutral px-sm py-2 text-sm font-medium text-neutral-text",
            "hover:bg-neutral-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2",
          )}
        >
          Xóa bộ lọc
        </button>
      )}
    </div>
  );
}
