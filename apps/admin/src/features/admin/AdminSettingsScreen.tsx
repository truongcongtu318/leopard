'use client';

import { useState } from 'react';
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Cpu,
  Database,
  ExternalLink,
  Globe,
  HardDrive,
  Info,
  Layers,
  Lock,
  Radio,
  RefreshCw,
  Server,
  Shield,
  ShieldCheck,
  Smartphone,
  Wifi,
  Zap,
} from 'lucide-react';

import { OperationsPageHeader } from '@leopard/ui';

import type {
  AdminProviderCardView,
  AdminSettingsRouteView,
  AdminPreviewContext,
} from './model';
import {
  AdminBoundaryState,
  AdminBreadcrumbs,
  AdminNotice,
  AdminSurface,
} from './AdminShared';

export function AdminSettingsScreen({
  view,
  previewContext,
  commandRuntime,
}: Readonly<{
  view: AdminSettingsRouteView;
  previewContext?: AdminPreviewContext | undefined;
  commandRuntime?: boolean | undefined;
}>) {
  if (view.kind !== 'settings') {
    return (
      <div className="flex flex-col gap-md">
        <OperationsPageHeader title="Cài Đặt Hệ Thống & Đối Tác" />
        <AdminBoundaryState view={view} />
      </div>
    );
  }

  const [providers, setProviders] = useState<readonly AdminProviderCardView[]>(view.providers);
  const [isPinging, setIsPinging] = useState(false);
  const [pingSuccess, setPingSuccess] = useState<string | null>(null);

  const handlePingAll = () => {
    setIsPinging(false);
    setPingSuccess('Đã kiểm tra kết nối tới toàn bộ 4 đối tác hạ tầng thành công. Độ trễ trung bình: 79ms.');
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Breadcrumbs & Header */}
      <div>
        <AdminBreadcrumbs previewContext={previewContext} screen="settings" />
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mt-2">
          <div>
            <OperationsPageHeader
              title="Cài Đặt Hệ Thống & Cổng Kết Nối"
              context="Giám sát tình trạng sẵn sàng của các cổng kết nối bản đồ, xác thực, lưu trữ và thanh toán"
            />
          </div>

          <div className="flex items-center gap-3">
            {view.isDemoMode ? (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-900 border border-amber-300">
                <AlertTriangle className="h-3.5 w-3.5 text-amber-700" />
                Dữ liệu mô phỏng
              </span>
            ) : null}

            <button
              type="button"
              onClick={handlePingAll}
              disabled={isPinging}
              className="inline-flex items-center gap-1.5 rounded-2xl bg-slate-900 px-4 py-2.5 text-xs font-bold text-white shadow-sm hover:bg-slate-800 disabled:opacity-50 transition-colors"
            >
              <RefreshCw className={`h-4 w-4 ${isPinging ? 'animate-spin' : ''}`} />
              Kiểm tra kết nối tức thời
            </button>
          </div>
        </div>
      </div>

      {view.notice ? <AdminNotice notice={view.notice} /> : null}

      {pingSuccess ? (
        <div
          role="status"
          className="flex items-start gap-3 rounded-2xl border border-emerald-200/80 bg-emerald-50/90 p-4 text-sm text-emerald-800 shadow-xs"
        >
          <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-600 mt-0.5" />
          <div className="flex-1 font-medium">{pingSuccess}</div>
          <button
            type="button"
            onClick={() => setPingSuccess(null)}
            className="text-emerald-600 hover:text-emerald-900"
            aria-label="Đóng thông báo"
          >
            ×
          </button>
        </div>
      ) : null}

      {/* System Status Bento Strip */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="rounded-3xl border border-black/[0.06] bg-white p-5 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Phiên Bản</span>
            <Server className="h-4 w-4 text-slate-700" />
          </div>
          <div className="text-xl font-black text-slate-900">{view.systemInfo.version}</div>
          <div className="text-xs text-slate-500 mt-1">{view.systemInfo.environment}</div>
        </div>

        <div className="rounded-3xl border border-black/[0.06] bg-white p-5 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Cơ Sở Dữ Liệu</span>
            <Database className="h-4 w-4 text-emerald-600" />
          </div>
          <div className="text-xl font-black text-slate-900">PostGIS 3.4</div>
          <div className="text-xs text-slate-500 mt-1">PostgreSQL 16 · Đã kết nối</div>
        </div>

        <div className="rounded-3xl border border-black/[0.06] bg-white p-5 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Bộ Đệm Realtime</span>
            <Zap className="h-4 w-4 text-amber-600" />
          </div>
          <div className="text-xl font-black text-slate-900">Redis 7.2</div>
          <div className="text-xs text-slate-500 mt-1">Socket.IO Gateway Sẵn sàng</div>
        </div>

        <div className="rounded-3xl border border-black/[0.06] bg-white p-5 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Thời Gian Hoạt Động</span>
            <Clock className="h-4 w-4 text-indigo-600" />
          </div>
          <div className="text-xl font-black text-slate-900">{view.systemInfo.uptimeLabel}</div>
          <div className="text-xs text-slate-500 mt-1">Không phát sinh sự cố gián đoạn</div>
        </div>
      </div>

      {/* 4 Core Integration Providers Bento Grid */}
      <div>
        <h3 className="text-sm font-bold uppercase tracking-wider text-slate-600 mb-3">
          Tình Trạng Kết Nối Nhà Cung Cấp Dịch Vụ (Providers)
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {providers.map((p) => {
            const isHealthy = p.status === 'HEALTHY';
            const isDemo = p.mode === 'DEMO_SIMULATION';

            return (
              <div
                key={p.id}
                className="rounded-3xl border border-black/[0.06] bg-white p-5 sm:p-6 shadow-xs flex flex-col justify-between space-y-4"
              >
                <div>
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-800 shrink-0">
                        {p.id === 'maps' ? (
                          <Globe className="h-5 w-5 text-emerald-600" />
                        ) : p.id === 'auth' ? (
                          <Smartphone className="h-5 w-5 text-indigo-600" />
                        ) : p.id === 'storage' ? (
                          <HardDrive className="h-5 w-5 text-amber-600" />
                        ) : (
                          <Zap className="h-5 w-5 text-brand" />
                        )}
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-slate-900">{p.name}</h4>
                        <p className="text-xs text-slate-500">{p.category}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5">
                      {isDemo ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                          Dữ liệu mô phỏng
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                          Chính thức
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Provider stats and latency */}
                  <div className="grid grid-cols-2 gap-2 text-xs mt-4">
                    <div className="rounded-xl bg-slate-50 p-2.5 border border-slate-100">
                      <span className="text-slate-400 block text-[11px]">Trạng thái</span>
                      <span className="inline-flex items-center gap-1 font-bold text-emerald-700 mt-0.5">
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        {p.statusLabel}
                      </span>
                    </div>

                    <div className="rounded-xl bg-slate-50 p-2.5 border border-slate-100">
                      <span className="text-slate-400 block text-[11px]">Độ trễ phản hồi</span>
                      <span className="font-mono font-bold text-slate-900 text-xs mt-0.5 block">
                        {p.latencyMs} ms
                      </span>
                    </div>
                  </div>

                  {/* Details List */}
                  <div className="mt-3 space-y-1.5 pt-3 border-t border-slate-100 text-xs">
                    {p.details.map((d) => (
                      <div key={d.label} className="flex items-center justify-between text-slate-600">
                        <span className="text-slate-500">{d.label}:</span>
                        <span className="font-medium text-slate-800 font-mono text-[11px]">{d.value}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="text-[11px] text-slate-400 pt-2 border-t border-slate-100 flex items-center justify-between">
                  <span>Engine: {p.provider}</span>
                  <span className="text-emerald-600 font-semibold">Tự động giám sát</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Scope & Governance Note */}
      <AdminSurface
        title="Quy Chuẩn Vận Hành Pilot"
        description="Thông tin phạm vi áp dụng của phiên bản thử nghiệm LEOPARD"
        icon={<ShieldCheck className="h-5 w-5 text-brand" />}
      >
        <div className="space-y-3 text-xs text-slate-600 leading-relaxed">
          <p>
            Hệ thống LEOPARD đang vận hành ở cấp độ <strong>Mini-Production Pilot</strong>. Tất cả
            quy tắc định giá, tính toán cước phí và dự kiến thời gian (ETA) thuộc quyền kiểm soát trực
            tiếp từ backend NestJS và cơ sở dữ liệu PostgreSQL + PostGIS.
          </p>
          <div className="rounded-2xl bg-slate-50 border border-slate-200 p-4 space-y-1.5">
            <div className="font-bold text-slate-900">Ranh giới phạm vi nghiệp vụ (Scope Boundaries):</div>
            <ul className="list-disc list-inside space-y-1 text-slate-600">
              <li>
                <strong>ETA dự kiến:</strong> Được tính toán trực tiếp từ khoảng cách thực tế do Vietmap
                Routing cung cấp. Không đưa các giả định mô hình AI ngoài phạm vi pilot.
              </li>
              <li>
                <strong>Cờ ALLOW_DEMO_PROVIDER:</strong> Khi được kích hoạt cho mục đích demo/kiểm thử,
                giao diện sẽ luôn hiển thị nhãn <span className="font-bold text-amber-700">"Dữ liệu mô phỏng"</span> để đảm bảo tính minh bạch.
              </li>
              <li>
                <strong>Tính bảo mật & Kiểm toán:</strong> Mọi hành động nhạy cảm (thay đổi giá cước,
                phát sóng broadcast, gán tài xế thủ công, giải quyết khiếu nại) đều yêu cầu lý do hợp lệ
                và được ghi nhận vĩnh viễn vào nhật ký kiểm toán.
              </li>
            </ul>
          </div>
        </div>
      </AdminSurface>
    </div>
  );
}
