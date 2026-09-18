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
  minZoom?: number;
  maxZoom?: number;
  maxBounds?: [[number, number], [number, number]];
  bearing?: number;
  pitch?: number;
  truckHeading?: number;
  /**
   * Turn-by-turn driving mode: the camera locks onto `truckLocation` (3D pitch)
   * instead of fitting the whole route into view.
   */
  followTruckLocation?: boolean;
  /**
   * True if approaching pickup point, false if in-transit to delivery/stops.
   */
  isPickupLeg?: boolean;
  /**
   * Increment this value to imperatively trigger a map recenter animation
   * back to the truck/vehicle location. Works on both web (postMessage) and native (Camera ref).
   */
  recenterNonce?: number;
}

export interface VietmapNavigationProps {
  origin: { label: string; coords: MapCoordinate };
  destination: { label: string; coords: MapCoordinate };
  stops?: readonly MapStop[];
  routeCoords?: readonly MapCoordinate[];
  vietmapApiKey?: string;
  vehicleType?: 'car' | 'truck' | 'bike' | string;
  truckLocation?: MapCoordinate;
  isSimulating?: boolean;
  speechVoiceLanguage?: 'vi-VN' | 'en-US';
  speedAlertEnabled?: boolean;
  apiKeyAlert?: string;
  apiIDAlert?: string;
  navigationZoomLevel?: number;
  navigationTiltAnchor?: number;
  onNavigationFinished?: () => void;
  onReroute?: () => void;
  onLocationUpdate?: (location: MapCoordinate & { heading?: number; speed?: number }) => void;
  onRouteProgress?: (data: {
    distanceRemaining?: number;
    durationRemaining?: number;
    distanceToNextTurn?: number;
    currentStepInstruction?: string;
    currentModifier?: string;
    currentModifierType?: string;
  }) => void;
  onMilestoneEvent?: (event?: any) => void;
  onWaypointArrival?: (event?: any) => void;
  onMuteToggle?: (muted: boolean) => void;
  onClose?: () => void;
  testID?: string;
  style?: any;
}
