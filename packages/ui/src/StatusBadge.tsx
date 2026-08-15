"use client";

import React from "react";
import { cn } from "./cn";

const STATUS_COLOR_MAP: Record<string, string> = {
  // Success
  DELIVERED: "bg-success text-success-text border-success-border",
  AVAILABLE: "bg-success text-success-text border-success-border",
  PAID_MANUAL: "bg-success text-success-text border-success-border",
  // Warning
  PICKING_UP: "bg-warning text-warning-text border-warning-border",
  UNPAID: "bg-warning text-warning-text border-warning-border",
  // Active
  ACTIVE: "bg-active text-active-text border-active-border",
  ACCEPTED: "bg-active text-active-text border-active-border",
  BUSY: "bg-active text-active-text border-active-border",
  IN_TRANSIT: "bg-active text-active-text border-active-border",
  // Danger
  CANCELLED: "bg-danger text-danger-text border-danger-border",
  DISABLED: "bg-danger text-danger-text border-danger-border",
  FAILED: "bg-danger text-danger-text border-danger-border",
  // Info
  REQUESTED: "bg-info text-info-text border-info-border",
  INVITED: "bg-info text-info-text border-info-border",
  QR_CREATED: "bg-info text-info-text border-info-border",
  // Neutral
  OFFLINE: "bg-neutral-surface text-neutral-text border-neutral-border",
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
        "inline-flex items-center rounded-pill border px-xs py-1 text-xs font-medium",
        colorClasses,
        className,
      )}
    >
      {label}
    </span>
  );
}
