import { useEffect, useState } from 'react';

import { MobilePreviewComposition, createMobilePreviewSelection } from '../../../../preview';
import type { MobilePreviewSelection } from '../../../../preview/scenario';
import { ScreenScaffold } from '../../../../ui/ScreenScaffold';
import { ScreenState } from '../../../../ui/ScreenState';
import { DriverOrderDetailRuntime } from '../DriverOrderDetailRuntime';
import { DriverOrdersListRuntime } from '../DriverOrdersListRuntime';
import { DriverOrderDetailScreen } from '../DriverOrderDetailScreen';
import { DriverOrdersScreen } from '../DriverOrdersScreen';
import type { DriverDetailView, DriverListView } from '../model';
import type { DriverPreviewScreen, DriverPreviewView } from './catalogue';

type DriverPreviewCatalogue = Readonly<{
  createDriverPreviewView: (typeof import('./catalogue'))['createDriverPreviewView'];
}>;

export type DriverPreviewCatalogueLoader = () => Promise<DriverPreviewCatalogue>;

const loadDriverPreviewCatalogue: DriverPreviewCatalogueLoader = () => import('./catalogue');

type PreviewState =
  | Readonly<{ kind: 'resolving' }>
  | Readonly<{ kind: 'runtime'; selection: MobilePreviewSelection }>
  | Readonly<{
      kind: 'fixtures';
      selection: MobilePreviewSelection;
      view: DriverPreviewView | null;
      error: string | null;
    }>;

export type DriverPreviewRouteProps = Readonly<{
  screen: DriverPreviewScreen;
  localPreviewEnabled: boolean;
  orderId?: string | null;
  scenario: string | null;
  onOpenOrder?: (orderId: string) => void;
  loadCatalogue?: DriverPreviewCatalogueLoader;
}>;

function RuntimeScreen({
  screen,
  orderId,
  onOpenOrder,
}: Readonly<{
  screen: DriverPreviewScreen;
  orderId: string | null;
  onOpenOrder?: (orderId: string) => void;
}>) {
  if (screen === 'list') {
    return <DriverOrdersListRuntime onOpenOrder={onOpenOrder ?? (() => {})} />;
  }
  if (!orderId) {
    return (
      <ScreenScaffold title="Chi tiết đơn">
        <ScreenState message="Thiếu mã đơn hàng." state="error" title="Không thể mở đơn" />
      </ScreenScaffold>
    );
  }
  return <DriverOrderDetailRuntime orderId={orderId} />;
}

function DriverPreviewScreenView({
  screen,
  view,
  onOpenOrder,
}: Readonly<{
  screen: DriverPreviewScreen;
  view: DriverPreviewView;
  onOpenOrder?: (orderId: string) => void;
}>) {
  if (screen === 'list') {
    return <DriverOrdersScreen onOpenOrder={onOpenOrder} view={view as DriverListView} />;
  }
  return <DriverOrderDetailScreen view={view as DriverDetailView} />;
}

export function DriverPreviewRoute({
  screen,
  localPreviewEnabled,
  orderId = null,
  scenario,
  onOpenOrder,
  loadCatalogue = loadDriverPreviewCatalogue,
}: DriverPreviewRouteProps) {
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
        const view = catalogue.createDriverPreviewView(screen, scenario, orderId);
        if (
          screen === 'detail' &&
          orderId &&
          view.kind === 'content' &&
          'order' in view &&
          view.order.id !== orderId
        ) {
          throw new TypeError('Driver preview order identity mismatch');
        }
        if (active) setState({ kind: 'fixtures', selection, view, error: null });
      } catch {
        if (active) {
          setState({
            kind: 'fixtures',
            selection,
            view: null,
            error: 'Scenario Driver không hợp lệ hoặc chưa được hỗ trợ.',
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
      <ScreenScaffold title="Bản xem trước Driver">
        <ScreenState state="loading" title="Đang kiểm tra chế độ preview" />
      </ScreenScaffold>
    );
  }

  return (
    <MobilePreviewComposition
      selection={state.selection}
      renderFixture={() =>
        state.kind === 'fixtures' && state.view ? (
          <DriverPreviewScreenView onOpenOrder={onOpenOrder} screen={screen} view={state.view} />
        ) : (
          <ScreenScaffold title="Bản xem trước Driver">
            <ScreenState
              message={state.kind === 'fixtures' ? (state.error ?? undefined) : undefined}
              state="error"
              title="Không thể mở scenario"
            />
          </ScreenScaffold>
        )
      }
      renderRuntime={() => <RuntimeScreen onOpenOrder={onOpenOrder} orderId={orderId} screen={screen} />}
    />
  );
}
