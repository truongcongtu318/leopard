'use client';

import React, { useEffect, useRef, useState } from 'react';

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
      if (mapInstanceRef.current) {
        const lat = target.lat ?? (16.14 - (target.y / 100) * 0.16);
        const lng = target.lng ?? (108.12 + (target.x / 100) * 0.15);
        mapInstanceRef.current.flyTo([lat, lng], 13, { duration: 1.2 });
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

    if (mapInstanceRef.current) {
      const lat = marker.lat ?? (16.14 - (marker.y / 100) * 0.16);
      const lng = marker.lng ?? (108.12 + (marker.x / 100) * 0.15);
      mapInstanceRef.current.panTo([lat, lng], { animate: true });
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
          const map = L.map(mapContainerRef.current, {
            center: [16.068, 108.212], // Da Nang Central Logistics Hub
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

          // Add Delivery Route Polyline (KCN Hòa Khánh -> Cảng Tiên Sa)
          const routeCoords: [number, number][] = [
            [16.075, 108.145], // KCN Hòa Khánh
            [16.065, 108.185], // Cầu vượt Hòa Cầm
            [16.068, 108.215], // Cầu Rồng
            [16.085, 108.235], // Đường Ngô Quyền
            [16.122, 108.228], // Cảng Tiên Sa
          ];
          L.polyline(routeCoords, {
            color: '#10b981',
            weight: 3.5,
            opacity: 0.85,
            dashArray: '6, 6',
          }).addTo(map);

          // Add Custom Markers
          markers.forEach((marker) => {
            const lat = marker.lat ?? (16.14 - (marker.y / 100) * 0.16);
            const lng = marker.lng ?? (108.12 + (marker.x / 100) * 0.15);
            const isSelected = marker.id === selectedMarkerId;

            const iconHtml = isSelected
              ? `<div class="relative flex items-center gap-2 rounded-2xl bg-[#10b981] px-3 py-1.5 text-white shadow-2xl ring-2 ring-white cursor-pointer -translate-x-1/2 -translate-y-1/2 whitespace-nowrap">
                   <span class="flex h-5 w-5 items-center justify-center rounded-md bg-white text-slate-900 font-bold text-[10px]">✓</span>
                   <div class="flex flex-col text-left">
                     <span class="text-xs font-bold leading-none">${marker.orderRef}</span>
                     <span class="text-[10px] text-emerald-100 font-medium leading-tight">${marker.customer}</span>
                   </div>
                 </div>`
              : `<div class="flex h-8 w-8 items-center justify-center rounded-xl bg-slate-900 border border-slate-700 text-white shadow-lg hover:scale-110 hover:border-emerald-400 transition-all cursor-pointer -translate-x-1/2 -translate-y-1/2">
                   <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#10b981" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z"/><path d="m3.3 7 8.7 5 8.7-5"/><path d="M12 22V12"/></svg>
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
      className={`relative overflow-hidden rounded-3xl bg-[#0b111a] border border-slate-800/80 shadow-sm transition-all duration-300 flex flex-1 flex-col justify-between select-none ${
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

      {/* Floating Header Controls: Glassmorphic Search & Fullscreen Toggle */}
      <div className="relative z-20 flex items-center justify-between p-3 sm:p-4 pointer-events-auto">
        <div className="relative w-52 sm:w-64">
          <svg
            className="w-3.5 h-3.5 text-slate-300 absolute left-3 top-2.5 pointer-events-none"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            value={searchValue}
            onChange={(e) => {
              setSearchValue(e.target.value);
              onSearch?.(e.target.value);
            }}
            placeholder={searchPlaceholder}
            aria-label="Tìm kiếm trên bản đồ"
            className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-900/85 backdrop-blur-md border border-white/15 text-white rounded-xl placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-emerald-400 shadow-md transition-all"
          />
        </div>

        {/* Active Order Pill Display */}
        <div className="hidden md:flex items-center gap-2 rounded-xl bg-slate-900/85 backdrop-blur-md border border-white/15 px-3 py-1 text-xs text-white shadow-md">
          <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
          <span className="font-semibold">{displayActiveLabel}</span>
        </div>

        {/* Fullscreen Toggle Button */}
        <button
          type="button"
          onClick={() => setIsFullscreen((f) => !f)}
          aria-label={isFullscreen ? 'Thu nhỏ bản đồ' : 'Phóng to toàn màn hình'}
          className="flex h-8 w-8 items-center justify-center rounded-xl bg-slate-900/85 backdrop-blur-md border border-white/15 text-white hover:bg-slate-800 transition-colors cursor-pointer shadow-md"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            {isFullscreen ? (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 14h6m0 0v6m0-6L3 21m17-7h-6m0 0v6m0-6l7 7M4 10h6m0 0V4m0 6L3 3m17 7h-6m0 0V4m0 6l7-7" />
            ) : (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 8V4m0 0h4M4 4l5 5m11-5h-4m4 0v4m0-4l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
            )}
          </svg>
        </button>
      </div>

      {/* Floating Bottom Controls: Live Telemetry Status & Zoom Controls */}
      <div className="relative z-20 flex items-center justify-between p-3 sm:p-4 pointer-events-auto">
        <div className="flex items-center gap-2 rounded-xl bg-slate-900/85 backdrop-blur-md border border-white/15 px-3 py-1 text-[11px] font-medium text-slate-300 shadow-md">
          <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
          <span>Bản đồ số thực tế · GIS Dark Mode</span>
        </div>

        {/* Custom Zoom Controls connected directly to Leaflet engine */}
        <div className="flex flex-col rounded-xl bg-slate-900/85 backdrop-blur-md border border-white/15 overflow-hidden shadow-lg">
          <button
            type="button"
            onClick={handleZoomIn}
            aria-label="Phóng to bản đồ"
            className="flex h-7 w-7 items-center justify-center text-sm font-bold text-white hover:bg-white/15 transition-colors cursor-pointer"
          >
            +
          </button>
          <div className="h-px w-full bg-white/15" />
          <button
            type="button"
            onClick={handleZoomOut}
            aria-label="Thu nhỏ bản đồ"
            className="flex h-7 w-7 items-center justify-center text-sm font-bold text-white hover:bg-white/15 transition-colors cursor-pointer"
          >
            −
          </button>
        </div>
      </div>
    </div>
  );
}
