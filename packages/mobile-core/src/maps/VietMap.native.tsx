import React from 'react';
import { LeopardMapView as NativeMap } from './LeopardMapView.native';
import type { VietMapWebProps } from './VietMap.web';

export function VietMapWeb(props: VietMapWebProps) {
  return (
    <NativeMap
      bearing={props.bearing}
      destination={props.destination}
      truckEtaLabel={props.displayEta}
      followTruckLocation={props.followTruck}
      height={props.height}
      interactive={props.interactive}
      maxBounds={props.maxBounds}
      maxZoom={props.maxZoom}
      minZoom={props.minZoom}
      mode={props.mode}
      nearbyDrivers={props.nearbyDrivers}
      onLocationChange={props.onLocationChange}
      origin={props.origin}
      pitch={props.pitch}
      routeCoords={props.routeGeoJSON?.features?.[0]?.geometry?.coordinates?.map(([lng, lat]: [number, number]) => ({ lat, lng }))}
      stops={props.stops}
      style={props.style}
      testID={props.testID}
      truckLocation={props.truckLocation}
      vietmapApiKey={props.vietmapApiKey}
      zoom={props.zoom}
    />
  );
}
