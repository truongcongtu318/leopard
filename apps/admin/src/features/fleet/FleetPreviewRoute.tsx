import { OperationsPageHeader, ScreenState } from '@leopard/ui';

import {
  WebPreviewComposition,
  createWebPreviewSelection,
  type PreviewFixtureValue,
  type WebUiScenario,
} from '../../preview';
import { FleetDashboardScreen } from './FleetDashboardScreen';
import { FleetDriversScreen } from './FleetDriversScreen';
import { FleetOrderDetailScreen } from './FleetOrderDetailScreen';
import { FleetOrdersScreen } from './FleetOrdersScreen';
import type { FleetPreviewScreen } from './fixtures';
import type {
  FleetDashboardRouteView,
  FleetDriverFilters,
  FleetDriversRouteView,
  FleetOrderDetailRouteView,
  FleetOrderFilters,
  FleetOrdersRouteView,
  FleetPreviewContext,
  FleetRouteView,
} from './model';

type FleetPreviewValue = FleetRouteView & PreviewFixtureValue;

type FleetPreviewCatalogue = Readonly<{
  createFleetPreviewView: (
    screen: FleetPreviewScreen,
    requestedScenario: string | null,
    requestedOrderId?: string | null,
  ) => FleetRouteView;
}>;

export type FleetPreviewCatalogueLoader = () => Promise<FleetPreviewCatalogue>;

const loadFleetPreviewCatalogue: FleetPreviewCatalogueLoader = async () => {
  const catalogue = await import('./fixtures');
  return { createFleetPreviewView: catalogue.createFleetPreviewView };
};

export type FleetPreviewRouteProps = Readonly<{
  screen: FleetPreviewScreen;
  localFlag: string | null;
  scenario: string | null;
  orderId?: string | null;
  driverFilters?: FleetDriverFilters;
  orderFilters?: FleetOrderFilters;
  loadCatalogue?: FleetPreviewCatalogueLoader;
}>;

function withUrlState(
  view: FleetRouteView,
  driverFilters?: FleetDriverFilters,
  orderFilters?: FleetOrderFilters,
): FleetRouteView {
  if (view.kind === 'drivers' && driverFilters) {
    return {
      ...view,
      filters: { ...driverFilters },
      result: {
        ...view.result,
        page: driverFilters.page,
        pageSize: driverFilters.pageSize,
        totalPages:
          view.result.totalItems === 0 ? 0 : Math.max(view.result.totalPages, driverFilters.page),
        sort: driverFilters.sort,
      },
    };
  }
  if (view.kind === 'orders' && orderFilters) {
    return {
      ...view,
      filters: { ...orderFilters },
      result: {
        ...view.result,
        page: orderFilters.page,
        pageSize: orderFilters.pageSize,
        totalPages:
          view.result.totalItems === 0 ? 0 : Math.max(view.result.totalPages, orderFilters.page),
        sort: orderFilters.sort,
      },
    };
  }
  return view;
}

function RuntimeBoundary({ screen }: Readonly<{ screen: FleetPreviewScreen }>) {
  const title =
    screen === 'dashboard'
      ? 'Tổng quan đội xe'
      : screen === 'drivers'
        ? 'Tài xế'
        : screen === 'orders'
          ? 'Đơn của đội xe'
          : 'Chi tiết đơn';
  return (
    <div className="flex flex-col gap-md">
      <OperationsPageHeader title={title} />
      <ScreenState
        message="Lớp trình bày Fleet Owner Wave 4 đã sẵn sàng; runtime query ports sẽ được nối sau handoff Wave 3."
        state="empty"
        title="Chưa kết nối nguồn dữ liệu"
      />
    </div>
  );
}

function InvalidOrderBoundary() {
  return (
    <div className="flex flex-col gap-md">
      <OperationsPageHeader title="Chi tiết đơn" />
      <ScreenState
        message="Đường dẫn không chứa UUID hợp lệ. Không có dữ liệu đơn nào được tải."
        state="error"
        title="Mã đơn không hợp lệ"
      />
    </div>
  );
}

function PreviewScenarioBoundary({
  scenario,
}: Readonly<{ scenario: WebUiScenario<FleetPreviewValue> }>) {
  const state =
    scenario.kind === 'permission-denied'
      ? 'permission-denied'
      : scenario.kind === 'loading'
        ? 'loading'
        : scenario.kind === 'empty'
          ? 'empty'
          : 'error';
  return (
    <div className="flex flex-col gap-md">
      <OperationsPageHeader title="Bản xem trước Fleet Owner" />
      <ScreenState
        message={scenario.copy.description}
        state={state}
        title={scenario.kind === 'error' ? 'Không thể mở scenario Fleet' : scenario.copy.title}
      />
    </div>
  );
}

function FleetScreen({
  screen,
  view,
  previewContext,
}: Readonly<{
  screen: FleetPreviewScreen;
  view: FleetRouteView;
  previewContext: FleetPreviewContext;
}>) {
  if (screen === 'dashboard') {
    return (
      <FleetDashboardScreen
        previewContext={previewContext}
        view={view as FleetDashboardRouteView}
      />
    );
  }
  if (screen === 'drivers') {
    return (
      <FleetDriversScreen previewContext={previewContext} view={view as FleetDriversRouteView} />
    );
  }
  if (screen === 'orders') {
    return (
      <FleetOrdersScreen previewContext={previewContext} view={view as FleetOrdersRouteView} />
    );
  }
  return <FleetOrderDetailScreen view={view as FleetOrderDetailRouteView} />;
}

export async function FleetPreviewRoute({
  screen,
  localFlag,
  scenario,
  orderId,
  driverFilters,
  orderFilters,
  loadCatalogue = loadFleetPreviewCatalogue,
}: FleetPreviewRouteProps) {
  if (screen === 'order-detail' && !orderId) return <InvalidOrderBoundary />;

  const selection = await createWebPreviewSelection<FleetPreviewValue>({
    localFlag,
    scenarioProvider: async () => {
      try {
        const catalogue = await loadCatalogue();
        const view = withUrlState(
          catalogue.createFleetPreviewView(screen, scenario, orderId),
          driverFilters,
          orderFilters,
        );
        return { kind: 'success', data: view as FleetPreviewValue };
      } catch {
        return { kind: 'error' };
      }
    },
  });
  const previewContext = { preview: localFlag, scenario };

  return (
    <WebPreviewComposition
      renderFixture={(previewScenario) =>
        previewScenario.kind === 'success' ? (
          <FleetScreen
            previewContext={previewContext}
            screen={screen}
            view={previewScenario.data as FleetRouteView}
          />
        ) : (
          <PreviewScenarioBoundary scenario={previewScenario} />
        )
      }
      renderRuntime={() => <RuntimeBoundary screen={screen} />}
      selection={selection}
    />
  );
}
