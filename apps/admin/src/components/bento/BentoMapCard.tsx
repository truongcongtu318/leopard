'use client';

import React, { useState } from 'react';

export interface MapPackageMarker {
  readonly id: string;
  readonly orderRef: string;
  readonly customer: string;
  readonly routeLabel: string;
  readonly x: number;
  readonly y: number;
  readonly status: string;
}

export interface BentoMapCardProps {
  title?: string;
  activeOrderCode?: string;
  searchPlaceholder?: string;
  markers?: readonly MapPackageMarker[];
  onSelectOrder?: (orderRef: string) => void;
  onSearch?: (query: string) => void;
}

const DEFAULT_MARKERS: readonly MapPackageMarker[] = [
  {
    id: 'pkg-1',
    orderRef: 'LP-A-260815-101',
    customer: 'Vinamilk Đà Nẵng',
    routeLabel: 'KCN Hòa Khánh ➔ Cảng Tiên Sa',
    x: 46,
    y: 42,
    status: 'IN_TRANSIT',
  },
  {
    id: 'pkg-2',
    orderRef: 'LP-A-260815-102',
    customer: 'Dược phẩm Danapha',
    routeLabel: 'KCN Điện Ngọc ➔ Kho Cẩm Lệ',
    x: 18,
    y: 30,
    status: 'IN_TRANSIT',
  },
  {
    id: 'pkg-3',
    orderRef: 'LP-A-260815-103',
    customer: 'Thép Hòa Phát',
    routeLabel: 'Cảng Liên Chiểu ➔ KCN Hòa Cầm',
    x: 74,
    y: 22,
    status: 'DELIVERED',
  },
  {
    id: 'pkg-4',
    orderRef: 'LP-A-260815-104',
    customer: 'Dệt may 29/3',
    routeLabel: 'Hải Châu ➔ Sơn Trà',
    x: 20,
    y: 68,
    status: 'LOADING',
  },
  {
    id: 'pkg-5',
    orderRef: 'LP-A-260815-105',
    customer: 'Thaco Trường Hải',
    routeLabel: 'Cảng Tiên Sa ➔ KCN Điện Ngọc',
    x: 78,
    y: 64,
    status: 'UNLOADING',
  },
];

export function BentoMapCard({
  title = 'Bản đồ điều phối thời gian thực',
  activeOrderCode = 'LP-A-260815-101 · Vinamilk Đà Nẵng ➔ Cảng Tiên Sa',
  searchPlaceholder = 'Tìm kiếm đơn hàng, phương tiện, tài xế...',
  markers = DEFAULT_MARKERS,
  onSelectOrder,
  onSearch,
}: BentoMapCardProps) {
  const [zoomLevel, setZoomLevel] = useState(1);
  const [searchValue, setSearchValue] = useState('');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [selectedMarkerId, setSelectedMarkerId] = useState<string>(markers[0]?.id ?? 'pkg-1');
  const [userClickedMarker, setUserClickedMarker] = useState<MapPackageMarker | null>(null);

  const handleZoomIn = () => setZoomLevel((z) => Math.min(z + 0.15, 1.6));
  const handleZoomOut = () => setZoomLevel((z) => Math.max(z - 0.15, 0.85));

  const activeMarker = markers.find((m) => m.id === selectedMarkerId) ?? markers[0] ?? DEFAULT_MARKERS[0];
  const displayActiveLabel = userClickedMarker
    ? `${userClickedMarker.orderRef} · ${userClickedMarker.routeLabel}`
    : (activeOrderCode || (activeMarker ? `${activeMarker.orderRef}` : 'LP-A-260815-101'));

  const handleMarkerClick = (marker: MapPackageMarker) => {
    setSelectedMarkerId(marker.id);
    setUserClickedMarker(marker);
    onSelectOrder?.(marker.orderRef);
  };

  return (
    <div
      aria-label={title}
      className={`relative overflow-hidden rounded-3xl bg-[#0b111a] border border-slate-800/80 shadow-sm transition-all duration-300 flex flex-col justify-between select-none ${
        isFullscreen ? 'fixed inset-4 z-50 min-h-[90vh]' : 'min-h-[380px] sm:min-h-[430px]'
      }`}
    >
      {/* High-fidelity Dark Mode City Dispatch Map Canvas (Da Nang Transport Network) */}
      <div
        className="absolute inset-0 transition-transform duration-300 pointer-events-none"
        style={{ transform: `scale(${zoomLevel})`, transformOrigin: 'center center' }}
        aria-hidden="true"
      >
        <svg
          className="w-full h-full object-cover opacity-90"
          viewBox="0 0 900 560"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          {/* Da Nang Bay / Ocean Water Body */}
          <path
            d="M 0 0 L 520 0 C 480 80 430 140 370 190 C 310 240 260 260 210 290 C 140 330 80 390 0 450 Z"
            fill="#071322"
          />
          {/* Son Tra Peninsula Contours (North-East Green Cap) */}
          <path
            d="M 520 0 C 560 30 630 20 710 40 C 790 60 840 110 820 160 C 800 200 730 220 670 200 C 620 180 580 150 550 110 C 530 80 510 40 520 0 Z"
            fill="#06241c"
            stroke="#0a3d30"
            strokeWidth="2"
          />

          {/* Sông Hàn (Han River Vector Spine) */}
          <path
            d="M 370 190 C 400 240 430 290 420 350 C 410 410 425 480 430 560"
            stroke="#0d243a"
            strokeWidth="32"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          {/* Han River water center glow */}
          <path
            d="M 370 190 C 400 240 430 290 420 350 C 410 410 425 480 430 560"
            stroke="#103250"
            strokeWidth="22"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* Sông Cẩm Lệ / Sông Cu Đê River Branches */}
          <path
            d="M 420 380 C 360 400 290 410 210 450 C 150 480 90 520 0 550"
            stroke="#0b1e30"
            strokeWidth="18"
            strokeLinecap="round"
          />
          <path
            d="M 120 200 C 160 210 210 230 250 250"
            stroke="#0b1e30"
            strokeWidth="12"
            strokeLinecap="round"
          />

          {/* Urban Road Grid (Minor Streets) */}
          <g stroke="#172334" strokeWidth="1" opacity="0.6">
            <line x1="0" y1="80" x2="900" y2="80" />
            <line x1="0" y1="140" x2="900" y2="140" />
            <line x1="0" y1="200" x2="900" y2="200" />
            <line x1="0" y1="260" x2="900" y2="260" />
            <line x1="0" y1="320" x2="900" y2="320" />
            <line x1="0" y1="380" x2="900" y2="380" />
            <line x1="0" y1="440" x2="900" y2="440" />
            <line x1="0" y1="500" x2="900" y2="500" />
            <line x1="100" y1="0" x2="100" y2="560" />
            <line x1="180" y1="0" x2="180" y2="560" />
            <line x1="260" y1="0" x2="260" y2="560" />
            <line x1="340" y1="0" x2="340" y2="560" />
            <line x1="500" y1="0" x2="500" y2="560" />
            <line x1="580" y1="0" x2="580" y2="560" />
            <line x1="660" y1="0" x2="660" y2="560" />
            <line x1="740" y1="0" x2="740" y2="560" />
            <line x1="820" y1="0" x2="820" y2="560" />
          </g>

          {/* Arterial Avenues (Major City Streets) */}
          <path
            d="M 0 310 Q 220 280 430 300 T 900 320"
            stroke="#28394e"
            strokeWidth="3.5"
            fill="none"
          />
          <path
            d="M 220 0 Q 300 240 370 380 T 520 560"
            stroke="#28394e"
            strokeWidth="3.5"
            fill="none"
          />
          <path
            d="M 480 180 Q 560 300 620 420 T 700 560"
            stroke="#28394e"
            strokeWidth="3"
            fill="none"
          />

          {/* Express Highways (QL1A & Nguyen Tat Thanh Coastal Highway) */}
          <path
            d="M 0 170 Q 210 270 370 195 T 620 180 T 900 230"
            stroke="#3d4f66"
            strokeWidth="4.5"
            fill="none"
          />
          <path
            d="M 120 560 L 260 380 L 360 290 L 450 140 L 530 0"
            stroke="#3d4f66"
            strokeWidth="4.5"
            fill="none"
          />

          {/* Iconic Han River Bridges (Illuminated Bridge Spans) */}
          {/* Cầu Thuận Phước */}
          <line x1="365" y1="200" x2="445" y2="200" stroke="#38bdf8" strokeWidth="3" strokeLinecap="round" />
          {/* Cầu Sông Hàn */}
          <line x1="390" y1="265" x2="455" y2="265" stroke="#60a5fa" strokeWidth="3" strokeLinecap="round" />
          {/* Cầu Rồng (Dragon Bridge Golden Arc) */}
          <line x1="400" y1="325" x2="460" y2="325" stroke="#fbbf24" strokeWidth="4" strokeLinecap="round" />
          {/* Cầu Trần Thị Lý */}
          <line x1="405" y1="375" x2="460" y2="375" stroke="#f472b6" strokeWidth="3" strokeLinecap="round" />
          {/* Cầu Tiên Sơn */}
          <line x1="410" y1="440" x2="465" y2="440" stroke="#34d399" strokeWidth="3" strokeLinecap="round" />

          {/* Logistics Hubs (Subtle Glowing Landmark Badges) */}
          {/* Cảng Tiên Sa */}
          <circle cx="680" cy="140" r="14" fill="#0284c7" fillOpacity="0.25" stroke="#38bdf8" strokeWidth="1.5" />
          <circle cx="680" cy="140" r="4" fill="#38bdf8" />
          <text x="702" y="144" fill="#7dd3fc" fontSize="10" fontWeight="600" fontFamily="sans-serif">Cảng Tiên Sa</text>

          {/* KCN Hòa Khánh */}
          <circle cx="160" cy="180" r="14" fill="#d97706" fillOpacity="0.25" stroke="#fbbf24" strokeWidth="1.5" />
          <circle cx="160" cy="180" r="4" fill="#fbbf24" />
          <text x="75" y="184" fill="#fde68a" fontSize="10" fontWeight="600" fontFamily="sans-serif">KCN Hòa Khánh</text>

          {/* Sân bay Đà Nẵng */}
          <rect x="290" y="320" width="36" height="6" rx="3" transform="rotate(-35 290 320)" fill="#64748b" />
          <text x="250" y="355" fill="#94a3b8" fontSize="9" fontWeight="500" fontFamily="sans-serif">Sân bay Đà Nẵng</text>

          {/* Kho Vận Cẩm Lệ */}
          <circle cx="340" cy="440" r="12" fill="#059669" fillOpacity="0.25" stroke="#34d399" strokeWidth="1.5" />
          <circle cx="340" cy="440" r="3.5" fill="#34d399" />
          <text x="358" y="444" fill="#a7f3d0" fontSize="10" fontWeight="600" fontFamily="sans-serif">Kho Cẩm Lệ</text>

          {/* Active Glowing Delivery Route Polyline (Emerald Glowing Dashed Curve) */}
          <path
            d="M 170 180 Q 280 230 380 280 T 670 150"
            stroke="#10b981"
            strokeWidth="3.5"
            strokeDasharray="8 5"
            fill="none"
            className="animate-pulse"
          />
        </svg>
      </div>

      {/* Interactive 3D Package Markers & Active Capsule Layer */}
      <div
        className="absolute inset-0 transition-transform duration-300 pointer-events-none"
        style={{ transform: `scale(${zoomLevel})`, transformOrigin: 'center center' }}
      >
        {markers.map((marker) => {
          const isSelected = marker.id === selectedMarkerId;

          if (isSelected) {
            return (
              <button
                key={marker.id}
                type="button"
                onClick={() => handleMarkerClick(marker)}
                style={{ top: `${marker.y}%`, left: `${marker.x}%` }}
                aria-label={`Đang chọn: ${marker.orderRef} - ${marker.customer}`}
                className="absolute z-20 -translate-x-1/2 -translate-y-1/2 flex items-center gap-2.5 rounded-2xl bg-[#10b981] px-3.5 py-1.5 text-white shadow-2xl ring-2 ring-white/90 hover:scale-105 transition-all cursor-pointer pointer-events-auto"
              >
                <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-white text-slate-900 shadow-xs">
                  <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                    <path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z" />
                    <path d="m3.3 7 8.7 5 8.7-5" />
                    <path d="M12 22V12" />
                  </svg>
                </div>
                <div className="flex flex-col items-start leading-tight">
                  <span className="text-xs font-bold tracking-tight">{displayActiveLabel}</span>
                  <span className="text-[10px] text-emerald-100 font-medium">{marker.customer}</span>
                </div>
              </button>
            );
          }

          return (
            <button
              key={marker.id}
              type="button"
              onClick={() => handleMarkerClick(marker)}
              style={{ top: `${marker.y}%`, left: `${marker.x}%` }}
              aria-label={`Kiện hàng: ${marker.orderRef} - ${marker.customer}`}
              className="group absolute z-10 -translate-x-1/2 -translate-y-1/2 flex items-center justify-center h-8 w-8 rounded-xl bg-white text-slate-800 shadow-xl border border-slate-200/90 hover:scale-110 hover:border-emerald-400 hover:shadow-2xl transition-all cursor-pointer pointer-events-auto"
            >
              <svg className="w-4 h-4 text-slate-700 group-hover:text-emerald-600 transition-colors" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="m7.5 4.27 9 5.15" />
                <path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z" />
                <path d="m3.3 7 8.7 5 8.7-5" />
                <path d="M12 22V12" />
              </svg>
            </button>
          );
        })}
      </div>

      {/* Floating Header Controls: Frosted Glass Search Input on Left, Fullscreen on Right */}
      <div className="relative z-30 flex items-center justify-between p-3 sm:p-4 pointer-events-auto">
        <div className="relative w-52 sm:w-64">
          <svg
            className="w-3.5 h-3.5 text-slate-300 absolute left-3 top-2.5"
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
            className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-900/75 backdrop-blur-md border border-white/15 text-white rounded-xl placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-emerald-400 shadow-sm"
          />
        </div>

        {/* Fullscreen Toggle Button */}
        <button
          type="button"
          onClick={() => setIsFullscreen((f) => !f)}
          aria-label={isFullscreen ? 'Thu nhỏ bản đồ' : 'Phóng to toàn màn hình'}
          className="flex h-8 w-8 items-center justify-center rounded-xl bg-slate-900/75 backdrop-blur-md border border-white/15 text-white hover:bg-slate-800 transition-colors cursor-pointer shadow-sm"
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

      {/* Floating Bottom Controls: Compact Telemetry Badge on Left, Zoom Controls on Right */}
      <div className="relative z-30 flex items-center justify-between p-3 sm:p-4 pointer-events-auto">
        <div className="flex items-center gap-2 rounded-xl bg-slate-900/75 backdrop-blur-md border border-white/15 px-3 py-1 text-[11px] font-medium text-slate-300 shadow-sm">
          <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
          <span>Giám sát GPS trực tiếp · Đà Nẵng</span>
        </div>

        {/* Zoom Controls */}
        <div className="flex flex-col rounded-xl bg-slate-900/75 backdrop-blur-md border border-white/15 overflow-hidden shadow-lg">
          <button
            type="button"
            onClick={handleZoomIn}
            aria-label="Phóng to bản đồ"
            className="flex h-7 w-7 items-center justify-center text-sm font-bold text-white hover:bg-white/10 transition-colors cursor-pointer"
          >
            +
          </button>
          <div className="h-px w-full bg-white/15" />
          <button
            type="button"
            onClick={handleZoomOut}
            aria-label="Thu nhỏ bản đồ"
            className="flex h-7 w-7 items-center justify-center text-sm font-bold text-white hover:bg-white/10 transition-colors cursor-pointer"
          >
            −
          </button>
        </div>
      </div>
    </div>
  );
}

