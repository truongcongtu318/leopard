import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';
import type { PropsWithChildren } from 'react';
import { usePathname, useRouter } from 'expo-router';

import type { DriverAvailabilityView } from '../orders/model';
import { createDriverHttpAdapter } from '../orders/adapter';
import { DriverSidebarDrawer } from './DriverSidebarDrawer';

export interface DriverDrawerContextValue {
  isOpen: boolean;
  openDrawer: () => void;
  closeDrawer: () => void;
  toggleDrawer: () => void;
  availability: DriverAvailabilityView;
  setAvailability: (commandId: string) => Promise<void>;
}

const DEFAULT_AVAILABILITY: DriverAvailabilityView = {
  status: 'AVAILABLE',
  action: {
    id: 'set-availability-offline',
    label: 'Tạm nghỉ nhận chuyến',
    target: 'OFFLINE',
  },
  error: null,
};

const DriverDrawerContext = createContext<DriverDrawerContextValue | null>(null);

export function useDriverDrawer(): DriverDrawerContextValue {
  const ctx = useContext(DriverDrawerContext);
  if (!ctx) {
    // Graceful fallback for isolated testing
    return {
      isOpen: false,
      openDrawer: () => {},
      closeDrawer: () => {},
      toggleDrawer: () => {},
      availability: DEFAULT_AVAILABILITY,
      setAvailability: async () => {},
    };
  }
  return ctx;
}

export function DriverDrawerProvider({
  children,
  initialAvailability = DEFAULT_AVAILABILITY,
}: PropsWithChildren<{ initialAvailability?: DriverAvailabilityView }>) {
  const [isOpen, setIsOpen] = useState(false);
  const [availability, setAvailabilityState] = useState<DriverAvailabilityView>(initialAvailability);
  const router = useRouter();

  const openDrawer = useCallback(() => setIsOpen(true), []);
  const closeDrawer = useCallback(() => setIsOpen(false), []);
  const toggleDrawer = useCallback(() => setIsOpen((prev) => !prev), []);

  const setAvailability = useCallback(async (commandId: string) => {
    try {
      const adapter = createDriverHttpAdapter();
      const updated = await adapter.setAvailability(commandId);
      setAvailabilityState(updated);
    } catch {
      // Keep optimistic or local state
    }
  }, []);

  const pathname = usePathname();

  const handleNavigate = useCallback(
    (route: string) => {
      closeDrawer();
      router.push(route);
    },
    [closeDrawer, router],
  );

  const value = useMemo(
    () => ({
      isOpen,
      openDrawer,
      closeDrawer,
      toggleDrawer,
      availability,
      setAvailability,
    }),
    [isOpen, openDrawer, closeDrawer, toggleDrawer, availability, setAvailability],
  );

  return (
    <DriverDrawerContext.Provider value={value}>
      {children}
      <DriverSidebarDrawer
        activeRoute={pathname || '/driver/orders'}
        availability={availability}
        isOpen={isOpen}
        onClose={closeDrawer}
        onNavigate={handleNavigate}
        onSetAvailability={setAvailability}
      />
    </DriverDrawerContext.Provider>
  );
}
