import React, { memo, useEffect, useRef } from 'react';
import { StyleSheet, View, useWindowDimensions } from 'react-native';
import {
  LeopardMapView,
  VietmapNavigationView,
  LeopardNavigationController,
  calculateDynamicVisibleCenterOffset,
} from '@leopard/mobile-core';
import { useDriverMapState } from './DriverMapDirectorContext';

export const DriverPersistentWorldMap = memo(function DriverPersistentWorldMap() {
  const { activeConfig, recenterNonce } = useDriverMapState();
  const { height: windowHeight } = useWindowDimensions();

  const prevNonce = useRef(recenterNonce);
  useEffect(() => {
    if (recenterNonce > prevNonce.current) {
      prevNonce.current = recenterNonce;
      LeopardNavigationController.recenter();
    }
  }, [recenterNonce]);

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
      {hasTurnByTurnPoints ? (
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
          bearing={activeConfig.bearing}
          destination={activeConfig.destination}
          followTruckLocation={activeConfig.followTruckLocation ?? isTurnByTurn}
          height="100%"
          interactive={activeConfig.interactive ?? true}
          mode={mapMode}
          origin={activeConfig.origin}
          pitch={activeConfig.pitch ?? (isTurnByTurn ? 55 : 0)}
          routeCoords={activeConfig.routeCoords}
          routeSegments={activeConfig.routeSegments}
          stops={activeConfig.stops}
          style={StyleSheet.absoluteFill}
          truckEtaLabel={activeConfig.truckEtaLabel}
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

