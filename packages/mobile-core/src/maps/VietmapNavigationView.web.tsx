import React, { memo } from 'react';
import { StyleSheet, View } from 'react-native';

import type { VietmapNavigationProps } from './types';
import { LeopardMapView } from './LeopardMapView.web';
import { postMapMessageToFrames } from '../ui/RealInteractiveMap';

export const LeopardNavigationController = {
  recenter: () => {
    postMapMessageToFrames({ type: 'LEOPARD_MAP_RECENTER' });
  },
  overview: () => {
    postMapMessageToFrames({
      type: 'LEOPARD_MAP_SET_VIEW_MODE',
      mode: 'overview',
    });
  },
  finishNavigation: () => {},
  startNavigation: () => {
    postMapMessageToFrames({
      type: 'LEOPARD_MAP_SET_VIEW_MODE',
      mode: 'driving',
    });
  },
  buildRoute: (_coordinates: { lat: number; lng: number }[], _profile?: string) => {},
  startSpeedAlert: () => {},
  stopSpeedAlert: () => {},
  configureAlertAPI: (_apiKey: string, _apiID: string) => {},
};

export const VietmapNavigationView = memo(function VietmapNavigationView({
  origin,
  destination,
  stops = [],
  routeCoords = [],
  truckLocation,
  vietmapApiKey,
  testID = 'vietmap-navigation-view',
  style,
}: VietmapNavigationProps) {
  return (
    <View style={[styles.container, style]} testID={testID}>
      <LeopardMapView
        destination={destination}
        followTruckLocation={true}
        height="100%"
        interactive={true}
        mode="tracking"
        origin={origin}
        pitch={55}
        routeCoords={routeCoords}
        stops={stops}
        style={StyleSheet.absoluteFill}
        truckLocation={truckLocation}
        vietmapApiKey={vietmapApiKey}
        zoom={17.5}
      />
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F172A',
    overflow: 'hidden',
    position: 'relative',
  },
});
