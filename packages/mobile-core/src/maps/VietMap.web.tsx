import React, { useEffect, useId, useImperativeHandle, useMemo, useRef } from 'react';
import { StyleSheet, View } from 'react-native';
import * as maplibregl from 'maplibre-gl';

if (typeof document !== 'undefined') {
  const CSS_ID = 'maplibre-gl-css';
  if (!document.getElementById(CSS_ID)) {
    const link = document.createElement('link');
    link.id = CSS_ID;
    link.rel = 'stylesheet';
    link.href = 'https://unpkg.com/maplibre-gl@4.7.1/dist/maplibre-gl.css';
    document.head.appendChild(link);
  }
}

import type { LeopardMapMode, MapCoordinate, MapStop, NearbyDriver, RoutePolylineSegment } from './types';
import { DEFAULT_FALLBACK_BASEMAP_STYLE, VIETMAP_DEFAULT_STYLE_ENDPOINT } from './basemap-styles';

const VIETMAP_DEFAULT_STYLE = VIETMAP_DEFAULT_STYLE_ENDPOINT;

export interface VietMapHandle {
  getMap: () => maplibregl.Map | null;
  recenter: (coords?: MapCoordinate) => void;
  fitBounds: (coords: [number, number][]) => void;
}

export interface VietMapWebProps {
  mode?: LeopardMapMode;
  origin?: { label: string; coords?: MapCoordinate };
  destination?: { label: string; coords?: MapCoordinate };
  stops?: readonly MapStop[];
  truckLocation?: MapCoordinate;
  truckBearing?: number;
  displayEta?: string;
  routeGeoJSON?: any;
  routeSegments?: readonly RoutePolylineSegment[];
  nearbyDrivers?: readonly NearbyDriver[];
  centerCoords?: [number, number];
  zoom?: number;
  minZoom?: number;
  maxZoom?: number;
  maxBounds?: [[number, number], [number, number]];
  bearing?: number;
  pitch?: number;
  interactive?: boolean;
  followTruck?: boolean;
  vietmapApiKey?: string;
  height?: number | string;
  style?: any;
  testID?: string;
  onMapClick?: (coords: MapCoordinate) => void;
  onLocationChange?: (coords: MapCoordinate) => void;
  mapRef?: React.Ref<VietMapHandle>;
}

export function VietMapWeb({
  mode = 'route',
  origin,
  destination,
  stops = [],
  truckLocation,
  truckBearing = 0,
  displayEta,
  routeGeoJSON,
  nearbyDrivers = [],
  centerCoords = [106.7009, 10.7769],
  zoom = 14,
  minZoom,
  maxZoom = 19,
  maxBounds,
  bearing = 0,
  pitch = 0,
  interactive = true,
  followTruck = false,
  vietmapApiKey,
  height = '100%',
  style,
  testID = 'vietmap-web-canvas',
  onMapClick,
  onLocationChange,
  mapRef,
}: VietMapWebProps) {
  const containerId = useId().replace(/:/g, '_');
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<maplibregl.Map | null>(null);

  const originMarkerRef = useRef<maplibregl.Marker | null>(null);
  const destMarkerRef = useRef<maplibregl.Marker | null>(null);
  const stopMarkersRef = useRef<maplibregl.Marker[]>([]);
  const truckMarkerRef = useRef<maplibregl.Marker | null>(null);
  const driverMarkersRef = useRef<Map<string, maplibregl.Marker>>(new Map());
  const pinMarkerRef = useRef<maplibregl.Marker | null>(null);

  const resolvedApiKey = useMemo(
    () =>
      vietmapApiKey ||
      (typeof process !== 'undefined' && process.env?.EXPO_PUBLIC_VIETMAP_API_KEY) ||
      'c3d607a7ed780824b223d6a6bbec8f85f1c4e7ab56f3f015',
    [vietmapApiKey],
  );

  const defaultMinZoom = mode === 'tracking' ? 8.5 : 7.5;
  const effectiveMinZoom = typeof minZoom === 'number' ? minZoom : defaultMinZoom;
  const defaultMaxBounds: [[number, number], [number, number]] = [
    [101.0, 7.5],
    [111.5, 24.5],
  ];
  const effectiveMaxBounds = maxBounds ?? defaultMaxBounds;

  // Expose imperative controller methods
  useImperativeHandle(mapRef, () => ({
    getMap: () => mapInstanceRef.current,
    recenter: (coords?: MapCoordinate) => {
      const map = mapInstanceRef.current;
      if (!map) return;
      const target = coords
        ? [coords.lng, coords.lat] as [number, number]
        : truckLocation
        ? [truckLocation.lng, truckLocation.lat] as [number, number]
        : centerCoords;
      map.easeTo({ center: target, zoom: Math.max(map.getZoom(), 16), duration: 800 });
    },
    fitBounds: (coords: [number, number][]) => {
      const map = mapInstanceRef.current;
      if (!map || coords.length < 2) return;
      const bounds = new maplibregl.LngLatBounds(coords[0], coords[0]);
      for (const pt of coords) bounds.extend(pt);
      map.fitBounds(bounds, { padding: 48, maxZoom: 17, duration: 1000 });
    },
  }));

  // 1. Initialize MapLibre GL instance
  useEffect(() => {
    if (!containerRef.current) return;

    // 1. ALWAYS initialize with local in-memory basemap so map NEVER renders white on 401/423
    const map = new maplibregl.Map({
      container: containerRef.current,
      style: DEFAULT_FALLBACK_BASEMAP_STYLE,
      center: centerCoords,
      zoom,
      minZoom: effectiveMinZoom,
      maxZoom,
      maxBounds: effectiveMaxBounds,
      bearing,
      pitch,
      interactive,
      attributionControl: false,
    });
    mapInstanceRef.current = map;

    map.on('error', (e) => {
      console.warn('[VietMapWeb] Map error caught:', e?.error?.message || e);
    });

    if (interactive && mode === 'pin') {
      map.addControl(new maplibregl.NavigationControl({ showCompass: true }), 'top-right');
    }

    const onStyleLoad = () => {
      // Set up route sources & layers immediately
      if (routeGeoJSON) {
        applyRouteLayers(map, routeGeoJSON);
      }
    };

    if (map.isStyleLoaded()) {
      onStyleLoad();
    } else {
      map.once('style.load', onStyleLoad);
    }

    // 2. Seamless background upgrade to Vietmap vector tiles if API key is active
    if (resolvedApiKey && !resolvedApiKey.includes('test-api-key') && resolvedApiKey.trim().length > 10) {
      const styleUrl = `${VIETMAP_DEFAULT_STYLE_ENDPOINT}${resolvedApiKey}`;
      fetch(styleUrl)
        .then((res) => {
          if (!res.ok) throw new Error(`Vietmap style HTTP ${res.status}`);
          return res.json();
        })
        .then((styleJson) => {
          if (mapInstanceRef.current && styleJson && styleJson.version) {
            map.setStyle(styleJson);
            map.once('style.load', () => {
              if (routeGeoJSON) {
                applyRouteLayers(map, routeGeoJSON);
              }
            });
          }
        })
        .catch((err) => {
          console.warn('[VietMapWeb] Vietmap vector style unavailable, using resilient basemap:', err?.message);
        });
    }

    if (mode === 'pin') {
      map.on('move', () => {
        const c = map.getCenter();
        onLocationChange?.({ lat: c.lat, lng: c.lng });
      });
      map.on('click', (e: any) => {
        onMapClick?.({ lat: e.lngLat.lat, lng: e.lngLat.lng });
      });
    }

    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, []);

  // Helper to add or update route layers below first symbol
  const applyRouteLayers = (map: maplibregl.Map, geo: any) => {
    if (!map || !geo) return;
    try {
      const w = (b: number) =>
        ['interpolate', ['exponential', 1.5], ['zoom'], 10, b * 0.3, 18, b * 2.2] as any;
      const layout = { 'line-cap': 'round', 'line-join': 'round' } as any;
      const firstSymbol = (map.getStyle().layers as any[])?.find((l: any) => l.type === 'symbol')?.id;

      if (map.getSource('route')) {
        (map.getSource('route') as maplibregl.GeoJSONSource).setData(geo);
      } else {
        map.addSource('route', { type: 'geojson', data: geo });

        map.addLayer(
          {
            id: 'route-casing',
            type: 'line',
            source: 'route',
            layout,
            paint: {
              'line-color': '#0B3D91',
              'line-width': w(9),
            },
          },
          firstSymbol,
        );

        map.addLayer(
          {
            id: 'route-line',
            type: 'line',
            source: 'route',
            layout,
            paint: {
              'line-color': ['coalesce', ['get', 'color'], '#2F7BFF'],
              'line-width': w(6),
            },
          },
          firstSymbol,
        );
      }
    } catch (err) {
      console.warn('[VietMapWeb] Route layer update warning:', err);
    }
  };

  // 2. React to routeGeoJSON updates
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !routeGeoJSON) return;
    if (map.isStyleLoaded()) {
      applyRouteLayers(map, routeGeoJSON);
    } else {
      map.once('style.load', () => applyRouteLayers(map, routeGeoJSON));
    }
  }, [routeGeoJSON]);

  // 3. Origin & Destination Markers (Anchored to bottom)
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    // Origin
    if (origin?.coords) {
      if (!originMarkerRef.current) {
        const el = document.createElement('div');
        el.className = 'origin-pin-marker';
        el.innerHTML = `
          <div style="display:flex;flex-direction:column;align-items:center;transform:translateY(2px);">
            <div style="background:#10B981;border:2px solid #FFFFFF;box-shadow:0 3px 8px rgba(0,0,0,0.25);width:32px;height:32px;border-radius:16px;display:flex;align-items:center;justify-content:center;">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                <path d="M12 22s-8-4.5-8-11.8A8 8 0 0 1 12 2a8 8 0 0 1 8 8.2c0 7.3-8 11.8-8 11.8z"/>
                <circle cx="12" cy="10" r="3"/>
              </svg>
            </div>
            <div style="width:2px;height:6px;background:#10B981;"></div>
          </div>
        `;
        originMarkerRef.current = new maplibregl.Marker({ element: el, anchor: 'bottom' })
          .setLngLat([origin.coords.lng, origin.coords.lat])
          .addTo(map);
      } else {
        originMarkerRef.current.setLngLat([origin.coords.lng, origin.coords.lat]);
      }
    } else if (originMarkerRef.current) {
      originMarkerRef.current.remove();
      originMarkerRef.current = null;
    }

    // Destination
    if (destination?.coords) {
      if (!destMarkerRef.current) {
        const el = document.createElement('div');
        el.className = 'dest-pin-marker';
        el.innerHTML = `
          <div style="display:flex;flex-direction:column;align-items:center;transform:translateY(2px);">
            <div style="background:#EF4444;border:2px solid #FFFFFF;box-shadow:0 3px 8px rgba(0,0,0,0.25);width:32px;height:32px;border-radius:16px;display:flex;align-items:center;justify-content:center;">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                <path d="M12 22s-8-4.5-8-11.8A8 8 0 0 1 12 2a8 8 0 0 1 8 8.2c0 7.3-8 11.8-8 11.8z"/>
                <circle cx="12" cy="10" r="3"/>
              </svg>
            </div>
            <div style="width:2px;height:6px;background:#EF4444;"></div>
          </div>
        `;
        destMarkerRef.current = new maplibregl.Marker({ element: el, anchor: 'bottom' })
          .setLngLat([destination.coords.lng, destination.coords.lat])
          .addTo(map);
      } else {
        destMarkerRef.current.setLngLat([destination.coords.lng, destination.coords.lat]);
      }
    } else if (destMarkerRef.current) {
      destMarkerRef.current.remove();
      destMarkerRef.current = null;
    }
  }, [origin?.coords, destination?.coords]);

  // 4. Intermediate Stops Markers
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    // Clean up old markers
    for (const m of stopMarkersRef.current) m.remove();
    stopMarkersRef.current = [];

    stops.forEach((stop, index) => {
      if (!stop.coords) return;
      const el = document.createElement('div');
      el.innerHTML = `
        <div style="background:#F59E0B;border:2px solid #FFFFFF;box-shadow:0 2px 6px rgba(0,0,0,0.2);width:26px;height:26px;border-radius:13px;display:flex;align-items:center;justify-content:center;color:#FFFFFF;font-weight:700;font-size:12px;">
          ${index + 1}
        </div>
      `;
      const marker = new maplibregl.Marker({ element: el, anchor: 'center' })
        .setLngLat([stop.coords.lng, stop.coords.lat])
        .addTo(map);
      stopMarkersRef.current.push(marker);
    });
  }, [stops]);

  // 5. Vehicle (Truck) Marker with map-aligned rotation and subtle single-ring pulse
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    if (truckLocation) {
      if (!truckMarkerRef.current) {
        const el = document.createElement('div');
        el.className = 'truck-marker-wrap';
        el.innerHTML = `
          <div style="position:relative;display:flex;align-items:center;justify-content:center;width:44px;height:44px;">
            <div style="position:absolute;width:40px;height:40px;border-radius:20px;background:rgba(37,99,235,0.2);animation:vietmap-pulse 2s infinite ease-out;"></div>
            <div class="truck-nav-arrow" style="width:34px;height:34px;border-radius:17px;background:#0B2545;border:2.5px solid #FFFFFF;box-shadow:0 4px 10px rgba(0,0,0,0.3);display:flex;align-items:center;justify-content:center;">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                <path d="M12 2L20 20L12 16.5L4 20L12 2Z" fill="#38BDF8" stroke="#FFFFFF" stroke-width="1.5" stroke-linejoin="round"/>
              </svg>
            </div>
            ${displayEta ? `<div class="truck-eta-tag" style="position:absolute;bottom:-18px;background:rgba(11,37,69,0.92);color:#FFFFFF;font-size:11px;font-weight:600;padding:2px 6px;border-radius:6px;white-space:nowrap;box-shadow:0 2px 6px rgba(0,0,0,0.2);">${displayEta}</div>` : ''}
          </div>
        `;
        truckMarkerRef.current = new maplibregl.Marker({
          element: el,
          anchor: 'center',
          rotationAlignment: 'map',
        })
          .setLngLat([truckLocation.lng, truckLocation.lat])
          .setRotation(truckBearing)
          .addTo(map);
      } else {
        truckMarkerRef.current.setLngLat([truckLocation.lng, truckLocation.lat]);
        truckMarkerRef.current.setRotation(truckBearing);
        const etaTag = truckMarkerRef.current.getElement().querySelector('.truck-eta-tag');
        if (etaTag && displayEta) {
          etaTag.textContent = displayEta;
        }
      }

      // Camera follow logic in 3D driving mode
      if (followTruck) {
        const clientH = containerRef.current?.clientHeight || 400;
        map.jumpTo({
          center: [truckLocation.lng, truckLocation.lat],
          bearing: truckBearing,
          pitch: 55,
          padding: { top: clientH * 0.35 },
        });
      }
    } else if (truckMarkerRef.current) {
      truckMarkerRef.current.remove();
      truckMarkerRef.current = null;
    }
  }, [truckLocation, truckBearing, displayEta, followTruck]);

  // 6. Nearby Drivers (Diff update by ID to eliminate blinking)
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    const currentMap = driverMarkersRef.current;
    const nextIds = new Set(nearbyDrivers.map((d) => d.id));

    // Remove deleted drivers
    for (const [id, marker] of currentMap.entries()) {
      if (!nextIds.has(id)) {
        marker.remove();
        currentMap.delete(id);
      }
    }

    // Add or update active drivers
    for (const driver of nearbyDrivers) {
      const existing = currentMap.get(driver.id);
      if (existing) {
        existing.setLngLat([driver.lng, driver.lat]);
      } else {
        const el = document.createElement('div');
        const iconSvg =
          driver.vehicleType === 'VAN'
            ? `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" stroke-width="2"><rect x="1" y="3" width="15" height="13"/><polygon points="16 8 20 8 23 11 23 16 16 16 16 8"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/></svg>`
            : driver.vehicleType === 'MOTORBIKE'
            ? `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" stroke-width="2"><circle cx="18.5" cy="17.5" r="3.5"/><circle cx="5.5" cy="17.5" r="3.5"/><circle cx="15" cy="5" r="1"/><path d="M12 17.5V14l-3-3 4-3 2 3h2"/></svg>`
            : `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" stroke-width="2"><rect x="1" y="3" width="15" height="13"/><polygon points="16 8 20 8 23 11 23 16 16 16 16 8"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/></svg>`;

        el.innerHTML = `
          <div style="background:#0284C7;border:2px solid #FFFFFF;box-shadow:0 3px 8px rgba(0,0,0,0.2);width:30px;height:30px;border-radius:15px;display:flex;align-items:center;justify-content:center;">
            ${iconSvg}
          </div>
        `;
        const marker = new maplibregl.Marker({ element: el, anchor: 'center' })
          .setLngLat([driver.lng, driver.lat])
          .addTo(map);
        currentMap.set(driver.id, marker);
      }
    }
  }, [nearbyDrivers]);

  return (
    <View
      accessibilityLabel="Bản đồ Vietmap Vector GL Web"
      accessibilityRole="image"
      style={[styles.wrapper, { height: height as any }, style]}
      testID={testID}
    >
      <div
        id={`vietmap-container-${containerId}`}
        ref={containerRef}
        style={{
          width: '100%',
          height: '100%',
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          overflow: 'hidden',
          borderRadius: typeof height === 'number' || (style && style.borderRadius) ? 14 : 0,
        }}
      />
      <style>{`
        @keyframes vietmap-pulse {
          0% { transform: scale(0.8); opacity: 0.8; }
          100% { transform: scale(1.8); opacity: 0; }
        }
      `}</style>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    position: 'relative',
    width: '100%',
    overflow: 'hidden',
  },
});
