import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type PropsWithChildren,
} from 'react';
import type {
  MapCoordinate,
  MapStop,
  RoutePolylineSegment,
  ViewportInsets,
} from '@leopard/mobile-core';

export type DriverMapCameraMode =
  | 'idle'
  | 'tracking'
  | 'turn-by-turn'
  | 'overview'
  | 'location'
  | 'hidden';

export type DriverMapDirectorConfig = Readonly<{
  mode?: DriverMapCameraMode;
  origin?: { label: string; coords?: MapCoordinate };
  destination?: { label: string; coords?: MapCoordinate };
  stops?: readonly MapStop[];
  truckLocation?: MapCoordinate;
  truckEtaLabel?: string;
  routeCoords?: readonly MapCoordinate[];
  routeSegments?: readonly RoutePolylineSegment[];
  viewportInsets?: ViewportInsets;
  interactive?: boolean;
  followTruckLocation?: boolean;
  pitch?: number;
  zoom?: number;
  bearing?: number;
  priority?: number;
  isPickupLeg?: boolean;
  vehicleType?: string;
  isSimulating?: boolean;
}>;

type DirectorEntry = {
  id: string;
  priority: number;
  config: DriverMapDirectorConfig;
};

export type DriverMapDispatchContextValue = Readonly<{
  registerDirector: (id: string, config: DriverMapDirectorConfig, priority?: number) => void;
  unregisterDirector: (id: string) => void;
  triggerRecenter: () => void;
}>;

export type DriverMapStateContextValue = Readonly<{
  activeConfig: DriverMapDirectorConfig | null;
  recenterNonce: number;
}>;

export const DriverMapDispatchContext = createContext<DriverMapDispatchContextValue | null>(null);
export const DriverMapStateContext = createContext<DriverMapStateContextValue>({
  activeConfig: null,
  recenterNonce: 0,
});

export function useDriverMapState(): DriverMapStateContextValue {
  return useContext(DriverMapStateContext);
}

export function useDriverMapDispatch(): DriverMapDispatchContextValue | null {
  const ctx = useContext(DriverMapDispatchContext);
  return ctx;
}

export function useDriverMapDirectorContext(): DriverMapDispatchContextValue {
  const ctx = useContext(DriverMapDispatchContext);
  if (!ctx) {
    throw new Error('useDriverMapDirectorContext must be used within a DriverMapDirectorProvider');
  }
  return ctx;
}

function isShallowEqualConfig(
  a: DriverMapDirectorConfig | null,
  b: DriverMapDirectorConfig | null,
): boolean {
  if (a === b) return true;
  if (!a || !b) return false;
  return (
    a.mode === b.mode &&
    a.zoom === b.zoom &&
    a.pitch === b.pitch &&
    a.bearing === b.bearing &&
    a.followTruckLocation === b.followTruckLocation &&
    a.truckEtaLabel === b.truckEtaLabel &&
    a.truckLocation?.lat === b.truckLocation?.lat &&
    a.truckLocation?.lng === b.truckLocation?.lng &&
    a.origin?.coords?.lat === b.origin?.coords?.lat &&
    a.origin?.coords?.lng === b.origin?.coords?.lng &&
    a.destination?.coords?.lat === b.destination?.coords?.lat &&
    a.destination?.coords?.lng === b.destination?.coords?.lng &&
    a.stops?.length === b.stops?.length &&
    a.viewportInsets?.bottom === b.viewportInsets?.bottom &&
    a.interactive === b.interactive &&
    a.vehicleType === b.vehicleType &&
    a.isSimulating === b.isSimulating
  );
}

export function DriverMapDirectorProvider({ children }: PropsWithChildren) {
  const directorsRef = useRef<Map<string, DirectorEntry>>(new Map());
  const [activeConfig, setActiveConfig] = useState<DriverMapDirectorConfig | null>(null);
  const [recenterNonce, setRecenterNonce] = useState(0);

  const syncActiveConfig = useCallback(() => {
    const list = Array.from(directorsRef.current.values()).sort(
      (a, b) => b.priority - a.priority,
    );
    const nextConfig = list.length > 0 ? list[0].config : null;
    setActiveConfig((prev) => {
      if (isShallowEqualConfig(prev, nextConfig)) return prev;
      return nextConfig;
    });
  }, []);

  const registerDirector = useCallback(
    (id: string, config: DriverMapDirectorConfig, priority = 0) => {
      directorsRef.current.set(id, { id, priority, config });
      syncActiveConfig();
    },
    [syncActiveConfig],
  );

  const unregisterDirector = useCallback(
    (id: string) => {
      if (directorsRef.current.delete(id)) {
        syncActiveConfig();
      }
    },
    [syncActiveConfig],
  );

  const triggerRecenter = useCallback(() => {
    setRecenterNonce((n) => n + 1);
  }, []);

  const dispatchValue = useMemo<DriverMapDispatchContextValue>(
    () => ({
      registerDirector,
      unregisterDirector,
      triggerRecenter,
    }),
    [registerDirector, unregisterDirector, triggerRecenter],
  );

  const stateValue = useMemo<DriverMapStateContextValue>(
    () => ({
      activeConfig,
      recenterNonce,
    }),
    [activeConfig, recenterNonce],
  );

  return (
    <DriverMapDispatchContext.Provider value={dispatchValue}>
      <DriverMapStateContext.Provider value={stateValue}>
        {children}
      </DriverMapStateContext.Provider>
    </DriverMapDispatchContext.Provider>
  );
}

/**
 * Hook for screen components to command the persistent root map.
 * Consumers of this hook ONLY read dispatch, preventing any re-render
 * loops when activeConfig changes.
 */
export function useDriverMapDirector(
  config: DriverMapDirectorConfig | null,
  priority = 0,
) {
  const dispatch = useContext(DriverMapDispatchContext);
  const id = useId();

  useEffect(() => {
    if (!dispatch) return;
    if (config) {
      dispatch.registerDirector(id, config, priority);
    } else {
      dispatch.unregisterDirector(id);
    }

    return () => {
      dispatch.unregisterDirector(id);
    };
  }, [
    config?.mode,
    config?.zoom,
    config?.pitch,
    config?.bearing,
    config?.followTruckLocation,
    config?.truckEtaLabel,
    config?.origin?.coords?.lat,
    config?.origin?.coords?.lng,
    config?.destination?.coords?.lat,
    config?.destination?.coords?.lng,
    config?.truckLocation?.lat,
    config?.truckLocation?.lng,
    config?.stops?.length,
    config?.viewportInsets?.bottom,
    dispatch,
    id,
    priority,
  ]);
}
