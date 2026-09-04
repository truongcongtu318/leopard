'use client';

import React from 'react';

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
  totalOrders = 215,
  inTransitOrders = 145,
  deliveredOrders = 68,
  cancelledOrders = 2,
  activeVehicles = 389,
  liveness = 'UP',
  readiness = 'READY',
}: ModernTelemetryProps) {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6">
      {/* Card 1: ĐƠN HÀNG HÔM NAY (Wave Sparkline) */}
      <div className="flex flex-col justify-between rounded-[26px] border border-white/80 bg-white p-4 shadow-sm">
        <div>
          <p className="text-[10px] font-black uppercase tracking-wider text-slate-700">
            ĐƠN HÀNG HÔM NAY
          </p>
          <p className="mt-1 font-mono text-2xl font-black text-slate-900">
            {totalOrders}
          </p>
        </div>

        {/* Blue Wave Sparkline */}
        <div className="my-1.5 h-10 w-full">
          <svg className="h-full w-full" viewBox="0 0 100 40" fill="none" aria-hidden="true" focusable="false">
            <path
              d="M 0 30 C 15 35 25 15 40 25 C 55 35 65 10 80 20 C 90 28 95 15 100 18"
              stroke="#38bdf8"
              strokeWidth="2.5"
              fill="none"
              strokeLinecap="round"
            />
            <path
              d="M 0 30 C 15 35 25 15 40 25 C 55 35 65 10 80 20 C 90 28 95 15 100 18 L 100 40 L 0 40 Z"
              fill="url(#blueWaveGrad2)"
              opacity="0.25"
            />
            <defs>
              <linearGradient id="blueWaveGrad2" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#38bdf8" />
                <stop offset="100%" stopColor="#ffffff" />
              </linearGradient>
            </defs>
          </svg>
        </div>

        {/* Breakdown Dots */}
        <div className="space-y-1 text-[11px] font-medium text-slate-600">
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <span aria-hidden="true" className="h-2 w-2 rounded-full bg-sky-500" />
              Đang giao:
            </span>
            <strong className="font-mono text-slate-800">{inTransitOrders}</strong>
          </div>
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <span aria-hidden="true" className="h-2 w-2 rounded-full bg-emerald-500" />
              Hoàn thành:
            </span>
            <strong className="font-mono text-slate-800">{deliveredOrders}</strong>
          </div>
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <span aria-hidden="true" className="h-2 w-2 rounded-full bg-rose-500" />
              Hủy:
            </span>
            <strong className="font-mono text-slate-800">{cancelledOrders}</strong>
          </div>
        </div>
      </div>

      {/* Card 2: XE ĐANG HOẠT ĐỘNG (Green Bar Chart) */}
      <div className="flex flex-col justify-between rounded-[26px] border border-white/80 bg-white p-4 shadow-sm">
        <div>
          <p className="text-[10px] font-black uppercase tracking-wider text-slate-700">
            XE ĐANG HOẠT ĐỘNG
          </p>
          <p className="mt-1 font-mono text-2xl font-black text-slate-900">
            {activeVehicles}
          </p>
        </div>

        <div className="my-1 grid grid-cols-2 gap-x-1 text-[10px] font-medium text-slate-600">
          <div className="flex items-center gap-1">
            <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
            Ba gác: <strong>112</strong>
          </div>
          <div className="flex items-center gap-1">
            <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
            Tải nhẹ: <strong>85</strong>
          </div>
          <div className="flex items-center gap-1">
            <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-amber-400" />
            Bán tải: <strong>98</strong>
          </div>
          <div className="flex items-center gap-1">
            <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-amber-400" />
            Tải nặng: <strong>94</strong>
          </div>
        </div>

        {/* Vertical Green Bars */}
        <div className="flex h-9 items-end justify-between gap-1 px-1" aria-hidden="true">
          <div className="h-5 w-2.5 rounded-xs bg-emerald-400" />
          <div className="h-7 w-2.5 rounded-xs bg-emerald-400" />
          <div className="h-4 w-2.5 rounded-xs bg-emerald-400" />
          <div className="h-6 w-2.5 rounded-xs bg-emerald-400" />
          <div className="h-9 w-2.5 rounded-xs bg-emerald-400" />
        </div>
      </div>

      {/* Card 3: ETA DỰ KIẾN (Donut Ring Chart) */}
      <div className="flex flex-col justify-between rounded-[26px] border border-white/80 bg-white p-4 shadow-sm">
        <div>
          <p className="text-[10px] font-black uppercase tracking-wider text-slate-700">
            ETA DỰ KIẾN <span className="text-[9px] font-normal text-slate-400">(Mô phỏng)</span>
          </p>
        </div>

        {/* Circular Donut Ring Chart */}
        <div className="my-1 flex items-center justify-center">
          <div className="relative h-14 w-14">
            <svg className="h-14 w-14 -rotate-90" viewBox="0 0 36 36" aria-hidden="true" focusable="false">
              <path
                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                fill="none"
                stroke="#e0f2fe"
                strokeWidth="4.5"
              />
              <path
                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                fill="none"
                stroke="#38bdf8"
                strokeDasharray="94, 100"
                strokeWidth="4.5"
                strokeLinecap="round"
              />
            </svg>
          </div>
        </div>

        <div className="space-y-0.5 text-[11px] font-medium text-slate-600">
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <span aria-hidden="true" className="h-2 w-2 rounded-full bg-emerald-500" />
              Độ khớp ETA:
            </span>
            <strong className="font-mono text-slate-800">94%</strong>
          </div>
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <span aria-hidden="true" className="h-2 w-2 rounded-full bg-amber-400" />
              Đúng hẹn:
            </span>
            <strong className="font-mono text-slate-800">88%</strong>
          </div>
        </div>
      </div>

      {/* Card 4: SỨC KHỎE DỊCH VỤ (Dual Bar Chart) */}
      <div className="flex flex-col justify-between rounded-[26px] border border-white/80 bg-white p-4 shadow-sm">
        <div>
          <p className="text-[10px] font-black uppercase tracking-wider text-slate-700">
            SỨC KHỎE DỊCH VỤ
          </p>
          <div className="mt-0.5 flex items-center gap-1 text-[11px] font-bold text-slate-700">
            <span>🌲 Liveness:</span>
            <span className="text-emerald-600 font-mono">{liveness} 100%</span>
          </div>
        </div>

        {/* Dual Bar Comparison Chart */}
        <div className="my-1 flex h-10 items-end justify-between gap-1 px-1" aria-hidden="true">
          <div className="flex items-end gap-0.5">
            <div className="h-5 w-1.5 rounded-xs bg-emerald-500" />
            <div className="h-4 w-1.5 rounded-xs bg-amber-400" />
          </div>
          <div className="flex items-end gap-0.5">
            <div className="h-7 w-1.5 rounded-xs bg-emerald-500" />
            <div className="h-5 w-1.5 rounded-xs bg-amber-400" />
          </div>
          <div className="flex items-end gap-0.5">
            <div className="h-6 w-1.5 rounded-xs bg-emerald-500" />
            <div className="h-6 w-1.5 rounded-xs bg-amber-400" />
          </div>
          <div className="flex items-end gap-0.5">
            <div className="h-8 w-1.5 rounded-xs bg-emerald-500" />
            <div className="h-5 w-1.5 rounded-xs bg-amber-400" />
          </div>
          <div className="flex items-end gap-0.5">
            <div className="h-9 w-1.5 rounded-xs bg-emerald-500" />
            <div className="h-6 w-1.5 rounded-xs bg-amber-400" />
          </div>
        </div>

        <div className="flex items-center justify-between text-[10px] font-medium text-slate-500">
          <span className="flex items-center gap-1">
            <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
            API / DB ({readiness})
          </span>
          <span className="flex items-center gap-1">
            <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-amber-400" />
            Socket
          </span>
        </div>
      </div>

      {/* Card 5: DOANH THU & ĐỐI SOÁT (Area Slope Chart) */}
      <div className="flex flex-col justify-between rounded-[26px] border border-white/80 bg-white p-4 shadow-sm">
        <div>
          <p className="text-[10px] font-black uppercase tracking-wider text-slate-700">
            DOANH THU (Pilot)
          </p>
          <div className="mt-0.5 flex items-center gap-2 text-[10px] font-medium text-slate-500">
            <span className="flex items-center gap-1">
              <span aria-hidden="true" className="h-0.5 w-2 bg-amber-400" />
              Thu
            </span>
            <span className="flex items-center gap-1">
              <span aria-hidden="true" className="h-0.5 w-2 bg-emerald-500" />
              Target
            </span>
          </div>
        </div>

        {/* Layered Area Slope Chart */}
        <div className="my-1 h-10 w-full">
          <svg className="h-full w-full" viewBox="0 0 100 40" fill="none" aria-hidden="true" focusable="false">
            <path d="M 0 35 L 30 25 L 60 18 L 85 10 L 100 5 L 100 40 L 0 40 Z" fill="#fef08a" opacity="0.6" />
            <path d="M 0 35 L 30 25 L 60 18 L 85 10 L 100 5" stroke="#eab308" strokeWidth="1.5" />
            <path d="M 0 38 L 30 32 L 60 25 L 85 20 L 100 15 L 100 40 L 0 40 Z" fill="#bbf7d0" opacity="0.8" />
            <path d="M 0 38 L 30 32 L 60 25 L 85 20 L 100 15" stroke="#22c55e" strokeWidth="1.5" />
          </svg>
        </div>

        <div className="flex justify-between font-mono text-[9px] text-slate-400">
          <span>Jan</span>
          <span>Feb</span>
          <span>May</span>
          <span>Jun</span>
          <span>Nov</span>
          <span>B2C</span>
        </div>
      </div>

      {/* Card 6: BÁO CÁO MỚI (Document Links) */}
      <div className="flex flex-col justify-between rounded-[26px] border border-white/80 bg-white p-4 shadow-sm">
        <div className="flex items-center justify-between">
          <p className="text-[10px] font-black uppercase tracking-wider text-slate-700">
            BÁO CÁO MỚI
          </p>
          <span aria-hidden="true" className="cursor-pointer text-xs font-bold text-slate-400">
            •••
          </span>
        </div>

        <div className="my-1 space-y-1.5 text-[11px]">
          <a
            href="/admin/orders"
            className="flex items-start gap-1.5 text-slate-600 hover:text-sky-600 focus-visible:outline-none focus-visible:underline"
          >
            <span aria-hidden="true">📄</span>
            <span className="line-clamp-1 leading-tight">Xem báo cáo ca trực Đà Nẵng ↗</span>
          </a>
          <a
            href="/admin/orders"
            className="flex items-start gap-1.5 text-slate-600 hover:text-sky-600 focus-visible:outline-none focus-visible:underline"
          >
            <span aria-hidden="true">📄</span>
            <span className="line-clamp-1 leading-tight">Xem đối soát VietQR pilot ↗</span>
          </a>
          <a
            href="/admin/drivers"
            className="flex items-start gap-1.5 text-slate-600 hover:text-sky-600 focus-visible:outline-none focus-visible:underline"
          >
            <span aria-hidden="true">📄</span>
            <span className="line-clamp-1 leading-tight">Xem thống kê tải trọng ↗</span>
          </a>
        </div>

        <div className="border-t border-slate-100 pt-1 text-[10px] text-slate-400">
          Xuất dữ liệu: <strong className="text-slate-700 font-semibold">PDF / CSV</strong>
        </div>
      </div>
    </div>
  );
}
