import { useEffect, useMemo, useState } from 'react';

import { createDispatchOfferListener } from './dispatch-offer-listener';
import type { IncomingDispatchOffer } from './IncomingDispatchModal';

export type UseDispatchOfferResult = Readonly<{
  offer: IncomingDispatchOffer | null;
  declineOffer: () => void;
}>;

/**
 * Connects to the dispatch socket while mounted and surfaces the latest
 * incoming offer for IncomingDispatchModal. See Dispatch Radar Phase 2 plan —
 * intentionally screen-scoped (only listens while the Orders tab is mounted),
 * not a global layout-level overlay.
 */
export function useDispatchOffer(): UseDispatchOfferResult {
  const [offer, setOffer] = useState<IncomingDispatchOffer | null>(null);
  const listener = useMemo(
    () => createDispatchOfferListener({ onOffer: setOffer }),
    [],
  );

  useEffect(() => {
    listener.connect();
    return () => listener.disconnect();
  }, [listener]);

  return {
    offer,
    declineOffer: () => setOffer(null),
  };
}
