import React, { memo } from 'react';
import { Platform, StyleSheet, View, useWindowDimensions } from 'react-native';
import {
  LeopardMapView,
  VietmapNavigationView,
  calculateDynamicVisibleCenterOffset,
} from '@leopard/mobile-core';
import { useDriverMapState } from './DriverMapDirectorContext';

export const DriverPersistentWorldMap = memo(function DriverPersistentWorldMap() {
  const { activeConfig } = useDriverMapState();
  const { height: windowHeight } = useWindowDimensions();


  if (!activeConfig || activeConfig.mode === 'hidden') {
    return null;
  }

  const isTurnByTurn = activeConfig.mode === 'turn-by-turn';

  const mapMode =
    isTurnByTurn
      ? 'tracking'
      : activeConfig.mode === 'overview'
      ? 'route'
      : activeConfig.mode === 'idle'
      ? 'location'
      : (activeConfig.mode as any) || 'location';

  const bottomInset = activeConfig.viewportInsets?.bottom ?? 0;
  const topInset = activeConfig.viewportInsets?.top ?? 0;
  const offsetY =
    bottomInset > 0
      ? calculateDynamicVisibleCenterOffset(windowHeight, bottomInset, topInset)
      : 0;

  const hasTurnByTurnPoints =
    isTurnByTurn &&
    Boolean(
      activeConfig.origin?.coords?.lat != null &&
      activeConfig.origin?.coords?.lng != null &&
      activeConfig.destination?.coords?.lat != null &&
      activeConfig.destination?.coords?.lng != null,
    );

  const shouldUseNativeNav = Platform.OS !== 'web' && hasTurnByTurnPoints;

  return (
    <View
      pointerEvents={activeConfig.interactive === false ? 'none' : 'auto'}
      style={[
        styles.container,
        offsetY !== 0
          ? {
              transform: [{ translateY: offsetY }],
              bottom: -Math.abs(offsetY) * 2,
            }
          : null,
      ]}
      testID="persistent-world-map"
    >
      {shouldUseNativeNav ? (
        <VietmapNavigationView
          destination={{
            label: activeConfig.destination!.label,
            coords: activeConfig.destination!.coords!,
          }}
          isSimulating={activeConfig.isSimulating ?? false}
          origin={{
            label: activeConfig.origin!.label,
            coords: activeConfig.origin!.coords!,
          }}
          routeCoords={activeConfig.routeCoords}
          speedAlertEnabled={true}
          stops={activeConfig.stops}
          style={StyleSheet.absoluteFill}
          testID="turn-by-turn-map"
          truckLocation={activeConfig.truckLocation}
          vehicleType={activeConfig.vehicleType ?? 'truck'}
        />
      ) : (
        <LeopardMapView
          bearing={Platform.OS === 'web' ? 0 : activeConfig.bearing}
          destination={activeConfig.destination}
          followTruckLocation={activeConfig.followTruckLocation ?? isTurnByTurn}
          height="100%"
          interactive={activeConfig.interactive ?? true}
          mode={mapMode}
          origin={activeConfig.origin}
          pitch={activeConfig.pitch ?? (isTurnByTurn ? 50 : 0)}
          routeCoords={activeConfig.routeCoords}
          routeSegments={activeConfig.routeSegments}
          stops={activeConfig.stops}
          style={StyleSheet.absoluteFill}
          truckEtaLabel={activeConfig.truckEtaLabel}
          truckHeading={activeConfig.truckHeading ?? activeConfig.bearing}
          truckLocation={activeConfig.truckLocation}
          zoom={activeConfig.zoom ?? (isTurnByTurn ? 17 : 14)}
          isPickupLeg={activeConfig.isPickupLeg}
        />
      )}
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFill,
    zIndex: 0,
  },
});

