import { useQuery } from '@tanstack/react-query';
import { useEffect, useMemo, useState } from 'react';

import { sessionStore } from '@leopard/mobile-core';
import { createDriverHttpAdapter } from './adapter';
import { createDriverIdleLocationPing, type DriverIdleLocationPing, type IdlePingHealth } from './idle-location-ping';

// Module-level singleton: `useDriverIdlePing` is mounted once at the driver
// root layout (see app/_layout.tsx), but the health indicator needs to be
// readable from any screen (e.g. the orders list). Sharing the same ping
// instance's health stream avoids a context provider for one small value.
let sharedIdlePing: DriverIdleLocationPing | null = null;
const pingListeners = new Set<(ping: DriverIdleLocationPing) => void>();

/**
 * Starts/stops the driver's idle location ping based on their AVAILABLE status.
 * Mount once at the driver root layout so it survives navigation between
 * driver screens (orders, earnings, history, profile) — see Dispatch Radar
 * Phase 1 plan, Phần B.
 */
export function useDriverIdlePing(enabled: boolean): void {
  const [isAuthenticatedDriver, setIsAuthenticatedDriver] = useState(
    () => sessionStore.isAuthenticated() && sessionStore.getRole() === 'DRIVER',
  );

  useEffect(() => {
    return sessionStore.subscribe((state) => {
      setIsAuthenticatedDriver(state.authenticated && state.role === 'DRIVER');
    });
  }, []);

  const isPingActive = enabled && isAuthenticatedDriver;

  const port = useMemo(() => createDriverHttpAdapter(), []);
  const idlePing = useMemo(() => {
    const instance = createDriverIdleLocationPing();
    sharedIdlePing = instance;
    for (const listener of pingListeners) listener(instance);
    return instance;
  }, []);

  const query = useQuery({
    queryKey: ['driver', 'orders'],
    queryFn: () => port.getOrdersView(),
    enabled: isPingActive,
  });

  const status = isPingActive && query.data?.kind === 'content' ? query.data.availability.status : null;

  useEffect(() => {
    if (status === 'AVAILABLE') {
      idlePing.start();
    } else {
      idlePing.stop();
    }
  }, [status, idlePing]);

  useEffect(() => {
    return () => idlePing.stop();
  }, [idlePing]);
}

/** Reads the shared idle-ping health (permission/staleness) from any screen,
 * without needing its own instance or context provider. */
export function useDriverIdlePingHealth(): IdlePingHealth {
  const [health, setHealth] = useState<IdlePingHealth>(() => sharedIdlePing?.getHealth() ?? 'idle');

  useEffect(() => {
    let sub: { unsubscribe: () => void } | null = null;
    const attach = (instance: DriverIdleLocationPing) => {
      sub?.unsubscribe();
      sub = instance.observeHealth(setHealth);
    };

    if (sharedIdlePing) {
      attach(sharedIdlePing);
    }
    pingListeners.add(attach);

    return () => {
      pingListeners.delete(attach);
      sub?.unsubscribe();
    };
  }, []);

  return health;
}
