'use client';

import { useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';

function getSocketBaseUrl(): string {
  const envUrl =
    (process.env.NEXT_PUBLIC_API_URL as string | undefined) ??
    (process.env.API_URL as string | undefined);
  if (envUrl) {
    return envUrl.replace(/\/api\/v1\/?$/, '');
  }
  if (typeof window !== 'undefined') {
    const { protocol, hostname } = window.location;
    return `${protocol}//${hostname}:3000`;
  }
  return 'http://localhost:3000';
}

async function fetchSocketToken(): Promise<string | null> {
  try {
    const response = await fetch('/api/v1/auth/socket-token', {
      method: 'GET',
      credentials: 'include',
    });
    if (!response.ok) return null;
    const body = (await response.json()) as { token?: unknown };
    return typeof body.token === 'string' && body.token ? body.token : null;
  } catch {
    return null;
  }
}

export interface UseOrderTrackingSocketOptions {
  orderId: string | null | undefined;
  enabled?: boolean;
}

export function useOrderTrackingSocket({
  orderId,
  enabled = true,
}: UseOrderTrackingSocketOptions): void {
  let router: ReturnType<typeof useRouter> | null = null;
  try {
    router = useRouter();
  } catch {
    router = null;
  }
  const socketRef = useRef<unknown>(null);
  const orderIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (!enabled || !orderId) return;
    if (process.env.NODE_ENV === 'test') return;

    let cancelled = false;
    let socket: any = null;
    let refreshTimer: ReturnType<typeof setTimeout> | null = null;

    const triggerRefresh = () => {
      if (cancelled) return;
      if (typeof document !== 'undefined' && document.visibilityState !== 'visible') return;
      if (refreshTimer) return;
      refreshTimer = setTimeout(() => {
        refreshTimer = null;
      }, 4000);
      if (router) {
        try {
          router.refresh();
          return;
        } catch {
          // fall through to event
        }
      }
      window.dispatchEvent(new CustomEvent('leopard:live-refresh'));
    };

    const connect = async () => {
      if (cancelled) return;

      const token = await fetchSocketToken();
      const baseUrl = getSocketBaseUrl();
      const namespace = `${baseUrl.replace(/\/$/, '')}/tracking`;

      try {
        const { io } = await import('socket.io-client');
        const opts: Record<string, unknown> = {
          transports: ['websocket'],
          withCredentials: true,
          reconnectionAttempts: 5,
          reconnectionDelay: 1500,
        };
        if (token) opts.auth = { token };
        socket = (io as unknown as (uri: string, opts: Record<string, unknown>) => any)(namespace, opts);
        socketRef.current = socket;

        socket.on('connect', () => {
          if (orderId) socket.emit('tracking:join-order', { orderId });
        });

        socket.on('tracking:point-updated', triggerRefresh);
        socket.on('order:status-updated', triggerRefresh);
        socket.on('tracking:point', triggerRefresh);
        socket.on('order:status_changed', triggerRefresh);

        socket.on('session:error', async () => {
          const newToken = await fetchSocketToken();
          if (newToken && socket) {
            socket.auth = { token: newToken };
            socket.disconnect();
            socket.connect();
          }
        });

        socket.on('connect_error', () => {
          // Fallback will be handled by polling in LiveOrderRefresher
        });

        socket.connect();
        orderIdRef.current = orderId;

        const handleVisibility = () => {
          if (document.visibilityState === 'visible' && socket?.connected) {
            socket.emit('tracking:join-order', { orderId });
          }
        };
        document.addEventListener('visibilitychange', handleVisibility);

        return () => {
          document.removeEventListener('visibilitychange', handleVisibility);
        };
      } catch {
        // Socket unavailable — polling fallback will handle freshness
      }
    };

    void connect();

    return () => {
      cancelled = true;
      if (refreshTimer) clearTimeout(refreshTimer);
      if (socket) {
        try {
          if (orderIdRef.current) socket.emit('tracking:leave-order', { orderId: orderIdRef.current });
          socket.removeAllListeners();
          socket.disconnect();
        } catch {
          // ignore
        }
      }
      socketRef.current = null;
    };
  }, [orderId, enabled, router]);
}
