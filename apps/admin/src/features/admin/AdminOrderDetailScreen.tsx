'use client';

import {
  MapPanel,
  OperationalAlert,
  OperationsPageHeader,
  ReadOnlyDetailList,
  RouteMapSchematic,
  RouteSpine,
  StatusBadge,
  StatusTimeline,
} from '@leopard/ui';

import { LiveOrderRefresher } from '../../components/live/LiveOrderRefresher';
import { AdminCommandLauncher } from './AdminCommandLauncher';
import {
  AdminAuditRail,
  AdminBoundaryState,
  AdminBreadcrumbs,
  AdminDispatchSlab,
  AdminNotice,
  AdminSurface,
} from './AdminShared';
import type { AdminOrderDetailRouteView } from './model';
import type { AdminPreviewContext } from './model';

const TERMINAL_ORDER_STATUSES: ReadonlySet<string> = new Set(['DELIVERED', 'CANCELLED']);

export function AdminOrderDetailScreen({
  commandRuntime,
  view,
  previewContext,
}: Readonly<{
  view: AdminOrderDetailRouteView;
  previewContext?: AdminPreviewContext;
  /** Live API command execution (runtime data path); absent in preview renders. */
  commandRuntime?: boolean | undefined;
}>) {
  if (view.kind !== 'order-detail') {
    return (
      <div className="flex flex-col gap-md">
        <OperationsPageHeader title="Chi tiết đơn" />
        <AdminBoundaryState view={view} />
      </div>
    );
  }

  const { order } = view;
  return (
    <div className="flex min-w-0 flex-col gap-lg">
      <AdminBreadcrumbs
        orderReference={order.reference}
        previewContext={previewContext}
        screen="order-detail"
      />
      <OperationsPageHeader
        isStale={order.tracking.state === 'stale'}
        title={`Đơn ${order.reference}`}
        updatedAt={order.updatedAtLabel}
      />
      <LiveOrderRefresher
        enabled={!TERMINAL_ORDER_STATUSES.has(order.status)}
        orderId={order.id}
      />
      {view.notice ? <AdminNotice notice={view.notice} /> : null}
      <AdminDispatchSlab
        ariaLabel="Ngữ cảnh điều phối hiện tại"
        eyebrow="THÔNG TIN ĐIỀU PHỐI TRỰC TIẾP"
      >
        <div className="grid min-w-0 gap-md md:grid-cols-[minmax(0,1fr)_auto] md:items-end">
          <div className="min-w-0">
            <p className="text-xl sm:text-2xl font-black text-slate-800 break-words">{order.reference}</p>
            <p className="mt-xs text-xs sm:text-sm text-slate-600 break-words font-medium">
              {order.driverLabel} · {order.tracking.statusLabel}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-sm md:justify-end">
            <StatusBadge domain="orderStatus" status={order.status} />
            <StatusBadge domain="paymentStatus" status={order.payment.status} />
          </div>
        </div>
      </AdminDispatchSlab>

      <div className="grid min-w-0 gap-lg lg:grid-cols-12">
        <div className="flex min-w-0 flex-col gap-lg lg:col-span-8">
          <AdminSurface title="Ngữ cảnh đơn và phân công">
            <ReadOnlyDetailList
              ariaLabel="Ngữ cảnh đơn, Khách hàng và Tài xế"
              items={[
                { id: 'reference', label: 'Mã đơn hàng', value: order.reference },
                { id: 'customer', label: 'Khách hàng', value: order.customerLabel },
                { id: 'driver', label: 'Tài xế tiếp nhận', value: order.driverLabel },
                { id: 'cargo', label: 'Hàng hóa', value: order.cargoSummary },
                { id: 'updated', label: 'Cập nhật', value: order.updatedAtLabel },
              ]}
            />
          </AdminSurface>

          <AdminSurface
            description={`${order.eta.label} · ${order.eta.sourceLabel}`}
            title="Lộ trình"
          >
            <RouteSpine
              ariaLabel="Lộ trình điều tra của đơn"
              destination={order.route.destination}
              isStale={order.tracking.state === 'stale'}
              origin={order.route.origin}
              stops={order.route.stops}
            />
          </AdminSurface>

          <MapPanel
            className="rounded-[22px] sm:rounded-[26px] border border-white/80 shadow-xs overflow-hidden"
            height="large"
            lastUpdated={order.tracking.lastUpdatedLabel}
            state={order.tracking.state}
            textAlternative={order.tracking.mapAlternative}
            title="Giám sát hành trình & Vị trí thực tế"
          >
            <RouteMapSchematic
              destinationLabel={order.route.destination.label}
              markerLabel={`${order.driverLabel} · marker mô phỏng trong phạm vi cho phép`}
              originLabel={order.route.origin.label}
            />
          </MapPanel>

          <AdminSurface title="Thao tác điều phối khả dụng">
            <AdminCommandLauncher
              commands={view.availableCommands}
              dialogPreview={view.dialogPreview}
              runtime={commandRuntime === true}
            />
          </AdminSurface>

          <AdminSurface title="Lịch sử trạng thái">
            <StatusTimeline
              ariaLabel="Lịch sử lifecycle của đơn"
              items={order.history.map((item) => ({
                id: item.id,
                label: item.label,
                description: item.description,
                timestamp: item.timestampLabel,
                dateTime: item.dateTime,
                isCurrent: item.isCurrent,
              }))}
            />
          </AdminSurface>

          <AdminSurface title="Hình ảnh xác nhận giao nhận">
            {order.media.state === 'error' ? (
              <OperationalAlert title="Không thể tải ảnh" tone="danger">
                <p>{order.media.message}</p>
              </OperationalAlert>
            ) : order.media.items.length === 0 ? (
              <p className="text-body-compact text-neutral-muted">
                Chưa có hình ảnh xác nhận được phép hiển thị.
              </p>
            ) : (
              <ul className="m-0 grid list-none gap-3 p-0 sm:grid-cols-2">
                {order.media.items.map((item, index) => (
                  <li
                    key={item.id}
                    className="rounded-2xl border border-slate-200/80 bg-[#f8fbff] p-4 shadow-2xs hover:shadow-xs transition-shadow"
                  >
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <span className="text-xs font-bold text-brand uppercase tracking-wider" aria-hidden="true">
                        Tệp #{String(index + 1).padStart(2, '0')}
                      </span>
                      <span className="rounded-full bg-slate-200/70 px-2 py-0.5 text-[10px] font-semibold text-slate-700">
                        {item.mediaType}
                      </span>
                    </div>
                    <p className="font-bold text-slate-800 break-words text-sm">{item.label}</p>
                    <p className="mt-1 text-xs text-neutral-muted tabular-nums">
                      {item.capturedAtLabel}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </AdminSurface>

          <AdminSurface title="Thanh toán">
            <ReadOnlyDetailList
              ariaLabel="Trạng thái và metadata thanh toán"
              items={[
                {
                  id: 'status',
                  label: 'Trạng thái',
                  value: <StatusBadge domain="paymentStatus" status={order.payment.status} />,
                },
                { id: 'amount', label: 'Số tiền', value: order.payment.amountLabel },
                { id: 'reference', label: 'Mã tham chiếu', value: order.payment.referenceLabel },
                { id: 'source', label: 'Nguồn', value: order.payment.sourceLabel },
                {
                  id: 'expiry',
                  label: 'Hết hạn',
                  value: order.payment.expiresAtLabel ?? 'Không áp dụng',
                },
              ]}
            />
          </AdminSurface>
        </div>

        <div className="min-w-0 lg:col-span-4">
          <AdminAuditRail audit={view.audit} />
        </div>
      </div>
    </div>
  );
}
