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
import { adminBoundaryFromError, loadAdminRuntimeView } from './runtime';
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

const BOUNDARY_KINDS: ReadonlySet<string> = new Set([
  'permission-denied',
  'session-expired',
  'loading',
  'error',
]);

function AdminBoundaryResult({
  screen,
  kind,
  title,
  message,
}: Readonly<{
  screen: AdminPreviewScreen;
  kind: string;
  title: string;
  message: string;
}>) {
  return (
    <div className="flex flex-col gap-md">
      <OperationsPageHeader title={screenTitle(screen)} />
      <ScreenState
        message={message}
        state={
          kind === 'permission-denied'
            ? 'permission-denied'
            : kind === 'loading'
              ? 'loading'
              : 'error'
        }
        title={title}
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
  commandRuntime = false,
  screen,
  view,
  previewContext,
}: Readonly<{
  commandRuntime?: boolean | undefined;
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
        commandRuntime={commandRuntime}
        previewContext={previewContext}
        view={view as AdminOrderDetailRouteView}
      />
    );
  }
  return (
    <AdminListScreen
      commandRuntime={commandRuntime}
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

  const resolvedLocalFlag =
    localFlag ?? (process.env.LEOPARD_UI_PREVIEW === 'enabled' ? 'enabled' : null);

  const selection = await createWebPreviewSelection<AdminPreviewValue>({
    localFlag: resolvedLocalFlag,
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

  if (!selection.enabled) {
    let view: AdminRouteView;
    try {
      view = await loadAdminRuntimeView(screen, { orderId, filters });
    } catch (error) {
      view = adminBoundaryFromError(error, 'RUNTIME');
    }

    if (BOUNDARY_KINDS.has(view.kind)) {
      const boundaryView = view as AdminRouteView & { title: string; message: string };
      return (
        <AdminBoundaryResult
          kind={view.kind}
          message={boundaryView.message}
          screen={screen}
          title={boundaryView.title}
        />
      );
    }

    const runtimeContext: AdminPreviewContext = { rawSearch: null };
    return (
      <AdminScreen
        commandRuntime
        previewContext={runtimeContext}
        screen={screen}
        view={view}
      />
    );
  }

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
      renderRuntime={() => (
        <div className="flex flex-col gap-md">
          <OperationsPageHeader title={screenTitle(screen)} />
          <ScreenState
            message="Không thể xác định nguồn dữ liệu runtime."
            state="error"
            title="Lỗi cấu hình"
          />
        </div>
      )}
      selection={selection}
    />
  );
}
