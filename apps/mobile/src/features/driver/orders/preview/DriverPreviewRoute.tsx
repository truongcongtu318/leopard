import { useEffect, useState } from 'react';

import { MobilePreviewComposition, createMobilePreviewSelection } from '../../../../preview';
import type { MobilePreviewSelection } from '../../../../preview/scenario';
import { ScreenScaffold } from '../../../../ui/ScreenScaffold';
import { ScreenState } from '../../../../ui/ScreenState';
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
  scenario: string | null;
  onOpenOrder?: (orderId: string) => void;
  loadCatalogue?: DriverPreviewCatalogueLoader;
}>;

function RuntimeBoundary({ screen }: Readonly<{ screen: DriverPreviewScreen }>) {
  return (
    <ScreenScaffold title={screen === 'list' ? 'Đơn của tài xế' : 'Chi tiết đơn'}>
      <ScreenState
        message="Lớp trình bày Driver Wave 4 đã sẵn sàng; runtime ports sẽ được nối sau handoff Wave 3."
        state="empty"
        title="Chưa kết nối nguồn dữ liệu"
      />
    </ScreenScaffold>
  );
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
        const view = catalogue.createDriverPreviewView(screen, scenario);
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
  }, [loadCatalogue, localPreviewEnabled, scenario, screen]);

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
      renderRuntime={() => <RuntimeBoundary screen={screen} />}
    />
  );
}
