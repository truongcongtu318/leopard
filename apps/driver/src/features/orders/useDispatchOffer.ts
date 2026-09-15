import { useEffect, useMemo, useState } from 'react';

import { createDispatchOfferListener } from './dispatch-offer-listener';
import { useDriverDispatch } from './DriverDispatchContext';
import type { IncomingDispatchOffer } from './IncomingDispatchModal';

export type UseDispatchOfferResult = Readonly<{
  offer: IncomingDispatchOffer | null;
  declineOffer: () => void;
}>;

/**
 * Accesses incoming dispatch offers. Backed by global DriverDispatchContext when mounted
 * inside the root provider, or falls back to a screen-scoped listener if standalone.
 */
export function useDispatchOffer(): UseDispatchOfferResult {
  const globalDispatch = useDriverDispatch();
  const [localOffer, setLocalOffer] = useState<IncomingDispatchOffer | null>(null);

  const listener = useMemo(
    () => (globalDispatch ? null : createDispatchOfferListener({ onOffer: setLocalOffer })),
    [globalDispatch],
  );

  useEffect(() => {
    if (!listener) return;
    listener.connect();
    return () => listener.disconnect();
  }, [listener]);

  if (globalDispatch) {
    return {
      offer: globalDispatch.offer,
      declineOffer: globalDispatch.declineOffer,
    };
  }

  return {
    offer: localOffer,
    declineOffer: () => setLocalOffer(null),
  };
}
