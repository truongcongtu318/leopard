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
    weight: '1.8 t',
    eta: '10:30',
    status: 'IN_TRANSIT',
    statusLabel: 'In Transit',
  },
  {
    id: 'LP-A-260815-102',
    customer: 'Dược phẩm Danapha',
    route: { from: 'KCN Điện Ngọc', to: 'Kho Cẩm Lệ' },
    weight: '0.9 t',
    eta: '11:15',
    status: 'IN_TRANSIT',
    statusLabel: 'In Transit',
  },
  {
    id: 'LP-A-260815-103',
    customer: 'Thép Hòa Phát',
    route: { from: 'Cảng Liên Chiểu', to: 'KCN Hòa Cầm' },
    weight: '2.4 t',
    eta: '09:45',
    status: 'DELIVERED',
    statusLabel: 'Delivered',
  },
  {
    id: 'LP-A-260815-104',
    customer: 'Dệt may 29/3',
    route: { from: 'Hải Châu', to: 'Sơn Trà' },
    weight: '3.2 t',
    eta: '08:30',
    status: 'DELIVERED',
    statusLabel: 'Delivered',
  },
];


const FILTERS = [
  { id: 'all', label: 'All' },
  { id: 'pending', label: 'Pending' },
  { id: 'responded', label: 'Responded' },
  { id: 'assigned', label: 'Assigned' },
  { id: 'completed', label: 'Completed' },
] as const;

export function BentoOrdersCard({
  title = 'Orders',
  totalCount = 301,
  orders = DEFAULT_ORDERS,
  activeFilter: controlledFilter,
  onFilterChange,
}: BentoOrdersCardProps) {
  const [internalFilter, setInternalFilter] = useState('assigned');
  const currentFilter = controlledFilter ?? internalFilter;

  const handleFilterClick = (id: string) => {
    setInternalFilter(id);
    onFilterChange?.(id);
  };

  const getStatusBadge = (status: string, label?: string) => {
    const displayLabel = label ?? (status === 'IN_TRANSIT' ? 'In Transit' : status === 'DELIVERED' ? 'Delivered' : status);

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
    if (status === 'LOADING') {
      return (
        <span className="inline-flex items-center rounded-full bg-amber-400 px-3 py-0.5 text-xs font-semibold text-slate-900 shadow-2xs">
          {displayLabel}
        </span>
      );
    }
    if (status === 'UNLOADING') {
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
          <span className="text-sm font-medium text-slate-400">({totalCount})</span>
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

          <button
            type="button"
            aria-label="Tùy chọn bộ lọc"
            className="flex h-7 w-7 items-center justify-center rounded-full bg-slate-100 text-slate-600 hover:bg-slate-200 transition-colors ml-1 cursor-pointer"
          >
            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
            </svg>
          </button>
        </div>
      </div>

      {/* Orders Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-slate-100 text-[11px] font-medium text-slate-400">
              <th scope="col" className="pb-2.5 font-medium">Order ID</th>
              <th scope="col" className="pb-2.5 font-medium">Customer</th>
              <th scope="col" className="pb-2.5 font-medium">Route</th>
              <th scope="col" className="pb-2.5 font-medium">Weight</th>
              <th scope="col" className="pb-2.5 font-medium">ETA</th>
              <th scope="col" className="pb-2.5 text-right font-medium">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50 text-xs">
            {orders.map((order) => (
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
                  <span className="text-slate-400">from </span>
                  <span className="font-medium text-slate-800">{order.route.from}</span>
                  <span className="text-slate-400"> → to </span>
                  <span className="font-medium text-slate-800">{order.route.to}</span>
                </td>
                <td className="py-3 font-medium text-slate-700">{order.weight}</td>
                <td className="py-3 text-slate-600 tabular-nums">{order.eta}</td>
                <td className="py-3 text-right">
                  {getStatusBadge(order.status, order.statusLabel)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
