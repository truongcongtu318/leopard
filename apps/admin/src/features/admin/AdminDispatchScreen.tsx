'use client';

import { useCallback, useEffect, useId, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  AlertCircle,
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  Clock,
  ExternalLink,
  Filter,
  MapPin,
  Navigation,
  Radio,
  Search,
  Send,
  ShieldCheck,
  Truck,
  User,
  UserCheck,
  X,
} from 'lucide-react';

import { OperationsPageHeader } from '@leopard/ui';

import { BentoMapCard, type MapPackageMarker } from '../../components/bento/BentoMapCard';
import { browserClient } from '../../lib/api/browser-client';
import { ApiError } from '../../lib/api/api-error';
import { createAdminPreviewHref } from './adapter';
import type {
  AdminDispatchCandidateDriverView,
  AdminDispatchOrderItemView,
  AdminDispatchRouteView,
  AdminPreviewContext,
} from './model';
import {
  AdminBoundaryState,
  AdminBreadcrumbs,
  AdminNotice,
  AdminSurface,
} from './AdminShared';

export function AdminDispatchScreen({
  view,
  previewContext,
  commandRuntime,
}: Readonly<{
  view: AdminDispatchRouteView;
  previewContext?: AdminPreviewContext | undefined;
  commandRuntime?: boolean | undefined;
}>) {
  const searchInputId = useId();
  const vehicleFilterId = useId();

  if (view.kind !== 'dispatch') {
    return (
      <div className="flex flex-col gap-md">
        <OperationsPageHeader title="Trung Tâm Điều Phối NexaFleet" />
        <AdminBoundaryState view={view} />
      </div>
    );
  }

  const [orders, setOrders] = useState<readonly AdminDispatchOrderItemView[]>(view.orders);
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(
    view.selectedOrderId ?? view.orders[0]?.orderId ?? null,
  );
  const [selectedVehicleType, setSelectedVehicleType] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // Reassignment Modal State
  const [assigningOrder, setAssigningOrder] = useState<AdminDispatchOrderItemView | null>(null);
  const [assigningDriver, setAssigningDriver] = useState<AdminDispatchCandidateDriverView | null>(null);
  const [reassignReason, setReassignReason] = useState('');
  const [isSubmittingReassign, setIsSubmittingReassign] = useState(false);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  // Filtered orders list
  const filteredOrders = useMemo(() => {
    return orders.filter((order) => {
      if (selectedVehicleType !== 'ALL' && order.vehicleType !== selectedVehicleType) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchCode = order.orderCode.toLowerCase().includes(q);
        const matchPickup = order.pickupAddress.toLowerCase().includes(q);
        const matchDropoff = order.dropoffAddress.toLowerCase().includes(q);
        const matchCustomer = order.customerName?.toLowerCase().includes(q) ?? false;
        if (!matchCode && !matchPickup && !matchDropoff && !matchCustomer) return false;
      }
      return true;
    });
  }, [orders, selectedVehicleType, searchQuery]);

  // Active selected order
  const activeOrder = useMemo(() => {
    return orders.find((o) => o.orderId === selectedOrderId) ?? orders[0] ?? null;
  }, [orders, selectedOrderId]);

  // Map markers & route
  const mapMarkers: MapPackageMarker[] = useMemo(() => {
    const markers: MapPackageMarker[] = [];
    orders.forEach((order, idx) => {
      if (order.pickupLat && order.pickupLng) {
        markers.push({
          id: `pickup-${order.orderId}`,
          orderRef: order.orderCode,
          customer: order.customerName ?? 'Khách hàng',
          routeLabel: `${order.pickupAddress} -> ${order.dropoffAddress}`,
          status: order.waitingMinutes > 30 ? 'PRIORITY' : 'REQUESTED',
          x: 20 + (idx * 25) % 60,
          y: 20 + (idx * 30) % 60,
          lat: order.pickupLat,
          lng: order.pickupLng,
        });
      }
    });

    // Also plot available candidate drivers as markers if available
    if (activeOrder) {
      activeOrder.candidateDrivers.forEach((driver, idx) => {
        if (driver.lat && driver.lng) {
          markers.push({
            id: `driver-${driver.driverId}`,
            orderRef: driver.driverName,
            customer: driver.vehicleTypeLabel,
            routeLabel: driver.etaLabel,
            status: 'AVAILABLE',
            x: 40 + idx * 10,
            y: 40 + idx * 10,
            lat: driver.lat,
            lng: driver.lng,
          });
        }
      });
    }

    return markers;
  }, [orders, activeOrder]);

  const activeRoutePath: Array<[number, number]> | undefined = useMemo(() => {
    if (
      activeOrder &&
      activeOrder.pickupLat &&
      activeOrder.pickupLng &&
      activeOrder.dropoffLat &&
      activeOrder.dropoffLng
    ) {
      return [
        [activeOrder.pickupLat, activeOrder.pickupLng],
        [activeOrder.dropoffLat, activeOrder.dropoffLng],
      ];
    }
    return undefined;
  }, [activeOrder]);

  // Handle reassign submit
  const handleConfirmReassign = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!assigningOrder || !assigningDriver) return;
    if (reassignReason.trim().length < 5) {
      setActionError('Lý do điều phối thủ công phải từ 5 ký tự trở lên.');
      return;
    }

    setIsSubmittingReassign(true);
    setActionError(null);
    setActionSuccess(null);

    try {
      if (commandRuntime) {
        await browserClient.post(`/admin/dispatch/orders/${assigningOrder.orderId}/reassign`, {
          driverId: assigningDriver.driverId,
          reason: reassignReason.trim(),
        });
      }

      setActionSuccess(
        `Đã điều phối thành công đơn ${assigningOrder.orderCode} cho tài xế ${assigningDriver.driverName}.`,
      );

      // Remove reassigned order from waiting queue
      setOrders((prev) => prev.filter((o) => o.orderId !== assigningOrder.orderId));
      setAssigningOrder(null);
      setAssigningDriver(null);
      setReassignReason('');
    } catch (err) {
      setActionError(
        err instanceof ApiError ? err.message : 'Điều phối tài xế thất bại. Vui lòng thử lại.',
      );
    } finally {
      setIsSubmittingReassign(false);
    }
  };

  return (
    <div className="flex min-w-0 flex-col gap-6">
      <AdminBreadcrumbs previewContext={previewContext} screen="dispatch" />

      <OperationsPageHeader
        title="Trung Tâm Điều Phối NexaFleet"
        updatedAt={view.checkedAtLabel}
      />

      {view.notice ? <AdminNotice notice={view.notice} /> : null}

      {actionSuccess ? (
        <div
          role="status"
          className="rounded-2xl border border-emerald-200 bg-emerald-50/90 p-4 text-xs font-semibold text-emerald-800 flex items-center justify-between shadow-xs"
        >
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{actionSuccess}</span>
          </div>
          <button
            type="button"
            onClick={() => setActionSuccess(null)}
            className="text-emerald-700 hover:text-emerald-900"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      ) : null}

      {actionError ? (
        <div
          role="alert"
          className="rounded-2xl border border-rose-200 bg-rose-50/90 p-4 text-xs font-semibold text-rose-800 flex items-center justify-between shadow-xs"
        >
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{actionError}</span>
          </div>
          <button
            type="button"
            onClick={() => setActionError(null)}
            className="text-rose-700 hover:text-rose-900"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      ) : null}

      {/* Main 2-Column Bento Layout (Standard Ratio: 38% Left Queue / 62% Right Map & Drivers) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* ================= LEFT COLUMN: Dispatch Queue (38-40% -> 5 cols) ================= */}
        <div className="flex flex-col gap-5 lg:col-span-5">
          {/* Queue Header Bento Card */}
          <div className="rounded-3xl border border-slate-100 bg-white p-5 shadow-xs">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <span className="relative flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-amber-500" />
                </span>
                <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wide">
                  Đơn hàng chờ điều phối
                </h2>
              </div>
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-black bg-amber-50 text-amber-800 border border-amber-200">
                {orders.length} đơn kẹt
              </span>
            </div>

            {/* Filter & Search Bar */}
            <div className="mt-3 space-y-2">
              <div className="relative">
                <label htmlFor={searchInputId} className="sr-only">
                  Tìm mã đơn hoặc lộ trình
                </label>
                <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
                <input
                  id={searchInputId}
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Tìm theo mã đơn, địa chỉ lấy/giao..."
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50/50 py-1.5 pl-8 pr-3 text-xs text-slate-900 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-slate-900/10"
                />
              </div>

              <div>
                <label htmlFor={vehicleFilterId} className="sr-only">
                  Lọc phương tiện
                </label>
                <select
                  id={vehicleFilterId}
                  value={selectedVehicleType}
                  onChange={(e) => setSelectedVehicleType(e.target.value)}
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50/50 py-1.5 px-3 text-xs text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-slate-900/10"
                >
                  <option value="ALL">Tất cả phương tiện ({orders.length})</option>
                  <option value="MOTORBIKE">Xe máy</option>
                  <option value="VAN">Xe bán tải / Van</option>
                  <option value="TRUCK_500KG">Xe tải 500kg</option>
                  <option value="TRUCK_1000KG">Xe tải 1 tấn</option>
                  <option value="TRUCK_2000KG">Xe tải 2 tấn</option>
                  <option value="TRUCK_5000KG">Xe tải 5 tấn</option>
                </select>
              </div>
            </div>
          </div>

          {/* Queue Orders Scroll List */}
          <div className="space-y-3 max-h-[calc(100vh-220px)] overflow-y-auto pr-1">
            {filteredOrders.length === 0 ? (
              <div className="rounded-3xl border border-slate-100 bg-white p-8 text-center shadow-xs">
                <CheckCircle2 className="w-10 h-10 text-emerald-400 mx-auto mb-2" />
                <p className="text-sm font-bold text-slate-800">Hàng đợi điều phối sạch sẽ</p>
                <p className="text-xs text-slate-500 mt-1">
                  Không có đơn hàng nào bị kẹt hoặc cần gán tài xế thủ công lúc này.
                </p>
              </div>
            ) : (
              filteredOrders.map((order) => {
                const isSelected = activeOrder?.orderId === order.orderId;
                const isOver30m = order.waitingMinutes > 30;
                const isOver15m = order.waitingMinutes > 15;

                const waitingBadgeClass = isOver30m
                  ? 'bg-rose-50 text-rose-700 border-rose-200 font-bold animate-pulse'
                  : isOver15m
                    ? 'bg-amber-50 text-amber-700 border-amber-200 font-semibold'
                    : 'bg-slate-100 text-slate-600 border-slate-200';

                return (
                  <div
                    key={order.orderId}
                    onClick={() => setSelectedOrderId(order.orderId)}
                    className={`rounded-3xl border p-4 transition-all cursor-pointer shadow-xs ${
                      isSelected
                        ? 'border-slate-900 bg-white ring-2 ring-slate-900/10'
                        : 'border-slate-100 bg-white hover:border-slate-300 hover:shadow-sm'
                    }`}
                  >
                    <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-sm font-black text-slate-900">
                          {order.orderCode}
                        </span>
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 font-medium">
                          {order.vehicleTypeLabel}
                        </span>
                      </div>
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] border ${waitingBadgeClass}`}
                      >
                        <Clock className="w-3 h-3" />
                        Chờ {order.waitingMinutes} phút
                      </span>
                    </div>

                    {/* Route dots */}
                    <div className="mt-3 space-y-1.5 text-xs pl-2 border-l-2 border-slate-200">
                      <div className="flex items-start gap-2">
                        <span className="h-2 w-2 rounded-full bg-emerald-500 mt-1 shrink-0" />
                        <p className="text-slate-700 line-clamp-1 font-medium leading-tight">
                          {order.pickupAddress}
                        </p>
                      </div>
                      <div className="flex items-start gap-2">
                        <span className="h-2 w-2 rounded-full bg-rose-500 mt-1 shrink-0" />
                        <p className="text-slate-700 line-clamp-1 font-medium leading-tight">
                          {order.dropoffAddress}
                        </p>
                      </div>
                    </div>

                    <div className="mt-3 pt-2 border-t border-slate-50 flex items-center justify-between text-[11px] text-slate-500">
                      <span>{order.customerName ?? 'Khách hàng'}</span>
                      <span className="font-semibold text-slate-700">
                        {order.candidateDrivers.length} tài xế khả dụng
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* ================= RIGHT COLUMN: Map & Candidate Drivers (60-62% -> 7 cols) ================= */}
        <div className="flex flex-col gap-6 lg:col-span-7">
          {/* Realtime Map Bento Card */}
          <div className="rounded-3xl border border-slate-100 bg-white p-3 sm:p-4 shadow-xs overflow-hidden">
            <BentoMapCard
              title="Bản đồ định vị thời gian thực"
              activeOrderCode={
                activeOrder
                  ? `Đang chọn: ${activeOrder.orderCode} · ${activeOrder.vehicleTypeLabel}`
                  : 'Chưa chọn đơn hàng'
              }
              markers={mapMarkers}
              routePath={activeRoutePath}
              selectedOrderId={activeOrder?.orderCode}
              onSelectOrder={(code) => {
                const matched = orders.find((o) => o.orderCode === code);
                if (matched) setSelectedOrderId(matched.orderId);
              }}
            />
          </div>

          {/* Candidate Drivers Matching Card */}
          {activeOrder ? (
            <div className="rounded-3xl border border-slate-100 bg-white p-5 sm:p-6 shadow-xs">
              <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-slate-100">
                <div>
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-400 block">
                    Đề xuất tài xế phù hợp
                  </span>
                  <h3 className="text-lg font-black text-slate-900 mt-0.5">
                    Đơn {activeOrder.orderCode} · {activeOrder.vehicleTypeLabel}
                  </h3>
                </div>
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                  <Radio className="w-3.5 h-3.5 animate-pulse" />
                  {activeOrder.candidateDrivers.length} tài xế trong phạm vi
                </span>
              </div>

              {activeOrder.candidateDrivers.length === 0 ? (
                <div className="py-8 text-center text-xs text-slate-500">
                  <AlertTriangle className="w-8 h-8 text-amber-400 mx-auto mb-2" />
                  <p className="font-semibold text-slate-700">Chưa có tài xế phù hợp lân cận</p>
                  <p className="mt-1">
                    Vui lòng chờ hệ thống tìm kiếm tự động hoặc mở rộng phạm vi điều phối.
                  </p>
                </div>
              ) : (
                <div className="mt-4 space-y-3">
                  {activeOrder.candidateDrivers.map((driver) => (
                    <div
                      key={driver.driverId}
                      className="rounded-2xl border border-slate-100 bg-slate-50/50 p-4 transition-all hover:bg-white hover:border-slate-200 hover:shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-bold text-slate-900">{driver.driverName}</span>
                          <span className="text-xs font-mono text-slate-500">
                            {driver.maskedPhone}
                          </span>
                        </div>
                        <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500">
                          <span className="inline-flex items-center gap-1 text-slate-600 font-medium">
                            <Truck className="w-3.5 h-3.5 text-slate-400" />
                            {driver.vehicleTypeLabel}
                          </span>
                          <span>·</span>
                          <span className="inline-flex items-center gap-1 text-slate-600 font-medium">
                            <Navigation className="w-3.5 h-3.5 text-slate-400" />
                            Cách {driver.distanceLabel ?? '2.0 km'}
                          </span>
                          <span>·</span>
                          <span className="font-semibold text-emerald-600">
                            {driver.etaLabel}
                          </span>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => {
                          setAssigningOrder(activeOrder);
                          setAssigningDriver(driver);
                          setReassignReason(`Điều phối ưu tiên đơn hàng chờ ${activeOrder.waitingMinutes} phút`);
                        }}
                        className="inline-flex items-center justify-center gap-1.5 rounded-full bg-slate-900 px-4 py-2 text-xs font-bold text-white hover:bg-slate-800 transition-colors shadow-2xs whitespace-nowrap"
                      >
                        <UserCheck className="w-3.5 h-3.5" /> Gán tài xế
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="rounded-3xl border border-slate-100 bg-white p-8 text-center text-xs text-slate-400 shadow-xs">
              Vui lòng chọn một đơn hàng từ danh sách bên trái để xem ứng viên điều phối.
            </div>
          )}
        </div>
      </div>

      {/* Manual Reassignment Confirmation Modal */}
      {assigningOrder && assigningDriver ? (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs"
          onClick={() => {
            if (!isSubmittingReassign) {
              setAssigningOrder(null);
              setAssigningDriver(null);
            }
          }}
        >
          <div
            className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl animate-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <span className="font-mono text-xs font-bold uppercase tracking-wider text-slate-400">
                  Xác nhận gán tài xế
                </span>
                <h3 className="text-lg font-black text-slate-900 mt-0.5">
                  Điều phối đơn {assigningOrder.orderCode}
                </h3>
              </div>
              <button
                type="button"
                disabled={isSubmittingReassign}
                onClick={() => {
                  setAssigningOrder(null);
                  setAssigningDriver(null);
                }}
                className="rounded-full p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleConfirmReassign} className="mt-4 space-y-4">
              {/* Context Summary */}
              <div className="rounded-2xl bg-slate-50 p-3.5 border border-slate-100 text-xs space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">Tài xế tiếp nhận:</span>
                  <span className="font-bold text-slate-900">{assigningDriver.driverName}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">Số điện thoại:</span>
                  <span className="font-mono font-medium text-slate-700">
                    {assigningDriver.maskedPhone}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">Khoảng cách & ETA:</span>
                  <span className="font-semibold text-emerald-700">
                    {assigningDriver.distanceLabel ?? '2.0 km'} · {assigningDriver.etaLabel}
                  </span>
                </div>
                <div className="pt-2 border-t border-slate-200/60">
                  <span className="text-slate-400 text-[10px] block mb-0.5">Điểm lấy hàng:</span>
                  <span className="font-medium text-slate-800 line-clamp-1">
                    {assigningOrder.pickupAddress}
                  </span>
                </div>
              </div>

              {/* Reason Textarea */}
              <div>
                <label
                  htmlFor="reassignReason"
                  className="text-xs font-semibold text-slate-700 block mb-1.5"
                >
                  Lý do điều phối thủ công <span className="text-rose-500">* (tối thiểu 5 ký tự)</span>:
                </label>
                <textarea
                  id="reassignReason"
                  value={reassignReason}
                  onChange={(e) => setReassignReason(e.target.value)}
                  placeholder="Nhập lý do điều phối (ví dụ: Khách VIP chờ lâu, tài xế gần nhất sẵn sàng nhận)..."
                  rows={3}
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50/50 p-3 text-xs text-slate-900 placeholder:text-slate-400 focus:border-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-slate-900/10"
                />
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  disabled={isSubmittingReassign}
                  onClick={() => {
                    setAssigningOrder(null);
                    setAssigningDriver(null);
                  }}
                  className="rounded-full border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition-colors"
                >
                  Huỷ bỏ
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingReassign || reassignReason.trim().length < 5}
                  className="inline-flex items-center gap-1.5 rounded-full bg-slate-900 px-5 py-2 text-xs font-bold text-white hover:bg-slate-800 disabled:opacity-40 transition-colors shadow-xs"
                >
                  {isSubmittingReassign ? (
                    <>Đang điều phối...</>
                  ) : (
                    <>
                      <Send className="w-3.5 h-3.5" /> Xác nhận điều phối
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  );
}
