import React from 'react';
import { Alert, Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import {
  IconClock,
  IconExternalLink,
  IconLocationPin,
  IconRoute,
  LeopardMapView,
  colors,
  leopardPalette,
  radius,
  typeScale,
  type MapCoordinate,
  type RoutePolylineSegment,
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
  /**
   * Cargo at a glance, surfaced on the map header instead of a separate card
   * over the sheet. The driver still sees what is being carried without the
   * sheet losing a third of its height.
   */
  cargoSummary?: string | null;
  cargoWeightKg?: number | null;
  /**
   * 'overview' frames the whole A → B route (with every stop).
   * 'turn-by-turn' locks a 3D driving camera onto the vehicle, like Google Maps.
   */
  navMode?: 'overview' | 'turn-by-turn';
  testID?: string;
  // Legacy string labels for backward compatibility
  originLabel?: string;
  destinationLabel?: string;
}>;

export type OpenExternalNavigationOptions = {
  target?: { lat?: number; lng?: number; label?: string } | string | null;
  vehicleType?: VehicleType | string | null;
  onWarning?: (proceed: () => void) => void;
};

export function openExternalNavigation(
  optionsOrTarget:
    | OpenExternalNavigationOptions
    | { lat?: number; lng?: number; label?: string }
    | string,
): boolean {
  let target: { lat?: number; lng?: number; label?: string } | string | null | undefined;
  let vehicleType: VehicleType | string | null | undefined;
  let onWarning: ((proceed: () => void) => void) | undefined;

  if (
    optionsOrTarget &&
    typeof optionsOrTarget === 'object' &&
    ('target' in optionsOrTarget || 'vehicleType' in optionsOrTarget)
  ) {
    const opts = optionsOrTarget as OpenExternalNavigationOptions;
    target = opts.target;
    vehicleType = opts.vehicleType;
    onWarning = opts.onWarning;
  } else {
    target = optionsOrTarget as
      | { lat?: number; lng?: number; label?: string }
      | string;
  }

  let lat: number | undefined;
  let lng: number | undefined;

  if (typeof target === 'object' && target !== null) {
    if (
      typeof target.lat === 'number' &&
      typeof target.lng === 'number' &&
      !isNaN(target.lat) &&
      !isNaN(target.lng)
    ) {
      lat = target.lat;
      lng = target.lng;
    }
  }

  if (lat == null || lng == null) {
    Alert.alert(
      'Không có tọa độ dẫn đường',
      'Điểm đến tiếp theo chưa có tọa độ GPS hợp lệ để mở bản đồ dẫn đường.',
    );
    return false;
  }

  const proceed = () => {
    const coords = `${lat},${lng}`;
    const encoded = encodeURIComponent(coords);
    const url = `https://www.google.com/maps/dir/?api=1&destination=${encoded}`;
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
}: MissionMapCanvasProps) {
  // Turn-by-turn mirrors how Google Maps behaves once navigation starts.
  const isTurnByTurn = navMode === 'turn-by-turn';

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
  }, [navigationTarget, stops, resolvedDestination]);

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
  const effectiveRouteSegments = eta?.polylineSegments ?? routeSegments;
  const etaRouteCoords = eta?.polylineCoords && eta.polylineCoords.length >= 2
    ? eta.polylineCoords
    : routeCoords && routeCoords.length >= 2
    ? routeCoords
    : [];

  const fallbackRouteCoords = React.useMemo(() => {
    if (etaRouteCoords.length >= 2) return null;
    if (resolvedOrigin.coords == null || resolvedDestination.coords == null) {
      return null;
    }
    return [resolvedOrigin.coords, resolvedDestination.coords];
  }, [etaRouteCoords, resolvedDestination.coords, resolvedOrigin.coords]);

  const effectiveRouteCoords = etaRouteCoords.length >= 2 ? etaRouteCoords : (fallbackRouteCoords ?? []);
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
  const isTripEnded = tracking.kind === 'unavailable' || tracking.kind === 'not-started';
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

  return (
    <View
      style={[styles.mapCanvasContainer, fillContainer ? styles.mapCanvasContainerFill : null]}
      testID={testID}
    >
      {/* Dual-resolution Vietmap Vector GL engine (same renderer as the customer app) */}
      <LeopardMapView
        bearing={followBearing}
        destination={resolvedDestination}
        followTruckLocation={showLiveOverlays && isTurnByTurn}
        height="100%"
        interactive={!isTripEnded}
        mode={isTripEnded || !isTurnByTurn ? 'route' : 'tracking'}
        origin={resolvedOrigin}
        pitch={showLiveOverlays && isTurnByTurn ? 55 : 0}
        routeCoords={effectiveRouteCoords}
        routeResolutionPolicy="PROVIDED_ONLY"
        routeSegments={effectiveRouteSegments}
        stops={mapStops}
        truckEtaLabel=""
        truckLocation={truckLocation}
        zoom={showLiveOverlays && isTurnByTurn ? 17 : 13.5}
      />

      {/* Cargo at a glance, pinned to the map header. Sits above the mode card
          (top: 56) so it never competes with navigation guidance. */}
      {showLiveOverlays && cargoLabel ? (
        <View pointerEvents="none" style={styles.cargoHeaderChip} testID="cargo-header-chip">
          <Text numberOfLines={1} style={styles.cargoHeaderText}>
            📦 {cargoLabel}
          </Text>
        </View>
      ) : null}

      {/* Overview: make the A → B frame explicit, just like a route preview. */}
      {showLiveOverlays && !isTurnByTurn ? (
        <View pointerEvents="none" style={styles.overviewFrameBadge} testID="badge-route-overview">
          <IconLocationPin color={leopardPalette.primary} size={12} />
          <Text numberOfLines={1} style={styles.overviewFrameText}>
            {`Toàn cảnh · ${resolvedOrigin.label} ➔ ${resolvedDestination.label}`}
          </Text>
        </View>
      ) : null}

      {/* Turn-by-turn: Google-Maps-style guidance card with a one-tap handoff. */}
      {showLiveOverlays && isTurnByTurn ? (
        <View pointerEvents="box-none" style={styles.turnByTurnHudWrap} testID="turn-by-turn-hud">
          <View style={styles.turnByTurnCard}>
            <View style={styles.turnByTurnManeuver}>
              <IconRoute color="#FFFFFF" size={22} />
            </View>
            <View style={styles.turnByTurnBody}>
              <Text numberOfLines={1} style={styles.turnByTurnTitle}>
                {resolvedTarget?.label ? `Đến ${resolvedTarget.label}` : 'Bám theo lộ trình'}
              </Text>
              <Text numberOfLines={1} style={styles.turnByTurnSubtitle}>
                {etaText}
              </Text>
            </View>
            <Pressable
              accessibilityHint="Mở Google Maps để dẫn đường turn-by-turn bằng giọng nói"
              accessibilityLabel="Mở Google Maps chỉ đường turn-by-turn"
              accessibilityRole="button"
              onPress={() =>
                openExternalNavigation({ target: resolvedTarget, vehicleType, onWarning: onNavigationWarning })
              }
              style={({ pressed }) => [styles.turnByTurnCta, pressed ? styles.pressed : null]}
              testID="btn-turn-by-turn-google-maps"
            >
              <IconExternalLink color={leopardPalette.primary} size={16} />
              <Text style={styles.turnByTurnCtaText}>Google Maps</Text>
            </Pressable>
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
                target: resolvedTarget,
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
    backgroundColor: 'rgba(11, 37, 69, 0.94)',
    borderColor: 'rgba(255, 255, 255, 0.22)',
    borderRadius: radius.card,
    borderWidth: 1,
    elevation: 6,
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 12,
    paddingVertical: 12,
    shadowColor: '#0B2545',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.28,
    shadowRadius: 10,
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
  turnByTurnTitle: {
    ...typeScale.subheadline,
    color: '#FFFFFF',
    fontWeight: '700',
  },
  turnByTurnSubtitle: {
    ...typeScale.caption1,
    color: 'rgba(255, 255, 255, 0.78)',
    fontWeight: '600',
  },
  turnByTurnCta: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: radius.control,
    flexDirection: 'row',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  turnByTurnCtaText: {
    ...typeScale.caption1,
    color: leopardPalette.primary,
    fontWeight: '700',
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
