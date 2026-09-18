import React, { useState } from 'react';
import { Alert, Linking, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { DriverMapDispatchContext, useDriverMapDirector } from '../../../../navigation/DriverMapDirectorContext';
import {
  IconClock,
  IconLocationPin,
  IconRoute,
  LeopardMapView,
  VietmapNavigationView,
  colors,
  leopardPalette,
  radius,
  typeScale,
  fetchStreetRoute,
  haversineDistanceMeters,
  type MapCoordinate,
  type RoutePolylineSegment,
  type ManeuverStep,
  type StreetRouteResult,
} from '@leopard/mobile-core';
import type { RouteCoordinate, VehicleType } from '@leopard/shared';
import type {
  DriverRouteEtaView,
  DriverRouteStopView,
  DriverTrackingView,
} from '../../model';

export type MissionMapCanvasProps = Readonly<{
  origin?: { label: string; coords?: MapCoordinate };
  destination?: { label: string; coords?: MapCoordinate };
  stops?: readonly DriverRouteStopView[];
  tracking: DriverTrackingView;
  distanceLabel?: string;
  etaLabel?: string;
  eta?: DriverRouteEtaView | null;
  routeCoords?: readonly RouteCoordinate[];
  routeSegments?: readonly RoutePolylineSegment[];
  vehicleType?: VehicleType | string | null;
  navigationTarget?: { lat?: number; lng?: number; label?: string } | null;
  onNavigationWarning?: (proceed: () => void) => void;
  fillContainer?: boolean;
  truckLocation?: MapCoordinate;
  /** Real device heading in degrees, when the GPS fix provides one. */
  truckHeading?: number | null;
  cargoSummary?: string | null;
  cargoWeightKg?: number | null;
  navMode?: 'overview' | 'turn-by-turn';
  testID?: string;
  originLabel?: string;
  destinationLabel?: string;
  isPickupLeg?: boolean;
}>;

function ManeuverIcon({ type, size = 26 }: { type?: string; size?: number }) {
  if (type === 'turn-left' || type === 'sharp-left') {
    return (
      <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <Path d="M9 4L4 9L9 14" stroke="#FFFFFF" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round" />
        <Path d="M4 9H14C17.3137 9 20 11.6863 20 15V20" stroke="#FFFFFF" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round" />
      </Svg>
    );
  }
  if (type === 'turn-right' || type === 'sharp-right') {
    return (
      <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <Path d="M15 4L20 9L15 14" stroke="#FFFFFF" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round" />
        <Path d="M20 9H10C6.68629 9 4 11.6863 4 15V20" stroke="#FFFFFF" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round" />
      </Svg>
    );
  }
  if (type === 'slight-left') {
    return (
      <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <Path d="M7 6L7 13L14 13" stroke="#FFFFFF" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round" />
        <Path d="M7 6L18 17" stroke="#FFFFFF" strokeWidth="2.8" strokeLinecap="round" />
      </Svg>
    );
  }
  if (type === 'slight-right') {
    return (
      <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <Path d="M17 6L17 13L10 13" stroke="#FFFFFF" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round" />
        <Path d="M17 6L6 17" stroke="#FFFFFF" strokeWidth="2.8" strokeLinecap="round" />
      </Svg>
    );
  }
  if (type === 'uturn') {
    return (
      <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <Path d="M7 10L4 7L7 4" stroke="#FFFFFF" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round" />
        <Path d="M4 7H14C17.3137 7 20 9.68629 20 13C20 16.3137 17.3137 19 14 19H8" stroke="#FFFFFF" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round" />
      </Svg>
    );
  }
  if (type === 'arrive') {
    return (
      <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <Path d="M4 15C4 15 5 14 8 14C11 14 13 16 16 16C19 16 20 15 20 15V3C20 3 19 4 16 4C13 4 11 2 8 2C5 2 4 3 4 3V22" stroke="#FFFFFF" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
      </Svg>
    );
  }
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M12 19V5M5 12L12 5L19 12" stroke="#FFFFFF" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

export type OpenExternalNavigationOptions = {
  origin?: { lat?: number; lng?: number; label?: string } | null;
  destination?: { lat?: number; lng?: number; label?: string } | null;
  target?: { lat?: number; lng?: number; label?: string } | string | null;
  truckLocation?: { lat: number; lng: number } | null;
  vehicleType?: VehicleType | string | null;
  onWarning?: (proceed: () => void) => void;
};

export function openExternalNavigation(
  optionsOrTarget:
    | OpenExternalNavigationOptions
    | { lat?: number; lng?: number; label?: string }
    | string,
): boolean {
  let origin: { lat?: number; lng?: number; label?: string } | null | undefined;
  let destination: { lat?: number; lng?: number; label?: string } | null | undefined;
  let target: { lat?: number; lng?: number; label?: string } | string | null | undefined;
  let truckLocation: { lat: number; lng: number } | null | undefined;
  let vehicleType: VehicleType | string | null | undefined;
  let onWarning: ((proceed: () => void) => void) | undefined;

  if (
    optionsOrTarget &&
    typeof optionsOrTarget === 'object' &&
    ('target' in optionsOrTarget ||
      'origin' in optionsOrTarget ||
      'destination' in optionsOrTarget ||
      'truckLocation' in optionsOrTarget ||
      'vehicleType' in optionsOrTarget)
  ) {
    const opts = optionsOrTarget as OpenExternalNavigationOptions;
    origin = opts.origin;
    destination = opts.destination;
    target = opts.target;
    truckLocation = opts.truckLocation;
    vehicleType = opts.vehicleType;
    onWarning = opts.onWarning;
  } else {
    target = optionsOrTarget as
      | { lat?: number; lng?: number; label?: string }
      | string;
  }

  // Resolve destination coordinates: prioritized from target (active leg destination), then destination prop
  let destLat: number | undefined;
  let destLng: number | undefined;

  const targetCandidate =
    typeof target === 'object' &&
    target !== null &&
    typeof target.lat === 'number' &&
    typeof target.lng === 'number' &&
    !isNaN(target.lat) &&
    !isNaN(target.lng)
      ? target
      : null;

  const destCandidate =
    destination &&
    typeof destination.lat === 'number' &&
    typeof destination.lng === 'number' &&
    !isNaN(destination.lat) &&
    !isNaN(destination.lng)
      ? destination
      : null;

  const candidateDest = targetCandidate || destCandidate;
  if (candidateDest) {
    destLat = candidateDest.lat;
    destLng = candidateDest.lng;
  }

  if (destLat == null || destLng == null) {
    Alert.alert(
      'Không có tọa độ dẫn đường',
      'Điểm đến chưa có tọa độ GPS hợp lệ để mở bản đồ dẫn đường.',
    );
    return false;
  }

  // Resolve origin coordinates: prioritized from truck GPS fix, then origin prop
  let originLat: number | undefined;
  let originLng: number | undefined;

  if (
    truckLocation &&
    typeof truckLocation.lat === 'number' &&
    typeof truckLocation.lng === 'number' &&
    !isNaN(truckLocation.lat) &&
    !isNaN(truckLocation.lng)
  ) {
    originLat = truckLocation.lat;
    originLng = truckLocation.lng;
  } else if (
    origin &&
    typeof origin.lat === 'number' &&
    typeof origin.lng === 'number' &&
    !isNaN(origin.lat) &&
    !isNaN(origin.lng)
  ) {
    originLat = origin.lat;
    originLng = origin.lng;
  }

  // Check whether origin is distinct from destination (to avoid navigating to the exact same point)
  const hasDistinctOrigin =
    originLat != null &&
    originLng != null &&
    (Math.abs(originLat - destLat) > 0.00001 || Math.abs(originLng - destLng) > 0.00001);

  const proceed = () => {
    let url = 'https://www.google.com/maps/dir/?api=1';
    if (hasDistinctOrigin) {
      url += `&origin=${encodeURIComponent(`${originLat},${originLng}`)}`;
    }
    url += `&destination=${encodeURIComponent(`${destLat},${destLng}`)}`;
    url += '&travelmode=driving&dir_action=navigate';
    void Linking.openURL(url).catch(() => {});
  };

  const isTruck =
    vehicleType === 'TRUCK' ||
    (typeof vehicleType === 'string' &&
      vehicleType.toUpperCase().startsWith('TRUCK'));

  if (isTruck) {
    if (onWarning) {
      onWarning(proceed);
    } else {
      Alert.alert(
        'Lưu ý điều hướng xe tải',
        'Google Maps có thể không bảo đảm giới hạn tải trọng và chiều cao xe tải tại Việt Nam. Vui lòng chú ý biển báo giao thông thực tế.',
        [
          { text: 'Hủy', style: 'cancel' },
          { text: 'Tiếp tục', onPress: proceed },
        ],
      );
    }
    return true;
  }

  proceed();
  return true;
}

export function MissionMapCanvas({
  origin,
  destination,
  stops = [],
  tracking,
  distanceLabel,
  etaLabel,
  eta,
  routeCoords,
  routeSegments,
  vehicleType,
  navigationTarget,
  onNavigationWarning,
  fillContainer = false,
  truckLocation,
  truckHeading,
  cargoSummary,
  cargoWeightKg,
  navMode = 'overview',
  testID = 'route-map-schematic',
  originLabel,
  destinationLabel,
  isPickupLeg = false,
}: MissionMapCanvasProps) {
  // Turn-by-turn mirrors how Google Maps behaves once navigation starts.
  const isTurnByTurn = navMode === 'turn-by-turn';

  const [streetRoute, setStreetRoute] = React.useState<StreetRouteResult | null>(null);
  const [isAudioMuted, setIsAudioMuted] = React.useState(false);

  const resolvedOrigin = origin ?? { label: originLabel ?? 'Điểm lấy hàng' };
  const resolvedDestination = destination ?? {
    label: destinationLabel ?? 'Điểm giao hàng',
  };

  const isTrackingStale =
    tracking.kind === 'stale' ||
    tracking.kind === 'offline' ||
    tracking.kind === 'reconnecting' ||
    tracking.kind === 'permission-denied';

  // Chuyến đã kết thúc: không còn vị trí xe để theo dõi. Ẩn mọi pill
  // trạng thái/đích đến, bản đồ chỉ còn tuyến đường tĩnh đã hoàn tất.

  const isEtaStale = eta?.outcome === 'STALE';
  const isStale = isTrackingStale || isEtaStale;

  // Active navigation target: prioritized from navigationTarget prop,
  // then first uncompleted stop, then destination.
  const resolvedTarget = React.useMemo(() => {
    if (isPickupLeg) {
      if (
        resolvedOrigin.coords &&
        typeof resolvedOrigin.coords.lat === 'number' &&
        typeof resolvedOrigin.coords.lng === 'number' &&
        !isNaN(resolvedOrigin.coords.lat) &&
        !isNaN(resolvedOrigin.coords.lng)
      ) {
        return {
          lat: resolvedOrigin.coords.lat,
          lng: resolvedOrigin.coords.lng,
          label: resolvedOrigin.label,
        };
      }
    }

    if (
      navigationTarget &&
      typeof navigationTarget.lat === 'number' &&
      typeof navigationTarget.lng === 'number' &&
      !isNaN(navigationTarget.lat) &&
      !isNaN(navigationTarget.lng)
    ) {
      return navigationTarget;
    }

    const nextStop = stops.find((s) => s.progress !== 'COMPLETED');
    if (
      nextStop &&
      typeof nextStop.lat === 'number' &&
      typeof nextStop.lng === 'number' &&
      !isNaN(nextStop.lat) &&
      !isNaN(nextStop.lng)
    ) {
      return {
        lat: nextStop.lat,
        lng: nextStop.lng,
        label: nextStop.label || nextStop.address,
      };
    }

    if (
      resolvedDestination.coords &&
      typeof resolvedDestination.coords.lat === 'number' &&
      typeof resolvedDestination.coords.lng === 'number' &&
      !isNaN(resolvedDestination.coords.lat) &&
      !isNaN(resolvedDestination.coords.lng)
    ) {
      return {
        lat: resolvedDestination.coords.lat,
        lng: resolvedDestination.coords.lng,
        label: resolvedDestination.label,
      };
    }

    return null;
  }, [isPickupLeg, navigationTarget, stops, resolvedDestination, resolvedOrigin]);

  const hasValidNavigationTarget = Boolean(
    resolvedTarget &&
      typeof resolvedTarget.lat === 'number' &&
      typeof resolvedTarget.lng === 'number' &&
      !isNaN(resolvedTarget.lat) &&
      !isNaN(resolvedTarget.lng),
  );

  // Map stops for LeopardMapView with progress and sequence
  const mapStops = React.useMemo(
    () =>
      stops.map((s, idx) => ({
        id: s.id || s.stopId,
        label: s.label || s.address,
        coords:
          typeof s.lat === 'number' && typeof s.lng === 'number'
            ? { lat: s.lat, lng: s.lng }
            : undefined,
        progress: s.progress,
        sequence: s.sequence ?? idx + 1,
      })),
    [stops],
  );

  // Resolved geometry
  const effectiveRouteSegments = isPickupLeg ? undefined : (eta?.polylineSegments ?? routeSegments);
  const etaRouteCoords = eta?.polylineCoords && eta.polylineCoords.length >= 2
    ? eta.polylineCoords
    : routeCoords && routeCoords.length >= 2
    ? routeCoords
    : [];

  React.useEffect(() => {
    let isMounted = true;
    const from = truckLocation ?? resolvedOrigin.coords;

    const isTruckAtPickup =
      isPickupLeg &&
      resolvedOrigin.coords &&
      Boolean(
        !truckLocation ||
        (Math.abs(truckLocation.lat - resolvedOrigin.coords.lat) < 0.0006 &&
         Math.abs(truckLocation.lng - resolvedOrigin.coords.lng) < 0.0006)
      );

    const rawTo = isPickupLeg
      ? (isTruckAtPickup
          ? (resolvedDestination.coords ?? resolvedOrigin.coords)
          : (resolvedOrigin.coords ?? resolvedDestination.coords))
      : (resolvedTarget && typeof resolvedTarget.lat === 'number' && typeof resolvedTarget.lng === 'number'
          ? { lat: resolvedTarget.lat, lng: resolvedTarget.lng }
          : resolvedDestination.coords);

    if (
      !from ||
      !rawTo ||
      typeof from.lat !== 'number' ||
      typeof from.lng !== 'number' ||
      typeof rawTo.lat !== 'number' ||
      typeof rawTo.lng !== 'number'
    ) {
      setStreetRoute(null);
      return;
    }

    const to: MapCoordinate = { lat: rawTo.lat, lng: rawTo.lng };
    void fetchStreetRoute(from, to, {
      vietmapApiKey: process.env.EXPO_PUBLIC_VIETMAP_API_KEY,
      vehicle: 'truck',
    }).then((res) => {
      if (!isMounted) return;
      if (res && res.coordinates.length >= 2) {
        setStreetRoute(res);
      }
    });

    return () => {
      isMounted = false;
    };
  }, [
    isPickupLeg,
    truckLocation?.lat,
    truckLocation?.lng,
    resolvedOrigin.coords?.lat,
    resolvedOrigin.coords?.lng,
    resolvedTarget?.lat,
    resolvedTarget?.lng,
    resolvedDestination.coords?.lat,
    resolvedDestination.coords?.lng,
  ]);

  const fallbackRouteCoords = React.useMemo(() => {
    if (isPickupLeg) {
      if (truckLocation && resolvedOrigin.coords && resolvedDestination.coords) {
        const isNearPickup =
          Math.abs(truckLocation.lat - resolvedOrigin.coords.lat) < 0.0006 &&
          Math.abs(truckLocation.lng - resolvedOrigin.coords.lng) < 0.0006;
        if (isNearPickup) {
          return [resolvedOrigin.coords, resolvedDestination.coords];
        }
        return [truckLocation, resolvedOrigin.coords, resolvedDestination.coords];
      }
      if (truckLocation && resolvedOrigin.coords) {
        return [truckLocation, resolvedOrigin.coords];
      }
      if (resolvedOrigin.coords && resolvedDestination.coords) {
        return [resolvedOrigin.coords, resolvedDestination.coords];
      }
      return null;
    }
    if (etaRouteCoords.length >= 2) return null;
    if (resolvedOrigin.coords == null || resolvedDestination.coords == null) {
      return null;
    }
    return [resolvedOrigin.coords, resolvedDestination.coords];
  }, [isPickupLeg, truckLocation, etaRouteCoords, resolvedDestination.coords, resolvedOrigin.coords]);

  const effectiveRouteCoords = React.useMemo(() => {
    if (isPickupLeg) {
      if (streetRoute && streetRoute.coordinates.length >= 2) {
        const firstPt = streetRoute.coordinates[0];
        const lastPt = streetRoute.coordinates[streetRoute.coordinates.length - 1];
        const isTrivial =
          firstPt &&
          lastPt &&
          Math.abs(firstPt.lat - lastPt.lat) < 0.0002 &&
          Math.abs(firstPt.lng - lastPt.lng) < 0.0002;
        if (!isTrivial) {
          return streetRoute.coordinates;
        }
      }
      return fallbackRouteCoords ?? [];
    }
    if (streetRoute && streetRoute.coordinates.length >= 2) {
      return streetRoute.coordinates;
    }
    if (etaRouteCoords.length >= 2) {
      return etaRouteCoords;
    }
    return fallbackRouteCoords ?? [];
  }, [isPickupLeg, streetRoute, etaRouteCoords, fallbackRouteCoords]);

  const isRoutePreview = fallbackRouteCoords != null && etaRouteCoords.length < 2;

  // Bottom left ETA text formatting
  const etaText = React.useMemo(() => {
    if (
      eta?.outcome === 'NOT_COMPUTABLE' ||
      eta?.outcome === 'NOT_REQUESTED'
    ) {
      return 'Lộ trình không khả dụng';
    }

    if (
      eta?.recomputeStatus === 'PENDING' ||
      eta?.recomputeStatus === 'RECOMPUTING'
    ) {
      return 'Đang cập nhật ETA…';
    }

    if (eta?.recomputeStatus === 'FAILED') {
      return eta.estimateAgeLabel
        ? `Không thể tính lại lộ trình · Dự kiến cũ (${eta.estimateAgeLabel})`
        : 'Không thể tính lại lộ trình';
    }

    const distPart =
      distanceLabel ||
      (eta?.distanceMeters != null
        ? `${(eta.distanceMeters / 1000).toFixed(1).replace('.', ',')} km`
        : '');

    let durationPart = '';
    if (eta?.durationSeconds != null) {
      const minutes = Math.round(eta.durationSeconds / 60);
      durationPart = minutes > 0 ? `${minutes} phút` : 'Đã đến';
    } else if (etaLabel) {
      durationPart = etaLabel;
    }

    const mainEta = durationPart
      ? `ETA dự kiến · ${durationPart}`
      : 'ETA dự kiến';
    return distPart ? `${distPart} · ${mainEta}` : mainEta;
  }, [distanceLabel, eta, etaLabel]);

  const isDemo = eta?.source === 'DEMO' || isRoutePreview;
  const isTripEnded = tracking.kind === 'unavailable';
  const showLiveOverlays = !isTripEnded;

  // Only real cargo is worth a header line; an empty order shows nothing rather
  // than a placeholder that pushes the map down for no reason.
  const cargoLabel = React.useMemo(() => {
    const summary = cargoSummary?.trim();
    if (!summary) return null;
    const weight =
      typeof cargoWeightKg === 'number' && cargoWeightKg > 0
        ? ` · ${cargoWeightKg} kg`
        : '';
    return `${summary}${weight}`;
  }, [cargoSummary, cargoWeightKg]);

  // Heading for the 3D camera. The device's real heading wins; when the GPS fix
  // has none (standing still), fall back to the bearing towards the active
  // target so the camera still looks down the road ahead.
  const followBearing = React.useMemo(() => {
    if (!isTurnByTurn) return 0;
    if (typeof truckHeading === 'number' && truckHeading >= 0) return truckHeading;

    const from = truckLocation ?? resolvedOrigin.coords;
    const to =
      resolvedTarget && resolvedTarget.lat != null && resolvedTarget.lng != null
        ? { lat: resolvedTarget.lat, lng: resolvedTarget.lng }
        : resolvedDestination.coords;
    if (!from || !to) return 0;
    const toRad = (value: number) => (value * Math.PI) / 180;
    const y = Math.sin(toRad(to.lng - from.lng)) * Math.cos(toRad(to.lat));
    const x =
      Math.cos(toRad(from.lat)) * Math.sin(toRad(to.lat)) -
      Math.sin(toRad(from.lat)) * Math.cos(toRad(to.lat)) * Math.cos(toRad(to.lng - from.lng));
    return (Math.atan2(y, x) * 180) / Math.PI;
  }, [
    isTurnByTurn,
    resolvedDestination.coords,
    resolvedOrigin.coords,
    resolvedTarget,
    truckHeading,
    truckLocation,
  ]);

  const hasDirectorHost = Boolean(React.useContext(DriverMapDispatchContext));

  const nextStep = streetRoute?.steps && streetRoute.steps.length > 0 ? streetRoute.steps[0] : null;
  const nextStepDistText = nextStep
    ? nextStep.distanceMeters < 1000
      ? `Sau ${Math.round(nextStep.distanceMeters)}m`
      : `Sau ${(nextStep.distanceMeters / 1000).toFixed(1)} km`
    : isTurnByTurn
    ? 'Sau 200m'
    : '';
  const nextStepAction = nextStep?.instruction
    ? nextStep.instruction
    : resolvedTarget?.label
    ? `Tiếp tục đến ${resolvedTarget.label}`
    : 'Bám theo lộ trình';
  const maneuverType = nextStep?.maneuverType ?? 'straight';

  const liveDistanceKm = streetRoute
    ? `${(streetRoute.distanceMeters / 1000).toFixed(1).replace('.', ',')} km`
    : distanceLabel ?? (eta?.distanceMeters != null ? `${(eta.distanceMeters / 1000).toFixed(1).replace('.', ',')} km` : '');
  const liveDurationMin = streetRoute
    ? `${Math.round(streetRoute.durationSeconds / 60)} phút`
    : etaLabel ?? (eta?.durationSeconds != null ? `${Math.round(eta.durationSeconds / 60)} phút` : '');
  const tripMetricsText = liveDistanceKm && liveDurationMin ? `${liveDistanceKm} · ${liveDurationMin}` : liveDistanceKm || liveDurationMin;

  const [recenterNonce, setRecenterNonce] = useState(0);

  const directorConfig = React.useMemo(() => {
    if (isTripEnded) {
      return {
        mode: 'overview' as const,
        origin: resolvedOrigin,
        destination: resolvedDestination,
        stops: mapStops,
        routeCoords: effectiveRouteCoords,
        routeSegments: effectiveRouteSegments,
        interactive: false,
        isPickupLeg,
      };
    }

    return {
      mode: isTurnByTurn ? ('turn-by-turn' as const) : ('overview' as const),
      origin: resolvedOrigin,
      destination: resolvedDestination,
      stops: mapStops,
      truckLocation,
      bearing: Platform.OS === 'web' ? 0 : followBearing,
      pitch: isTurnByTurn ? 50 : 0,
      truckHeading: followBearing,
      zoom: isTurnByTurn ? 17 : 13.5,
      followTruckLocation: isTurnByTurn,
      routeCoords: effectiveRouteCoords,
      routeSegments: effectiveRouteSegments,
      viewportInsets: {
        bottom: 380,
      },
      interactive: true,
      isPickupLeg,
      vehicleType: (vehicleType as string) ?? 'truck',
    };
  }, [
    effectiveRouteCoords,
    effectiveRouteSegments,
    followBearing,
    isPickupLeg,
    isTripEnded,
    isTurnByTurn,
    mapStops,
    resolvedDestination,
    resolvedOrigin,
    truckLocation,
    vehicleType,
  ]);

  useDriverMapDirector(hasDirectorHost ? directorConfig : null, 10);

  return (
    <View
      pointerEvents={hasDirectorHost ? 'none' : 'auto'}
      style={[
        styles.mapCanvasContainer,
        fillContainer ? styles.mapCanvasContainerFill : null,
        hasDirectorHost ? styles.mapCanvasContainerTransparent : null,
      ]}
      testID={testID}
    >
      {/* Dual-resolution Vietmap Vector GL / Turn-by-Turn engine */}
      {!hasDirectorHost ? (
        Platform.OS !== 'web' &&
        showLiveOverlays &&
        isTurnByTurn &&
        resolvedOrigin.coords &&
        resolvedDestination.coords ? (
          <VietmapNavigationView
            destination={{
              label: resolvedDestination.label,
              coords: resolvedDestination.coords,
            }}
            origin={{
              label: resolvedOrigin.label,
              coords: resolvedOrigin.coords,
            }}
            routeCoords={effectiveRouteCoords}
            speedAlertEnabled={true}
            stops={mapStops}
            style={StyleSheet.absoluteFill}
            truckLocation={truckLocation}
            vehicleType={(vehicleType as string) ?? 'truck'}
          />
        ) : (
          <LeopardMapView
            bearing={Platform.OS === 'web' ? 0 : followBearing}
            destination={resolvedDestination}
            followTruckLocation={showLiveOverlays && isTurnByTurn}
            height="100%"
            interactive={!isTripEnded}
            isPickupLeg={isPickupLeg}
            mode={isTripEnded || !isTurnByTurn ? 'route' : 'tracking'}
            origin={resolvedOrigin}
            pitch={showLiveOverlays && isTurnByTurn ? 50 : 0}
            recenterNonce={recenterNonce}
            routeCoords={effectiveRouteCoords}
            routeResolutionPolicy="PROVIDED_ONLY"
            routeSegments={effectiveRouteSegments}
            stops={mapStops}
            truckEtaLabel=""
            truckHeading={followBearing}
            truckLocation={truckLocation}
            zoom={showLiveOverlays && isTurnByTurn ? 17 : 13.5}
          />
        )
      ) : null}

      {/* Recenter button — only shown in non-hosted mode (direct MissionMapCanvas) */}
      {!hasDirectorHost && !isTurnByTurn && !isTripEnded ? (
        <Pressable
          accessibilityLabel="Về vị trí xe"
          onPress={() => setRecenterNonce((n) => n + 1)}
          style={styles.recenterFab}
          testID="driver-canvas-recenter"
        >
          <Text style={styles.recenterFabIcon}>⊕</Text>
        </Pressable>
      ) : null}

      {/* Cargo at a glance, pinned to the map header. Sits above the mode card
          (top: 56) so it never competes with navigation guidance. */}
      {showLiveOverlays && cargoLabel ? (
        <View pointerEvents="none" style={styles.cargoHeaderChip} testID="cargo-header-chip">
          <Text numberOfLines={1} style={styles.cargoHeaderText}>
            📦 {cargoLabel}
          </Text>
        </View>
      ) : null}

      {/* Turn-by-turn: Grab/Lalamove/Google-Maps-style HUD */}
      {showLiveOverlays && isTurnByTurn ? (
        <View pointerEvents="box-none" style={styles.turnByTurnHudWrap} testID="turn-by-turn-hud">
          <View style={styles.turnByTurnCard}>
            <View style={styles.turnByTurnManeuverBox}>
              <ManeuverIcon size={26} type={maneuverType} />
              {nextStepDistText ? (
                <Text numberOfLines={1} style={styles.turnByTurnDistanceHighlight}>
                  {nextStepDistText}
                </Text>
              ) : null}
            </View>

            <View style={styles.turnByTurnBody}>
              <Text numberOfLines={1} style={styles.turnByTurnActionText}>
                {nextStepAction}
              </Text>
              <Text numberOfLines={1} style={styles.turnByTurnSubtitle}>
                {resolvedTarget?.label ? `Điểm đến: ${resolvedTarget.label}` : etaText}
              </Text>
              {tripMetricsText ? (
                <View style={styles.turnByTurnMetricsPill}>
                  <Text style={styles.turnByTurnMetricsText}>
                    {tripMetricsText} · ETA dự kiến
                  </Text>
                </View>
              ) : null}
            </View>

            <View style={styles.turnByTurnActions}>
              <Pressable
                accessibilityHint="Bật hoặc tắt âm thanh dẫn đường"
                accessibilityLabel={isAudioMuted ? 'Bật âm thanh' : 'Tắt âm thanh'}
                accessibilityRole="button"
                onPress={() => setIsAudioMuted((prev) => !prev)}
                style={({ pressed }) => [styles.turnByTurnMuteBtn, pressed ? styles.pressed : null]}
              >
                <Text style={styles.turnByTurnMuteIcon}>{isAudioMuted ? '🔇' : '🔊'}</Text>
              </Pressable>
            </View>
          </View>
        </View>
      ) : null}

      {/* Chuyến đã kết thúc: bản đồ tĩnh, chỉ còn pill ETA tóm tắt ở đáy */}
      {showLiveOverlays ? (
        <>
          {/* Hidden audit compliance elements */}
          {isDemo ? (
            <View style={styles.srOnly} testID="badge-demo-data">
              <Text style={styles.mapDemoBadgeText}>Dữ liệu mô phỏng</Text>
            </View>
          ) : null}

          {isEtaStale ? (
            <View style={styles.srOnly} testID="badge-stale-eta">
              <Text style={styles.mapStaleBadgeText}>ETA cũ</Text>
            </View>
          ) : null}

          <View style={styles.srOnly} testID="pill-tracking-status">
            <Text>{tracking.label}</Text>
          </View>

          {resolvedTarget?.label ? (
            <View style={styles.srOnly} testID="card-waypoint-guidance">
              <Text>{`ĐÍCH ĐẾN: ${resolvedTarget.label}`}</Text>
            </View>
          ) : null}
        </>
      ) : null}

      {/* Floating Pill Bottom Left: ETA & Distance - Hidden behind sheet in active mode */}
      <View style={styles.srOnly} testID="pill-eta-estimate">
        <IconClock color={leopardPalette.primary} size={13} />
        <Text numberOfLines={1} style={styles.mapFloatingEtaText}>
          {isTripEnded ? etaText.replace('ETA dự kiến · ', '') : etaText}
        </Text>
      </View>

      {/* Floating Quick Action Group Bottom Right (chỉ khi đang chạy) - Hidden from visual chrome */}
      {showLiveOverlays ? (
        <View style={styles.srOnly}>
          <Pressable
            accessibilityHint="Mở ứng dụng Google Maps để dẫn đường đến điểm dừng tiếp theo"
            accessibilityLabel="Mở bản đồ đến điểm tiếp theo"
            accessibilityRole="button"
            accessibilityState={{ disabled: !hasValidNavigationTarget }}
            disabled={!hasValidNavigationTarget}
            onPress={() => {
              if (!hasValidNavigationTarget || !resolvedTarget) {
                Alert.alert(
                  'Không có tọa độ dẫn đường',
                  'Điểm đến tiếp theo chưa có tọa độ GPS hợp lệ để mở bản đồ dẫn đường.',
                );
                return;
              }
              openExternalNavigation({
                origin: resolvedOrigin.coords ? { lat: resolvedOrigin.coords.lat, lng: resolvedOrigin.coords.lng } : undefined,
                target: resolvedTarget,
                truckLocation: truckLocation ?? undefined,
                vehicleType,
                onWarning: onNavigationWarning,
              });
            }}
            style={({ pressed }) => [
              styles.mapFloatingQuickBtn,
              !hasValidNavigationTarget ? styles.btnDisabled : null,
              pressed && hasValidNavigationTarget ? styles.pressed : null,
            ]}
            testID="btn-navigate-next-stop"
          >
            <IconRoute
              color={hasValidNavigationTarget ? leopardPalette.primary : '#94A3B8'}
              size={18}
            />
          </Pressable>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  mapCanvasContainer: {
    backgroundColor: colors.neutral.text,
    borderRadius: 20,
    height: 270,
    overflow: 'hidden',
    position: 'relative',
    width: '100%',
  },
  mapCanvasContainerTransparent: {
    backgroundColor: 'transparent',
  },
  mapCanvasContainerFill: {
    borderRadius: 0,
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    width: '100%',
    height: '100%',
  },
  recenterFab: {
    position: 'absolute',
    bottom: 16,
    right: 16,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 5,
    zIndex: 10,
  },
  recenterFabIcon: {
    fontSize: 20,
    color: '#0B2545',
  },
  mapFloatingTopLeftGroup: {
    flexDirection: 'row',
    gap: 6,
    left: 12,
    position: 'absolute',
    top: 12,
    zIndex: 10,
  },
  mapDemoBadge: {
    backgroundColor: '#FEF3C7',
    borderColor: leopardPalette.accentYellow,
    borderRadius: radius.pill,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  mapDemoBadgeText: {
    color: '#92400E',
    ...typeScale.caption2,
    fontWeight: '600',
  },
  mapStaleBadge: {
    backgroundColor: '#FEE2E2',
    borderColor: colors.danger.text,
    borderRadius: radius.pill,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  mapStaleBadgeText: {
    color: '#991B1B',
    ...typeScale.caption2,
    fontWeight: '600',
  },
  mapFloatingStatusPill: {
    alignItems: 'center',
    backgroundColor: 'rgba(15, 23, 42, 0.85)',
    borderColor: 'rgba(255, 255, 255, 0.18)',
    borderRadius: radius.pill,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 6,
    maxWidth: 220,
    paddingHorizontal: 12,
    paddingVertical: 5,
    position: 'absolute',
    right: 12,
    top: 12,
    zIndex: 10,
  },
  mapTopRightControls: {
    position: 'absolute',
    right: 12,
    top: 46,
    flexDirection: 'column',
    gap: 6,
    zIndex: 20,
  },
  mapModePill: {
    backgroundColor: '#FFFFFF',
    borderColor: '#CBD5E1',
    borderWidth: 1,
    borderRadius: radius.pill,
    paddingHorizontal: 10,
    paddingVertical: 6,
    shadowColor: '#0B2545',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 4,
    elevation: 3,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mapModePillActive: {
    backgroundColor: '#0B2545',
    borderColor: '#F59E0B',
    borderWidth: 1.5,
  },
  mapModePillText: {
    color: '#0F172A',
    ...typeScale.caption2,
    fontWeight: '700',
  },
  mapModePillTextActive: {
    color: '#FFFFFF',
    fontWeight: '800',
  },
  btnPressed: {
    opacity: 0.8,
    transform: [{ scale: 0.96 }],
  },
  mapStatusDot: {
    borderRadius: 3.5,
    height: 7,
    width: 7,
  },
  mapStatusDotHealthy: {
    backgroundColor: '#10B981',
  },
  mapStatusDotWarning: {
    backgroundColor: leopardPalette.accentYellow,
  },
  mapStatusPillText: {
    ...typeScale.caption2,
    color: colors.neutral.surface,
    fontWeight: '600',
  },
  mapWaypointGuidanceCard: {
    alignItems: 'center',
    backgroundColor: 'rgba(15, 23, 42, 0.88)',
    borderColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: radius.pill,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 6,
    left: 12,
    maxWidth: '85%',
    paddingHorizontal: 10,
    paddingVertical: 5,
    position: 'absolute',
    top: 46,
    zIndex: 10,
  },
  cargoHeaderChip: {
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(255, 255, 255, 0.94)',
    borderColor: colors.neutral.border,
    borderRadius: radius.pill,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 6,
    left: 12,
    maxWidth: '72%',
    paddingHorizontal: 12,
    paddingVertical: 6,
    position: 'absolute',
    top: 12,
    zIndex: 20,
  },
  cargoHeaderText: {
    ...typeScale.caption1,
    color: leopardPalette.textSlateDark,
    fontWeight: '700',
  },
  overviewFrameBadge: {
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(255, 255, 255, 0.94)',
    borderColor: colors.neutral.border,
    borderRadius: radius.pill,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 6,
    left: 12,
    maxWidth: '86%',
    paddingHorizontal: 12,
    paddingVertical: 6,
    position: 'absolute',
    top: 56,
    zIndex: 20,
  },
  overviewFrameText: {
    ...typeScale.caption1,
    color: leopardPalette.textSlateDark,
    fontWeight: '700',
  },
  turnByTurnHudWrap: {
    left: 12,
    position: 'absolute',
    right: 12,
    top: 56,
    zIndex: 20,
  },
  turnByTurnCard: {
    alignItems: 'center',
    backgroundColor: '#0B2545',
    borderColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: radius.cardLg,
    borderWidth: 1,
    elevation: 6,
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    shadowColor: '#0B2545',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.28,
    shadowRadius: 10,
  },
  turnByTurnManeuverBox: {
    alignItems: 'center',
    backgroundColor: '#10B981',
    borderRadius: radius.control,
    justifyContent: 'center',
    minWidth: 54,
    paddingHorizontal: 8,
    paddingVertical: 6,
  },
  turnByTurnDistanceHighlight: {
    ...typeScale.caption2,
    color: '#FFFFFF',
    fontWeight: '700',
    marginTop: 2,
  },
  turnByTurnManeuver: {
    alignItems: 'center',
    backgroundColor: leopardPalette.accentYellow,
    borderRadius: radius.control,
    height: 44,
    justifyContent: 'center',
    width: 44,
  },
  turnByTurnBody: {
    flex: 1,
    gap: 2,
  },
  turnByTurnActionText: {
    ...typeScale.subheadline,
    color: '#FFFFFF',
    fontWeight: '700',
  },
  turnByTurnTitle: {
    ...typeScale.subheadline,
    color: '#FFFFFF',
    fontWeight: '700',
  },
  turnByTurnSubtitle: {
    ...typeScale.caption2,
    color: 'rgba(255, 255, 255, 0.78)',
    fontWeight: '500',
  },
  turnByTurnMetricsPill: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: radius.cardSm,
    marginTop: 3,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  turnByTurnMetricsText: {
    ...typeScale.caption2,
    color: '#FCD34D',
    fontWeight: '700',
  },
  turnByTurnActions: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  turnByTurnMuteBtn: {
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.16)',
    borderRadius: radius.cardSm,
    height: 28,
    justifyContent: 'center',
    width: 28,
  },
  turnByTurnMuteIcon: {
    fontSize: 13,
  },
  srOnly: {
    height: 1,
    opacity: 0.001,
    position: 'absolute',
    width: 1,
    overflow: 'hidden',
  },
  waypointDot: {
    backgroundColor: '#10B981',
    borderRadius: 4,
    height: 8,
    width: 8,
  },
  waypointDestinationText: {
    ...typeScale.caption2,
    color: colors.neutral.surface,
    fontWeight: '600',
  },
  mapFloatingEtaPill: {
    alignItems: 'center',
    backgroundColor: colors.neutral.surface,
    borderColor: colors.neutral.border,
    borderRadius: radius.pill,
    borderWidth: 1,
    bottom: 14,
    elevation: 4,
    flexDirection: 'row',
    gap: 6,
    left: 12,
    maxWidth: '75%',
    paddingHorizontal: 12,
    paddingVertical: 6,
    position: 'absolute',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 4,
    zIndex: 10,
  },
  mapFloatingEtaText: {
    ...typeScale.caption1,
    color: leopardPalette.textSlateDark,
    fontWeight: '700',
  },
  mapFloatingControlsGroup: {
    bottom: 12,
    position: 'absolute',
    right: 12,
    zIndex: 10,
  },
  mapFloatingQuickBtn: {
    alignItems: 'center',
    backgroundColor: colors.neutral.surface,
    borderColor: colors.neutral.border,
    borderRadius: 22,
    borderWidth: 1,
    elevation: 4,
    height: 44,
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    width: 44,
  },
  btnDisabled: {
    backgroundColor: colors.neutral.surfaceMuted,
    borderColor: leopardPalette.inputBorder,
    opacity: 0.6,
  },
  pressed: {
    opacity: 0.75,
  },
});
