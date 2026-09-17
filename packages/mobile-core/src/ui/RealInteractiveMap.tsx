import React, { useEffect, useId, useMemo, useRef } from 'react';
import {
  Platform,
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import type { WebViewMessageEvent, WebViewProps } from 'react-native-webview';

import type { RouteCoordinate } from '@leopard/shared';

import { colors, radius, spacing, typography, typeScale } from '../theme/tokens';
import { IconLocationPin, IconSpeedTruck } from './icons/CoreIcons';

export type MapCoordinate = {
  lat: number;
  lng: number;
};

export type MapStop = {
  id: string;
  label: string;
  coords?: MapCoordinate;
  progress?: 'PENDING' | 'ARRIVED' | 'IN_SERVICE' | 'COMPLETED';
  sequence?: number;
};

export type RoutePolylineSegment = Readonly<{
  coords: readonly RouteCoordinate[];
  kind: 'completed' | 'active' | 'pending';
}>;

export type RealInteractiveMapMode = 'route' | 'tracking' | 'location' | 'pin' | 'preview';

export type RouteResolutionPolicy = 'PROVIDED_ONLY' | 'ALLOW_CLIENT_PREVIEW';

export type NearbyDriver = Readonly<{
  id: string;
  lat: number;
  lng: number;
  vehicleType?: string;
  distanceM?: number;
  licensePlate?: string;
}>;

export type RealInteractiveMapProps = Readonly<{
  mode?: RealInteractiveMapMode;
  origin?: { label: string; coords?: MapCoordinate };
  destination?: { label: string; coords?: MapCoordinate };
  stops?: readonly MapStop[];
  truckLocation?: MapCoordinate;
  truckEtaMinutes?: number;
  truckEtaLabel?: string;
  initialPinCoords?: MapCoordinate;
  onLocationChange?: (coords: MapCoordinate) => void;
  height?: number | string;
  testID?: string;
  style?: StyleProp<ViewStyle>;
  interactive?: boolean;
  title?: string;
  vietmapApiKey?: string;
  routeResolutionPolicy?: RouteResolutionPolicy;
  routeCoords?: readonly RouteCoordinate[];
  routeSegments?: readonly RoutePolylineSegment[];
  nearbyDrivers?: readonly NearbyDriver[];
}>;

type TruckLocationMessage = Readonly<{
  type: 'LEOPARD_UPDATE_TRUCK_LOCATION';
  mapInstanceId: string;
  lat: number;
  lng: number;
  eta: string;
}>;

export function postTruckLocationToMapFrame(
  mapFrame: Pick<HTMLIFrameElement, 'contentWindow'> | null,
  message: TruckLocationMessage,
): void {
  mapFrame?.contentWindow?.postMessage(message, '*');
}

export type NearbyDriversUpdateMessage = Readonly<{
  type: 'LEOPARD_UPDATE_NEARBY_DRIVERS';
  mapInstanceId: string;
  drivers: readonly NearbyDriver[];
}>;

export function postNearbyDriversToMapFrame(
  mapFrame: Pick<HTMLIFrameElement, 'contentWindow'> | null,
  message: NearbyDriversUpdateMessage,
): void {
  mapFrame?.contentWindow?.postMessage(message, '*');
}

export function postMapMessageToFrames(message: any): void {
  if (typeof window === 'undefined') return;
  window.postMessage(message, '*');
  const frames = document.querySelectorAll('iframe');
  frames.forEach((f) => {
    try {
      f.contentWindow?.postMessage(message, '*');
    } catch {
      // Ignore cross-origin postMessage errors
    }
  });
}

// ── Vietnamese Logistics Hubs Dictionary ────────────────────────────────
export const VIETNAM_LOCATION_DICT: Record<string, MapCoordinate> = {
  'tân bình': { lat: 10.795, lng: 106.652 },
  'kho vlxd tân bình': { lat: 10.795, lng: 106.652 },
  'kho tân bình': { lat: 10.795, lng: 106.652 },
  'tân tạo': { lat: 10.758, lng: 106.574 },
  'kcn tân tạo': { lat: 10.758, lng: 106.574 },
  'bình tân': { lat: 10.752, lng: 106.602 },
  'cát lái': { lat: 10.764, lng: 106.796 },
  'cảng cát lái': { lat: 10.764, lng: 106.796 },
  'quận 1': { lat: 10.7725, lng: 106.698 },
  'bến thành': { lat: 10.7725, lng: 106.698 },
  'chợ bến thành': { lat: 10.7725, lng: 106.698 },
  'quận 7': { lat: 10.738, lng: 106.721 },
  'kcx tân thuận': { lat: 10.756, lng: 106.732 },
  'thủ đức': { lat: 10.849, lng: 106.772 },
  'thành phố thủ đức': { lat: 10.849, lng: 106.772 },
  'tp thủ đức': { lat: 10.849, lng: 106.772 },
  'tp. thủ đức': { lat: 10.849, lng: 106.772 },
  'bình dương': { lat: 10.905, lng: 106.758 },
  'sóng thần': { lat: 10.905, lng: 106.758 },
  'kcn sóng thần': { lat: 10.905, lng: 106.758 },
  'dĩ an': { lat: 10.907, lng: 106.764 },
  'long an': { lat: 10.643, lng: 106.488 },
  'bến lức': { lat: 10.643, lng: 106.488 },
  'đồng nai': { lat: 10.957, lng: 106.828 },
  'biên hòa': { lat: 10.957, lng: 106.828 },
  'hà nội': { lat: 21.0285, lng: 105.854 },
  'ba đình': { lat: 21.0345, lng: 105.825 },
  'hoàng hoa thám': { lat: 21.0425, lng: 105.820 },
  'cầu giấy': { lat: 21.0315, lng: 105.795 },
  'trần duy hưng': { lat: 21.0125, lng: 105.798 },
  'nam từ liêm': { lat: 21.015, lng: 105.765 },
  'bắc từ liêm': { lat: 21.065, lng: 105.765 },
  'thanh xuân': { lat: 20.998, lng: 105.812 },
  'hai bà trưng': { lat: 21.008, lng: 105.855 },
  'tôn đức thắng': { lat: 21.0278, lng: 105.834 },
  'đống đa': { lat: 21.0185, lng: 105.829 },
  'quốc tử giám': { lat: 21.0278, lng: 105.834 },
  'hoàn kiếm': { lat: 21.0285, lng: 105.854 },
  'đà nẵng': { lat: 16.054, lng: 108.202 },
  'ngũ hành sơn': { lat: 16.033, lng: 108.245 },
  'hoàng công chất': { lat: 16.035, lng: 108.243 },
  'hải châu': { lat: 16.054, lng: 108.202 },
  'sơn trà': { lat: 16.082, lng: 108.245 },
  'thanh khê': { lat: 16.062, lng: 108.188 },
  'cẩm lệ': { lat: 15.998, lng: 108.189 },
  'quận 12': { lat: 10.867, lng: 106.641 },
  'an sương': { lat: 10.852, lng: 106.621 },
  'quận 3': { lat: 10.784, lng: 106.684 },
  'quận 5': { lat: 10.755, lng: 106.666 },
  'chợ lớn': { lat: 10.755, lng: 106.666 },
  'quận 6': { lat: 10.748, lng: 106.635 },
  'bình phú': { lat: 10.748, lng: 106.635 },
  'hồ chí minh': { lat: 10.7769, lng: 106.7009 },
  'tp.hcm': { lat: 10.7769, lng: 106.7009 },
  'tphcm': { lat: 10.7769, lng: 106.7009 },
};

/**
 * Where an address with no resolvable coordinates is anchored. It is a fixed
 * demo anchor, not a guess at the user's position: `resolveLocationCoords` is a
 * dictionary lookup, so any address it does not recognise (a real street
 * address, for instance) lands here. Callers that need a truthful position —
 * the e-POD watermark, the driver location ping — must use the device location.
 */
export const UNKNOWN_LOCATION_ANCHOR: MapCoordinate = { lat: 10.7769, lng: 106.7009 };

/**
 * Deterministically resolves an address or location name to coordinates in Vietnam.
 */
export function resolveLocationCoords(
  nameOrAddress?: string,
  referenceCoords?: MapCoordinate,
): MapCoordinate {
  if (!nameOrAddress || !nameOrAddress.trim()) {
    return referenceCoords || UNKNOWN_LOCATION_ANCHOR;
  }

  const query = nameOrAddress.toLowerCase().trim();
  const sortedEntries = Object.entries(VIETNAM_LOCATION_DICT).sort((a, b) => b[0].length - a[0].length);
  for (const [key, coords] of sortedEntries) {
    if (query.includes(key)) {
      return coords;
    }
  }

  // Strict real-GPS fallback: never invent nearby jitter.
  // Anchors exactly at the given reference (e.g. current origin) when available,
  // otherwise at the explicit unknown-location anchor.
  if (referenceCoords) {
    return { lat: referenceCoords.lat, lng: referenceCoords.lng };
  }
  return UNKNOWN_LOCATION_ANCHOR;
}

/**
 * Generates an interactive Leaflet HTML template.
 */
export function buildLeafletHtml({
  destinationCoords,
  destinationLabel,
  hasTruckLocation,
  interactive,
  mapInstanceId,
  mode,
  originCoords,
  originLabel,
  pinCoords,
  stopsCoords,
  truckCoords,
  truckEtaLabel,
  vietmapApiKey,
  routeResolutionPolicy = 'ALLOW_CLIENT_PREVIEW',
  routeCoords = [],
  routeSegments = [],
  nearbyDrivers = [],
}: {
  destinationCoords: MapCoordinate;
  destinationLabel: string;
  hasTruckLocation: boolean;
  interactive: boolean;
  mapInstanceId: string;
  mode: RealInteractiveMapMode;
  originCoords: MapCoordinate;
  originLabel: string;
  pinCoords: MapCoordinate;
  stopsCoords: readonly {
    label: string;
    coords: MapCoordinate;
    progress?: 'PENDING' | 'ARRIVED' | 'IN_SERVICE' | 'COMPLETED';
    sequence?: number;
  }[];
  truckCoords: MapCoordinate;
  truckEtaLabel: string;
  vietmapApiKey?: string;
  routeResolutionPolicy?: RouteResolutionPolicy;
  routeCoords?: readonly RouteCoordinate[];
  routeSegments?: readonly RoutePolylineSegment[];
  nearbyDrivers?: readonly NearbyDriver[];
}): string {
  const pointsJson = JSON.stringify({
    mode,
    origin: { coords: originCoords, label: originLabel },
    destination: { coords: destinationCoords, label: destinationLabel },
    stops: stopsCoords,
    truck: { coords: truckCoords, eta: truckEtaLabel },
    pin: pinCoords,
    interactive,
    hasTruckLocation,
    mapInstanceId,
    routeResolutionPolicy,
    nearbyDrivers: nearbyDrivers || [],
    // Never include the Vietmap API key in the generated config when the caller
    // requires provided-only geometry — it must be structurally absent from the
    // WebView HTML, not merely unused at runtime.
    vietmapApiKey:
      routeResolutionPolicy === 'PROVIDED_ONLY' ? '' : vietmapApiKey || '',
  });

  // The body of the client-side route-fetching chain (Vietmap -> OSRM -> straight
  // line fallback) lives in this constant so it can be conditionally interpolated
  // below. When routeResolutionPolicy === 'PROVIDED_ONLY', this constant is never
  // referenced, so its contents (including the Vietmap URL/API key and the OSRM
  // URL) are structurally absent from the generated HTML — not merely unreached
  // at runtime.
  const fetchRealRouteBody = `
        var waypoints = [[o.lng, o.lat]];
        if (config.stops && config.stops.length > 0) {
          config.stops.forEach(function(s) {
            if (s.coords && !isNaN(s.coords.lat) && !isNaN(s.coords.lng)) {
              waypoints.push([s.coords.lng, s.coords.lat]);
            }
          });
        }
        waypoints.push([d.lng, d.lat]);

        if (config.vietmapApiKey) {
          var pts = 'point=' + o.lat + ',' + o.lng;
          if (config.stops && config.stops.length > 0) {
            config.stops.forEach(function(s) {
              if (s.coords && !isNaN(s.coords.lat) && !isNaN(s.coords.lng)) {
                pts += '&point=' + s.coords.lat + ',' + s.coords.lng;
              }
            });
          }
          pts += '&point=' + d.lat + ',' + d.lng;
          var vmUrl = 'https://maps.vietmap.vn/api/route/v4?apikey=' + config.vietmapApiKey + '&' + pts + '&vehicle=car&points_encoded=false';

          var abortCtrl = typeof AbortController !== 'undefined' ? new AbortController() : null;
          var timeoutTimer = setTimeout(function() {
            if (abortCtrl) abortCtrl.abort();
          }, 5000);

          console.log('[RealInteractiveMap] Requesting VietMap Route API:', vmUrl);
          fetch(vmUrl, abortCtrl ? { signal: abortCtrl.signal } : {})
            .then(function(r) { return r.json(); })
            .then(function(data) {
              clearTimeout(timeoutTimer);
              console.log('[RealInteractiveMap] VietMap Route Response:', data);
              if (data && data.paths && data.paths[0] && data.paths[0].points && data.paths[0].points.coordinates) {
                var coords = data.paths[0].points.coordinates.map(function(c) { return [c[1], c[0]]; });
                console.log('[RealInteractiveMap] Applied VietMap coordinates count:', coords.length);
                applyRouteCoords(coords);
                return;
              }
              console.warn('[RealInteractiveMap] VietMap returned no paths, falling back to OSRM...');
              fetchOsrmRoute(waypoints);
            })
            .catch(function(err) {
              clearTimeout(timeoutTimer);
              console.warn('[RealInteractiveMap] VietMap Route error:', err, 'falling back to OSRM...');
              fetchOsrmRoute(waypoints);
            });
        } else {
          console.log('[RealInteractiveMap] No VietMap API key, requesting OSRM Route...');
          fetchOsrmRoute(waypoints);
        }`;

  const hasSegments = Boolean(
    routeSegments &&
      routeSegments.length > 0 &&
      routeSegments.some((s) => s.coords && s.coords.length >= 2),
  );

  const routeSection =
    routeResolutionPolicy === 'PROVIDED_ONLY'
      ? hasSegments
        ? `
      applyRouteSegments(${JSON.stringify(routeSegments)});
        `
        : routeCoords && routeCoords.length >= 2
        ? `
      applyRouteCoords(${JSON.stringify(routeCoords.map((c) => [c.lat, c.lng]))});
        `
        : `
      var noRouteBanner = document.createElement('div');
      noRouteBanner.style.cssText = 'position:absolute;bottom:12px;left:12px;right:12px;background:#FEF3C7;border:1px solid #FDE68A;border-radius:8px;padding:8px 12px;font:600 12px sans-serif;color:#92400E;z-index:20;text-align:center;';
      noRouteBanner.innerText = 'Chưa có dữ liệu tuyến đường';
      document.body.appendChild(noRouteBanner);
        `
      : `
      // Real street routing: Vietmap Route v4 with timeout -> OSRM driving engine -> straight line
      function fetchRealRoute() {
        ${fetchRealRouteBody}
      }

      function fetchOsrmRoute(waypoints) {
        var coordsStr = waypoints.map(function(w) { return w[0] + ',' + w[1]; }).join(';');
        var osrmUrl = 'https://router.project-osrm.org/route/v1/driving/' + coordsStr + '?overview=full&geometries=geojson';
        console.log('[RealInteractiveMap] Requesting OSRM Route:', osrmUrl);
        fetch(osrmUrl)
          .then(function(r) { return r.json(); })
          .then(function(data) {
            console.log('[RealInteractiveMap] OSRM Route Response:', data);
            if (data && data.routes && data.routes[0] && data.routes[0].geometry && data.routes[0].geometry.coordinates) {
              var coords = data.routes[0].geometry.coordinates.map(function(c) { return [c[1], c[0]]; });
              console.log('[RealInteractiveMap] Applied OSRM street route coordinates count:', coords.length);
              applyRouteCoords(coords);
            }
          })
          .catch(function(err) {
            console.warn('[RealInteractiveMap] OSRM Route Error, using straight line:', err);
          });
      }

      try { fetchRealRoute(); } catch (e) {}
      `;

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    html, body, #map { width: 100%; height: 100%; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #F1F5F9; }
    .leaflet-control-attribution { font-size: 9px !important; background: rgba(255,255,255,0.75) !important; padding: 2px 4px !important; }
    
    /* Pin Marker Styles */
    .pin-wrap { position: relative; display: flex; align-items: center; justify-content: center; width: 44px; height: 44px; }
    .pin-pulse { position: absolute; width: 40px; height: 40px; border-radius: 50%; background: rgba(2, 132, 199, 0.28); animation: pinPulse 1.8s ease-out infinite; }
    .pin-core { position: relative; width: 28px; height: 28px; border-radius: 50%; background: #0B1E42; border: 3px solid #FFFFFF; box-shadow: 0 4px 10px rgba(2, 132, 199, 0.45); display: flex; align-items: center; justify-content: center; z-index: 2; }
    .pin-core.origin { background: #16A34A; }
    .pin-core.dest { background: #0B1E42; }
    .pin-core.stop { background: #D97706; }
    .pin-core.stop-pending { background: #D97706; }
    .pin-core.stop-arrived { background: #2563EB; }
    .pin-core.stop-in_service { background: #059669; }
    .pin-core.stop-completed { background: #64748B; opacity: 0.85; }
    .pin-dot { width: 8px; height: 8px; border-radius: 50%; background: #FFFFFF; }

    /* Truck / Driver Navigation Puck Marker Styles */
    .truck-wrap { position: relative; display: flex; flex-direction: column; align-items: center; justify-content: center; }
    .truck-pulse { position: absolute; width: 44px; height: 44px; border-radius: 50%; background: rgba(11, 37, 69, 0.25); animation: pinPulse 2s ease-out infinite; }
    .truck-badge { position: relative; width: 34px; height: 34px; border-radius: 50%; background: #0B2545; border: 2.5px solid #FFFFFF; box-shadow: 0 4px 12px rgba(11, 37, 69, 0.4); display: flex; align-items: center; justify-content: center; z-index: 3; }
    .truck-eta { margin-top: 4px; background: #0B2545; color: #FFFFFF; font-size: 10px; font-weight: 700; padding: 2px 8px; border-radius: 12px; white-space: nowrap; box-shadow: 0 2px 6px rgba(0,0,0,0.25); border: 1px solid rgba(255,255,255,0.2); }

    /* Nearby Driver Marker Styles */
    .nearby-driver-wrap { position: relative; display: flex; flex-direction: column; align-items: center; justify-content: center; }
    .nearby-driver-pulse { position: absolute; width: 38px; height: 38px; border-radius: 50%; background: rgba(245, 158, 11, 0.28); animation: pinPulse 2s ease-out infinite; }
    .nearby-driver-badge { position: relative; width: 32px; height: 32px; border-radius: 50%; background: #0B2545; border: 2.5px solid #F59E0B; box-shadow: 0 4px 10px rgba(11, 37, 69, 0.4); display: flex; align-items: center; justify-content: center; z-index: 2; font-size: 15px; }
    .nearby-driver-tag { margin-top: 3px; background: #0B2545; color: #F59E0B; font-size: 9px; font-weight: 700; padding: 2px 5px; border-radius: 8px; white-space: nowrap; box-shadow: 0 1px 4px rgba(0,0,0,0.25); }

    /* Map Controls */
    .map-action-bar { position: absolute; right: 12px; bottom: 20px; z-index: 1000; display: flex; flex-direction: column; gap: 6px; }
    .map-btn { width: 34px; height: 34px; background: #FFFFFF; border: 1px solid #CBD5E1; border-radius: 8px; display: flex; align-items: center; justify-content: center; box-shadow: 0 2px 6px rgba(0,0,0,0.15); cursor: pointer; font-size: 16px; color: #0F172A; font-weight: bold; user-select: none; }
    .map-btn:active { background: #F1F5F9; transform: scale(0.95); }

    @keyframes pinPulse {
      0% { transform: scale(0.4); opacity: 0.95; }
      100% { transform: scale(1.6); opacity: 0; }
    }
  </style>
</head>
<body>
  <div id="map"></div>
  <div class="map-action-bar">
    <button class="map-btn" id="btn-fit" title="Căn chỉnh lộ trình">⛶</button>
  </div>
  <script>
    var config = ${pointsJson};
    var map = L.map('map', {
      zoomControl: false,
      dragging: ${interactive ? 'true' : 'false'},
      touchZoom: ${interactive ? 'true' : 'false'},
      scrollWheelZoom: false
    });
    if (${interactive && mode === 'pin' ? 'true' : 'false'}) {
      L.control.zoom({ position: 'topright' }).addTo(map);
    }

    // Primary map tile provider: Google Maps (Fast, Vietnamese language labels, high detail in Vietnam)
    // Fallback: CartoDB Voyager (never blocked in Vietnam, crisp retina tiles)
    var googleTileUrl = 'https://mt{s}.google.com/vt/lyrs=m&x={x}&y={y}&z={z}&hl=vi';
    var tiles = L.tileLayer(googleTileUrl, {
      maxZoom: 20,
      subdomains: ['0', '1', '2', '3'],
      attribution: '© Google Maps'
    }).addTo(map);

    tiles.on('tileerror', function() {
      if (!window._cartoFallback) {
        window._cartoFallback = true;
        try { map.removeLayer(tiles); } catch(e) {}
        L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}@2x.png', {
          maxZoom: 19,
          subdomains: ['a', 'b', 'c', 'd'],
          attribution: '© CARTO'
        }).addTo(map);
      }
    });

    var bounds = [];

    // Icon Factories
    function createPulseIcon(type, numberText) {
      var inner = numberText ? '<span style="font-size:11px;font-weight:800;color:#FFFFFF;line-height:1;">' + numberText + '</span>' : '<div class="pin-dot"></div>';
      return L.divIcon({
        className: 'custom-pin-icon',
        html: '<div class="pin-wrap"><div class="pin-pulse"></div><div class="pin-core ' + type + '">' + inner + '</div></div>',
        iconSize: [44, 44],
        iconAnchor: [22, 22]
      });
    }

    function createTruckIcon(eta) {
      return L.divIcon({
        className: 'custom-truck-icon',
        html: '<div class="truck-wrap"><div class="truck-pulse"></div><div class="truck-badge"><svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M12 2L4.5 20.29L5.21 21L12 18L18.79 21L19.5 20.29L12 2Z" fill="#FBBF24"/></svg></div>' + (eta ? '<div class="truck-eta">' + eta + '</div>' : '') + '</div>',
        iconSize: [50, 60],
        iconAnchor: [25, 30]
      });
    }

    function createNearbyDriverIcon(vehicleType, plate) {
      var emoji = '🚚';
      var vType = (vehicleType || '').toUpperCase();
      if (vType === 'VAN' || vType.indexOf('VAN') !== -1) {
        emoji = '🚐';
      } else if (vType === 'MOTORBIKE' || vType.indexOf('BIKE') !== -1) {
        emoji = '🛵';
      } else if (vType === 'TRUCK' || vType.indexOf('TRUCK') !== -1) {
        emoji = '🚛';
      }
      return L.divIcon({
        className: 'custom-nearby-driver-icon',
        html: '<div class="nearby-driver-wrap"><div class="nearby-driver-pulse"></div><div class="nearby-driver-badge">' + emoji + '</div>' + (plate ? '<div class="nearby-driver-tag">' + plate + '</div>' : '') + '</div>',
        iconSize: [42, 50],
        iconAnchor: [21, 25]
      });
    }

    function notify(lat, lng) {
      try {
        var payload = {
          type: 'LEOPARD_MAP_PIN_MOVED',
          mapInstanceId: config.mapInstanceId,
          lat: lat,
          lng: lng
        };
        if (window.ReactNativeWebView) {
          window.ReactNativeWebView.postMessage(JSON.stringify(payload));
        } else {
          window.parent.postMessage(payload, '*');
        }
      } catch (e) {}
    }

    if (config.mode === 'pin') {
      var lat = config.pin.lat;
      var lng = config.pin.lng;
      map.setView([lat, lng], 16);
      bounds.push([lat, lng]);
      var pinMarker = L.marker([lat, lng], {
        icon: createPulseIcon('dest'),
        draggable: config.interactive
      }).addTo(map);

      pinMarker.on('dragend', function(e) {
        var pos = e.target.getLatLng();
        notify(pos.lat, pos.lng);
      });

      if (config.interactive) {
        map.on('click', function(e) {
          pinMarker.setLatLng(e.latlng);
          notify(e.latlng.lat, e.latlng.lng);
        });
      }
    } else if (config.mode === 'preview') {
      var pLat = (config.pin && config.pin.lat) || config.origin.coords.lat;
      var pLng = (config.pin && config.pin.lng) || config.origin.coords.lng;
      var pLabel = config.origin.label || 'Vị trí đã lưu';
      map.setView([pLat, pLng], 15);
      bounds.push([pLat, pLng]);
      var previewMarker = L.marker([pLat, pLng], {
        icon: createPulseIcon('dest')
      }).addTo(map);
      if (pLabel) previewMarker.bindPopup('<b>' + pLabel + '</b>');
    } else if (config.mode === 'location') {
      if (config.hasTruckLocation) {
        var current = config.truck.coords;
        bounds.push([current.lat, current.lng]);
        map.setView([current.lat, current.lng], 16);
        var currentMarker = L.marker([current.lat, current.lng], {
          icon: createTruckIcon('Vị trí hiện tại')
        }).addTo(map);
        currentMarker.bindPopup('<b>Vị trí hiện tại của bạn</b>');
      } else {
        map.setView([config.pin.lat, config.pin.lng], 13);
      }
    } else {
      // Route or Tracking mode
      var latlngs = [];
      var o = config.origin.coords;
      var d = config.destination.coords;
      latlngs.push([o.lat, o.lng]);
      bounds.push([o.lat, o.lng]);

      // Origin Marker
      var origMarker = L.marker([o.lat, o.lng], {
        icon: createPulseIcon('origin')
      }).addTo(map);
      if (config.origin.label) origMarker.bindPopup('<b>Điểm lấy:</b> ' + config.origin.label);

      // Intermediate stops
      if (config.stops && config.stops.length > 0) {
        config.stops.forEach(function(s, idx) {
          if (s.coords && !isNaN(s.coords.lat) && !isNaN(s.coords.lng)) {
            latlngs.push([s.coords.lat, s.coords.lng]);
            bounds.push([s.coords.lat, s.coords.lng]);
            var seq = s.sequence != null ? s.sequence : (idx + 1);
            var progClass = s.progress ? 'stop-' + s.progress.toLowerCase() : '';
            var iconType = 'stop ' + progClass;
            var numText = s.progress === 'COMPLETED' ? '✓' : seq.toString();
            var sm = L.marker([s.coords.lat, s.coords.lng], {
              icon: createPulseIcon(iconType, numText),
              title: 'Điểm dừng ' + seq + (s.progress ? ' (' + s.progress + ')' : '') + ': ' + (s.label || '')
            }).addTo(map);
            if (s.label) {
              var progLabel = s.progress ? ' - ' + s.progress : '';
              sm.bindPopup('<b>Điểm dừng ' + seq + progLabel + ':</b> ' + s.label);
            }
          }
        });
      }

      latlngs.push([d.lat, d.lng]);
      bounds.push([d.lat, d.lng]);

      // Destination Marker
      var destMarker = L.marker([d.lat, d.lng], {
        icon: createPulseIcon('dest')
      }).addTo(map);
      if (config.destination.label) destMarker.bindPopup('<b>Điểm giao:</b> ' + config.destination.label);

      var hasProvidedSegments = ${hasSegments ? 'true' : 'false'};
      var routeLayerGlow = null;
      var routeLayer = null;

      if (!hasProvidedSegments && config.routeResolutionPolicy !== 'PROVIDED_ONLY') {
        routeLayerGlow = L.polyline(latlngs, {
          color: '#0B1E42',
          weight: 8,
          opacity: 0.28,
          lineJoin: 'round',
          lineCap: 'round'
        }).addTo(map);

        routeLayer = L.polyline(latlngs, {
          color: '#0B1E42',
          weight: 4.5,
          opacity: 0.95,
          lineJoin: 'round',
          lineCap: 'round'
        }).addTo(map);
      }

      function applyRouteCoords(coords) {
        if (!routeLayer) {
          routeLayerGlow = L.polyline(coords, {
            color: '#0B1E42',
            weight: 8,
            opacity: 0.28,
            lineJoin: 'round',
            lineCap: 'round'
          }).addTo(map);
          routeLayer = L.polyline(coords, {
            color: '#0B1E42',
            weight: 4.5,
            opacity: 0.95,
            lineJoin: 'round',
            lineCap: 'round'
          }).addTo(map);
        } else {
          routeLayerGlow.setLatLngs(coords);
          routeLayer.setLatLngs(coords);
        }
        try {
          map.fitBounds(routeLayer.getBounds(), { padding: [36, 36], maxZoom: 16 });
        } catch(e) {}
      }

      function applyRouteSegments(segments) {
        var segBounds = [];
        segments.forEach(function(seg) {
          if (!seg.coords || seg.coords.length < 2) return;
          var segLatLngs = seg.coords.map(function(c) { return [c.lat, c.lng]; });
          segLatLngs.forEach(function(ll) { segBounds.push(ll); });
          if (seg.kind === 'completed') {
            L.polyline(segLatLngs, {
              color: '#94A3B8',
              weight: 4,
              opacity: 0.5,
              lineJoin: 'round',
              lineCap: 'round'
            }).addTo(map);
          } else if (seg.kind === 'active') {
            L.polyline(segLatLngs, {
              color: '#0B1E42',
              weight: 8,
              opacity: 0.25,
              lineJoin: 'round',
              lineCap: 'round'
            }).addTo(map);
            L.polyline(segLatLngs, {
              color: '#0B1E42',
              weight: 5,
              opacity: 0.95,
              lineJoin: 'round',
              lineCap: 'round'
            }).addTo(map);
          } else {
            L.polyline(segLatLngs, {
              color: '#94A3B8',
              weight: 3.5,
              opacity: 0.7,
              dashArray: '6, 8',
              lineJoin: 'round',
              lineCap: 'round'
            }).addTo(map);
          }
        });
        if (segBounds.length > 0) {
          try {
            map.fitBounds(segBounds, { padding: [36, 36], maxZoom: 16 });
          } catch(e) {}
        }
      }

      ${routeSection}

      // Tracking truck
      var truckMarker = null;
      if (config.mode === 'tracking' && config.truck && config.truck.coords) {
        var t = config.truck.coords;
        bounds.push([t.lat, t.lng]);
        truckMarker = L.marker([t.lat, t.lng], {
          icon: createTruckIcon(config.truck.eta || '')
        }).addTo(map);
        truckMarker.bindPopup('<b>Tài xế đang vận chuyển</b><br>ETA: ' + (config.truck.eta || 'Đang cập nhật'));
      }

      // Nearby drivers layer
      var nearbyDriversLayer = L.layerGroup().addTo(map);

      function renderNearbyDrivers(drivers) {
        nearbyDriversLayer.clearLayers();
        if (!drivers || !drivers.length) return;
        drivers.forEach(function(d) {
          if (typeof d.lat === 'number' && typeof d.lng === 'number') {
            var icon = createNearbyDriverIcon(d.vehicleType, d.licensePlate);
            var m = L.marker([d.lat, d.lng], { icon: icon }).addTo(nearbyDriversLayer);
            var typeLabel = 'Tài xế sẵn sàng';
            var vType = (d.vehicleType || '').toUpperCase();
            if (vType === 'VAN' || vType.indexOf('VAN') !== -1) typeLabel = 'Xe Van (Sẵn sàng)';
            else if (vType === 'MOTORBIKE' || vType.indexOf('BIKE') !== -1) typeLabel = 'Xe Ba Gác / Máy (Sẵn sàng)';
            else if (vType === 'TRUCK' || vType.indexOf('TRUCK') !== -1) typeLabel = 'Xe Tải (Sẵn sàng)';
            var distText = d.distanceM ? '<br>Cách bạn: ' + (d.distanceM >= 1000 ? (d.distanceM / 1000).toFixed(1) + ' km' : d.distanceM + ' m') : '';
            var plateText = d.licensePlate ? '<br>Biển số: ' + d.licensePlate : '';
            m.bindPopup('<b>' + typeLabel + '</b>' + distText + plateText);
          }
        });
      }

      if (config.nearbyDrivers && config.nearbyDrivers.length > 0) {
        renderNearbyDrivers(config.nearbyDrivers);
      }

      function handleMapControlMsg(event) {
        if (!event.data) return;
        if (event.data.type === 'LEOPARD_MAP_SET_VIEW_MODE') {
          if (event.data.mode === 'overview') {
            if (bounds.length > 0) {
              map.fitBounds(bounds, { padding: [36, 36], maxZoom: 16 });
            }
          } else if (event.data.mode === 'driving' || event.data.mode === 'follow') {
            if (truckMarker) {
              map.setView(truckMarker.getLatLng(), 17, { animate: true });
            } else if (config.truck && config.truck.coords && config.truck.coords.lat !== 0) {
              map.setView([config.truck.coords.lat, config.truck.coords.lng], 17, { animate: true });
            } else if (bounds.length > 0) {
              map.setView(bounds[0], 17, { animate: true });
            }
          }
        } else if (event.data.mapInstanceId === config.mapInstanceId) {
          if (event.data.type === 'LEOPARD_UPDATE_TRUCK_LOCATION') {
            var nLat = event.data.lat;
            var nLng = event.data.lng;
            var nEta = event.data.eta;
            if (typeof nLat === 'number' && typeof nLng === 'number') {
              if (truckMarker) {
                truckMarker.setLatLng([nLat, nLng]);
                if (nEta) {
                  truckMarker.setPopupContent('<b>Tài xế đang vận chuyển</b><br>ETA: ' + nEta);
                }
              } else {
                truckMarker = L.marker([nLat, nLng], {
                  icon: createTruckIcon(nEta || '')
                }).addTo(map);
              }
            }
          } else if (event.data.type === 'LEOPARD_UPDATE_NEARBY_DRIVERS') {
            renderNearbyDrivers(event.data.drivers || []);
          }
        }
      }
      window.addEventListener('message', handleMapControlMsg);
      if (window.parent && window.parent !== window) {
        window.parent.addEventListener('message', handleMapControlMsg);
      }

      if (bounds.length > 0) {
        map.fitBounds(bounds, { padding: [36, 36], maxZoom: 16 });
      }
    }

    document.getElementById('btn-fit').addEventListener('click', function() {
      if (bounds.length > 0) {
        map.fitBounds(bounds, { padding: [36, 36], maxZoom: 16 });
      } else if (config.mode === 'pin') {
        map.setView([config.pin.lat, config.pin.lng], 16);
      }
    });
  </script>
</body>
</html>`;
}

export function RealInteractiveMap({
  destination,
  height = 240,
  initialPinCoords,
  interactive = true,
  mode = 'route',
  onLocationChange,
  origin,
  stops = [],
  style,
  testID = 'real-interactive-map',
  truckEtaLabel = '',
  truckEtaMinutes,
  truckLocation,
  vietmapApiKey,
  routeResolutionPolicy,
  routeCoords,
  routeSegments,
  nearbyDrivers = [],
}: RealInteractiveMapProps) {
  const mapInstanceId = useId();
  const iframeRef = useRef<HTMLIFrameElement | null>(null);

  // Coordinates calculation
  const originCoords = useMemo(
    () => origin?.coords || resolveLocationCoords(origin?.label),
    [origin?.coords, origin?.label],
  );

  const destinationCoords = useMemo(
    () => destination?.coords || resolveLocationCoords(destination?.label, originCoords),
    [destination?.coords, destination?.label, originCoords],
  );

  const stopsCoords = useMemo(
    () =>
      stops
        .filter((s) => s.label && s.label.trim().length > 0 && s.label !== 'Chưa chọn')
        .map((s, idx) => ({
          label: s.label,
          coords: s.coords || resolveLocationCoords(s.label, originCoords),
          progress: s.progress,
          sequence: s.sequence ?? idx + 1,
        })),
    [stops, originCoords],
  );

  const pinCoords = useMemo(
    () => initialPinCoords || originCoords,
    [initialPinCoords, originCoords],
  );

  const truckCoords = useMemo(
    () =>
      truckLocation || {
        lat: Number(((originCoords.lat + destinationCoords.lat) / 2).toFixed(5)),
        lng: Number(((originCoords.lng + destinationCoords.lng) / 2).toFixed(5)),
      },
    [destinationCoords.lat, destinationCoords.lng, originCoords.lat, originCoords.lng, truckLocation],
  );

  const displayEta = useMemo(() => {
    if (truckEtaLabel) return truckEtaLabel;
    if (typeof truckEtaMinutes === 'number') {
      return truckEtaMinutes > 0 ? `${truckEtaMinutes} phút` : 'Đã đến';
    }
    return '';
  }, [truckEtaLabel, truckEtaMinutes]);

  // PostMessage listener for web
  useEffect(() => {
    if (Platform.OS !== 'web' || typeof window === 'undefined') return;

    const handleMessage = (event: MessageEvent) => {
      if (
        event.data &&
        event.data.type === 'LEOPARD_MAP_PIN_MOVED' &&
        (!event.data.mapInstanceId || event.data.mapInstanceId === mapInstanceId)
      ) {
        const { lat, lng } = event.data as { lat?: number; lng?: number };
        if (typeof lat === 'number' && typeof lng === 'number') {
          onLocationChange?.({ lat, lng });
        }
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [mapInstanceId, onLocationChange]);

  // Send precise location only to this component's own map frame.
  useEffect(() => {
    if (Platform.OS !== 'web' || typeof window === 'undefined' || !truckLocation) return;
    const mapFrame = iframeRef.current;
    if (!mapFrame?.contentWindow) return;

    try {
      postTruckLocationToMapFrame(mapFrame, {
        type: 'LEOPARD_UPDATE_TRUCK_LOCATION',
        mapInstanceId,
        lat: truckLocation.lat,
        lng: truckLocation.lng,
        eta: displayEta,
      });
    } catch {
      // Ignore postMessage communication errors on unmounted iframe
    }
  }, [displayEta, mapInstanceId, truckLocation?.lat, truckLocation?.lng]);

  // Send nearby drivers update to map frame when nearbyDrivers changes
  useEffect(() => {
    if (Platform.OS !== 'web' || typeof window === 'undefined') return;
    const mapFrame = iframeRef.current;
    if (!mapFrame?.contentWindow) return;

    try {
      mapFrame.contentWindow.postMessage(
        {
          type: 'LEOPARD_UPDATE_NEARBY_DRIVERS',
          mapInstanceId,
          drivers: nearbyDrivers ?? [],
        },
        '*',
      );
    } catch {
      // Ignore postMessage communication errors on unmounted iframe
    }
  }, [mapInstanceId, nearbyDrivers]);

  const mapHtml = useMemo(() => {
    const resolvedVietmapKey =
      vietmapApiKey || process.env.EXPO_PUBLIC_VIETMAP_API_KEY || '';
    return buildLeafletHtml({
      destinationCoords,
      destinationLabel: destination?.label || 'Điểm giao',
      hasTruckLocation: Boolean(truckLocation),
      interactive,
      mapInstanceId,
      mode,
      originCoords,
      originLabel: origin?.label || 'Điểm lấy',
      pinCoords,
      stopsCoords,
      truckCoords,
      truckEtaLabel: displayEta,
      vietmapApiKey: resolvedVietmapKey,
      routeResolutionPolicy: routeResolutionPolicy ?? 'ALLOW_CLIENT_PREVIEW',
      routeCoords: routeCoords ?? [],
      routeSegments: routeSegments ?? [],
      nearbyDrivers: nearbyDrivers ?? [],
    });
  }, [
    destination?.label,
    destinationCoords,
    displayEta,
    interactive,
    mapInstanceId,
    mode,
    origin?.label,
    originCoords,
    pinCoords,
    stopsCoords,
    truckCoords,
    vietmapApiKey,
    routeResolutionPolicy,
    routeCoords,
    routeSegments,
    nearbyDrivers,
  ]);

  const isFullScreen = height === '100%';
  const NativeWebView =
    (Platform.OS === 'ios' || Platform.OS === 'android') && process.env.NODE_ENV !== 'test'
      ? (require('react-native-webview').WebView as React.ComponentType<WebViewProps>)
      : null;
  const containerStyle: StyleProp<ViewStyle> = [
    styles.container,
    isFullScreen ? { height: '100%', flex: 1, borderRadius: 0 } : { height: (height as any) ?? 240 },
    style,
  ];

  return (
    <View style={containerStyle} testID={testID}>
      {Platform.OS === 'web' ? (
        React.createElement('iframe', {
          'aria-label':
            mode === 'location'
              ? 'Bản đồ vị trí hiện tại của tài xế'
              : 'Bản đồ thực tế tương tác',
          key: `leopard-map-${mode}-${originCoords.lat}-${destinationCoords.lat}`,
          ref: iframeRef,
          srcDoc: mapHtml,
          style: {
            width: '100%',
            height: '100%',
            minHeight: '100%',
            border: 'none',
            borderRadius: isFullScreen ? 0 : 14,
            display: 'block',
          },
          title:
            mode === 'location'
              ? 'Bản đồ vị trí hiện tại của tài xế'
              : 'Bản đồ thực tế tương tác',
        })
      ) : NativeWebView ? (
        <NativeWebView
          accessibilityLabel={
            mode === 'location'
              ? 'Bản đồ vị trí hiện tại của tài xế'
              : 'Bản đồ thực tế tương tác'
          }
          javaScriptEnabled
          onMessage={(event: WebViewMessageEvent) => {
            try {
              const payload = JSON.parse(event.nativeEvent.data) as {
                type?: string;
                mapInstanceId?: string;
                lat?: number;
                lng?: number;
              };
              if (
                payload.type === 'LEOPARD_MAP_PIN_MOVED' &&
                payload.mapInstanceId === mapInstanceId &&
                typeof payload.lat === 'number' &&
                typeof payload.lng === 'number'
              ) {
                onLocationChange?.({ lat: payload.lat, lng: payload.lng });
              }
            } catch {
              // Ignore malformed messages from the embedded map document.
            }
          }}
          originWhitelist={['https://*', 'http://*']}
          source={{ html: mapHtml }}
          style={styles.nativeWebView}
        />
      ) : (
        /* Native & Test Environment Accessible Fallback */
        <View
          accessibilityLabel={
            mode === 'location'
              ? 'Bản đồ vị trí hiện tại của tài xế'
              : mode === 'tracking'
              ? `Bản đồ theo dõi xe trực tiếp${displayEta ? `; ETA: ${displayEta}` : ''}`
              : `Bản đồ lộ trình từ ${origin?.label || 'điểm lấy'} đến ${destination?.label || 'điểm giao'}`
          }
          accessibilityRole="image"
          style={styles.nativeFallback}
        >
          <View style={styles.roadGridH} />
          <View style={styles.roadGridV} />
          {mode !== 'location' ? <View style={styles.routeTraceLine} /> : null}

          {/* Markers */}
          {mode !== 'location' ? (
            <>
              <View style={[styles.markerPin, styles.originPin]}>
                <IconLocationPin color="#10B981" size={16} strokeWidth={2} />
              </View>
              <View style={[styles.markerPin, styles.destPin]}>
                <IconLocationPin color="#EF4444" size={16} strokeWidth={2} />
              </View>
            </>
          ) : null}
          {mode === 'tracking' || (mode === 'location' && truckLocation) ? (
            <View style={styles.truckMarkerWrap}>
              <View style={styles.truckMarker}>
                <IconSpeedTruck color="#FFFFFF" size={14} />
              </View>
              {displayEta ? (
                <View style={styles.truckEtaBadge}>
                  <Text style={styles.truckEtaText}>{displayEta}</Text>
                </View>
              ) : null}
            </View>
          ) : null}

          {/* Nearby Driver Markers in Fallback */}
          {nearbyDrivers && nearbyDrivers.length > 0 ? (
            <View pointerEvents="none" style={styles.nearbyDriversContainer} testID="nearby-drivers-layer">
              {nearbyDrivers.map((driver, index) => (
                <View
                  key={driver.id}
                  accessibilityLabel={`Tài xế gần đây ${driver.vehicleType || ''}`}
                  style={[
                    styles.nearbyDriverPin,
                    {
                      top: `${25 + (index % 4) * 15}%`,
                      left: `${20 + (index % 5) * 15}%`,
                    },
                  ]}
                  testID={`nearby-driver-${driver.id}`}
                >
                  <Text style={styles.nearbyDriverEmoji}>
                    {driver.vehicleType === 'VAN' ? '🚐' : driver.vehicleType === 'MOTORBIKE' ? '🛵' : '🚛'}
                  </Text>
                </View>
              ))}
            </View>
          ) : null}

          <View style={styles.liveOverlayBadge}>
            <View style={styles.liveDot} />
            <Text style={styles.liveBadgeText}>BẢN ĐỒ THỰC TẾ</Text>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    height: '100%',
    backgroundColor: '#F1F5F9',
    borderRadius: 14,
    overflow: 'hidden',
    position: 'relative',
  },
  nearbyDriversContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  nearbyDriverPin: {
    position: 'absolute',
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#0B2545',
    borderWidth: 2,
    borderColor: '#F59E0B',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#0B2545',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  nearbyDriverEmoji: {
    fontSize: 13,
  },
  nativeFallback: {
    flex: 1,
    backgroundColor: colors.operational.mapLand,
    position: 'relative',
    overflow: 'hidden',
    minHeight: 180,
  },
  nativeWebView: {
    flex: 1,
    backgroundColor: colors.operational.mapLand,
  },
  roadGridH: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: '40%',
    height: 14,
    backgroundColor: colors.neutral.background,
  },
  roadGridV: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: '35%',
    width: 14,
    backgroundColor: colors.neutral.background,
  },
  routeTraceLine: {
    position: 'absolute',
    top: '40%',
    left: '25%',
    right: '25%',
    height: 4,
    backgroundColor: colors.brand.background,
    borderRadius: radius.pill,
  },
  markerPin: {
    position: 'absolute',
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  originPin: {
    left: '22%',
    top: '34%',
  },
  destPin: {
    right: '22%',
    top: '34%',
  },
  truckMarkerWrap: {
    position: 'absolute',
    left: '48%',
    top: '30%',
    alignItems: 'center',
  },
  truckMarker: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.brand.background,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  truckEtaBadge: {
    backgroundColor: colors.operational.ink,
    borderRadius: radius.pill,
    paddingHorizontal: 6,
    paddingVertical: 1,
    marginTop: 2,
  },
  truckEtaText: {
    ...typography.caption,
    color: '#FFFFFF',
    fontSize: typeScale.caption2.fontSize,
    fontWeight: '700',
  },
  liveOverlayBadge: {
    position: 'absolute',
    top: spacing.xs,
    left: spacing.xs,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(15, 23, 42, 0.75)',
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: radius.control,
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#10B981',
  },
  liveBadgeText: {
    ...typography.caption,
    color: '#FFFFFF',
    fontSize: typeScale.caption2.fontSize,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
});
