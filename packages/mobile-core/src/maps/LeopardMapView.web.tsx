import React, { useEffect, useId, useMemo, useRef } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import type { LeopardMapMode, LeopardMapViewProps, MapCoordinate, MapStop, NearbyDriver } from './types';
import { colors, customerPalette } from '../theme/tokens';

const VIETMAP_DEFAULT_STYLE = 'https://maps.vietmap.vn/api/maps/light/styles.json?apikey=';

export interface BuildVietmapHtmlParams {
  resolvedApiKey: string;
  originCoords?: MapCoordinate;
  destCoords?: MapCoordinate;
  validStops?: readonly MapStop[];
  truckLocation?: MapCoordinate;
  displayEta?: string;
  nearbyDrivers?: readonly NearbyDriver[];
  mode?: LeopardMapMode;
  mapInstanceId: string;
  centerCoords: [number, number];
  zoom?: number;
  bearing?: number;
  pitch?: number;
  interactive?: boolean;
  followTruck?: boolean;
  routeGeoJSON?: any;
}

export function buildVietmapHtml({
  resolvedApiKey,
  originCoords,
  destCoords,
  validStops = [],
  truckLocation,
  displayEta = '',
  nearbyDrivers = [],
  mode = 'preview',
  mapInstanceId,
  centerCoords,
  zoom = 14,
  bearing = 0,
  pitch = 0,
  interactive = true,
  followTruck = false,
  routeGeoJSON,
}: BuildVietmapHtmlParams): string {
  const styleUrl = `${VIETMAP_DEFAULT_STYLE}${resolvedApiKey}`;

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
  <link rel="stylesheet" href="https://unpkg.com/maplibre-gl@4.7.1/dist/maplibre-gl.css" />
  <script src="https://unpkg.com/maplibre-gl@4.7.1/dist/maplibre-gl.js"></script>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    html, body {
      width: 100%;
      height: 100%;
      margin: 0;
      padding: 0;
      overflow: hidden;
      background: #F1F5F9;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    }
    #map {
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      width: 100%;
      height: 100%;
    }
    
    /* Pin Marker Styles */
    .marker-pin {
      position: relative;
      display: flex;
      align-items: center;
      justify-content: center;
      width: 32px;
      height: 32px;
      cursor: pointer;
    }
    .pin-pulse {
      position: absolute;
      width: 36px;
      height: 36px;
      border-radius: 50%;
      animation: pulseAura 2s ease-out infinite;
    }
    .origin-pulse { background: rgba(16, 185, 129, 0.28); }
    .dest-pulse { background: rgba(11, 37, 69, 0.28); }
    .pin-core {
      position: relative;
      width: 26px;
      height: 26px;
      border-radius: 50%;
      border: 2.5px solid #FFFFFF;
      box-shadow: 0 4px 10px rgba(0, 0, 0, 0.25);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 2;
    }
    .origin-core { background: #10B981; }
    .dest-core { background: #0B2545; }
    .pin-dot { width: 8px; height: 8px; border-radius: 50%; background: #FFFFFF; }

    /* Stop Markers */
    .stop-core {
      position: relative;
      width: 24px;
      height: 24px;
      border-radius: 50%;
      border: 2px solid #FFFFFF;
      background: #D97706;
      color: #FFFFFF;
      font-size: 11px;
      font-weight: 700;
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: 0 3px 8px rgba(0,0,0,0.25);
    }
    .stop-core.completed { background: #64748B; opacity: 0.85; }
    .stop-core.in_service { background: #059669; }
    .stop-core.arrived { background: #2563EB; }

    /* Truck Puck Marker */
    .truck-wrap {
      position: relative;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
    }
    .truck-pulse {
      position: absolute;
      width: 44px;
      height: 44px;
      border-radius: 50%;
      background: rgba(11, 37, 69, 0.25);
      animation: pulseAura 2s ease-out infinite;
    }
    .truck-badge {
      position: relative;
      width: 34px;
      height: 34px;
      border-radius: 50%;
      background: #0B2545;
      border: 2.5px solid #FFFFFF;
      box-shadow: 0 4px 12px rgba(11, 37, 69, 0.45);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 3;
    }
    .truck-eta {
      margin-top: 4px;
      background: #0B2545;
      color: #FFFFFF;
      font-size: 10px;
      font-weight: 700;
      padding: 2px 8px;
      border-radius: 12px;
      white-space: nowrap;
      box-shadow: 0 2px 6px rgba(0,0,0,0.25);
      border: 1px solid rgba(255,255,255,0.25);
    }

    /* Nearby Drivers */
    .nearby-driver-badge {
      position: relative;
      width: 32px;
      height: 32px;
      border-radius: 50%;
      background: #0B2545;
      border: 2px solid #F59E0B;
      box-shadow: 0 3px 10px rgba(11, 37, 69, 0.35);
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
    }
    .nearby-pulse {
      position: absolute;
      width: 38px;
      height: 38px;
      border-radius: 50%;
      background: rgba(245, 158, 11, 0.28);
      animation: pulseAura 2.2s ease-out infinite;
    }
    .nearby-emoji { font-size: 14px; position: relative; z-index: 2; }

    /* Interactive Draggable Pin */
    .pin-picker-wrap {
      position: relative;
      display: flex;
      flex-direction: column;
      align-items: center;
      cursor: grab;
      margin-bottom: 24px;
    }
    .pin-picker-head {
      width: 36px;
      height: 36px;
      border-radius: 50% 50% 50% 0;
      background: #0B2545;
      transform: rotate(-45deg);
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: 0 4px 12px rgba(11, 37, 69, 0.4);
      border: 2.5px solid #FFFFFF;
    }
    .pin-picker-center {
      width: 12px;
      height: 12px;
      border-radius: 50%;
      background: #F59E0B;
      transform: rotate(45deg);
    }
    .pin-picker-shadow {
      width: 14px;
      height: 6px;
      border-radius: 50%;
      background: rgba(0,0,0,0.25);
      margin-top: 4px;
    }

    /* Clean Overlay Badge */
    .vietmap-overlay-badge {
      position: absolute;
      top: 12px;
      left: 12px;
      z-index: 10;
      display: flex;
      align-items: center;
      gap: 6px;
      background: rgba(255, 255, 255, 0.94);
      backdrop-filter: blur(8px);
      padding: 4px 10px;
      border-radius: 20px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.12);
      border: 1px solid rgba(226, 232, 240, 0.9);
      pointer-events: none;
    }
    .badge-dot {
      width: 7px;
      height: 7px;
      border-radius: 50%;
      background: #10B981;
      box-shadow: 0 0 6px #10B981;
    }
    .badge-text {
      font-size: 10px;
      font-weight: 700;
      color: #0B2545;
      letter-spacing: 0.5px;
    }

    @keyframes pulseAura {
      0% { transform: scale(0.4); opacity: 0.9; }
      100% { transform: scale(1.6); opacity: 0; }
    }
  </style>
</head>
<body>
  <div id="map"></div>
  <svg id="svg-route-overlay" style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; pointer-events: none; z-index: 2;">
    <path id="svg-route-halo" fill="none" stroke="#FFFFFF" stroke-width="8" stroke-linecap="round" stroke-linejoin="round" opacity="0.95" />
    <path id="svg-route-core" fill="none" stroke="#0B2545" stroke-width="5.5" stroke-linecap="round" stroke-linejoin="round" />
  </svg>
  <div class="vietmap-overlay-badge">
    <div class="badge-dot"></div>
    <div class="badge-text">VIETMAP VECTOR GL</div>
  </div>

  <script>
    var map;
    var truckMarker = null;
    var driverMarkers = [];
    var pinPickerMarker = null;
    var currentRouteCoords = [];
    var isInitialized = false;
    // 'driving' = turn-by-turn 3D follow camera, 'overview' = fit the whole A → B route
    var drivingMode = ${followTruck ? "'driving'" : "'overview'"};
    var lastTruckLngLat = ${truckLocation ? `[${truckLocation.lng}, ${truckLocation.lat}]` : 'null'};

    // Resilient MapLibre GL Basemap Style (High availability, Vietnamese labels)
    var defaultStyle = {
      version: 8,
      sources: {
        'vietnam-basemap': {
          type: 'raster',
          tiles: [
            'https://mt0.google.com/vt/lyrs=m&x={x}&y={y}&z={z}&hl=vi',
            'https://mt1.google.com/vt/lyrs=m&x={x}&y={y}&z={z}&hl=vi',
            'https://mt2.google.com/vt/lyrs=m&x={x}&y={y}&z={z}&hl=vi',
            'https://mt3.google.com/vt/lyrs=m&x={x}&y={y}&z={z}&hl=vi'
          ],
          tileSize: 256
        }
      },
      layers: [
        {
          id: 'vietnam-basemap-layer',
          type: 'raster',
          source: 'vietnam-basemap',
          minzoom: 0,
          maxzoom: 22
        }
      ]
    };

    function updateSvgRoute() {
      if (!map || !currentRouteCoords || currentRouteCoords.length < 2) {
        var h = document.getElementById('svg-route-halo');
        var c = document.getElementById('svg-route-core');
        if (h) h.setAttribute('d', '');
        if (c) c.setAttribute('d', '');
        return;
      }
      try {
        var points = [];
        for (var i = 0; i < currentRouteCoords.length; i++) {
          var coord = currentRouteCoords[i];
          if (!coord || typeof coord[0] !== 'number' || typeof coord[1] !== 'number') continue;
          var pt = map.project(coord);
          points.push(Math.round(pt.x * 10) / 10 + ',' + Math.round(pt.y * 10) / 10);
        }
        if (points.length >= 2) {
          var d = 'M ' + points.join(' L ');
          var haloEl = document.getElementById('svg-route-halo');
          var coreEl = document.getElementById('svg-route-core');
          if (haloEl) haloEl.setAttribute('d', d);
          if (coreEl) coreEl.setAttribute('d', d);
        }
      } catch(e) {}
    }

    try {
      map = new maplibregl.Map({
        container: 'map',
        style: defaultStyle,
        center: [${centerCoords[0]}, ${centerCoords[1]}],
        zoom: ${zoom},
        bearing: ${bearing},
        pitch: ${pitch},
        interactive: ${interactive ? 'true' : 'false'},
        attributionControl: false
      });

      map.on('move', updateSvgRoute);
      map.on('zoom', updateSvgRoute);
      map.on('resize', updateSvgRoute);
      map.on('render', updateSvgRoute);

      // Background upgrade to Vietmap vector style when available and valid
      var vietmapStyleUrl = '${styleUrl}';
      if (vietmapStyleUrl && !vietmapStyleUrl.includes('test-api-key')) {
        fetch(vietmapStyleUrl)
          .then(function(res) {
            if (res.ok) return res.json();
            throw new Error('Vietmap style unavailable');
          })
          .then(function(vStyle) {
            if (vStyle && vStyle.layers) {
              map.setStyle(vStyle);
            }
          })
          .catch(function() {
            // Graceful fallback to default high-speed basemap
          });
      }

      if (${interactive && mode === 'pin' ? 'true' : 'false'}) {
        map.addControl(new maplibregl.NavigationControl({ showCompass: true }), 'top-right');
      }

      // Robust Dual-Engine Route Renderer (SVG Overlay + MapLibre GL Vector Layers)
      function renderRouteLine(geo) {
        if (!geo || !geo.features || geo.features.length === 0) return;

        // 1. Extract coordinates and update SVG route path immediately
        var allCoords = [];
        for (var f = 0; f < geo.features.length; f++) {
          var feat = geo.features[f];
          if (!feat.geometry || !feat.geometry.coordinates) continue;
          var geomCoords = feat.geometry.coordinates;
          if (feat.geometry.type === 'LineString') {
            for (var k = 0; k < geomCoords.length; k++) {
              var pt = geomCoords[k];
              if (Array.isArray(pt) && typeof pt[0] === 'number' && typeof pt[1] === 'number') {
                allCoords.push(pt);
              }
            }
          } else if (feat.geometry.type === 'MultiLineString') {
            for (var m = 0; m < geomCoords.length; m++) {
              var sub = geomCoords[m];
              for (var s = 0; s < sub.length; s++) {
                var spt = sub[s];
                if (Array.isArray(spt) && typeof spt[0] === 'number' && typeof spt[1] === 'number') {
                  allCoords.push(spt);
                }
              }
            }
          }
        }
        if (allCoords.length >= 2) {
          currentRouteCoords = allCoords;
          updateSvgRoute();
        }

        // 2. Render WebGL vector layers if style is loaded
        if (map.isStyleLoaded()) {
          try {
            if (map.getSource('vietmap-route')) {
              map.getSource('vietmap-route').setData(geo);
            } else {
              map.addSource('vietmap-route', {
                type: 'geojson',
                data: geo
              });
            }

            if (!map.getLayer('vietmap-route-halo')) {
              map.addLayer({
                id: 'vietmap-route-halo',
                type: 'line',
                source: 'vietmap-route',
                layout: { 'line-join': 'round', 'line-cap': 'round' },
                paint: {
                  'line-color': '#FFFFFF',
                  'line-width': 8,
                  'line-opacity': 0.95
                }
              });
            }

            if (!map.getLayer('vietmap-route-core')) {
              map.addLayer({
                id: 'vietmap-route-core',
                type: 'line',
                source: 'vietmap-route',
                layout: { 'line-join': 'round', 'line-cap': 'round' },
                paint: {
                  'line-color': '#0B2545',
                  'line-width': 5.5,
                  'line-opacity': 1.0
                }
              });
            }
          } catch(err) {
            console.warn('[VietmapGL] Route layer rendering warning:', err);
          }
        } else {
          map.once('style.load', function() {
            renderRouteLine(geo);
          });
        }

        // 3. Overview: frame the whole A → B route. Driving: keep the follow camera.
        if (allCoords.length >= 2 && drivingMode !== 'driving') {
          fitRouteBounds(0);
        }
      }

      function fitRouteBounds(duration) {
        if (!map || !currentRouteCoords || currentRouteCoords.length < 2) return;
        try {
          var b = new maplibregl.LngLatBounds();
          for (var i = 0; i < currentRouteCoords.length; i++) {
            var c = currentRouteCoords[i];
            if (typeof c[0] === 'number' && typeof c[1] === 'number' && isFinite(c[0]) && isFinite(c[1])) {
              b.extend(c);
            }
          }
          if (!b.isEmpty()) {
            map.fitBounds(b, {
              padding: { top: 90, bottom: 90, left: 40, right: 40 },
              maxZoom: 16,
              duration: typeof duration === 'number' ? duration : 500
            });
          }
        } catch(e) {}
      }

      // Turn-by-turn: lock the camera onto the vehicle with a 3D driving tilt.
      // The centre is biased a short way along the route ahead so the upcoming
      // road stays in frame — centring exactly on the vehicle at this zoom
      // pushed the route line off-screen and left only the truck icon visible.
      function computeAheadCenter() {
        if (!lastTruckLngLat) return null;
        if (!currentRouteCoords || currentRouteCoords.length < 2) return null;
        try {
          var best = -1, bestDist = Infinity;
          for (var i = 0; i < currentRouteCoords.length; i++) {
            var dx = currentRouteCoords[i][0] - lastTruckLngLat[0];
            var dy = currentRouteCoords[i][1] - lastTruckLngLat[1];
            var d = dx * dx + dy * dy;
            if (d < bestDist) { bestDist = d; best = i; }
          }
          if (best < 0) return null;
          var ahead = currentRouteCoords[Math.min(best + 6, currentRouteCoords.length - 1)];
          if (!ahead) return null;
          // Blend vehicle -> look-ahead point so the truck stays visible.
          return [
            lastTruckLngLat[0] + (ahead[0] - lastTruckLngLat[0]) * 0.6,
            lastTruckLngLat[1] + (ahead[1] - lastTruckLngLat[1]) * 0.6
          ];
        } catch (e) {
          return null;
        }
      }

      function followTruck(duration) {
        if (!map) return;
        var target = lastTruckLngLat || (currentRouteCoords && currentRouteCoords.length > 0 ? currentRouteCoords[0] : null);
        if (!target) return;
        try {
          map.easeTo({
            center: computeAheadCenter() || target,
            zoom: Math.max(map.getZoom(), 16.5),
            pitch: 55,
            bearing: map.getBearing(),
            duration: typeof duration === 'number' ? duration : 700
          });
        } catch(e) {}
      }

      function initLayers() {
        if (isInitialized) return;
        isInitialized = true;

        // 1. Initial Route GeoJSON calculation
        var routeGeo = ${JSON.stringify(routeGeoJSON)};
        ${
          originCoords && destCoords
            ? `
        if (!routeGeo || !routeGeo.features || routeGeo.features.length === 0) {
          routeGeo = {
            type: 'FeatureCollection',
            features: [{
              type: 'Feature',
              id: 'route-main',
              properties: { kind: 'active', color: '#0B2545' },
              geometry: {
                type: 'LineString',
                coordinates: [
                  [${originCoords.lng}, ${originCoords.lat}],
                  ${validStops.map((s) => `[${s.coords!.lng}, ${s.coords!.lat}]`).join(', ')}${validStops.length > 0 ? ',' : ''}
                  [${destCoords.lng}, ${destCoords.lat}]
                ]
              }
            }]
          };
        }
        `
            : ''
        }

        if (routeGeo) {
          renderRouteLine(routeGeo);
        }

        // 2. Render Origin Pin
        ${
          originCoords
            ? `
        var oWrap = document.createElement('div');
        oWrap.className = 'marker-pin';
        oWrap.innerHTML = '<div class="pin-pulse origin-pulse"></div><div class="pin-core origin-core"><div class="pin-dot"></div></div>';
        new maplibregl.Marker({ element: oWrap, anchor: 'center' })
          .setLngLat([${originCoords.lng}, ${originCoords.lat}])
          .addTo(map);
        `
            : ''
        }

        // 3. Render Destination Pin
        ${
          destCoords
            ? `
        var dWrap = document.createElement('div');
        dWrap.className = 'marker-pin';
        dWrap.innerHTML = '<div class="pin-pulse dest-pulse"></div><div class="pin-core dest-core"><div class="pin-dot"></div></div>';
        new maplibregl.Marker({ element: dWrap, anchor: 'center' })
          .setLngLat([${destCoords.lng}, ${destCoords.lat}])
          .addTo(map);
        `
            : ''
        }

        // 4. Render Intermediate Stops
        ${
          validStops.length > 0
            ? `
        var stopsData = ${JSON.stringify(validStops)};
        stopsData.forEach(function(st, i) {
          if (!st.coords) return;
          var sWrap = document.createElement('div');
          sWrap.className = 'marker-pin';
          var progressClass = st.progress ? st.progress.toLowerCase() : 'pending';
          sWrap.innerHTML = '<div class="stop-core ' + progressClass + '">' + (st.sequence || (i + 1)) + '</div>';
          new maplibregl.Marker({ element: sWrap, anchor: 'center' })
            .setLngLat([st.coords.lng, st.coords.lat])
            .addTo(map);
        });
        `
            : ''
        }

        // 5. Render Truck Location
        ${
          truckLocation
            ? `
        var tWrap = document.createElement('div');
        tWrap.className = 'truck-wrap';
        var etaText = ${JSON.stringify(displayEta)};
        tWrap.innerHTML = '<div class="truck-pulse"></div>' +
          '<div class="truck-badge"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 18V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v11a1 1 0 0 0 1 1h2"/><path d="M15 18H9"/><path d="M19 18h2a1 1 0 0 0 1-1v-3.65a1 1 0 0 0-.22-.624l-3.48-4.35A1 1 0 0 0 17.52 8H14"/><circle cx="7" cy="18.5" r="2.5"/><circle cx="17" cy="18.5" r="2.5"/></svg></div>' +
          (etaText ? '<div class="truck-eta">' + etaText + '</div>' : '');
        truckMarker = new maplibregl.Marker({ element: tWrap, anchor: 'center' })
          .setLngLat([${truckLocation.lng}, ${truckLocation.lat}])
          .addTo(map);
        `
            : ''
        }

        // 6. Render Nearby Drivers
        function renderDrivers(list) {
          driverMarkers.forEach(function(m) { m.remove(); });
          driverMarkers = [];
          if (!list || !list.length) return;
          list.forEach(function(d) {
            if (!d.lat || !d.lng) return;
            var dEl = document.createElement('div');
            dEl.className = 'nearby-driver-badge';
            var emo = d.vehicleType === 'VAN' ? '🚐' : d.vehicleType === 'MOTORBIKE' ? '🛵' : '🚛';
            dEl.innerHTML = '<div class="nearby-pulse"></div><span class="nearby-emoji">' + emo + '</span>';
            var mkr = new maplibregl.Marker({ element: dEl, anchor: 'center' })
              .setLngLat([d.lng, d.lat])
              .addTo(map);
            driverMarkers.push(mkr);
          });
        }
        renderDrivers(${JSON.stringify(nearbyDrivers)});

        // 7. Render Interactive Pin (Pin mode)
        ${
          mode === 'pin'
            ? `
        var pWrap = document.createElement('div');
        pWrap.className = 'pin-picker-wrap';
        pWrap.innerHTML = '<div class="pin-picker-head"><div class="pin-picker-center"></div></div><div class="pin-picker-shadow"></div>';
        pinPickerMarker = new maplibregl.Marker({ element: pWrap, draggable: true, anchor: 'bottom' })
          .setLngLat([${centerCoords[0]}, ${centerCoords[1]}])
          .addTo(map);

        function notifyPinMoved(coord) {
          if (window.parent) {
            window.parent.postMessage({
              type: 'LEOPARD_MAP_PIN_MOVED',
              mapInstanceId: '${mapInstanceId}',
              lat: coord.lat,
              lng: coord.lng
            }, '*');
          }
        }

        pinPickerMarker.on('dragend', function() {
          notifyPinMoved(pinPickerMarker.getLngLat());
        });

        map.on('click', function(e) {
          pinPickerMarker.setLngLat(e.lngLat);
          notifyPinMoved(e.lngLat);
        });
        `
            : ''
        }

        // 8. Notify parent that map is fully ready
        if (window.parent) {
          window.parent.postMessage({
            type: 'LEOPARD_MAP_READY',
            mapInstanceId: '${mapInstanceId}'
          }, '*');
        }
      }

      if (map.isStyleLoaded()) {
        initLayers();
      } else {
        map.once('style.load', initLayers);
      }
      map.on('load', function() {
        if (!isInitialized) {
          initLayers();
        }
      });
    } catch(err) {
      console.warn('[VietmapGL] Initialisation error:', err);
    }

    // Realtime message handler
    window.addEventListener('message', function(evt) {
      try {
        var msg = evt.data;
        if (!msg || typeof msg !== 'object') return;
        if (msg.type === 'LEOPARD_UPDATE_ROUTE' && msg.mapInstanceId === '${mapInstanceId}') {
          if (msg.routeGeo) {
            renderRouteLine(msg.routeGeo);
          }
        }
        if (msg.type === 'LEOPARD_UPDATE_TRUCK_LOCATION' && msg.mapInstanceId === '${mapInstanceId}') {
          if (typeof msg.lng === 'number' && typeof msg.lat === 'number') {
            lastTruckLngLat = [msg.lng, msg.lat];
            if (truckMarker) {
              truckMarker.setLngLat(lastTruckLngLat);
              if (msg.eta) {
                var etaBadge = truckMarker.getElement().querySelector('.truck-eta');
                if (etaBadge) etaBadge.textContent = msg.eta;
              }
            }
            if (drivingMode === 'driving') {
              followTruck(700);
            }
          }
        }
        // Recenter on the vehicle without changing overview / turn-by-turn mode.
        if (msg.type === 'LEOPARD_MAP_RECENTER' && (!msg.mapInstanceId || msg.mapInstanceId === '${mapInstanceId}')) {
          if (drivingMode === 'driving') {
            followTruck(800);
          } else if (lastTruckLngLat) {
            map.easeTo({ center: lastTruckLngLat, duration: 800 });
          }
        }
        // Broadcast protocol used by the driver cockpit: overview <-> turn-by-turn.
        if (msg.type === 'LEOPARD_MAP_SET_VIEW_MODE' && (!msg.mapInstanceId || msg.mapInstanceId === '${mapInstanceId}')) {
          drivingMode = msg.mode === 'driving' ? 'driving' : 'overview';
          if (drivingMode === 'driving') {
            followTruck(800);
          } else {
            fitRouteBounds(800);
          }
        }
        if (msg.type === 'LEOPARD_UPDATE_NEARBY_DRIVERS' && msg.mapInstanceId === '${mapInstanceId}') {
          if (Array.isArray(msg.drivers)) {
            renderDrivers(msg.drivers);
          }
        }
      } catch(e) {}
    });
  </script>
</body>
</html>`;
}

export function LeopardMapView({
  mode = 'preview',
  origin,
  destination,
  stops = [],
  truckLocation,
  truckEtaMinutes,
  truckEtaLabel,
  initialPinCoords,
  onLocationChange,
  height = 240,
  testID = 'leopard-map-view',
  style,
  interactive = true,
  vietmapApiKey,
  routeCoords = [],
  routeSegments = [],
  nearbyDrivers = [],
  zoom = 14,
  bearing = 0,
  pitch = 0,
  followTruckLocation = false,
}: LeopardMapViewProps) {
  const mapInstanceId = useId().replace(/:/g, '_');
  const iframeRef = useRef<any>(null);

  const resolvedApiKey = useMemo(() => {
    return (
      vietmapApiKey ||
      (typeof process !== 'undefined' && process.env?.EXPO_PUBLIC_VIETMAP_API_KEY) ||
      'c3d607a7ed780824b223d6a6bbec8f85f1c4e7ab56f3f015'
    );
  }, [vietmapApiKey]);

  // Center coordinate determination
  const centerCoords = useMemo<[number, number]>(() => {
    if (initialPinCoords) return [initialPinCoords.lng, initialPinCoords.lat];
    if (truckLocation) return [truckLocation.lng, truckLocation.lat];
    if (origin?.coords && destination?.coords) {
      return [
        (origin.coords.lng + destination.coords.lng) / 2,
        (origin.coords.lat + destination.coords.lat) / 2,
      ];
    }
    if (origin?.coords) return [origin.coords.lng, origin.coords.lat];
    if (destination?.coords) return [destination.coords.lng, destination.coords.lat];
    if (routeCoords.length > 0 && routeCoords[0]) return [routeCoords[0].lng, routeCoords[0].lat];
    return [106.660172, 10.762622]; // Ho Chi Minh City center
  }, [initialPinCoords, truckLocation, origin, destination, routeCoords]);

  // Route GeoJSON for Vector GL LineString
  const routeGeoJSON = useMemo(() => {
    if (routeSegments.length > 0) {
      return {
        type: 'FeatureCollection' as const,
        features: routeSegments.map((seg, idx) => ({
          type: 'Feature' as const,
          id: `seg-${idx}`,
          properties: {
            kind: seg.kind,
            color:
              seg.kind === 'completed'
                ? '#94A3B8'
                : seg.kind === 'active'
                ? '#0B2545'
                : '#CBD5E1',
          },
          geometry: {
            type: 'LineString' as const,
            coordinates: seg.coords.map((c) => [c.lng, c.lat]),
          },
        })),
      };
    }

    if (routeCoords.length >= 2) {
      return {
        type: 'FeatureCollection' as const,
        features: [
          {
            type: 'Feature' as const,
            id: 'route-main',
            properties: { kind: 'active', color: '#0B2545' },
            geometry: {
              type: 'LineString' as const,
              coordinates: routeCoords.map((c) => [c.lng, c.lat]),
            },
          },
        ],
      };
    }

    // Connect origin -> intermediate stops -> destination so route line always renders
    if (origin?.coords && destination?.coords) {
      const validStops: [number, number][] = stops
        .filter((s) => s.coords)
        .map((s) => [s.coords!.lng, s.coords!.lat]);
      const coords: [number, number][] = [
        [origin.coords.lng, origin.coords.lat],
        ...validStops,
        [destination.coords.lng, destination.coords.lat],
      ];
      return {
        type: 'FeatureCollection' as const,
        features: [
          {
            type: 'Feature' as const,
            id: 'route-main',
            properties: { kind: 'active', color: '#0B2545' },
            geometry: {
              type: 'LineString' as const,
              coordinates: coords,
            },
          },
        ],
      };
    }

    return null;
  }, [routeCoords, routeSegments, origin?.coords, destination?.coords, stops]);

  const displayEta = useMemo(() => {
    if (truckEtaLabel) return truckEtaLabel;
    if (typeof truckEtaMinutes === 'number') {
      return truckEtaMinutes > 0 ? `ETA: ${truckEtaMinutes} phút` : 'Đã đến';
    }
    return '';
  }, [truckEtaLabel, truckEtaMinutes]);

  // Listen for iframe postMessage (e.g. Pin dragged, map ready, etc.)
  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.addEventListener !== 'function') return;

    const handleWindowMessage = (event: MessageEvent) => {
      try {
        const data = event.data;
        if (!data || typeof data !== 'object') return;
        if (data.mapInstanceId === mapInstanceId) {
          if (
            data.type === 'LEOPARD_MAP_PIN_MOVED' &&
            typeof data.lat === 'number' &&
            typeof data.lng === 'number'
          ) {
            onLocationChange?.({ lat: data.lat, lng: data.lng });
          } else if (data.type === 'LEOPARD_MAP_READY') {
            if (routeGeoJSON) {
              iframeRef.current?.contentWindow?.postMessage(
                {
                  type: 'LEOPARD_UPDATE_ROUTE',
                  mapInstanceId,
                  routeGeo: routeGeoJSON,
                },
                '*',
              );
            }
          }
        }
      } catch {
        // Ignore cross-frame message errors
      }
    };

    window.addEventListener('message', handleWindowMessage);
    return () => window.removeEventListener('message', handleWindowMessage);
  }, [mapInstanceId, onLocationChange, routeGeoJSON]);

  const isTestEnv = typeof process !== 'undefined' && process.env?.NODE_ENV === 'test';

  // Push realtime route line update into iframe when route coordinates update
  useEffect(() => {
    if (!routeGeoJSON || isTestEnv) return;
    try {
      iframeRef.current?.contentWindow?.postMessage(
        {
          type: 'LEOPARD_UPDATE_ROUTE',
          mapInstanceId,
          routeGeo: routeGeoJSON,
        },
        '*',
      );
    } catch {
      // Ignore cross-frame communication errors
    }
  }, [routeGeoJSON, mapInstanceId, isTestEnv]);

  const vietmapHtml = useMemo(() => {
    return buildVietmapHtml({
      resolvedApiKey,
      originCoords: origin?.coords,
      destCoords: destination?.coords,
      validStops: stops.filter((s) => s.coords),
      truckLocation,
      displayEta,
      nearbyDrivers,
      mode,
      mapInstanceId,
      centerCoords,
      zoom,
      bearing,
      pitch,
      interactive,
      followTruck: followTruckLocation,
      routeGeoJSON,
    });
  }, [
    resolvedApiKey,
    origin,
    destination,
    stops,
    truckLocation,
    displayEta,
    nearbyDrivers,
    mode,
    mapInstanceId,
    centerCoords,
    zoom,
    bearing,
    pitch,
    interactive,
    followTruckLocation,
    routeGeoJSON,
  ]);

  if (isTestEnv) {
    return (
      <View
        accessibilityLabel="Bản đồ Vietmap Vector GL"
        accessibilityRole="image"
        style={[styles.container, { height: height as any }, style]}
        testID={testID}
      >
        <View style={styles.testFallback}>
          <Text style={styles.testBadgeText}>VIETMAP VECTOR GL</Text>
          {displayEta ? <Text style={styles.testEtaText}>{displayEta}</Text> : null}
          {nearbyDrivers && nearbyDrivers.length > 0 && (
            <View pointerEvents="none" style={styles.nearbyLayer} testID="nearby-drivers-layer">
              {nearbyDrivers.map((driver) => (
                <View key={driver.id} testID={`nearby-driver-${driver.id}`}>
                  <Text>{driver.vehicleType === 'VAN' ? '🚐' : driver.vehicleType === 'MOTORBIKE' ? '🛵' : '🚛'}</Text>
                </View>
              ))}
            </View>
          )}
        </View>
      </View>
    );
  }

  const isFullBleed = height === '100%';
  const iframeKey = `leopard-map-${mode}-${origin?.coords?.lat ?? ''}-${origin?.coords?.lng ?? ''}-${destination?.coords?.lat ?? ''}-${destination?.coords?.lng ?? ''}-${routeCoords.length}-${routeSegments.length}`;

  return (
    <View
      style={[
        styles.container,
        { height: height as any, borderRadius: isFullBleed ? 0 : 14 },
        style,
      ]}
      testID={testID}
    >
      {React.createElement('iframe', {
        key: iframeKey,
        ref: iframeRef,
        srcDoc: vietmapHtml,
        style: {
          width: '100%',
          height: '100%',
          border: 'none',
          borderRadius: isFullBleed ? 0 : 14,
          display: 'block',
        },
        title: 'Bản đồ Vietmap Vector GL',
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    height: '100%',
    backgroundColor: '#F1F5F9',
    overflow: 'hidden',
    position: 'relative',
  },
  testFallback: {
    flex: 1,
    backgroundColor: colors.operational.mapLand,
    alignItems: 'center',
    justifyContent: 'center',
  },
  testBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: customerPalette.primary,
  },
  testEtaText: {
    fontSize: 12,
    fontWeight: '700',
    color: customerPalette.accent,
    marginTop: 4,
  },
  nearbyLayer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
});
