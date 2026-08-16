import { useEffect, useState } from 'react';

import { MobilePreviewComposition, createMobilePreviewSelection } from '../../../../preview';
import type { MobilePreviewSelection } from '../../../../preview/scenario';
import { ScreenScaffold } from '../../../../ui/ScreenScaffold';
import { ScreenState } from '../../../../ui/ScreenState';
import { CustomerCreateOrderScreen } from '../CustomerCreateOrderScreen';
import { CustomerOrderDetailScreen } from '../CustomerOrderDetailScreen';
import { CustomerOrdersScreen } from '../CustomerOrdersScreen';
import type { CustomerCreateView, CustomerDetailView, CustomerListView } from '../model';
import type { CustomerPreviewScreen, CustomerPreviewView } from './catalogue';

type PreviewState =
  | Readonly<{ kind: 'resolving' }>
  | Readonly<{ kind: 'runtime'; selection: MobilePreviewSelection }>
  | Readonly<{
      kind: 'fixtures';
      selection: MobilePreviewSelection;
      view: CustomerPreviewView | null;
      error: string | null;
    }>;

export type CustomerPreviewRouteProps = Readonly<{
  screen: CustomerPreviewScreen;
  localPreviewEnabled: boolean;
  orderId?: string | null;
  scenario: string | null;
  onCreate?: () => void;
  onOpenOrder?: (orderId: string) => void;
  loadCatalogue?: CustomerPreviewCatalogueLoader;
}>;

type CustomerPreviewCatalogue = Readonly<{
  createCustomerPreviewView: (typeof import('./catalogue'))['createCustomerPreviewView'];
}>;

export type CustomerPreviewCatalogueLoader = () => Promise<CustomerPreviewCatalogue>;

const loadCustomerPreviewCatalogue: CustomerPreviewCatalogueLoader = () => import('./catalogue');

function RuntimeBoundary({ screen }: Readonly<{ screen: CustomerPreviewScreen }>) {
  const title =
    screen === 'list' ? 'Đơn hàng của tôi' : screen === 'create' ? 'Tạo đơn' : 'Chi tiết đơn';
  return (
    <ScreenScaffold title={title}>
      <ScreenState
        message="Lớp trình bày Wave 4 đã sẵn sàng; nguồn dữ liệu runtime sẽ được nối sau handoff Wave 3."
        state="empty"
        title="Chưa kết nối nguồn dữ liệu"
      />
    </ScreenScaffold>
  );
}

function PreviewScreen({
  screen,
  view,
  onCreate,
  onOpenOrder,
}: Readonly<{
  screen: CustomerPreviewScreen;
  view: CustomerPreviewView;
  onCreate?: () => void;
  onOpenOrder?: (orderId: string) => void;
}>) {
  if (screen === 'list') {
    return (
      <CustomerOrdersScreen
        onCreate={onCreate}
        onOpenOrder={onOpenOrder}
        view={view as CustomerListView}
      />
    );
  }
  if (screen === 'create') return <CustomerCreateOrderScreen view={view as CustomerCreateView} />;
  return <CustomerOrderDetailScreen view={view as CustomerDetailView} />;
}

export function CustomerPreviewRoute({
  screen,
  localPreviewEnabled,
  orderId = null,
  scenario,
  onCreate,
  onOpenOrder,
  loadCatalogue = loadCustomerPreviewCatalogue,
}: CustomerPreviewRouteProps) {
  const [state, setState] = useState<PreviewState>({ kind: 'resolving' });

  useEffect(() => {
    let active = true;
    setState({ kind: 'resolving' });
    void createMobilePreviewSelection({
      localPreviewEnabled,
      scenarioProvider: async () => 'success',
    }).then(async (selection) => {
      if (!active) return;
      if (selection.mode === 'runtime') {
        setState({ kind: 'runtime', selection });
        return;
      }
      try {
        const catalogue = await loadCatalogue();
        const view = catalogue.createCustomerPreviewView(screen, scenario, orderId);
        if (
          screen === 'detail' &&
          orderId &&
          view.kind === 'content' &&
          'order' in view &&
          view.order.id !== orderId
        ) {
          throw new TypeError('Customer preview order identity mismatch');
        }
        if (active) setState({ kind: 'fixtures', selection, view, error: null });
      } catch {
        if (active) {
          setState({
            kind: 'fixtures',
            selection,
            view: null,
            error: 'Scenario Customer không hợp lệ hoặc chưa được hỗ trợ.',
          });
        }
      }
    });
    return () => {
      active = false;
    };
  }, [loadCatalogue, localPreviewEnabled, orderId, scenario, screen]);

  if (state.kind === 'resolving') {
    return (
      <ScreenScaffold title="Bản xem trước Customer">
        <ScreenState state="loading" title="Đang kiểm tra chế độ preview" />
      </ScreenScaffold>
    );
  }

  return (
    <MobilePreviewComposition
      selection={state.selection}
      renderFixture={() =>
        state.kind === 'fixtures' && state.view ? (
          <PreviewScreen
            onCreate={onCreate}
            onOpenOrder={onOpenOrder}
            screen={screen}
            view={state.view}
          />
        ) : (
          <ScreenScaffold title="Bản xem trước Customer">
            <ScreenState
              message={state.kind === 'fixtures' ? (state.error ?? undefined) : undefined}
              state="error"
              title="Không thể mở scenario"
            />
          </ScreenScaffold>
        )
      }
      renderRuntime={() => <RuntimeBoundary screen={screen} />}
    />
  );
}
