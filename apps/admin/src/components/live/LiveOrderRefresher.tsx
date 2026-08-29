'use client';

import { useRouter } from 'next/navigation';
import React from 'react';

import { useOrderTrackingSocket } from '../../features/tracking/useOrderTrackingSocket';

export const LIVE_REFRESH_EVENT = 'leopard:live-refresh';

/**
 * Visibility-aware polling trigger for live operational screens.
 *
 * Contract:
 * - Dispatches LIVE_REFRESH_EVENT on a fixed interval so RSC data stays fresh
 *   without duplicating fetch logic on the client.
 * - Skips ticks while the tab is hidden (document.visibilityState) and fires
 *   immediately when it becomes visible again.
 * - Never stacks requests: a tick is skipped while a refresh is considered
 *   in flight.
 * - Renders nothing when disabled (e.g. terminal orders); the static copy
 *   explains the freshness mechanism instead of decorative motion.
 */
export function LiveOrderRefresher({
  intervalMs = 15000,
  enabled = true,
  orderId,
}: Readonly<{
  readonly intervalMs?: number;
  readonly enabled?: boolean;
  readonly orderId?: string | null;
}>) {
  useOrderTrackingSocket({ orderId: orderId ?? null, enabled });

  const inFlightRef = React.useRef(false);

  React.useEffect(() => {
    if (!enabled) return;

    const tick = () => {
      if (typeof document !== 'undefined' && document.visibilityState !== 'visible') return;
      if (inFlightRef.current) return;

      inFlightRef.current = true;
      try {
        window.dispatchEvent(new CustomEvent(LIVE_REFRESH_EVENT));
      } finally {
        // Refresh completion is not observable here; hold the guard for a
        // bounded window so slow round-trips cannot stack requests.
        window.setTimeout(() => {
          inFlightRef.current = false;
        }, 5000);
      }
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') tick();
    };

    const timer = setInterval(tick, intervalMs);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      clearInterval(timer);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [enabled, intervalMs]);

  if (!enabled) return null;

  return (
    <p className="text-xs text-neutral-muted tabular-nums">
      Tự động cập nhật dữ liệu mỗi {Math.round(intervalMs / 1000)} giây khi tab đang mở.
    </p>
  );
}

/**
 * Mounted once per operations shell: translates live-refresh events into a
 * single App Router refresh. Keeps every screen free of router dependencies.
 */
export function LiveRefreshBridge() {
  const router = useRouter();

  React.useEffect(() => {
    let pending = false;

    const handleLiveRefresh = () => {
      if (pending) return;
      if (typeof document !== 'undefined' && document.visibilityState !== 'visible') return;
      pending = true;
      try {
        router.refresh();
      } finally {
        window.setTimeout(() => {
          pending = false;
        }, 5000);
      }
    };

    window.addEventListener(LIVE_REFRESH_EVENT, handleLiveRefresh);
    return () => window.removeEventListener(LIVE_REFRESH_EVENT, handleLiveRefresh);
  }, [router]);

  return null;
}
