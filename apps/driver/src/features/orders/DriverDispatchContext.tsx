import { useQueryClient } from '@tanstack/react-query';
import { usePathname, useRouter } from 'expo-router';
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type PropsWithChildren,
} from 'react';
import { Alert, Vibration } from 'react-native';

import { haptic, sessionStore } from '@leopard/mobile-core';
import { createDriverHttpAdapter } from './adapter';
import { createDispatchOfferListener, type DispatchOfferListener } from './dispatch-offer-listener';
import { IncomingDispatchModal, type IncomingDispatchOffer } from './IncomingDispatchModal';
import type { DriverOrdersPort } from './port';

export type DriverDispatchContextValue = Readonly<{
  offer: IncomingDispatchOffer | null;
  isAccepting: boolean;
  acceptOffer: (orderId: string) => Promise<void>;
  declineOffer: (orderId?: string) => void;
  setOffer: (offer: IncomingDispatchOffer | null) => void;
}>;

export const DriverDispatchContext = createContext<DriverDispatchContextValue | null>(null);

export function useDriverDispatch(): DriverDispatchContextValue | null {
  return useContext(DriverDispatchContext);
}

function isOrdersScreenPath(pathname: string | null | undefined): boolean {
  if (!pathname) return false;
  const normalized = pathname.trim().replace(/\/+$/, '');
  return normalized === '' || normalized === '/orders';
}

function safeUsePathname(): string | null {
  try {
    return usePathname?.() ?? null;
  } catch {
    return null;
  }
}

function safeUseRouter(): { push: (route: any) => void } {
  try {
    const r = useRouter?.();
    if (r && typeof r.push === 'function') return r;
    return { push: () => {} };
  } catch {
    return { push: () => {} };
  }
}

export type DriverDispatchProviderProps = PropsWithChildren<{
  adapter?: DriverOrdersPort;
  listenerFactory?: (options: { onOffer: (offer: IncomingDispatchOffer) => void }) => DispatchOfferListener;
  enabled?: boolean;
}>;

export function DriverDispatchProvider({
  adapter,
  children,
  enabled,
  listenerFactory,
}: DriverDispatchProviderProps) {
  const [offer, setOffer] = useState<IncomingDispatchOffer | null>(null);
  const [isAccepting, setIsAccepting] = useState(false);
  const [isAuthenticatedDriver, setIsAuthenticatedDriver] = useState(
    () => sessionStore.isAuthenticated() && sessionStore.getRole() === 'DRIVER',
  );

  const isDispatchActive = enabled !== undefined ? enabled : isAuthenticatedDriver;

  const isMountedRef = useRef(true);
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const queryClient = useQueryClient();
  const router = safeUseRouter();
  const pathname = safeUsePathname();
  const port = useMemo(() => adapter ?? createDriverHttpAdapter(), [adapter]);

  useEffect(() => {
    return sessionStore.subscribe((state) => {
      if (isMountedRef.current) {
        setIsAuthenticatedDriver(state.authenticated && state.role === 'DRIVER');
      }
    });
  }, []);

  const onOfferRef = useRef<(offer: IncomingDispatchOffer) => void>(() => {});
  onOfferRef.current = (incoming: IncomingDispatchOffer) => {
    try {
      haptic.warning();
      Vibration.vibrate([0, 200, 100, 200]);
    } catch {
      // Safe fallback on platforms without Taptic Engine / vibration
    }
    if (isMountedRef.current) {
      setOffer(incoming);
    }
  };

  const listener = useMemo(() => {
    const factory = listenerFactory ?? createDispatchOfferListener;
    return factory({ onOffer: (o) => onOfferRef.current(o) });
  }, [listenerFactory]);

  // Connect/disconnect dispatch listener on lifecycle transitions
  useEffect(() => {
    if (isDispatchActive) {
      listener.connect();
    } else {
      listener.disconnect();
      setOffer(null);
    }
    return () => {
      listener.disconnect();
    };
  }, [isDispatchActive, listener]);

  const declineOffer = useCallback((_orderId?: string) => {
    if (isMountedRef.current) {
      setOffer(null);
    }
  }, []);

  const acceptOffer = useCallback(
    async (orderId: string) => {
      setIsAccepting(true);
      try {
        const result = await port.acceptOrder(orderId);
        if (isMountedRef.current) {
          setOffer(null);
        }
        void queryClient.invalidateQueries({ queryKey: ['driver', 'orders'] });
        if (result.kind === 'content') {
          haptic.success();
          router.push(`/orders/${orderId}` as any);
        } else if (result.kind === 'conflict') {
          haptic.warning();
          Alert.alert(result.title, result.message);
        }
      } catch (err: any) {
        haptic.warning();
        Alert.alert('Không thể nhận đơn', err?.message || 'Đã có lỗi xảy ra khi tiếp nhận đơn hàng.');
      } finally {
        if (isMountedRef.current) {
          setIsAccepting(false);
        }
      }
    },
    [port, queryClient, router],
  );

  // Stable handlers for IncomingDispatchModal to prevent re-render cascades
  const handleModalAccept = useCallback(
    (orderId: string) => {
      void acceptOffer(orderId);
    },
    [acceptOffer],
  );

  const handleModalDecline = useCallback(
    (orderId: string) => {
      declineOffer(orderId);
    },
    [declineOffer],
  );

  const contextValue = useMemo<DriverDispatchContextValue>(
    () => ({
      offer,
      isAccepting,
      acceptOffer,
      declineOffer,
      setOffer,
    }),
    [offer, isAccepting, acceptOffer, declineOffer],
  );

  // Suppress global modal on screens that already render their own (such as /orders)
  const shouldRenderGlobalModal = Boolean(offer) && !isOrdersScreenPath(pathname);

  // ponytail: Global overlay presentation handles cross-screen notifications; upgrade to native sheet route when navigation stack standardizes deep link triggers.
  return (
    <DriverDispatchContext.Provider value={contextValue}>
      {children}
      <IncomingDispatchModal
        isAccepting={isAccepting}
        offer={offer}
        onAccept={handleModalAccept}
        onDecline={handleModalDecline}
        visible={shouldRenderGlobalModal}
      />
    </DriverDispatchContext.Provider>
  );
}
