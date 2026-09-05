'use client';

import React from 'react';

export type QuickDispatchFeedProps = Readonly<{
  previewContext?: unknown;
}>;

export function QuickDispatchFeed({ previewContext: _previewContext }: QuickDispatchFeedProps = {}) {
  return (
    <div className="flex flex-col gap-3">
      {/* Card 1: YÊU CẦU ĐƠN MỚI */}
      <div className="flex flex-col justify-between rounded-2xl border border-white/80 bg-white/95 p-4 shadow-xs backdrop-blur-sm">
        <div className="mb-2 flex items-center justify-between">
          <h3 className="text-xs font-black tracking-wider text-slate-800 uppercase">
            YÊU CẦU ĐƠN MỚI
          </h3>
          <span aria-hidden="true" className="text-slate-400">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="1" />
              <circle cx="19" cy="12" r="1" />
              <circle cx="5" cy="12" r="1" />
            </svg>
          </span>
        </div>

        {/* Inner Card Box */}
        <div className="flex flex-col gap-2 rounded-xl border border-sky-100 bg-sky-50/40 p-3.5">
          <div className="flex items-center gap-2 text-xs font-bold text-slate-800">
            <svg className="w-3.5 h-3.5 text-sky-600 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
              <rect x="4" y="2" width="16" height="20" rx="2" ry="2" />
              <path d="M9 22v-4h6v4" />
              <path d="M8 6h.01M16 6h.01M12 6h.01M12 10h.01M12 14h.01M16 10h.01M16 14h.01M8 10h.01M8 14h.01" />
            </svg>
            <span>SME ABC</span>
          </div>
          <div className="flex items-center gap-2 text-xs text-slate-600">
            <svg className="w-3.5 h-3.5 text-slate-400 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
              <path d="M12 3v18M6 8l6-5 6 5M6 8a4 4 0 0 0-4 4 4 4 0 0 0 8 0 4 4 0 0 0-4-4zm12 0a4 4 0 0 0-4 4 4 4 0 0 0 8 0 4 4 0 0 0-4-4z" />
            </svg>
            <span>5-10 tấn</span>
          </div>
          <div className="flex items-center gap-2 text-xs text-slate-600">
            <svg className="w-3.5 h-3.5 text-slate-400 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
              <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
              <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
              <line x1="12" y1="22.08" x2="12" y2="12" />
            </svg>
            <span>Vật liệu XD</span>
          </div>
          <div className="flex items-center gap-2 text-xs text-slate-600">
            <svg className="w-3.5 h-3.5 text-slate-400 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
              <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
              <circle cx="12" cy="10" r="3" />
            </svg>
            <span>Tới KCN Liên Chiểu</span>
          </div>

          <div className="mt-1 flex items-center justify-between border-t border-sky-200/50 pt-2">
            <span className="font-mono text-xs font-bold text-slate-800">1.850.000 đ</span>
            <a
              href="/admin/orders"
              className="rounded-lg bg-sky-600 px-3.5 py-1 text-xs font-bold text-white shadow-xs hover:bg-sky-700 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 cursor-pointer"
            >
              Điều phối ngay
            </a>
          </div>
        </div>
      </div>

      {/* Card 2: TÀI XẾ GẦN ĐÂY */}
      <div className="flex flex-1 flex-col justify-between rounded-2xl border border-white/80 bg-white/95 p-4 shadow-xs backdrop-blur-sm">
        <div className="mb-1 flex items-center justify-between">
          <h3 className="text-xs font-black tracking-wider text-slate-800 uppercase">
            TÀI XẾ GẦN ĐÂY
          </h3>
          <span aria-hidden="true" className="text-slate-400">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="1" />
              <circle cx="19" cy="12" r="1" />
              <circle cx="5" cy="12" r="1" />
            </svg>
          </span>
        </div>

        <div className="flex flex-col divide-y divide-slate-100">
          {/* Driver 1 */}
          <a
            href="/admin/drivers"
            className="flex items-center justify-between rounded-xl px-1.5 py-2.5 transition-colors hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 cursor-pointer"
          >
            <div className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-sky-100 text-xs font-bold text-sky-700">
                SN
              </div>
              <div className="text-left">
                <p className="text-xs font-bold text-slate-800">Sáu sign ups</p>
                <p className="text-[11px] text-slate-400">Rating: 5-10 tấn</p>
              </div>
            </div>
            <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
            </svg>
          </a>

          {/* Driver 2 */}
          <a
            href="/admin/drivers"
            className="flex items-center justify-between rounded-xl px-1.5 py-2.5 transition-colors hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 cursor-pointer"
          >
            <div className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-100 text-xs font-bold text-emerald-700">
                TX
              </div>
              <div className="text-left">
                <p className="text-xs font-bold text-slate-800">Tấn xế nặng</p>
                <div className="flex items-center gap-1">
                  <span className="text-[11px] text-slate-400">Rating:</span>
                  <span className="text-xs text-amber-500">★★★★☆</span>
                </div>
              </div>
            </div>
            <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
            </svg>
          </a>

          {/* Driver 3 */}
          <a
            href="/admin/drivers"
            className="flex items-center justify-between rounded-xl px-1.5 py-2.5 transition-colors hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 cursor-pointer"
          >
            <div className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-amber-100 text-xs font-bold text-amber-700">
                TT
              </div>
              <div className="text-left">
                <p className="text-xs font-bold text-slate-800">Thuyền trưởng</p>
                <div className="flex items-center gap-1">
                  <span className="text-[11px] text-slate-400">Rating:</span>
                  <span className="text-xs text-amber-500">★★★★★</span>
                </div>
              </div>
            </div>
            <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
            </svg>
          </a>
        </div>
      </div>
    </div>
  );
}
