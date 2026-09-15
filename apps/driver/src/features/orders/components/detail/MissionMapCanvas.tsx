import React from 'react';
import { Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import { radius, spacing, leopardPalette, IconClock, IconRoute, RealInteractiveMap } from '@leopard/mobile-core';
import type { DriverTrackingView } from '../../model';

export type MissionMapCanvasProps = Readonly<{
  originLabel: string;
  destinationLabel: string;
  stops?: readonly { id: string; label: string }[];
  tracking: DriverTrackingView;
  distanceLabel: string;
  etaLabel?: string;
  navigationTarget?: { lat?: number; lng?: number; label?: string } | string;
  testID?: string;
}>;

export function openExternalNavigation(target: { lat?: number; lng?: number; label?: string } | string) {
  let query = '';
  if (typeof target === 'string') {
    query = target;
  } else if (typeof target?.lat === 'number' && typeof target?.lng === 'number') {
    query = `${target.lat},${target.lng}`;
  } else if (target?.label) {
    query = target.label;
  }
  const encoded = encodeURIComponent(query);
  const url = `https://www.google.com/maps/dir/?api=1&destination=${encoded}`;
  void Linking.openURL(url).catch(() => {});
}

export function MissionMapCanvas({
  originLabel,
  destinationLabel,
  stops,
  tracking,
  distanceLabel,
  etaLabel,
  navigationTarget,
  testID = 'route-map-schematic',
}: MissionMapCanvasProps) {
  const isStale =
    tracking.kind === 'stale' ||
    tracking.kind === 'offline' ||
    tracking.kind === 'reconnecting' ||
    tracking.kind === 'permission-denied';

  return (
    <View style={styles.mapCanvasContainer} testID={testID}>
      <RealInteractiveMap
        destination={{ label: destinationLabel }}
        height="100%"
        mode="tracking"
        origin={{ label: originLabel }}
        stops={stops?.map((s) => ({ id: s.id, label: s.label }))}
        truckEtaLabel={tracking.label}
      />

      {/* Floating Pill Top Right: Tracking Status */}
      <View style={styles.mapFloatingStatusPill}>
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

      {/* Floating Pill Bottom Left: ETA & Distance */}
      <View style={styles.mapFloatingEtaPill}>
        <IconClock color="#0B1E42" size={13} />
        <Text style={styles.mapFloatingEtaText}>
          {distanceLabel}{etaLabel ? ` · ${etaLabel}` : ''}
        </Text>
      </View>

      {/* Floating Quick Action Group Bottom Right */}
      <View style={styles.mapFloatingControlsGroup}>
        <Pressable
          accessibilityHint="Mở ứng dụng Google Maps để dẫn đường"
          accessibilityLabel="Mở Google Maps chỉ đường"
          accessibilityRole="button"
          onPress={() => openExternalNavigation(navigationTarget ?? destinationLabel)}
          style={({ pressed }) => [styles.mapFloatingQuickBtn, pressed ? styles.pressed : null]}
        >
          <IconRoute color="#0B1E42" size={18} />
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
  pressed: {
    opacity: 0.75,
  },
});
