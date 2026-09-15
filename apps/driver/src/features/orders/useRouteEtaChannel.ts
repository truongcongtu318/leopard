import { useEffect, useMemo, useRef } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import type { OrderStatus, RouteEtaResponse } from '@leopard/shared';

export function isRouteEtaSubscribeEligibleStatus(status?: OrderStatus | string | null): boolean {
  return status === 'ACCEPTED' || status === 'PICKING_UP' || status === 'IN_TRANSIT';
}

import type { DriverOrdersPort } from './port';
import type { DriverTrackingSender } from './tracking-sender';
import type { DriverRouteEtaView } from './model';
import {
  createInitialRouteEtaChannelState,
  mapRouteEtaResponseToView,
  reduceRouteEtaByRevision,
  type RouteEtaChannelState,
} from './route-eta-adapter';

export type RouteEtaChannelResult =
  | { readonly kind: 'disabled' }
  | { readonly kind: 'initial-loading' }
  | { readonly kind: 'error'; readonly error: unknown; readonly retry: () => void }
  | {
      readonly kind: 'content';
      readonly data: RouteEtaResponse;
      readonly view: DriverRouteEtaView;
      readonly isRefreshing: boolean;
      readonly isOffline: boolean;
    };

export interface UseRouteEtaChannelOptions {
  orderId: string;
  status: OrderStatus | null | undefined;
  port: DriverOrdersPort;
  sender?: DriverTrackingSender | null;
}

export function useRouteEtaChannel({
  orderId,
  status,
  port,
  sender,
}: UseRouteEtaChannelOptions): RouteEtaChannelResult {
  const queryClient = useQueryClient();
  const routeEtaQueryKey = useMemo(
    () => ['driver', 'order', orderId, 'route-eta'],
    [orderId],
  );

  const isEligible = Boolean(
    orderId && status && isRouteEtaSubscribeEligibleStatus(status),
  );

  // TanStack Query is the single source of truth
  const query = useQuery({
    queryKey: routeEtaQueryKey,
    queryFn: async () => {
      if (!port.getRouteEta) {
        throw new Error('port.getRouteEta is not implemented');
      }
      const response = await port.getRouteEta(orderId);
      const current =
        queryClient.getQueryData<RouteEtaChannelState>(routeEtaQueryKey);
      const base = current ?? createInitialRouteEtaChannelState(orderId);
      return reduceRouteEtaByRevision(base, {
        kind: 'REST_RESPONSE',
        response,
      });
    },
    enabled: isEligible && Boolean(port.getRouteEta),
    staleTime: 15_000,
  });

  const reconcileRest = useRef(async () => {
    if (!port.getRouteEta || !orderId) return;
    try {
      const response = await port.getRouteEta(orderId);
      queryClient.setQueryData<RouteEtaChannelState>(
        routeEtaQueryKey,
        (current) => {
          const base = current ?? createInitialRouteEtaChannelState(orderId);
          return reduceRouteEtaByRevision(base, {
            kind: 'REST_RESPONSE',
            response,
          });
        },
      );
    } catch {
      // Reconcile network failures remain non-fatal; existing state is preserved
    }
  });
  reconcileRest.current = async () => {
    if (!port.getRouteEta || !orderId) return;
    try {
      const response = await port.getRouteEta(orderId);
      queryClient.setQueryData<RouteEtaChannelState>(
        routeEtaQueryKey,
        (current) => {
          const base = current ?? createInitialRouteEtaChannelState(orderId);
          return reduceRouteEtaByRevision(base, {
            kind: 'REST_RESPONSE',
            response,
          });
        },
      );
    } catch {
      // Reconcile failures don't drop existing cache
    }
  };

  // Socket room subscription and real-time events
  useEffect(() => {
    if (!isEligible || !sender || typeof sender.subscribeRouteEta !== 'function') {
      return undefined;
    }

    const subscription = sender.subscribeRouteEta(orderId, {
      onJoinedAck: () => {
        // Reconcile via REST after join ack or reconnect
        void reconcileRest.current();
      },
      onRouteEtaUpdated: (event) => {
        queryClient.setQueryData<RouteEtaChannelState>(
          routeEtaQueryKey,
          (current) => {
            const base = current ?? createInitialRouteEtaChannelState(orderId);
            return reduceRouteEtaByRevision(base, {
              kind: 'SOCKET_ROUTE_ETA_UPDATED',
              eventId: event.eventId,
              orderId: event.orderId,
              payload: event,
            });
          },
        );
      },
      onRouteUpdated: (_event) => {
        // Full route changed: trigger REST reconciliation for geometry/legs
        void reconcileRest.current();
      },
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [isEligible, orderId, queryClient, routeEtaQueryKey, sender]);

  // Discriminated state output
  if (!isEligible) {
    return { kind: 'disabled' };
  }

  const state = query.data;
  if (query.isLoading && !state?.response) {
    return { kind: 'initial-loading' };
  }

  if (query.isError && !state?.response) {
    return {
      kind: 'error',
      error: query.error,
      retry: () => void query.refetch(),
    };
  }

  if (state?.response) {
    return {
      kind: 'content',
      data: state.response,
      view: mapRouteEtaResponseToView(state.response),
      isRefreshing: query.isFetching,
      isOffline: query.isError,
    };
  }

  return { kind: 'initial-loading' };
}
