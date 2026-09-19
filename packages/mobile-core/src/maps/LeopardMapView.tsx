import React from 'react';
import { Platform } from 'react-native';

import type { LeopardMapViewProps } from './types';
import { LeopardMapView as NativeMap } from './LeopardMapView.native';
import { RealInteractiveMap } from '../ui/RealInteractiveMap';

export function LeopardMapView(props: LeopardMapViewProps) {
  if (Platform.OS === 'web') {
    return (
      <RealInteractiveMap
        destination={props.destination}
        height={props.height}
        initialPinCoords={props.initialPinCoords}
        interactive={props.interactive}
        mode={props.mode as any}
        nearbyDrivers={props.nearbyDrivers}
        onLocationChange={props.onLocationChange}
        origin={props.origin}
        routeCoords={props.routeCoords as any}
        routeResolutionPolicy={props.routeResolutionPolicy}
        routeSegments={props.routeSegments}
        stops={props.stops}
        style={props.style}
        testID={props.testID}
        title={props.title}
        truckEtaLabel={props.truckEtaLabel}
        truckEtaMinutes={props.truckEtaMinutes}
        truckLocation={props.truckLocation}
        vietmapApiKey={props.vietmapApiKey}
      />
    );
  }
  return <NativeMap {...props} />;
}

