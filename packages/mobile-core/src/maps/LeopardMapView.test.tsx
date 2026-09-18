import React from 'react';
import { describe, expect, it } from '@jest/globals';
import { render } from '@testing-library/react-native';

import { LeopardMapView } from './LeopardMapView';
import { LeopardMapView as WebLeopardMapView, buildVietmapHtml } from './LeopardMapView.web';
import { VietmapNavigationView } from './VietmapNavigationView';

describe('LeopardMapView and VietmapNavigationView', () => {
  it('renders LeopardMapView with origin and destination', async () => {
    const screen = await render(
      <LeopardMapView
        destination={{ label: 'Kho Q7', coords: { lat: 10.7325, lng: 106.7351 } }}
        origin={{ label: 'Kho Q12', coords: { lat: 10.8421, lng: 106.6192 } }}
        routeCoords={[
          { lat: 10.8421, lng: 106.6192 },
          { lat: 10.7325, lng: 106.7351 },
        ]}
        testID="test-leopard-map"
      />,
    );

    expect(screen.getByTestId('test-leopard-map')).toBeTruthy();
    await screen.unmount();
  });

  it('renders Web LeopardMapView with Vietmap Vector GL badge', async () => {
    const screen = await render(
      <WebLeopardMapView
        destination={{ label: 'Kho Q7', coords: { lat: 10.7325, lng: 106.7351 } }}
        origin={{ label: 'Kho Q12', coords: { lat: 10.8421, lng: 106.6192 } }}
        routeCoords={[
          { lat: 10.8421, lng: 106.6192 },
          { lat: 10.7325, lng: 106.7351 },
        ]}
        testID="test-web-map"
      />,
    );

    expect(screen.getByTestId('test-web-map')).toBeTruthy();
    expect(screen.getByText('VIETMAP VECTOR GL')).toBeTruthy();
    await screen.unmount();
  });

  it('renders VietmapNavigationView in simulated navigation mode', async () => {
    const screen = await render(
      <VietmapNavigationView
        destination={{ label: 'Kho Q7', coords: { lat: 10.7325, lng: 106.7351 } }}
        isSimulating={false}
        origin={{ label: 'Kho Q12', coords: { lat: 10.8421, lng: 106.6192 } }}
        routeCoords={[
          { lat: 10.8421, lng: 106.6192 },
          { lat: 10.7325, lng: 106.7351 },
        ]}
        testID="test-vietmap-nav"
      />,
    );

    expect(screen.getByTestId('test-vietmap-nav')).toBeTruthy();
    await screen.unmount();
  });

  describe('buildVietmapHtml — Zero Leaflet & Pure MapLibre Vector GL contract', () => {
    it('never contains Leaflet library, Leaflet CSS or Leaflet references in the HTML output', () => {
      const html = buildVietmapHtml({
        resolvedApiKey: 'test-api-key',
        centerCoords: [106.66, 10.76],
        mapInstanceId: 'test-instance',
        originCoords: { lat: 10.8421, lng: 106.6192 },
        destCoords: { lat: 10.7325, lng: 106.7351 },
        mode: 'route',
      });

      // Strict contract: Absolutely NO Leaflet!
      expect(html.toLowerCase()).not.toContain('leaflet');
      expect(html).not.toContain('L.map');
      expect(html).not.toContain('L.tileLayer');
      expect(html).not.toContain('L.marker');

      // Must contain MapLibre GL and Vietmap Vector GL
      expect(html).toContain('maplibre-gl.js');
      expect(html).toContain('maplibre-gl.css');
      expect(html).toContain('maps.vietmap.vn/api/maps/light/styles.json?apikey=test-api-key');
      expect(html).toContain('VIETMAP VECTOR GL');
    });

    it('renders route layers, truck marker, and nearby drivers in Vietmap Vector GL', () => {
      const html = buildVietmapHtml({
        resolvedApiKey: 'test-api-key',
        centerCoords: [106.66, 10.76],
        mapInstanceId: 'test-tracking',
        mode: 'tracking',
        truckLocation: { lat: 10.78, lng: 106.68 },
        displayEta: 'ETA: 15 phút',
        nearbyDrivers: [
          { id: 'd1', lat: 10.781, lng: 106.681, vehicleType: 'VAN' },
          { id: 'd2', lat: 10.779, lng: 106.679, vehicleType: 'TRUCK' },
        ],
        routeGeoJSON: {
          type: 'FeatureCollection',
          features: [
            {
              type: 'Feature',
              properties: { color: '#0B2545' },
              geometry: {
                type: 'LineString',
                coordinates: [
                  [106.66, 10.76],
                  [106.68, 10.78],
                ],
              },
            },
          ],
        },
      });

      expect(html.toLowerCase()).not.toContain('leaflet');
      expect(html).toContain('vietmap-route-halo');
      expect(html).toContain('vietmap-route-core');
      expect(html).toContain('svg-route-overlay');
      expect(html).toContain('svg-route-halo');
      expect(html).toContain('svg-route-core');
      expect(html).toContain('ETA: 15 phút');
      expect(html).toContain('nearby-driver-badge');
    });

    it('supports overview framing and turn-by-turn 3D follow for the driver cockpit', () => {
      const overview = buildVietmapHtml({
        resolvedApiKey: 'test-api-key',
        centerCoords: [106.677, 10.787],
        mapInstanceId: 'ovw',
        originCoords: { lat: 10.8421, lng: 106.6192 },
        destCoords: { lat: 10.7325, lng: 106.7351 },
        mode: 'route',
        followTruck: false,
      });
      const turnByTurn = buildVietmapHtml({
        resolvedApiKey: 'test-api-key',
        centerCoords: [106.677, 10.787],
        mapInstanceId: 'tbt',
        originCoords: { lat: 10.8421, lng: 106.6192 },
        destCoords: { lat: 10.7325, lng: 106.7351 },
        truckLocation: { lat: 10.83, lng: 106.64 },
        mode: 'tracking',
        zoom: 17,
        pitch: 55,
        bearing: 120,
        followTruck: true,
      });

      // Overview frames the whole A → B route instead of locking on the vehicle.
      expect(overview).toContain("var drivingMode = 'overview';");
      expect(overview).toContain('fitRouteBounds');

      // Turn-by-turn starts in driving mode, follows the vehicle in 3D and keeps the
      // route line visible through the dual engine (SVG overlay + WebGL layers).
      expect(turnByTurn).toContain("var drivingMode = 'driving';");
      expect(turnByTurn).toContain('var lastTruckLngLat = [106.64, 10.83];');
      expect(turnByTurn).toContain('zoom: 17,');
      expect(turnByTurn).toContain('pitch: 55,');
      expect(turnByTurn).toContain('bearing: 120,');
      expect(turnByTurn).toContain('function followTruck(duration)');
      expect(turnByTurn).toContain('LEOPARD_MAP_SET_VIEW_MODE');
      expect(turnByTurn).toContain('LEOPARD_MAP_RECENTER');
      expect(turnByTurn).toContain('svg-route-overlay');

      // The driving camera is biased along the road ahead. Centring exactly on
      // the vehicle at zoom 17 / pitch 55 pushed the route line off-screen, so
      // the driver saw only a truck icon with no route.
      expect(turnByTurn).toContain('function computeAheadCenter()');
      expect(turnByTurn).toContain('center: computeAheadCenter() || target');

      // Both modes stay Leaflet-free.
      expect(overview.toLowerCase()).not.toContain('leaflet');
      expect(turnByTurn.toLowerCase()).not.toContain('leaflet');
    });

    it('emits a syntactically valid script so the route line actually renders', () => {
      const html = buildVietmapHtml({
        resolvedApiKey: 'test-api-key',
        centerCoords: [106.677, 10.787],
        mapInstanceId: 'syntax',
        originCoords: { lat: 10.8421, lng: 106.6192 },
        destCoords: { lat: 10.7325, lng: 106.7351 },
        truckLocation: { lat: 10.83, lng: 106.64 },
        mode: 'tracking',
        followTruck: true,
        routeGeoJSON: {
          type: 'FeatureCollection',
          features: [
            {
              type: 'Feature',
              properties: { color: '#0B2545' },
              geometry: {
                type: 'LineString',
                coordinates: [
                  [106.6192, 10.8421],
                  [106.64, 10.83],
                  [106.7351, 10.7325],
                ],
              },
            },
          ],
        },
      });

      // A syntax error inside the injected script silently kills every layer,
      // leaving a bare basemap. Parse it so that failure mode cannot return.
      const script = html.match(/<script>([\s\S]*)<\/script>/);
      expect(script).not.toBeNull();
      expect(() => new Function(script![1])).not.toThrow();

      // The real multi-point geometry is embedded, not just the two endpoints.
      expect(html).toContain('106.64,10.83');
      expect(html).toContain('vietmap-route');
    });

    it('supports interactive pin picker mode with postMessage feedback', () => {
      const html = buildVietmapHtml({
        resolvedApiKey: 'test-api-key',
        centerCoords: [106.66, 10.76],
        mapInstanceId: 'test-pin-picker',
        mode: 'pin',
        interactive: true,
      });

      expect(html.toLowerCase()).not.toContain('leaflet');
      expect(html).toContain('pin-picker-wrap');
      expect(html).toContain('LEOPARD_MAP_PIN_MOVED');
      expect(html).toContain('test-pin-picker');
    });
  });
});
