'use client';

import React, { useEffect, useRef, useState } from 'react';
import { Maximize2, Minimize2, Search } from 'lucide-react';

export interface MapPackageMarker {
  readonly id: string;
  readonly orderRef: string;
  readonly customer: string;
  readonly routeLabel: string;
  readonly x: number;
  readonly y: number;
  readonly status: string;
  readonly lat?: number;
  readonly lng?: number;
}

export interface BentoMapCardProps {
  routePath?: Array<[number, number]> | undefined;
  title?: string | undefined;
  activeOrderCode?: string | undefined;
  searchPlaceholder?: string | undefined;
  markers?: readonly MapPackageMarker[] | undefined;
  selectedOrderId?: string | null | undefined;
  onSelectOrder?: ((orderRef: string) => void) | undefined;
  onSearch?: ((query: string) => void) | undefined;
}

export function BentoMapCard({
  title = 'Bản đồ điều phối thời gian thực',
  activeOrderCode = 'Chưa có chuyến xe nào đang hoạt động',
  searchPlaceholder = 'Tìm kiếm đơn hàng, phương tiện, tài xế...',
  markers = [],
  routePath,
  selectedOrderId,
  onSelectOrder,
  onSearch,
}: BentoMapCardProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);

  const [searchValue, setSearchValue] = useState('');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [selectedMarkerId, setSelectedMarkerId] = useState<string | null>(markers[0]?.id ?? null);
  const [userClickedMarker, setUserClickedMarker] = useState<MapPackageMarker | null>(null);

  // Sync external selectedOrderId with map view and marker selection
  useEffect(() => {
    if (!selectedOrderId) return;
    const target = markers.find(
      (m) => m.id === selectedOrderId || m.orderRef === selectedOrderId,
    );
    if (target) {
      setSelectedMarkerId(target.id);
      setUserClickedMarker(target);
      if (mapInstanceRef.current && target.lat !== undefined && target.lng !== undefined) {
        mapInstanceRef.current.flyTo([target.lat, target.lng], 13, { duration: 1.2 });
      }
    }
  }, [selectedOrderId, markers]);

  const activeMarker = markers.find((m) => m.id === selectedMarkerId) ?? markers[0] ?? null;
  const displayActiveLabel = userClickedMarker
    ? `${userClickedMarker.orderRef} · ${userClickedMarker.routeLabel}`
    : (activeOrderCode || (activeMarker ? `${activeMarker.orderRef}` : 'Chưa có chuyến xe nào đang hoạt động'));

  const handleMarkerClick = (marker: MapPackageMarker) => {
    setSelectedMarkerId(marker.id);
    setUserClickedMarker(marker);
    onSelectOrder?.(marker.orderRef);

    if (mapInstanceRef.current && marker.lat !== undefined && marker.lng !== undefined) {
      mapInstanceRef.current.panTo([marker.lat, marker.lng], { animate: true });
    }
  };

  const handleZoomIn = () => {
    if (mapInstanceRef.current) {
      mapInstanceRef.current.zoomIn();
    }
  };

  const handleZoomOut = () => {
    if (mapInstanceRef.current) {
      mapInstanceRef.current.zoomOut();
    }
  };

  // Initialize Leaflet Map with CartoDB Dark Matter tiles
  useEffect(() => {
    let isMounted = true;

    if (typeof window === 'undefined' || !mapContainerRef.current) return;

    // Dynamically import Leaflet on client side
    import('leaflet')
      .then((L) => {
        if (!isMounted || !mapContainerRef.current) return;

        // Clean up any existing instance
        if (mapInstanceRef.current) {
          mapInstanceRef.current.remove();
          mapInstanceRef.current = null;
        }

        try {
          const firstWithCoords = markers.find((m) => m.lat !== undefined && m.lng !== undefined);
          const map = L.map(mapContainerRef.current, {
            center: firstWithCoords ? [firstWithCoords.lat as number, firstWithCoords.lng as number] : [10.8, 106.68],
            zoom: 12,
            zoomControl: false,
            attributionControl: false,
          });

          // Clean Professional Dark Gray GIS Basemap (No API key required, zero watermark)
          L.tileLayer(
            'https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}',
            {
              maxZoom: 16,
            },
          ).addTo(map);

          // Clean Street Names & Geography Labels Overlay
          L.tileLayer(
            'https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Reference/MapServer/tile/{z}/{y}/{x}',
            {
              maxZoom: 16,
            },
          ).addTo(map);

          // Add Custom Markers (BE coords only, no estimated fallback)
          if (routePath && routePath.length > 0) {
            L.polyline(routePath, { color: '#10b981', weight: 4, opacity: 0.8, dashArray: '10, 10' }).addTo(map);
            const bounds = L.latLngBounds(routePath);
            map.fitBounds(bounds, { padding: [40, 40] });
          }

          markers.forEach((marker) => {
            if (marker.lat === undefined || marker.lng === undefined) return;
            const lat = marker.lat;
            const lng = marker.lng;
            const isSelected = marker.id === selectedMarkerId;

                                    let markerBg = 'bg-slate-900';
            let markerBorder = 'border-slate-700';
            let markerColor = '#10b981';
            let markerInner = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#10b981" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z"/><path d="m3.3 7 8.7 5 8.7-5"/><path d="M12 22V12"/></svg>';
            let selectedBg = 'bg-[#10b981]';
            let selectedIcon = '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg>';

            if (marker.status === 'ORIGIN') {
              markerBg = 'bg-blue-900'; markerBorder = 'border-blue-400'; markerColor = '#60a5fa'; markerInner = 'A'; 
              selectedBg = 'bg-blue-600'; selectedIcon = 'A';
            } else if (marker.status === 'DESTINATION') {
              markerBg = 'bg-red-900'; markerBorder = 'border-red-400'; markerColor = '#f87171'; markerInner = 'B'; 
              selectedBg = 'bg-red-600'; selectedIcon = 'B';
            }

            const iconHtml = isSelected
              ? `<div class="relative flex items-center gap-2 rounded-2xl ${selectedBg} px-3 py-1.5 text-white shadow-xl ring-2 ring-white/20 cursor-pointer -translate-x-1/2 -translate-y-1/2 whitespace-nowrap">
                   <span class="flex h-5 w-5 items-center justify-center rounded-md bg-white text-slate-900 font-bold text-[11px]">${selectedIcon}</span>
                   <div class="flex flex-col text-left">
                     <span class="text-xs font-bold leading-none">${marker.orderRef}</span>
                     <span class="text-[10px] text-white/90 font-medium leading-tight">${marker.customer}</span>
                   </div>
                 </div>`
              : `<div class="flex h-8 w-8 items-center justify-center rounded-xl ${markerBg} border ${markerBorder} text-white shadow-lg hover:scale-110 transition-all cursor-pointer -translate-x-1/2 -translate-y-1/2" style="color: ${markerColor}; font-weight: bold; font-size: 14px;">
                   ${markerInner}
                 </div>`;

            const icon = L.divIcon({
              className: 'bg-transparent border-0',
              html: iconHtml,
              iconSize: isSelected ? [140, 36] : [32, 32],
              iconAnchor: isSelected ? [70, 18] : [16, 16],
            });

            const leafletMarker = L.marker([lat, lng], { icon }).addTo(map);
            leafletMarker.on('click', () => {
              handleMarkerClick(marker);
            });
          });

          mapInstanceRef.current = map;
        } catch {
          // Fallback gracefully in testing / JSDOM environments without canvas
        }
      })
      .catch(() => {});

    return () => {
      isMounted = false;
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, [markers, selectedMarkerId]);

  // Trigger Leaflet resize on fullscreen toggle
  useEffect(() => {
    if (mapInstanceRef.current) {
      setTimeout(() => {
        mapInstanceRef.current?.invalidateSize();
      }, 300);
    }
  }, [isFullscreen]);

  return (
    <div
      aria-label={title}
      className={`relative overflow-hidden rounded-3xl bg-[#0b111a] border border-black/[0.06] shadow-[0_2px_12px_rgba(0,0,0,0.03)] transition-all duration-300 flex flex-1 flex-col justify-between select-none ${
        isFullscreen ? 'fixed inset-4 z-50 min-h-[90vh]' : 'min-h-[380px] sm:min-h-[430px] xl:min-h-0 h-full'
      }`}
    >
      {/* Real Live Leaflet GIS Dark Matter Map Container */}
      <div
        ref={mapContainerRef}
        className="absolute inset-0 z-0 h-full w-full bg-[#090e17]"
        aria-hidden="true"
      />

      {/* Screen Reader & Test Compatibility Layer for Markers */}
      <div className="sr-only" aria-label="Danh sách điểm đánh dấu điều phối">
        {markers.map((marker) => (
          <button
            key={marker.id}
            type="button"
            onClick={() => handleMarkerClick(marker)}
            aria-label={
              marker.id === selectedMarkerId
                ? `Đang chọn: ${marker.orderRef} - ${marker.customer}`
                : `Kiện hàng: ${marker.orderRef} - ${marker.customer}`
            }
          >
            {marker.orderRef} - {marker.customer}
          </button>
        ))}
      </div>

      {/* Floating glass pill search bar & glassmorphism popover */}
      <div className="relative z-20 flex items-center justify-between p-3 sm:p-4 pointer-events-auto">
        <div className="relative w-52 sm:w-64">
          <Search
            className="pointer-events-none absolute left-3.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-500"
            strokeWidth={2}
            aria-hidden="true"
          />
          <input
            type="text"
            value={searchValue}
            onChange={(e) => {
              setSearchValue(e.target.value);
              onSearch?.(e.target.value);
            }}
            placeholder={searchPlaceholder}
            aria-label="Tìm kiếm trên bản đồ"
            className="w-full rounded-full py-2 pl-9 pr-4 text-xs font-medium text-slate-900 shadow-[0_8px_24px_rgba(0,0,0,0.18)] backdrop-blur-md bg-white/85 border border-black/[0.08] placeholder:text-slate-400 transition-all focus:border-white/60 focus:outline-none focus:ring-2 focus:ring-white/70"
          />
        </div>

        {/* Active Order glassmorphism popover */}
        <div className="hidden items-center gap-2 rounded-full px-3.5 py-1.5 text-xs text-slate-800 shadow-[0_8px_24px_rgba(0,0,0,0.18)] backdrop-blur-md bg-white/85 border border-black/[0.08] md:flex">
          <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-400" />
          <span className="font-semibold">{displayActiveLabel}</span>
        </div>

        {/* Fullscreen Toggle Button */}
        <button
          type="button"
          onClick={() => setIsFullscreen((f) => !f)}
          aria-label={isFullscreen ? 'Thu nhỏ bản đồ' : 'Phóng to toàn màn hình'}
          className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-full text-slate-800 shadow-[0_8px_24px_rgba(0,0,0,0.18)] backdrop-blur-md bg-white/85 border border-black/[0.08] transition-colors hover:bg-white"
        >
          {isFullscreen ? (
            <Minimize2 className="w-4 h-4" strokeWidth={2} aria-hidden="true" />
          ) : (
            <Maximize2 className="w-4 h-4" strokeWidth={2} aria-hidden="true" />
          )}
        </button>
      </div>

      {/* Floating glass telemetry status & frosted glass zoom buttons */}
      <div className="relative z-20 flex items-center justify-between p-3 sm:p-4 pointer-events-auto">
        <div className="flex items-center gap-2 rounded-full px-3.5 py-1.5 text-[11px] font-medium text-slate-700 shadow-[0_8px_24px_rgba(0,0,0,0.18)] backdrop-blur-md bg-white/85 border border-black/[0.08]">
          <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-400" />
          <span>Bản đồ số thực tế · GIS Dark Mode</span>
        </div>

        {/* Frosted glass circular zoom buttons */}
        <div className="flex flex-col gap-1.5">
          <button
            type="button"
            onClick={handleZoomIn}
            aria-label="Phóng to bản đồ"
            className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-full text-base font-bold text-slate-800 shadow-[0_8px_24px_rgba(0,0,0,0.18)] backdrop-blur-md bg-white/85 border border-black/[0.08] transition-colors hover:bg-white"
          >
            +
          </button>
          <button
            type="button"
            onClick={handleZoomOut}
            aria-label="Thu nhỏ bản đồ"
            className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-full text-base font-bold text-slate-800 shadow-[0_8px_24px_rgba(0,0,0,0.18)] backdrop-blur-md bg-white/85 border border-black/[0.08] transition-colors hover:bg-white"
          >
            −
          </button>
        </div>
      </div>
    </div>
  );
}
