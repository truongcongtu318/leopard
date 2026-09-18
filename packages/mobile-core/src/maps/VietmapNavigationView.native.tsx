import React, { useEffect, useMemo, useState } from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import type { VietmapNavigationProps, MapCoordinate } from './types';

const loadVietmapNav = () => {
  try {
    const r = typeof require !== 'undefined' ? require : null;
    return r ? r('@vietmap/vietmap-react-native-navigation') : null;
  } catch {
    return null;
  }
};
const VietmapNavModule = loadVietmapNav();
const VietMapNavigation: any = VietmapNavModule?.default || VietmapNavModule;
const VietMapNavigationController: any = VietmapNavModule?.VietMapNavigationController;

export const LeopardNavigationController = {
  recenter: () => {
    try {
      VietMapNavigationController?.recenter?.();
    } catch (_e) { /* noop */ }
  },
  overview: () => {
    try {
      VietMapNavigationController?.overView?.();
    } catch (_e) { /* noop */ }
  },
  finishNavigation: () => {
    try {
      VietMapNavigationController?.finishNavigation?.();
    } catch (_e) { /* noop */ }
  },
  startNavigation: () => {
    try {
      VietMapNavigationController?.startNavigation?.();
    } catch (_e) { /* noop */ }
  },
  buildRoute: (
    coordinates: { lat: number; lng: number }[],
    profile: 'truck' | 'driving-traffic' | 'motorcycle' | 'cycling' | 'walking' = 'truck',
  ) => {
    try {
      VietMapNavigationController?.buildRoute?.(
        coordinates.map((c) => ({ lat: c.lat, long: c.lng })),
        profile,
      );
    } catch (_e) { /* noop */ }
  },
  startSpeedAlert: () => {
    try {
      VietMapNavigationController?.startSpeedAlert?.();
    } catch (_e) { /* noop */ }
  },
  stopSpeedAlert: () => {
    try {
      VietMapNavigationController?.stopSpeedAlert?.();
    } catch (_e) { /* noop */ }
  },
  configureAlertAPI: (apiKey: string, apiID: string) => {
    try {
      VietMapNavigationController?.configureAlertAPI?.(apiKey, apiID);
    } catch (_e) { /* noop */ }
  },
};

export function VietmapNavigationView({
  origin,
  destination,
  stops = [],
  routeCoords = [],
  vietmapApiKey,
  vehicleType = 'truck',
  truckLocation,
  isSimulating = false,
  speechVoiceLanguage = 'vi-VN',
  speedAlertEnabled = false,
  apiKeyAlert,
  apiIDAlert,
  navigationZoomLevel = 17,
  navigationTiltAnchor = 0.8,
  onNavigationFinished,
  onReroute,
  onLocationUpdate,
  onRouteProgress,
  onMilestoneEvent,
  onWaypointArrival,
  onMuteToggle,
  onClose,
  testID = 'vietmap-navigation-view',
  style,
}: VietmapNavigationProps) {
  const [isMuted, setIsMuted] = useState(false);

  const resolvedApiKey = useMemo(() => {
    return (
      vietmapApiKey ||
      (typeof process !== 'undefined' && process.env?.EXPO_PUBLIC_VIETMAP_API_KEY) ||
      'c3d607a7ed780824b223d6a6bbec8f85f1c4e7ab56f3f015'
    );
  }, [vietmapApiKey]);

  const profile = useMemo<'truck' | 'driving-traffic' | 'motorcycle' | 'cycling' | 'walking'>(() => {
    const v = (vehicleType || '').toLowerCase();
    if (v.includes('bike') || v.includes('motor') || v.includes('xe_may')) return 'motorcycle';
    if (v.includes('cycle') || v.includes('dap')) return 'cycling';
    if (v.includes('walk') || v.includes('bo')) return 'walking';
    if (v.includes('truck') || v.includes('tai') || v.includes('container') || v.includes('trailer')) return 'truck';
    return 'driving-traffic';
  }, [vehicleType]);

  const startPoint = truckLocation || origin.coords;

  const handleMapReady = () => {
    try {
      if (VietMapNavigationController?.buildRoute) {
        const validStops = stops
          .filter((s) => s.coords)
          .map((s) => ({ lat: s.coords!.lat, long: s.coords!.lng }));
        const coords = [
          { lat: startPoint.lat, long: startPoint.lng },
          ...validStops,
          { lat: destination.coords.lat, long: destination.coords.lng },
        ];
        VietMapNavigationController.buildRoute(coords, profile);
      }
      if (speedAlertEnabled && apiKeyAlert && apiIDAlert && VietMapNavigationController?.configureAlertAPI) {
        VietMapNavigationController.configureAlertAPI(apiKeyAlert, apiIDAlert);
        VietMapNavigationController.startSpeedAlert?.();
      }
    } catch (e) {
      console.warn('[VietmapNavigationView] onMapReady error:', e);
    }
  };

  const handleRouteBuilt = () => {
    try {
      VietMapNavigationController?.startNavigation?.();
    } catch (e) {
      console.warn('[VietmapNavigationView] onRouteBuilt error:', e);
    }
  };

  const handleRouteProgress = (event: any) => {
    const raw = event?.nativeEvent || event;
    const data = raw?.data || raw;
    onRouteProgress?.({
      distanceRemaining: raw?.distanceRemaining,
      durationRemaining: raw?.durationRemaining,
      distanceToNextTurn: raw?.distanceToNextTurn,
      currentStepInstruction: data?.currentStepInstruction,
      currentModifier: data?.currentModifier,
      currentModifierType: data?.currentModifierType,
    });
    if (data?.latitude && data?.longitude) {
      onLocationUpdate?.({
        lat: data.latitude,
        lng: data.longitude,
        heading: data.heading,
        speed: data.speed,
      });
    }
  };

  const isTestEnv = typeof process !== 'undefined' && process.env?.NODE_ENV === 'test';

  if (VietMapNavigation && typeof VietMapNavigation === 'function' && !isTestEnv) {
    return (
      <View style={[styles.container, style]} testID={testID}>
        <VietMapNavigation
          apiKey={resolvedApiKey}
          apiKeyAlert={apiKeyAlert}
          apiIDAlert={apiIDAlert}
          initialLatLngZoom={{
            lat: startPoint.lat,
            lng: startPoint.lng,
            zoom: navigationZoomLevel,
          }}
          navigationTiltAnchor={navigationTiltAnchor}
          navigationZoomLevel={navigationZoomLevel}
          onArrival={onNavigationFinished}
          onMapReady={handleMapReady}
          onMilestoneEvent={onMilestoneEvent}
          onNavigationCancelled={onNavigationFinished}
          onNavigationFinished={onNavigationFinished}
          onReroute={onReroute}
          onRouteBuilt={handleRouteBuilt}
          onRouteProgressChange={handleRouteProgress}
          onUserOffRoute={onReroute}
          onWaypointArrival={onWaypointArrival}
          shouldSimulateRoute={isSimulating}
          style={StyleSheet.absoluteFill}
        />

        {onClose && (
          <Pressable
            accessibilityLabel="Thoát dẫn đường"
            onPress={onClose}
            style={styles.floatingCloseButton}
          >
            <Text style={styles.floatingCloseText}>✕ Thoát</Text>
          </Pressable>
        )}
      </View>
    );
  }

  // Native test / fallback HUD representation
  return (
    <View style={[styles.container, styles.fallbackContainer, style]} testID={testID}>
      {/* Top Banner */}
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

      {/* Speedometer */}
      <View style={styles.speedometerBox}>
        <Text style={styles.currentSpeedNumber}>42</Text>
        <Text style={styles.speedUnitText}>km/h</Text>
      </View>

      {/* Bottom Bar */}
      <View style={styles.bottomHudBar}>
        <View style={styles.tripMetricGroup}>
          <Text style={styles.tripEtaBig}>12:45</Text>
          <Text style={styles.tripSubInfo}>14 phút · 5.8 km</Text>
        </View>

        <View style={styles.hudActions}>
          <Pressable
            accessibilityLabel={isMuted ? 'Bật âm thanh' : 'Tắt âm thanh'}
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
    backgroundColor: '#0F172A',
  },
  fallbackContainer: {
    justifyContent: 'space-between',
    padding: 16,
  },
  topHudBanner: {
    backgroundColor: 'rgba(11, 37, 69, 0.95)',
    borderRadius: 16,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    elevation: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
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
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    width: 64,
    height: 64,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#0B2545',
    elevation: 5,
  },
  currentSpeedNumber: {
    fontSize: 22,
    fontWeight: '900',
    color: '#0B2545',
  },
  speedUnitText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#64748B',
  },
  bottomHudBar: {
    backgroundColor: 'rgba(255, 255, 255, 0.98)',
    borderRadius: 18,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    elevation: 10,
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
  floatingCloseButton: {
    position: 'absolute',
    top: 20,
    right: 20,
    backgroundColor: '#EF4444',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    elevation: 6,
  },
  floatingCloseText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 13,
  },
});
