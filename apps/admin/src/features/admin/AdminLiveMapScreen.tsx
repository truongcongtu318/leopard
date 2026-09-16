'use client';

import { useId, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  Activity,
  AlertTriangle,
  Clock,
  ExternalLink,
  Eye,
  Filter,
  Layers,
  MapPin,
  Moon,
  Navigation,
  Package,
  Radio,
  RefreshCw,
  Search,
  ShieldCheck,
  Sun,
  Truck,
  User,
  Wifi,
  X,
} from 'lucide-react';

import { OperationsPageHeader } from '@leopard/ui';

import { BentoMapCard, type MapPackageMarker } from '../../components/bento/BentoMapCard';
import type {
  AdminLiveMapDriverView,
  AdminLiveMapOrderView,
  AdminLiveMapRouteView,
  AdminPreviewContext,
} from './model';
import {
  AdminBoundaryState,
  AdminBreadcrumbs,
  AdminNotice,
  AdminSurface,
} from './AdminShared';

export function AdminLiveMapScreen({
  view,
  previewContext,
  commandRuntime,
}: Readonly<{
  view: AdminLiveMapRouteView;
  previewContext?: AdminPreviewContext | undefined;
  commandRuntime?: boolean | undefined;
}>) {
  const searchInputId = useId();

  if (view.kind !== 'live-map') {
    return (
      <div className="flex flex-col gap-md">
        <OperationsPageHeader title="Bản Đồ Giám Sát Trực Tiếp" />
        <AdminBoundaryState view={view} />
      </div>
    );
  }

  const [drivers, setDrivers] = useState<readonly AdminLiveMapDriverView[]>(view.drivers);
  const [orders, setOrders] = useState<readonly AdminLiveMapOrderView[]>(view.orders);
  const [selectedDriverId, setSelectedDriverId] = useState<string | null>(
    view.drivers[0]?.driverId ?? null,
  );
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [vehicleFilter, setVehicleFilter] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [isDarkMode, setIsDarkMode] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const selectedDriver = useMemo(() => {
    return drivers.find((d) => d.driverId === selectedDriverId) ?? null;
  }, [drivers, selectedDriverId]);

  const selectedOrder = useMemo(() => {
    return orders.find((o) => o.orderId === selectedOrderId) ?? null;
  }, [orders, selectedOrderId]);

  // Filtered drivers
  const filteredDrivers = useMemo(() => {
    return drivers.filter((d) => {
      if (vehicleFilter !== 'ALL' && d.vehicleType !== vehicleFilter) return false;
      if (statusFilter !== 'ALL' && d.status !== statusFilter) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchName = d.driverName.toLowerCase().includes(q);
        const matchPlate = d.licensePlate.toLowerCase().includes(q);
        const matchPhone = d.phone.includes(q);
        if (!matchName && !matchPlate && !matchPhone) return false;
      }
      return true;
    });
  }, [drivers, vehicleFilter, statusFilter, searchQuery]);

  // Map markers
  const mapMarkers: MapPackageMarker[] = useMemo(() => {
    const list: MapPackageMarker[] = [];

    // Add driver markers
    for (const d of filteredDrivers) {
      list.push({
        id: `drv-${d.driverId}`,
        orderRef: d.driverName,
        customer: d.vehicleTypeLabel,
        routeLabel: `${d.statusLabel} · ${d.licensePlate}`,
        x: 50,
        y: 50,
        status: d.status,
        lat: d.lat,
        lng: d.lng,
      });
    }

    // Add active order markers
    for (const o of orders) {
      list.push({
        id: `ord-${o.orderId}`,
        orderRef: o.orderCode,
        customer: o.customerName,
        routeLabel: o.etaLabel,
        x: 50,
        y: 50,
        status: o.status,
        lat: o.currentLat ?? o.pickupLat,
        lng: o.currentLng ?? o.pickupLng,
      });
    }

    return list;
  }, [filteredDrivers, orders]);

  const handleRefresh = () => {
    setIsRefreshing(true);
    setTimeout(() => {
      setIsRefreshing(false);
    }, 600);
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Breadcrumbs & Header */}
      <div>
        <AdminBreadcrumbs previewContext={previewContext} screen="live-map" />
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mt-2">
          <div>
            <OperationsPageHeader
              title="Bản Đồ Giám Sát Trực Tiếp"
              context="Theo dõi không gian viễn trắc thời gian thực của các phương tiện và lộ trình đơn hàng"
            />
          </div>

          <div className="flex items-center gap-2.5">
            {view.isSimulationMode ? (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-900 border border-amber-300">
                <AlertTriangle className="h-3.5 w-3.5 text-amber-700" />
                Dữ liệu mô phỏng
              </span>
            ) : null}

            <button
              type="button"
              onClick={() => setIsDarkMode(!isDarkMode)}
              className="inline-flex items-center gap-1.5 rounded-2xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 transition-colors"
            >
              {isDarkMode ? <Sun className="h-4 w-4 text-amber-500" /> : <Moon className="h-4 w-4 text-indigo-600" />}
              {isDarkMode ? 'Bản đồ sáng' : 'Bản đồ tối'}
            </button>

            <button
              type="button"
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="inline-flex items-center gap-1.5 rounded-2xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-50 transition-colors"
            >
              <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin text-brand' : ''}`} />
              Làm mới
            </button>
          </div>
        </div>
      </div>

      {view.notice ? <AdminNotice notice={view.notice} /> : null}

      {/* 4 Bento KPI Metric Strip */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="rounded-3xl border border-black/[0.06] bg-white p-5 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Tài Xế Trực Tuyến</span>
            <Wifi className="h-4 w-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-black text-slate-900">{view.metrics.totalOnlineDrivers}</div>
          <div className="text-xs text-slate-500 mt-1">Sẵn sàng nhận cuốc xe</div>
        </div>

        <div className="rounded-3xl border border-black/[0.06] bg-white p-5 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Đang Giao Hàng</span>
            <Truck className="h-4 w-4 text-amber-600" />
          </div>
          <div className="text-2xl font-black text-slate-900">{view.metrics.totalBusyDrivers}</div>
          <div className="text-xs text-slate-500 mt-1">Phương tiện đang chở hàng</div>
        </div>

        <div className="rounded-3xl border border-black/[0.06] bg-white p-5 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Đơn Đang Vận Chuyển</span>
            <Package className="h-4 w-4 text-indigo-600" />
          </div>
          <div className="text-2xl font-black text-slate-900">{view.metrics.totalActiveOrders}</div>
          <div className="text-xs text-slate-500 mt-1">Đang di chuyển trên đường</div>
        </div>

        <div className="rounded-3xl border border-black/[0.06] bg-white p-5 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">ETA Dự Kiến Trung Bình</span>
            <Clock className="h-4 w-4 text-brand" />
          </div>
          <div className="text-2xl font-black text-slate-900">~{view.metrics.avgEtaMinutes} phút</div>
          <div className="text-xs text-slate-500 mt-1">Dự kiến hoàn thành chặng</div>
        </div>
      </div>

      {/* Main Realtime Spatial Console: 2-Column Bento */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Interactive Map (8 cols) */}
        <div className="lg:col-span-8 space-y-4">
          <div className="rounded-3xl border border-black/[0.06] bg-white p-4 sm:p-5 shadow-sm space-y-4">
            {/* Filter Bar above Map */}
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs font-bold text-slate-600">Lọc xe:</span>
                {['ALL', 'MOTORBIKE', 'VAN', 'TRUCK'].map((v) => (
                  <button
                    key={v}
                    type="button"
                    onClick={() => setVehicleFilter(v)}
                    className={`px-3 py-1 rounded-full text-xs font-semibold border transition-all ${
                      vehicleFilter === v
                        ? 'bg-slate-900 text-white border-slate-900 shadow-xs'
                        : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    {v === 'ALL' ? 'Tất cả' : v}
                  </button>
                ))}
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs font-bold text-slate-600">Trạng thái:</span>
                {['ALL', 'ONLINE', 'BUSY', 'OFFLINE'].map((st) => (
                  <button
                    key={st}
                    type="button"
                    onClick={() => setStatusFilter(st)}
                    className={`px-3 py-1 rounded-full text-xs font-semibold border transition-all ${
                      statusFilter === st
                        ? 'bg-slate-900 text-white border-slate-900 shadow-xs'
                        : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    {st === 'ALL'
                      ? 'Tất cả'
                      : st === 'ONLINE'
                        ? 'Rảnh'
                        : st === 'BUSY'
                          ? 'Đang giao'
                          : 'Ngoại tuyến'}
                  </button>
                ))}
              </div>
            </div>

            {/* Bento Map Container */}
            <div className="h-[520px] w-full rounded-2xl overflow-hidden border border-slate-200">
              <BentoMapCard
                title="Bản đồ định vị phương tiện & đơn hàng"
                activeOrderCode={
                  selectedDriver
                    ? `Tài xế: ${selectedDriver.driverName} · ${selectedDriver.licensePlate}`
                    : 'Theo dõi thời gian thực'
                }
                markers={mapMarkers}
                selectedOrderId={selectedDriver?.driverName}
                onSelectOrder={(ref) => {
                  const matched = drivers.find((d) => d.driverName === ref);
                  if (matched) setSelectedDriverId(matched.driverId);
                }}
              />
            </div>
          </div>
        </div>

        {/* Right Column: Driver Telemetry & Active Orders (4 cols) */}
        <div className="lg:col-span-4 space-y-6">
          {/* Selected Driver Telemetry Card */}
          {selectedDriver ? (
            <AdminSurface
              title="Thông Tin Viễn Trắc"
              description="Dữ liệu cảm biến và trạng thái di chuyển"
              icon={<Activity className="h-5 w-5 text-brand" />}
            >
              <div className="space-y-4">
                <div className="flex items-start justify-between gap-3 pb-3 border-b border-slate-100">
                  <div>
                    <h4 className="text-sm font-bold text-slate-900">{selectedDriver.driverName}</h4>
                    <p className="text-xs text-slate-500 font-mono mt-0.5">
                      {selectedDriver.maskedPhone} · {selectedDriver.licensePlate}
                    </p>
                  </div>
                  <span
                    className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold border ${
                      selectedDriver.status === 'ONLINE'
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                        : selectedDriver.status === 'BUSY'
                          ? 'bg-amber-50 text-amber-700 border-amber-200'
                          : 'bg-slate-100 text-slate-600 border-slate-200'
                    }`}
                  >
                    {selectedDriver.statusLabel}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="rounded-xl bg-slate-50 p-2.5 border border-slate-100">
                    <span className="text-slate-400 block text-[11px]">Tốc độ hiện tại</span>
                    <strong className="text-slate-900 font-black text-sm">
                      {selectedDriver.speedKmh} km/h
                    </strong>
                  </div>
                  <div className="rounded-xl bg-slate-50 p-2.5 border border-slate-100">
                    <span className="text-slate-400 block text-[11px]">Loại phương tiện</span>
                    <strong className="text-slate-900 font-bold text-sm">
                      {selectedDriver.vehicleTypeLabel}
                    </strong>
                  </div>
                  <div className="rounded-xl bg-slate-50 p-2.5 border border-slate-100 col-span-2">
                    <span className="text-slate-400 block text-[11px]">Tọa độ viễn trắc</span>
                    <strong className="text-slate-900 font-mono text-xs">
                      {selectedDriver.lat.toFixed(4)}, {selectedDriver.lng.toFixed(4)}
                    </strong>
                  </div>
                </div>

                {selectedDriver.activeOrderCode ? (
                  <div className="rounded-2xl border border-indigo-200 bg-indigo-50/70 p-3.5 text-xs text-indigo-950 space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="font-bold flex items-center gap-1.5">
                        <Package className="h-4 w-4 text-indigo-700" />
                        Đơn đang xử lý: {selectedDriver.activeOrderCode}
                      </span>
                      <Link
                        href={`/admin/orders/${selectedDriver.activeOrderId}`}
                        className="text-indigo-700 hover:text-indigo-900 font-bold inline-flex items-center gap-0.5"
                      >
                        Chi tiết <ExternalLink className="h-3 w-3" />
                      </Link>
                    </div>
                    {selectedDriver.etaMinutesLabel ? (
                      <div className="text-xs font-semibold text-indigo-800">
                        {selectedDriver.etaMinutesLabel}
                      </div>
                    ) : null}
                  </div>
                ) : null}

                <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1">
                  <span>Tín hiệu máy chủ:</span>
                  <span>{selectedDriver.lastPingLabel}</span>
                </div>
              </div>
            </AdminSurface>
          ) : null}

          {/* Drivers List Panel */}
          <AdminSurface
            title="Danh Sách Tài Xế"
            description={`Hiển thị ${filteredDrivers.length} tài xế theo bộ lọc`}
            icon={<User className="h-5 w-5 text-slate-700" />}
          >
            <div className="mb-3">
              <div className="relative">
                <Search className="h-3.5 w-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  id={searchInputId}
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Tìm tên, biển số, SĐT..."
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 pl-8 pr-3 py-1.5 text-xs text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-slate-900"
                />
              </div>
            </div>

            <div className="space-y-2 max-h-[320px] overflow-y-auto pr-1">
              {filteredDrivers.map((d) => {
                const isSelected = d.driverId === selectedDriverId;
                return (
                  <button
                    key={d.driverId}
                    type="button"
                    onClick={() => {
                      setSelectedDriverId(d.driverId);
                      setSelectedOrderId(d.activeOrderId ?? null);
                    }}
                    className={`w-full text-left p-3 rounded-2xl border transition-all flex items-center justify-between gap-2 ${
                      isSelected
                        ? 'border-slate-900 bg-slate-900 text-white shadow-xs'
                        : 'border-slate-200/80 bg-white hover:bg-slate-50 text-slate-800'
                    }`}
                  >
                    <div>
                      <div className="text-xs font-bold">{d.driverName}</div>
                      <div
                        className={`text-[11px] mt-0.5 ${
                          isSelected ? 'text-slate-300' : 'text-slate-500'
                        }`}
                      >
                        {d.vehicleTypeLabel} · {d.licensePlate}
                      </div>
                    </div>

                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                        d.status === 'ONLINE'
                          ? isSelected
                            ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                            : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                          : d.status === 'BUSY'
                            ? isSelected
                              ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                              : 'bg-amber-50 text-amber-700 border-amber-200'
                            : isSelected
                              ? 'bg-slate-800 text-slate-400 border-slate-700'
                              : 'bg-slate-100 text-slate-500 border-slate-200'
                      }`}
                    >
                      {d.statusLabel}
                    </span>
                  </button>
                );
              })}
            </div>
          </AdminSurface>
        </div>
      </div>
    </div>
  );
}
