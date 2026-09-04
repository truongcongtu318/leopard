'use client';

import React from 'react';

export type QuickDispatchFeedProps = Readonly<{
  previewContext?: unknown;
}>;

export function QuickDispatchFeed({ previewContext: _previewContext }: QuickDispatchFeedProps = {}) {
  return (
    <div className="flex flex-col gap-3">
      {/* Card 1: YÊU CẦU ĐƠN MỚI */}
      <div className="flex flex-col justify-between rounded-[26px] border border-white/80 bg-white p-4 shadow-sm">
        <div className="mb-2 flex items-center justify-between">
          <h3 className="text-xs font-black tracking-wider text-slate-800 uppercase">
            YÊU CẦU ĐƠN MỚI
          </h3>
          <span aria-hidden="true" className="cursor-pointer font-bold text-slate-400">
            •••
          </span>
        </div>

        {/* Inner Card Box */}
        <div className="flex flex-col gap-2 rounded-[18px] border border-slate-100 bg-[#F4F7FB] p-3.5">
          <div className="flex items-center gap-2 text-xs font-bold text-slate-800">
            <span aria-hidden="true" className="text-slate-500">🏢</span>
            <span>SME ABC</span>
          </div>
          <div className="flex items-center gap-2 text-xs text-slate-600">
            <span aria-hidden="true" className="text-slate-500">⚖️</span>
            <span>5-10 tấn</span>
          </div>
          <div className="flex items-center gap-2 text-xs text-slate-600">
            <span aria-hidden="true" className="text-slate-500">⚙️</span>
            <span>Vật liệu XD</span>
          </div>
          <div className="flex items-center gap-2 text-xs text-slate-600">
            <span aria-hidden="true" className="text-slate-500">📍</span>
            <span>Tới KCN Liên Chiểu</span>
          </div>

          <div className="mt-1 flex items-center justify-between border-t border-slate-200/60 pt-2">
            <span className="font-mono text-xs font-bold text-slate-800">1.850.000 đ</span>
            <a
              href="/admin/orders"
              className="rounded-lg bg-sky-600 px-3 py-1 text-xs font-bold text-white shadow-2xs hover:bg-sky-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500"
            >
              Điều phối ngay
            </a>
          </div>
        </div>
      </div>

      {/* Card 2: TÀI XẾ GẦN ĐÂY */}
      <div className="flex flex-1 flex-col justify-between rounded-[26px] border border-white/80 bg-white p-4 shadow-sm">
        <div className="mb-1 flex items-center justify-between">
          <h3 className="text-xs font-black tracking-wider text-slate-800 uppercase">
            TÀI XẾ GẦN ĐÂY
          </h3>
          <span aria-hidden="true" className="cursor-pointer font-bold text-slate-400">
            •••
          </span>
        </div>

        <div className="flex flex-col divide-y divide-slate-100">
          {/* Driver 1 */}
          <a
            href="/admin/drivers"
            className="flex items-center justify-between rounded-lg px-1 py-2.5 transition-colors hover:bg-slate-50/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500"
          >
            <div className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-sky-100 text-sm font-bold text-sky-600">
                👤
              </div>
              <div className="text-left">
                <p className="text-xs font-bold text-slate-800">Sáu sign ups</p>
                <p className="text-[11px] text-slate-400">Rating: 5-10 tấn</p>
              </div>
            </div>
            <span aria-hidden="true" className="text-xs font-bold text-slate-400">
              ›
            </span>
          </a>

          {/* Driver 2 */}
          <a
            href="/admin/drivers"
            className="flex items-center justify-between rounded-lg px-1 py-2.5 transition-colors hover:bg-slate-50/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500"
          >
            <div className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-100 text-sm font-bold text-emerald-600">
                👤
              </div>
              <div className="text-left">
                <p className="text-xs font-bold text-slate-800">Tấn xế nặng</p>
                <div className="flex items-center gap-1">
                  <span className="text-[11px] text-slate-400">Rating:</span>
                  <span className="text-xs text-amber-400">★★★★☆</span>
                </div>
              </div>
            </div>
            <span aria-hidden="true" className="text-xs font-bold text-slate-400">
              ›
            </span>
          </a>

          {/* Driver 3 */}
          <a
            href="/admin/drivers"
            className="flex items-center justify-between rounded-lg px-1 py-2.5 transition-colors hover:bg-slate-50/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500"
          >
            <div className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-amber-100 text-sm font-bold text-amber-600">
                👤
              </div>
              <div className="text-left">
                <p className="text-xs font-bold text-slate-800">Thuyền trưởng</p>
                <div className="flex items-center gap-1">
                  <span className="text-[11px] text-slate-400">Rating:</span>
                  <span className="text-xs text-amber-400">★★★★★</span>
                </div>
              </div>
            </div>
            <span aria-hidden="true" className="text-xs font-bold text-slate-400">
              ›
            </span>
          </a>
        </div>
      </div>
    </div>
  );
}
