'use client';

import React, { useState } from 'react';

export interface BentoMapCardProps {
  title?: string;
  activeOrderCode?: string;
  searchPlaceholder?: string;
  onSearch?: (query: string) => void;
}

export function BentoMapCard({
  title = 'Bản đồ điều phối thời gian thực',
  activeOrderCode = 'OR-1000 GreenMart',
  searchPlaceholder = 'Tìm kiếm đơn...',
  onSearch,
}: BentoMapCardProps) {
  const [zoomLevel, setZoomLevel] = useState(1);
  const [searchValue, setSearchValue] = useState('');
  const [isFullscreen, setIsFullscreen] = useState(false);

  const handleZoomIn = () => setZoomLevel((z) => Math.min(z + 0.15, 1.6));
  const handleZoomOut = () => setZoomLevel((z) => Math.max(z - 0.15, 0.85));

  return (
    <div
      aria-label={title}
      className={`relative overflow-hidden rounded-3xl bg-[#0b1320] border border-slate-800/80 shadow-sm transition-all duration-300 flex flex-col justify-between ${
        isFullscreen ? 'fixed inset-4 z-50 min-h-[90vh]' : 'min-h-[380px] sm:min-h-[420px]'
      }`}
    >
      {/* Dark Mode Map Canvas: Da Nang Vector Simulation */}
      <div
        className="absolute inset-0 transition-transform duration-300 pointer-events-none"
        style={{ transform: `scale(${zoomLevel})`, transformOrigin: 'center center' }}
        aria-hidden="true"
      >
        <svg
          className="w-full h-full object-cover opacity-80"
          viewBox="0 0 800 500"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          {/* Waterway / Coastal Bay */}
          <path
            d="M 50 500 C 150 420 180 320 220 250 C 260 180 320 120 420 80 C 520 40 650 30 800 10 L 800 500 Z"
            fill="#08182b"
          />
          {/* River branch (Han River style) */}
          <path
            d="M 280 500 C 290 400 270 330 250 250 C 230 180 260 120 320 0"
            stroke="#0e2a47"
            strokeWidth="38"
            strokeLinecap="round"
          />

          {/* Green Parks & Nature Reserves */}
          <path
            d="M 460 200 C 500 180 560 190 580 230 C 600 270 560 320 510 320 C 460 320 430 280 440 240 Z"
            fill="#062d27"
          />
          <path
            d="M 120 150 C 160 130 200 140 210 180 C 220 220 180 250 140 250 C 100 250 80 210 90 170 Z"
            fill="#062d27"
          />

          {/* Grid Street Networks */}
          <g stroke="#1a293e" strokeWidth="1.2" opacity="0.65">
            <line x1="0" y1="100" x2="800" y2="100" />
            <line x1="0" y1="180" x2="800" y2="180" />
            <line x1="0" y1="260" x2="800" y2="260" />
            <line x1="0" y1="340" x2="800" y2="340" />
            <line x1="0" y1="420" x2="800" y2="420" />
            <line x1="120" y1="0" x2="120" y2="500" />
            <line x1="240" y1="0" x2="240" y2="500" />
            <line x1="360" y1="0" x2="360" y2="500" />
            <line x1="480" y1="0" x2="480" y2="500" />
            <line x1="600" y1="0" x2="600" y2="500" />
            <line x1="720" y1="0" x2="720" y2="500" />
          </g>

          {/* Main Arterial Highways */}
          <path
            d="M 0 220 Q 200 240 380 200 T 800 230"
            stroke="#2e3b52"
            strokeWidth="5"
            fill="none"
          />
          <path
            d="M 180 0 Q 220 200 290 350 T 420 500"
            stroke="#2e3b52"
            strokeWidth="5"
            fill="none"
          />

          {/* Active Shipment Route Spine (Cyan / Emerald Glow) */}
          <path
            d="M 150 310 Q 260 280 340 300 T 520 220"
            stroke="#10b981"
            strokeWidth="3.5"
            strokeDasharray="6 4"
            fill="none"
          />
        </svg>

        {/* Scattered Package Markers (White 3D Cubes) */}
        <div className="absolute top-[28%] left-[14%] flex items-center justify-center h-8 w-8 rounded-xl bg-white text-slate-800 shadow-xl border border-slate-200">
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <path d="m7.5 4.27 9 5.15" />
            <path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z" />
            <path d="m3.3 7 8.7 5 8.7-5" />
            <path d="M12 22V12" />
          </svg>
        </div>

        <div className="absolute top-[22%] left-[44%] flex items-center justify-center h-8 w-8 rounded-xl bg-white text-slate-800 shadow-xl border border-slate-200">
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <path d="m7.5 4.27 9 5.15" />
            <path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z" />
            <path d="m3.3 7 8.7 5 8.7-5" />
            <path d="M12 22V12" />
          </svg>
        </div>

        <div className="absolute top-[26%] right-[18%] flex items-center justify-center h-8 w-8 rounded-xl bg-white text-slate-800 shadow-xl border border-slate-200">
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <path d="m7.5 4.27 9 5.15" />
            <path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z" />
            <path d="m3.3 7 8.7 5 8.7-5" />
            <path d="M12 22V12" />
          </svg>
        </div>

        <div className="absolute bottom-[24%] left-[12%] flex items-center justify-center h-8 w-8 rounded-xl bg-white text-slate-800 shadow-xl border border-slate-200">
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <path d="m7.5 4.27 9 5.15" />
            <path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z" />
            <path d="m3.3 7 8.7 5 8.7-5" />
            <path d="M12 22V12" />
          </svg>
        </div>

        <div className="absolute bottom-[36%] right-[15%] flex items-center justify-center h-8 w-8 rounded-xl bg-white text-slate-800 shadow-xl border border-slate-200">
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <path d="m7.5 4.27 9 5.15" />
            <path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z" />
            <path d="m3.3 7 8.7 5 8.7-5" />
            <path d="M12 22V12" />
          </svg>
        </div>

        {/* Selected Active Marker (Emerald Green Pill with Cube Icon) */}
        <div className="absolute top-[48%] left-[40%] flex items-center gap-2 rounded-2xl bg-[#10b981] px-3 py-1.5 text-white shadow-2xl ring-2 ring-white/80">
          <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-white text-slate-900 shadow-xs">
            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
              <path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z" />
              <path d="m3.3 7 8.7 5 8.7-5" />
              <path d="M12 22V12" />
            </svg>
          </div>
          <span className="text-xs font-bold tracking-tight">{activeOrderCode}</span>
        </div>
      </div>

      {/* Floating Header Controls: Search on Left, Fullscreen on Right */}
      <div className="relative z-10 flex items-center justify-between p-3 sm:p-4">
        {/* Floating Frosted Glass Search Input */}
        <div className="relative w-48 sm:w-56">
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
            className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-900/70 backdrop-blur-md border border-white/15 text-white rounded-xl placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-emerald-400"
          />
        </div>

        {/* Floating Fullscreen Toggle Button */}
        <button
          type="button"
          onClick={() => setIsFullscreen((f) => !f)}
          aria-label={isFullscreen ? 'Thu nhỏ bản đồ' : 'Phóng to toàn màn hình'}
          className="flex h-8 w-8 items-center justify-center rounded-xl bg-slate-900/70 backdrop-blur-md border border-white/15 text-white hover:bg-slate-800 transition-colors cursor-pointer"
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

      {/* Floating Bottom Controls: Zoom Buttons on Right */}
      <div className="relative z-10 flex items-end justify-end p-3 sm:p-4">
        <div className="flex flex-col rounded-xl bg-slate-900/70 backdrop-blur-md border border-white/15 overflow-hidden shadow-lg">
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
