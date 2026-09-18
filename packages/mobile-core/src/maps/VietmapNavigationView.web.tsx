import React, { useEffect, useId, useMemo, useRef, useState } from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import type { VietmapNavigationProps, MapCoordinate } from './types';

const loadMaplibreGL = () => {
  try {
    const r = typeof require !== 'undefined' ? require : null;
    return r ? r('maplibre-gl') : null;
  } catch {
    return null;
  }
};
const maplibregl: any = loadMaplibreGL();

const VIETMAP_DEFAULT_STYLE = 'https://maps.vietmap.vn/api/maps/light/styles.json?apikey=';

export function VietmapNavigationView({
  origin,
  destination,
  stops = [],
  routeCoords = [],
  vietmapApiKey,
  vehicleType = 'truck',
  isSimulating = true,
  speechVoiceLanguage = 'vi-VN',
  onNavigationFinished,
  onReroute,
  onLocationUpdate,
  onMuteToggle,
  onClose,
  testID = 'vietmap-navigation-view',
  style,
}: VietmapNavigationProps) {
  const containerId = useId().replace(/:/g, '_');
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<any>(null);

  const [isMuted, setIsMuted] = useState(false);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [simulatedSpeed] = useState(38); // km/h

  const resolvedApiKey = useMemo(() => {
    return (
      vietmapApiKey ||
      (typeof process !== 'undefined' && process.env?.EXPO_PUBLIC_VIETMAP_API_KEY) ||
      'c3d607a7ed780824b223d6a6bbec8f85f1c4e7ab56f3f015'
    );
  }, [vietmapApiKey]);

  // Fallback route coordinates if none provided
  const points = useMemo<MapCoordinate[]>(() => {
    if (routeCoords.length >= 2) return [...routeCoords];
    return [
      origin.coords,
      ...stops.filter((s) => s.coords).map((s) => s.coords!),
      destination.coords,
    ];
  }, [routeCoords, origin, destination, stops]);

  const currentCoord = points[currentStepIndex] || points[0];
  const nextCoord = points[currentStepIndex + 1] || points[points.length - 1];

  // Calculate bearing to rotate map in 3D direction of travel
  const bearing = useMemo(() => {
    if (!currentCoord || !nextCoord) return 0;
    const y = Math.sin(nextCoord.lng - currentCoord.lng) * Math.cos(nextCoord.lat);
    const x =
      Math.cos(currentCoord.lat) * Math.sin(nextCoord.lat) -
      Math.sin(currentCoord.lat) * Math.cos(nextCoord.lat) * Math.cos(nextCoord.lng - currentCoord.lng);
    const brng = (Math.atan2(y, x) * 180) / Math.PI;
    return (brng + 360) % 360;
  }, [currentCoord, nextCoord]);

  // Init 3D Cockpit Map
  useEffect(() => {
    if (!containerRef.current || !maplibregl) return;

    try {
      const styleUrl = `${VIETMAP_DEFAULT_STYLE}${resolvedApiKey}`;
      const map = new maplibregl.Map({
        container: containerRef.current,
        style: styleUrl,
        center: [currentCoord.lng, currentCoord.lat],
        zoom: 17,
        pitch: 60, // 3D Cockpit perspective
        bearing,
        interactive: true,
        attributionControl: false,
      });
      mapRef.current = map;

      map.on('load', () => {
        // Add Route Line
        const coordinates: [number, number][] = points.map((p) => [p.lng, p.lat]);
        map.addSource('nav-route', {
          type: 'geojson',
          data: {
            type: 'Feature',
            properties: {},
            geometry: {
              type: 'LineString',
              coordinates,
            },
          },
        });

        map.addLayer({
          id: 'nav-route-halo',
          type: 'line',
          source: 'nav-route',
          paint: {
            'line-color': '#0284C7',
            'line-width': 10,
            'line-opacity': 0.8,
          },
        });

        map.addLayer({
          id: 'nav-route-core',
          type: 'line',
          source: 'nav-route',
          paint: {
            'line-color': '#38BDF8',
            'line-width': 6,
          },
        });
      });

      return () => {
        if (mapRef.current) {
          mapRef.current.remove();
          mapRef.current = null;
        }
      };
    } catch {
      // Ignore WebGL initialization fallback
    }
  }, []);

  // Update position & bearing along journey
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !currentCoord) return;

    map.easeTo({
      center: [currentCoord.lng, currentCoord.lat],
      bearing,
      pitch: 60,
      zoom: 17,
      duration: 1000,
    });

    onLocationUpdate?.({
      lat: currentCoord.lat,
      lng: currentCoord.lng,
      heading: bearing,
      speed: simulatedSpeed,
    });
  }, [currentStepIndex, bearing, currentCoord]);

  // Simulation timer
  useEffect(() => {
    if (!isSimulating || points.length < 2) return;

    const interval = setInterval(() => {
      setCurrentStepIndex((prev) => {
        if (prev + 1 >= points.length) {
          clearInterval(interval);
          onNavigationFinished?.();
          return prev;
        }
        return prev + 1;
      });
    }, 3000);

    return () => clearInterval(interval);
  }, [isSimulating, points]);

  return (
    <View style={[styles.container, style]} testID={testID}>
      {/* 3D Map Container */}
      <div
        id={containerId}
        ref={containerRef}
        style={{ width: '100%', height: '100%', position: 'absolute', top: 0, left: 0 }}
      />

      {/* Top Turn-by-Turn Instruction Banner (Apple HIG / Vietmap Nav HUD) */}
      <View style={styles.topHudBanner}>
        <View style={styles.maneuverIconBox}>
          <Text style={styles.maneuverArrow}>⬆</Text>
        </View>
        <View style={styles.instructionTextWrap}>
          <Text style={styles.maneuverDistance}>Sau 350m</Text>
          <Text numberOfLines={1} style={styles.maneuverStreet}>
            Tiếp tục thẳng đến {destination.label}
          </Text>
        </View>
      </View>

      {/* Speedometer & Speed Limit */}
      <View style={styles.speedometerBox}>
        <Text style={styles.currentSpeedNumber}>{simulatedSpeed}</Text>
        <Text style={styles.speedUnitText}>km/h</Text>
      </View>

      {/* Bottom Mission Navigation Bar */}
      <View style={styles.bottomHudBar}>
        <View style={styles.tripMetricGroup}>
          <Text style={styles.tripEtaBig}>12:45</Text>
          <Text style={styles.tripSubInfo}>14 phút · 5.8 km</Text>
        </View>

        <View style={styles.hudActions}>
          <Pressable
            accessibilityLabel={isMuted ? 'Bật âm thanh chỉ dẫn' : 'Tắt âm thanh'}
            onPress={() => {
              const nextMuted = !isMuted;
              setIsMuted(nextMuted);
              onMuteToggle?.(nextMuted);
            }}
            style={[styles.hudActionButton, isMuted && styles.hudActionMuted]}
          >
            <Text style={styles.hudActionIcon}>{isMuted ? '🔇' : '🔊'}</Text>
          </Pressable>

          {onClose && (
            <Pressable
              accessibilityLabel="Thoát dẫn đường"
              onPress={onClose}
              style={[styles.hudActionButton, styles.hudActionExit]}
            >
              <Text style={styles.hudActionExitText}>✕ Thoát</Text>
            </Pressable>
          )}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    height: '100%',
    position: 'relative',
    overflow: 'hidden',
    backgroundColor: '#0F172A',
  },
  topHudBanner: {
    position: 'absolute',
    top: 16,
    left: 16,
    right: 16,
    backgroundColor: 'rgba(11, 37, 69, 0.95)',
    borderRadius: 16,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
    zIndex: 10,
  },
  maneuverIconBox: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#F59E0B',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  maneuverArrow: {
    fontSize: 24,
    fontWeight: '900',
    color: '#0B2545',
  },
  instructionTextWrap: {
    flex: 1,
  },
  maneuverDistance: {
    color: '#34D399',
    fontSize: 18,
    fontWeight: '800',
  },
  maneuverStreet: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
    marginTop: 2,
  },
  speedometerBox: {
    position: 'absolute',
    left: 16,
    bottom: 110,
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    width: 64,
    height: 64,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#0B2545',
    zIndex: 10,
  },
  currentSpeedNumber: {
    fontSize: 22,
    fontWeight: '900',
    color: '#0B2545',
    lineHeight: 24,
  },
  speedUnitText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#64748B',
  },
  bottomHudBar: {
    position: 'absolute',
    bottom: 16,
    left: 16,
    right: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.98)',
    borderRadius: 18,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    zIndex: 10,
  },
  tripMetricGroup: {
    flex: 1,
  },
  tripEtaBig: {
    fontSize: 24,
    fontWeight: '900',
    color: '#0B2545',
  },
  tripSubInfo: {
    fontSize: 14,
    fontWeight: '600',
    color: '#64748B',
    marginTop: 2,
  },
  hudActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  hudActionButton: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  hudActionMuted: {
    backgroundColor: '#FEE2E2',
  },
  hudActionIcon: {
    fontSize: 18,
  },
  hudActionExit: {
    backgroundColor: '#EF4444',
    paddingHorizontal: 14,
  },
  hudActionExitText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 13,
  },
});
