'use client';

import React from 'react';
import { ExternalLink, FileText } from 'lucide-react';

export type ModernTelemetryProps = Readonly<{
  totalOrders?: number;
  inTransitOrders?: number;
  deliveredOrders?: number;
  cancelledOrders?: number;
  activeVehicles?: number;
  liveness?: string;
  readiness?: string;
}>;

export function ModernTelemetryCards({
  totalOrders = 301,
  inTransitOrders = 32,
  deliveredOrders = 38,
  cancelledOrders = 2,
  activeVehicles = 12,
  liveness = 'UP',
  readiness = 'READY',
}: ModernTelemetryProps) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {/* Card 1: ĐƠN HÀNG HÔM NAY (Wave Sparkline) */}
      <div className="flex flex-col justify-between rounded-3xl border border-slate-100 bg-white p-5 shadow-sm">
        <div>
          <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
            ĐƠN HÀNG HÔM NAY
          </p>
          <p className="mt-1 font-mono text-3xl font-extrabold text-slate-900">
            {totalOrders}
          </p>
        </div>

        {/* Blue Wave Sparkline */}
        <div className="my-2 h-10 w-full">
          <svg className="h-full w-full" viewBox="0 0 100 40" fill="none" aria-hidden="true" focusable="false">
            <path
              d="M 0 30 C 15 35 25 15 40 25 C 55 35 65 10 80 20 C 90 28 95 15 100 18"
              stroke="#0ea5e9"
              strokeWidth="2.5"
              fill="none"
              strokeLinecap="round"
            />
            <path
              d="M 0 30 C 15 35 25 15 40 25 C 55 35 65 10 80 20 C 90 28 95 15 100 18 L 100 40 L 0 40 Z"
              fill="url(#blueWaveGrad2)"
              opacity="0.3"
            />
            <defs>
              <linearGradient id="blueWaveGrad2" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#38bdf8" />
                <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
              </linearGradient>
            </defs>
          </svg>
        </div>

        {/* Breakdown Dots */}
        <div className="space-y-1.5 text-xs font-medium text-slate-600">
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-1.5 text-slate-500">
              <span aria-hidden="true" className="h-2 w-2 rounded-full bg-sky-500" />
              Đang giao:
            </span>
            <strong className="font-mono text-slate-800">{inTransitOrders}</strong>
          </div>
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-1.5 text-slate-500">
              <span aria-hidden="true" className="h-2 w-2 rounded-full bg-emerald-500" />
              Hoàn thành:
            </span>
            <strong className="font-mono text-slate-800">{deliveredOrders}</strong>
          </div>
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-1.5 text-slate-500">
              <span aria-hidden="true" className="h-2 w-2 rounded-full bg-rose-500" />
              Đã hủy:
            </span>
            <strong className="font-mono text-slate-800">{cancelledOrders}</strong>
          </div>
        </div>
      </div>

      {/* Card 2: XE ĐANG HOẠT ĐỘNG (Green Bar Chart) */}
      <div className="flex flex-col justify-between rounded-3xl border border-slate-100 bg-white p-5 shadow-sm">
        <div>
          <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
            XE ĐANG HOẠT ĐỘNG
          </p>
          <p className="mt-1 font-mono text-3xl font-extrabold text-slate-900">
            {activeVehicles} xe
          </p>
        </div>

        <div className="my-2 grid grid-cols-3 gap-1.5 text-xs font-medium text-slate-600">
          <div className="flex flex-col items-start rounded-xl bg-slate-50 p-2">
            <span className="text-[11px] text-slate-400">Tải nhẹ</span>
            <strong className="font-mono text-slate-800 text-sm">5 xe</strong>
          </div>
          <div className="flex flex-col items-start rounded-xl bg-slate-50 p-2">
            <span className="text-[11px] text-slate-400">Bán tải</span>
            <strong className="font-mono text-slate-800 text-sm">4 xe</strong>
          </div>
          <div className="flex flex-col items-start rounded-xl bg-slate-50 p-2">
            <span className="text-[11px] text-slate-400">Tải nặng</span>
            <strong className="font-mono text-slate-800 text-sm">3 xe</strong>
          </div>
        </div>

        {/* Vertical Green Bars */}
        <div className="flex h-9 items-end justify-between gap-1 px-1" aria-hidden="true">
          <div className="h-5 w-3 rounded-xs bg-emerald-400" />
          <div className="h-7 w-3 rounded-xs bg-emerald-500" />
          <div className="h-4 w-3 rounded-xs bg-emerald-400" />
          <div className="h-6 w-3 rounded-xs bg-emerald-500" />
          <div className="h-9 w-3 rounded-xs bg-emerald-600" />
        </div>
      </div>

      {/* Card 3: ETA DỰ KIẾN (Donut Ring Chart) */}
      <div className="flex flex-col justify-between rounded-3xl border border-slate-100 bg-white p-5 shadow-sm">
        <div>
          <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
            ETA DỰ KIẾN <span className="text-[10px] font-normal text-slate-400">(Mô phỏng)</span>
          </p>
        </div>

        {/* Circular Donut Ring Chart */}
        <div className="my-2 flex items-center justify-center">
          <div className="relative h-16 w-16">
            <svg className="h-16 w-16 -rotate-90" viewBox="0 0 36 36" aria-hidden="true" focusable="false">
              <path
                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                fill="none"
                stroke="#e0f2fe"
                strokeWidth="4"
              />
              <path
                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                fill="none"
                stroke="#0ea5e9"
                strokeDasharray="94, 100"
                strokeWidth="4"
                strokeLinecap="round"
              />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center font-mono text-sm font-bold text-slate-800">
              94%
            </div>
          </div>
        </div>

        <div className="space-y-1.5 text-xs font-medium text-slate-600">
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-1.5 text-slate-500">
              <span aria-hidden="true" className="h-2 w-2 rounded-full bg-emerald-500" />
              Độ khớp ETA:
            </span>
            <strong className="font-mono text-slate-800">94%</strong>
          </div>
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-1.5 text-slate-500">
              <span aria-hidden="true" className="h-2 w-2 rounded-full bg-amber-400" />
              Giao đúng hẹn:
            </span>
            <strong className="font-mono text-slate-800">89%</strong>
          </div>
        </div>
      </div>

      {/* Card 4: BÁO CÁO & ĐỐI SOÁT CA TRỰC */}
      <div className="flex flex-col justify-between rounded-3xl border border-slate-100 bg-white p-5 shadow-sm">
        <div className="flex items-center justify-between">
          <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
            BÁO CÁO CA TRỰC
          </p>
          <span className={`flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold ${liveness === 'UP' && readiness === 'READY' ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}>
            <span className={`h-1.5 w-1.5 rounded-full ${liveness === 'UP' && readiness === 'READY' ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'}`} />
            {liveness === 'UP' && readiness === 'READY' ? 'Trực tuyến' : 'Đang kết nối'}
          </span>
        </div>

        <div className="my-2 space-y-2 text-xs">
          <a
            href="/admin/orders"
            className="flex items-center gap-2 text-slate-700 hover:text-emerald-600 transition-colors"
          >
            <FileText className="w-4 h-4 text-slate-400 shrink-0" aria-hidden="true" />
            <span className="line-clamp-1 leading-tight font-medium">Báo cáo ca trực Đà Nẵng</span>
            <span className="ml-auto text-slate-400 text-xs" aria-hidden="true">↗</span>
          </a>
          <a
            href="/admin/orders"
            className="flex items-center gap-2 text-slate-700 hover:text-emerald-600 transition-colors"
          >
            <FileText className="w-4 h-4 text-slate-400 shrink-0" aria-hidden="true" />
            <span className="line-clamp-1 leading-tight font-medium">Đối soát VietQR / payOS</span>
            <span className="ml-auto text-slate-400 text-xs" aria-hidden="true">↗</span>
          </a>
        </div>

        <div className="border-t border-slate-100 pt-2 text-[11px] text-slate-400 flex items-center justify-between">
          <span>Xuất sổ dữ liệu:</span>
          <strong className="text-slate-800 font-semibold">PDF / CSV</strong>
        </div>
      </div>
    </div>
  );
}
