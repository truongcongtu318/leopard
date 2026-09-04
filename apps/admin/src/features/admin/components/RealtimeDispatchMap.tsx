'use client';

import React, { useState } from 'react';

export type VehicleFilter = 'ALL' | 'PICKUP' | 'HEAVY';

export type TruckMarker = Readonly<{
  id: string;
  plate: string;
  type: 'pickup' | 'heavy' | 'light';
  driver: string;
  orderRef: string;
  x: number;
  y: number;
  status: string;
  route: string;
  color: string;
  icon: string;
}>;

const TRUCK_DATA: readonly TruckMarker[] = [
  {
    id: 'trk-1',
    plate: '43C-182.91',
    type: 'pickup',
    driver: 'Trần Hữu Nam',
    orderRef: 'LP-A-260815-101',
    x: 270,
    y: 215,
    status: 'Đang vận chuyển',
    route: 'KCN Liên Chiểu ➔ Kho Cẩm Lệ',
    color: '#38bdf8',
    icon: '🚚',
  },
  {
    id: 'trk-2',
    plate: '43C-302.15',
    type: 'pickup',
    driver: 'Sáu sign ups',
    orderRef: 'LP-A-260815-104',
    x: 355,
    y: 155,
    status: 'Đang đến điểm lấy',
    route: 'Hòa Vang ➔ Hải Châu',
    color: '#38bdf8',
    icon: '🚚',
  },
  {
    id: 'trk-3',
    plate: '43H-091.22',
    type: 'heavy',
    driver: 'Tấn xế nặng',
    orderRef: 'LP-A-260815-102',
    x: 565,
    y: 135,
    status: 'Đang vận chuyển',
    route: 'Cảng Tiên Sa ➔ KCN Hòa Khánh',
    color: '#fbbf24',
    icon: '🚛',
  },
  {
    id: 'trk-4',
    plate: '43H-882.01',
    type: 'heavy',
    driver: 'Thuyền trưởng',
    orderRef: 'LP-A-260815-105',
    x: 450,
    y: 205,
    status: 'Đang bận',
    route: 'Trung tâm Hải Châu ➔ Cẩm Lệ',
    color: '#fbbf24',
    icon: '🚛',
  },
  {
    id: 'trk-5',
    plate: '43H-412.30',
    type: 'heavy',
    driver: 'Nguyễn Văn Vũ',
    orderRef: 'LP-A-260815-106',
    x: 365,
    y: 275,
    status: 'Đang vận chuyển',
    route: 'KCN Hòa Khánh ➔ Ngũ Hành Sơn',
    color: '#fbbf24',
    icon: '🚛',
  },
  {
    id: 'trk-6',
    plate: '43C-889.01',
    type: 'pickup',
    driver: 'Lê Quang Hào',
    orderRef: 'LP-A-260815-103',
    x: 570,
    y: 315,
    status: 'Đã hoàn thành',
    route: 'Hải Châu ➔ Ngũ Hành Sơn',
    color: '#34d399',
    icon: '🚚',
  },
];

export function RealtimeDispatchMap() {
  const [filter, setFilter] = useState<VehicleFilter>('ALL');
  const [selectedTruck, setSelectedTruck] = useState<TruckMarker | null>(TRUCK_DATA[0] ?? null);
  const [zoom, setZoom] = useState(1);

  const visibleTrucks = TRUCK_DATA.filter((truck) => {
    if (filter === 'PICKUP') return truck.type === 'pickup';
    if (filter === 'HEAVY') return truck.type === 'heavy';
    return true;
  });

  return (
    <div className="rounded-[26px] border border-white/80 bg-white p-4 shadow-sm">
      {/* Header */}
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span aria-hidden="true" className="h-2.5 w-2.5 rounded-full bg-emerald-500 animate-pulse" />
          <h2 className="text-xs font-black tracking-wider text-slate-800 uppercase">
            BẢN ĐỒ THEO DÕI REAL-TIME
          </h2>
          <span className="hidden sm:inline-block rounded-full bg-sky-50 px-2 py-0.5 text-[10px] font-semibold text-sky-700 border border-sky-200">
            Dữ liệu mô phỏng · Ca trực pilot
          </span>
        </div>

        <button
          type="button"
          aria-label="Chế độ nhìn thảm"
          className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-600 shadow-2xs hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500"
        >
          <svg className="h-3.5 w-3.5 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7"/>
          </svg>
          <span>Nhìn Thảm</span>
        </button>
      </div>

      {/* Map Surface */}
      <div className="relative h-[300px] w-full overflow-hidden rounded-2xl border border-slate-200 bg-[#f7f4ea]">
        <svg
          className="h-full w-full object-cover transition-transform duration-200"
          viewBox="0 0 900 450"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          aria-label="Bản đồ mạng lưới vận tải Đà Nẵng"
          role="img"
        >
          <g transform={zoom !== 1 ? `scale(${zoom})` : undefined}>
          {/* Da Nang Bay Topography */}
          <path
            d="M 0 0 L 900 0 L 900 120 C 850 140 760 110 680 90 C 580 70 510 130 460 170 C 400 220 380 260 320 280 C 260 300 180 260 120 220 C 60 180 20 150 0 160 Z"
            fill="#b9ddf8"
          />
          <path
            d="M 0 160 C 20 150 60 180 120 220 C 180 260 260 300 320 280 C 380 260 400 220 460 170 C 510 130 580 70 680 90 C 760 110 850 140 900 120"
            stroke="#a3cff4"
            strokeWidth="4"
          />

          {/* Son Tra Peninsula */}
          <path
            d="M 660 70 C 700 30 790 40 840 80 C 880 110 870 170 810 190 C 750 200 680 170 650 130 C 640 100 640 80 660 70 Z"
            fill="#e2ecd3"
            stroke="#cadbb7"
            strokeWidth="2"
          />
          <text x="740" y="110" className="text-[11px] font-bold fill-emerald-800">
            BÙI ĐẶC XD
          </text>

          {/* Han River & Tributaries */}
          <path
            d="M 460 170 Q 450 220 440 280 T 455 380 T 450 450"
            stroke="#b9ddf8"
            strokeWidth="18"
            strokeLinecap="round"
            fill="none"
          />
          <path
            d="M 440 280 Q 380 320 280 350 T 120 380"
            stroke="#b9ddf8"
            strokeWidth="10"
            strokeLinecap="round"
            fill="none"
          />

          {/* Highways / Arterial Roads */}
          <path
            d="M 60 400 L 220 290 L 360 250 L 440 230 L 520 220 L 640 160"
            stroke="#f6c358"
            strokeWidth="7"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M 120 230 Q 250 290 350 260 T 460 190 T 560 180 T 660 140"
            stroke="#fbd988"
            strokeWidth="5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M 280 450 L 360 360 L 440 280 L 460 210"
            stroke="#f6c358"
            strokeWidth="6"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* A27 Highway Badges */}
          <g transform="translate(100, 202)">
            <rect x="0" y="0" width="28" height="16" rx="4" fill="#22c55e" stroke="#16a34a" strokeWidth="1"/>
            <text x="14" y="11" textAnchor="middle" className="text-[9px] font-extrabold fill-white">A27</text>
          </g>
          <g transform="translate(70, 312)">
            <rect x="0" y="0" width="28" height="16" rx="4" fill="#22c55e" stroke="#16a34a" strokeWidth="1"/>
            <text x="14" y="11" textAnchor="middle" className="text-[9px] font-extrabold fill-white">A27</text>
          </g>

          {/* Geographic Labels */}
          <text x="440" y="205" textAnchor="middle" className="text-[17px] font-black tracking-tight fill-slate-800">Da Nang</text>
          <text x="440" y="150" textAnchor="middle" className="text-[11px] font-semibold fill-slate-500">Cần Liên Chiểu</text>
          <text x="280" y="180" className="text-[10px] font-medium fill-slate-400">Hòa Vang</text>
          <text x="270" y="320" className="text-[10px] font-medium fill-slate-400">Cẩm Lệ</text>
          <text x="440" y="270" className="text-[10px] font-medium fill-slate-400">Hải Châu</text>
          <text x="560" y="415" className="text-[10px] font-medium fill-slate-400">Ngũ Hành Sơn</text>

          {/* Active Logistics Routes */}
          <path d="M 330 150 L 370 190 L 460 220 L 510 140 L 580 150" stroke="#22c55e" strokeWidth="4" strokeLinecap="round" fill="none"/>
          <path d="M 170 290 L 290 230 L 400 240 L 440 230" stroke="#0284c7" strokeWidth="4" strokeLinecap="round" fill="none"/>
          <path d="M 360 270 L 400 310 L 440 280 L 450 230" stroke="#a855f7" strokeWidth="4" strokeLinecap="round" fill="none"/>
          <path d="M 580 150 L 560 240 L 570 320 L 585 360" stroke="#0d9488" strokeWidth="4" strokeLinecap="round" fill="none"/>

          {/* Truck Markers */}
          {visibleTrucks.map((truck) => {
            const isSelected = selectedTruck?.id === truck.id;
            return (
              <g
                key={truck.id}
                transform={`translate(${truck.x}, ${truck.y})`}
                className="cursor-pointer"
                onClick={() => setSelectedTruck(truck)}
              >
                <rect
                  x="-2"
                  y="-2"
                  width="34"
                  height="24"
                  rx="6"
                  fill={truck.color}
                  stroke={isSelected ? '#0f172a' : '#ffffff'}
                  strokeWidth={isSelected ? '2.5' : '1.5'}
                  className="filter drop-shadow-md transition-all"
                />
                <text x="15" y="15" textAnchor="middle" className="text-[12px] select-none">
                  {truck.icon}
                </text>
              </g>
            );
          })}
          </g>
        </svg>

        {/* Floating Filter Pills on Top-Left */}
        <div className="absolute top-3.5 left-3.5 flex items-center gap-2">
          <button
            type="button"
            onClick={() => setFilter((curr) => (curr === 'PICKUP' ? 'ALL' : 'PICKUP'))}
            aria-pressed={filter === 'PICKUP'}
            className={`inline-flex items-center gap-1.5 rounded-xl px-3.5 py-1.5 text-xs font-bold shadow-md transition-all ${
              filter === 'PICKUP'
                ? 'bg-sky-600 text-white ring-2 ring-white'
                : 'bg-[#38bdf8] text-white hover:opacity-95'
            }`}
          >
            <span>🚚</span>
            <span>Bán tải</span>
          </button>

          <button
            type="button"
            onClick={() => setFilter((curr) => (curr === 'HEAVY' ? 'ALL' : 'HEAVY'))}
            aria-pressed={filter === 'HEAVY'}
            className={`inline-flex items-center gap-1.5 rounded-xl px-3.5 py-1.5 text-xs font-bold shadow-md transition-all ${
              filter === 'HEAVY'
                ? 'bg-amber-500 text-slate-900 ring-2 ring-white'
                : 'bg-[#fbbf24] text-slate-800 hover:opacity-95'
            }`}
          >
            <span>🚛</span>
            <span>Tải nặng</span>
          </button>
        </div>

        {/* Floating Zoom & Controls on Top-Right */}
        <div className="absolute top-3.5 right-3.5 flex flex-col gap-1.5">
          <button
            type="button"
            onClick={() => setZoom((z) => Math.min(z + 0.15, 1.6))}
            aria-label="Phóng to bản đồ"
            className="flex h-7 w-7 items-center justify-center rounded-lg border border-slate-200 bg-white text-sm font-bold text-slate-700 shadow-sm hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500"
          >
            +
          </button>
          <button
            type="button"
            onClick={() => setZoom((z) => Math.max(z - 0.15, 0.85))}
            aria-label="Thu nhỏ bản đồ"
            className="flex h-7 w-7 items-center justify-center rounded-lg border border-slate-200 bg-white text-sm font-bold text-slate-700 shadow-sm hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500"
          >
            −
          </button>
        </div>

        {/* Selected Truck Inspector Card on Bottom-Left */}
        {selectedTruck ? (
          <div className="absolute bottom-3 left-3 max-w-xs rounded-xl border border-slate-200 bg-white/95 p-3 shadow-md backdrop-blur-xs text-xs">
            <div className="flex items-center justify-between gap-2">
              <span className="font-bold text-sky-700">{selectedTruck.plate}</span>
              <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-800">
                {selectedTruck.status}
              </span>
            </div>
            <p className="mt-1 text-slate-700">
              Tài xế: <strong>{selectedTruck.driver}</strong>
            </p>
            <p className="mt-0.5 text-[11px] text-slate-500">
              Tuyến: {selectedTruck.route}
            </p>
            <p className="mt-0.5 text-[10px] text-slate-400 font-mono">
              Đơn hàng: <span>{selectedTruck.orderRef}</span>
            </p>
          </div>
        ) : null}

        {/* Info Icon on Bottom-Right */}
        <div className="absolute bottom-3 right-3 flex h-6 w-6 items-center justify-center rounded-full bg-white/90 text-xs font-serif font-bold text-slate-700 shadow-xs">
          i
        </div>
      </div>
    </div>
  );
}
