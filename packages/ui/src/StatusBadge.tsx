"use client";

import React from "react";
import { cn } from "./cn";

const STATUS_COLOR_MAP: Record<string, string> = {
  // Success
  DELIVERED: "bg-success text-success-text border-success-border",
  ACTIVE: "bg-success text-success-text border-success-border",
  // Warning
  REQUESTED: "bg-warning text-warning-text border-warning-border",
  PICKING_UP: "bg-warning text-warning-text border-warning-border",
  IN_TRANSIT: "bg-warning text-warning-text border-warning-border",
  // Danger
  CANCELLED: "bg-danger text-danger-text border-danger-border",
  DISABLED: "bg-danger text-danger-text border-danger-border",
  FAILED: "bg-danger text-danger-text border-danger-border",
  // Info
  ACCEPTED: "bg-info text-info-text border-info-border",
  INVITED: "bg-info text-info-text border-info-border",
  QR_CREATED: "bg-info text-info-text border-info-border",
  // Neutral
  OFFLINE: "bg-neutral-surface text-neutral-text border-neutral-border",
  UNPAID: "bg-neutral-surface text-neutral-text border-neutral-border",
  PAID_MANUAL: "bg-neutral-surface text-neutral-text border-neutral-border",
};

export type StatusBadgeProps = {
  status: string;
  className?: string;
};

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const colorClasses =
    STATUS_COLOR_MAP[status] ??
    "bg-neutral-surface text-neutral-text border-neutral-border";

  const label = status.replace(/_/g, " ");

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-control border px-xs py-1 text-xs font-medium",
        colorClasses,
        className,
      )}
    >
      {label}
    </span>
  );
}
