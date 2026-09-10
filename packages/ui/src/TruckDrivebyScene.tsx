'use client';

import React, { useState } from 'react';
import { cn } from './cn';

export type VehicleCategory = 'VAN' | 'BAGAC' | 'TRUCK_5T' | 'TRUCK_15T' | 'CONTAINER';

export interface TruckDrivebySceneProps {
  role?: 'CUSTOMER' | 'DRIVER' | 'FLEET_OWNER' | 'ADMIN';
  initialVehicleType?: VehicleCategory;
  isDrivingFast?: boolean;
  showWaypoints?: boolean;
  className?: string;
  onVehicleChange?: (type: VehicleCategory) => void;
}

export function TruckDrivebyScene({
  role = 'CUSTOMER',
  initialVehicleType = 'TRUCK_15T',
  isDrivingFast = false,
  showWaypoints = true,
  className,
  onVehicleChange,
}: TruckDrivebySceneProps) {
  const [vehicleType, setVehicleType] = useState<VehicleCategory>(initialVehicleType);

  const handleSelectVehicle = (type: VehicleCategory) => {
    setVehicleType(type);
    onVehicleChange?.(type);
  };

  const getRoleBadge = () => {
    switch (role) {
      case 'DRIVER':
        return { text: '🚚 TÀI XẾ ĐỐI TÁC', color: '#15803D', bg: '#DCFCE7', border: '#86EFAC' };
      case 'FLEET_OWNER':
        return { text: '🏢 CHỦ ĐỘI XE', color: '#B45309', bg: '#FEF3C7', border: '#FDE68A' };
      case 'ADMIN':
        return { text: '🛡️ QUẢN TRỊ VIÊN', color: '#7E22CE', bg: '#F3E8FF', border: '#D8B4FE' };
      case 'CUSTOMER':
      default:
        return { text: '📦 KHÁCH HÀNG SME', color: '#0369A1', bg: '#E0F2FE', border: '#BAE6FD' };
    }
  };

  const roleBadge = getRoleBadge();

  return (
    <div
      className={cn(
        'relative w-full rounded-2xl bg-[#EEF3F9] border border-[#CAD9EB] p-5 overflow-hidden shadow-xl text-slate-800',
        className
      )}
      data-testid="truck-driveby-scene"
    >
      {/* Floating Telemetry Chips */}
      <div className="relative z-10 flex flex-wrap gap-2.5 mb-4">
        <div className="anim-float-slow px-3 py-1.5 rounded-xl bg-white/90 border border-[#D5E1F0] shadow-sm backdrop-blur flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-xs font-bold text-[#0B1F3A]">
            Đơn sẵn sàng: <strong className="text-sky-600 font-mono">1,840+ đơn</strong>
          </span>
        </div>
        <div className="anim-float-slow-delay px-3 py-1.5 rounded-xl bg-white/90 border border-[#D5E1F0] shadow-sm backdrop-blur flex items-center gap-2">
          <span className="text-sky-600 font-bold text-xs">⚡ Vietmap AI:</span>
          <span className="text-xs font-semibold text-[#5B6B80]">Tránh cấm tải & cầu thấp</span>
        </div>
        <div className="hidden sm:flex px-3 py-1.5 rounded-xl bg-white/90 border border-[#D5E1F0] shadow-sm backdrop-blur items-center gap-2">
          <span className="text-emerald-600 font-bold text-xs">✓ Thanh toán:</span>
          <span className="text-xs font-semibold text-[#5B6B80]">VietQR Tự Động</span>
        </div>
      </div>

      {/* THE 3D SCENIC STAGE: SKY, CLOUDS & 3D HIGHWAY */}
      <div className="relative w-full h-52 sm:h-60 bg-gradient-to-b from-[#D0E3F6] to-[#E8F2FB] rounded-2xl overflow-hidden border border-[#D4E2F0] flex flex-col justify-end">
        {/* Floating Clouds in Sky */}
        <div className="absolute top-2 left-6 flex items-center anim-float-slow pointer-events-none opacity-90">
          <div className="w-10 h-4.5 bg-white/90 rounded-full shadow-xs relative">
            <div className="absolute -left-2 top-0.5 w-6 h-3.5 bg-white/90 rounded-full" />
            <div className="absolute -right-2 top-1 w-5 h-3 bg-white/90 rounded-full" />
          </div>
        </div>

        <div className="absolute top-4 right-12 flex items-center anim-float-slow-delay pointer-events-none opacity-85">
          <div className="w-8 h-3.5 bg-white/90 rounded-full shadow-xs relative">
            <div className="absolute -left-1.5 top-0.5 w-5 h-3 bg-white/90 rounded-full" />
            <div className="absolute -right-1.5 top-0.5 w-4 h-2.5 bg-white/90 rounded-full" />
          </div>
        </div>





        {/* GPS Waypoints Route Spine */}
        {showWaypoints && (
          <div className="absolute top-4 left-4 right-4 flex items-center justify-between text-[11px] font-bold text-[#0B1F3A] z-10">
            <div className="flex items-center gap-1.5 bg-white/95 px-3 py-1 rounded-full border border-[#D4E2F0] text-sky-700 shadow-sm">
              <span className="w-2 h-2 rounded-full bg-sky-500" />
              <span>Kho Bình Dương (Pickup)</span>
            </div>
            <div className="h-0.5 flex-1 mx-3 border-t-2 border-dashed border-sky-400 relative">
              <div className="absolute -top-2 left-1/2 -translate-x-1/2 px-2.5 py-0.5 rounded-full bg-white border border-[#D4E2F0] text-[10px] text-amber-600 font-mono font-bold shadow-xs">
                ETA 28&apos;
              </div>
            </div>
            <div className="flex items-center gap-1.5 bg-white/95 px-3 py-1 rounded-full border border-[#D4E2F0] text-emerald-700 shadow-sm">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              <span>Cảng Cát Lái (Dropoff)</span>
            </div>
          </div>
        )}

        {/* 3D ELEVATED HIGHWAY (Overpass wall + Curb + Asphalt + Dashed lines) */}
        <div className="relative w-full h-24 overflow-hidden flex flex-col justify-end z-10">
          {/* Layer 1: Ambient Drop Shadow beneath bridge */}
          <div className="absolute bottom-2 left-0 right-0 h-16 bg-slate-900/15 blur-sm" />

          {/* Layer 2: 3D Concrete Bridge Side Thickness (Overpass Wall) */}
          <div className="absolute bottom-1 left-0 right-0 h-14 bg-[#5A6B7C] rounded-t-lg" />

          {/* Layer 3: Road Shoulder / Guardrail Curb */}
          <div className="absolute bottom-3 left-0 right-0 h-12 bg-[#8596A6] rounded-t-md" />

          {/* Layer 4: Upper Light Reflection on Edge */}
          <div className="absolute bottom-[58px] left-0 right-0 h-[2px] bg-white/85" />

          {/* Layer 5: Main Asphalt Surface */}
          <div className="relative w-full h-12 bg-[#B0BDCC] flex items-center overflow-hidden">
            {/* Layer 6: Reflective Dashed Centre Line (Moving animation) */}
            <div
              className={cn(
                'w-[200%] h-2 flex items-center',
                isDrivingFast ? 'anim-road-stripes-fast' : 'anim-road-stripes'
              )}
            >
              <div className="w-full flex gap-8">
                <span className="w-12 h-1 bg-white rounded-xs shadow-xs" />
                <span className="w-12 h-1 bg-white rounded-xs shadow-xs" />
                <span className="w-12 h-1 bg-white rounded-xs shadow-xs" />
                <span className="w-12 h-1 bg-white rounded-xs shadow-xs" />
                <span className="w-12 h-1 bg-white rounded-xs shadow-xs" />
                <span className="w-12 h-1 bg-white rounded-xs shadow-xs" />
                <span className="w-12 h-1 bg-white rounded-xs shadow-xs" />
                <span className="w-12 h-1 bg-white rounded-xs shadow-xs" />
                <span className="w-12 h-1 bg-white rounded-xs shadow-xs" />
                <span className="w-12 h-1 bg-white rounded-xs shadow-xs" />
              </div>
            </div>
          </div>

          {/* THE LEOPARD HEAVY CARGO TRUCK WITH AERODYNAMIC WIND & DUST */}
          <div className="absolute bottom-2 left-8 sm:left-24 z-20 transition-all duration-500 ease-out flex items-end">
            {/* Angled Contact Shadow under Truck Chassis */}
            <div
              className="absolute -bottom-1 left-2 w-48 h-5 bg-slate-900/30 rounded-full blur-[2px] rotate-[27deg] pointer-events-none"
            />

            {/* SVG TRUCK GRAPHIC WITH ONBOARDING WIND & DUST PUFFS */}
            <div className="relative anim-truck-bounce">
              {/* Pure White Aerodynamic Wind Speed Streaks */}
              <div className="absolute top-4 -left-6 w-8 h-1 bg-white rounded-full shadow-[0_0_6px_#FFFFFF] -rotate-[22deg] opacity-90 pointer-events-none" />
              <div className="absolute top-8 -left-8 w-10 h-1 bg-white rounded-full shadow-[0_0_6px_#FFFFFF] -rotate-[20deg] opacity-85 pointer-events-none" />
              <div className="absolute top-12 -left-4 w-6 h-0.5 bg-white rounded-full shadow-[0_0_4px_#FFFFFF] -rotate-[18deg] opacity-75 pointer-events-none" />

              {/* Wheel Dust Cloud Puffs behind rear wheels */}
              <div className="absolute bottom-3 -left-3 w-4 h-4 rounded-full bg-slate-300/80 border border-slate-400 opacity-80 pointer-events-none" />
              <div className="absolute bottom-2 -left-5 w-3 h-3 rounded-full bg-slate-300/70 border border-slate-400 opacity-60 pointer-events-none" />

              <svg
                className="w-48 sm:w-56 h-auto filter drop-shadow-[0_12px_16px_rgba(15,23,42,0.25)]"
                viewBox="0 0 320 160"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                {/* Truck Container (Crisp White Gloss Box) */}
                <rect
                  x="10"
                  y="20"
                  width="195"
                  height="95"
                  rx="6"
                  fill="#FFFFFF"
                  stroke="#CAD9EB"
                  strokeWidth="2.5"
                />
                <rect x="16" y="26" width="183" height="83" rx="4" fill="#F8FAFC" />

                {/* Container ribs */}
                <line x1="50" y1="26" x2="50" y2="109" stroke="#E2E8F0" strokeWidth="1.5" />
                <line x1="85" y1="26" x2="85" y2="109" stroke="#E2E8F0" strokeWidth="1.5" />
                <line x1="120" y1="26" x2="120" y2="109" stroke="#E2E8F0" strokeWidth="1.5" />
                <line x1="155" y1="26" x2="155" y2="109" stroke="#E2E8F0" strokeWidth="1.5" />
                <line x1="190" y1="26" x2="190" y2="109" stroke="#CBD5E1" strokeWidth="2" />

                {/* LEOPARD Branding on Container */}
                <rect x="25" y="40" width="125" height="32" rx="4" fill="#0284C7" fillOpacity="0.08" />
                <text
                  x="32"
                  y="62"
                  fill="#0284C7"
                  fontFamily="'Plus Jakarta Sans', sans-serif"
                  fontWeight="900"
                  fontSize="18"
                  letterSpacing="1"
                >
                  LEOPARD
                </text>
                <rect x="122" y="46" width="22" height="18" rx="3" fill="#F59E0B" />
                <text x="126" y="59" fill="#FFFFFF" fontWeight="800" fontSize="9">
                  {vehicleType === 'VAN' ? '1T' : vehicleType === 'BAGAC' ? '0.5T' : '30T'}
                </text>

                {/* Role badge */}
                <g>
                  <rect
                    x="28"
                    y="78"
                    width="124"
                    height="20"
                    rx="10"
                    fill={roleBadge.bg}
                    stroke={roleBadge.border}
                    strokeWidth="1"
                  />
                  <text x="36" y="92" fill={roleBadge.color} fontSize="9" fontWeight="700">
                    {roleBadge.text}
                  </text>
                </g>

                {/* Truck Cab (Cabin) */}
                <path
                  d="M205 38 L238 38 L265 65 L272 82 L275 115 L205 115 Z"
                  fill="#FFFFFF"
                  stroke="#94A3B8"
                  strokeWidth="2"
                />
                {/* Windshield */}
                <path
                  d="M236 43 L260 66 L265 80 L234 80 Z"
                  fill="#1E293B"
                  stroke="#0F172A"
                  strokeWidth="1.5"
                />
                <circle cx="245" cy="62" r="5" fill="#64748B" />
                <path d="M240 78 C240 70 252 70 252 78 Z" fill="#64748B" />

                {/* Wind Deflector on roof */}
                <path
                  d="M205 20 C225 20 238 28 248 38 L205 38 Z"
                  fill="#F1F5F9"
                  stroke="#CBD5E1"
                  strokeWidth="1.5"
                />

                {/* Door & Handle */}
                <line x1="232" y1="62" x2="232" y2="108" stroke="#CBD5E1" strokeWidth="1.5" />
                <rect x="235" y="84" width="8" height="3" rx="1.5" fill="#475569" />

                {/* Front Grill & Headlights */}
                <rect x="268" y="86" width="7" height="24" rx="2" fill="#334155" />
                <rect
                  x="266"
                  y="94"
                  width="8"
                  height="6"
                  rx="2"
                  fill="#FDE047"
                  stroke="#F59E0B"
                  strokeWidth="1"
                  className="anim-headlight-pulse"
                />
                <rect x="266" y="103" width="7" height="3" rx="1" fill="#F97316" />

                {/* Chassis */}
                <rect x="20" y="112" width="250" height="8" fill="#334155" />
                {/* Fuel Tank */}
                <rect
                  x="75"
                  y="105"
                  width="45"
                  height="15"
                  rx="3"
                  fill="#64748B"
                  stroke="#475569"
                  strokeWidth="1"
                />

                {/* Rear Wheels */}
                <g
                  className={isDrivingFast ? 'anim-wheel-rotate-fast' : 'anim-wheel-rotate'}
                  style={{ transformOrigin: '45px 125px' }}
                >
                  <circle cx="45" cy="125" r="18" fill="#0F172A" stroke="#334155" strokeWidth="2" />
                  <circle cx="45" cy="125" r="11" fill="#475569" />
                  <circle cx="45" cy="125" r="5" fill="#CBD5E1" />
                  <line x1="45" y1="114" x2="45" y2="136" stroke="#94A3B8" strokeWidth="1.5" />
                  <line x1="34" y1="125" x2="56" y2="125" stroke="#94A3B8" strokeWidth="1.5" />
                </g>
                <g
                  className={isDrivingFast ? 'anim-wheel-rotate-fast' : 'anim-wheel-rotate'}
                  style={{ transformOrigin: '85px 125px' }}
                >
                  <circle cx="85" cy="125" r="18" fill="#0F172A" stroke="#334155" strokeWidth="2" />
                  <circle cx="85" cy="125" r="11" fill="#475569" />
                  <circle cx="85" cy="125" r="5" fill="#CBD5E1" />
                  <line x1="85" y1="114" x2="85" y2="136" stroke="#94A3B8" strokeWidth="1.5" />
                  <line x1="74" y1="125" x2="96" y2="125" stroke="#94A3B8" strokeWidth="1.5" />
                </g>

                {/* Front Wheel */}
                <g
                  className={isDrivingFast ? 'anim-wheel-rotate-fast' : 'anim-wheel-rotate'}
                  style={{ transformOrigin: '245px 125px' }}
                >
                  <circle cx="245" cy="125" r="18" fill="#0F172A" stroke="#334155" strokeWidth="2" />
                  <circle cx="245" cy="125" r="11" fill="#475569" />
                  <circle cx="245" cy="125" r="5" fill="#CBD5E1" />
                  <line x1="245" y1="114" x2="245" y2="136" stroke="#94A3B8" strokeWidth="1.5" />
                  <line x1="234" y1="125" x2="256" y2="125" stroke="#94A3B8" strokeWidth="1.5" />
                </g>
              </svg>
            </div>
          </div>
        </div>

        {/* Route Chip */}
        <div className="absolute left-3.5 bottom-3.5 flex items-center gap-2 bg-white/95 px-3 py-1.5 rounded-full border border-[#DBE6F2] shadow-sm z-20">
          <div className="w-2 h-2 rounded-full bg-[#16A34A] animate-ping" />
          <span className="text-xs font-bold text-[#0B1F3A]">Trực tuyến · Vietmap Routing</span>
        </div>

      </div>

      {/* Vehicle Type Selector Chips */}
      <div className="mt-3.5 flex flex-wrap items-center justify-between gap-2 text-xs">
        <span className="text-[#5B6B80] font-semibold">Chủng loại xe vận hành:</span>
        <div className="flex flex-wrap gap-1.5">
          <button
            type="button"
            onClick={() => handleSelectVehicle('VAN')}
            className={cn(
              'px-2.5 py-1 rounded-lg transition-all text-xs font-bold',
              vehicleType === 'VAN'
                ? 'bg-[#2E6FD6] text-white shadow-xs'
                : 'bg-white hover:bg-slate-100 text-[#0B1F3A] border border-[#D5E1F0]'
            )}
          >
            Xe Van (500kg - 1T)
          </button>
          <button
            type="button"
            onClick={() => handleSelectVehicle('BAGAC')}
            className={cn(
              'px-2.5 py-1 rounded-lg transition-all text-xs font-bold',
              vehicleType === 'BAGAC'
                ? 'bg-[#2E6FD6] text-white shadow-xs'
                : 'bg-white hover:bg-slate-100 text-[#0B1F3A] border border-[#D5E1F0]'
            )}
          >
            Xe Ba Gác
          </button>
          <button
            type="button"
            onClick={() => handleSelectVehicle('TRUCK_15T')}
            className={cn(
              'px-2.5 py-1 rounded-lg transition-all text-xs font-bold',
              vehicleType === 'TRUCK_15T' || vehicleType === 'TRUCK_5T'
                ? 'bg-[#2E6FD6] text-white shadow-xs'
                : 'bg-white hover:bg-slate-100 text-[#0B1F3A] border border-[#D5E1F0]'
            )}
          >
            Xe Tải Nặng (5T - 30T)
          </button>
        </div>
      </div>
    </div>
  );
}
