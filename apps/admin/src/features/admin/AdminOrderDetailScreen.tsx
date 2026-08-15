'use client';

import {
  MapPanel,
  OperationalAlert,
  OperationsPageHeader,
  ReadOnlyDetailList,
  RouteSpine,
  StatusBadge,
  StatusTimeline,
} from '@leopard/ui';

import { AdminCommandLauncher } from './AdminCommandLauncher';
import {
  AdminAuditRail,
  AdminBoundaryState,
  AdminBreadcrumbs,
  AdminNotice,
  AdminSurface,
} from './AdminShared';
import type { AdminOrderDetailRouteView } from './model';

export function AdminOrderDetailScreen({
  view,
}: Readonly<{ view: AdminOrderDetailRouteView }>) {
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
      <AdminBreadcrumbs orderReference={order.reference} screen="order-detail" />
      <OperationsPageHeader
        context="Investigation workspace · lifecycle history tách biệt với privileged audit"
        isStale={order.tracking.state === 'stale'}
        title={`Đơn ${order.reference}`}
        updatedAt={order.updatedAtLabel}
      />
      {view.notice ? <AdminNotice notice={view.notice} /> : null}
      <div className="flex flex-wrap items-center gap-sm">
        <StatusBadge domain="orderStatus" status={order.status} />
        <StatusBadge domain="paymentStatus" status={order.payment.status} />
        <span className="text-body-compact text-neutral-muted">{order.tracking.statusLabel}</span>
      </div>

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
            <div className="flex h-full min-h-map-min items-center justify-center p-md text-center text-body-compact text-neutral-muted">
              Tuyến và marker mô phỏng ở phạm vi được phép; không hiển thị tọa độ thô.
            </div>
          </MapPanel>

          <AdminSurface
            description="Command chỉ xuất hiện từ availableCommands; UI không tự suy lifecycle hoặc payment capability."
            title="Command được phép"
          >
            <AdminCommandLauncher
              commands={view.availableCommands}
              dialogPreview={view.dialogPreview}
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
              <p className="text-body-compact text-neutral-muted">Chưa có media được phép hiển thị.</p>
            ) : (
              <ul className="m-0 grid list-none gap-sm p-0 sm:grid-cols-2">
                {order.media.items.map((item) => (
                  <li key={item.id} className="rounded-control border border-neutral-border bg-neutral-surface p-sm">
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
                { id: 'status', label: 'Trạng thái', value: <StatusBadge domain="paymentStatus" status={order.payment.status} /> },
                { id: 'amount', label: 'Số tiền', value: order.payment.amountLabel },
                { id: 'reference', label: 'Reference', value: order.payment.referenceLabel },
                { id: 'source', label: 'Nguồn', value: order.payment.sourceLabel },
                { id: 'expiry', label: 'Hết hạn', value: order.payment.expiresAtLabel ?? 'Không áp dụng' },
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
