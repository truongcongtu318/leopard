import { OperationsPageHeader, ScreenState } from '@leopard/ui';

import {
  WebPreviewComposition,
  createWebPreviewSelection,
  type PreviewFixtureValue,
  type WebUiScenario,
} from '../../preview';
import { AdminListScreen } from './AdminListScreen';
import { AdminOrderDetailScreen } from './AdminOrderDetailScreen';
import { AdminOverviewScreen } from './AdminOverviewScreen';
import type { AdminPreviewScreen } from './fixtures';
import type {
  AdminCommandKind,
  AdminListFilters,
  AdminListRouteView,
  AdminOrderDetailRouteView,
  AdminOverviewRouteView,
  AdminPreviewContext,
  AdminRouteView,
} from './model';

type AdminPreviewValue = AdminRouteView & PreviewFixtureValue;

type AdminPreviewCatalogue = Readonly<{
  createAdminPreviewView: (
    screen: AdminPreviewScreen,
    requestedScenario: string | null,
    commandKind?: AdminCommandKind | null,
    orderId?: string | null,
  ) => AdminRouteView;
}>;

export type AdminPreviewCatalogueLoader = () => Promise<AdminPreviewCatalogue>;

const loadAdminPreviewCatalogue: AdminPreviewCatalogueLoader = async () => {
  const catalogue = await import('./fixtures');
  return { createAdminPreviewView: catalogue.createAdminPreviewView };
};

export type AdminPreviewRouteProps = Readonly<{
  screen: AdminPreviewScreen;
  localFlag: string | null;
  scenario: string | null;
  commandKind?: AdminCommandKind | null;
  orderId?: string | null;
  filters?: AdminListFilters;
  loadCatalogue?: AdminPreviewCatalogueLoader;
}>;

function withUrlState(view: AdminRouteView, filters?: AdminListFilters): AdminRouteView {
  if (view.kind !== 'list' || !filters) return view;
  return {
    ...view,
    filters: { ...filters },
    result: {
      ...view.result,
      page: filters.page,
      pageSize: filters.pageSize,
      totalPages:
        view.result.totalItems === 0 ? 0 : Math.max(view.result.totalPages, filters.page),
    },
  };
}

function screenTitle(screen: AdminPreviewScreen): string {
  if (screen === 'overview') return 'Tổng quan vận hành';
  if (screen === 'orders') return 'Đơn hàng';
  if (screen === 'order-detail') return 'Chi tiết đơn';
  if (screen === 'users') return 'Người dùng';
  if (screen === 'fleets') return 'Đội xe';
  return 'Tài xế';
}

function RuntimeBoundary({ screen }: Readonly<{ screen: AdminPreviewScreen }>) {
  return (
    <div className="flex flex-col gap-md">
      <OperationsPageHeader title={screenTitle(screen)} />
      <ScreenState
        message="Lớp trình bày Admin Wave 4 đã sẵn sàng; runtime query/command ports sẽ được nối sau handoff Wave 3."
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
}: Readonly<{ scenario: WebUiScenario<AdminPreviewValue> }>) {
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
      <OperationsPageHeader title="Bản xem trước Admin" />
      <ScreenState
        message={scenario.copy.description}
        state={state}
        title={scenario.kind === 'error' ? 'Không thể mở scenario Admin' : scenario.copy.title}
      />
    </div>
  );
}

function AdminScreen({
  screen,
  view,
  previewContext,
}: Readonly<{
  screen: AdminPreviewScreen;
  view: AdminRouteView;
  previewContext: AdminPreviewContext;
}>) {
  if (screen === 'overview') {
    return (
      <AdminOverviewScreen
        previewContext={previewContext}
        view={view as AdminOverviewRouteView}
      />
    );
  }
  if (screen === 'order-detail') {
    return (
      <AdminOrderDetailScreen
        previewContext={previewContext}
        view={view as AdminOrderDetailRouteView}
      />
    );
  }
  return (
    <AdminListScreen
      previewContext={previewContext}
      screen={screen}
      view={view as AdminListRouteView}
    />
  );
}

export async function AdminPreviewRoute({
  screen,
  localFlag,
  scenario,
  commandKind = null,
  orderId,
  filters,
  loadCatalogue = loadAdminPreviewCatalogue,
}: AdminPreviewRouteProps) {
  if (screen === 'order-detail' && !orderId) return <InvalidOrderBoundary />;

  const selection = await createWebPreviewSelection<AdminPreviewValue>({
    localFlag,
    scenarioProvider: async () => {
      try {
        const catalogue = await loadCatalogue();
        const view = withUrlState(
          catalogue.createAdminPreviewView(screen, scenario, commandKind, orderId),
          filters,
        );
        return { kind: 'success', data: view as AdminPreviewValue };
      } catch {
        return { kind: 'error' };
      }
    },
  });
  const previewContext: AdminPreviewContext = {
    preview: localFlag,
    scenario,
    command: commandKind,
  };

  return (
    <WebPreviewComposition
      renderFixture={(previewScenario) =>
        previewScenario.kind === 'success' ? (
          <AdminScreen
            previewContext={previewContext}
            screen={screen}
            view={previewScenario.data as AdminRouteView}
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
