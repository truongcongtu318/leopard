import { OperationsPageHeader, ScreenState } from '@leopard/ui';

import { WebPreviewComposition, createWebPreviewSelection, type PreviewFixtureValue, type WebUiScenario } from '../../preview';
import { AdminDispatchScreen } from './AdminDispatchScreen';
import { AdminListScreen } from './AdminListScreen';
import { AdminLiveMapScreen } from './AdminLiveMapScreen';
import { AdminNotificationsScreen } from './AdminNotificationsScreen';
import { AdminOrderDetailScreen } from './AdminOrderDetailScreen';
import { AdminOverviewScreen } from './AdminOverviewScreen';
import { AdminPricingScreen } from './AdminPricingScreen';
import { AdminReportDetailScreen } from './AdminReportDetailScreen';
import { AdminReportsScreen } from './AdminReportsScreen';
import { AdminSettingsScreen } from './AdminSettingsScreen';
import { AdminSupportScreen } from './AdminSupportScreen';
import type { AdminPreviewScreen } from './fixtures';
import { adminBoundaryFromError, loadAdminRuntimeView } from './runtime';
import type {
  AdminCommandKind,
  AdminDispatchRouteView,
  AdminListFilters,
  AdminListRouteView,
  AdminListScreen as AdminListScreenKind,
  AdminLiveMapRouteView,
  AdminNotificationsRouteView,
  AdminOrderDetailRouteView,
  AdminOverviewRouteView,
  AdminPricingRouteView,
  AdminPreviewContext,
  AdminReportDetailRouteView,
  AdminRouteView,
  AdminSettingsRouteView,
  AdminSupportRouteView,
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
  reportId?: string | null;
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
  if (screen === 'dispatch') return 'Trung Tâm Điều Phối NexaFleet';
  if (screen === 'orders') return 'Đơn hàng';
  if (screen === 'order-detail') return 'Chi tiết đơn';
  if (screen === 'reports') return 'Hàng Đợi Khiếu Nại & Hỗ Trợ';
  if (screen === 'report-detail') return 'Không Gian Xử Lý Khiếu Nại';
  if (screen === 'users') return 'Người dùng';
  if (screen === 'fleets') return 'Đội xe';
  if (screen === 'payments') return 'Quản lý thanh toán';
  if (screen === 'invoices') return 'Quản lý hóa đơn';
  if (screen === 'audit') return 'Nhật ký kiểm toán';
  if (screen === 'promotions') return 'Quản lý khuyến mãi';
  if (screen === 'reviews') return 'Đánh giá tài xế';
  if (screen === 'notifications') return 'Thông Báo & Broadcast Push';
  if (screen === 'pricing') return 'Cấu Hình Cước Phí Vận Hành';
  if (screen === 'live-map') return 'Bản Đồ Giám Sát Trực Tiếp';
  if (screen === 'settings') return 'Cài Đặt Hệ Thống & Cổng Kết Nối';
  if (screen === 'support') return 'Trung Tâm Hỗ Trợ & CSKH Trực Tuyến';
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

function InvalidReportBoundary() {
  return (
    <div className="flex flex-col gap-md">
      <OperationsPageHeader title="Chi tiết khiếu nại" />
      <ScreenState
        message="Đường dẫn không chứa mã khiếu nại hợp lệ. Không có dữ liệu khiếu nại nào được tải."
        state="error"
        title="Mã khiếu nại không hợp lệ"
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
  if (screen === 'reports') {
    return (
      <AdminReportsScreen
        commandRuntime={commandRuntime}
        previewContext={previewContext}
        view={view as AdminListRouteView}
      />
    );
  }
  if (screen === 'report-detail') {
    return (
      <AdminReportDetailScreen
        commandRuntime={commandRuntime}
        previewContext={previewContext}
        view={view as AdminReportDetailRouteView}
      />
    );
  }
  if (screen === 'dispatch') {
    return (
      <AdminDispatchScreen
        commandRuntime={commandRuntime}
        previewContext={previewContext}
        view={view as AdminDispatchRouteView}
      />
    );
  }
  if (screen === 'notifications') {
    return (
      <AdminNotificationsScreen
        commandRuntime={commandRuntime}
        previewContext={previewContext}
        view={view as AdminNotificationsRouteView}
      />
    );
  }
  if (screen === 'pricing') {
    return (
      <AdminPricingScreen
        commandRuntime={commandRuntime}
        previewContext={previewContext}
        view={view as AdminPricingRouteView}
      />
    );
  }
  if (screen === 'live-map') {
    return (
      <AdminLiveMapScreen
        commandRuntime={commandRuntime}
        previewContext={previewContext}
        view={view as AdminLiveMapRouteView}
      />
    );
  }
  if (screen === 'settings') {
    return (
      <AdminSettingsScreen
        commandRuntime={commandRuntime}
        previewContext={previewContext}
        view={view as AdminSettingsRouteView}
      />
    );
  }
  if (screen === 'support') {
    return (
      <AdminSupportScreen
        previewContext={previewContext}
        view={view as AdminSupportRouteView}
      />
    );
  }
  return (
    <AdminListScreen
      commandRuntime={commandRuntime}
      previewContext={previewContext}
      screen={screen as AdminListScreenKind}
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
  reportId,
  filters,
  loadCatalogue = loadAdminPreviewCatalogue,
}: AdminPreviewRouteProps) {
  if (screen === 'order-detail' && !orderId) return <InvalidOrderBoundary />;
  if (screen === 'report-detail' && !reportId && !orderId) return <InvalidReportBoundary />;

  const resolvedLocalFlag =
    localFlag ?? (process.env.LEOPARD_UI_PREVIEW === 'enabled' ? 'enabled' : null);

  const selection = await createWebPreviewSelection<AdminPreviewValue>({
    localFlag: resolvedLocalFlag,
    scenarioProvider: async () => {
      try {
        const catalogue = await loadCatalogue();
        const targetId = orderId ?? reportId ?? null;
        const view = withUrlState(
          catalogue.createAdminPreviewView(screen, scenario, commandKind, targetId),
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
      view = await loadAdminRuntimeView(screen, { orderId, reportId, filters });
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
