'use client';

import React, { useState } from 'react';
import Link from 'next/link';

export interface BentoOrderItem {
  id: string;
  customer: string;
  route: {
    from: string;
    to: string;
  };
  weight: string;
  eta: string;
  status: 'IN_TRANSIT' | 'DELIVERED' | 'LOADING' | 'UNLOADING' | 'PENDING' | 'ASSIGNED' | string;
  statusLabel?: string;
  href?: string;
}

export interface BentoOrdersCardProps {
  title?: string | undefined;
  totalCount?: number | undefined;
  orders?: readonly BentoOrderItem[] | undefined;
  activeFilter?: string | undefined;
  onFilterChange?: ((filter: string) => void) | undefined;
}

const DEFAULT_ORDERS: readonly BentoOrderItem[] = [
  {
    id: 'LP-A-260815-101',
    customer: 'Vinamilk Đà Nẵng',
    route: { from: 'KCN Hòa Khánh', to: 'Cảng Tiên Sa' },
    weight: '1,8 tấn',
    eta: '10:30',
    status: 'IN_TRANSIT',
    statusLabel: 'Đang vận chuyển',
  },
  {
    id: 'LP-A-260815-102',
    customer: 'Dược phẩm Danapha',
    route: { from: 'KCN Điện Ngọc', to: 'Kho Cẩm Lệ' },
    weight: '0,9 tấn',
    eta: '11:15',
    status: 'IN_TRANSIT',
    statusLabel: 'Đang vận chuyển',
  },
  {
    id: 'LP-A-260815-103',
    customer: 'Thép Hòa Phát',
    route: { from: 'Cảng Liên Chiểu', to: 'KCN Hòa Cầm' },
    weight: '2,4 tấn',
    eta: '09:45',
    status: 'DELIVERED',
    statusLabel: 'Đã giao hàng',
  },
  {
    id: 'LP-A-260815-104',
    customer: 'Dệt may 29/3',
    route: { from: 'Hải Châu', to: 'Sơn Trà' },
    weight: '3,2 tấn',
    eta: '08:30',
    status: 'DELIVERED',
    statusLabel: 'Đã giao hàng',
  },
];

const FILTERS = [
  { id: 'all', label: 'Tất cả' },
  { id: 'pending', label: 'Chờ tiếp nhận' },
  { id: 'loading', label: 'Đang lấy hàng' },
  { id: 'in_transit', label: 'Đang vận chuyển' },
  { id: 'delivered', label: 'Đã giao hàng' },
] as const;

export function BentoOrdersCard({
  title = 'Sổ điều phối đơn hàng',
  totalCount,
  orders = DEFAULT_ORDERS,
  activeFilter: controlledFilter,
  onFilterChange,
}: BentoOrdersCardProps) {
  const [internalFilter, setInternalFilter] = useState('all');
  const currentFilter = controlledFilter ?? internalFilter;

  const handleFilterClick = (id: string) => {
    setInternalFilter(id);
    onFilterChange?.(id);
  };

  const displayedOrders = orders.filter((o) => {
    if (currentFilter === 'all') return true;
    if (currentFilter === 'pending') {
      return (
        o.status === 'REQUESTED' ||
        o.status === 'PENDING' ||
        o.status === 'ASSIGNED' ||
        o.status === 'ACCEPTED'
      );
    }
    if (currentFilter === 'loading') {
      return o.status === 'PICKING_UP' || o.status === 'LOADING';
    }
    if (currentFilter === 'in_transit') {
      return o.status === 'IN_TRANSIT' || o.status === 'PICKED_UP' || o.status === 'UNLOADING';
    }
    if (currentFilter === 'delivered') {
      return o.status === 'DELIVERED' || o.status === 'COMPLETED';
    }
    return true;
  });

  const displayCount = totalCount ?? orders.length;

  const getStatusBadge = (status: string, label?: string) => {
    let displayLabel = label;
    if (!displayLabel) {
      if (status === 'IN_TRANSIT') displayLabel = 'Đang vận chuyển';
      else if (status === 'DELIVERED') displayLabel = 'Đã giao hàng';
      else if (status === 'LOADING' || status === 'PICKING_UP') displayLabel = 'Đang lấy hàng';
      else if (status === 'UNLOADING' || status === 'PICKED_UP') displayLabel = 'Đang dỡ hàng';
      else if (status === 'REQUESTED' || status === 'PENDING') displayLabel = 'Chờ tiếp nhận';
      else if (status === 'ASSIGNED' || status === 'ACCEPTED') displayLabel = 'Đã gán xe';
      else if (status === 'CANCELLED') displayLabel = 'Đã hủy';
      else displayLabel = status;
    }

    if (status === 'IN_TRANSIT') {
      return (
        <span className="inline-flex items-center rounded-full bg-[#10b981] px-3 py-0.5 text-xs font-semibold text-white shadow-2xs">
          {displayLabel}
        </span>
      );
    }
    if (status === 'DELIVERED') {
      return (
        <span className="inline-flex items-center rounded-full bg-[#ec4899] px-3 py-0.5 text-xs font-semibold text-white shadow-2xs">
          {displayLabel}
        </span>
      );
    }
    if (status === 'LOADING' || status === 'PICKING_UP') {
      return (
        <span className="inline-flex items-center rounded-full bg-amber-400 px-3 py-0.5 text-xs font-semibold text-slate-900 shadow-2xs">
          {displayLabel}
        </span>
      );
    }
    if (status === 'UNLOADING' || status === 'PICKED_UP') {
      return (
        <span className="inline-flex items-center rounded-full bg-red-400 px-3 py-0.5 text-xs font-semibold text-white shadow-2xs">
          {displayLabel}
        </span>
      );
    }
    return (
      <span className="inline-flex items-center rounded-full bg-slate-100 px-3 py-0.5 text-xs font-semibold text-slate-700">
        {displayLabel}
      </span>
    );
  };

  return (
    <div className="rounded-3xl bg-white p-5 sm:p-6 border border-slate-100 shadow-sm flex flex-col justify-between gap-4">
      {/* Header: Title + Filter Pills */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-baseline gap-2">
          <h2 className="text-xl font-bold tracking-tight text-slate-900">{title}</h2>
          <span className="text-sm font-medium text-slate-400">({displayCount})</span>
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-1 sm:gap-1.5 overflow-x-auto py-1">
          {FILTERS.map((f) => {
            const isActive = currentFilter === f.id;
            return (
              <button
                key={f.id}
                type="button"
                onClick={() => handleFilterClick(f.id)}
                className={`rounded-full px-3.5 py-1 text-xs transition-all cursor-pointer ${
                  isActive
                    ? 'bg-slate-900 text-white font-semibold shadow-xs'
                    : 'bg-slate-100/80 text-slate-600 hover:bg-slate-200 hover:text-slate-900 font-medium'
                }`}
              >
                {f.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Orders Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-slate-100 text-[11px] font-medium text-slate-400">
              <th scope="col" className="pb-2.5 font-medium">Mã đơn hàng</th>
              <th scope="col" className="pb-2.5 font-medium">Khách hàng</th>
              <th scope="col" className="pb-2.5 font-medium">Lộ trình</th>
              <th scope="col" className="pb-2.5 font-medium">Tải trọng</th>
              <th scope="col" className="pb-2.5 font-medium">Giờ đến dự kiến</th>
              <th scope="col" className="pb-2.5 text-right font-medium">Trạng thái</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50 text-xs">
            {displayedOrders.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-6 text-center text-slate-400 font-medium">
                  Không có đơn hàng nào trong trạng thái này.
                </td>
              </tr>
            ) : (
              displayedOrders.map((order) => (
                <tr key={order.id} className="hover:bg-slate-50/80 transition-colors group">
                  <td className="py-3 font-semibold text-slate-900">
                    {order.href ? (
                      <Link
                        href={order.href}
                        className="text-slate-900 hover:text-emerald-600 transition-colors inline-flex items-center gap-1 font-semibold"
                      >
                        {order.id}
                      </Link>
                    ) : (
                      order.id
                    )}
                  </td>
                  <td className="py-3 font-medium text-slate-700">{order.customer}</td>
                  <td className="py-3 text-slate-600">
                    <span className="text-slate-400">Từ </span>
                    <span className="font-medium text-slate-800">{order.route.from}</span>
                    <span className="text-slate-400"> ➔ Đến </span>
                    <span className="font-medium text-slate-800">{order.route.to}</span>
                  </td>
                  <td className="py-3 font-medium text-slate-700">{order.weight}</td>
                  <td className="py-3 text-slate-600 tabular-nums">{order.eta}</td>
                  <td className="py-3 text-right">
                    {getStatusBadge(order.status, order.statusLabel)}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
