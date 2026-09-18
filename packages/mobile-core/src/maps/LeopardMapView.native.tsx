import React, { useEffect, useMemo, useRef } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import type { LeopardMapViewProps } from './types';
import { anchorRouteToTruck } from './map-geospatial';
import { colors } from '../theme/tokens';
import { IconLocationPin, IconSpeedTruck } from '../ui/icons/CoreIcons';
import { SmoothVehicleMarker } from './SmoothVehicleMarker';

const loadVietmapGL = () => {
  try {
    const r = typeof require !== 'undefined' ? require : null;
    return r ? r('@vietmap/vietmap-gl-react-native') : null;
  } catch {
    return null;
  }
};
const VietmapGLModule = loadVietmapGL();
const VietmapGL: any = VietmapGLModule?.default || VietmapGLModule;

const VIETMAP_DEFAULT_STYLE = 'https://maps.vietmap.vn/api/maps/light/styles.json?apikey=';

export function LeopardMapView({
  mode = 'preview',
  origin,
  destination,
  stops = [],
  truckLocation,
  truckEtaMinutes,
  truckEtaLabel,
  initialPinCoords,
  onLocationChange,
  height = 240,
  testID = 'leopard-map-view',
  style,
  interactive = true,
  vietmapApiKey,
  routeCoords = [],
  routeSegments = [],
  nearbyDrivers = [],
  zoom = 14,
  minZoom,
  maxZoom,
  maxBounds,
  bearing = 0,
  pitch = 0,
  followTruckLocation = false,
  isPickupLeg = false,
  recenterNonce,
}: LeopardMapViewProps) {
  const cameraRef = useRef<any>(null);
  const defaultMinZoom = mode === 'tracking' ? 8.5 : 7.5;
  const effectiveMinZoom = typeof minZoom === 'number' ? minZoom : defaultMinZoom;
  const effectiveMaxZoom = typeof maxZoom === 'number' ? maxZoom : 19;
  const defaultMaxBounds: [[number, number], [number, number]] = [
    [101.0, 7.5],
    [111.5, 24.5],
  ];
  const effectiveMaxBounds = maxBounds ?? defaultMaxBounds;

  const resolvedApiKey = useMemo(() => {
    return (
      vietmapApiKey ||
      (typeof process !== 'undefined' && process.env?.EXPO_PUBLIC_VIETMAP_API_KEY) ||
      'c3d607a7ed780824b223d6a6bbec8f85f1c4e7ab56f3f015'
    );
  }, [vietmapApiKey]);

  useEffect(() => {
    if (VietmapGL?.setApiKey && resolvedApiKey) {
      VietmapGL.setApiKey(resolvedApiKey);
    }
  }, [resolvedApiKey]);

  // Imperative recenter: when recenterNonce increments, fly camera back to truck location
  useEffect(() => {
    if (!recenterNonce || recenterNonce === 0) return;
    const target = truckLocation ?? (routeCoords.length > 0 ? routeCoords[0] : null);
    if (!target || !cameraRef.current) return;
    try {
      cameraRef.current.flyTo([target.lng, target.lat], 800);
    } catch {
      // Ignore camera errors
    }
  }, [recenterNonce]);

  const centerCoords = useMemo<[number, number]>(() => {
    if (initialPinCoords) return [initialPinCoords.lng, initialPinCoords.lat];
    if (truckLocation) return [truckLocation.lng, truckLocation.lat];
    if (origin?.coords && destination?.coords) {
      return [
        (origin.coords.lng + destination.coords.lng) / 2,
        (origin.coords.lat + destination.coords.lat) / 2,
      ];
    }
    if (origin?.coords) return [origin.coords.lng, origin.coords.lat];
    if (destination?.coords) return [destination.coords.lng, destination.coords.lat];
    if (routeCoords.length > 0 && routeCoords[0]) return [routeCoords[0].lng, routeCoords[0].lat];
    return [106.660172, 10.762622];
  }, [initialPinCoords, truckLocation, origin, destination, routeCoords]);

  // Turn-by-turn: the camera must ride with the vehicle, so the truck position
  // wins over every other candidate. Without a live fix there is nothing to
  // follow, so we fall back to the plain route framing instead of freezing the
  // camera on a stale origin.
  const shouldFollowTruck = followTruckLocation && truckLocation != null;

  const cameraCenterCoords = useMemo<[number, number]>(() => {
    if (shouldFollowTruck && truckLocation) {
      return [truckLocation.lng, truckLocation.lat];
    }
    return centerCoords;
  }, [centerCoords, shouldFollowTruck, truckLocation]);

  const routeGeoJSON = useMemo(() => {
    if (routeSegments.length > 0) {
      return {
        type: 'FeatureCollection' as const,
        features: routeSegments.map((seg, idx) => ({
          type: 'Feature' as const,
          id: `seg-${idx}`,
          properties: {
            kind: seg.kind,
            color:
              seg.kind === 'completed'
                ? '#94A3B8'
                : seg.kind === 'active'
                ? '#2563EB'
                : '#CBD5E1',
          },
          geometry: {
            type: 'LineString' as const,
            coordinates: seg.coords.map((c) => [c.lng, c.lat]),
          },
        })),
      };
    }

    const effectiveRouteCoords =
      mode === 'tracking' && truckLocation
        ? anchorRouteToTruck({
            routeCoords,
            truckLocation,
            originCoords: origin?.coords,
            destinationCoords: destination?.coords,
            isPickupLeg: Boolean(isPickupLeg),
          })
        : routeCoords;

    if (effectiveRouteCoords.length >= 2) {
      return {
        type: 'FeatureCollection' as const,
        features: [
          {
            type: 'Feature' as const,
            id: 'route-main',
            properties: { kind: 'active', color: '#2563EB' },
            geometry: {
              type: 'LineString' as const,
              coordinates: effectiveRouteCoords.map((c) => [c.lng, c.lat]),
            },
          },
        ],
      };
    }

    // Connect origin -> intermediate stops -> destination so route line always renders
    if (origin?.coords && destination?.coords) {
      if (isPickupLeg) {
        if (truckLocation && origin.coords) {
          return {
            type: 'FeatureCollection' as const,
            features: [
              {
                type: 'Feature' as const,
                id: 'route-main',
                properties: { kind: 'active', color: '#2563EB' },
                geometry: {
                  type: 'LineString' as const,
                  coordinates: [
                    [truckLocation.lng, truckLocation.lat],
                    [origin.coords.lng, origin.coords.lat],
                  ],
                },
              },
            ],
          };
        }
        return null;
      }

      const validStops: [number, number][] = stops
        .filter((s) => s.coords)
        .map((s) => [s.coords!.lng, s.coords!.lat]);
      const baseCoords: [number, number][] = [
        [origin.coords.lng, origin.coords.lat],
        ...validStops,
        [destination.coords.lng, destination.coords.lat],
      ];
      const coords: [number, number][] =
        mode === 'tracking' && truckLocation
          ? [[truckLocation.lng, truckLocation.lat], ...baseCoords]
          : baseCoords;
      return {
        type: 'FeatureCollection' as const,
        features: [
          {
            type: 'Feature' as const,
            id: 'route-main',
            properties: { kind: 'active', color: '#2563EB' },
            geometry: {
              type: 'LineString' as const,
              coordinates: coords,
            },
          },
        ],
      };
    }

    return null;
  }, [routeCoords, routeSegments, origin?.coords, destination?.coords, stops, mode, truckLocation, isPickupLeg]);

  const displayEta = useMemo(() => {
    if (truckEtaLabel) return truckEtaLabel;
    if (typeof truckEtaMinutes === 'number') {
      return truckEtaMinutes > 0 ? `${truckEtaMinutes} phút` : 'Đã đến';
    }
    return '';
  }, [truckEtaLabel, truckEtaMinutes]);
  const isTestEnv = typeof process !== 'undefined' && process.env?.NODE_ENV === 'test';

  if (VietmapGL && !isTestEnv && VietmapGL.MapView) {
    const styleUrl = `${VIETMAP_DEFAULT_STYLE}${resolvedApiKey}`;

    return (
      <View style={[styles.container, { height: height as any }, style]} testID={testID}>
        <VietmapGL.MapView
          pitchEnabled={interactive}
          rotateEnabled={interactive}
          scrollEnabled={interactive}
          style={StyleSheet.absoluteFill}
          styleURL={styleUrl}
          zoomEnabled={interactive}
        >
          <VietmapGL.Camera
            animationDuration={shouldFollowTruck ? 900 : 600}
            animationMode="flyTo"
            centerCoordinate={cameraCenterCoords}
            heading={shouldFollowTruck ? bearing : 0}
            pitch={shouldFollowTruck ? pitch : 0}
            ref={cameraRef}
            zoomLevel={shouldFollowTruck ? Math.max(zoom, 16) : Math.max(zoom, effectiveMinZoom)}
            minZoomLevel={effectiveMinZoom}
            maxZoomLevel={effectiveMaxZoom}
            maxBounds={{
              ne: effectiveMaxBounds[1],
              sw: effectiveMaxBounds[0],
            }}
          />

          {routeGeoJSON && (
            <VietmapGL.ShapeSource id="vietmapRouteSource" shape={routeGeoJSON}>
              <VietmapGL.LineLayer
                id="vietmapRouteHalo"
                style={{
                  lineColor: '#FFFFFF',
                  lineWidth: 7,
                  lineOpacity: 0.8,
                  lineJoin: 'round',
                  lineCap: 'round',
                }}
              />
              <VietmapGL.LineLayer
                id="vietmapRouteLine"
                style={{
                  lineColor: ['get', 'color'],
                  lineWidth: 5,
                  lineJoin: 'round',
                  lineCap: 'round',
                }}
              />
            </VietmapGL.ShapeSource>
          )}

          {origin?.coords && (
            <VietmapGL.PointAnnotation
              anchor={{ x: 0.5, y: 1.0 }}
              coordinate={[origin.coords.lng, origin.coords.lat]}
              id="origin-marker"
            >
              <View style={[styles.pinDot, { backgroundColor: '#10B981' }]}>
                <IconLocationPin color="#FFFFFF" size={14} strokeWidth={2.5} />
              </View>
            </VietmapGL.PointAnnotation>
          )}

          {destination?.coords && (
            <VietmapGL.PointAnnotation
              anchor={{ x: 0.5, y: 1.0 }}
              coordinate={[destination.coords.lng, destination.coords.lat]}
              id="dest-marker"
            >
              <View style={[styles.pinDot, { backgroundColor: '#EF4444' }]}>
                <IconLocationPin color="#FFFFFF" size={14} strokeWidth={2.5} />
              </View>
            </VietmapGL.PointAnnotation>
          )}

          {stops.map((stop, index) =>
            stop.coords ? (
              <VietmapGL.PointAnnotation
                coordinate={[stop.coords.lng, stop.coords.lat]}
                id={`stop-marker-${stop.id || index}`}
                key={`stop-${stop.id || index}`}
              >
                <View style={[styles.pinDot, { backgroundColor: '#F59E0B' }]}>
                  <Text style={styles.stopNumberText}>{index + 1}</Text>
                </View>
              </VietmapGL.PointAnnotation>
            ) : null,
          )}

          {initialPinCoords && (
            <VietmapGL.PointAnnotation
              coordinate={[initialPinCoords.lng, initialPinCoords.lat]}
              id="initial-pin-marker"
            >
              <View style={[styles.pinDot, { backgroundColor: '#0B2545' }]}>
                <IconLocationPin color="#FFFFFF" size={16} strokeWidth={2.5} />
              </View>
            </VietmapGL.PointAnnotation>
          )}

          {truckLocation && (
            <VietmapGL.PointAnnotation
              coordinate={[truckLocation.lng, truckLocation.lat]}
              id="truck-marker"
            >
              <View style={styles.truckWrapper}>
                <SmoothVehicleMarker
                  heading={bearing || 0}
                  isActive={true}
                  size={36}
                />
                {displayEta && !shouldFollowTruck && (
                  <View style={styles.etaBadge}>
                    <Text style={styles.etaText}>{displayEta}</Text>
                  </View>
                )}
              </View>
            </VietmapGL.PointAnnotation>
          )}
        </VietmapGL.MapView>
      </View>
    );
  }

  // Fallback representation for native test environments
  return (
    <View
      accessibilityLabel={
        mode === 'location'
          ? 'Bản đồ vị trí hiện tại của tài xế'
          : mode === 'tracking'
          ? `Bản đồ theo dõi xe trực tiếp${displayEta ? `; ETA: ${displayEta}` : ''}`
          : `Bản đồ lộ trình từ ${origin?.label || 'điểm lấy'} đến ${destination?.label || 'điểm giao'}`
      }
      accessibilityRole="image"
      style={[styles.container, styles.fallbackContainer, { height: height as any }, style]}
      testID={testID}
    >
      <View style={styles.roadGridH} />
      <View style={styles.roadGridV} />
      {(routeCoords.length > 0 || (origin?.coords && destination?.coords)) && (
        <View style={styles.routeTraceLine} />
      )}

      {origin?.coords && (
        <View style={[styles.markerPin, styles.originPin]}>
          <IconLocationPin color="#10B981" size={16} strokeWidth={2} />
        </View>
      )}

      {destination?.coords && (
        <View style={[styles.markerPin, styles.destPin]}>
          <IconLocationPin color="#EF4444" size={16} strokeWidth={2} />
        </View>
      )}

      {initialPinCoords && (
        <View style={[styles.markerPin, styles.pinMarker]}>
          <IconLocationPin color="#0B2545" size={18} strokeWidth={2.5} />
        </View>
      )}

      {(mode === 'tracking' || (mode === 'location' && truckLocation) || truckLocation) && (
        <View style={styles.truckMarkerWrap}>
          <SmoothVehicleMarker
            heading={shouldFollowTruck ? bearing : 0}
            isActive={shouldFollowTruck}
            size={36}
          />
          {displayEta ? (
            <View style={styles.truckEtaBadge}>
              <Text style={styles.truckEtaText}>{displayEta}</Text>
            </View>
          ) : null}
        </View>
      )}

      {nearbyDrivers && nearbyDrivers.length > 0 ? (
        <View pointerEvents="none" style={styles.nearbyDriversLayer} testID="nearby-drivers-layer">
          {nearbyDrivers.map((driver, index) => (
            <View
              key={driver.id}
              accessibilityLabel={`Tài xế gần đây ${driver.vehicleType || ''}`}
              style={[
                styles.nearbyDriverPin,
                {
                  top: `${25 + (index % 4) * 15}%`,
                  left: `${20 + (index % 5) * 15}%`,
                },
              ]}
              testID={`nearby-driver-${driver.id}`}
            >
              <Text style={styles.nearbyDriverEmoji}>
                {driver.vehicleType === 'VAN' ? '🚐' : driver.vehicleType === 'MOTORBIKE' ? '🛵' : '🚛'}
              </Text>
            </View>
          ))}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    overflow: 'hidden',
    backgroundColor: colors.operational.mapLand,
  },
  map: {
    flex: 1,
  },
  nearbyDriversLayer: {
    position: 'absolute',
    left: 0,
    top: 0,
    right: 0,
    bottom: 0,
    pointerEvents: 'none',
  },
  nearbyDriverPin: {
    position: 'absolute',
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: '#0B2545',
    elevation: 3,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
  },
  nearbyDriverEmoji: {
    fontSize: 12,
  },
  driverDot: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#0B2545',
    elevation: 3,
  },
  pinDot: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
    elevation: 4,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  stopNumberText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '800',
  },
  truckWrapper: {
    alignItems: 'center',
  },
  truckIconBadge: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#0B2545',
    borderWidth: 2,
    borderColor: '#F59E0B',
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 5,
  },
  etaBadge: {
    backgroundColor: '#0B2545',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    marginTop: 2,
  },
  etaText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '700',
  },
  fallbackContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  roadGridH: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: '50%',
    height: 12,
    backgroundColor: '#E2E8F0',
  },
  roadGridV: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: '50%',
    width: 12,
    backgroundColor: '#E2E8F0',
  },
  routeTraceLine: {
    position: 'absolute',
    left: '25%',
    top: '35%',
    width: '50%',
    height: 4,
    backgroundColor: '#0B2545',
    transform: [{ rotate: '-20deg' }],
  },
  markerPin: {
    position: 'absolute',
    padding: 4,
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
  },
  originPin: {
    left: '20%',
    top: '40%',
  },
  destPin: {
    right: '20%',
    top: '25%',
  },
  pinMarker: {
    left: '50%',
    top: '50%',
    transform: [{ translateX: -12 }, { translateY: -12 }],
  },
  truckMarkerWrap: {
    position: 'absolute',
    left: '46%',
    top: '32%',
    alignItems: 'center',
  },
  truckMarker: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#0B2545',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: '#F59E0B',
  },
  truckEtaBadge: {
    backgroundColor: '#0B2545',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    marginTop: 2,
  },
  truckEtaText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '700',
  },
});
