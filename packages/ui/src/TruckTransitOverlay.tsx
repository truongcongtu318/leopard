'use client';

import React from 'react';
import { cn } from './cn';


export interface TruckTransitOverlayProps {
  isActive: boolean;
  className?: string;
}

export function TruckTransitOverlay({ isActive, className }: TruckTransitOverlayProps) {
  return (
    <div
      aria-hidden="true"
      data-testid="truck-transit-overlay"
      className={cn(
        'fixed inset-y-0 -left-[140vw] w-[140vw] z-50 pointer-events-none flex items-center transition-transform duration-1000 ease-in-out',
        isActive && 'translate-x-[140vw]',
        className
      )}
    >
      {/* Wind & Dust blur sweep */}
      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-sky-500/20 to-amber-500/30 backdrop-blur-[2px]" />

      {/* Cargo Truck Graphic Passing Across */}
      <div className="relative w-full flex items-center justify-end pr-12">
        <div className="transform scale-150 sm:scale-[2.2] filter drop-shadow-[0_25px_30px_rgba(0,0,0,0.9)]">
          <svg
            className="w-96 h-auto"
            viewBox="0 0 320 160"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            {/* Container */}
            <rect
              x="10"
              y="20"
              width="195"
              height="95"
              rx="6"
              fill="#F8FAFC"
              stroke="#94A3B8"
              strokeWidth="2.5"
            />
            <rect x="16" y="26" width="183" height="83" rx="4" fill="#FFFFFF" />
            <text
              x="32"
              y="66"
              fill="#0284C7"
              fontWeight="900"
              fontSize="22"
              letterSpacing="1"
              fontFamily="'Plus Jakarta Sans', sans-serif"
            >
              LEOPARD
            </text>
            <text x="32" y="86" fill="#0F172A" fontWeight="700" fontSize="11">
              VẬN TẢI TRỌNG TẢI LỚN
            </text>
            {/* Cab */}
            <path
              d="M205 38 L238 38 L265 65 L272 82 L275 115 L205 115 Z"
              fill="#F1F5F9"
              stroke="#64748B"
              strokeWidth="2"
            />
            <path d="M236 43 L260 66 L265 80 L234 80 Z" fill="#0F172A" />
            <rect x="266" y="94" width="8" height="6" rx="2" fill="#FDE047" />
            {/* Chassis & Wheels */}
            <rect x="20" y="112" width="250" height="8" fill="#0F172A" />
            <circle cx="45" cy="125" r="18" fill="#0F172A" stroke="#475569" strokeWidth="2.5" />
            <circle cx="85" cy="125" r="18" fill="#0F172A" stroke="#475569" strokeWidth="2.5" />
            <circle cx="245" cy="125" r="18" fill="#0F172A" stroke="#475569" strokeWidth="2.5" />
          </svg>
        </div>
      </div>
    </div>
  );
}
