import React, { useEffect, useId, useMemo, useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import type { LeopardMapMode, LeopardMapViewProps, MapCoordinate, MapStop, NearbyDriver } from './types';
import { anchorRouteToTruck } from './map-geospatial';
import { colors, customerPalette } from '../theme/tokens';
import { RealInteractiveMap } from '../ui/RealInteractiveMap';

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
  truckHeading?: number;
  interactive?: boolean;
  followTruck?: boolean;
  routeGeoJSON?: any;
  minZoom?: number;
  maxZoom?: number;
  maxBounds?: [[number, number], [number, number]];
  isPickupLeg?: boolean;
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
  minZoom,
  maxZoom,
  maxBounds,
  bearing = 0,
  pitch = 0,
  truckHeading,
  interactive = true,
  followTruck = false,
  routeGeoJSON,
  isPickupLeg = false,
}: BuildVietmapHtmlParams): string {
  const effectiveTruckHeading =
    typeof truckHeading === 'number'
      ? truckHeading
      : typeof bearing === 'number'
      ? bearing
      : 0;
  const styleUrl = `${VIETMAP_DEFAULT_STYLE}${resolvedApiKey}`;
  const defaultMinZoom = mode === 'tracking' ? 8.5 : 7.5;
  const effectiveMinZoom = typeof minZoom === 'number' ? minZoom : defaultMinZoom;
  const effectiveMaxZoom = typeof maxZoom === 'number' ? maxZoom : 19;
  const defaultMaxBounds: [[number, number], [number, number]] = [
    [101.0, 7.5],
    [111.5, 24.5],
  ];
  const effectiveMaxBounds = maxBounds ?? defaultMaxBounds;

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
    
    :root {
      --marker-zoom-scale: 1;
    }

    /* Scalable marker inner elements to prevent MapLibre outer translate3d clobbering zoom scale */
    .marker-zoom-pin {
      transform-origin: bottom center;
      transform: scale(var(--marker-zoom-scale, 1));
      transition: transform 0.08s ease-out;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: flex-end;
      pointer-events: auto;
    }
    .marker-zoom-inner {
      transform-origin: center center;
      transform: scale(var(--marker-zoom-scale, 1));
      transition: transform 0.08s ease-out;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      pointer-events: auto;
    }

    /* Google Maps Destination and Origin Pin Marker Styles */
    .gmap-pin-wrap {
      position: relative;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: flex-end;
      width: 38px;
      height: 48px;
      cursor: pointer;
      filter: drop-shadow(0 4px 10px rgba(0, 0, 0, 0.35));
    }
    .gmap-pin-pulse {
      position: absolute;
      bottom: 2px;
      left: 50%;
      width: 24px;
      height: 24px;
      margin-left: -12px;
      border-radius: 50%;
      animation: pulseAura 2s ease-out infinite;
      pointer-events: none;
    }
    .origin-pulse {
      position: absolute;
      bottom: -6px;
      left: 50%;
      width: 38px;
      height: 38px;
      margin-left: -19px;
      border-radius: 50%;
      background: rgba(16, 185, 129, 0.22);
      border: 1.5px solid rgba(16, 185, 129, 0.6);
      animation: pulseAura 2.2s ease-out infinite;
      pointer-events: none;
    }
    .dest-pulse { background: rgba(234, 67, 53, 0.35); }
    .gmap-pin-svg {
      transition: transform 0.2s ease;
    }
    .gmap-pin-wrap:hover .gmap-pin-svg {
      transform: translateY(-2px) scale(1.06);
    }

    /* Stop Markers */
    .stop-core {
      position: relative;
      width: 26px;
      height: 26px;
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

    /* Google Maps Navigation Arrow Puck Marker with Radar Waves */
    .truck-wrap {
      position: relative;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      width: 52px;
      height: 52px;
    }
    .truck-radar-wave {
      position: absolute;
      width: 44px;
      height: 44px;
      border-radius: 50%;
      pointer-events: none;
      animation: vehicleRadarPulse 3.2s ease-out infinite;
    }
    .truck-radar-wave.wave-1 {
      border: 1.5px solid rgba(245, 158, 11, 0.55);
      background: rgba(245, 158, 11, 0.08);
      animation-delay: 0s;
    }
    .truck-radar-wave.wave-2 {
      border: 1.5px solid rgba(37, 99, 235, 0.5);
      background: rgba(37, 99, 235, 0.08);
      animation-delay: 1.05s;
    }
    .truck-radar-wave.wave-3 {
      border: 1.5px solid rgba(245, 158, 11, 0.4);
      background: rgba(245, 158, 11, 0.04);
      animation-delay: 2.1s;
    }
    .truck-pulse {
      position: absolute;
      width: 44px;
      height: 44px;
      border-radius: 50%;
      background: rgba(37, 99, 235, 0.25);
      animation: pulseAura 2s ease-out infinite;
      pointer-events: none;
    }
    .truck-badge {
      position: relative;
      width: 36px;
      height: 36px;
      border-radius: 50%;
      background: #FFFFFF;
      border: 2.5px solid #2563EB;
      box-shadow: 0 4px 14px rgba(37, 99, 235, 0.45);
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
      transform-origin: center center;
      transform: scale(var(--marker-zoom-scale, 1));
      transition: transform 0.08s ease-out;
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
      transform-origin: bottom center;
      transform: scale(var(--marker-zoom-scale, 1));
      transition: transform 0.08s ease-out;
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

    @keyframes pulseAura {
      0% { transform: scale(0.6); opacity: 0.85; }
      50% { transform: scale(1.4); opacity: 0.35; }
      100% { transform: scale(2.0); opacity: 0; }
    }

    @keyframes vehicleRadarPulse {
      0% {
        transform: scale(0.6);
        opacity: 0.85;
      }
      40% {
        transform: scale(1.8);
        opacity: 0.45;
      }
      80% {
        transform: scale(2.8);
        opacity: 0.15;
      }
      100% {
        transform: scale(3.5);
        opacity: 0;
      }
    }
  </style>
</head>
<body>
  <div id="map"></div>
  <svg id="svg-route-overlay" style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; pointer-events: none; z-index: 2;">
    <path id="svg-route-halo" fill="none" stroke="#FFFFFF" stroke-width="8" stroke-linecap="round" stroke-linejoin="round" opacity="0.95" />
    <path id="svg-route-core" fill="none" stroke="#2563EB" stroke-width="5.5" stroke-linecap="round" stroke-linejoin="round" />
  </svg>

  <script>
    var map;
    var truckMarker = null;
    var driverMarkers = [];
    var pinPickerMarker = null;
    var originMarker = null;
    var currentRouteCoords = [];
    var isInitialized = false;
    // 'driving' = turn-by-turn 3D follow camera, 'overview' = fit the whole A → B route
    var drivingMode = ${followTruck ? "'driving'" : "'overview'"};
    var lastTruckLngLat = ${truckLocation ? `[${truckLocation.lng}, ${truckLocation.lat}]` : 'null'};

    function ensureOriginMarker(lng, lat) {
      if (!map) return;
      if (originMarker) {
        originMarker.setLngLat([lng, lat]);
      } else {
        var oWrap = document.createElement('div');
        oWrap.className = 'gmap-pin-wrap';
        oWrap.innerHTML = '<div class="marker-zoom-pin">' +
          '<div class="gmap-pin-pulse origin-pulse"></div>' +
          '<svg class="gmap-pin-svg" width="32" height="42" viewBox="0 0 32 42" fill="none">' +
          '<path d="M16 0C7.163 0 0 7.163 0 16c0 11.25 14.25 24.75 15.1 25.55a1.2 1.2 0 0 0 1.8 0C17.75 40.75 32 27.25 32 16c0-8.837-7.163-16-16-16z" fill="#10B981"/>' +
          '<circle cx="16" cy="16" r="6" fill="#FFFFFF"/>' +
          '<circle cx="16" cy="16" r="2.8" fill="#10B981"/>' +
          '</svg>' +
          '</div>';
        originMarker = new maplibregl.Marker({ element: oWrap, anchor: 'bottom' })
          .setLngLat([lng, lat])
          .addTo(map);
      }
    }

    var driverMarkerMap = {};
    function renderDrivers(list) {
      if (!map) return;
      var nextIds = {};
      if (Array.isArray(list)) {
        list.forEach(function(d) {
          if (!d || !d.lat || !d.lng) return;
          nextIds[d.id] = true;
          if (driverMarkerMap[d.id]) {
            driverMarkerMap[d.id].setLngLat([d.lng, d.lat]);
          } else {
            var dEl = document.createElement('div');
            dEl.className = 'nearby-driver-badge';
            var emo = d.vehicleType === 'VAN' ? '🚐' : d.vehicleType === 'MOTORBIKE' ? '🛵' : '🚛';
            dEl.innerHTML = '<div class="nearby-pulse"></div><span class="nearby-emoji">' + emo + '</span>';
            var mkr = new maplibregl.Marker({ element: dEl, anchor: 'center' })
              .setLngLat([d.lng, d.lat])
              .addTo(map);
            driverMarkerMap[d.id] = mkr;
          }
        });
      }
      for (var id in driverMarkerMap) {
        if (!nextIds[id]) {
          driverMarkerMap[id].remove();
          delete driverMarkerMap[id];
        }
      }
    }

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
      var svgOverlay = document.getElementById('svg-route-overlay');
      if (svgOverlay && svgOverlay.style.display === 'none') return;
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

    var vietmapStyleUrl = '${styleUrl}';
    var hasValidVietmapKey = Boolean(
      vietmapStyleUrl &&
      !vietmapStyleUrl.includes('test-api-key') &&
      '${resolvedApiKey || ''}'.trim().length > 10
    );

    try {
      // 1. ALWAYS initialize with local in-memory basemap so map NEVER renders white on 401/423
      map = new maplibregl.Map({
        container: 'map',
        style: defaultStyle,
        center: [${centerCoords[0]}, ${centerCoords[1]}],
        zoom: ${zoom},
        minZoom: ${effectiveMinZoom},
        maxZoom: ${effectiveMaxZoom},
        maxBounds: ${JSON.stringify(effectiveMaxBounds)},
        bearing: ${bearing},
        pitch: ${pitch},
        interactive: ${interactive ? 'true' : 'false'},
        attributionControl: false
      });

      map.on('error', function(e) {
        if (e && e.error) {
          console.warn('[LeopardMapView] Map error caught:', e.error.message || e.error);
        }
      });

      // 2. High-availability reliable basemap is already loaded as defaultStyle with zero external dependency.
      // (No remote styles.json fetch required, completely eliminating CORS 401 warnings on web).

      function updateMarkerZoomScale() {
        if (!map) return;
        var z = map.getZoom();
        var s = Math.max(0.38, Math.min(1.18, 0.42 + (z - 8) * 0.076));
        document.documentElement.style.setProperty('--marker-zoom-scale', s.toFixed(3));
      }
      map.on('zoom', updateMarkerZoomScale);
      updateMarkerZoomScale();

      map.on('move', updateSvgRoute);
      map.on('zoom', updateSvgRoute);
      map.on('resize', updateSvgRoute);

      var lastRenderedRouteGeo = null;

      map.on('style.load', function() {
        if (lastRenderedRouteGeo) {
          renderRouteLine(lastRenderedRouteGeo);
        }
      });

      if (${interactive && mode === 'pin' ? 'true' : 'false'}) {
        map.addControl(new maplibregl.NavigationControl({ showCompass: true }), 'top-right');
      }

      // Robust Dual-Engine Route Renderer (MapLibre GL Vector Layers + SVG Fallback)
      function renderRouteLine(geo) {
        if (!geo || !geo.features || geo.features.length === 0) return;
        lastRenderedRouteGeo = geo;

        // 1. Extract coordinates
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
        }

        // 2. Render WebGL vector layers if style is loaded
        var svgOverlay = document.getElementById('svg-route-overlay');
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

            var firstSymbol = map.getStyle().layers ? map.getStyle().layers.find(function(l) { return l.type === 'symbol'; }) : null;
            var firstSymbolId = firstSymbol ? firstSymbol.id : undefined;

            if (!map.getLayer('vietmap-route-halo')) {
              map.addLayer({
                id: 'vietmap-route-halo',
                type: 'line',
                source: 'vietmap-route',
                layout: { 'line-join': 'round', 'line-cap': 'round' },
                paint: {
                  'line-color': '#0B3D91',
                  'line-width': ['interpolate', ['exponential', 1.5], ['zoom'], 10, 2.7, 18, 19.8],
                  'line-opacity': 0.95
                }
              }, firstSymbolId);
            }

            if (!map.getLayer('vietmap-route-core')) {
              map.addLayer({
                id: 'vietmap-route-core',
                type: 'line',
                source: 'vietmap-route',
                layout: { 'line-join': 'round', 'line-cap': 'round' },
                paint: {
                  'line-color': ['coalesce', ['get', 'color'], '#2F7BFF'],
                  'line-width': ['interpolate', ['exponential', 1.5], ['zoom'], 10, 1.8, 18, 13.2],
                  'line-opacity': 1.0
                }
              }, firstSymbolId);
            }
            if (svgOverlay) svgOverlay.style.display = 'none';
          } catch(err) {
            console.warn('[VietmapGL] Route layer rendering warning:', err);
            if (svgOverlay) svgOverlay.style.display = 'block';
            updateSvgRoute();
          }
        } else {
          if (svgOverlay) svgOverlay.style.display = 'block';
          updateSvgRoute();
          map.once('style.load', function() {
            renderRouteLine(geo);
          });
        }

        // Real Street Routing: If route has < 3 points (e.g. straight line fallback), resolve street coordinates via Vietmap or OSRM
        var targetCoords = ${isPickupLeg ? (originCoords ? JSON.stringify(originCoords) : 'null') : (destCoords ? JSON.stringify(destCoords) : 'null')};
        if (allCoords.length < 3 && targetCoords) {
          var startPt = ${isPickupLeg ? 'lastTruckLngLat' : mode === 'tracking' ? 'lastTruckLngLat' : originCoords ? `[${originCoords.lng}, ${originCoords.lat}]` : 'null'};
          if (startPt && (startPt[0] !== targetCoords.lng || startPt[1] !== targetCoords.lat)) {
            var applyStreetCoords = function(streetCoords) {
              currentRouteCoords = streetCoords;
              var updatedGeo = {
                type: 'FeatureCollection',
                features: [{
                  type: 'Feature',
                  id: 'route-main',
                  properties: { kind: 'active', color: '#2563EB' },
                  geometry: { type: 'LineString', coordinates: streetCoords }
                }]
              };
              lastRenderedRouteGeo = updatedGeo;
              if (map.getSource('vietmap-route')) {
                map.getSource('vietmap-route').setData(updatedGeo);
              } else {
                renderRouteLine(updatedGeo);
              }
              if (!map.isStyleLoaded() && svgOverlay) {
                svgOverlay.style.display = 'block';
                updateSvgRoute();
              }
              if (drivingMode !== 'driving') {
                fitRouteBounds(400);
              }
            };

            var vmApiKey = '${resolvedApiKey || ''}';
            var hasVm = vmApiKey && !vmApiKey.includes('test-api-key');
            var vmUrl = '';
            if (hasVm) {
              var vmParams = new URLSearchParams();
              vmParams.set('apikey', vmApiKey);
              vmParams.append('point', startPt[1] + ',' + startPt[0]);
              vmParams.append('point', targetCoords.lat + ',' + targetCoords.lng);
              vmParams.set('vehicle', 'truck');
              vmParams.set('points_encoded', 'false');
              vmUrl = 'https://maps.vietmap.vn/api/route/v3?' + vmParams.toString();
            }

            var fetchVm = function() {
              if (!hasVm) return Promise.reject(new Error('No VM key'));
              return fetch(vmUrl)
                .then(function(res) {
                  if (!res.ok) throw new Error('VM route status ' + res.status);
                  return res.json();
                })
                .then(function(vmData) {
                  var p = vmData && vmData.paths && vmData.paths[0];
                  if (p && p.points && Array.isArray(p.points.coordinates) && p.points.coordinates.length >= 2) {
                    return p.points.coordinates;
                  }
                  throw new Error('Invalid VM route response');
                });
            };

            fetchVm()
              .then(function(streetCoords) {
                applyStreetCoords(streetCoords);
              })
              .catch(function() {
                var osrmUrl = 'https://router.project-osrm.org/route/v1/driving/' + startPt[0] + ',' + startPt[1] + ';' + targetCoords.lng + ',' + targetCoords.lat + '?overview=full&geometries=geojson';
                fetch(osrmUrl)
                  .then(function(res) { return res.json(); })
                  .then(function(data) {
                    if (data && data.routes && data.routes[0] && data.routes[0].geometry && data.routes[0].geometry.coordinates && data.routes[0].geometry.coordinates.length >= 2) {
                      applyStreetCoords(data.routes[0].geometry.coordinates);
                    }
                  })
                  .catch(function(err) {
                    console.warn('[LeopardMapView] Street route resolution fallback error:', err);
                  });
              });
          }
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
            var bottomPad = ('${mode}' === 'route' || '${mode}' === 'preview') ? 320 : 90;
            map.fitBounds(b, {
              padding: { top: 90, bottom: bottomPad, left: 40, right: 40 },
              minZoom: ${effectiveMinZoom},
              maxZoom: 16,
              bearing: 0,
              pitch: 0,
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

      // ── Unified recenter: ALL recenter paths call this single function ────────
      // easeInOutCubic gives the smooth decelerate-at-end feel of iOS Maps.
      function easeInOutCubic(t) {
        return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
      }

      var RECENTER_DURATION = 650; // ms — consistent across every trigger path
      var lastTruckBearing = ${effectiveTruckHeading};
      var isUserInteracting = false;
      var userInteractTimeout = null;

      function pauseAutoFollow() {
        isUserInteracting = true;
        if (userInteractTimeout) clearTimeout(userInteractTimeout);
        userInteractTimeout = setTimeout(function() {
          isUserInteracting = false;
        }, 6000);
      }

      map.on('dragstart', pauseAutoFollow);
      map.on('zoomstart', pauseAutoFollow);
      map.on('rotatestart', pauseAutoFollow);
      map.on('pitchstart', pauseAutoFollow);

      function recenterMap(opts) {
        if (!map) return;
        isUserInteracting = false;
        if (userInteractTimeout) clearTimeout(userInteractTimeout);
        opts = opts || {};
        var target = opts.center
          || (lastTruckLngLat ? (computeAheadCenter() || lastTruckLngLat) : null)
          || (currentRouteCoords && currentRouteCoords.length > 0 ? currentRouteCoords[0] : null);
        if (!target) return;
        try {
          map.easeTo({
            center: computeAheadCenter() || target,
            zoom: typeof opts.zoom === 'number' ? opts.zoom : Math.max(map.getZoom(), 15.5),
            pitch: typeof opts.pitch === 'number' ? opts.pitch : (drivingMode === 'driving' ? 50 : 0),
            bearing: typeof opts.bearing === 'number' ? opts.bearing : 0,
            duration: RECENTER_DURATION,
            easing: easeInOutCubic
          });
        } catch(e) {}
      }

      // Smooth vehicle follow tracking
      function followTruck(duration) {
        if (!isUserInteracting) {
          recenterMap();
        }
      }

      function initLayers() {
        if (isInitialized) return;
        isInitialized = true;

        // 1. Initial Route GeoJSON calculation
        var routeGeo = ${JSON.stringify(routeGeoJSON)};
        ${
          isPickupLeg
            ? `
        if (!routeGeo || !routeGeo.features || routeGeo.features.length === 0) {
          ${
            truckLocation && originCoords
              ? `
          routeGeo = {
            type: 'FeatureCollection',
            features: [{
              type: 'Feature',
              id: 'route-main',
              properties: { kind: 'active', color: '#2563EB' },
              geometry: {
                type: 'LineString',
                coordinates: [
                  [${truckLocation.lng}, ${truckLocation.lat}],
                  [${originCoords.lng}, ${originCoords.lat}]
                ]
              }
            }]
          };
          `
              : originCoords && destCoords
              ? `
          routeGeo = {
            type: 'FeatureCollection',
            features: [{
              type: 'Feature',
              id: 'route-main',
              properties: { kind: 'active', color: '#2563EB' },
              geometry: {
                type: 'LineString',
                coordinates: [
                  [${originCoords.lng}, ${originCoords.lat}],
                  [${destCoords.lng}, ${destCoords.lat}]
                ]
              }
            }]
          };
          `
              : ''
          }
        }
        `
            : originCoords && destCoords
            ? `
        if (!routeGeo || !routeGeo.features || routeGeo.features.length === 0) {
          routeGeo = {
            type: 'FeatureCollection',
            features: [{
              type: 'Feature',
              id: 'route-main',
              properties: { kind: 'active', color: '#2563EB' },
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

        // Auto-resolve real street route for pickup leg (truck → origin, or origin → destination fallback) via OSRM when no polyline provided
        ${
          isPickupLeg
            ? `
        if (!${JSON.stringify(routeGeoJSON)} || !${JSON.stringify(routeGeoJSON)}?.features?.length) {
          ${
            truckLocation && originCoords
              ? `
          var osrmPickupUrl = 'https://router.project-osrm.org/route/v1/driving/${truckLocation.lng},${truckLocation.lat};${originCoords.lng},${originCoords.lat}?overview=full&geometries=geojson';
          fetch(osrmPickupUrl)
            .then(function(r) { return r.json(); })
            .then(function(d) {
              var coords = d && d.routes && d.routes[0] && d.routes[0].geometry && d.routes[0].geometry.coordinates;
              if (coords && coords.length >= 2) {
                var streetGeo = {
                  type: 'FeatureCollection',
                  features: [{ type: 'Feature', id: 'route-main', properties: { kind: 'active', color: '#2563EB' }, geometry: { type: 'LineString', coordinates: coords } }]
                };
                renderRouteLine(streetGeo);
              }
            })
            .catch(function() {});
          `
              : originCoords && destCoords
              ? `
          var osrmPickupFallbackUrl = 'https://router.project-osrm.org/route/v1/driving/${originCoords.lng},${originCoords.lat};${destCoords.lng},${destCoords.lat}?overview=full&geometries=geojson';
          fetch(osrmPickupFallbackUrl)
            .then(function(r) { return r.json(); })
            .then(function(d) {
              var coords = d && d.routes && d.routes[0] && d.routes[0].geometry && d.routes[0].geometry.coordinates;
              if (coords && coords.length >= 2) {
                var streetGeo = {
                  type: 'FeatureCollection',
                  features: [{ type: 'Feature', id: 'route-main', properties: { kind: 'active', color: '#2563EB' }, geometry: { type: 'LineString', coordinates: coords } }]
                };
                renderRouteLine(streetGeo);
              }
            })
            .catch(function() {});
          `
              : ''
          }
        }
        `
            : originCoords && destCoords
            ? `
        if (!${JSON.stringify(routeGeoJSON)} || !${JSON.stringify(routeGeoJSON)}?.features?.length) {
          var vmKey = '${resolvedApiKey}';
          var hasVmKey = vmKey && !vmKey.includes('test-api-key');
          var osrmDeliveryUrl = 'https://router.project-osrm.org/route/v1/driving/${originCoords.lng},${originCoords.lat};${destCoords.lng},${destCoords.lat}?overview=full&geometries=geojson';
          var fetchFn = hasVmKey
            ? fetch('https://maps.vietmap.vn/api/route/v3?apikey=' + vmKey + '&point=${originCoords.lat},${originCoords.lng}&point=${destCoords.lat},${destCoords.lng}&vehicle=truck&points_encoded=false')
                .then(function(r) { return r.json(); })
                .then(function(d) {
                  var c = d && d.paths && d.paths[0] && d.paths[0].points && d.paths[0].points.coordinates;
                  if (c && c.length >= 2) return c;
                  throw new Error('no vm route');
                })
            : Promise.reject('no key');
          fetchFn.catch(function() {
            return fetch(osrmDeliveryUrl).then(function(r) { return r.json(); }).then(function(d) {
              var c = d && d.routes && d.routes[0] && d.routes[0].geometry && d.routes[0].geometry.coordinates;
              if (c && c.length >= 2) return c;
              throw new Error('no osrm route');
            });
          }).then(function(coords) {
            var streetGeo = {
              type: 'FeatureCollection',
              features: [{ type: 'Feature', id: 'route-main', properties: { kind: 'active', color: '#2563EB' }, geometry: { type: 'LineString', coordinates: coords } }]
            };
            renderRouteLine(streetGeo);
          }).catch(function() {});
        }
        `
            : ''
        }

        // 2. Render Origin Pin (Green Pin with needle anchored at bottom)
        ${
          originCoords
            ? `
        ensureOriginMarker(${originCoords.lng}, ${originCoords.lat});
        `
            : ''
        }

        // 3. Render Destination Pin (Red Pin with needle anchored at bottom tip)
        ${
          destCoords
            ? `
        var dWrap = document.createElement('div');
        dWrap.className = 'gmap-pin-wrap';
        dWrap.innerHTML = '<div class="marker-zoom-pin">' +
          '<div class="gmap-pin-pulse dest-pulse"></div>' +
          '<svg class="gmap-pin-svg" width="34" height="44" viewBox="0 0 32 42" fill="none">' +
          '<path d="M16 0C7.163 0 0 7.163 0 16c0 11.25 14.25 24.75 15.1 25.55a1.2 1.2 0 0 0 1.8 0C17.75 40.75 32 27.25 32 16c0-8.837-7.163-16-16-16z" fill="#EA4335"/>' +
          '<circle cx="16" cy="16" r="6.5" fill="#FFFFFF"/>' +
          '<circle cx="16" cy="16" r="3" fill="#EA4335"/>' +
          '</svg>' +
          '</div>';
        new maplibregl.Marker({ element: dWrap, anchor: 'bottom' })
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
          sWrap.className = 'gmap-pin-wrap';
          var progressClass = st.progress ? st.progress.toLowerCase() : 'pending';
          sWrap.innerHTML = '<div class="marker-zoom-inner"><div class="stop-core ' + progressClass + '">' + (st.sequence || (i + 1)) + '</div></div>';
          new maplibregl.Marker({ element: sWrap, anchor: 'center' })
            .setLngLat([st.coords.lng, st.coords.lat])
            .addTo(map);
        });
        `
            : ''
        }

        // 5. Render Truck Location (Google Maps Navigation Chevron Arrow)
        ${
          truckLocation
            ? `
        var tWrap = document.createElement('div');
        tWrap.className = 'truck-wrap';
        var etaText = ${JSON.stringify(displayEta)};
        tWrap.innerHTML = '<div class="marker-zoom-inner">' +
          '<div class="truck-radar-wave wave-1"></div>' +
          '<div class="truck-radar-wave wave-2"></div>' +
          '<div class="truck-radar-wave wave-3"></div>' +
          '<div class="truck-badge" style="transform: rotate(' + (${effectiveTruckHeading}) + 'deg); transition: transform 0.6s cubic-bezier(0.34, 1.56, 0.64, 1);">' +
          '<svg width="22" height="22" viewBox="0 0 24 24" fill="none">' +
          '<path d="M12 2L20.5 20.5L12 16.5L3.5 20.5L12 2Z" fill="#2563EB" stroke="#FFFFFF" stroke-width="1.6" stroke-linejoin="round"/>' +
          '</svg>' +
          '</div>' +
          (etaText ? '<div class="truck-eta">' + etaText + '</div>' : '') +
          '</div>';
        truckMarker = new maplibregl.Marker({ element: tWrap, anchor: 'center', rotationAlignment: 'map' })
          .setLngLat([${truckLocation.lng}, ${truckLocation.lat}])
          .addTo(map);
        if (typeof truckMarker.setRotation === 'function') {
          truckMarker.setRotation(${effectiveTruckHeading});
        }
        `
            : ''
        }

        // 6. Render Nearby Drivers
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
        if (msg.type === 'LEOPARD_UPDATE_ROUTE' && (!msg.mapInstanceId || msg.mapInstanceId === '${mapInstanceId}')) {
          if (msg.routeGeo) {
            renderRouteLine(msg.routeGeo);
          }
        }
        if (msg.type === 'LEOPARD_UPDATE_TRUCK_LOCATION' && (!msg.mapInstanceId || msg.mapInstanceId === '${mapInstanceId}')) {
          if (typeof msg.lng === 'number' && typeof msg.lat === 'number') {
            lastTruckLngLat = [msg.lng, msg.lat];
            if (truckMarker) {
              truckMarker.setLngLat(lastTruckLngLat);
              if (msg.eta) {
                var etaBadge = truckMarker.getElement().querySelector('.truck-eta');
                if (etaBadge) etaBadge.textContent = msg.eta;
              }
              if (typeof msg.bearing === 'number') {
                lastTruckBearing = msg.bearing;
                if (typeof truckMarker.setRotation === 'function') {
                  truckMarker.setRotation(msg.bearing);
                }
                var badgeEl = truckMarker.getElement().querySelector('.truck-badge');
                if (badgeEl) badgeEl.style.transform = 'rotate(' + msg.bearing + 'deg)';
              }
            } else {
              var tWrap = document.createElement('div');
              tWrap.className = 'truck-wrap';
              var bVal = typeof msg.bearing === 'number' ? msg.bearing : 0;
              tWrap.innerHTML = '<div class="marker-zoom-inner">' +
                '<div class="truck-radar-wave wave-1"></div>' +
                '<div class="truck-radar-wave wave-2"></div>' +
                '<div class="truck-radar-wave wave-3"></div>' +
                '<div class="truck-badge" style="transform: rotate(' + bVal + 'deg); transition: transform 0.6s cubic-bezier(0.34, 1.56, 0.64, 1);">' +
                '<svg width="22" height="22" viewBox="0 0 24 24" fill="none">' +
                '<path d="M12 2L20.5 20.5L12 16.5L3.5 20.5L12 2Z" fill="#2563EB" stroke="#FFFFFF" stroke-width="1.6" stroke-linejoin="round"/>' +
                '</svg>' +
                '</div>' +
                (msg.eta ? '<div class="truck-eta">' + msg.eta + '</div>' : '') +
                '</div>';
              truckMarker = new maplibregl.Marker({ element: tWrap, anchor: 'center', rotationAlignment: 'map' })
                .setLngLat(lastTruckLngLat)
                .addTo(map);
              if (typeof truckMarker.setRotation === 'function') {
                truckMarker.setRotation(bVal);
              }
            }
            if ('${mode}' === 'tracking' && currentRouteCoords && currentRouteCoords.length >= 2) {
              currentRouteCoords[0] = lastTruckLngLat;
              updateSvgRoute();
            }
            if (drivingMode === 'driving' || ${followTruck ? 'true' : 'false'} || '${mode}' === 'tracking') {
              followTruck(700);
            }
          }
        }
        // Recenter on the user location or vehicle without changing overview / turn-by-turn mode.
        if (msg.type === 'LEOPARD_MAP_RECENTER' && (!msg.mapInstanceId || msg.mapInstanceId === '${mapInstanceId}')) {
          if (drivingMode === 'driving') {
            recenterMap();
          } else if (typeof msg.lat === 'number' && typeof msg.lng === 'number') {
            recenterMap({ center: [msg.lng, msg.lat] });
          } else if (msg.center && Array.isArray(msg.center)) {
            recenterMap({ center: msg.center });
          } else {
            recenterMap();
          }
        }
        if (msg.type === 'LEOPARD_UPDATE_ORIGIN' && (!msg.mapInstanceId || msg.mapInstanceId === '${mapInstanceId}')) {
          if (typeof msg.lat === 'number' && typeof msg.lng === 'number') {
            ensureOriginMarker(msg.lng, msg.lat);
            if (msg.recenter !== false && map) {
              recenterMap({ center: [msg.lng, msg.lat] });
            }
          }
        }
        // Broadcast protocol used by the driver cockpit: overview <-> turn-by-turn.
        if (msg.type === 'LEOPARD_MAP_SET_VIEW_MODE' && (!msg.mapInstanceId || msg.mapInstanceId === '${mapInstanceId}')) {
          drivingMode = msg.mode === 'driving' ? 'driving' : 'overview';
          if (drivingMode === 'driving') {
            recenterMap();
          } else {
            fitRouteBounds(RECENTER_DURATION);
          }
        }
        if (msg.type === 'LEOPARD_UPDATE_NEARBY_DRIVERS' && (!msg.mapInstanceId || msg.mapInstanceId === '${mapInstanceId}')) {
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
  title,
  vietmapApiKey,
  routeResolutionPolicy,
  routeCoords = [],
  routeSegments = [],
  nearbyDrivers = [],
  zoom = 14,
  minZoom,
  maxZoom,
  maxBounds,
  bearing = 0,
  pitch = 0,
  truckHeading,
  followTruckLocation = false,
  isPickupLeg = false,
  recenterNonce,
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
                ? '#2563EB'
                : '#CBD5E1',
          },
          geometry: {
            type: 'LineString' as const,
            coordinates: seg.coords.map((c) => [c.lng, c.lat]),
          },
        })),
      };
    }

    const effectiveRouteCoords =
      mode === 'tracking' && truckLocation
        ? anchorRouteToTruck({
            routeCoords,
            truckLocation,
            originCoords: origin?.coords,
            destinationCoords: destination?.coords,
            isPickupLeg: Boolean(isPickupLeg),
          })
        : routeCoords;

    if (effectiveRouteCoords.length >= 2) {
      return {
        type: 'FeatureCollection' as const,
        features: [
          {
            type: 'Feature' as const,
            id: 'route-main',
            properties: { kind: 'active', color: '#2563EB' },
            geometry: {
              type: 'LineString' as const,
              coordinates: effectiveRouteCoords.map((c) => [c.lng, c.lat]),
            },
          },
        ],
      };
    }

    // Connect origin -> intermediate stops -> destination so route line always renders
    if (origin?.coords && destination?.coords) {
      if (isPickupLeg) {
        if (truckLocation && origin.coords) {
          return {
            type: 'FeatureCollection' as const,
            features: [
              {
                type: 'Feature' as const,
                id: 'route-main',
                properties: { kind: 'active', color: '#2563EB' },
                geometry: {
                  type: 'LineString' as const,
                  coordinates: [
                    [truckLocation.lng, truckLocation.lat],
                    [origin.coords.lng, origin.coords.lat],
                  ],
                },
              },
            ],
          };
        }
        return {
          type: 'FeatureCollection' as const,
          features: [
            {
              type: 'Feature' as const,
              id: 'route-main',
              properties: { kind: 'active', color: '#2563EB' },
              geometry: {
                type: 'LineString' as const,
                coordinates: [
                  [origin.coords.lng, origin.coords.lat],
                  [destination.coords.lng, destination.coords.lat],
                ],
              },
            },
          ],
        };
      }

      const validStops: [number, number][] = stops
        .filter((s) => s.coords)
        .map((s) => [s.coords!.lng, s.coords!.lat]);
      const baseCoords: [number, number][] = [
        [origin.coords.lng, origin.coords.lat],
        ...validStops,
        [destination.coords.lng, destination.coords.lat],
      ];
      const coords: [number, number][] =
        mode === 'tracking' && truckLocation
          ? [[truckLocation.lng, truckLocation.lat], ...baseCoords]
          : baseCoords;
      return {
        type: 'FeatureCollection' as const,
        features: [
          {
            type: 'Feature' as const,
            id: 'route-main',
            properties: { kind: 'active', color: '#2563EB' },
            geometry: {
              type: 'LineString' as const,
              coordinates: coords,
            },
          },
        ],
      };
    }

    return null;
  }, [routeCoords, routeSegments, origin?.coords, destination?.coords, stops, mode, truckLocation, isPickupLeg]);

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

  // Push realtime truck location update into iframe when truckLocation or bearing updates
  useEffect(() => {
    if (!truckLocation || isTestEnv) return;
    const effectiveHeading =
      typeof truckHeading === 'number'
        ? truckHeading
        : typeof bearing === 'number'
        ? bearing
        : 0;
    try {
      iframeRef.current?.contentWindow?.postMessage(
        {
          type: 'LEOPARD_UPDATE_TRUCK_LOCATION',
          mapInstanceId,
          lat: truckLocation.lat,
          lng: truckLocation.lng,
          bearing: effectiveHeading,
          eta: displayEta,
        },
        '*',
      );
    } catch {
      // Ignore cross-frame communication errors
    }
  }, [truckLocation?.lat, truckLocation?.lng, truckHeading, bearing, displayEta, mapInstanceId, isTestEnv]);

  // Push realtime origin location update into iframe when origin coords update
  useEffect(() => {
    if (!origin?.coords || isTestEnv) return;
    try {
      iframeRef.current?.contentWindow?.postMessage(
        {
          type: 'LEOPARD_UPDATE_ORIGIN',
          mapInstanceId,
          lat: origin.coords.lat,
          lng: origin.coords.lng,
          label: origin.label,
        },
        '*',
      );
    } catch {
      // Ignore cross-frame communication errors
    }
  }, [origin?.coords?.lat, origin?.coords?.lng, origin?.label, mapInstanceId, isTestEnv]);

  // Push realtime nearby drivers update into iframe when nearbyDrivers prop updates
  useEffect(() => {
    if (isTestEnv) return;
    try {
      iframeRef.current?.contentWindow?.postMessage(
        {
          type: 'LEOPARD_UPDATE_NEARBY_DRIVERS',
          mapInstanceId,
          drivers: nearbyDrivers,
        },
        '*',
      );
    } catch {
      // Ignore cross-frame communication errors
    }
  }, [nearbyDrivers, mapInstanceId, isTestEnv]);

  // Trigger recenter animation inside iframe whenever recenterNonce increments
  useEffect(() => {
    if (recenterNonce == null || recenterNonce === 0 || isTestEnv) return;
    try {
      iframeRef.current?.contentWindow?.postMessage(
        {
          type: 'LEOPARD_MAP_RECENTER',
          mapInstanceId,
          lat: truckLocation?.lat,
          lng: truckLocation?.lng,
        },
        '*',
      );
    } catch {
      // Ignore cross-frame communication errors
    }
  }, [recenterNonce, mapInstanceId, isTestEnv]);

  // Push driving mode (turn-by-turn vs overview) into iframe when followTruckLocation or mode changes
  useEffect(() => {
    if (isTestEnv) return;
    try {
      iframeRef.current?.contentWindow?.postMessage(
        {
          type: 'LEOPARD_MAP_SET_VIEW_MODE',
          mapInstanceId,
          mode: followTruckLocation || mode === 'tracking' ? 'driving' : 'overview',
        },
        '*',
      );
    } catch {
      // Ignore cross-frame communication errors
    }
  }, [followTruckLocation, mode, mapInstanceId, isTestEnv]);

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
      minZoom,
      maxZoom,
      maxBounds,
      bearing: 0,
      pitch,
      truckHeading: typeof truckHeading === 'number' ? truckHeading : bearing,
      interactive,
      followTruck: followTruckLocation,
      routeGeoJSON,
      isPickupLeg,
    });
  }, [
    resolvedApiKey,
    origin?.coords?.lat,
    origin?.coords?.lng,
    destination?.coords?.lat,
    destination?.coords?.lng,
    truckLocation?.lat,
    truckLocation?.lng,
    displayEta,
    mode,
    mapInstanceId,
    centerCoords,
    zoom,
    minZoom,
    maxZoom,
    maxBounds,
    bearing,
    pitch,
    truckHeading,
    interactive,
    followTruckLocation,
    routeGeoJSON,
    isPickupLeg,
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

  return (
    <RealInteractiveMap
      destination={destination}
      height={height}
      initialPinCoords={initialPinCoords}
      interactive={interactive}
      mode={mode as any}
      nearbyDrivers={nearbyDrivers}
      onLocationChange={onLocationChange}
      origin={origin}
      routeCoords={routeCoords as any}
      routeResolutionPolicy={routeResolutionPolicy}
      routeSegments={routeSegments}
      stops={stops}
      style={style}
      testID={testID}
      title={title}
      truckEtaLabel={truckEtaLabel}
      truckEtaMinutes={truckEtaMinutes}
      truckLocation={truckLocation}
      vietmapApiKey={vietmapApiKey}
    />
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
