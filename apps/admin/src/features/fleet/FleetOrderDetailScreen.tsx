import {
  MapPanel,
  OperationsPageHeader,
  OperationalAlert,
  ReadOnlyDetailList,
  RouteMapSchematic,
  RouteSpine,
  StatusBadge,
  StatusTimeline,
} from '@leopard/ui';

import {
  FleetBoundaryState,
  FleetBreadcrumbs,
  FleetDispatchSlab,
  FleetNotice,
  FleetReadOnlyNote,
  FleetScopeRail,
  FleetSurface,
} from './FleetShared';
import type { FleetOrderDetailRouteView } from './model';

export function FleetOrderDetailScreen({ view }: Readonly<{ view: FleetOrderDetailRouteView }>) {
  if (view.kind !== 'order-detail') {
    return (
      <div className="flex flex-col gap-md">
        <OperationsPageHeader title="Chi tiết đơn" />
        <FleetBoundaryState view={view} />
      </div>
    );
  }

  const { order } = view;
  return (
    <div className="flex flex-col gap-lg">
      <FleetBreadcrumbs current="order-detail" orderReference={order.reference} />
      <OperationsPageHeader
        context="Chi tiết vận hành thuộc phạm vi đội xe"
        isStale={order.tracking.state === 'stale'}
        updatedAt={order.updatedAtLabel}
        title={`Đơn ${order.reference}`}
      />
      <FleetScopeRail scope={view.scope} />
      <FleetReadOnlyNote />
      {view.notice ? <FleetNotice notice={view.notice} /> : null}

      <FleetDispatchSlab
        ariaLabel="Ngữ cảnh chuyến trong phạm vi đội xe"
        eyebrow="SCOPE LEDGER · ACTIVE ORDER"
      >
        <div className="grid gap-md md:grid-cols-[minmax(0,1fr)_auto] md:items-end">
          <div className="min-w-0">
            <p className="text-section-title font-bold break-words">{order.reference}</p>
            <p className="mt-xxs text-body-compact text-brand-soft break-words">
              {order.driverLabel} · {order.tracking.statusLabel}
            </p>
          </div>
          <div className="flex flex-wrap gap-sm md:justify-end">
            <StatusBadge domain="orderStatus" status={order.status} />
            <StatusBadge domain="paymentStatus" status={order.payment.status} />
          </div>
        </div>
      </FleetDispatchSlab>

      <div className="grid gap-lg xl:grid-cols-[minmax(0,3fr)_minmax(18rem,2fr)]">
        <FleetSurface
          description={`${order.eta.label} · ${order.eta.sourceLabel ?? 'Nguồn ETA chưa xác định'}`}
          title="Lộ trình"
        >
          <RouteSpine
            ariaLabel="Lộ trình đơn thuộc đội xe"
            destination={order.route.destination}
            isStale={order.tracking.state === 'stale'}
            origin={order.route.origin}
            stops={order.route.stops}
          />
        </FleetSurface>

        <FleetSurface title="Thông tin phân công">
          <ReadOnlyDetailList
            ariaLabel="Thông tin phân công và hàng hóa"
            items={[
              { id: 'driver', label: 'Driver', value: order.driverLabel },
              { id: 'customer', label: 'Customer', value: order.customerLabel },
              { id: 'cargo', label: 'Hàng hóa', value: order.cargoSummary },
              { id: 'updated', label: 'Cập nhật', value: order.updatedAtLabel },
            ]}
          />
        </FleetSurface>
      </div>

      <MapPanel
        height="large"
        lastUpdated={order.tracking.lastUpdatedLabel}
        state={order.tracking.state}
        textAlternative={order.tracking.mapAlternative}
        title="Tracking và vị trí gần nhất"
      >
        <RouteMapSchematic
          destinationLabel={order.route.destination.label}
          markerLabel={`${order.driverLabel} · marker mô phỏng, không phải vị trí trực tiếp`}
          originLabel={order.route.origin.label}
        />
      </MapPanel>

      <div className="grid gap-lg xl:grid-cols-2">
        <FleetSurface title="Lịch sử trạng thái">
          <StatusTimeline
            ariaLabel="Lịch sử trạng thái đơn"
            items={order.history.map((item) => ({
              id: item.id,
              label: item.label,
              description: item.description,
              timestamp: item.timestampLabel,
              dateTime: item.dateTime,
              isCurrent: item.isCurrent,
            }))}
          />
        </FleetSurface>

        <FleetSurface title="Thanh toán">
          <ReadOnlyDetailList
            ariaLabel="Tóm tắt thanh toán"
            items={[
              {
                id: 'status',
                label: 'Trạng thái',
                value: <StatusBadge domain="paymentStatus" status={order.payment.status} />,
              },
              { id: 'amount', label: 'Số tiền', value: order.payment.amountLabel },
              { id: 'method', label: 'Phương thức', value: order.payment.methodLabel },
            ]}
          />
        </FleetSurface>
      </div>

      <FleetSurface
        description="Chỉ hiển thị metadata đã được backend cho phép; không lộ signed URL."
        title="Media"
      >
        {order.media.state === 'error' ? (
          <OperationalAlert title="Không thể tải media" tone="warning">
            <p>{order.media.message}</p>
          </OperationalAlert>
        ) : order.media.items.length === 0 ? (
          <p className="text-body-compact text-neutral-muted">Chưa có media được phép hiển thị.</p>
        ) : (
          <ul className="m-0 grid list-none gap-sm p-0 sm:grid-cols-2">
            {order.media.items.map((item, index) => (
              <li
                key={item.id}
                className="min-h-32 border-l-4 border-brand bg-neutral-surface p-md"
              >
                <p className="text-section-title font-bold text-brand" aria-hidden="true">
                  {String(index + 1).padStart(2, '0')}
                </p>
                <p className="font-semibold break-words">{item.label}</p>
                <p className="mt-xxs text-body-compact text-neutral-muted">
                  {item.mediaType} · {item.capturedAtLabel}
                </p>
              </li>
            ))}
          </ul>
        )}
      </FleetSurface>
    </div>
  );
}
