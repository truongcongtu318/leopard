"use client";

import React from "react";
import { cn } from "./cn";

export type MapPanelProps = {
  height?: string;
  className?: string;
};

export function MapPanel({ height = "400px", className }: MapPanelProps) {
  return (
    <div
      style={{ height }}
      className={cn(
        "flex items-center justify-center rounded-card border border-neutral-border bg-neutral-surface text-sm text-neutral-muted",
        className,
      )}
    >
      Map placeholder
    </div>
  );
}
