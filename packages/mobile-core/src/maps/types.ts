export type MapCoordinate = {
  lat: number;
  lng: number;
};

export type MapStop = {
  id: string;
  label: string;
  coords?: MapCoordinate;
  progress?: 'PENDING' | 'ARRIVED' | 'IN_SERVICE' | 'COMPLETED';
  sequence?: number;
};

export type RoutePolylineSegment = Readonly<{
  coords: readonly MapCoordinate[];
  kind: 'completed' | 'active' | 'pending';
}>;

export type LeopardMapMode = 'route' | 'tracking' | 'location' | 'pin' | 'preview';

export type RouteResolutionPolicy = 'PROVIDED_ONLY' | 'ALLOW_CLIENT_PREVIEW';

export type NearbyDriver = Readonly<{
  id: string;
  lat: number;
  lng: number;
  vehicleType?: string;
  distanceM?: number;
  licensePlate?: string;
}>;

export interface LeopardMapViewProps {
  mode?: LeopardMapMode;
  origin?: { label: string; coords?: MapCoordinate };
  destination?: { label: string; coords?: MapCoordinate };
  stops?: readonly MapStop[];
  truckLocation?: MapCoordinate;
  truckEtaMinutes?: number;
  truckEtaLabel?: string;
  initialPinCoords?: MapCoordinate;
  onLocationChange?: (coords: MapCoordinate) => void;
  height?: number | string;
  testID?: string;
  style?: any;
  interactive?: boolean;
  title?: string;
  vietmapApiKey?: string;
  routeResolutionPolicy?: RouteResolutionPolicy;
  routeCoords?: readonly MapCoordinate[];
  routeSegments?: readonly RoutePolylineSegment[];
  nearbyDrivers?: readonly NearbyDriver[];
  zoom?: number;
  bearing?: number;
  pitch?: number;
  /**
   * Turn-by-turn driving mode: the camera locks onto `truckLocation` (3D pitch)
   * instead of fitting the whole route into view.
   */
  followTruckLocation?: boolean;
}

export interface VietmapNavigationProps {
  origin: { label: string; coords: MapCoordinate };
  destination: { label: string; coords: MapCoordinate };
  stops?: readonly MapStop[];
  routeCoords?: readonly MapCoordinate[];
  vietmapApiKey?: string;
  vehicleType?: 'car' | 'truck' | 'bike';
  isSimulating?: boolean;
  speechVoiceLanguage?: 'vi-VN' | 'en-US';
  onNavigationFinished?: () => void;
  onReroute?: () => void;
  onLocationUpdate?: (location: MapCoordinate & { heading?: number; speed?: number }) => void;
  onMuteToggle?: (muted: boolean) => void;
  onClose?: () => void;
  testID?: string;
  style?: any;
}
