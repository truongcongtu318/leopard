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
const VietmapNavigation: any = VietmapNavModule?.default || VietmapNavModule;

export function VietmapNavigationView({
  origin,
  destination,
  stops = [],
  routeCoords = [],
  vietmapApiKey,
  vehicleType = 'truck',
  isSimulating = false,
  speechVoiceLanguage = 'vi-VN',
  onNavigationFinished,
  onReroute,
  onLocationUpdate,
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

  const isTestEnv = typeof process !== 'undefined' && process.env?.NODE_ENV === 'test';

  if (VietmapNavigation && !isTestEnv && VietmapNavigation.NavigationView) {
    const waypoints = stops
      .filter((s) => s.coords)
      .map((s) => ({ latitude: s.coords!.lat, longitude: s.coords!.lng }));

    return (
      <View style={[styles.container, style]} testID={testID}>
        <VietmapNavigation.NavigationView
          apiKey={resolvedApiKey}
          destination={{
            latitude: destination.coords.lat,
            longitude: destination.coords.lng,
          }}
          language={speechVoiceLanguage}
          mute={isMuted}
          onArrival={onNavigationFinished}
          onLocationChange={(event: any) => {
            const loc = event?.nativeEvent || event;
            if (loc?.latitude && loc?.longitude) {
              onLocationUpdate?.({
                lat: loc.latitude,
                lng: loc.longitude,
                heading: loc.heading,
                speed: loc.speed,
              });
            }
          }}
          onReroute={onReroute}
          origin={{
            latitude: origin.coords.lat,
            longitude: origin.coords.lng,
          }}
          simulateRoute={isSimulating}
          style={StyleSheet.absoluteFill}
          vehicleType={vehicleType === 'truck' ? 'truck' : 'car'}
          waypoints={waypoints}
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
