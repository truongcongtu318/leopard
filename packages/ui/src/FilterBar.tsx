"use client";

import React from "react";
import { cn } from "./cn";

export type FilterBarFilters = {
  search: string;
  status: string;
};

export type FilterBarProps = {
  filters: FilterBarFilters;
  onFilterChange: (filters: FilterBarFilters) => void;
  className?: string;
};

const STATUS_OPTIONS = [
  { value: "", label: "All statuses" },
  { value: "ACTIVE", label: "Active" },
  { value: "DELIVERED", label: "Delivered" },
  { value: "REQUESTED", label: "Requested" },
  { value: "PICKING_UP", label: "Picking Up" },
  { value: "IN_TRANSIT", label: "In Transit" },
  { value: "CANCELLED", label: "Cancelled" },
  { value: "DISABLED", label: "Disabled" },
  { value: "FAILED", label: "Failed" },
  { value: "ACCEPTED", label: "Accepted" },
  { value: "INVITED", label: "Invited" },
  { value: "QR_CREATED", label: "QR Created" },
  { value: "OFFLINE", label: "Offline" },
  { value: "UNPAID", label: "Unpaid" },
  { value: "PAID_MANUAL", label: "Paid Manual" },
];

export function FilterBar({ filters, onFilterChange, className }: FilterBarProps) {
  const searchTimeoutRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const [localSearch, setLocalSearch] = React.useState(filters.search);

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
        "flex flex-wrap items-center gap-sm",
        className,
      )}
    >
      <input
        type="text"
        placeholder="Search..."
        value={localSearch}
        onChange={handleSearchChange}
        aria-label="Search"
        className={cn(
          "rounded-control border border-neutral-border bg-neutral px-sm py-2 text-sm text-neutral-text",
          "placeholder:text-neutral-muted",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand",
          "flex-1 min-w-[200px]",
        )}
      />

      <select
        role="combobox"
        value={filters.status}
        onChange={handleStatusChange}
        aria-label="Filter by status"
        className={cn(
          "rounded-control border border-neutral-border bg-neutral px-sm py-2 text-sm text-neutral-text",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand",
        )}
      >
        {STATUS_OPTIONS.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>

      {hasFilters && (
        <button
          type="button"
          onClick={handleClear}
          aria-label="Clear filters"
          className={cn(
            "inline-flex items-center rounded-control border border-neutral-border bg-neutral px-sm py-2 text-sm font-medium text-neutral-text",
            "hover:bg-neutral-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand",
          )}
        >
          Clear
        </button>
      )}
    </div>
  );
}
