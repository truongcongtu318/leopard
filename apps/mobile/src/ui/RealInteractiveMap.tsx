import React, { useEffect, useId, useMemo } from 'react';
import {
  Platform,
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

import { colors, radius, spacing, typography } from '../theme/tokens';
import { IconLocationPin, IconSpeedTruck } from './icons/CoreIcons';

export type MapCoordinate = {
  lat: number;
  lng: number;
};

export type MapStop = {
  id: string;
  label: string;
  coords?: MapCoordinate;
};

export type RealInteractiveMapMode = 'route' | 'tracking' | 'pin' | 'preview';

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
}>;

// ── Vietnamese Logistics Hubs Dictionary ────────────────────────────────
const VIETNAM_LOCATION_DICT: Record<string, MapCoordinate> = {
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
};

/**
 * Deterministically resolves an address or location name to coordinates in Vietnam.
 */
export function resolveLocationCoords(nameOrAddress?: string): MapCoordinate {
  if (!nameOrAddress || !nameOrAddress.trim()) {
    return { lat: 10.7769, lng: 106.7009 }; // Central HCMC
  }

  const query = nameOrAddress.toLowerCase().trim();
  for (const [key, coords] of Object.entries(VIETNAM_LOCATION_DICT)) {
    if (query.includes(key)) {
      return coords;
    }
  }

  // Deterministic fallback spread across Greater HCMC
  let hash = 0;
  for (let i = 0; i < query.length; i++) {
    hash = (hash << 5) - hash + query.charCodeAt(i);
    hash |= 0;
  }
  const latOffset = ((Math.abs(hash) % 100) / 100) * 0.12 - 0.06;
  const lngOffset = ((Math.abs(hash >> 3) % 100) / 100) * 0.14 - 0.07;
  return {
    lat: Number((10.78 + latOffset).toFixed(5)),
    lng: Number((106.68 + lngOffset).toFixed(5)),
  };
}

/**
 * Generates an interactive Leaflet HTML template.
 */
function buildLeafletHtml({
  destinationCoords,
  destinationLabel,
  interactive,
  mapInstanceId,
  mode,
  originCoords,
  originLabel,
  pinCoords,
  stopsCoords,
  truckCoords,
  truckEtaLabel,
}: {
  destinationCoords: MapCoordinate;
  destinationLabel: string;
  interactive: boolean;
  mapInstanceId: string;
  mode: RealInteractiveMapMode;
  originCoords: MapCoordinate;
  originLabel: string;
  pinCoords: MapCoordinate;
  stopsCoords: readonly { label: string; coords: MapCoordinate }[];
  truckCoords: MapCoordinate;
  truckEtaLabel: string;
}): string {
  const pointsJson = JSON.stringify({
    mode,
    origin: { coords: originCoords, label: originLabel },
    destination: { coords: destinationCoords, label: destinationLabel },
    stops: stopsCoords,
    truck: { coords: truckCoords, eta: truckEtaLabel },
    pin: pinCoords,
    interactive,
    mapInstanceId,
  });

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
    .pin-core { position: relative; width: 28px; height: 28px; border-radius: 50%; background: #0284C7; border: 3px solid #FFFFFF; box-shadow: 0 4px 10px rgba(2, 132, 199, 0.45); display: flex; align-items: center; justify-content: center; z-index: 2; }
    .pin-core.origin { background: #16A34A; }
    .pin-core.dest { background: #0284C7; }
    .pin-core.stop { background: #D97706; }
    .pin-dot { width: 8px; height: 8px; border-radius: 50%; background: #FFFFFF; }

    /* Truck Marker Styles */
    .truck-wrap { position: relative; display: flex; flex-direction: column; align-items: center; justify-content: center; }
    .truck-pulse { position: absolute; width: 48px; height: 48px; border-radius: 50%; background: rgba(2, 132, 199, 0.35); animation: pinPulse 2s ease-out infinite; }
    .truck-badge { position: relative; width: 34px; height: 34px; border-radius: 50%; background: #0284C7; border: 3px solid #FFFFFF; box-shadow: 0 4px 12px rgba(2, 132, 199, 0.45); display: flex; align-items: center; justify-content: center; z-index: 3; color: #FFFFFF; font-size: 16px; font-weight: bold; }
    .truck-eta { margin-top: 4px; background: #0F172A; color: #FFFFFF; font-size: 10px; font-weight: 700; padding: 2px 6px; border-radius: 12px; white-space: nowrap; box-shadow: 0 2px 6px rgba(0,0,0,0.25); }

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
    if (${interactive ? 'true' : 'false'}) {
      L.control.zoom({ position: 'topright' }).addTo(map);
    }

    // Primary Google Maps tiles with OpenStreetMap fallback
    var tiles = L.tileLayer('https://{s}.google.com/vt/lyrs=m&x={x}&y={y}&z={z}&hl=vi', {
      maxZoom: 20,
      subdomains: ['mt0', 'mt1', 'mt2', 'mt3'],
      attribution: '© Google Maps'
    }).addTo(map);

    tiles.on('tileerror', function() {
      if (!window._osmFallback) {
        window._osmFallback = true;
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          maxZoom: 19,
          attribution: '© OpenStreetMap'
        }).addTo(map);
      }
    });

    var bounds = [];

    // Icon Factories
    function createPulseIcon(type) {
      return L.divIcon({
        className: 'custom-pin-icon',
        html: '<div class="pin-wrap"><div class="pin-pulse"></div><div class="pin-core ' + type + '"><div class="pin-dot"></div></div></div>',
        iconSize: [44, 44],
        iconAnchor: [22, 22]
      });
    }

    function createTruckIcon(eta) {
      return L.divIcon({
        className: 'custom-truck-icon',
        html: '<div class="truck-wrap"><div class="truck-pulse"></div><div class="truck-badge">🚚</div>' + (eta ? '<div class="truck-eta">' + eta + '</div>' : '') + '</div>',
        iconSize: [50, 60],
        iconAnchor: [25, 30]
      });
    }

    function notify(lat, lng) {
      try {
        window.parent.postMessage({
          type: 'LEOPARD_MAP_PIN_MOVED',
          mapInstanceId: config.mapInstanceId,
          lat: lat,
          lng: lng
        }, '*');
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
      previewMarker.bindPopup('<b>' + pLabel + '</b>').openPopup();
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
        config.stops.forEach(function(s) {
          latlngs.push([s.coords.lat, s.coords.lng]);
          bounds.push([s.coords.lat, s.coords.lng]);
          var sm = L.marker([s.coords.lat, s.coords.lng], {
            icon: createPulseIcon('stop')
          }).addTo(map);
          if (s.label) sm.bindPopup('<b>Điểm dừng:</b> ' + s.label);
        });
      }

      latlngs.push([d.lat, d.lng]);
      bounds.push([d.lat, d.lng]);

      // Destination Marker
      var destMarker = L.marker([d.lat, d.lng], {
        icon: createPulseIcon('dest')
      }).addTo(map);
      if (config.destination.label) destMarker.bindPopup('<b>Điểm giao:</b> ' + config.destination.label);

      // Route Polyline with subtle glow effect
      L.polyline(latlngs, {
        color: '#0284C7',
        weight: 5,
        opacity: 0.85,
        lineJoin: 'round',
        lineCap: 'round'
      }).addTo(map);

      // Tracking truck
      if (config.mode === 'tracking' && config.truck && config.truck.coords) {
        var t = config.truck.coords;
        bounds.push([t.lat, t.lng]);
        var truckMarker = L.marker([t.lat, t.lng], {
          icon: createTruckIcon(config.truck.eta || '')
        }).addTo(map);
        truckMarker.bindPopup('<b>Tài xế đang vận chuyển</b><br>ETA: ' + (config.truck.eta || 'Đang cập nhật'));
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
}: RealInteractiveMapProps) {
  const mapInstanceId = useId();

  // Coordinates calculation
  const originCoords = useMemo(
    () => origin?.coords || resolveLocationCoords(origin?.label),
    [origin?.coords, origin?.label],
  );

  const destinationCoords = useMemo(
    () => destination?.coords || resolveLocationCoords(destination?.label),
    [destination?.coords, destination?.label],
  );

  const stopsCoords = useMemo(
    () =>
      stops.map((s) => ({
        label: s.label,
        coords: s.coords || resolveLocationCoords(s.label),
      })),
    [stops],
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

  const mapHtml = useMemo(() => {
    return buildLeafletHtml({
      destinationCoords,
      destinationLabel: destination?.label || 'Điểm giao',
      interactive,
      mapInstanceId,
      mode,
      originCoords,
      originLabel: origin?.label || 'Điểm lấy',
      pinCoords,
      stopsCoords,
      truckCoords,
      truckEtaLabel: displayEta,
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
  ]);

  const containerStyle: StyleProp<ViewStyle> = [
    styles.container,
    { height: typeof height === 'number' ? height : 240 },
    style,
  ];

  return (
    <View style={containerStyle} testID={testID}>
      {Platform.OS === 'web' ? (
        React.createElement('iframe', {
          key: `leopard-map-${mode}-${originCoords.lat}-${destinationCoords.lat}`,
          srcDoc: mapHtml,
          style: {
            width: '100%',
            height: '100%',
            border: 'none',
            borderRadius: 14,
          },
          title: 'Bản đồ thực tế tương tác',
        })
      ) : (
        /* Native & Test Environment Accessible Fallback */
        <View
          accessibilityLabel={
            mode === 'tracking'
              ? `Bản đồ theo dõi xe trực tiếp${displayEta ? `; ETA: ${displayEta}` : ''}`
              : `Bản đồ lộ trình từ ${origin?.label || 'điểm lấy'} đến ${destination?.label || 'điểm giao'}`
          }
          accessibilityRole="image"
          style={styles.nativeFallback}
        >
          <View style={styles.roadGridH} />
          <View style={styles.roadGridV} />
          <View style={styles.routeTraceLine} />

          {/* Markers */}
          <View style={[styles.markerPin, styles.originPin]}>
            <IconLocationPin color="#10B981" size={16} strokeWidth={2} />
          </View>
          <View style={[styles.markerPin, styles.destPin]}>
            <IconLocationPin color="#EF4444" size={16} strokeWidth={2} />
          </View>
          {mode === 'tracking' ? (
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
    backgroundColor: '#F1F5F9',
    borderRadius: 14,
    overflow: 'hidden',
    position: 'relative',
  },
  nativeFallback: {
    flex: 1,
    backgroundColor: colors.operational.mapLand,
    position: 'relative',
    overflow: 'hidden',
    minHeight: 180,
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
    fontSize: 9,
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
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
});
