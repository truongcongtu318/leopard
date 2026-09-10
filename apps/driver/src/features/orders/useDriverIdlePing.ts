import { useQuery } from '@tanstack/react-query';
import { useEffect, useMemo } from 'react';

import { createDriverHttpAdapter } from './adapter';
import { createDriverIdleLocationPing } from './idle-location-ping';

/**
 * Starts/stops the driver's idle location ping based on their AVAILABLE status.
 * Mount once at the driver root layout so it survives navigation between
 * driver screens (orders, earnings, history, profile) — see Dispatch Radar
 * Phase 1 plan, Phần B.
 */
export function useDriverIdlePing(enabled: boolean): void {
  const port = useMemo(() => createDriverHttpAdapter(), []);
  const idlePing = useMemo(() => createDriverIdleLocationPing(), []);

  const query = useQuery({
    queryKey: ['driver', 'orders'],
    queryFn: () => port.getOrdersView(),
    enabled,
  });

  const status = query.data?.kind === 'content' ? query.data.availability.status : null;

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
