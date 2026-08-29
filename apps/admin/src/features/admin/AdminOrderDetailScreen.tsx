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
        context="Investigation workspace · lifecycle history tách biệt với privileged audit"
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
        eyebrow="INVESTIGATION CONTEXT · LIVE SNAPSHOT"
      >
        <div className="grid min-w-0 gap-md md:grid-cols-[minmax(0,1fr)_auto] md:items-end">
          <div className="min-w-0">
            <p className="text-xs font-semibold text-brand-soft">TARGET ORDER</p>
            <p className="mt-xxs text-section-title font-bold break-words">{order.reference}</p>
            <p className="mt-xs text-body-compact text-brand-soft break-words">
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
              ariaLabel="Ngữ cảnh đơn, Customer và Driver"
              items={[
                { id: 'reference', label: 'Order ID', value: order.reference },
                { id: 'customer', label: 'Customer', value: order.customerLabel },
                { id: 'driver', label: 'Driver được phân công', value: order.driverLabel },
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
            height="large"
            lastUpdated={order.tracking.lastUpdatedLabel}
            state={order.tracking.state}
            textAlternative={order.tracking.mapAlternative}
            title="Tracking và vị trí gần nhất"
          >
            <RouteMapSchematic
              destinationLabel={order.route.destination.label}
              markerLabel={`${order.driverLabel} · marker mô phỏng trong phạm vi cho phép`}
              originLabel={order.route.origin.label}
            />
          </MapPanel>

          <AdminSurface
            description="Command chỉ xuất hiện từ availableCommands; UI không tự suy lifecycle hoặc payment capability."
            title="Command được phép"
          >
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

          <AdminSurface
            description="Metadata-first; không render signed URL hoặc storage key."
            title="Media evidence"
          >
            {order.media.state === 'error' ? (
              <OperationalAlert title="Không thể tải ảnh" tone="danger">
                <p>{order.media.message}</p>
              </OperationalAlert>
            ) : order.media.items.length === 0 ? (
              <p className="text-body-compact text-neutral-muted">
                Chưa có media được phép hiển thị.
              </p>
            ) : (
              <ul className="m-0 grid list-none gap-sm p-0 sm:grid-cols-2">
                {order.media.items.map((item) => (
                  <li
                    key={item.id}
                    className="rounded-control border border-neutral-border bg-neutral-surface p-sm"
                  >
                    <p className="font-semibold break-words">{item.label}</p>
                    <p className="mt-xxs text-body-compact text-neutral-muted">
                      {item.mediaType} · {item.capturedAtLabel}
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
                { id: 'reference', label: 'Reference', value: order.payment.referenceLabel },
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
