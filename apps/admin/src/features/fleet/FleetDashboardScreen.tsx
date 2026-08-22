'use client';

import {
  CapacityBarChart,
  CompactMetricSummary,
  DriverCallingCard,
  FleetUtilizationGauge,
  HourlyVolumeChart,
  LiveRouteMapWidget,
  OperationsPageHeader,
  OperationalAlert,
  PackageBreakdownCard,
  SparklineMetricCard,
  StatusBadge,
  TrackingWaypointCard,
  VehicleSpecCard,
} from '@leopard/ui';

import { fleetOrderDetailHref, fleetPreviewHref } from './adapter';
import type { FleetDashboardRouteView, FleetPreviewContext } from './model';
import {
  FleetBoundaryState,
  FleetDispatchSlab,
  FleetNotice,
  FleetScopeRail,
  FleetSurface,
} from './FleetShared';

export function FleetDashboardScreen({
  view,
  previewContext,
}: Readonly<{
  view: FleetDashboardRouteView;
  previewContext?: FleetPreviewContext;
}>) {
  if (view.kind !== 'dashboard') {
    return (
      <div className="flex flex-col gap-md">
        <OperationsPageHeader title="Tổng quan đội xe" />
        <FleetBoundaryState view={view} />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-lg">
      <OperationsPageHeader
        context="Ngoại lệ và snapshot vận hành thuộc đúng phạm vi đội xe"
        title="Tổng quan đội xe"
      />
      <FleetScopeRail scope={view.scope} />
      <p className="text-xs text-neutral-muted tabular-nums">Snapshot: {view.asOfLabel}</p>
      {view.notice ? <FleetNotice notice={view.notice} /> : null}

      {/* Drivergo Row 1: Fleet KPI Sparkline Cards */}
      <div className="grid min-w-0 gap-5 sm:grid-cols-2 lg:grid-cols-3">
        <SparklineMetricCard
          title="Đơn của đội xe tháng này"
          value="48 đơn"
          delta="+8.4%"
          deltaType="increase"
          sparkColor="#4F46E5"
          subtitle="Đội xe Sao Mai"
        />
        <SparklineMetricCard
          title="Tỷ lệ hoàn thành đội xe"
          value="100%"
          delta="+0%"
          deltaType="increase"
          sparkColor="#10B981"
          subtitle="Tất cả tài xế chấp hành đúng lộ trình"
        />
        <CapacityBarChart
          title="Trọng tải xe đang phục vụ"
          activeWeightTag="500kg - 1.5 Tấn"
        />
      </div>

      {/* Drivergo Row 2: Active Dispatch Center */}
      <div className="grid min-w-0 gap-5 lg:grid-cols-3">
        <DriverCallingCard
          name="Tài xế An Mô Phỏng"
          roleSubtitle="Đang chạy đơn LP-F-260815-001"
          company="Đội xe Sao Mai"
          phone="0908 111 222"
          acceptLabel="Liên hệ"
          rejectLabel="Báo bận"
        />
        <TrackingWaypointCard
          trackingNumber="LP-F-260815-001"
          statusLabel="Đang vận chuyển"
        />
        <VehicleSpecCard
          modelName="Bengala Van 1.2T"
          plateNumber="59C-102.88"
          volume="12.5 m³"
          length="2.8 m"
          width="1.6 m"
        />
      </div>

      {/* Drivergo Row 3: Live Route Map & Package Breakdown */}
      <div className="grid min-w-0 gap-5 lg:grid-cols-[minmax(0,1.8fr)_minmax(0,1.2fr)]">
        <LiveRouteMapWidget
          originName="Kho Quận 7"
          destinationName="TP. Thủ Đức"
          remainingDistance="18 km"
          remainingEta="35 phút"
          height={320}
        />
        <PackageBreakdownCard
          totalItems="120 kg (Hàng thùng)"
          categories={[
            { name: 'Điện máy', percentage: 55, countLabel: '65 kg', color: 'bg-indigo-600' },
            { name: 'Văn phòng phẩm', percentage: 30, countLabel: '35 kg', color: 'bg-sky-500' },
            { name: 'Khác', percentage: 15, countLabel: '20 kg', color: 'bg-violet-500' },
          ]}
        />
      </div>

      {/* Fleet Telemetry & Utilization */}
      <div className="grid min-w-0 gap-lg lg:grid-cols-2">
        <FleetUtilizationGauge
          activeDrivers={view.activeOrders.length > 0 ? 2 : 0}
          activeTrips={view.activeOrders.length}
          totalDrivers={3}
        />
        <HourlyVolumeChart
          title="Lưu lượng đơn đội xe (24h)"
          subtitle="Nhịp độ vận chuyển của các tài xế thuộc đội xe Sao Mai"
          peakHourLabel="Đỉnh điểm: 14:00 (18 đơn)"
        />
      </div>

      <CompactMetricSummary ariaLabel="Tóm tắt vận hành đội xe" items={view.metrics} />

      <FleetSurface
        description="Chỉ hiển thị ngoại lệ đã được nguồn dữ liệu phân loại."
        title="Cần chú ý"
      >
        {view.attentionItems.length === 0 ? (
          <p className="py-sm text-body-compact text-neutral-muted">
            Chưa có ngoại lệ cần xử lý trong snapshot hiện tại.
          </p>
        ) : (
          <ul className="m-0 grid list-none gap-sm p-0">
            {view.attentionItems.map((item) => (
              <li key={item.id}>
                <OperationalAlert title={item.title} tone={item.severity}>
                  <p>{item.reason}</p>
                  <p className="mt-xs text-xs tabular-nums">Ghi nhận: {item.observedAtLabel}</p>
                  <a
                    className="mt-xs inline-flex min-h-11 items-center font-semibold underline underline-offset-4 focus-visible:rounded-control focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-current"
                    href={fleetOrderDetailHref(item.href, previewContext)}
                  >
                    Xem {item.resourceLabel}
                  </a>
                </OperationalAlert>
              </li>
            ))}
          </ul>
        )}
      </FleetSurface>

      <div className="grid gap-lg xl:grid-cols-[minmax(0,2fr)_minmax(16rem,1fr)]">
        <FleetSurface
          description="Các đơn đang hoạt động do snapshot đã xác thực cung cấp."
          title="Đơn đang hoạt động"
        >
          {view.activeOrders.length === 0 ? (
            <p className="py-sm text-body-compact text-neutral-muted">
              Chưa có đơn đang hoạt động trong đội xe.
            </p>
          ) : (
            <ul className="m-0 grid list-none gap-md p-0">
              {view.activeOrders.map((order) => (
                <li key={order.id} className="border-l-4 border-brand bg-neutral-surface p-md">
                  <p className="mb-xs text-[0.625rem] font-bold tracking-widest text-brand">
                    ACTIVE ORDER
                  </p>
                  <div className="flex flex-wrap items-start justify-between gap-xs">
                    <a
                      className="font-semibold text-brand underline-offset-4 hover:underline focus-visible:rounded-control focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
                      href={fleetOrderDetailHref(order.href, previewContext)}
                    >
                      {order.reference}
                    </a>
                    <StatusBadge domain="orderStatus" status={order.status} />
                  </div>
                  <p className="mt-xs text-body-compact">{order.routeLabel}</p>
                  <p className="mt-xxs text-body-compact text-neutral-muted">{order.driverLabel}</p>
                  <p className="mt-xxs text-xs text-neutral-muted">{order.trackingLabel}</p>
                </li>
              ))}
            </ul>
          )}
        </FleetSurface>

        <FleetDispatchSlab ariaLabel="Tình trạng tài xế" eyebrow="DRIVER FIELD · SNAPSHOT">
          <h2 className="text-section-title font-semibold">Tình trạng tài xế</h2>
          {view.unavailableRegionLabel ? (
            <OperationalAlert title="Không thể tải vùng dữ liệu" tone="warning">
              <p>{view.unavailableRegionLabel}</p>
            </OperationalAlert>
          ) : (
            <>
              <p className="mt-sm text-lg font-semibold break-words">{view.availabilitySummary}</p>
              <a
                className="mt-md inline-flex min-h-11 items-center font-semibold text-brand-soft underline-offset-4 hover:underline focus-visible:rounded-control focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-soft"
                href={fleetPreviewHref(
                  '/fleet/drivers',
                  'fleet-drivers-mixed',
                  previewContext,
                )}
              >
                Xem danh sách tài xế
              </a>
            </>
          )}
        </FleetDispatchSlab>
      </div>
    </div>
  );
}
