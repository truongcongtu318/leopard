import React from 'react';
import { Alert, Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import {
  radius,
  leopardPalette,
  IconClock,
  IconRoute,
  RealInteractiveMap,
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
  testID = 'route-map-schematic',
  originLabel,
  destinationLabel,
}: MissionMapCanvasProps) {
  const resolvedOrigin = origin ?? { label: originLabel ?? 'Điểm lấy hàng' };
  const resolvedDestination = destination ?? {
    label: destinationLabel ?? 'Điểm giao hàng',
  };

  const isTrackingStale =
    tracking.kind === 'stale' ||
    tracking.kind === 'offline' ||
    tracking.kind === 'reconnecting' ||
    tracking.kind === 'permission-denied';

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

  // Map stops for RealInteractiveMap with progress and sequence
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
  const effectiveRouteCoords = eta?.polylineCoords ?? routeCoords ?? [];

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

  const isDemo = eta?.source === 'DEMO';

  return (
    <View style={styles.mapCanvasContainer} testID={testID}>
      <RealInteractiveMap
        destination={resolvedDestination}
        height="100%"
        mode="tracking"
        origin={resolvedOrigin}
        routeCoords={effectiveRouteCoords}
        routeResolutionPolicy="PROVIDED_ONLY"
        routeSegments={effectiveRouteSegments}
        stops={mapStops}
        truckEtaLabel={tracking.label}
      />

      {/* Floating Badges Top Left: Demo warning & Stale pill */}
      <View style={styles.mapFloatingTopLeftGroup}>
        {isDemo ? (
          <View style={styles.mapDemoBadge} testID="badge-demo-data">
            <Text style={styles.mapDemoBadgeText}>Dữ liệu mô phỏng</Text>
          </View>
        ) : null}

        {isEtaStale ? (
          <View style={styles.mapStaleBadge} testID="badge-stale-eta">
            <Text style={styles.mapStaleBadgeText}>ETA cũ</Text>
          </View>
        ) : null}
      </View>

      {/* Floating Pill Top Right: Tracking Status */}
      <View style={styles.mapFloatingStatusPill} testID="pill-tracking-status">
        <View
          style={[
            styles.mapStatusDot,
            isStale ? styles.mapStatusDotWarning : styles.mapStatusDotHealthy,
          ]}
        />
        <Text numberOfLines={1} style={styles.mapStatusPillText}>
          {tracking.label}
        </Text>
      </View>

      {/* Floating Waypoint Guidance Bar */}
      {resolvedTarget?.label ? (
        <View style={styles.mapWaypointGuidanceCard} testID="card-waypoint-guidance">
          <View style={styles.waypointDot} />
          <Text numberOfLines={1} style={styles.waypointDestinationText}>
            {`ĐÍCH ĐẾN: ${resolvedTarget.label}`}
          </Text>
        </View>
      ) : null}

      {/* Floating Pill Bottom Left: ETA & Distance */}
      <View style={styles.mapFloatingEtaPill} testID="pill-eta-estimate">
        <IconClock color="#0B1E42" size={13} />
        <Text numberOfLines={1} style={styles.mapFloatingEtaText}>
          {etaText}
        </Text>
      </View>

      {/* Floating Quick Action Group Bottom Right */}
      <View style={styles.mapFloatingControlsGroup}>
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
            color={hasValidNavigationTarget ? '#0B1E42' : '#94A3B8'}
            size={18}
          />
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  mapCanvasContainer: {
    backgroundColor: '#0F172A',
    borderRadius: 20,
    height: 270,
    overflow: 'hidden',
    position: 'relative',
    width: '100%',
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
    borderColor: '#F59E0B',
    borderRadius: radius.pill,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  mapDemoBadgeText: {
    color: '#92400E',
    fontSize: 10,
    fontWeight: '800',
  },
  mapStaleBadge: {
    backgroundColor: '#FEE2E2',
    borderColor: '#EF4444',
    borderRadius: radius.pill,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  mapStaleBadgeText: {
    color: '#991B1B',
    fontSize: 10,
    fontWeight: '800',
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
  mapStatusDot: {
    borderRadius: 3.5,
    height: 7,
    width: 7,
  },
  mapStatusDotHealthy: {
    backgroundColor: '#10B981',
  },
  mapStatusDotWarning: {
    backgroundColor: '#F59E0B',
  },
  mapStatusPillText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
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
  waypointDot: {
    backgroundColor: '#10B981',
    borderRadius: 4,
    height: 8,
    width: 8,
  },
  waypointDestinationText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
  },
  mapFloatingEtaPill: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderColor: '#E2E8F0',
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
    color: leopardPalette.textSlateDark,
    fontSize: 12,
    fontWeight: '800',
  },
  mapFloatingControlsGroup: {
    bottom: 12,
    position: 'absolute',
    right: 12,
    zIndex: 10,
  },
  mapFloatingQuickBtn: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderColor: '#E2E8F0',
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
    backgroundColor: '#F1F5F9',
    borderColor: '#CBD5E1',
    opacity: 0.6,
  },
  pressed: {
    opacity: 0.75,
  },
});
